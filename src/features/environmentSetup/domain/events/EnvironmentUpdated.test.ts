import { EnvironmentId } from '../valueObjects/EnvironmentId';
import { EnvironmentUpdated } from './EnvironmentUpdated';

describe('EnvironmentUpdated', () => {
	describe('Constructor', () => {
		it('should create event with all required properties and previous name', () => {
			// Arrange
			const environmentId = new EnvironmentId('env-123');
			const environmentName = 'Production Environment';
			const previousName = 'Test Environment';

			// Act
			const event = new EnvironmentUpdated(environmentId, environmentName, previousName);

			// Assert
			expect(event.environmentId).toBe(environmentId);
			expect(event.environmentName).toBe('Production Environment');
			expect(event.previousName).toBe('Test Environment');
			expect(event.type).toBe('EnvironmentUpdated');
			expect(event.occurredAt).toBeInstanceOf(Date);
		});

		it('should create event without previous name', () => {
			// Arrange
			const environmentId = new EnvironmentId('env-456');
			const environmentName = 'Updated Environment';

			// Act
			const event = new EnvironmentUpdated(environmentId, environmentName);

			// Assert
			expect(event.environmentId).toBe(environmentId);
			expect(event.environmentName).toBe('Updated Environment');
			expect(event.previousName).toBeUndefined();
		});

		it('should create event with previousName as undefined explicitly', () => {
			// Arrange
			const environmentId = new EnvironmentId('env-789');
			const environmentName = 'New Name';
			const previousName = undefined;

			// Act
			const event = new EnvironmentUpdated(environmentId, environmentName, previousName);

			// Assert
			expect(event.previousName).toBeUndefined();
		});

		it('should create event with custom occurredAt timestamp', () => {
			// Arrange
			const environmentId = new EnvironmentId('env-123');
			const environmentName = 'Environment Name';
			const previousName = 'Old Name';
			const customDate = new Date('2024-01-15T10:30:00Z');

			// Act
			const event = new EnvironmentUpdated(environmentId, environmentName, previousName, customDate);

			// Assert
			expect(event.occurredAt).toBe(customDate);
			expect(event.occurredAt.toISOString()).toBe('2024-01-15T10:30:00.000Z');
		});

		it('should default occurredAt to current timestamp when not provided', () => {
			// Arrange
			const environmentId = new EnvironmentId('env-123');
			const environmentName = 'Test Environment';
			const beforeCreation = new Date();

			// Act
			const event = new EnvironmentUpdated(environmentId, environmentName);
			const afterCreation = new Date();

			// Assert
			expect(event.occurredAt.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
			expect(event.occurredAt.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
		});
	});

	describe('Immutability', () => {
		it('should have all properties defined as readonly in TypeScript', () => {
			// Arrange
			const environmentId = new EnvironmentId('env-123');
			const event = new EnvironmentUpdated(environmentId, 'Test Environment', 'Old Name');

			// Act - Verify properties exist and are accessible
			const type = event.type;
			const envId = event.environmentId;
			const name = event.environmentName;
			const previousName = event.previousName;
			const occurredAt = event.occurredAt;

			// Assert - Properties are accessible but TypeScript prevents modification
			expect(type).toBe('EnvironmentUpdated');
			expect(envId).toBe(environmentId);
			expect(name).toBe('Test Environment');
			expect(previousName).toBe('Old Name');
			expect(occurredAt).toBeInstanceOf(Date);
		});

		it('should maintain property values after creation', () => {
			// Arrange
			const environmentId = new EnvironmentId('env-123');
			const event = new EnvironmentUpdated(environmentId, 'Test Environment', 'Old Name');
			const initialType = event.type;
			const initialEnvId = event.environmentId;
			const initialName = event.environmentName;
			const initialPreviousName = event.previousName;
			const initialOccurredAt = event.occurredAt;

			// Act - Properties should remain unchanged
			// (readonly enforced at compile time)

			// Assert
			expect(event.type).toBe(initialType);
			expect(event.environmentId).toBe(initialEnvId);
			expect(event.environmentName).toBe(initialName);
			expect(event.previousName).toBe(initialPreviousName);
			expect(event.occurredAt).toBe(initialOccurredAt);
		});
	});

	describe('Contract Stability', () => {
		it('should maintain expected event structure with previousName', () => {
			// Arrange
			const environmentId = new EnvironmentId('env-123');
			const event = new EnvironmentUpdated(environmentId, 'Test Environment', 'Old Name');

			// Act
			const eventKeys = Object.keys(event).sort();

			// Assert
			expect(eventKeys).toEqual(['environmentId', 'environmentName', 'occurredAt', 'previousName', 'type'].sort());
		});

		it('should maintain expected event structure without previousName', () => {
			// Arrange
			const environmentId = new EnvironmentId('env-123');
			const event = new EnvironmentUpdated(environmentId, 'Test Environment');

			// Act
			const eventKeys = Object.keys(event).sort();

			// Assert
			expect(eventKeys).toEqual(['environmentId', 'environmentName', 'occurredAt', 'previousName', 'type'].sort());
		});

		it('should have discriminated union type literal', () => {
			// Arrange
			const event = new EnvironmentUpdated(
				new EnvironmentId('env-123'),
				'Test Environment'
			);

			// Act
			const typeValue: 'EnvironmentUpdated' = event.type;

			// Assert
			expect(typeValue).toBe('EnvironmentUpdated');
		});
	});

	describe('Edge Cases', () => {
		it('should handle empty environment name', () => {
			// Arrange
			const environmentId = new EnvironmentId('env-123');
			const environmentName = '';

			// Act
			const event = new EnvironmentUpdated(environmentId, environmentName);

			// Assert
			expect(event.environmentName).toBe('');
		});

		it('should handle empty previousName', () => {
			// Arrange
			const environmentId = new EnvironmentId('env-123');
			const environmentName = 'New Name';
			const previousName = '';

			// Act
			const event = new EnvironmentUpdated(environmentId, environmentName, previousName);

			// Assert
			expect(event.previousName).toBe('');
		});

		it('should handle environment name with special characters', () => {
			// Arrange
			const environmentId = new EnvironmentId('env-123');
			const environmentName = 'Test-Environment_2024 (Production) #1';
			const previousName = 'Old-Environment_2023 (Test) #0';

			// Act
			const event = new EnvironmentUpdated(environmentId, environmentName, previousName);

			// Assert
			expect(event.environmentName).toBe('Test-Environment_2024 (Production) #1');
			expect(event.previousName).toBe('Old-Environment_2023 (Test) #0');
		});

		it('should handle very long environment names', () => {
			// Arrange
			const environmentId = new EnvironmentId('env-123');
			const environmentName = 'A'.repeat(500);
			const previousName = 'B'.repeat(500);

			// Act
			const event = new EnvironmentUpdated(environmentId, environmentName, previousName);

			// Assert
			expect(event.environmentName).toBe('A'.repeat(500));
			expect(event.environmentName.length).toBe(500);
			expect(event.previousName).toBe('B'.repeat(500));
			expect(event.previousName?.length).toBe(500);
		});

		it('should handle environment name with whitespace', () => {
			// Arrange
			const environmentId = new EnvironmentId('env-123');
			const environmentName = '  Test Environment  ';
			const previousName = '  Old Environment  ';

			// Act
			const event = new EnvironmentUpdated(environmentId, environmentName, previousName);

			// Assert
			expect(event.environmentName).toBe('  Test Environment  ');
			expect(event.previousName).toBe('  Old Environment  ');
		});

		it('should handle same name in current and previous', () => {
			// Arrange
			const environmentId = new EnvironmentId('env-123');
			const environmentName = 'Same Name';
			const previousName = 'Same Name';

			// Act
			const event = new EnvironmentUpdated(environmentId, environmentName, previousName);

			// Assert
			expect(event.environmentName).toBe('Same Name');
			expect(event.previousName).toBe('Same Name');
		});

		it('should create multiple events with different timestamps', async () => {
			// Arrange
			const environmentId1 = new EnvironmentId('env-123');
			const environmentId2 = new EnvironmentId('env-456');

			// Act
			const event1 = new EnvironmentUpdated(environmentId1, 'Environment 1');
			await new Promise(resolve => setTimeout(resolve, 5));
			const event2 = new EnvironmentUpdated(environmentId2, 'Environment 2');

			// Assert
			expect(event2.occurredAt.getTime()).toBeGreaterThanOrEqual(event1.occurredAt.getTime());
		});
	});
});
