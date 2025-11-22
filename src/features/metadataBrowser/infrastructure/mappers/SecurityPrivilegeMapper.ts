import { SecurityPrivilege } from '../../domain/entities/SecurityPrivilege';
import type { SecurityPrivilegeDto } from '../dtos/EntityMetadataDto';

/**
 * Maps security privilege DTOs to domain entities.
 * Handles CRM security privileges and their depth levels.
 */
export class SecurityPrivilegeMapper {
	/**
	 * Maps a security privilege DTO to domain entity.
	 */
	public mapDtoToEntity(dto: SecurityPrivilegeDto): SecurityPrivilege {
		return SecurityPrivilege.create({
			privilegeId: dto.PrivilegeId,
			name: dto.Name,
			privilegeType: dto.PrivilegeType,
			canBeBasic: dto.CanBeBasic,
			canBeLocal: dto.CanBeLocal,
			canBeDeep: dto.CanBeDeep,
			canBeGlobal: dto.CanBeGlobal,
			canBeEntityReference: dto.CanBeEntityReference ?? false,
			canBeParentEntityReference: dto.CanBeParentEntityReference ?? false
		});
	}
}
