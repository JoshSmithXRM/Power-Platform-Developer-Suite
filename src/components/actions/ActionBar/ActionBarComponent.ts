import { BaseComponent } from '../../base/BaseComponent';
import { ActionBarConfig, ActionBarAction, ActionBarGroup, DEFAULT_ACTION_BAR_CONFIG } from './ActionBarConfig';
import { ActionBarView } from './ActionBarView';

/**
 * ActionBarComponent - Reusable action bar with buttons, dropdowns, and groups
 * Used by panels that need action buttons, toolbars, or button groups
 * Supports responsive design, overflow handling, and multi-instance usage
 */
export class ActionBarComponent extends BaseComponent {
    protected config: ActionBarConfig;
    private actions: ActionBarAction[] = [];
    private groups: ActionBarGroup[] = [];
    private loading: boolean = false;
    private disabled: boolean = false;
    private collapsed: boolean = false;
    private overflowActions: ActionBarAction[] = [];

    constructor(config: ActionBarConfig) {
        // Merge with defaults
        const mergedConfig = { ...DEFAULT_ACTION_BAR_CONFIG, ...config };
        super(mergedConfig);
        
        this.config = mergedConfig;
        this.validateConfig();
        
        // Set initial state
        if (config.actions) {
            this.actions = [...config.actions];
        }
        if (config.groups) {
            this.groups = [...config.groups];
        }
        if (config.disabled) {
            this.disabled = config.disabled;
        }
    }

    /**
     * Generate HTML for this component (Extension Host context)
     */
    public generateHTML(): string {
        return ActionBarView.render(this.config, {
            actions: this.actions,
            groups: this.groups,
            loading: this.loading,
            disabled: this.disabled,
            collapsed: this.collapsed,
            overflowActions: this.overflowActions
        });
    }

    /**
     * Get the CSS file path for this component
     */
    public getCSSFile(): string {
        return 'components/action-bar.css';
    }

    /**
     * Get the behavior script file path for this component
     */
    public getBehaviorScript(): string {
        return 'components/ActionBarBehavior.js';
    }

    /**
     * Get the default CSS class name for this component type
     */
    protected getDefaultClassName(): string {
        return 'action-bar';
    }

    /**
     * Set the list of actions
     */
    public setActions(actions: ActionBarAction[]): void {
        const oldActions = [...this.actions];
        this.actions = [...actions];
        
        this.notifyStateChange({
            actions: this.actions,
            oldActions,
            actionCount: this.actions.length
        });
        
        this.notifyUpdate();
    }

    /**
     * Get the list of actions
     */
    public getActions(): ActionBarAction[] {
        return [...this.actions];
    }

    /**
     * Add a single action
     */
    public addAction(action: ActionBarAction, position?: number): void {
        const newActions = [...this.actions];
        
        if (position !== undefined && position >= 0 && position <= newActions.length) {
            newActions.splice(position, 0, action);
        } else {
            newActions.push(action);
        }
        
        this.setActions(newActions);
        
        this.emit('actionAdded', {
            componentId: this.getId(),
            action,
            position: position || newActions.length - 1,
            timestamp: Date.now()
        });
    }

    /**
     * Remove an action by ID
     */
    public removeAction(actionId: string): boolean {
        const actionIndex = this.actions.findIndex(action => action.id === actionId);
        if (actionIndex === -1) {
            return false;
        }

        const removedAction = this.actions[actionIndex];
        const newActions = this.actions.filter(action => action.id !== actionId);
        this.setActions(newActions);

        this.emit('actionRemoved', {
            componentId: this.getId(),
            actionId,
            removedAction,
            timestamp: Date.now()
        });

        return true;
    }

    /**
     * Update an existing action
     */
    public updateAction(actionId: string, updates: Partial<ActionBarAction>): boolean {
        const actionIndex = this.actions.findIndex(action => action.id === actionId);
        if (actionIndex === -1) {
            return false;
        }

        const oldAction = { ...this.actions[actionIndex] };
        const newActions = [...this.actions];
        newActions[actionIndex] = { ...newActions[actionIndex], ...updates };
        
        this.setActions(newActions);

        this.emit('actionUpdated', {
            componentId: this.getId(),
            actionId,
            oldAction,
            newAction: newActions[actionIndex],
            timestamp: Date.now()
        });

        return true;
    }

