import { ConnectionReference } from '../../../features/connectionReferences/domain/entities/ConnectionReference';
import {
	createTestConnectionReference,
	createTestConnectionReferenceWithoutConnection,
	createTestManagedConnectionReference
} from './ConnectionReferenceFactory';

describe('ConnectionReferenceFactory', () => {
	describe('createTestConnectionReference', () => {
		it('creates a connection reference with default values', () => {
			const connectionRef = createTestConnectionReference();

			expect(connectionRef).toBeInstanceOf(ConnectionReference);
			expect(connectionRef.id).toBe('cr-00000000-0000-0000-0000-000000000001');
			expect(connectionRef.connectionReferenceLogicalName).toBe('cr_test_connection');
			expect(connectionRef.displayName).toBe('Test Connection Reference');
			expect(connectionRef.connectorId).toBe('connector-00000000-0000-0000-0000-000000000001');
			expect(connectionRef.connectionId).toBe('connection-00000000-0000-0000-0000-000000000001');
			expect(connectionRef.isManaged).toBe(false);
			expect(connectionRef.modifiedOn).toEqual(new Date('2024-01-01T10:00:00Z'));
		});

		it('creates a connection reference with all overrides', () => {
			const customDate = new Date('2024-06-15T14:30:00Z');
			const connectionRef = createTestConnectionReference({
				id: 'custom-id-123',
				connectionReferenceLogicalName: 'cr_custom',
				displayName: 'Custom Connection',
				connectorId: 'custom-connector-456',
				connectionId: 'custom-connection-789',
				isManaged: true,
				modifiedOn: customDate
			});

			expect(connectionRef.id).toBe('custom-id-123');
			expect(connectionRef.connectionReferenceLogicalName).toBe('cr_custom');
			expect(connectionRef.displayName).toBe('Custom Connection');
			expect(connectionRef.connectorId).toBe('custom-connector-456');
			expect(connectionRef.connectionId).toBe('custom-connection-789');
			expect(connectionRef.isManaged).toBe(true);
			expect(connectionRef.modifiedOn).toEqual(customDate);
		});

		it('creates a connection reference with partial overrides', () => {
			const connectionRef = createTestConnectionReference({
				id: 'override-id',
				displayName: 'Override Display Name'
			});

			expect(connectionRef.id).toBe('override-id');
			expect(connectionRef.displayName).toBe('Override Display Name');
			expect(connectionRef.connectionReferenceLogicalName).toBe('cr_test_connection');
			expect(connectionRef.connectorId).toBe('connector-00000000-0000-0000-0000-000000000001');
			expect(connectionRef.connectionId).toBe('connection-00000000-0000-0000-0000-000000000001');
		});

		it('allows connectorId to be null', () => {
			const connectionRef = createTestConnectionReference({
				connectorId: null
			});

			expect(connectionRef.connectorId).toBeNull();
		});

		it('allows connectionId to be null', () => {
			const connectionRef = createTestConnectionReference({
				connectionId: null
			});

			expect(connectionRef.connectionId).toBeNull();
		});

		it('has a connection when connectionId is set', () => {
			const connectionRef = createTestConnectionReference();

			expect(connectionRef.hasConnection()).toBe(true);
		});
	});

	describe('createTestConnectionReferenceWithoutConnection', () => {
		it('creates a connection reference without a connection', () => {
			const connectionRef = createTestConnectionReferenceWithoutConnection();

			expect(connectionRef).toBeInstanceOf(ConnectionReference);
			expect(connectionRef.id).toBe('connref-no-connection-123');
			expect(connectionRef.connectionReferenceLogicalName).toBe('cr_noconnection');
			expect(connectionRef.displayName).toBe('Connection Reference (No Connection)');
			expect(connectionRef.connectorId).toBe('connector-123');
			expect(connectionRef.connectionId).toBeNull();
			expect(connectionRef.isManaged).toBe(false);
			expect(connectionRef.modifiedOn).toEqual(new Date('2024-01-15T10:00:00Z'));
		});

		it('creates a connection reference without connection with overrides', () => {
			const customDate = new Date('2024-07-20T09:45:00Z');
			const connectionRef = createTestConnectionReferenceWithoutConnection({
				id: 'no-conn-custom-id',
				connectionReferenceLogicalName: 'cr_custom_no_conn',
				displayName: 'Custom No Connection',
				connectorId: 'custom-connector',
				isManaged: true,
				modifiedOn: customDate
			});

			expect(connectionRef.id).toBe('no-conn-custom-id');
			expect(connectionRef.connectionReferenceLogicalName).toBe('cr_custom_no_conn');
			expect(connectionRef.displayName).toBe('Custom No Connection');
			expect(connectionRef.connectorId).toBe('custom-connector');
			expect(connectionRef.connectionId).toBeNull();
			expect(connectionRef.isManaged).toBe(true);
			expect(connectionRef.modifiedOn).toEqual(customDate);
		});

		it('creates a connection reference without connection with partial overrides', () => {
			const connectionRef = createTestConnectionReferenceWithoutConnection({
				displayName: 'Partial Override'
			});

			expect(connectionRef.displayName).toBe('Partial Override');
			expect(connectionRef.id).toBe('connref-no-connection-123');
			expect(connectionRef.connectionReferenceLogicalName).toBe('cr_noconnection');
			expect(connectionRef.connectorId).toBe('connector-123');
		});

		it('always has connectionId as null', () => {
			const connectionRef = createTestConnectionReferenceWithoutConnection();

			expect(connectionRef.connectionId).toBeNull();
		});

		it('does not have a connection', () => {
			const connectionRef = createTestConnectionReferenceWithoutConnection();

			expect(connectionRef.hasConnection()).toBe(false);
		});

		it('uses default connectorId when null is passed in overrides', () => {
			const connectionRef = createTestConnectionReferenceWithoutConnection({
				connectorId: null
			});

			expect(connectionRef.connectorId).toBe('connector-123');
		});
	});

	describe('createTestManagedConnectionReference', () => {
		it('creates a managed connection reference with default values', () => {
			const connectionRef = createTestManagedConnectionReference();

			expect(connectionRef).toBeInstanceOf(ConnectionReference);
			expect(connectionRef.id).toBe('cr-00000000-0000-0000-0000-000000000001');
			expect(connectionRef.connectionReferenceLogicalName).toBe('cr_test_connection');
			expect(connectionRef.displayName).toBe('Test Connection Reference');
			expect(connectionRef.connectorId).toBe('connector-00000000-0000-0000-0000-000000000001');
			expect(connectionRef.connectionId).toBe('connection-00000000-0000-0000-0000-000000000001');
			expect(connectionRef.isManaged).toBe(true);
			expect(connectionRef.modifiedOn).toEqual(new Date('2024-01-01T10:00:00Z'));
		});

		it('creates a managed connection reference with overrides', () => {
			const customDate = new Date('2024-08-10T16:20:00Z');
			const connectionRef = createTestManagedConnectionReference({
				id: 'managed-custom-id',
				connectionReferenceLogicalName: 'cr_managed_custom',
				displayName: 'Managed Custom Connection',
				connectorId: 'managed-connector',
				connectionId: 'managed-connection',
				modifiedOn: customDate
			});

			expect(connectionRef.id).toBe('managed-custom-id');
			expect(connectionRef.connectionReferenceLogicalName).toBe('cr_managed_custom');
			expect(connectionRef.displayName).toBe('Managed Custom Connection');
			expect(connectionRef.connectorId).toBe('managed-connector');
			expect(connectionRef.connectionId).toBe('managed-connection');
			expect(connectionRef.isManaged).toBe(true);
			expect(connectionRef.modifiedOn).toEqual(customDate);
		});

		it('creates a managed connection reference with partial overrides', () => {
			const connectionRef = createTestManagedConnectionReference({
				displayName: 'Managed Override'
			});

			expect(connectionRef.displayName).toBe('Managed Override');
			expect(connectionRef.isManaged).toBe(true);
			expect(connectionRef.id).toBe('cr-00000000-0000-0000-0000-000000000001');
		});

		it('allows connectorId to be null', () => {
			const connectionRef = createTestManagedConnectionReference({
				connectorId: null
			});

			expect(connectionRef.connectorId).toBeNull();
			expect(connectionRef.isManaged).toBe(true);
		});

		it('allows connectionId to be null', () => {
			const connectionRef = createTestManagedConnectionReference({
				connectionId: null
			});

			expect(connectionRef.connectionId).toBeNull();
			expect(connectionRef.isManaged).toBe(true);
		});

		it('always creates with isManaged true regardless of overrides', () => {
			const connectionRef = createTestManagedConnectionReference({
				id: 'managed-test'
			});

			expect(connectionRef.isManaged).toBe(true);
		});

		it('has a connection when connectionId is set', () => {
			const connectionRef = createTestManagedConnectionReference();

			expect(connectionRef.hasConnection()).toBe(true);
		});
	});

	describe('factory comparison tests', () => {
		it('unmanaged and managed factories differ only in isManaged flag', () => {
			const unmanaged = createTestConnectionReference();
			const managed = createTestManagedConnectionReference();

			expect(unmanaged.isManaged).toBe(false);
			expect(managed.isManaged).toBe(true);
			expect(unmanaged.id).toBe(managed.id);
			expect(unmanaged.displayName).toBe(managed.displayName);
		});

		it('connection reference without connection has null connectionId', () => {
			const withConnection = createTestConnectionReference();
			const withoutConnection = createTestConnectionReferenceWithoutConnection();

			expect(withConnection.connectionId).not.toBeNull();
			expect(withoutConnection.connectionId).toBeNull();
		});
	});
});
