import * as vscode from 'vscode';

import { ComponentFactory } from '../factories/ComponentFactory';
import { PanelComposer } from '../factories/PanelComposer';

import { AuthenticationService } from './AuthenticationService';
import { SolutionService } from './SolutionService';
import { ConnectionReferencesService } from './ConnectionReferencesService';
import { DeploymentSettingsService } from './DeploymentSettingsService';
import { EnvironmentVariablesService } from './EnvironmentVariablesService';
import { UrlBuilderService } from './UrlBuilderService';
import { SolutionComponentService } from './SolutionComponentService';
import { PluginTraceService } from './PluginTraceService';
import { MetadataService } from './MetadataService';
import { DataverseQueryService } from './DataverseQueryService';
import { DataverseMetadataService } from './DataverseMetadataService';
import { LoggerService } from './LoggerService';
import { ImportJobService } from './ImportJobService';
import { XmlFormatterService } from './XmlFormatterService';
import { IStateRepository, InMemoryStateRepository, VSCodeStateRepository } from './state';

export class ServiceFactory {
    private static authService: AuthenticationService;
    private static solutionService: SolutionService;
    private static connectionReferencesService: ConnectionReferencesService;
    private static deploymentSettingsService: DeploymentSettingsService;
    private static environmentVariablesService: EnvironmentVariablesService;
    private static solutionComponentService: SolutionComponentService;
    private static pluginTraceService: PluginTraceService;
    private static metadataService: MetadataService;
    private static dataverseQueryService: DataverseQueryService;
    private static dataverseMetadataService: DataverseMetadataService;
    private static loggerService: LoggerService;
    private static importJobService: ImportJobService;
    private static xmlFormatterService: XmlFormatterService;
    private static componentFactory: ComponentFactory;
    private static panelComposers: Map<string, PanelComposer> = new Map();

    // New state repositories
    private static instanceStateRepository: IStateRepository;
    private static preferencesRepository: IStateRepository;

    private static initialized = false;
    
    static initialize(context: vscode.ExtensionContext): void {
        if (ServiceFactory.initialized) {
            return;
        }

        // Initialize LoggerService FIRST to avoid circular dependency issues
        ServiceFactory.loggerService = LoggerService.getInstance();

        // Initialize state repositories
        ServiceFactory.instanceStateRepository = new InMemoryStateRepository();
        ServiceFactory.preferencesRepository = new VSCodeStateRepository(context);

        // Now initialize all other services
        ServiceFactory.authService = AuthenticationService.getInstance(context);
        ServiceFactory.solutionService = new SolutionService(ServiceFactory.authService);
        ServiceFactory.connectionReferencesService = new ConnectionReferencesService(ServiceFactory.authService);
        ServiceFactory.deploymentSettingsService = new DeploymentSettingsService();
        ServiceFactory.environmentVariablesService = new EnvironmentVariablesService(ServiceFactory.authService);
        ServiceFactory.solutionComponentService = new SolutionComponentService(ServiceFactory.authService);
        ServiceFactory.pluginTraceService = new PluginTraceService(ServiceFactory.authService);
        ServiceFactory.metadataService = new MetadataService(ServiceFactory.authService);
        ServiceFactory.dataverseQueryService = new DataverseQueryService(ServiceFactory.authService);
        ServiceFactory.dataverseMetadataService = new DataverseMetadataService(ServiceFactory.authService);
        ServiceFactory.xmlFormatterService = new XmlFormatterService();
        ServiceFactory.importJobService = new ImportJobService(ServiceFactory.authService, ServiceFactory.xmlFormatterService);

        ServiceFactory.initialized = true;

        // Use logger service instead of console.log
        ServiceFactory.loggerService.info('ServiceFactory', 'All services initialized successfully');
    }
    
    static getAuthService(): AuthenticationService {
        if (!ServiceFactory.initialized) {
            throw new Error('ServiceFactory not initialized. Call initialize() first.');
        }
        return ServiceFactory.authService;
    }

    static getSolutionService(): SolutionService {
        if (!ServiceFactory.initialized) {
            throw new Error('ServiceFactory not initialized. Call initialize() first.');
        }
        return ServiceFactory.solutionService;
    }

