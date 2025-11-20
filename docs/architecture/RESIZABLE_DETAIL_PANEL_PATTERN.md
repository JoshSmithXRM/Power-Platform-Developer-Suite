# Resizable Detail Panel - Standard Pattern

## Executive Summary

This document defines the **canonical pattern** for implementing resizable detail panels in all VS Code webview-based features. This pattern is based on the proven Metadata Browser implementation and addresses architectural issues found in the Plugin Trace Viewer.

**Decision:** Use **Static Structure with Targeted Updates** pattern.

---

## Business Value

**Problem:**
- Inconsistent implementations lead to bugs (broken resize, lost persistence)
- Duplicated code across features (resize logic, persistence, event handlers)
- Silent failures that degrade user experience (width not persisting, handle not working)

**Solution:**
- Single canonical pattern that all features follow
- Reusable components for resize functionality
- Clear contract between TypeScript (structure) and JavaScript (behavior)

**Value:**
- Reduced bugs (resize always works)
- Faster feature development (copy proven pattern)
- Better user experience (consistent behavior)

---

## Architectural Decision

### Pattern Choice: Static Structure with Targeted Updates

**Why this pattern wins:**

1. **Reliability:** Resize handle NEVER destroyed = listeners NEVER lost
2. **Simplicity:** One-time setup, no listener reattachment complexity
3. **Performance:** Updates target specific inner elements by ID (fast, granular)
4. **Debuggability:** ID selectors are explicit and easy to trace
5. **Proven:** Metadata Browser works perfectly, Plugin Traces broken

**Rejected pattern: Dynamic Rendering**
- Destroys and recreates entire structure on every update
- Must reattach ALL listeners after each update
- Silent failures when selectors fail (class-based queries)
- Fragile (timing issues, race conditions)

---

## The Canonical Pattern

### Layer 1: TypeScript Section (Structure Rendering)

**Responsibility:** Render static HTML structure ONCE during initial panel composition.

**File Naming Convention:** `{Feature}DetailSection.ts`

**Location:** `src/features/{feature}/presentation/sections/`

**Implementation:**

```typescript
import type { ISection } from '../../../../shared/infrastructure/ui/sections/ISection';
import type { SectionRenderData } from '../../../../shared/infrastructure/ui/types/SectionRenderData';
import { SectionPosition } from '../../../../shared/infrastructure/ui/types/SectionPosition';

/**
 * Detail panel section for {Feature}.
 *
 * Architecture:
 * - Renders STATIC structure ONCE during panel composition
 * - Structure includes resize handle (NEVER destroyed)
 * - Content areas use STABLE IDs for targeted updates
 * - Client-side behavior (JavaScript) handles resize and updates
 *
 * Contract:
 * - IDs used by JavaScript: detailPanelTitle, detailPanelClose, {feature}PropertiesContent, {feature}RawDataContent
 * - Resize handle ID: detailPanelResizeHandle
 * - Container ID: {feature}DetailPanel
 */
export class {Feature}DetailSection implements ISection {
    public readonly position = SectionPosition.Detail;

    /**
     * Renders static detail panel structure.
     * Called ONCE during panel initialization.
     *
     * CRITICAL: All interactive elements (resize handle, close button)
     * must be present in initial render. Event listeners attached once.
     */
    public render(_data: SectionRenderData): string {
        return `
            <!-- Detail Panel Container (initially hidden) -->
            <div class="detail-panel" id="{feature}DetailPanel" style="display: none;">
                <!-- Resize Handle (MUST be first child for proper positioning) -->
                <div class="detail-panel-resize-handle" id="detailPanelResizeHandle" title="Drag to resize"></div>

                <!-- Header (persistent structure) -->
                <div class="detail-panel-header">
                    <span class="detail-panel-title" id="detailPanelTitle">Details</span>
                    <button
                        class="detail-panel-close"
                        id="detailPanelClose"
                        aria-label="Close detail panel"
                    >×</button>
                </div>

                <!-- Tabs (if needed) -->
                <div class="detail-tab-navigation">
                    <button class="detail-tab-button active" data-detail-tab="properties">Properties</button>
                    <button class="detail-tab-button" data-detail-tab="rawData">Raw Data</button>
                </div>

                <!-- Content (inner areas updated via innerHTML) -->
                <div class="detail-content">
                    <!-- Properties Tab -->
                    <div class="detail-tab-panel active" data-detail-panel="properties">
                        <div class="properties-content" id="{feature}PropertiesContent">
                            <!-- Content updated by JavaScript -->
                        </div>
                    </div>

                    <!-- Raw Data Tab -->
                    <div class="detail-tab-panel" data-detail-panel="rawData">
                        <pre class="raw-data-content" id="{feature}RawDataContent">
                            <!-- Content updated by JavaScript -->
                        </pre>
                    </div>
                </div>
            </div>
        `;
    }
}
```

