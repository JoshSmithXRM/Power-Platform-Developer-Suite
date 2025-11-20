# Plugin Traces Detail Panel - Migration to Canonical Pattern

## Current State (BROKEN)

**Problem:** Resize handle not working, width not persisting, silent failures.

**Root Cause:** Dynamic rendering destroys resize handle on every update, class-based selectors fail.

**Files Affected:**
- `src/features/pluginTraceViewer/presentation/sections/PluginTraceDetailSection.ts` (empty container)
- `resources/webview/js/renderers/DetailPanelRenderer.js` (template renderer)
- `resources/webview/js/behaviors/PluginTraceViewerBehavior.js` (broken update logic)

---

## Target State (WORKING)

**Solution:** Static structure pattern - resize handle permanent, targeted updates via ID selectors.

**Reference:** `docs/architecture/RESIZABLE_DETAIL_PANEL_PATTERN.md`

**Files Changed:**
- `PluginTraceDetailSection.ts` - Render static structure (use base class)
- `PluginTraceViewerBehavior.js` - Targeted updates, one-time resize setup
- `DetailPanelRenderer.js` - DELETE (no longer needed)

---

## Migration Steps

### Step 1: Update TypeScript Section

**File:** `src/features/pluginTraceViewer/presentation/sections/PluginTraceDetailSection.ts`

**Before:**
```typescript
export class PluginTraceDetailSection implements ISection {
    public readonly position = SectionPosition.Detail;

    public render(_data: SectionRenderData): string {
        return '<div class="detail-section"></div>'; // Empty container
    }
}
```

**After (Option A: Use Base Class):**
```typescript
import { ResizableDetailPanelSection, ResizableDetailPanelConfig } from '../../../../shared/infrastructure/ui/sections/ResizableDetailPanelSection';

export class PluginTraceDetailSection extends ResizableDetailPanelSection {
    constructor() {
        const config: ResizableDetailPanelConfig = {
            featurePrefix: 'pluginTrace',
            defaultTitle: 'Trace Details',
            tabs: [
                { id: 'overview', label: 'Overview', isDefault: true },
                { id: 'details', label: 'Details' },
                { id: 'timeline', label: 'Timeline' },
                { id: 'raw', label: 'Raw Data' }
            ],
            showCloseButton: true
        };
        super(config);
    }
}
```

**After (Option B: Manual Implementation):**
```typescript
export class PluginTraceDetailSection implements ISection {
    public readonly position = SectionPosition.Detail;

    public render(_data: SectionRenderData): string {
        return `
            <div class="detail-panel" id="pluginTraceDetailPanel" style="display: none;">
                <div class="detail-panel-resize-handle" id="detailPanelResizeHandle" title="Drag to resize"></div>

                <div class="detail-panel-header">
                    <span class="detail-panel-title" id="detailPanelTitle">Trace Details</span>
                    <button class="detail-panel-close" id="detailPanelClose" aria-label="Close detail panel">×</button>
                </div>

                <div class="detail-tab-navigation">
                    <button class="detail-tab-button active" data-detail-tab="overview">Overview</button>
                    <button class="detail-tab-button" data-detail-tab="details">Details</button>
                    <button class="detail-tab-button" data-detail-tab="timeline">Timeline</button>
                    <button class="detail-tab-button" data-detail-tab="raw">Raw Data</button>
                </div>

                <div class="detail-content">
                    <div class="detail-tab-panel active" data-detail-panel="overview">
                        <div id="pluginTraceOverviewContent"></div>
                    </div>
                    <div class="detail-tab-panel" data-detail-panel="details">
                        <div id="pluginTraceDetailsContent"></div>
                    </div>
                    <div class="detail-tab-panel" data-detail-panel="timeline">
                        <div id="pluginTraceTimelineContent"></div>
                    </div>
                    <div class="detail-tab-panel" data-detail-panel="raw">
                        <pre id="pluginTraceRawContent"></pre>
                    </div>
                </div>
            </div>
        `;
    }
}
```

**Recommendation:** Use Option A (base class) for consistency and reduced duplication.

---

### Step 2: Delete Template Renderer

**File:** `resources/webview/js/renderers/DetailPanelRenderer.js`

