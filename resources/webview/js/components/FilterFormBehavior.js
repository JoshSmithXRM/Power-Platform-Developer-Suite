/**
 * FilterFormBehavior.js
 * 
 * Webview-side behavior for FilterFormComponent
 * Handles DOM interactions, events, and UI state management
 * 
 * This file runs in the webview context and provides:
 * - Dynamic condition management
 * - Field, operator, and value input handling
 * - Group creation and management
 * - Saved filter interactions
 * - Quick filter handling
 * - Validation feedback
 * - Drag and drop support (optional)
 */

class FilterFormBehavior {
    constructor() {
        this.instances = new Map();
        this.init();
    }

    init() {
        // Initialize all filter forms on page load
        document.addEventListener('DOMContentLoaded', () => {
            this.initializeAllForms();
        });

        // Handle dynamic forms added after page load
        this.observeNewForms();
    }

    initializeAllForms() {
        const forms = document.querySelectorAll('.filter-form');
        forms.forEach(form => {
            this.initializeForm(form);
        });
    }

    initializeForm(formElement) {
        const componentId = formElement.getAttribute('data-component-id');
        if (!componentId || this.instances.has(componentId)) {
            return; // Already initialized or no ID
        }

        const instance = {
            id: componentId,
            element: formElement,
            conditions: [],
            draggedElement: null,
            dropTarget: null
        };

        this.instances.set(componentId, instance);
        this.bindEvents(instance);
    }

    bindEvents(instance) {
        const { element, id } = instance;
        
        // Saved filter dropdown
        const savedFilterDropdown = element.querySelector('.filter-form-saved-filter-dropdown');
        if (savedFilterDropdown) {
            savedFilterDropdown.addEventListener('change', (e) => this.handleSavedFilterChange(id, e));
        }

        // Saved filter action buttons
        const saveButton = element.querySelector('[data-action="save-filter"]');
        if (saveButton) {
            saveButton.addEventListener('click', (e) => this.handleSaveFilter(id, e));
        }

        const deleteButton = element.querySelector('[data-action="delete-filter"]');
        if (deleteButton) {
            deleteButton.addEventListener('click', (e) => this.handleDeleteFilter(id, e));
        }

        // Quick filter buttons
        const quickFilterButtons = element.querySelectorAll('[data-quick-filter]');
        quickFilterButtons.forEach(button => {
            button.addEventListener('click', (e) => this.handleQuickFilter(id, e));
        });

        // Main action buttons
        const applyButton = element.querySelector('[data-action="apply-filter"]');
        if (applyButton) {
            applyButton.addEventListener('click', () => this.emitEvent(id, 'apply-filter', {}));
        }

        const clearButton = element.querySelector('[data-action="clear-filter"]');
        if (clearButton) {
            clearButton.addEventListener('click', () => this.emitEvent(id, 'clear-filter', {}));
        }

        // Preview toggle
        const previewToggle = element.querySelector('[data-action="toggle-preview"]');
        if (previewToggle) {
            previewToggle.addEventListener('click', () => this.emitEvent(id, 'toggle-preview', {}));
        }

        // Export buttons
        const exportButtons = element.querySelectorAll('[data-action="export-filter"]');
        exportButtons.forEach(button => {
            button.addEventListener('click', (e) => this.handleExport(id, e));
        });

        // Retry button
        const retryButton = element.querySelector('[data-action="retry"]');
        if (retryButton) {
            retryButton.addEventListener('click', () => this.emitEvent(id, 'retry', {}));
        }

        // Bind condition-specific events
        this.bindConditionEvents(instance);

        // Drag and drop (if enabled)
        this.bindDragDropEvents(instance);
    }

