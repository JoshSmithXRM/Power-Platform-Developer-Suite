import * as vscode from 'vscode';

import type { GetWebResourceContentUseCase } from '../../application/useCases/GetWebResourceContentUseCase';
import type { UpdateWebResourceUseCase } from '../../application/useCases/UpdateWebResourceUseCase';
import type { PublishWebResourceUseCase } from '../../application/useCases/PublishWebResourceUseCase';
import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import { NonEditableWebResourceError } from '../../application/useCases/UpdateWebResourceUseCase';
import { PublishCoordinator } from '../../../../shared/infrastructure/coordination/PublishCoordinator';
import {
	isPublishInProgressError,
	getPublishInProgressMessage
} from '../../../../shared/infrastructure/errors/PublishInProgressError';

/**
 * URI scheme for web resources.
 * Format: ppds-webresource://environmentId/webResourceId/filename.ext
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

	// authority = environmentId
	// path = /webResourceId/filename.ext
	const environmentId = uri.authority;
	const pathParts = uri.path.split('/').filter(p => p.length > 0);

	if (pathParts.length < 2) {
		return null;
	}

	// pathParts[0] is guaranteed to exist since we checked length >= 2 above
	const webResourceId = pathParts[0] as string;
	const filename = pathParts.slice(1).join('/');

	return { environmentId, webResourceId, filename };
}

/**
 * Creates a web resource URI.
 *
 * @param environmentId - Environment GUID
 * @param webResourceId - Web resource GUID
 * @param filename - Display filename with extension
 * @returns VS Code URI for the web resource
 */
export function createWebResourceUri(
	environmentId: string,
	webResourceId: string,
	filename: string
): vscode.Uri {
	return vscode.Uri.parse(`${WEB_RESOURCE_SCHEME}://${environmentId}/${webResourceId}/${filename}`);
}

/**
 * FileSystemProvider for web resources supporting read and write operations.
 *
 * Enables opening web resources directly in VS Code editor without
 * downloading files to disk. Content is fetched on-demand from Dataverse
 * and changes are saved back automatically.
 *
 * URI format: ppds-webresource://environmentId/webResourceId/filename.ext
 */
/**
 * Event data emitted when a web resource is successfully saved.
 */
export interface WebResourceSavedEvent {
	readonly environmentId: string;
	readonly webResourceId: string;
}

export class WebResourceFileSystemProvider implements vscode.FileSystemProvider {
	private readonly _onDidChangeFile = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
	readonly onDidChangeFile = this._onDidChangeFile.event;

	/** Event fired when a web resource is successfully saved to the server */
	private readonly _onDidSaveWebResource = new vscode.EventEmitter<WebResourceSavedEvent>();
	readonly onDidSaveWebResource = this._onDidSaveWebResource.event;

	/** Cache for web resource content to avoid repeated API calls */
	private readonly contentCache = new Map<string, { content: Uint8Array; timestamp: number }>();
	private readonly CACHE_TTL_MS = 60000; // 1 minute cache

	constructor(
		private readonly getWebResourceContentUseCase: GetWebResourceContentUseCase,
		private readonly updateWebResourceUseCase: UpdateWebResourceUseCase | null,
		private readonly publishWebResourceUseCase: PublishWebResourceUseCase | null,
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

		this.logger.debug('WebResourceFileSystemProvider stat', {
			uri: uri.toString(),
			environmentId: parsed.environmentId,
			webResourceId: parsed.webResourceId
		});

		// Try to get content to determine size
		try {
			const content = await this.readFile(uri);
			return {
				type: vscode.FileType.File,
				ctime: Date.now(),
				mtime: Date.now(),
				size: content.length
			};
		} catch {
			throw vscode.FileSystemError.FileNotFound(uri);
		}
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

		// Check cache
		const cached = this.contentCache.get(cacheKey);
		if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
			this.logger.debug('WebResourceFileSystemProvider readFile (cached)', {
				webResourceId: parsed.webResourceId,
				size: cached.content.length
			});
			return cached.content;
		}

		this.logger.debug('WebResourceFileSystemProvider readFile', {
			uri: uri.toString(),
			environmentId: parsed.environmentId,
			webResourceId: parsed.webResourceId
		});

		try {
			const result = await this.getWebResourceContentUseCase.execute(
				parsed.environmentId,
				parsed.webResourceId
			);

			// Cache the content
			this.contentCache.set(cacheKey, {
				content: result.content,
				timestamp: Date.now()
			});

			this.logger.info('Web resource content loaded', {
				webResourceId: parsed.webResourceId,
				size: result.content.length
			});

			return result.content;
		} catch (error) {
			this.logger.error('Failed to read web resource', error);
			throw vscode.FileSystemError.FileNotFound(uri);
		}
	}

	async writeFile(uri: vscode.Uri, content: Uint8Array): Promise<void> {
		const parsed = parseWebResourceUri(uri);
		if (parsed === null) {
			throw vscode.FileSystemError.FileNotFound(uri);
		}

		if (this.updateWebResourceUseCase === null) {
			throw vscode.FileSystemError.NoPermissions('Web resource editing is not available');
		}

		// Check if content has actually changed (prevents unnecessary writes from auto-save)
		const cacheKey = `${parsed.environmentId}:${parsed.webResourceId}`;
		const cached = this.contentCache.get(cacheKey);
		if (cached !== undefined && this.contentEquals(cached.content, content)) {
			this.logger.debug('WebResourceFileSystemProvider writeFile skipped - no changes', {
				uri: uri.toString(),
				webResourceId: parsed.webResourceId
			});
			return;
		}

		this.logger.debug('WebResourceFileSystemProvider writeFile', {
			uri: uri.toString(),
			environmentId: parsed.environmentId,
			webResourceId: parsed.webResourceId,
			contentSize: content.length
		});

		try {
			await this.updateWebResourceUseCase.execute(
				parsed.environmentId,
				parsed.webResourceId,
				content
			);

			// Update cache with new content
			const cacheKey = `${parsed.environmentId}:${parsed.webResourceId}`;
			this.contentCache.set(cacheKey, { content, timestamp: Date.now() });

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
			this.showPublishNotification(parsed.environmentId, parsed.webResourceId, parsed.filename);
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
	 */
	invalidateCache(environmentId: string, webResourceId: string): void {
		const cacheKey = `${environmentId}:${webResourceId}`;
		this.contentCache.delete(cacheKey);
		this.logger.debug('WebResourceFileSystemProvider cache invalidated', { environmentId, webResourceId });
	}

	/**
	 * Clears all cached content.
	 */
	clearCache(): void {
		this.contentCache.clear();
		this.logger.debug('WebResourceFileSystemProvider cache cleared');
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
	 */
	private showPublishNotification(
		environmentId: string,
		webResourceId: string,
		filename: string
	): void {
		if (this.publishWebResourceUseCase === null) {
			return;
		}

		// Capture reference for use in async callback
		const publishUseCase = this.publishWebResourceUseCase;

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
