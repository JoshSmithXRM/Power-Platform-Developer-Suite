import { SecurityPrivilege } from '../../domain/entities/SecurityPrivilege';
import type { SecurityPrivilegeDto } from '../dtos/EntityMetadataDto';

/**
 * Maps security privilege DTOs to domain entities.
 * Handles CRM security privileges and their depth levels.
 */
export class SecurityPrivilegeMapper {
	/**
	 * Normalizes PrivilegeType to number (handles both string and number from API).
	 * Some system entities (e.g., PrincipalObjectAttributeAccess) return string values.
	 */
	private normalizePrivilegeType(value: number | string): number {
		if (typeof value === 'number') {
			return value;
		}

		// API sometimes returns string values (e.g., "Create", "Read")
		// Map to standard PrivilegeType enum values
		const stringToNumber: Record<string, number> = {
			'None': 0,
			'Create': 1,
			'Read': 2,
			'Write': 3,
			'Delete': 4,
			'Assign': 5,
			'Share': 6,
			'Append': 7,
			'AppendTo': 8
		};

		return stringToNumber[value] ?? -1; // -1 for unknown strings
	}

	/**
	 * Maps a security privilege DTO to domain entity.
	 */
	public mapDtoToEntity(dto: SecurityPrivilegeDto): SecurityPrivilege {
		return SecurityPrivilege.create({
			privilegeId: dto.PrivilegeId,
			name: dto.Name,
			privilegeType: this.normalizePrivilegeType(dto.PrivilegeType),
			canBeBasic: dto.CanBeBasic,
			canBeLocal: dto.CanBeLocal,
			canBeDeep: dto.CanBeDeep,
			canBeGlobal: dto.CanBeGlobal,
			canBeEntityReference: dto.CanBeEntityReference ?? false,
			canBeParentEntityReference: dto.CanBeParentEntityReference ?? false
		});
	}
}
