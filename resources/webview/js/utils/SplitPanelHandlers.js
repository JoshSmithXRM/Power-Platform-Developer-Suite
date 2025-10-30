/**
 * Shared handlers for split panel messages
 * Used by panel behaviors to avoid duplication (Three Strikes Rule)
 */
class SplitPanelHandlers {
    /**
     * Handle set-split-ratio message
     * @param {object} message - Message containing componentId and ratio
     * @returns {boolean} true if handled, false if component not found
     */
    static handleSetSplitRatio(message) {
        console.log('📏 Setting split ratio:', message.ratio);
        if (window.SplitPanelBehavior && window.SplitPanelBehavior.instances.has(message.componentId)) {
            const instance = window.SplitPanelBehavior.instances.get(message.componentId);
            window.SplitPanelBehavior.setSplitRatio(instance, message.ratio);
            return true;
        }
        console.warn('SplitPanelBehavior instance not found:', message.componentId);
        return false;
    }

    /**
     * Handle show-right-panel message
     * @param {object} message - Message containing componentId
     * @returns {boolean} true if handled, false if component not found
     */
    static handleShowRightPanel(message) {
        console.log('📂 Showing right panel');
        if (window.SplitPanelBehavior && window.SplitPanelBehavior.instances.has(message.componentId)) {
            const instance = window.SplitPanelBehavior.instances.get(message.componentId);
            window.SplitPanelBehavior.showRightPanel(instance);
            return true;
        }
        console.warn('SplitPanelBehavior instance not found:', message.componentId);
        return false;
    }
}

// Make available globally
window.SplitPanelHandlers = SplitPanelHandlers;
