import * as vscode from 'vscode';
import {
	WebResourceFileSystemProvider,
	WEB_RESOURCE_SCHEME,
	parseWebResourceUri,
	createWebResourceUri
} from './WebResourceFileSystemProvider';
import type { GetWebResourceContentUseCase, WebResourceContentResult } from '../../application/useCases/GetWebResourceContentUseCase';
import type { UpdateWebResourceUseCase } from '../../application/useCases/UpdateWebResourceUseCase';
import { NonEditableWebResourceError } from '../../application/useCases/UpdateWebResourceUseCase';
import { NullLogger } from '../../../../infrastructure/logging/NullLogger';
import { WebResourceConnectionRegistry } from './WebResourceConnectionRegistry';

// Mock vscode module
jest.mock('vscode', () => ({
	FileSystemError: {
		FileNotFound: jest.fn((uri) => new Error(`File not found: ${uri}`)),
		NoPermissions: jest.fn((msg) => new Error(msg)),
		Unavailable: jest.fn((uri) => new Error(`Unavailable: ${uri}`))
	},
	FileType: {
		File: 1,
		Directory: 2
	},
	FileChangeType: {
		Changed: 1,
		Created: 2,
		Deleted: 3
	},
	Uri: {
		parse: jest.fn((str: string) => {
			// Parse URI format: scheme:///path or scheme://authority/path
			const match = str.match(/^([^:]+):\/\/\/?(.*)$/);
			if (match === null || match[1] === undefined || match[2] === undefined) {
				return { scheme: '', authority: '', path: '', toString: () => str };
			}
			const scheme = match[1];
			const rest = match[2];
			// For triple-slash URIs (scheme:///path), authority is empty
			// For double-slash URIs (scheme://authority/path), first segment is authority
			const hasTripleSlash = str.includes(':///');
			let authority = '';
			let path = '/' + rest;
			if (!hasTripleSlash && rest.includes('/')) {
				const firstSlash = rest.indexOf('/');
				authority = rest.substring(0, firstSlash);
				path = rest.substring(firstSlash);
			} else if (!hasTripleSlash && rest.length > 0) {
				// scheme://authority (no path)
				authority = rest;
				path = '';
			}
			return {
				scheme,
				authority,
				path,
				toString: () => str
			};
		})
	},
	EventEmitter: jest.fn().mockImplementation(() => ({
		event: jest.fn(),
		fire: jest.fn()
	})),
	Disposable: jest.fn().mockImplementation((callback) => ({ dispose: callback })),
	window: {
		showWarningMessage: jest.fn(),
		showInformationMessage: jest.fn(),
		showErrorMessage: jest.fn(),
		showTextDocument: jest.fn()
	},
	workspace: {
		textDocuments: [],
		applyEdit: jest.fn(),
		openTextDocument: jest.fn()
	},
	commands: {
		executeCommand: jest.fn()
	},
	Range: jest.fn().mockImplementation((startLine: number, startChar: number, endLine: number, endChar: number) => ({
		start: { line: startLine, character: startChar },
		end: { line: endLine, character: endChar }
	})),
	WorkspaceEdit: jest.fn().mockImplementation(() => ({
		replace: jest.fn()
	}))
}));

