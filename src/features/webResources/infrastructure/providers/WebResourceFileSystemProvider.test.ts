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
			const url = new URL(str);
			return {
				scheme: url.protocol.replace(':', ''),
				authority: url.hostname,
				path: url.pathname,
				toString: () => str
			};
		})
	},
	EventEmitter: jest.fn().mockImplementation(() => ({
		event: jest.fn(),
		fire: jest.fn()
	})),
	Disposable: jest.fn().mockImplementation((callback) => ({ dispose: callback }))
}));

describe('WebResourceFileSystemProvider', () => {
	let provider: WebResourceFileSystemProvider;
	let mockUseCase: jest.Mocked<GetWebResourceContentUseCase>;

	const testEnvironmentId = 'env-00000000-0000-0000-0000-000000000001';
	const testWebResourceId = 'wr-00000000-0000-0000-0000-000000000002';
	const testFilename = 'new_script.js';

	beforeEach(() => {
		jest.clearAllMocks();

		mockUseCase = {
			execute: jest.fn()
		} as unknown as jest.Mocked<GetWebResourceContentUseCase>;

		provider = new WebResourceFileSystemProvider(mockUseCase, null, null, new NullLogger());
	});

	describe('parseWebResourceUri', () => {
		it('should parse valid web resource URI', () => {
			// Arrange
			const uri = vscode.Uri.parse(`${WEB_RESOURCE_SCHEME}://${testEnvironmentId}/${testWebResourceId}/${testFilename}`);

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
			const uri = vscode.Uri.parse(`${WEB_RESOURCE_SCHEME}://${testEnvironmentId}/${testWebResourceId}/${nestedFilename}`);

			// Act
			const result = parseWebResourceUri(uri);

			// Assert
			expect(result).not.toBeNull();
			expect(result!.filename).toBe(nestedFilename);
		});

		it('should return null for non-web-resource scheme', () => {
			// Arrange
			const uri = vscode.Uri.parse(`file://${testEnvironmentId}/${testWebResourceId}/${testFilename}`);

			// Act
			const result = parseWebResourceUri(uri);

			// Assert
			expect(result).toBeNull();
		});

		it('should return null for URI with insufficient path parts', () => {
			// Arrange
			const uri = vscode.Uri.parse(`${WEB_RESOURCE_SCHEME}://${testEnvironmentId}/${testWebResourceId}`);

			// Act
			const result = parseWebResourceUri(uri);

			// Assert
			expect(result).toBeNull();
		});
	});

	describe('createWebResourceUri', () => {
		it('should create valid web resource URI', () => {
			// Act
			const uri = createWebResourceUri(testEnvironmentId, testWebResourceId, testFilename);

			// Assert
			expect(uri.scheme).toBe(WEB_RESOURCE_SCHEME);
			expect(uri.authority).toBe(testEnvironmentId);
			expect(uri.path).toBe(`/${testWebResourceId}/${testFilename}`);
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
				name: 'new_script.js'
			};
			mockUseCase.execute.mockResolvedValue(mockResult);

			// Act
			const result = await provider.readFile(uri);

			// Assert
			expect(result).toEqual(testContent);
			expect(mockUseCase.execute).toHaveBeenCalledWith(testEnvironmentId, testWebResourceId);
		});

		it('should cache content for subsequent reads', async () => {
			// Arrange
			const uri = createWebResourceUri(testEnvironmentId, testWebResourceId, testFilename);
			const testContent = new Uint8Array([72, 101, 108, 108, 111]);
			const mockResult: WebResourceContentResult = {
				content: testContent,
				fileExtension: '.js',
				displayName: 'Script',
				name: 'new_script.js'
			};
			mockUseCase.execute.mockResolvedValue(mockResult);

			// Act - First read
			await provider.readFile(uri);
			// Second read (should use cache)
			await provider.readFile(uri);

			// Assert - Use case should only be called once
			expect(mockUseCase.execute).toHaveBeenCalledTimes(1);
		});

		it('should throw FileNotFound for invalid URI', async () => {
			// Arrange
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
		it('should return file stat for valid web resource', async () => {
			// Arrange
			const uri = createWebResourceUri(testEnvironmentId, testWebResourceId, testFilename);
			const testContent = new Uint8Array([72, 101, 108, 108, 111]);
			const mockResult: WebResourceContentResult = {
				content: testContent,
				fileExtension: '.js',
				displayName: 'Script',
				name: 'new_script.js'
			};
			mockUseCase.execute.mockResolvedValue(mockResult);

			// Act
			const stat = await provider.stat(uri);

			// Assert
			expect(stat.type).toBe(vscode.FileType.File);
			expect(stat.size).toBe(testContent.length);
		});

		it('should throw FileNotFound for invalid URI', async () => {
			// Arrange
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
				name: 'new_script.js'
			};
			mockUseCase.execute.mockResolvedValue(mockResult);

			// First read to populate cache
			await provider.readFile(uri);

			// Act - Invalidate cache
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
				name: 'new_script.js'
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

	const testEnvironmentId = 'env-00000000-0000-0000-0000-000000000001';
	const testWebResourceId = 'wr-00000000-0000-0000-0000-000000000002';
	const testFilename = 'new_script.js';

	beforeEach(() => {
		jest.clearAllMocks();

		mockGetUseCase = {
			execute: jest.fn()
		} as unknown as jest.Mocked<GetWebResourceContentUseCase>;

		mockUpdateUseCase = {
			execute: jest.fn()
		} as unknown as jest.Mocked<UpdateWebResourceUseCase>;

		provider = new WebResourceFileSystemProvider(mockGetUseCase, mockUpdateUseCase, null, new NullLogger());
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

		it('should update cache after successful save', async () => {
			// Arrange
			const uri = createWebResourceUri(testEnvironmentId, testWebResourceId, testFilename);
			const originalContent = new Uint8Array([79, 108, 100]); // "Old"
			const newContent = new Uint8Array([78, 101, 119]); // "New"
			const mockResult: WebResourceContentResult = {
				content: originalContent,
				fileExtension: '.js',
				displayName: 'Script',
				name: 'new_script.js'
			};
			mockGetUseCase.execute.mockResolvedValue(mockResult);
			mockUpdateUseCase.execute.mockResolvedValue();

			// First read to populate cache
			await provider.readFile(uri);
			expect(mockGetUseCase.execute).toHaveBeenCalledTimes(1);

			// Act - Write new content
			await provider.writeFile(uri, newContent);

			// Read again - should use updated cache, not call getUseCase
			const result = await provider.readFile(uri);

			// Assert
			expect(mockGetUseCase.execute).toHaveBeenCalledTimes(1); // Still 1, used cache
			expect(result).toEqual(newContent);
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
			// Arrange
			const uri = vscode.Uri.parse(`file://${testEnvironmentId}/${testWebResourceId}`);
			const content = new Uint8Array([72, 101, 108, 108, 111]);

			// Act & Assert
			await expect(provider.writeFile(uri, content)).rejects.toThrow();
		});
	});
});