**Action:** DELETE entire file.

**Rationale:** No longer need template renderer. Rendering now handled by feature-specific functions in behavior.

---

### Step 3: Update JavaScript Behavior

**File:** `resources/webview/js/behaviors/PluginTraceViewerBehavior.js`

#### Change 3.1: Remove `updateDetailPanel()` Function

**Before (lines 108-136):**
```javascript
function updateDetailPanel(data) {
    const detailSection = document.querySelector('.content-split > .detail-section');
    if (!detailSection) {
        console.warn('[PluginTraceViewer] No detail section found for panel update');
        return;
    }

    // Store current trace data (ViewModel for display)
    currentTraceData = data.trace;
    currentRawEntity = data.rawEntity;
    currentRelatedTraces = data.relatedTraces || [];
    timelineData = data.timeline || null;

    // Render detail panel HTML using DetailPanelRenderer
    const detailHtml = window.DetailPanelRenderer.renderDetailPanel(data.trace);

    // Update detail section (preserves event listeners on other elements)
    detailSection.innerHTML = detailHtml; // ← DESTROYS RESIZE HANDLE

    // Re-apply tab event listeners if detail panel has content
    if (data.trace) {
        setupDetailPanelTabs();
        setupDetailPanelResize(); // ← FAILS SILENTLY
    }
}
```

**After:**
```javascript
/**
 * Shows detail panel with trace data.
 * Updates INNER content only, preserves structure and event listeners.
 *
 * @param {Object} data - Detail data { trace, rawEntity, relatedTraces, timeline }
 */
function showDetailPanel(data) {
    const panel = document.getElementById('pluginTraceDetailPanel');
    if (!panel) {
        console.error('[PluginTraceViewer] Detail panel element not found');
        return;
    }

    // Store current data
    currentTraceData = data.trace;
    currentRawEntity = data.rawEntity;
    currentRelatedTraces = data.relatedTraces || [];
    timelineData = data.timeline || null;

    // Update title
    const title = document.getElementById('detailPanelTitle');
    if (title) {
        title.textContent = 'Trace Details';
    }

    // Update overview tab (target INNER element)
    const overviewContent = document.getElementById('pluginTraceOverviewContent');
    if (overviewContent) {
        overviewContent.innerHTML = renderOverviewTab(data.trace);
    }

    // Update details tab
    const detailsContent = document.getElementById('pluginTraceDetailsContent');
    if (detailsContent) {
        detailsContent.innerHTML = renderDetailsTab(data.trace);
    }

    // Update timeline tab
    const timelineContent = document.getElementById('pluginTraceTimelineContent');
    if (timelineContent) {
        timelineContent.innerHTML = renderTimelineTab(data.trace);
    }

    // Update raw data tab
    const rawContent = document.getElementById('pluginTraceRawContent');
    if (rawContent && currentRawEntity) {
        rawContent.textContent = JSON.stringify(currentRawEntity, null, 2);
    }

    // Show panel
    panel.style.display = 'flex';

    // Setup resize handle (ONLY ONCE)
    const resizeHandle = document.getElementById('detailPanelResizeHandle');
    if (resizeHandle && !window.pluginTraceResizeSetup) {
        setupDetailPanelResize(resizeHandle);
        window.pluginTraceResizeSetup = true;
    }

    // Switch to default tab
    switchDetailTab('overview');
}

/**
 * Hides detail panel.
 * NO cleanup needed - listeners remain attached.
 */
function hideDetailPanel() {
    const panel = document.getElementById('pluginTraceDetailPanel');
    if (panel) {
        panel.style.display = 'none';
    }
}
```

#### Change 3.2: Extract Rendering Functions

**Add after `showDetailPanel()` function:**

