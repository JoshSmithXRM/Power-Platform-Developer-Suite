import * as vscode from 'vscode';
import { AuthenticationService } from './AuthenticationService';
import { StateService } from './StateService';
import { SolutionService } from './SolutionService';
import { ConnectionReferencesService } from './ConnectionReferencesService';
import { DeploymentSettingsService } from './DeploymentSettingsService';
import { EnvironmentVariablesService } from './EnvironmentVariablesService';
import { UrlBuilderService } from './UrlBuilderService';
import { SolutionComponentService } from './SolutionComponentService';

export class ServiceFactory {
    private static authService: AuthenticationService;
    private static stateService: StateService;
    private static solutionService: SolutionService;
    private static connectionReferencesService: ConnectionReferencesService;
    private static deploymentSettingsService: DeploymentSettingsService;
    private static environmentVariablesService: EnvironmentVariablesService;
    private static solutionComponentService: SolutionComponentService;
    private static initialized = false;
    
    static initialize(context: vscode.ExtensionContext): void {
        if (ServiceFactory.initialized) {
            return;
        }
        
        ServiceFactory.authService = AuthenticationService.getInstance(context);
        ServiceFactory.stateService = StateService.getInstance(context);
    ServiceFactory.solutionService = new SolutionService(ServiceFactory.authService);
    ServiceFactory.connectionReferencesService = new ConnectionReferencesService(ServiceFactory.authService);
        ServiceFactory.deploymentSettingsService = new DeploymentSettingsService();
        ServiceFactory.environmentVariablesService = new EnvironmentVariablesService(ServiceFactory.authService);
        ServiceFactory.solutionComponentService = new SolutionComponentService(ServiceFactory.authService);
        ServiceFactory.initialized = true;        console.log('ServiceFactory initialized successfully');
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
    
    static getUrlBuilderService(): typeof UrlBuilderService {
        return UrlBuilderService;
    }
    
    static isInitialized(): boolean {
        return ServiceFactory.initialized;
    }
}
