import * as vscode from 'vscode';

import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import { NonEditableWebResourceError } from '../../application/useCases/UpdateWebResourceUseCase';
import { PublishCoordinator } from '../../../../shared/infrastructure/coordination/PublishCoordinator';
import {
	isPublishInProgressError,
	getPublishInProgressMessage
} from '../../../../shared/infrastructure/errors/PublishInProgressError';

import { WebResourceConnectionRegistry } from './WebResourceConnectionRegistry';

/**
 * URI scheme for web resources.
 * Format: ppds-webresource:///environmentId/webResourceId/filename.ext
 *
 * @remarks
 * The environmentId uniquely identifies the connection (URL + auth method).
 * Different environments open as separate editor tabs.
 * Same environment + same web resource = same editor tab.
 */
export const WEB_RESOURCE_SCHEME = 'ppds-webresource';

/**
 * Parses a web resource URI into its components.
 *
 * @param uri - VS Code URI with ppds-webresource scheme
 * @returns Parsed components or null if invalid
 */
export function parseWebResourceUri(uri: vscode.Uri): { environmentId: string; webResourceId: string; filename: string } | null {
	if (uri.scheme !== WEB_RESOURCE_SCHEME) {
		return null;
	}

	// environmentId is in the path for VS Code document identity
	// path = /environmentId/webResourceId/filename.ext
	const pathParts = uri.path.split('/').filter(p => p.length > 0);

	if (pathParts.length < 3) {
		return null;
	}

	const environmentId = pathParts[0] as string;
	const webResourceId = pathParts[1] as string;
	const filename = pathParts.slice(2).join('/');

	return { environmentId, webResourceId, filename };
}

/**
 * Creates a web resource URI.
 *
 * environmentId is placed in the path because VS Code uses
 * scheme+path for document identity. This ensures different environments
 * open as separate editor tabs.
 *
 * @param environmentId - Environment ID
 * @param webResourceId - Web resource GUID
 * @param filename - Display filename with extension
 * @returns VS Code URI for the web resource
 */
export function createWebResourceUri(
	environmentId: string,
	webResourceId: string,
	filename: string
): vscode.Uri {
	// Use empty authority and put environmentId in path
	return vscode.Uri.parse(`${WEB_RESOURCE_SCHEME}:///${environmentId}/${webResourceId}/${filename}`);
}

/**
 * FileSystemProvider for web resources supporting read and write operations.
 *
 * Enables opening web resources directly in VS Code editor without
 * downloading files to disk. Content is fetched on-demand from Dataverse
 * and changes are saved back automatically.
 *
 * URI format: ppds-webresource:///environmentId/webResourceId/filename.ext
 */
/**
 * Event data emitted when a web resource is successfully saved.
 */
export interface WebResourceSavedEvent {
	readonly environmentId: string;
	readonly webResourceId: string;
}

/**
 * Tracks server state for conflict detection during saves.
 */
interface WebResourceServerState {
	/** Server's modifiedOn timestamp when content was last loaded/saved */
	serverModifiedOn: Date;
	/** Content for comparison during writeFile (to detect no-change saves) */
	lastKnownContent: Uint8Array;
}

/**
 * Result of a content fetch operation.
 */
interface FetchResult {
	content: Uint8Array;
	modifiedOn: Date;
}

export class WebResourceFileSystemProvider implements vscode.FileSystemProvider {
	private readonly _onDidChangeFile = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
	readonly onDidChangeFile = this._onDidChangeFile.event;

	/** Event fired when a web resource is successfully saved to the server */
	private readonly _onDidSaveWebResource = new vscode.EventEmitter<WebResourceSavedEvent>();
	readonly onDidSaveWebResource = this._onDidSaveWebResource.event;

	/** Server state for conflict detection. Key: environmentId:webResourceId */
	private readonly serverState = new Map<string, WebResourceServerState>();

	/** Pending fetch requests to dedupe concurrent calls. Key: environmentId:webResourceId */
	private readonly pendingFetches = new Map<string, Promise<FetchResult>>();

	/**
	 * Creates a FileSystemProvider.
	 *
	 * @param registry - Registry mapping environmentIds to their resources
	 * @param logger - Logger for debugging
	 */
	constructor(
		private readonly registry: WebResourceConnectionRegistry,
		private readonly logger: ILogger
	) {}

	watch(): vscode.Disposable {
		// Read-only: no file watching needed
		return new vscode.Disposable(() => {});
	}

