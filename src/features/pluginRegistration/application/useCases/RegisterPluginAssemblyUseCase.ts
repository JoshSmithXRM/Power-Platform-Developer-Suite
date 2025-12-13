import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { IPluginAssemblyRepository } from '../../domain/interfaces/IPluginAssemblyRepository';
import type { IPluginTypeRepository } from '../../domain/interfaces/IPluginTypeRepository';

/**
 * Information about a plugin type to register.
 * Comes from PluginInspector tool output.
 */
export interface PluginTypeToRegister {
	/** Fully qualified type name (e.g., "PPDSDemo.Plugins.PreAccountCreate") */
	readonly typeName: string;
	/** Short display name (e.g., "PreAccountCreate") */
	readonly displayName: string;
	/** Type classification */
	readonly typeKind: 'Plugin' | 'WorkflowActivity';
}

/**
 * Input for registering a new plugin assembly.
 *
 * Note: Unlike packages, assemblies:
 * - Do NOT have a prefix on their name
 * - Have fixed sourcetype (0 = Database) and isolationmode (2 = Sandbox) for cloud
 * - Can optionally be added to a solution
 * - Plugin types must be explicitly registered (NOT auto-discovered by Dataverse)
 */
export interface RegisterPluginAssemblyInput {
	/** Assembly name (from DLL filename, NO prefix) */
	readonly name: string;
	/** Base64-encoded DLL content */
	readonly base64Content: string;
	/** Optional solution unique name to add assembly to */
	readonly solutionUniqueName?: string | undefined;
	/** Plugin types to register (discovered by PluginInspector) */
	readonly pluginTypes: readonly PluginTypeToRegister[];
}

/**
 * Result of assembly registration including registered plugin types.
 */
export interface RegisterPluginAssemblyResult {
	/** ID of the created assembly */
	readonly assemblyId: string;
	/** IDs of registered plugin types (in same order as input) */
	readonly pluginTypeIds: readonly string[];
}

/**
 * Use case for registering a new plugin assembly.
 *
 * Orchestration only - no business logic:
 * 1. Validate input
 * 2. Register assembly
 * 3. Register plugin types
 * 4. Return created IDs
 *
 * Key differences from Package registration:
 * - No prefix on name (assemblies use raw name like "PPDSDemo.Plugins")
 * - Fixed values: sourcetype=0 (Database), isolationmode=2 (Sandbox)
 * - Solution association is optional
 * - Plugin types must be explicitly registered (Dataverse does NOT auto-discover)
 */
export class RegisterPluginAssemblyUseCase {
	constructor(
		private readonly assemblyRepository: IPluginAssemblyRepository,
		private readonly pluginTypeRepository: IPluginTypeRepository,
		private readonly logger: ILogger
	) {}

	/**
	 * Register a new plugin assembly and its plugin types.
	 *
	 * @param environmentId - Target environment
	 * @param input - Assembly registration data including types to register
	 * @returns IDs of created assembly and plugin types
	 * @throws Error if registration fails
	 */
	public async execute(
		environmentId: string,
		input: RegisterPluginAssemblyInput
	): Promise<RegisterPluginAssemblyResult> {
		this.logger.info('RegisterPluginAssemblyUseCase started', {
			environmentId,
			name: input.name,
			hasSolution: Boolean(input.solutionUniqueName),
			pluginTypeCount: input.pluginTypes.length,
		});

		this.validateInput(input);

		const assemblyId = await this.assemblyRepository.register(
			environmentId,
			input.name.trim(),
			input.base64Content,
			input.solutionUniqueName
		);

		this.logger.info('Assembly registered, now registering plugin types', {
			assemblyId,
			typeCount: input.pluginTypes.length,
		});

		const pluginTypeIds = await this.registerPluginTypes(environmentId, assemblyId, input.pluginTypes);

		this.logger.info('RegisterPluginAssemblyUseCase completed', {
			assemblyId,
			name: input.name,
			registeredTypeCount: pluginTypeIds.length,
		});

		return { assemblyId, pluginTypeIds };
	}

	/** Validates registration input. */
	private validateInput(input: RegisterPluginAssemblyInput): void {
		if (!input.name || input.name.trim().length === 0) {
			throw new Error('Assembly name is required');
		}
		if (!input.base64Content || input.base64Content.length === 0) {
			throw new Error('Assembly content is required');
		}
		if (input.pluginTypes.length === 0) {
			throw new Error('At least one plugin type must be selected for registration');
		}
	}

	/** Registers plugin types for an assembly. */
	private async registerPluginTypes(
		environmentId: string,
		assemblyId: string,
		pluginTypes: readonly PluginTypeToRegister[]
	): Promise<string[]> {
		const pluginTypeIds: string[] = [];

		for (const pluginType of pluginTypes) {
			const pluginTypeId = await this.registerSinglePluginType(
				environmentId,
				assemblyId,
				pluginType
			);
			pluginTypeIds.push(pluginTypeId);
		}

		return pluginTypeIds;
	}

	/** Registers a single plugin type. */
	private async registerSinglePluginType(
		environmentId: string,
		assemblyId: string,
		pluginType: PluginTypeToRegister
	): Promise<string> {
		try {
			const isWorkflowActivity = pluginType.typeKind === 'WorkflowActivity';
			const pluginTypeId = await this.pluginTypeRepository.register(environmentId, {
				typeName: pluginType.typeName,
				friendlyName: pluginType.displayName,
				assemblyId,
				isWorkflowActivity,
				...(isWorkflowActivity && {
					workflowActivityGroupName: this.extractNamespace(pluginType.typeName),
				}),
			});

			this.logger.debug('Plugin type registered', {
				pluginTypeId,
				typeName: pluginType.typeName,
			});

			return pluginTypeId;
		} catch (error) {
			this.logger.error('Failed to register plugin type', {
				typeName: pluginType.typeName,
				error,
			});
			throw new Error(
				`Failed to register plugin type ${pluginType.displayName}: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	/**
	 * Extract namespace from fully qualified type name.
	 * Used for workflow activity group name.
	 */
	private extractNamespace(typeName: string): string {
		const lastDot = typeName.lastIndexOf('.');
		return lastDot > 0 ? typeName.substring(0, lastDot) : typeName;
	}
}
