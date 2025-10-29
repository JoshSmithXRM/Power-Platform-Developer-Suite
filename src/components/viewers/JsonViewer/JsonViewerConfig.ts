import { BaseComponentConfig } from '../../base/BaseComponent';

export interface JsonViewerConfig extends BaseComponentConfig {
    /**
     * Initial JSON data to display (any valid JSON structure)
     */
    data?: unknown;

    /**
     * Enable collapsible sections for nested objects/arrays
     * @default true
     */
    collapsible?: boolean;

    /**
     * Show copy button
     * @default true
     */
    showCopy?: boolean;

    /**
     * Show line numbers
     * @default false
     */
    showLineNumbers?: boolean;

    /**
     * Maximum height for the viewer (CSS value)
     * @default 'none'
     */
    maxHeight?: string;

    /**
     * Depth at which to start collapsing nodes
     * - 999 (default) = all expanded
     * - 0 = all collapsed
     * - 1 = top level expanded, children collapsed
     * - 2 = top 2 levels expanded, rest collapsed
     * @default 999 (all expanded)
     */
    initialCollapseDepth?: number;
}

export const DEFAULT_JSON_VIEWER_CONFIG: Partial<JsonViewerConfig> = {
    collapsible: true,
    showCopy: true,
    showLineNumbers: false,
    maxHeight: 'none',
    initialCollapseDepth: 999 // Start fully expanded, but allow manual collapse
};