	async stat(uri: vscode.Uri): Promise<vscode.FileStat> {
		const parsed = parseWebResourceUri(uri);
		if (parsed === null) {
			throw vscode.FileSystemError.FileNotFound(uri);
		}

		const cacheKey = `${parsed.environmentId}:${parsed.webResourceId}`;

		// Check if we have cached state from a previous readFile
		const state = this.serverState.get(cacheKey);
		if (state !== undefined) {
			this.logger.debug('WebResourceFileSystemProvider stat (cached)', {
				environmentId: parsed.environmentId,
				webResourceId: parsed.webResourceId,
				size: state.lastKnownContent.length
			});
			return {
				type: vscode.FileType.File,
				ctime: 0,
				mtime: state.serverModifiedOn.getTime(),
				size: state.lastKnownContent.length
			};
		}

		// No cached state - verify the environment is registered, then return placeholder
		// VS Code will call readFile() next to get actual content
		const resources = this.registry.get(parsed.environmentId);
		if (resources === undefined) {
			this.logger.error('WebResourceFileSystemProvider stat: Unknown environmentId', {
				environmentId: parsed.environmentId
			});
			throw vscode.FileSystemError.FileNotFound(uri);
		}

		this.logger.debug('WebResourceFileSystemProvider stat (no cache)', {
			environmentId: parsed.environmentId,
			webResourceId: parsed.webResourceId
		});

		// Return placeholder values - readFile will fetch actual content
		return {
			type: vscode.FileType.File,
			ctime: 0,
			mtime: Date.now(),
			size: 0
		};
	}

	readDirectory(): [string, vscode.FileType][] {
		// Read-only: not a real filesystem, no directory listing
		return [];
	}

	createDirectory(): void {
		throw vscode.FileSystemError.NoPermissions('Web resources are read-only');
	}

	async readFile(uri: vscode.Uri): Promise<Uint8Array> {
		const parsed = parseWebResourceUri(uri);
		if (parsed === null) {
			throw vscode.FileSystemError.FileNotFound(uri);
		}

		const cacheKey = `${parsed.environmentId}:${parsed.webResourceId}`;

		// Check if there's already a fetch in progress for this resource (dedupe concurrent calls)
		const pendingFetch = this.pendingFetches.get(cacheKey);
		if (pendingFetch !== undefined) {
			this.logger.debug('WebResourceFileSystemProvider readFile (pending)', {
				webResourceId: parsed.webResourceId
			});
			const result = await pendingFetch;
			return result.content;
		}

		// Look up environment resources from registry
		const resources = this.registry.get(parsed.environmentId);
		if (resources === undefined) {
			this.logger.error('WebResourceFileSystemProvider: Unknown environmentId', {
				environmentId: parsed.environmentId
			});
			throw vscode.FileSystemError.FileNotFound(uri);
		}

		this.logger.debug('WebResourceFileSystemProvider readFile', {
			uri: uri.toString(),
			environmentId: parsed.environmentId,
			webResourceId: parsed.webResourceId
		});

		// Create fetch promise and store it to dedupe concurrent calls
		const fetchPromise = resources.getWebResourceContentUseCase.execute(
			parsed.environmentId,
			parsed.webResourceId
		).then(result => ({
			content: result.content,
			modifiedOn: result.modifiedOn
		}));

		this.pendingFetches.set(cacheKey, fetchPromise);

		try {
			const result = await fetchPromise;

			// Store server state for conflict detection during saves
			this.serverState.set(cacheKey, {
				serverModifiedOn: result.modifiedOn,
				lastKnownContent: result.content
			});

			// Log content preview for debugging cache issues
			const contentPreview = new TextDecoder().decode(result.content.slice(0, 100));
			this.logger.info('Web resource content loaded', {
				webResourceId: parsed.webResourceId,
				size: result.content.length,
				modifiedOn: result.modifiedOn.toISOString(),
				contentPreview: contentPreview.substring(0, 50)
			});

			return result.content;
		} catch (error) {
			this.logger.error('Failed to read web resource', error);
			throw vscode.FileSystemError.FileNotFound(uri);
		} finally {
			// Clear pending fetch after completion
			this.pendingFetches.delete(cacheKey);
		}
	}

