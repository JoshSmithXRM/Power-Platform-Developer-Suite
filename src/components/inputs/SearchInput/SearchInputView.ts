import { escapeHtml } from '../../base/HtmlUtils';

import {
    SearchInputConfig,
    SearchInputData,
    SEARCH_INPUT_CSS,
    DEFAULT_SEARCH_INPUT_CONFIG
} from './SearchInputConfig';

/**
 * SearchInputView - HTML generation for SearchInput component
 * This runs in Extension Host context and generates the HTML structure
 */
export class SearchInputView {
    /**
     * Generate the complete HTML for the SearchInput component
     */
    public static generateHTML(config: SearchInputConfig, data: SearchInputData): string {
        // Merge with defaults
        const mergedConfig: Required<SearchInputConfig> = {
            ...DEFAULT_SEARCH_INPUT_CONFIG,
            ...config
        } as Required<SearchInputConfig>;

        const {
            id,
            placeholder,
            iconPosition,
            icon,
            ariaLabel,
            size,
            className
        } = mergedConfig;

        const { query, disabled } = data;

        // Build CSS classes
        const containerClass = [
            SEARCH_INPUT_CSS.BASE_CONTAINER,
            SEARCH_INPUT_CSS.CONTAINER,
            className
        ].filter(Boolean).join(' ');

        const inputClass = [
            SEARCH_INPUT_CSS.BASE_INPUT,
            SEARCH_INPUT_CSS.INPUT,
            iconPosition !== 'none' ? (iconPosition === 'left' ? SEARCH_INPUT_CSS.ICON_LEFT : SEARCH_INPUT_CSS.ICON_RIGHT) : '',
            size === 'compact' ? SEARCH_INPUT_CSS.COMPACT : '',
            disabled ? SEARCH_INPUT_CSS.DISABLED : ''
        ].filter(Boolean).join(' ');

        const iconClass = [
            SEARCH_INPUT_CSS.BASE_ICON,
            SEARCH_INPUT_CSS.ICON,
            iconPosition === 'left' ? SEARCH_INPUT_CSS.ICON_POSITION_LEFT : SEARCH_INPUT_CSS.ICON_POSITION_RIGHT
        ].filter(Boolean).join(' ');

        // Generate HTML
        return `
            <div id="${escapeHtml(id)}"
                 class="${containerClass}"
                 data-component-id="${escapeHtml(id)}"
                 data-component-type="SearchInput">
                ${iconPosition !== 'none' ? `<span class="${iconClass}" aria-hidden="true">${escapeHtml(icon)}</span>` : ''}
                <input
                    type="text"
                    id="${escapeHtml(id)}-input"
                    class="${inputClass}"
                    placeholder="${escapeHtml(placeholder)}"
                    aria-label="${escapeHtml(ariaLabel)}"
                    value="${escapeHtml(query || '')}"
                    ${disabled ? 'disabled' : ''}
                    autocomplete="off"
                    spellcheck="false"
                />
            </div>
        `;
    }
}