    bindConditionEvents(instance) {
        const { element, id } = instance;

        // Add condition buttons
        const addConditionButtons = element.querySelectorAll('[data-action="add-condition"]');
        addConditionButtons.forEach(button => {
            button.addEventListener('click', (e) => this.handleAddCondition(id, e));
        });

        // Add group buttons
        const addGroupButtons = element.querySelectorAll('[data-action="add-group"]');
        addGroupButtons.forEach(button => {
            button.addEventListener('click', () => this.emitEvent(id, 'add-group', {}));
        });

        // Remove condition buttons
        const removeConditionButtons = element.querySelectorAll('[data-action="remove-condition"]');
        removeConditionButtons.forEach(button => {
            button.addEventListener('click', (e) => this.handleRemoveCondition(id, e));
        });

        // Remove group buttons
        const removeGroupButtons = element.querySelectorAll('[data-action="remove-group"]');
        removeGroupButtons.forEach(button => {
            button.addEventListener('click', (e) => this.handleRemoveGroup(id, e));
        });

        // Field selectors
        const fieldSelectors = element.querySelectorAll('.filter-form-field-selector');
        fieldSelectors.forEach(selector => {
            selector.addEventListener('change', (e) => this.handleFieldChange(id, e));
        });

        // Operator selectors
        const operatorSelectors = element.querySelectorAll('.filter-form-operator-selector');
        operatorSelectors.forEach(selector => {
            selector.addEventListener('change', (e) => this.handleOperatorChange(id, e));
        });

        // Value inputs
        const valueInputs = element.querySelectorAll('.filter-form-value-input');
        valueInputs.forEach(input => {
            input.addEventListener('input', (e) => this.handleValueChange(id, e));
            input.addEventListener('change', (e) => this.handleValueChange(id, e));
        });

        // Logical operator buttons
        const logicalOperatorButtons = element.querySelectorAll('[data-action="set-logical-operator"]');
        logicalOperatorButtons.forEach(button => {
            button.addEventListener('click', (e) => this.handleLogicalOperatorChange(id, e));
        });
    }

    bindDragDropEvents(instance) {
        const { element } = instance;
        
        // Check if drag and drop is enabled
        const dragHandles = element.querySelectorAll('.drag-handle');
        if (dragHandles.length === 0) return;

        dragHandles.forEach(handle => {
            const conditionElement = handle.closest('.filter-form-condition');
            if (conditionElement) {
                conditionElement.draggable = true;
                
                conditionElement.addEventListener('dragstart', (e) => this.handleDragStart(instance.id, e));
                conditionElement.addEventListener('dragend', (e) => this.handleDragEnd(instance.id, e));
                conditionElement.addEventListener('dragover', (e) => this.handleDragOver(instance.id, e));
                conditionElement.addEventListener('drop', (e) => this.handleDrop(instance.id, e));
            }
        });
    }

    // Event Handlers

    handleSavedFilterChange(componentId, event) {
        const filterId = event.target.value;
        this.emitEvent(componentId, 'saved-filter-changed', { filterId });
    }

    handleSaveFilter(componentId, event) {
        const name = prompt('Enter filter name:');
        if (name) {
            const description = prompt('Enter filter description (optional):') || undefined;
            const isPublic = confirm('Make this filter public?');
            this.emitEvent(componentId, 'save-filter', { name, description, isPublic });
        }
    }

    handleDeleteFilter(componentId, event) {
        if (confirm('Are you sure you want to delete this filter?')) {
            const filterId = event.target.getAttribute('data-filter-id');
            this.emitEvent(componentId, 'delete-filter', { filterId });
        }
    }

    handleQuickFilter(componentId, event) {
        const filterName = event.target.getAttribute('data-quick-filter');
        this.emitEvent(componentId, 'quick-filter-clicked', { filterName });
        
        // Update button state
        const instance = this.instances.get(componentId);
        if (instance) {
            // Remove active class from all quick filter buttons
            instance.element.querySelectorAll('[data-quick-filter]').forEach(btn => {
                btn.classList.remove('filter-form-quick-filter--active');
            });
            
            // Add active class to clicked button (unless it was already active)
            if (!event.target.classList.contains('filter-form-quick-filter--active')) {
                event.target.classList.add('filter-form-quick-filter--active');
            }
        }
    }

    handleAddCondition(componentId, event) {
        const groupId = event.target.getAttribute('data-group-id');
        this.emitEvent(componentId, 'add-condition', { groupId });
    }

    handleRemoveCondition(componentId, event) {
        const conditionId = event.target.getAttribute('data-condition-id');
        this.emitEvent(componentId, 'remove-condition', { conditionId });
    }

    handleRemoveGroup(componentId, event) {
        const conditionId = event.target.getAttribute('data-condition-id');
        this.emitEvent(componentId, 'remove-group', { conditionId });
    }

    handleFieldChange(componentId, event) {
        const conditionId = event.target.getAttribute('data-condition-id');
        const field = event.target.value;
        this.emitEvent(componentId, 'field-changed', { conditionId, field });
    }

    handleOperatorChange(componentId, event) {
        const conditionId = event.target.getAttribute('data-condition-id');
        const operator = event.target.value;
        this.emitEvent(componentId, 'operator-changed', { conditionId, operator });
    }

