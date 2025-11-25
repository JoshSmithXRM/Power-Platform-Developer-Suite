/**
 * Shared types for EnvironmentSelector components.
 * Extracted to avoid circular dependencies between section and view.
 */

export interface EnvironmentOption {
	readonly id: string;
	readonly name: string;
}

export interface EnvironmentSelectorConfig {
	readonly label?: string;
}
