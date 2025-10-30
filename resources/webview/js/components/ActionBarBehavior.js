/**
 * ActionBarBehavior - Webview behavior for ActionBar component
 * Handles all user interactions and DOM manipulation in the browser context
 */

class ActionBarBehavior extends BaseBehavior {
    /**
     * Get component type identifier
     */
    static getComponentType() {
        return 'ActionBar';
    }

    /**
     * Handle component data updates from Extension Host
     * REQUIRED by BaseBehavior - called when event bridge sends updated data
     */
    static onComponentUpdate(instance, data) {
        if (data && data.actions && Array.isArray(data.actions)) {
            console.log(`ActionBar: componentUpdate - updating ${data.actions.length} actions`);

            // Update each action in the DOM
            data.actions.forEach(action => {
                const actionElement = instance.element.querySelector(`[data-action-id="${action.id}"]`);
                if (actionElement) {
                    // Update disabled state
                    if (action.disabled !== undefined) {
                        actionElement.disabled = action.disabled;
                        actionElement.classList.toggle('action-bar-button--disabled', action.disabled);
                    }

                    // Update visible state
                    if (action.visible !== undefined) {
                        actionElement.style.display = action.visible ? '' : 'none';
                    }

                    // Update label if provided
                    if (action.label) {
                        const labelElement = actionElement.querySelector('.action-label');
                        if (labelElement) {
                            labelElement.textContent = action.label;
                        }
                    }
                }
            });

            // Update instance state
            instance.actions = data.actions;
        }
    }

    /**
     * Create the instance object structure
     */
    static createInstance(componentId, config, element) {
        return {
            id: componentId,
            config: { ...config },
            element: element,

            // DOM elements
            actionsContainer: null,
            loadingContainer: null,
            errorContainer: null,
            overflowContainer: null,

            // State
            actions: [],
            groups: [],
            loading: false,
            disabled: false,
            collapsed: false,
            overflowActions: [],

            // Responsive state
            isResponsive: false,
            currentBreakpoint: null,
            resizeObserver: null,

            // Dropdown state
            openDropdowns: new Set(),

            // Event handlers
            boundHandlers: {}
        };
    }

    /**
     * Find and cache DOM elements
     */
    static findDOMElements(instance) {
        const { element } = instance;

        instance.actionsContainer = element.querySelector('[data-component-element="actions"]');
        instance.loadingContainer = element.querySelector('[data-component-element="loading"]');
        instance.errorContainer = element.querySelector('[data-component-element="error"]');
        instance.overflowContainer = element.querySelector('[data-component-element="overflow"]');

        if (!instance.actionsContainer) {
            throw new Error('Actions container element not found');
        }

        console.log(`ActionBarBehavior: DOM elements found for ${instance.id}`, {
            actionsContainerHTML: instance.actionsContainer.innerHTML.substring(0, 200),
            actionElements: instance.actionsContainer.querySelectorAll('[data-action-id]').length
        });
    }

    /**
     * Setup event listeners
     */
    static setupEventListeners(instance) {
        const { element, actionsContainer } = instance;

        // Action button clicks
        instance.boundHandlers.actionClick = (e) => this.handleActionClick(instance, e);
        actionsContainer.addEventListener('click', instance.boundHandlers.actionClick);

        // Dropdown toggle clicks
        instance.boundHandlers.dropdownToggle = (e) => this.handleDropdownToggle(instance, e);
        element.addEventListener('click', instance.boundHandlers.dropdownToggle);

        // Keyboard navigation
        instance.boundHandlers.keyDown = (e) => this.handleKeyDown(instance, e);
        element.addEventListener('keydown', instance.boundHandlers.keyDown);

        // Close dropdowns on outside click
        instance.boundHandlers.documentClick = (e) => this.handleDocumentClick(instance, e);
        document.addEventListener('click', instance.boundHandlers.documentClick);

        // Context menu (if enabled)
        if (instance.config.contextMenu) {
            instance.boundHandlers.contextMenu = (e) => this.handleContextMenu(instance, e);
            element.addEventListener('contextmenu', instance.boundHandlers.contextMenu);
        }

        console.log(`ActionBarBehavior: Event listeners setup for ${instance.id}`);
    }

