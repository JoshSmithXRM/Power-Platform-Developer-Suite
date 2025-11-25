import { CloudFlow } from '../entities/CloudFlow';
import { ConnectionReference } from '../entities/ConnectionReference';
import { FlowConnectionRelationship } from '../valueObjects/FlowConnectionRelationship';

/**
 * Domain service for building relationships between cloud flows and connection references.
 *
 * Determines three relationship types:
 * 1. flow-to-cr: Flow uses a connection reference that exists
 * 2. orphaned-flow: Flow references a CR that doesn't exist
 * 3. orphaned-cr: Connection reference exists but no flow uses it
 */
export class FlowConnectionRelationshipBuilder {
	/**
	 * Builds relationships between flows and connection references.
	 *
	 * Analyzes flow dependencies and connection reference availability to create
	 * a complete picture of flow-connection relationships. Identifies orphaned
	 * flows (missing CRs) and orphaned CRs (unused by flows).
	 *
	 * Business Logic:
	 * - Matches flows to CRs by logical name (case-insensitive)
	 * - Creates flow-to-cr relationships for valid matches
	 * - Creates orphaned-flow relationships for missing CRs
	 * - Creates orphaned-cr relationships for unused CRs
	 *
	 * @param flows - Array of cloud flows to analyze
	 * @param connectionRefs - Array of available connection references
	 * @returns Array of all relationships (valid, orphaned flows, orphaned CRs)
	 */
	buildRelationships(
		flows: CloudFlow[],
		connectionRefs: ConnectionReference[]
	): FlowConnectionRelationship[] {
		const crByLogicalName = this.createCaseInsensitiveConnectionReferenceMap(connectionRefs);
		const usedCrLogicalNames = new Set<string>();

		const flowRelationships = this.buildFlowRelationships(
			flows,
			crByLogicalName,
			usedCrLogicalNames
		);

		const orphanedCrRelationships = this.buildOrphanedConnectionReferenceRelationships(
			connectionRefs,
			usedCrLogicalNames
		);

		return [...flowRelationships, ...orphanedCrRelationships];
	}

	/**
	 * Power Platform treats connection reference logical names as case-insensitive.
	 */
	private createCaseInsensitiveConnectionReferenceMap(
		connectionRefs: ConnectionReference[]
	): Map<string, ConnectionReference> {
		return new Map(
			connectionRefs.map((cr) => [cr.connectionReferenceLogicalName.toLowerCase(), cr])
		);
	}

	private buildFlowRelationships(
		flows: CloudFlow[],
		crByLogicalName: Map<string, ConnectionReference>,
		usedCrLogicalNames: Set<string>
	): FlowConnectionRelationship[] {
		const relationships: FlowConnectionRelationship[] = [];

		for (const flow of flows) {
			const crNames = flow.extractConnectionReferenceNames();

			if (crNames.length === 0) {
				continue;
			}

			const flowRelationships = this.buildRelationshipsForFlow(
				flow,
				crNames,
				crByLogicalName,
				usedCrLogicalNames
			);

			relationships.push(...flowRelationships);
		}

		return relationships;
	}

	private buildRelationshipsForFlow(
		flow: CloudFlow,
		crNames: string[],
		crByLogicalName: Map<string, ConnectionReference>,
		usedCrLogicalNames: Set<string>
	): FlowConnectionRelationship[] {
		const relationships: FlowConnectionRelationship[] = [];

		for (const crName of crNames) {
			const cr = crByLogicalName.get(crName.toLowerCase());

			if (cr) {
				relationships.push(this.createFlowToConnectionReferenceRelationship(flow, cr));
				usedCrLogicalNames.add(crName.toLowerCase());
			} else {
				relationships.push(this.createOrphanedFlowRelationship(flow, crName));
			}
		}

		return relationships;
	}

	private createFlowToConnectionReferenceRelationship(
		flow: CloudFlow,
		cr: ConnectionReference
	): FlowConnectionRelationship {
		return new FlowConnectionRelationship(
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
		);
	}

	private createOrphanedFlowRelationship(
		flow: CloudFlow,
		crName: string
	): FlowConnectionRelationship {
		return new FlowConnectionRelationship(
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
		);
	}

	private buildOrphanedConnectionReferenceRelationships(
		connectionRefs: ConnectionReference[],
		usedCrLogicalNames: Set<string>
	): FlowConnectionRelationship[] {
		const relationships: FlowConnectionRelationship[] = [];

		for (const cr of connectionRefs) {
			if (!usedCrLogicalNames.has(cr.connectionReferenceLogicalName.toLowerCase())) {
				relationships.push(this.createOrphanedConnectionReferenceRelationship(cr));
			}
		}

		return relationships;
	}

	private createOrphanedConnectionReferenceRelationship(
		cr: ConnectionReference
	): FlowConnectionRelationship {
		return new FlowConnectionRelationship(
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
		);
	}
}
