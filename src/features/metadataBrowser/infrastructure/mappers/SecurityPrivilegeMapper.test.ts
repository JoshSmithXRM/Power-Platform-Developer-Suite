import { SecurityPrivilegeMapper } from './SecurityPrivilegeMapper';
import type { SecurityPrivilegeDto } from '../dtos/EntityMetadataDto';

describe('SecurityPrivilegeMapper', () => {
	let mapper: SecurityPrivilegeMapper;

	beforeEach(() => {
		mapper = new SecurityPrivilegeMapper();
	});

	describe('mapDtoToEntity', () => {
		it('should map DTO with numeric PrivilegeType to entity', () => {
			const dto: SecurityPrivilegeDto = {
				PrivilegeId: 'priv-123',
				Name: 'prvReadAccount',
				PrivilegeType: 2, // Numeric Read
				CanBeBasic: true,
				CanBeLocal: true,
				CanBeDeep: true,
				CanBeGlobal: true,
				CanBeEntityReference: false,
				CanBeParentEntityReference: false
			};

			const entity = mapper.mapDtoToEntity(dto);

			expect(entity.privilegeId).toBe('priv-123');
			expect(entity.name).toBe('prvReadAccount');
			expect(entity.privilegeType).toBe(2);
			expect(entity.canBeBasic).toBe(true);
			expect(entity.canBeLocal).toBe(true);
			expect(entity.canBeDeep).toBe(true);
			expect(entity.canBeGlobal).toBe(true);
			expect(entity.getPrivilegeTypeDisplay()).toBe('Read');
		});

		it('should map DTO with string PrivilegeType "Create" to entity', () => {
			const dto: SecurityPrivilegeDto = {
				PrivilegeId: 'priv-456',
				Name: 'prvCreatePrincipalObjectAttributeAccess',
				PrivilegeType: 'Create', // String instead of number
				CanBeBasic: false,
				CanBeLocal: false,
				CanBeDeep: false,
				CanBeGlobal: true
			};

			const entity = mapper.mapDtoToEntity(dto);

			expect(entity.privilegeId).toBe('priv-456');
			expect(entity.name).toBe('prvCreatePrincipalObjectAttributeAccess');
			expect(entity.privilegeType).toBe(1); // Normalized to numeric 1
			expect(entity.getPrivilegeTypeDisplay()).toBe('Create'); // Should display correctly
		});

		it('should map DTO with string PrivilegeType "Read" to entity', () => {
			const dto: SecurityPrivilegeDto = {
				PrivilegeId: 'priv-789',
				Name: 'prvReadPrincipalObjectAttributeAccess',
				PrivilegeType: 'Read',
				CanBeBasic: false,
				CanBeLocal: false,
				CanBeDeep: false,
				CanBeGlobal: true
			};

			const entity = mapper.mapDtoToEntity(dto);

			expect(entity.privilegeType).toBe(2);
			expect(entity.getPrivilegeTypeDisplay()).toBe('Read');
		});

		it('should handle all valid string PrivilegeType values', () => {
			const testCases: Array<{ str: string; num: number; display: string }> = [
				{ str: 'None', num: 0, display: 'None' },
				{ str: 'Create', num: 1, display: 'Create' },
				{ str: 'Read', num: 2, display: 'Read' },
				{ str: 'Write', num: 3, display: 'Write' },
				{ str: 'Delete', num: 4, display: 'Delete' },
				{ str: 'Assign', num: 5, display: 'Assign' },
				{ str: 'Share', num: 6, display: 'Share' },
				{ str: 'Append', num: 7, display: 'Append' },
				{ str: 'AppendTo', num: 8, display: 'AppendTo' }
			];

			testCases.forEach(({ str, num, display }) => {
				const dto: SecurityPrivilegeDto = {
					PrivilegeId: `priv-${str}`,
					Name: `prv${str}Test`,
					PrivilegeType: str,
					CanBeBasic: false,
					CanBeLocal: false,
					CanBeDeep: false,
					CanBeGlobal: true
				};

				const entity = mapper.mapDtoToEntity(dto);

				expect(entity.privilegeType).toBe(num);
				expect(entity.getPrivilegeTypeDisplay()).toBe(display);
			});
		});

		it('should handle unknown string PrivilegeType by returning -1', () => {
			const dto: SecurityPrivilegeDto = {
				PrivilegeId: 'priv-999',
				Name: 'prvUnknownType',
				PrivilegeType: 'InvalidType',
				CanBeBasic: false,
				CanBeLocal: false,
				CanBeDeep: false,
				CanBeGlobal: true
			};

			const entity = mapper.mapDtoToEntity(dto);

			expect(entity.privilegeType).toBe(-1);
			expect(entity.getPrivilegeTypeDisplay()).toBe('Unknown (-1)');
		});

		it('should preserve optional properties when mapping', () => {
			const dto: SecurityPrivilegeDto = {
				PrivilegeId: 'priv-opt',
				Name: 'prvOptionalTest',
				PrivilegeType: 'Append',
				CanBeBasic: false,
				CanBeLocal: false,
				CanBeDeep: false,
				CanBeGlobal: false,
				CanBeEntityReference: true,
				CanBeParentEntityReference: true
			};

			const entity = mapper.mapDtoToEntity(dto);

			expect(entity.canBeEntityReference).toBe(true);
			expect(entity.canBeParentEntityReference).toBe(true);
		});

		it('should default optional properties to false when not provided', () => {
			const dto: SecurityPrivilegeDto = {
				PrivilegeId: 'priv-default',
				Name: 'prvDefaultTest',
				PrivilegeType: 'Write',
				CanBeBasic: true,
				CanBeLocal: false,
				CanBeDeep: false,
				CanBeGlobal: false
				// CanBeEntityReference and CanBeParentEntityReference not provided
			};

			const entity = mapper.mapDtoToEntity(dto);

			expect(entity.canBeEntityReference).toBe(false);
			expect(entity.canBeParentEntityReference).toBe(false);
		});
	});
});