    /**
     * Initialize component state from DOM
     */
    static initializeState(instance) {
        const { actionsContainer } = instance;

        // Parse actions from DOM elements
        instance.actions = this.parseActionsFromDOM(actionsContainer);

        // Initialize groups if present
        instance.groups = this.parseGroupsFromDOM(actionsContainer);

        // Initialize responsive behavior
        this.initializeResponsive(instance);

        // Check initial responsive state
        if (instance.isResponsive) {
            this.checkResponsiveState(instance);
        }

        console.log(`ActionBarBehavior: State initialized for ${instance.id}`, {
            actionCount: instance.actions.length,
            groupCount: instance.groups.length,
            isResponsive: instance.isResponsive
        });
    }

    /**
     * Initialize responsive behavior
     */
    static initializeResponsive(instance) {
        if (!instance.config.responsive) {
            return;
        }

        instance.isResponsive = true;
        instance.currentBreakpoint = instance.config.breakpoint || 768;

        // Create ResizeObserver to handle responsive behavior
        if (typeof ResizeObserver !== 'undefined') {
            instance.resizeObserver = new ResizeObserver(entries => {
                this.handleResize(instance, entries[0]);
            });

            instance.resizeObserver.observe(instance.element);
        } else {
            // Fallback to window resize event
            instance.boundHandlers.windowResize = () => this.handleWindowResize(instance);
            window.addEventListener('resize', instance.boundHandlers.windowResize);
        }
    }

    /**
     * Handle custom actions beyond componentUpdate
     */
    static handleCustomAction(instance, message) {
        switch (message.command) {
            case 'actions-updated':
                this.updateActions(instance.id, message.data.actions);
                break;

            case 'action-updated':
                this.updateSingleAction(instance.id, message.data.actionId, message.data.updates);
                break;

            case 'loading-state-changed':
                this.setActionLoading(instance, message.data.actionId, message.data.loading);
                break;

            case 'overflow-changed':
                instance.overflowActions = message.data.overflowActions || [];
                break;

            default:
                console.warn(`ActionBarBehavior: Unknown message action: ${message.command}`);
        }
    }

    /**
     * Handle action button clicks
     */
    static handleActionClick(instance, event) {
        const actionElement = event.target.closest('[data-action-id]');
        if (!actionElement || actionElement.disabled) {
            return;
        }

        const actionId = actionElement.getAttribute('data-action-id');
        const actionType = actionElement.getAttribute('data-action-type') || 'button';

        // Don't handle dropdown toggles here (handled separately)
        if (actionType === 'dropdown' && actionElement.classList.contains('action-bar-dropdown-toggle')) {
            return;
        }

        // Handle dropdown item clicks
        if (actionElement.classList.contains('action-bar-dropdown-item')) {
            const itemId = actionElement.getAttribute('data-item-id');
            this.handleDropdownItemClick(instance, actionId, itemId, event);
            return;
        }

        console.log(`ActionBarBehavior: Action clicked: ${actionId}`, {
            availableActions: instance.actions ? instance.actions.map(a => a.id) : 'no actions',
            instanceId: instance.id
        });

        // Find the action configuration
        const action = instance.actions.find(a => a.id === actionId);
        if (!action) {
            console.error(`ActionBarBehavior: Action ${actionId} not found`, {
                availableActions: instance.actions ? instance.actions.map(a => a.id) : 'no actions array',
                instanceId: instance.id,
                actionsCount: instance.actions ? instance.actions.length : 0
            });
            return;
        }

        // Handle confirmation if required
        if (action.confirmMessage) {
            if (!confirm(action.confirmMessage)) {
                return;
            }
        }

        // Set loading state if explicitly configured
        if (action.loading === true) {
            this.setActionLoading(instance, actionId, true);
        }

        // Send message to Extension Host
        ComponentUtils.sendMessage('component-event', {
            componentId: instance.id,
            eventType: 'actionClicked',
            data: {
                actionId: actionId,
                action: action
            }
        });

        // Clear loading state after a short delay if it was set
        if (action.loading === true) {
            setTimeout(() => {
                this.setActionLoading(instance, actionId, false);
            }, 500);
        }
    }

    /**
     * Handle dropdown toggle clicks
     */
    static handleDropdownToggle(instance, event) {
        const toggleElement = event.target.closest('.action-bar-dropdown-toggle');
        if (!toggleElement) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        const actionId = toggleElement.getAttribute('data-action-id');
        const dropdown = toggleElement.closest('.action-bar-dropdown');
        const menu = dropdown.querySelector('.action-bar-dropdown-menu');

        if (!menu) {
            return;
        }

        const isOpen = instance.openDropdowns.has(actionId);

        if (isOpen) {
            this.closeDropdown(instance, actionId);
        } else {
            // Close other open dropdowns first
            this.closeAllDropdowns(instance);
            this.openDropdown(instance, actionId);
        }
    }