describe('WebResourceFileSystemProvider', () => {
	let provider: WebResourceFileSystemProvider;
	let mockUseCase: jest.Mocked<GetWebResourceContentUseCase>;
	let mockRegistry: WebResourceConnectionRegistry;

	// Test identifiers
	const testEnvironmentId = 'env-00000000-0000-0000-0000-000000000001';
	const testWebResourceId = 'wr-00000000-0000-0000-0000-000000000002';
	const testFilename = 'new_script.js';

	beforeEach(() => {
		jest.clearAllMocks();
		WebResourceConnectionRegistry.resetInstance();

		mockUseCase = {
			execute: jest.fn()
		} as unknown as jest.Mocked<GetWebResourceContentUseCase>;

		// Create registry and register the environment resources
		mockRegistry = WebResourceConnectionRegistry.getInstance(new NullLogger());
		mockRegistry.register(testEnvironmentId, {
			getWebResourceContentUseCase: mockUseCase,
			updateWebResourceUseCase: null,
			publishWebResourceUseCase: null,
			webResourceRepository: undefined
		});

		// Create provider with registry
		provider = new WebResourceFileSystemProvider(mockRegistry, new NullLogger());
	});

	afterEach(() => {
		WebResourceConnectionRegistry.resetInstance();
	});

	describe('parseWebResourceUri', () => {
		it('should parse valid web resource URI', () => {
			// Arrange - URI uses environmentId in path for VS Code document identity
			const uri = vscode.Uri.parse(`${WEB_RESOURCE_SCHEME}:///${testEnvironmentId}/${testWebResourceId}/${testFilename}`);

			// Act
			const result = parseWebResourceUri(uri);

			// Assert
			expect(result).not.toBeNull();
			expect(result!.environmentId).toBe(testEnvironmentId);
			expect(result!.webResourceId).toBe(testWebResourceId);
			expect(result!.filename).toBe(testFilename);
		});

		it('should parse URI with nested path', () => {
			// Arrange
			const nestedFilename = 'scripts/utils/helper.js';
			const uri = vscode.Uri.parse(`${WEB_RESOURCE_SCHEME}:///${testEnvironmentId}/${testWebResourceId}/${nestedFilename}`);

			// Act
			const result = parseWebResourceUri(uri);

			// Assert
			expect(result).not.toBeNull();
			expect(result!.filename).toBe(nestedFilename);
		});

		it('should return null for non-web-resource scheme', () => {
			// Arrange
			const uri = vscode.Uri.parse(`file:///${testEnvironmentId}/${testWebResourceId}/${testFilename}`);

			// Act
			const result = parseWebResourceUri(uri);

			// Assert
			expect(result).toBeNull();
		});

		it('should return null for URI with insufficient path parts', () => {
			// Arrange - only 2 path parts (environmentId, webResourceId) - missing filename
			const uri = vscode.Uri.parse(`${WEB_RESOURCE_SCHEME}:///${testEnvironmentId}/${testWebResourceId}`);

			// Act
			const result = parseWebResourceUri(uri);

			// Assert
			expect(result).toBeNull();
		});
	});

	describe('createWebResourceUri', () => {
		it('should create valid web resource URI with environmentId in path', () => {
			// Act - URI uses environmentId in path for VS Code document identity
			const uri = createWebResourceUri(testEnvironmentId, testWebResourceId, testFilename);

			// Assert
			expect(uri.scheme).toBe(WEB_RESOURCE_SCHEME);
			expect(uri.authority).toBe(''); // Empty authority for triple-slash URI
			expect(uri.path).toBe(`/${testEnvironmentId}/${testWebResourceId}/${testFilename}`);
		});
	});

	describe('readFile', () => {
		it('should fetch and return web resource content', async () => {
			// Arrange
			const uri = createWebResourceUri(testEnvironmentId, testWebResourceId, testFilename);
			const testContent = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
			const mockResult: WebResourceContentResult = {
				content: testContent,
				fileExtension: '.js',
				displayName: 'Script',
				name: 'new_script.js',
				modifiedOn: new Date('2024-01-15T10:30:00Z')
			};
			mockUseCase.execute.mockResolvedValue(mockResult);

			// Act
			const result = await provider.readFile(uri);

			// Assert
			expect(result).toEqual(testContent);
			expect(mockUseCase.execute).toHaveBeenCalledWith(testEnvironmentId, testWebResourceId);
		});

		it('should fetch fresh content for each read', async () => {
			// Arrange
			const uri = createWebResourceUri(testEnvironmentId, testWebResourceId, testFilename);
			const testContent = new Uint8Array([72, 101, 108, 108, 111]);
			const mockResult: WebResourceContentResult = {
				content: testContent,
				fileExtension: '.js',
				displayName: 'Script',
				name: 'new_script.js',
				modifiedOn: new Date('2024-01-15T10:30:00Z')
			};
			mockUseCase.execute.mockResolvedValue(mockResult);

			// Act - First read
			await provider.readFile(uri);
			// Second read (provider always fetches fresh content)
			await provider.readFile(uri);

			// Assert - Use case called for each read (no content caching, only concurrent deduping)
			expect(mockUseCase.execute).toHaveBeenCalledTimes(2);
		});

		it('should throw FileNotFound for invalid URI', async () => {
			// Arrange - invalid scheme
			const uri = vscode.Uri.parse(`file://${testEnvironmentId}/${testWebResourceId}`);

			// Act & Assert
			await expect(provider.readFile(uri)).rejects.toThrow();
		});

		it('should throw FileNotFound when use case fails', async () => {
			// Arrange
			const uri = createWebResourceUri(testEnvironmentId, testWebResourceId, testFilename);
			mockUseCase.execute.mockRejectedValue(new Error('Not found'));

			// Act & Assert
			await expect(provider.readFile(uri)).rejects.toThrow();
		});
	});

	describe('stat', () => {
		it('should return file stat for valid web resource after content is loaded', async () => {
			// Arrange
			const uri = createWebResourceUri(testEnvironmentId, testWebResourceId, testFilename);
			const testContent = new Uint8Array([72, 101, 108, 108, 111]);
			const mockResult: WebResourceContentResult = {
				content: testContent,
				fileExtension: '.js',
				displayName: 'Script',
				name: 'new_script.js',
				modifiedOn: new Date('2024-01-15T10:30:00Z')
			};
			mockUseCase.execute.mockResolvedValue(mockResult);

			// First, read the file to populate the cache
			await provider.readFile(uri);

			// Act
			const stat = await provider.stat(uri);

			// Assert
			expect(stat.type).toBe(vscode.FileType.File);
			expect(stat.size).toBe(testContent.length);
		});

		it('should throw FileNotFound for invalid URI', async () => {
			// Arrange - invalid scheme
			const uri = vscode.Uri.parse(`file://${testEnvironmentId}/${testWebResourceId}`);

			// Act & Assert
			await expect(provider.stat(uri)).rejects.toThrow();
		});
	});

	describe('write operations without update use case', () => {
		it('should throw NoPermissions for writeFile when update use case is null', async () => {
			// Arrange
			const uri = createWebResourceUri(testEnvironmentId, testWebResourceId, testFilename);
			const content = new Uint8Array([72, 101, 108, 108, 111]);

			// Act & Assert
			await expect(provider.writeFile(uri, content)).rejects.toThrow('Web resource editing is not available');
		});
	});

	describe('unsupported operations', () => {
		it('should throw NoPermissions for delete', () => {
			// Act & Assert
			expect(() => provider.delete()).toThrow('Web resources are read-only');
		});

		it('should throw NoPermissions for rename', () => {
			// Act & Assert
			expect(() => provider.rename()).toThrow('Web resources are read-only');
		});

		it('should throw NoPermissions for createDirectory', () => {
			// Act & Assert
			expect(() => provider.createDirectory()).toThrow('Web resources are read-only');
		});

		it('should return empty array for readDirectory', () => {
			// Act
			const result = provider.readDirectory();

			// Assert
			expect(result).toEqual([]);
		});
	});

	describe('watch', () => {
		it('should return a disposable', () => {
			// Act
			const disposable = provider.watch();

			// Assert
			expect(disposable).toBeDefined();
		});
	});

	describe('cache management', () => {
		it('should invalidate cache for specific web resource', async () => {
			// Arrange
			const uri = createWebResourceUri(testEnvironmentId, testWebResourceId, testFilename);
			const testContent = new Uint8Array([72, 101, 108, 108, 111]);
			const mockResult: WebResourceContentResult = {
				content: testContent,
				fileExtension: '.js',
				displayName: 'Script',
				name: 'new_script.js',
				modifiedOn: new Date('2024-01-15T10:30:00Z')
			};
			mockUseCase.execute.mockResolvedValue(mockResult);

			// First read to populate cache
			await provider.readFile(uri);

			// Act - Invalidate cache (uses environmentId)
			provider.invalidateCache(testEnvironmentId, testWebResourceId);

			// Second read should call use case again
			await provider.readFile(uri);

			// Assert
			expect(mockUseCase.execute).toHaveBeenCalledTimes(2);
		});

		it('should clear all cache', async () => {
			// Arrange
			const uri1 = createWebResourceUri(testEnvironmentId, 'wr-1', 'file1.js');
			const uri2 = createWebResourceUri(testEnvironmentId, 'wr-2', 'file2.js');
			const testContent = new Uint8Array([72, 101, 108, 108, 111]);
			const mockResult: WebResourceContentResult = {
				content: testContent,
				fileExtension: '.js',
				displayName: 'Script',
				name: 'new_script.js',
				modifiedOn: new Date('2024-01-15T10:30:00Z')
			};
			mockUseCase.execute.mockResolvedValue(mockResult);

			// First reads to populate cache
			await provider.readFile(uri1);
			await provider.readFile(uri2);

			// Act - Clear all cache
			provider.clearCache();

			// Read again
			await provider.readFile(uri1);
			await provider.readFile(uri2);

			// Assert - Use case should be called 4 times (2 before clear, 2 after)
			expect(mockUseCase.execute).toHaveBeenCalledTimes(4);
		});
	});

	describe('WEB_RESOURCE_SCHEME constant', () => {
		it('should have correct scheme value', () => {
			expect(WEB_RESOURCE_SCHEME).toBe('ppds-webresource');
		});
	});
});