    handleValueChange(componentId, event) {
        const conditionId = event.target.getAttribute('data-condition-id');
        const valueIndex = event.target.getAttribute('data-value-index');
        let value = event.target.value;

        // Handle different input types
        if (event.target.type === 'number') {
            value = parseFloat(value) || null;
        } else if (event.target.type === 'checkbox') {
            value = event.target.checked;
        } else if (event.target.multiple) {
            // Multiple select
            value = Array.from(event.target.selectedOptions).map(option => option.value);
        } else if (event.target.tagName === 'TEXTAREA') {
            // Multiple values in textarea (one per line)
            value = value.split('\n').filter(line => line.trim()).map(line => line.trim());
        }

        this.emitEvent(componentId, 'value-changed', { 
            conditionId, 
            value, 
            valueIndex: valueIndex ? parseInt(valueIndex) : undefined 
        });
    }

    handleLogicalOperatorChange(componentId, event) {
        const conditionId = event.target.getAttribute('data-condition-id');
        const operator = event.target.getAttribute('data-operator');
        
        // Update button states
        const conditionElement = event.target.closest('.filter-form-condition');
        if (conditionElement) {
            const logicalButtons = conditionElement.querySelectorAll('.filter-form-logical-operator-button');
            logicalButtons.forEach(btn => btn.classList.remove('active'));
            event.target.classList.add('active');
        }
        
        this.emitEvent(componentId, 'logical-operator-changed', { conditionId, operator });
    }

    handleExport(componentId, event) {
        const format = event.target.getAttribute('data-format');
        this.emitEvent(componentId, 'export-filter', { format });
    }

    // Drag and Drop Handlers

    handleDragStart(componentId, event) {
        const instance = this.instances.get(componentId);
        if (!instance) return;

        instance.draggedElement = event.target;
        event.target.classList.add('filter-form-condition--dragging');
        
        // Set drag data
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/html', event.target.outerHTML);
    }

    handleDragEnd(componentId, event) {
        const instance = this.instances.get(componentId);
        if (!instance) return;

        if (instance.draggedElement) {
            instance.draggedElement.classList.remove('filter-form-condition--dragging');
            instance.draggedElement = null;
        }
        
        // Remove drop target indicators
        instance.element.querySelectorAll('.filter-form-drop-target--active').forEach(el => {
            el.classList.remove('filter-form-drop-target--active');
        });
    }

    handleDragOver(componentId, event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        
        const dropTarget = event.target.closest('.filter-form-condition');
        if (dropTarget) {
            dropTarget.classList.add('filter-form-drop-target--active');
        }
    }

    handleDrop(componentId, event) {
        event.preventDefault();
        
        const instance = this.instances.get(componentId);
        if (!instance || !instance.draggedElement) return;

        const dropTarget = event.target.closest('.filter-form-condition');
        if (dropTarget && dropTarget !== instance.draggedElement) {
            // Determine drop position
            const rect = dropTarget.getBoundingClientRect();
            const midPoint = rect.top + rect.height / 2;
            const dropPosition = event.clientY < midPoint ? 'before' : 'after';
            
            // Move the element
            if (dropPosition === 'before') {
                dropTarget.parentNode.insertBefore(instance.draggedElement, dropTarget);
            } else {
                dropTarget.parentNode.insertBefore(instance.draggedElement, dropTarget.nextSibling);
            }
            
            // Emit reorder event
            this.emitEvent(componentId, 'condition-reordered', {
                draggedConditionId: instance.draggedElement.getAttribute('data-condition-id'),
                targetConditionId: dropTarget.getAttribute('data-condition-id'),
                position: dropPosition
            });
        }
        
        // Clean up
        this.handleDragEnd(componentId, event);
    }

    // Validation Helpers

