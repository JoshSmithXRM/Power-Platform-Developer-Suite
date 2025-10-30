/**
 * SplitPanelBehavior - Webview behavior for SplitPanel component
 * Handles resizable divider drag, panel show/hide, and size management
 */

class SplitPanelBehavior extends BaseBehavior {
    /**
     * Get component type identifier
     */
    static getComponentType() {
        return 'SplitPanel';
    }

    /**
     * Handle component data updates from Extension Host
     * REQUIRED by BaseBehavior - called when event bridge sends updated data
     */
    static onComponentUpdate(instance, data) {
        // SplitPanel doesn't typically receive data updates via componentUpdate
        // It primarily handles action-based messages (setSplitRatio, showRightPanel, etc.)
        // This method is here to satisfy BaseBehavior requirements
        console.log('SplitPanelBehavior: onComponentUpdate received', data);
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

        const dataSplitRatio = element.dataset.splitRatio;
        if (dataSplitRatio) {
            instance.config.initialSplit = parseFloat(dataSplitRatio);
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

        // Initialize state
        this.initializeState(instance);
    }

    /**
     * Initialize state
     */
    static initializeState(instance) {
        // Check if panel is initially hidden based on CSS class
        const isHiddenByClass = instance.element.classList.contains('split-panel-right-hidden');

        // Set initial panel visibility based on HTML state
        instance.rightPanelVisible = !isHiddenByClass;

        // Apply hidden state if needed
        if (!instance.rightPanelVisible) {
            this.hideRightPanelInternal(instance);
        }

        // Ensure valid sizes
        this.enforcePanelSizes(instance);
    }

    /**
     * Handle custom actions beyond componentUpdate
     */
    static handleCustomAction(instance, message) {
        switch (message.command) {
            case 'set-split-ratio':
                if (typeof message.ratio === 'number') {
                    this.setSplitRatio(instance, message.ratio);
                }
                break;

            case 'show-right-panel':
                this.showRightPanel(instance);
                break;

            case 'hide-right-panel':
                this.closeRightPanel(instance);
                break;

            case 'toggle-right-panel':
                if (instance.rightPanelVisible) {
                    this.closeRightPanel(instance);
                } else {
                    this.showRightPanel(instance);
                }
                break;

            default:
                console.warn(`SplitPanelBehavior: Unhandled action '${message.command}'`);
                break;
        }
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
     * Set split ratio (from preference restoration)
     * Does NOT trigger save event (avoids circular save loops)
     */
    static setSplitRatio(instance, ratio) {
        console.log('🔧 setSplitRatio called', { ratio, rightPanelVisible: instance.rightPanelVisible });

        if (ratio < 0 || ratio > 100) {
            console.error('SplitPanelBehavior: Split ratio must be between 0 and 100');
            return;
        }

        // Only apply if right panel is visible
        // If hidden, ratio will be applied when panel is shown
        if (instance.rightPanelVisible) {
            console.log('📏 Applying split ratio to visible panel');
            if (instance.orientation === 'horizontal') {
                instance.leftPanel.style.width = `${ratio}%`;
                instance.rightPanel.style.width = `${100 - ratio}%`;
            } else {
                instance.leftPanel.style.height = `${ratio}%`;
                instance.rightPanel.style.height = `${100 - ratio}%`;
            }
        } else {
            console.log('ℹ️ Panel hidden, ratio will be applied when shown');
        }

        // Update config for use when showing panel
        instance.config.initialSplit = ratio;
    }

    /**
     * Cleanup instance resources
     */
    static cleanupInstance(instance) {
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

        // Remove global mouse listeners if still attached
        if (instance.boundHandlers.mouseMove) {
            document.removeEventListener('mousemove', instance.boundHandlers.mouseMove);
        }

        if (instance.boundHandlers.mouseUp) {
            document.removeEventListener('mouseup', instance.boundHandlers.mouseUp);
        }
    }
}

// Register behavior
SplitPanelBehavior.register();
