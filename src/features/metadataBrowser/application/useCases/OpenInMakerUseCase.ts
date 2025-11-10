import type { Environment } from '../../../environmentSetup/domain/entities/Environment';
import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { IBrowserService } from '../../../../shared/infrastructure/interfaces/IBrowserService';

/**
 * Opens entity list in Power Apps Maker portal.
 *
 * Orchestration:
 * 1. Fetch environment to get Power Platform environment ID
 * 2. Build URL for entities list
 * 3. Open URL in external browser
 *
 * Note: Opening specific entity/choice not supported in MVP.
 * Opens entities list page in Maker portal.
 */
export class OpenInMakerUseCase {
    constructor(
        private readonly getEnvironmentById: (envId: string) => Promise<Environment | null>,
        private readonly browserService: IBrowserService,
        private readonly logger: ILogger
    ) {}

    public async execute(environmentId: string): Promise<void> {
        this.logger.debug('Opening in Maker portal', { environmentId });

        try {
            // Fetch environment
            const environment = await this.getEnvironmentById(environmentId);

            if (!environment) {
                throw new Error(`Environment not found: ${environmentId}`);
            }

            const ppEnvId = environment.getPowerPlatformEnvironmentId();

            if (!ppEnvId) {
                throw new Error('Environment does not have a Power Platform Environment ID configured. Please edit the environment and add one.');
            }

            // Build Maker URL for entities list
            const url = `https://make.powerapps.com/environments/${ppEnvId}/entities`;

            this.logger.info('Opening Maker portal', { url });

            // Open in external browser
            await this.browserService.openExternal(url);
        } catch (error: unknown) {
            this.logger.error('Failed to open in Maker portal', error);
            throw error;
        }
    }
}
