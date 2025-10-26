/**
 * FilterPanelBehavior - Webview behavior for FilterPanel component
 * Handles all user interactions, dynamic filter building, and DOM manipulation
 */

class FilterPanelBehavior {
    static instances = new Map();
    static conditionCounter = 0;

    /**
     * Initialize a FilterPanel component instance
     */
    static initialize(componentId, config, element) {
        if (!componentId || !element) {
            console.error('FilterPanelBehavior: componentId and element are required');
            return null;
        }

        if (this.instances.has(componentId)) {
            return this.instances.get(componentId);
        }

        const instance = {
            id: componentId,
            config: { ...config },
            element: element,

            // DOM elements
            header: null,
            content: null,
            quickFiltersContainer: null,
            conditionsContainer: null,
            conditionsList: null,
            addConditionBtn: null,
            applyBtn: null,
            clearBtn: null,
            previewCount: null,

            // State
            collapsed: config.defaultCollapsed || false,
            activeQuickFilters: new Set(),
            filterConditions: [],
            fieldConfigs: [],

            // Event handlers
            boundHandlers: {}
        };

        try {
            // Load field configs from JSON script tag
            this.loadFieldConfigs(instance);

            // Find DOM elements
            this.findDOMElements(instance);

            // Setup event listeners
            this.setupEventListeners(instance);

            // Initialize state
            this.initializeState(instance);

            // Register instance
            this.instances.set(componentId, instance);

            console.log(`FilterPanelBehavior: Initialized ${componentId}`);
            return instance;

        } catch (error) {
            console.error(`FilterPanelBehavior: Failed to initialize ${componentId}:`, error);
            return null;
        }
    }

    /**
     * Load field configurations from script tag
     */
    static loadFieldConfigs(instance) {
        const scriptTag = document.querySelector(`script[data-field-configs="${instance.id}"]`);
        if (scriptTag) {
            try {
                instance.fieldConfigs = JSON.parse(scriptTag.textContent);
            } catch (error) {
                console.error('FilterPanelBehavior: Failed to parse field configs:', error);
                instance.fieldConfigs = [];
            }
        }
    }

    /**
     * Find and cache DOM elements
     */
    static findDOMElements(instance) {
        const { element } = instance;

        instance.header = element.querySelector('.filter-panel-header');
        instance.content = element.querySelector('.filter-panel-content');
        instance.quickFiltersContainer = element.querySelector('.quick-filters');
        instance.conditionsContainer = element.querySelector('.filter-conditions-container');
        instance.conditionsList = element.querySelector('.filter-conditions-list');
        instance.addConditionBtn = element.querySelector('[data-action="addCondition"]');
        instance.applyBtn = element.querySelector('[data-action="applyFilters"]');
        instance.clearBtn = element.querySelector('[data-action="clearFilters"]');
        instance.previewCount = element.querySelector('[data-preview-count]');

        if (!instance.conditionsList) {
            throw new Error('Filter conditions list element not found');
        }
    }

    /**
     * Setup event listeners
     */
    static setupEventListeners(instance) {
        const { element, header, addConditionBtn, applyBtn, clearBtn } = instance;

        // Collapsible header
        if (header && instance.config.collapsible) {
            instance.boundHandlers.headerClick = () => this.toggleCollapse(instance);
            header.addEventListener('click', instance.boundHandlers.headerClick);
        }

        // Quick filter checkboxes
        if (instance.quickFiltersContainer) {
            const checkboxes = instance.quickFiltersContainer.querySelectorAll('.quick-filter-checkbox');
            checkboxes.forEach(checkbox => {
                checkbox.addEventListener('change', (e) => this.handleQuickFilterChange(instance, e));
            });
        }

        // Add condition button
        if (addConditionBtn) {
            instance.boundHandlers.addCondition = () => this.addCondition(instance);
            addConditionBtn.addEventListener('click', instance.boundHandlers.addCondition);
        }

        // Apply filters button
        if (applyBtn) {
            instance.boundHandlers.applyFilters = () => this.applyFilters(instance);
            applyBtn.addEventListener('click', instance.boundHandlers.applyFilters);
        }

        // Clear filters button
        if (clearBtn) {
            instance.boundHandlers.clearFilters = () => this.clearAllFilters(instance);
            clearBtn.addEventListener('click', instance.boundHandlers.clearFilters);
        }

        // Event delegation for dynamically added condition rows
        instance.conditionsList.addEventListener('change', (e) => {
            if (e.target.matches('[data-field-select]')) {
                this.handleFieldChange(instance, e.target);
            } else if (e.target.matches('[data-operator-select]')) {
                this.handleOperatorChange(instance, e.target);
            }
        });

        instance.conditionsList.addEventListener('click', (e) => {
            if (e.target.matches('[data-action="removeCondition"]') ||
                e.target.closest('[data-action="removeCondition"]')) {
                const btn = e.target.closest('[data-action="removeCondition"]');
                this.removeCondition(instance, btn);
            }
        });
    }

