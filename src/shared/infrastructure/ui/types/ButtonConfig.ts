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
	/**
	 * When true, the button will NOT receive a generic click handler from messaging.js.
	 * Use this when the behavior script attaches its own click handler that needs to
	 * collect additional data (e.g., form inputs) before sending the message.
	 */
	readonly customHandler?: boolean;
}

/**
 * Configuration for ActionButtonsSection.
 */
export interface ActionButtonsConfig {
	readonly buttons: ReadonlyArray<ButtonConfig>;
	readonly position?: 'left' | 'right' | 'center';
}
