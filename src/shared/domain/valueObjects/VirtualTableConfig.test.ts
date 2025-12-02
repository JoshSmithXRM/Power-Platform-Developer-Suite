import { VirtualTableConfig } from './VirtualTableConfig';
import { IConfigurationService } from '../services/IConfigurationService';

describe('VirtualTableConfig', () => {
	describe('createDefault', () => {
		it('should create config with default values', () => {
			const config = VirtualTableConfig.createDefault();

			expect(config.getInitialPageSize()).toBe(100);
			expect(config.getMaxCachedRecords()).toBe(10000); // Configurable default
			expect(config.getBackgroundPageSize()).toBe(500);
			expect(config.isBackgroundLoadingEnabled()).toBe(true);
		});

		it('should enable background loading by default', () => {
			const config = VirtualTableConfig.createDefault();
			expect(config.shouldLoadInBackground()).toBe(true);
		});
	});

	describe('createFromConfig', () => {
		it('should read settings from configuration service', () => {
			const mockConfigService: IConfigurationService = {
				get: <T>(key: string, defaultValue: T): T => {
					switch (key) {
						case 'virtualTable.initialPageSize': return 50 as T;
						case 'virtualTable.maxCachedRecords': return 5000 as T;
						case 'virtualTable.backgroundPageSize': return 250 as T;
						default: return defaultValue;
					}
				}
			};

			const config = VirtualTableConfig.createFromConfig(mockConfigService);

			expect(config.getInitialPageSize()).toBe(50);
			expect(config.getMaxCachedRecords()).toBe(5000);
			expect(config.getBackgroundPageSize()).toBe(250);
			expect(config.isBackgroundLoadingEnabled()).toBe(true);
		});

		it('should use defaults when config service returns defaults', () => {
			const mockConfigService: IConfigurationService = {
				get: <T>(_key: string, defaultValue: T): T => defaultValue
			};

			const config = VirtualTableConfig.createFromConfig(mockConfigService);

			expect(config.getInitialPageSize()).toBe(100);
			expect(config.getMaxCachedRecords()).toBe(10000);
			expect(config.getBackgroundPageSize()).toBe(500);
		});
	});

	describe('create', () => {
		it('should create config with custom values', () => {
			const config = VirtualTableConfig.create(50, 10000, 1000, true);

			expect(config.getInitialPageSize()).toBe(50);
			expect(config.getMaxCachedRecords()).toBe(10000);
			expect(config.getBackgroundPageSize()).toBe(1000);
			expect(config.isBackgroundLoadingEnabled()).toBe(true);
		});

		it('should create config with background loading disabled', () => {
			const config = VirtualTableConfig.create(100, 5000, 500, false);

			expect(config.shouldLoadInBackground()).toBe(false);
			expect(config.isBackgroundLoadingEnabled()).toBe(false);
		});

		it('should default enableBackgroundLoading to true', () => {
			const config = VirtualTableConfig.create(100, 5000, 500);
			expect(config.isBackgroundLoadingEnabled()).toBe(true);
		});
	});

	describe('validation - initialPageSize', () => {
		it('should throw if initialPageSize is below minimum', () => {
			expect(() => VirtualTableConfig.create(9, 5000, 500)).toThrow(
				'Initial page size must be at least 10'
			);
		});

		it('should accept minimum initialPageSize', () => {
			const config = VirtualTableConfig.create(10, 5000, 500);
			expect(config.getInitialPageSize()).toBe(10);
		});

		it('should accept large initialPageSize (no upper limit)', () => {
			const config = VirtualTableConfig.create(5000, 10000, 500);
			expect(config.getInitialPageSize()).toBe(5000);
		});
	});

	describe('validation - maxCachedRecords', () => {
		it('should throw if maxCachedRecords is below minimum', () => {
			expect(() => VirtualTableConfig.create(100, 99, 100)).toThrow(
				'Max cached records must be at least 100'
			);
		});

		it('should accept minimum maxCachedRecords', () => {
			const config = VirtualTableConfig.create(100, 100, 100);
			expect(config.getMaxCachedRecords()).toBe(100);
		});

		it('should accept very large maxCachedRecords (no upper limit)', () => {
			const config = VirtualTableConfig.create(100, 1000000, 500);
			expect(config.getMaxCachedRecords()).toBe(1000000);
		});
	});

	describe('validation - backgroundPageSize', () => {
		it('should throw if backgroundPageSize is below minimum', () => {
			expect(() => VirtualTableConfig.create(100, 5000, 99)).toThrow(
				'Background page size must be at least 100'
			);
		});

		it('should accept minimum backgroundPageSize', () => {
			const config = VirtualTableConfig.create(100, 5000, 100);
			expect(config.getBackgroundPageSize()).toBe(100);
		});

		it('should accept large backgroundPageSize (no upper limit)', () => {
			const config = VirtualTableConfig.create(100, 50000, 10000);
			expect(config.getBackgroundPageSize()).toBe(10000);
		});
	});

	describe('validation - maxCachedRecords vs initialPageSize', () => {
		it('should throw if maxCachedRecords < initialPageSize', () => {
			expect(() => VirtualTableConfig.create(500, 400, 100)).toThrow(
				'Max cached records must be >= initial page size'
			);
		});

		it('should accept maxCachedRecords equal to initialPageSize', () => {
			const config = VirtualTableConfig.create(100, 100, 100);
			expect(config.getMaxCachedRecords()).toBe(100);
			expect(config.getInitialPageSize()).toBe(100);
		});
	});

	describe('shouldLoadInBackground', () => {
		it('should return true when background loading enabled', () => {
			const config = VirtualTableConfig.create(100, 5000, 500, true);
			expect(config.shouldLoadInBackground()).toBe(true);
		});

		it('should return false when background loading disabled', () => {
			const config = VirtualTableConfig.create(100, 5000, 500, false);
			expect(config.shouldLoadInBackground()).toBe(false);
		});
	});

	describe('getBackgroundPageCount', () => {
		it('should calculate correct page count with custom config', () => {
			const config = VirtualTableConfig.create(100, 5000, 500, true);
			// (5000 - 100) / 500 = 9.8 → ceil = 10
			expect(config.getBackgroundPageCount()).toBe(10);
		});

		it('should return 0 when background loading disabled', () => {
			const config = VirtualTableConfig.create(100, 5000, 500, false);
			expect(config.getBackgroundPageCount()).toBe(0);
		});

		it('should return 0 when maxCachedRecords equals initialPageSize', () => {
			const config = VirtualTableConfig.create(100, 100, 100, true);
			expect(config.getBackgroundPageCount()).toBe(0);
		});

		it('should calculate correctly for custom values', () => {
			// (10000 - 200) / 1000 = 9.8 → ceil = 10
			const config = VirtualTableConfig.create(200, 10000, 1000, true);
			expect(config.getBackgroundPageCount()).toBe(10);
		});

		it('should handle exact division', () => {
			// (1000 - 100) / 100 = 9 → ceil = 9
			const config = VirtualTableConfig.create(100, 1000, 100, true);
			expect(config.getBackgroundPageCount()).toBe(9);
		});
	});

	describe('getMaxLoadableRecords', () => {
		it('should return maxCachedRecords when background loading enabled', () => {
			const config = VirtualTableConfig.create(100, 5000, 500, true);
			expect(config.getMaxLoadableRecords()).toBe(5000);
		});

		it('should return initialPageSize when background loading disabled', () => {
			const config = VirtualTableConfig.create(100, 5000, 500, false);
			expect(config.getMaxLoadableRecords()).toBe(100);
		});
	});

	describe('withBackgroundLoadingDisabled', () => {
		it('should return new config with background loading disabled', () => {
			const original = VirtualTableConfig.create(100, 5000, 500, true);
			const disabled = original.withBackgroundLoadingDisabled();

			expect(original.isBackgroundLoadingEnabled()).toBe(true);
			expect(disabled.isBackgroundLoadingEnabled()).toBe(false);

			// Other values should be preserved
			expect(disabled.getInitialPageSize()).toBe(100);
			expect(disabled.getMaxCachedRecords()).toBe(5000);
			expect(disabled.getBackgroundPageSize()).toBe(500);
		});

		it('should be idempotent', () => {
			const config = VirtualTableConfig.createDefault()
				.withBackgroundLoadingDisabled()
				.withBackgroundLoadingDisabled();

			expect(config.isBackgroundLoadingEnabled()).toBe(false);
		});
	});

	describe('withInitialPageSize', () => {
		it('should return new config with different initial page size', () => {
			const original = VirtualTableConfig.create(100, 5000, 500, true);
			const modified = original.withInitialPageSize(200);

			expect(original.getInitialPageSize()).toBe(100);
			expect(modified.getInitialPageSize()).toBe(200);

			// Other values should be preserved
			expect(modified.getMaxCachedRecords()).toBe(5000);
			expect(modified.getBackgroundPageSize()).toBe(500);
			expect(modified.isBackgroundLoadingEnabled()).toBe(true);
		});

		it('should validate new page size', () => {
			const config = VirtualTableConfig.create(100, 5000, 500, true);
			expect(() => config.withInitialPageSize(5)).toThrow(
				'Initial page size must be at least 10'
			);
		});
	});

	describe('withMaxCachedRecords', () => {
		it('should return new config with different max cached records', () => {
			const original = VirtualTableConfig.create(100, 5000, 500, true);
			const modified = original.withMaxCachedRecords(10000);

			expect(original.getMaxCachedRecords()).toBe(5000);
			expect(modified.getMaxCachedRecords()).toBe(10000);

			// Other values should be preserved
			expect(modified.getInitialPageSize()).toBe(100);
			expect(modified.getBackgroundPageSize()).toBe(500);
		});

		it('should validate new max cached records against minimum', () => {
			const config = VirtualTableConfig.create(100, 5000, 500, true);
			// 50 is below minimum (100)
			expect(() => config.withMaxCachedRecords(50)).toThrow(
				'Max cached records must be at least 100'
			);
		});

		it('should validate new max cached records against initial page size', () => {
			// Create config with initial page size of 200
			const config = VirtualTableConfig.create(200, 5000, 500, true);
			// 150 is valid minimum but less than initial page size (200)
			expect(() => config.withMaxCachedRecords(150)).toThrow(
				'Max cached records must be >= initial page size'
			);
		});
	});

	describe('static constants', () => {
		it('should expose minimum validation constants (no upper limits)', () => {
			expect(VirtualTableConfig.MIN_INITIAL_PAGE_SIZE).toBe(10);
			expect(VirtualTableConfig.MIN_MAX_CACHED_RECORDS).toBe(100);
			expect(VirtualTableConfig.MIN_BACKGROUND_PAGE_SIZE).toBe(100);
		});
	});

	describe('immutability', () => {
		it('should not modify original when creating with methods', () => {
			const original = VirtualTableConfig.create(100, 5000, 500, true);
			const modified = original
				.withInitialPageSize(200)
				.withMaxCachedRecords(10000)
				.withBackgroundLoadingDisabled();

			// Original should be unchanged
			expect(original.getInitialPageSize()).toBe(100);
			expect(original.getMaxCachedRecords()).toBe(5000);
			expect(original.isBackgroundLoadingEnabled()).toBe(true);

			// Modified should have new values
			expect(modified.getInitialPageSize()).toBe(200);
			expect(modified.getMaxCachedRecords()).toBe(10000);
			expect(modified.isBackgroundLoadingEnabled()).toBe(false);
		});
	});
});