	async writeFile(uri: vscode.Uri, content: Uint8Array): Promise<void> {
		const parsed = parseWebResourceUri(uri);
		if (parsed === null) {
			throw vscode.FileSystemError.FileNotFound(uri);
		}

		// Look up environment resources from registry
		const resources = this.registry.get(parsed.environmentId);
		if (resources === undefined) {
			this.logger.error('WebResourceFileSystemProvider writeFile: Unknown environmentId', {
				environmentId: parsed.environmentId
			});
			throw vscode.FileSystemError.FileNotFound(uri);
		}

		if (resources.updateWebResourceUseCase === null) {
			throw vscode.FileSystemError.NoPermissions('Web resource editing is not available');
		}

		// Check if content has actually changed (prevents unnecessary writes from auto-save)
		const cacheKey = `${parsed.environmentId}:${parsed.webResourceId}`;
		const state = this.serverState.get(cacheKey);
		if (state !== undefined && this.contentEquals(state.lastKnownContent, content)) {
			this.logger.debug('WebResourceFileSystemProvider writeFile skipped - no changes', {
				uri: uri.toString(),
				webResourceId: parsed.webResourceId
			});
			return;
		}

		// Conflict detection: check if server version has changed since we opened the file
		if (state !== undefined && resources.webResourceRepository !== undefined) {
			const conflictResolution = await this.checkForConflict(
				parsed.environmentId,
				parsed.webResourceId,
				state.serverModifiedOn,
				parsed.filename,
				uri,
				resources.webResourceRepository
			);

			if (conflictResolution === 'cancel') {
				this.logger.info('WebResourceFileSystemProvider writeFile cancelled by user (conflict)', {
					webResourceId: parsed.webResourceId
				});
				return;
			}

			if (conflictResolution === 'reload') {
				// Reload from server - invalidate cache and revert buffer
				await this.reloadFromServer(uri, parsed.environmentId, parsed.webResourceId, cacheKey);
				return;
			}
			// conflictResolution === 'overwrite' or 'no-conflict' - proceed with save
		}

		this.logger.debug('WebResourceFileSystemProvider writeFile', {
			uri: uri.toString(),
			environmentId: parsed.environmentId,
			webResourceId: parsed.webResourceId,
			contentSize: content.length
		});

		try {
			await resources.updateWebResourceUseCase.execute(
				parsed.environmentId,
				parsed.webResourceId,
				content
			);

			// Update cache with new content and fetch fresh modifiedOn from server
			await this.refreshCacheAfterSave(
				parsed.environmentId,
				parsed.webResourceId,
				cacheKey,
				content
			);

			// Fire change event for VS Code
			this._onDidChangeFile.fire([{ type: vscode.FileChangeType.Changed, uri }]);

			// Fire saved event for panel updates (allows panel to refresh this row)
			this._onDidSaveWebResource.fire({
				environmentId: parsed.environmentId,
				webResourceId: parsed.webResourceId
			});

			this.logger.info('Web resource saved', {
				webResourceId: parsed.webResourceId,
				size: content.length
			});

			// Show notification with Publish action (async - don't await)
			this.showPublishNotification(
				parsed.environmentId,
				parsed.webResourceId,
				parsed.filename
			);
		} catch (error) {
			if (error instanceof NonEditableWebResourceError) {
				throw vscode.FileSystemError.NoPermissions('Cannot edit binary web resource');
			}
			this.logger.error('Failed to save web resource', error);
			throw vscode.FileSystemError.Unavailable(uri);
		}
	}

	delete(): void {
		throw vscode.FileSystemError.NoPermissions('Web resources are read-only');
	}

	rename(): void {
		throw vscode.FileSystemError.NoPermissions('Web resources are read-only');
	}

	/**
	 * Invalidates cached content for a specific web resource.
	 * Call this when a web resource is modified to ensure fresh content on next read.
	 *
	 * @param environmentId - The environment ID
	 * @param webResourceId - Web resource GUID
	 */
	invalidateCache(environmentId: string, webResourceId: string): void {
		const cacheKey = `${environmentId}:${webResourceId}`;
		this.serverState.delete(cacheKey);
		this.logger.debug('WebResourceFileSystemProvider cache invalidated', { environmentId, webResourceId });
	}

	/**
	 * Clears all cached state.
	 */
	clearCache(): void {
		this.serverState.clear();
		this.logger.debug('WebResourceFileSystemProvider cache cleared');
	}

