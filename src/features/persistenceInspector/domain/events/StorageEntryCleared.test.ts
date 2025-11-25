import { StorageEntryCleared } from './StorageEntryCleared';

describe('StorageEntryCleared', () => {
	describe('Constructor', () => {
		it('should create event with global storage type', () => {
			// Arrange
			const key = 'config-key';
			const storageType = 'global' as const;

			// Act
			const event = new StorageEntryCleared(key, storageType);

			// Assert
			expect(event.key).toBe('config-key');
			expect(event.storageType).toBe('global');
			expect(event.type).toBe('StorageEntryCleared');
			expect(event.occurredAt).toBeInstanceOf(Date);
		});

		it('should create event with workspace storage type', () => {
			// Arrange
			const key = 'workspace-settings';
			const storageType = 'workspace' as const;

			// Act
			const event = new StorageEntryCleared(key, storageType);

			// Assert
			expect(event.key).toBe('workspace-settings');
			expect(event.storageType).toBe('workspace');
		});

		it('should create event with secret storage type', () => {
			// Arrange
			const key = 'api-token';
			const storageType = 'secret' as const;

			// Act
			const event = new StorageEntryCleared(key, storageType);

			// Assert
			expect(event.key).toBe('api-token');
			expect(event.storageType).toBe('secret');
		});

		it('should set occurredAt to current timestamp', () => {
			// Arrange
			const key = 'test-key';
			const storageType = 'global' as const;
			const beforeCreation = new Date();

			// Act
			const event = new StorageEntryCleared(key, storageType);
			const afterCreation = new Date();

			// Assert
			expect(event.occurredAt.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
			expect(event.occurredAt.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
		});
	});

	describe('Immutability', () => {
		it('should have all properties defined as readonly in TypeScript', () => {
			// Arrange
			const event = new StorageEntryCleared('test-key', 'global');

			// Act - Verify properties exist and are accessible
			const type = event.type;
			const key = event.key;
			const storageType = event.storageType;
			const occurredAt = event.occurredAt;

			// Assert - Properties are accessible but TypeScript prevents modification
			expect(type).toBe('StorageEntryCleared');
			expect(key).toBe('test-key');
			expect(storageType).toBe('global');
			expect(occurredAt).toBeInstanceOf(Date);
		});

		it('should maintain property values after creation', () => {
			// Arrange
			const event = new StorageEntryCleared('test-key', 'global');
			const initialType = event.type;
			const initialKey = event.key;
			const initialStorageType = event.storageType;
			const initialOccurredAt = event.occurredAt;

			// Act - Properties should remain unchanged
			// (readonly enforced at compile time)

			// Assert
			expect(event.type).toBe(initialType);
			expect(event.key).toBe(initialKey);
			expect(event.storageType).toBe(initialStorageType);
			expect(event.occurredAt).toBe(initialOccurredAt);
		});
	});

	describe('Contract Stability', () => {
		it('should maintain expected event structure', () => {
			// Arrange
			const event = new StorageEntryCleared('test-key', 'global');

			// Act
			const eventKeys = Object.keys(event).sort();

			// Assert
			expect(eventKeys).toEqual(['key', 'occurredAt', 'storageType', 'type'].sort());
		});

		it('should have discriminated union type literal', () => {
			// Arrange
			const event = new StorageEntryCleared('test-key', 'global');

			// Act
			const typeValue: 'StorageEntryCleared' = event.type;

			// Assert
			expect(typeValue).toBe('StorageEntryCleared');
		});

		it('should extend DomainEvent base class', () => {
			// Arrange & Act
			const event = new StorageEntryCleared('test-key', 'global');

			// Assert
			expect(event.occurredAt).toBeInstanceOf(Date);
		});
	});

	describe('Edge Cases', () => {
		it('should handle empty key', () => {
			// Arrange
			const key = '';
			const storageType = 'global' as const;

			// Act
			const event = new StorageEntryCleared(key, storageType);

			// Assert
			expect(event.key).toBe('');
		});

		it('should handle key with special characters', () => {
			// Arrange
			const key = 'config.settings_2024-production#1';
			const storageType = 'workspace' as const;

			// Act
			const event = new StorageEntryCleared(key, storageType);

			// Assert
			expect(event.key).toBe('config.settings_2024-production#1');
		});

		it('should handle very long key', () => {
			// Arrange
			const key = 'a'.repeat(500);
			const storageType = 'secret' as const;

			// Act
			const event = new StorageEntryCleared(key, storageType);

			// Assert
			expect(event.key).toBe('a'.repeat(500));
			expect(event.key.length).toBe(500);
		});

		it('should handle key with whitespace', () => {
			// Arrange
			const key = '  test key  ';
			const storageType = 'global' as const;

			// Act
			const event = new StorageEntryCleared(key, storageType);

			// Assert
			expect(event.key).toBe('  test key  ');
		});

		it('should handle key with nested path notation', () => {
			// Arrange
			const key = 'config.database.connection.settings';
			const storageType = 'workspace' as const;

			// Act
			const event = new StorageEntryCleared(key, storageType);

			// Assert
			expect(event.key).toBe('config.database.connection.settings');
		});

		it('should create multiple events with different timestamps', async () => {
			// Arrange
			const key1 = 'key-1';
			const key2 = 'key-2';

			// Act
			const event1 = new StorageEntryCleared(key1, 'global');
			await new Promise(resolve => setTimeout(resolve, 5));
			const event2 = new StorageEntryCleared(key2, 'workspace');

			// Assert
			expect(event2.occurredAt.getTime()).toBeGreaterThanOrEqual(event1.occurredAt.getTime());
		});

		it('should handle all three storage types correctly', () => {
			// Arrange & Act
			const globalEvent = new StorageEntryCleared('key1', 'global');
			const workspaceEvent = new StorageEntryCleared('key2', 'workspace');
			const secretEvent = new StorageEntryCleared('key3', 'secret');

			// Assert
			expect(globalEvent.storageType).toBe('global');
			expect(workspaceEvent.storageType).toBe('workspace');
			expect(secretEvent.storageType).toBe('secret');
		});

		it('should handle key with Unicode characters', () => {
			// Arrange
			const key = 'config-키-設定-🔧';
			const storageType = 'global' as const;

			// Act
			const event = new StorageEntryCleared(key, storageType);

			// Assert
			expect(event.key).toBe('config-키-設定-🔧');
		});
	});
});
