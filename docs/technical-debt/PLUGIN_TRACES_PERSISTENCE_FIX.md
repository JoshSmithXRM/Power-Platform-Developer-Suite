# Plugin Traces Detail Panel Resize Persistence - Root Cause & Fix

**Date**: 2025-01-20
**Status**: ROOT CAUSE IDENTIFIED
**Priority**: HIGH

---

## Executive Summary

**Root Cause**: `setupDetailPanelResize()` is failing silently because one or both DOM elements are not found when it's called. The function has an early return with NO console logging:c:\VS\Power-Platform-Developer-Suite\resources\webview\js\behaviors\PluginTraceViewerBehavior.js:286-292

```javascript
function setupDetailPanelResize() {
	const handle = document.querySelector('.detail-resize-handle');
	const detailSection = document.querySelector('.content-split > .detail-section');

	if (!handle || !detailSection) {
		return;  // ← SILENT FAILURE - NO LOGGING!
	}
	// ... rest of setup
}
```

**Why no console output**: When the user added console logging for debugging, they likely added it AFTER this check. If either element is missing, the function returns immediately and never reaches the logging statements or event listener setup.

---

## Comparison: Working vs Broken

### Metadata Browser (WORKING ✅)

**HTML Structure** (MetadataBrowserLayoutSection.ts:288-290):
```html
<div class="metadata-detail-panel" id="detailPanel" style="display: none;">
    <div class="detail-panel-resize-handle" id="detailPanelResizeHandle" title="Drag to resize"></div>
    ...
</div>
```

**JavaScript Selectors** (MetadataBrowserBehavior.js:808-809):
```javascript
const detailPanel = document.getElementById('detailPanel');
const newHandle = document.getElementById('detailPanelResizeHandle');
```

**Key Points**:
- Uses **ID selectors** (`#detailPanel`, `#detailPanelResizeHandle`)
- Detail panel is rendered **ONCE** in the main layout HTML
- Resize handle is a **direct child** of the detail panel
- The detail panel **itself** is the resizable element
- Content is updated via `innerHTML` on INNER containers, not the panel itself

### Plugin Traces (BROKEN ❌)

**HTML Structure** (generated at runtime):
```html
<!-- Outer container from SectionCompositionBehavior.ts:85-87 -->
<div class="content-split">
    <div class="main-section"><!-- TABLE --></div>
    <div class="detail-section hidden">
        <!-- Inner content from DetailPanelRenderer.js:43-44 -->
        <div class="trace-detail-panel">
            <div class="detail-resize-handle" title="Drag to resize"></div>
            <div class="trace-detail-header-sticky">...</div>
            <div class="trace-detail-content">
                <!-- Multiple INNER elements also use class="detail-section" -->
                <div class="detail-section">...</div>  <!-- ← COLLISION! -->
            </div>
        </div>
    </div>
</div>
```

**JavaScript Selectors** (PluginTraceViewerBehavior.js:286-287):
```javascript
const handle = document.querySelector('.detail-resize-handle');
const detailSection = document.querySelector('.content-split > .detail-section');
```

**Key Problems**:
1. Uses **class selectors** (less specific than IDs)
2. Detail panel HTML is **re-rendered** via `innerHTML` replacement on every trace selection
3. Resize handle is **deeply nested** inside the detail panel content
4. The outer `.detail-section` wrapper is the resizable element, not the inner panel
5. **CLASS NAME COLLISION**: Multiple elements use `.detail-section` class (outer container AND inner content sections)

---

## The Actual Bug

### Problem 1: Element Not Found During Setup

When `updateDetailPanel()` is called (PluginTraceViewerBehavior.js:108-136):

```javascript
function updateDetailPanel(data) {
	const detailSection = document.querySelector('.content-split > .detail-section');
	if (!detailSection) {
		console.warn('[PluginTraceViewer] No detail section found for panel update');
		return;
	}

	// Store trace data...
	currentTraceData = data.trace;
	currentRawEntity = data.rawEntity;

	// Render detail panel HTML
	const detailHtml = window.DetailPanelRenderer.renderDetailPanel(data.trace);

	// ← REPLACES ENTIRE INNER HTML
	detailSection.innerHTML = detailHtml;

	// ← CALLED IMMEDIATELY AFTER innerHTML REPLACEMENT
	if (data.trace) {
		setupDetailPanelTabs();
		setupDetailPanelResize();  // ← FAILS HERE
	}
}
```

**Timeline**:
1. `detailSection.innerHTML = detailHtml;` - Replaces content, including adding `.detail-resize-handle`
2. `setupDetailPanelResize()` is called immediately
3. `document.querySelector('.detail-resize-handle')` - Should find it (it exists)
4. `document.querySelector('.content-split > .detail-section')` - Should find it (it exists)
5. BUT: One or both queries are failing for unknown reason