**Key Principles:**

1. **Stable IDs for all update targets** (never use class selectors for dynamic content)
2. **Resize handle present in initial render** (NEVER added/removed dynamically)
3. **Feature-prefixed IDs** for content areas (`{feature}PropertiesContent`) to avoid conflicts
4. **Generic IDs** for shared controls (`detailPanelTitle`, `detailPanelClose`, `detailPanelResizeHandle`)

---

### Layer 2: JavaScript Behavior (Dynamic Updates)

**Responsibility:** Handle user interactions, update content, manage resize functionality.

**File Naming Convention:** `{Feature}Behavior.js`

**Location:** `resources/webview/js/behaviors/`

**Implementation:**

```javascript
/**
 * {Feature} Behavior
 * Handles client-side interactions for {Feature} panel.
 */

window.createBehavior({
    initialize() {
        this.setupDetailPanel();
    },

    handleMessage(message) {
        switch (message.command) {
            case 'showDetailPanel':
                this.showDetailPanel(message.data);
                break;
            case 'hideDetailPanel':
                this.hideDetailPanel();
                break;
            case 'restoreDetailPanelWidth':
                this.restoreDetailPanelWidth(message.data.width);
                break;
        }
    },

    /**
     * One-time setup of detail panel event listeners.
     * Called during initialize() - runs ONCE per panel lifetime.
     */
    setupDetailPanel() {
        // Close button
        const closeButton = document.getElementById('detailPanelClose');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                this.hideDetailPanel();
                window.vscode.postMessage({ command: 'closeDetailPanel' });
            });
        }

        // Tab switching
        document.querySelectorAll('.detail-tab-button').forEach(button => {
            button.addEventListener('click', () => {
                const tab = button.dataset.detailTab;
                this.switchDetailTab(tab);
            });
        });
    },

    /**
     * Shows detail panel with data.
     * Updates INNER content only, preserves outer structure and event listeners.
     *
     * @param {Object} data - Detail data (title, properties, rawData)
     */
    showDetailPanel(data) {
        const panel = document.getElementById('{feature}DetailPanel');
        if (!panel) {
            console.error('[{Feature}] Detail panel element not found');
            return;
        }

        // Update title (textContent, not innerHTML - safer)
        const title = document.getElementById('detailPanelTitle');
        if (title) {
            title.textContent = data.title || 'Details';
        }

        // Update properties content (target INNER element by ID)
        const propertiesContent = document.getElementById('{feature}PropertiesContent');
        if (propertiesContent) {
            propertiesContent.innerHTML = this.renderProperties(data.properties);
        }

        // Update raw data content (target INNER element by ID)
        const rawDataContent = document.getElementById('{feature}RawDataContent');
        if (rawDataContent) {
            rawDataContent.textContent = JSON.stringify(data.rawData, null, 2);
        }

        // Show panel
        panel.style.display = 'flex';

        // Setup resize handle (ONLY ONCE, on first show)
        const resizeHandle = document.getElementById('detailPanelResizeHandle');
        if (resizeHandle && !this.resizeSetup) {
            this.setupDetailPanelResize(resizeHandle);
            this.resizeSetup = true;
        }

        // Switch to default tab
        this.switchDetailTab('properties');
    },

    /**
     * Hides detail panel.
     * NO cleanup needed - listeners remain attached, ready for next show.
     */
    hideDetailPanel() {
        const panel = document.getElementById('{feature}DetailPanel');
        if (panel) {
            panel.style.display = 'none';
        }
    },

    /**
     * Restores detail panel width from persisted state.
     * Called by backend after panel initialization with stored width.
     *
     * @param {number} width - Panel width in pixels
     */
    restoreDetailPanelWidth(width) {
        if (!width) {
            return;
        }

        const panel = document.getElementById('{feature}DetailPanel');
        if (!panel) {
            return;
        }

        panel.style.width = `${width}px`;
        console.log('[{Feature}] Restored detail panel width:', width);
    },

    /**
     * Sets up detail panel resize functionality.
     * Called ONCE on first panel show.
     *
     * CRITICAL: Listeners attached to handle element that NEVER gets destroyed.
     * If handle is recreated, listeners are lost and resize breaks.
     *
     * @param {HTMLElement} handle - Resize handle element
     */
    setupDetailPanelResize(handle) {
        const panel = document.getElementById('{feature}DetailPanel');
        if (!panel) {
            console.error('[{Feature}] Cannot setup resize - panel not found');
            return;
        }

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
            window.vscode.postMessage({
                command: 'saveDetailPanelWidth',
                data: { width: currentWidth }
            });
        });

        console.log('[{Feature}] Detail panel resize setup complete');
    },

    /**
     * Switches active detail tab.
     */
    switchDetailTab(tab) {
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
    },

    /**
     * Renders properties as HTML.
     * Pure rendering function - NO side effects.
     */
    renderProperties(properties) {
        if (!properties || properties.length === 0) {
            return '<div class="properties-empty">No properties to display</div>';
        }

        return properties.map(prop => `
            <div class="property-item">
                <div class="property-name">${escapeHtml(prop.name)}</div>
                <div class="property-value">${escapeHtml(prop.value)}</div>
            </div>
        `).join('');
    }
});

/**
 * Escapes HTML to prevent XSS.
 */
function escapeHtml(text) {
    if (text === null || text === undefined) {
        return '';
    }
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}
```

