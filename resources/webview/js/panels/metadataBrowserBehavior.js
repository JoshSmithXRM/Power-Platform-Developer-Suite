/**
 * Metadata Browser Panel Behavior
 * Handles entity/choice tree, filtering, selection, and metadata display
 */

class MetadataBrowserBehavior extends BaseBehavior {
    /**
     * Get the component type this behavior handles
     */
    static getComponentType() {
        return 'MetadataBrowserPanel';
    }

    /**
     * Create instance with panel-specific state
     */
    static createInstance(componentId, config, element) {
        return {
            id: componentId,
            config: { ...config },
            element: element,
            boundHandlers: {},
            vscode: acquireVsCodeApi(),
            entities: [],
            choices: [],
            selectedEntityLogicalName: null,
            selectedChoiceName: null,
            lastClickedRowId: null
        };
    }

    /**
     * Find and cache DOM elements
     */
    static findDOMElements(instance) {
        instance.tablesList = document.getElementById('tables-list');
        instance.choicesList = document.getElementById('choices-list');
        instance.detailPanel = document.getElementById('detail-panel');
        instance.metadataContainer = document.querySelector('.metadata-container');
        instance.splitContainer = document.querySelector('[data-component-id="metadata-detail-split-panel"]');
        instance.leftPanel = document.getElementById('left-panel');
        instance.detailPanelContent = document.querySelector('.detail-panel-content');
    }

    /**
     * Setup event listeners
     */
    static setupEventListeners(instance) {
        // Setup global functions for inline event handlers
        window.toggleSection = function (sectionId) {
            const vscode = window.vscode || acquireVsCodeApi();
            vscode.postMessage({
                command: 'toggle-section',
                data: { sectionId }
            });

            // Immediately toggle UI for better UX (optimistic update)
            const section = document.querySelector(`[data-section="${sectionId}"]`);
            if (section) {
                section.classList.toggle('expanded');
            }
        };

        window.filterEntityTree = (query) => {
            this.filterTree(instance, query);
        };

        window.selectEntity = (logicalName, displayName, metadataId) => {
            this.selectEntity(instance, logicalName, displayName, metadataId);
        };

        window.selectChoice = (name, displayName) => {
            this.selectChoice(instance, name, displayName);
        };

        window.closeDetailPanel = () => {
            this.closeDetailPanel(instance);
        };

        window.switchDetailTab = (tabName) => {
            this.switchDetailTab(tabName);
        };

        window.toggleLeftPanel = () => {
            this.toggleLeftPanel(instance);
        };

        // Register panel handler with ComponentUtils for proper message routing
        if (window.ComponentUtils && window.ComponentUtils.registerPanelHandler) {
            window.ComponentUtils.registerPanelHandler('metadataBrowser', (message) => {
                console.log('📨 MetadataBrowserBehavior message received:', message.command || message.command);

                // Handle both action and command for backward compatibility
                const actionType = message.command || message.command;

                switch (actionType) {
                    case 'set-mode':
                        this.setMode(message.mode);
                        return true;

                    case 'tree-loading':
                        this.setTreeLoading(instance, message.loading);
                        return true;

                    case 'populate-tree':
                        this.populateTree(instance, message.data);
                        return true;

                    case 'update-selection':
                        this.updateSelection(instance, message.data);
                        return true;

                    case 'update-counts':
                        this.updateCounts(message.data);
                        return true;

                    case 'show-detail':
                        this.showDetailPanel(instance, message.data);
                        return true;

                    case 'set-split-ratio':
                        return window.SplitPanelHandlers.handleSetSplitRatio(message);

                    case 'show-right-panel':
                        return window.SplitPanelHandlers.handleShowRightPanel(message);

                    default:
                        // Not a panel-specific action, pass through to component routing
                        return false;
                }
            });
            console.log('✅ MetadataBrowserBehavior registered with ComponentUtils');
        } else {
            console.error('ComponentUtils not available, cannot register panel handler');
        }

        // Setup data-action event delegation
        this.setupActionHandlers(instance);

        // Setup keyboard shortcuts
        this.setupKeyboardShortcuts(instance);
    }

