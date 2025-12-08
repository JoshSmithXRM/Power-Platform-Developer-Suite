import type { GetWebResourceContentUseCase } from '../../application/useCases/GetWebResourceContentUseCase';
import type { UpdateWebResourceUseCase } from '../../application/useCases/UpdateWebResourceUseCase';
import type { PublishWebResourceUseCase } from '../../application/useCases/PublishWebResourceUseCase';
import type { IWebResourceRepository } from '../../domain/interfaces/IWebResourceRepository';
import type { ILogger } from '../../../../infrastructure/logging/ILogger';

/**
 * Resources associated with an environment for web resource operations.
 * Each environment has its own set of use cases bound to specific credentials.
 */
export interface EnvironmentResources {
	readonly getWebResourceContentUseCase: GetWebResourceContentUseCase;
	readonly updateWebResourceUseCase: UpdateWebResourceUseCase | null;
	readonly publishWebResourceUseCase: PublishWebResourceUseCase | null;
	readonly webResourceRepository: IWebResourceRepository | undefined;
}

/**
 * Registry for managing web resource environment resources.
 *
 * Maps environmentIds to their associated resources (use cases, repository).
 * The FileSystemProvider uses this to look up the correct credentials
 * based on the environmentId in the URI.
 *
 * @remarks
 * This is simpler than the previous connectionId approach because
 * environmentId already uniquely identifies the connection (URL + auth method).
 */
export class WebResourceConnectionRegistry {
	private static instance: WebResourceConnectionRegistry | null = null;
	private readonly environments = new Map<string, EnvironmentResources>();

	private constructor(private readonly logger: ILogger) {}

	/**
	 * Gets the singleton instance of the registry.
	 * Creates it if it doesn't exist.
	 */
	public static getInstance(logger: ILogger): WebResourceConnectionRegistry {
		if (WebResourceConnectionRegistry.instance === null) {
			WebResourceConnectionRegistry.instance = new WebResourceConnectionRegistry(logger);
		}
		return WebResourceConnectionRegistry.instance;
	}

	/**
	 * Resets the singleton instance (for testing only).
	 */
	public static resetInstance(): void {
		WebResourceConnectionRegistry.instance = null;
	}

	/**
	 * Registers resources for an environment.
	 * If the environment is already registered, updates the resources.
	 *
	 * @param environmentId - The environment ID
	 * @param resources - The environment resources (use cases, repository)
	 */
	public register(environmentId: string, resources: EnvironmentResources): void {
		if (!environmentId) {
			this.logger.warn('WebResourceConnectionRegistry: Cannot register empty environmentId');
			return;
		}

		const isUpdate = this.environments.has(environmentId);
		this.environments.set(environmentId, resources);
		this.logger.debug('WebResourceConnectionRegistry: Environment registered', {
			environmentId,
			isUpdate
		});
	}

	/**
	 * Gets the resources for an environment by ID.
	 *
	 * @param environmentId - The environment ID from a URI
	 * @returns Environment resources or undefined if not found
	 */
	public get(environmentId: string): EnvironmentResources | undefined {
		return this.environments.get(environmentId);
	}

	/**
	 * Unregisters an environment when no longer needed.
	 *
	 * @param environmentId - The environment ID to remove
	 */
	public unregister(environmentId: string): void {
		const removed = this.environments.delete(environmentId);
		if (removed) {
			this.logger.debug('WebResourceConnectionRegistry: Environment unregistered', { environmentId });
		}
	}

	/**
	 * Checks if an environment is registered.
	 */
	public has(environmentId: string): boolean {
		return this.environments.has(environmentId);
	}

	/**
	 * Gets the number of registered environments (for testing/debugging).
	 */
	public get size(): number {
		return this.environments.size;
	}
}
