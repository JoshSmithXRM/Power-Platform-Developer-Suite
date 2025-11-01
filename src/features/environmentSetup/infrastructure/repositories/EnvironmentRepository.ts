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

	/**
	 * Retrieves all environments from storage
	 * @returns Array of all configured environments
	 */
	public async getAll(): Promise<Environment[]> {
		this.logger.debug('EnvironmentRepository: Loading all environments');

		try {
			const dtos = await this.loadDtos();
			const environments = await Promise.all(dtos.map(dto => this.mapper.toDomain(dto)));

			this.logger.debug(`Loaded ${environments.length} environment(s) from storage`);

			return environments;
		} catch (error) {
			this.logger.error('EnvironmentRepository: Failed to load environments', error);
			throw error;
		}
	}

	/**
	 * Retrieves a single environment by ID
	 * @param id Environment ID to retrieve
	 * @returns Environment if found, null otherwise
	 */
	public async getById(id: EnvironmentId): Promise<Environment | null> {
		this.logger.debug(`EnvironmentRepository: Loading environment ${id.getValue()}`);

		try {
			const dtos = await this.loadDtos();
			const dto = dtos.find(d => d.id === id.getValue());

			if (!dto) {
				this.logger.debug(`Environment not found: ${id.getValue()}`);
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
	 * Saves an environment to storage with optional credentials
	 * @param environment Environment domain entity to save
	 * @param clientSecret Optional client secret (stored in SecretStorage)
	 * @param password Optional password (stored in SecretStorage)
	 * @param preserveExistingCredentials If true, keeps existing credentials when new ones not provided
	 */
	public async save(
		environment: Environment,
		clientSecret?: string,
		password?: string,
		preserveExistingCredentials: boolean = false
	): Promise<void> {
		const envId = environment.getId().getValue();
		const envName = environment.getName().getValue();

		this.logger.debug(`EnvironmentRepository: Saving environment "${envName}"`, {
			id: envId,
			authMethod: environment.getAuthenticationMethod().getType(),
			hasClientSecret: !!clientSecret,
			hasPassword: !!password,
			preserveExisting: preserveExistingCredentials
		});

		try {
			const dtos = await this.loadDtos();
			const existingIndex = dtos.findIndex(d => d.id === envId);

			// Map domain to DTO
			const dto = this.mapper.toDto(environment);

			// Handle credentials
			const authMethod = environment.getAuthenticationMethod();

			if (authMethod.requiresClientCredentials()) {
				const clientId = environment.getClientId()?.getValue();
				if (clientId) {
					const secretKey = `${EnvironmentRepository.SECRET_PREFIX_CLIENT}${clientId}`;

					if (clientSecret) {
						// New or updated secret
						await this.secrets.store(secretKey, clientSecret);
						this.logger.debug('Client secret stored');
					} else if (!preserveExistingCredentials) {
						// No secret provided and not preserving - delete
						await this.secrets.delete(secretKey);
						this.logger.debug('Client secret deleted');
					}
					// else: preserving existing secret, do nothing
				}
			}

			if (authMethod.requiresUsernamePassword()) {
				const username = environment.getUsername();
				if (username) {
					const secretKey = `${EnvironmentRepository.SECRET_PREFIX_PASSWORD}${username}`;

					if (password) {
						// New or updated password
						await this.secrets.store(secretKey, password);
						this.logger.debug('Password stored');
					} else if (!preserveExistingCredentials) {
						// No password provided and not preserving - delete
						await this.secrets.delete(secretKey);
						this.logger.debug('Password deleted');
					}
					// else: preserving existing password, do nothing
				}
			}

			// Update or add DTO
			if (existingIndex >= 0) {
				dtos[existingIndex] = dto;
				this.logger.debug(`Updated existing environment at index ${existingIndex}`);
			} else {
				dtos.push(dto);
				this.logger.debug('Added new environment to storage');
			}

			await this.saveDtos(dtos);

			this.logger.info(`Environment saved: ${envName}`);
		} catch (error) {
			this.logger.error('EnvironmentRepository: Failed to save environment', error);
			throw error;
		}
	}

	/**
	 * Deletes an environment and all associated secrets
	 * @param id Environment ID to delete
	 */
	public async delete(id: EnvironmentId): Promise<void> {
		this.logger.debug(`EnvironmentRepository: Deleting environment ${id.getValue()}`);

		try {
			const dtos = await this.loadDtos();
			const environment = await this.getById(id);

			if (environment) {
				// Delete associated secrets
				const secretKeys = environment.getRequiredSecretKeys();
				await this.deleteSecrets(secretKeys);
				this.logger.debug(`Deleted ${secretKeys.length} secret(s)`);
			}

			// Remove from storage
			const filtered = dtos.filter(d => d.id !== id.getValue());
			await this.saveDtos(filtered);

			this.logger.info(`Environment deleted: ${id.getValue()}`);
		} catch (error) {
			this.logger.error('EnvironmentRepository: Failed to delete environment', error);
			throw error;
		}
	}

	/**
	 * Checks if an environment name is unique
	 * @param name Name to check
	 * @param excludeId Optional environment ID to exclude from check (for updates)
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

	/**
	 * Retrieves client secret from secure storage
	 * @param clientId Client ID to retrieve secret for
	 * @returns Client secret if found, undefined otherwise
	 */
	public async getClientSecret(clientId: string): Promise<string | undefined> {
		const secretKey = `${EnvironmentRepository.SECRET_PREFIX_CLIENT}${clientId}`;
		return await this.secrets.get(secretKey);
	}

	/**
	 * Retrieves password from secure storage
	 * @param username Username to retrieve password for
	 * @returns Password if found, undefined otherwise
	 */
	public async getPassword(username: string): Promise<string | undefined> {
		const secretKey = `${EnvironmentRepository.SECRET_PREFIX_PASSWORD}${username}`;
		return await this.secrets.get(secretKey);
	}

	/**
	 * Deletes multiple secrets from secure storage
	 * Used for cleanup when auth method changes or environment is deleted
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