**Key Principles:**

1. **One-time setup:** `setupDetailPanelResize()` called ONCE, guarded by `this.resizeSetup` flag
2. **Targeted updates:** Use `getElementById()` to update INNER content areas
3. **Preserve structure:** NEVER replace outer container or resize handle
4. **Defensive checks:** Log errors if expected elements not found
5. **Clean separation:** Rendering functions (pure) vs update functions (side effects)

---

### Layer 3: TypeScript Panel (Orchestration)

**Responsibility:** Coordinate backend operations, send ViewModels to frontend, persist width.

**File:** `src/features/{feature}/presentation/panels/{Feature}PanelComposed.ts`

**Implementation:**

```typescript
/**
 * Handles detail panel state and persistence.
 */
private async handleOpenDetailPanel(itemId: string): Promise<void> {
    this.logger.info('Opening detail panel', { itemId });

    try {
        // Load data via use case
        const detailData = await this.loadDetailUseCase.execute(itemId);

        // Map to ViewModel
        const viewModel = DetailViewModelMapper.toViewModel(detailData);

        // Send to frontend
        await this.coordinator.sendMessage({
            command: 'showDetailPanel',
            data: viewModel
        });

        // Restore persisted width (deferred application)
        const persistedWidth = this.panelState.get<number>('detailPanelWidth');
        if (persistedWidth) {
            await this.coordinator.sendMessage({
                command: 'restoreDetailPanelWidth',
                data: { width: persistedWidth }
            });
        }

        this.logger.info('Detail panel opened', { itemId });
    } catch (error) {
        this.logger.error('Failed to open detail panel', { itemId, error });
        void vscode.window.showErrorMessage(`Failed to load details: ${error.message}`);
    }
}

/**
 * Persists detail panel width when user finishes resizing.
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

/**
 * Registers detail panel command handlers.
 */
private registerDetailPanelHandlers(): void {
    this.coordinator.registerHandler('openDetailPanel', async (data) => {
        await this.handleOpenDetailPanel(data.itemId);
    });

    this.coordinator.registerHandler('closeDetailPanel', async () => {
        this.logger.info('Detail panel closed');
        // No state cleanup needed - panel just hidden, ready to reopen
    });

    this.coordinator.registerHandler('saveDetailPanelWidth', async (data) => {
        await this.handleSaveDetailPanelWidth(data.width);
    });
}
```

