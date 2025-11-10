import type { SecurityPrivilege } from '../../domain/entities/SecurityPrivilege';
import type { PrivilegeRowViewModel } from '../viewModels/PrivilegeRowViewModel';

/**
 * Maps SecurityPrivilege to PrivilegeRowViewModel.
 *
 * Transformation rules:
 * - privilegeType: Get display string from domain method
 * - depths: Join available depth levels with ", "
 */
export class PrivilegeRowMapper {
    public toViewModel(privilege: SecurityPrivilege): PrivilegeRowViewModel {
        return {
            id: privilege.privilegeId,
            name: privilege.name,
            privilegeType: privilege.getPrivilegeTypeDisplay(),
            depths: privilege.getAvailableDepths().join(', '),
            isLinkable: true,
            metadata: privilege
        };
    }
}
