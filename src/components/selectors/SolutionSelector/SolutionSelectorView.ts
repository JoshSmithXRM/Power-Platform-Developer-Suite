import { SolutionSelectorConfig, Solution, SOLUTION_SELECTOR_CSS } from './SolutionSelectorConfig';
import { CSS_CLASSES, ICONS } from '../../base/ComponentConfig';
import { escapeHtml } from '../../base/HtmlUtils';

/**
 * SolutionSelectorView - HTML generation for SolutionSelector component
 * This runs in Extension Host context and generates the HTML structure
 */

export interface SolutionSelectorViewState {
    solutions: Solution[];
    filteredSolutions: Solution[];
    selectedSolutions: Solution[];
    searchQuery: string;
    isOpen: boolean;
    loading: boolean;
    error: string | null;
    focusedIndex: number;
    quickFilters: {
        managed: boolean;
        unmanaged: boolean;
        hasComponents: boolean;
    };
}

export class SolutionSelectorView {
    /**
     * Main render method - generates complete HTML for the selector
     */
    static render(config: SolutionSelectorConfig, state: SolutionSelectorViewState): string {
        const {
            id,
            className = '',
            label,
            required = false,
            disabled = false,
            allowMultiSelect = false
        } = config;

        const containerClass = [
            CSS_CLASSES.COMPONENT_BASE,
            SOLUTION_SELECTOR_CSS.COMPONENT,
            className,
            disabled ? SOLUTION_SELECTOR_CSS.DISABLED : '',
            required ? SOLUTION_SELECTOR_CSS.REQUIRED : '',
            state.loading ? SOLUTION_SELECTOR_CSS.LOADING : '',
            state.error ? SOLUTION_SELECTOR_CSS.ERROR : '',
            state.filteredSolutions.length === 0 ? SOLUTION_SELECTOR_CSS.EMPTY : '',
            allowMultiSelect ? SOLUTION_SELECTOR_CSS.MULTI_SELECT : ''
        ].filter(Boolean).join(' ');

        return `
            <div class="${containerClass}" 
                 data-component-id="${id}"
                 data-component-type="SolutionSelector">
                
                ${label ? this.renderLabel(config, state) : ''}
                
                <div class="${SOLUTION_SELECTOR_CSS.CONTAINER}">
                    ${this.renderSelector(config, state)}
                    ${state.error ? this.renderError(state.error) : ''}
                </div>
            </div>
        `;
    }

    /**
     * Render label
     */
    private static renderLabel(config: SolutionSelectorConfig, state: SolutionSelectorViewState): string {
        const { id, label, required, ariaDescribedBy } = config;
        
        return `
            <label class="solution-selector-label" 
                   for="${id}_trigger"
                   ${ariaDescribedBy ? `aria-describedby="${ariaDescribedBy}"` : ''}>
                ${this.escapeHtml(label || '')}
                ${required ? '<span class="required-indicator">*</span>' : ''}
            </label>
        `;
    }

    /**
     * Render main selector component
     */
    private static renderSelector(config: SolutionSelectorConfig, state: SolutionSelectorViewState): string {
        const {
            id,
            placeholder = 'Select solution...',
            disabled = false,
            allowMultiSelect = false,
            ariaLabel
        } = config;

        return `
            <div class="${SOLUTION_SELECTOR_CSS.WRAPPER}">
                <div class="${SOLUTION_SELECTOR_CSS.DROPDOWN} ${state.isOpen ? SOLUTION_SELECTOR_CSS.DROPDOWN_OPEN : ''}">
                    ${this.renderTrigger(config, state)}
                    ${state.isOpen ? this.renderDropdownMenu(config, state) : ''}
                </div>
                
                ${allowMultiSelect && state.selectedSolutions.length > 0 ? 
                    this.renderSelectionTags(config, state) : ''}
            </div>
        `;
    }

    /**
     * Render dropdown trigger button
     */
    private static renderTrigger(config: SolutionSelectorConfig, state: SolutionSelectorViewState): string {
        const {
            id,
            placeholder = 'Select solution...',
            disabled = false,
            allowMultiSelect = false,
            ariaLabel
        } = config;

        const { selectedSolutions, loading } = state;
        
        let triggerText = placeholder;
        if (selectedSolutions.length === 1 && !allowMultiSelect) {
            triggerText = this.getSolutionDisplayName(selectedSolutions[0], config);
        } else if (selectedSolutions.length > 1 && allowMultiSelect) {
            triggerText = `${selectedSolutions.length} solutions selected`;
        } else if (selectedSolutions.length === 1 && allowMultiSelect) {
            triggerText = this.getSolutionDisplayName(selectedSolutions[0], config);
        }

        return `
            <button type="button"
                    id="${id}_trigger"
                    class="${SOLUTION_SELECTOR_CSS.DROPDOWN_TRIGGER}"
                    ${disabled ? 'disabled' : ''}
                    aria-haspopup="listbox"
                    aria-expanded="${state.isOpen}"
                    ${ariaLabel ? `aria-label="${this.escapeHtml(ariaLabel)}"` : ''}
                    data-component-element="trigger">
                
                <span class="solution-selector-trigger-text">
                    ${loading ? this.escapeHtml(config.loadingText || 'Loading...') : this.escapeHtml(triggerText)}
                </span>
                
                <span class="solution-selector-trigger-icon">
                    ${loading ? ICONS.LOADING : (state.isOpen ? ICONS.CHEVRON_UP : ICONS.CHEVRON_DOWN)}
                </span>
            </button>
        `;
    }

