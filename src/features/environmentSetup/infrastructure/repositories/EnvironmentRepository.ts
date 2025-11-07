import * as vscode from 'vscode';

import { IEnvironmentRepository } from '../../domain/interfaces/IEnvironmentRepository';
import { Environment } from '../../domain/entities/Environment';
import { EnvironmentId } from '../../domain/valueObjects/EnvironmentId';
import { EnvironmentConnectionDto } from '../dtos/EnvironmentConnectionDto';
import { EnvironmentDomainMapper } from '../mappers/EnvironmentDomainMapper';
import { ILogger } from '../../../../infrastructure/logging/ILogger';

/**
 * Infrastructure implementation of IEnvironmentRepository
 * Uses VS Code globalState and SecretStorage
 */
export class EnvironmentRepository implements IEnvironmentRepository {
	private static readonly STORAGE_KEY = 'power-platform-dev-suite-environments';
	private static readonly SECRET_PREFIX_CLIENT = 'power-platform-dev-suite-secret-';
	private static readonly SECRET_PREFIX_PASSWORD = 'power-platform-dev-suite-password-';

	constructor(
		private readonly globalState: vscode.Memento,
		private readonly secrets: vscode.SecretStorage,
		private readonly mapper: EnvironmentDomainMapper,
		private readonly logger: ILogger
	) {}

	public async getAll(): Promise<Environment[]> {
		this.logger.debug('EnvironmentRepository: Loading all environments');

		try {
			const dtos = await this.loadDtos();
			const environments = dtos.map(dto => this.mapper.toDomain(dto));

			this.logger.debug('Loaded environments from storage', { count: environments.length });

			return environments;
		} catch (error) {
			this.logger.error('EnvironmentRepository: Failed to load environments', error);
			throw error;
		}
	}

	public async getById(id: EnvironmentId): Promise<Environment | null> {
		this.logger.debug('EnvironmentRepository: Loading environment', { id: id.getValue() });

		try {
			const dtos = await this.loadDtos();
			const dto = dtos.find(d => d.id === id.getValue());

			if (!dto) {
				this.logger.debug('Environment not found', { id: id.getValue() });
				return null;
			}

			return this.mapper.toDomain(dto);
		} catch (error) {
			this.logger.error('EnvironmentRepository: Failed to load environment by ID', error);
			throw error;
		}
	}

	public async getByName(name: string): Promise<Environment | null> {
		const dtos = await this.loadDtos();
		const dto = dtos.find(d => d.name === name);
		return dto ? this.mapper.toDomain(dto) : null;
	}

	public async getActive(): Promise<Environment | null> {
		const dtos = await this.loadDtos();
		const dto = dtos.find(d => d.isActive);
		return dto ? this.mapper.toDomain(dto) : null;
	}

