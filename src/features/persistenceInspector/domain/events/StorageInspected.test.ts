import { StorageInspected } from './StorageInspected';

describe('StorageInspected', () => {
	describe('Constructor', () => {
		it('should create event with all storage count properties', () => {
			// Arrange
			const totalEntries = 100;
			const globalEntries = 40;
			const workspaceEntries = 35;
			const secretEntries = 25;

			// Act
			const event = new StorageInspected(totalEntries, globalEntries, workspaceEntries, secretEntries);

			// Assert
			expect(event.totalEntries).toBe(100);
			expect(event.globalEntries).toBe(40);
			expect(event.workspaceEntries).toBe(35);
			expect(event.secretEntries).toBe(25);
			expect(event.type).toBe('StorageInspected');
			expect(event.occurredAt).toBeInstanceOf(Date);
		});

		it('should create event with zero entries', () => {
			// Arrange
			const totalEntries = 0;
			const globalEntries = 0;
			const workspaceEntries = 0;
			const secretEntries = 0;

			// Act
			const event = new StorageInspected(totalEntries, globalEntries, workspaceEntries, secretEntries);

			// Assert
			expect(event.totalEntries).toBe(0);
			expect(event.globalEntries).toBe(0);
			expect(event.workspaceEntries).toBe(0);
			expect(event.secretEntries).toBe(0);
		});

		it('should create event with only global entries', () => {
			// Arrange
			const totalEntries = 50;
			const globalEntries = 50;
			const workspaceEntries = 0;
			const secretEntries = 0;

			// Act
			const event = new StorageInspected(totalEntries, globalEntries, workspaceEntries, secretEntries);

			// Assert
			expect(event.totalEntries).toBe(50);
			expect(event.globalEntries).toBe(50);
			expect(event.workspaceEntries).toBe(0);
			expect(event.secretEntries).toBe(0);
		});

		it('should create event with only workspace entries', () => {
			// Arrange
			const totalEntries = 30;
			const globalEntries = 0;
			const workspaceEntries = 30;
			const secretEntries = 0;

			// Act
			const event = new StorageInspected(totalEntries, globalEntries, workspaceEntries, secretEntries);

			// Assert
			expect(event.totalEntries).toBe(30);
			expect(event.globalEntries).toBe(0);
			expect(event.workspaceEntries).toBe(30);
			expect(event.secretEntries).toBe(0);
		});

		it('should create event with only secret entries', () => {
			// Arrange
			const totalEntries = 20;
			const globalEntries = 0;
			const workspaceEntries = 0;
			const secretEntries = 20;

			// Act
			const event = new StorageInspected(totalEntries, globalEntries, workspaceEntries, secretEntries);

			// Assert
			expect(event.totalEntries).toBe(20);
			expect(event.globalEntries).toBe(0);
			expect(event.workspaceEntries).toBe(0);
			expect(event.secretEntries).toBe(20);
		});

		it('should set occurredAt to current timestamp', () => {
			// Arrange
			const beforeCreation = new Date();

			// Act
			const event = new StorageInspected(100, 40, 35, 25);
			const afterCreation = new Date();

			// Assert
			expect(event.occurredAt.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
			expect(event.occurredAt.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
		});
	});

	describe('Immutability', () => {
		it('should have all properties defined as readonly in TypeScript', () => {
			// Arrange
			const event = new StorageInspected(100, 40, 35, 25);

			// Act - Verify properties exist and are accessible
			const type = event.type;
			const totalEntries = event.totalEntries;
			const globalEntries = event.globalEntries;
			const workspaceEntries = event.workspaceEntries;
			const secretEntries = event.secretEntries;
			const occurredAt = event.occurredAt;

			// Assert - Properties are accessible but TypeScript prevents modification
			expect(type).toBe('StorageInspected');
			expect(totalEntries).toBe(100);
			expect(globalEntries).toBe(40);
			expect(workspaceEntries).toBe(35);
			expect(secretEntries).toBe(25);
			expect(occurredAt).toBeInstanceOf(Date);
		});

		it('should maintain property values after creation', () => {
			// Arrange
			const event = new StorageInspected(100, 40, 35, 25);
			const initialType = event.type;
			const initialTotalEntries = event.totalEntries;
			const initialGlobalEntries = event.globalEntries;
			const initialWorkspaceEntries = event.workspaceEntries;
			const initialSecretEntries = event.secretEntries;
			const initialOccurredAt = event.occurredAt;

			// Act - Properties should remain unchanged
			// (readonly enforced at compile time)

			// Assert
			expect(event.type).toBe(initialType);
			expect(event.totalEntries).toBe(initialTotalEntries);
			expect(event.globalEntries).toBe(initialGlobalEntries);
			expect(event.workspaceEntries).toBe(initialWorkspaceEntries);
			expect(event.secretEntries).toBe(initialSecretEntries);
			expect(event.occurredAt).toBe(initialOccurredAt);
		});
	});

	describe('Contract Stability', () => {
		it('should maintain expected event structure', () => {
			// Arrange
			const event = new StorageInspected(100, 40, 35, 25);

			// Act
			const eventKeys = Object.keys(event).sort();

			// Assert
			expect(eventKeys).toEqual(['globalEntries', 'occurredAt', 'secretEntries', 'totalEntries', 'type', 'workspaceEntries'].sort());
		});

		it('should have discriminated union type literal', () => {
			// Arrange
			const event = new StorageInspected(100, 40, 35, 25);

			// Act
			const typeValue: 'StorageInspected' = event.type;

			// Assert
			expect(typeValue).toBe('StorageInspected');
		});

		it('should extend DomainEvent base class', () => {
			// Arrange & Act
			const event = new StorageInspected(100, 40, 35, 25);

			// Assert
			expect(event.occurredAt).toBeInstanceOf(Date);
		});
	});

	describe('Edge Cases', () => {
		it('should handle large entry counts', () => {
			// Arrange
			const totalEntries = 999999;
			const globalEntries = 333333;
			const workspaceEntries = 333333;
			const secretEntries = 333333;

			// Act
			const event = new StorageInspected(totalEntries, globalEntries, workspaceEntries, secretEntries);

			// Assert
			expect(event.totalEntries).toBe(999999);
			expect(event.globalEntries).toBe(333333);
			expect(event.workspaceEntries).toBe(333333);
			expect(event.secretEntries).toBe(333333);
		});

		it('should handle negative entry counts', () => {
			// Arrange
			const totalEntries = -10;
			const globalEntries = -5;
			const workspaceEntries = -3;
			const secretEntries = -2;

			// Act
			const event = new StorageInspected(totalEntries, globalEntries, workspaceEntries, secretEntries);

			// Assert
			expect(event.totalEntries).toBe(-10);
			expect(event.globalEntries).toBe(-5);
			expect(event.workspaceEntries).toBe(-3);
			expect(event.secretEntries).toBe(-2);
		});

		it('should handle decimal entry counts', () => {
			// Arrange
			const totalEntries = 100.5;
			const globalEntries = 40.2;
			const workspaceEntries = 35.7;
			const secretEntries = 24.6;

			// Act
			const event = new StorageInspected(totalEntries, globalEntries, workspaceEntries, secretEntries);

			// Assert
			expect(event.totalEntries).toBe(100.5);
			expect(event.globalEntries).toBe(40.2);
			expect(event.workspaceEntries).toBe(35.7);
			expect(event.secretEntries).toBe(24.6);
		});

		it('should handle mismatched total and sum of entries', () => {
			// Arrange
			const totalEntries = 100;
			const globalEntries = 30;
			const workspaceEntries = 30;
			const secretEntries = 30;

			// Act
			const event = new StorageInspected(totalEntries, globalEntries, workspaceEntries, secretEntries);

			// Assert
			expect(event.totalEntries).toBe(100);
			expect(event.globalEntries + event.workspaceEntries + event.secretEntries).toBe(90);
		});

		it('should create multiple events with different timestamps', async () => {
			// Act
			const event1 = new StorageInspected(100, 40, 35, 25);
			await new Promise(resolve => setTimeout(resolve, 5));
			const event2 = new StorageInspected(150, 60, 50, 40);

			// Assert
			expect(event2.occurredAt.getTime()).toBeGreaterThanOrEqual(event1.occurredAt.getTime());
		});

		it('should correctly differentiate between different storage types', () => {
			// Arrange
			const totalEntries = 100;
			const globalEntries = 40;
			const workspaceEntries = 35;
			const secretEntries = 25;

			// Act
			const event = new StorageInspected(totalEntries, globalEntries, workspaceEntries, secretEntries);

			// Assert
			expect(event.globalEntries).not.toBe(event.workspaceEntries);
			expect(event.workspaceEntries).not.toBe(event.secretEntries);
			expect(event.globalEntries).not.toBe(event.secretEntries);
		});

		it('should handle equal counts across all storage types', () => {
			// Arrange
			const totalEntries = 90;
			const globalEntries = 30;
			const workspaceEntries = 30;
			const secretEntries = 30;

			// Act
			const event = new StorageInspected(totalEntries, globalEntries, workspaceEntries, secretEntries);

			// Assert
			expect(event.globalEntries).toBe(30);
			expect(event.workspaceEntries).toBe(30);
			expect(event.secretEntries).toBe(30);
			expect(event.globalEntries).toBe(event.workspaceEntries);
			expect(event.workspaceEntries).toBe(event.secretEntries);
		});
	});
});
