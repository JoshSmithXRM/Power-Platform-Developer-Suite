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

	describe('confirmation requirement', () => {
		it('should throw error when confirmation is false', async () => {
			const secretKey = 'mySecret';

			await expect(useCase.execute(secretKey, false)).rejects.toThrow('Secret revelation requires user confirmation');
			expect(mockStorageInspectionService.revealSecret).not.toHaveBeenCalled();
			expect(mockEventPublisher.publish).not.toHaveBeenCalled();
		});

		it('should not reveal secret when not confirmed', async () => {
			const secretKey = 'mySecret';
			mockStorageInspectionService.revealSecret.mockResolvedValue('secret-value');

			await expect(useCase.execute(secretKey, false)).rejects.toThrow();
			expect(mockStorageInspectionService.revealSecret).not.toHaveBeenCalled();
		});
	});

	describe('successful secret reveal', () => {
		it('should reveal secret value and publish event when confirmed', async () => {
			const secretKey = 'mySecret';
			const secretValue = 'super-secret-value';

			mockStorageInspectionService.revealSecret.mockResolvedValue(secretValue);

			const result = await useCase.execute(secretKey, true);

			expect(result).toBe(secretValue);
			expect(mockStorageInspectionService.revealSecret).toHaveBeenCalledWith(secretKey);
			expect(mockEventPublisher.publish).toHaveBeenCalledTimes(1);
		});

		it('should handle empty secret values when confirmed', async () => {
			const secretKey = 'emptySecret';
			const secretValue = '';

			mockStorageInspectionService.revealSecret.mockResolvedValue(secretValue);

			const result = await useCase.execute(secretKey, true);

			expect(result).toBe('');
			expect(mockEventPublisher.publish).toHaveBeenCalledTimes(1);
		});

		it('should handle secrets with special characters when confirmed', async () => {
			const secretKey = 'complexSecret';
			const secretValue = 'p@$$w0rd!#%&*()';

			mockStorageInspectionService.revealSecret.mockResolvedValue(secretValue);

			const result = await useCase.execute(secretKey, true);

			expect(result).toBe(secretValue);
		});
	});

	describe('error handling', () => {
		it('should throw error when secret not found', async () => {
			const secretKey = 'nonexistent';

			mockStorageInspectionService.revealSecret.mockResolvedValue(undefined);

			await expect(useCase.execute(secretKey, true)).rejects.toThrow('Secret not found: nonexistent');
			expect(mockEventPublisher.publish).not.toHaveBeenCalled();
		});

		it('should throw error when reveal fails', async () => {
			const secretKey = 'mySecret';

			mockStorageInspectionService.revealSecret.mockRejectedValue(new Error('Access denied'));

			await expect(useCase.execute(secretKey, true)).rejects.toThrow('Access denied');
			expect(mockEventPublisher.publish).not.toHaveBeenCalled();
		});

		it('should not publish event when reveal fails', async () => {
			const secretKey = 'mySecret';

			mockStorageInspectionService.revealSecret.mockRejectedValue(new Error('Storage error'));

			try {
				await useCase.execute(secretKey, true);
			} catch {
				// Expected error
			}

			expect(mockEventPublisher.publish).not.toHaveBeenCalled();
		});
	});
});