    /**
     * Render dropdown menu
     */
    private static renderDropdownMenu(config: SolutionSelectorConfig, state: SolutionSelectorViewState): string {
        const { id, searchable, quickFilters } = config;
        
        return `
            <div class="${SOLUTION_SELECTOR_CSS.DROPDOWN_MENU}" 
                 role="listbox"
                 ${config.allowMultiSelect ? 'aria-multiselectable="true"' : ''}
                 data-component-element="menu">
                
                ${searchable ? this.renderSearch(config, state) : ''}
                ${quickFilters ? this.renderQuickFilters(config, state) : ''}
                
                <div class="solution-selector-options-container">
                    ${state.loading ? this.renderLoadingState(config) : 
                      state.filteredSolutions.length === 0 ? this.renderEmptyState(config) :
                      this.renderSolutions(config, state)}
                </div>
            </div>
        `;
    }

    /**
     * Render search input
     */
    private static renderSearch(config: SolutionSelectorConfig, state: SolutionSelectorViewState): string {
        const { searchPlaceholder = 'Search solutions...' } = config;
        
        return `
            <div class="${SOLUTION_SELECTOR_CSS.SEARCH}">
                <input type="text" 
                       class="${SOLUTION_SELECTOR_CSS.SEARCH_INPUT}"
                       placeholder="${this.escapeHtml(searchPlaceholder)}"
                       value="${this.escapeHtml(state.searchQuery)}"
                       data-component-element="search"
                       autocomplete="off">
                
                <span class="solution-selector-search-icon">${ICONS.SEARCH}</span>
                
                ${state.searchQuery ? `
                    <button type="button" 
                            class="${SOLUTION_SELECTOR_CSS.SEARCH_CLEAR}"
                            data-component-element="clear-search"
                            title="Clear search">
                        ${ICONS.CLOSE}
                    </button>
                ` : ''}
            </div>
        `;
    }

    /**
     * Render quick filters
     */
    private static renderQuickFilters(config: SolutionSelectorConfig, state: SolutionSelectorViewState): string {
        return `
            <div class="${SOLUTION_SELECTOR_CSS.QUICK_FILTERS}">
                <button type="button" 
                        class="${SOLUTION_SELECTOR_CSS.FILTER_BUTTON} ${state.quickFilters.managed ? SOLUTION_SELECTOR_CSS.FILTER_ACTIVE : ''}"
                        data-component-element="filter-managed"
                        title="Show managed solutions">
                    Managed
                </button>
                
                <button type="button" 
                        class="${SOLUTION_SELECTOR_CSS.FILTER_BUTTON} ${state.quickFilters.unmanaged ? SOLUTION_SELECTOR_CSS.FILTER_ACTIVE : ''}"
                        data-component-element="filter-unmanaged"
                        title="Show unmanaged solutions">
                    Unmanaged
                </button>
                
                <button type="button" 
                        class="${SOLUTION_SELECTOR_CSS.FILTER_BUTTON} ${state.quickFilters.hasComponents ? SOLUTION_SELECTOR_CSS.FILTER_ACTIVE : ''}"
                        data-component-element="filter-components"
                        title="Show solutions with components">
                    Has Components
                </button>
            </div>
        `;
    }

    /**
     * Render solution list
     */
    private static renderSolutions(config: SolutionSelectorConfig, state: SolutionSelectorViewState): string {
        const { groupByPublisher, groupByType } = config;
        
        if (groupByPublisher) {
            return this.renderGroupedByPublisher(config, state);
        } else if (groupByType) {
            return this.renderGroupedByType(config, state);
        } else {
            return this.renderSolutionList(config, state.filteredSolutions, state);
        }
    }