**Key Principles:**

1. **Deferred width restoration:** Send `restoreDetailPanelWidth` AFTER `showDetailPanel`
2. **Non-blocking persistence:** Don't interrupt user if save fails
3. **Environment-scoped state:** Use `IPanelStateRepository` for per-environment width
4. **Logging at boundaries:** Log open/close/save operations for debugging

---

### Layer 4: CSS Styling

**File:** `resources/webview/css/features/{feature}.css`

**Implementation:**

```css
/**
 * Detail Panel Styles
 * Right-side resizable panel for detail views
 */

/* Container */
.detail-panel {
    position: relative;
    width: 500px; /* Default width */
    min-width: 300px;
    max-width: 80vw;
    border-left: 1px solid var(--vscode-panel-border);
    background: var(--vscode-editor-background);
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

/* Resize Handle */
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

/* Header */
.detail-panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid var(--vscode-panel-border);
    background: var(--vscode-editor-background);
}

.detail-panel-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--vscode-foreground);
}

.detail-panel-close {
    background: transparent;
    border: none;
    color: var(--vscode-foreground);
    font-size: 20px;
    cursor: pointer;
    padding: 4px 8px;
    line-height: 1;
    border-radius: 3px;
}

.detail-panel-close:hover {
    background: var(--vscode-toolbar-hoverBackground);
}

/* Tabs */
.detail-tab-navigation {
    display: flex;
    border-bottom: 1px solid var(--vscode-panel-border);
    background: var(--vscode-editor-background);
}

.detail-tab-button {
    padding: 8px 16px;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    color: var(--vscode-foreground);
    cursor: pointer;
    font-size: 13px;
    transition: border-color 0.15s ease;
}

.detail-tab-button:hover {
    background: var(--vscode-toolbar-hoverBackground);
}

.detail-tab-button.active {
    border-bottom-color: var(--vscode-focusBorder);
    font-weight: 600;
}

/* Content */
.detail-content {
    flex: 1;
    overflow: auto;
    padding: 16px;
}

.detail-tab-panel {
    display: none;
}

.detail-tab-panel.active {
    display: block;
}

/* Properties */
.properties-content {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.property-item {
    display: grid;
    grid-template-columns: 140px 1fr;
    gap: 12px;
    padding: 8px 0;
    border-bottom: 1px solid var(--vscode-panel-border);
}

.property-name {
    font-weight: 600;
    color: var(--vscode-foreground);
}

.property-value {
    color: var(--vscode-foreground);
    word-break: break-word;
}

.properties-empty {
    padding: 24px;
    text-align: center;
    color: var(--vscode-descriptionForeground);
}

/* Raw Data */
.raw-data-content {
    font-family: var(--vscode-editor-font-family);
    font-size: var(--vscode-editor-font-size);
    color: var(--vscode-editor-foreground);
    white-space: pre-wrap;
    word-break: break-word;
}
```

