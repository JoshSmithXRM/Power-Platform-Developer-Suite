# Resizable Detail Panel - Documentation Index

## Overview

This index organizes all documentation related to the **Resizable Detail Panel Canonical Pattern**.

**Pattern Status:** APPROVED (2025-11-20)

**Use for:** All right-side resizable detail panels in VS Code webviews

---

## Core Documentation

### 1. Summary (START HERE)
**File:** `RESIZABLE_DETAIL_PANEL_SUMMARY.md`

**Purpose:** Quick reference with 60-second pattern overview

**Audience:** All developers

**Contains:**
- Pattern in 60 seconds (code snippets)
- Key principles (5 rules)
- ID naming conventions
- Common mistakes and solutions
- Implementation checklist
- Decision record

**Read first:** Get the big picture in 5 minutes

---

### 2. Complete Pattern Guide
**File:** `RESIZABLE_DETAIL_PANEL_PATTERN.md`

**Purpose:** Comprehensive pattern specification

**Audience:** Implementers, reviewers, architects

**Contains:**
- Architectural decision rationale
- Layer-by-layer implementation (TypeScript, JavaScript, CSS)
- Type contracts (ViewModels, messages)
- State persistence flow
- Naming conventions
- Event listener patterns
- Migration guide (Plugin Traces)
- Usage guide (new features)
- Common pitfalls with solutions
- Future enhancements roadmap

**Read when:** Implementing a new feature or migrating existing code

---

## Reusable Components

### TypeScript Base Class
**File:** `../../src/shared/infrastructure/ui/sections/ResizableDetailPanelSection.ts`

**Purpose:** Base class for detail panel sections

**Exports:**
- `ResizableDetailPanelSection` (abstract class)
- `ResizableDetailPanelConfig` (interface)

**Usage:**
```typescript
export class MyDetailSection extends ResizableDetailPanelSection {
    constructor() {
        super({
            featurePrefix: 'myFeature',
            tabs: [{ id: 'overview', label: 'Overview', isDefault: true }]
        });
    }
}
```

---

### JavaScript Behavior Module
**File:** `../../resources/webview/js/behaviors/shared/ResizableDetailPanelBehavior.js`

**Purpose:** Shared behavior for resize, show/hide, tab switching

**Exports:**
- `ResizableDetailPanelBehavior` (class)
- `escapeHtml()` (utility function)

**Usage:**
```javascript
import { ResizableDetailPanelBehavior } from './shared/ResizableDetailPanelBehavior.js';

const detailPanel = new ResizableDetailPanelBehavior({
    featurePrefix: 'myFeature',
    renderTabs: {
        overview: (data) => renderOverview(data)
    }
});
detailPanel.initialize();
```

---

## Reference Implementations

### Working Example: Metadata Browser
**Files:**
- Section: `../../src/features/metadataBrowser/presentation/sections/MetadataBrowserLayoutSection.ts:288-315`
- Behavior: `../../resources/webview/js/behaviors/MetadataBrowserBehavior.js:712-862`
- CSS: `../../resources/webview/css/features/metadata-browser.css`

**What works:**
- Resize handle never destroyed
- Width persists across open/close
- Targeted updates via getElementById
- One-time listener setup

**Use as:** Reference when implementing canonical pattern

---

### Broken Example: Plugin Traces (Pre-Migration)
**Files:**
- Section: `../../src/features/pluginTraceViewer/presentation/sections/PluginTraceDetailSection.ts`
- Renderer: `../../resources/webview/js/renderers/DetailPanelRenderer.js`
- Behavior: `../../resources/webview/js/behaviors/PluginTraceViewerBehavior.js:108-341`

**What breaks:**
- Dynamic rendering destroys resize handle
- Class selectors fail silently
- Width doesn't persist
- Listeners reattached on every update

**Use as:** Anti-pattern (what NOT to do)

---

## Related Documentation

### Panel Development Guide
**File:** `.claude/templates/PANEL_DEVELOPMENT_GUIDE.md`

**Relation:** Detail panels follow the panel development patterns

**Key Concepts:**
- SectionPosition.Detail
- PanelLayout.SplitHorizontal
- SectionCompositionBehavior

---

## Decision Timeline

1. **2025-11-20:** Problem identified (Plugin Traces resize broken)
2. **2025-11-20:** Investigation completed (compare Metadata Browser vs Plugin Traces)
3. **2025-11-20:** Pattern designed (Static Structure with Targeted Updates)
4. **2025-11-20:** Components created (base class, behavior module)
5. **2025-11-20:** Documentation completed (pattern, migration, summary)
6. **2025-11-20:** Pattern APPROVED for production use

---

## Quick Navigation

**I want to...**

- **Understand the pattern quickly** → Read `RESIZABLE_DETAIL_PANEL_SUMMARY.md`
- **Implement a new feature** → Read `RESIZABLE_DETAIL_PANEL_PATTERN.md` Usage Guide
- **Use base class** → Import `ResizableDetailPanelSection.ts`
- **Use behavior module** → Import `ResizableDetailPanelBehavior.js`
- **See working example** → Review Metadata Browser implementation
- **Understand the decision** → Read `RESIZABLE_DETAIL_PANEL_PATTERN.md` Architectural Decision section

---

## Support

**Questions?**
1. Check `RESIZABLE_DETAIL_PANEL_SUMMARY.md` Common Mistakes section
2. Review `RESIZABLE_DETAIL_PANEL_PATTERN.md` Common Pitfalls section
3. Examine Metadata Browser reference implementation
4. Consult Design Architect for architectural questions
5. Consult Code Guardian for implementation review

**Found a bug?**
1. File issue with `[Resizable Detail Panel]` prefix
2. Include reproduction steps
3. Reference this documentation
4. Tag Design Architect and Code Guardian

---

**Last Updated:** 2025-11-20

**Pattern Owner:** Design Architect

**Reviewers:** Code Guardian, Senior Developers