	/**
	 * Notifies VS Code that a file has changed, forcing it to re-read on next open.
	 * Call this BEFORE opening a document to ensure VS Code fetches fresh content.
	 *
	 * @param uri - The file URI to invalidate
	 */
	notifyFileChanged(uri: vscode.Uri): void {
		this._onDidChangeFile.fire([{ type: vscode.FileChangeType.Changed, uri }]);
		this.logger.debug('WebResourceFileSystemProvider notified file changed', { uri: uri.toString() });
	}

	/**
	 * Waits for any pending fetch for this resource to complete.
	 *
	 * @param environmentId - Environment ID
	 * @param webResourceId - Web resource GUID
	 */
	async waitForPendingFetch(environmentId: string, webResourceId: string): Promise<void> {
		const cacheKey = `${environmentId}:${webResourceId}`;
		const pending = this.pendingFetches.get(cacheKey);
		if (pending !== undefined) {
			this.logger.debug('Waiting for pending fetch', { webResourceId });
			await pending;
		}
	}

	/**
	 * Checks if the server version has changed since the file was opened.
	 * If a conflict is detected, shows a modal dialog with resolution options.
	 *
	 * @param environmentId - Environment GUID
	 * @param webResourceId - Web resource GUID
	 * @param cachedModifiedOn - Timestamp when file was opened/last saved
	 * @param filename - Display filename for the conflict dialog
	 * @param _uri - VS Code URI (unused but kept for signature consistency)
	 * @param webResourceRepository - Repository to check current server timestamp
	 * @returns 'overwrite' | 'reload' | 'cancel' | 'no-conflict'
	 */
	private async checkForConflict(
		environmentId: string,
		webResourceId: string,
		cachedModifiedOn: Date,
		filename: string,
		_uri: vscode.Uri,
		webResourceRepository: import('../../domain/interfaces/IWebResourceRepository').IWebResourceRepository
	): Promise<'overwrite' | 'reload' | 'cancel' | 'no-conflict'> {
		try {
			const currentModifiedOn = await webResourceRepository.getModifiedOn(
				environmentId,
				webResourceId
			);

			if (currentModifiedOn === null) {
				// Resource was deleted - let the save proceed and fail at the API level
				return 'no-conflict';
			}

			// Compare timestamps (using getTime() for precise comparison)
			if (currentModifiedOn.getTime() === cachedModifiedOn.getTime()) {
				return 'no-conflict';
			}

			this.logger.info('Conflict detected', {
				webResourceId,
				cachedModifiedOn: cachedModifiedOn.toISOString(),
				currentModifiedOn: currentModifiedOn.toISOString()
			});

			// Show conflict resolution modal
			const selection = await vscode.window.showWarningMessage(
				`"${filename}" has been modified on the server since you opened it. Your changes will overwrite the server version.`,
				{ modal: true },
				'Overwrite',
				'Reload from Server'
			);

			if (selection === 'Overwrite') {
				return 'overwrite';
			} else if (selection === 'Reload from Server') {
				return 'reload';
			} else {
				return 'cancel';
			}
		} catch (error) {
			this.logger.error('Failed to check for conflict', error);
			// If we can't check for conflicts, proceed with save
			return 'no-conflict';
		}
	}

	/**
	 * Reloads content from server and updates the editor buffer.
	 *
	 * @param uri - VS Code URI of the web resource
	 * @param environmentId - Environment ID
	 * @param webResourceId - Web resource GUID
	 * @param cacheKey - Cache key (environmentId:webResourceId)
	 */
	private async reloadFromServer(
		uri: vscode.Uri,
		environmentId: string,
		webResourceId: string,
		cacheKey: string
	): Promise<void> {
		const resources = this.registry.get(environmentId);
		if (resources === undefined) {
			this.logger.error('WebResourceFileSystemProvider reloadFromServer: Unknown environmentId', {
				environmentId
			});
			void vscode.window.showErrorMessage('Failed to reload: environment not found.');
			return;
		}

		try {
			// Invalidate server state
			this.serverState.delete(cacheKey);

			// Fetch fresh content
			const result = await resources.getWebResourceContentUseCase.execute(
				environmentId,
				webResourceId
			);

			// Update server state with fresh data
			this.serverState.set(cacheKey, {
				serverModifiedOn: result.modifiedOn,
				lastKnownContent: result.content
			});

			// Refresh the editor buffer with the new content
			// VS Code's FileSystemProvider revert doesn't work reliably for virtual documents.
			// Instead, we directly replace the editor content using a WorkspaceEdit.
			const document = vscode.workspace.textDocuments.find(d => d.uri.toString() === uri.toString());
			if (document) {
				// Show the document first (make it active)
				await vscode.window.showTextDocument(document, { preview: false });

				// Replace entire document content with fresh server content
				const newContent = new TextDecoder().decode(result.content);
				const fullRange = new vscode.Range(
					document.positionAt(0),
					document.positionAt(document.getText().length)
				);

				const edit = new vscode.WorkspaceEdit();
				edit.replace(uri, fullRange, newContent);
				await vscode.workspace.applyEdit(edit);

				// Save to clear dirty state (content now matches server)
				await document.save();

				// Fire change event to update any listeners
				this._onDidChangeFile.fire([{ type: vscode.FileChangeType.Changed, uri }]);
			}

			this.logger.info('Web resource reloaded from server', { webResourceId });
			void vscode.window.showInformationMessage(`Reloaded "${uri.path.split('/').pop()}" from server.`);
		} catch (error) {
			this.logger.error('Failed to reload from server', error);
			void vscode.window.showErrorMessage('Failed to reload from server. Please try again.');
		}
	}