**Key Principles:**

1. **Absolute positioned handle:** `position: absolute; left: 0;` allows dragging from left edge
2. **Visual feedback:** Hover effects and `::before` pseudo-element for grab indicator
3. **Responsive constraints:** `min-width: 300px; max-width: 80vw;` prevents unusable sizes
4. **Consistent spacing:** Uses 8px/12px/16px spacing scale
5. **VS Code theming:** All colors use CSS variables for theme compatibility

---

## Naming Conventions

### TypeScript (Structure)

| Element | ID/Class | Scope |
|---------|----------|-------|
| Detail Panel Container | `{feature}DetailPanel` | Feature-specific |
| Resize Handle | `detailPanelResizeHandle` | Shared (generic) |
| Title Element | `detailPanelTitle` | Shared (generic) |
| Close Button | `detailPanelClose` | Shared (generic) |
| Properties Content Area | `{feature}PropertiesContent` | Feature-specific |
| Raw Data Content Area | `{feature}RawDataContent` | Feature-specific |

**Rationale:**
- Generic IDs for shared controls (easy to standardize behavior)
- Feature-prefixed IDs for content areas (prevents conflicts in future shared components)
- IDs over classes for update targets (explicit, fast, debuggable)

### JavaScript (Behavior)

| Function | Purpose | When Called |
|----------|---------|-------------|
| `setupDetailPanel()` | Attach event listeners | Once during `initialize()` |
| `showDetailPanel(data)` | Display panel with data | When user selects item |
| `hideDetailPanel()` | Hide panel | When user closes panel |
| `setupDetailPanelResize(handle)` | Attach resize listeners | Once on first show |
| `restoreDetailPanelWidth(width)` | Apply persisted width | After panel shown |
| `switchDetailTab(tab)` | Switch active tab | When user clicks tab |
| `renderProperties(properties)` | Generate HTML | From `showDetailPanel()` |

---

## Type Contracts

### DetailViewModel (Backend → Frontend)

```typescript
/**
 * ViewModel for detail panel display.
 * Sent from backend to frontend via postMessage.
 */
interface DetailViewModel {
    /**
     * Title displayed in panel header
     */
    title: string;

    /**
     * Properties displayed in Properties tab
     */
    properties: PropertyViewModel[];

    /**
     * Raw entity data displayed in Raw Data tab
     */
    rawData: Record<string, unknown>;
}

interface PropertyViewModel {
    /**
     * Property display name (formatted, user-friendly)
     */
    name: string;

    /**
     * Property value (formatted for display)
     */
    value: string;
}
```

### Messages (Backend ↔ Frontend)

```typescript
// Backend → Frontend
type DetailPanelMessage =
    | { command: 'showDetailPanel'; data: DetailViewModel }
    | { command: 'hideDetailPanel' }
    | { command: 'restoreDetailPanelWidth'; data: { width: number } };

// Frontend → Backend
type DetailPanelCommand =
    | { command: 'openDetailPanel'; data: { itemId: string } }
    | { command: 'closeDetailPanel' }
    | { command: 'saveDetailPanelWidth'; data: { width: number } };
```

---

## State Persistence

### Backend (IPanelStateRepository)

```typescript
/**
 * Panel state keys for detail panel.
 */
const DETAIL_PANEL_STATE_KEYS = {
    WIDTH: 'detailPanelWidth'
} as const;

/**
 * Saves detail panel width.
 */
await this.panelState.set(DETAIL_PANEL_STATE_KEYS.WIDTH, width);

/**
 * Restores detail panel width.
 */
const width = this.panelState.get<number>(DETAIL_PANEL_STATE_KEYS.WIDTH);
```

**Scope:** Per-environment (each environment can have different preferred width)

**Default:** 500px (if no persisted state)

**Constraints:** 300px - 80vw (enforced in JavaScript)

---

## Migration Guide: Plugin Traces → Canonical Pattern

