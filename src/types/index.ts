import * as vscode from 'vscode';


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
// Using discriminated union for type-safe message handling
export * from './WebviewMessages';

export interface Environment {
    id: string;
    name: string;
    settings: {
        dataverseUrl: string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        [key: string]: any; // Dynamic environment settings - any is appropriate here
    };
    environmentId?: string;
}

// Re-export commonly used types from other modules
export { EnvironmentConnection } from '../models/PowerPlatformSettings';
export { AuthenticationMethod } from '../models/AuthenticationMethod';
