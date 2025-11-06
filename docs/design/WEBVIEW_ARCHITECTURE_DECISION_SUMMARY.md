# Webview Panel Architecture - Decision Summary

**TL;DR:** Backend sends data (ViewModels), frontend renders HTML. No more full DOM replacement.

---

## The Core Problem

**Current architecture destroys event listeners on every update:**

```typescript
// Current (WRONG):
webview.html = generateFullHtml(data); // ❌ Destroys entire DOM
// Result: Dropdowns, search, sorting all STOP WORKING
```

**Why it fails:**
- Setting `webview.html` replaces entire document
- All JavaScript event listeners lost
- User interactions broken after ANY state change

---

## The Architectural Decision

**Backend generates HTML → Backend sends ViewModels ✅**

### Before (HTML Generation - Wrong Layer)

```typescript
// Backend (TypeScript) - WRONG
class DropdownSection {
    render(data: SectionRenderData): string {
        return `<div class="dropdown">
            <button>${label}</button>
            <div class="menu">...</div>
        </div>`; // ❌ Presentation logic in wrong layer
    }
}

webview.html = scaffolding.compose(data); // ❌ Full replacement
```

### After (ViewModels - Correct Layer)

```typescript
// Backend (TypeScript) - CORRECT
class PluginTraceViewerPanel {
    async handleRefresh(): Promise<void> {
        const traces = await this.useCase.execute();
        const viewModels = traces.map(t => this.mapper.toViewModel(t));

        // ✅ Send data only
        await this.webview.postMessage({
            command: 'updateTableData',
            data: viewModels
        });
    }
}

// Frontend (JavaScript) - CORRECT
function renderTableData(viewModels) {
    const tbody = document.querySelector('tbody');
    tbody.innerHTML = ''; // ✅ Clear rows only, not entire DOM

    viewModels.forEach(vm => {
        const row = createTableRow(vm);
        tbody.appendChild(row);
    });
}
```

---

## Why This is Architecturally Correct

### Clean Architecture Compliance

**Layers:**
```
Presentation Layer (Frontend JS)   ─┐
                                     ├──→ Application Layer (ViewModels) ──→ Domain Layer
Infrastructure Layer (VS Code API) ─┘
```

**Before (Violation):**
- Backend (Application/Infrastructure) generates HTML (Presentation concern) ❌
- Presentation logic scattered across layers ❌

**After (Correct):**
- Backend (Application) provides ViewModels (DTOs) ✅
- Frontend (Presentation) renders HTML from ViewModels ✅
- Presentation logic isolated in Presentation layer ✅

### Separation of Concerns

**Backend responsibilities:**
- Execute business logic (use cases)
- Orchestrate domain entities
- Map entities → ViewModels
- Send data to frontend

**Frontend responsibilities:**
- Render ViewModels as HTML
- Handle user interactions
- Maintain event listeners
- Client-side filtering, sorting

**Before:** Backend did BOTH (wrong)
**After:** Clear separation (correct)

---

## Data Flow

### Initial Load (Once)

```
Backend: Set webview.html = structural HTML (empty containers)
    ↓
Frontend: Attach event listeners (once)
    ↓
Frontend: Send 'ready' message
    ↓
Backend: Send ViewModels
    ↓
Frontend: Render data into containers
```

**Key:** `webview.html` set EXACTLY ONCE. Everything else is data messages.

---

### Data Update (95% of operations)

```
User clicks "Refresh"
    ↓
Frontend: postMessage({ command: 'refresh' })
    ↓
Backend: Execute use case
    ↓
Backend: Map entities → ViewModels
    ↓
Backend: postMessage({ command: 'updateTableData', data: [...viewModels] })
    ↓
Frontend: Update DOM (targeted: replace <tbody> rows only)
    ↓
Event listeners still attached ✅
```

**Key:** Targeted DOM updates. No full HTML replacement.

---

## Message Protocol

### Backend → Frontend (Data)

```typescript
type BackendMessage =
    | { command: 'updateTableData'; data: PluginTraceViewModel[] }
    | { command: 'updateDetailPanel'; data: DetailViewModel | null }
    | { command: 'updateDropdownState'; data: DropdownStateViewModel }
    | { command: 'showDetailPanel' }
    | { command: 'hideDetailPanel' };
```

### Frontend → Backend (Commands)