### Step 1: Replace PluginTraceDetailSection

**Before (dynamic rendering):**
```typescript
export class PluginTraceDetailSection implements ISection {
    public render(_data: SectionRenderData): string {
        return '<div class="detail-section"></div>'; // Empty container
    }
}
```

**After (static structure):**
```typescript
export class PluginTraceDetailSection implements ISection {
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
                        <pre id="pluginTraceRawDataContent"></pre>
                    </div>
                </div>
            </div>
        `;
    }
}
```

### Step 2: Remove DetailPanelRenderer.js

**Delete:** `resources/webview/js/renderers/DetailPanelRenderer.js`

**Rationale:** No longer need template renderer that generates complete HTML strings.

### Step 3: Update PluginTraceViewerBehavior.js

**Before (nuclear innerHTML replacement):**
```javascript
function updateDetailPanel(data) {
    const detailSection = document.querySelector('.content-split > .detail-section');
    const detailHtml = window.DetailPanelRenderer.renderDetailPanel(data.trace);
    detailSection.innerHTML = detailHtml; // ← DESTROYS EVERYTHING

    if (data.trace) {
        setupDetailPanelTabs(); // ← Must reattach
        setupDetailPanelResize(); // ← Must reattach (FAILS)
    }
}
```

**After (targeted updates):**
```javascript
function showDetailPanel(data) {
    const panel = document.getElementById('pluginTraceDetailPanel');
    if (!panel) {
        console.error('[PluginTraceViewer] Detail panel not found');
        return;
    }

    // Update title
    const title = document.getElementById('detailPanelTitle');
    if (title) {
        title.textContent = 'Trace Details';
    }

    // Update overview tab content (target INNER element)
    const overviewContent = document.getElementById('pluginTraceOverviewContent');
    if (overviewContent) {
        overviewContent.innerHTML = renderOverviewTab(data);
    }

    // Update details tab content
    const detailsContent = document.getElementById('pluginTraceDetailsContent');
    if (detailsContent) {
        detailsContent.innerHTML = renderDetailsTab(data);
    }

    // Update timeline tab content
    const timelineContent = document.getElementById('pluginTraceTimelineContent');
    if (timelineContent) {
        timelineContent.innerHTML = renderTimelineTab(data);
    }

    // Update raw data tab content
    const rawDataContent = document.getElementById('pluginTraceRawDataContent');
    if (rawDataContent) {
        rawDataContent.textContent = JSON.stringify(data.rawEntity, null, 2);
    }

    // Show panel
    panel.style.display = 'flex';

    // Setup resize handle (ONLY ONCE)
    const resizeHandle = document.getElementById('detailPanelResizeHandle');
    if (resizeHandle && !window.pluginTraceResizeSetup) {
        setupDetailPanelResize(resizeHandle);
        window.pluginTraceResizeSetup = true;
    }
}

// Extract rendering functions (pure, no side effects)
function renderOverviewTab(data) {
    // Return HTML string (same logic as DetailPanelRenderer)
}

function renderDetailsTab(data) {
    // Return HTML string
}

function renderTimelineTab(data) {
    // Return HTML string
}
```

### Step 4: Update CSS Selectors

**Before (SectionCompositionBehavior wrapper):**
```css
.content-split .detail-section {
    flex: 0 0 500px;
}

.detail-resize-handle {
    /* ... */
}
```

**After (standardized IDs):**
```css
#pluginTraceDetailPanel {
    width: 500px;
    min-width: 300px;
    max-width: 80vw;
}

