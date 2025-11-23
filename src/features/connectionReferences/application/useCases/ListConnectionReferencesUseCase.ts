import { ICancellationToken } from '../../../../shared/domain/interfaces/ICancellationToken';
import { OperationCancelledException } from '../../../../shared/domain/errors/OperationCancelledException';
import { ILogger } from '../../../../infrastructure/logging/ILogger';
import { ICloudFlowRepository } from '../../domain/interfaces/ICloudFlowRepository';
import { IConnectionReferenceRepository } from '../../domain/interfaces/IConnectionReferenceRepository';
import { ISolutionComponentRepository } from '../../../../shared/domain/interfaces/ISolutionComponentRepository';
import { FlowConnectionRelationship } from '../../domain/valueObjects/FlowConnectionRelationship';
import { CloudFlow } from '../../domain/entities/CloudFlow';
import { ConnectionReference } from '../../domain/entities/ConnectionReference';
import { normalizeError } from '../../../../shared/utils/ErrorUtils';
import { FlowConnectionRelationshipBuilder } from '../../domain/services/FlowConnectionRelationshipBuilder';

export interface ListConnectionReferencesResult {
	readonly relationships: FlowConnectionRelationship[];
	readonly connectionReferences: ConnectionReference[];
}

/**
 * Use case for listing connection references and their relationships with cloud flows.
 */
export class ListConnectionReferencesUseCase {
	constructor(
		private readonly flowRepository: ICloudFlowRepository,
		private readonly connectionRefRepository: IConnectionReferenceRepository,
		private readonly solutionComponentRepository: ISolutionComponentRepository,
		private readonly relationshipBuilder: FlowConnectionRelationshipBuilder,
		private readonly logger: ILogger
	) {}

	/**
	 * Lists flow-connection reference relationships.
	 * @param environmentId - Power Platform environment GUID
	 * @param solutionId - Solution GUID to filter by (use DEFAULT_SOLUTION_ID to show all)
	 * @param cancellationToken - Optional token to cancel the operation
	 * @returns Relationships and filtered connection references
	 */
	async execute(
		environmentId: string,
		solutionId: string,
		cancellationToken?: ICancellationToken
	): Promise<ListConnectionReferencesResult> {
		this.logger.info('ListConnectionReferencesUseCase started', { environmentId, solutionId });

		try {
			this.checkCancellation(cancellationToken, 'before execution');

			const [flows, connectionRefs] = await this.fetchFlowsAndConnectionReferences(
				environmentId,
				cancellationToken
			);

			this.checkCancellation(cancellationToken, 'after fetching data');

			const [filteredFlows, filteredConnectionRefs] = await this.filterBySolution(
				environmentId,
				solutionId,
				flows,
				connectionRefs,
				cancellationToken
			);

			const relationships = this.relationshipBuilder.buildRelationships(
				filteredFlows,
				filteredConnectionRefs
			);

			this.logger.info('ListConnectionReferencesUseCase completed', {
				relationshipCount: relationships.length,
				flowCount: filteredFlows.length,
				connectionRefCount: filteredConnectionRefs.length
			});

			return {
				relationships,
				connectionReferences: filteredConnectionRefs
			};
		} catch (error) {
			const normalizedError = normalizeError(error);
			this.logger.error('ListConnectionReferencesUseCase failed', normalizedError);
			throw normalizedError;
		}
	}

	private checkCancellation(cancellationToken: ICancellationToken | undefined, stage: string): void {
		if (cancellationToken?.isCancellationRequested) {
			this.logger.info('ListConnectionReferencesUseCase cancelled', { stage });
			throw new OperationCancelledException();
		}
	}

	private async fetchFlowsAndConnectionReferences(
		environmentId: string,
		cancellationToken?: ICancellationToken
	): Promise<[CloudFlow[], ConnectionReference[]]> {
		return Promise.all([
			this.flowRepository.findAll(
				environmentId,
				{
					select: ['workflowid', 'name', 'modifiedon', 'ismanaged', 'clientdata', '_createdby_value'],
					expand: 'createdby($select=fullname)',
					filter: 'category eq 5',
					orderBy: 'name'
				},
				cancellationToken
			),
			this.connectionRefRepository.findAll(environmentId, undefined, cancellationToken)
		]);
	}

	private async filterBySolution(
		environmentId: string,
		solutionId: string,
		flows: CloudFlow[],
		connectionRefs: ConnectionReference[],
		cancellationToken?: ICancellationToken
	): Promise<[CloudFlow[], ConnectionReference[]]> {
		const [flowComponentIds, crComponentIds] = await Promise.all([
			this.solutionComponentRepository.findComponentIdsBySolution(
				environmentId,
				solutionId,
				'subscription',
				undefined,
				cancellationToken
			),
			this.solutionComponentRepository.findComponentIdsBySolution(
				environmentId,
				solutionId,
				'connectionreference',
				undefined,
				cancellationToken
			)
		]);

		this.checkCancellation(cancellationToken, 'after filtering by solution');

		const flowIdSet = new Set(flowComponentIds);
		const crIdSet = new Set(crComponentIds);

		const filteredFlows = flows.filter((flow) => flowIdSet.has(flow.id));
		const filteredConnectionRefs = connectionRefs.filter((cr) => crIdSet.has(cr.id));

		this.logger.debug('Filtered by solution', {
			totalFlows: flows.length,
			filteredFlows: filteredFlows.length,
			totalConnectionRefs: connectionRefs.length,
			filteredConnectionRefs: filteredConnectionRefs.length,
			solutionId
		});

		return [filteredFlows, filteredConnectionRefs];
	}
}
