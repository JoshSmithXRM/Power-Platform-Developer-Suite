import { BaseComponentConfig } from '../../base/ComponentInterface';

/**
 * Configuration interface for SolutionSelectorComponent
 * Provides type-safe configuration for Power Platform solution selection
 */

export interface Solution {
    id: string;
    uniqueName: string;
    friendlyName: string;
    displayName: string;
    version: string;
    isManaged: boolean;
    isVisible: boolean;
    publisherId: string;
    publisherName: string;
    description?: string;
    installedOn?: Date;
    modifiedOn?: Date;
    createdBy?: string;
    solutionType?: 'None' | 'Snapshot' | 'Internal' | 'Managed' | 'Unmanaged';
    upgradeInfo?: {
        isUpgrade: boolean;
        baseVersion?: string;
    };
    components?: {
        entities: number;
        workflows: number;
        webResources: number;
        plugins: number;
        customControls: number;
        total: number;
    };
}

export interface SolutionSelectorConfig extends BaseComponentConfig {
    // Basic configuration
    label?: string;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    
    // Solution filtering options
    showManaged?: boolean;
    showUnmanaged?: boolean;
    showInternal?: boolean;
    showSystem?: boolean;
    filterByPublisher?: string[];
    excludeSolutions?: string[]; // Solution unique names to exclude
    includeSolutions?: string[]; // Only show these solutions
    
    // Display options
    showVersion?: boolean;
    showPublisher?: boolean;
    showManagedStatus?: boolean;
    showComponentCount?: boolean;
    showDescription?: boolean;
    showInstallDate?: boolean;
    sortBy?: 'displayName' | 'friendlyName' | 'version' | 'modifiedOn' | 'installedOn';
    sortDirection?: 'asc' | 'desc';
    
    // Grouping options
    groupByPublisher?: boolean;
    groupByType?: boolean;
    
    // Search and filtering
    searchable?: boolean;
    searchPlaceholder?: string;
    quickFilters?: {
        managed?: boolean;
        unmanaged?: boolean;
        hasComponents?: boolean;
    };
    
    // Default selections
    defaultSolution?: string; // Solution unique name
    selectedSolution?: string;
    autoSelectFirst?: boolean;
    autoSelectDefault?: boolean;
    
    // Advanced options
    allowMultiSelect?: boolean;
    maxSelections?: number;
    showTooltips?: boolean;
    enableKeyboardNav?: boolean;
    
    // Loading and empty states
    loadingText?: string;
    emptyText?: string;
    errorText?: string;
    
    // Callbacks
    onSelectionChange?: (selectedSolutions: Solution[]) => void;
    onSolutionLoad?: (solutions: Solution[]) => void;
    onError?: (error: Error) => void;
    onSearch?: (query: string) => void;
    
    // Data source
    solutions?: Solution[];
    loadSolutions?: () => Promise<Solution[]>;
    
    // Validation
    validate?: (selectedSolutions: Solution[]) => boolean | string;
    
    // Accessibility
    ariaLabel?: string;
    ariaDescribedBy?: string;
}

/**
 * Event data interfaces
 */
export interface SolutionSelectorSelectionEvent {
    componentId: string;
    selectedSolutions: Solution[];
    addedSolutions: Solution[];
    removedSolutions: Solution[];
    timestamp: number;
}

export interface SolutionSelectorLoadEvent {
    componentId: string;
    solutions: Solution[];
    filteredCount: number;
    timestamp: number;
}

/**
 * Default configuration values
 */
export const DEFAULT_SOLUTION_SELECTOR_CONFIG: Partial<SolutionSelectorConfig> = {
    label: 'Solution:',
    placeholder: 'Select solution...',
    required: false,
    disabled: false,
    showManaged: true,
    showUnmanaged: true,
    showInternal: false,
    showSystem: false,
    showVersion: true,
    showPublisher: false,
    showManagedStatus: true,
    showComponentCount: false,
    showDescription: false,
    showInstallDate: false,
    sortBy: 'displayName',
    sortDirection: 'asc',
    groupByPublisher: false,
    groupByType: false,
    searchable: true,
    searchPlaceholder: 'Search solutions...',
    allowMultiSelect: false,
    maxSelections: 1,
    showTooltips: true,
    enableKeyboardNav: true,
    autoSelectFirst: false,
    autoSelectDefault: true,
    loadingText: 'Loading solutions...',
    emptyText: 'No solutions found',
    errorText: 'Error loading solutions'
};

/**
 * Solution type definitions
 */
export const SOLUTION_TYPES = {
    NONE: 'None',
    SNAPSHOT: 'Snapshot',
    INTERNAL: 'Internal',
    MANAGED: 'Managed',
    UNMANAGED: 'Unmanaged'
} as const;