.detail-panel-resize-handle {
    /* ... (standardized) */
}
```

### Step 5: Update Panel Handler

**Before (no width restoration):**
```typescript
private registerCommandHandlers(): void {
    this.coordinator.registerHandler('viewDetail', async (data) => {
        const viewModel = await this.loadDetailUseCase.execute(data.traceId);
        await this.coordinator.sendMessage({
            command: 'updateDetailPanel',
            data: viewModel
        });
    });
}
```

**After (with width restoration):**
```typescript
private registerCommandHandlers(): void {
    this.coordinator.registerHandler('openDetailPanel', async (data) => {
        const viewModel = await this.loadDetailUseCase.execute(data.traceId);

        // Show panel with data
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
    });

    this.coordinator.registerHandler('saveDetailPanelWidth', async (data) => {
        await this.panelState.set('detailPanelWidth', data.width);
    });
}
```

---

## Usage Guide: Implementing in New Features

### Checklist

**1. TypeScript Section**
- [ ] Create `{Feature}DetailSection.ts` in `presentation/sections/`
- [ ] Implement `ISection` interface with `position = SectionPosition.Detail`
- [ ] Render static structure with resize handle, header, tabs, content areas
- [ ] Use generic IDs for shared controls (`detailPanelResizeHandle`, `detailPanelTitle`, `detailPanelClose`)
- [ ] Use feature-prefixed IDs for content areas (`{feature}OverviewContent`, etc.)

**2. JavaScript Behavior**
- [ ] Add `setupDetailPanel()` to `initialize()` in behavior file
- [ ] Implement `showDetailPanel(data)` with targeted innerHTML updates
- [ ] Implement `hideDetailPanel()` (just hide, no cleanup)
- [ ] Implement `setupDetailPanelResize(handle)` with one-time guard
- [ ] Implement `restoreDetailPanelWidth(width)` to apply persisted width
- [ ] Add `renderXYZ()` helper functions for tab content (pure functions)
- [ ] Handle `showDetailPanel`, `hideDetailPanel`, `restoreDetailPanelWidth` messages

**3. TypeScript Panel**
- [ ] Define `DetailViewModel` interface
- [ ] Implement `loadDetailUseCase.execute()` call in handler
- [ ] Map domain entity to DetailViewModel
- [ ] Send `showDetailPanel` message with ViewModel
- [ ] Send `restoreDetailPanelWidth` message after show
- [ ] Handle `saveDetailPanelWidth` command and persist to `panelState`

**4. CSS Styling**
- [ ] Copy canonical CSS from this document
- [ ] Adjust feature-specific styling (colors, spacing)
- [ ] Ensure resize handle visually indicates draggability

**5. Testing**
- [ ] Manual: Resize panel → close → reopen → verify width restored
- [ ] Manual: Switch tabs → verify content renders correctly
- [ ] Manual: Update detail (select different item) → verify content updates
- [ ] Manual: Resize → verify min/max constraints enforced
- [ ] Manual: Console → verify no errors about missing elements

---

## Common Pitfalls & Solutions

### Pitfall 1: "Resize handle not working"

**Cause:** Resize handle destroyed and recreated, event listeners lost.

**Solution:** Ensure handle present in initial section `render()`, never replaced via `innerHTML`.

**Check:**
```javascript
// ✅ GOOD - Updates inner content only
document.getElementById('pluginTraceOverviewContent').innerHTML = newHtml;

// ❌ BAD - Destroys handle
document.querySelector('.detail-section').innerHTML = newHtml;
```

### Pitfall 2: "Width not persisting"

**Cause:** Frontend sends `saveDetailPanelWidth` but backend doesn't persist.

**Solution:** Register handler in panel TypeScript:
```typescript
this.coordinator.registerHandler('saveDetailPanelWidth', async (data) => {
    await this.panelState.set('detailPanelWidth', data.width);
});
```

### Pitfall 3: "Width restoration not working"

**Cause:** Width applied before panel shown, or not applied at all.

**Solution:** Send `restoreDetailPanelWidth` AFTER `showDetailPanel`:
```typescript
await this.coordinator.sendMessage({ command: 'showDetailPanel', data });
const width = this.panelState.get<number>('detailPanelWidth');
if (width) {
    await this.coordinator.sendMessage({
        command: 'restoreDetailPanelWidth',
        data: { width }
    });
}
```

### Pitfall 4: "Class selector returns null after update"

**Cause:** Class-based selectors fragile, timing-dependent, ambiguous.

**Solution:** Use ID selectors for all update targets:
```javascript
// ✅ GOOD - Specific, fast, reliable
const content = document.getElementById('pluginTraceOverviewContent');

