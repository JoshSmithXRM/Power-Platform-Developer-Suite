import { BaseComponent } from '../../base/BaseComponent';

import { SearchInputConfig, SearchInputData } from './SearchInputConfig';
import { SearchInputView } from './SearchInputView';

/**
 * SearchInputComponent
 * Reusable search/filter input component with debouncing and validation
 *
 * Features:
 * - Configurable debounce delay
 * - Minimum character validation
 * - Icon positioning (left/right/none)
 * - Size variants (default/compact)
 * - Enter key support for immediate search
 * - Event-driven architecture
 *
 * Usage:
 * ```typescript
 * const searchInput = ComponentFactory.createSearchInput({
 *     id: 'my-search',
 *     placeholder: 'Search items...',
 *     debounceMs: 300,
 *     minChars: 3,
 *     onSearch: (query) => console.log('Searching:', query)
 * });
 * ```
 */
export class SearchInputComponent extends BaseComponent<SearchInputData> {
    private currentQuery: string;

    constructor(config: SearchInputConfig) {
        super(config);
        this.currentQuery = config.initialQuery || '';
    }

    /**
     * Get component type identifier
     */
    public getType(): string {
        return 'SearchInput';
    }

    /**
     * Get component data for event bridge updates
     */
    public getData(): SearchInputData {
        const config = this.config as SearchInputConfig;
        return {
            query: this.currentQuery,
            disabled: config.disabled
        };
    }

    /**
     * Generate HTML for this search input component
     */
    public generateHTML(): string {
        return SearchInputView.generateHTML(this.config as SearchInputConfig, this.getData());
    }

    /**
     * Get the CSS file path for this component
     * Note: SearchInput uses base CSS from component-base.css
     */
    public getCSSFile(): string {
        return ''; // Uses base-search-input classes from component-base.css
    }

    /**
     * Get the behavior script file path
     */
    public getBehaviorScript(): string {
        return 'js/components/SearchInputBehavior.js';
    }

    /**
     * Get default CSS class name
     */
    protected getDefaultClassName(): string {
        return 'search-input';
    }

    /**
     * Set the search query programmatically
     * Triggers componentUpdate event to sync with webview
     */
    public setQuery(query: string): void {
        this.currentQuery = query;
        this.notifyUpdate();
    }

    /**
     * Clear the search query
     */
    public clearQuery(): void {
        this.setQuery('');
    }

    /**
     * Get the current search query
     */
    public getQuery(): string {
        return this.currentQuery;
    }

    /**
     * Set the disabled state
     */
    public setDisabled(disabled: boolean): void {
        const config = this.config as SearchInputConfig;
        config.disabled = disabled;
        this.notifyUpdate();
    }

    /**
     * Check if input is disabled
     */
    public isDisabled(): boolean {
        const config = this.config as SearchInputConfig;
        return config.disabled || false;
    }

    /**
     * Update component configuration
     */
    public updateConfig(newConfig: Partial<SearchInputConfig>): void {
        Object.assign(this.config, newConfig);
        this.notifyUpdate();
    }
}
