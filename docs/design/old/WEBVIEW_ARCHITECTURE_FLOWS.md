# Webview Panel Architecture - Visual Flow Diagrams

**Visual representations of the data-driven webview architecture.**

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    VS Code Extension Host                    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Backend (TypeScript)                    │   │
│  │                                                       │   │
│  │  ┌───────────────┐    ┌────────────────┐           │   │
│  │  │ Domain Layer  │    │ Use Cases      │           │   │
│  │  │ (Entities)    │───▶│ (Orchestrate)  │           │   │
│  │  └───────────────┘    └────────────────┘           │   │
│  │                              │                       │   │
│  │                              ▼                       │   │
│  │                       ┌────────────────┐            │   │
│  │                       │   Mappers      │            │   │
│  │                       │ (Entity→VM)    │            │   │
│  │                       └────────────────┘            │   │
│  │                              │                       │   │
│  │                              ▼                       │   │
│  │                       ┌────────────────┐            │   │
│  │                       │  ViewModels    │            │   │
│  │                       │   (DTOs)       │            │   │
│  │                       └────────────────┘            │   │
│  │                              │                       │   │
│  │                              ▼                       │   │
│  │                       ┌────────────────┐            │   │
│  │                       │ Panel          │            │   │
│  │                       │ Coordinator    │            │   │
│  │                       └────────────────┘            │   │
│  └───────────────────────────────┬─────────────────────┘   │
│                                  │ postMessage()            │
│                                  │ (ViewModels)             │
└──────────────────────────────────┼──────────────────────────┘
                                   │
                      ═════════════▼═════════════
                      ║   Message Boundary    ║
                      ║   (JSON over wire)    ║
                      ═════════════╦═════════════
                                   │
┌──────────────────────────────────┼──────────────────────────┐
│                    Webview (Isolated Iframe)                 │
│                                  ▼                           │
│  ┌───────────────────────────────────────────────────────┐  │
│  │            Frontend (JavaScript)                      │  │
│  │                                                         │  │
│  │  ┌────────────────┐     ┌────────────────┐          │  │
│  │  │ Message        │     │ Rendering      │          │  │
│  │  │ Handler        │────▶│ Functions      │          │  │
│  │  └────────────────┘     └────────────────┘          │  │
│  │                              │                        │  │
│  │                              ▼                        │  │
│  │                       ┌────────────────┐             │  │
│  │                       │  DOM Updates   │             │  │
│  │                       │  (Targeted)    │             │  │
│  │                       └────────────────┘             │  │
│  │                                                         │  │
│  │  ┌────────────────────────────────────────┐          │  │
│  │  │      Event Listeners (Persistent)      │          │  │
│  │  │  - Button clicks                       │          │  │
│  │  │  - Dropdown selections                 │          │  │
│  │  │  - Search input                        │          │  │
│  │  │  - Row clicks                          │          │  │
│  │  └────────────────────────────────────────┘          │  │
│  └───────────────────────────────────────────────────────┘  │
│                              │                               │
│                              ▼                               │
│                        ┌──────────┐                          │
│                        │   DOM    │                          │
│                        │ (HTML)   │                          │
│                        └──────────┘                          │
└──────────────────────────────────────────────────────────────┘
```

---

## Flow 1: Initial Panel Load

```
User Opens Panel
      │
      ▼
┌─────────────────────────────────────────────┐
│  Backend: Create Panel                      │
│  - Initialize PanelCoordinator              │
│  - Generate structural HTML (ONE TIME)      │
│  - Set webview.html = structuralHtml        │
└─────────────────────┬───────────────────────┘
                      │
                      │ HTML document
                      ▼
┌─────────────────────────────────────────────┐
│  Webview: DOM Created                       │
│  - <div id="tableContainer"></div>          │
│  - <div id="toolbar"></div>                 │
│  - <div id="detailPanel"></div>             │
│  - Empty containers (no data yet)           │
└─────────────────────┬───────────────────────┘
                      │
                      │ Load JavaScript
                      ▼
┌─────────────────────────────────────────────┐
│  Frontend: Initialize                       │
│  - Attach event listeners                   │
│  - Render table structure (headers)         │
│  - Send 'ready' message to backend          │
└─────────────────────┬───────────────────────┘
                      │
                      │ postMessage({ command: 'ready' })
                      ▼
