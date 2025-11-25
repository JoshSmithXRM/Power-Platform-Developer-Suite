/**
 * Shared type definitions for DataTable panels.
 *
 * These types are used by the composition-based DataTable architecture:
 * - Composed panels (ImportJobViewerPanelComposed, etc.)
 * - Behaviors (EnvironmentBehavior, SolutionFilterBehavior, etc.)
 * - Coordinators (DataTablePanelCoordinator)
 * - View renderers (dataTable.ts)
 */

/**
 * Represents an environment option in the environment selector dropdown.
 */
export interface EnvironmentOption {
	readonly id: string;
	readonly name: string;
	readonly url: string;
}

/**
 * Represents a column definition in the data table.
 */
export interface DataTableColumn {
	readonly key: string;
	readonly label: string;
	readonly width?: string; // CSS width value (e.g., '20%', '150px', 'auto')
}

/**
 * Configuration for a custom toolbar button.
 * Buttons are rendered in the toolbar and send commands to the panel when clicked.
 */
export interface ToolbarButtonConfig {
	/** Unique button ID for DOM manipulation */
	readonly id: string;
	/** Button display text */
	readonly label: string;
	/** Webview command to send when clicked */
	readonly command: string;
	/** Button position in toolbar (default: 'left') */
	readonly position?: 'left' | 'right';
}

/**
 * Configuration for a DataTable panel.
 * Defines the panel's structure, behavior, and UI elements.
 */
export interface DataTableConfig {
	readonly viewType: string;
	readonly title: string;
	readonly dataCommand: string;
	readonly defaultSortColumn: string;
	readonly defaultSortDirection: 'asc' | 'desc';
	readonly columns: ReadonlyArray<DataTableColumn>;
	readonly searchPlaceholder: string;
	readonly noDataMessage: string;
	readonly enableSearch?: boolean; // Default: true
	readonly enableSolutionFilter?: boolean; // Default: false
	readonly toolbarButtons: ReadonlyArray<ToolbarButtonConfig>; // All toolbar buttons (required for full control)
}

/**
 * Represents a solution option in the solution filter dropdown.
 */
export interface SolutionOption {
	readonly id: string;
	readonly name: string;
	readonly uniqueName: string;
}
