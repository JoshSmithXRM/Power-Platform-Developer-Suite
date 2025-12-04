import { GetWebResourceContentUseCase } from './GetWebResourceContentUseCase';
import { IWebResourceRepository } from '../../domain/interfaces/IWebResourceRepository';
import { NullLogger } from '../../../../infrastructure/logging/NullLogger';
import { WebResource } from '../../domain/entities/WebResource';
import { WebResourceName } from '../../domain/valueObjects/WebResourceName';
import { WebResourceType } from '../../domain/valueObjects/WebResourceType';
import { OperationCancelledException } from '../../../../shared/domain/errors/OperationCancelledException';
import type { ICancellationToken } from '../../../../shared/domain/interfaces/ICancellationToken';

describe('GetWebResourceContentUseCase', () => {
	let useCase: GetWebResourceContentUseCase;
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
			getModifiedOn: jest.fn(),
			getPublishedContent: jest.fn()
		};

		useCase = new GetWebResourceContentUseCase(
			mockWebResourceRepository,
			new NullLogger()
		);
	});

	function createTestWebResource(
		id: string,
		name: string,
		displayName: string,
		type: WebResourceType = WebResourceType.JAVASCRIPT
	): WebResource {
		return new WebResource(
			id,
			WebResourceName.create(name),
			displayName,
			type,
			false,
			new Date('2024-01-01T08:00:00Z'),
			new Date('2024-01-15T10:30:00Z'),
			'Test User',
			'Test User'
		);
	}

	function createCancellationToken(isCancelled = false): ICancellationToken {
		return {
			isCancellationRequested: isCancelled,
			onCancellationRequested: jest.fn()
		};
	}

	describe('successful execution', () => {
		it('should fetch and decode text-based web resource content', async () => {
			// Arrange
			const webResource = createTestWebResource(
				testWebResourceId,
				'new_script.js',
				'My Script',
				WebResourceType.JAVASCRIPT
			);
			const base64Content = Buffer.from('console.log("Hello");').toString('base64');

			mockWebResourceRepository.findById.mockResolvedValue(webResource);
			mockWebResourceRepository.getContent.mockResolvedValue(base64Content);

			// Act
			const result = await useCase.execute(testEnvironmentId, testWebResourceId);

			// Assert
			expect(result.content).toBeInstanceOf(Uint8Array);
			expect(new TextDecoder().decode(result.content)).toBe('console.log("Hello");');
			expect(result.fileExtension).toBe('.js');
			expect(result.displayName).toBe('My Script');
			expect(result.name).toBe('new_script.js');
		});

		it('should fetch HTML web resource content', async () => {
			// Arrange
			const webResource = createTestWebResource(
				testWebResourceId,
				'new_page.html',
				'My Page',
				WebResourceType.HTML
			);
			const base64Content = Buffer.from('<html><body>Hello</body></html>').toString('base64');

			mockWebResourceRepository.findById.mockResolvedValue(webResource);
			mockWebResourceRepository.getContent.mockResolvedValue(base64Content);

			// Act
			const result = await useCase.execute(testEnvironmentId, testWebResourceId);

			// Assert
			expect(new TextDecoder().decode(result.content)).toBe('<html><body>Hello</body></html>');
			expect(result.fileExtension).toBe('.html');
		});

		it('should fetch CSS web resource content', async () => {
			// Arrange
			const webResource = createTestWebResource(
				testWebResourceId,
				'new_styles.css',
				'Styles',
				WebResourceType.CSS
			);
			const base64Content = Buffer.from('.class { color: red; }').toString('base64');

			mockWebResourceRepository.findById.mockResolvedValue(webResource);
			mockWebResourceRepository.getContent.mockResolvedValue(base64Content);

			// Act
			const result = await useCase.execute(testEnvironmentId, testWebResourceId);

			// Assert
			expect(new TextDecoder().decode(result.content)).toBe('.class { color: red; }');
			expect(result.fileExtension).toBe('.css');
		});

		it('should fetch binary web resource content (PNG)', async () => {
			// Arrange
			const webResource = createTestWebResource(
				testWebResourceId,
				'new_image.png',
				'My Image',
				WebResourceType.PNG
			);
			// PNG magic number as base64
			const pngBytes = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
			const base64Content = Buffer.from(pngBytes).toString('base64');

			mockWebResourceRepository.findById.mockResolvedValue(webResource);
			mockWebResourceRepository.getContent.mockResolvedValue(base64Content);

			// Act
			const result = await useCase.execute(testEnvironmentId, testWebResourceId);

			// Assert
			expect(result.content).toBeInstanceOf(Uint8Array);
			expect(result.content.length).toBe(8);
			expect(result.content[0]).toBe(0x89);
			expect(result.fileExtension).toBe('.png');
		});

		it('should call repository methods in parallel', async () => {
			// Arrange
			const webResource = createTestWebResource(
				testWebResourceId,
				'new_script.js',
				'Script',
				WebResourceType.JAVASCRIPT
			);
			const base64Content = Buffer.from('test').toString('base64');

			mockWebResourceRepository.findById.mockResolvedValue(webResource);
			mockWebResourceRepository.getContent.mockResolvedValue(base64Content);

			// Act
			await useCase.execute(testEnvironmentId, testWebResourceId);

			// Assert
			expect(mockWebResourceRepository.findById).toHaveBeenCalledWith(
				testEnvironmentId,
				testWebResourceId,
				undefined
			);
			expect(mockWebResourceRepository.getContent).toHaveBeenCalledWith(
				testEnvironmentId,
				testWebResourceId,
				undefined
			);
		});

		it('should pass cancellation token to repository methods', async () => {
			// Arrange
			const cancellationToken = createCancellationToken(false);
			const webResource = createTestWebResource(
				testWebResourceId,
				'new_script.js',
				'Script',
				WebResourceType.JAVASCRIPT
			);
			const base64Content = Buffer.from('test').toString('base64');

			mockWebResourceRepository.findById.mockResolvedValue(webResource);
			mockWebResourceRepository.getContent.mockResolvedValue(base64Content);

			// Act
			await useCase.execute(testEnvironmentId, testWebResourceId, cancellationToken);

			// Assert
			expect(mockWebResourceRepository.findById).toHaveBeenCalledWith(
				testEnvironmentId,
				testWebResourceId,
				cancellationToken
			);
			expect(mockWebResourceRepository.getContent).toHaveBeenCalledWith(
				testEnvironmentId,
				testWebResourceId,
				cancellationToken
			);
		});

		it('should handle empty content', async () => {
			// Arrange
			const webResource = createTestWebResource(
				testWebResourceId,
				'new_empty.js',
				'Empty Script',
				WebResourceType.JAVASCRIPT
			);
			const base64Content = ''; // Empty content

			mockWebResourceRepository.findById.mockResolvedValue(webResource);
			mockWebResourceRepository.getContent.mockResolvedValue(base64Content);

			// Act
			const result = await useCase.execute(testEnvironmentId, testWebResourceId);

			// Assert
			expect(result.content.length).toBe(0);
		});
	});

	describe('error handling', () => {
		it('should throw error when web resource not found', async () => {
			// Arrange
			mockWebResourceRepository.findById.mockResolvedValue(null);
			mockWebResourceRepository.getContent.mockResolvedValue('');

			// Act & Assert
			await expect(useCase.execute(testEnvironmentId, testWebResourceId))
				.rejects
				.toThrow(`Web resource not found: ${testWebResourceId}`);
		});

		it('should propagate repository errors from findById', async () => {
			// Arrange
			const error = new Error('Repository connection failed');
			mockWebResourceRepository.findById.mockRejectedValue(error);

			// Act & Assert
			await expect(useCase.execute(testEnvironmentId, testWebResourceId))
				.rejects
				.toThrow('Repository connection failed');
		});

		it('should propagate repository errors from getContent', async () => {
			// Arrange
			const webResource = createTestWebResource(
				testWebResourceId,
				'new_script.js',
				'Script',
				WebResourceType.JAVASCRIPT
			);
			mockWebResourceRepository.findById.mockResolvedValue(webResource);
			mockWebResourceRepository.getContent.mockRejectedValue(new Error('Content fetch failed'));

			// Act & Assert
			await expect(useCase.execute(testEnvironmentId, testWebResourceId))
				.rejects
				.toThrow('Content fetch failed');
		});
	});

	describe('cancellation handling', () => {
		it('should throw OperationCancelledException when cancelled before execution', async () => {
			// Arrange
			const cancellationToken = createCancellationToken(true);

			// Act & Assert
			await expect(useCase.execute(testEnvironmentId, testWebResourceId, cancellationToken))
				.rejects
				.toThrow(OperationCancelledException);

			expect(mockWebResourceRepository.findById).not.toHaveBeenCalled();
			expect(mockWebResourceRepository.getContent).not.toHaveBeenCalled();
		});

		it('should throw OperationCancelledException when cancelled after fetch', async () => {
			// Arrange
			let callCount = 0;
			const cancellationToken: ICancellationToken = {
				get isCancellationRequested() {
					callCount++;
					return callCount > 1;
				},
				onCancellationRequested: jest.fn()
			};

			const webResource = createTestWebResource(
				testWebResourceId,
				'new_script.js',
				'Script',
				WebResourceType.JAVASCRIPT
			);
			mockWebResourceRepository.findById.mockResolvedValue(webResource);
			mockWebResourceRepository.getContent.mockResolvedValue('');

			// Act & Assert
			await expect(useCase.execute(testEnvironmentId, testWebResourceId, cancellationToken))
				.rejects
				.toThrow(OperationCancelledException);
		});
	});

	describe('web resource types', () => {
		const typeTests = [
			{ type: WebResourceType.HTML, extension: '.html' },
			{ type: WebResourceType.CSS, extension: '.css' },
			{ type: WebResourceType.JAVASCRIPT, extension: '.js' },
			{ type: WebResourceType.XML, extension: '.xml' },
			{ type: WebResourceType.PNG, extension: '.png' },
			{ type: WebResourceType.JPG, extension: '.jpg' },
			{ type: WebResourceType.GIF, extension: '.gif' },
			{ type: WebResourceType.XAP, extension: '.xap' },
			{ type: WebResourceType.XSL, extension: '.xsl' },
			{ type: WebResourceType.ICO, extension: '.ico' },
			{ type: WebResourceType.SVG, extension: '.svg' },
			{ type: WebResourceType.RESX, extension: '.resx' }
		];

		typeTests.forEach(({ type, extension }) => {
			it(`should return correct extension for ${extension} web resource`, async () => {
				// Arrange
				const webResource = createTestWebResource(
					testWebResourceId,
					`new_file${extension}`,
					'Test File',
					type
				);
				mockWebResourceRepository.findById.mockResolvedValue(webResource);
				mockWebResourceRepository.getContent.mockResolvedValue('');

				// Act
				const result = await useCase.execute(testEnvironmentId, testWebResourceId);

				// Assert
				expect(result.fileExtension).toBe(extension);
			});
		});
	});
});
