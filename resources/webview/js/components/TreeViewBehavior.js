/**
 * TreeViewBehavior - Webview behavior for TreeView component
 * Handles node expansion, collapse, selection, and search
 */

class TreeViewBehavior extends BaseBehavior {
    /**
     * Get component type identifier
     */
    static getComponentType() {
        return 'TreeView';
    }

    /**
     * Handle component data updates from Extension Host
     * REQUIRED by BaseBehavior - called when event bridge sends updated data
     */
    static onComponentUpdate(instance, data) {
        if (data) {
            console.log(`TreeViewBehavior: componentUpdate received`, {
                componentId: instance.id,
                loading: data.loading,
                nodeCount: data.nodes?.length
            });

            // Handle loading state
            if (data.loading !== undefined) {
                this.updateLoadingState(instance, data.loading, data.loadingMessage || 'Loading...');
            }

            // Update nodes if provided and not loading
            if (!data.loading && data.nodes) {
                this.updateNodes(instance, data.nodes);
            }
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
            searchInput: null,
            treeRoot: null,

            // State
            nodes: [], // Store node data for lookups
            selectedNodeId: null,
            expandedNodes: new Set(),
            searchQuery: '',

            // Event handlers
            boundHandlers: {}
        };
    }

    /**
     * Find and cache DOM elements
     */
    static findDOMElements(instance) {
        const { element } = instance;

        instance.searchInput = element.querySelector('.tree-view-search-input');
        instance.treeRoot = element.querySelector('.tree-view-root');
    }

    /**
     * Setup event listeners
     */
    static setupEventListeners(instance) {
        const { element, searchInput } = instance;

        // Tree node clicks (event delegation)
        instance.boundHandlers.treeClick = (e) => this.handleTreeClick(instance, e);
        element.addEventListener('click', instance.boundHandlers.treeClick);

        // Search input
        if (searchInput) {
            instance.boundHandlers.searchInput = (e) => this.handleSearch(instance, e);
            searchInput.addEventListener('input', instance.boundHandlers.searchInput);
        }

        // Context menu (right-click)
        instance.boundHandlers.contextMenu = (e) => this.handleContextMenu(instance, e);
        element.addEventListener('contextmenu', instance.boundHandlers.contextMenu);
    }

    /**
     * Handle custom actions beyond componentUpdate
     */
    static handleCustomAction(instance, message) {
        switch (message.action) {
            case 'setNodes':
                // Tree will be re-rendered by Extension Host
                // Just clear selection
                instance.selectedNodeId = null;
                break;

            case 'expandNode':
                if (message.nodeId) {
                    const nodeElement = instance.element.querySelector(`[data-node-id="${message.nodeId}"]`);
                    if (nodeElement && !nodeElement.classList.contains('tree-node--expanded')) {
                        this.toggleNode(instance, nodeElement);
                    }
                }
                break;

            case 'collapseNode':
                if (message.nodeId) {
                    const nodeElement = instance.element.querySelector(`[data-node-id="${message.nodeId}"]`);
                    if (nodeElement && nodeElement.classList.contains('tree-node--expanded')) {
                        this.toggleNode(instance, nodeElement);
                    }
                }
                break;

            case 'selectNode':
                if (message.nodeId) {
                    const nodeElement = instance.element.querySelector(`[data-node-id="${message.nodeId}"]`);
                    if (nodeElement) {
                        this.selectNode(instance, nodeElement);
                    }
                }
                break;

            case 'clearSelection':
                if (instance.selectedNodeId) {
                    const selectedElement = instance.element.querySelector(`[data-node-id="${instance.selectedNodeId}"]`);
                    if (selectedElement) {
                        selectedElement.classList.remove('tree-node--selected');
                    }
                    instance.selectedNodeId = null;
                }
                break;

            case 'updateNodeChildren':
                if (message.nodeId && message.children) {
                    this.updateNodeChildren(instance, message.nodeId, message.children);
                }
                break;

            case 'expandAll':
                const allNodes = instance.element.querySelectorAll('.tree-node--has-children');
                allNodes.forEach(node => {
                    if (!node.classList.contains('tree-node--expanded')) {
                        this.toggleNode(instance, node);
                    }
                });
                break;

            case 'collapseAll':
                const expandedNodes = instance.element.querySelectorAll('.tree-node--expanded');
                expandedNodes.forEach(node => {
                    this.toggleNode(instance, node);
                });
                break;

            default:
                console.warn(`TreeViewBehavior: Unhandled action '${message.action}'`);
                break;
        }
    }

