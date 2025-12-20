import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type {
	ICustomApiRepository,
	RegisterCustomApiInput,
	CustomApiParameterInput,
} from '../../domain/interfaces/ICustomApiRepository';
import type {
	ICustomApiParameterRepository,
	RegisterCustomApiParameterInput,
} from '../../domain/interfaces/ICustomApiParameterRepository';

/**
 * Use case for registering a new Custom API with optional parameters.
 *
 * Orchestration only - no business logic:
 * 1. Create the Custom API
 * 2. Create request parameters (if provided)
 * 3. Create response properties (if provided)
 *
 * Note: Parameters must be created after the API exists (OData bind requires existing parent).
 */
export class RegisterCustomApiUseCase {
	constructor(
		private readonly customApiRepository: ICustomApiRepository,
		private readonly customApiParameterRepository: ICustomApiParameterRepository,
		private readonly logger: ILogger
	) {}

	/**
	 * Register a new Custom API with optional parameters.
	 *
	 * @param environmentId - Target environment
	 * @param input - Custom API registration input (includes parameters)
	 * @returns The ID of the created Custom API
	 */
	public async execute(environmentId: string, input: RegisterCustomApiInput): Promise<string> {
		this.logger.info('RegisterCustomApiUseCase started', {
			environmentId,
			name: input.name,
			uniqueName: input.uniqueName,
			requestParameterCount: input.requestParameters?.length ?? 0,
			responsePropertyCount: input.responseProperties?.length ?? 0,
		});

		// Create the Custom API first
		const customApiId = await this.customApiRepository.register(environmentId, input);

		// Create request parameters sequentially (order matters for some consumers)
		if (input.requestParameters !== undefined && input.requestParameters.length > 0) {
			await this.createParameters(
				environmentId,
				customApiId,
				input.requestParameters,
				'request'
			);
		}

		// Create response properties sequentially
		if (input.responseProperties !== undefined && input.responseProperties.length > 0) {
			await this.createParameters(
				environmentId,
				customApiId,
				input.responseProperties,
				'response'
			);
		}

		this.logger.info('RegisterCustomApiUseCase completed', {
			customApiId,
			name: input.name,
		});

		return customApiId;
	}

	private async createParameters(
		environmentId: string,
		customApiId: string,
		parameters: readonly CustomApiParameterInput[],
		direction: 'request' | 'response'
	): Promise<void> {
		this.logger.debug(`Creating ${direction} parameters`, {
			customApiId,
			count: parameters.length,
		});

		for (const param of parameters) {
			const paramInput: RegisterCustomApiParameterInput = {
				customApiId,
				name: param.name,
				uniqueName: param.uniqueName,
				displayName: param.displayName,
				description: param.description,
				type: param.type,
				logicalEntityName: param.logicalEntityName,
				isOptional: direction === 'request' ? param.isOptional : undefined,
				direction,
			};

			await this.customApiParameterRepository.register(environmentId, paramInput);
		}

		this.logger.debug(`Created ${direction} parameters`, {
			customApiId,
			count: parameters.length,
		});
	}
}
