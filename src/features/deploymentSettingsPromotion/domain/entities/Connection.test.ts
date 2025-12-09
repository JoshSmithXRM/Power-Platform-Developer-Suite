import { Connection, ConnectionStatus } from './Connection';

describe('Connection', () => {
	describe('create', () => {
		it('should create a connection with all properties', () => {
			const connection = Connection.create(
				'conn-123',
				'Dataverse Production',
				'/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps',
				'Connected',
				'Admin User'
			);

			expect(connection.id).toBe('conn-123');
			expect(connection.displayName).toBe('Dataverse Production');
			expect(connection.connectorId).toBe(
				'/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps'
			);
			expect(connection.status).toBe('Connected');
			expect(connection.createdBy).toBe('Admin User');
		});
	});

	describe('isActive', () => {
		it('should return true when status is Connected', () => {
			const connection = Connection.create(
				'conn-1',
				'Active Connection',
				'/apis/shared_dataverse',
				'Connected',
				'User'
			);

			expect(connection.isActive()).toBe(true);
		});

		it('should return false when status is Error', () => {
			const connection = Connection.create(
				'conn-1',
				'Error Connection',
				'/apis/shared_dataverse',
				'Error',
				'User'
			);

			expect(connection.isActive()).toBe(false);
		});

		it('should return false when status is Unknown', () => {
			const connection = Connection.create(
				'conn-1',
				'Unknown Connection',
				'/apis/shared_dataverse',
				'Unknown',
				'User'
			);

			expect(connection.isActive()).toBe(false);
		});
	});

	describe('belongsToConnector', () => {
		it('should return true when connector ID matches', () => {
			const connection = Connection.create(
				'conn-1',
				'Dataverse',
				'/providers/Microsoft.PowerApps/apis/shared_dataverse',
				'Connected',
				'User'
			);

			expect(connection.belongsToConnector('/providers/Microsoft.PowerApps/apis/shared_dataverse')).toBe(
				true
			);
		});

		it('should return false when connector ID does not match', () => {
			const connection = Connection.create(
				'conn-1',
				'Dataverse',
				'/providers/Microsoft.PowerApps/apis/shared_dataverse',
				'Connected',
				'User'
			);

			expect(connection.belongsToConnector('/providers/Microsoft.PowerApps/apis/shared_sharepoint')).toBe(
				false
			);
		});

		it('should be case-sensitive', () => {
			const connection = Connection.create(
				'conn-1',
				'Dataverse',
				'/providers/Microsoft.PowerApps/apis/shared_dataverse',
				'Connected',
				'User'
			);

			expect(connection.belongsToConnector('/providers/Microsoft.PowerApps/apis/SHARED_DATAVERSE')).toBe(
				false
			);
		});
	});

	describe('status types', () => {
		const statuses: ConnectionStatus[] = ['Connected', 'Error', 'Unknown'];

		statuses.forEach((status) => {
			it(`should accept status '${status}'`, () => {
				const connection = Connection.create('conn-1', 'Test', '/apis/test', status, 'User');
				expect(connection.status).toBe(status);
			});
		});
	});
});