    /**
     * Handle tree click events
     */
    static handleTreeClick(instance, event) {
        const target = event.target;

        // Toggle button click
        if (target.closest('[data-action="toggle"]')) {
            event.stopPropagation();
            const nodeElement = target.closest('.tree-node');
            if (nodeElement) {
                this.toggleNode(instance, nodeElement);
            }
            return;
        }

        // Node content click (selection)
        const nodeContent = target.closest('.tree-node-content');
        if (nodeContent) {
            const nodeElement = nodeContent.closest('.tree-node');
            if (nodeElement) {
                this.selectNode(instance, nodeElement);
            }
            return;
        }
    }

    /**
     * Toggle node expansion
     */
    static toggleNode(instance, nodeElement) {
        const nodeId = nodeElement.dataset.nodeId;
        if (!nodeId) return;

        const isExpanded = nodeElement.classList.contains('tree-node--expanded');

        if (isExpanded) {
            // Collapse
            nodeElement.classList.remove('tree-node--expanded');
            nodeElement.classList.add('tree-node--collapsed');
            instance.expandedNodes.delete(nodeId);

            // Notify Extension Host
            this.sendMessage(instance, 'nodeCollapsed', { nodeId });

        } else {
            // Expand
            nodeElement.classList.remove('tree-node--collapsed');
            nodeElement.classList.add('tree-node--expanded');
            instance.expandedNodes.add(nodeId);

            // Find the node data in instance.nodes
            const node = this.findNodeById(instance, nodeId);

            // Notify Extension Host with full node data
            this.sendMessage(instance, 'node-expanded', { node });
        }
    }

    /**
     * Select a node
     */
    static selectNode(instance, nodeElement) {
        const nodeId = nodeElement.dataset.nodeId;
        if (!nodeId) return;

        // Check if node is selectable
        if (nodeElement.classList.contains('tree-node--not-selectable')) {
            return;
        }

        // Remove previous selection
        if (instance.selectedNodeId) {
            const previouslySelected = instance.element.querySelector(`[data-node-id="${instance.selectedNodeId}"]`);
            if (previouslySelected) {
                previouslySelected.classList.remove('tree-node--selected');
            }
        }

        // Add new selection
        nodeElement.classList.add('tree-node--selected');
        instance.selectedNodeId = nodeId;

        // Find the full node data from instance.nodes
        const node = this.findNodeById(instance, nodeId);

        // Notify Extension Host with full node data
        this.sendMessage(instance, 'node-selected', {
            node: node,
            nodeId,
            nodeType: nodeElement.dataset.nodeType
        });
    }

    /**
     * Recursively find a node by ID in the tree structure
     */
    static findNodeById(instance, nodeId) {
        if (!instance.nodes || !Array.isArray(instance.nodes)) {
            console.warn('TreeViewBehavior: No nodes available for lookup');
            return null;
        }

        const searchNode = (nodes, targetId) => {
            for (const node of nodes) {
                if (node.id === targetId) {
                    return node;
                }
                if (node.children && node.children.length > 0) {
                    const found = searchNode(node.children, targetId);
                    if (found) return found;
                }
            }
            return null;
        };

        return searchNode(instance.nodes, nodeId);
    }