**Hypothesis**: Timing issue or DOM state inconsistency. The `innerHTML` replacement may not be fully complete when selectors run, OR there's a race condition with other DOM updates.

### Problem 2: Silent Failure

The function returns silently if elements are not found. No error logging, no console output. This makes debugging impossible.

```javascript
if (!handle || !detailSection) {
	return;  // ← NO LOGGING! User sees nothing in console.
}
```

---

## The Fix

### Step 1: Add Comprehensive Logging

**File**: `resources/webview/js/behaviors/PluginTraceViewerBehavior.js:285-341`

Replace the entire `setupDetailPanelResize()` function with this version that adds defensive logging:

```javascript
/**
 * Sets up detail panel resize functionality.
 * Allows user to drag the left edge of the detail panel to resize it.
 */
function setupDetailPanelResize() {
	console.log('[PluginTraceViewer] setupDetailPanelResize called');

	const handle = document.querySelector('.detail-resize-handle');
	const detailSection = document.querySelector('.content-split > .detail-section');

	console.log('[PluginTraceViewer] Resize handle found:', handle);
	console.log('[PluginTraceViewer] Detail section found:', detailSection);

	if (!handle) {
		console.error('[PluginTraceViewer] CRITICAL: Resize handle (.detail-resize-handle) not found in DOM');
		console.log('[PluginTraceViewer] Available handles:', document.querySelectorAll('[class*="resize"]'));
		return;
	}

	if (!detailSection) {
		console.error('[PluginTraceViewer] CRITICAL: Detail section (.content-split > .detail-section) not found in DOM');
		console.log('[PluginTraceViewer] Available .detail-section elements:', document.querySelectorAll('.detail-section'));
		console.log('[PluginTraceViewer] Available .content-split elements:', document.querySelectorAll('.content-split'));
		return;
	}

	let isResizing = false;
	let startX = 0;
	let startWidth = 0;

	const MIN_WIDTH = 300;
	const MAX_WIDTH = window.innerWidth * 0.8; // 80% of window width

	handle.addEventListener('mousedown', (e) => {
		console.log('[PluginTraceViewer] Resize started - mousedown on handle');
		isResizing = true;
		startX = e.clientX;
		startWidth = detailSection.offsetWidth;
		handle.classList.add('resizing');
		document.body.style.cursor = 'col-resize';
		document.body.style.userSelect = 'none';
		e.preventDefault();
	});

	document.addEventListener('mousemove', (e) => {
		if (!isResizing) {
			return;
		}

		// Calculate new width (drag left = wider, drag right = narrower)
		const deltaX = startX - e.clientX;
		const newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startWidth + deltaX));

		// Use flex shorthand to properly override CSS default
		detailSection.style.flex = `0 0 ${newWidth}px`;
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
		const currentWidth = detailSection.offsetWidth;
		console.log('[PluginTraceViewer] Resize ended, saving width:', currentWidth);

		vscode.postMessage({
			command: 'saveDetailPanelWidth',
			data: { width: currentWidth }
		});
	});

	console.log('[PluginTraceViewer] Resize handlers attached successfully');
}
```

### Step 2: Add Defensive Timing

**File**: `resources/webview/js/behaviors/PluginTraceViewerBehavior.js:108-136`

Update `updateDetailPanel()` to defer resize setup slightly, allowing DOM to stabilize:

```javascript
function updateDetailPanel(data) {
	const detailSection = document.querySelector('.content-split > .detail-section');
	if (!detailSection) {
		console.warn('[PluginTraceViewer] No detail section found for panel update');
		return;
	}

	// Store current trace data (ViewModel for display)
	currentTraceData = data.trace;
	// Store raw entity data (actual API values for Raw Data tab)
	currentRawEntity = data.rawEntity;
	// Store related traces (fetched by correlation ID from backend, unfiltered)
	currentRelatedTraces = data.relatedTraces || [];
	// Store timeline (built from same related traces cache)
	timelineData = data.timeline || null;

	// Render detail panel HTML using DetailPanelRenderer
	const detailHtml = window.DetailPanelRenderer.renderDetailPanel(data.trace);

	// Update detail section (preserves event listeners on other elements)
	detailSection.innerHTML = detailHtml;

	// Re-apply tab event listeners if detail panel has content
	if (data.trace) {
		setupDetailPanelTabs();

		// Defer resize setup to next tick to ensure DOM is fully updated
		setTimeout(() => {
			console.log('[PluginTraceViewer] Deferred resize setup triggered');
			setupDetailPanelResize();
		}, 0);
	}
}
```

### Step 3: Add Backend Logging

**File**: `src/features/pluginTraceViewer/presentation/panels/PluginTraceViewerPanelComposed.ts:698-727`

Add logging to confirm save handler is receiving messages:

