import { BaseComponent } from '../../base/BaseComponent';
import { SolutionSelectorConfig, SolutionSelectorSelectionEvent, SolutionSelectorLoadEvent, DEFAULT_SOLUTION_SELECTOR_CONFIG, SolutionSelectorConfigValidator } from './SolutionSelectorConfig';
import { SolutionSelectorView, SolutionSelectorViewState } from './SolutionSelectorView';
import { Solution } from '../../../services/SolutionService'; // Use standardized Solution interface

/**
 * SolutionSelectorComponent - Power Platform solution selector with advanced filtering
 * Provides comprehensive solution selection with search, filtering, and grouping capabilities
 * Supports both single and multi-selection modes with rich solution metadata display
 */
export class SolutionSelectorComponent extends BaseComponent {
    protected config: SolutionSelectorConfig;
    
    // Component state
    private solutions: Solution[] = [];
    private filteredSolutions: Solution[] = [];
    private selectedSolutions: Solution[] = [];
    private searchQuery: string = '';
    private isOpen: boolean = false;
    private loading: boolean = false;
    private error: string | null = null;
    private focusedIndex: number = -1;
    
    // Quick filters state
    private quickFilters = {
        managed: true,
        unmanaged: true,
        hasComponents: false
    };
    
    // Search debounce timer
    private searchTimer: any = null;

    constructor(config: SolutionSelectorConfig) {
        const mergedConfig = { ...DEFAULT_SOLUTION_SELECTOR_CONFIG, ...config } as SolutionSelectorConfig;
        super(mergedConfig);
        
        this.config = mergedConfig;
        this.validateConfig();
        this.initializeState();
    }

    /**
     * Initialize component state from config
     */
    private initializeState(): void {
        if (this.config.solutions) {
            this.setSolutions(this.config.solutions);
        }
        
        if (this.config.selectedSolution) {
            const solution = this.solutions.find(s => s.uniqueName === this.config.selectedSolution);
            if (solution) {
                this.setSelectedSolutions([solution]);
            }
        }
        
        // Initialize quick filters from config
        if (this.config.quickFilters) {
            this.quickFilters = { ...this.quickFilters, ...this.config.quickFilters };
        }
    }

    /**
     * Generate HTML for this component
     */
    public generateHTML(): string {
        const viewState: SolutionSelectorViewState = {
            solutions: this.solutions,
            filteredSolutions: this.filteredSolutions,
            selectedSolutions: this.selectedSolutions,
            searchQuery: this.searchQuery,
            isOpen: this.isOpen,
            loading: this.loading,
            error: this.error,
            focusedIndex: this.focusedIndex,
            quickFilters: this.quickFilters
        };
        
        // DEBUG: Log component state during HTML generation
        console.log(`SolutionSelector[${this.config.id}] HTML Generation State:`, {
            totalSolutions: this.solutions.length,
            filteredSolutions: this.filteredSolutions.length,
            selectedSolutions: this.selectedSolutions.length,
            isOpen: this.isOpen,
            loading: this.loading,
            error: this.error,
            hasDefaultSolution: this.solutions.find(s => s.uniqueName === 'Default'),
            sampleFilteredSolutions: this.filteredSolutions.slice(0, 3).map(s => s.displayName)
        });
        
        return SolutionSelectorView.render(this.config, viewState);
    }

    /**
     * Get CSS file for this component
     */
    public getCSSFile(): string {
        return 'components/solution-selector.css';
    }

    /**
     * Get behavior script for this component
     */
    public getBehaviorScript(): string {
        return 'components/SolutionSelectorBehavior.js';
    }

    /**
     * Get default class name
     */
    protected getDefaultClassName(): string {
        return 'solution-selector';
    }

    /**
     * Set solutions list
     */
    public setSolutions(solutions: Solution[]): void {
        const oldSolutions = [...this.solutions];
        this.solutions = [...solutions];
        
        // Apply filtering and sorting
        this.applyFiltersAndSort();
        
        // Clear selections that are no longer valid
        this.validateSelections();
        
        this.notifyStateChange({
            solutions: this.solutions,
            oldSolutions,
            filteredCount: this.filteredSolutions.length
        });
        
        this.emitLoadEvent();
        this.notifyUpdate();
    }

    /**
     * Get current solutions list
     */
    public getSolutions(): Solution[] {
        return [...this.solutions];
    }

    /**
     * Get filtered solutions
     */
    public getFilteredSolutions(): Solution[] {
        return [...this.filteredSolutions];
    }

