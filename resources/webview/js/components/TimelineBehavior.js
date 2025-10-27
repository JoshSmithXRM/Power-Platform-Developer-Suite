/**
 * TimelineBehavior - Execution timeline visualization for plugin traces
 * Renders a hierarchical, interactive timeline showing execution flow
 */

class TimelineBehavior {
    /**
     * Render timeline from trace data
     * @param {Array} traces - Array of plugin trace logs with same correlation ID
     * @param {string} containerId - ID of container element
     * @param {Function} onTraceClick - Callback when trace is clicked (traceId) => void
     */
    static renderTimeline(traces, containerId, onTraceClick) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`TimelineBehavior: Container ${containerId} not found`);
            return;
        }

        if (!traces || traces.length === 0) {
            container.innerHTML = this.renderEmptyState();
            return;
        }

        // Sort traces by start time
        const sortedTraces = [...traces].sort((a, b) =>
            new Date(a.createdon).getTime() - new Date(b.createdon).getTime()
        );

        // Build hierarchy based on depth
        const hierarchy = this.buildHierarchy(sortedTraces);

        // Calculate timeline metrics
        const firstTrace = sortedTraces[0];
        const lastTrace = sortedTraces[sortedTraces.length - 1];
        const totalDuration = new Date(lastTrace.createdon).getTime() -
            new Date(firstTrace.createdon).getTime() +
            (lastTrace.duration || 0);

        // Get correlation ID
        const correlationId = firstTrace.correlationid || 'N/A';

        // Render timeline HTML
        const timelineHTML = this.generateTimelineHTML(
            hierarchy,
            correlationId,
            totalDuration,
            firstTrace.createdon,
            onTraceClick
        );

        container.innerHTML = timelineHTML;

        // Attach event listeners
        this.attachEventListeners(container, onTraceClick);
    }

    /**
     * Build hierarchical structure based on depth
     */
    static buildHierarchy(traces) {
        const hierarchy = [];
        const stack = [];

        traces.forEach(trace => {
            const depth = trace.depth || 1;
            const node = { trace, children: [] };

            // Find parent based on depth
            while (stack.length > 0 && stack[stack.length - 1].depth >= depth) {
                stack.pop();
            }

            if (stack.length === 0) {
                hierarchy.push(node);
            } else {
                stack[stack.length - 1].children.push(node);
            }

            stack.push({ depth, children: node.children });
        });

        return hierarchy;
    }

    /**
     * Generate timeline HTML
     */
    static generateTimelineHTML(hierarchy, correlationId, totalDuration, startTime, onTraceClick) {
        return `
            <div class="timeline-container">
                <div class="timeline-header">
                    <h3>Execution Timeline</h3>
                    <div class="timeline-meta">
                        <span class="timeline-meta-item">
                            <strong>Correlation ID:</strong> ${this.truncateGuid(correlationId)}
                        </span>
                        <span class="timeline-meta-item">
                            <strong>Total Duration:</strong> ${this.formatDuration(totalDuration)}
                        </span>
                        <span class="timeline-meta-item">
                            <strong>Traces:</strong> ${this.countTraces(hierarchy)}
                        </span>
                    </div>
                </div>

                <div class="timeline-content">
                    ${hierarchy.map(node => this.renderTimelineNode(node, startTime, totalDuration, 0)).join('')}
                </div>

                <div class="timeline-legend">
                    <div class="timeline-legend-item">
                        <div class="timeline-legend-color timeline-legend-success"></div>
                        <span>Success</span>
                    </div>
                    <div class="timeline-legend-item">
                        <div class="timeline-legend-color timeline-legend-exception"></div>
                        <span>Exception</span>
                    </div>
                    <div class="timeline-legend-item">
                        <span class="timeline-legend-text">Click any bar to view details</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render a single timeline node (recursive)
     */
    static renderTimelineNode(node, timelineStart, totalDuration, indentLevel) {
        const { trace, children } = node;
        const hasException = trace.exceptiondetails && trace.exceptiondetails.trim().length > 0;
        const statusClass = hasException ? 'exception' : 'success';

        // Calculate position and width
        const traceStart = new Date(trace.createdon).getTime();
        const timelineStartMs = new Date(timelineStart).getTime();
        const offset = ((traceStart - timelineStartMs) / totalDuration) * 100;
        const width = Math.max(((trace.duration || 0) / totalDuration) * 100, 1); // Minimum 1%

        const html = `
            <div class="timeline-item timeline-item-depth-${indentLevel} timeline-item-${statusClass}"
                 data-trace-id="${trace.plugintracelogid}"
                 style="margin-left: ${indentLevel * 20}px;">
                <div class="timeline-item-header">
                    ${children.length > 0 ? `
                        <span class="timeline-toggle" data-toggle-children>▾</span>
                    ` : '<span class="timeline-spacer"></span>'}
                    <span class="timeline-item-title">
                        ${trace.pluginname || 'Unknown Plugin'}
                    </span>
                    <span class="timeline-item-message">
                        ${trace.messagename || ''}
                    </span>
                    ${trace.entityname ? `
                        <span class="timeline-item-entity">
                            (${trace.entityname})
                        </span>
                    ` : ''}
                </div>
                <div class="timeline-bar-container" style="margin-left: ${offset}%;">
                    <div class="timeline-bar timeline-bar-${statusClass}"
                         style="width: ${width}%;"
                         title="${trace.pluginname} - ${this.formatDuration(trace.duration)}">
                        <div class="timeline-bar-fill"></div>
                    </div>
                    <div class="timeline-item-metadata">
                        <span class="timeline-item-time">${this.formatTime(trace.createdon)}</span>
                        <span class="timeline-item-duration">${this.formatDuration(trace.duration)}</span>
                        <span class="timeline-item-mode">${this.getModeLabel(trace.mode)}</span>
                        ${hasException ? '<span class="timeline-item-exception-indicator">⚠</span>' : ''}
                    </div>
                </div>
                ${children.length > 0 ? `
                    <div class="timeline-children">
                        ${children.map(child => this.renderTimelineNode(child, timelineStart, totalDuration, indentLevel + 1)).join('')}
                    </div>
                ` : ''}
            </div>
        `;

        return html;
    }

    /**
     * Render empty state
     */
    static renderEmptyState() {
        return `
            <div class="timeline-empty">
                <p>No trace data available for timeline visualization.</p>
                <p>Select a trace with a correlation ID to view the execution timeline.</p>
            </div>
        `;
    }

    /**
     * Attach event listeners
     */
    static attachEventListeners(container, onTraceClick) {
        // Click on timeline bar or item header
        container.addEventListener('click', (e) => {
            const timelineItem = e.target.closest('.timeline-item');
            if (!timelineItem) return;

            // Handle toggle children
            if (e.target.matches('[data-toggle-children]') || e.target.closest('[data-toggle-children]')) {
                this.toggleChildren(timelineItem);
                return;
            }

            // Handle trace click
            if (e.target.closest('.timeline-bar') || e.target.closest('.timeline-item-header')) {
                const traceId = timelineItem.dataset.traceId;
                if (traceId && onTraceClick) {
                    onTraceClick(traceId);
                }
            }
        });
    }

    /**
     * Toggle children visibility
     */
    static toggleChildren(timelineItem) {
        const toggle = timelineItem.querySelector('[data-toggle-children]');
        const children = timelineItem.querySelector('.timeline-children');

        if (!children) return;

        const isExpanded = children.style.display !== 'none';

        if (isExpanded) {
            children.style.display = 'none';
            if (toggle) toggle.textContent = '▸';
        } else {
            children.style.display = 'block';
            if (toggle) toggle.textContent = '▾';
        }
    }

    /**
     * Count total traces in hierarchy
     */
    static countTraces(hierarchy) {
        let count = 0;

        const countNode = (node) => {
            count++;
            node.children.forEach(countNode);
        };

        hierarchy.forEach(countNode);
        return count;
    }

    /**
     * Format duration
     */
    static formatDuration(duration) {
        if (!duration) return '0ms';

        if (duration < 1000) {
            return `${duration}ms`;
        } else if (duration < 60000) {
            return `${(duration / 1000).toFixed(2)}s`;
        } else {
            const minutes = Math.floor(duration / 60000);
            const seconds = ((duration % 60000) / 1000).toFixed(2);
            return `${minutes}m ${seconds}s`;
        }
    }

    /**
     * Format time
     */
    static formatTime(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleTimeString();
    }

    /**
     * Get mode label
     */
    static getModeLabel(mode) {
        switch (mode) {
            case 0:
                return 'Sync';
            case 1:
                return 'Async';
            default:
                return 'Unknown';
        }
    }

    /**
     * Truncate GUID for display
     */
    static truncateGuid(guid) {
        if (!guid || guid === 'N/A') return guid;
        if (guid.length <= 8) return guid;
        return `${guid.substring(0, 8)}...`;
    }

    /**
     * Clear timeline
     */
    static clearTimeline(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = this.renderEmptyState();
        }
    }

    /**
     * Highlight a specific trace in timeline
     */
    static highlightTrace(containerId, traceId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Remove existing highlights
        container.querySelectorAll('.timeline-item-highlighted').forEach(item => {
            item.classList.remove('timeline-item-highlighted');
        });

        // Add highlight to specified trace
        const traceItem = container.querySelector(`[data-trace-id="${traceId}"]`);
        if (traceItem) {
            traceItem.classList.add('timeline-item-highlighted');
            traceItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    /**
     * Expand all children in timeline
     */
    static expandAll(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.querySelectorAll('.timeline-children').forEach(children => {
            children.style.display = 'block';
        });

        container.querySelectorAll('[data-toggle-children]').forEach(toggle => {
            toggle.textContent = '▾';
        });
    }

    /**
     * Collapse all children in timeline
     */
    static collapseAll(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.querySelectorAll('.timeline-children').forEach(children => {
            children.style.display = 'none';
        });

        container.querySelectorAll('[data-toggle-children]').forEach(toggle => {
            toggle.textContent = '▸';
        });
    }
}

// Global registration for webview context
if (typeof window !== 'undefined') {
    window.TimelineBehavior = TimelineBehavior;
}
