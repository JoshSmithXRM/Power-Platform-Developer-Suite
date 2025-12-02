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
			updateContent: jest.fn(),
			findPaginated: jest.fn(),
			getCount: jest.fn(),
			publish: jest.fn(),
			publishMultiple: jest.fn(),
			publishAll: jest.fn()
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
		isManaged = false
	): WebResource {
		return new WebResource(
			id,
			WebResourceName.create(name),
			displayName,
			type,
			isManaged,
			new Date('2024-01-01T08:00:00Z'),
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
		it('should list web resources for a solution using component filtering', async () => {
			// Arrange - unified approach: always uses component IDs
			const componentIds = ['wr-1', 'wr-2', 'wr-3'];
			const webResources = [
				createTestWebResource('wr-1', 'new_script1.js', 'Script 1'),
				createTestWebResource('wr-2', 'new_script2.js', 'Script 2'),
				createTestWebResource('wr-3', 'new_styles.css', 'Styles', WebResourceType.CSS)
			];

			mockSolutionComponentRepository.findComponentIdsBySolution.mockResolvedValue(componentIds);
			mockWebResourceRepository.findAll.mockResolvedValue(webResources);

			// Act
			const result = await useCase.execute(testEnvironmentId, DEFAULT_SOLUTION_ID);

			// Assert - component lookup is always called (unified approach)
			expect(result).toHaveLength(3);
			expect(mockSolutionComponentRepository.findComponentIdsBySolution).toHaveBeenCalledWith(
				testEnvironmentId,
				DEFAULT_SOLUTION_ID,
				'webresource',
				undefined,
				undefined
			);
		});

		it('should handle empty solution (no components)', async () => {
			// Arrange
			mockSolutionComponentRepository.findComponentIdsBySolution.mockResolvedValue([]);

			// Act
			const result = await useCase.execute(testEnvironmentId, DEFAULT_SOLUTION_ID);

			// Assert - returns early, no need to call findAll
			expect(result).toHaveLength(0);
			expect(mockWebResourceRepository.findAll).not.toHaveBeenCalled();
		});

		it('should pass cancellation token to solution component repository', async () => {
			// Arrange
			const cancellationToken = createCancellationToken(false);
			mockSolutionComponentRepository.findComponentIdsBySolution.mockResolvedValue([]);

			// Act
			await useCase.execute(testEnvironmentId, DEFAULT_SOLUTION_ID, cancellationToken);

			// Assert
			expect(mockSolutionComponentRepository.findComponentIdsBySolution).toHaveBeenCalledWith(
				testEnvironmentId,
				DEFAULT_SOLUTION_ID,
				'webresource',
				undefined,
				cancellationToken
			);
		});
	});

	describe('solution component filtering', () => {
		it('should use OData filter for small solutions (<=100 IDs)', async () => {
			// Arrange
			const solutionComponentIds = ['wr-1', 'wr-3'];
			// For specific solutions, only matching web resources are returned via OData filter
			const filteredWebResources = [
				createTestWebResource('wr-1', 'new_script1.js', 'Script 1'),
				createTestWebResource('wr-3', 'new_script3.js', 'Script 3')
			];

			mockSolutionComponentRepository.findComponentIdsBySolution.mockResolvedValue(solutionComponentIds);
			// findAll is called with OData filter for small solutions (<=100 IDs)
			mockWebResourceRepository.findAll.mockResolvedValue(filteredWebResources);

			// Act
			const result = await useCase.execute(testEnvironmentId, testSolutionId);

			// Assert - only solution's web resources are returned
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
			// Verify OData filter is passed to repository
			expect(mockWebResourceRepository.findAll).toHaveBeenCalledWith(
				testEnvironmentId,
				{ filter: expect.stringContaining("webresourceid eq 'wr-1'") },
				undefined
			);
		});

		it('should return empty array when solution has no web resource components', async () => {
			// Arrange - solution has no web resource components
			mockSolutionComponentRepository.findComponentIdsBySolution.mockResolvedValue([]);

			// Act
			const result = await useCase.execute(testEnvironmentId, testSolutionId);

			// Assert - returns early, no need to call findAll
			expect(result).toHaveLength(0);
			expect(mockWebResourceRepository.findAll).not.toHaveBeenCalled();
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

		it('should fallback to client-side filtering for large solutions (>100 IDs)', async () => {
			// Arrange - create 101 component IDs to trigger client-side fallback
			const largeComponentIds = Array.from({ length: 101 }, (_, i) => `wr-${i}`);
			const allWebResources = [
				createTestWebResource('wr-0', 'new_script0.js', 'Script 0'),
				createTestWebResource('wr-50', 'new_script50.js', 'Script 50'),
				createTestWebResource('wr-999', 'new_other.js', 'Other Script') // Not in solution
			];

			mockSolutionComponentRepository.findComponentIdsBySolution.mockResolvedValue(largeComponentIds);
			mockWebResourceRepository.findAll.mockResolvedValue(allWebResources);

			// Act
			const result = await useCase.execute(testEnvironmentId, testSolutionId);

			// Assert - fetches ALL, then filters client-side
			expect(result).toHaveLength(2); // Only wr-0 and wr-50 are in the component IDs
			expect(result.map(wr => wr.id)).toContain('wr-0');
			expect(result.map(wr => wr.id)).toContain('wr-50');
			expect(result.map(wr => wr.id)).not.toContain('wr-999');
			// For large solutions, findAll is called WITHOUT filter (client-side filtering)
			expect(mockWebResourceRepository.findAll).toHaveBeenCalledWith(
				testEnvironmentId,
				undefined,
				undefined
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

			// Neither repository should be called
			expect(mockSolutionComponentRepository.findComponentIdsBySolution).not.toHaveBeenCalled();
			expect(mockWebResourceRepository.findAll).not.toHaveBeenCalled();
		});

		it('should throw OperationCancelledException when cancelled after component fetch', async () => {
			// Arrange
			let callCount = 0;
			const cancellationToken: ICancellationToken = {
				get isCancellationRequested() {
					callCount++;
					// Cancel after first check (before component fetch) passes, second check (after) triggers cancel
					return callCount > 1;
				},
				onCancellationRequested: jest.fn()
			};

			mockSolutionComponentRepository.findComponentIdsBySolution.mockResolvedValue(['wr-1']);

			// Act & Assert
			await expect(useCase.execute(testEnvironmentId, DEFAULT_SOLUTION_ID, cancellationToken))
				.rejects
				.toThrow(OperationCancelledException);

			expect(mockSolutionComponentRepository.findComponentIdsBySolution).toHaveBeenCalled();
			expect(mockWebResourceRepository.findAll).not.toHaveBeenCalled();
		});

		it('should throw OperationCancelledException when cancelled after web resource fetch', async () => {
			// Arrange
			let callCount = 0;
			const cancellationToken: ICancellationToken = {
				get isCancellationRequested() {
					callCount++;
					// Cancel after two checks pass (before component, after component), third check (after fetch) triggers
					return callCount > 2;
				},
				onCancellationRequested: jest.fn()
			};

			mockSolutionComponentRepository.findComponentIdsBySolution.mockResolvedValue(['wr-1']);
			mockWebResourceRepository.findAll.mockResolvedValue([
				createTestWebResource('wr-1', 'new_script.js', 'Script')
			]);

			// Act & Assert
			await expect(useCase.execute(testEnvironmentId, DEFAULT_SOLUTION_ID, cancellationToken))
				.rejects
				.toThrow(OperationCancelledException);

			expect(mockSolutionComponentRepository.findComponentIdsBySolution).toHaveBeenCalled();
			expect(mockWebResourceRepository.findAll).toHaveBeenCalled();
		});

		it('should complete successfully when cancellation token is not cancelled', async () => {
			// Arrange
			const cancellationToken = createCancellationToken(false);
			mockSolutionComponentRepository.findComponentIdsBySolution.mockResolvedValue([]);

			// Act
			const result = await useCase.execute(testEnvironmentId, DEFAULT_SOLUTION_ID, cancellationToken);

			// Assert
			expect(result).toHaveLength(0);
		});
	});

	describe('error handling', () => {
		it('should propagate solution component repository errors', async () => {
			// Arrange
			const error = new Error('Solution component fetch failed');
			mockSolutionComponentRepository.findComponentIdsBySolution.mockRejectedValue(error);

			// Act & Assert
			await expect(useCase.execute(testEnvironmentId, DEFAULT_SOLUTION_ID))
				.rejects
				.toThrow('Solution component fetch failed');
		});

		it('should propagate web resource repository errors', async () => {
			// Arrange
			const error = new Error('Repository connection failed');
			mockSolutionComponentRepository.findComponentIdsBySolution.mockResolvedValue(['wr-1']);
			mockWebResourceRepository.findAll.mockRejectedValue(error);

			// Act & Assert
			await expect(useCase.execute(testEnvironmentId, DEFAULT_SOLUTION_ID))
				.rejects
				.toThrow('Repository connection failed');
		});

		it('should normalize non-Error objects thrown', async () => {
			// Arrange
			mockSolutionComponentRepository.findComponentIdsBySolution.mockRejectedValue('String error');

			// Act & Assert
			await expect(useCase.execute(testEnvironmentId, DEFAULT_SOLUTION_ID))
				.rejects
				.toThrow(Error);
		});

		it('should handle authentication failures', async () => {
			// Arrange
			const authError = new Error('Authentication token expired');
			mockSolutionComponentRepository.findComponentIdsBySolution.mockRejectedValue(authError);

			// Act & Assert
			await expect(useCase.execute(testEnvironmentId, DEFAULT_SOLUTION_ID))
				.rejects
				.toThrow('Authentication token expired');
		});

		it('should handle network timeout errors', async () => {
			// Arrange
			const timeoutError = new Error('Network timeout');
			mockSolutionComponentRepository.findComponentIdsBySolution.mockRejectedValue(timeoutError);

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
			const componentIds = Array.from({ length: 500 }, (_, i) => `wr-${i}`);

			mockWebResourceRepository.findAll.mockResolvedValue(webResources);
			mockSolutionComponentRepository.findComponentIdsBySolution.mockResolvedValue(componentIds);

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
			mockSolutionComponentRepository.findComponentIdsBySolution.mockResolvedValue(['wr-1', 'wr-2', 'wr-3', 'wr-4', 'wr-5']);

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
			mockSolutionComponentRepository.findComponentIdsBySolution.mockResolvedValue(['wr-1', 'wr-2', 'wr-3', 'wr-4', 'wr-5']);

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
			mockSolutionComponentRepository.findComponentIdsBySolution.mockResolvedValue(['wr-1', 'wr-2']);

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
			mockSolutionComponentRepository.findComponentIdsBySolution.mockResolvedValue(['wr-1', 'wr-2']);

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
			mockSolutionComponentRepository.findComponentIdsBySolution.mockResolvedValue(['wr-a', 'wr-b', 'wr-c']);

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
			mockSolutionComponentRepository.findComponentIdsBySolution.mockResolvedValue(['wr-1']);

			// Act
			const result = await useCase.execute(testEnvironmentId, DEFAULT_SOLUTION_ID);

			// Assert
			const resource = result[0];
			expect(resource!.isInSolution(new Set(['wr-1']))).toBe(true);
			expect(resource!.isInSolution(new Set(['wr-2']))).toBe(false);
		});

		it('should return entities with proper editability', async () => {
			// Arrange - test editability based on type (not managed status)
			const webResources = [
				createTestWebResource('wr-1', 'new_script.js', 'Script', WebResourceType.JAVASCRIPT, false),
				createTestWebResource('wr-2', 'new_managed.js', 'Managed', WebResourceType.JAVASCRIPT, true),
				createTestWebResource('wr-3', 'new_image.png', 'Image', WebResourceType.PNG, false)
			];

			mockWebResourceRepository.findAll.mockResolvedValue(webResources);
			mockSolutionComponentRepository.findComponentIdsBySolution.mockResolvedValue(['wr-1', 'wr-2', 'wr-3']);

			// Act - include all types to test PNG editability
			const result = await useCase.execute(testEnvironmentId, DEFAULT_SOLUTION_ID, undefined, { textBasedOnly: false });

			// Assert - text-based types are editable (including managed), binary types are not
			expect(result.find(wr => wr.id === 'wr-1')?.canEdit()).toBe(true);  // JS - editable
			expect(result.find(wr => wr.id === 'wr-2')?.canEdit()).toBe(true);  // JS managed - editable (hotfix support)
			expect(result.find(wr => wr.id === 'wr-3')?.canEdit()).toBe(false); // PNG - not editable (binary)
		});
	});
});
