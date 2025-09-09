import { BaseComponentConfig } from '../../base/ComponentInterface';

/**
 * Configuration interface for ActionBarComponent
 * Provides type-safe configuration options for action bars with buttons and dropdowns
 */

export interface ActionBarAction {
    id: string;
    label: string;
    icon?: string;
    tooltip?: string;
    disabled?: boolean;
    visible?: boolean;
    variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'info';
    size?: 'small' | 'medium' | 'large';
    type?: 'button' | 'dropdown' | 'separator' | 'toggle';
    dropdownItems?: ActionBarDropdownItem[];
    confirmMessage?: string;
    keyboard?: string;
    badge?: string | number;
    loading?: boolean;
    onClick?: (actionId: string, context?: any) => void;
}

export interface ActionBarDropdownItem {
    id: string;
    label: string;
    icon?: string;
    disabled?: boolean;
    visible?: boolean;
    separator?: boolean;
    onClick?: (itemId: string, context?: any) => void;
}

export interface ActionBarConfig extends BaseComponentConfig {
    // Basic configuration
    actions?: ActionBarAction[];
    
    // Layout options
    layout?: 'horizontal' | 'vertical' | 'wrap' | 'stack';
    alignment?: 'left' | 'center' | 'right' | 'space-between' | 'space-around';
    spacing?: 'compact' | 'normal' | 'wide';
    
    // Grouping options
    groups?: ActionBarGroup[];
    showGroupLabels?: boolean;
    groupSeparators?: boolean;
    
    // Appearance options
    variant?: 'toolbar' | 'buttonbar' | 'minimal' | 'panel';
    size?: 'small' | 'medium' | 'large';
    theme?: 'auto' | 'light' | 'dark';
    elevation?: 'flat' | 'raised' | 'floating';
    
    // Behavior options
    disabled?: boolean;
    readonly?: boolean;
    autoHide?: boolean;
    sticky?: boolean;
    collapsible?: boolean;
    
    // Responsive options
    responsive?: boolean;
    breakpoint?: number;
    collapseMode?: 'dropdown' | 'hidden' | 'stack';
    overflowButton?: ActionBarAction;
    
    // Event handlers
    onAction?: (actionId: string, action: ActionBarAction, context?: any) => void;
    onDropdownOpen?: (actionId: string) => void;
    onDropdownClose?: (actionId: string) => void;
    onOverflow?: (hiddenActions: ActionBarAction[]) => void;
    
    // Advanced options
    contextMenu?: boolean;
    dragAndDrop?: boolean;
    customizable?: boolean;
    persistLayout?: boolean;
    debugMode?: boolean;
}

export interface ActionBarGroup {
    id: string;
    label?: string;
    actions: string[];
    visible?: boolean;
    collapsible?: boolean;
    collapsed?: boolean;
    priority?: number;
}

/**
 * Event data interfaces
 */
export interface ActionBarActionEvent {
    componentId: string;
    actionId: string;
    action: ActionBarAction;
    context?: any;
    timestamp: number;
}

export interface ActionBarDropdownEvent {
    componentId: string;
    actionId: string;
    state: 'open' | 'close';
    items: ActionBarDropdownItem[];
    timestamp: number;
}

export interface ActionBarOverflowEvent {
    componentId: string;
    hiddenActions: ActionBarAction[];
    visibleActions: ActionBarAction[];
    breakpoint: number;
    timestamp: number;
}

export interface ActionBarLayoutEvent {
    componentId: string;
    layout: 'horizontal' | 'vertical' | 'wrap' | 'stack';
    groups: ActionBarGroup[];
    timestamp: number;
}

/**
 * Default configuration values
 */
export const DEFAULT_ACTION_BAR_CONFIG: Partial<ActionBarConfig> = {
    actions: [],
    layout: 'horizontal',
    alignment: 'left',
    spacing: 'normal',
    variant: 'toolbar',
    size: 'medium',
    theme: 'auto',
    elevation: 'flat',
    disabled: false,
    readonly: false,
    autoHide: false,
    sticky: false,
    collapsible: false,
    responsive: true,
    breakpoint: 768,
    collapseMode: 'dropdown',
    contextMenu: false,
    dragAndDrop: false,
    customizable: false,
    persistLayout: false,
    debugMode: false
};

