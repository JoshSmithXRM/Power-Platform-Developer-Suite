import { Environment } from '../../domain/entities/Environment';
import { EnvironmentId } from '../../domain/valueObjects/EnvironmentId';
import { EnvironmentName } from '../../domain/valueObjects/EnvironmentName';
import { DataverseUrl } from '../../domain/valueObjects/DataverseUrl';
import { TenantId } from '../../domain/valueObjects/TenantId';
import { ClientId } from '../../domain/valueObjects/ClientId';
import { AuthenticationMethod, AuthenticationMethodType } from '../../domain/valueObjects/AuthenticationMethod';
import { EnvironmentConnectionDto } from '../dtos/EnvironmentConnectionDto';

/**
 * Maps between domain entities and infrastructure DTOs
 */
export class EnvironmentDomainMapper {
	public toDomain(dto: EnvironmentConnectionDto): Environment {
		return new Environment(
			new EnvironmentId(dto.id),
			new EnvironmentName(dto.name),
			new DataverseUrl(dto.settings.dataverseUrl),
			new TenantId(dto.settings.tenantId),
			new AuthenticationMethod(dto.settings.authenticationMethod as AuthenticationMethodType),
			new ClientId(dto.settings.publicClientId),
			dto.isActive,
			dto.lastUsed ? new Date(dto.lastUsed) : undefined,
			dto.environmentId,
			dto.settings.clientId ? new ClientId(dto.settings.clientId) : undefined,
			dto.settings.username
		);
	}

	public toDto(environment: Environment): EnvironmentConnectionDto {
		return {
			id: environment.getId().getValue(),
			name: environment.getName().getValue(),
			settings: {
				dataverseUrl: environment.getDataverseUrl().getValue(),
				tenantId: environment.getTenantId().getValue() || '', // Empty string if not provided (will use "organizations" authority)
				authenticationMethod: environment.getAuthenticationMethod().toString() as EnvironmentConnectionDto['settings']['authenticationMethod'],
				publicClientId: environment.getPublicClientId().getValue(),
				clientId: environment.getClientId()?.getValue(),
				username: environment.getUsername()
			},
			isActive: environment.getIsActive(),
			lastUsed: environment.getLastUsed()?.toISOString(),
			environmentId: environment.getPowerPlatformEnvironmentId()
		};
	}
}