┌─────────────────────────────────────────────┐
│  Backend: Handle 'ready'                    │
│  - Execute use case                         │
│  - Map entities → ViewModels                │
│  - Send ViewModels to frontend              │
└─────────────────────┬───────────────────────┘
                      │
                      │ postMessage({
                      │   command: 'updateTableData',
                      │   data: [...viewModels]
                      │ })
                      ▼
┌─────────────────────────────────────────────┐
│  Frontend: Render Data                      │
│  - Receive ViewModels                       │
│  - Create table rows                        │
│  - Append to <tbody>                        │
│  - Apply styling                            │
└─────────────────────┬───────────────────────┘
                      │
                      ▼
                 Panel Ready
       (Event listeners working ✅)
```

---

## Flow 2: User Refreshes Data

```
User Clicks "Refresh" Button
      │
      ▼
┌─────────────────────────────────────────────┐
│  Frontend: Button Click Handler             │
│  - Event listener fires (still attached ✅) │
│  - Send command to backend                  │
└─────────────────────┬───────────────────────┘
                      │
                      │ postMessage({ command: 'refresh' })
                      ▼
┌─────────────────────────────────────────────┐
│  Backend: Handle 'refresh'                  │
│  - Show loading spinner (optional)          │
│  - Execute GetPluginTracesUseCase           │
│  - Fetch from Dataverse                     │
│  - Domain: PluginTrace entities             │
└─────────────────────┬───────────────────────┘
                      │
                      │ Domain entities
                      ▼
┌─────────────────────────────────────────────┐
│  Backend: Map to ViewModels                 │
│  - PluginTraceViewModelMapper.toViewModel() │
│  - Format dates, durations, status          │
│  - Display-ready strings                    │
└─────────────────────┬───────────────────────┘
                      │
                      │ ViewModels (DTOs)
                      ▼
┌─────────────────────────────────────────────┐
│  Backend: Send to Frontend                  │
│  - postMessage({                            │
│      command: 'updateTableData',            │
│      data: [...viewModels]                  │
│    })                                       │
└─────────────────────┬───────────────────────┘
                      │
                      │ JSON ViewModels
                      ▼
┌─────────────────────────────────────────────┐
│  Frontend: Render Updated Data              │
│  - Clear <tbody> innerHTML                  │
│  - Create new rows from ViewModels          │
│  - Append rows to <tbody>                   │
│  - Re-apply row striping                    │
│  - Update record count                      │
└─────────────────────┬───────────────────────┘
                      │
                      ▼
           Table Updated (Targeted)
      ┌──────────────────────────────┐
      │ Event Listeners:             │
      │ - Refresh button ✅ WORKS   │
      │ - Search input ✅ WORKS     │
      │ - Dropdowns ✅ WORK         │
      │ - Row clicks ✅ WORK        │
      └──────────────────────────────┘
```

**Key:** Only `<tbody>` updated. Event listeners on toolbar, search, dropdowns UNTOUCHED.

---

## Flow 3: User Changes Dropdown Selection

```
User Clicks Trace Level Dropdown Item
      │
      ▼
┌─────────────────────────────────────────────┐
│  Frontend: Dropdown Item Click              │
│  - Event handler fires                      │
│  - Extract itemId ("1" for Exception)       │
│  - Close dropdown menu                      │
└─────────────────────┬───────────────────────┘
                      │
                      │ postMessage({
                      │   command: 'setTraceLevel',
                      │   data: { level: 'Exception' }
                      │ })
                      ▼
┌─────────────────────────────────────────────┐
│  Backend: Handle 'setTraceLevel'            │
│  - Validate level                           │
│  - Execute SetTraceLevelUseCase             │
│  - Update Dataverse setting                 │
│  - Update internal state                    │
└─────────────────────┬───────────────────────┘
                      │
                      │ Success
                      ▼
┌─────────────────────────────────────────────┐
│  Backend: Send State Update                 │
│  - postMessage({                            │
│      command: 'updateDropdownState',        │
│      data: {                                │
│        dropdownId: 'traceLevelDropdown',    │
│        selectedItemId: '1',                 │
│        buttonLabel: 'Trace Level: Exception'│
│      }                                      │
│    })                                       │
└─────────────────────┬───────────────────────┘
                      │
                      │ DropdownStateViewModel
                      ▼