    /**
     * Set selected solutions
     */
    public setSelectedSolutions(solutions: Solution[]): void {
        const oldSelected = [...this.selectedSolutions];
        
        // Validate selections based on config
        let newSelected = [...solutions];
        
        if (!this.config.allowMultiSelect && newSelected.length > 1) {
            newSelected = [newSelected[0]];
        }
        
        if (this.config.maxSelections && newSelected.length > this.config.maxSelections) {
            newSelected = newSelected.slice(0, this.config.maxSelections);
        }
        
        this.selectedSolutions = newSelected;
        
        // Determine added and removed solutions
        const addedSolutions = newSelected.filter(s => !oldSelected.some(old => old.id === s.id));
        const removedSolutions = oldSelected.filter(s => !newSelected.some(sel => sel.id === s.id));
        
        this.notifyStateChange({
            selectedSolutions: this.selectedSolutions,
            oldSelectedSolutions: oldSelected,
            addedSolutions,
            removedSolutions
        });
        
        this.emitSelectionEvent(addedSolutions, removedSolutions);
        this.notifyUpdate();
    }

    /**
     * Get selected solutions
     */
    public getSelectedSolutions(): Solution[] {
        return [...this.selectedSolutions];
    }

    /**
     * Get first selected solution (for single-select mode)
     */
    public getSelectedSolution(): Solution | null {
        return this.selectedSolutions.length > 0 ? this.selectedSolutions[0] : null;
    }

    /**
     * Select solution by ID or unique name
     */
    public selectSolution(identifier: string): void {
        const solution = this.solutions.find(s => s.id === identifier || s.uniqueName === identifier);
        if (!solution) {
            this.notifyError(new Error(`Solution not found: ${identifier}`), 'selectSolution');
            return;
        }
        
        if (this.config.allowMultiSelect) {
            // Add to selection if not already selected
            if (!this.selectedSolutions.some(s => s.id === solution.id)) {
                this.setSelectedSolutions([...this.selectedSolutions, solution]);
            }
        } else {
            this.setSelectedSolutions([solution]);
        }
    }

    /**
     * Deselect solution by ID or unique name
     */
    public deselectSolution(identifier: string): void {
        const newSelected = this.selectedSolutions.filter(s => 
            s.id !== identifier && s.uniqueName !== identifier
        );
        this.setSelectedSolutions(newSelected);
    }

    /**
     * Toggle solution selection
     */
    public toggleSolution(identifier: string): void {
        const isSelected = this.selectedSolutions.some(s => 
            s.id === identifier || s.uniqueName === identifier
        );
        
        if (isSelected) {
            this.deselectSolution(identifier);
        } else {
            this.selectSolution(identifier);
        }
    }

    /**
     * Clear all selections
     */
    public clearSelection(): void {
        this.setSelectedSolutions([]);
    }

    /**
     * Set search query
     */
    public setSearchQuery(query: string): void {
        const oldQuery = this.searchQuery;
        this.searchQuery = query;
        
        // Debounce search
        if (this.searchTimer) {
            clearTimeout(this.searchTimer);
        }
        
        this.searchTimer = setTimeout(() => {
            this.applyFiltersAndSort();
            
            if (this.config.onSearch) {
                this.config.onSearch(query);
            }
            
            this.notifyStateChange({ searchQuery: query, oldSearchQuery: oldQuery });
            this.notifyUpdate();
        }, 300);
    }

    /**
     * Clear search
     */
    public clearSearch(): void {
        this.setSearchQuery('');
    }

    /**
     * Set quick filter state
     */
    public setQuickFilter(filterType: 'managed' | 'unmanaged' | 'hasComponents', enabled: boolean): void {
        const oldFilters = { ...this.quickFilters };
        this.quickFilters[filterType] = enabled;
        
        this.applyFiltersAndSort();
        
        this.notifyStateChange({ quickFilters: this.quickFilters, oldQuickFilters: oldFilters });
        this.notifyUpdate();
    }

    /**
     * Toggle quick filter
     */
    public toggleQuickFilter(filterType: 'managed' | 'unmanaged' | 'hasComponents'): void {
        this.setQuickFilter(filterType, !this.quickFilters[filterType]);
    }

    /**
     * Open dropdown
     */
    public open(): void {
        if (this.isOpen || this.config.disabled) return;
        
        this.isOpen = true;
        this.focusedIndex = this.selectedSolutions.length > 0 
            ? this.filteredSolutions.findIndex(s => s.id === this.selectedSolutions[0].id)
            : 0;
        
        // Load solutions if needed
        if (this.solutions.length === 0 && this.config.loadSolutions) {
            this.loadSolutions();
        }
        
        this.notifyUpdate();
    }

    /**
     * Close dropdown
     */
    public close(): void {
        if (!this.isOpen) return;
        
        this.isOpen = false;
        this.focusedIndex = -1;
        this.notifyUpdate();
    }

