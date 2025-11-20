# Resizable Detail Panel - Implementation Summary

## Quick Reference

**Pattern:** Static Structure with Targeted Updates

**Status:** Canonical pattern established (2025-11-20)

**Use for:** All right-side resizable detail panels in VS Code webviews

---

## The Pattern in 60 Seconds

### TypeScript Section (Render Structure)

```typescript
export class MyFeatureDetailSection extends ResizableDetailPanelSection {
    constructor() {
        super({
            featurePrefix: 'myFeature',
            tabs: [
                { id: 'overview', label: 'Overview', isDefault: true },
                { id: 'raw', label: 'Raw Data' }
            ]
        });
    }
}
```

### JavaScript Behavior (Update Content)

```javascript
window.createBehavior({
    initialize() {
        setupDetailPanel();
    },
    handleMessage(message) {
        if (message.command === 'showDetailPanel') {
            showDetailPanel(message.data);
        }
    }
});

function showDetailPanel(data) {
    // Update title
    document.getElementById('detailPanelTitle').textContent = data.title;

    // Update tab contents (targeted by ID)
    document.getElementById('myFeatureOverviewContent').innerHTML = renderOverview(data);
    document.getElementById('myFeatureRawContent').textContent = JSON.stringify(data.raw, null, 2);

    // Show panel
    document.getElementById('myFeatureDetailPanel').style.display = 'flex';

    // Setup resize (ONCE)
    if (!resizeSetup) {
        setupDetailPanelResize(document.getElementById('detailPanelResizeHandle'));
        resizeSetup = true;
    }
}
```

### Backend Panel (Coordinate)

```typescript
// Show panel
await this.coordinator.sendMessage({
    command: 'showDetailPanel',
    data: viewModel
});

// Restore width
const width = this.panelState.get<number>('detailPanelWidth');
if (width) {
    await this.coordinator.sendMessage({
        command: 'restoreDetailPanelWidth',
        data: { width }
    });
}

// Save width
this.coordinator.registerHandler('saveDetailPanelWidth', async (data) => {
    await this.panelState.set('detailPanelWidth', data.width);
});
```

---

## Key Principles

1. **Static Structure** - Resize handle rendered ONCE, never destroyed
2. **Targeted Updates** - Use `getElementById()` to update inner content
3. **One-Time Setup** - Listeners attached once, guarded by flag
4. **Deferred Restoration** - Width applied AFTER panel shown
5. **ID Selectors** - Never use class selectors for dynamic updates

---

## Components Available

### Reusable Components

**TypeScript:**
- `ResizableDetailPanelSection` - Base class for sections
- `ResizableDetailPanelConfig` - Configuration interface

**JavaScript:**
- `ResizableDetailPanelBehavior` - Shared behavior class
- `escapeHtml()` - HTML escaping utility

**Location:**
- TypeScript: `src/shared/infrastructure/ui/sections/`
- JavaScript: `resources/webview/js/behaviors/shared/`

### Usage Example

```typescript
import { ResizableDetailPanelSection } from '../../../../shared/infrastructure/ui/sections/ResizableDetailPanelSection';

export class PluginTraceDetailSection extends ResizableDetailPanelSection {
    constructor() {
        super({
            featurePrefix: 'pluginTrace',
            defaultTitle: 'Trace Details',
            tabs: [
                { id: 'overview', label: 'Overview', isDefault: true },
                { id: 'details', label: 'Details' },
                { id: 'timeline', label: 'Timeline' },
                { id: 'raw', label: 'Raw Data' }
            ]
        });
    }
}
```

---

## ID Naming Conventions

| Element | ID Format | Example |
|---------|-----------|---------|
| Panel Container | `{feature}DetailPanel` | `pluginTraceDetailPanel` |
| Resize Handle | `detailPanelResizeHandle` | (shared, generic) |
| Title | `detailPanelTitle` | (shared, generic) |
| Close Button | `detailPanelClose` | (shared, generic) |
| Tab Content | `{feature}{Tab}Content` | `pluginTraceOverviewContent` |

**Pattern:**
- Generic elements (handle, title, close) use shared IDs
- Feature-specific content uses prefixed IDs
- Capitalized tab IDs: `overview` → `Overview` → `{feature}OverviewContent`

---

## Common Mistakes & Solutions

### Mistake 1: innerHTML Destroys Handle

**Problem:**
```javascript
// ❌ BAD - Destroys entire structure including resize handle
document.querySelector('.detail-section').innerHTML = newHtml;
```

**Solution:**
```javascript
// ✅ GOOD - Updates inner content only
document.getElementById('myFeatureOverviewContent').innerHTML = newHtml;
```

### Mistake 2: Class Selectors Fail

**Problem:**
```javascript
// ❌ BAD - Fragile, may return null after updates
const handle = document.querySelector('.detail-resize-handle');
```

**Solution:**
```javascript
// ✅ GOOD - Explicit, reliable
const handle = document.getElementById('detailPanelResizeHandle');
```

### Mistake 3: Multiple Listener Attachments

**Problem:**
```javascript
// ❌ BAD - Listeners duplicated on every show
function showDetailPanel() {
    setupDetailPanelResize();
}
```

**Solution:**
```javascript
// ✅ GOOD - Setup once, guarded by flag
if (!resizeSetup) {
    setupDetailPanelResize(handle);
    resizeSetup = true;
}
```

### Mistake 4: Width Applied Too Early

**Problem:**
```typescript
// ❌ BAD - Width applied before panel shown
await sendMessage({ command: 'restoreDetailPanelWidth', data: { width } });
await sendMessage({ command: 'showDetailPanel', data });
```