    /**
     * Initialize component state from DOM
     */
    static initializeState(instance) {
        // Make detail panel content focusable
        if (instance.detailPanelContent) {
            instance.detailPanelContent.setAttribute('tabindex', '0');
        }
    }

    /**
     * Handle component data updates from Extension Host
     */
    static onComponentUpdate(instance, data) {
        // This panel uses custom message routing instead of standard component-update
        // Updates come through the registered panel handler
    }

    /**
     * Setup event delegation for data-action attributes
     */
    static setupActionHandlers(instance) {
        instance.boundHandlers.clickHandler = (event) => {
            const target = event.target.closest('[data-action]');
            if (!target) return;

            const action = target.dataset.action;

            switch (action) {
                case 'toggle-left-panel':
                    this.toggleLeftPanel(instance);
                    break;

                case 'toggle-section': {
                    const sectionId = target.dataset.section || target.closest('[data-section]')?.dataset.section;
                    if (sectionId) {
                        window.toggleSection(sectionId);
                    }
                    break;
                }

                case 'close-right-panel':
                case 'close-detail-panel':
                    this.closeDetailPanel(instance);
                    break;

                case 'switch-detail-tab': {
                    const tabName = target.dataset.tab;
                    if (tabName) {
                        this.switchDetailTab(tabName);
                    }
                    break;
                }
            }
        };
        document.addEventListener('click', instance.boundHandlers.clickHandler);

        // Handle input events for filter
        instance.boundHandlers.inputHandler = (event) => {
            const target = event.target;
            if (target.dataset.action === 'filter-entity-tree') {
                this.filterTree(instance, target.value);
            }
        };
        document.addEventListener('input', instance.boundHandlers.inputHandler);
    }

