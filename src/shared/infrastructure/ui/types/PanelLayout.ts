/**
 * Defines layout templates for panel composition.
 * Determines how sections are arranged in the panel.
 */
export enum PanelLayout {
	/** Single vertical column (most panels) */
	SingleColumn = 'single-column',

	/** Horizontal split view (main + detail side-by-side) */
	SplitHorizontal = 'split-horizontal',

	/** Vertical split view (main + detail stacked) */
	SplitVertical = 'split-vertical',

	/** Three-panel layout (future - for Metadata Browser) */
	ThreePanel = 'three-panel',
}