**Solution:**
```typescript
// ✅ GOOD - Show first, then restore width
await sendMessage({ command: 'showDetailPanel', data });
const width = this.panelState.get<number>('detailPanelWidth');
if (width) {
    await sendMessage({ command: 'restoreDetailPanelWidth', data: { width } });
}
```

---

## Implementation Checklist

### TypeScript Section

- [ ] Extend `ResizableDetailPanelSection` or implement `ISection`
- [ ] Define `featurePrefix` (unique, lowercase)
- [ ] Define tabs with IDs and labels
- [ ] Set `position = SectionPosition.Detail`

### JavaScript Behavior

- [ ] Add `setupDetailPanel()` to `initialize()`
- [ ] Implement `showDetailPanel(data)` with targeted updates
- [ ] Implement `hideDetailPanel()` (just hide, no cleanup)
- [ ] Implement `setupDetailPanelResize(handle)` with guard
- [ ] Implement `restoreDetailPanelWidth(width)`
- [ ] Add rendering functions (pure, return HTML strings)
- [ ] Handle `showDetailPanel`, `hideDetailPanel`, `restoreDetailPanelWidth` messages

### TypeScript Panel

- [ ] Define `DetailViewModel` interface
- [ ] Call use case in handler
- [ ] Send `showDetailPanel` message
- [ ] Send `restoreDetailPanelWidth` after show
- [ ] Handle `saveDetailPanelWidth` and persist

### CSS

- [ ] Copy canonical styles from pattern doc
- [ ] Adjust feature-specific colors/spacing
- [ ] Ensure resize handle has visual feedback

### Testing

- [ ] Resize works smoothly
- [ ] Width persists across open/close
- [ ] Min/max constraints enforced
- [ ] Tabs switch correctly
- [ ] Content updates on selection
- [ ] No console errors

---

## File Locations

### Documentation
- **Pattern Guide:** `docs/architecture/RESIZABLE_DETAIL_PANEL_PATTERN.md` (complete)
- **Migration Example:** `docs/technical-debt/PLUGIN_TRACES_DETAIL_PANEL_MIGRATION.md`
- **This Summary:** `docs/architecture/RESIZABLE_DETAIL_PANEL_SUMMARY.md`

### Reusable Components
- **TypeScript Base:** `src/shared/infrastructure/ui/sections/ResizableDetailPanelSection.ts`
- **JavaScript Behavior:** `resources/webview/js/behaviors/shared/ResizableDetailPanelBehavior.js`

### Working Reference
- **Metadata Browser Section:** `src/features/metadataBrowser/presentation/sections/MetadataBrowserLayoutSection.ts:288-315`
- **Metadata Browser Behavior:** `resources/webview/js/behaviors/MetadataBrowserBehavior.js:712-862`

### Broken Example (DO NOT COPY)
- **Plugin Traces (Pre-Migration):** `src/features/pluginTraceViewer/presentation/sections/PluginTraceDetailSection.ts`

---

## Decision Record

**Date:** 2025-11-20

**Decision:** Static Structure with Targeted Updates

**Alternatives Considered:**
1. Dynamic Rendering (current broken approach)
2. Hybrid (mix of static and dynamic)

**Rationale:**
- Metadata Browser proves pattern works reliably
- Plugin Traces proves dynamic rendering breaks
- Static structure = listeners never lost = resize always works
- ID selectors = explicit, fast, debuggable
- Targeted updates = efficient, preserves event listeners

**Stakeholders:**
- Design Architect (pattern designer)
- Code Guardian (pattern reviewer)
- Future implementers (developers building new features)

**Status:** APPROVED - Use for all future resizable detail panels

---

## Next Steps

### Immediate (Sprint 1)
1. Migrate Plugin Traces to canonical pattern
2. Test thoroughly (resize, persistence, tabs)
3. Update CLAUDE.md to reference this pattern

### Short-term (Sprint 2-3)
1. Extract Metadata Browser to use base class
2. Verify both features work identically
3. Document any edge cases discovered

### Long-term (Sprint 4+)
1. Consider extracting JavaScript to shared behavior class
2. Evaluate VS Code native panel API (if available)
3. Apply pattern to other features (Import Jobs, Solution Explorer)

---

## Questions & Support

**Where to find help:**
1. Read `RESIZABLE_DETAIL_PANEL_PATTERN.md` for complete pattern
2. Review `PLUGIN_TRACES_DETAIL_PANEL_MIGRATION.md` for step-by-step example
3. Reference Metadata Browser implementation (working example)
4. Ask Design Architect for architectural questions
5. Ask Code Guardian for implementation review

**Common questions:**

**Q: Can I use dynamic rendering for simpler cases?**
A: No. Always use static structure. Consistency prevents bugs.

**Q: Can I use class selectors instead of IDs?**
A: No. IDs are explicit and reliable. Class selectors are fragile.

**Q: Do I need to clean up event listeners?**
A: No. Listeners remain attached forever. Panel just hides/shows.

**Q: Can I customize the resize constraints?**
A: Yes. MIN_WIDTH and MAX_WIDTH configurable in setupDetailPanelResize().

**Q: What if I need more than 4 tabs?**
A: No limit. Add as many tabs as needed to config.

---

## Related Patterns

- **Panel Architecture:** `docs/architecture/PANEL_ARCHITECTURE.md`
- **Clean Architecture:** `docs/architecture/CLEAN_ARCHITECTURE_GUIDE.md`
- **Panel Development Guide:** `.claude/templates/PANEL_DEVELOPMENT_GUIDE.md`

---

**Remember:** Static structure, targeted updates, one-time setup. This pattern eliminates entire class of resize/persistence bugs.