┌─────────────────────────────────────────────┐
│  Frontend: Update Dropdown UI               │
│  - Find dropdown button                     │
│  - Update button label text                 │
│  - Update checkmarks in menu items          │
│  - (Dropdown click handler still attached)  │
└─────────────────────┬───────────────────────┘
                      │
                      ▼
         Dropdown Updated (Targeted)
      ┌──────────────────────────────┐
      │ Dropdown state synchronized  │
      │ Click handler ✅ WORKS       │
      │ Selection persists ✅        │
      └──────────────────────────────┘
```

**Key:** Only dropdown button label and checkmarks updated. Menu event handlers UNTOUCHED.

---

## Flow 4: User Opens Detail Panel

```
User Clicks Trace Row Link
      │
      ▼
┌─────────────────────────────────────────────┐
│  Frontend: Row Link Click                   │
│  - Event handler fires                      │
│  - Extract traceId from data attribute      │
│  - Highlight row (CSS class)                │
└─────────────────────┬───────────────────────┘
                      │
                      │ postMessage({
                      │   command: 'viewDetail',
                      │   data: { traceId: '123' }
                      │ })
                      ▼
┌─────────────────────────────────────────────┐
│  Backend: Handle 'viewDetail'               │
│  - Find trace in memory (this.traces[])     │
│  - Map to PluginTraceDetailViewModel        │
│  - Format all fields for display            │
└─────────────────────┬───────────────────────┘
                      │
                      │ DetailViewModel
                      ▼
┌─────────────────────────────────────────────┐
│  Backend: Send Detail Data                  │
│  - postMessage({                            │
│      command: 'updateDetailPanel',          │
│      data: { ...detailViewModel }           │
│    })                                       │
│  - postMessage({                            │
│      command: 'showDetailPanel'             │
│    })                                       │
└─────────────────────┬───────────────────────┘
                      │
                      │ Two messages
                      ▼
┌─────────────────────────────────────────────┐
│  Frontend: Render Detail Panel              │
│  - Receive DetailViewModel                  │
│  - Generate detail HTML                     │
│  - Update #detailPanelContent innerHTML     │
│  - Re-attach tab switching handlers         │
│  - Show detail panel (CSS animation)        │
└─────────────────────┬───────────────────────┘
                      │
                      ▼
      Detail Panel Visible (Slide In)
      ┌──────────────────────────────┐
      │ Detail panel shown ✅        │
      │ Tab switching works ✅       │
      │ Close button works ✅        │
      │ Table still interactive ✅   │
      └──────────────────────────────┘
```

**Key:** Detail panel content updated. Main table event handlers UNTOUCHED.

---

## Comparison: Before vs After

### Before (Full HTML Replacement)

```
User Action (Refresh, Dropdown, Detail)
      │
      ▼
Backend Generates ENTIRE HTML Document
      │
      ├─ <html>
      ├─ <head> (CSS, JS)
      ├─ <body>
      │   ├─ Toolbar HTML
      │   ├─ Table HTML (100 rows)
      │   ├─ Detail Panel HTML
      │   └─ Footer HTML
      └─ </body>
      │
      ▼
webview.html = fullHtml
      │
      ▼
DOM DESTROYED AND RECREATED
      │
      ├─ All event listeners LOST ❌
      ├─ Dropdown click handlers GONE ❌
      ├─ Search input handler GONE ❌
      ├─ Row click handlers GONE ❌
      └─ Sorting handlers GONE ❌
      │
      ▼
postMessage({ command: 'htmlUpdated' })
      │
      ▼
Frontend Re-initializes Event Listeners
      │
      ├─ initializeDropdowns()
      ├─ wireSearch()
      └─ wireSorting()
      │
      ▼
Event Listeners Attached Again
(But broken if any update happens before re-init completes)
```

**Problem:** Race condition. DOM destroyed before listeners re-attached.

---

### After (Data-Driven Rendering)

```
User Action (Refresh)
      │
      ▼
Backend Sends ViewModels (Data Only)
      │
      └─ postMessage({
           command: 'updateTableData',
           data: [...viewModels]
         })
      │
      ▼
Frontend Receives ViewModels
      │
      ▼
Update Specific DOM Section ONLY
      │
      └─ tbody.innerHTML = ''
         viewModels.forEach(vm => {
           tbody.appendChild(createRow(vm))
         })
      │
      ▼
