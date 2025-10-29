/**
 * TEMPLATE: Copy this file when creating a new panel behavior
 *
 * Steps:
 * 1. Copy to resources/webview/js/panels/YourPanelBehavior.js
 * 2. Find/replace "TemplatePanel" with your panel name
 * 3. Update getComponentType() to return your panel type
 * 4. Implement onComponentUpdate() if panel receives data updates
 * 5. Implement handleCustomAction() for your panel-specific actions
 */

/**
 * TemplatePanel Behavior
 *
 * Manages webview-side logic for the Template Panel.
 * This runs in the webview context (browser-like environment).
 *
 * IMPORTANT: This MUST extend BaseBehavior (no exceptions)
 */
class TemplatePanelBehavior extends BaseBehavior {

    /**
     * REQUIRED: Return the component type that matches Extension Host
     */
    static getComponentType() {
        return 'TemplatePanel';
    }

    /**
     * REQUIRED: Handle component data updates from Extension Host
     * Called when Extension Host sends data via event bridges
     *
     * @param {HTMLElement} instance - The panel's DOM element
     * @param {Object} data - Data sent from Extension Host
     */
    static onComponentUpdate(instance, data) {
        console.log('TemplatePanel: Received data update', data);

        // Handle your data updates here
        // Example:
        // if (data?.items) {
        //     this.updateItems(instance, data.items);
        // }
    }

    /**
     * OPTIONAL: Override to customize instance creation
     * Default behavior: document.body
     *
     * @returns {HTMLElement} The panel instance element
     */
    static createInstance() {
        return document.body;
    }

    /**
     * OPTIONAL: Override to find and store DOM element references
     * Called during initialization
     *
     * @param {HTMLElement} instance - The panel instance
     */
    static findDOMElements(instance) {
        // Store references to frequently accessed elements
        // Example:
        // instance._elements = {
        //     content: instance.querySelector('#content'),
        //     sidebar: instance.querySelector('#sidebar')
        // };
    }

    /**
     * OPTIONAL: Override to set up event listeners
     * Called during initialization
     *
     * @param {HTMLElement} instance - The panel instance
     */
    static setupEventListeners(instance) {
        // Set up your event listeners
        // Example:
        // instance.querySelector('#myButton')?.addEventListener('click', () => {
        //     this.handleButtonClick(instance);
        // });
    }

    /**
     * OPTIONAL: Handle custom actions beyond componentUpdate
     * Called when Extension Host sends actions
     *
     * @param {HTMLElement} instance - The panel instance
     * @param {Object} message - Message from Extension Host
     */
    static handleCustomAction(instance, message) {
        switch (message.action) {
            case 'show-details':
                this.showDetails(instance, message.data);
                break;

            case 'hide-details':
                this.hideDetails(instance);
                break;

            // Add your custom actions
        }
    }

    /**
     * OPTIONAL: Override to clean up when component is destroyed
     *
     * @param {HTMLElement} instance - The panel instance
     */
    static cleanupInstance(instance) {
        // Clean up event listeners, timers, etc.
        // Example:
        // if (instance._resizeObserver) {
        //     instance._resizeObserver.disconnect();
        // }
    }

    /**
     * Example: Show details panel
     */
    static showDetails(instance, data) {
        console.log('TemplatePanel: Showing details', data);

        // Update DOM to show details
        // Example:
        // const detailsPanel = instance.querySelector('#details-panel');
        // if (detailsPanel) {
        //     detailsPanel.innerHTML = data.html;
        //     detailsPanel.classList.remove('hidden');
        // }
    }

    /**
     * Example: Hide details panel
     */
    static hideDetails(instance) {
        console.log('TemplatePanel: Hiding details');

        // Update DOM to hide details
        // Example:
        // const detailsPanel = instance.querySelector('#details-panel');
        // if (detailsPanel) {
        //     detailsPanel.classList.add('hidden');
        // }
    }

    /**
     * Example: Send message to Extension Host
     */
    static sendToExtensionHost(action, data) {
        const vscode = window.vscode || acquireVsCodeApi();
        vscode.postMessage({
            command: action,  // Use kebab-case: 'item-selected' not 'itemSelected'
            data: data
        });
    }
}

// REQUIRED: Register the behavior
// Without this, the panel won't work!
TemplatePanelBehavior.register();

console.log('TemplatePanel behavior registered');
