/**
 * SplitPanelBehavior - Webview behavior for SplitPanel component
 * Handles resizable divider drag, panel show/hide, and size management
 */

class SplitPanelBehavior {
    static instances = new Map();

    /**
     * Initialize a SplitPanel component instance
     */
    static initialize(componentId, config, element) {
        if (!componentId || !element) {
            console.error('SplitPanelBehavior: componentId and element are required');
            return null;
        }

        if (this.instances.has(componentId)) {
            return this.instances.get(componentId);
        }

        const instance = {
            id: componentId,
            config: { ...config },
            element: element,

            // DOM elements
            leftPanel: null,
            rightPanel: null,
            divider: null,
            closeBtn: null,

            // State
            orientation: config.orientation || 'horizontal',
            minSize: config.minSize || 200,
            resizable: config.resizable !== false,
            rightPanelVisible: !config.rightPanelDefaultHidden,
            isDragging: false,
            startPos: 0,
            startLeftSize: 0,
            startRightSize: 0,

            // Event handlers
            boundHandlers: {}
        };

        try {
            // Find DOM elements
            this.findDOMElements(instance);

            // Setup event listeners
            this.setupEventListeners(instance);

            // Initialize state
            this.initializeState(instance);

            // Register instance
            this.instances.set(componentId, instance);

            console.log(`SplitPanelBehavior: Initialized ${componentId}`);
            return instance;

        } catch (error) {
            console.error(`SplitPanelBehavior: Failed to initialize ${componentId}:`, error);
            return null;
        }
    }

    /**
     * Find and cache DOM elements
     */
    static findDOMElements(instance) {
        const { element } = instance;

        instance.leftPanel = element.querySelector('[data-panel="left"]');
        instance.rightPanel = element.querySelector('[data-panel="right"]');
        instance.divider = element.querySelector('[data-divider]');
        instance.closeBtn = element.querySelector('[data-action="closeRightPanel"]');

        if (!instance.leftPanel || !instance.rightPanel) {
            throw new Error('Left and right panels are required');
        }

        // Get orientation from data attribute if not in config
        const dataOrientation = element.dataset.orientation;
        if (dataOrientation) {
            instance.orientation = dataOrientation;
        }

        const dataMinSize = element.dataset.minSize;
        if (dataMinSize) {
            instance.minSize = parseInt(dataMinSize, 10);
        }

        const dataResizable = element.dataset.resizable;
        if (dataResizable !== undefined) {
            instance.resizable = dataResizable === 'true';
        }
    }

    /**
     * Setup event listeners
     */
    static setupEventListeners(instance) {
        const { divider, closeBtn } = instance;

        // Divider drag events
        if (divider && instance.resizable) {
            instance.boundHandlers.mouseDown = (e) => this.handleDragStart(instance, e);
            divider.addEventListener('mousedown', instance.boundHandlers.mouseDown);
        }

        // Global mouse events for dragging (added to document)
        instance.boundHandlers.mouseMove = (e) => this.handleDragMove(instance, e);
        instance.boundHandlers.mouseUp = (e) => this.handleDragEnd(instance, e);

        // Close button
        if (closeBtn) {
            instance.boundHandlers.closeClick = () => this.closeRightPanel(instance);
            closeBtn.addEventListener('click', instance.boundHandlers.closeClick);
        }

        // Window resize
        instance.boundHandlers.windowResize = () => this.handleWindowResize(instance);
        window.addEventListener('resize', instance.boundHandlers.windowResize);
    }

    /**
     * Initialize state
     */
    static initializeState(instance) {
        // Set initial panel visibility
        if (!instance.rightPanelVisible) {
            this.hideRightPanelInternal(instance);
        }

        // Ensure valid sizes
        this.enforcePanelSizes(instance);
    }

    /**
     * Handle drag start
     */
    static handleDragStart(instance, event) {
        event.preventDefault();

        instance.isDragging = true;

        // Record starting position and sizes
        if (instance.orientation === 'horizontal') {
            instance.startPos = event.clientX;
            instance.startLeftSize = instance.leftPanel.offsetWidth;
            instance.startRightSize = instance.rightPanel.offsetWidth;
        } else {
            instance.startPos = event.clientY;
            instance.startLeftSize = instance.leftPanel.offsetHeight;
            instance.startRightSize = instance.rightPanel.offsetHeight;
        }

        // Add dragging class for cursor styling
        instance.element.classList.add('split-panel-dragging');
        document.body.style.cursor = instance.orientation === 'horizontal' ? 'ew-resize' : 'ns-resize';
        document.body.style.userSelect = 'none';

        // Attach global mouse event listeners
        document.addEventListener('mousemove', instance.boundHandlers.mouseMove);
        document.addEventListener('mouseup', instance.boundHandlers.mouseUp);
    }

