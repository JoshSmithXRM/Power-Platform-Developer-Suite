import { ListWebResourcesUseCase } from './ListWebResourcesUseCase';
import { IWebResourceRepository } from '../../domain/interfaces/IWebResourceRepository';
import { ISolutionComponentRepository } from '../../../../shared/domain/interfaces/ISolutionComponentRepository';
import { NullLogger } from '../../../../infrastructure/logging/NullLogger';
import { WebResource } from '../../domain/entities/WebResource';
import { WebResourceName } from '../../domain/valueObjects/WebResourceName';
import { WebResourceType } from '../../domain/valueObjects/WebResourceType';
import { OperationCancelledException } from '../../../../shared/domain/errors/OperationCancelledException';
import type { ICancellationToken } from '../../../../shared/domain/interfaces/ICancellationToken';
import { DEFAULT_SOLUTION_ID } from '../../../../shared/domain/constants/SolutionConstants';

describe('ListWebResourcesUseCase', () => {
	let useCase: ListWebResourcesUseCase;
	let mockWebResourceRepository: jest.Mocked<IWebResourceRepository>;
	let mockSolutionComponentRepository: jest.Mocked<ISolutionComponentRepository>;

	const testEnvironmentId = 'env-00000000-0000-0000-0000-000000000001';
	const testSolutionId = 'sol-00000000-0000-0000-0000-000000000002';

	beforeEach(() => {
		mockWebResourceRepository = {
			findAll: jest.fn(),
			findById: jest.fn(),
			getContent: jest.fn(),
			updateContent: jest.fn()
		};

		mockSolutionComponentRepository = {
			findComponentIdsBySolution: jest.fn(),
			getObjectTypeCode: jest.fn()
		};

		useCase = new ListWebResourcesUseCase(
			mockWebResourceRepository,
			mockSolutionComponentRepository,
			new NullLogger()
		);
	});

	function createTestWebResource(
		id: string,
		name: string,
		displayName: string,
		type: WebResourceType = WebResourceType.JAVASCRIPT,
		isManaged = false,
		contentSize = 1024
	): WebResource {
		return new WebResource(
			id,
			WebResourceName.create(name),
			displayName,
			type,
			contentSize,
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

	describe('successful execution - default solution (no filter)', () => {
		it('should list all web resources when using DEFAULT_SOLUTION_ID', async () => {
			// Arrange
			const webResources = [
				createTestWebResource('wr-1', 'new_script1.js', 'Script 1'),
				createTestWebResource('wr-2', 'new_script2.js', 'Script 2'),
				createTestWebResource('wr-3', 'new_styles.css', 'Styles', WebResourceType.CSS)
			];

			mockWebResourceRepository.findAll.mockResolvedValue(webResources);

			// Act
			const result = await useCase.execute(testEnvironmentId, DEFAULT_SOLUTION_ID);

			// Assert
			expect(result).toHaveLength(3);
			expect(mockWebResourceRepository.findAll).toHaveBeenCalledWith(
				testEnvironmentId,
				undefined,
				undefined
			);
			expect(mockSolutionComponentRepository.findComponentIdsBySolution).not.toHaveBeenCalled();
		});

		it('should handle empty web resources list', async () => {
			// Arrange
			mockWebResourceRepository.findAll.mockResolvedValue([]);

			// Act
			const result = await useCase.execute(testEnvironmentId, DEFAULT_SOLUTION_ID);

			// Assert
			expect(result).toHaveLength(0);
		});

		it('should pass cancellation token to repository', async () => {
			// Arrange
			const cancellationToken = createCancellationToken(false);
			mockWebResourceRepository.findAll.mockResolvedValue([]);

			// Act
			await useCase.execute(testEnvironmentId, DEFAULT_SOLUTION_ID, cancellationToken);

			// Assert
			expect(mockWebResourceRepository.findAll).toHaveBeenCalledWith(
				testEnvironmentId,
				undefined,
				cancellationToken
			);
		});
	});

	describe('successful execution - with solution filter', () => {
		it('should filter web resources by solution', async () => {
			// Arrange
			const allWebResources = [
				createTestWebResource('wr-1', 'new_script1.js', 'Script 1'),
				createTestWebResource('wr-2', 'new_script2.js', 'Script 2'),
				createTestWebResource('wr-3', 'new_script3.js', 'Script 3')
			];
			const solutionComponentIds = ['wr-1', 'wr-3'];

			mockWebResourceRepository.findAll.mockResolvedValue(allWebResources);
			mockSolutionComponentRepository.findComponentIdsBySolution.mockResolvedValue(solutionComponentIds);

			// Act
			const result = await useCase.execute(testEnvironmentId, testSolutionId);

			// Assert
			expect(result).toHaveLength(2);
			expect(result.map(wr => wr.id)).toContain('wr-1');
			expect(result.map(wr => wr.id)).toContain('wr-3');
			expect(result.map(wr => wr.id)).not.toContain('wr-2');
			expect(mockSolutionComponentRepository.findComponentIdsBySolution).toHaveBeenCalledWith(
				testEnvironmentId,
				testSolutionId,
				'webresource',
				undefined,
				undefined
			);
		});

		it('should handle solution with no matching web resources', async () => {
			// Arrange
			const allWebResources = [
				createTestWebResource('wr-1', 'new_script1.js', 'Script 1')
			];

			mockWebResourceRepository.findAll.mockResolvedValue(allWebResources);
			mockSolutionComponentRepository.findComponentIdsBySolution.mockResolvedValue([]);

			// Act
			const result = await useCase.execute(testEnvironmentId, testSolutionId);

			// Assert
			expect(result).toHaveLength(0);
		});

		it('should pass cancellation token to solution component repository', async () => {
			// Arrange
			const cancellationToken = createCancellationToken(false);
			mockWebResourceRepository.findAll.mockResolvedValue([]);
			mockSolutionComponentRepository.findComponentIdsBySolution.mockResolvedValue([]);

			// Act
			await useCase.execute(testEnvironmentId, testSolutionId, cancellationToken);

			// Assert
			expect(mockSolutionComponentRepository.findComponentIdsBySolution).toHaveBeenCalledWith(
				testEnvironmentId,
				testSolutionId,
				'webresource',
				undefined,
				cancellationToken
			);
		});
	});

	describe('cancellation handling', () => {
		it('should throw OperationCancelledException when cancelled before execution', async () => {
			// Arrange
			const cancellationToken = createCancellationToken(true);

			// Act & Assert
			await expect(useCase.execute(testEnvironmentId, DEFAULT_SOLUTION_ID, cancellationToken))
				.rejects
				.toThrow(OperationCancelledException);

			expect(mockWebResourceRepository.findAll).not.toHaveBeenCalled();
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

			mockWebResourceRepository.findAll.mockResolvedValue([]);

			// Act & Assert
			await expect(useCase.execute(testEnvironmentId, DEFAULT_SOLUTION_ID, cancellationToken))
				.rejects
				.toThrow(OperationCancelledException);

			expect(mockWebResourceRepository.findAll).toHaveBeenCalled();
		});

		it('should throw OperationCancelledException when cancelled during solution filtering', async () => {
			// Arrange
			let callCount = 0;
			const cancellationToken: ICancellationToken = {
				get isCancellationRequested() {
					callCount++;
					// Cancel after fetch but during filtering
					return callCount > 2;
				},
				onCancellationRequested: jest.fn()
			};

			mockWebResourceRepository.findAll.mockResolvedValue([
				createTestWebResource('wr-1', 'new_script.js', 'Script')
			]);
			mockSolutionComponentRepository.findComponentIdsBySolution.mockResolvedValue(['wr-1']);

			// Act & Assert
			await expect(useCase.execute(testEnvironmentId, testSolutionId, cancellationToken))
				.rejects
				.toThrow(OperationCancelledException);
		});

		it('should complete successfully when cancellation token is not cancelled', async () => {
			// Arrange
			const cancellationToken = createCancellationToken(false);
			mockWebResourceRepository.findAll.mockResolvedValue([]);

			// Act
			const result = await useCase.execute(testEnvironmentId, DEFAULT_SOLUTION_ID, cancellationToken);

			// Assert
			expect(result).toHaveLength(0);
		});
	});

	describe('error handling', () => {
		it('should propagate repository errors', async () => {
			// Arrange
			const error = new Error('Repository connection failed');
			mockWebResourceRepository.findAll.mockRejectedValue(error);

			// Act & Assert
			await expect(useCase.execute(testEnvironmentId, DEFAULT_SOLUTION_ID))
				.rejects
				.toThrow('Repository connection failed');
		});

		it('should propagate solution component repository errors', async () => {
			// Arrange
			const error = new Error('Solution component fetch failed');
			mockWebResourceRepository.findAll.mockResolvedValue([]);
			mockSolutionComponentRepository.findComponentIdsBySolution.mockRejectedValue(error);

			// Act & Assert
			await expect(useCase.execute(testEnvironmentId, testSolutionId))
				.rejects
				.toThrow('Solution component fetch failed');
		});

		it('should normalize non-Error objects thrown', async () => {
			// Arrange
			mockWebResourceRepository.findAll.mockRejectedValue('String error');

			// Act & Assert
			await expect(useCase.execute(testEnvironmentId, DEFAULT_SOLUTION_ID))
				.rejects
				.toThrow(Error);
		});

		it('should handle authentication failures', async () => {
			// Arrange
			const authError = new Error('Authentication token expired');
			mockWebResourceRepository.findAll.mockRejectedValue(authError);

			// Act & Assert
			await expect(useCase.execute(testEnvironmentId, DEFAULT_SOLUTION_ID))
				.rejects
				.toThrow('Authentication token expired');
		});

		it('should handle network timeout errors', async () => {
			// Arrange
			const timeoutError = new Error('Network timeout');
			mockWebResourceRepository.findAll.mockRejectedValue(timeoutError);

			// Act & Assert
			await expect(useCase.execute(testEnvironmentId, DEFAULT_SOLUTION_ID))
				.rejects
				.toThrow('Network timeout');
		});
	});

	describe('edge cases', () => {
		it('should handle large number of web resources', async () => {
			// Arrange
			const webResources = Array.from({ length: 500 }, (_, i) =>
				createTestWebResource(`wr-${i}`, `new_script${i}.js`, `Script ${i}`)
			);

			mockWebResourceRepository.findAll.mockResolvedValue(webResources);

			// Act
			const result = await useCase.execute(testEnvironmentId, DEFAULT_SOLUTION_ID);

			// Assert
			expect(result).toHaveLength(500);
		});

		it('should handle mixed web resource types (text-based only by default)', async () => {
			// Arrange
			const webResources = [
				createTestWebResource('wr-1', 'new_script.js', 'Script', WebResourceType.JAVASCRIPT),
				createTestWebResource('wr-2', 'new_styles.css', 'Styles', WebResourceType.CSS),
				createTestWebResource('wr-3', 'new_page.html', 'Page', WebResourceType.HTML),
				createTestWebResource('wr-4', 'new_icon.png', 'Icon', WebResourceType.PNG),
				createTestWebResource('wr-5', 'new_config.xml', 'Config', WebResourceType.XML)
			];

			mockWebResourceRepository.findAll.mockResolvedValue(webResources);

			// Act - default textBasedOnly: true filters out PNG
			const result = await useCase.execute(testEnvironmentId, DEFAULT_SOLUTION_ID);

			// Assert - PNG filtered out
			expect(result).toHaveLength(4);
			expect(result.map(wr => wr.id)).not.toContain('wr-4');
		});

		it('should include all types when textBasedOnly is false', async () => {
			// Arrange
			const webResources = [
				createTestWebResource('wr-1', 'new_script.js', 'Script', WebResourceType.JAVASCRIPT),
				createTestWebResource('wr-2', 'new_styles.css', 'Styles', WebResourceType.CSS),
				createTestWebResource('wr-3', 'new_page.html', 'Page', WebResourceType.HTML),
				createTestWebResource('wr-4', 'new_icon.png', 'Icon', WebResourceType.PNG),
				createTestWebResource('wr-5', 'new_config.xml', 'Config', WebResourceType.XML)
			];

			mockWebResourceRepository.findAll.mockResolvedValue(webResources);

			// Act - include all types
			const result = await useCase.execute(testEnvironmentId, DEFAULT_SOLUTION_ID, undefined, { textBasedOnly: false });

			// Assert - all 5 included
			expect(result).toHaveLength(5);
		});

		it('should handle managed web resources', async () => {
			// Arrange
			const webResources = [
				createTestWebResource('wr-1', 'new_script.js', 'Script', WebResourceType.JAVASCRIPT, true),
				createTestWebResource('wr-2', 'new_unmanaged.js', 'Unmanaged', WebResourceType.JAVASCRIPT, false)
			];

			mockWebResourceRepository.findAll.mockResolvedValue(webResources);

			// Act
			const result = await useCase.execute(testEnvironmentId, DEFAULT_SOLUTION_ID);

			// Assert
			expect(result).toHaveLength(2);
			expect(result.find(wr => wr.id === 'wr-1')?.isManaged).toBe(true);
			expect(result.find(wr => wr.id === 'wr-2')?.isManaged).toBe(false);
		});

		it('should handle web resources with special characters in names', async () => {
			// Arrange
			const webResources = [
				createTestWebResource('wr-1', 'new_script-v1.0.js', 'Script v1.0'),
				createTestWebResource('wr-2', 'new_my_script_file.js', 'My Script File')
			];

			mockWebResourceRepository.findAll.mockResolvedValue(webResources);

			// Act
			const result = await useCase.execute(testEnvironmentId, DEFAULT_SOLUTION_ID);

			// Assert
			expect(result).toHaveLength(2);
		});

		it('should handle duplicate component IDs from solution filter', async () => {
			// Arrange
			const webResources = [
				createTestWebResource('wr-1', 'new_script.js', 'Script')
			];
			// Solution repository returns duplicates
			const solutionComponentIds = ['wr-1', 'wr-1', 'wr-1'];

			mockWebResourceRepository.findAll.mockResolvedValue(webResources);
			mockSolutionComponentRepository.findComponentIdsBySolution.mockResolvedValue(solutionComponentIds);

			// Act
			const result = await useCase.execute(testEnvironmentId, testSolutionId);

			// Assert
			// Set-based filtering should deduplicate
			expect(result).toHaveLength(1);
		});

		it('should preserve web resource order from repository', async () => {
			// Arrange
			const webResources = [
				createTestWebResource('wr-a', 'new_a.js', 'A Script'),
				createTestWebResource('wr-b', 'new_b.js', 'B Script'),
				createTestWebResource('wr-c', 'new_c.js', 'C Script')
			];

			mockWebResourceRepository.findAll.mockResolvedValue(webResources);

			// Act
			const result = await useCase.execute(testEnvironmentId, DEFAULT_SOLUTION_ID);

			// Assert
			expect(result[0]!.id).toBe('wr-a');
			expect(result[1]!.id).toBe('wr-b');
			expect(result[2]!.id).toBe('wr-c');
		});
	});

	describe('entity behavior integration', () => {
		it('should return entities that can check solution membership', async () => {
			// Arrange
			const webResources = [
				createTestWebResource('wr-1', 'new_script.js', 'Script')
			];

			mockWebResourceRepository.findAll.mockResolvedValue(webResources);

			// Act
			const result = await useCase.execute(testEnvironmentId, DEFAULT_SOLUTION_ID);

			// Assert
			const resource = result[0];
			expect(resource!.isInSolution(new Set(['wr-1']))).toBe(true);
			expect(resource!.isInSolution(new Set(['wr-2']))).toBe(false);
		});

		it('should return entities with proper editability', async () => {
			// Arrange
			const webResources = [
				createTestWebResource('wr-1', 'new_script.js', 'Script', WebResourceType.JAVASCRIPT, false),
				createTestWebResource('wr-2', 'new_managed.js', 'Managed', WebResourceType.JAVASCRIPT, true),
				createTestWebResource('wr-3', 'new_image.png', 'Image', WebResourceType.PNG, false)
			];

			mockWebResourceRepository.findAll.mockResolvedValue(webResources);

			// Act - include all types to test PNG editability
			const result = await useCase.execute(testEnvironmentId, DEFAULT_SOLUTION_ID, undefined, { textBasedOnly: false });

			// Assert
			expect(result.find(wr => wr.id === 'wr-1')?.canEdit()).toBe(true);
			expect(result.find(wr => wr.id === 'wr-2')?.canEdit()).toBe(false);
			expect(result.find(wr => wr.id === 'wr-3')?.canEdit()).toBe(false);
		});
	});
});
