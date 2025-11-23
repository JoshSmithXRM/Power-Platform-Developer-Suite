import { StorageInspectionService } from './../../domain/services/StorageInspectionService';
import { IDomainEventPublisher } from './../../../environmentSetup/application/interfaces/IDomainEventPublisher';
import { NullLogger } from './../../../../infrastructure/logging/NullLogger';
import { RevealSecretUseCase } from './RevealSecretUseCase';

describe('RevealSecretUseCase', () => {
	let useCase: RevealSecretUseCase;
	let mockStorageInspectionService: jest.Mocked<StorageInspectionService>;
	let mockEventPublisher: jest.Mocked<IDomainEventPublisher>;

	beforeEach(() => {
		mockStorageInspectionService = {
			revealSecret: jest.fn()
		} as unknown as jest.Mocked<StorageInspectionService>;

		mockEventPublisher = {
			publish: jest.fn(),
			subscribe: jest.fn()
		};

		useCase = new RevealSecretUseCase(
			mockStorageInspectionService,
			mockEventPublisher,
			new NullLogger()
		);
	});

	describe('successful secret reveal', () => {
		it('should reveal secret value and publish event', async () => {
			const secretKey = 'mySecret';
			const secretValue = 'super-secret-value';

			mockStorageInspectionService.revealSecret.mockResolvedValue(secretValue);

			const result = await useCase.execute(secretKey);

			expect(result).toBe(secretValue);
			expect(mockStorageInspectionService.revealSecret).toHaveBeenCalledTimes(1);
			expect(mockStorageInspectionService.revealSecret).toHaveBeenCalledWith(secretKey);
			expect(mockEventPublisher.publish).toHaveBeenCalledTimes(1);
		});

		it('should handle empty secret values', async () => {
			const secretKey = 'emptySecret';
			const secretValue = '';

			mockStorageInspectionService.revealSecret.mockResolvedValue(secretValue);

			const result = await useCase.execute(secretKey);

			expect(result).toBe('');
			expect(mockEventPublisher.publish).toHaveBeenCalledTimes(1);
		});

		it('should handle secrets with special characters', async () => {
			const secretKey = 'complexSecret';
			const secretValue = 'p@$$w0rd!#%&*()';

			mockStorageInspectionService.revealSecret.mockResolvedValue(secretValue);

			const result = await useCase.execute(secretKey);

			expect(result).toBe(secretValue);
		});
	});

	describe('error handling', () => {
		it('should throw error when secret not found', async () => {
			const secretKey = 'nonexistent';

			mockStorageInspectionService.revealSecret.mockResolvedValue(undefined);

			await expect(useCase.execute(secretKey)).rejects.toThrow('Secret not found: nonexistent');
			expect(mockEventPublisher.publish).not.toHaveBeenCalled();
		});

		it('should throw error when reveal fails', async () => {
			const secretKey = 'mySecret';

			mockStorageInspectionService.revealSecret.mockRejectedValue(new Error('Access denied'));

			await expect(useCase.execute(secretKey)).rejects.toThrow('Access denied');
			expect(mockEventPublisher.publish).not.toHaveBeenCalled();
		});

		it('should not publish event when reveal fails', async () => {
			const secretKey = 'mySecret';

			mockStorageInspectionService.revealSecret.mockRejectedValue(new Error('Storage error'));

			try {
				await useCase.execute(secretKey);
			} catch {
				// Expected error
			}

			expect(mockEventPublisher.publish).not.toHaveBeenCalled();
		});
	});
});
