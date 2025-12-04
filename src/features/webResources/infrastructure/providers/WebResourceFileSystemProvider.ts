import * as vscode from 'vscode';

import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import { NonEditableWebResourceError } from '../../application/useCases/UpdateWebResourceUseCase';
import { PublishCoordinator } from '../../../../shared/infrastructure/coordination/PublishCoordinator';
import {
	isPublishInProgressError,
	getPublishInProgressMessage
} from '../../../../shared/infrastructure/errors/PublishInProgressError';

import { WebResourceConnectionRegistry, EnvironmentResources } from './WebResourceConnectionRegistry';

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
 * Content mode for web resource URIs.
 * - 'unpublished': Latest saved changes (default, editable)
 * - 'published': Currently published version (for diff views)
 * - 'conflict': Shows both versions with conflict markers for version selection
 * - 'server-current': Fresh unpublished content from server (bypasses cache, for conflict diff)
 * - 'local-pending': Content the user is trying to save (for conflict diff)
 */
export type WebResourceContentMode = 'unpublished' | 'published' | 'conflict' | 'server-current' | 'local-pending';

/**
 * Parsed web resource URI components.
 */
export interface ParsedWebResourceUri {
	environmentId: string;
	webResourceId: string;
	filename: string;
	/** Content mode - 'unpublished' (default), 'published', or 'conflict' */
	mode: WebResourceContentMode;
}

/**
 * Parses a web resource URI into its components.
 *
 * @param uri - VS Code URI with ppds-webresource scheme
 * @returns Parsed components or null if invalid
 */
