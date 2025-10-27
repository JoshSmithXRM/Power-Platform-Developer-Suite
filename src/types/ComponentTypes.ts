// Component-specific TypeScript type definitions
// This file will contain interfaces and types for the component-based architecture

export interface BaseComponentConfig {
    id: string;
    className?: string;
}

export interface WebviewResources {
    getCSSUri(path: string): string;
    getScriptUri(path: string): string;
}

// Additional component types will be defined here as we build components