	/**
	 * Refreshes server state after a successful save by fetching the new modifiedOn from server.
	 *
	 * @param environmentId - Environment ID
	 * @param webResourceId - Web resource GUID
	 * @param cacheKey - Cache key (environmentId:webResourceId)
	 * @param content - The saved content
	 */
	private async refreshCacheAfterSave(
		environmentId: string,
		webResourceId: string,
		cacheKey: string,
		content: Uint8Array
	): Promise<void> {
		const resources = this.registry.get(environmentId);
		const webResourceRepository = resources?.webResourceRepository;

		if (webResourceRepository !== undefined) {
			try {
				const newModifiedOn = await webResourceRepository.getModifiedOn(
					environmentId,
					webResourceId
				);

				if (newModifiedOn !== null) {
					this.serverState.set(cacheKey, {
						serverModifiedOn: newModifiedOn,
						lastKnownContent: content
					});
					return;
				}
			} catch (error) {
				this.logger.debug('Failed to fetch modifiedOn after save, using current time', { error });
			}
		}

		// Fallback: use current time if we couldn't fetch from server
		this.serverState.set(cacheKey, {
			serverModifiedOn: new Date(),
			lastKnownContent: content
		});
	}

	/**
	 * Compares two Uint8Array buffers for equality.
	 * Used to detect if content has actually changed before writing.
	 */
	private contentEquals(a: Uint8Array, b: Uint8Array): boolean {
		if (a.length !== b.length) {
			return false;
		}
		for (let i = 0; i < a.length; i++) {
			if (a[i] !== b[i]) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Shows a notification after save with a Publish action button.
	 * When clicked, publishes the web resource to make changes visible.
	 * Coordinates with PublishCoordinator to prevent concurrent publishes.
	 *
	 * @param environmentId - Environment ID
	 * @param webResourceId - Web resource GUID
	 * @param filename - Display filename for the notification
	 */
	private showPublishNotification(
		environmentId: string,
		webResourceId: string,
		filename: string
	): void {
		const resources = this.registry.get(environmentId);
		if (!resources?.publishWebResourceUseCase) {
			return;
		}

		// Capture reference for use in async callback
		const publishUseCase = resources.publishWebResourceUseCase;

		// Use void to explicitly ignore the promise (fire-and-forget pattern)
		void vscode.window.showInformationMessage(
			`Saved: ${filename}`,
			'Publish'
		).then(async (selection) => {
			if (selection === 'Publish') {
				// Check if already publishing in this environment
				if (PublishCoordinator.isPublishing(environmentId)) {
					vscode.window.showWarningMessage(
						'A publish operation is already in progress. Please wait for it to complete.'
					);
					return;
				}

				// Notify coordinator and execute
				PublishCoordinator.notifyPublishStarted(environmentId);
				try {
					await publishUseCase.execute(environmentId, webResourceId);
					vscode.window.showInformationMessage(`Published: ${filename}`);
				} catch (error) {
					if (isPublishInProgressError(error)) {
						vscode.window.showWarningMessage(getPublishInProgressMessage());
					} else {
						this.logger.error('Failed to publish web resource', error);
						const message = error instanceof Error ? error.message : 'Unknown error';
						vscode.window.showErrorMessage(`Failed to publish: ${message}`);
					}
				} finally {
					PublishCoordinator.notifyPublishCompleted(environmentId);
				}
			}
		});
	}
}
