import { BaseComponentConfig } from '../../base/BaseComponent';

export interface JsonViewerConfig extends BaseComponentConfig {
    /**
     * Initial JSON data to display
     */
    data?: any;

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
     * Initial collapsed depth (0 = all expanded, 1 = first level expanded, etc.)
     * @default 0 (all expanded)
     */
    initialCollapseDepth?: number;
}

export const DEFAULT_JSON_VIEWER_CONFIG: Partial<JsonViewerConfig> = {
    collapsible: true,
    showCopy: true,
    showLineNumbers: false,
    maxHeight: 'none',
    initialCollapseDepth: 0
};
