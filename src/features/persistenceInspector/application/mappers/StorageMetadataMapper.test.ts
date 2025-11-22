import { StorageMetadataMapper } from './StorageMetadataMapper';
import { StorageMetadata } from '../../domain/valueObjects/StorageMetadata';

describe('StorageMetadataMapper', () => {
	let mapper: StorageMetadataMapper;

	beforeEach(() => {
		mapper = new StorageMetadataMapper();
	});

	describe('toViewModel - basic mapping', () => {
		it('should map dataType', () => {
			// Arrange
			const metadata = StorageMetadata.fromValue('test string');

			// Act
			const result = mapper.toViewModel(metadata);

			// Assert
			expect(result.dataType).toBe('string');
		});

		it('should map sizeInBytes', () => {
			// Arrange
			const metadata = StorageMetadata.fromValue({ test: 'value' });

			// Act
			const result = mapper.toViewModel(metadata);

			// Assert
			expect(result.sizeInBytes).toBeGreaterThan(0);
		});

		it('should format displaySize for small values', () => {
			// Arrange
			const metadata = StorageMetadata.fromValue('x');

			// Act
			const result = mapper.toViewModel(metadata);

			// Assert
			expect(result.displaySize).toMatch(/\d+ B/);
		});

		it('should format displaySize for KB values', () => {
			// Arrange
			const largeString = 'x'.repeat(2048);
			const metadata = StorageMetadata.fromValue(largeString);

			// Act
			const result = mapper.toViewModel(metadata);

			// Assert
			expect(result.displaySize).toMatch(/\d+\.\d+ KB/);
		});

		it('should format displaySize for MB values', () => {
			// Arrange
			const veryLargeString = 'x'.repeat(1048576);
			const metadata = StorageMetadata.fromValue(veryLargeString);

			// Act
			const result = mapper.toViewModel(metadata);

			// Assert
			expect(result.displaySize).toMatch(/\d+\.\d+ MB/);
		});
	});

	describe('toViewModel - data types', () => {
		it('should map string dataType', () => {
			// Arrange
			const metadata = StorageMetadata.fromValue('test');

			// Act
			const result = mapper.toViewModel(metadata);

			// Assert
			expect(result.dataType).toBe('string');
		});

		it('should map object dataType', () => {
			// Arrange
			const metadata = StorageMetadata.fromValue({ key: 'value' });

			// Act
			const result = mapper.toViewModel(metadata);

			// Assert
			expect(result.dataType).toBe('object');
		});

		it('should map array dataType', () => {
			// Arrange
			const metadata = StorageMetadata.fromValue([1, 2, 3]);

			// Act
			const result = mapper.toViewModel(metadata);

			// Assert
			expect(result.dataType).toBe('array');
		});

		it('should map number dataType', () => {
			// Arrange
			const metadata = StorageMetadata.fromValue(42);

			// Act
			const result = mapper.toViewModel(metadata);

			// Assert
			expect(result.dataType).toBe('number');
		});

		it('should map boolean dataType', () => {
			// Arrange
			const metadata = StorageMetadata.fromValue(true);

			// Act
			const result = mapper.toViewModel(metadata);

			// Assert
			expect(result.dataType).toBe('boolean');
		});

		it('should map null dataType', () => {
			// Arrange
			const metadata = StorageMetadata.fromValue(null);

			// Act
			const result = mapper.toViewModel(metadata);

			// Assert
			expect(result.dataType).toBe('null');
		});

		it('should map undefined dataType', () => {
			// Arrange
			const metadata = StorageMetadata.fromValue(undefined);

			// Act
			const result = mapper.toViewModel(metadata);

			// Assert
			expect(result.dataType).toBe('undefined');
		});
	});

	describe('edge cases', () => {
		it('should handle very large sizes', () => {
			// Arrange
			const veryLargeArray = Array.from({ length: 100000 }, (_, i) => i);
			const metadata = StorageMetadata.fromValue(veryLargeArray);

			// Act
			const result = mapper.toViewModel(metadata);

			// Assert
			expect(result.sizeInBytes).toBeGreaterThan(100000);
			expect(result.displaySize).toBeDefined();
		});

		it('should handle complex nested objects', () => {
			// Arrange
			const complexObject = {
				environments: [
					{ name: 'Dev', url: 'https://dev.crm.dynamics.com' },
					{ name: 'Prod', url: 'https://prod.crm.dynamics.com' }
				],
				metadata: {
					version: '1.0',
					lastUpdated: '2025-01-01'
				}
			};
			const metadata = StorageMetadata.fromValue(complexObject);

			// Act
			const result = mapper.toViewModel(metadata);

			// Assert
			expect(result.dataType).toBe('object');
			expect(result.sizeInBytes).toBeGreaterThan(0);
			expect(result.displaySize).toBeDefined();
		});

		it('should handle secret metadata', () => {
			// Arrange
			const metadata = StorageMetadata.forSecret();

			// Act
			const result = mapper.toViewModel(metadata);

			// Assert
			expect(result.dataType).toBe('secret');
			expect(result.sizeInBytes).toBe(0);
			expect(result.displaySize).toBe('0 B');
		});

		it('should handle empty string', () => {
			// Arrange
			const metadata = StorageMetadata.fromValue('');

			// Act
			const result = mapper.toViewModel(metadata);

			// Assert
			expect(result.dataType).toBe('string');
			expect(result.sizeInBytes).toBeGreaterThan(0);
		});

		it('should handle empty object', () => {
			// Arrange
			const metadata = StorageMetadata.fromValue({});

			// Act
			const result = mapper.toViewModel(metadata);

			// Assert
			expect(result.dataType).toBe('object');
			expect(result.sizeInBytes).toBeGreaterThan(0);
		});

		it('should handle empty array', () => {
			// Arrange
			const metadata = StorageMetadata.fromValue([]);

			// Act
			const result = mapper.toViewModel(metadata);

			// Assert
			expect(result.dataType).toBe('array');
			expect(result.sizeInBytes).toBeGreaterThan(0);
		});
	});
});
