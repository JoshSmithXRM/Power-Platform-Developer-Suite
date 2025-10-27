/**
 * SplitPanelConfig - Configuration for Split Panel Component
 *
 * Defines the structure for resizable split panel layouts
 */

export type SplitOrientation = 'horizontal' | 'vertical';

export interface SplitPanelConfig {
    id: string;
    orientation: SplitOrientation; // horizontal = side-by-side, vertical = top-bottom
    initialSplit: number; // Percentage (0-100) for left/top panel size
    minSize: number; // Minimum panel size in pixels
    resizable: boolean; // Allow user to resize
    leftContent: string; // HTML content for left/top panel
    rightContent: string; // HTML content for right/bottom panel
    rightPanelClosable: boolean; // Can right panel be closed
    rightPanelDefaultHidden: boolean; // Start with right panel hidden
}

export const DEFAULT_SPLIT_PANEL_CONFIG: Partial<SplitPanelConfig> = {
    orientation: 'horizontal',
    initialSplit: 50,
    minSize: 200,
    resizable: true,
    rightPanelClosable: false,
    rightPanelDefaultHidden: false
};