/**
 * Well-known system solutions to filter out by default
 */
export const SYSTEM_SOLUTIONS = [
    'Default',
    'Active',
    'Basic',
    'System',
    'msdynce_',
    'Microsoft_'
];

/**
 * CSS class constants specific to SolutionSelector
 */
export const SOLUTION_SELECTOR_CSS = {
    COMPONENT: 'solution-selector',
    CONTAINER: 'solution-selector-container',
    WRAPPER: 'solution-selector-wrapper',
    
    // Dropdown structure
    DROPDOWN: 'solution-selector-dropdown',
    DROPDOWN_TRIGGER: 'solution-selector-trigger',
    DROPDOWN_MENU: 'solution-selector-menu',
    DROPDOWN_OPEN: 'solution-selector-dropdown--open',
    
    // Options
    OPTION: 'solution-selector-option',
    OPTION_SELECTED: 'solution-selector-option--selected',
    OPTION_DISABLED: 'solution-selector-option--disabled',
    OPTION_FOCUSED: 'solution-selector-option--focused',
    
    // Solution info
    SOLUTION_INFO: 'solution-selector-solution-info',
    SOLUTION_NAME: 'solution-selector-solution-name',
    SOLUTION_VERSION: 'solution-selector-solution-version',
    SOLUTION_PUBLISHER: 'solution-selector-solution-publisher',
    SOLUTION_STATUS: 'solution-selector-solution-status',
    SOLUTION_COMPONENTS: 'solution-selector-solution-components',
    SOLUTION_DESCRIPTION: 'solution-selector-solution-description',
    
    // Status badges
    STATUS_MANAGED: 'solution-status--managed',
    STATUS_UNMANAGED: 'solution-status--unmanaged',
    STATUS_INTERNAL: 'solution-status--internal',
    STATUS_SYSTEM: 'solution-status--system',
    
    // Groups
    GROUP: 'solution-selector-group',
    GROUP_HEADER: 'solution-selector-group-header',
    GROUP_OPTIONS: 'solution-selector-group-options',
    
    // Search
    SEARCH: 'solution-selector-search',
    SEARCH_INPUT: 'solution-selector-search-input',
    SEARCH_CLEAR: 'solution-selector-search-clear',
    
    // Quick filters
    QUICK_FILTERS: 'solution-selector-quick-filters',
    FILTER_BUTTON: 'solution-selector-filter-button',
    FILTER_ACTIVE: 'solution-selector-filter--active',
    
    // States
    LOADING: 'solution-selector--loading',
    EMPTY: 'solution-selector--empty',
    ERROR: 'solution-selector--error',
    DISABLED: 'solution-selector--disabled',
    REQUIRED: 'solution-selector--required',
    INVALID: 'solution-selector--invalid',
    
    // Multi-select
    MULTI_SELECT: 'solution-selector--multi-select',
    SELECTED_COUNT: 'solution-selector-selected-count',
    SELECTION_TAGS: 'solution-selector-selection-tags',
    SELECTION_TAG: 'solution-selector-selection-tag',
    TAG_REMOVE: 'solution-selector-tag-remove'
};

/**
 * Validation rules for SolutionSelector
 */
export const SOLUTION_SELECTOR_VALIDATION = {
    MAX_SELECTIONS: 50,
    MIN_SEARCH_LENGTH: 1,
    MAX_SEARCH_LENGTH: 100,
    DEBOUNCE_DELAY_MS: 300
};

/**
 * Helper functions for solution selector configuration
 */
