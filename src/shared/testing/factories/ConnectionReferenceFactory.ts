import { ConnectionReference } from '../../../features/connectionReferences/domain/entities/ConnectionReference';

/**
 * Test factory for creating ConnectionReference entities with sensible defaults.
 * Reduces duplication in test files and provides consistent test data.
 */
export function createTestConnectionReference(overrides?: {
	id?: string;
	connectionReferenceLogicalName?: string;
	displayName?: string;
	connectorId?: string | null;
	connectionId?: string | null;
	isManaged?: boolean;
	modifiedOn?: Date;
}): ConnectionReference {
	return new ConnectionReference(
		overrides?.id ?? 'cr-00000000-0000-0000-0000-000000000001',
		overrides?.connectionReferenceLogicalName ?? 'cr_test_connection',
		overrides?.displayName ?? 'Test Connection Reference',
		overrides?.connectorId !== undefined ? overrides.connectorId : 'connector-00000000-0000-0000-0000-000000000001',
		overrides?.connectionId !== undefined ? overrides.connectionId : 'connection-00000000-0000-0000-0000-000000000001',
		overrides?.isManaged ?? false,
		overrides?.modifiedOn ?? new Date('2024-01-01T10:00:00Z')
	);
}

/**
 * Creates a ConnectionReference without an associated connection.
 * Connection references without connections cannot be used by flows.
 */
export function createTestConnectionReferenceWithoutConnection(overrides?: {
	id?: string;
	connectionReferenceLogicalName?: string;
	displayName?: string;
	connectorId?: string | null;
	isManaged?: boolean;
	modifiedOn?: Date;
}): ConnectionReference {
	return new ConnectionReference(
		overrides?.id ?? 'connref-no-connection-123',
		overrides?.connectionReferenceLogicalName ?? 'cr_noconnection',
		overrides?.displayName ?? 'Connection Reference (No Connection)',
		overrides?.connectorId ?? 'connector-123',
		null,
		overrides?.isManaged ?? false,
		overrides?.modifiedOn ?? new Date('2024-01-15T10:00:00Z')
	);
}

/**
 * Creates a managed ConnectionReference entity.
 */
export function createTestManagedConnectionReference(overrides?: {
	id?: string;
	connectionReferenceLogicalName?: string;
	displayName?: string;
	connectorId?: string | null;
	connectionId?: string | null;
	modifiedOn?: Date;
}): ConnectionReference {
	return createTestConnectionReference({
		isManaged: true,
		...overrides
	});
}
