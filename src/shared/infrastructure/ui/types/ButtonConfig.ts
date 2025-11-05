/**
 * Button configuration types for ActionButtonsSection.
 */

/**
 * Configuration for a single button.
 */
export interface ButtonConfig {
	readonly id: string;
	readonly label: string;
	readonly icon?: string;
	readonly variant?: 'default' | 'primary' | 'danger';
	readonly disabled?: boolean;
}

/**
 * Configuration for ActionButtonsSection.
 */
export interface ActionButtonsConfig {
	readonly buttons: ReadonlyArray<ButtonConfig>;
	readonly position?: 'left' | 'right' | 'center';
}
