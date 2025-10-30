/**
 * Plugin Registration Panel Behavior
 * Handles tree interactions and details panel display
 *
 * ARCHITECTURE NOTE:
 * - Extension Host sends DATA only (via 'show-node-details' message)
 * - This behavior handles BOTH content AND layout visibility
 * - No round-trip messages for UI state (webview owns layout)
 */

class PluginRegistrationBehavior extends BaseBehavior {
    /**
     * Get the component type this behavior handles
     */
    static getComponentType() {
        return 'PluginRegistrationPanel';
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
            vscode: acquireVsCodeApi()
        };
    }

    /**
     * Find and cache DOM elements
     */
    static findDOMElements(instance) {
        instance.detailContent = document.getElementById('detail-panel-content');
        instance.splitContainer = document.querySelector('[data-component-id="pluginRegistration-splitPanel"]');
    }

    /**
     * Setup event listeners
     */
    static setupEventListeners(instance) {
        // Register panel handler with ComponentUtils for proper message routing
        if (window.ComponentUtils && window.ComponentUtils.registerPanelHandler) {
            window.ComponentUtils.registerPanelHandler('pluginRegistration', (message) => {
                console.log('📨 PluginRegistrationBehavior message received:', message.command || message.command);

                const actionType = message.command || message.command;

                switch (actionType) {
                    case 'show-node-details':
                        console.log('Calling showNodeDetails with data:', message.data);
                        this.showNodeDetails(instance, message.data);
                        return true;

                    case 'set-split-ratio':
                        return window.SplitPanelHandlers.handleSetSplitRatio(message);

                    case 'show-right-panel':
                        return window.SplitPanelHandlers.handleShowRightPanel(message);

                    default:
                        return false;
                }
            });
            console.log('✅ PluginRegistrationBehavior registered with ComponentUtils');
        } else {
            console.error('ComponentUtils not available, cannot register panel handler');
        }

        // Setup data-action event delegation
        this.setupEventDelegation(instance);
    }

    /**
     * Initialize component state from DOM
     */
    static initializeState(instance) {
        // No initial state needed for this panel
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
    static setupEventDelegation(instance) {
        instance.boundHandlers.clickHandler = (event) => {
            const target = event.target;
            if (!target) return;

            const action = target.getAttribute('data-action') || target.closest('[data-action]')?.getAttribute('data-action');
            if (!action) return;

            switch (action) {
                case 'close-right-panel':
                    this.closeDetailPanel(instance);
                    break;

                case 'switch-detail-tab': {
                    const tabName = target.getAttribute('data-tab') || target.closest('[data-tab]')?.getAttribute('data-tab');
                    if (tabName) {
                        this.switchDetailTab(tabName);
                    }
                    break;
                }
            }
        };
        document.addEventListener('click', instance.boundHandlers.clickHandler);
    }

    /**
     * Show node details panel
     * Handles content update AND delegates panel visibility to SplitPanelBehavior API
     */
    static showNodeDetails(instance, data) {
        console.log('PluginRegistrationBehavior: showNodeDetails called with data:', data);

        if (!data || !data.html) {
            console.warn('PluginRegistrationBehavior: No HTML data provided');
            return;
        }

        console.log('PluginRegistrationBehavior: HTML data length:', data.html.length);

        if (!instance.detailContent) {
            console.warn('PluginRegistrationBehavior: Detail panel content element not found');
            return;
        }

        console.log('PluginRegistrationBehavior: Showing details for node:', data.nodeType);

        // Update content first
        console.log('PluginRegistrationBehavior: Setting innerHTML...');
        instance.detailContent.innerHTML = data.html;
        console.log('PluginRegistrationBehavior: innerHTML set. New content:', instance.detailContent.innerHTML.substring(0, 100));

        // Show panel using SplitPanelBehavior public API
        if (window.SplitPanelBehavior && window.SplitPanelBehavior.instances.has('pluginRegistration-splitPanel')) {
            const splitInstance = window.SplitPanelBehavior.instances.get('pluginRegistration-splitPanel');
            window.SplitPanelBehavior.showRightPanel(splitInstance);
            console.log('PluginRegistrationBehavior: Called SplitPanelBehavior.showRightPanel()');
        } else {
            console.warn('PluginRegistrationBehavior: SplitPanelBehavior not available');
        }

        console.log('PluginRegistrationBehavior: showNodeDetails completed');
    }

    /**
     * Close detail panel
     * Uses SplitPanelBehavior API to handle panel visibility
     */
    static closeDetailPanel(instance) {
        console.log('PluginRegistrationBehavior: Closing detail panel');

        // Close panel using SplitPanelBehavior public API
        if (window.SplitPanelBehavior && window.SplitPanelBehavior.instances.has('pluginRegistration-splitPanel')) {
            const splitInstance = window.SplitPanelBehavior.instances.get('pluginRegistration-splitPanel');
            window.SplitPanelBehavior.closeRightPanel(splitInstance);
            console.log('PluginRegistrationBehavior: Called SplitPanelBehavior.closeRightPanel()');
        } else {
            console.warn('PluginRegistrationBehavior: SplitPanelBehavior not available');
        }

        // Notify Extension Host that panel was closed (so it can clear selectedNode state)
        instance.vscode.postMessage({
            command: 'close-details'
        });
    }

    /**
     * Switch detail panel tab between Properties and Raw Data
     */
    static switchDetailTab(tabName) {
        console.log('PluginRegistrationBehavior: Switching to tab:', tabName);

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
     * Cleanup instance resources
     */
    static cleanupInstance(instance) {
        if (instance.boundHandlers.clickHandler) {
            document.removeEventListener('click', instance.boundHandlers.clickHandler);
        }
    }
}

// Register behavior
PluginRegistrationBehavior.register();

// Initialize panel instance when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        PluginRegistrationBehavior.initialize('pluginRegistrationPanel', {}, document.body);
    });
} else {
    PluginRegistrationBehavior.initialize('pluginRegistrationPanel', {}, document.body);
}