DOM Updated (Targeted)
      │
      ├─ <tbody> replaced
      ├─ Toolbar UNTOUCHED ✅
      ├─ Dropdowns UNTOUCHED ✅
      ├─ Search input UNTOUCHED ✅
      └─ Detail panel UNTOUCHED ✅
      │
      ▼
Event Listeners Survive ✅
      │
      ├─ Dropdown handlers WORK ✅
      ├─ Search handler WORKS ✅
      ├─ Button handlers WORK ✅
      └─ Sorting handlers WORK ✅
```

**Solution:** No race condition. Event listeners never destroyed.

---

## Architecture Layers

```
┌────────────────────────────────────────────────────┐
│              Domain Layer (Backend)                 │
│  ┌────────────────────────────────────────────┐   │
│  │  PluginTrace Entity (Rich Model)           │   │
│  │  - isException(): boolean                   │   │
│  │  - getDuration(): Duration                  │   │
│  │  - hasCorrelationId(): boolean              │   │
│  │  - formatMessageBlock(): string             │   │
│  └────────────────────────────────────────────┘   │
│                                                     │
│  ┌────────────────────────────────────────────┐   │
│  │  IPluginTraceRepository (Interface)        │   │
│  └────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────┘
                      ▲
                      │ Domain entities
                      │
┌────────────────────────────────────────────────────┐
│           Application Layer (Backend)               │
│  ┌────────────────────────────────────────────┐   │
│  │  GetPluginTracesUseCase                    │   │
│  │  - execute(): PluginTrace[]                │   │
│  │  - Orchestrates repository + domain        │   │
│  └────────────────────────────────────────────┘   │
│                      │                              │
│                      ▼ Map                          │
│  ┌────────────────────────────────────────────┐   │
│  │  PluginTraceViewModelMapper                │   │
│  │  - toTableRowViewModel(entity): ViewModel  │   │
│  │  - toDetailViewModel(entity): DetailVM     │   │
│  └────────────────────────────────────────────┘   │
│                      │                              │
│                      ▼                              │
│  ┌────────────────────────────────────────────┐   │
│  │  ViewModels (DTOs)                         │   │
│  │  - PluginTraceTableRowViewModel            │   │
│  │  - PluginTraceDetailViewModel              │   │
│  │  - DropdownStateViewModel                  │   │
│  └────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────┘
                      │
                      │ postMessage(ViewModels)
                      ▼
         ═════════════════════════════
         ║   Message Boundary       ║
         ║   (JSON over wire)       ║
         ═════════════════════════════
                      │
                      ▼
┌────────────────────────────────────────────────────┐
│          Presentation Layer (Frontend)              │
│  ┌────────────────────────────────────────────┐   │
│  │  Message Handler                           │   │
│  │  - Receives ViewModels                     │   │
│  │  - Routes to rendering functions           │   │
│  └────────────────────────────────────────────┘   │
│                      │                              │
│                      ▼                              │
│  ┌────────────────────────────────────────────┐   │
│  │  Rendering Functions                       │   │
│  │  - renderTableData(viewModels)             │   │
│  │  - renderDetailPanel(detailVM)             │   │
│  │  - updateDropdownState(dropdownVM)         │   │
│  └────────────────────────────────────────────┘   │
│                      │                              │
│                      ▼                              │
│  ┌────────────────────────────────────────────┐   │
│  │  DOM Manipulation                          │   │
│  │  - createElement(), appendChild()          │   │
│  │  - Targeted updates (no full replacement)  │   │
│  └────────────────────────────────────────────┘   │
│                      │                              │
│                      ▼                              │
│  ┌────────────────────────────────────────────┐   │
│  │  Event Listeners (Persistent)              │   │
│  │  - Attached once on initialization         │   │
│  │  - Survive all DOM updates                 │   │
│  └────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────┘
```

---

## Summary

**Key Principle:** Backend owns data, Frontend owns rendering.

**Critical Rules:**
1. `webview.html = ...` happens EXACTLY ONCE (initial load)
2. All subsequent updates via `postMessage(ViewModels)`
3. Frontend performs targeted DOM updates (not full replacement)
4. Event listeners attached once, persist forever

**Result:** Functional, maintainable, architecturally correct webview panels.