    /**
     * Initialize state
     */
    static initializeState(instance) {
        if (instance.collapsed && instance.content) {
            instance.content.style.display = 'none';
        }
    }

    /**
     * Toggle collapsed state
     */
    static toggleCollapse(instance) {
        if (!instance.config.collapsible) return;

        instance.collapsed = !instance.collapsed;

        const toggleIcon = instance.header.querySelector('.filter-panel-toggle');
        if (toggleIcon) {
            toggleIcon.textContent = instance.collapsed ? '▸' : '▾';
        }

        if (instance.content) {
            instance.content.style.display = instance.collapsed ? 'none' : 'block';
        }

        // Notify Extension Host
        this.sendMessage(instance, 'filterPanelCollapsed', {
            collapsed: instance.collapsed
        });
    }

    /**
     * Handle quick filter checkbox change
     */
    static handleQuickFilterChange(instance, event) {
        const checkbox = event.target;
        const filterId = checkbox.dataset.filterId;

        if (checkbox.checked) {
            instance.activeQuickFilters.add(filterId);
        } else {
            instance.activeQuickFilters.delete(filterId);
        }

        // Auto-apply if configured
        if (instance.config.autoApplyQuickFilters) {
            this.applyFilters(instance);
        }
    }

    /**
     * Add a new filter condition row
     */
    static addCondition(instance, conditionData = null) {
        const maxConditions = instance.conditionsContainer.dataset.maxConditions || 10;

        if (instance.filterConditions.length >= maxConditions) {
            console.warn(`FilterPanelBehavior: Maximum of ${maxConditions} conditions reached`);
            return;
        }

        const conditionId = conditionData?.id || `condition-${Date.now()}-${this.conditionCounter++}`;

        // Generate HTML from View (we need to import the View's generateConditionRow method)
        // For now, we'll inline the HTML generation
        const conditionHTML = this.generateConditionHTML(
            instance,
            conditionId,
            conditionData?.field || '',
            conditionData?.operator || '',
            conditionData?.value || '',
            conditionData?.logicalOperator || 'AND'
        );

        instance.conditionsList.insertAdjacentHTML('beforeend', conditionHTML);

        // Add to state
        const condition = {
            id: conditionId,
            field: conditionData?.field || '',
            operator: conditionData?.operator || '',
            value: conditionData?.value || '',
            logicalOperator: conditionData?.logicalOperator || 'AND'
        };
        instance.filterConditions.push(condition);

        // Update UI state
        this.updateAddButtonState(instance);
    }

    /**
     * Remove a filter condition row
     */
    static removeCondition(instance, button) {
        const conditionRow = button.closest('.filter-condition');
        if (!conditionRow) return;

        const conditionId = conditionRow.dataset.conditionId;

        // Remove from DOM
        conditionRow.remove();

        // Remove from state
        instance.filterConditions = instance.filterConditions.filter(c => c.id !== conditionId);

        // Update UI state
        this.updateAddButtonState(instance);
    }

    /**
     * Handle field selection change
     */
    static handleFieldChange(instance, fieldSelect) {
        const conditionRow = fieldSelect.closest('.filter-condition');
        if (!conditionRow) return;

        const conditionId = conditionRow.dataset.conditionId;
        const selectedField = fieldSelect.value;

        // Find field config
        const fieldConfig = instance.fieldConfigs.find(f => f.field === selectedField);

        // Update operator dropdown
        const operatorSelect = conditionRow.querySelector('[data-operator-select]');
        if (operatorSelect) {
            if (fieldConfig) {
                operatorSelect.disabled = false;
                operatorSelect.innerHTML = '<option value="">Select operator...</option>' +
                    fieldConfig.operators.map(op =>
                        `<option value="${op}">${this.getOperatorLabel(op)}</option>`
                    ).join('');
            } else {
                operatorSelect.disabled = true;
                operatorSelect.innerHTML = '<option value="">Select field first</option>';
            }
        }

        // Reset value input
        const valueContainer = conditionRow.querySelector('.filter-value-container');
        if (valueContainer && fieldConfig) {
            valueContainer.innerHTML = this.generateValueInputHTML(fieldConfig, '', '');
        }

        // Update state
        const condition = instance.filterConditions.find(c => c.id === conditionId);
        if (condition) {
            condition.field = selectedField;
            condition.operator = '';
            condition.value = '';
        }
    }

