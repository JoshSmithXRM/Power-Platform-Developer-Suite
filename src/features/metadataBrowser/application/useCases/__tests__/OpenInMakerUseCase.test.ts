import { OpenInMakerUseCase } from '../OpenInMakerUseCase';
import { ILogger } from '../../../../../infrastructure/logging/ILogger';
import { IBrowserService } from '../../../../../shared/infrastructure/interfaces/IBrowserService';
import { Environment } from '../../../../environmentSetup/domain/entities/Environment';
import { NullLogger } from '../../../../../infrastructure/logging/NullLogger';

describe('OpenInMakerUseCase', () => {
    let getEnvironmentById: jest.Mock;
    let browserService: jest.Mocked<IBrowserService>;
    let logger: ILogger;
    let useCase: OpenInMakerUseCase;

    const createMockEnvironment = (
        id: string,
        ppEnvId?: string
    ): Environment => {
        return {
            id: { getValue: () => id },
            getPowerPlatformEnvironmentId: jest.fn(() => ppEnvId)
        } as unknown as Environment;
    };

    beforeEach(() => {
        getEnvironmentById = jest.fn();

        browserService = {
            openExternal: jest.fn()
        } as jest.Mocked<IBrowserService>;

        logger = new NullLogger();
        jest.spyOn(logger, 'debug');
        jest.spyOn(logger, 'info');
        jest.spyOn(logger, 'error');

        useCase = new OpenInMakerUseCase(getEnvironmentById, browserService, logger);
    });

    describe('execute', () => {
        it('should open Maker portal with correct URL when environment has PP environment ID', async () => {
            const ppEnvId = 'guid-1234-5678-abcd';
            const environment = createMockEnvironment('env-123', ppEnvId);

            getEnvironmentById.mockResolvedValue(environment);
            browserService.openExternal.mockResolvedValue();

            await useCase.execute('env-123');

            const expectedUrl = `https://make.powerapps.com/environments/${ppEnvId}/entities`;
            expect(browserService.openExternal).toHaveBeenCalledWith(expectedUrl);
        });

        it('should log debug message at start', async () => {
            const environment = createMockEnvironment('env-456', 'guid-1234');
            getEnvironmentById.mockResolvedValue(environment);
            browserService.openExternal.mockResolvedValue();

            await useCase.execute('env-456');

            expect(logger.debug).toHaveBeenCalledWith('Opening in Maker portal', {
                environmentId: 'env-456'
            });
        });

        it('should log info message with URL before opening', async () => {
            const ppEnvId = 'guid-test';
            const environment = createMockEnvironment('env-789', ppEnvId);
            getEnvironmentById.mockResolvedValue(environment);
            browserService.openExternal.mockResolvedValue();

            await useCase.execute('env-789');

            const expectedUrl = `https://make.powerapps.com/environments/${ppEnvId}/entities`;
            expect(logger.info).toHaveBeenCalledWith('Opening Maker portal', {
                url: expectedUrl
            });
        });

        it('should throw error when environment is not found', async () => {
            getEnvironmentById.mockResolvedValue(null);

            await expect(useCase.execute('non-existent')).rejects.toThrow('Environment not found: non-existent');

            expect(browserService.openExternal).not.toHaveBeenCalled();
        });

        it('should throw error when environment has no PP environment ID', async () => {
            const environment = createMockEnvironment('env-123', undefined);
            getEnvironmentById.mockResolvedValue(environment);

            await expect(useCase.execute('env-123')).rejects.toThrow(
                'Environment does not have a Power Platform Environment ID configured. Please edit the environment and add one.'
            );

            expect(browserService.openExternal).not.toHaveBeenCalled();
        });

        it('should throw error when environment has empty PP environment ID', async () => {
            const environment = createMockEnvironment('env-123', '');
            getEnvironmentById.mockResolvedValue(environment);

            await expect(useCase.execute('env-123')).rejects.toThrow(
                'Environment does not have a Power Platform Environment ID configured. Please edit the environment and add one.'
            );

            expect(browserService.openExternal).not.toHaveBeenCalled();
        });

        it('should log error and rethrow when getEnvironmentById fails', async () => {
            const error = new Error('Database failure');
            getEnvironmentById.mockRejectedValue(error);

            await expect(useCase.execute('env-123')).rejects.toThrow('Database failure');

            expect(logger.error).toHaveBeenCalledWith('Failed to open in Maker portal', error);
            expect(browserService.openExternal).not.toHaveBeenCalled();
        });

        it('should log error and rethrow when openExternal fails', async () => {
            const environment = createMockEnvironment('env-123', 'guid-test');
            getEnvironmentById.mockResolvedValue(environment);

            const error = new Error('Failed to open URL');
            browserService.openExternal.mockRejectedValue(error);

            await expect(useCase.execute('env-123')).rejects.toThrow('Failed to open URL');

            expect(logger.error).toHaveBeenCalledWith('Failed to open in Maker portal', error);
        });

        it('should call getEnvironmentById with correct parameter', async () => {
            const environment = createMockEnvironment('test-env-999', 'guid-test');
            getEnvironmentById.mockResolvedValue(environment);
            browserService.openExternal.mockResolvedValue();

            await useCase.execute('test-env-999');

            expect(getEnvironmentById).toHaveBeenCalledWith('test-env-999');
            expect(getEnvironmentById).toHaveBeenCalledTimes(1);
        });

        it('should build correct URL for different PP environment IDs', async () => {
            const testCases = [
                { ppEnvId: 'env-abc-123', expectedUrl: 'https://make.powerapps.com/environments/env-abc-123/entities' },
                { ppEnvId: 'different-guid', expectedUrl: 'https://make.powerapps.com/environments/different-guid/entities' },
                { ppEnvId: 'prod-env-id', expectedUrl: 'https://make.powerapps.com/environments/prod-env-id/entities' }
            ];

            for (const testCase of testCases) {
                const environment = createMockEnvironment('env-123', testCase.ppEnvId);
                getEnvironmentById.mockResolvedValue(environment);
                browserService.openExternal.mockResolvedValue();

                await useCase.execute('env-123');

                expect(browserService.openExternal).toHaveBeenCalledWith(testCase.expectedUrl);

                // Clear for next iteration
                browserService.openExternal.mockClear();
            }
        });

        it('should fetch environment before building URL', async () => {
            const environment = createMockEnvironment('env-123', 'guid-test');
            getEnvironmentById.mockResolvedValue(environment);
            browserService.openExternal.mockResolvedValue();

            await useCase.execute('env-123');

            // Verify both were called
            expect(getEnvironmentById).toHaveBeenCalled();
            expect(browserService.openExternal).toHaveBeenCalled();
        });
    });
});
