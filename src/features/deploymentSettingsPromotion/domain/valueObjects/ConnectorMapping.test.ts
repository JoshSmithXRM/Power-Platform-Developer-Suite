import { ConnectorMapping } from './ConnectorMapping';

describe('ConnectorMapping', () => {
	describe('create', () => {
		it('should create a mapping with all properties', () => {
			const mapping = ConnectorMapping.create(
				'/apis/custom_dev_abc123',
				'/apis/custom_qa_xyz789',
				'conn-target-456'
			);

			expect(mapping.getSourceConnectorId()).toBe('/apis/custom_dev_abc123');
			expect(mapping.getTargetConnectorId()).toBe('/apis/custom_qa_xyz789');
			expect(mapping.getTargetConnectionId()).toBe('conn-target-456');
		});
	});

	describe('getSourceConnectorId', () => {
		it('should return the source connector ID', () => {
			const mapping = ConnectorMapping.create('/apis/source', '/apis/target', 'conn-1');

			expect(mapping.getSourceConnectorId()).toBe('/apis/source');
		});
	});

	describe('getTargetConnectorId', () => {
		it('should return the target connector ID', () => {
			const mapping = ConnectorMapping.create('/apis/source', '/apis/target', 'conn-1');

			expect(mapping.getTargetConnectorId()).toBe('/apis/target');
		});
	});

	describe('getTargetConnectionId', () => {
		it('should return the target connection ID', () => {
			const mapping = ConnectorMapping.create('/apis/source', '/apis/target', 'conn-1');

			expect(mapping.getTargetConnectionId()).toBe('conn-1');
		});
	});

	describe('mapsFromConnector', () => {
		it('should return true when source connector ID matches', () => {
			const mapping = ConnectorMapping.create('/apis/custom_dev_abc', '/apis/custom_qa_xyz', 'conn-1');

			expect(mapping.mapsFromConnector('/apis/custom_dev_abc')).toBe(true);
		});

		it('should return false when source connector ID does not match', () => {
			const mapping = ConnectorMapping.create('/apis/custom_dev_abc', '/apis/custom_qa_xyz', 'conn-1');

			expect(mapping.mapsFromConnector('/apis/different_connector')).toBe(false);
		});

		it('should be case-sensitive', () => {
			const mapping = ConnectorMapping.create('/apis/custom_dev_abc', '/apis/custom_qa_xyz', 'conn-1');

			expect(mapping.mapsFromConnector('/APIs/CUSTOM_DEV_ABC')).toBe(false);
		});
	});

	describe('typical use case', () => {
		it('should support custom connector mapping from Dev to QA', () => {
			// Scenario: Custom connector "MyIntegration" has different IDs per environment
			const devConnectorId = '/providers/Microsoft.PowerApps/apis/shared_customapi_myintegration-dev';
			const qaConnectorId = '/providers/Microsoft.PowerApps/apis/shared_customapi_myintegration-qa';
			const qaConnectionId = 'qa-connection-guid-12345';

			const mapping = ConnectorMapping.create(devConnectorId, qaConnectorId, qaConnectionId);

			// Verify the mapping is correct
			expect(mapping.mapsFromConnector(devConnectorId)).toBe(true);
			expect(mapping.getTargetConnectorId()).toBe(qaConnectorId);
			expect(mapping.getTargetConnectionId()).toBe(qaConnectionId);
		});
	});
});