    /**
     * Handle operator selection change
     */
    static handleOperatorChange(instance, operatorSelect) {
        const conditionRow = operatorSelect.closest('.filter-condition');
        if (!conditionRow) return;

        const conditionId = conditionRow.dataset.conditionId;
        const selectedOperator = operatorSelect.value;

        // Get field
        const fieldSelect = conditionRow.querySelector('[data-field-select]');
        const fieldConfig = instance.fieldConfigs.find(f => f.field === fieldSelect.value);

        // Update value input based on operator
        const valueContainer = conditionRow.querySelector('.filter-value-container');
        if (valueContainer && fieldConfig) {
            valueContainer.innerHTML = this.generateValueInputHTML(fieldConfig, selectedOperator, '');
        }

        // Update state
        const condition = instance.filterConditions.find(c => c.id === conditionId);
        if (condition) {
            condition.operator = selectedOperator;
            condition.value = '';
        }
    }

    /**
     * Apply filters
     */
    static applyFilters(instance) {
        // Collect all conditions
        const conditions = this.collectConditions(instance);

        // Validate conditions
        const validConditions = conditions.filter(c => {
            if (!c.field || !c.operator) return false;
            if (c.operator !== 'isNull' && c.operator !== 'isNotNull' && !c.value) return false;
            return true;
        });

        // Notify Extension Host
        this.sendMessage(instance, 'filtersApplied', {
            quickFilters: Array.from(instance.activeQuickFilters),
            advancedFilters: validConditions
        });
    }

    /**
     * Clear all filters
     */
    static clearAllFilters(instance) {
        // Clear quick filters
        instance.activeQuickFilters.clear();
        const quickCheckboxes = instance.element.querySelectorAll('.quick-filter-checkbox');
        quickCheckboxes.forEach(cb => cb.checked = false);

        // Clear advanced filters
        instance.filterConditions = [];
        instance.conditionsList.innerHTML = '';

        // Update UI
        this.updateAddButtonState(instance);
        if (instance.previewCount) {
            instance.previewCount.textContent = '';
        }

        // Notify Extension Host
        this.sendMessage(instance, 'filtersCleared', {});
    }

    /**
     * Collect current filter conditions from DOM
     */
    static collectConditions(instance) {
        const conditions = [];
        const rows = instance.conditionsList.querySelectorAll('.filter-condition');

        rows.forEach((row, index) => {
            const fieldSelect = row.querySelector('[data-field-select]');
            const operatorSelect = row.querySelector('[data-operator-select]');
            const valueInput = row.querySelector('[data-value-input]');
            const valueInput2 = row.querySelector('[data-value-input-2]');
            const logicalOperator = row.querySelector('[data-logical-operator]');

            const condition = {
                id: row.dataset.conditionId,
                field: fieldSelect?.value || '',
                operator: operatorSelect?.value || '',
                value: valueInput?.value || '',
                logicalOperator: logicalOperator?.value || 'AND'
            };

            // Handle 'between' operator with two values
            if (condition.operator === 'between' && valueInput2) {
                condition.value2 = valueInput2.value;
            }

            // Last condition doesn't need logical operator
            if (index === rows.length - 1) {
                delete condition.logicalOperator;
            }

            conditions.push(condition);
        });

        return conditions;
    }

    /**
     * Update "Add Condition" button state
     */
    static updateAddButtonState(instance) {
        if (!instance.addConditionBtn) return;

        const maxConditions = instance.conditionsContainer.dataset.maxConditions || 10;
        const currentCount = instance.filterConditions.length;

        if (currentCount >= maxConditions) {
            instance.addConditionBtn.disabled = true;
            instance.addConditionBtn.title = `Maximum of ${maxConditions} conditions reached`;
        } else {
            instance.addConditionBtn.disabled = false;
            instance.addConditionBtn.title = 'Add filter condition';
        }
    }

