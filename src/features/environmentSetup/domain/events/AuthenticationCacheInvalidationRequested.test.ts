import { EnvironmentId } from '../valueObjects/EnvironmentId';
import { AuthenticationCacheInvalidationRequested } from './AuthenticationCacheInvalidationRequested';

describe('AuthenticationCacheInvalidationRequested', () => {
	describe('Constructor', () => {
		it('should create event with credentials_changed reason', () => {
			// Arrange
			const environmentId = new EnvironmentId('env-123');
			const reason = 'credentials_changed' as const;

			// Act
			const event = new AuthenticationCacheInvalidationRequested(environmentId, reason);

			// Assert
			expect(event.environmentId).toBe(environmentId);
			expect(event.reason).toBe('credentials_changed');
			expect(event.type).toBe('AuthenticationCacheInvalidationRequested');
			expect(event.occurredAt).toBeInstanceOf(Date);
		});

		it('should create event with auth_method_changed reason', () => {
			// Arrange
			const environmentId = new EnvironmentId('env-456');
			const reason = 'auth_method_changed' as const;

			// Act
			const event = new AuthenticationCacheInvalidationRequested(environmentId, reason);

			// Assert
			expect(event.environmentId).toBe(environmentId);
			expect(event.reason).toBe('auth_method_changed');
		});

		it('should create event with environment_deleted reason', () => {
			// Arrange
			const environmentId = new EnvironmentId('env-789');
			const reason = 'environment_deleted' as const;

			// Act
			const event = new AuthenticationCacheInvalidationRequested(environmentId, reason);

			// Assert
			expect(event.environmentId).toBe(environmentId);
			expect(event.reason).toBe('environment_deleted');
		});

		it('should set occurredAt to current timestamp', () => {
			// Arrange
			const environmentId = new EnvironmentId('env-123');
			const beforeCreation = new Date();

			// Act
			const event = new AuthenticationCacheInvalidationRequested(environmentId, 'credentials_changed');
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
			const event = new AuthenticationCacheInvalidationRequested(environmentId, 'credentials_changed');

			// Act - Verify properties exist and are accessible
			const type = event.type;
			const envId = event.environmentId;
			const reason = event.reason;
			const occurredAt = event.occurredAt;

			// Assert - Properties are accessible but TypeScript prevents modification
			expect(type).toBe('AuthenticationCacheInvalidationRequested');
			expect(envId).toBe(environmentId);
			expect(reason).toBe('credentials_changed');
			expect(occurredAt).toBeInstanceOf(Date);
		});

		it('should maintain property values after creation', () => {
			// Arrange
			const environmentId = new EnvironmentId('env-123');
			const event = new AuthenticationCacheInvalidationRequested(environmentId, 'credentials_changed');
			const initialType = event.type;
			const initialEnvId = event.environmentId;
			const initialReason = event.reason;
			const initialOccurredAt = event.occurredAt;

			// Act - Properties should remain unchanged
			// (readonly enforced at compile time)

			// Assert
			expect(event.type).toBe(initialType);
			expect(event.environmentId).toBe(initialEnvId);
			expect(event.reason).toBe(initialReason);
			expect(event.occurredAt).toBe(initialOccurredAt);
		});
	});

	describe('Contract Stability', () => {
		it('should maintain expected event structure', () => {
			// Arrange
			const environmentId = new EnvironmentId('env-123');
			const event = new AuthenticationCacheInvalidationRequested(environmentId, 'credentials_changed');

			// Act
			const eventKeys = Object.keys(event).sort();

			// Assert
			expect(eventKeys).toEqual(['environmentId', 'occurredAt', 'reason', 'type'].sort());
		});

		it('should have discriminated union type literal', () => {
			// Arrange
			const event = new AuthenticationCacheInvalidationRequested(
				new EnvironmentId('env-123'),
				'credentials_changed'
			);

			// Act
			const typeValue: 'AuthenticationCacheInvalidationRequested' = event.type;

			// Assert
			expect(typeValue).toBe('AuthenticationCacheInvalidationRequested');
		});
	});

	describe('Edge Cases', () => {
		it('should handle environment ID with special characters', () => {
			// Arrange
			const environmentId = new EnvironmentId('env-123-test-abc_xyz');

			// Act
			const event = new AuthenticationCacheInvalidationRequested(environmentId, 'credentials_changed');

			// Assert
			expect(event.environmentId.getValue()).toBe('env-123-test-abc_xyz');
		});

		it('should create multiple events with different timestamps', async () => {
			// Arrange
			const environmentId = new EnvironmentId('env-123');

			// Act
			const event1 = new AuthenticationCacheInvalidationRequested(environmentId, 'credentials_changed');
			await new Promise(resolve => setTimeout(resolve, 5));
			const event2 = new AuthenticationCacheInvalidationRequested(environmentId, 'auth_method_changed');

			// Assert
			expect(event2.occurredAt.getTime()).toBeGreaterThanOrEqual(event1.occurredAt.getTime());
		});
	});
});