describe('WebResourceFileSystemProvider with write support', () => {
	let provider: WebResourceFileSystemProvider;
	let mockGetUseCase: jest.Mocked<GetWebResourceContentUseCase>;
	let mockUpdateUseCase: jest.Mocked<UpdateWebResourceUseCase>;
	let mockRegistry: WebResourceConnectionRegistry;

	const testEnvironmentId = 'env-00000000-0000-0000-0000-000000000001';
	const testWebResourceId = 'wr-00000000-0000-0000-0000-000000000002';
	const testFilename = 'new_script.js';

	beforeEach(() => {
		jest.clearAllMocks();
		WebResourceConnectionRegistry.resetInstance();

		mockGetUseCase = {
			execute: jest.fn()
		} as unknown as jest.Mocked<GetWebResourceContentUseCase>;

		mockUpdateUseCase = {
			execute: jest.fn()
		} as unknown as jest.Mocked<UpdateWebResourceUseCase>;

		// Create registry and register environment resources with write support
		mockRegistry = WebResourceConnectionRegistry.getInstance(new NullLogger());
		mockRegistry.register(testEnvironmentId, {
			getWebResourceContentUseCase: mockGetUseCase,
			updateWebResourceUseCase: mockUpdateUseCase,
			publishWebResourceUseCase: null,
			webResourceRepository: undefined
		});

		provider = new WebResourceFileSystemProvider(mockRegistry, new NullLogger());
	});

	afterEach(() => {
		WebResourceConnectionRegistry.resetInstance();
	});

	describe('writeFile', () => {
		it('should save web resource content', async () => {
			// Arrange
			const uri = createWebResourceUri(testEnvironmentId, testWebResourceId, testFilename);
			const content = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
			mockUpdateUseCase.execute.mockResolvedValue();

			// Act
			await provider.writeFile(uri, content);

			// Assert
			expect(mockUpdateUseCase.execute).toHaveBeenCalledWith(
				testEnvironmentId,
				testWebResourceId,
				content
			);
		});

		it('should update stat cache after successful save', async () => {
			// Arrange
			const uri = createWebResourceUri(testEnvironmentId, testWebResourceId, testFilename);
			const originalContent = new Uint8Array([79, 108, 100]); // "Old"
			const newContent = new Uint8Array([78, 101, 119]); // "New"
			const mockResult: WebResourceContentResult = {
				content: originalContent,
				fileExtension: '.js',
				displayName: 'Script',
				name: 'new_script.js',
				modifiedOn: new Date('2024-01-15T10:30:00Z')
			};
			mockGetUseCase.execute.mockResolvedValue(mockResult);
			mockUpdateUseCase.execute.mockResolvedValue();

			// First read to populate cache
			await provider.readFile(uri);

			// Act - Write new content
			await provider.writeFile(uri, newContent);

			// Assert - stat should reflect the new content size (cache updated)
			const stat = await provider.stat(uri);
			expect(stat.size).toBe(newContent.length);
		});

		it('should throw NoPermissions for non-editable binary web resource', async () => {
			// Arrange
			const uri = createWebResourceUri(testEnvironmentId, testWebResourceId, testFilename);
			const content = new Uint8Array([72, 101, 108, 108, 111]);
			mockUpdateUseCase.execute.mockRejectedValue(new NonEditableWebResourceError(testWebResourceId));

			// Act & Assert
			await expect(provider.writeFile(uri, content)).rejects.toThrow('Cannot edit binary web resource');
		});

		it('should throw Unavailable for other errors', async () => {
			// Arrange
			const uri = createWebResourceUri(testEnvironmentId, testWebResourceId, testFilename);
			const content = new Uint8Array([72, 101, 108, 108, 111]);
			mockUpdateUseCase.execute.mockRejectedValue(new Error('Network error'));

			// Act & Assert
			await expect(provider.writeFile(uri, content)).rejects.toThrow(/Unavailable/);
		});

		it('should throw FileNotFound for invalid URI', async () => {
			// Arrange - invalid scheme
			const uri = vscode.Uri.parse(`file://${testEnvironmentId}/${testWebResourceId}`);
			const content = new Uint8Array([72, 101, 108, 108, 111]);

			// Act & Assert
			await expect(provider.writeFile(uri, content)).rejects.toThrow();
		});
	});
});

