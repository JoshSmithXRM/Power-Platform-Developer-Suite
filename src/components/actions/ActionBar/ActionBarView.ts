import { CSS_CLASSES, ICONS } from '../../base/ComponentConfig';

import { ActionBarConfig, ActionBarAction, ActionBarDropdownItem, ActionBarGroup } from './ActionBarConfig';

/**
 * ActionBarView - HTML generation for ActionBar component
 * This runs in Extension Host context and generates the HTML structure
 */

export interface ActionBarViewState {
    actions: ActionBarAction[];
    groups: ActionBarGroup[];
    loading: boolean;
    disabled: boolean;
    collapsed: boolean;
    overflowActions: ActionBarAction[];
}

export class ActionBarView {
    /**
     * Render the complete HTML for the ActionBar component
     */
    static render(config: ActionBarConfig, state: ActionBarViewState): string {
        const {
            id,
            layout = 'horizontal',
            alignment = 'left',
            spacing = 'normal',
            variant = 'toolbar',
            size = 'medium',
            elevation = 'flat',
            disabled = false,
            readonly = false,
            sticky = false,
            collapsible = false,
            responsive = true,
            className = 'action-bar'
        } = config;

        const {
            actions,
            groups,
            loading,
            collapsed,
            overflowActions
        } = state;

        const containerClass = [
            CSS_CLASSES.COMPONENT_BASE,
            CSS_CLASSES.ACTION_BAR,
            className,
            `action-bar--${layout}`,
            `action-bar--${alignment}`,
            `action-bar--${spacing}`,
            `action-bar--${variant}`,
            `action-bar--${size}`,
            `action-bar--${elevation}`,
            disabled ? CSS_CLASSES.COMPONENT_DISABLED : '',
            loading ? CSS_CLASSES.COMPONENT_LOADING : '',
            readonly ? 'action-bar--readonly' : '',
            sticky ? 'action-bar--sticky' : '',
            collapsible ? 'action-bar--collapsible' : '',
            responsive ? 'action-bar--responsive' : '',
            collapsed ? 'action-bar--collapsed' : ''
        ].filter(Boolean).join(' ');

        return `
            <div class="${containerClass}" 
                 data-component-id="${id}"
                 data-component-type="ActionBar"
                 data-config-layout="${layout}"
                 data-config-alignment="${alignment}"
                 data-config-variant="${variant}"
                 data-config-size="${size}"
                 data-config-disabled="${disabled}"
                 data-config-readonly="${readonly}"
                 data-config-responsive="${responsive}">
                
                ${this.renderActionContainer(id, actions, groups, state, config)}
                
                ${this.renderOverflow(id, overflowActions, config)}
                
                ${this.renderLoadingContainer()}
                ${this.renderErrorContainer()}
                
            </div>
        `;
    }

    /**
     * Render the main action container
     */
    private static renderActionContainer(
        componentId: string,
        actions: ActionBarAction[],
        groups: ActionBarGroup[],
        state: ActionBarViewState,
        config: ActionBarConfig
    ): string {
        if (groups && groups.length > 0) {
            return this.renderGroupedActions(componentId, groups, actions, state, config);
        } else {
            return this.renderFlatActions(componentId, actions, state, config);
        }
    }

    /**
     * Render actions organized in groups
     */
    private static renderGroupedActions(
        componentId: string,
        groups: ActionBarGroup[],
        actions: ActionBarAction[],
        state: ActionBarViewState,
        config: ActionBarConfig
    ): string {
        const groupsHtml = groups.map(group => {
            if (group.visible === false) return '';

            const groupActions = actions.filter(action => group.actions.includes(action.id));
            const actionsHtml = groupActions.map(action => this.renderAction(componentId, action, state, config)).join('');

            const groupClass = [
                'action-bar-group',
                group.collapsible ? 'action-bar-group--collapsible' : '',
                group.collapsed ? 'action-bar-group--collapsed' : ''
            ].filter(Boolean).join(' ');

            return `
                <div class="${groupClass}" 
                     data-group-id="${group.id}"
                     data-collapsible="${group.collapsible}"
                     data-collapsed="${group.collapsed}">
                    ${group.label && config.showGroupLabels ? 
                        `<div class="action-bar-group-label">${group.label}</div>` : ''}
                    <div class="action-bar-group-actions">
                        ${actionsHtml}
                    </div>
                </div>
                ${config.groupSeparators ? '<div class="action-bar-separator"></div>' : ''}
            `;
        }).join('');

        return `<div class="action-bar-actions" data-component-element="actions">${groupsHtml}</div>`;
    }

    /**
     * Render actions in a flat layout
     */
    private static renderFlatActions(
        componentId: string,
        actions: ActionBarAction[],
        state: ActionBarViewState,
        config: ActionBarConfig
    ): string {
        const visibleActions = actions.filter(action => action.visible !== false);
        const actionsHtml = visibleActions
            .map(action => this.renderAction(componentId, action, state, config))
            .join('');

        return `<div class="action-bar-actions" data-component-element="actions">${actionsHtml}</div>`;
    }

