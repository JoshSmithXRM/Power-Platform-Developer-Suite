import * as vscode from 'vscode';

import { ILogger } from '../logging/ILogger';
import { OutputChannelLogger } from '../logging/OutputChannelLogger';
import { IEnvironmentRepository } from '../../features/environmentSetup/domain/interfaces/IEnvironmentRepository';
import { EnvironmentRepository } from '../../features/environmentSetup/infrastructure/repositories/EnvironmentRepository';
import { EnvironmentDomainMapper } from '../../features/environmentSetup/infrastructure/mappers/EnvironmentDomainMapper';
import { MsalAuthenticationService } from '../../features/environmentSetup/infrastructure/services/MsalAuthenticationService';
import { WhoAmIService } from '../../features/environmentSetup/infrastructure/services/WhoAmIService';
import { PowerPlatformApiService } from '../../features/environmentSetup/infrastructure/services/PowerPlatformApiService';
import { VsCodeEventPublisher } from '../../features/environmentSetup/infrastructure/services/VsCodeEventPublisher';

/**
 * Container for core infrastructure services shared across all features.
 * Created once at extension activation and provides foundational services.
 *
 * Services are created in dependency order to ensure all dependencies are available.
 */
export class CoreServicesContainer {
	public readonly logger: ILogger;
	public readonly environmentRepository: IEnvironmentRepository;
	public readonly authService: MsalAuthenticationService;
	public readonly whoAmIService: WhoAmIService;
	public readonly powerPlatformApiService: PowerPlatformApiService;
	public readonly eventPublisher: VsCodeEventPublisher;

	constructor(context: vscode.ExtensionContext) {
		// Create logger first (no dependencies)
		const outputChannel = vscode.window.createOutputChannel('Power Platform Developer Suite', { log: true });
		this.logger = new OutputChannelLogger(outputChannel);

		// Create environment repository (depends on logger)
		const environmentDomainMapper = new EnvironmentDomainMapper(this.logger);
		this.environmentRepository = new EnvironmentRepository(
			context.globalState,
			context.secrets,
			environmentDomainMapper,
			this.logger
		);

		// Create event publisher (depends on logger)
		this.eventPublisher = new VsCodeEventPublisher(this.logger);

		// Create authentication service (depends on logger)
		this.authService = new MsalAuthenticationService(this.logger);

		// Create WhoAmI service (depends on auth, logger)
		this.whoAmIService = new WhoAmIService(this.authService, this.logger);

		// Create Power Platform API service (depends on auth, logger)
		this.powerPlatformApiService = new PowerPlatformApiService(this.authService, this.logger);
	}
}
