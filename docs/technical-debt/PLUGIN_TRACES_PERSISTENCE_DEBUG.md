# Plugin Traces Detail Panel Persistence - Debug Investigation

**Date Created**: 2025-01-20
**Priority**: HIGH
**Status**: NOT WORKING (Metadata Browser works, Plugin Traces doesn't)

## Problem Statement

The detail panel resize persistence works perfectly for Metadata Browser but NOT for Plugin Traces:

- ✅ **Metadata Browser**: Resize → Close Panel → Reopen → Width restored correctly
- ❌ **Plugin Traces**: Resize → Close Panel → Reopen → Width resets to default (500px)

## What We've Already Tried

### Recent Changes Made:
1. Changed from `flexBasis` to full `flex` shorthand in PluginTraceViewerBehavior.js
2. Added deferred restoration logic (store width globally, apply on panel show)
3. Added console logging for debugging

### What User Reports:
- No console output when resizing Plugin Traces detail panel
- Only sees autorefresh restore message on panel open
- Metadata browser resize/restore works fine

## Investigation Task

**Your job**: Figure out why Plugin Traces persistence isn't working while Metadata Browser works.

---

## Step 1: Compare Working vs Broken Implementations

### Files to Compare Side-by-Side:

**Metadata Browser (WORKING ✅)**:
1. `src/features/metadataBrowser/presentation/panels/MetadataBrowserPanel.ts`
   - Look for: persistence save/restore logic
   - Look for: `saveDetailPanelWidth` handler
   - Look for: `restoreDetailPanelWidth` message

2. `resources/webview/js/behaviors/MetadataBrowserBehavior.js`
   - Look for: resize event handlers
   - Look for: `setupDetailPanelResize()` function
   - Look for: persistence save calls

**Plugin Traces (BROKEN ❌)**:
1. `src/features/pluginTraceViewer/presentation/panels/PluginTraceViewerPanelComposed.ts`
   - Look for: persistence save/restore logic
   - Look for: `saveDetailPanelWidth` handler
   - Look for: initialization code that sends `restoreDetailPanelWidth`

2. `resources/webview/js/behaviors/PluginTraceViewerBehavior.js`
   - Look for: `setupDetailPanelResize()` function (around line 279)
   - Look for: `restoreDetailPanelWidth()` function (around line 348)
   - Look for: resize event handlers

### Specific Things to Check:

**Q1**: Is `setupDetailPanelResize()` being called in Plugin Traces?
- Search for where it's invoked in PluginTraceViewerBehavior.js
- Compare to where it's called in MetadataBrowserBehavior.js

**Q2**: Are the CSS selectors correct?
- Plugin Traces uses: `.content-split > .detail-section`
- Metadata Browser uses: `#detailPanel`
- Verify these selectors match the actual HTML structure

**Q3**: Is the resize handle present in the HTML?
- Plugin Traces: Check for `.detail-resize-handle` in DetailPanelRenderer.js
- Metadata Browser: Check for `#detailPanelResizeHandle` in MetadataBrowserLayoutSection.ts

**Q4**: Are the message handlers registered?
- Plugin Traces: Is `saveDetailPanelWidth` registered in PluginTraceViewerPanelComposed.ts?
- Check around line 400-500 for handler registrations

---

## Step 2: Search for Key Differences

### Commands to Run:

```bash
# Find where resize handlers are set up
Grep: pattern="setupDetailPanelResize|setupResize"
      output_mode=content
      -A=10

# Find where persistence is saved
Grep: pattern="saveDetailPanelWidth"
      output_mode=content
      -A=5
      -B=5

# Find resize handle elements
Grep: pattern="detail-resize-handle|detailPanelResizeHandle"
      output_mode=content

# Find detail section selectors
Grep: pattern="\.detail-section|\.content-split"
      output_mode=content
      path=resources/webview

# Check for initialization differences
Grep: pattern="restoreDetailPanelWidth"
      output_mode=content
      -A=10
      -B=5
```

---

## Step 3: Verify HTML Structure

### Read and Compare HTML Structure:

**Plugin Traces Detail Panel HTML:**
```bash
Read: resources/webview/js/renderers/DetailPanelRenderer.js
```
Look for:
- Is there a `.detail-resize-handle` element?
- Where is it positioned in the DOM?
- Is the detail panel structure correct?

**Metadata Browser Detail Panel HTML:**
```bash
Read: src/features/metadataBrowser/presentation/sections/MetadataBrowserLayoutSection.ts
```
Look for:
- How is `detailPanelResizeHandle` structured?
- Where is it in the DOM tree?

### Critical Question:
Does Plugin Traces render the detail panel HTML the same way as Metadata Browser, or is it different?

---

## Step 4: Check Event Listener Registration

### In PluginTraceViewerBehavior.js:

Find where `setupDetailPanelResize()` is called:
```javascript
// Search for this pattern
function initialize() {
    // ...
    setupDetailPanelResize(); // Is this being called?
    // ...
}
```

**Compare to MetadataBrowserBehavior.js:**
- When is resize setup called?
- Is it called on initialization or lazily?
- Is there a flag to prevent duplicate setup?

---

## Step 5: Check Message Command Registration

### In PluginTraceViewerPanelComposed.ts:

Search for handler registrations around line 400-500:
```typescript
this.coordinator.registerHandler('saveDetailPanelWidth', async (data) => {
    // Does this exist?
    // What does it do?
});
```

**Verify:**
1. Is `saveDetailPanelWidth` handler registered?
2. Does it save to `IPanelStateRepository`?
3. Is `detailPanelWidth` being loaded from persistence on init?
4. Is the restore message sent to webview?

Compare exact implementation with Metadata Browser panel.

---

## Step 6: Trace the Flow

### Document the Complete Flow:

**For Metadata Browser (Working):**
1. User drags resize handle → triggers mousedown event
2. Mousemove updates width → `detailPanel.style.width = ...`
3. Mouseup fires → saves via `vscode.postMessage({ command: 'saveDetailPanelWidth' })`
4. Backend receives → saves to `IPanelStateRepository`
5. Panel reopens → loads from persistence
6. Sends `restoreDetailPanelWidth` message to webview
7. Webview applies width

**For Plugin Traces (Broken):**
1. Trace each step above
2. Find where the chain breaks
3. Document the missing piece

---

## Step 7: Check CSS Differences

### Plugin Traces CSS:
```bash
Read: resources/webview/css/features/plugin-trace-viewer.css
```
Search for:
- `.detail-section` styles
- `.detail-resize-handle` styles
- Any `flex` or `flex-basis` defaults

### Metadata Browser CSS:
```bash
Read: resources/webview/css/features/metadata-browser.css
```
Search for:
- `.metadata-detail-panel` styles
- `.detail-panel-resize-handle` styles

**Key Question**: Is there a CSS rule overriding the JavaScript flex setting?

---

## Step 8: Add Debugging

If you can't find the issue, add comprehensive logging:

### In PluginTraceViewerBehavior.js:

```javascript
function setupDetailPanelResize() {
    console.log('[DEBUG] setupDetailPanelResize called');

    const handle = document.querySelector('.detail-resize-handle');
    console.log('[DEBUG] Resize handle found:', handle);

    const detailSection = document.querySelector('.content-split > .detail-section');
    console.log('[DEBUG] Detail section found:', detailSection);

    if (!handle || !detailSection) {
        console.error('[DEBUG] Missing elements - handle:', handle, 'section:', detailSection);
        return;
    }

    // ... rest of setup

    handle.addEventListener('mousedown', (e) => {
        console.log('[DEBUG] Resize started');
        // ...
    });

    document.addEventListener('mouseup', () => {
        if (!isResizing) return;

        const currentWidth = detailSection.offsetWidth;
        console.log('[DEBUG] Resize ended, saving width:', currentWidth);

        vscode.postMessage({
            command: 'saveDetailPanelWidth',
            data: { width: currentWidth }
        });
    });
}
```

---

## Step 9: Check Backend Handler

### In PluginTraceViewerPanelComposed.ts:

Search for:
```typescript
this.coordinator.registerHandler('saveDetailPanelWidth'
```

**Verify:**
1. Handler exists
2. Saves to repository: `await this.panelStateRepository.set(...)`
3. Uses correct key (check what Metadata Browser uses)
4. Actually persists (not just stored in memory)

Compare exact implementation line-by-line with MetadataBrowserPanel.ts

---

## Step 10: Check Initialization Order

### Possible Issue: Timing

The restoration message might be sent before the resize setup is complete.

**Check in PluginTraceViewerPanelComposed.ts:**
```typescript
private async initializeAndLoadData(): Promise<void> {
    // ...

    // When is this called?
    if (this.detailPanelWidth) {
        await this.panel.webview.postMessage({
            command: 'restoreDetailPanelWidth',
            data: { width: this.detailPanelWidth }
        });
    }

    // Is it called BEFORE or AFTER the webview is ready?
}
```

Compare timing with Metadata Browser initialization.

---

## Expected Findings

You should discover ONE of these issues:

1. **Missing handler registration** - `saveDetailPanelWidth` not registered in panel
2. **Selector mismatch** - JavaScript looking for wrong element
3. **Setup not called** - `setupDetailPanelResize()` never invoked
4. **Wrong property** - Using wrong CSS property (width vs flex vs flexBasis)
5. **Timing issue** - Restore called before elements exist
6. **Message not sent** - Backend not sending restore message
7. **Handler not listening** - JavaScript not listening for `restoreDetailPanelWidth`
8. **HTML structure different** - Resize handle not in DOM or wrong position

---

## Deliverable

Create a file: `docs/technical-debt/PLUGIN_TRACES_PERSISTENCE_FIX.md`

Include:
1. **Root Cause**: Exact issue found (with line numbers)
2. **Why It Works in Metadata Browser**: What's different
3. **The Fix**: Exact code changes needed
4. **Testing Steps**: How to verify it works
5. **Prevention**: How to avoid this in future

---

## Quick Start Commands

```bash
# Start here - compare the panel TypeScript files
Read: src/features/metadataBrowser/presentation/panels/MetadataBrowserPanel.ts
Read: src/features/pluginTraceViewer/presentation/panels/PluginTraceViewerPanelComposed.ts

# Then compare the behavior JavaScript files
Read: resources/webview/js/behaviors/MetadataBrowserBehavior.js
Read: resources/webview/js/behaviors/PluginTraceViewerBehavior.js

# Check HTML structure
Read: resources/webview/js/renderers/DetailPanelRenderer.js
Read: src/features/metadataBrowser/presentation/sections/MetadataBrowserLayoutSection.ts

# Search for handlers
Grep: pattern="saveDetailPanelWidth"
      output_mode=content
      -A=5
      -B=5
```

---

**Success Criteria**: Plugin Traces detail panel width persists across panel close/reopen, just like Metadata Browser.

**Estimated Time**: 20-30 minutes
**Priority**: HIGH (user is actively testing)
