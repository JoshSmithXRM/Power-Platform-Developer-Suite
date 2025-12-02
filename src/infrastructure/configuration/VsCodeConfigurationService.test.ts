import * as vscode from 'vscode';

import { VsCodeConfigurationService } from './VsCodeConfigurationService';

describe('VsCodeConfigurationService', () => {
	let service: VsCodeConfigurationService;
	let mockGet: jest.Mock;

	beforeEach(() => {
		mockGet = jest.fn();
		(vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
			get: mockGet
		});
		service = new VsCodeConfigurationService();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('get', () => {
		it('should read configuration with powerPlatformDevSuite namespace', () => {
			mockGet.mockReturnValue(100);

			service.get('pluginTrace.defaultLimit', 100);

			expect(vscode.workspace.getConfiguration).toHaveBeenCalledWith('powerPlatformDevSuite');
		});

		it('should pass key and default value to config.get', () => {
			mockGet.mockReturnValue(250);

			service.get('pluginTrace.defaultLimit', 100);

			expect(mockGet).toHaveBeenCalledWith('pluginTrace.defaultLimit', 100);
		});

		it('should return configured value when set', () => {
			mockGet.mockReturnValue(500);

			const result = service.get('pluginTrace.defaultLimit', 100);

			expect(result).toBe(500);
		});

		it('should return default value when not configured', () => {
			mockGet.mockImplementation((_key: string, defaultValue: number) => defaultValue);

			const result = service.get('pluginTrace.defaultLimit', 100);

			expect(result).toBe(100);
		});

		it('should support string configuration values', () => {
			mockGet.mockReturnValue('custom-value');

			const result = service.get('some.stringKey', 'default');

			expect(result).toBe('custom-value');
		});

		it('should support boolean configuration values', () => {
			mockGet.mockReturnValue(true);

			const result = service.get('some.booleanKey', false);

			expect(result).toBe(true);
		});

		it('should support nested key paths', () => {
			mockGet.mockReturnValue(42);

			service.get('deeply.nested.key.path', 0);

			expect(mockGet).toHaveBeenCalledWith('deeply.nested.key.path', 0);
		});
	});

	describe('numeric validation', () => {
		describe('pluginTrace.defaultLimit (1-5000)', () => {
			it('should clamp value below minimum to minimum', () => {
				mockGet.mockReturnValue(0);

				const result = service.get('pluginTrace.defaultLimit', 100);

				expect(result).toBe(1);
			});

			it('should clamp value above maximum to maximum', () => {
				mockGet.mockReturnValue(10000);

				const result = service.get('pluginTrace.defaultLimit', 100);

				expect(result).toBe(5000);
			});

			it('should pass through value within valid range', () => {
				mockGet.mockReturnValue(2500);

				const result = service.get('pluginTrace.defaultLimit', 100);

				expect(result).toBe(2500);
			});
		});

		describe('pluginTrace.batchDeleteSize (50-1000)', () => {
			it('should clamp value below minimum to minimum', () => {
				mockGet.mockReturnValue(10);

				const result = service.get('pluginTrace.batchDeleteSize', 100);

				expect(result).toBe(50);
			});

			it('should clamp value above maximum to maximum', () => {
				mockGet.mockReturnValue(5000);

				const result = service.get('pluginTrace.batchDeleteSize', 100);

				expect(result).toBe(1000);
			});
		});

		describe('pluginTrace.defaultDeleteOldDays (1-365)', () => {
			it('should clamp zero to minimum (prevents deleting all traces)', () => {
				mockGet.mockReturnValue(0);

				const result = service.get('pluginTrace.defaultDeleteOldDays', 30);

				expect(result).toBe(1);
			});

			it('should clamp negative value to minimum', () => {
				mockGet.mockReturnValue(-10);

				const result = service.get('pluginTrace.defaultDeleteOldDays', 30);

				expect(result).toBe(1);
			});

			it('should clamp value above maximum to maximum', () => {
				mockGet.mockReturnValue(1000);

				const result = service.get('pluginTrace.defaultDeleteOldDays', 30);

				expect(result).toBe(365);
			});
		});

		describe('virtualTable settings', () => {
			it('should clamp initialPageSize (10-500)', () => {
				mockGet.mockReturnValue(1);
				expect(service.get('virtualTable.initialPageSize', 100)).toBe(10);

				mockGet.mockReturnValue(1000);
				expect(service.get('virtualTable.initialPageSize', 100)).toBe(500);
			});

			it('should clamp backgroundPageSize (100-2000)', () => {
				mockGet.mockReturnValue(50);
				expect(service.get('virtualTable.backgroundPageSize', 500)).toBe(100);

				mockGet.mockReturnValue(5000);
				expect(service.get('virtualTable.backgroundPageSize', 500)).toBe(2000);
			});

			it('should clamp maxCachedRecords (100-100000)', () => {
				mockGet.mockReturnValue(10);
				expect(service.get('virtualTable.maxCachedRecords', 10000)).toBe(100);

				mockGet.mockReturnValue(500000);
				expect(service.get('virtualTable.maxCachedRecords', 10000)).toBe(100000);
			});
		});

		describe('webResources.cacheTTL (10-600)', () => {
			it('should clamp value below minimum to minimum', () => {
				mockGet.mockReturnValue(1);

				const result = service.get('webResources.cacheTTL', 60);

				expect(result).toBe(10);
			});

			it('should clamp value above maximum to maximum', () => {
				mockGet.mockReturnValue(1000);

				const result = service.get('webResources.cacheTTL', 60);

				expect(result).toBe(600);
			});
		});

		describe('metadata.cacheDuration (60-3600)', () => {
			it('should clamp value below minimum to minimum', () => {
				mockGet.mockReturnValue(10);

				const result = service.get('metadata.cacheDuration', 300);

				expect(result).toBe(60);
			});

			it('should clamp value above maximum to maximum', () => {
				mockGet.mockReturnValue(10000);

				const result = service.get('metadata.cacheDuration', 300);

				expect(result).toBe(3600);
			});
		});

		describe('api.maxRetries (0-10)', () => {
			it('should allow zero (disables retries)', () => {
				mockGet.mockReturnValue(0);

				const result = service.get('api.maxRetries', 3);

				expect(result).toBe(0);
			});

			it('should clamp negative value to zero', () => {
				mockGet.mockReturnValue(-5);

				const result = service.get('api.maxRetries', 3);

				expect(result).toBe(0);
			});

			it('should clamp value above maximum to maximum', () => {
				mockGet.mockReturnValue(100);

				const result = service.get('api.maxRetries', 3);

				expect(result).toBe(10);
			});
		});

		describe('non-validated settings', () => {
			it('should pass through string values unchanged', () => {
				mockGet.mockReturnValue('any-string');

				const result = service.get('some.stringKey', 'default');

				expect(result).toBe('any-string');
			});

			it('should pass through boolean values unchanged', () => {
				mockGet.mockReturnValue(true);

				const result = service.get('some.booleanKey', false);

				expect(result).toBe(true);
			});

			it('should pass through numeric values without validation rules unchanged', () => {
				mockGet.mockReturnValue(999999);

				const result = service.get('some.unknownNumericKey', 0);

				expect(result).toBe(999999);
			});
		});
	});
});