    /**
     * Render a single action
     */
    private static renderAction(
        componentId: string,
        action: ActionBarAction,
        state: ActionBarViewState,
        config: ActionBarConfig
    ): string {
        if (action.visible === false) return '';

        switch (action.type) {
            case 'separator':
                return this.renderSeparator();
            case 'dropdown':
                return this.renderDropdownAction(componentId, action, state, config);
            case 'toggle':
                return this.renderToggleAction(componentId, action, state, config);
            default:
                return this.renderButtonAction(componentId, action, state, config);
        }
    }

    /**
     * Render a button action
     */
    private static renderButtonAction(
        componentId: string,
        action: ActionBarAction,
        state: ActionBarViewState,
        config: ActionBarConfig
    ): string {
        const isDisabled = action.disabled || state.disabled || config.readonly;
        const isLoading = action.loading || state.loading;

        const buttonClass = [
            'action-bar-button',
            'action-bar-action',
            action.variant ? `action-bar-button--${action.variant}` : 'action-bar-button--secondary',
            action.size ? `action-bar-button--${action.size}` : '',
            isDisabled ? 'action-bar-button--disabled' : '',
            isLoading ? 'action-bar-button--loading' : '',
            action.badge ? 'action-bar-button--has-badge' : ''
        ].filter(Boolean).join(' ');

        // Get icon from ICONS mapping or use empty string if not found
        const iconKey = action.icon ? action.icon.toUpperCase().replace('-', '_') as keyof typeof ICONS : null;
        const iconValue = isLoading ? ICONS.LOADING : (iconKey && ICONS[iconKey] || '');
        const badge = action.badge ? `<span class="action-bar-badge">${String(action.badge)}</span>` : '';

        return `
            <button type="button" 
                    class="${buttonClass}"
                    id="${componentId}_${action.id}"
                    data-action-id="${action.id}"
                    data-action-type="${action.type || 'button'}"
                    data-component-element="action"
                    title="${action.tooltip || action.label}"
                    ${isDisabled ? 'disabled' : ''}
                    ${action.keyboard ? `data-keyboard="${action.keyboard}"` : ''}>
                ${iconValue ? `<span class="action-icon">${iconValue}</span>` : ''}
                <span class="action-label">${action.label}</span>
                ${badge}
            </button>
        `;
    }

    /**
     * Render a dropdown action
     */
    private static renderDropdownAction(
        componentId: string,
        action: ActionBarAction,
        state: ActionBarViewState,
        config: ActionBarConfig
    ): string {
        const isDisabled = action.disabled || state.disabled || config.readonly;
        const isLoading = action.loading || state.loading;

        const dropdownClass = [
            'action-bar-dropdown',
            'action-bar-action',
            isDisabled ? 'action-bar-dropdown--disabled' : '',
            isLoading ? 'action-bar-dropdown--loading' : ''
        ].filter(Boolean).join(' ');

        const toggleClass = [
            'action-bar-dropdown-toggle',
            'action-bar-button',
            action.variant ? `action-bar-button--${action.variant}` : 'action-bar-button--secondary',
            action.size ? `action-bar-button--${action.size}` : ''
        ].filter(Boolean).join(' ');

        const iconKey = action.icon ? action.icon.toUpperCase().replace('-', '_') as keyof typeof ICONS : null;
        const iconValue = isLoading ? ICONS.LOADING : (iconKey && ICONS[iconKey] || '');
        const dropdownItems = this.renderDropdownItems(componentId, action.id, action.dropdownItems || []);

        return `
            <div class="${dropdownClass}" data-action-id="${action.id}">
                <button type="button" 
                        class="${toggleClass}"
                        id="${componentId}_${action.id}_toggle"
                        data-action-id="${action.id}"
                        data-action-type="dropdown"
                        data-component-element="dropdown-toggle"
                        title="${action.tooltip || action.label}"
                        ${isDisabled ? 'disabled' : ''}
                        aria-haspopup="true"
                        aria-expanded="false">
                    ${iconValue ? `<span class="action-icon">${iconValue}</span>` : ''}
                    <span class="action-label">${action.label}</span>
                    <span class="dropdown-arrow">${ICONS.CHEVRON_DOWN}</span>
                </button>
                <div class="action-bar-dropdown-menu" 
                     data-component-element="dropdown-menu"
                     role="menu"
                     aria-labelledby="${componentId}_${action.id}_toggle">
                    ${dropdownItems}
                </div>
            </div>
        `;
    }

