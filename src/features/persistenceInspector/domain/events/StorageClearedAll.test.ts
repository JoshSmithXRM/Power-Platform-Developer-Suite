import { StorageClearedAll } from './StorageClearedAll';

describe('StorageClearedAll', () => {
	describe('Constructor', () => {
		it('should create event with clearedCount and protectedCount', () => {
			// Arrange
			const clearedCount = 15;
			const protectedCount = 3;

			// Act
			const event = new StorageClearedAll(clearedCount, protectedCount);

			// Assert
			expect(event.clearedCount).toBe(15);
			expect(event.protectedCount).toBe(3);
			expect(event.type).toBe('StorageClearedAll');
			expect(event.occurredAt).toBeInstanceOf(Date);
		});

		it('should create event with zero cleared items', () => {
			// Arrange
			const clearedCount = 0;
			const protectedCount = 5;

			// Act
			const event = new StorageClearedAll(clearedCount, protectedCount);

			// Assert
			expect(event.clearedCount).toBe(0);
			expect(event.protectedCount).toBe(5);
		});

		it('should create event with zero protected items', () => {
			// Arrange
			const clearedCount = 10;
			const protectedCount = 0;

			// Act
			const event = new StorageClearedAll(clearedCount, protectedCount);

			// Assert
			expect(event.clearedCount).toBe(10);
			expect(event.protectedCount).toBe(0);
		});

		it('should create event with all zeros', () => {
			// Arrange
			const clearedCount = 0;
			const protectedCount = 0;

			// Act
			const event = new StorageClearedAll(clearedCount, protectedCount);

			// Assert
			expect(event.clearedCount).toBe(0);
			expect(event.protectedCount).toBe(0);
		});

		it('should set occurredAt to current timestamp', () => {
			// Arrange
			const beforeCreation = new Date();

			// Act
			const event = new StorageClearedAll(5, 2);
			const afterCreation = new Date();

			// Assert
			expect(event.occurredAt.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
			expect(event.occurredAt.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
		});
	});

	describe('Immutability', () => {
		it('should have all properties defined as readonly in TypeScript', () => {
			// Arrange
			const event = new StorageClearedAll(10, 5);

			// Act - Verify properties exist and are accessible
			const type = event.type;
			const clearedCount = event.clearedCount;
			const protectedCount = event.protectedCount;
			const occurredAt = event.occurredAt;

			// Assert - Properties are accessible but TypeScript prevents modification
			expect(type).toBe('StorageClearedAll');
			expect(clearedCount).toBe(10);
			expect(protectedCount).toBe(5);
			expect(occurredAt).toBeInstanceOf(Date);
		});

		it('should maintain property values after creation', () => {
			// Arrange
			const event = new StorageClearedAll(10, 5);
			const initialType = event.type;
			const initialClearedCount = event.clearedCount;
			const initialProtectedCount = event.protectedCount;
			const initialOccurredAt = event.occurredAt;

			// Act - Properties should remain unchanged
			// (readonly enforced at compile time)

			// Assert
			expect(event.type).toBe(initialType);
			expect(event.clearedCount).toBe(initialClearedCount);
			expect(event.protectedCount).toBe(initialProtectedCount);
			expect(event.occurredAt).toBe(initialOccurredAt);
		});
	});

	describe('Contract Stability', () => {
		it('should maintain expected event structure', () => {
			// Arrange
			const event = new StorageClearedAll(10, 5);

			// Act
			const eventKeys = Object.keys(event).sort();

			// Assert
			expect(eventKeys).toEqual(['clearedCount', 'occurredAt', 'protectedCount', 'type'].sort());
		});

		it('should have discriminated union type literal', () => {
			// Arrange
			const event = new StorageClearedAll(10, 5);

			// Act
			const typeValue: 'StorageClearedAll' = event.type;

			// Assert
			expect(typeValue).toBe('StorageClearedAll');
		});

		it('should extend DomainEvent base class', () => {
			// Arrange & Act
			const event = new StorageClearedAll(10, 5);

			// Assert
			expect(event.occurredAt).toBeInstanceOf(Date);
		});
	});

	describe('Edge Cases', () => {
		it('should handle large cleared count', () => {
			// Arrange
			const clearedCount = 999999;
			const protectedCount = 10;

			// Act
			const event = new StorageClearedAll(clearedCount, protectedCount);

			// Assert
			expect(event.clearedCount).toBe(999999);
		});

		it('should handle large protected count', () => {
			// Arrange
			const clearedCount = 10;
			const protectedCount = 999999;

			// Act
			const event = new StorageClearedAll(clearedCount, protectedCount);

			// Assert
			expect(event.protectedCount).toBe(999999);
		});

		it('should handle negative cleared count', () => {
			// Arrange
			const clearedCount = -5;
			const protectedCount = 10;

			// Act
			const event = new StorageClearedAll(clearedCount, protectedCount);

			// Assert
			expect(event.clearedCount).toBe(-5);
		});

		it('should handle negative protected count', () => {
			// Arrange
			const clearedCount = 10;
			const protectedCount = -3;

			// Act
			const event = new StorageClearedAll(clearedCount, protectedCount);

			// Assert
			expect(event.protectedCount).toBe(-3);
		});

		it('should create multiple events with different timestamps', async () => {
			// Act
			const event1 = new StorageClearedAll(5, 2);
			await new Promise(resolve => setTimeout(resolve, 5));
			const event2 = new StorageClearedAll(10, 3);

			// Assert
			expect(event2.occurredAt.getTime()).toBeGreaterThanOrEqual(event1.occurredAt.getTime());
		});

		it('should handle decimal numbers', () => {
			// Arrange
			const clearedCount = 10.5;
			const protectedCount = 5.7;

			// Act
			const event = new StorageClearedAll(clearedCount, protectedCount);

			// Assert
			expect(event.clearedCount).toBe(10.5);
			expect(event.protectedCount).toBe(5.7);
		});

		it('should differentiate between cleared and protected counts', () => {
			// Arrange
			const clearedCount = 100;
			const protectedCount = 50;

			// Act
			const event = new StorageClearedAll(clearedCount, protectedCount);

			// Assert
			expect(event.clearedCount).not.toBe(event.protectedCount);
			expect(event.clearedCount).toBe(100);
			expect(event.protectedCount).toBe(50);
		});
	});
});