    /**
     * Render solutions grouped by publisher
     */
    private static renderGroupedByPublisher(config: SolutionSelectorConfig, state: SolutionSelectorViewState): string {
        const groups = this.groupSolutionsByPublisher(state.filteredSolutions);
        
        return Object.entries(groups).map(([publisher, solutions]) => `
            <div class="${SOLUTION_SELECTOR_CSS.GROUP}">
                <div class="${SOLUTION_SELECTOR_CSS.GROUP_HEADER}">
                    ${this.escapeHtml(publisher)}
                </div>
                <div class="${SOLUTION_SELECTOR_CSS.GROUP_OPTIONS}">
                    ${this.renderSolutionList(config, solutions, state)}
                </div>
            </div>
        `).join('');
    }

    /**
     * Render solutions grouped by type
     */
    private static renderGroupedByType(config: SolutionSelectorConfig, state: SolutionSelectorViewState): string {
        const groups = this.groupSolutionsByType(state.filteredSolutions);
        
        return Object.entries(groups).map(([type, solutions]) => `
            <div class="${SOLUTION_SELECTOR_CSS.GROUP}">
                <div class="${SOLUTION_SELECTOR_CSS.GROUP_HEADER}">
                    ${this.escapeHtml(type)} Solutions
                </div>
                <div class="${SOLUTION_SELECTOR_CSS.GROUP_OPTIONS}">
                    ${this.renderSolutionList(config, solutions, state)}
                </div>
            </div>
        `).join('');
    }

    /**
     * Render list of solutions
     */
    private static renderSolutionList(config: SolutionSelectorConfig, solutions: Solution[], state: SolutionSelectorViewState): string {
        return solutions.map((solution, index) => 
            this.renderSolutionOption(solution, index, config, state)
        ).join('');
    }

    /**
     * Render individual solution option
     */
    private static renderSolutionOption(solution: Solution, index: number, config: SolutionSelectorConfig, state: SolutionSelectorViewState): string {
        const isSelected = state.selectedSolutions.some(s => s.id === solution.id);
        const isFocused = index === state.focusedIndex;
        const { allowMultiSelect, showTooltips } = config;
        
        const optionClass = [
            SOLUTION_SELECTOR_CSS.OPTION,
            isSelected ? SOLUTION_SELECTOR_CSS.OPTION_SELECTED : '',
            isFocused ? SOLUTION_SELECTOR_CSS.OPTION_FOCUSED : ''
        ].filter(Boolean).join(' ');

        const tooltipText = this.buildTooltipText(solution, config);
        
        return `
            <div class="${optionClass}"
                 role="option"
                 aria-selected="${isSelected}"
                 data-solution-id="${solution.id}"
                 data-solution-unique-name="${solution.uniqueName}"
                 data-component-element="option"
                 data-option-index="${index}"
                 ${showTooltips && tooltipText ? `title="${this.escapeHtml(tooltipText)}"` : ''}>
                
                ${allowMultiSelect ? `
                    <input type="checkbox" 
                           class="solution-selector-checkbox"
                           ${isSelected ? 'checked' : ''}
                           tabindex="-1">
                ` : ''}
                
                <div class="${SOLUTION_SELECTOR_CSS.SOLUTION_INFO}">
                    <div class="${SOLUTION_SELECTOR_CSS.SOLUTION_NAME}">
                        ${this.escapeHtml(this.getSolutionDisplayName(solution, config))}
                    </div>
                    
                    ${this.renderSolutionDetails(solution, config)}
                </div>
                
                ${this.renderSolutionBadges(solution, config)}
            </div>
        `;
    }

    /**
     * Render solution details
     */
    private static renderSolutionDetails(solution: Solution, config: SolutionSelectorConfig): string {
        const details = [];
        
        if (config.showVersion && solution.version) {
            details.push(`
                <span class="${SOLUTION_SELECTOR_CSS.SOLUTION_VERSION}">
                    v${this.escapeHtml(solution.version)}
                </span>
            `);
        }
        
        if (config.showPublisher && solution.publisherName) {
            details.push(`
                <span class="${SOLUTION_SELECTOR_CSS.SOLUTION_PUBLISHER}">
                    by ${this.escapeHtml(solution.publisherName)}
                </span>
            `);
        }
        
        if (config.showComponentCount && solution.components) {
            details.push(`
                <span class="${SOLUTION_SELECTOR_CSS.SOLUTION_COMPONENTS}">
                    ${solution.components.total} component${solution.components.total !== 1 ? 's' : ''}
                </span>
            `);
        }
        
        if (config.showDescription && solution.description) {
            details.push(`
                <div class="${SOLUTION_SELECTOR_CSS.SOLUTION_DESCRIPTION}">
                    ${this.escapeHtml(solution.description)}
                </div>
            `);
        }
        
        return details.length > 0 ? `
            <div class="solution-selector-solution-details">
                ${details.join('')}
            </div>
        ` : '';
    }