/**
 * Validation rules for configuration
 */
export const ACTION_BAR_VALIDATION = {
    ACTION_ID_MIN_LENGTH: 1,
    ACTION_ID_MAX_LENGTH: 50,
    LABEL_MAX_LENGTH: 100,
    TOOLTIP_MAX_LENGTH: 200,
    BREAKPOINT_MIN: 320,
    BREAKPOINT_MAX: 1920,
    MAX_ACTIONS: 50,
    MAX_DROPDOWN_ITEMS: 20
};

/**
 * CSS class constants specific to ActionBar
 */
export const ACTION_BAR_CSS = {
    COMPONENT: 'action-bar',
    CONTAINER: 'action-bar-container',
    ACTIONS: 'action-bar-actions',
    ACTION: 'action-bar-action',
    BUTTON: 'action-bar-button',
    DROPDOWN: 'action-bar-dropdown',
    DROPDOWN_TOGGLE: 'action-bar-dropdown-toggle',
    DROPDOWN_MENU: 'action-bar-dropdown-menu',
    DROPDOWN_ITEM: 'action-bar-dropdown-item',
    SEPARATOR: 'action-bar-separator',
    GROUP: 'action-bar-group',
    GROUP_LABEL: 'action-bar-group-label',
    OVERFLOW: 'action-bar-overflow',
    BADGE: 'action-bar-badge',
    
    // Layout variants
    HORIZONTAL: 'action-bar--horizontal',
    VERTICAL: 'action-bar--vertical',
    WRAP: 'action-bar--wrap',
    STACK: 'action-bar--stack',
    
    // Size variants
    SMALL: 'action-bar--small',
    MEDIUM: 'action-bar--medium',
    LARGE: 'action-bar--large',
    
    // Style variants
    TOOLBAR: 'action-bar--toolbar',
    BUTTONBAR: 'action-bar--buttonbar',
    MINIMAL: 'action-bar--minimal',
    PANEL: 'action-bar--panel',
    
    // Elevation variants
    FLAT: 'action-bar--flat',
    RAISED: 'action-bar--raised',
    FLOATING: 'action-bar--floating',
    
    // State modifiers
    DISABLED: 'action-bar--disabled',
    READONLY: 'action-bar--readonly',
    LOADING: 'action-bar--loading',
    STICKY: 'action-bar--sticky',
    COLLAPSED: 'action-bar--collapsed',
    RESPONSIVE: 'action-bar--responsive',
    
    // Button states
    BUTTON_PRIMARY: 'action-bar-button--primary',
    BUTTON_SECONDARY: 'action-bar-button--secondary',
    BUTTON_DANGER: 'action-bar-button--danger',
    BUTTON_SUCCESS: 'action-bar-button--success',
    BUTTON_WARNING: 'action-bar-button--warning',
    BUTTON_INFO: 'action-bar-button--info',
    BUTTON_LOADING: 'action-bar-button--loading',
    BUTTON_DISABLED: 'action-bar-button--disabled',
    
    // Alignment classes
    ALIGN_LEFT: 'action-bar--align-left',
    ALIGN_CENTER: 'action-bar--align-center',
    ALIGN_RIGHT: 'action-bar--align-right',
    ALIGN_SPACE_BETWEEN: 'action-bar--space-between',
    ALIGN_SPACE_AROUND: 'action-bar--space-around'
};

/**
 * Helper functions for configuration validation
 */