    /**
     * Handle search input
     */
    static handleSearch(instance, event) {
        const query = event.target.value.toLowerCase().trim();
        instance.searchQuery = query;

        if (!instance.treeRoot) return;

        const allNodes = instance.treeRoot.querySelectorAll('.tree-node');

        if (query === '') {
            // Show all nodes when search is cleared
            allNodes.forEach(node => {
                node.style.display = '';
                node.classList.remove('tree-node--search-match');
            });
            return;
        }

        // Filter nodes by search query
        allNodes.forEach(node => {
            const label = node.querySelector('.tree-node-label');
            if (!label) return;

            const labelText = label.textContent.toLowerCase();
            const matches = labelText.includes(query);

            if (matches) {
                node.style.display = '';
                node.classList.add('tree-node--search-match');

                // Expand parents to make visible
                this.expandParents(node);
            } else {
                node.style.display = 'none';
                node.classList.remove('tree-node--search-match');
            }
        });
    }

    /**
     * Expand parent nodes
     */
    static expandParents(nodeElement) {
        let parent = nodeElement.parentElement;

        while (parent && parent.classList.contains('tree-children')) {
            const parentNode = parent.closest('.tree-node');
            if (parentNode && !parentNode.classList.contains('tree-node--expanded')) {
                const toggleBtn = parentNode.querySelector('.tree-toggle');
                if (toggleBtn && toggleBtn.dataset.action === 'toggle') {
                    // Simulate toggle to expand
                    this.toggleNode(this.instances.get(nodeElement.closest('.tree-view-container').dataset.componentId), parentNode);
                }
            }
            parent = parent.parentElement;
        }
    }

    /**
     * Handle context menu
     */
    static handleContextMenu(instance, event) {
        const nodeElement = event.target.closest('.tree-node');
        if (nodeElement) {
            event.preventDefault();
            const nodeId = nodeElement.dataset.nodeId;
            const nodeType = nodeElement.dataset.nodeType;

            // Notify Extension Host
            this.sendMessage(instance, 'nodeContextMenu', {
                nodeId,
                nodeType,
                x: event.clientX,
                y: event.clientY
            });
        }
    }

    /**
     * Update loading state
     */
    static updateLoadingState(instance, loading, message) {
        const content = instance.element.querySelector('.tree-view-content');
        if (!content) return;

        if (loading) {
            // Use shared loading indicator HTML structure (matches LoadingIndicatorView.generate())
            content.innerHTML = `
                <div class="loading-indicator">
                    <div class="loading-indicator-spinner"></div>
                    <div class="loading-indicator-message">${message}</div>
                </div>
            `;
        } else {
            // Clear loading and recreate tree-view-root if it doesn't exist
            const existingRoot = content.querySelector('.tree-view-root');
            if (!existingRoot) {
                content.innerHTML = '<ul class="tree-view-root"></ul>';
                // Re-cache the treeRoot element
                instance.treeRoot = content.querySelector('.tree-view-root');
            }
        }
    }

    /**
     * Update tree nodes (called from componentUpdate event bridge)
     */
    static updateNodes(instance, nodes) {
        if (!instance || !instance.treeRoot) {
            console.warn('TreeViewBehavior: Cannot update nodes - missing instance or treeRoot');
            return;
        }

        console.log(`TreeViewBehavior: Updating ${nodes.length} nodes`);

        // Store nodes in instance for lookups
        instance.nodes = nodes;

        // Generate HTML for all nodes
        const html = this.renderNodes(nodes);

        // Update DOM
        instance.treeRoot.innerHTML = html;

        // Restore expanded state if any
        instance.expandedNodes.forEach(nodeId => {
            const nodeElement = instance.element.querySelector(`[data-node-id="${nodeId}"]`);
            if (nodeElement && nodeElement.classList.contains('tree-node--has-children')) {
                nodeElement.classList.add('tree-node--expanded');
            }
        });

        console.log('TreeViewBehavior: Nodes updated successfully');
    }