    /**
     * Generate condition row HTML (inline version)
     */
    static generateConditionHTML(instance, conditionId, fieldValue, operatorValue, value, logicalOperator) {
        const selectedField = instance.fieldConfigs.find(f => f.field === fieldValue);

        return `
            <div class="filter-condition" data-condition-id="${conditionId}">
                <div class="filter-condition-row">
                    <select class="filter-field" data-field-select>
                        <option value="">Select field...</option>
                        ${instance.fieldConfigs.map(f => `
                            <option value="${f.field}" ${f.field === fieldValue ? 'selected' : ''}>
                                ${f.label}
                            </option>
                        `).join('')}
                    </select>

                    <select class="filter-operator" data-operator-select ${!selectedField ? 'disabled' : ''}>
                        <option value="">Select operator...</option>
                        ${selectedField ? this.generateOperatorOptions(selectedField, operatorValue) : ''}
                    </select>

                    <div class="filter-value-container">
                        ${selectedField ? this.generateValueInputHTML(selectedField, operatorValue, value) : `
                            <input type="text" class="filter-value" disabled placeholder="Select field first" />
                        `}
                    </div>

                    <button class="btn-icon-only btn-remove-condition" data-action="removeCondition" title="Remove condition">
                        ×
                    </button>
                </div>

                <div class="filter-logical-operator">
                    <select class="logical-operator-select" data-logical-operator>
                        <option value="AND" ${logicalOperator === 'AND' ? 'selected' : ''}>AND</option>
                        <option value="OR" ${logicalOperator === 'OR' ? 'selected' : ''}>OR</option>
                    </select>
                </div>
            </div>
        `;
    }

    /**
     * Generate operator options HTML
     */
    static generateOperatorOptions(fieldConfig, selectedValue) {
        return fieldConfig.operators.map(op => `
            <option value="${op}" ${op === selectedValue ? 'selected' : ''}>
                ${this.getOperatorLabel(op)}
            </option>
        `).join('');
    }

    /**
     * Generate value input HTML based on field type and operator
     */
    static generateValueInputHTML(fieldConfig, operator, value) {
        // isNull / isNotNull don't need value input
        if (operator === 'isNull' || operator === 'isNotNull') {
            return `<span class="filter-no-value">No value needed</span>`;
        }

        // Boolean type
        if (fieldConfig.type === 'boolean') {
            return `
                <select class="filter-value" data-value-input>
                    <option value="">Select value...</option>
                    <option value="true" ${value === 'true' || value === true ? 'selected' : ''}>Yes</option>
                    <option value="false" ${value === 'false' || value === false ? 'selected' : ''}>No</option>
                </select>
            `;
        }

        // Select type
        if (fieldConfig.type === 'select' && fieldConfig.options) {
            return `
                <select class="filter-value" data-value-input>
                    <option value="">Select value...</option>
                    ${fieldConfig.options.map(opt => `
                        <option value="${opt.value}" ${opt.value === value ? 'selected' : ''}>
                            ${opt.label}
                        </option>
                    `).join('')}
                </select>
            `;
        }

        // Between operator needs two inputs
        if (operator === 'between') {
            const value1 = Array.isArray(value) ? value[0] : value;
            const value2 = Array.isArray(value) ? value[1] : '';

            return `
                <input
                    type="${this.getInputType(fieldConfig.type)}"
                    class="filter-value filter-value-between"
                    data-value-input
                    placeholder="${fieldConfig.placeholder || 'From'}"
                    value="${value1 || ''}"
                />
                <span class="filter-value-separator">to</span>
                <input
                    type="${this.getInputType(fieldConfig.type)}"
                    class="filter-value filter-value-between"
                    data-value-input-2
                    placeholder="${fieldConfig.placeholder || 'To'}"
                    value="${value2 || ''}"
                />
            `;
        }

        // Default input
        return `
            <input
                type="${this.getInputType(fieldConfig.type)}"
                class="filter-value"
                data-value-input
                placeholder="${fieldConfig.placeholder || 'Enter value...'}"
                value="${value || ''}"
            />
        `;
    }

    /**
     * Get HTML input type from field type
     */
    static getInputType(fieldType) {
        switch (fieldType) {
            case 'number':
                return 'number';
            case 'datetime':
                return 'datetime-local';
            default:
                return 'text';
        }
    }

    /**
     * Get operator display label
     */
    static getOperatorLabel(operator) {
        const labels = {
            'equals': 'Equals',
            'notEquals': 'Not Equals',
            'contains': 'Contains',
            'notContains': 'Does Not Contain',
            'startsWith': 'Starts With',
            'endsWith': 'Ends With',
            '>': 'Greater Than',
            '<': 'Less Than',
            '>=': 'Greater Than or Equal',
            '<=': 'Less Than or Equal',
            'between': 'Between',
            'isNotNull': 'Contains data',
            'isNull': 'Does not contain data'
        };
        return labels[operator] || operator;
    }

    /**
     * Send message to Extension Host
     */
    static sendMessage(instance, action, data) {
        if (typeof window.ComponentUtils !== 'undefined' && window.ComponentUtils.sendMessage) {
            window.ComponentUtils.sendMessage(action, {
                componentId: instance.id,
                componentType: 'FilterPanel',
                ...data
            });
        }
    }

