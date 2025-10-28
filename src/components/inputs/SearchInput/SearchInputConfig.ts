import { BaseComponentConfig } from '../../base/ComponentInterface';

/**
 * Icon position for the search input
 */
export type SearchInputIconPosition = 'left' | 'right' | 'none';

/**
 * Size variant for the search input
 */
export type SearchInputSize = 'default' | 'compact';

/**
 * Configuration interface for SearchInputComponent
 * Provides type-safe configuration for search/filter inputs with debouncing and validation
 */
export interface SearchInputConfig extends BaseComponentConfig {
    /**
     * Placeholder text shown when input is empty
     * @default 'Search...'
     */
    placeholder?: string;

    /**
     * Debounce delay in milliseconds before triggering search
     * @default 300
     */
    debounceMs?: number;

    /**
     * Minimum number of characters required before triggering search
     * @default 0 (no minimum)
     */
    minChars?: number;

    /**
     * Position of the search icon
     * @default 'left'
     */
    iconPosition?: SearchInputIconPosition;

    /**
     * Custom icon to display (emoji or unicode)
     * @default '🔍'
     */
    icon?: string;

    /**
     * ARIA label for accessibility
     * @default 'Search'
     */
    ariaLabel?: string;

    /**
     * Size variant
     * @default 'default'
     */
    size?: SearchInputSize;

    /**
     * Initial query value
     */
    initialQuery?: string;

    /**
     * Whether the input is disabled
     * @default false
     */
    disabled?: boolean;

    /**
     * Callback function when search is triggered
     */
    onSearch?: (query: string) => void;
}

/**
 * Data interface for SearchInput component
 * Used for event bridge updates from Extension Host to Webview
 */
export interface SearchInputData {
    /**
     * Current search query value
     */
    query: string;

    /**
     * Whether the input is disabled
     */
    disabled?: boolean;
}

/**
 * Default configuration values
 */
export const DEFAULT_SEARCH_INPUT_CONFIG: Partial<SearchInputConfig> = {
    placeholder: 'Search...',
    debounceMs: 300,
    minChars: 0,
    iconPosition: 'left',
    icon: '🔍',
    ariaLabel: 'Search',
    size: 'default',
    disabled: false,
    initialQuery: ''
};

/**
 * CSS class constants specific to SearchInput
 */
export const SEARCH_INPUT_CSS = {
    CONTAINER: 'search-input-container',
    INPUT: 'search-input',
    ICON: 'search-input-icon',

    // Base classes
    BASE_CONTAINER: 'base-search-input-container',
    BASE_INPUT: 'base-search-input',
    BASE_ICON: 'base-search-input-icon',

    // Icon position variants
    ICON_LEFT: 'base-search-input--with-icon-left',
    ICON_RIGHT: 'base-search-input--with-icon-right',
    ICON_POSITION_LEFT: 'base-search-input-icon--left',
    ICON_POSITION_RIGHT: 'base-search-input-icon--right',

    // Size variants
    COMPACT: 'base-search-input--compact',

    // State modifiers
    DISABLED: 'search-input--disabled'
};
