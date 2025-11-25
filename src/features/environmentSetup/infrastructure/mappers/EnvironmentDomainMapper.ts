import { Environment } from '../../domain/entities/Environment';
import { EnvironmentId } from '../../domain/valueObjects/EnvironmentId';
import { EnvironmentName } from '../../domain/valueObjects/EnvironmentName';
import { DataverseUrl } from '../../domain/valueObjects/DataverseUrl';
import { TenantId } from '../../domain/valueObjects/TenantId';
import { ClientId } from '../../domain/valueObjects/ClientId';
import { AuthenticationMethod, AuthenticationMethodType } from '../../domain/valueObjects/AuthenticationMethod';
import { EnvironmentConnectionDto, PowerPlatformSettingsDto } from '../../../../shared/application/dtos/EnvironmentConnectionDto';
import { ILogger } from '../../../../infrastructure/logging/ILogger';

/**
 * Maps between domain entities and infrastructure DTOs
 * Handles bidirectional conversion for environment persistence
 */
export class EnvironmentDomainMapper {
	constructor(private readonly logger: ILogger) {}

	/**
	 * Converts infrastructure DTO to domain entity.
	 * Maps persistence format to rich domain model.
	 * @param dto - Infrastructure DTO from storage
	 * @returns Domain entity with behavior
	 */
	public toDomain(dto: EnvironmentConnectionDto): Environment {
		this.logger.debug('Mapping DTO to domain entity', {
			environmentId: dto.id,
			authMethod: dto.settings.authenticationMethod
		});

		try {
			const environment = new Environment(
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

			this.logger.debug('Successfully mapped DTO to domain entity');
			return environment;
		} catch (error) {
			this.logger.error('Failed to map DTO to domain entity', error);
			throw error;
		}
	}

	/**
	 * Converts domain entity to infrastructure DTO.
	 * Maps rich domain model to persistence format.
	 * @param environment - Domain entity with behavior
	 * @returns Infrastructure DTO for storage
	 */
	public toDto(environment: Environment): EnvironmentConnectionDto {
		this.logger.debug('Mapping domain entity to DTO', {
			environmentId: environment.getId().getValue(),
			authMethod: environment.getAuthenticationMethod().getType()
		});

		try {
			const settings: PowerPlatformSettingsDto = {
				dataverseUrl: environment.getDataverseUrl().getValue(),
				tenantId: environment.getTenantId().getValue() || '',
				authenticationMethod: environment.getAuthenticationMethod().toString() as PowerPlatformSettingsDto['authenticationMethod'],
				publicClientId: environment.getPublicClientId().getValue()
			};

			const clientId = environment.getClientId()?.getValue();
			if (clientId !== undefined) {
				settings.clientId = clientId;
			}

			const username = environment.getUsername();
			if (username !== undefined) {
				settings.username = username;
			}

			const dto: EnvironmentConnectionDto = {
				id: environment.getId().getValue(),
				name: environment.getName().getValue(),
				settings,
				isActive: environment.getIsActive()
			};

			const lastUsed = environment.getLastUsed();
			if (lastUsed !== undefined) {
				dto.lastUsed = lastUsed.toISOString();
			}

			const environmentId = environment.getPowerPlatformEnvironmentId();
			if (environmentId !== undefined) {
				dto.environmentId = environmentId;
			}

			this.logger.debug('Successfully mapped domain entity to DTO');
			return dto;
		} catch (error) {
			this.logger.error('Failed to map domain entity to DTO', error);
			throw error;
		}
	}
}
