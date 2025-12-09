import { Connection } from '../entities/Connection';
import { ConnectorMappingService } from './ConnectorMappingService';

describe('ConnectorMappingService', () => {
	let service: ConnectorMappingService;

	// Helper to create test connections
	const createConnection = (
		id: string,
		connectorId: string,
		status: 'Connected' | 'Error' | 'Unknown' = 'Connected'
	): Connection => Connection.create(id, `Display ${id}`, connectorId, status, 'Test User');

	beforeEach(() => {
		service = new ConnectorMappingService();
	});

	describe('matchConnectors', () => {
		it('should auto-match connectors with identical IDs in source and target', () => {
			const sourceConnectorIds = new Set([
				'/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps',
				'/providers/Microsoft.PowerApps/apis/shared_sharepointonline',
			]);

			const targetConnections = [
				createConnection('conn-1', '/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps'),
				createConnection('conn-2', '/providers/Microsoft.PowerApps/apis/shared_sharepointonline'),
			];

			const result = service.matchConnectors(sourceConnectorIds, targetConnections);

			expect(result.getAutoMatchedCount()).toBe(2);
			expect(result.hasUnmatchedConnectors()).toBe(false);
			expect(
				result.isAutoMatched('/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps')
			).toBe(true);
			expect(result.isAutoMatched('/providers/Microsoft.PowerApps/apis/shared_sharepointonline')).toBe(
				true
			);
		});

		it('should flag source connectors not in target as unmatched', () => {
			const sourceConnectorIds = new Set(['/apis/shared_custom_abc123']);

			const targetConnections = [createConnection('conn-1', '/apis/shared_custom_xyz789')];

			const result = service.matchConnectors(sourceConnectorIds, targetConnections);

			expect(result.getAutoMatchedCount()).toBe(0);
			expect(result.hasUnmatchedConnectors()).toBe(true);
			expect(result.getUnmatchedCount()).toBe(1);
			expect(result.getUnmatchedSourceConnectors().has('/apis/shared_custom_abc123')).toBe(true);
		});

		it('should provide unmatched target connectors as mapping candidates', () => {
			const sourceConnectorIds = new Set(['/apis/shared_custom_abc123']);

			const targetConnections = [createConnection('conn-1', '/apis/shared_custom_xyz789')];

			const result = service.matchConnectors(sourceConnectorIds, targetConnections);

			const candidates = result.getUnmatchedTargetConnectors();
			expect(candidates.has('/apis/shared_custom_xyz789')).toBe(true);
			expect(candidates.get('/apis/shared_custom_xyz789')).toHaveLength(1);
		});

		it('should handle mixed scenario with auto-matched and unmatched connectors', () => {
			const sourceConnectorIds = new Set([
				'/apis/shared_dataverse', // Will auto-match
				'/apis/shared_custom_dev', // Will not match
			]);

			const targetConnections = [
				createConnection('conn-1', '/apis/shared_dataverse'), // Matches source
				createConnection('conn-2', '/apis/shared_custom_qa'), // Does not match source
			];

			const result = service.matchConnectors(sourceConnectorIds, targetConnections);

			// Check auto-matched
			expect(result.getAutoMatchedCount()).toBe(1);
			expect(result.isAutoMatched('/apis/shared_dataverse')).toBe(true);

			// Check unmatched source
			expect(result.hasUnmatchedConnectors()).toBe(true);
			expect(result.getUnmatchedSourceConnectors().has('/apis/shared_custom_dev')).toBe(true);

			// Check unmatched target (mapping candidates)
			const candidates = result.getUnmatchedTargetConnectors();
			expect(candidates.has('/apis/shared_custom_qa')).toBe(true);
		});

		it('should group multiple connections per connector', () => {
			const sourceConnectorIds = new Set(['/apis/shared_dataverse']);

			const targetConnections = [
				createConnection('conn-1', '/apis/shared_dataverse'),
				createConnection('conn-2', '/apis/shared_dataverse'),
				createConnection('conn-3', '/apis/shared_dataverse'),
			];

			const result = service.matchConnectors(sourceConnectorIds, targetConnections);

			const connections = result.getConnectionsForConnector('/apis/shared_dataverse');
			expect(connections).toHaveLength(3);
		});

		it('should handle empty source connector set', () => {
			const sourceConnectorIds = new Set<string>();

			const targetConnections = [createConnection('conn-1', '/apis/shared_dataverse')];

			const result = service.matchConnectors(sourceConnectorIds, targetConnections);

			expect(result.getAutoMatchedCount()).toBe(0);
			expect(result.hasUnmatchedConnectors()).toBe(false);
			expect(result.getUnmatchedTargetConnectors().has('/apis/shared_dataverse')).toBe(true);
		});

		it('should handle empty target connections', () => {
			const sourceConnectorIds = new Set(['/apis/shared_dataverse']);

			const targetConnections: Connection[] = [];

			const result = service.matchConnectors(sourceConnectorIds, targetConnections);

			expect(result.getAutoMatchedCount()).toBe(0);
			expect(result.hasUnmatchedConnectors()).toBe(true);
			expect(result.getUnmatchedSourceConnectors().has('/apis/shared_dataverse')).toBe(true);
			expect(result.getUnmatchedTargetConnectors().size).toBe(0);
		});

		it('should handle case-sensitive connector IDs', () => {
			const sourceConnectorIds = new Set(['/apis/Shared_Dataverse']);

			const targetConnections = [createConnection('conn-1', '/apis/shared_dataverse')];

			const result = service.matchConnectors(sourceConnectorIds, targetConnections);

			// Should NOT match due to case difference
			expect(result.getAutoMatchedCount()).toBe(0);
			expect(result.hasUnmatchedConnectors()).toBe(true);
		});
	});

	describe('selectDefaultConnection', () => {
		it('should return first active connection', () => {
			const connections = [
				createConnection('conn-1', '/apis/test', 'Connected'),
				createConnection('conn-2', '/apis/test', 'Connected'),
			];

			const defaultConn = service.selectDefaultConnection(connections);

			expect(defaultConn).not.toBeNull();
			expect(defaultConn?.id).toBe('conn-1');
		});

		it('should skip inactive connections and return first active', () => {
			const connections = [
				createConnection('conn-1', '/apis/test', 'Error'),
				createConnection('conn-2', '/apis/test', 'Unknown'),
				createConnection('conn-3', '/apis/test', 'Connected'),
				createConnection('conn-4', '/apis/test', 'Connected'),
			];

			const defaultConn = service.selectDefaultConnection(connections);

			expect(defaultConn).not.toBeNull();
			expect(defaultConn?.id).toBe('conn-3');
		});

		it('should return null when no active connections', () => {
			const connections = [
				createConnection('conn-1', '/apis/test', 'Error'),
				createConnection('conn-2', '/apis/test', 'Unknown'),
			];

			const defaultConn = service.selectDefaultConnection(connections);

			expect(defaultConn).toBeNull();
		});

		it('should return null for empty array', () => {
			const defaultConn = service.selectDefaultConnection([]);

			expect(defaultConn).toBeNull();
		});

		it('should return single active connection when only one exists', () => {
			const connections = [createConnection('conn-only', '/apis/test', 'Connected')];

			const defaultConn = service.selectDefaultConnection(connections);

			expect(defaultConn?.id).toBe('conn-only');
		});
	});

	describe('real-world scenario: Dev to QA promotion', () => {
		it('should correctly match standard and custom connectors', () => {
			// Source deployment settings has these connectors
			const sourceConnectorIds = new Set([
				// Standard connectors (same ID in all environments)
				'/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps',
				'/providers/Microsoft.PowerApps/apis/shared_office365users',
				// Custom connector (different ID per environment)
				'/providers/Microsoft.PowerApps/apis/shared_customapi_myintegration-5ea...',
			]);

			// Target QA environment has these connections
			const targetConnections = [
				// Standard connectors - same IDs
				createConnection(
					'qa-conn-dv',
					'/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps'
				),
				createConnection(
					'qa-conn-o365',
					'/providers/Microsoft.PowerApps/apis/shared_office365users'
				),
				// Custom connector - DIFFERENT ID in QA
				createConnection(
					'qa-conn-custom',
					'/providers/Microsoft.PowerApps/apis/shared_customapi_myintegration-9ab...'
				),
			];

			const result = service.matchConnectors(sourceConnectorIds, targetConnections);

			// 2 standard connectors auto-matched
			expect(result.getAutoMatchedCount()).toBe(2);
			expect(
				result.isAutoMatched('/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps')
			).toBe(true);
			expect(result.isAutoMatched('/providers/Microsoft.PowerApps/apis/shared_office365users')).toBe(
				true
			);

			// Custom connector needs manual mapping
			expect(result.hasUnmatchedConnectors()).toBe(true);
			expect(result.getUnmatchedCount()).toBe(1);
			expect(
				result
					.getUnmatchedSourceConnectors()
					.has('/providers/Microsoft.PowerApps/apis/shared_customapi_myintegration-5ea...')
			).toBe(true);

			// QA custom connector available as mapping candidate
			const candidates = result.getUnmatchedTargetConnectors();
			expect(
				candidates.has('/providers/Microsoft.PowerApps/apis/shared_customapi_myintegration-9ab...')
			).toBe(true);
		});
	});
});