export class SolutionSelectorConfigValidator {
    static validate(config: SolutionSelectorConfig): { isValid: boolean; errors: string[]; warnings: string[] } {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Validate required fields
        if (!config.id || typeof config.id !== 'string') {
            errors.push('Component ID is required and must be a string');
        }

        // Validate max selections
        if (config.allowMultiSelect && config.maxSelections) {
            if (config.maxSelections < 1) {
                errors.push('maxSelections must be at least 1');
            }
            if (config.maxSelections > SOLUTION_SELECTOR_VALIDATION.MAX_SELECTIONS) {
                warnings.push(`maxSelections (${config.maxSelections}) exceeds recommended limit (${SOLUTION_SELECTOR_VALIDATION.MAX_SELECTIONS})`);
            }
        }

        // Validate callbacks
        const callbacks = ['onSelectionChange', 'onSolutionLoad', 'onError', 'onSearch', 'validate', 'loadSolutions'];
        callbacks.forEach(callback => {
            if (config[callback as keyof SolutionSelectorConfig] && 
                typeof config[callback as keyof SolutionSelectorConfig] !== 'function') {
                errors.push(`${callback} must be a function`);
            }
        });

        // Validate solution arrays
        if (config.solutions && !Array.isArray(config.solutions)) {
            errors.push('solutions must be an array');
        }

        if (config.filterByPublisher && !Array.isArray(config.filterByPublisher)) {
            errors.push('filterByPublisher must be an array');
        }

        if (config.excludeSolutions && !Array.isArray(config.excludeSolutions)) {
            errors.push('excludeSolutions must be an array');
        }

        if (config.includeSolutions && !Array.isArray(config.includeSolutions)) {
            errors.push('includeSolutions must be an array');
        }

        // Validate sort configuration
        const validSortFields = ['displayName', 'friendlyName', 'version', 'modifiedOn', 'installedOn'];
        if (config.sortBy && !validSortFields.includes(config.sortBy)) {
            errors.push(`sortBy must be one of: ${validSortFields.join(', ')}`);
        }

        const validSortDirections = ['asc', 'desc'];
        if (config.sortDirection && !validSortDirections.includes(config.sortDirection)) {
            errors.push(`sortDirection must be one of: ${validSortDirections.join(', ')}`);
        }

        // Warnings for conflicting settings
        if (config.includeSolutions && config.excludeSolutions) {
            warnings.push('Both includeSolutions and excludeSolutions are specified. includeSolutions takes precedence.');
        }

        if (!config.showManaged && !config.showUnmanaged && !config.showInternal) {
            warnings.push('All solution types are hidden. No solutions will be displayed.');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    static sanitizeConfig(config: SolutionSelectorConfig): SolutionSelectorConfig {
        return {
            ...config,
            id: config.id?.trim(),
            label: config.label?.trim(),
            placeholder: config.placeholder?.trim(),
            searchPlaceholder: config.searchPlaceholder?.trim(),
            maxSelections: config.allowMultiSelect 
                ? Math.max(1, Math.min(config.maxSelections || 1, SOLUTION_SELECTOR_VALIDATION.MAX_SELECTIONS))
                : 1
        };
    }

    static isSystemSolution(solution: Solution): boolean {
        return SYSTEM_SOLUTIONS.some(systemName => 
            solution.uniqueName.toLowerCase().startsWith(systemName.toLowerCase())
        );
    }

    static filterSolutions(solutions: Solution[], config: SolutionSelectorConfig): Solution[] {
        let filtered = [...solutions];

        // Filter by type
        filtered = filtered.filter(solution => {
            if (solution.isManaged && !config.showManaged) return false;
            if (!solution.isManaged && !config.showUnmanaged) return false;
            if (solution.solutionType === 'Internal' && !config.showInternal) return false;
            if (this.isSystemSolution(solution) && !config.showSystem) return false;
            return true;
        });

        // Include/exclude lists
        if (config.includeSolutions && config.includeSolutions.length > 0) {
            filtered = filtered.filter(solution => 
                config.includeSolutions!.includes(solution.uniqueName)
            );
        } else if (config.excludeSolutions && config.excludeSolutions.length > 0) {
            filtered = filtered.filter(solution => 
                !config.excludeSolutions!.includes(solution.uniqueName)
            );
        }

        // Filter by publisher
        if (config.filterByPublisher && config.filterByPublisher.length > 0) {
            filtered = filtered.filter(solution => 
                config.filterByPublisher!.includes(solution.publisherId) ||
                config.filterByPublisher!.includes(solution.publisherName)
            );
        }

        return filtered;
    }

    static sortSolutions(solutions: Solution[], config: SolutionSelectorConfig): Solution[] {
        const sortBy = config.sortBy || 'displayName';
        const sortDirection = config.sortDirection || 'asc';
        
        return [...solutions].sort((a, b) => {
            let aVal: any = a[sortBy as keyof Solution];
            let bVal: any = b[sortBy as keyof Solution];
            
            // Handle null/undefined values
            if (aVal === null || aVal === undefined) aVal = '';
            if (bVal === null || bVal === undefined) bVal = '';
            
            // Handle different data types
            if (sortBy === 'version') {
                // Version comparison (simple string comparison for now)
                aVal = aVal.toString();
                bVal = bVal.toString();
            } else if (sortBy === 'modifiedOn' || sortBy === 'installedOn') {
                // Date comparison
                aVal = new Date(aVal).getTime();
                bVal = new Date(bVal).getTime();
            } else {
                // String comparison
                aVal = aVal.toString().toLowerCase();
                bVal = bVal.toString().toLowerCase();
            }
            
            let comparison = 0;
            if (aVal < bVal) comparison = -1;
            else if (aVal > bVal) comparison = 1;
            
            return sortDirection === 'asc' ? comparison : -comparison;
        });
    }
}