    /**
     * Handle drag move
     */
    static handleDragMove(instance, event) {
        if (!instance.isDragging) return;

        event.preventDefault();

        const containerSize = instance.orientation === 'horizontal'
            ? instance.element.offsetWidth
            : instance.element.offsetHeight;

        const currentPos = instance.orientation === 'horizontal' ? event.clientX : event.clientY;
        const delta = currentPos - instance.startPos;

        // Calculate new sizes
        let newLeftSize = instance.startLeftSize + delta;
        let newRightSize = instance.startRightSize - delta;

        // Enforce minimum sizes
        if (newLeftSize < instance.minSize) {
            newLeftSize = instance.minSize;
            newRightSize = containerSize - newLeftSize;
        }

        if (newRightSize < instance.minSize) {
            newRightSize = instance.minSize;
            newLeftSize = containerSize - newRightSize;
        }

        // Calculate percentages
        const leftPercent = (newLeftSize / containerSize) * 100;
        const rightPercent = (newRightSize / containerSize) * 100;

        // Apply new sizes
        if (instance.orientation === 'horizontal') {
            instance.leftPanel.style.width = `${leftPercent}%`;
            instance.rightPanel.style.width = `${rightPercent}%`;
        } else {
            instance.leftPanel.style.height = `${leftPercent}%`;
            instance.rightPanel.style.height = `${rightPercent}%`;
        }
    }

    /**
     * Handle drag end
     */
    static handleDragEnd(instance, event) {
        if (!instance.isDragging) return;

        event.preventDefault();

        instance.isDragging = false;

        // Remove dragging class
        instance.element.classList.remove('split-panel-dragging');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';

        // Remove global mouse event listeners
        document.removeEventListener('mousemove', instance.boundHandlers.mouseMove);
        document.removeEventListener('mouseup', instance.boundHandlers.mouseUp);

        // Calculate final split ratio
        const containerSize = instance.orientation === 'horizontal'
            ? instance.element.offsetWidth
            : instance.element.offsetHeight;

        const leftSize = instance.orientation === 'horizontal'
            ? instance.leftPanel.offsetWidth
            : instance.leftPanel.offsetHeight;

        const splitRatio = (leftSize / containerSize) * 100;

        // Notify Extension Host
        this.sendMessage(instance, 'splitRatioChanged', {
            splitRatio: splitRatio
        });
    }

    /**
     * Handle window resize
     */
    static handleWindowResize(instance) {
        // Enforce panel size constraints on window resize
        this.enforcePanelSizes(instance);
    }

    /**
     * Enforce panel size constraints
     */
    static enforcePanelSizes(instance) {
        const containerSize = instance.orientation === 'horizontal'
            ? instance.element.offsetWidth
            : instance.element.offsetHeight;

        const leftSize = instance.orientation === 'horizontal'
            ? instance.leftPanel.offsetWidth
            : instance.leftPanel.offsetHeight;

        const rightSize = instance.orientation === 'horizontal'
            ? instance.rightPanel.offsetWidth
            : instance.rightPanel.offsetHeight;

        // Check if either panel is below minimum size
        if (leftSize < instance.minSize || rightSize < instance.minSize) {
            // Reset to 50/50 if sizes are invalid
            if (instance.orientation === 'horizontal') {
                instance.leftPanel.style.width = '50%';
                instance.rightPanel.style.width = '50%';
            } else {
                instance.leftPanel.style.height = '50%';
                instance.rightPanel.style.height = '50%';
            }
        }
    }

    /**
     * Close right panel
     */
    static closeRightPanel(instance) {
        if (!instance.rightPanelVisible) return;

        this.hideRightPanelInternal(instance);

        // Notify Extension Host
        this.sendMessage(instance, 'rightPanelClosed', {
            rightPanelVisible: false
        });
    }

