import * as vscode from 'vscode';
import { IEnvironmentRepository } from '../../domain/interfaces/IEnvironmentRepository';
import { Environment } from '../../domain/entities/Environment';
import { EnvironmentId } from '../../domain/valueObjects/EnvironmentId';
import { EnvironmentConnectionDto } from '../dtos/EnvironmentConnectionDto';
import { EnvironmentDomainMapper } from '../mappers/EnvironmentDomainMapper';

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
		private readonly mapper: EnvironmentDomainMapper
	) {}

	public async getAll(): Promise<Environment[]> {
		const dtos = await this.loadDtos();
		return Promise.all(dtos.map(dto => this.mapper.toDomain(dto)));
	}

	public async getById(id: EnvironmentId): Promise<Environment | null> {
		const dtos = await this.loadDtos();
		const dto = dtos.find(d => d.id === id.getValue());
		return dto ? this.mapper.toDomain(dto) : null;
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

	public async save(
		environment: Environment,
		clientSecret?: string,
		password?: string,
		preserveExistingCredentials: boolean = false
	): Promise<void> {
		const dtos = await this.loadDtos();
		const existingIndex = dtos.findIndex(d => d.id === environment.getId().getValue());

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
				} else if (!preserveExistingCredentials) {
					// No secret provided and not preserving - delete
					await this.secrets.delete(secretKey);
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
				} else if (!preserveExistingCredentials) {
					// No password provided and not preserving - delete
					await this.secrets.delete(secretKey);
				}
				// else: preserving existing password, do nothing
			}
		}

		// Update or add DTO
		if (existingIndex >= 0) {
			dtos[existingIndex] = dto;
		} else {
			dtos.push(dto);
		}

		await this.saveDtos(dtos);
	}

	public async delete(id: EnvironmentId): Promise<void> {
		const dtos = await this.loadDtos();
		const environment = await this.getById(id);

		if (environment) {
			// Delete associated secrets
			const secretKeys = environment.getRequiredSecretKeys();
			await this.deleteSecrets(secretKeys);
		}

		// Remove from storage
		const filtered = dtos.filter(d => d.id !== id.getValue());
		await this.saveDtos(filtered);
	}

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

	public async deleteSecrets(secretKeys: string[]): Promise<void> {
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