export class ActionBarConfigValidator {
    static validate(config: ActionBarConfig): { isValid: boolean; errors: string[]; warnings: string[] } {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Validate required fields
        if (!config.id || typeof config.id !== 'string') {
            errors.push('Component ID is required and must be a string');
        }

        // Validate actions array
        if (config.actions) {
            if (!Array.isArray(config.actions)) {
                errors.push('Actions must be an array');
            } else {
                if (config.actions.length > ACTION_BAR_VALIDATION.MAX_ACTIONS) {
                    errors.push(`Maximum ${ACTION_BAR_VALIDATION.MAX_ACTIONS} actions allowed`);
                }

                // Validate each action
                config.actions.forEach((action, index) => {
                    if (!action.id || typeof action.id !== 'string') {
                        errors.push(`Action at index ${index} must have a valid ID`);
                    } else if (action.id.length > ACTION_BAR_VALIDATION.ACTION_ID_MAX_LENGTH) {
                        errors.push(`Action ID "${action.id}" exceeds maximum length of ${ACTION_BAR_VALIDATION.ACTION_ID_MAX_LENGTH}`);
                    }

                    if (!action.label || typeof action.label !== 'string') {
                        errors.push(`Action "${action.id}" must have a valid label`);
                    } else if (action.label.length > ACTION_BAR_VALIDATION.LABEL_MAX_LENGTH) {
                        errors.push(`Action label "${action.label}" exceeds maximum length of ${ACTION_BAR_VALIDATION.LABEL_MAX_LENGTH}`);
                    }

                    if (action.tooltip && action.tooltip.length > ACTION_BAR_VALIDATION.TOOLTIP_MAX_LENGTH) {
                        errors.push(`Tooltip for action "${action.id}" exceeds maximum length of ${ACTION_BAR_VALIDATION.TOOLTIP_MAX_LENGTH}`);
                    }

                    // Validate dropdown items
                    if (action.type === 'dropdown' && action.dropdownItems) {
                        if (action.dropdownItems.length > ACTION_BAR_VALIDATION.MAX_DROPDOWN_ITEMS) {
                            errors.push(`Dropdown "${action.id}" exceeds maximum ${ACTION_BAR_VALIDATION.MAX_DROPDOWN_ITEMS} items`);
                        }
                        
                        action.dropdownItems.forEach((item, itemIndex) => {
                            if (!item.id || !item.label) {
                                errors.push(`Dropdown item at index ${itemIndex} in action "${action.id}" must have ID and label`);
                            }
                        });
                    }
                });

                // Check for duplicate action IDs
                const actionIds = config.actions.map(a => a.id);
                const duplicates = actionIds.filter((id, index) => actionIds.indexOf(id) !== index);
                if (duplicates.length > 0) {
                    errors.push(`Duplicate action IDs found: ${duplicates.join(', ')}`);
                }
            }
        }

        // Validate callback functions
        if (config.onAction && typeof config.onAction !== 'function') {
            errors.push('onAction must be a function');
        }

        // Validate breakpoint
        if (config.breakpoint !== undefined) {
            if (typeof config.breakpoint !== 'number' ||
                config.breakpoint < ACTION_BAR_VALIDATION.BREAKPOINT_MIN ||
                config.breakpoint > ACTION_BAR_VALIDATION.BREAKPOINT_MAX) {
                errors.push(`Breakpoint must be between ${ACTION_BAR_VALIDATION.BREAKPOINT_MIN} and ${ACTION_BAR_VALIDATION.BREAKPOINT_MAX} pixels`);
            }
        }

        // Validate enum values
        const validLayouts = ['horizontal', 'vertical', 'wrap', 'stack'];
        if (config.layout && !validLayouts.includes(config.layout)) {
            errors.push(`Layout must be one of: ${validLayouts.join(', ')}`);
        }

        const validSizes = ['small', 'medium', 'large'];
        if (config.size && !validSizes.includes(config.size)) {
            errors.push(`Size must be one of: ${validSizes.join(', ')}`);
        }

        const validVariants = ['toolbar', 'buttonbar', 'minimal', 'panel'];
        if (config.variant && !validVariants.includes(config.variant)) {
            errors.push(`Variant must be one of: ${validVariants.join(', ')}`);
        }

        // Warnings
        if (!config.actions || config.actions.length === 0) {
            warnings.push('No actions provided - action bar will be empty');
        }

        if (config.responsive && !config.breakpoint) {
            warnings.push('Responsive mode enabled but no breakpoint specified - using default');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    static sanitizeConfig(config: ActionBarConfig): ActionBarConfig {
        return {
            ...config,
            id: config.id?.trim(),
            className: config.className?.trim(),
            actions: config.actions?.map(action => ({
                ...action,
                id: action.id?.trim(),
                label: action.label?.trim(),
                tooltip: action.tooltip?.trim()
            }))
        };
    }
}