    static getConnectionReferencesService(): ConnectionReferencesService {
        if (!ServiceFactory.initialized) {
            throw new Error('ServiceFactory not initialized. Call initialize() first.');
        }
        return ServiceFactory.connectionReferencesService;
    }

    static getDeploymentSettingsService(): DeploymentSettingsService {
        if (!ServiceFactory.initialized) {
            throw new Error('ServiceFactory not initialized. Call initialize() first.');
        }
        return ServiceFactory.deploymentSettingsService;
    }

    static getEnvironmentVariablesService(): EnvironmentVariablesService {
        if (!ServiceFactory.initialized) {
            throw new Error('ServiceFactory not initialized. Call initialize() first.');
        }
        return ServiceFactory.environmentVariablesService;
    }
    
    static getSolutionComponentService(): SolutionComponentService {
        if (!ServiceFactory.initialized) {
            throw new Error('ServiceFactory not initialized. Call initialize() first.');
        }
        return ServiceFactory.solutionComponentService;
    }

    static getPluginTraceService(): PluginTraceService {
        if (!ServiceFactory.initialized) {
            throw new Error('ServiceFactory not initialized. Call initialize() first.');
        }
        return ServiceFactory.pluginTraceService;
    }

    static getMetadataService(): MetadataService {
        if (!ServiceFactory.initialized) {
            throw new Error('ServiceFactory not initialized. Call initialize() first.');
        }
        return ServiceFactory.metadataService;
    }

    static getDataverseQueryService(): DataverseQueryService {
        if (!ServiceFactory.initialized) {
            throw new Error('ServiceFactory not initialized. Call initialize() first.');
        }
        return ServiceFactory.dataverseQueryService;
    }

    static getDataverseMetadataService(): DataverseMetadataService {
        if (!ServiceFactory.initialized) {
            throw new Error('ServiceFactory not initialized. Call initialize() first.');
        }
        return ServiceFactory.dataverseMetadataService;
    }
    
    static getLoggerService(): LoggerService {
        // For LoggerService, we allow access during initialization to prevent circular deps
        if (!ServiceFactory.loggerService) {
            ServiceFactory.loggerService = LoggerService.getInstance();
        }
        return ServiceFactory.loggerService;
    }
    
    static getUrlBuilderService(): typeof UrlBuilderService {
        return UrlBuilderService;
    }

    static getImportJobService(): ImportJobService {
        if (!ServiceFactory.initialized) {
            throw new Error('ServiceFactory not initialized. Call initialize() first.');
        }
        return ServiceFactory.importJobService;
    }

    static getXmlFormatterService(): XmlFormatterService {
        if (!ServiceFactory.initialized) {
            throw new Error('ServiceFactory not initialized. Call initialize() first.');
        }
        return ServiceFactory.xmlFormatterService;
    }

    static getComponentFactory(): ComponentFactory {
        if (!ServiceFactory.componentFactory) {
            ServiceFactory.componentFactory = new ComponentFactory();
        }
        return ServiceFactory.componentFactory;
    }

    static getPanelComposer(extensionUri: vscode.Uri): PanelComposer {
        const uriKey = extensionUri.toString();
        if (!ServiceFactory.panelComposers.has(uriKey)) {
            ServiceFactory.panelComposers.set(uriKey, new PanelComposer(extensionUri));
        }
        return ServiceFactory.panelComposers.get(uriKey)!;
    }

    /**
     * Get the instance state repository (volatile, in-memory)
     * Used for storing per-panel-instance state (e.g., which environment a specific tab is viewing)
     */
    static getInstanceStateRepository(): IStateRepository {
        if (!ServiceFactory.initialized) {
            throw new Error('ServiceFactory not initialized. Call initialize() first.');
        }
        return ServiceFactory.instanceStateRepository;
    }

    /**
     * Get the preferences repository (persistent, VS Code GlobalState)
     * Used for storing user preferences per environment (e.g., filters, sort order, split ratios)
     */
    static getPreferencesRepository(): IStateRepository {
        if (!ServiceFactory.initialized) {
            throw new Error('ServiceFactory not initialized. Call initialize() first.');
        }
        return ServiceFactory.preferencesRepository;
    }

    static isInitialized(): boolean {
        return ServiceFactory.initialized;
    }
}