describe('WebResourceFileSystemProvider with conflict detection', () => {
	let provider: WebResourceFileSystemProvider;
	let mockGetUseCase: jest.Mocked<GetWebResourceContentUseCase>;
	let mockUpdateUseCase: jest.Mocked<UpdateWebResourceUseCase>;
	let mockRepository: jest.Mocked<{ getModifiedOn: jest.Mock }>;
	let mockRegistry: WebResourceConnectionRegistry;

	const testEnvironmentId = 'env-00000000-0000-0000-0000-000000000001';
	const testWebResourceId = 'wr-00000000-0000-0000-0000-000000000002';
	const testFilename = 'new_script.js';
	const originalModifiedOn = new Date('2024-01-15T10:30:00Z');

	beforeEach(() => {
		jest.clearAllMocks();
		WebResourceConnectionRegistry.resetInstance();

		mockGetUseCase = {
			execute: jest.fn()
		} as unknown as jest.Mocked<GetWebResourceContentUseCase>;

		mockUpdateUseCase = {
			execute: jest.fn()
		} as unknown as jest.Mocked<UpdateWebResourceUseCase>;

		mockRepository = {
			getModifiedOn: jest.fn()
		};

		// Create registry and register environment resources with repository for conflict detection
		mockRegistry = WebResourceConnectionRegistry.getInstance(new NullLogger());
		mockRegistry.register(testEnvironmentId, {
			getWebResourceContentUseCase: mockGetUseCase,
			updateWebResourceUseCase: mockUpdateUseCase,
			publishWebResourceUseCase: null,
			webResourceRepository: mockRepository as unknown as jest.Mocked<import('../../domain/interfaces/IWebResourceRepository').IWebResourceRepository>
		});

		provider = new WebResourceFileSystemProvider(mockRegistry, new NullLogger());
	});

	afterEach(() => {
		WebResourceConnectionRegistry.resetInstance();
	});

	describe('conflict detection', () => {
		it('should proceed with save when no conflict (same modifiedOn)', async () => {
			// Arrange
			const uri = createWebResourceUri(testEnvironmentId, testWebResourceId, testFilename);
			const originalContent = new Uint8Array([79, 108, 100]); // "Old"
			const newContent = new Uint8Array([78, 101, 119]); // "New"

			const mockResult: WebResourceContentResult = {
				content: originalContent,
				fileExtension: '.js',
				displayName: 'Script',
				name: 'new_script.js',
				modifiedOn: originalModifiedOn
			};
			mockGetUseCase.execute.mockResolvedValue(mockResult);
			mockUpdateUseCase.execute.mockResolvedValue();
			mockRepository.getModifiedOn.mockResolvedValue(originalModifiedOn); // Same timestamp

			// First read to populate cache
			await provider.readFile(uri);

			// Act - Write new content (should not trigger conflict modal)
			await provider.writeFile(uri, newContent);

			// Assert - Save should proceed
			expect(mockUpdateUseCase.execute).toHaveBeenCalledWith(
				testEnvironmentId,
				testWebResourceId,
				newContent
			);
		});

		it('should check for conflict when server has newer version', async () => {
			// Arrange
			const uri = createWebResourceUri(testEnvironmentId, testWebResourceId, testFilename);
			const originalContent = new Uint8Array([79, 108, 100]); // "Old"
			const newContent = new Uint8Array([78, 101, 119]); // "New"
			const serverModifiedOn = new Date('2024-01-15T12:00:00Z'); // Newer than cached

			const mockResult: WebResourceContentResult = {
				content: originalContent,
				fileExtension: '.js',
				displayName: 'Script',
				name: 'new_script.js',
				modifiedOn: originalModifiedOn
			};
			mockGetUseCase.execute.mockResolvedValue(mockResult);
			mockUpdateUseCase.execute.mockResolvedValue();
			mockRepository.getModifiedOn.mockResolvedValue(serverModifiedOn);

			// Mock vscode.window.showWarningMessage
			const showWarningMessage = vscode.window.showWarningMessage as jest.Mock;
			showWarningMessage.mockResolvedValue('Overwrite');

			// First read to populate cache
			await provider.readFile(uri);

			// Act - Write new content (should trigger conflict modal)
			await provider.writeFile(uri, newContent);

			// Assert
			expect(mockRepository.getModifiedOn).toHaveBeenCalledWith(
				testEnvironmentId,
				testWebResourceId
			);
			expect(showWarningMessage).toHaveBeenCalledWith(
				expect.stringContaining('has been modified on the server'),
				expect.objectContaining({ modal: true }),
				'Compare First',
				'Overwrite',
				'Discard My Work'
			);
			expect(mockUpdateUseCase.execute).toHaveBeenCalled();
		});

		it('should cancel save when user cancels conflict dialog', async () => {
			// Arrange
			const uri = createWebResourceUri(testEnvironmentId, testWebResourceId, testFilename);
			const originalContent = new Uint8Array([79, 108, 100]);
			const newContent = new Uint8Array([78, 101, 119]);
			const serverModifiedOn = new Date('2024-01-15T12:00:00Z');

			const mockResult: WebResourceContentResult = {
				content: originalContent,
				fileExtension: '.js',
				displayName: 'Script',
				name: 'new_script.js',
				modifiedOn: originalModifiedOn
			};
			mockGetUseCase.execute.mockResolvedValue(mockResult);
			mockRepository.getModifiedOn.mockResolvedValue(serverModifiedOn);

			// Mock user clicking cancel (undefined means Escape or X button)
			const showWarningMessage = vscode.window.showWarningMessage as jest.Mock;
			showWarningMessage.mockResolvedValue(undefined);

			// First read to populate cache
			await provider.readFile(uri);

			// Act
			await provider.writeFile(uri, newContent);

			// Assert - Save should NOT be called
			expect(mockUpdateUseCase.execute).not.toHaveBeenCalled();
		});

		it('should skip conflict check when content unchanged', async () => {
			// Arrange
			const uri = createWebResourceUri(testEnvironmentId, testWebResourceId, testFilename);
			const originalContent = new Uint8Array([79, 108, 100]);

			const mockResult: WebResourceContentResult = {
				content: originalContent,
				fileExtension: '.js',
				displayName: 'Script',
				name: 'new_script.js',
				modifiedOn: originalModifiedOn
			};
			mockGetUseCase.execute.mockResolvedValue(mockResult);

			// First read to populate cache
			await provider.readFile(uri);

			// Act - Write same content (should skip conflict check and save)
			await provider.writeFile(uri, originalContent);

			// Assert - No conflict check, no save (content unchanged)
			expect(mockRepository.getModifiedOn).not.toHaveBeenCalled();
			expect(mockUpdateUseCase.execute).not.toHaveBeenCalled();
		});

		it('should proceed with save when conflict check fails', async () => {
			// Arrange
			const uri = createWebResourceUri(testEnvironmentId, testWebResourceId, testFilename);
			const originalContent = new Uint8Array([79, 108, 100]);
			const newContent = new Uint8Array([78, 101, 119]);

			const mockResult: WebResourceContentResult = {
				content: originalContent,
				fileExtension: '.js',
				displayName: 'Script',
				name: 'new_script.js',
				modifiedOn: originalModifiedOn
			};
			mockGetUseCase.execute.mockResolvedValue(mockResult);
			mockUpdateUseCase.execute.mockResolvedValue();
			// Conflict check fails (network error, etc.)
			mockRepository.getModifiedOn.mockRejectedValue(new Error('Network error'));

			// First read to populate cache
			await provider.readFile(uri);

			// Act - Write new content (should proceed despite conflict check failure)
			await provider.writeFile(uri, newContent);

			// Assert - Save should proceed
			expect(mockUpdateUseCase.execute).toHaveBeenCalledWith(
				testEnvironmentId,
				testWebResourceId,
				newContent
			);
		});

		it('should reload from server when user chooses reload option on conflict', async () => {
			// Arrange
			const uri = createWebResourceUri(testEnvironmentId, testWebResourceId, testFilename);
			const originalContent = new Uint8Array([79, 108, 100]); // "Old"
			const localChanges = new Uint8Array([76, 111, 99, 97, 108]); // "Local"
			const serverContent = new Uint8Array([83, 101, 114, 118, 101, 114]); // "Server"
			const serverModifiedOn = new Date('2024-01-15T12:00:00Z'); // Newer than cached

			// Initial read returns original content
			const mockInitialResult: WebResourceContentResult = {
				content: originalContent,
				fileExtension: '.js',
				displayName: 'Script',
				name: 'new_script.js',
				modifiedOn: originalModifiedOn
			};

			// Reload returns server content
			const mockServerResult: WebResourceContentResult = {
				content: serverContent,
				fileExtension: '.js',
				displayName: 'Script',
				name: 'new_script.js',
				modifiedOn: serverModifiedOn
			};

			// First call returns original, second call (reload) returns server content
			mockGetUseCase.execute
				.mockResolvedValueOnce(mockInitialResult)
				.mockResolvedValueOnce(mockServerResult);
			mockRepository.getModifiedOn.mockResolvedValue(serverModifiedOn);

			// Mock user clicking "Discard My Work"
			const showWarningMessage = vscode.window.showWarningMessage as jest.Mock;
			showWarningMessage.mockResolvedValue('Discard My Work');

			// Mock document for reload
			const mockDocument = {
				uri: { toString: () => uri.toString() },
				getText: () => 'Old',
				positionAt: (offset: number) => ({ line: 0, character: offset }),
				save: jest.fn().mockResolvedValue(true)
			};
			(vscode.workspace as unknown as { textDocuments: unknown[] }).textDocuments = [mockDocument];
			(vscode.window.showTextDocument as jest.Mock).mockResolvedValue({});
			(vscode.workspace.openTextDocument as jest.Mock).mockResolvedValue(mockDocument);

			// First read to populate cache
			await provider.readFile(uri);

			// Act - Try to write local changes (should trigger conflict, then reload)
			await provider.writeFile(uri, localChanges);

			// Assert
			// 1. Conflict was detected
			expect(showWarningMessage).toHaveBeenCalledWith(
				expect.stringContaining('has been modified on the server'),
				expect.objectContaining({ modal: true }),
				'Compare First',
				'Overwrite',
				'Discard My Work'
			);

			// 2. Save should NOT be called (user chose reload)
			expect(mockUpdateUseCase.execute).not.toHaveBeenCalled();

			// 3. Current editor was closed and fresh document opened
			expect(vscode.commands.executeCommand).toHaveBeenCalledWith('workbench.action.closeActiveEditor');
			expect(vscode.workspace.openTextDocument).toHaveBeenCalled();
			expect(vscode.window.showTextDocument).toHaveBeenCalled();

			// 4. Success message was shown
			expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
				expect.stringContaining('Reloaded')
			);
		});
	});
});
