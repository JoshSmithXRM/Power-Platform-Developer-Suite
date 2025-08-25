import * as vscode from 'vscode';
import { AuthenticationService } from './AuthenticationService';
import { ODataService } from './ODataService';
import { StateService } from './StateService';

export class ServiceFactory {
    private static authService: AuthenticationService;
    private static odataService: ODataService;
    private static stateService: StateService;
    private static initialized = false;
    
    static initialize(context: vscode.ExtensionContext): void {
        if (ServiceFactory.initialized) {
            return;
        }
        
        ServiceFactory.authService = AuthenticationService.getInstance(context);
        ServiceFactory.odataService = new ODataService();
        ServiceFactory.stateService = StateService.getInstance(context);
        ServiceFactory.initialized = true;
        
        console.log('ServiceFactory initialized successfully');
    }
    
    static getAuthService(): AuthenticationService {
        if (!ServiceFactory.initialized) {
            throw new Error('ServiceFactory not initialized. Call initialize() first.');
        }
        return ServiceFactory.authService;
    }
    
    static getODataService(): ODataService {
        if (!ServiceFactory.initialized) {
            throw new Error('ServiceFactory not initialized. Call initialize() first.');
        }
        return ServiceFactory.odataService;
    }
    
    static getStateService(): StateService {
        if (!ServiceFactory.initialized) {
            throw new Error('ServiceFactory not initialized. Call initialize() first.');
        }
        return ServiceFactory.stateService;
    }
    
    static isInitialized(): boolean {
        return ServiceFactory.initialized;
    }
}