	/**
	 * Saves an environment to storage with optional credentials.
	 * @param environment - Environment domain entity to save
	 * @param clientSecret - Optional client secret (stored in SecretStorage)
	 * @param password - Optional password (stored in SecretStorage)
	 * @param preserveExistingCredentials - If true, keeps existing credentials when new ones not provided. Defaults to false.
	 */
	public async save(
		environment: Environment,
		clientSecret?: string,
		password?: string,
		preserveExistingCredentials: boolean = false
	): Promise<void> {
		const envId = environment.getId().getValue();
		const envName = environment.getName().getValue();

		this.logger.debug('EnvironmentRepository: Saving environment', {
			id: envId,
			name: envName,
			authMethod: environment.getAuthenticationMethod().getType(),
			hasClientSecret: !!clientSecret,
			hasPassword: !!password,
			preserveExisting: preserveExistingCredentials
		});

		try {
			const dtos = await this.loadDtos();
			const existingIndex = dtos.findIndex(d => d.id === envId);

			const dto = this.mapper.toDto(environment);

			const authMethod = environment.getAuthenticationMethod();

			if (authMethod.requiresClientCredentials()) {
				const clientId = environment.getClientId()?.getValue();
				if (clientId) {
					const secretKey = `${EnvironmentRepository.SECRET_PREFIX_CLIENT}${clientId}`;

					if (clientSecret) {
						await this.secrets.store(secretKey, clientSecret);
						this.logger.debug('Client secret stored');
					} else if (!preserveExistingCredentials) {
						await this.secrets.delete(secretKey);
						this.logger.debug('Client secret deleted');
					}
				}
			}

			if (authMethod.requiresUsernamePassword()) {
				const username = environment.getUsername();
				if (username) {
					const secretKey = `${EnvironmentRepository.SECRET_PREFIX_PASSWORD}${username}`;

					if (password) {
						await this.secrets.store(secretKey, password);
						this.logger.debug('Password stored');
					} else if (!preserveExistingCredentials) {
						await this.secrets.delete(secretKey);
						this.logger.debug('Password deleted');
					}
				}
			}

			if (existingIndex >= 0) {
				dtos[existingIndex] = dto;
				this.logger.debug('Updated existing environment', { index: existingIndex });
			} else {
				dtos.push(dto);
				this.logger.debug('Added new environment to storage');
			}

			await this.saveDtos(dtos);

			this.logger.info('Environment saved', { name: envName });
		} catch (error) {
			this.logger.error('EnvironmentRepository: Failed to save environment', error);
			throw error;
		}
	}

	/**
	 * Deletes an environment and all associated secrets.
	 * @param id Environment ID to delete
	 */
	public async delete(id: EnvironmentId): Promise<void> {
		this.logger.debug('EnvironmentRepository: Deleting environment', { id: id.getValue() });

		try {
			const dtos = await this.loadDtos();
			const environment = await this.getById(id);

			if (environment) {
				const secretKeys = environment.getRequiredSecretKeys();
				await this.deleteSecrets(secretKeys);
				this.logger.debug('Deleted secrets', { count: secretKeys.length });
			}

			const filtered = dtos.filter(d => d.id !== id.getValue());
			await this.saveDtos(filtered);

			this.logger.info('Environment deleted', { id: id.getValue() });
		} catch (error) {
			this.logger.error('EnvironmentRepository: Failed to delete environment', error);
			throw error;
		}
	}

	/**
	 * Checks if name is unique across all environments.
	 * Excludes specified environment ID when checking (allows keeping same name during updates).
	 * @param name - Name to check
	 * @param excludeId - Optional ID to exclude from check
	 * @returns True if name is unique, false otherwise
	 */
	public async isNameUnique(name: string, excludeId?: EnvironmentId): Promise<boolean> {
		const dtos = await this.loadDtos();
		const existing = dtos.find(d =>
			d.name === name &&
			(excludeId ? d.id !== excludeId.getValue() : true)
		);
		return !existing;
	}

	public async getClientSecret(clientId: string): Promise<string | undefined> {
		const secretKey = `${EnvironmentRepository.SECRET_PREFIX_CLIENT}${clientId}`;
		return await this.secrets.get(secretKey);
	}

	public async getPassword(username: string): Promise<string | undefined> {
		const secretKey = `${EnvironmentRepository.SECRET_PREFIX_PASSWORD}${username}`;
		return await this.secrets.get(secretKey);
	}

	/**
	 * Deletes multiple secrets from secure storage.
	 * Used for cleanup when auth method changes or environment is deleted.
	 * @param secretKeys Array of secret keys to delete
	 */
	public async deleteSecrets(secretKeys: string[]): Promise<void> {
		this.logger.debug(`Deleting ${secretKeys.length} secret(s) from storage`);

		for (const key of secretKeys) {
			await this.secrets.delete(key);
		}
	}

	private async loadDtos(): Promise<EnvironmentConnectionDto[]> {
		return this.globalState.get<EnvironmentConnectionDto[]>(
			EnvironmentRepository.STORAGE_KEY,
			[]
		);
	}

	private async saveDtos(dtos: EnvironmentConnectionDto[]): Promise<void> {
		await this.globalState.update(EnvironmentRepository.STORAGE_KEY, dtos);
	}
}
