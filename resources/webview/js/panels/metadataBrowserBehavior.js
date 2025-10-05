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

        // Setup message listener for updates
        window.addEventListener('message', (event) => {
            const message = event.data;

            if (message.command === 'populate-tree') {
                MetadataBrowserBehavior.populateTree(message.data);
            } else if (message.command === 'update-selection') {
                MetadataBrowserBehavior.updateSelection(message.data);
            } else if (message.command === 'update-counts') {
                MetadataBrowserBehavior.updateCounts(message.data);
            }
        });

        console.log('MetadataBrowserBehavior initialized');
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
                    <span class="tree-item-icon">📋</span>
                    ${entity.displayName}
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
                    ${choice.displayName}
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