    /**
     * Open a dropdown
     */
    static openDropdown(instance, actionId) {
        const dropdown = instance.element.querySelector(`[data-action-id="${actionId}"].action-bar-dropdown`);
        const toggle = dropdown?.querySelector('.action-bar-dropdown-toggle');
        const menu = dropdown?.querySelector('.action-bar-dropdown-menu');

        if (!dropdown || !toggle || !menu) {
            return;
        }

        // Add open state
        dropdown.classList.add('action-bar-dropdown--open');
        toggle.setAttribute('aria-expanded', 'true');
        menu.style.display = 'block';

        // Position the menu
        this.positionDropdownMenu(menu);

        // Track open state
        instance.openDropdowns.add(actionId);

        // Send message to Extension Host
        ComponentUtils.sendMessage('dropdown-opened', {
            componentId: instance.id,
            actionId: actionId,
            timestamp: Date.now()
        });

        console.log(`ActionBarBehavior: Dropdown opened: ${actionId}`);
    }

    /**
     * Close a dropdown
     */
    static closeDropdown(instance, actionId) {
        const dropdown = instance.element.querySelector(`[data-action-id="${actionId}"].action-bar-dropdown`);
        const toggle = dropdown?.querySelector('.action-bar-dropdown-toggle');
        const menu = dropdown?.querySelector('.action-bar-dropdown-menu');

        if (!dropdown || !toggle || !menu) {
            return;
        }

        // Remove open state
        dropdown.classList.remove('action-bar-dropdown--open');
        toggle.setAttribute('aria-expanded', 'false');
        menu.style.display = 'none';

        // Remove from tracking
        instance.openDropdowns.delete(actionId);

        // Send message to Extension Host
        ComponentUtils.sendMessage('dropdown-closed', {
            componentId: instance.id,
            actionId: actionId,
            timestamp: Date.now()
        });

        console.log(`ActionBarBehavior: Dropdown closed: ${actionId}`);
    }

    /**
     * Close all open dropdowns
     */
    static closeAllDropdowns(instance) {
        const openDropdowns = [...instance.openDropdowns];
        openDropdowns.forEach(actionId => {
            this.closeDropdown(instance, actionId);
        });
    }

    /**
     * Handle dropdown item clicks
     */
    static handleDropdownItemClick(instance, actionId, itemId, event) {
        event.preventDefault();
        event.stopPropagation();

        console.log(`ActionBarBehavior: Dropdown item clicked: ${actionId}/${itemId}`);

        // Close the dropdown
        this.closeDropdown(instance, actionId);

        // Send message to Extension Host
        ComponentUtils.sendMessage('dropdown-item-clicked', {
            componentId: instance.id,
            actionId: actionId,
            itemId: itemId,
            timestamp: Date.now()
        });
    }

    /**
     * Handle keyboard navigation
     */
    static handleKeyDown(instance, event) {
        const activeElement = document.activeElement;

        switch (event.key) {
            case 'Escape':
                this.closeAllDropdowns(instance);
                break;

            case 'Enter':
            case ' ':
                if (activeElement && activeElement.closest('.action-bar-button')) {
                    event.preventDefault();
                    activeElement.click();
                }
                break;

            case 'ArrowDown':
                if (activeElement && activeElement.classList.contains('action-bar-dropdown-toggle')) {
                    event.preventDefault();
                    const actionId = activeElement.getAttribute('data-action-id');
                    this.openDropdown(instance, actionId);
                    this.focusFirstMenuItem(instance, actionId);
                }
                break;

            case 'ArrowRight':
            case 'ArrowLeft':
                this.handleArrowNavigation(instance, event);
                break;
        }
    }

    /**
     * Handle arrow key navigation between actions
     */
    static handleArrowNavigation(instance, event) {
        const activeElement = document.activeElement;
        const actionButtons = Array.from(instance.actionsContainer.querySelectorAll('.action-bar-button:not([disabled])'));

        if (!activeElement || !actionButtons.includes(activeElement)) {
            return;
        }

        event.preventDefault();

        const currentIndex = actionButtons.indexOf(activeElement);
        let nextIndex;

        if (event.key === 'ArrowRight') {
            nextIndex = (currentIndex + 1) % actionButtons.length;
        } else {
            nextIndex = (currentIndex - 1 + actionButtons.length) % actionButtons.length;
        }

        actionButtons[nextIndex].focus();
    }