```javascript
/**
 * Renders overview tab content.
 * Pure function - returns HTML string.
 *
 * @param {Object} trace - PluginTraceDetailViewModel
 * @returns {string} HTML string
 */
function renderOverviewTab(trace) {
    if (!trace) {
        return '<div class="trace-detail-empty"><p>Select a trace to view details</p></div>';
    }

    const statusClass = trace.status.toLowerCase().includes('exception') ? 'exception' : 'success';

    return `
        <div class="detail-section">
            <div class="detail-section-title">General Information</div>
            <div class="detail-grid">
                <div class="detail-label">Status:</div>
                <div class="detail-value">
                    <span class="status-indicator ${statusClass}"></span>
                    ${escapeHtml(trace.status)}
                </div>

                <div class="detail-label">Plugin Name:</div>
                <div class="detail-value">${escapeHtml(trace.pluginName)}</div>

                <div class="detail-label">Entity:</div>
                <div class="detail-value">${escapeHtml(trace.entityName)}</div>

                <div class="detail-label">Message:</div>
                <div class="detail-value">${escapeHtml(trace.messageName)}</div>

                <div class="detail-label">Created On:</div>
                <div class="detail-value">${escapeHtml(trace.createdOn)}</div>

                <div class="detail-label">Duration:</div>
                <div class="detail-value">${escapeHtml(trace.duration)}</div>

                <div class="detail-label">Execution Mode:</div>
                <div class="detail-value">${escapeHtml(trace.mode)}</div>

                <div class="detail-label">Operation:</div>
                <div class="detail-value">${escapeHtml(trace.operationType)}</div>
            </div>
        </div>

        ${trace.exceptionDetails ? `
            <div class="detail-section">
                <div class="detail-section-title">Exception Details</div>
                <div class="detail-code exception">${escapeHtml(trace.exceptionDetails)}</div>
            </div>
        ` : ''}

        ${trace.messageBlock ? `
            <div class="detail-section">
                <div class="detail-section-title">Message Block</div>
                <div class="detail-code">${escapeHtml(trace.messageBlock)}</div>
            </div>
        ` : ''}
    `;
}

/**
 * Renders details tab content.
 * Pure function - returns HTML string.
 *
 * @param {Object} trace - PluginTraceDetailViewModel
 * @returns {string} HTML string
 */
function renderDetailsTab(trace) {
    // Copy implementation from DetailPanelRenderer.js renderDetailsTab()
    // ...
}

/**
 * Renders timeline tab content.
 * Pure function - returns HTML string.
 *
 * @param {Object} trace - PluginTraceDetailViewModel
 * @returns {string} HTML string
 */
function renderTimelineTab(trace) {
    if (!timelineData) {
        return `
            <div class="detail-section">
                <div class="detail-section-title">Timeline</div>
                <div id="timelineContainer" class="timeline-container">
                    <div class="timeline-loading">Loading timeline...</div>
                </div>
            </div>
        `;
    }

    // Render timeline using TimelineBehavior
    return `
        <div class="detail-section">
            <div class="detail-section-title">Timeline</div>
            <div id="timelineContainer" class="timeline-container"></div>
        </div>
    `;
}
```

#### Change 3.3: Update `setupDetailPanelResize()`

**Before (lines 285-341):**
```javascript
function setupDetailPanelResize() {
    const handle = document.querySelector('.detail-resize-handle');
    const detailSection = document.querySelector('.content-split > .detail-section');

    if (!handle || !detailSection) {
        return; // ← SILENT FAILURE
    }

    // ... resize logic ...
}
```

**After:**
```javascript
/**
 * Sets up detail panel resize functionality.
 * Called ONCE on first panel show.
 *
 * CRITICAL: Handle must NEVER be destroyed/recreated.
 *
 * @param {HTMLElement} handle - Resize handle element
 */
function setupDetailPanelResize(handle) {
    const panel = document.getElementById('pluginTraceDetailPanel');
    if (!panel) {
        console.error('[PluginTraceViewer] Cannot setup resize - panel not found');
        return;
    }

    console.log('[PluginTraceViewer] Setting up detail panel resize');

    let isResizing = false;
    let startX = 0;
    let startWidth = 0;

    const MIN_WIDTH = 300;
    const MAX_WIDTH = window.innerWidth * 0.8;

    handle.addEventListener('mousedown', (e) => {
        isResizing = true;
        startX = e.clientX;
        startWidth = panel.offsetWidth;
        handle.classList.add('resizing');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing) {
            return;
        }

        const deltaX = startX - e.clientX;
        const newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startWidth + deltaX));
        panel.style.width = `${newWidth}px`;
        e.preventDefault();
    });

    document.addEventListener('mouseup', () => {
        if (!isResizing) {
            return;
        }

        isResizing = false;
        handle.classList.remove('resizing');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';

        // Persist width preference via backend
        const currentWidth = panel.offsetWidth;
        vscode.postMessage({
            command: 'saveDetailPanelWidth',
            data: { width: currentWidth }
        });
    });

    console.log('[PluginTraceViewer] Detail panel resize setup complete');
}
```

