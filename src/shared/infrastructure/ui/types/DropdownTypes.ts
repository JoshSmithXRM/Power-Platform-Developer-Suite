/**
 * Shared types for Dropdown components.
 * Extracted to avoid circular dependencies between section and view.
 */

/**
 * Dropdown item configuration.
 */
export interface DropdownItem {
	readonly id: string;
	readonly label: string;
	readonly icon?: string;
	readonly disabled?: boolean;
	readonly separator?: boolean;
}

/**
 * Dropdown render configuration.
 */
export interface DropdownRenderConfig {
	readonly id: string;
	readonly label: string;
	readonly icon?: string;
	readonly items: ReadonlyArray<DropdownItem>;
	readonly currentSelectionId?: string;
	readonly variant?: 'default' | 'primary' | 'danger';
}
