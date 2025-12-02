/**
 * Shared types for EnvironmentSelector components.
 * Extracted to avoid circular dependencies between section and view.
 */

export interface EnvironmentOption {
	readonly id: string;
	readonly name: string;
	readonly isDefault?: boolean;
}

export interface EnvironmentSelectorConfig {
	readonly label?: string;
}