#### Change 3.4: Add Setup Function

**Add to `initialize()` in `createBehavior()`:**

```javascript
window.createBehavior({
    initialize() {
        setupTraceLevelButton();
        setupDetailPanelTabs(); // ← ADD THIS
        setupDetailPanelVisibility();
        setupRowSelection();
        initializeDropdowns();
        setupFilterPanel();
    },
    // ...
});

/**
 * Sets up detail panel event listeners.
 * Called ONCE during initialize().
 */
function setupDetailPanelTabs() {
    // Close button
    const closeButton = document.getElementById('detailPanelClose');
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            hideDetailPanel();
            vscode.postMessage({ command: 'closeDetailPanel' });
        });
    }

    // Tab buttons
    document.querySelectorAll('.detail-tab-button').forEach(button => {
        button.addEventListener('click', () => {
            const tab = button.dataset.detailTab;
            switchDetailTab(tab);

            // Handle special tab activations
            if (tab === 'raw') {
                displayRawData();
            } else if (tab === 'timeline' && timelineData) {
                displayTimeline();
            }
        });
    });
}

/**
 * Switches active detail tab.
 *
 * @param {string} tab - Tab ID
 */
function switchDetailTab(tab) {
    // Update tab buttons
    document.querySelectorAll('.detail-tab-button').forEach(btn => {
        if (btn.dataset.detailTab === tab) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Update tab panels
    document.querySelectorAll('.detail-tab-panel').forEach(panel => {
        if (panel.dataset.detailPanel === tab) {
            panel.classList.add('active');
            panel.style.display = 'block';
        } else {
            panel.classList.remove('active');
            panel.style.display = 'none';
        }
    });
}
```

#### Change 3.5: Update Message Handler

**Before:**
```javascript
handleMessage(message) {
    if (message.command === 'updateDetailPanel') {
        updateDetailPanel(message.data);
    } else if (message.command === 'restoreDetailPanelWidth') {
        restoreDetailPanelWidth(message.data.width);
    }
    // ...
}
```

**After:**
```javascript
handleMessage(message) {
    if (message.command === 'showDetailPanel') {
        showDetailPanel(message.data);
    } else if (message.command === 'hideDetailPanel') {
        hideDetailPanel();
    } else if (message.command === 'restoreDetailPanelWidth') {
        restoreDetailPanelWidth(message.data.width);
    }
    // ...
}

/**
 * Restores detail panel width from persisted state.
 *
 * @param {number} width - Panel width in pixels
 */
function restoreDetailPanelWidth(width) {
    if (!width) {
        return;
    }

    const panel = document.getElementById('pluginTraceDetailPanel');
    if (!panel) {
        return;
    }

    panel.style.width = `${width}px`;
    console.log('[PluginTraceViewer] Restored detail panel width:', width);
}
```

---

### Step 4: Update TypeScript Panel

**File:** `src/features/pluginTraceViewer/presentation/panels/PluginTraceViewerPanelComposed.ts`

#### Change 4.1: Update Command Name

**Before:**
```typescript
private async handleViewDetail(traceId: string): Promise<void> {
    // ...
    await this.coordinator.sendMessage({
        command: 'updateDetailPanel',
        data: viewModel
    });
}
```

**After:**
```typescript
private async handleOpenDetailPanel(traceId: string): Promise<void> {
    this.logger.info('Opening detail panel', { traceId });

    try {
        // Load detail data
        const viewModel = await this.loadDetailUseCase.execute(traceId);

        // Show panel
        await this.coordinator.sendMessage({
            command: 'showDetailPanel',
            data: viewModel
        });

        // Restore persisted width
        const width = this.panelState.get<number>('detailPanelWidth');
        if (width) {
            await this.coordinator.sendMessage({
                command: 'restoreDetailPanelWidth',
                data: { width }
            });
        }

        this.logger.info('Detail panel opened', { traceId });
    } catch (error) {
        this.logger.error('Failed to open detail panel', { traceId, error });
        void vscode.window.showErrorMessage(`Failed to load trace details: ${error.message}`);
    }
}
```

