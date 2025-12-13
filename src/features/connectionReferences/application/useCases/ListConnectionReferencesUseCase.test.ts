import { ListConnectionReferencesUseCase } from './ListConnectionReferencesUseCase';
import { ICloudFlowRepository } from '../../domain/interfaces/ICloudFlowRepository';
import { IConnectionReferenceRepository } from '../../domain/interfaces/IConnectionReferenceRepository';
import { ISolutionComponentRepository } from '../../../../shared/domain/interfaces/ISolutionComponentRepository';
import { FlowConnectionRelationshipBuilder } from '../../domain/services/FlowConnectionRelationshipBuilder';
import { NullLogger } from '../../../../infrastructure/logging/NullLogger';
import { CloudFlow } from '../../domain/entities/CloudFlow';
import { ConnectionReference } from '../../domain/entities/ConnectionReference';
import { FlowConnectionRelationship } from '../../domain/valueObjects/FlowConnectionRelationship';
import { OperationCancelledException } from '../../../../shared/domain/errors/OperationCancelledException';
import type { ICancellationToken } from '../../../../shared/domain/interfaces/ICancellationToken';
import { DEFAULT_SOLUTION_ID } from '../../../../shared/domain/constants/SolutionConstants';

describe('ListConnectionReferencesUseCase', () => {
	let useCase: ListConnectionReferencesUseCase;
	let mockFlowRepository: jest.Mocked<ICloudFlowRepository>;
	let mockConnectionRefRepository: jest.Mocked<IConnectionReferenceRepository>;
	let mockSolutionComponentRepository: jest.Mocked<ISolutionComponentRepository>;
	let mockRelationshipBuilder: jest.Mocked<FlowConnectionRelationshipBuilder>;

	const testEnvironmentId = 'env-00000000-0000-0000-0000-000000000001';
	const testSolutionId = 'sol-00000000-0000-0000-0000-000000000002';

	beforeEach(() => {
		mockFlowRepository = {
			findAll: jest.fn()
		};

		mockConnectionRefRepository = {
			findAll: jest.fn()
		};

		mockSolutionComponentRepository = {
			findComponentIdsBySolution: jest.fn(),
			getObjectTypeCode: jest.fn(),
			findAllComponentsForSolution: jest.fn()
		};

		mockRelationshipBuilder = {
			buildRelationships: jest.fn(),
			createCaseInsensitiveConnectionReferenceMap: jest.fn(),
			buildFlowRelationships: jest.fn(),
			buildRelationshipsForFlow: jest.fn(),
			createFlowToConnectionReferenceRelationship: jest.fn(),
			buildManyToManyRelationships: jest.fn(),
			createConnectionReferenceToFlowsRelationship: jest.fn(),
			createOrphanedFlowRelationship: jest.fn(),
			buildOrphanedConnectionReferenceRelationships: jest.fn(),
			createOrphanedConnectionReferenceRelationship: jest.fn()
		} as unknown as jest.Mocked<FlowConnectionRelationshipBuilder>;

		useCase = new ListConnectionReferencesUseCase(
			mockFlowRepository,
			mockConnectionRefRepository,
			mockSolutionComponentRepository,
			mockRelationshipBuilder,
			new NullLogger()
		);
	});

	function createTestCloudFlow(
		id: string,
		name: string,
		isManaged = false,
		clientData: string | null = null
	): CloudFlow {
		return new CloudFlow(
			id,
			name,
			new Date('2025-11-01T12:00:00Z'),
			isManaged,
			'John Doe',
			clientData
		);
	}

	function createTestConnectionReference(
		id: string,
		logicalName: string,
		displayName: string,
		connectorId: string | null = '/providers/Microsoft.PowerApps/apis/shared_sharepointonline',
		connectionId: string | null = 'conn-123',
		isManaged = false
	): ConnectionReference {
		return new ConnectionReference(
			id,
			logicalName,
			displayName,
			connectorId,
			connectionId,
			isManaged,
			new Date('2025-11-01T12:00:00Z')
		);
	}

	function createTestRelationship(
		flowId: string | null,
		flowName: string,
		crId: string | null,
		crLogicalName: string,
		type: 'flow-to-cr' | 'orphaned-flow' | 'orphaned-cr'
	): FlowConnectionRelationship {
		return new FlowConnectionRelationship(
			flowId,
			flowName,
			crId,
			crLogicalName,
			`Display ${crLogicalName}`,
			type,
			false,
			false,
			new Date('2025-11-01T12:00:00Z'),
			new Date('2025-11-01T12:00:00Z')
		);
	}

	function createCancellationToken(isCancelled = false): ICancellationToken {
		return {
			isCancellationRequested: isCancelled,
			onCancellationRequested: jest.fn()
		};
	}

	describe('successful execution - no solution filter', () => {
		it('should list all flows and connection references without solution filter', async () => {
			// Arrange
			const flows = [
				createTestCloudFlow('flow-1', 'Flow 1'),
				createTestCloudFlow('flow-2', 'Flow 2')
			];
			const connectionRefs = [
				createTestConnectionReference('cr-1', 'cr_sharepoint', 'SharePoint'),
				createTestConnectionReference('cr-2', 'cr_dataverse', 'Dataverse')
			];
			const relationships = [
				createTestRelationship('flow-1', 'Flow 1', 'cr-1', 'cr_sharepoint', 'flow-to-cr'),
				createTestRelationship('flow-2', 'Flow 2', 'cr-2', 'cr_dataverse', 'flow-to-cr')
			];

			mockFlowRepository.findAll.mockResolvedValue(flows);
			mockConnectionRefRepository.findAll.mockResolvedValue(connectionRefs);
			mockRelationshipBuilder.buildRelationships.mockReturnValue(relationships);
			// Mock solution component repository for DEFAULT_SOLUTION_ID
			mockSolutionComponentRepository.findComponentIdsBySolution.mockResolvedValue(['flow-1', 'flow-2', 'cr-1', 'cr-2']);

			// Act
			const result = await useCase.execute(testEnvironmentId, DEFAULT_SOLUTION_ID);

			// Assert
			expect(result.relationships).toHaveLength(2);
			expect(result.connectionReferences).toHaveLength(2);
			expect(mockFlowRepository.findAll).toHaveBeenCalledWith(
				testEnvironmentId,
				{
					select: ['workflowid', 'name', 'modifiedon', 'ismanaged', 'clientdata', '_createdby_value'],
					expand: 'createdby($select=fullname)',
					filter: 'category eq 5',
					orderBy: 'name'
				},
				undefined
			);
			expect(mockConnectionRefRepository.findAll).toHaveBeenCalledWith(
				testEnvironmentId,
				undefined,
				undefined
			);
			expect(mockRelationshipBuilder.buildRelationships).toHaveBeenCalledWith(flows, connectionRefs);
		});

		it('should handle empty flows and connection references', async () => {
			// Arrange
			mockFlowRepository.findAll.mockResolvedValue([]);
			mockConnectionRefRepository.findAll.mockResolvedValue([]);
			mockRelationshipBuilder.buildRelationships.mockReturnValue([]);

			// Act
			mockSolutionComponentRepository.findComponentIdsBySolution.mockResolvedValue(['flow-1', 'flow-2', 'cr-1', 'cr-2']);
			const result = await useCase.execute(testEnvironmentId, DEFAULT_SOLUTION_ID);

			// Assert
			expect(result.relationships).toHaveLength(0);
			expect(result.connectionReferences).toHaveLength(0);
			expect(mockRelationshipBuilder.buildRelationships).toHaveBeenCalledWith([], []);
		});

		it('should pass cancellation token to repositories', async () => {
			// Arrange
			const cancellationToken = createCancellationToken(false);
			mockFlowRepository.findAll.mockResolvedValue([]);
			mockConnectionRefRepository.findAll.mockResolvedValue([]);
			mockRelationshipBuilder.buildRelationships.mockReturnValue([]);

			// Act
			await useCase.execute(testEnvironmentId, DEFAULT_SOLUTION_ID, cancellationToken);

			// Assert
			expect(mockFlowRepository.findAll).toHaveBeenCalledWith(
				testEnvironmentId,
				expect.objectContaining({}),
				cancellationToken
			);
			expect(mockConnectionRefRepository.findAll).toHaveBeenCalledWith(
				testEnvironmentId,
				undefined,
				cancellationToken
			);
		});
	});

	describe('successful execution - with solution filter', () => {
		it('should filter flows and connection references by solution', async () => {
			// Arrange
			const allFlows = [
				createTestCloudFlow('flow-1', 'Flow 1'),
				createTestCloudFlow('flow-2', 'Flow 2'),
				createTestCloudFlow('flow-3', 'Flow 3')
			];
			const allConnectionRefs = [
				createTestConnectionReference('cr-1', 'cr_sharepoint', 'SharePoint'),
				createTestConnectionReference('cr-2', 'cr_dataverse', 'Dataverse'),
				createTestConnectionReference('cr-3', 'cr_sql', 'SQL')
			];
			const flowComponentIds = ['flow-1', 'flow-2'];
			const crComponentIds = ['cr-1', 'cr-2'];
			const relationships = [
				createTestRelationship('flow-1', 'Flow 1', 'cr-1', 'cr_sharepoint', 'flow-to-cr')
			];

			mockFlowRepository.findAll.mockResolvedValue(allFlows);
			mockConnectionRefRepository.findAll.mockResolvedValue(allConnectionRefs);
			mockSolutionComponentRepository.findComponentIdsBySolution
				.mockResolvedValueOnce(flowComponentIds)
				.mockResolvedValueOnce(crComponentIds);
			mockRelationshipBuilder.buildRelationships.mockReturnValue(relationships);

			// Act
			const result = await useCase.execute(testEnvironmentId, testSolutionId);

			// Assert
			expect(result.relationships).toHaveLength(1);
			expect(result.connectionReferences).toHaveLength(2);
			expect(result.connectionReferences[0]!.id).toBe('cr-1');
			expect(result.connectionReferences[1]!.id).toBe('cr-2');
			expect(mockSolutionComponentRepository.findComponentIdsBySolution).toHaveBeenCalledTimes(2);
			expect(mockSolutionComponentRepository.findComponentIdsBySolution).toHaveBeenCalledWith(
				testEnvironmentId,
				testSolutionId,
				'subscription',
				undefined,
				undefined
			);
			expect(mockSolutionComponentRepository.findComponentIdsBySolution).toHaveBeenCalledWith(
				testEnvironmentId,
				testSolutionId,
				'connectionreference',
				undefined,
				undefined
			);
			expect(mockRelationshipBuilder.buildRelationships).toHaveBeenCalledWith(
				expect.arrayContaining([
					expect.objectContaining({ id: 'flow-1' }),
					expect.objectContaining({ id: 'flow-2' })
				]),
				expect.arrayContaining([
					expect.objectContaining({ id: 'cr-1' }),
					expect.objectContaining({ id: 'cr-2' })
				])
			);
		});

		it('should handle solution with no matching components', async () => {
			// Arrange
			const allFlows = [createTestCloudFlow('flow-1', 'Flow 1')];
			const allConnectionRefs = [createTestConnectionReference('cr-1', 'cr_sharepoint', 'SharePoint')];

			mockFlowRepository.findAll.mockResolvedValue(allFlows);
			mockConnectionRefRepository.findAll.mockResolvedValue(allConnectionRefs);
			mockSolutionComponentRepository.findComponentIdsBySolution
				.mockResolvedValueOnce([])
				.mockResolvedValueOnce([]);
			mockRelationshipBuilder.buildRelationships.mockReturnValue([]);

			// Act
			const result = await useCase.execute(testEnvironmentId, testSolutionId);

			// Assert
			expect(result.relationships).toHaveLength(0);
			expect(result.connectionReferences).toHaveLength(0);
			expect(mockRelationshipBuilder.buildRelationships).toHaveBeenCalledWith([], []);
		});

		it('should pass cancellation token to solution component repository', async () => {
			// Arrange
			const cancellationToken = createCancellationToken(false);
			mockFlowRepository.findAll.mockResolvedValue([]);
			mockConnectionRefRepository.findAll.mockResolvedValue([]);
			mockSolutionComponentRepository.findComponentIdsBySolution
				.mockResolvedValueOnce([])
				.mockResolvedValueOnce([]);
			mockRelationshipBuilder.buildRelationships.mockReturnValue([]);

			// Act
			await useCase.execute(testEnvironmentId, testSolutionId, cancellationToken);

			// Assert
			expect(mockSolutionComponentRepository.findComponentIdsBySolution).toHaveBeenCalledWith(
				testEnvironmentId,
				testSolutionId,
				'subscription',
				undefined,
				cancellationToken
			);
			expect(mockSolutionComponentRepository.findComponentIdsBySolution).toHaveBeenCalledWith(
				testEnvironmentId,
				testSolutionId,
				'connectionreference',
				undefined,
				cancellationToken
			);
		});
	});

	describe('relationship building', () => {
		it('should delegate relationship building to domain service', async () => {
			// Arrange
			const flows = [createTestCloudFlow('flow-1', 'Flow 1')];
			const connectionRefs = [createTestConnectionReference('cr-1', 'cr_sharepoint', 'SharePoint')];
			const expectedRelationships = [
				createTestRelationship('flow-1', 'Flow 1', 'cr-1', 'cr_sharepoint', 'flow-to-cr')
			];

			mockFlowRepository.findAll.mockResolvedValue(flows);
			mockConnectionRefRepository.findAll.mockResolvedValue(connectionRefs);
			mockRelationshipBuilder.buildRelationships.mockReturnValue(expectedRelationships);

			// Act
			mockSolutionComponentRepository.findComponentIdsBySolution.mockResolvedValue(['flow-1', 'flow-2', 'cr-1', 'cr-2']);
			const result = await useCase.execute(testEnvironmentId, DEFAULT_SOLUTION_ID);

			// Assert
			expect(mockRelationshipBuilder.buildRelationships).toHaveBeenCalledTimes(1);
			expect(mockRelationshipBuilder.buildRelationships).toHaveBeenCalledWith(flows, connectionRefs);
			expect(result.relationships).toBe(expectedRelationships);
		});

		it('should handle multiple relationship types', async () => {
			// Arrange
			const flows = [
				createTestCloudFlow('flow-1', 'Flow 1'),
				createTestCloudFlow('flow-2', 'Flow 2')
			];
			const connectionRefs = [
				createTestConnectionReference('cr-1', 'cr_sharepoint', 'SharePoint'),
				createTestConnectionReference('cr-3', 'cr_unused', 'Unused')
			];
			const relationships = [
				createTestRelationship('flow-1', 'Flow 1', 'cr-1', 'cr_sharepoint', 'flow-to-cr'),
				createTestRelationship('flow-2', 'Flow 2', null, 'cr_missing', 'orphaned-flow'),
				createTestRelationship(null, '(No flow uses this)', 'cr-3', 'cr_unused', 'orphaned-cr')
			];

			mockFlowRepository.findAll.mockResolvedValue(flows);
			mockConnectionRefRepository.findAll.mockResolvedValue(connectionRefs);
			mockRelationshipBuilder.buildRelationships.mockReturnValue(relationships);

			// Act
			mockSolutionComponentRepository.findComponentIdsBySolution.mockResolvedValue(['flow-1', 'flow-2', 'cr-1', 'cr-2']);
			const result = await useCase.execute(testEnvironmentId, DEFAULT_SOLUTION_ID);

			// Assert
			expect(result.relationships).toHaveLength(3);
			expect(result.relationships.filter(r => r.relationshipType === 'flow-to-cr')).toHaveLength(1);
			expect(result.relationships.filter(r => r.relationshipType === 'orphaned-flow')).toHaveLength(1);
			expect(result.relationships.filter(r => r.relationshipType === 'orphaned-cr')).toHaveLength(1);
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

			expect(mockFlowRepository.findAll).not.toHaveBeenCalled();
			expect(mockConnectionRefRepository.findAll).not.toHaveBeenCalled();
		});

		it('should throw OperationCancelledException when cancelled after fetching data', async () => {
			// Arrange
			let callCount = 0;
			const cancellationToken: ICancellationToken = {
				get isCancellationRequested() {
					callCount++;
					return callCount > 1;
				},
				onCancellationRequested: jest.fn()
			};

			mockFlowRepository.findAll.mockResolvedValue([]);
			mockConnectionRefRepository.findAll.mockResolvedValue([]);

			// Act & Assert
			await expect(useCase.execute(testEnvironmentId, DEFAULT_SOLUTION_ID, cancellationToken))
				.rejects
				.toThrow(OperationCancelledException);

			expect(mockFlowRepository.findAll).toHaveBeenCalled();
			expect(mockConnectionRefRepository.findAll).toHaveBeenCalled();
			expect(mockRelationshipBuilder.buildRelationships).not.toHaveBeenCalled();
		});

		it('should throw OperationCancelledException when cancelled after filtering by solution', async () => {
			// Arrange
			let callCount = 0;
			const cancellationToken: ICancellationToken = {
				get isCancellationRequested() {
					callCount++;
					return callCount > 2;
				},
				onCancellationRequested: jest.fn()
			};

			mockFlowRepository.findAll.mockResolvedValue([]);
			mockConnectionRefRepository.findAll.mockResolvedValue([]);
			mockSolutionComponentRepository.findComponentIdsBySolution
				.mockResolvedValueOnce([])
				.mockResolvedValueOnce([]);

			// Act & Assert
			await expect(useCase.execute(testEnvironmentId, testSolutionId, cancellationToken))
				.rejects
				.toThrow(OperationCancelledException);

			expect(mockSolutionComponentRepository.findComponentIdsBySolution).toHaveBeenCalledTimes(2);
			expect(mockRelationshipBuilder.buildRelationships).not.toHaveBeenCalled();
		});

		it('should complete successfully when cancellation token is not cancelled', async () => {
			// Arrange
			const cancellationToken = createCancellationToken(false);
			mockFlowRepository.findAll.mockResolvedValue([]);
			mockConnectionRefRepository.findAll.mockResolvedValue([]);
			mockRelationshipBuilder.buildRelationships.mockReturnValue([]);

			// Act
			const result = await useCase.execute(testEnvironmentId, DEFAULT_SOLUTION_ID, cancellationToken);

			// Assert
			expect(result.relationships).toHaveLength(0);
			expect(result.connectionReferences).toHaveLength(0);
		});
	});

	describe('error handling', () => {
		it('should propagate repository errors', async () => {
			// Arrange
			const error = new Error('Repository connection failed');
			mockFlowRepository.findAll.mockRejectedValue(error);

			// Act & Assert
			await expect(useCase.execute(testEnvironmentId, DEFAULT_SOLUTION_ID))
				.rejects
				.toThrow('Repository connection failed');
		});

		it('should propagate connection reference repository errors', async () => {
			// Arrange
			const error = new Error('Connection reference fetch failed');
			mockFlowRepository.findAll.mockResolvedValue([]);
			mockConnectionRefRepository.findAll.mockRejectedValue(error);

			// Act & Assert
			await expect(useCase.execute(testEnvironmentId, DEFAULT_SOLUTION_ID))
				.rejects
				.toThrow('Connection reference fetch failed');
		});

		it('should propagate solution component repository errors', async () => {
			// Arrange
			const error = new Error('Solution component fetch failed');
			mockFlowRepository.findAll.mockResolvedValue([]);
			mockConnectionRefRepository.findAll.mockResolvedValue([]);
			mockSolutionComponentRepository.findComponentIdsBySolution.mockRejectedValue(error);

			// Act & Assert
			await expect(useCase.execute(testEnvironmentId, testSolutionId))
				.rejects
				.toThrow('Solution component fetch failed');
		});

		it('should propagate relationship builder errors', async () => {
			// Arrange
			const error = new Error('Relationship building failed');
			mockFlowRepository.findAll.mockResolvedValue([]);
			mockConnectionRefRepository.findAll.mockResolvedValue([]);
			mockRelationshipBuilder.buildRelationships.mockImplementation(() => {
				throw error;
			});

			// Act & Assert
			await expect(useCase.execute(testEnvironmentId, DEFAULT_SOLUTION_ID))
				.rejects
				.toThrow('Relationship building failed');
		});

		it('should normalize non-Error objects thrown', async () => {
			// Arrange
			mockFlowRepository.findAll.mockRejectedValue('String error');

			// Act & Assert
			await expect(useCase.execute(testEnvironmentId, DEFAULT_SOLUTION_ID))
				.rejects
				.toThrow(Error);
		});
	});

	describe('orchestration flow', () => {
		it('should fetch flows and connection references in parallel', async () => {
			// Arrange
			const callOrder: string[] = [];
			mockFlowRepository.findAll.mockImplementation(async () => {
				callOrder.push('flows-start');
				await new Promise(resolve => setTimeout(resolve, 10));
				callOrder.push('flows-end');
				return [];
			});
			mockConnectionRefRepository.findAll.mockImplementation(async () => {
				callOrder.push('connRefs-start');
				await new Promise(resolve => setTimeout(resolve, 10));
				callOrder.push('connRefs-end');
				return [];
			});
			mockRelationshipBuilder.buildRelationships.mockReturnValue([]);

			// Act
			await useCase.execute(testEnvironmentId, DEFAULT_SOLUTION_ID);

			// Assert
			expect(callOrder[0]).toBe('flows-start');
			expect(callOrder[1]).toBe('connRefs-start');
		});

		it('should fetch solution components in parallel when filtering by solution', async () => {
			// Arrange
			const callOrder: string[] = [];
			mockFlowRepository.findAll.mockResolvedValue([]);
			mockConnectionRefRepository.findAll.mockResolvedValue([]);
			mockSolutionComponentRepository.findComponentIdsBySolution.mockImplementation(async (_env, _sol, type) => {
				callOrder.push(`${type}-start`);
				await new Promise(resolve => setTimeout(resolve, 10));
				callOrder.push(`${type}-end`);
				return [];
			});
			mockRelationshipBuilder.buildRelationships.mockReturnValue([]);

			// Act
			await useCase.execute(testEnvironmentId, testSolutionId);

			// Assert
			expect(callOrder[0]).toBe('subscription-start');
			expect(callOrder[1]).toBe('connectionreference-start');
		});

		it('should build relationships after fetching all data', async () => {
			// Arrange
			const callOrder: string[] = [];
			mockFlowRepository.findAll.mockImplementation(async () => {
				callOrder.push('flows');
				return [];
			});
			mockConnectionRefRepository.findAll.mockImplementation(async () => {
				callOrder.push('connRefs');
				return [];
			});
			mockRelationshipBuilder.buildRelationships.mockImplementation(() => {
				callOrder.push('relationships');
				return [];
			});

			// Act
			await useCase.execute(testEnvironmentId, DEFAULT_SOLUTION_ID);

			// Assert
			expect(callOrder).toEqual(['flows', 'connRefs', 'relationships']);
		});
	});

	describe('edge cases', () => {
		it('should handle flows with no connection references', async () => {
			// Arrange
			const flows = [
				createTestCloudFlow('flow-1', 'Flow without connections', false, null)
			];
			const connectionRefs = [
				createTestConnectionReference('cr-1', 'cr_unused', 'Unused')
			];
			const relationships = [
				createTestRelationship(null, '(No flow uses this)', 'cr-1', 'cr_unused', 'orphaned-cr')
			];

			mockFlowRepository.findAll.mockResolvedValue(flows);
			mockConnectionRefRepository.findAll.mockResolvedValue(connectionRefs);
			mockRelationshipBuilder.buildRelationships.mockReturnValue(relationships);

			// Act
			mockSolutionComponentRepository.findComponentIdsBySolution.mockResolvedValue(['flow-1', 'flow-2', 'cr-1', 'cr-2']);
			const result = await useCase.execute(testEnvironmentId, DEFAULT_SOLUTION_ID);

			// Assert
			expect(result.relationships).toHaveLength(1);
			expect(result.relationships[0]!.relationshipType).toBe('orphaned-cr');
		});

		it('should handle connection references without connections', async () => {
			// Arrange
			const flows = [createTestCloudFlow('flow-1', 'Flow 1')];
			const connectionRefs = [
				createTestConnectionReference('cr-1', 'cr_disconnected', 'Disconnected', null, null)
			];

			mockFlowRepository.findAll.mockResolvedValue(flows);
			mockConnectionRefRepository.findAll.mockResolvedValue(connectionRefs);
			mockRelationshipBuilder.buildRelationships.mockReturnValue([]);

			// Act
			mockSolutionComponentRepository.findComponentIdsBySolution.mockResolvedValue(['flow-1', 'flow-2', 'cr-1', 'cr-2']);
			const result = await useCase.execute(testEnvironmentId, DEFAULT_SOLUTION_ID);

			// Assert
			expect(result.connectionReferences).toHaveLength(1);
			expect(result.connectionReferences[0]!.hasConnection()).toBe(false);
		});

		it('should handle managed flows and connection references', async () => {
			// Arrange
			const flows = [
				createTestCloudFlow('flow-1', 'Managed Flow', true)
			];
			const connectionRefs = [
				createTestConnectionReference('cr-1', 'cr_managed', 'Managed CR', null, null, true)
			];
			const relationships = [
				createTestRelationship('flow-1', 'Managed Flow', 'cr-1', 'cr_managed', 'flow-to-cr')
			];

			mockFlowRepository.findAll.mockResolvedValue(flows);
			mockConnectionRefRepository.findAll.mockResolvedValue(connectionRefs);
			mockRelationshipBuilder.buildRelationships.mockReturnValue(relationships);

			// Act
			mockSolutionComponentRepository.findComponentIdsBySolution.mockResolvedValue(['flow-1', 'flow-2', 'cr-1', 'cr-2']);
			const result = await useCase.execute(testEnvironmentId, DEFAULT_SOLUTION_ID);

			// Assert
			expect(result.connectionReferences[0]!.isManaged).toBe(true);
			expect(mockRelationshipBuilder.buildRelationships).toHaveBeenCalledWith(
				expect.arrayContaining([expect.objectContaining({ isManaged: true })]),
				expect.arrayContaining([expect.objectContaining({ isManaged: true })])
			);
		});

		it('should handle large datasets', async () => {
			// Arrange
			const flows = Array.from({ length: 100 }, (_, i) =>
				createTestCloudFlow(`flow-${i}`, `Flow ${i}`)
			);
			const connectionRefs = Array.from({ length: 50 }, (_, i) =>
				createTestConnectionReference(`cr-${i}`, `cr_conn_${i}`, `Connection ${i}`)
			);

			mockFlowRepository.findAll.mockResolvedValue(flows);
			mockConnectionRefRepository.findAll.mockResolvedValue(connectionRefs);
			mockRelationshipBuilder.buildRelationships.mockReturnValue([]);
			// Mock solution filtering to return all IDs
			const allFlowIds = Array.from({ length: 100 }, (_, i) => `flow-${i}`);
			const allCrIds = Array.from({ length: 50 }, (_, i) => `cr-${i}`);
			mockSolutionComponentRepository.findComponentIdsBySolution.mockImplementation((envId, solId, componentType) => {
				if (componentType === 'subscription') return Promise.resolve(allFlowIds);
				if (componentType === 'connectionreference') return Promise.resolve(allCrIds);
				return Promise.resolve([]);
			});

			// Act
			const result = await useCase.execute(testEnvironmentId, DEFAULT_SOLUTION_ID);

			// Assert
			expect(mockRelationshipBuilder.buildRelationships).toHaveBeenCalledWith(
				expect.arrayContaining(flows),
				expect.arrayContaining(connectionRefs)
			);
			expect(result.connectionReferences).toHaveLength(50);
		});

		it('should handle empty solution filter results', async () => {
			// Arrange
			const allFlows = [
				createTestCloudFlow('flow-1', 'Flow 1'),
				createTestCloudFlow('flow-2', 'Flow 2')
			];
			const allConnectionRefs = [
				createTestConnectionReference('cr-1', 'cr_sharepoint', 'SharePoint')
			];

			mockFlowRepository.findAll.mockResolvedValue(allFlows);
			mockConnectionRefRepository.findAll.mockResolvedValue(allConnectionRefs);
			mockSolutionComponentRepository.findComponentIdsBySolution
				.mockResolvedValueOnce(['flow-999'])
				.mockResolvedValueOnce(['cr-999']);
			mockRelationshipBuilder.buildRelationships.mockReturnValue([]);

			// Act
			const result = await useCase.execute(testEnvironmentId, testSolutionId);

			// Assert
			expect(result.relationships).toHaveLength(0);
			expect(result.connectionReferences).toHaveLength(0);
		});
	});

	describe('repository query parameters', () => {
		it('should request correct flow fields and filters', async () => {
			// Arrange
			mockFlowRepository.findAll.mockResolvedValue([]);
			mockConnectionRefRepository.findAll.mockResolvedValue([]);
			mockRelationshipBuilder.buildRelationships.mockReturnValue([]);

			// Act
			await useCase.execute(testEnvironmentId, DEFAULT_SOLUTION_ID);

			// Assert
			expect(mockFlowRepository.findAll).toHaveBeenCalledWith(
				testEnvironmentId,
				{
					select: expect.arrayContaining([
						'workflowid',
						'name',
						'modifiedon',
						'ismanaged',
						'clientdata',
						'_createdby_value'
					]),
					expand: 'createdby($select=fullname)',
					filter: 'category eq 5',
					orderBy: 'name'
				},
				undefined
			);
		});

		it('should pass undefined options to connection reference repository', async () => {
			// Arrange
			mockFlowRepository.findAll.mockResolvedValue([]);
			mockConnectionRefRepository.findAll.mockResolvedValue([]);
			mockRelationshipBuilder.buildRelationships.mockReturnValue([]);

			// Act
			await useCase.execute(testEnvironmentId, DEFAULT_SOLUTION_ID);

			// Assert
			expect(mockConnectionRefRepository.findAll).toHaveBeenCalledWith(
				testEnvironmentId,
				undefined,
				undefined
			);
		});

		it('should request correct component types from solution repository', async () => {
			// Arrange
			mockFlowRepository.findAll.mockResolvedValue([]);
			mockConnectionRefRepository.findAll.mockResolvedValue([]);
			mockSolutionComponentRepository.findComponentIdsBySolution
				.mockResolvedValueOnce([])
				.mockResolvedValueOnce([]);
			mockRelationshipBuilder.buildRelationships.mockReturnValue([]);

			// Act
			await useCase.execute(testEnvironmentId, testSolutionId);

			// Assert
			const calls = mockSolutionComponentRepository.findComponentIdsBySolution.mock.calls;
			expect(calls[0]![2]).toBe('subscription');
			expect(calls[1]![2]).toBe('connectionreference');
		});
	});

	describe('edge cases - network and timeout failures', () => {
		it('should propagate network timeout from flow repository', async () => {
			// Arrange
			const timeoutError = new Error('Network timeout fetching flows');
			mockFlowRepository.findAll.mockRejectedValue(timeoutError);

			// Act & Assert
			await expect(useCase.execute(testEnvironmentId, DEFAULT_SOLUTION_ID))
				.rejects
				.toThrow('Network timeout fetching flows');
		});

		it('should propagate network timeout from connection reference repository', async () => {
			// Arrange
			const timeoutError = new Error('Network timeout fetching connection references');
			mockFlowRepository.findAll.mockResolvedValue([]);
			mockConnectionRefRepository.findAll.mockRejectedValue(timeoutError);

			// Act & Assert
			await expect(useCase.execute(testEnvironmentId, DEFAULT_SOLUTION_ID))
				.rejects
				.toThrow('Network timeout fetching connection references');
		});

		it('should propagate authentication failure from repositories', async () => {
			// Arrange
			const authError = new Error('Authentication token expired');
			mockFlowRepository.findAll.mockRejectedValue(authError);

			// Act & Assert
			await expect(useCase.execute(testEnvironmentId, DEFAULT_SOLUTION_ID))
				.rejects
				.toThrow('Authentication token expired');
		});

		it('should handle permission denied errors', async () => {
			// Arrange
			const permissionError = new Error('Insufficient privileges to read flows');
			mockFlowRepository.findAll.mockRejectedValue(permissionError);

			// Act & Assert
			await expect(useCase.execute(testEnvironmentId, DEFAULT_SOLUTION_ID))
				.rejects
				.toThrow('Insufficient privileges to read flows');
		});

		it('should handle API rate limiting errors', async () => {
			// Arrange
			const rateLimitError = new Error('API rate limit exceeded');
			mockConnectionRefRepository.findAll.mockResolvedValue([]);
			mockFlowRepository.findAll.mockRejectedValue(rateLimitError);

			// Act & Assert
			await expect(useCase.execute(testEnvironmentId, DEFAULT_SOLUTION_ID))
				.rejects
				.toThrow('API rate limit exceeded');
		});

		it('should handle solution component repository timeout', async () => {
			// Arrange
			const timeoutError = new Error('Timeout fetching solution components');
			mockFlowRepository.findAll.mockResolvedValue([]);
			mockConnectionRefRepository.findAll.mockResolvedValue([]);
			mockSolutionComponentRepository.findComponentIdsBySolution.mockRejectedValue(timeoutError);

			// Act & Assert
			await expect(useCase.execute(testEnvironmentId, testSolutionId))
				.rejects
				.toThrow('Timeout fetching solution components');
		});
	});

	describe('edge cases - relationship builder failures', () => {
		it('should propagate relationship builder errors', async () => {
			// Arrange
			const builderError = new Error('Failed to parse flow client data');
			mockFlowRepository.findAll.mockResolvedValue([]);
			mockConnectionRefRepository.findAll.mockResolvedValue([]);
			mockRelationshipBuilder.buildRelationships.mockImplementation(() => {
				throw builderError;
			});

			// Mock solution component repository
			mockSolutionComponentRepository.findComponentIdsBySolution.mockResolvedValue(['flow-1', 'cr-1']);

			// Act & Assert
			await expect(useCase.execute(testEnvironmentId, DEFAULT_SOLUTION_ID))
				.rejects
				.toThrow('Failed to parse flow client data');
		});

		it('should handle relationship builder throwing for complex data', async () => {
			// Arrange
			const flows = [
				createTestCloudFlow('flow-1', 'Flow 1', false, '{"properties":{}}')
			];
			const connectionRefs = [
				createTestConnectionReference('cr-1', 'cr_sharepoint', 'SharePoint')
			];

			mockFlowRepository.findAll.mockResolvedValue(flows);
			mockConnectionRefRepository.findAll.mockResolvedValue(connectionRefs);
			mockRelationshipBuilder.buildRelationships.mockImplementation(() => {
				throw new Error('Relationship building failed');
			});
			// Mock solution component repository
			mockSolutionComponentRepository.findComponentIdsBySolution.mockResolvedValue(['flow-1', 'cr-1']);

			// Act & Assert
			await expect(useCase.execute(testEnvironmentId, DEFAULT_SOLUTION_ID))
				.rejects
				.toThrow('Relationship building failed');
		});
	});

	describe('edge cases - concurrent and race conditions', () => {
		it('should handle simultaneous executions for same environment', async () => {
			// Arrange
			mockFlowRepository.findAll.mockResolvedValue([]);
			mockConnectionRefRepository.findAll.mockResolvedValue([]);
			mockRelationshipBuilder.buildRelationships.mockReturnValue([]);
			// Mock solution component repository
			mockSolutionComponentRepository.findComponentIdsBySolution.mockResolvedValue([]);

			// Act - Execute concurrently
			const [result1, result2, result3] = await Promise.all([
				useCase.execute(testEnvironmentId, DEFAULT_SOLUTION_ID),
				useCase.execute(testEnvironmentId, DEFAULT_SOLUTION_ID),
				useCase.execute(testEnvironmentId, DEFAULT_SOLUTION_ID)
			]);

			// Assert
			expect(result1.relationships).toHaveLength(0);
			expect(result2.relationships).toHaveLength(0);
			expect(result3.relationships).toHaveLength(0);
			expect(mockFlowRepository.findAll).toHaveBeenCalledTimes(3);
		});

		it('should handle data changes between parallel fetch operations', async () => {
			// Arrange - Simulate flows arriving after connection refs fetched
			let flowCallCount = 0;
			mockFlowRepository.findAll.mockImplementation(async () => {
				flowCallCount++;
				if (flowCallCount === 1) {
					return [];
				}
				return [createTestCloudFlow('flow-1', 'New Flow')];
			});
			mockConnectionRefRepository.findAll.mockResolvedValue([]);
			mockRelationshipBuilder.buildRelationships.mockReturnValue([]);

			// Act
			mockSolutionComponentRepository.findComponentIdsBySolution.mockResolvedValue(['flow-1', 'flow-2', 'cr-1', 'cr-2']);
			const result = await useCase.execute(testEnvironmentId, DEFAULT_SOLUTION_ID);

			// Assert - Should work with snapshot at time of fetch
			expect(result.relationships).toHaveLength(0);
		});

		it('should handle flows being deleted during fetch', async () => {
			// Arrange
			const flows = [createTestCloudFlow('flow-to-be-deleted', 'Flow')];
			mockFlowRepository.findAll.mockResolvedValue(flows);
			mockConnectionRefRepository.findAll.mockResolvedValue([]);
			// Builder might not find the flow anymore
			mockRelationshipBuilder.buildRelationships.mockReturnValue([]);

			// Act
			mockSolutionComponentRepository.findComponentIdsBySolution.mockResolvedValue(['flow-1', 'flow-2', 'cr-1', 'cr-2']);
			const result = await useCase.execute(testEnvironmentId, DEFAULT_SOLUTION_ID);

			// Assert
			expect(result.relationships).toHaveLength(0);
		});
	});

	describe('edge cases - data integrity and validation', () => {
		it('should handle flows with null clientdata', async () => {
			// Arrange
			const flows = [
				createTestCloudFlow('flow-1', 'Flow with null clientdata', false, null)
			];
			const connectionRefs = [
				createTestConnectionReference('cr-1', 'cr_sharepoint', 'SharePoint')
			];

			mockFlowRepository.findAll.mockResolvedValue(flows);
			mockConnectionRefRepository.findAll.mockResolvedValue(connectionRefs);
			mockRelationshipBuilder.buildRelationships.mockReturnValue([]);

			// Act
			mockSolutionComponentRepository.findComponentIdsBySolution.mockResolvedValue(['flow-1', 'flow-2', 'cr-1', 'cr-2']);
			const result = await useCase.execute(testEnvironmentId, DEFAULT_SOLUTION_ID);

			// Assert
			expect(result.relationships).toHaveLength(0);
		});

		it('should handle connection references with null connector ID', async () => {
			// Arrange
			const flows = [createTestCloudFlow('flow-1', 'Flow 1')];
			const connectionRefs = [
				createTestConnectionReference('cr-1', 'cr_null_connector', 'No Connector', null, null)
			];

			mockFlowRepository.findAll.mockResolvedValue(flows);
			mockConnectionRefRepository.findAll.mockResolvedValue(connectionRefs);
			mockRelationshipBuilder.buildRelationships.mockReturnValue([]);

			// Act
			mockSolutionComponentRepository.findComponentIdsBySolution.mockResolvedValue(['flow-1', 'flow-2', 'cr-1', 'cr-2']);
			const result = await useCase.execute(testEnvironmentId, DEFAULT_SOLUTION_ID);

			// Assert
			expect(result.connectionReferences).toHaveLength(1);
			expect(result.connectionReferences[0]!.connectorId).toBeNull();
		});

		it('should handle invalid environment ID format', async () => {
			// Arrange
			const invalidEnvId = '';
			const validationError = new Error('Invalid environment ID');
			mockFlowRepository.findAll.mockRejectedValue(validationError);

			// Act & Assert
			await expect(useCase.execute(invalidEnvId, DEFAULT_SOLUTION_ID))
				.rejects
				.toThrow('Invalid environment ID');
		});

		it('should handle invalid solution ID format', async () => {
			// Arrange
			const invalidSolutionId = 'not-a-guid';
			const validationError = new Error('Invalid solution ID format');
			mockFlowRepository.findAll.mockResolvedValue([]);
			mockConnectionRefRepository.findAll.mockResolvedValue([]);
			mockSolutionComponentRepository.findComponentIdsBySolution.mockRejectedValue(validationError);

			// Act & Assert
			await expect(useCase.execute(testEnvironmentId, invalidSolutionId))
				.rejects
				.toThrow('Invalid solution ID format');
		});

		it('should handle extremely large datasets efficiently', async () => {
			// Arrange - 5000 flows and 2000 connection references
			const flows = Array.from({ length: 5000 }, (_, i) =>
				createTestCloudFlow(`flow-${i}`, `Flow ${i}`)
			);
			const connectionRefs = Array.from({ length: 2000 }, (_, i) =>
				createTestConnectionReference(`cr-${i}`, `cr_conn_${i}`, `Connection ${i}`)
			);

			mockFlowRepository.findAll.mockResolvedValue(flows);
			mockConnectionRefRepository.findAll.mockResolvedValue(connectionRefs);
			mockRelationshipBuilder.buildRelationships.mockReturnValue([]);
			// Mock solution filtering to return all IDs
			const allFlowIds = Array.from({ length: 5000 }, (_, i) => `flow-${i}`);
			const allCrIds = Array.from({ length: 2000 }, (_, i) => `cr-${i}`);
			mockSolutionComponentRepository.findComponentIdsBySolution.mockImplementation((envId, solId, componentType) => {
				if (componentType === 'subscription') return Promise.resolve(allFlowIds);
				if (componentType === 'connectionreference') return Promise.resolve(allCrIds);
				return Promise.resolve([]);
			});

			// Act
			const result = await useCase.execute(testEnvironmentId, DEFAULT_SOLUTION_ID);

			// Assert
			expect(mockRelationshipBuilder.buildRelationships).toHaveBeenCalledWith(
				flows,
				connectionRefs
			);
			expect(result.connectionReferences).toHaveLength(2000);
		});

		it('should handle special characters in flow and connection reference names', async () => {
			// Arrange
			const flows = [
				createTestCloudFlow('flow-1', 'Flow with special chars !@#$%^&*()')
			];
			const connectionRefs = [
				createTestConnectionReference('cr-1', 'cr_special-!@#', 'CR with émoji 😀')
			];

			mockFlowRepository.findAll.mockResolvedValue(flows);
			mockConnectionRefRepository.findAll.mockResolvedValue(connectionRefs);
			mockRelationshipBuilder.buildRelationships.mockReturnValue([
				createTestRelationship('flow-1', 'Flow with special chars !@#$%^&*()', 'cr-1', 'cr_special-!@#', 'flow-to-cr')
			]);

			// Act
			mockSolutionComponentRepository.findComponentIdsBySolution.mockResolvedValue(['flow-1', 'flow-2', 'cr-1', 'cr-2']);
			const result = await useCase.execute(testEnvironmentId, DEFAULT_SOLUTION_ID);

			// Assert
			expect(result.relationships).toHaveLength(1);
			expect(result.relationships[0]!.flowName).toBe('Flow with special chars !@#$%^&*()');
		});
	});

	describe('edge cases - filtering edge cases', () => {
		it('should handle solution filter with no matching flows but matching connection references', async () => {
			// Arrange
			const allFlows = [createTestCloudFlow('flow-1', 'Flow 1')];
			const allConnectionRefs = [
				createTestConnectionReference('cr-1', 'cr_sharepoint', 'SharePoint')
			];
			const flowComponentIds: string[] = [];
			const crComponentIds = ['cr-1'];

			mockFlowRepository.findAll.mockResolvedValue(allFlows);
			mockConnectionRefRepository.findAll.mockResolvedValue(allConnectionRefs);
			mockSolutionComponentRepository.findComponentIdsBySolution
				.mockResolvedValueOnce(flowComponentIds)
				.mockResolvedValueOnce(crComponentIds);
			mockRelationshipBuilder.buildRelationships.mockReturnValue([]);

			// Act
			const result = await useCase.execute(testEnvironmentId, testSolutionId);

			// Assert
			expect(result.connectionReferences).toHaveLength(1);
			expect(mockRelationshipBuilder.buildRelationships).toHaveBeenCalledWith([], [
				expect.objectContaining({ id: 'cr-1' })
			]);
		});

		it('should handle solution filter with matching flows but no matching connection references', async () => {
			// Arrange
			const allFlows = [createTestCloudFlow('flow-1', 'Flow 1')];
			const allConnectionRefs = [
				createTestConnectionReference('cr-1', 'cr_sharepoint', 'SharePoint')
			];
			const flowComponentIds = ['flow-1'];
			const crComponentIds: string[] = [];

			mockFlowRepository.findAll.mockResolvedValue(allFlows);
			mockConnectionRefRepository.findAll.mockResolvedValue(allConnectionRefs);
			mockSolutionComponentRepository.findComponentIdsBySolution
				.mockResolvedValueOnce(flowComponentIds)
				.mockResolvedValueOnce(crComponentIds);
			mockRelationshipBuilder.buildRelationships.mockReturnValue([]);

			// Act
			const result = await useCase.execute(testEnvironmentId, testSolutionId);

			// Assert
			expect(result.connectionReferences).toHaveLength(0);
			expect(mockRelationshipBuilder.buildRelationships).toHaveBeenCalledWith([
				expect.objectContaining({ id: 'flow-1' })
			], []);
		});

		it('should handle duplicate component IDs from solution repository', async () => {
			// Arrange
			const allFlows = [createTestCloudFlow('flow-1', 'Flow 1')];
			const allConnectionRefs = [
				createTestConnectionReference('cr-1', 'cr_sharepoint', 'SharePoint')
			];
			// Duplicate IDs in solution components
			const flowComponentIds = ['flow-1', 'flow-1', 'flow-1'];
			const crComponentIds = ['cr-1', 'cr-1'];

			mockFlowRepository.findAll.mockResolvedValue(allFlows);
			mockConnectionRefRepository.findAll.mockResolvedValue(allConnectionRefs);
			mockSolutionComponentRepository.findComponentIdsBySolution
				.mockResolvedValueOnce(flowComponentIds)
				.mockResolvedValueOnce(crComponentIds);
			mockRelationshipBuilder.buildRelationships.mockReturnValue([]);

			// Act
			const result = await useCase.execute(testEnvironmentId, testSolutionId);

			// Assert - Set should deduplicate
			expect(result.connectionReferences).toHaveLength(1);
		});
	});
});
