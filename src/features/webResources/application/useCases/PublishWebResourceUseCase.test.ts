import { PublishWebResourceUseCase } from './PublishWebResourceUseCase';
import { IWebResourceRepository } from '../../domain/interfaces/IWebResourceRepository';
import { NullLogger } from '../../../../infrastructure/logging/NullLogger';
import { OperationCancelledException } from '../../../../shared/domain/errors/OperationCancelledException';
import type { ICancellationToken } from '../../../../shared/domain/interfaces/ICancellationToken';

describe('PublishWebResourceUseCase', () => {
	let useCase: PublishWebResourceUseCase;
	let mockWebResourceRepository: jest.Mocked<IWebResourceRepository>;

	const testEnvironmentId = 'env-00000000-0000-0000-0000-000000000001';
	const testWebResourceId = 'wr-00000000-0000-0000-0000-000000000001';

	beforeEach(() => {
		mockWebResourceRepository = {
			findAll: jest.fn(),
			findById: jest.fn(),
			getContent: jest.fn(),
			updateContent: jest.fn(),
			findPaginated: jest.fn(),
			getCount: jest.fn(),
			publish: jest.fn(),
			publishMultiple: jest.fn(),
			publishAll: jest.fn(),
			getModifiedOn: jest.fn()
		};

		useCase = new PublishWebResourceUseCase(
			mockWebResourceRepository,
			new NullLogger()
		);
	});

	describe('execute (single publish)', () => {
		it('should publish a single web resource', async () => {
			// Arrange
			mockWebResourceRepository.publish.mockResolvedValue();

			// Act
			await useCase.execute(testEnvironmentId, testWebResourceId);

			// Assert
			expect(mockWebResourceRepository.publish).toHaveBeenCalledWith(
				testEnvironmentId,
				testWebResourceId,
				undefined
			);
		});

		it('should pass cancellation token to repository', async () => {
			// Arrange
			const cancellationToken: ICancellationToken = {
				isCancellationRequested: false,
				onCancellationRequested: jest.fn()
			};
			mockWebResourceRepository.publish.mockResolvedValue();

			// Act
			await useCase.execute(testEnvironmentId, testWebResourceId, cancellationToken);

			// Assert
			expect(mockWebResourceRepository.publish).toHaveBeenCalledWith(
				testEnvironmentId,
				testWebResourceId,
				cancellationToken
			);
		});

		it('should throw OperationCancelledException when cancelled before publish', async () => {
			// Arrange
			const cancellationToken: ICancellationToken = {
				isCancellationRequested: true,
				onCancellationRequested: jest.fn()
			};

			// Act & Assert
			await expect(
				useCase.execute(testEnvironmentId, testWebResourceId, cancellationToken)
			).rejects.toThrow(OperationCancelledException);

			expect(mockWebResourceRepository.publish).not.toHaveBeenCalled();
		});

		it('should throw when repository fails', async () => {
			// Arrange
			mockWebResourceRepository.publish.mockRejectedValue(new Error('API error'));

			// Act & Assert
			await expect(
				useCase.execute(testEnvironmentId, testWebResourceId)
			).rejects.toThrow('API error');
		});
	});

	describe('executeMultiple (bulk publish)', () => {
		it('should publish multiple web resources', async () => {
			// Arrange
			const webResourceIds = ['wr-1', 'wr-2', 'wr-3'];
			mockWebResourceRepository.publishMultiple.mockResolvedValue();

			// Act
			await useCase.executeMultiple(testEnvironmentId, webResourceIds);

			// Assert
			expect(mockWebResourceRepository.publishMultiple).toHaveBeenCalledWith(
				testEnvironmentId,
				webResourceIds,
				undefined
			);
		});

		it('should not call repository when ids array is empty', async () => {
			// Act
			await useCase.executeMultiple(testEnvironmentId, []);

			// Assert
			expect(mockWebResourceRepository.publishMultiple).not.toHaveBeenCalled();
		});

		it('should pass cancellation token to repository', async () => {
			// Arrange
			const webResourceIds = ['wr-1', 'wr-2'];
			const cancellationToken: ICancellationToken = {
				isCancellationRequested: false,
				onCancellationRequested: jest.fn()
			};
			mockWebResourceRepository.publishMultiple.mockResolvedValue();

			// Act
			await useCase.executeMultiple(testEnvironmentId, webResourceIds, cancellationToken);

			// Assert
			expect(mockWebResourceRepository.publishMultiple).toHaveBeenCalledWith(
				testEnvironmentId,
				webResourceIds,
				cancellationToken
			);
		});

		it('should throw OperationCancelledException when cancelled before publish', async () => {
			// Arrange
			const webResourceIds = ['wr-1', 'wr-2'];
			const cancellationToken: ICancellationToken = {
				isCancellationRequested: true,
				onCancellationRequested: jest.fn()
			};

			// Act & Assert
			await expect(
				useCase.executeMultiple(testEnvironmentId, webResourceIds, cancellationToken)
			).rejects.toThrow(OperationCancelledException);

			expect(mockWebResourceRepository.publishMultiple).not.toHaveBeenCalled();
		});

		it('should throw when repository fails', async () => {
			// Arrange
			const webResourceIds = ['wr-1', 'wr-2'];
			mockWebResourceRepository.publishMultiple.mockRejectedValue(new Error('Bulk publish failed'));

			// Act & Assert
			await expect(
				useCase.executeMultiple(testEnvironmentId, webResourceIds)
			).rejects.toThrow('Bulk publish failed');
		});

		it('should publish single item using publishMultiple', async () => {
			// Arrange
			const webResourceIds = ['wr-single'];
			mockWebResourceRepository.publishMultiple.mockResolvedValue();

			// Act
			await useCase.executeMultiple(testEnvironmentId, webResourceIds);

			// Assert
			expect(mockWebResourceRepository.publishMultiple).toHaveBeenCalledWith(
				testEnvironmentId,
				webResourceIds,
				undefined
			);
		});
	});

	describe('executeAll (publish all customizations)', () => {
		it('should call publishAll on repository', async () => {
			// Arrange
			mockWebResourceRepository.publishAll.mockResolvedValue();

			// Act
			await useCase.executeAll(testEnvironmentId);

			// Assert
			expect(mockWebResourceRepository.publishAll).toHaveBeenCalledWith(
				testEnvironmentId,
				undefined
			);
		});

		it('should pass cancellation token to repository', async () => {
			// Arrange
			const cancellationToken: ICancellationToken = {
				isCancellationRequested: false,
				onCancellationRequested: jest.fn()
			};
			mockWebResourceRepository.publishAll.mockResolvedValue();

			// Act
			await useCase.executeAll(testEnvironmentId, cancellationToken);

			// Assert
			expect(mockWebResourceRepository.publishAll).toHaveBeenCalledWith(
				testEnvironmentId,
				cancellationToken
			);
		});

		it('should throw OperationCancelledException when cancelled before publish', async () => {
			// Arrange
			const cancellationToken: ICancellationToken = {
				isCancellationRequested: true,
				onCancellationRequested: jest.fn()
			};

			// Act & Assert
			await expect(
				useCase.executeAll(testEnvironmentId, cancellationToken)
			).rejects.toThrow(OperationCancelledException);

			expect(mockWebResourceRepository.publishAll).not.toHaveBeenCalled();
		});

		it('should throw when repository fails', async () => {
			// Arrange
			mockWebResourceRepository.publishAll.mockRejectedValue(new Error('PublishAllXml failed'));

			// Act & Assert
			await expect(
				useCase.executeAll(testEnvironmentId)
			).rejects.toThrow('PublishAllXml failed');
		});
	});
});