// ❌ BAD - Fragile, may fail after DOM changes
const content = document.querySelector('.content-split > .detail-section .tab-content');
```

### Pitfall 5: "Event listeners duplicated"

**Cause:** `setupDetailPanelResize()` called multiple times without guard.

**Solution:** Use flag to ensure one-time setup:
```javascript
if (resizeHandle && !this.resizeSetup) {
    this.setupDetailPanelResize(resizeHandle);
    this.resizeSetup = true;
}
```

---

## Future Enhancements

### Phase 1: Extract Shared Component (Post-Migration)

**After** both Metadata Browser and Plugin Traces migrated to canonical pattern:

1. Create `ResizableDetailPanelBehavior.js` in `resources/webview/js/behaviors/shared/`
2. Extract common logic: resize, show/hide, tab switching, width persistence
3. Expose hooks for feature-specific rendering: `renderOverviewTab()`, `renderDetailsTab()`

**Benefits:**
- Zero duplication across features
- Single source of truth for resize logic
- Easier to add new features (plug into shared component)

### Phase 2: TypeScript Shared Section Base Class

**After** Phase 1 proves pattern stable:

1. Create `ResizableDetailPanelSection` base class in `shared/infrastructure/ui/sections/`
2. Features extend base and override: tab definitions, content area IDs
3. Base class handles: structure, resize handle, header, generic tabs

**Benefits:**
- Type-safe configuration (tabs, IDs)
- Compile-time validation of contract
- Eliminates copy-paste errors

### Phase 3: VS Code Panel API Integration

**If** VS Code provides native resizable panel API:

1. Migrate from custom resize logic to VS Code API
2. Keep ViewModel contract unchanged (frontend agnostic)
3. Deprecate custom resize CSS/JavaScript

**Benefits:**
- Native performance and accessibility
- Less custom code to maintain
- Consistent with VS Code UX patterns

---

## References

**Working Implementation:**
- `src/features/metadataBrowser/presentation/sections/MetadataBrowserLayoutSection.ts:288-315`
- `resources/webview/js/behaviors/MetadataBrowserBehavior.js:712-862`
- `resources/webview/css/features/metadata-browser.css` (detail panel styles)

**Broken Implementation (DO NOT FOLLOW):**
- `src/features/pluginTraceViewer/presentation/sections/PluginTraceDetailSection.ts`
- `resources/webview/js/renderers/DetailPanelRenderer.js`
- `resources/webview/js/behaviors/PluginTraceViewerBehavior.js:108-341`

**Related Patterns:**
- `docs/architecture/PANEL_ARCHITECTURE.md` - Panel composition system
- `docs/architecture/CLEAN_ARCHITECTURE_GUIDE.md` - Layer responsibilities
- `.claude/templates/PANEL_DEVELOPMENT_GUIDE.md` - Panel decision guide

---

## Summary

**The Canonical Pattern:**

1. **TypeScript renders static structure ONCE** (resize handle never destroyed)
2. **JavaScript updates targeted inner elements by ID** (fast, explicit)
3. **Backend persists width to IPanelStateRepository** (environment-scoped)
4. **Width restored after panel shown** (deferred application)
5. **One-time setup guarded by flag** (listeners attached once)

**Why it works:**

- Resize handle permanent = listeners permanent
- ID selectors explicit = no timing issues
- Targeted updates = efficient, preserves listeners
- Deferred restoration = works with show/hide lifecycle

**Use this pattern for ALL future resizable detail panels.**
