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

/**
 * Result of listing connection references.
 */
export interface ListConnectionReferencesResult {
	readonly relationships: FlowConnectionRelationship[];
	readonly connectionReferences: ConnectionReference[];
}

/**
 * Use case for listing connection references and their relationships with cloud flows.
 * Orchestrates fetching flows (WITH clientdata), connection references, and building relationships.
 */
export class ListConnectionReferencesUseCase {
	constructor(
		private readonly flowRepository: ICloudFlowRepository,
		private readonly connectionRefRepository: IConnectionReferenceRepository,
		private readonly solutionComponentRepository: ISolutionComponentRepository,
		private readonly logger: ILogger
	) {}

	/**
	 * Executes the use case to list flow-connection reference relationships.
	 * @param environmentId - Power Platform environment GUID
	 * @param solutionId - Optional solution GUID to filter by
	 * @param cancellationToken - Optional token to cancel the operation
	 * @returns Promise resolving to relationships and filtered connection references
	 */
	async execute(
		environmentId: string,
		solutionId?: string,
		cancellationToken?: ICancellationToken
	): Promise<ListConnectionReferencesResult> {
		this.logger.info('ListConnectionReferencesUseCase started', { environmentId, solutionId });

		try {
			if (cancellationToken?.isCancellationRequested) {
				this.logger.info('ListConnectionReferencesUseCase cancelled before execution');
				throw new OperationCancelledException();
			}

			// Fetch flows WITH clientdata (explicitly request it) and connection references in parallel
			const [flows, connectionRefs] = await Promise.all([
				this.flowRepository.findAll(
					environmentId,
					{
						// MUST explicitly include clientdata to parse connection references
						select: ['workflowid', 'name', 'modifiedon', 'ismanaged', 'clientdata', '_createdby_value'],
						expand: 'createdby($select=fullname)',
						filter: 'category eq 5', // Cloud flows only
						orderBy: 'name'
					},
					cancellationToken
				),
				this.connectionRefRepository.findAll(environmentId, undefined, cancellationToken)
			]);

			if (cancellationToken?.isCancellationRequested) {
				this.logger.info('ListConnectionReferencesUseCase cancelled after fetching data');
				throw new OperationCancelledException();
			}

			// Filter by solution if solutionId is provided
			let filteredFlows = flows;
			let filteredConnectionRefs = connectionRefs;

			if (solutionId) {
				// Filter flows by solution (Cloud Flows are stored as 'subscription' entities in solution components)
				const flowComponentIds = await this.solutionComponentRepository.findComponentIdsBySolution(
					environmentId,
					solutionId,
					'subscription',
					undefined,
					cancellationToken
				);

				// Filter connection references by solution
				const crComponentIds = await this.solutionComponentRepository.findComponentIdsBySolution(
					environmentId,
					solutionId,
					'connectionreference',
					undefined,
					cancellationToken
				);

				if (cancellationToken?.isCancellationRequested) {
					this.logger.info('ListConnectionReferencesUseCase cancelled after filtering by solution');
					throw new OperationCancelledException();
				}

				const flowIdSet = new Set(flowComponentIds);
				const crIdSet = new Set(crComponentIds);

				filteredFlows = flows.filter((flow) => flowIdSet.has(flow.id));
				filteredConnectionRefs = connectionRefs.filter((cr) => crIdSet.has(cr.id));

				this.logger.debug('Filtered by solution', {
					totalFlows: flows.length,
					filteredFlows: filteredFlows.length,
					totalConnectionRefs: connectionRefs.length,
					filteredConnectionRefs: filteredConnectionRefs.length,
					solutionId
				});
			}

			// Build relationships
			const relationships = this.buildRelationships(filteredFlows, filteredConnectionRefs);

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

	/**
	 * Builds relationships between flows and connection references.
	 * Handles three cases:
	 * 1. flow-to-cr: Flow uses a connection reference that exists
	 * 2. orphaned-flow: Flow references a CR that doesn't exist
	 * 3. orphaned-cr: Connection reference exists but no flow uses it
	 */
	private buildRelationships(
		flows: CloudFlow[],
		connectionRefs: ConnectionReference[]
	): FlowConnectionRelationship[] {
		const relationships: FlowConnectionRelationship[] = [];

		// Create a map of connection references by logical name (lowercase for case-insensitive matching)
		const crByLogicalName = new Map(
			connectionRefs.map((cr) => [cr.connectionReferenceLogicalName.toLowerCase(), cr])
		);

		// Track which connection references are used by flows
		const usedCrLogicalNames = new Set<string>();

		// Process each flow and create relationships
		for (const flow of flows) {
			const crNames = flow.extractConnectionReferenceNames();

			if (crNames.length === 0) {
				// Flow doesn't use any connection references - skip it
				continue;
			}

			// Create a relationship for each connection reference the flow uses
			for (const crName of crNames) {
				const cr = crByLogicalName.get(crName.toLowerCase());

				if (cr) {
					// Valid relationship: flow-to-cr
					relationships.push(
						new FlowConnectionRelationship(
							flow.id,
							flow.name,
							cr.id,
							cr.connectionReferenceLogicalName,
							cr.displayName,
							'flow-to-cr',
							flow.isManaged,
							cr.isManaged,
							flow.modifiedOn,
							cr.modifiedOn
						)
					);
					usedCrLogicalNames.add(crName.toLowerCase());
				} else {
					// Orphaned flow: references a CR that doesn't exist
					relationships.push(
						new FlowConnectionRelationship(
							flow.id,
							flow.name,
							null,
							crName,
							`(Missing: ${crName})`,
							'orphaned-flow',
							flow.isManaged,
							null,
							flow.modifiedOn,
							null
						)
					);
				}
			}
		}

		// Find orphaned connection references (CRs not used by any flow)
		for (const cr of connectionRefs) {
			if (!usedCrLogicalNames.has(cr.connectionReferenceLogicalName.toLowerCase())) {
				relationships.push(
					new FlowConnectionRelationship(
						null,
						'(No flow uses this)',
						cr.id,
						cr.connectionReferenceLogicalName,
						cr.displayName,
						'orphaned-cr',
						null,
						cr.isManaged,
						null,
						cr.modifiedOn
					)
				);
			}
		}

		return relationships;
	}
}