    /**
     * Handle messages from Extension Host
     */
    static handleMessage(message) {
        if (!message?.componentId) {
            return;
        }

        const instance = this.instances.get(message.componentId);
        if (!instance) {
            console.warn(`FilterPanelBehavior: Instance ${message.componentId} not found`);
            return;
        }

        switch (message.action) {
            case 'componentStateChange':
                console.log('FilterPanelBehavior: componentStateChange received', message.state);
                // Handle state changes from component methods like setActiveQuickFilters()
                if (message.state) {
                    // Handle quick filters update
                    if (message.state.activeQuickFilters !== undefined) {
                        const filterIds = message.state.activeQuickFilters;
                        console.log('FilterPanelBehavior: componentStateChange quick filters', filterIds);
                        instance.activeQuickFilters = new Set(filterIds);
                        // Update checkboxes
                        const checkboxes = instance.element.querySelectorAll('.quick-filter-checkbox');
                        console.log('FilterPanelBehavior: componentStateChange found', checkboxes.length, 'checkboxes');
                        checkboxes.forEach(cb => {
                            const shouldBeChecked = instance.activeQuickFilters.has(cb.dataset.filterId);
                            console.log(`FilterPanelBehavior: componentStateChange checkbox ${cb.dataset.filterId} - should be checked: ${shouldBeChecked}`);
                            cb.checked = shouldBeChecked;
                        });
                    }

                    // Handle advanced filters update
                    if (message.state.advancedFilterConditions !== undefined) {
                        const conditions = message.state.advancedFilterConditions;
                        // Clear existing
                        instance.conditionsList.innerHTML = '';
                        instance.filterConditions = [];

                        // Add conditions
                        conditions.forEach(condition => {
                            this.addCondition(instance, condition);
                        });
                    }

                    // Handle collapsed state
                    if (message.state.collapsed !== undefined) {
                        instance.collapsed = message.state.collapsed;
                        if (instance.content) {
                            instance.content.style.display = instance.collapsed ? 'none' : 'block';
                        }
                        const toggleIcon = instance.header?.querySelector('.filter-panel-toggle');
                        if (toggleIcon) {
                            toggleIcon.textContent = instance.collapsed ? '▸' : '▾';
                        }
                    }

                    // Handle clear
                    if (message.state.cleared) {
                        this.clearAllFilters(instance);
                    }
                }
                break;

            case 'setPreviewCount':
                if (instance.previewCount) {
                    const count = message.count;
                    instance.previewCount.textContent = count !== undefined
                        ? `(${count} ${count === 1 ? 'item' : 'items'} match)`
                        : '';
                }
                break;

            case 'setQuickFilters':
                console.log('FilterPanelBehavior: setQuickFilters received', { filterIds: message.filterIds });
                if (Array.isArray(message.filterIds)) {
                    instance.activeQuickFilters = new Set(message.filterIds);
                    console.log('FilterPanelBehavior: Active quick filters set to', Array.from(instance.activeQuickFilters));
                    // Update checkboxes
                    const checkboxes = instance.element.querySelectorAll('.quick-filter-checkbox');
                    console.log('FilterPanelBehavior: Found', checkboxes.length, 'checkboxes');
                    checkboxes.forEach(cb => {
                        const shouldBeChecked = instance.activeQuickFilters.has(cb.dataset.filterId);
                        console.log(`FilterPanelBehavior: Checkbox ${cb.dataset.filterId} - should be checked: ${shouldBeChecked}`);
                        cb.checked = shouldBeChecked;
                    });
                }
                break;

            case 'setAdvancedFilters':
                if (Array.isArray(message.conditions)) {
                    // Clear existing
                    instance.conditionsList.innerHTML = '';
                    instance.filterConditions = [];

                    // Add conditions
                    message.conditions.forEach(condition => {
                        this.addCondition(instance, condition);
                    });
                }
                break;

            case 'clearFilters':
                this.clearAllFilters(instance);
                break;
        }
    }

    /**
     * Cleanup instance
     */
    static cleanup(componentId) {
        const instance = this.instances.get(componentId);
        if (!instance) return;

        // Remove event listeners
        Object.values(instance.boundHandlers).forEach(handler => {
            if (handler && handler.element && handler.listener) {
                handler.element.removeEventListener(handler.event, handler.listener);
            }
        });

        // Remove from instances
        this.instances.delete(componentId);
    }
}

// Global registration for webview context
if (typeof window !== 'undefined') {
    window.FilterPanelBehavior = FilterPanelBehavior;

    // Register with ComponentUtils if available
    if (window.ComponentUtils?.registerBehavior) {
        window.ComponentUtils.registerBehavior('FilterPanel', FilterPanelBehavior);
    }
}
