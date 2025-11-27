import { UpdateWebResourceUseCase, ManagedWebResourceError } from './UpdateWebResourceUseCase';
import { IWebResourceRepository } from '../../domain/interfaces/IWebResourceRepository';
import { NullLogger } from '../../../../infrastructure/logging/NullLogger';
import { WebResource } from '../../domain/entities/WebResource';
import { WebResourceName } from '../../domain/valueObjects/WebResourceName';
import { WebResourceType } from '../../domain/valueObjects/WebResourceType';
import { OperationCancelledException } from '../../../../shared/domain/errors/OperationCancelledException';
import type { ICancellationToken } from '../../../../shared/domain/interfaces/ICancellationToken';

describe('UpdateWebResourceUseCase', () => {
	let useCase: UpdateWebResourceUseCase;
	let mockWebResourceRepository: jest.Mocked<IWebResourceRepository>;

	const testEnvironmentId = 'env-00000000-0000-0000-0000-000000000001';
	const testWebResourceId = 'wr-00000000-0000-0000-0000-000000000001';
	const testContent = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"

	beforeEach(() => {
		mockWebResourceRepository = {
			findAll: jest.fn(),
			findById: jest.fn(),
			getContent: jest.fn(),
			updateContent: jest.fn(),
			findPaginated: jest.fn(),
			getCount: jest.fn()
		};

		useCase = new UpdateWebResourceUseCase(
			mockWebResourceRepository,
			new NullLogger()
		);
	});

	function createTestWebResource(
		id: string,
		name: string,
		displayName: string,
		type: WebResourceType = WebResourceType.JAVASCRIPT,
		isManaged = false
	): WebResource {
		return new WebResource(
			id,
			WebResourceName.create(name),
			displayName,
			type,
			1024,
			isManaged,
			new Date('2024-01-15T10:30:00Z')
		);
	}

	function createCancellationToken(isCancelled = false): ICancellationToken {
		return {
			isCancellationRequested: isCancelled,
			onCancellationRequested: jest.fn()
		};
	}

	describe('successful execution', () => {
		it('should update editable web resource content', async () => {
			// Arrange
			const webResource = createTestWebResource(
				testWebResourceId,
				'new_script.js',
				'My Script',
				WebResourceType.JAVASCRIPT,
				false // not managed
			);
			mockWebResourceRepository.findById.mockResolvedValue(webResource);
			mockWebResourceRepository.updateContent.mockResolvedValue();

			// Act
			await useCase.execute(testEnvironmentId, testWebResourceId, testContent);

			// Assert
			expect(mockWebResourceRepository.findById).toHaveBeenCalledWith(
				testEnvironmentId,
				testWebResourceId,
				undefined
			);
			expect(mockWebResourceRepository.updateContent).toHaveBeenCalledWith(
				testEnvironmentId,
				testWebResourceId,
				expect.any(String), // base64 encoded content
				undefined
			);
		});

		it('should encode content as base64', async () => {
			// Arrange
			const webResource = createTestWebResource(
				testWebResourceId,
				'new_script.js',
				'My Script'
			);
			mockWebResourceRepository.findById.mockResolvedValue(webResource);
			mockWebResourceRepository.updateContent.mockResolvedValue();

			// Act
			await useCase.execute(testEnvironmentId, testWebResourceId, testContent);

			// Assert
			const expectedBase64 = Buffer.from(testContent).toString('base64');
			expect(mockWebResourceRepository.updateContent).toHaveBeenCalledWith(
				testEnvironmentId,
				testWebResourceId,
				expectedBase64,
				undefined
			);
		});

		it('should pass cancellation token to repository methods', async () => {
			// Arrange
			const cancellationToken = createCancellationToken(false);
			const webResource = createTestWebResource(
				testWebResourceId,
				'new_script.js',
				'My Script'
			);
			mockWebResourceRepository.findById.mockResolvedValue(webResource);
			mockWebResourceRepository.updateContent.mockResolvedValue();

			// Act
			await useCase.execute(testEnvironmentId, testWebResourceId, testContent, cancellationToken);

			// Assert
			expect(mockWebResourceRepository.findById).toHaveBeenCalledWith(
				testEnvironmentId,
				testWebResourceId,
				cancellationToken
			);
			expect(mockWebResourceRepository.updateContent).toHaveBeenCalledWith(
				testEnvironmentId,
				testWebResourceId,
				expect.any(String),
				cancellationToken
			);
		});

		it('should handle empty content', async () => {
			// Arrange
			const webResource = createTestWebResource(
				testWebResourceId,
				'new_empty.js',
				'Empty Script'
			);
			const emptyContent = new Uint8Array([]);
			mockWebResourceRepository.findById.mockResolvedValue(webResource);
			mockWebResourceRepository.updateContent.mockResolvedValue();

			// Act
			await useCase.execute(testEnvironmentId, testWebResourceId, emptyContent);

			// Assert
			expect(mockWebResourceRepository.updateContent).toHaveBeenCalledWith(
				testEnvironmentId,
				testWebResourceId,
				'', // empty base64
				undefined
			);
		});
	});

	describe('business rule validation', () => {
		it('should throw ManagedWebResourceError for managed web resource', async () => {
			// Arrange
			const managedWebResource = createTestWebResource(
				testWebResourceId,
				'new_managed.js',
				'Managed Script',
				WebResourceType.JAVASCRIPT,
				true // managed
			);
			mockWebResourceRepository.findById.mockResolvedValue(managedWebResource);

			// Act & Assert
			await expect(useCase.execute(testEnvironmentId, testWebResourceId, testContent))
				.rejects
				.toThrow(ManagedWebResourceError);

			expect(mockWebResourceRepository.updateContent).not.toHaveBeenCalled();
		});

		it('should throw ManagedWebResourceError for non-text-based web resource (image)', async () => {
			// Arrange - PNG is not text-based, so canEdit() returns false
			const imageWebResource = createTestWebResource(
				testWebResourceId,
				'new_image.png',
				'Image',
				WebResourceType.PNG,
				false // not managed, but still can't edit
			);
			mockWebResourceRepository.findById.mockResolvedValue(imageWebResource);

			// Act & Assert
			await expect(useCase.execute(testEnvironmentId, testWebResourceId, testContent))
				.rejects
				.toThrow(ManagedWebResourceError);

			expect(mockWebResourceRepository.updateContent).not.toHaveBeenCalled();
		});
	});

	describe('error handling', () => {
		it('should throw error when web resource not found', async () => {
			// Arrange
			mockWebResourceRepository.findById.mockResolvedValue(null);

			// Act & Assert
			await expect(useCase.execute(testEnvironmentId, testWebResourceId, testContent))
				.rejects
				.toThrow(`Web resource not found: ${testWebResourceId}`);

			expect(mockWebResourceRepository.updateContent).not.toHaveBeenCalled();
		});

		it('should propagate repository errors from findById', async () => {
			// Arrange
			const error = new Error('Repository connection failed');
			mockWebResourceRepository.findById.mockRejectedValue(error);

			// Act & Assert
			await expect(useCase.execute(testEnvironmentId, testWebResourceId, testContent))
				.rejects
				.toThrow('Repository connection failed');
		});

		it('should propagate repository errors from updateContent', async () => {
			// Arrange
			const webResource = createTestWebResource(
				testWebResourceId,
				'new_script.js',
				'Script'
			);
			mockWebResourceRepository.findById.mockResolvedValue(webResource);
			mockWebResourceRepository.updateContent.mockRejectedValue(new Error('Update failed'));

			// Act & Assert
			await expect(useCase.execute(testEnvironmentId, testWebResourceId, testContent))
				.rejects
				.toThrow('Update failed');
		});
	});

	describe('cancellation handling', () => {
		it('should throw OperationCancelledException when cancelled before execution', async () => {
			// Arrange
			const cancellationToken = createCancellationToken(true);

			// Act & Assert
			await expect(useCase.execute(testEnvironmentId, testWebResourceId, testContent, cancellationToken))
				.rejects
				.toThrow(OperationCancelledException);

			expect(mockWebResourceRepository.findById).not.toHaveBeenCalled();
			expect(mockWebResourceRepository.updateContent).not.toHaveBeenCalled();
		});

		it('should throw OperationCancelledException when cancelled after fetch', async () => {
			// Arrange
			let callCount = 0;
			const cancellationToken: ICancellationToken = {
				get isCancellationRequested() {
					callCount++;
					return callCount > 1; // Cancel after first check
				},
				onCancellationRequested: jest.fn()
			};

			const webResource = createTestWebResource(
				testWebResourceId,
				'new_script.js',
				'Script'
			);
			mockWebResourceRepository.findById.mockResolvedValue(webResource);

			// Act & Assert
			await expect(useCase.execute(testEnvironmentId, testWebResourceId, testContent, cancellationToken))
				.rejects
				.toThrow(OperationCancelledException);

			expect(mockWebResourceRepository.updateContent).not.toHaveBeenCalled();
		});

		it('should throw OperationCancelledException when cancelled after update', async () => {
			// Arrange
			let callCount = 0;
			const cancellationToken: ICancellationToken = {
				get isCancellationRequested() {
					callCount++;
					// Cancellation checks: 1=before execution, 2=after fetch, 3=after update
					// Cancel on 3rd check (after update completes)
					return callCount >= 3;
				},
				onCancellationRequested: jest.fn()
			};

			const webResource = createTestWebResource(
				testWebResourceId,
				'new_script.js',
				'Script'
			);
			mockWebResourceRepository.findById.mockResolvedValue(webResource);
			mockWebResourceRepository.updateContent.mockResolvedValue();

			// Act & Assert
			await expect(useCase.execute(testEnvironmentId, testWebResourceId, testContent, cancellationToken))
				.rejects
				.toThrow(OperationCancelledException);
		});
	});

	describe('web resource types', () => {
		const editableTypes = [
			{ type: WebResourceType.HTML, extension: '.html' },
			{ type: WebResourceType.CSS, extension: '.css' },
			{ type: WebResourceType.JAVASCRIPT, extension: '.js' },
			{ type: WebResourceType.XML, extension: '.xml' },
			{ type: WebResourceType.XSL, extension: '.xsl' },
			{ type: WebResourceType.SVG, extension: '.svg' }, // SVG is text-based (XML)
			{ type: WebResourceType.RESX, extension: '.resx' }
		];

		editableTypes.forEach(({ type, extension }) => {
			it(`should allow editing ${extension} web resource`, async () => {
				// Arrange
				const webResource = createTestWebResource(
					testWebResourceId,
					`new_file${extension}`,
					'Test File',
					type,
					false
				);
				mockWebResourceRepository.findById.mockResolvedValue(webResource);
				mockWebResourceRepository.updateContent.mockResolvedValue();

				// Act
				await useCase.execute(testEnvironmentId, testWebResourceId, testContent);

				// Assert
				expect(mockWebResourceRepository.updateContent).toHaveBeenCalled();
			});
		});

		const nonEditableTypes = [
			{ type: WebResourceType.PNG, extension: '.png' },
			{ type: WebResourceType.JPG, extension: '.jpg' },
			{ type: WebResourceType.GIF, extension: '.gif' },
			{ type: WebResourceType.ICO, extension: '.ico' },
			{ type: WebResourceType.XAP, extension: '.xap' }
		];

		nonEditableTypes.forEach(({ type, extension }) => {
			it(`should reject editing ${extension} web resource`, async () => {
				// Arrange
				const webResource = createTestWebResource(
					testWebResourceId,
					`new_file${extension}`,
					'Test File',
					type,
					false
				);
				mockWebResourceRepository.findById.mockResolvedValue(webResource);

				// Act & Assert
				await expect(useCase.execute(testEnvironmentId, testWebResourceId, testContent))
					.rejects
					.toThrow(ManagedWebResourceError);

				expect(mockWebResourceRepository.updateContent).not.toHaveBeenCalled();
			});
		});
	});
});

describe('ManagedWebResourceError', () => {
	it('should have correct name', () => {
		const error = new ManagedWebResourceError('test-id');
		expect(error.name).toBe('ManagedWebResourceError');
	});

	it('should include web resource ID in message', () => {
		const error = new ManagedWebResourceError('test-id');
		expect(error.message).toBe('Cannot edit managed web resource: test-id');
	});
});
