/**
 * Plugin Trace Viewer Panel Behavior
 * Handles trace detail panel display, tab switching, and rendering
 */

class PluginTraceViewerBehavior {
    /**
     * Initialize plugin trace viewer behavior
     */
    static initialize() {
        // Setup tab switching for detail panel
        this.setupTabSwitching();

        // Setup message listener
        this.setupMessageHandler();

        console.log('PluginTraceViewerBehavior initialized');
    }

    /**
     * Setup tab switching for trace detail panel
     */
    static setupTabSwitching() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.dataset.tab;

                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                const targetTab = document.getElementById('tab-' + tabId);
                if (targetTab) {
                    targetTab.classList.add('active');
                }
            });
        });
    }

    /**
     * Setup message handler for trace detail operations
     */
    static setupMessageHandler() {
        window.addEventListener('message', (event) => {
            const message = event.data;

            console.log('📨 PluginTraceViewerBehavior message received:', message.action);

            switch (message.action) {
                case 'showTraceDetails':
                    console.log('🎯 Showing trace detail panel', message);
                    this.showTraceDetailPanel(message.trace, message.relatedTraces);
                    break;

                case 'closeDetailPanel':
                    console.log('🚪 Closing detail panel');
                    this.closeDetailPanel();
                    break;

                case 'exportTraces':
                    console.log('📤 Export request received', { format: message.format, dataLength: message.data?.length });
                    this.handleExport(message);
                    break;

                case 'switchToTimelineTab':
                    const timelineTab = document.querySelector('[data-tab="timeline"]');
                    if (timelineTab) {
                        timelineTab.click();
                    }
                    break;
            }
        });
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
    static showTraceDetailPanel(trace, relatedTraces) {
        console.log('📋 showTraceDetailPanel called', { trace, relatedTraces });

        const detailPanel = document.getElementById('traceDetailContainer');
        const splitContainer = document.getElementById('splitPanelContainer');

        console.log('🔍 Elements found:', {
            detailPanel: !!detailPanel,
            splitContainer: !!splitContainer,
            hasSplitPanelBehavior: !!window.SplitPanelBehavior
        });

        // Initialize split panel behavior if not already initialized
        if (window.SplitPanelBehavior && !window.SplitPanelBehavior.instances.has('plugin-trace-split-panel')) {
            console.log('🎬 Initializing SplitPanelBehavior');

            // Get saved split ratio from state (passed via data attribute)
            const savedSplitRatio = splitContainer.dataset.splitRatio ? parseFloat(splitContainer.dataset.splitRatio) : 50;

            window.SplitPanelBehavior.initialize(
                'plugin-trace-split-panel',
                {
                    orientation: 'horizontal',
                    minSize: 300,
                    resizable: true,
                    initialSplit: savedSplitRatio,
                    rightPanelDefaultHidden: true
                },
                splitContainer
            );
            console.log('✅ SplitPanelBehavior initialized with split ratio:', savedSplitRatio);
        } else {
            console.log('ℹ️ SplitPanelBehavior already initialized');
        }

        // Show the right panel using split panel behavior (without changing size)
        if (window.SplitPanelBehavior && window.SplitPanelBehavior.instances.has('plugin-trace-split-panel')) {
            console.log('📂 Showing right panel via SplitPanelBehavior');
            const instance = window.SplitPanelBehavior.instances.get('plugin-trace-split-panel');

            // Always call showRightPanel to ensure panel is visible
            // The showRightPanel method now preserves split ratio if already visible
            window.SplitPanelBehavior.showRightPanel(instance);
            console.log('✅ Right panel shown/updated');
        } else {
            console.log('⚠️ Fallback: showing detail panel directly');
            // Fallback if split panel behavior isn't available
            if (detailPanel) {
                detailPanel.style.display = 'flex';
            }
        }

        // Configuration tab
        const configTab = document.getElementById('tab-configuration');
        if (configTab) {
            configTab.innerHTML = this.generateConfigurationTab(trace);
        }

        // Execution tab
        const execTab = document.getElementById('tab-execution');
        if (execTab) {
            execTab.innerHTML = this.generateExecutionTab(trace);
        }

        // Timeline tab
        if (trace.correlationid) {
            const allRelated = [trace, ...relatedTraces].sort((a, b) =>
                new Date(a.createdon).getTime() - new Date(b.createdon).getTime()
            );
            if (window.TimelineBehavior) {
                window.TimelineBehavior.renderTimeline(allRelated, 'timelineContainer', (traceId) => {
                    const vscode = window.vscode || acquireVsCodeApi();
                    vscode.postMessage({ action: 'trace-selected', traceId });
                });
            }
        } else {
            const timelineContainer = document.getElementById('timelineContainer');
            if (timelineContainer) {
                timelineContainer.innerHTML =
                    '<div class="timeline-empty"><p>No correlation ID available for timeline view</p></div>';
            }
        }

        // Related tab
        const relatedTab = document.getElementById('tab-related');
        if (relatedTab) {
            relatedTab.innerHTML = this.generateRelatedTab(relatedTraces, trace.plugintracelogid);
        }

        // Raw data tab with syntax highlighting
        const rawTab = document.getElementById('tab-raw');
        if (rawTab) {
            rawTab.innerHTML = '<pre class="json-display">' + this.renderJSON(trace, 0) + '</pre>';
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
     * Render JSON with syntax highlighting
     */
    static renderJSON(obj, depth = 0) {
        if (obj === null) return '<span class="json-null">null</span>';
        if (obj === undefined) return '<span class="json-undefined">undefined</span>';

        const indent = '  '.repeat(depth);
        const type = typeof obj;

        if (type === 'boolean') {
            return `<span class="json-boolean">${obj}</span>`;
        }

        if (type === 'number') {
            return `<span class="json-number">${obj}</span>`;
        }

        if (type === 'string') {
            return `<span class="json-string">"${this.escapeHtml(obj)}"</span>`;
        }

        if (Array.isArray(obj)) {
            if (obj.length === 0) return '[]';

            const items = obj.map(item =>
                `${indent}  ${this.renderJSON(item, depth + 1)}`
            ).join(',\n');

            return `[\n${items}\n${indent}]`;
        }

        if (type === 'object') {
            const keys = Object.keys(obj);
            if (keys.length === 0) return '{}';

            const items = keys.map(key =>
                `${indent}  <span class="json-key">"${this.escapeHtml(key)}"</span>: ${this.renderJSON(obj[key], depth + 1)}`
            ).join(',\n');

            return `{\n${items}\n${indent}}`;
        }

        return String(obj);
    }

    /**
     * Close detail panel
     */
    static closeDetailPanel() {
        console.log('🚪 closeDetailPanel called');

        const splitContainer = document.getElementById('splitPanelContainer');

        if (window.SplitPanelBehavior && window.SplitPanelBehavior.instances.has('plugin-trace-split-panel')) {
            console.log('Closing right panel via SplitPanelBehavior');
            const instance = window.SplitPanelBehavior.instances.get('plugin-trace-split-panel');
            window.SplitPanelBehavior.closeRightPanel(instance);
            console.log('✅ Right panel closed');
        } else {
            console.warn('SplitPanelBehavior not found, falling back to direct DOM manipulation');
            const detailPanel = document.getElementById('traceDetailContainer');
            if (detailPanel) {
                detailPanel.style.display = 'none';
            }
            if (splitContainer) {
                splitContainer.classList.add('split-panel-right-hidden');
            }
        }
    }

    /**
     * Setup event delegation for related trace clicks
     */
    static setupEventDelegation() {
        document.addEventListener('click', (event) => {
            const target = event.target.closest('[data-action="select-trace"]');
            if (!target) return;

            const traceId = target.dataset.traceId;
            if (traceId) {
                const vscode = window.vscode || acquireVsCodeApi();
                vscode.postMessage({ action: 'trace-selected', traceId });
            }
        });
    }
}

// Initialize when DOM is ready
if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            PluginTraceViewerBehavior.initialize();
            PluginTraceViewerBehavior.setupEventDelegation();
        });
    } else {
        // DOM already loaded
        PluginTraceViewerBehavior.initialize();
        PluginTraceViewerBehavior.setupEventDelegation();
    }
}
