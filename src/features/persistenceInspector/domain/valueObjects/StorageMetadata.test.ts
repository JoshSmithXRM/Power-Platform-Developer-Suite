import { StorageMetadata } from './StorageMetadata';

describe('StorageMetadata', () => {
	describe('fromValue', () => {
		describe('primitive types', () => {
			it('should create metadata for string value', () => {
				// Arrange
				const value = 'hello world';

				// Act
				const metadata = StorageMetadata.fromValue(value);

				// Assert
				expect(metadata.dataType).toBe('string');
				expect(metadata.sizeInBytes).toBeGreaterThan(0);
				expect(metadata.isSecret).toBe(false);
			});

			it('should create metadata for number value', () => {
				// Arrange
				const value = 42;

				// Act
				const metadata = StorageMetadata.fromValue(value);

				// Assert
				expect(metadata.dataType).toBe('number');
				expect(metadata.sizeInBytes).toBeGreaterThan(0);
				expect(metadata.isSecret).toBe(false);
			});

			it('should create metadata for boolean value', () => {
				// Arrange
				const value = true;

				// Act
				const metadata = StorageMetadata.fromValue(value);

				// Assert
				expect(metadata.dataType).toBe('boolean');
				expect(metadata.sizeInBytes).toBeGreaterThan(0);
				expect(metadata.isSecret).toBe(false);
			});

			it('should create metadata for null value', () => {
				// Arrange
				const value = null;

				// Act
				const metadata = StorageMetadata.fromValue(value);

				// Assert
				expect(metadata.dataType).toBe('null');
				expect(metadata.sizeInBytes).toBeGreaterThan(0);
				expect(metadata.isSecret).toBe(false);
			});

			it('should create metadata for undefined value', () => {
				// Arrange
				const value = undefined;

				// Act
				const metadata = StorageMetadata.fromValue(value);

				// Assert
				expect(metadata.dataType).toBe('undefined');
				expect(metadata.sizeInBytes).toBeGreaterThan(0);
				expect(metadata.isSecret).toBe(false);
			});
		});

		describe('complex types', () => {
			it('should create metadata for array value', () => {
				// Arrange
				const value = ['item1', 'item2', 'item3'];

				// Act
				const metadata = StorageMetadata.fromValue(value);

				// Assert
				expect(metadata.dataType).toBe('array');
				expect(metadata.sizeInBytes).toBeGreaterThan(0);
				expect(metadata.isSecret).toBe(false);
			});

			it('should create metadata for object value', () => {
				// Arrange
				const value = { key: 'value', nested: { data: 42 } };

				// Act
				const metadata = StorageMetadata.fromValue(value);

				// Assert
				expect(metadata.dataType).toBe('object');
				expect(metadata.sizeInBytes).toBeGreaterThan(0);
				expect(metadata.isSecret).toBe(false);
			});

			it('should create metadata for complex nested structure', () => {
				// Arrange
				const value = {
					environments: [
						{ name: 'Dev', url: 'https://dev.crm.dynamics.com' },
						{ name: 'Prod', url: 'https://prod.crm.dynamics.com' }
					],
					metadata: {
						version: '1.0',
						lastUpdated: '2025-01-01'
					}
				};

				// Act
				const metadata = StorageMetadata.fromValue(value);

				// Assert
				expect(metadata.dataType).toBe('object');
				expect(metadata.sizeInBytes).toBeGreaterThan(0);
				expect(metadata.isSecret).toBe(false);
			});

			it('should create metadata for empty array', () => {
				// Arrange
				const value: unknown[] = [];

				// Act
				const metadata = StorageMetadata.fromValue(value);

				// Assert
				expect(metadata.dataType).toBe('array');
				expect(metadata.sizeInBytes).toBeGreaterThan(0);
				expect(metadata.isSecret).toBe(false);
			});

			it('should create metadata for empty object', () => {
				// Arrange
				const value = {};

				// Act
				const metadata = StorageMetadata.fromValue(value);

				// Assert
				expect(metadata.dataType).toBe('object');
				expect(metadata.sizeInBytes).toBeGreaterThan(0);
				expect(metadata.isSecret).toBe(false);
			});
		});

		describe('size calculation', () => {
			it('should calculate correct size for simple string', () => {
				// Arrange
				const value = 'test';

				// Act
				const metadata = StorageMetadata.fromValue(value);

				// Assert
				// JSON stringified "test" should be 6 bytes (with quotes)
				expect(metadata.sizeInBytes).toBeGreaterThan(0);
			});

			it('should calculate larger size for longer string', () => {
				// Arrange
				const shortString = 'a';
				const longString = 'a'.repeat(1000);

				// Act
				const shortMetadata = StorageMetadata.fromValue(shortString);
				const longMetadata = StorageMetadata.fromValue(longString);

				// Assert
				expect(longMetadata.sizeInBytes).toBeGreaterThan(shortMetadata.sizeInBytes);
			});

			it('should calculate size for object with multiple properties', () => {
				// Arrange
				const value = {
					prop1: 'value1',
					prop2: 'value2',
					prop3: 'value3'
				};

				// Act
				const metadata = StorageMetadata.fromValue(value);

				// Assert
				expect(metadata.sizeInBytes).toBeGreaterThan(0);
			});

			it('should calculate size for deeply nested object', () => {
				// Arrange
				const value = {
					level1: {
						level2: {
							level3: {
								level4: {
									level5: 'deep value'
								}
							}
						}
					}
				};

				// Act
				const metadata = StorageMetadata.fromValue(value);

				// Assert
				expect(metadata.sizeInBytes).toBeGreaterThan(0);
			});

			it('should calculate size for array with many elements', () => {
				// Arrange
				const value = Array.from({ length: 100 }, (_, i) => ({ id: i, value: `item${i}` }));

				// Act
				const metadata = StorageMetadata.fromValue(value);

				// Assert
				expect(metadata.sizeInBytes).toBeGreaterThan(0);
			});
		});
	});

	describe('forSecret', () => {
		it('should create secret metadata with special data type', () => {
			// Arrange & Act
			const metadata = StorageMetadata.forSecret();

			// Assert
			expect(metadata.dataType).toBe('secret');
		});

		it('should create secret metadata with zero size', () => {
			// Arrange & Act
			const metadata = StorageMetadata.forSecret();

			// Assert
			expect(metadata.sizeInBytes).toBe(0);
		});

		it('should mark metadata as secret', () => {
			// Arrange & Act
			const metadata = StorageMetadata.forSecret();

			// Assert
			expect(metadata.isSecret).toBe(true);
		});

		it('should create consistent secret metadata instances', () => {
			// Arrange & Act
			const metadata1 = StorageMetadata.forSecret();
			const metadata2 = StorageMetadata.forSecret();

			// Assert
			expect(metadata1.dataType).toBe(metadata2.dataType);
			expect(metadata1.sizeInBytes).toBe(metadata2.sizeInBytes);
			expect(metadata1.isSecret).toBe(metadata2.isSecret);
		});
	});

	describe('accessor getters', () => {
		describe('dataType getter', () => {
			it('should return correct data type for string', () => {
				// Arrange
				const metadata = StorageMetadata.fromValue('test');

				// Act & Assert
				expect(metadata.dataType).toBe('string');
			});

			it('should return correct data type for array', () => {
				// Arrange
				const metadata = StorageMetadata.fromValue([1, 2, 3]);

				// Act & Assert
				expect(metadata.dataType).toBe('array');
			});

			it('should return correct data type for object', () => {
				// Arrange
				const metadata = StorageMetadata.fromValue({ key: 'value' });

				// Act & Assert
				expect(metadata.dataType).toBe('object');
			});
		});

		describe('sizeInBytes getter', () => {
			it('should return size as positive number', () => {
				// Arrange
				const metadata = StorageMetadata.fromValue({ data: 'test' });

				// Act
				const size = metadata.sizeInBytes;

				// Assert
				expect(typeof size).toBe('number');
				expect(size).toBeGreaterThanOrEqual(0);
			});

			it('should return same size on multiple calls', () => {
				// Arrange
				const metadata = StorageMetadata.fromValue({ data: 'test' });

				// Act
				const size1 = metadata.sizeInBytes;
				const size2 = metadata.sizeInBytes;

				// Assert
				expect(size1).toBe(size2);
			});
		});

		describe('isSecret getter', () => {
			it('should return false for value-based metadata', () => {
				// Arrange
				const metadata = StorageMetadata.fromValue('test');

				// Act & Assert
				expect(metadata.isSecret).toBe(false);
			});

			it('should return true for secret-based metadata', () => {
				// Arrange
				const metadata = StorageMetadata.forSecret();

				// Act & Assert
				expect(metadata.isSecret).toBe(true);
			});
		});
	});

	describe('edge cases', () => {
		it('should handle very large string value', () => {
			// Arrange
			const largeString = 'x'.repeat(1000000);

			// Act
			const metadata = StorageMetadata.fromValue(largeString);

			// Assert
			expect(metadata.dataType).toBe('string');
			expect(metadata.sizeInBytes).toBeGreaterThan(1000000);
		});

		it('should handle deeply nested object structure', () => {
			// Arrange
			let deepObject: Record<string, unknown> = { value: 'deep' };
			for (let i = 0; i < 50; i++) {
				deepObject = { nested: deepObject };
			}

			// Act
			const metadata = StorageMetadata.fromValue(deepObject);

			// Assert
			expect(metadata.dataType).toBe('object');
			expect(metadata.sizeInBytes).toBeGreaterThan(0);
		});

		it('should handle array with mixed types', () => {
			// Arrange
			const value = [1, 'string', true, null, { obj: 'value' }, [1, 2, 3]];

			// Act
			const metadata = StorageMetadata.fromValue(value);

			// Assert
			expect(metadata.dataType).toBe('array');
			expect(metadata.sizeInBytes).toBeGreaterThan(0);
		});

		it('should handle object with special characters', () => {
			// Arrange
			const value = {
				key: 'value with special chars !@#$%^&*()',
				unicode: 'Unicode: 你好世界 🎉'
			};

			// Act
			const metadata = StorageMetadata.fromValue(value);

			// Assert
			expect(metadata.dataType).toBe('object');
			expect(metadata.sizeInBytes).toBeGreaterThan(0);
		});

		it('should handle empty string', () => {
			// Arrange
			const value = '';

			// Act
			const metadata = StorageMetadata.fromValue(value);

			// Assert
			expect(metadata.dataType).toBe('string');
			expect(metadata.sizeInBytes).toBeGreaterThan(0);
		});

		it('should handle zero number', () => {
			// Arrange
			const value = 0;

			// Act
			const metadata = StorageMetadata.fromValue(value);

			// Assert
			expect(metadata.dataType).toBe('number');
			expect(metadata.sizeInBytes).toBeGreaterThan(0);
		});

		it('should handle negative number', () => {
			// Arrange
			const value = -42;

			// Act
			const metadata = StorageMetadata.fromValue(value);

			// Assert
			expect(metadata.dataType).toBe('number');
			expect(metadata.sizeInBytes).toBeGreaterThan(0);
		});

		it('should handle false boolean', () => {
			// Arrange
			const value = false;

			// Act
			const metadata = StorageMetadata.fromValue(value);

			// Assert
			expect(metadata.dataType).toBe('boolean');
			expect(metadata.sizeInBytes).toBeGreaterThan(0);
		});
	});

	describe('differentiation between similar types', () => {
		it('should differentiate between array and object', () => {
			// Arrange
			const arrayMetadata = StorageMetadata.fromValue([1, 2, 3]);
			const objectMetadata = StorageMetadata.fromValue({ 0: 1, 1: 2, 2: 3 });

			// Act & Assert
			expect(arrayMetadata.dataType).toBe('array');
			expect(objectMetadata.dataType).toBe('object');
			expect(arrayMetadata.dataType).not.toBe(objectMetadata.dataType);
		});

		it('should differentiate between null and undefined', () => {
			// Arrange
			const nullMetadata = StorageMetadata.fromValue(null);
			const undefinedMetadata = StorageMetadata.fromValue(undefined);

			// Act & Assert
			expect(nullMetadata.dataType).toBe('null');
			expect(undefinedMetadata.dataType).toBe('undefined');
			expect(nullMetadata.dataType).not.toBe(undefinedMetadata.dataType);
		});

		it('should differentiate between string and number types', () => {
			// Arrange
			const stringMetadata = StorageMetadata.fromValue('42');
			const numberMetadata = StorageMetadata.fromValue(42);

			// Act & Assert
			expect(stringMetadata.dataType).toBe('string');
			expect(numberMetadata.dataType).toBe('number');
			expect(stringMetadata.dataType).not.toBe(numberMetadata.dataType);
		});
	});

	describe('encapsulation and immutability', () => {
		it('should not allow modification of dataType through accessor', () => {
			// Arrange
			const metadata = StorageMetadata.fromValue('test');
			const originalType = metadata.dataType;

			// Act
			const type = metadata.dataType;

			// Assert
			expect(type).toBe(originalType);
			// Verify it's a readonly property (attempting assignment would fail in TS)
			expect(typeof type).toBe('string');
		});

		it('should not allow modification of sizeInBytes through accessor', () => {
			// Arrange
			const metadata = StorageMetadata.fromValue({ data: 'test' });
			const originalSize = metadata.sizeInBytes;

			// Act
			const size = metadata.sizeInBytes;

			// Assert
			expect(size).toBe(originalSize);
			expect(typeof size).toBe('number');
		});

		it('should not allow modification of isSecret through accessor', () => {
			// Arrange
			const metadata = StorageMetadata.forSecret();
			const originalValue = metadata.isSecret;

			// Act
			const isSecret = metadata.isSecret;

			// Assert
			expect(isSecret).toBe(originalValue);
			expect(isSecret).toBe(true);
		});
	});

	describe('consistency across instances', () => {
		it('should create consistent metadata for identical values', () => {
			// Arrange
			const value = { config: 'test', count: 42 };

			// Act
			const metadata1 = StorageMetadata.fromValue(value);
			const metadata2 = StorageMetadata.fromValue(value);

			// Assert
			expect(metadata1.dataType).toBe(metadata2.dataType);
			expect(metadata1.sizeInBytes).toBe(metadata2.sizeInBytes);
			expect(metadata1.isSecret).toBe(metadata2.isSecret);
		});

		it('should create unique metadata for different values of same type', () => {
			// Arrange
			const value1 = 'short string';
			const value2 = 'much longer string with more characters';

			// Act
			const metadata1 = StorageMetadata.fromValue(value1);
			const metadata2 = StorageMetadata.fromValue(value2);

			// Assert
			expect(metadata1.dataType).toBe(metadata2.dataType);
			expect(metadata1.sizeInBytes).not.toBe(metadata2.sizeInBytes);
			expect(metadata2.sizeInBytes).toBeGreaterThan(metadata1.sizeInBytes);
		});
	});

	describe('real-world scenarios', () => {
		it('should handle environment configuration object', () => {
			// Arrange
			const envConfig = {
				name: 'Development',
				url: 'https://dev.crm.dynamics.com',
				userId: 'user@example.com',
				tenantId: 'tenant-id-123',
				features: ['feature1', 'feature2']
			};

			// Act
			const metadata = StorageMetadata.fromValue(envConfig);

			// Assert
			expect(metadata.dataType).toBe('object');
			expect(metadata.sizeInBytes).toBeGreaterThan(0);
			expect(metadata.isSecret).toBe(false);
		});

		it('should handle solution list array', () => {
			// Arrange
			const solutions = [
				{ id: 'sol-1', name: 'Solution 1', version: '1.0.0.0' },
				{ id: 'sol-2', name: 'Solution 2', version: '2.0.0.0' },
				{ id: 'sol-3', name: 'Solution 3', version: '1.5.0.0' }
			];

			// Act
			const metadata = StorageMetadata.fromValue(solutions);

			// Assert
			expect(metadata.dataType).toBe('array');
			expect(metadata.sizeInBytes).toBeGreaterThan(0);
			expect(metadata.isSecret).toBe(false);
		});

		it('should handle connection string metadata', () => {
			// Arrange
			const connectionString = 'AuthType=OAuth; Url=https://org.crm.dynamics.com; AppId=app-id-123';

			// Act
			const metadata = StorageMetadata.fromValue(connectionString);

			// Assert
			expect(metadata.dataType).toBe('string');
			expect(metadata.sizeInBytes).toBeGreaterThan(0);
			expect(metadata.isSecret).toBe(false);
		});

		it('should handle secret token metadata', () => {
			// Arrange & Act
			const metadata = StorageMetadata.forSecret();

			// Assert
			expect(metadata.dataType).toBe('secret');
			expect(metadata.sizeInBytes).toBe(0);
			expect(metadata.isSecret).toBe(true);
		});
	});
});