```typescript
private async handleSaveDetailPanelWidth(width: number): Promise<void> {
	if (!this.panelStateRepository) {
		this.logger.warn('Cannot save detail panel width - no state repository');
		return;
	}

	try {
		this.logger.debug('Saving detail panel width', { width });

		// Load existing state to preserve other properties
		const existingState = await this.panelStateRepository.load({
			panelType: PluginTraceViewerPanelComposed.viewType,
			environmentId: this.currentEnvironmentId
		});

		const newState = {
			selectedSolutionId: existingState?.selectedSolutionId || 'default',
			lastUpdated: new Date().toISOString(),
			filterCriteria: existingState?.filterCriteria,
			autoRefreshInterval: (existingState as { autoRefreshInterval?: number })?.autoRefreshInterval || 0,
			detailPanelWidth: width
		};

		await this.panelStateRepository.save({
			panelType: PluginTraceViewerPanelComposed.viewType,
			environmentId: this.currentEnvironmentId
		}, newState);

		this.detailPanelWidth = width;
		this.logger.info('Detail panel width saved successfully', { width });
	} catch (error) {
		this.logger.error('Error saving detail panel width', error);
	}
}
```

---

## Testing Steps

### 1. Apply the Fix

Apply all three code changes above.

### 2. Compile TypeScript

```bash
npm run compile
```

### 3. Test Resize Functionality

1. Open Plugin Traces panel
2. Select a trace to open detail panel
3. **Open DevTools Console** (Help > Toggle Developer Tools)
4. Look for these log messages:
   ```
   [PluginTraceViewer] setupDetailPanelResize called
   [PluginTraceViewer] Resize handle found: <div class="detail-resize-handle">
   [PluginTraceViewer] Detail section found: <div class="detail-section">
   [PluginTraceViewer] Resize handlers attached successfully
   ```

5. If you see `CRITICAL` errors instead:
   - The element selectors are wrong or elements don't exist
   - Check the logged available elements to find correct selectors

6. Drag the resize handle left/right
7. Look for:
   ```
   [PluginTraceViewer] Resize started - mousedown on handle
   [PluginTraceViewer] Resize ended, saving width: 700
   ```

8. Close and reopen the panel
9. Verify width is restored

### 4. Compare with Metadata Browser

1. Open Metadata Browser
2. Resize detail panel (should work perfectly)
3. Close and reopen
4. Verify width is restored (should work)

---

## Expected Outcome

After applying the fix, you will see ONE of these outcomes:

### Outcome A: Logging shows both elements found ✅
- Resize functionality will work
- Width will be saved
- Width will be restored on reopen
- **Problem solved!**

### Outcome B: Logging shows one element NOT found ❌
- Console will show which element is missing
- Console will show available alternatives
- **Next step**: Fix the selector to match actual DOM structure

---

## Preventive Measures

### 1. Use ID Selectors

Class selectors like `.detail-resize-handle` are fragile. Consider refactoring to use IDs:

```javascript
// Before (fragile):
const handle = document.querySelector('.detail-resize-handle');

// After (robust):
const handle = document.getElementById('pluginTraceResizeHandle');
```

Update DetailPanelRenderer.js:44:
```html
<div id="pluginTraceResizeHandle" class="detail-resize-handle" title="Drag to resize"></div>
```

### 2. Always Log Silent Failures

Never return silently from setup functions:

```javascript
// ❌ BAD:
if (!element) {
	return;
}

// ✅ GOOD:
if (!element) {
	console.error('CRITICAL: Element not found', { selector: '.my-element' });
	return;
}
```

### 3. Avoid Class Name Collisions

Plugin Traces uses `.detail-section` for both:
- The outer resizable container
- Inner content sections

This is confusing. Consider renaming:
- Outer: `.detail-panel-container`
- Inner: `.detail-content-section`

---

## Success Criteria

✅ Plugin Traces detail panel can be resized by dragging
✅ Width is saved to persistent storage after resize
✅ Width is restored when panel is reopened
✅ Console logging confirms all steps execute correctly
✅ Behavior matches Metadata Browser (reference implementation)

---

## Related Files

**Modified**:
- `resources/webview/js/behaviors/PluginTraceViewerBehavior.js` (add logging + defer setup)
- `src/features/pluginTraceViewer/presentation/panels/PluginTraceViewerPanelComposed.ts` (add backend logging)

**Reference** (working implementation):
- `resources/webview/js/behaviors/MetadataBrowserBehavior.js:806-862`
- `src/features/metadataBrowser/presentation/panels/MetadataBrowserPanel.ts:732-740`

**DOM Structure**:
- `src/shared/infrastructure/ui/behaviors/SectionCompositionBehavior.ts:85-87` (creates `.content-split` wrapper)
- `resources/webview/js/renderers/DetailPanelRenderer.js:43-44` (creates `.detail-resize-handle`)
- `src/features/pluginTraceViewer/presentation/sections/PluginTraceDetailSection.ts:21` (creates `.detail-section`)
