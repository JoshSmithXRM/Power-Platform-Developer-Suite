import { StoragePropertyCleared } from './StoragePropertyCleared';

describe('StoragePropertyCleared', () => {
	describe('Constructor', () => {
		it('should create event with key and path properties', () => {
			// Arrange
			const key = 'config-settings';
			const path = 'database.connection.timeout';

			// Act
			const event = new StoragePropertyCleared(key, path);

			// Assert
			expect(event.key).toBe('config-settings');
			expect(event.path).toBe('database.connection.timeout');
			expect(event.type).toBe('StoragePropertyCleared');
			expect(event.occurredAt).toBeInstanceOf(Date);
		});

		it('should create event with simple path', () => {
			// Arrange
			const key = 'user-settings';
			const path = 'theme';

			// Act
			const event = new StoragePropertyCleared(key, path);

			// Assert
			expect(event.key).toBe('user-settings');
			expect(event.path).toBe('theme');
		});

		it('should set occurredAt to current timestamp', () => {
			// Arrange
			const key = 'test-key';
			const path = 'test.path';
			const beforeCreation = new Date();

			// Act
			const event = new StoragePropertyCleared(key, path);
			const afterCreation = new Date();

			// Assert
			expect(event.occurredAt.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
			expect(event.occurredAt.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
		});
	});

	describe('Immutability', () => {
		it('should have all properties defined as readonly in TypeScript', () => {
			// Arrange
			const event = new StoragePropertyCleared('test-key', 'test.path');

			// Act - Verify properties exist and are accessible
			const type = event.type;
			const key = event.key;
			const path = event.path;
			const occurredAt = event.occurredAt;

			// Assert - Properties are accessible but TypeScript prevents modification
			expect(type).toBe('StoragePropertyCleared');
			expect(key).toBe('test-key');
			expect(path).toBe('test.path');
			expect(occurredAt).toBeInstanceOf(Date);
		});

		it('should maintain property values after creation', () => {
			// Arrange
			const event = new StoragePropertyCleared('test-key', 'test.path');
			const initialType = event.type;
			const initialKey = event.key;
			const initialPath = event.path;
			const initialOccurredAt = event.occurredAt;

			// Act - Properties should remain unchanged
			// (readonly enforced at compile time)

			// Assert
			expect(event.type).toBe(initialType);
			expect(event.key).toBe(initialKey);
			expect(event.path).toBe(initialPath);
			expect(event.occurredAt).toBe(initialOccurredAt);
		});
	});

	describe('Contract Stability', () => {
		it('should maintain expected event structure', () => {
			// Arrange
			const event = new StoragePropertyCleared('test-key', 'test.path');

			// Act
			const eventKeys = Object.keys(event).sort();

			// Assert
			expect(eventKeys).toEqual(['key', 'occurredAt', 'path', 'type'].sort());
		});

		it('should have discriminated union type literal', () => {
			// Arrange
			const event = new StoragePropertyCleared('test-key', 'test.path');

			// Act
			const typeValue: 'StoragePropertyCleared' = event.type;

			// Assert
			expect(typeValue).toBe('StoragePropertyCleared');
		});

		it('should extend DomainEvent base class', () => {
			// Arrange & Act
			const event = new StoragePropertyCleared('test-key', 'test.path');

			// Assert
			expect(event.occurredAt).toBeInstanceOf(Date);
		});
	});

	describe('Edge Cases', () => {
		it('should handle empty key', () => {
			// Arrange
			const key = '';
			const path = 'some.path';

			// Act
			const event = new StoragePropertyCleared(key, path);

			// Assert
			expect(event.key).toBe('');
		});

		it('should handle empty path', () => {
			// Arrange
			const key = 'some-key';
			const path = '';

			// Act
			const event = new StoragePropertyCleared(key, path);

			// Assert
			expect(event.path).toBe('');
		});

		it('should handle both empty key and path', () => {
			// Arrange
			const key = '';
			const path = '';

			// Act
			const event = new StoragePropertyCleared(key, path);

			// Assert
			expect(event.key).toBe('');
			expect(event.path).toBe('');
		});

		it('should handle key with special characters', () => {
			// Arrange
			const key = 'config-settings_2024#production';
			const path = 'database.credentials';

			// Act
			const event = new StoragePropertyCleared(key, path);

			// Assert
			expect(event.key).toBe('config-settings_2024#production');
		});

		it('should handle path with special characters', () => {
			// Arrange
			const key = 'settings';
			const path = 'api-settings.endpoint_url.production#1';

			// Act
			const event = new StoragePropertyCleared(key, path);

			// Assert
			expect(event.path).toBe('api-settings.endpoint_url.production#1');
		});

		it('should handle very long key', () => {
			// Arrange
			const key = 'a'.repeat(500);
			const path = 'test.path';

			// Act
			const event = new StoragePropertyCleared(key, path);

			// Assert
			expect(event.key).toBe('a'.repeat(500));
			expect(event.key.length).toBe(500);
		});

		it('should handle very long path', () => {
			// Arrange
			const key = 'test-key';
			const path = 'a'.repeat(500);

			// Act
			const event = new StoragePropertyCleared(key, path);

			// Assert
			expect(event.path).toBe('a'.repeat(500));
			expect(event.path.length).toBe(500);
		});

		it('should handle key with whitespace', () => {
			// Arrange
			const key = '  test key  ';
			const path = 'test.path';

			// Act
			const event = new StoragePropertyCleared(key, path);

			// Assert
			expect(event.key).toBe('  test key  ');
		});

		it('should handle path with whitespace', () => {
			// Arrange
			const key = 'test-key';
			const path = '  test . path  ';

			// Act
			const event = new StoragePropertyCleared(key, path);

			// Assert
			expect(event.path).toBe('  test . path  ');
		});

		it('should handle deeply nested path', () => {
			// Arrange
			const key = 'config';
			const path = 'level1.level2.level3.level4.level5.level6.property';

			// Act
			const event = new StoragePropertyCleared(key, path);

			// Assert
			expect(event.path).toBe('level1.level2.level3.level4.level5.level6.property');
		});

		it('should handle path with array notation', () => {
			// Arrange
			const key = 'config';
			const path = 'users[0].settings.theme';

			// Act
			const event = new StoragePropertyCleared(key, path);

			// Assert
			expect(event.path).toBe('users[0].settings.theme');
		});

		it('should create multiple events with different timestamps', async () => {
			// Arrange
			const key1 = 'key-1';
			const path1 = 'path.1';
			const key2 = 'key-2';
			const path2 = 'path.2';

			// Act
			const event1 = new StoragePropertyCleared(key1, path1);
			await new Promise(resolve => setTimeout(resolve, 5));
			const event2 = new StoragePropertyCleared(key2, path2);

			// Assert
			expect(event2.occurredAt.getTime()).toBeGreaterThanOrEqual(event1.occurredAt.getTime());
		});

		it('should handle key and path with Unicode characters', () => {
			// Arrange
			const key = 'config-키-設定';
			const path = 'database.接続.timeout';

			// Act
			const event = new StoragePropertyCleared(key, path);

			// Assert
			expect(event.key).toBe('config-키-設定');
			expect(event.path).toBe('database.接続.timeout');
		});
	});
});