    /**
     * Toggle dropdown open/close
     */
    public toggle(): void {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    /**
     * Set focused index (for keyboard navigation)
     */
    public setFocusedIndex(index: number): void {
        const maxIndex = this.filteredSolutions.length - 1;
        this.focusedIndex = Math.max(-1, Math.min(index, maxIndex));
        this.notifyUpdate();
    }

    /**
     * Move focus up
     */
    public focusPrevious(): void {
        this.setFocusedIndex(this.focusedIndex - 1);
    }

    /**
     * Move focus down
     */
    public focusNext(): void {
        this.setFocusedIndex(this.focusedIndex + 1);
    }

    /**
     * Select currently focused solution
     */
    public selectFocused(): void {
        if (this.focusedIndex >= 0 && this.focusedIndex < this.filteredSolutions.length) {
            const solution = this.filteredSolutions[this.focusedIndex];
            this.toggleSolution(solution.id);
            
            if (!this.config.allowMultiSelect) {
                this.close();
            }
        }
    }

    /**
     * Load solutions asynchronously
     */
    public async loadSolutions(): Promise<void> {
        if (!this.config.loadSolutions) {
            this.notifyError(new Error('No solution loader configured'), 'loadSolutions');
            return;
        }
        
        this.setLoading(true);
        this.setError(null);
        
        try {
            const solutions = await this.config.loadSolutions();
            this.setSolutions(solutions);
            
            // Auto-select default solution if configured
            if (this.config.autoSelectDefault && this.config.defaultSolution && this.selectedSolutions.length === 0) {
                const defaultSolution = solutions.find(s => s.uniqueName === this.config.defaultSolution);
                if (defaultSolution) {
                    this.setSelectedSolutions([defaultSolution]);
                }
            }
            
            // Auto-select first solution if configured
            if (this.config.autoSelectFirst && this.selectedSolutions.length === 0 && solutions.length > 0) {
                this.setSelectedSolutions([solutions[0]]);
            }
            
        } catch (error) {
            this.setError((error as Error).message);
            this.notifyError(error as Error, 'loadSolutions');
        } finally {
            this.setLoading(false);
        }
    }

    /**
     * Refresh solutions
     */
    public async refresh(): Promise<void> {
        await this.loadSolutions();
        
        this.emit('refresh', {
            componentId: this.getId(),
            timestamp: Date.now()
        });
    }

    /**
     * Set loading state
     */
    public setLoading(loading: boolean): void {
        const oldLoading = this.loading;
        this.loading = loading;
        
        this.notifyStateChange({ loading, oldLoading });
        this.notifyUpdate();
    }

    /**
     * Set error state
     */
    public setError(error: string | null): void {
        const oldError = this.error;
        this.error = error;
        
        this.notifyStateChange({ error, oldError });
        this.notifyUpdate();
    }

    /**
     * Get component data for event bridge updates (required for componentUpdate events)
     */
    public getData() {
        return {
            solutions: this.solutions,
            filteredSolutions: this.filteredSolutions,
            selectedSolutions: this.selectedSolutions,
            hasData: this.solutions.length > 0
        };
    }

    /**
     * Get component state
     */
    public getState() {
        return {
            solutions: this.solutions,
            filteredSolutions: this.filteredSolutions,
            selectedSolutions: this.selectedSolutions,
            searchQuery: this.searchQuery,
            isOpen: this.isOpen,
            loading: this.loading,
            error: this.error,
            focusedIndex: this.focusedIndex,
            quickFilters: this.quickFilters,
            hasSelections: this.selectedSolutions.length > 0,
            isValid: this.validate().isValid
        };
    }

    /**
     * Validate current selections
     */
    public validate(): { isValid: boolean; error?: string } {
        if (this.config.required && this.selectedSolutions.length === 0) {
            return {
                isValid: false,
                error: 'Solution selection is required'
            };
        }
        
        if (this.config.validate) {
            const result = this.config.validate(this.selectedSolutions);
            if (typeof result === 'string') {
                return { isValid: false, error: result };
            }
            if (result === false) {
                return { isValid: false, error: 'Invalid selection' };
            }
        }
        
        return { isValid: true };
    }

    /**
     * Apply filters and sorting to solutions
     */
    private applyFiltersAndSort(): void {
        console.log(`SolutionSelector[${this.config.id}] Filtering Debug:`, {
            inputSolutions: this.solutions.length,
            config: {
                showManaged: this.config.showManaged,
                showUnmanaged: this.config.showUnmanaged,
                showSystem: this.config.showSystem
            },
            sampleInputSolutions: this.solutions.slice(0, 3).map(s => ({
                name: s.displayName,
                uniqueName: s.uniqueName, 
                isManaged: s.isManaged
            }))
        });
        
        let filtered = SolutionSelectorConfigValidator.filterSolutions(this.solutions, this.config);
        
        console.log(`SolutionSelector[${this.config.id}] After config filtering:`, {
            filteredCount: filtered.length,
            removedCount: this.solutions.length - filtered.length,
            hasDefaultSolution: filtered.find(s => s.uniqueName === 'Default'),
            sampleFiltered: filtered.slice(0, 3).map(s => s.displayName)
        });
        
        // Apply quick filters
        if (!this.quickFilters.managed) {
            filtered = filtered.filter(s => !s.isManaged);
        }
        if (!this.quickFilters.unmanaged) {
            filtered = filtered.filter(s => s.isManaged);
        }
        if (this.quickFilters.hasComponents) {
            filtered = filtered.filter(s => s.components && s.components.total > 0);
        }
        
        // Apply search filter
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            filtered = filtered.filter(solution => {
                return (
                    solution.displayName?.toLowerCase().includes(query) ||
                    solution.friendlyName?.toLowerCase().includes(query) ||
                    solution.uniqueName?.toLowerCase().includes(query) ||
                    solution.publisherName?.toLowerCase().includes(query) ||
                    solution.description?.toLowerCase().includes(query)
                );
            });
        }
        
        // Apply sorting
        this.filteredSolutions = SolutionSelectorConfigValidator.sortSolutions(filtered, this.config);
        
        console.log(`SolutionSelector[${this.config.id}] Final filtering result:`, {
            finalCount: this.filteredSolutions.length,
            hasDefaultSolution: this.filteredSolutions.find(s => s.uniqueName === 'Default'),
            firstFewSolutions: this.filteredSolutions.slice(0, 5).map(s => s.displayName)
        });
    }

