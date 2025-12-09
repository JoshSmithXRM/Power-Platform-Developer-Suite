import { Connection } from '../entities/Connection';
import { ConnectorMatchResult } from './ConnectorMatchResult';

describe('ConnectorMatchResult', () => {
	// Helper to create test connections
	const createConnection = (id: string, connectorId: string, status: 'Connected' | 'Error' = 'Connected'): Connection =>
		Connection.create(id, `Display ${id}`, connectorId, status, 'Test User');

	describe('create', () => {
		it('should create a result with all properties', () => {
			const autoMatched = new Map<string, Connection[]>();
			autoMatched.set('/apis/shared_dataverse', [createConnection('conn-1', '/apis/shared_dataverse')]);

			const unmatchedSource = new Set(['/apis/custom_abc']);
			const unmatchedTarget = new Map<string, Connection[]>();
			unmatchedTarget.set('/apis/custom_xyz', [createConnection('conn-2', '/apis/custom_xyz')]);

			const result = ConnectorMatchResult.create(autoMatched, unmatchedSource, unmatchedTarget);

			expect(result.getAutoMatchedCount()).toBe(1);
			expect(result.getUnmatchedCount()).toBe(1);
		});
	});

	describe('isAutoMatched', () => {
		it('should return true for auto-matched connector', () => {
			const autoMatched = new Map<string, Connection[]>();
			autoMatched.set('/apis/shared_dataverse', [createConnection('conn-1', '/apis/shared_dataverse')]);

			const result = ConnectorMatchResult.create(autoMatched, new Set(), new Map());

			expect(result.isAutoMatched('/apis/shared_dataverse')).toBe(true);
		});

		it('should return false for non-matched connector', () => {
			const result = ConnectorMatchResult.create(new Map(), new Set(), new Map());

			expect(result.isAutoMatched('/apis/shared_dataverse')).toBe(false);
		});
	});

	describe('getConnectionsForConnector', () => {
		it('should return connections for auto-matched connector', () => {
			const conn1 = createConnection('conn-1', '/apis/shared_dataverse');
			const conn2 = createConnection('conn-2', '/apis/shared_dataverse');
			const autoMatched = new Map<string, Connection[]>();
			autoMatched.set('/apis/shared_dataverse', [conn1, conn2]);

			const result = ConnectorMatchResult.create(autoMatched, new Set(), new Map());
			const connections = result.getConnectionsForConnector('/apis/shared_dataverse');

			expect(connections).toHaveLength(2);
			expect(connections[0]).toBe(conn1);
			expect(connections[1]).toBe(conn2);
		});

		it('should return empty array for non-matched connector', () => {
			const result = ConnectorMatchResult.create(new Map(), new Set(), new Map());

			const connections = result.getConnectionsForConnector('/apis/nonexistent');

			expect(connections).toEqual([]);
		});
	});

	describe('hasUnmatchedConnectors', () => {
		it('should return true when there are unmatched source connectors', () => {
			const unmatchedSource = new Set(['/apis/custom_abc']);
			const result = ConnectorMatchResult.create(new Map(), unmatchedSource, new Map());

			expect(result.hasUnmatchedConnectors()).toBe(true);
		});

		it('should return false when no unmatched source connectors', () => {
			const result = ConnectorMatchResult.create(new Map(), new Set(), new Map());

			expect(result.hasUnmatchedConnectors()).toBe(false);
		});
	});

	describe('getUnmatchedSourceConnectors', () => {
		it('should return set of unmatched source connector IDs', () => {
			const unmatchedSource = new Set(['/apis/custom_abc', '/apis/custom_def']);
			const result = ConnectorMatchResult.create(new Map(), unmatchedSource, new Map());

			const unmatched = result.getUnmatchedSourceConnectors();

			expect(unmatched.size).toBe(2);
			expect(unmatched.has('/apis/custom_abc')).toBe(true);
			expect(unmatched.has('/apis/custom_def')).toBe(true);
		});
	});

	describe('getUnmatchedTargetConnectors', () => {
		it('should return map of unmatched target connectors with their connections', () => {
			const conn = createConnection('conn-1', '/apis/custom_xyz');
			const unmatchedTarget = new Map<string, Connection[]>();
			unmatchedTarget.set('/apis/custom_xyz', [conn]);

			const result = ConnectorMatchResult.create(new Map(), new Set(), unmatchedTarget);
			const candidates = result.getUnmatchedTargetConnectors();

			expect(candidates.size).toBe(1);
			expect(candidates.has('/apis/custom_xyz')).toBe(true);
			expect(candidates.get('/apis/custom_xyz')).toEqual([conn]);
		});
	});

	describe('getAutoMatchedCount', () => {
		it('should return count of auto-matched connectors', () => {
			const autoMatched = new Map<string, Connection[]>();
			autoMatched.set('/apis/a', [createConnection('1', '/apis/a')]);
			autoMatched.set('/apis/b', [createConnection('2', '/apis/b')]);
			autoMatched.set('/apis/c', [createConnection('3', '/apis/c')]);

			const result = ConnectorMatchResult.create(autoMatched, new Set(), new Map());

			expect(result.getAutoMatchedCount()).toBe(3);
		});

		it('should return 0 when no auto-matched connectors', () => {
			const result = ConnectorMatchResult.create(new Map(), new Set(), new Map());

			expect(result.getAutoMatchedCount()).toBe(0);
		});
	});

	describe('getUnmatchedCount', () => {
		it('should return count of unmatched source connectors', () => {
			const unmatchedSource = new Set(['/apis/a', '/apis/b']);
			const result = ConnectorMatchResult.create(new Map(), unmatchedSource, new Map());

			expect(result.getUnmatchedCount()).toBe(2);
		});
	});

	describe('getAutoMatchedConnectors', () => {
		it('should return the full auto-matched map', () => {
			const conn1 = createConnection('conn-1', '/apis/shared_dataverse');
			const conn2 = createConnection('conn-2', '/apis/shared_sharepoint');
			const autoMatched = new Map<string, Connection[]>();
			autoMatched.set('/apis/shared_dataverse', [conn1]);
			autoMatched.set('/apis/shared_sharepoint', [conn2]);

			const result = ConnectorMatchResult.create(autoMatched, new Set(), new Map());
			const matched = result.getAutoMatchedConnectors();

			expect(matched.size).toBe(2);
			expect(matched.get('/apis/shared_dataverse')).toEqual([conn1]);
			expect(matched.get('/apis/shared_sharepoint')).toEqual([conn2]);
		});
	});

	describe('immutability', () => {
		it('should not allow modification of returned collections', () => {
			const autoMatched = new Map<string, Connection[]>();
			autoMatched.set('/apis/test', [createConnection('1', '/apis/test')]);

			const result = ConnectorMatchResult.create(autoMatched, new Set(['/apis/unmatched']), new Map());

			// Modify original map
			autoMatched.set('/apis/new', [createConnection('2', '/apis/new')]);

			// Result should not be affected
			expect(result.getAutoMatchedCount()).toBe(1);
			expect(result.isAutoMatched('/apis/new')).toBe(false);
		});
	});
});