    /**
     * Get a specific action by ID
     */
    public getAction(actionId: string): ActionBarAction | null {
        return this.actions.find(action => action.id === actionId) || null;
    }

    /**
     * Enable or disable an action
     */
    public setActionDisabled(actionId: string, disabled: boolean): boolean {
        return this.updateAction(actionId, { disabled });
    }

    /**
     * Show or hide an action
     */
    public setActionVisible(actionId: string, visible: boolean): boolean {
        return this.updateAction(actionId, { visible });
    }

    /**
     * Set loading state for an action
     */
    public setActionLoading(actionId: string, loading: boolean): boolean {
        return this.updateAction(actionId, { loading });
    }

    /**
     * Set badge for an action
     */
    public setActionBadge(actionId: string, badge: string | number | undefined): boolean {
        return this.updateAction(actionId, { badge });
    }

    /**
     * Set the list of action groups
     */
    public setGroups(groups: ActionBarGroup[]): void {
        const oldGroups = [...this.groups];
        this.groups = [...groups];
        
        this.notifyStateChange({
            groups: this.groups,
            oldGroups,
            groupCount: this.groups.length
        });
        
        this.notifyUpdate();
    }

    /**
     * Get the list of action groups
     */
    public getGroups(): ActionBarGroup[] {
        return [...this.groups];
    }

    /**
     * Add a new group
     */
    public addGroup(group: ActionBarGroup): void {
        const newGroups = [...this.groups, group];
        this.setGroups(newGroups);
        
        this.emit('groupAdded', {
            componentId: this.getId(),
            group,
            timestamp: Date.now()
        });
    }

    /**
     * Remove a group by ID
     */
    public removeGroup(groupId: string): boolean {
        const groupIndex = this.groups.findIndex(group => group.id === groupId);
        if (groupIndex === -1) {
            return false;
        }

        const removedGroup = this.groups[groupIndex];
        const newGroups = this.groups.filter(group => group.id !== groupId);
        this.setGroups(newGroups);

        this.emit('groupRemoved', {
            componentId: this.getId(),
            groupId,
            removedGroup,
            timestamp: Date.now()
        });

        return true;
    }

    /**
     * Set loading state
     */
    public setLoading(loading: boolean): void {
        const oldLoading = this.loading;
        this.loading = loading;
        
        this.notifyStateChange({
            loading,
            oldLoading
        });
        
        this.notifyUpdate();
    }

    /**
     * Get loading state
     */
    public isLoading(): boolean {
        return this.loading;
    }

    /**
     * Set disabled state
     */
    public setDisabled(disabled: boolean): void {
        const oldDisabled = this.disabled;
        this.disabled = disabled;
        this.updateConfig({ disabled });
        
        this.notifyStateChange({
            disabled,
            oldDisabled
        });
        
        this.notifyUpdate();
    }

    /**
     * Check if component is disabled
     */
    public isDisabled(): boolean {
        return this.disabled;
    }

    /**
     * Set collapsed state (for collapsible action bars)
     */
    public setCollapsed(collapsed: boolean): void {
        const oldCollapsed = this.collapsed;
        this.collapsed = collapsed;
        
        this.notifyStateChange({
            collapsed,
            oldCollapsed
        });
        
        this.emit('collapseToggled', {
            componentId: this.getId(),
            collapsed,
            timestamp: Date.now()
        });
        
        this.notifyUpdate();
    }

    /**
     * Check if component is collapsed
     */
    public isCollapsed(): boolean {
        return this.collapsed;
    }

    /**
     * Set overflow actions (for responsive design)
     */
    public setOverflowActions(overflowActions: ActionBarAction[]): void {
        const oldOverflowActions = [...this.overflowActions];
        this.overflowActions = [...overflowActions];
        
        this.notifyStateChange({
            overflowActions: this.overflowActions,
            oldOverflowActions
        });
        
        this.emit('overflowChanged', {
            componentId: this.getId(),
            overflowActions: this.overflowActions,
            visibleActions: this.actions.filter(action => !overflowActions.includes(action)),
            timestamp: Date.now()
        });
        
        this.notifyUpdate();
    }