    /**
     * Handle document click (for closing dropdowns)
     */
    static handleDocumentClick(instance, event) {
        if (!event.target.closest(`[data-component-id="${instance.id}"]`)) {
            this.closeAllDropdowns(instance);
        }
    }

    /**
     * Handle context menu
     */
    static handleContextMenu(instance, event) {
        event.preventDefault();

        // Create context menu with all visible actions
        const visibleActions = instance.actions.filter(action => action.visible !== false);

        ComponentUtils.sendMessage('context-menu-requested', {
            componentId: instance.id,
            actions: visibleActions,
            position: { x: event.clientX, y: event.clientY },
            timestamp: Date.now()
        });
    }

    /**
     * Handle responsive resize
     */
    static handleResize(instance, entry) {
        if (!instance.isResponsive) {
            return;
        }

        const containerWidth = entry.contentRect.width;
        this.checkResponsiveState(instance, containerWidth);
    }

    /**
     * Handle window resize (fallback)
     */
    static handleWindowResize(instance) {
        if (!instance.isResponsive) {
            return;
        }

        const containerWidth = instance.element.offsetWidth;
        this.checkResponsiveState(instance, containerWidth);
    }

    /**
     * Check and update responsive state
     */
    static checkResponsiveState(instance, containerWidth) {
        const width = containerWidth || instance.element.offsetWidth;
        const breakpoint = instance.currentBreakpoint;

        if (width < breakpoint && !instance.collapsed) {
            this.handleOverflow(instance);
        } else if (width >= breakpoint && instance.collapsed) {
            this.handleNoOverflow(instance);
        }
    }

    /**
     * Handle overflow situation (narrow container)
     */
    static handleOverflow(instance) {
        const allActions = [...instance.actions];
        const visibleActions = allActions.slice(0, Math.floor(allActions.length / 2));
        const overflowActions = allActions.slice(visibleActions.length);

        instance.overflowActions = overflowActions;
        instance.collapsed = true;

        // Send message to Extension Host
        ComponentUtils.sendMessage('overflow-changed', {
            componentId: instance.id,
            overflowActions: overflowActions,
            visibleActions: visibleActions,
            timestamp: Date.now()
        });
    }

    /**
     * Handle no overflow situation (wide container)
     */
    static handleNoOverflow(instance) {
        instance.overflowActions = [];
        instance.collapsed = false;

        // Send message to Extension Host
        ComponentUtils.sendMessage('overflow-changed', {
            componentId: instance.id,
            overflowActions: [],
            visibleActions: instance.actions,
            timestamp: Date.now()
        });
    }

    /**
     * Set loading state for specific action
     */
    static setActionLoading(instance, actionId, loading) {
        const actionElement = instance.element.querySelector(`[data-action-id="${actionId}"]`);
        if (!actionElement) {
            return;
        }

        if (loading) {
            actionElement.classList.add('action-bar-button--loading');
            actionElement.disabled = true;

            // Store and replace icon with spinner
            const iconElement = actionElement.querySelector('.action-icon');
            if (iconElement) {
                // Store original icon for restoration
                actionElement.dataset.originalIcon = iconElement.innerHTML;
                iconElement.innerHTML = '⏳';
            }
        } else {
            actionElement.classList.remove('action-bar-button--loading');
            actionElement.disabled = false;

            // Restore original icon if it was stored
            const iconElement = actionElement.querySelector('.action-icon');
            if (iconElement && actionElement.dataset.originalIcon) {
                iconElement.innerHTML = actionElement.dataset.originalIcon;
                delete actionElement.dataset.originalIcon;
            }
        }
    }

    /**
     * Update actions from Extension Host
     */
    static updateActions(componentId, actions) {
        const instance = this.instances.get(componentId);
        if (!instance || !instance.actionsContainer) {
            console.warn(`ActionBarBehavior: Cannot update actions for ${componentId}`);
            return;
        }

        console.log(`ActionBarBehavior: Updating ${actions.length} actions for ${componentId}`);

        // Store actions in instance
        instance.actions = actions || [];

        console.log(`ActionBarBehavior: Actions updated for ${componentId}`);
    }

