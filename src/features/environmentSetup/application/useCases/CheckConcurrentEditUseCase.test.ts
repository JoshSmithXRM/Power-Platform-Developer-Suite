import { CheckConcurrentEditUseCase, CheckConcurrentEditRequest } from './CheckConcurrentEditUseCase';
import { NullLogger } from '../../../../infrastructure/logging/NullLogger';

describe('CheckConcurrentEditUseCase', () => {
	let useCase: CheckConcurrentEditUseCase;
	let logger: NullLogger;

	beforeEach(() => {
		logger = new NullLogger();
		useCase = new CheckConcurrentEditUseCase(logger);
	});

	function createRequest(environmentId: string): CheckConcurrentEditRequest {
		return {
			environmentId
		};
	}

	describe('execute - concurrent edit detection', () => {
		it('should return canEdit true when environment is not being edited', () => {
			// Arrange
			const request = createRequest('env-123');

			// Act
			const result = useCase.execute(request);

			// Assert
			expect(result.isBeingEdited).toBe(false);
			expect(result.canEdit).toBe(true);
		});

		it('should return canEdit false when environment is being edited', () => {
			// Arrange
			const request = createRequest('env-123');
			useCase.registerEditSession('env-123');

			// Act
			const result = useCase.execute(request);

			// Assert
			expect(result.isBeingEdited).toBe(true);
			expect(result.canEdit).toBe(false);
		});

		it('should handle multiple different environments independently', () => {
			// Arrange
			useCase.registerEditSession('env-123');

			// Act
			const result1 = useCase.execute(createRequest('env-123'));
			const result2 = useCase.execute(createRequest('env-456'));

			// Assert
			expect(result1.isBeingEdited).toBe(true);
			expect(result1.canEdit).toBe(false);
			expect(result2.isBeingEdited).toBe(false);
			expect(result2.canEdit).toBe(true);
		});

		it('should return correct status after session is unregistered', () => {
			// Arrange
			const request = createRequest('env-123');
			useCase.registerEditSession('env-123');
			useCase.unregisterEditSession('env-123');

			// Act
			const result = useCase.execute(request);

			// Assert
			expect(result.isBeingEdited).toBe(false);
			expect(result.canEdit).toBe(true);
		});
	});

	describe('registerEditSession', () => {
		it('should register edit session for environment', () => {
			// Arrange
			const environmentId = 'env-123';

			// Act
			useCase.registerEditSession(environmentId);
			const result = useCase.execute(createRequest(environmentId));

			// Assert
			expect(result.isBeingEdited).toBe(true);
			expect(result.canEdit).toBe(false);
		});

		it('should handle registering same environment multiple times idempotently', () => {
			// Arrange
			const environmentId = 'env-123';

			// Act
			useCase.registerEditSession(environmentId);
			useCase.registerEditSession(environmentId);
			const result = useCase.execute(createRequest(environmentId));

			// Assert
			expect(result.isBeingEdited).toBe(true);
			expect(result.canEdit).toBe(false);
		});

		it('should register multiple different environments', () => {
			// Arrange & Act
			useCase.registerEditSession('env-123');
			useCase.registerEditSession('env-456');
			useCase.registerEditSession('env-789');

			// Assert
			expect(useCase.execute(createRequest('env-123')).isBeingEdited).toBe(true);
			expect(useCase.execute(createRequest('env-456')).isBeingEdited).toBe(true);
			expect(useCase.execute(createRequest('env-789')).isBeingEdited).toBe(true);
		});
	});

	describe('unregisterEditSession', () => {
		it('should unregister edit session for environment', () => {
			// Arrange
			const environmentId = 'env-123';
			useCase.registerEditSession(environmentId);

			// Act
			useCase.unregisterEditSession(environmentId);
			const result = useCase.execute(createRequest(environmentId));

			// Assert
			expect(result.isBeingEdited).toBe(false);
			expect(result.canEdit).toBe(true);
		});

		it('should handle unregistering non-existent session gracefully', () => {
			// Arrange
			const environmentId = 'env-123';

			// Act
			useCase.unregisterEditSession(environmentId);
			const result = useCase.execute(createRequest(environmentId));

			// Assert
			expect(result.isBeingEdited).toBe(false);
			expect(result.canEdit).toBe(true);
		});

		it('should unregister specific environment without affecting others', () => {
			// Arrange
			useCase.registerEditSession('env-123');
			useCase.registerEditSession('env-456');
			useCase.registerEditSession('env-789');

			// Act
			useCase.unregisterEditSession('env-456');

			// Assert
			expect(useCase.execute(createRequest('env-123')).isBeingEdited).toBe(true);
			expect(useCase.execute(createRequest('env-456')).isBeingEdited).toBe(false);
			expect(useCase.execute(createRequest('env-789')).isBeingEdited).toBe(true);
		});

		it('should handle unregistering same environment multiple times', () => {
			// Arrange
			const environmentId = 'env-123';
			useCase.registerEditSession(environmentId);

			// Act
			useCase.unregisterEditSession(environmentId);
			useCase.unregisterEditSession(environmentId);
			const result = useCase.execute(createRequest(environmentId));

			// Assert
			expect(result.isBeingEdited).toBe(false);
			expect(result.canEdit).toBe(true);
		});
	});

	describe('isolation between use case instances', () => {
		it('should maintain separate edit sessions for different instances', () => {
			// Arrange
			const useCase1 = new CheckConcurrentEditUseCase(new NullLogger());
			const useCase2 = new CheckConcurrentEditUseCase(new NullLogger());

			// Act
			useCase1.registerEditSession('env-123');

			// Assert
			expect(useCase1.execute(createRequest('env-123')).isBeingEdited).toBe(true);
			expect(useCase2.execute(createRequest('env-123')).isBeingEdited).toBe(false);
		});
	});

	describe('response structure', () => {
		it('should return response with both isBeingEdited and canEdit properties', () => {
			// Arrange
			const request = createRequest('env-123');

			// Act
			const result = useCase.execute(request);

			// Assert
			expect(result).toHaveProperty('isBeingEdited');
			expect(result).toHaveProperty('canEdit');
			expect(typeof result.isBeingEdited).toBe('boolean');
			expect(typeof result.canEdit).toBe('boolean');
		});

		it('should ensure isBeingEdited and canEdit are inverse of each other', () => {
			// Arrange
			const environmentId = 'env-123';

			// Act & Assert - not being edited
			const result1 = useCase.execute(createRequest(environmentId));
			expect(result1.isBeingEdited).toBe(!result1.canEdit);

			// Act & Assert - being edited
			useCase.registerEditSession(environmentId);
			const result2 = useCase.execute(createRequest(environmentId));
			expect(result2.isBeingEdited).toBe(!result2.canEdit);
		});
	});

	describe('edge cases', () => {
		it('should handle empty string environment ID', () => {
			// Arrange
			const request = createRequest('');
			useCase.registerEditSession('');

			// Act
			const result = useCase.execute(request);

			// Assert
			expect(result.isBeingEdited).toBe(true);
			expect(result.canEdit).toBe(false);
		});

		it('should handle environment IDs with special characters', () => {
			// Arrange
			const specialId = 'env-123-@#$%^&*()';
			useCase.registerEditSession(specialId);

			// Act
			const result = useCase.execute(createRequest(specialId));

			// Assert
			expect(result.isBeingEdited).toBe(true);
			expect(result.canEdit).toBe(false);
		});

		it('should handle very long environment IDs', () => {
			// Arrange
			const longId = 'a'.repeat(1000);
			useCase.registerEditSession(longId);

			// Act
			const result = useCase.execute(createRequest(longId));

			// Assert
			expect(result.isBeingEdited).toBe(true);
			expect(result.canEdit).toBe(false);
		});
	});
});