    /**
     * Render nodes to HTML
     */
    static renderNodes(nodes, level = 0) {
        if (!nodes || nodes.length === 0) {
            return '';
        }

        return nodes.map(node => this.renderNode(node, level)).join('');
    }

    /**
     * Render a single node to HTML
     */
    static renderNode(node, level = 0) {
        // Check if node has children OR if it's marked as having children (for lazy loading)
        const hasChildren = (node.children && node.children.length > 0) || (node.hasChildren === true);
        const indent = level * 20;

        let html = `
            <div class="tree-node ${hasChildren ? 'tree-node--has-children' : ''}"
                 data-node-id="${node.id}"
                 data-node-type="${node.type || ''}"
                 style="padding-left: ${indent}px">
                <div class="tree-node-content">`;

        // Toggle button for nodes with children - using chevron that rotates via CSS
        if (hasChildren) {
            html += `<span class="tree-toggle" data-action="toggle" aria-label="Toggle">›</span>`;
        } else {
            html += `<span class="tree-toggle tree-toggle--spacer"></span>`;
        }

        // Icon
        if (node.icon) {
            html += `<span class="tree-icon">${node.icon}</span>`;
        }

        // Label
        html += `<span class="tree-label">${this.escapeHtml(node.label)}</span>`;

        html += `</div>`;

        // Children (if any)
        if (hasChildren) {
            html += `<div class="tree-children">`;
            html += this.renderNodes(node.children, level + 1);
            html += `</div>`;
        }

        html += `</div>`;

        return html;
    }

    /**
     * Update children for a node (lazy loading)
     */
    static updateNodeChildren(instance, nodeId, children) {
        const nodeElement = instance.element.querySelector(`[data-node-id="${nodeId}"]`);
        if (!nodeElement) {
            console.warn('TreeViewBehavior: Node not found for updateNodeChildren', nodeId);
            return;
        }

        // Get current node level
        const level = Math.floor(parseInt(nodeElement.style.paddingLeft || '0') / 20);

        // Find or create children container
        let childrenContainer = nodeElement.querySelector('.tree-children');
        if (!childrenContainer) {
            childrenContainer = document.createElement('div');
            childrenContainer.className = 'tree-children';
            nodeElement.appendChild(childrenContainer);
        }

        // Render and insert children
        childrenContainer.innerHTML = this.renderNodes(children, level + 1);

        // Update hasChildren class
        if (children.length > 0) {
            nodeElement.classList.add('tree-node--has-children');

            // Add toggle button if it doesn't exist
            let toggle = nodeElement.querySelector('.tree-toggle');
            if (!toggle) {
                toggle = document.createElement('span');
                toggle.className = 'tree-toggle';
                toggle.setAttribute('data-action', 'toggle');
                toggle.setAttribute('aria-label', 'Toggle');
                toggle.textContent = '›';
                const content = nodeElement.querySelector('.tree-node-content');
                if (content) {
                    content.insertBefore(toggle, content.firstChild);
                }
            } else if (toggle.classList.contains('tree-toggle--spacer')) {
                // Replace spacer with actual toggle
                toggle.classList.remove('tree-toggle--spacer');
                toggle.setAttribute('data-action', 'toggle');
                toggle.setAttribute('aria-label', 'Toggle');
                toggle.textContent = '›';
            }
        }
    }

    /**
     * Escape HTML to prevent XSS
     */
    static escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Cleanup instance resources
     */
    static cleanupInstance(instance) {
        // Remove event listeners
        if (instance.element && instance.boundHandlers.treeClick) {
            instance.element.removeEventListener('click', instance.boundHandlers.treeClick);
        }

        if (instance.searchInput && instance.boundHandlers.searchInput) {
            instance.searchInput.removeEventListener('input', instance.boundHandlers.searchInput);
        }

        if (instance.element && instance.boundHandlers.contextMenu) {
            instance.element.removeEventListener('contextmenu', instance.boundHandlers.contextMenu);
        }
    }
}

// Register behavior
TreeViewBehavior.register();