export function parseWebResourceUri(uri: vscode.Uri): ParsedWebResourceUri | null {
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

	// Parse mode from query string (e.g., ?mode=published or ?mode=conflict)
	const queryParams = new URLSearchParams(uri.query);
	const modeParam = queryParams.get('mode');
	let mode: WebResourceContentMode = 'unpublished';
	if (modeParam === 'published') {
		mode = 'published';
	} else if (modeParam === 'conflict') {
		mode = 'conflict';
	} else if (modeParam === 'server-current') {
		mode = 'server-current';
	} else if (modeParam === 'local-pending') {
		mode = 'local-pending';
	}

	return { environmentId, webResourceId, filename, mode };
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
 * @param mode - Optional content mode ('published' for diff views)
 * @returns VS Code URI for the web resource
 */
export function createWebResourceUri(
	environmentId: string,
	webResourceId: string,
	filename: string,
	mode?: WebResourceContentMode
): vscode.Uri {
	// Use empty authority and put environmentId in path
	const baseUri = `${WEB_RESOURCE_SCHEME}:///${environmentId}/${webResourceId}/${filename}`;
	// Add mode query param only if specified (unpublished is default, no query needed)
	let query = '';
	if (mode !== undefined && mode !== 'unpublished') {
		query = `?mode=${mode}`;
	}
	return vscode.Uri.parse(`${baseUri}${query}`);
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

	/** Temporary storage for content being saved, used for conflict diff display. Key: environmentId:webResourceId */
	private readonly pendingSaveContent = new Map<string, Uint8Array>();

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

		// Look up environment resources from registry
		const resources = this.registry.get(parsed.environmentId);
		if (resources === undefined) {
			this.logger.error('WebResourceFileSystemProvider: Unknown environmentId', {
				environmentId: parsed.environmentId
			});
			throw vscode.FileSystemError.FileNotFound(uri);
		}

		// Published mode: fetch published content directly (read-only, for diff views)
		if (parsed.mode === 'published') {
			return this.readPublishedContent(parsed, resources);
		}

		// Conflict mode: generate content with conflict markers for version selection
		if (parsed.mode === 'conflict') {
			return this.readConflictContent(parsed, resources);
		}

		// Server-current mode: fetch fresh unpublished content (bypasses cache, for conflict diff)
		if (parsed.mode === 'server-current') {
			return this.readServerCurrentContent(parsed, resources);
		}

		// Local-pending mode: return stored pending save content (for conflict diff)
		if (parsed.mode === 'local-pending') {
			return this.readLocalPendingContent(parsed);
		}

		// Unpublished mode (default): fetch unpublished content with caching for conflict detection
		return this.readUnpublishedContent(uri, parsed, resources);
	}

	/**
	 * Reads published content directly from repository.
	 * Used for diff views - read-only, no conflict detection state.
	 */
	private async readPublishedContent(
		parsed: ParsedWebResourceUri,
		resources: EnvironmentResources
	): Promise<Uint8Array> {
		this.logger.debug('WebResourceFileSystemProvider readFile (published mode)', {
			environmentId: parsed.environmentId,
			webResourceId: parsed.webResourceId
		});

		if (resources.webResourceRepository === undefined) {
			this.logger.error('WebResourceFileSystemProvider: Repository not available for published content');
			throw vscode.FileSystemError.Unavailable('Repository not available');
		}

		try {
			const base64Content = await resources.webResourceRepository.getPublishedContent(
				parsed.environmentId,
				parsed.webResourceId
			);

			const content = Buffer.from(base64Content, 'base64');

			this.logger.info('Published web resource content loaded', {
				webResourceId: parsed.webResourceId,
				size: content.length
			});

			return new Uint8Array(content);
		} catch (error) {
			this.logger.error('Failed to read published web resource', error);
			throw vscode.FileSystemError.FileNotFound();
		}
	}

	/**
	 * Reads content with conflict markers for version selection.
	 * VS Code will show inline "Accept Current | Accept Incoming" buttons.
	 *
	 * Conflict markers format:
	 * <<<<<<< Published (Live)
	 * ...published content...
	 * =======
	 * ...unpublished content...
	 * >>>>>>> Unpublished (Your Changes)
	 */
	private async readConflictContent(
		parsed: ParsedWebResourceUri,
		resources: EnvironmentResources
	): Promise<Uint8Array> {
		this.logger.debug('WebResourceFileSystemProvider readFile (conflict mode)', {
			environmentId: parsed.environmentId,
			webResourceId: parsed.webResourceId
		});

		if (resources.webResourceRepository === undefined) {
			this.logger.error('WebResourceFileSystemProvider: Repository not available for conflict content');
			throw vscode.FileSystemError.Unavailable('Repository not available');
		}

		try {
			// Fetch both versions in parallel
			const [publishedBase64, unpublishedBase64] = await Promise.all([
				resources.webResourceRepository.getPublishedContent(
					parsed.environmentId,
					parsed.webResourceId
				),
				resources.webResourceRepository.getContent(
					parsed.environmentId,
					parsed.webResourceId
				)
			]);

			const publishedContent = Buffer.from(publishedBase64, 'base64').toString('utf-8');
			const unpublishedContent = Buffer.from(unpublishedBase64, 'base64').toString('utf-8');

			// Generate content with conflict markers
			// VS Code will detect these and show inline "Accept Current | Accept Incoming" buttons
			const conflictContent = [
				'<<<<<<< Published (Live)',
				publishedContent,
				'=======',
				unpublishedContent,
				'>>>>>>> Unpublished (Your Changes)'
			].join('\n');

			this.logger.info('Conflict content generated for version selection', {
				webResourceId: parsed.webResourceId,
				publishedSize: publishedContent.length,
				unpublishedSize: unpublishedContent.length
			});

			return new Uint8Array(Buffer.from(conflictContent, 'utf-8'));
		} catch (error) {
			this.logger.error('Failed to generate conflict content', error);
			throw vscode.FileSystemError.FileNotFound();
		}
	}

	/**
	 * Reads fresh unpublished content directly from server (bypasses cache).
	 * Used for save conflict diff to show what's currently on the server.
	 */
	private async readServerCurrentContent(
		parsed: ParsedWebResourceUri,
		resources: EnvironmentResources
	): Promise<Uint8Array> {
		this.logger.debug('WebResourceFileSystemProvider readFile (server-current mode)', {
			environmentId: parsed.environmentId,
			webResourceId: parsed.webResourceId
		});

		if (resources.webResourceRepository === undefined) {
			this.logger.error('WebResourceFileSystemProvider: Repository not available for server-current content');
			throw vscode.FileSystemError.Unavailable('Repository not available');
		}

		try {
			// Always fetch fresh from server (don't use cache)
			const base64Content = await resources.webResourceRepository.getContent(
				parsed.environmentId,
				parsed.webResourceId
			);

			const content = Buffer.from(base64Content, 'base64');

			this.logger.info('Server-current content loaded', {
				webResourceId: parsed.webResourceId,
				size: content.length
			});

			return new Uint8Array(content);
		} catch (error) {
			this.logger.error('Failed to read server-current content', error);
			throw vscode.FileSystemError.FileNotFound();
		}
	}

	/**
	 * Returns stored pending save content for conflict diff display.
	 * This is the content the user is trying to save.
	 */
	private readLocalPendingContent(parsed: ParsedWebResourceUri): Uint8Array {
		const cacheKey = `${parsed.environmentId}:${parsed.webResourceId}`;
		const content = this.pendingSaveContent.get(cacheKey);

		if (content === undefined) {
			this.logger.error('WebResourceFileSystemProvider: No pending save content found', {
				webResourceId: parsed.webResourceId
			});
			throw vscode.FileSystemError.FileNotFound();
		}

		this.logger.debug('WebResourceFileSystemProvider readFile (local-pending mode)', {
			webResourceId: parsed.webResourceId,
			size: content.length
		});

		return content;
	}

	/**
	 * Reads unpublished content via use case.
	 * Updates conflict detection state for saves.
	 */
	private async readUnpublishedContent(
		uri: vscode.Uri,
		parsed: ParsedWebResourceUri,
		resources: EnvironmentResources
	): Promise<Uint8Array> {
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
				content,
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
	 * @param localContent - Content the user is trying to save (for diff display)
	 * @param webResourceRepository - Repository to check current server timestamp
	 * @returns 'overwrite' | 'reload' | 'cancel' | 'no-conflict'
	 */
	private async checkForConflict(
		environmentId: string,
		webResourceId: string,
		cachedModifiedOn: Date,
		filename: string,
		localContent: Uint8Array,
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

			// Show conflict resolution modal with Compare First option
			const selection = await vscode.window.showWarningMessage(
				`"${filename}" has been modified on the server since you opened it.`,
				{ modal: true },
				'Compare First',
				'Overwrite',
				'Discard My Work'
			);

			if (selection === 'Overwrite') {
				return 'overwrite';
			} else if (selection === 'Discard My Work') {
				return 'reload';
			} else if (selection === 'Compare First') {
				// Show diff view and let user decide
				return this.showConflictDiffAndResolve(
					environmentId,
					webResourceId,
					filename,
					localContent
				);
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
	 * Shows diff view for save conflict and lets user choose resolution.
	 *
	 * Flow:
	 * 1. Store local content temporarily for diff display
	 * 2. Show diff: Server version (left) vs Local changes (right)
	 * 3. Show resolution modal: "Save My Version" / "Use Server Version"
	 * 4. Clean up and return chosen action
	 *
	 * @param environmentId - Environment GUID
	 * @param webResourceId - Web resource GUID
	 * @param filename - Display filename
	 * @param localContent - Content the user is trying to save
	 * @returns 'overwrite' | 'reload' | 'cancel'
	 */
	private async showConflictDiffAndResolve(
		environmentId: string,
		webResourceId: string,
		filename: string,
		localContent: Uint8Array
	): Promise<'overwrite' | 'reload' | 'cancel'> {
		const cacheKey = `${environmentId}:${webResourceId}`;

		try {
			// Store local content temporarily for diff display
			this.pendingSaveContent.set(cacheKey, localContent);

			// Create URIs for diff view
			const serverUri = createWebResourceUri(
				environmentId,
				webResourceId,
				filename,
				'server-current'
			);

			const localUri = createWebResourceUri(
				environmentId,
				webResourceId,
				filename,
				'local-pending'
			);

			// Show diff: Server version (left) vs Local changes (right)
			await vscode.commands.executeCommand(
				'vscode.diff',
				serverUri,
				localUri,
				`${filename}: Server Version ↔ Your Changes`
			);

			this.logger.debug('Conflict diff view opened', { webResourceId });

			// Show non-modal notification so user can scroll the diff while deciding
			const resolution = await vscode.window.showInformationMessage(
				'Choose which version to keep:',
				'Save My Version',
				'Use Server Version',
				'Cancel'
			);

			// Close the diff view
			await vscode.commands.executeCommand('workbench.action.closeActiveEditor');

			if (resolution === 'Save My Version') {
				this.logger.info('User chose to save their version after compare', { webResourceId });
				return 'overwrite';
			} else if (resolution === 'Use Server Version') {
				this.logger.info('User chose to use server version after compare', { webResourceId });
				return 'reload';
			} else {
				this.logger.info('User cancelled conflict resolution after compare', { webResourceId });
				return 'cancel';
			}
		} finally {
			// Always clean up temporary content
			this.pendingSaveContent.delete(cacheKey);
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
