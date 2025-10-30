/**
 * Plugin Trace Viewer Panel Behavior
 * Handles trace detail panel display, tab switching, and rendering
 */

class PluginTraceViewerBehavior extends BaseBehavior {
    /**
     * Get the component type this behavior handles
     */
    static getComponentType() {
        return 'PluginTraceViewerPanel';
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
        instance.detailPanel = document.getElementById('traceDetailContainer');
        instance.splitContainer = document.getElementById('splitPanelContainer');
        instance.configTab = document.getElementById('tab-configuration');
        instance.execTab = document.getElementById('tab-execution');
        instance.relatedTab = document.getElementById('tab-related');
        instance.timelineContainer = document.getElementById('timelineContainer');
    }

    /**
     * Setup event listeners
     */
    static setupEventListeners(instance) {
        // Setup tab switching
        this.setupTabSwitching(instance);

        // Setup message handler
        this.setupMessageHandler(instance);

        // Setup event delegation for related trace clicks
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
     * Setup tab switching for trace detail panel
     */
    static setupTabSwitching(instance) {
        instance.boundHandlers.tabClickHandler = (event) => {
            const btn = event.target.closest('.tab-btn');
            if (!btn) return;

            const tabId = btn.dataset.tab;

            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            const targetTab = document.getElementById('tab-' + tabId);
            if (targetTab) {
                targetTab.classList.add('active');
            }
        };

        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', instance.boundHandlers.tabClickHandler);
        });
    }

    /**
     * Setup message handler for trace detail operations
     * Registers with ComponentUtils instead of global listener
     */
    static setupMessageHandler(instance) {
        if (window.ComponentUtils && window.ComponentUtils.registerPanelHandler) {
            window.ComponentUtils.registerPanelHandler('pluginTraceViewer', (message) => {
                console.log('📨 PluginTraceViewerBehavior message received:', message.command);

                switch (message.command) {
                    case 'show-trace-details':
                        console.log('🎯 Showing trace detail panel', message);
                        this.showTraceDetailPanel(instance, message.trace, message.relatedTraces);
                        return true;

                    case 'close-detail-panel':
                        console.log('🚪 Closing detail panel');
                        this.closeDetailPanel(instance);
                        return true;

                    case 'export-traces':
                        console.log('📤 Export request received', { format: message.format, dataLength: message.data?.length });
                        this.handleExport(message);
                        return true;

                    case 'switch-to-timeline-tab':
                        const timelineTab = document.querySelector('[data-tab="timeline"]');
                        if (timelineTab) {
                            timelineTab.click();
                        }
                        return true;

                    case 'set-split-ratio':
                        return window.SplitPanelHandlers.handleSetSplitRatio(message);

                    default:
                        return false;
                }
            });
            console.log('✅ PluginTraceViewerBehavior registered with ComponentUtils');
        } else {
            console.error('ComponentUtils not available, cannot register panel handler');
        }
    }

    /**
     * Setup event delegation for related trace clicks
     */
    static setupEventDelegation(instance) {
        instance.boundHandlers.traceSelectHandler = (event) => {
            const target = event.target.closest('[data-action="select-trace"]');
            if (!target) return;

            const traceId = target.dataset.traceId;
            if (traceId) {
                instance.vscode.postMessage({ command: 'trace-selected', traceId });
            }
        };
        document.addEventListener('click', instance.boundHandlers.traceSelectHandler);
    }

    /**
     * Handle export operations
     */
    static handleExport(message) {
        try {
            if (!window.ExportUtils) {
                console.error('ExportUtils not loaded!');
                alert('Export functionality is not available. Please reload the panel.');
                return;
            }

            if (message.format === 'csv') {
                window.ExportUtils.exportToCSV(message.data, message.filename);
                console.log('✅ CSV export completed');
            } else if (message.format === 'json') {
                window.ExportUtils.exportToJSON(message.data, message.filename);
                console.log('✅ JSON export completed');
            }
        } catch (error) {
            console.error('❌ Export failed:', error);
            alert('Export failed: ' + error.message);
        }
    }

    /**
     * Show trace detail panel with trace data
     */
    static showTraceDetailPanel(instance, trace, relatedTraces) {
        console.log('📋 showTraceDetailPanel called', { trace, relatedTraces });

        console.log('🔍 Elements found:', {
            detailPanel: !!instance.detailPanel,
            splitContainer: !!instance.splitContainer,
            hasSplitPanelBehavior: !!window.SplitPanelBehavior
        });

        // Initialize split panel behavior if not already initialized
        if (window.SplitPanelBehavior && !window.SplitPanelBehavior.instances.has('plugin-trace-split-panel')) {
            console.log('🎬 Initializing SplitPanelBehavior');

            const savedSplitRatio = instance.splitContainer.dataset.splitRatio ? parseFloat(instance.splitContainer.dataset.splitRatio) : 50;

            window.SplitPanelBehavior.initialize(
                'plugin-trace-split-panel',
                {
                    orientation: 'horizontal',
                    minSize: 300,
                    resizable: true,
                    initialSplit: savedSplitRatio,
                    rightPanelDefaultHidden: true
                },
                instance.splitContainer
            );
            console.log('✅ SplitPanelBehavior initialized with split ratio:', savedSplitRatio);
        } else {
            console.log('ℹ️ SplitPanelBehavior already initialized');
        }

        // Show the right panel using split panel behavior
        if (window.SplitPanelBehavior && window.SplitPanelBehavior.instances.has('plugin-trace-split-panel')) {
            console.log('📂 Showing right panel via SplitPanelBehavior');
            const splitInstance = window.SplitPanelBehavior.instances.get('plugin-trace-split-panel');
            window.SplitPanelBehavior.showRightPanel(splitInstance);
            console.log('✅ Right panel shown/updated');
        } else {
            console.log('⚠️ Fallback: showing detail panel directly');
            if (instance.detailPanel) {
                instance.detailPanel.style.display = 'flex';
            }
        }

        // Configuration tab
        if (instance.configTab) {
            instance.configTab.innerHTML = this.generateConfigurationTab(trace);
        }

        // Execution tab
        if (instance.execTab) {
            instance.execTab.innerHTML = this.generateExecutionTab(trace);
        }

        // Timeline tab
        if (trace.correlationid) {
            const allRelated = [trace, ...relatedTraces].sort((a, b) =>
                new Date(a.createdon).getTime() - new Date(b.createdon).getTime()
            );
            if (window.TimelineBehavior) {
                window.TimelineBehavior.renderTimeline(allRelated, 'timelineContainer', (traceId) => {
                    instance.vscode.postMessage({ command: 'trace-selected', traceId });
                });
            }
        } else {
            if (instance.timelineContainer) {
                instance.timelineContainer.innerHTML =
                    '<div class="timeline-empty"><p>No correlation ID available for timeline view</p></div>';
            }
        }

        // Related tab
        if (instance.relatedTab) {
            instance.relatedTab.innerHTML = this.generateRelatedTab(relatedTraces, trace.plugintracelogid);
        }
    }

    /**
     * Generate configuration tab HTML
     */
    static generateConfigurationTab(trace) {
        return `
            <div class="detail-section">
                <div class="detail-section-title">General</div>
                <div class="detail-grid">
                    <div class="detail-label">System Created</div>
                    <div class="detail-value">${trace.issystem ? 'Yes' : 'No'}</div>

                    <div class="detail-label">Type Name</div>
                    <div class="detail-value">${trace.typename || '<span class="empty">N/A</span>'}</div>

                    <div class="detail-label">Message Name</div>
                    <div class="detail-value">${trace.messagename || '<span class="empty">N/A</span>'}</div>

                    <div class="detail-label">Primary Entity</div>
                    <div class="detail-value">${trace.entityname || '<span class="empty">none</span>'}</div>

                    <div class="detail-label">Configuration</div>
                    <div class="detail-value">${trace.configuration || '<span class="empty">---</span>'}</div>

                    <div class="detail-label">Secure Configuration</div>
                    <div class="detail-value">${trace.secureconfiguration || '<span class="empty">---</span>'}</div>

                    <div class="detail-label">Persistence Key</div>
                    <div class="detail-value code">${trace.persistencekey || '<span class="empty">N/A</span>'}</div>

                    <div class="detail-label">Operation Type</div>
                    <div class="detail-value">${trace.operationtype || '<span class="empty">N/A</span>'}</div>

                    <div class="detail-label">Plugin Step Id</div>
                    <div class="detail-value code">${trace.pluginstepid || '<span class="empty">N/A</span>'}</div>
                </div>
            </div>

            <div class="detail-section">
                <div class="detail-section-title">Context</div>
                <div class="detail-grid">
                    <div class="detail-label">Depth</div>
                    <div class="detail-value">${trace.depth || 1}</div>

                    <div class="detail-label">Mode</div>
                    <div class="detail-value">${trace.mode === 0 ? 'Synchronous' : 'Asynchronous'}</div>

                    <div class="detail-label">Correlation Id</div>
                    <div class="detail-value code">${trace.correlationid || '<span class="empty">N/A</span>'}</div>

                    <div class="detail-label">Request Id</div>
                    <div class="detail-value code">${trace.requestid || '<span class="empty">N/A</span>'}</div>
                </div>
            </div>
        `;
    }

    /**
     * Generate execution tab HTML
     */
    static generateExecutionTab(trace) {
        const hasException = trace.exceptiondetails && trace.exceptiondetails.trim().length > 0;

        return `
            <div class="detail-section">
                <div class="detail-section-title">Performance</div>
                <div class="detail-grid">
                    <div class="detail-label">Execution Start Time</div>
                    <div class="detail-value">${new Date(trace.createdon).toLocaleString()}</div>

                    <div class="detail-label">Execution Duration (ms)</div>
                    <div class="detail-value">${trace.duration || 0}</div>

                    <div class="detail-label">Message Block</div>
                    <div class="detail-value">${trace.messageblock || '<span class="empty">---</span>'}</div>
                </div>
            </div>

            ${hasException ? `
            <div class="detail-section">
                <div class="detail-section-title">Exception Details</div>
                <pre class="detail-code exception">${this.escapeHtml(trace.exceptiondetails)}</pre>
            </div>
            ` : ''}
        `;
    }

    /**
     * Generate related traces tab HTML
     */
    static generateRelatedTab(relatedTraces, currentTraceId) {
        if (!relatedTraces || relatedTraces.length === 0) {
            return '<div class="related-traces-empty">No related traces found</div>';
        }

        return `
            <div class="related-traces-list">
                ${relatedTraces.map(trace => `
                    <div class="related-trace-item ${trace.plugintracelogid === currentTraceId ? 'current' : ''}"
                         data-action="select-trace" data-trace-id="${trace.plugintracelogid}">
                        <div class="related-trace-title">
                            <span class="status-indicator ${trace.exceptiondetails ? 'exception' : 'success'}"></span>
                            ${trace.pluginname || 'Unknown Plugin'}
                        </div>
                        <div class="related-trace-meta">
                            <span>${trace.messagename || 'N/A'}</span>
                            <span>${this.formatDuration(trace.duration)}</span>
                            <span>Depth: ${trace.depth || 1}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    /**
     * Format duration for display
     */
    static formatDuration(duration) {
        if (!duration) return '0ms';
        if (duration < 1000) return duration + 'ms';
        if (duration < 60000) return (duration / 1000).toFixed(2) + 's';
        const minutes = Math.floor(duration / 60000);
        const seconds = ((duration % 60000) / 1000).toFixed(2);
        return minutes + 'm ' + seconds + 's';
    }

    /**
     * Escape HTML special characters
     */
    static escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Close detail panel
     */
    static closeDetailPanel(instance) {
        console.log('🚪 closeDetailPanel called');

        if (window.SplitPanelBehavior && window.SplitPanelBehavior.instances.has('plugin-trace-split-panel')) {
            console.log('Closing right panel via SplitPanelBehavior');
            const splitInstance = window.SplitPanelBehavior.instances.get('plugin-trace-split-panel');
            window.SplitPanelBehavior.closeRightPanel(splitInstance);
            console.log('✅ Right panel closed');
        } else {
            console.warn('SplitPanelBehavior not found, falling back to direct DOM manipulation');
            if (instance.detailPanel) {
                instance.detailPanel.style.display = 'none';
            }
            if (instance.splitContainer) {
                instance.splitContainer.classList.add('split-panel-right-hidden');
            }
        }
    }

    /**
     * Cleanup instance resources
     */
    static cleanupInstance(instance) {
        if (instance.boundHandlers.tabClickHandler) {
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.removeEventListener('click', instance.boundHandlers.tabClickHandler);
            });
        }
        if (instance.boundHandlers.traceSelectHandler) {
            document.removeEventListener('click', instance.boundHandlers.traceSelectHandler);
        }
    }
}

// Register behavior
PluginTraceViewerBehavior.register();

// Initialize panel instance when DOM is ready
if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            PluginTraceViewerBehavior.initialize('pluginTraceViewerPanel', {}, document.body);
        });
    } else {
        PluginTraceViewerBehavior.initialize('pluginTraceViewerPanel', {}, document.body);
    }
}