    /**
     * Render dropdown items
     */
    private static renderDropdownItems(componentId: string, actionId: string, items: ActionBarDropdownItem[]): string {
        return items.map(item => {
            if (item.separator) {
                return '<div class="action-bar-dropdown-separator" role="separator"></div>';
            }

            if (item.visible === false) return '';

            const itemClass = [
                'action-bar-dropdown-item',
                item.disabled ? 'action-bar-dropdown-item--disabled' : ''
            ].filter(Boolean).join(' ');

            return `
                <button type="button" 
                        class="${itemClass}"
                        data-action-id="${actionId}"
                        data-item-id="${item.id}"
                        data-component-element="dropdown-item"
                        role="menuitem"
                        ${item.disabled ? 'disabled' : ''}
                        title="${item.label}">
                    ${item.icon ? `<span class="item-icon">${item.icon}</span>` : ''}
                    <span class="item-label">${item.label}</span>
                </button>
            `;
        }).join('');
    }

    /**
     * Render a toggle action
     */
    private static renderToggleAction(
        componentId: string,
        action: ActionBarAction,
        state: ActionBarViewState,
        config: ActionBarConfig
    ): string {
        // Toggle actions would need additional state tracking for checked/unchecked
        // For now, render as a button with toggle styling
        return this.renderButtonAction(componentId, action, state, config)
            .replace('action-bar-button', 'action-bar-button action-bar-toggle');
    }

    /**
     * Render a separator
     */
    private static renderSeparator(): string {
        return '<div class="action-bar-separator" role="separator"></div>';
    }

    /**
     * Render overflow menu for responsive design
     */
    private static renderOverflow(componentId: string, overflowActions: ActionBarAction[], config: ActionBarConfig): string {
        if (!overflowActions || overflowActions.length === 0) {
            return '';
        }

        const overflowButton = config.overflowButton || {
            id: 'overflow',
            label: 'More',
            icon: ICONS.MORE_HORIZONTAL,
            type: 'dropdown'
        };

        const dropdownItems = overflowActions.map(action => ({
            id: action.id,
            label: action.label,
            icon: action.icon,
            disabled: action.disabled,
            visible: action.visible
        }));

        const overflowAction = {
            ...overflowButton,
            dropdownItems
        };

        return `
            <div class="action-bar-overflow" data-component-element="overflow">
                ${this.renderDropdownAction(componentId, overflowAction, { actions: [], groups: [], loading: false, disabled: false, collapsed: false, overflowActions: [] }, config)}
            </div>
        `;
    }

    /**
     * Render the loading container (hidden by default)
     */
    private static renderLoadingContainer(): string {
        return `
            <div class="${CSS_CLASSES.COMPONENT_LOADING_CONTAINER}" data-component-element="loading">
                ${ICONS.LOADING} Loading actions...
            </div>
        `;
    }

    /**
     * Render the error container (hidden by default)
     */
    private static renderErrorContainer(): string {
        return `
            <div class="${CSS_CLASSES.COMPONENT_ERROR_CONTAINER}" data-component-element="error">
                ${ICONS.ERROR} <span data-component-element="error-message"></span>
            </div>
        `;
    }


    /**
     * Generate minimal action bar HTML (for inline use)
     */
    static renderMinimal(
        id: string,
        actions: ActionBarAction[],
        _config?: Partial<ActionBarConfig>
    ): string {
        const actionsHtml = actions.map(action => {
            const isDisabled = action.disabled;
            const buttonClass = [
                'action-bar-button',
                action.variant ? `action-bar-button--${action.variant}` : 'action-bar-button--secondary',
                isDisabled ? 'action-bar-button--disabled' : ''
            ].filter(Boolean).join(' ');

            return `
                <button type="button" 
                        class="${buttonClass}"
                        data-action-id="${action.id}"
                        title="${action.tooltip || action.label}"
                        ${isDisabled ? 'disabled' : ''}>
                    ${action.icon ? `<span class="action-icon">${action.icon}</span>` : ''}
                    <span class="action-label">${action.label}</span>
                </button>
            `;
        }).join('');

        return `
            <div class="action-bar action-bar--minimal" 
                 data-component-id="${id}"
                 data-component-type="ActionBar">
                <div class="action-bar-actions">
                    ${actionsHtml}
                </div>
            </div>
        `;
    }

    /**
     * Generate context menu HTML for actions
     */
    static generateContextMenu(actions: ActionBarAction[]): string {
        const menuItems = actions
            .filter(action => action.visible !== false)
            .map(action => {
                if (action.type === 'separator') {
                    return '<div class="context-menu-separator"></div>';
                }

                const itemClass = [
                    'context-menu-item',
                    action.disabled ? 'context-menu-item--disabled' : ''
                ].filter(Boolean).join(' ');

                return `
                    <div class="${itemClass}" 
                         data-action-id="${action.id}"
                         title="${action.tooltip || action.label}">
                        ${action.icon ? `<span class="menu-icon">${action.icon}</span>` : ''}
                        <span class="menu-label">${action.label}</span>
                        ${action.keyboard ? `<span class="menu-shortcut">${action.keyboard}</span>` : ''}
                    </div>
                `;
            }).join('');

        return `
            <div class="action-bar-context-menu" role="menu">
                ${menuItems}
            </div>
        `;
    }
}