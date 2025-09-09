import * as vscode from 'vscode';
import { AuthenticationService } from '../services/AuthenticationService';

// Shared types for the extension
export interface PanelConfig {
    viewType: string;
    title: string;
    enableScripts?: boolean;
    retainContextWhenHidden?: boolean;
    enableFindWidget?: boolean;
    localResourceRoots?: vscode.Uri[];
}

// Base interface for all webview panels
export interface IPanelBase {
    readonly viewType: string;
    dispose(): void;
}

// Message types for webview communication
export interface WebviewMessage {
    action: string;
    [key: string]: any;
}

export interface Environment {
    id: string;
    name: string;
    settings: {
        dataverseUrl: string;
        [key: string]: any;
    };
    environmentId?: string;
}

// Re-export commonly used types from other modules
export { EnvironmentConnection } from '../models/PowerPlatformSettings';
export { AuthenticationMethod } from '../models/AuthenticationMethod';

// Re-export new types from services and components
export { PanelState, StateChangedEvent } from '../services/StateService';
// Component types will be re-exported here once ComponentFactory is implemented