```typescript
type FrontendMessage =
    | { command: 'ready' }
    | { command: 'refresh' }
    | { command: 'viewDetail'; data: { traceId: string } }
    | { command: 'setTraceLevel'; data: { level: string } };
```

---

## What Changes in Code

### Backend Changes

**Remove:**
```typescript
// ❌ Remove all HTML generation after initial load
class DropdownSection {
    render(): string { return `<div>...</div>`; } // DELETE
}
```

**Add:**
```typescript
// ✅ Send ViewModels instead
await this.webview.postMessage({
    command: 'updateDropdownState',
    data: {
        dropdownId: 'traceLevelDropdown',
        selectedItemId: '1',
        buttonLabel: 'Trace Level: Exception'
    }
});
```

### Frontend Changes

**Add rendering functions:**
```javascript
// ✅ Frontend renders ViewModels
function renderTableData(viewModels) {
    const tbody = document.querySelector('tbody');
    tbody.innerHTML = '';

    viewModels.forEach(vm => {
        const row = createTableRow(vm);
        tbody.appendChild(row);
    });
}

function createTableRow(vm) {
    const row = document.createElement('tr');
    // ... build row from ViewModel
    return row;
}
```

**Attach listeners once:**
```javascript
// ✅ Event listeners attached once, work forever
function initialize() {
    document.getElementById('refreshBtn').addEventListener('click', () => {
        vscode.postMessage({ command: 'refresh' });
    });

    window.addEventListener('message', handleBackendMessage);
}
```

---

## Benefits

### Functional
- ✅ Event listeners survive updates
- ✅ Dropdowns, search, sorting work after refresh
- ✅ Smooth transitions (no DOM flash)
- ✅ Client-side filtering fast (no backend round-trip)

### Architectural
- ✅ Clean Architecture compliance
- ✅ Presentation logic in Presentation layer
- ✅ Backend focuses on business logic
- ✅ Clear separation of concerns

### Maintainability
- ✅ Reusable pattern for all panels
- ✅ Type-safe ViewModels (TypeScript backend)
- ✅ Testable (mock postMessage)
- ✅ Scalable (add panels easily)

---

## Migration Path

### Phase 1: Proof of Concept
- Implement data-driven table (Plugin Trace Viewer)
- Validate pattern works
- Compare with current implementation

### Phase 2: Extend to All Controls
- Dropdowns, detail panel, toolbar
- Remove all HTML generation from backend
- Test: All interactions work after updates

### Phase 3: Replace Current Implementation
- Swap old panel with new
- Verify no regressions
- Remove old code

### Phase 4: Generalize Pattern
- Extract reusable base classes
- Document for other developers
- Apply to other panels (Solution Explorer, Import Job Viewer)

---

## Implementation Checklist

**Backend (TypeScript):**
- [ ] Remove HTML generation classes (DropdownSection.render(), etc.)
- [ ] Keep initial scaffolding ONLY (structural HTML, one-time)
- [ ] Add ViewModel definitions
- [ ] Add postMessage calls for data updates
- [ ] Add message routing (PanelCoordinator)

**Frontend (JavaScript):**
- [ ] Add rendering functions (renderTableData, renderDetailPanel, etc.)
- [ ] Attach event listeners once (initialize())
- [ ] Add message handlers (handleBackendMessage)
- [ ] Implement targeted DOM updates
- [ ] Preserve state across updates (search filter, sort order)

**Testing:**
- [ ] Manual: Refresh works, event listeners survive
- [ ] Manual: Search, sort, dropdowns work after refresh
- [ ] Manual: Detail panel opens/closes smoothly
- [ ] Unit: ViewModel mapping correct
- [ ] Integration: Message routing works

---

## Decision Summary

**Question:** Where should HTML generation happen?

**Answer:** Frontend (JavaScript) renders ViewModels from backend (TypeScript).

**Rationale:**
1. **Architecturally correct** - Presentation logic in Presentation layer
2. **Functional** - Event listeners survive updates
3. **Maintainable** - Clear separation of concerns
4. **Scalable** - Reusable pattern for all panels

**Trade-off:** Less type safety in frontend JavaScript (acceptable, can add validation).

**Outcome:** Ground-up refactor following Clean Architecture principles.

---

**Status:** Design complete, ready for implementation.

**Next:** Review design → Implement MVP (Slice 1) → Validate pattern → Proceed to full implementation.