    /**
     * Validate current selections against available solutions
     */
    private validateSelections(): void {
        const validSelections = this.selectedSolutions.filter(selected => 
            this.solutions.some(solution => solution.id === selected.id)
        );
        
        if (validSelections.length !== this.selectedSolutions.length) {
            this.selectedSolutions = validSelections;
        }
    }

    /**
     * Emit selection change event
     */
    private emitSelectionEvent(addedSolutions: Solution[], removedSolutions: Solution[]): void {
        const event: SolutionSelectorSelectionEvent = {
            componentId: this.getId(),
            selectedSolutions: this.selectedSolutions,
            addedSolutions,
            removedSolutions,
            timestamp: Date.now()
        };
        
        this.emit('selectionChange', event);
        
        if (this.config.onSelectionChange) {
            this.config.onSelectionChange(this.selectedSolutions);
        }
    }

    /**
     * Emit solutions load event
     */
    private emitLoadEvent(): void {
        const event: SolutionSelectorLoadEvent = {
            componentId: this.getId(),
            solutions: this.solutions,
            filteredCount: this.filteredSolutions.length,
            timestamp: Date.now()
        };
        
        this.emit('solutionsLoad', event);
        
        if (this.config.onSolutionLoad) {
            this.config.onSolutionLoad(this.solutions);
        }
    }

    /**
     * Validate configuration
     */
    protected validateConfig(): void {
        super.validateConfig();
        
        const validation = SolutionSelectorConfigValidator.validate(this.config);
        if (!validation.isValid) {
            throw new Error(`SolutionSelector configuration errors: ${validation.errors.join(', ')}`);
        }
        
        if (validation.warnings.length > 0) {
            validation.warnings.forEach(warning => {
                console.warn(`SolutionSelector warning: ${warning}`);
            });
        }
    }

    /**
     * Handle errors with optional callback
     */
    protected notifyError(error: Error, context?: string): void {
        super.notifyError(error, context);
        
        if (this.config.onError) {
            try {
                this.config.onError(error);
            } catch (callbackError) {
                console.error('Error in onError callback:', callbackError);
            }
        }
    }

    /**
     * Update configuration with validation
     */
    public updateConfig(newConfig: Partial<SolutionSelectorConfig>): void {
        const oldConfig = { ...this.config };
        this.config = { ...this.config, ...newConfig };
        
        try {
            this.validateConfig();
        } catch (error) {
            this.config = oldConfig;
            throw error;
        }
        
        // Reapply filters and sorting if relevant config changed
        const filteringConfigChanged = [
            'showManaged', 'showUnmanaged', 'showInternal', 'showSystem',
            'filterByPublisher', 'excludeSolutions', 'includeSolutions',
            'sortBy', 'sortDirection'
        ].some(key => newConfig[key as keyof SolutionSelectorConfig] !== undefined);
        
        if (filteringConfigChanged) {
            this.applyFiltersAndSort();
        }
        
        this.emit('configChanged', {
            componentId: this.getId(),
            oldConfig,
            newConfig: this.config,
            timestamp: Date.now()
        });
        
        this.notifyUpdate();
    }

    /**
     * Cleanup resources
     */
    public dispose(): void {
        if (this.searchTimer) {
            clearTimeout(this.searchTimer);
            this.searchTimer = null;
        }
        
        super.dispose();
    }
}