    /**
     * Get overflow actions
     */
    public getOverflowActions(): ActionBarAction[] {
        return [...this.overflowActions];
    }

    /**
     * Execute an action by ID
     */
    public executeAction(actionId: string, context?: any): boolean {
        const action = this.getAction(actionId);
        if (!action || action.disabled) {
            return false;
        }

        // Show confirmation if required
        if (action.confirmMessage) {
            // This would be handled in the webview behavior
            this.emit('actionConfirmationRequired', {
                componentId: this.getId(),
                actionId,
                action,
                confirmMessage: action.confirmMessage,
                context,
                timestamp: Date.now()
            });
            return true;
        }

        // Execute action callback if provided
        if (action.onClick) {
            try {
                action.onClick(actionId, context);
            } catch (error) {
                this.notifyError(error as Error, `Action callback: ${actionId}`);
                return false;
            }
        }

        // Emit action event
        this.emit('actionExecuted', {
            componentId: this.getId(),
            actionId,
            action,
            context,
            timestamp: Date.now()
        });

        // Trigger global onAction callback if provided
        if (this.config.onAction) {
            try {
                this.config.onAction(actionId, action, context);
            } catch (error) {
                this.notifyError(error as Error, `onAction callback: ${actionId}`);
            }
        }

        return true;
    }

    /**
     * Validate the current state
     */
    public validate(): { isValid: boolean; error?: string } {
        if (this.actions.length === 0) {
            return {
                isValid: false,
                error: 'No actions defined'
            };
        }

        // Check for duplicate action IDs
        const actionIds = this.actions.map(action => action.id);
        const duplicates = actionIds.filter((id, index) => actionIds.indexOf(id) !== index);
        if (duplicates.length > 0) {
            return {
                isValid: false,
                error: `Duplicate action IDs: ${duplicates.join(', ')}`
            };
        }

        return { isValid: true };
    }

    /**
     * Get current component state
     */
    public getState() {
        return {
            actions: this.actions,
            groups: this.groups,
            loading: this.loading,
            disabled: this.disabled,
            collapsed: this.collapsed,
            overflowActions: this.overflowActions,
            actionCount: this.actions.length,
            groupCount: this.groups.length,
            isValid: this.validate().isValid
        };
    }

    /**
     * Enhanced configuration validation
     */
    protected validateConfig(): void {
        super.validateConfig();
        
        if (this.config.onAction && typeof this.config.onAction !== 'function') {
            throw new Error('onAction must be a function');
        }
        
        if (this.config.actions && !Array.isArray(this.config.actions)) {
            throw new Error('actions must be an array');
        }

        if (this.config.groups && !Array.isArray(this.config.groups)) {
            throw new Error('groups must be an array');
        }

        // Validate actions if provided
        if (this.config.actions) {
            this.config.actions.forEach((action, index) => {
                if (!action.id || !action.label) {
                    throw new Error(`Action at index ${index} must have id and label`);
                }
            });
        }
    }

    /**
     * Update configuration with validation
     */
    public updateConfig(newConfig: Partial<ActionBarConfig>): void {
        const oldConfig = { ...this.config };
        this.config = { ...this.config, ...newConfig };
        
        // Re-validate after config update
        try {
            this.validateConfig();
        } catch (error) {
            // Revert to old config if validation fails
            this.config = oldConfig;
            throw error;
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
     * Reset to default state
     */
    public reset(): void {
        this.actions = this.config.actions ? [...this.config.actions] : [];
        this.groups = this.config.groups ? [...this.config.groups] : [];
        this.loading = false;
        this.disabled = this.config.disabled || false;
        this.collapsed = false;
        this.overflowActions = [];

        this.emit('reset', {
            componentId: this.getId(),
            timestamp: Date.now()
        });

        this.notifyUpdate();
    }
}