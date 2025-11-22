import { PrivilegeRowMapper } from './PrivilegeRowMapper';
import { SecurityPrivilege } from '../../domain/entities/SecurityPrivilege';

describe('PrivilegeRowMapper', () => {
	let mapper: PrivilegeRowMapper;

	beforeEach(() => {
		mapper = new PrivilegeRowMapper();
	});

	// Test data factory
	function createPrivilege(
		name: string,
		privilegeType: number,
		options: Partial<Parameters<typeof SecurityPrivilege.create>[0]> = {}
	): SecurityPrivilege {
		return SecurityPrivilege.create({
			privilegeId: `priv-${name}`,
			name,
			privilegeType,
			canBeBasic: false,
			canBeLocal: false,
			canBeDeep: false,
			canBeGlobal: false,
			...options
		});
	}

	describe('toViewModel - single privilege mapping', () => {
		it('should map id from privilegeId', () => {
			// Arrange
			const privilege = createPrivilege('prvRead', 2);

			// Act
			const result = mapper.toViewModel(privilege);

			// Assert
			expect(result.id).toBe('priv-prvRead');
		});

		it('should map name', () => {
			// Arrange
			const privilege = createPrivilege('prvCreate', 1);

			// Act
			const result = mapper.toViewModel(privilege);

			// Assert
			expect(result.name).toBe('prvCreate');
		});

		it('should map privilegeType using domain method', () => {
			// Arrange
			const privilege = createPrivilege('prvRead', 2);

			// Act
			const result = mapper.toViewModel(privilege);

			// Assert
			expect(result.privilegeType).toBeDefined();
			expect(typeof result.privilegeType).toBe('string');
		});

		it('should format depths with Basic only', () => {
			// Arrange
			const privilege = createPrivilege('prvRead', 2, {
				canBeBasic: true
			});

			// Act
			const result = mapper.toViewModel(privilege);

			// Assert
			expect(result.depths).toBe('Basic');
		});

		it('should format depths with Local only', () => {
			// Arrange
			const privilege = createPrivilege('prvRead', 2, {
				canBeLocal: true
			});

			// Act
			const result = mapper.toViewModel(privilege);

			// Assert
			expect(result.depths).toBe('Local');
		});

		it('should format depths with Deep only', () => {
			// Arrange
			const privilege = createPrivilege('prvRead', 2, {
				canBeDeep: true
			});

			// Act
			const result = mapper.toViewModel(privilege);

			// Assert
			expect(result.depths).toBe('Deep');
		});

		it('should format depths with Global only', () => {
			// Arrange
			const privilege = createPrivilege('prvRead', 2, {
				canBeGlobal: true
			});

			// Act
			const result = mapper.toViewModel(privilege);

			// Assert
			expect(result.depths).toBe('Global');
		});

		it('should format depths with multiple levels', () => {
			// Arrange
			const privilege = createPrivilege('prvRead', 2, {
				canBeBasic: true,
				canBeLocal: true,
				canBeDeep: true,
				canBeGlobal: true
			});

			// Act
			const result = mapper.toViewModel(privilege);

			// Assert
			expect(result.depths).toBe('Basic, Local, Deep, Global');
		});

		it('should format depths with some levels', () => {
			// Arrange
			const privilege = createPrivilege('prvWrite', 3, {
				canBeBasic: true,
				canBeGlobal: true
			});

			// Act
			const result = mapper.toViewModel(privilege);

			// Assert
			expect(result.depths).toBe('Basic, Global');
		});

		it('should set isLinkable to true', () => {
			// Arrange
			const privilege = createPrivilege('prvDelete', 4);

			// Act
			const result = mapper.toViewModel(privilege);

			// Assert
			expect(result.isLinkable).toBe(true);
		});

		it('should include metadata reference', () => {
			// Arrange
			const privilege = createPrivilege('prvShare', 5);

			// Act
			const result = mapper.toViewModel(privilege);

			// Assert
			expect(result.metadata).toBe(privilege);
		});
	});

	describe('privilege types', () => {
		it('should map Create privilege type', () => {
			// Arrange
			const privilege = createPrivilege('prvCreate', 1);

			// Act
			const result = mapper.toViewModel(privilege);

			// Assert
			expect(result.privilegeType).toBeDefined();
			expect(result.metadata.privilegeType).toBe(1);
		});

		it('should map Read privilege type', () => {
			// Arrange
			const privilege = createPrivilege('prvRead', 2);

			// Act
			const result = mapper.toViewModel(privilege);

			// Assert
			expect(result.privilegeType).toBeDefined();
			expect(result.metadata.privilegeType).toBe(2);
		});

		it('should map Write privilege type', () => {
			// Arrange
			const privilege = createPrivilege('prvWrite', 3);

			// Act
			const result = mapper.toViewModel(privilege);

			// Assert
			expect(result.privilegeType).toBeDefined();
			expect(result.metadata.privilegeType).toBe(3);
		});

		it('should map Delete privilege type', () => {
			// Arrange
			const privilege = createPrivilege('prvDelete', 4);

			// Act
			const result = mapper.toViewModel(privilege);

			// Assert
			expect(result.privilegeType).toBeDefined();
			expect(result.metadata.privilegeType).toBe(4);
		});

		it('should map Assign privilege type', () => {
			// Arrange
			const privilege = createPrivilege('prvAssign', 6);

			// Act
			const result = mapper.toViewModel(privilege);

			// Assert
			expect(result.privilegeType).toBeDefined();
			expect(result.metadata.privilegeType).toBe(6);
		});

		it('should map Share privilege type', () => {
			// Arrange
			const privilege = createPrivilege('prvShare', 5);

			// Act
			const result = mapper.toViewModel(privilege);

			// Assert
			expect(result.privilegeType).toBeDefined();
			expect(result.metadata.privilegeType).toBe(5);
		});

		it('should map Append privilege type', () => {
			// Arrange
			const privilege = createPrivilege('prvAppend', 7);

			// Act
			const result = mapper.toViewModel(privilege);

			// Assert
			expect(result.privilegeType).toBeDefined();
			expect(result.metadata.privilegeType).toBe(7);
		});

		it('should map AppendTo privilege type', () => {
			// Arrange
			const privilege = createPrivilege('prvAppendTo', 8);

			// Act
			const result = mapper.toViewModel(privilege);

			// Assert
			expect(result.privilegeType).toBeDefined();
			expect(result.metadata.privilegeType).toBe(8);
		});
	});

	describe('edge cases', () => {
		it('should handle privilege with no depth permissions', () => {
			// Arrange
			const privilege = createPrivilege('prvTest', 1, {
				canBeBasic: false,
				canBeLocal: false,
				canBeDeep: false,
				canBeGlobal: false
			});

			// Act
			const result = mapper.toViewModel(privilege);

			// Assert
			expect(result.depths).toBe('');
		});

		it('should handle privilege with all depth permissions', () => {
			// Arrange
			const privilege = createPrivilege('prvAll', 2, {
				canBeBasic: true,
				canBeLocal: true,
				canBeDeep: true,
				canBeGlobal: true
			});

			// Act
			const result = mapper.toViewModel(privilege);

			// Assert
			expect(result.depths.split(', ')).toHaveLength(4);
		});

		it('should handle custom privilege names', () => {
			// Arrange
			const privilege = createPrivilege('prvCustomAction', 9);

			// Act
			const result = mapper.toViewModel(privilege);

			// Assert
			expect(result.name).toBe('prvCustomAction');
		});

		it('should preserve metadata for complex privileges', () => {
			// Arrange
			const privilege = createPrivilege('prvComplex', 7, {
				canBeBasic: true,
				canBeLocal: true,
				canBeEntityReference: true,
				canBeParentEntityReference: true
			});

			// Act
			const result = mapper.toViewModel(privilege);

			// Assert
			expect(result.metadata.canBeEntityReference).toBe(true);
			expect(result.metadata.canBeParentEntityReference).toBe(true);
		});
	});
});
