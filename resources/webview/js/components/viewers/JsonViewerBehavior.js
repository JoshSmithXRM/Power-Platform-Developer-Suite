/**
 * JsonViewerBehavior - Handles webview interaction for JsonViewer component
 *
 * ARCHITECTURE_COMPLIANCE: Extends BaseBehavior for enforced componentUpdate pattern
 */
class JsonViewerBehavior extends BaseBehavior {
    /**
     * Get component type identifier
     */
    static getComponentType() {
        return 'JsonViewer';
    }

    /**
     * Create instance (returns plain object, not JsonViewerBehavior instance)
     */
    static createInstance(componentId, config, element) {
        if (!componentId || !element) {
            console.warn('[JsonViewerBehavior] Missing componentId or element');
            return null;
        }

        return {
            id: componentId,
            config: { ...config },
            element: element,
            content: element.querySelector('.json-viewer-content') || element.querySelector(`#${componentId}-content`)
        };
    }

    /**
     * Handle component data updates from Extension Host
     * REQUIRED by BaseBehavior - called when event bridge sends updated data
     */
    static onComponentUpdate(instance, data) {
        if (!instance || !instance.content) {
            console.warn('[JsonViewerBehavior] Cannot update - invalid instance');
            return;
        }

        if (data === null || data === undefined) {
            this.clearContent(instance);
            return;
        }

        // Render JSON with collapsible support
        const collapsible = instance.element?.dataset?.collapsible === 'true';
        const initialCollapseDepth = parseInt(instance.element?.dataset?.initialCollapseDepth || '0', 10);

        instance.content.innerHTML = this.renderJson(data, 0, collapsible, initialCollapseDepth);
    }

    /**
     * Render JSON value with collapsible support
     */
    static renderJson(data, depth, collapsible, initialCollapseDepth) {
        const isCollapsed = depth >= initialCollapseDepth && collapsible;
        return this.renderValue(data, depth, collapsible, initialCollapseDepth, isCollapsed);
    }

    /**
     * Render a JSON value (primitives, objects, arrays)
     */
    static renderValue(value, depth, collapsible, initialCollapseDepth, isCollapsed) {
        if (value === null) {
            return '<span class="json-null">null</span>';
        }

        if (value === undefined) {
            return '<span class="json-undefined">undefined</span>';
        }

        const type = typeof value;

        switch (type) {
            case 'boolean':
                return `<span class="json-boolean">${value}</span>`;
            case 'number':
                return `<span class="json-number">${value}</span>`;
            case 'string':
                return `<span class="json-string">"${this.escapeHtml(value)}"</span>`;
            case 'object':
                if (Array.isArray(value)) {
                    return this.renderArray(value, depth, collapsible, initialCollapseDepth, isCollapsed);
                } else {
                    return this.renderObject(value, depth, collapsible, initialCollapseDepth, isCollapsed);
                }
            default:
                return `<span class="json-unknown">${this.escapeHtml(String(value))}</span>`;
        }
    }

    /**
     * Render JSON object with collapsible support
     */
    static renderObject(obj, depth, collapsible, initialCollapseDepth, isCollapsed) {
        if (!obj || typeof obj !== 'object') {
            return '';
        }

        const keys = Object.keys(obj);
        if (keys.length === 0) {
            return '<span class="json-object">{}</span>';
        }

        const collapsibleClass = collapsible ? ' collapsible' : '';
        const collapsedClass = isCollapsed ? ' collapsed' : '';
        const toggleButton = collapsible
            ? '<span class="json-toggle" data-action="toggle-collapse">▼</span>'
            : '';

        const lines = keys.map((key, index) => {
            const isLast = index === keys.length - 1;
            const comma = isLast ? '' : ',';
            const childIsCollapsed = (depth + 1) >= initialCollapseDepth && collapsible;
            const valueHtml = this.renderValue(obj[key], depth + 1, collapsible, initialCollapseDepth, childIsCollapsed);

            return `
                <div class="json-line json-object-line">
                    <span class="json-key">"${this.escapeHtml(key)}"</span><span class="json-colon">:</span> ${valueHtml}${comma}
                </div>
            `;
        }).join('');

        return `
            <span class="json-object${collapsibleClass}${collapsedClass}">
                ${toggleButton}<span class="json-brace">{</span>
                <div class="json-content">
                    ${lines}
                </div>
                <span class="json-brace">}</span>
            </span>
        `;
    }

    /**
     * Render JSON array with collapsible support
     */
    static renderArray(arr, depth, collapsible, initialCollapseDepth, isCollapsed) {
        if (arr.length === 0) {
            return '<span class="json-array">[]</span>';
        }

        const collapsibleClass = collapsible ? ' collapsible' : '';
        const collapsedClass = isCollapsed ? ' collapsed' : '';
        const toggleButton = collapsible
            ? '<span class="json-toggle" data-action="toggle-collapse">▼</span>'
            : '';

        const lines = arr.map((item, index) => {
            const isLast = index === arr.length - 1;
            const comma = isLast ? '' : ',';
            const childIsCollapsed = (depth + 1) >= initialCollapseDepth && collapsible;
            const valueHtml = this.renderValue(item, depth + 1, collapsible, initialCollapseDepth, childIsCollapsed);

            return `
                <div class="json-line json-array-line">
                    ${valueHtml}${comma}
                </div>
            `;
        }).join('');

        return `
            <span class="json-array${collapsibleClass}${collapsedClass}">
                ${toggleButton}<span class="json-bracket">[</span>
                <div class="json-content">
                    ${lines}
                </div>
                <span class="json-bracket">]</span>
            </span>
        `;
    }

    /**
     * Escape HTML to prevent XSS
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
     * Handle custom actions beyond componentUpdate
     */
    static handleCustomAction(instance, message) {
        switch (message.action) {
            case 'clear':
                this.clearContent(instance);
                break;
            case 'expandAll':
                this.expandAll(instance);
                break;
            case 'collapseAll':
                this.collapseAll(instance);
                break;
            default:
                console.warn('[JsonViewerBehavior] Unknown action:', message.action);
        }
    }

    /**
     * Clear content
     */
    static clearContent(instance) {
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
     * Copy JSON to clipboard - helper for event delegation
     */
    static copyJsonById(componentId) {
        const scopedKey = this.getScopedKey(componentId);
        const instance = this.instances.get(scopedKey);
        if (!instance) {
            console.warn('[JsonViewerBehavior] Cannot copy - instance not found:', componentId);
            return;
        }

        this.copyJson(instance);
    }

    /**
     * Copy JSON to clipboard
     */
    static copyJson(instance) {
        if (!instance) {
            console.warn('[JsonViewerBehavior] Cannot copy - invalid instance');
            return;
        }

        // Send message to Extension Host to handle copy
        // since it has the original data
        if (window.vscode) {
            window.vscode.postMessage({
                command: 'component-event',
                data: {
                    componentId: instance.id,
                    eventType: 'copyRequested',
                    action: 'copy'
                }
            });
        }
    }

    /**
     * Expand all nodes
     */
    static expandAll(instance) {
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
    static collapseAll(instance) {
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

// Register behavior
JsonViewerBehavior.register();

// Event delegation for JsonViewer interactions
if (typeof window !== 'undefined') {
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
                JsonViewerBehavior.copyJsonById(viewerId);
                event.preventDefault();
            }
        }
    });
}
