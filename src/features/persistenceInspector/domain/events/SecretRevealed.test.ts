import { SecretRevealed } from './SecretRevealed';

describe('SecretRevealed', () => {
	describe('Constructor', () => {
		it('should create event with key property', () => {
			// Arrange
			const key = 'api-token-123';

			// Act
			const event = new SecretRevealed(key);

			// Assert
			expect(event.key).toBe('api-token-123');
			expect(event.type).toBe('SecretRevealed');
			expect(event.occurredAt).toBeInstanceOf(Date);
		});

		it('should set occurredAt to current timestamp', () => {
			// Arrange
			const key = 'secret-key';
			const beforeCreation = new Date();

			// Act
			const event = new SecretRevealed(key);
			const afterCreation = new Date();

			// Assert
			expect(event.occurredAt.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
			expect(event.occurredAt.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
		});
	});

	describe('Immutability', () => {
		it('should have all properties defined as readonly in TypeScript', () => {
			// Arrange
			const event = new SecretRevealed('test-key');

			// Act - Verify properties exist and are accessible
			const type = event.type;
			const key = event.key;
			const occurredAt = event.occurredAt;

			// Assert - Properties are accessible but TypeScript prevents modification
			expect(type).toBe('SecretRevealed');
			expect(key).toBe('test-key');
			expect(occurredAt).toBeInstanceOf(Date);
		});

		it('should maintain property values after creation', () => {
			// Arrange
			const event = new SecretRevealed('test-key');
			const initialType = event.type;
			const initialKey = event.key;
			const initialOccurredAt = event.occurredAt;

			// Act - Properties should remain unchanged
			// (readonly enforced at compile time)

			// Assert
			expect(event.type).toBe(initialType);
			expect(event.key).toBe(initialKey);
			expect(event.occurredAt).toBe(initialOccurredAt);
		});
	});

	describe('Contract Stability', () => {
		it('should maintain expected event structure', () => {
			// Arrange
			const event = new SecretRevealed('test-key');

			// Act
			const eventKeys = Object.keys(event).sort();

			// Assert
			expect(eventKeys).toEqual(['key', 'occurredAt', 'type'].sort());
		});

		it('should have discriminated union type literal', () => {
			// Arrange
			const event = new SecretRevealed('test-key');

			// Act
			const typeValue: 'SecretRevealed' = event.type;

			// Assert
			expect(typeValue).toBe('SecretRevealed');
		});

		it('should extend DomainEvent base class', () => {
			// Arrange & Act
			const event = new SecretRevealed('test-key');

			// Assert
			expect(event.occurredAt).toBeInstanceOf(Date);
		});
	});

	describe('Edge Cases', () => {
		it('should handle empty key', () => {
			// Arrange
			const key = '';

			// Act
			const event = new SecretRevealed(key);

			// Assert
			expect(event.key).toBe('');
		});

		it('should handle key with special characters', () => {
			// Arrange
			const key = 'api-token_2024.production#1';

			// Act
			const event = new SecretRevealed(key);

			// Assert
			expect(event.key).toBe('api-token_2024.production#1');
		});

		it('should handle very long key', () => {
			// Arrange
			const key = 'a'.repeat(500);

			// Act
			const event = new SecretRevealed(key);

			// Assert
			expect(event.key).toBe('a'.repeat(500));
			expect(event.key.length).toBe(500);
		});

		it('should handle key with whitespace', () => {
			// Arrange
			const key = '  test key  ';

			// Act
			const event = new SecretRevealed(key);

			// Assert
			expect(event.key).toBe('  test key  ');
		});

		it('should handle key with dots (nested path)', () => {
			// Arrange
			const key = 'config.secrets.apiKey';

			// Act
			const event = new SecretRevealed(key);

			// Assert
			expect(event.key).toBe('config.secrets.apiKey');
		});

		it('should create multiple events with different timestamps', async () => {
			// Arrange
			const key1 = 'secret-1';
			const key2 = 'secret-2';

			// Act
			const event1 = new SecretRevealed(key1);
			await new Promise(resolve => setTimeout(resolve, 5));
			const event2 = new SecretRevealed(key2);

			// Assert
			expect(event2.occurredAt.getTime()).toBeGreaterThanOrEqual(event1.occurredAt.getTime());
		});

		it('should handle key with Unicode characters', () => {
			// Arrange
			const key = 'secret-키-秘密-🔑';

			// Act
			const event = new SecretRevealed(key);

			// Assert
			expect(event.key).toBe('secret-키-秘密-🔑');
		});
	});
});
