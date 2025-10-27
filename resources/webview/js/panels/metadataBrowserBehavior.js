/**
 * Metadata Browser Panel Behavior
 * Handles entity/choice tree, filtering, selection, and metadata display
 */

class MetadataBrowserBehavior {
    static entities = [];
    static choices = [];
    static selectedEntityLogicalName = null;
    static selectedChoiceName = null;

    /**
     * Initialize metadata browser behavior
     */
    static initialize() {
        // Setup global functions for inline event handlers
        window.toggleSection = function(sectionId) {
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

        window.filterEntityTree = function(query) {
            MetadataBrowserBehavior.filterTree(query);
        };

        window.selectEntity = function(logicalName, displayName, metadataId) {
            MetadataBrowserBehavior.selectEntity(logicalName, displayName, metadataId);
        };

        window.selectChoice = function(name, displayName) {
            MetadataBrowserBehavior.selectChoice(name, displayName);
        };

        window.closeDetailPanel = function() {
            MetadataBrowserBehavior.closeDetailPanel();
        };

        window.switchDetailTab = function(tabName) {
            MetadataBrowserBehavior.switchDetailTab(tabName);
        };

        window.toggleLeftPanel = function() {
            MetadataBrowserBehavior.toggleLeftPanel();
        };

        // Setup message listener for updates
        window.addEventListener('message', (event) => {
            const message = event.data;

            if (message.action === 'set-mode') {
                MetadataBrowserBehavior.setMode(message.mode);
            } else if (message.action === 'tree-loading') {
                MetadataBrowserBehavior.setTreeLoading(message.loading);
            } else if (message.command === 'populate-tree') {
                MetadataBrowserBehavior.populateTree(message.data);
            } else if (message.command === 'update-selection') {
                MetadataBrowserBehavior.updateSelection(message.data);
            } else if (message.command === 'update-counts') {
                MetadataBrowserBehavior.updateCounts(message.data);
            } else if (message.command === 'show-detail') {
                MetadataBrowserBehavior.showDetailPanel(message.data);
            }
        });

        // Setup table row click handlers
        MetadataBrowserBehavior.setupTableClickHandlers();

        // Setup keyboard shortcuts
        MetadataBrowserBehavior.setupKeyboardShortcuts();

        // Setup data-action event delegation
        MetadataBrowserBehavior.setupActionHandlers();

        console.log('MetadataBrowserBehavior initialized');
    }

    /**
     * Setup event delegation for data-action attributes
     */
    static setupActionHandlers() {
        document.addEventListener('click', (event) => {
            const target = event.target.closest('[data-action]');
            if (!target) return;

            const action = target.dataset.action;

            switch (action) {
                case 'toggle-left-panel':
                    MetadataBrowserBehavior.toggleLeftPanel();
                    break;

                case 'toggle-section': {
                    const sectionId = target.dataset.section || target.closest('[data-section]')?.dataset.section;
                    if (sectionId) {
                        window.toggleSection(sectionId);
                    }
                    break;
                }

                case 'close-detail-panel':
                    MetadataBrowserBehavior.closeDetailPanel();
                    break;

                case 'switch-detail-tab': {
                    const tabName = target.dataset.tab;
                    if (tabName) {
                        MetadataBrowserBehavior.switchDetailTab(tabName);
                    }
                    break;
                }
            }
        });

        // Handle input events for filter
        document.addEventListener('input', (event) => {
            const target = event.target;
            if (target.dataset.action === 'filter-entity-tree') {
                MetadataBrowserBehavior.filterTree(target.value);
            }
        });
    }

    /**
     * Setup keyboard shortcuts for detail panel
     */
    static setupKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            // Ctrl+A / Cmd+A - Select all within focused content area
            if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
                const detailPanel = document.getElementById('detail-panel');
                if (!detailPanel || detailPanel.classList.contains('hidden')) return;

                // Check if we're anywhere within the detail panel area
                const target = event.target;

                if (detailPanel.contains(target)) {
                    // We're inside the detail panel - prevent default and scope selection
                    event.preventDefault();
                    event.stopPropagation();

                    const propertiesContent = document.getElementById('detail-properties-content');
                    const jsonContent = document.getElementById('detail-json-content');

                    // Select the visible tab's content
                    if (propertiesContent && propertiesContent.style.display !== 'none') {
                        this.selectAllText(propertiesContent);
                    } else if (jsonContent && jsonContent.style.display !== 'none') {
                        this.selectAllText(jsonContent);
                    }
                }
            }
        }, true);  // Use capture phase to catch it early

        // Make detail panel content focusable
        const detailPanelContent = document.querySelector('.detail-panel-content');
        if (detailPanelContent) {
            detailPanelContent.setAttribute('tabindex', '0');
        }
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
     * Setup click handlers for all metadata tables
     */
    static setupTableClickHandlers() {
        let lastClickedRowId = null;

        // Delegate click events for all metadata tables
        document.addEventListener('click', (event) => {
            const row = event.target.closest('tr[data-row-id]');
            if (!row) return;

            const tableElement = row.closest('table');
            if (!tableElement) return;

            // Check if this is a metadata table
            const tableContainer = tableElement.closest('[data-component-type="DataTable"]');
            if (!tableContainer) return;

            const tableId = tableContainer.getAttribute('data-component-id');

            // Only handle metadata browser tables
            if (!tableId || !tableId.startsWith('metadata-')) return;

            const rowId = row.getAttribute('data-row-id');

            console.log('Row clicked:', { tableId, rowId });

            // Toggle behavior - if clicking same row, close detail panel
            if (lastClickedRowId === rowId) {
                console.log('Same row clicked - closing detail panel');
                this.closeDetailPanel();
                lastClickedRowId = null;
                return;
            }

            lastClickedRowId = rowId;
            const vscode = window.vscode || acquireVsCodeApi();

            // Send row click to extension host
            vscode.postMessage({
                command: 'metadata-row-click',
                data: {
                    tableId,
                    rowId
                }
            });
        });
    }

    /**
     * Set the mode (entity or choice) to show/hide appropriate sections
     */
    static setMode(mode) {
        const sectionsContainer = document.querySelector('.metadata-sections');
        if (sectionsContainer) {
            // Remove both mode classes
            sectionsContainer.classList.remove('entity-mode', 'choice-mode');
            // Add the appropriate mode class
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
    static setTreeLoading(loading) {
        const tablesList = document.getElementById('tables-list');
        const choicesList = document.getElementById('choices-list');

        if (loading) {
            if (tablesList) {
                tablesList.innerHTML = '<li class="tree-loading">Loading tables...</li>';
            }
            if (choicesList) {
                choicesList.innerHTML = '<li class="tree-loading">Loading choices...</li>';
            }
        }
    }

    /**
     * Populate entity and choice tree
     */
    static populateTree(data) {
        const { entities, choices } = data;

        // Store data
        MetadataBrowserBehavior.entities = entities || [];
        MetadataBrowserBehavior.choices = choices || [];

        // Populate tables list
        const tablesList = document.getElementById('tables-list');
        if (tablesList) {
            tablesList.innerHTML = entities.map(entity => `
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
        const choicesList = document.getElementById('choices-list');
        if (choicesList) {
            choicesList.innerHTML = choices.map(choice => `
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
    static filterTree(query) {
        const lowerQuery = query.toLowerCase();

        // Filter both entities and choices
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
    static selectEntity(logicalName, displayName, metadataId) {
        const vscode = window.vscode || acquireVsCodeApi();

        // Update selected state in UI
        document.querySelectorAll('.tree-item').forEach(item => {
            item.classList.remove('selected');
        });
        document.querySelector(`[data-logical-name="${logicalName}"]`)?.classList.add('selected');

        // Store selection
        MetadataBrowserBehavior.selectedEntityLogicalName = logicalName;
        MetadataBrowserBehavior.selectedChoiceName = null;

        // Send to extension host
        vscode.postMessage({
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
    static selectChoice(name, displayName) {
        const vscode = window.vscode || acquireVsCodeApi();

        // Update selected state in UI
        document.querySelectorAll('.tree-item').forEach(item => {
            item.classList.remove('selected');
        });
        document.querySelector(`[data-name="${name}"]`)?.classList.add('selected');

        // Store selection
        MetadataBrowserBehavior.selectedEntityLogicalName = null;
        MetadataBrowserBehavior.selectedChoiceName = name;

        // Send to extension host
        vscode.postMessage({
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
    static updateSelection(data) {
        const selectionElement = document.getElementById('current-selection');
        if (selectionElement && data.displayName) {
            selectionElement.textContent = data.displayName;
        }

        // Close detail panel when switching entities/choices
        this.closeDetailPanel();

        // Update mode classes based on what was selected
        const metadataSections = document.querySelector('.metadata-sections');
        if (metadataSections) {
            // Determine mode based on counts
            const hasEntityData = data.counts && (
                data.counts.attributes > 0 ||
                data.counts.keys > 0 ||
                data.counts.relationships > 0 ||
                data.counts.privileges > 0
            );
            const hasChoiceData = data.counts && data.counts.choices > 0;

            // Remove all mode classes first
            metadataSections.classList.remove('entity-mode', 'choice-mode');

            // Add appropriate mode class
            if (hasEntityData) {
                metadataSections.classList.add('entity-mode');
                // Auto-expand attributes section for entities
                const attributesSection = document.querySelector('[data-section="attributes"]');
                if (attributesSection) {
                    attributesSection.classList.add('expanded');
                }
            } else if (hasChoiceData) {
                metadataSections.classList.add('choice-mode');
                // Auto-expand choices section since it's the only one
                const choicesSection = document.querySelector('[data-section="choices"]');
                if (choicesSection) {
                    choicesSection.classList.add('expanded');
                }
            }
        }

        // Update counts if provided
        if (data.counts) {
            MetadataBrowserBehavior.updateCounts(data.counts);
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
    static showDetailPanel(data) {
        const detailPanel = document.getElementById('detail-panel');
        const metadataContainer = document.querySelector('.metadata-container');
        const splitContainer = document.querySelector('[data-component-id="metadata-detail-split-panel"]');

        if (!detailPanel || !metadataContainer) return;

        console.log('Showing detail panel:', data.title);

        // Initialize split panel behavior if not already initialized
        if (splitContainer && window.SplitPanelBehavior && !window.SplitPanelBehavior.instances.has('metadata-detail-split-panel')) {
            window.SplitPanelBehavior.initialize(
                'metadata-detail-split-panel',
                {
                    orientation: 'horizontal',
                    minSize: 400,
                    resizable: true,
                    initialSplit: 60,
                    rightPanelDefaultHidden: true
                },
                splitContainer
            );
        }

        // Update title
        const title = document.getElementById('detail-panel-title');
        if (title) {
            title.textContent = data.title || 'Metadata Details';
        }

        // Render JSON in the JSON tab content
        const jsonContent = document.getElementById('detail-json-content');
        if (jsonContent) {
            jsonContent.innerHTML = `<pre class="json-display">${this.renderJSON(data.metadata, 0)}</pre>`;
        }

        // Render properties in the Properties tab
        const propertiesContent = document.getElementById('detail-properties-content');
        if (propertiesContent) {
            propertiesContent.innerHTML = this.renderProperties(data.metadata);
        }

        // Show panel using split panel behavior
        if (window.SplitPanelBehavior && window.SplitPanelBehavior.instances.has('metadata-detail-split-panel')) {
            const instance = window.SplitPanelBehavior.instances.get('metadata-detail-split-panel');
            window.SplitPanelBehavior.showRightPanel(instance);
        } else {
            // Fallback if split panel behavior isn't available
            detailPanel.classList.remove('hidden');
            metadataContainer.classList.remove('detail-hidden');
        }

        // Default to properties tab (more user-friendly)
        this.switchDetailTab('properties');

        // Focus the panel content for Ctrl+A to work
        setTimeout(() => {
            const detailPanelContent = document.querySelector('.detail-panel-content');
            if (detailPanelContent) {
                detailPanelContent.focus();
            }
        }, 100);
    }

    /**
     * Close detail panel
     */
    static closeDetailPanel() {
        const detailPanel = document.getElementById('detail-panel');
        const metadataContainer = document.querySelector('.metadata-container');

        // Close using split panel behavior
        if (window.SplitPanelBehavior && window.SplitPanelBehavior.instances.has('metadata-detail-split-panel')) {
            const instance = window.SplitPanelBehavior.instances.get('metadata-detail-split-panel');
            window.SplitPanelBehavior.closeRightPanel(instance);
        } else {
            // Fallback if split panel behavior isn't available
            if (detailPanel) {
                detailPanel.classList.add('hidden');
            }

            if (metadataContainer) {
                metadataContainer.classList.add('detail-hidden');
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

            // Skip null, undefined, and empty strings
            if (value === null || value === undefined) return;
            if (value === '' || value === "") return;

            // Only skip @odata.type (redundant with AttributeType)
            if (key === '@odata.type') return;

            // Handle arrays
            if (Array.isArray(value)) {
                if (value.length === 0) return; // Skip empty arrays

                // Add array summary
                properties.push({
                    key: fullPath,
                    value: `Array[${value.length}]`,
                    type: 'array-header'
                });

                // Add each array item
                value.forEach((item, index) => {
                    if (typeof item === 'object' && item !== null) {
                        // Nested object in array
                        Object.keys(item).forEach(nestedKey => {
                            addProperty(nestedKey, item[nestedKey], `${fullPath}[${index}]`);
                        });
                    } else {
                        // Primitive in array
                        properties.push({
                            key: `${fullPath}[${index}]`,
                            value: String(item),
                            type: 'value'
                        });
                    }
                });
                return;
            }

            // Handle objects
            if (typeof value === 'object') {
                if (Object.keys(value).length === 0) return; // Skip empty objects

                // Recursively add nested properties
                Object.keys(value).forEach(nestedKey => {
                    addProperty(nestedKey, value[nestedKey], fullPath);
                });
                return;
            }

            // Handle primitives
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

        // Add all top-level properties
        Object.keys(obj).forEach(key => {
            addProperty(key, obj[key]);
        });

        if (properties.length === 0) {
            return '<div class="properties-empty">No properties to display</div>';
        }

        // Build HTML table
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
     * Render JSON with syntax highlighting
     */
    static renderJSON(obj, depth = 0) {
        if (obj === null) return '<span class="json-null">null</span>';
        if (obj === undefined) return '<span class="json-undefined">undefined</span>';

        const indent = '  '.repeat(depth);
        const type = typeof obj;

        if (type === 'boolean') {
            return `<span class="json-boolean">${obj}</span>`;
        }

        if (type === 'number') {
            return `<span class="json-number">${obj}</span>`;
        }

        if (type === 'string') {
            return `<span class="json-string">"${this.escapeHtml(obj)}"</span>`;
        }

        if (Array.isArray(obj)) {
            if (obj.length === 0) return '[]';

            const items = obj.map(item =>
                `${indent}  ${this.renderJSON(item, depth + 1)}`
            ).join(',\n');

            return `[\n${items}\n${indent}]`;
        }

        if (type === 'object') {
            const keys = Object.keys(obj);
            if (keys.length === 0) return '{}';

            const items = keys.map(key =>
                `${indent}  <span class="json-key">"${this.escapeHtml(key)}"</span>: ${this.renderJSON(obj[key], depth + 1)}`
            ).join(',\n');

            return `{\n${items}\n${indent}}`;
        }

        return String(obj);
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
    static toggleLeftPanel() {
        const leftPanel = document.getElementById('left-panel');
        const container = document.querySelector('.metadata-container');
        const collapseBtn = document.getElementById('left-panel-collapse');

        if (!leftPanel || !container || !collapseBtn) return;

        const isCollapsed = leftPanel.classList.toggle('collapsed');
        container.classList.toggle('left-collapsed', isCollapsed);

        // Update button text and tooltip
        collapseBtn.textContent = isCollapsed ? '▶' : '◀';
        collapseBtn.title = isCollapsed ? 'Expand sidebar' : 'Collapse sidebar';
        collapseBtn.setAttribute('aria-label', isCollapsed ? 'Expand sidebar' : 'Collapse sidebar');
    }
}

// Initialize when DOM is ready
if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            MetadataBrowserBehavior.initialize();
        });
    } else {
        // DOM already loaded
        MetadataBrowserBehavior.initialize();
    }
}
