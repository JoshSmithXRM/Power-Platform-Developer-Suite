/**
 * JsonViewerBehavior - Handles webview interaction for JsonViewer component
 */
class JsonViewerBehavior {
    static instances = new Map();

    /**
     * Initialize a JsonViewer instance
     */
    static initialize(componentId, config, element) {
        if (!componentId || !element) {
            console.warn('[JsonViewerBehavior] Missing componentId or element');
            return null;
        }

        if (this.instances.has(componentId)) {
            return this.instances.get(componentId);
        }

        const instance = {
            id: componentId,
            config: { ...config },
            element: element,
            content: element.querySelector(`#${componentId}-content`)
        };

        this.instances.set(componentId, instance);
        console.log('[JsonViewerBehavior] Initialized:', componentId);

        return instance;
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
            console.warn('[JsonViewerBehavior] Instance not found:', message.componentId);
            return;
        }

        switch (message.action) {
            case 'setData':
                this.updateJsonContent(message.componentId, message.data);
                break;
            case 'clear':
                this.clearContent(message.componentId);
                break;
            default:
                console.warn('[JsonViewerBehavior] Unknown action:', message.action);
        }
    }

    /**
     * Update JSON content
     */
    static updateJsonContent(componentId, data) {
        const instance = this.instances.get(componentId);
        if (!instance || !instance.content) {
            return;
        }

        // Note: For now, we regenerate HTML from Extension Host
        // In future, we could implement client-side JSON rendering for better performance
        console.log('[JsonViewerBehavior] Content update handled by Extension Host');
    }

    /**
     * Clear content
     */
    static clearContent(componentId) {
        const instance = this.instances.get(componentId);
        if (!instance || !instance.content) {
            return;
        }

        instance.content.innerHTML = '<div class="json-viewer-empty">No data to display</div>';
    }

    /**
     * Toggle collapse/expand for a node
     */
    static toggleCollapse(toggleButton) {
        if (!toggleButton) {
            return;
        }

        const container = toggleButton.closest('.json-object, .json-array');
        if (!container) {
            return;
        }

        container.classList.toggle('collapsed');

        // Update toggle icon
        toggleButton.textContent = container.classList.contains('collapsed') ? '▶' : '▼';
    }

    /**
     * Copy JSON to clipboard
     */
    static copyJson(componentId) {
        const instance = this.instances.get(componentId);
        if (!instance || !instance.content) {
            console.warn('[JsonViewerBehavior] Cannot copy - instance not found:', componentId);
            return;
        }

        // Get the raw JSON data from data attribute or reconstruct from DOM
        // For now, we'll send message to Extension Host to handle copy
        // since it has the original data

        if (window.vscode) {
            window.vscode.postMessage({
                command: 'component-event',
                data: {
                    componentId: componentId,
                    eventType: 'copyRequested',
                    action: 'copy'
                }
            });
        }
    }

    /**
     * Expand all nodes
     */
    static expandAll(componentId) {
        const instance = this.instances.get(componentId);
        if (!instance || !instance.element) {
            return;
        }

        const collapsedNodes = instance.element.querySelectorAll('.json-object.collapsed, .json-array.collapsed');
        collapsedNodes.forEach(node => {
            node.classList.remove('collapsed');
            const toggle = node.querySelector('.json-toggle');
            if (toggle) {
                toggle.textContent = '▼';
            }
        });
    }

    /**
     * Collapse all nodes
     */
    static collapseAll(componentId) {
        const instance = this.instances.get(componentId);
        if (!instance || !instance.element) {
            return;
        }

        const expandedNodes = instance.element.querySelectorAll('.json-object:not(.collapsed), .json-array:not(.collapsed)');
        expandedNodes.forEach(node => {
            node.classList.add('collapsed');
            const toggle = node.querySelector('.json-toggle');
            if (toggle) {
                toggle.textContent = '▶';
            }
        });
    }
}

// Global registration
if (typeof window !== 'undefined') {
    window.JsonViewerBehavior = JsonViewerBehavior;

    if (window.ComponentUtils?.registerBehavior) {
        window.ComponentUtils.registerBehavior('JsonViewer', JsonViewerBehavior);
    }

    // Event delegation for JsonViewer interactions
    document.addEventListener('click', (event) => {
        const target = event.target;
        const action = target?.dataset?.action;

        if (!action) {
            return;
        }

        // Handle toggle collapse
        if (action === 'toggle-collapse') {
            JsonViewerBehavior.toggleCollapse(target);
            event.preventDefault();
            return;
        }

        // Handle copy JSON
        if (action === 'copy-json') {
            const viewerId = target.dataset.viewerId;
            if (viewerId) {
                JsonViewerBehavior.copyJson(viewerId);
                event.preventDefault();
            }
        }
    });
}
