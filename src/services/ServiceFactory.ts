import * as vscode from 'vscode';

import { ComponentFactory } from '../factories/ComponentFactory';
import { PanelComposer } from '../factories/PanelComposer';

import { AuthenticationService } from './AuthenticationService';
import { StateService } from './StateService';
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

export class ServiceFactory {
    private static authService: AuthenticationService;
    private static stateService: StateService;
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
    private static initialized = false;
    
    static initialize(context: vscode.ExtensionContext): void {
        if (ServiceFactory.initialized) {
            return;
        }
        
        // Initialize LoggerService FIRST to avoid circular dependency issues
        ServiceFactory.loggerService = LoggerService.getInstance();
        
        // Now initialize all other services
        ServiceFactory.authService = AuthenticationService.getInstance(context);
        ServiceFactory.stateService = StateService.getInstance(context);
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
    
    static getStateService(): StateService {
        if (!ServiceFactory.initialized) {
            throw new Error('ServiceFactory not initialized. Call initialize() first.');
        }
        return ServiceFactory.stateService;
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

    static isInitialized(): boolean {
        return ServiceFactory.initialized;
    }
}
