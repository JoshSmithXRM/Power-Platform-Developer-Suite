/**
 * ViewModel for a single connection reference mapping row.
 * Represents the source CR info and target connection selection.
 */
export interface ConnectionReferenceMappingViewModel {
	/** Connection reference logical name (used in deployment settings output) */
	readonly logicalName: string;

	/** Human-readable display name */
	readonly displayName: string;

	/** Connector type name (e.g., "Dataverse", "SharePoint Online") */
	readonly connectorName: string;

	/** Full ConnectorId from source (for output) */
	readonly connectorId: string | null;

	/** Available connections in target environment for this connector type */
	readonly availableConnections: ReadonlyArray<AvailableConnectionViewModel>;

	/** Currently selected connection ID (null if not configured) */
	readonly selectedConnectionId: string | null;

	/** Mapping status */
	readonly status: ConnectionMappingStatus;

	/** Manual connection ID entry (when no matches available) */
	readonly manualConnectionId: string;
}

/**
 * ViewModel for an available connection option in the dropdown.
 */
export interface AvailableConnectionViewModel {
	/** Connection ID (value for dropdown) */
	readonly id: string;

	/** Display name for dropdown */
	readonly displayName: string;

	/** Connection status (Connected, Error, Unknown) */
	readonly status: string;

	/** Who created/owns this connection */
	readonly owner: string;

	/** ConnectorId this connection belongs to (needed for output) */
	readonly connectorId: string;

	/** Friendly connector name for grouping in dropdown */
	readonly connectorName: string;
}

/**
 * Status of a connection reference mapping.
 */
export type ConnectionMappingStatus =
	| 'configured'      // Has a valid connection selected
	| 'multiple'        // Auto-matched but multiple options available
	| 'unmatched'       // No matching connections in target
	| 'manual';         // User entered manual ConnectionId

/**
 * Summary of all connection reference mappings.
 */
export interface ConnectionReferenceMappingSummary {
	readonly total: number;
	readonly configured: number;
	readonly needsAttention: number;
}

/**
 * Calculates summary from a list of mappings.
 */
export function calculateMappingSummary(
	mappings: readonly ConnectionReferenceMappingViewModel[]
): ConnectionReferenceMappingSummary {
	let configured = 0;
	let needsAttention = 0;

	for (const mapping of mappings) {
		if (mapping.status === 'configured' || mapping.status === 'manual') {
			if (mapping.selectedConnectionId !== null || mapping.manualConnectionId !== '') {
				configured++;
			} else {
				needsAttention++;
			}
		} else if (mapping.status === 'multiple') {
			// Multiple options - still needs user to confirm selection
			if (mapping.selectedConnectionId !== null) {
				configured++;
			} else {
				needsAttention++;
			}
		} else {
			needsAttention++;
		}
	}

	return {
		total: mappings.length,
		configured,
		needsAttention
	};
}