    showFieldError(componentId, conditionId, message) {
        const instance = this.instances.get(componentId);
        if (!instance) return;

        const errorElement = instance.element.querySelector(`#error-${conditionId}`);
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = message ? 'block' : 'none';
        }
    }

    clearFieldError(componentId, conditionId) {
        this.showFieldError(componentId, conditionId, '');
    }

    showValidationErrors(componentId, errors) {
        const instance = this.instances.get(componentId);
        if (!instance) return;

        const validationElement = instance.element.querySelector('.filter-form-validation-error');
        if (validationElement) {
            if (errors.length > 0) {
                validationElement.innerHTML = errors.map(error => 
                    `<div class="validation-error-item">${error}</div>`
                ).join('');
                validationElement.style.display = 'block';
            } else {
                validationElement.style.display = 'none';
            }
        }
    }

    // UI Updates

    updateConditionCount(componentId) {
        const instance = this.instances.get(componentId);
        if (!instance) return;

        const conditions = instance.element.querySelectorAll('.filter-form-condition-row');
        const countElement = instance.element.querySelector('.condition-count');
        if (countElement) {
            countElement.textContent = `${conditions.length} condition${conditions.length !== 1 ? 's' : ''}`;
        }
    }

    updateFormState(componentId, state) {
        const instance = this.instances.get(componentId);
        if (!instance) return;

        // Update loading state
        if (state.isLoading !== undefined) {
            instance.element.classList.toggle('filter-form--loading', state.isLoading);
        }

        // Update error state
        if (state.error !== undefined) {
            instance.element.classList.toggle('filter-form--error', !!state.error);
        }

        // Update empty state
        if (state.isEmpty !== undefined) {
            instance.element.classList.toggle('filter-form--empty', state.isEmpty);
        }

        // Update disabled state
        if (state.disabled !== undefined) {
            instance.element.classList.toggle('filter-form--disabled', state.disabled);
            
            // Disable/enable all form controls
            const controls = instance.element.querySelectorAll('input, select, button, textarea');
            controls.forEach(control => {
                control.disabled = state.disabled;
            });
        }

        // Update validation state
        if (state.validationErrors !== undefined) {
            instance.element.classList.toggle('filter-form--invalid', state.validationErrors.length > 0);
            this.showValidationErrors(componentId, state.validationErrors);
        }
    }

    // Event Emission

    emitEvent(componentId, eventType, data) {
        if (typeof vscode !== 'undefined') {
            vscode.postMessage({
                command: 'component-event',
                componentId: componentId,
                eventType: eventType,
                data: data
            });
        }
    }

    // Public API for external updates

    updateInstance(componentId, config) {
        const instance = this.instances.get(componentId);
        if (!instance) return;

        // Re-bind events if structure changed
        this.bindConditionEvents(instance);
        
        // Update state
        this.updateFormState(componentId, config);
    }

    // Observer for dynamically added forms
    observeNewForms() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Check if the node itself is a form
                        if (node.classList && node.classList.contains('filter-form')) {
                            this.initializeForm(node);
                        }
                        
                        // Check for forms within the added node
                        const forms = node.querySelectorAll && node.querySelectorAll('.filter-form');
                        if (forms) {
                            forms.forEach(form => this.initializeForm(form));
                        }
                        
                        // Also check for new conditions added to existing forms
                        if (node.classList && node.classList.contains('filter-form-condition')) {
                            const form = node.closest('.filter-form');
                            if (form) {
                                const componentId = form.getAttribute('data-component-id');
                                const instance = this.instances.get(componentId);
                                if (instance) {
                                    this.bindConditionEvents(instance);
                                }
                            }
                        }
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // Utility Methods

    getConditionElement(componentId, conditionId) {
        const instance = this.instances.get(componentId);
        if (!instance) return null;
        
        return instance.element.querySelector(`[data-condition-id="${conditionId}"]`);
    }

    getConditionValue(componentId, conditionId) {
        const conditionElement = this.getConditionElement(componentId, conditionId);
        if (!conditionElement) return null;

        const valueInput = conditionElement.querySelector('.filter-form-value-input');
        if (!valueInput) return null;

        if (valueInput.type === 'number') {
            return parseFloat(valueInput.value) || null;
        } else if (valueInput.type === 'checkbox') {
            return valueInput.checked;
        } else if (valueInput.multiple) {
            return Array.from(valueInput.selectedOptions).map(option => option.value);
        } else {
            return valueInput.value;
        }
    }

    setConditionValue(componentId, conditionId, value) {
        const conditionElement = this.getConditionElement(componentId, conditionId);
        if (!conditionElement) return;

        const valueInput = conditionElement.querySelector('.filter-form-value-input');
        if (!valueInput) return;

        if (valueInput.type === 'checkbox') {
            valueInput.checked = !!value;
        } else if (valueInput.multiple && Array.isArray(value)) {
            Array.from(valueInput.options).forEach(option => {
                option.selected = value.includes(option.value);
            });
        } else {
            valueInput.value = value || '';
        }
    }
}

// Initialize the behavior system
const filterFormBehavior = new FilterFormBehavior();

// Export for potential external access
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FilterFormBehavior;
}