    /**
     * Show right panel
     */
    static showRightPanel(instance) {
        console.log('🔧 showRightPanel called', {
            rightPanelVisible: instance.rightPanelVisible,
            element: instance.element,
            leftPanel: instance.leftPanel,
            rightPanel: instance.rightPanel
        });

        const wasHidden = !instance.rightPanelVisible;

        // Show the panel
        console.log('✅ Showing right panel');
        instance.rightPanelVisible = true;
        instance.element.classList.remove('split-panel-right-hidden');
        instance.rightPanel.classList.remove('hidden'); // Remove any 'hidden' class
        instance.rightPanel.style.display = '';

        // Only reset split ratio if panel was previously hidden (first time showing)
        // This preserves user's resize preferences when just updating content
        if (wasHidden) {
            const initialSplit = instance.config.initialSplit || 50;
            console.log('📏 Setting initial split ratio (panel was hidden):', initialSplit);
            if (instance.orientation === 'horizontal') {
                instance.leftPanel.style.width = `${initialSplit}%`;
                instance.rightPanel.style.width = `${100 - initialSplit}%`;
            } else {
                instance.leftPanel.style.height = `${initialSplit}%`;
                instance.rightPanel.style.height = `${100 - initialSplit}%`;
            }
        } else {
            console.log('ℹ️ Preserving existing split ratio (panel already visible)');
        }

        console.log('📢 Notifying Extension Host: rightPanelOpened');
        // Notify Extension Host
        this.sendMessage(instance, 'rightPanelOpened', {
            rightPanelVisible: true
        });
    }

    /**
     * Hide right panel (internal)
     */
    static hideRightPanelInternal(instance) {
        instance.rightPanelVisible = false;
        instance.element.classList.add('split-panel-right-hidden');
        instance.rightPanel.style.display = 'none';

        // Expand left panel to full width
        if (instance.orientation === 'horizontal') {
            instance.leftPanel.style.width = '100%';
        } else {
            instance.leftPanel.style.height = '100%';
        }
    }

    /**
     * Set split ratio
     */
    static setSplitRatio(instance, ratio) {
        if (ratio < 0 || ratio > 100) {
            console.error('SplitPanelBehavior: Split ratio must be between 0 and 100');
            return;
        }

        if (!instance.rightPanelVisible) {
            // If right panel is hidden, show it first
            this.showRightPanel(instance);
        }

        // Apply new ratio
        if (instance.orientation === 'horizontal') {
            instance.leftPanel.style.width = `${ratio}%`;
            instance.rightPanel.style.width = `${100 - ratio}%`;
        } else {
            instance.leftPanel.style.height = `${ratio}%`;
            instance.rightPanel.style.height = `${100 - ratio}%`;
        }
    }

    /**
     * Send message to Extension Host
     */
    static sendMessage(instance, action, data) {
        if (typeof window.ComponentUtils !== 'undefined' && window.ComponentUtils.sendMessage) {
            window.ComponentUtils.sendMessage(action, {
                componentId: instance.id,
                componentType: 'SplitPanel',
                ...data
            });
        }
    }

    /**
     * Handle messages from Extension Host
     */
    static handleMessage(message) {
        if (!message?.componentId || message.componentType !== 'SplitPanel') {
            return;
        }

        const instance = this.instances.get(message.componentId);
        if (!instance) {
            console.warn(`SplitPanelBehavior: Instance ${message.componentId} not found`);
            return;
        }

        switch (message.action) {
            case 'setSplitRatio':
                if (typeof message.ratio === 'number') {
                    this.setSplitRatio(instance, message.ratio);
                }
                break;

            case 'showRightPanel':
                this.showRightPanel(instance);
                break;

            case 'hideRightPanel':
                this.closeRightPanel(instance);
                break;

            case 'toggleRightPanel':
                if (instance.rightPanelVisible) {
                    this.closeRightPanel(instance);
                } else {
                    this.showRightPanel(instance);
                }
                break;
        }
    }

    /**
     * Cleanup instance
     */
    static cleanup(componentId) {
        const instance = this.instances.get(componentId);
        if (!instance) return;

        // Remove event listeners
        if (instance.divider && instance.boundHandlers.mouseDown) {
            instance.divider.removeEventListener('mousedown', instance.boundHandlers.mouseDown);
        }

        if (instance.closeBtn && instance.boundHandlers.closeClick) {
            instance.closeBtn.removeEventListener('click', instance.boundHandlers.closeClick);
        }

        if (instance.boundHandlers.windowResize) {
            window.removeEventListener('resize', instance.boundHandlers.windowResize);
        }

        // Remove from instances
        this.instances.delete(componentId);
    }
}

// Global registration for webview context
if (typeof window !== 'undefined') {
    window.SplitPanelBehavior = SplitPanelBehavior;

    // Register with ComponentUtils if available
    if (window.ComponentUtils?.registerBehavior) {
        window.ComponentUtils.registerBehavior('SplitPanel', SplitPanelBehavior);
    }
}