#### Change 4.2: Add Save Width Handler

**Add to `registerCommandHandlers()`:**

```typescript
private registerCommandHandlers(): void {
    // ... existing handlers ...

    this.coordinator.registerHandler('openDetailPanel', async (data) => {
        await this.handleOpenDetailPanel(data.traceId);
    });

    this.coordinator.registerHandler('closeDetailPanel', async () => {
        this.logger.info('Detail panel closed');
        // No state cleanup needed
    });

    this.coordinator.registerHandler('saveDetailPanelWidth', async (data) => {
        await this.handleSaveDetailPanelWidth(data.width);
    });
}

/**
 * Persists detail panel width.
 */
private async handleSaveDetailPanelWidth(width: number): Promise<void> {
    this.logger.debug('Saving detail panel width', { width });

    try {
        await this.panelState.set('detailPanelWidth', width);
        this.logger.debug('Detail panel width saved', { width });
    } catch (error) {
        this.logger.error('Failed to save detail panel width', { width, error });
        // Non-critical error - don't interrupt user
    }
}
```

---

### Step 5: Update CSS

**File:** `resources/webview/css/features/plugin-trace-viewer.css`

#### Change 5.1: Update Selectors

**Before:**
```css
.content-split .detail-section {
    flex: 0 0 500px;
    overflow: auto;
    min-width: 0;
    border-left: 1px solid var(--vscode-panel-border);
    background: var(--vscode-editor-background);
}

.detail-resize-handle {
    position: absolute;
    left: 0;
    /* ... */
}
```

**After:**
```css
/* Use standardized class and ID */
#pluginTraceDetailPanel {
    width: 500px; /* Default width */
    min-width: 300px;
    max-width: 80vw;
    border-left: 1px solid var(--vscode-panel-border);
    background: var(--vscode-editor-background);
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.detail-panel-resize-handle {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 8px;
    cursor: col-resize;
    z-index: 10;
    transition: background-color 0.15s ease;
}

.detail-panel-resize-handle:hover,
.detail-panel-resize-handle.resizing {
    background: var(--vscode-focusBorder);
}

.detail-panel-resize-handle::before {
    content: '';
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 3px;
    height: 40px;
    background: var(--vscode-panel-border);
    border-radius: 2px;
    opacity: 0;
    transition: opacity 0.15s ease;
}

.detail-panel-resize-handle:hover::before,
.detail-panel-resize-handle.resizing::before {
    opacity: 1;
}
```

---

## Testing Checklist

After migration, verify:

- [ ] **Resize works:** Drag left edge of detail panel, width changes smoothly
- [ ] **Width persists:** Resize → close panel → reopen → width restored
- [ ] **Min/max constraints:** Cannot resize below 300px or above 80vw
- [ ] **Tab switching:** Click tabs, content updates correctly
- [ ] **Content updates:** Select different trace, detail panel updates
- [ ] **No console errors:** Check browser console for errors
- [ ] **Close button works:** Click X, panel closes
- [ ] **Visual feedback:** Resize handle shows hover effect
- [ ] **Multiple opens:** Open → close → open → close, no memory leaks

---

## Rollback Plan

If migration introduces regressions:

1. Revert TypeScript section to empty container
2. Restore `DetailPanelRenderer.js`
3. Revert `PluginTraceViewerBehavior.js` changes
4. Revert CSS selector changes
5. File bug with detailed reproduction steps

---

## Success Criteria

Migration successful when:

1. Resize handle works reliably (no silent failures)
2. Width persists across panel open/close cycles
3. No console errors during normal usage
4. All tabs render correctly
5. Code follows canonical pattern (ready for future extraction to shared component)

---

## Related Documents

- `docs/architecture/RESIZABLE_DETAIL_PANEL_PATTERN.md` - Canonical pattern
- `docs/technical-debt/DUPLICATE_RENDERING_INVESTIGATION.md` - Problem analysis
- `CLAUDE.md` - Coding standards and workflow
