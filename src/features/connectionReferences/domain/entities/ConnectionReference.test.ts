import { ConnectionReference } from './ConnectionReference';

describe('ConnectionReference', () => {
	describe('constructor', () => {
		it('should create connection reference with all properties', () => {
			// Arrange
			const id = 'cr-guid-123';
			const logicalName = 'cr_sharepoint';
			const displayName = 'SharePoint Connection';
			const connectorId = 'connector-123';
			const connectionId = 'connection-456';
			const isManaged = true;
			const modifiedOn = new Date('2024-01-15');

			// Act
			const cr = new ConnectionReference(
				id,
				logicalName,
				displayName,
				connectorId,
				connectionId,
				isManaged,
				modifiedOn
			);

			// Assert
			expect(cr.id).toBe(id);
			expect(cr.connectionReferenceLogicalName).toBe(logicalName);
			expect(cr.displayName).toBe(displayName);
			expect(cr.connectorId).toBe(connectorId);
			expect(cr.connectionId).toBe(connectionId);
			expect(cr.isManaged).toBe(isManaged);
			expect(cr.modifiedOn).toBe(modifiedOn);
		});

		it('should create connection reference with null connector id', () => {
			// Arrange
			const connectorId = null;

			// Act
			const cr = createConnectionReference({ connectorId });

			// Assert
			expect(cr.connectorId).toBeNull();
		});

		it('should create connection reference with null connection id', () => {
			// Arrange
			const connectionId = null;

			// Act
			const cr = createConnectionReference({ connectionId });

			// Assert
			expect(cr.connectionId).toBeNull();
		});

		it('should create unmanaged connection reference', () => {
			// Arrange
			const isManaged = false;

			// Act
			const cr = createConnectionReference({ isManaged });

			// Assert
			expect(cr.isManaged).toBe(false);
		});
	});

	describe('hasConnection', () => {
		it('should return true when connection id exists', () => {
			// Arrange
			const cr = createConnectionReference({ connectionId: 'connection-123' });

			// Act
			const result = cr.hasConnection();

			// Assert
			expect(result).toBe(true);
		});

		it('should return false when connection id is null', () => {
			// Arrange
			const cr = createConnectionReference({ connectionId: null });

			// Act
			const result = cr.hasConnection();

			// Assert
			expect(result).toBe(false);
		});
	});

	describe('isInSolution', () => {
		it('should return true when id exists in solution component ids', () => {
			// Arrange
			const cr = createConnectionReference({ id: 'cr-123' });
			const solutionComponentIds = new Set(['cr-123', 'cr-456', 'cr-789']);

			// Act
			const result = cr.isInSolution(solutionComponentIds);

			// Assert
			expect(result).toBe(true);
		});

		it('should return false when id does not exist in solution component ids', () => {
			// Arrange
			const cr = createConnectionReference({ id: 'cr-999' });
			const solutionComponentIds = new Set(['cr-123', 'cr-456', 'cr-789']);

			// Act
			const result = cr.isInSolution(solutionComponentIds);

			// Assert
			expect(result).toBe(false);
		});

		it('should return false when solution component ids set is empty', () => {
			// Arrange
			const cr = createConnectionReference({ id: 'cr-123' });
			const solutionComponentIds = new Set<string>();

			// Act
			const result = cr.isInSolution(solutionComponentIds);

			// Assert
			expect(result).toBe(false);
		});

		it('should handle case-sensitive id matching', () => {
			// Arrange
			const cr = createConnectionReference({ id: 'CR-123' });
			const solutionComponentIds = new Set(['cr-123']); // lowercase

			// Act
			const result = cr.isInSolution(solutionComponentIds);

			// Assert
			expect(result).toBe(false);
		});
	});
});

// Test Data Factory
function createConnectionReference(overrides: Partial<{
	id: string;
	connectionReferenceLogicalName: string;
	displayName: string;
	connectorId: string | null;
	connectionId: string | null;
	isManaged: boolean;
	modifiedOn: Date;
}> = {}): ConnectionReference {
	return new ConnectionReference(
		'id' in overrides ? overrides.id! : 'cr-guid-default',
		'connectionReferenceLogicalName' in overrides ? overrides.connectionReferenceLogicalName! : 'cr_default',
		'displayName' in overrides ? overrides.displayName! : 'Default CR',
		'connectorId' in overrides ? overrides.connectorId! : 'connector-default',
		'connectionId' in overrides ? overrides.connectionId! : 'connection-default',
		'isManaged' in overrides ? overrides.isManaged! : false,
		'modifiedOn' in overrides ? overrides.modifiedOn! : new Date('2024-01-01')
	);
}