    /**
     * Setup keyboard shortcuts for detail panel
     */
    static setupKeyboardShortcuts(instance) {
        instance.boundHandlers.keydownHandler = (event) => {
            // Ctrl+A / Cmd+A - Select all within focused content area
            if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
                if (!instance.detailPanel || instance.detailPanel.classList.contains('hidden')) return;

                const target = event.target;

                if (instance.detailPanel.contains(target)) {
                    event.preventDefault();
                    event.stopPropagation();

                    const propertiesContent = document.getElementById('detail-properties-content');
                    const jsonContent = document.getElementById('detail-json-content');

                    if (propertiesContent && propertiesContent.style.display !== 'none') {
                        this.selectAllText(propertiesContent);
                    } else if (jsonContent && jsonContent.style.display !== 'none') {
                        this.selectAllText(jsonContent);
                    }
                }
            }
        };
        document.addEventListener('keydown', instance.boundHandlers.keydownHandler, true);
    }

    /**
     * Select all text within an element
     */
    static selectAllText(element) {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(element);
        selection.removeAllRanges();
        selection.addRange(range);
    }

    /**
     * Set the mode (entity or choice) to show/hide appropriate sections
     */
    static setMode(mode) {
        const sectionsContainer = document.querySelector('.metadata-sections');
        if (sectionsContainer) {
            sectionsContainer.classList.remove('entity-mode', 'choice-mode');
            if (mode === 'entity') {
                sectionsContainer.classList.add('entity-mode');
            } else if (mode === 'choice') {
                sectionsContainer.classList.add('choice-mode');
            }
        }
    }

    /**
     * Show/hide loading state for tree
     */
    static setTreeLoading(instance, loading) {
        if (loading) {
            if (instance.tablesList) {
                instance.tablesList.innerHTML = '<li class="tree-loading">Loading tables...</li>';
            }
            if (instance.choicesList) {
                instance.choicesList.innerHTML = '<li class="tree-loading">Loading choices...</li>';
            }
        }
    }

    /**
     * Populate entity and choice tree
     */
    static populateTree(instance, data) {
        const { entities, choices } = data;

        // Store data on instance
        instance.entities = entities || [];
        instance.choices = choices || [];

        // Populate tables list
        if (instance.tablesList) {
            instance.tablesList.innerHTML = entities.map(entity => `
                <li class="tree-item"
                    data-type="entity"
                    data-logical-name="${entity.logicalName}"
                    data-display-name="${entity.displayName}"
                    data-metadata-id="${entity.metadataId}"
                    onclick="selectEntity('${entity.logicalName}', '${entity.displayName}', '${entity.metadataId}')">
                    <span class="tree-item-icon">${entity.isCustom ? '🏷️' : '📋'}</span>
                    ${entity.displayName} <span class="tree-item-secondary">(${entity.logicalName})</span>
                </li>
            `).join('');
        }

        // Populate choices list
        if (instance.choicesList) {
            instance.choicesList.innerHTML = choices.map(choice => `
                <li class="tree-item"
                    data-type="choice"
                    data-name="${choice.name}"
                    data-display-name="${choice.displayName}"
                    onclick="selectChoice('${choice.name}', '${choice.displayName}')">
                    <span class="tree-item-icon">🔽</span>
                    ${choice.displayName} <span class="tree-item-secondary">(${choice.name})</span>
                </li>
            `).join('');
        }

        console.log('Tree populated:', { entities: entities.length, choices: choices.length });
    }

    /**
     * Filter tree based on search query
     */
    static filterTree(instance, query) {
        const lowerQuery = query.toLowerCase();

        document.querySelectorAll('.tree-item').forEach(item => {
            const displayName = item.getAttribute('data-display-name') || '';
            const logicalName = item.getAttribute('data-logical-name') || item.getAttribute('data-name') || '';

            const matches = displayName.toLowerCase().includes(lowerQuery) ||
                logicalName.toLowerCase().includes(lowerQuery);

            item.classList.toggle('hidden', !matches);
        });
    }

    /**
     * Select an entity from the tree
     */
    static selectEntity(instance, logicalName, displayName, metadataId) {
        // Update selected state in UI
        document.querySelectorAll('.tree-item').forEach(item => {
            item.classList.remove('selected');
        });
        document.querySelector(`[data-logical-name="${logicalName}"]`)?.classList.add('selected');

        // Store selection on instance
        instance.selectedEntityLogicalName = logicalName;
        instance.selectedChoiceName = null;

        // Send to extension host
        instance.vscode.postMessage({
            command: 'select-entity',
            data: {
                logicalName,
                displayName,
                metadataId
            }
        });
    }

    /**
     * Select a choice from the tree
     */
    static selectChoice(instance, name, displayName) {
        // Update selected state in UI
        document.querySelectorAll('.tree-item').forEach(item => {
            item.classList.remove('selected');
        });
        document.querySelector(`[data-name="${name}"]`)?.classList.add('selected');

        // Store selection on instance
        instance.selectedEntityLogicalName = null;
        instance.selectedChoiceName = name;

        // Send to extension host
        instance.vscode.postMessage({
            command: 'select-choice',
            data: {
                name,
                displayName
            }
        });
    }

    /**
     * Update the current selection display
     */
    static updateSelection(instance, data) {
        const selectionElement = document.getElementById('current-selection');
        if (selectionElement && data.displayName) {
            selectionElement.textContent = data.displayName;
        }

        // Close detail panel when switching entities/choices
        this.closeDetailPanel(instance);

        // Update counts if provided
        if (data.counts) {
            this.updateCounts(data.counts);
        }

        // Auto-expand sections based on what data is available
        if (data.counts) {
            if (data.counts.attributes > 0) {
                const attributesSection = document.querySelector('[data-section="attributes"]');
                if (attributesSection) {
                    attributesSection.classList.add('expanded');
                }
            }

            if (data.counts.choices > 0) {
                const choicesSection = document.querySelector('[data-section="choices"]');
                if (choicesSection) {
                    choicesSection.classList.add('expanded');
                }
            }
        }
    }

    /**
     * Update section counts
     */
    static updateCounts(counts) {
        if (counts.attributes !== undefined) {
            const attributesCount = document.getElementById('attributes-count');
            if (attributesCount) {
                attributesCount.textContent = counts.attributes;
            }
        }

        if (counts.keys !== undefined) {
            const keysCount = document.getElementById('keys-count');
            if (keysCount) {
                keysCount.textContent = counts.keys;
            }
        }

        if (counts.relationships !== undefined) {
            const relationshipsCount = document.getElementById('relationships-count');
            if (relationshipsCount) {
                relationshipsCount.textContent = counts.relationships;
            }
        }

        if (counts.privileges !== undefined) {
            const privilegesCount = document.getElementById('privileges-count');
            if (privilegesCount) {
                privilegesCount.textContent = counts.privileges;
            }
        }

        if (counts.choices !== undefined) {
            const choicesCount = document.getElementById('choices-count');
            if (choicesCount) {
                choicesCount.textContent = counts.choices;
            }
        }
    }

    /**
     * Show detail panel with metadata
     */
    static showDetailPanel(instance, data) {
        if (!instance.detailPanel || !instance.metadataContainer) return;

        console.log('Showing detail panel:', data.title);

        // Initialize split panel behavior if not already initialized
        if (instance.splitContainer && window.SplitPanelBehavior && !window.SplitPanelBehavior.instances.has('metadata-detail-split-panel')) {
            window.SplitPanelBehavior.initialize(
                'metadata-detail-split-panel',
                {
                    orientation: 'horizontal',
                    minSize: 400,
                    resizable: true,
                    initialSplit: 60,
                    rightPanelDefaultHidden: true
                },
                instance.splitContainer
            );
        }

        // Update title
        const title = document.getElementById('detail-panel-title');
        if (title) {
            title.textContent = data.title || 'Metadata Details';
        }

        // Render properties in the Properties tab
        const propertiesContent = document.getElementById('detail-properties-content');
        if (propertiesContent) {
            propertiesContent.innerHTML = this.renderProperties(data.metadata);
        }

        // Show panel using split panel behavior
        if (window.SplitPanelBehavior && window.SplitPanelBehavior.instances.has('metadata-detail-split-panel')) {
            const splitInstance = window.SplitPanelBehavior.instances.get('metadata-detail-split-panel');
            window.SplitPanelBehavior.showRightPanel(splitInstance);
        } else {
            // Fallback if split panel behavior isn't available
            instance.detailPanel.classList.remove('hidden');
            instance.metadataContainer.classList.remove('detail-hidden');
        }

        // Default to properties tab
        this.switchDetailTab('properties');

        // Focus the panel content for Ctrl+A to work
        setTimeout(() => {
            if (instance.detailPanelContent) {
                instance.detailPanelContent.focus();
            }
        }, 100);
    }

    /**
     * Close detail panel
     */
    static closeDetailPanel(instance) {
        // Close using split panel behavior
        if (window.SplitPanelBehavior && window.SplitPanelBehavior.instances.has('metadata-detail-split-panel')) {
            const splitInstance = window.SplitPanelBehavior.instances.get('metadata-detail-split-panel');
            window.SplitPanelBehavior.closeRightPanel(splitInstance);
        } else {
            // Fallback if split panel behavior isn't available
            if (instance.detailPanel) {
                instance.detailPanel.classList.add('hidden');
            }

            if (instance.metadataContainer) {
                instance.metadataContainer.classList.add('detail-hidden');
            }
        }
    }

    /**
     * Switch detail panel tab
     */
    static switchDetailTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.detail-panel-tab').forEach(tab => {
            tab.classList.toggle('active', tab.getAttribute('data-tab') === tabName);
        });

        // Update content visibility
        const propertiesContent = document.getElementById('detail-properties-content');
        const jsonContent = document.getElementById('detail-json-content');

        if (propertiesContent) {
            propertiesContent.style.display = tabName === 'properties' ? 'block' : 'none';
        }

        if (jsonContent) {
            jsonContent.style.display = tabName === 'json' ? 'block' : 'none';
        }
    }

    /**
     * Render properties in a flat table format showing all data
     */
    static renderProperties(obj) {
        if (!obj || typeof obj !== 'object') {
            return '<div class="properties-empty">No properties to display</div>';
        }

        const properties = [];

        const addProperty = (key, value, path = '') => {
            const fullPath = path ? `${path}.${key}` : key;

            if (value === null || value === undefined) return;
            if (value === '' || value === "") return;
            if (key === '@odata.type') return;

            if (Array.isArray(value)) {
                if (value.length === 0) return;

                properties.push({
                    key: fullPath,
                    value: `Array[${value.length}]`,
                    type: 'array-header'
                });

                value.forEach((item, index) => {
                    if (typeof item === 'object' && item !== null) {
                        Object.keys(item).forEach(nestedKey => {
                            addProperty(nestedKey, item[nestedKey], `${fullPath}[${index}]`);
                        });
                    } else {
                        properties.push({
                            key: `${fullPath}[${index}]`,
                            value: String(item),
                            type: 'value'
                        });
                    }
                });
                return;
            }

            if (typeof value === 'object') {
                if (Object.keys(value).length === 0) return;

                Object.keys(value).forEach(nestedKey => {
                    addProperty(nestedKey, value[nestedKey], fullPath);
                });
                return;
            }

            let displayValue = value;
            if (typeof value === 'boolean') {
                displayValue = value ? 'Yes' : 'No';
            }

            properties.push({
                key: fullPath,
                value: String(displayValue),
                type: 'value'
            });
        };

        Object.keys(obj).forEach(key => {
            addProperty(key, obj[key]);
        });

        if (properties.length === 0) {
            return '<div class="properties-empty">No properties to display</div>';
        }

        const rows = properties.map(prop => {
            const rowClass = prop.type === 'array-header' ? 'property-array-header' : 'property-row';
            const valueClass = prop.type === 'array-header' ? 'property-array-count' : 'property-value';

            return `
                <tr class="${rowClass}">
                    <td class="property-key">${this.escapeHtml(prop.key)}</td>
                    <td class="${valueClass}">${this.escapeHtml(prop.value)}</td>
                </tr>
            `;
        }).join('');

        return `
            <table class="properties-table">
                <thead>
                    <tr>
                        <th>Property</th>
                        <th>Value</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        `;
    }

    /**
     * Escape HTML special characters
     */
    static escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return String(text).replace(/[&<>"']/g, m => map[m]);
    }

    /**
     * Toggle left panel collapsed state
     */
    static toggleLeftPanel(instance) {
        const collapseBtn = document.getElementById('left-panel-collapse');

        if (!instance.leftPanel || !instance.metadataContainer || !collapseBtn) return;

        const isCollapsed = instance.leftPanel.classList.toggle('collapsed');
        instance.metadataContainer.classList.toggle('left-collapsed', isCollapsed);

        collapseBtn.textContent = isCollapsed ? '▶' : '◀';
        collapseBtn.title = isCollapsed ? 'Expand sidebar' : 'Collapse sidebar';
        collapseBtn.setAttribute('aria-label', isCollapsed ? 'Expand sidebar' : 'Collapse sidebar');
    }

    /**
     * Cleanup instance resources
     */
    static cleanupInstance(instance) {
        if (instance.boundHandlers.clickHandler) {
            document.removeEventListener('click', instance.boundHandlers.clickHandler);
        }
        if (instance.boundHandlers.inputHandler) {
            document.removeEventListener('input', instance.boundHandlers.inputHandler);
        }
        if (instance.boundHandlers.keydownHandler) {
            document.removeEventListener('keydown', instance.boundHandlers.keydownHandler, true);
        }
    }
}

// Register behavior
MetadataBrowserBehavior.register();

// Initialize panel instance when DOM is ready
if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            MetadataBrowserBehavior.initialize('metadataBrowserPanel', {}, document.body);
        });
    } else {
        MetadataBrowserBehavior.initialize('metadataBrowserPanel', {}, document.body);
    }
}
