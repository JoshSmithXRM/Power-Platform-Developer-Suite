import { EnvironmentId } from '../valueObjects/EnvironmentId';
import { EnvironmentDeleted } from './EnvironmentDeleted';

describe('EnvironmentDeleted', () => {
	describe('Constructor', () => {
		it('should create event with all required properties when environment was active', () => {
			// Arrange
			const environmentId = new EnvironmentId('env-123');
			const environmentName = 'Production Environment';
			const wasActive = true;

			// Act
			const event = new EnvironmentDeleted(environmentId, environmentName, wasActive);

			// Assert
			expect(event.environmentId).toBe(environmentId);
			expect(event.environmentName).toBe('Production Environment');
			expect(event.wasActive).toBe(true);
			expect(event.type).toBe('EnvironmentDeleted');
			expect(event.occurredAt).toBeInstanceOf(Date);
		});

		it('should create event when environment was not active', () => {
			// Arrange
			const environmentId = new EnvironmentId('env-456');
			const environmentName = 'Test Environment';
			const wasActive = false;

			// Act
			const event = new EnvironmentDeleted(environmentId, environmentName, wasActive);

			// Assert
			expect(event.environmentId).toBe(environmentId);
			expect(event.environmentName).toBe('Test Environment');
			expect(event.wasActive).toBe(false);
		});

		it('should create event with custom occurredAt timestamp', () => {
			// Arrange
			const environmentId = new EnvironmentId('env-789');
			const environmentName = 'Development Environment';
			const customDate = new Date('2024-01-15T10:30:00Z');

			// Act
			const event = new EnvironmentDeleted(environmentId, environmentName, true, customDate);

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
			const event = new EnvironmentDeleted(environmentId, environmentName, false);
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
			const event = new EnvironmentDeleted(environmentId, 'Test Environment', true);

			// Act - Verify properties exist and are accessible
			const type = event.type;
			const envId = event.environmentId;
			const name = event.environmentName;
			const wasActive = event.wasActive;
			const occurredAt = event.occurredAt;

			// Assert - Properties are accessible but TypeScript prevents modification
			expect(type).toBe('EnvironmentDeleted');
			expect(envId).toBe(environmentId);
			expect(name).toBe('Test Environment');
			expect(wasActive).toBe(true);
			expect(occurredAt).toBeInstanceOf(Date);
		});

		it('should maintain property values after creation', () => {
			// Arrange
			const environmentId = new EnvironmentId('env-123');
			const event = new EnvironmentDeleted(environmentId, 'Test Environment', true);
			const initialType = event.type;
			const initialEnvId = event.environmentId;
			const initialName = event.environmentName;
			const initialWasActive = event.wasActive;
			const initialOccurredAt = event.occurredAt;

			// Act - Properties should remain unchanged
			// (readonly enforced at compile time)

			// Assert
			expect(event.type).toBe(initialType);
			expect(event.environmentId).toBe(initialEnvId);
			expect(event.environmentName).toBe(initialName);
			expect(event.wasActive).toBe(initialWasActive);
			expect(event.occurredAt).toBe(initialOccurredAt);
		});
	});

	describe('Contract Stability', () => {
		it('should maintain expected event structure', () => {
			// Arrange
			const environmentId = new EnvironmentId('env-123');
			const event = new EnvironmentDeleted(environmentId, 'Test Environment', true);

			// Act
			const eventKeys = Object.keys(event).sort();

			// Assert
			expect(eventKeys).toEqual(['environmentId', 'environmentName', 'occurredAt', 'type', 'wasActive'].sort());
		});

		it('should have discriminated union type literal', () => {
			// Arrange
			const event = new EnvironmentDeleted(
				new EnvironmentId('env-123'),
				'Test Environment',
				true
			);

			// Act
			const typeValue: 'EnvironmentDeleted' = event.type;

			// Assert
			expect(typeValue).toBe('EnvironmentDeleted');
		});
	});

	describe('Edge Cases', () => {
		it('should handle empty environment name', () => {
			// Arrange
			const environmentId = new EnvironmentId('env-123');
			const environmentName = '';

			// Act
			const event = new EnvironmentDeleted(environmentId, environmentName, false);

			// Assert
			expect(event.environmentName).toBe('');
		});

		it('should handle environment name with special characters', () => {
			// Arrange
			const environmentId = new EnvironmentId('env-123');
			const environmentName = 'Test-Environment_2024 (Production) #1';

			// Act
			const event = new EnvironmentDeleted(environmentId, environmentName, true);

			// Assert
			expect(event.environmentName).toBe('Test-Environment_2024 (Production) #1');
		});

		it('should handle very long environment name', () => {
			// Arrange
			const environmentId = new EnvironmentId('env-123');
			const environmentName = 'A'.repeat(500);

			// Act
			const event = new EnvironmentDeleted(environmentId, environmentName, false);

			// Assert
			expect(event.environmentName).toBe('A'.repeat(500));
			expect(event.environmentName.length).toBe(500);
		});

		it('should handle environment name with whitespace', () => {
			// Arrange
			const environmentId = new EnvironmentId('env-123');
			const environmentName = '  Test Environment  ';

			// Act
			const event = new EnvironmentDeleted(environmentId, environmentName, true);

			// Assert
			expect(event.environmentName).toBe('  Test Environment  ');
		});

		it('should create multiple events with different timestamps', async () => {
			// Arrange
			const environmentId1 = new EnvironmentId('env-123');
			const environmentId2 = new EnvironmentId('env-456');

			// Act
			const event1 = new EnvironmentDeleted(environmentId1, 'Environment 1', true);
			await new Promise(resolve => setTimeout(resolve, 5));
			const event2 = new EnvironmentDeleted(environmentId2, 'Environment 2', false);

			// Assert
			expect(event2.occurredAt.getTime()).toBeGreaterThanOrEqual(event1.occurredAt.getTime());
		});

		it('should correctly distinguish between active and inactive deletions', () => {
			// Arrange
			const environmentId = new EnvironmentId('env-123');

			// Act
			const activeEvent = new EnvironmentDeleted(environmentId, 'Active Env', true);
			const inactiveEvent = new EnvironmentDeleted(environmentId, 'Inactive Env', false);

			// Assert
			expect(activeEvent.wasActive).toBe(true);
			expect(inactiveEvent.wasActive).toBe(false);
		});
	});
});