    /**
     * Update a single action
     */
    static updateSingleAction(componentId, actionId, updates) {
        const instance = this.instances.get(componentId);
        if (!instance) {
            return;
        }

        const actionIndex = instance.actions.findIndex(action => action.id === actionId);
        if (actionIndex !== -1) {
            instance.actions[actionIndex] = { ...instance.actions[actionIndex], ...updates };
        }

        // Update DOM element if needed
        const actionElement = instance.element.querySelector(`[data-action-id="${actionId}"]`);
        if (actionElement) {
            if (updates.disabled !== undefined) {
                actionElement.disabled = updates.disabled;
                actionElement.classList.toggle('action-bar-button--disabled', updates.disabled);
            }

            if (updates.visible !== undefined) {
                actionElement.style.display = updates.visible ? '' : 'none';
            }
        }
    }

    /**
     * Position dropdown menu
     */
    static positionDropdownMenu(menuElement) {
        // Reset position
        menuElement.style.left = '';
        menuElement.style.right = '';
        menuElement.style.top = '';

        const rect = menuElement.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Check if menu overflows viewport horizontally
        if (rect.right > viewportWidth) {
            menuElement.style.right = '0';
            menuElement.style.left = 'auto';
        }

        // Check if menu overflows viewport vertically
        if (rect.bottom > viewportHeight) {
            menuElement.style.top = 'auto';
            menuElement.style.bottom = '100%';
        }
    }

    /**
     * Focus first menu item in dropdown
     */
    static focusFirstMenuItem(instance, actionId) {
        const dropdown = instance.element.querySelector(`[data-action-id="${actionId}"].action-bar-dropdown`);
        const firstItem = dropdown?.querySelector('.action-bar-dropdown-item:not([disabled])');

        if (firstItem) {
            firstItem.focus();
        }
    }

    /**
     * Parse actions from DOM elements
     */
    static parseActionsFromDOM(container) {
        const actions = [];
        const actionElements = container.querySelectorAll('[data-action-id]');

        console.log(`ActionBarBehavior: Parsing ${actionElements.length} actions from DOM`);

        actionElements.forEach(element => {
            const actionId = element.getAttribute('data-action-id');
            const actionType = element.getAttribute('data-action-type') || 'button';
            const label = element.querySelector('.action-label')?.textContent || '';

            console.log(`ActionBarBehavior: Parsed action: ${actionId} (${label})`);

            actions.push({
                id: actionId,
                label: label,
                type: actionType,
                disabled: element.disabled || element.classList.contains('action-bar-button--disabled'),
                visible: element.style.display !== 'none'
            });
        });

        console.log(`ActionBarBehavior: Total actions parsed:`, actions.map(a => a.id));
        return actions;
    }

    /**
     * Parse groups from DOM elements
     */
    static parseGroupsFromDOM(container) {
        const groups = [];
        const groupElements = container.querySelectorAll('.action-bar-group');

        groupElements.forEach(element => {
            const groupId = element.getAttribute('data-group-id');
            const label = element.querySelector('.action-bar-group-label')?.textContent || '';
            const actionElements = element.querySelectorAll('[data-action-id]');
            const actionIds = Array.from(actionElements).map(el => el.getAttribute('data-action-id'));

            groups.push({
                id: groupId,
                label: label,
                actions: actionIds,
                visible: element.style.display !== 'none',
                collapsible: element.getAttribute('data-collapsible') === 'true',
                collapsed: element.getAttribute('data-collapsed') === 'true'
            });
        });

        return groups;
    }

    /**
     * Cleanup instance resources
     */
    static cleanupInstance(instance) {
        // Remove event listeners
        Object.entries(instance.boundHandlers).forEach(([event, handler]) => {
            if (event === 'documentClick') {
                document.removeEventListener('click', handler);
            } else if (event === 'windowResize') {
                window.removeEventListener('resize', handler);
            } else {
                const element = event === 'actionClick' ? instance.actionsContainer : instance.element;
                if (element && handler) {
                    element.removeEventListener(event.replace(/[A-Z]/g, m => m.toLowerCase()), handler);
                }
            }
        });

        // Dispose of ResizeObserver
        if (instance.resizeObserver) {
            instance.resizeObserver.disconnect();
        }

        // Close any open dropdowns
        this.closeAllDropdowns(instance);
    }
}

// Register behavior
ActionBarBehavior.register();
