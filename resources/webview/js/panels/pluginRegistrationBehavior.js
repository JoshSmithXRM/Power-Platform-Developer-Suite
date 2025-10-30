/**
 * Plugin Registration Panel Behavior
 * Handles tree interactions and details panel display
 *
 * ARCHITECTURE NOTE:
 * - Extension Host sends DATA only (via 'show-node-details' message)
 * - This behavior handles BOTH content AND layout visibility
 * - No round-trip messages for UI state (webview owns layout)
 */

class PluginRegistrationBehavior {
    /**
     * Initialize plugin registration behavior
     */
    static initialize() {
        console.log('PluginRegistrationBehavior: Initializing');

        // Register panel handler with ComponentUtils for proper message routing
        if (window.ComponentUtils && window.ComponentUtils.registerPanelHandler) {
            window.ComponentUtils.registerPanelHandler('pluginRegistration', (message) => {
                console.log('📨 PluginRegistrationBehavior message received:', message.action || message.command);

                // Handle both action and command for backward compatibility
                const actionType = message.action || message.command;

                switch (actionType) {
                    case 'show-node-details':
                        console.log('Calling showNodeDetails with data:', message.data);
                        PluginRegistrationBehavior.showNodeDetails(message.data);
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
            console.log('✅ PluginRegistrationBehavior registered with ComponentUtils');
        } else {
            console.error('ComponentUtils not available, cannot register panel handler');
        }

        // Setup data-action event delegation for close button
        PluginRegistrationBehavior.setupEventDelegation();

        console.log('PluginRegistrationBehavior: Initialized');
    }

    /**
     * Setup event delegation for data-action attributes
     */
    static setupEventDelegation() {
        document.addEventListener('click', (event) => {
            const target = event.target;
            if (!target) return;

            const action = target.getAttribute('data-action') || target.closest('[data-action]')?.getAttribute('data-action');
            if (!action) return;

            switch (action) {
                case 'closeRightPanel':
                    PluginRegistrationBehavior.closeDetailPanel();
                    break;

                case 'switch-detail-tab': {
                    const tabName = target.getAttribute('data-tab') || target.closest('[data-tab]')?.getAttribute('data-tab');
                    if (tabName) {
                        PluginRegistrationBehavior.switchDetailTab(tabName);
                    }
                    break;
                }
            }
        });
    }

    /**
     * Show node details panel
     * Handles content update AND delegates panel visibility to SplitPanelBehavior API
     */
    static showNodeDetails(data) {
        console.log('PluginRegistrationBehavior: showNodeDetails called with data:', data);

        if (!data || !data.html) {
            console.warn('PluginRegistrationBehavior: No HTML data provided');
            return;
        }

        console.log('PluginRegistrationBehavior: HTML data length:', data.html.length);

        const detailContent = document.getElementById('detail-panel-content');

        if (!detailContent) {
            console.warn('PluginRegistrationBehavior: Detail panel content element not found');
            return;
        }

        console.log('PluginRegistrationBehavior: Showing details for node:', data.nodeType);

        // Update content first
        console.log('PluginRegistrationBehavior: Setting innerHTML...');
        detailContent.innerHTML = data.html;
        console.log('PluginRegistrationBehavior: innerHTML set. New content:', detailContent.innerHTML.substring(0, 100));

        // Show panel using SplitPanelBehavior public API
        if (window.SplitPanelBehavior && window.SplitPanelBehavior.instances.has('pluginRegistration-splitPanel')) {
            const instance = window.SplitPanelBehavior.instances.get('pluginRegistration-splitPanel');
            window.SplitPanelBehavior.showRightPanel(instance);
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
    static closeDetailPanel() {
        console.log('PluginRegistrationBehavior: Closing detail panel');

        // Close panel using SplitPanelBehavior public API
        if (window.SplitPanelBehavior && window.SplitPanelBehavior.instances.has('pluginRegistration-splitPanel')) {
            const instance = window.SplitPanelBehavior.instances.get('pluginRegistration-splitPanel');
            window.SplitPanelBehavior.closeRightPanel(instance);
            console.log('PluginRegistrationBehavior: Called SplitPanelBehavior.closeRightPanel()');
        } else {
            console.warn('PluginRegistrationBehavior: SplitPanelBehavior not available');
        }

        // Notify Extension Host that panel was closed (so it can clear selectedNode state)
        const vscode = window.vscode || acquireVsCodeApi();
        vscode.postMessage({
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
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        PluginRegistrationBehavior.initialize();
    });
} else {
    PluginRegistrationBehavior.initialize();
}
