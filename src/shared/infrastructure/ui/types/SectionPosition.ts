/**
 * Defines where a section should be rendered in the panel layout.
 * Used by ISection to specify placement in layout templates.
 */
export enum SectionPosition {
	/** Top toolbar area (e.g., trace level controls, global actions) */
	Toolbar = 'toolbar',

	/** Header area below toolbar (e.g., environment dropdown, breadcrumbs) */
	Header = 'header',

	/** Filter controls area (e.g., search, dropdowns, date pickers) */
	Filters = 'filters',

	/** Main content area (e.g., data table, tree view, primary content) */
	Main = 'main',

	/** Detail/preview area (e.g., detail panel, inspector, properties) */
	Detail = 'detail',

	/** Footer area (e.g., action buttons, pagination, status) */
	Footer = 'footer',
}