    /**
     * Render solution status badges
     */
    private static renderSolutionBadges(solution: Solution, config: SolutionSelectorConfig): string {
        const badges = [];
        
        if (config.showManagedStatus) {
            const statusClass = solution.isManaged 
                ? SOLUTION_SELECTOR_CSS.STATUS_MANAGED 
                : SOLUTION_SELECTOR_CSS.STATUS_UNMANAGED;
            const statusText = solution.isManaged ? 'Managed' : 'Unmanaged';
            
            badges.push(`
                <span class="${SOLUTION_SELECTOR_CSS.SOLUTION_STATUS} ${statusClass}">
                    ${statusText}
                </span>
            `);
        }
        
        return badges.length > 0 ? `
            <div class="solution-selector-solution-badges">
                ${badges.join('')}
            </div>
        ` : '';
    }

    /**
     * Render selection tags for multi-select
     */
    private static renderSelectionTags(config: SolutionSelectorConfig, state: SolutionSelectorViewState): string {
        return `
            <div class="${SOLUTION_SELECTOR_CSS.SELECTION_TAGS}">
                ${state.selectedSolutions.map(solution => `
                    <span class="${SOLUTION_SELECTOR_CSS.SELECTION_TAG}" 
                          data-solution-id="${solution.id}">
                        <span class="selection-tag-text">
                            ${this.escapeHtml(this.getSolutionDisplayName(solution, config))}
                        </span>
                        <button type="button" 
                                class="${SOLUTION_SELECTOR_CSS.TAG_REMOVE}"
                                data-component-element="remove-tag"
                                data-solution-id="${solution.id}"
                                title="Remove ${this.escapeHtml(solution.displayName)}">
                            ${ICONS.CLOSE}
                        </button>
                    </span>
                `).join('')}
                
                <span class="${SOLUTION_SELECTOR_CSS.SELECTED_COUNT}">
                    ${state.selectedSolutions.length} selected
                </span>
            </div>
        `;
    }

    /**
     * Render loading state
     */
    private static renderLoadingState(config: SolutionSelectorConfig): string {
        return `
            <div class="solution-selector-loading-state">
                <div class="loading-spinner">${ICONS.LOADING}</div>
                <div class="loading-text">
                    ${this.escapeHtml(config.loadingText || 'Loading solutions...')}
                </div>
            </div>
        `;
    }

    /**
     * Render empty state
     */
    private static renderEmptyState(config: SolutionSelectorConfig): string {
        return `
            <div class="solution-selector-empty-state">
                <div class="empty-icon">${ICONS.INFO}</div>
                <div class="empty-text">
                    ${this.escapeHtml(config.emptyText || 'No solutions found')}
                </div>
            </div>
        `;
    }

    /**
     * Render error state
     */
    private static renderError(error: string): string {
        return `
            <div class="solution-selector-error">
                <div class="error-icon">${ICONS.ERROR}</div>
                <div class="error-text">${this.escapeHtml(error)}</div>
            </div>
        `;
    }

    /**
     * Get display name for solution
     */
    private static getSolutionDisplayName(solution: Solution, config: SolutionSelectorConfig): string {
        // Prefer displayName, fallback to friendlyName, then uniqueName
        return solution.displayName || solution.friendlyName || solution.uniqueName;
    }

    /**
     * Build tooltip text for solution
     */
    private static buildTooltipText(solution: Solution, config: SolutionSelectorConfig): string {
        const parts = [];
        
        parts.push(solution.displayName || solution.friendlyName);
        
        if (solution.version) {
            parts.push(`Version: ${solution.version}`);
        }
        
        if (solution.publisherName) {
            parts.push(`Publisher: ${solution.publisherName}`);
        }
        
        if (solution.description) {
            parts.push(solution.description);
        }
        
        if (solution.components && solution.components.total > 0) {
            parts.push(`Components: ${solution.components.total}`);
        }
        
        return parts.join('\n');
    }

    /**
     * Group solutions by publisher
     */
    private static groupSolutionsByPublisher(solutions: Solution[]): Record<string, Solution[]> {
        const groups: Record<string, Solution[]> = {};
        
        solutions.forEach(solution => {
            const publisher = solution.publisherName || 'Unknown Publisher';
            if (!groups[publisher]) {
                groups[publisher] = [];
            }
            groups[publisher].push(solution);
        });
        
        return groups;
    }

    /**
     * Group solutions by type
     */
    private static groupSolutionsByType(solutions: Solution[]): Record<string, Solution[]> {
        const groups: Record<string, Solution[]> = {};
        
        solutions.forEach(solution => {
            const type = solution.isManaged ? 'Managed' : 'Unmanaged';
            if (!groups[type]) {
                groups[type] = [];
            }
            groups[type].push(solution);
        });
        
        return groups;
    }

    /**
     * Escape HTML to prevent XSS - uses Node.js compatible utility
     */
    private static escapeHtml(text: string): string {
        return escapeHtml(text);
    }
}
