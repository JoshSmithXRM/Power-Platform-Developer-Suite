# Webview Panel Architecture Design

**Design Architect: Claude Code**
**Date: 2025-11-06**
**Status: Ground-Up Refactor - Architecturally Correct Design**

---

## Business Value

**Problem:** Current webview panels replace entire HTML on every update, destroying the DOM and losing all JavaScript event listeners. Dropdowns, search, sorting, and other interactive controls stop working after any state change. This makes panels non-functional for real-world usage.

**Solution:** Data-driven architecture where backend sends ViewModels (data) to frontend, and frontend updates DOM using targeted JavaScript. Event listeners attach once and persist across updates. Backend orchestrates business logic, frontend handles presentation logic.

**Value:** Functional, maintainable panel architecture following Clean Architecture principles. All panels (Plugin Trace Viewer, Solution Explorer, Import Job Viewer) benefit from this pattern. Interactive controls work reliably. Code is testable, type-safe, and scalable.

---

## Complexity Assessment

**Complexity:** Complex

**Rationale:**
- Touches 3 architectural layers (Application, Infrastructure, Presentation)
- Changes communication contract between backend and frontend
- Requires refactoring existing panels (Plugin Trace Viewer as pilot)
- Introduces new patterns (data-driven updates, state synchronization)
- High impact: All future panels must follow this architecture
- Architectural correctness is paramount (not a quick fix)

---

## Architecture Decision: Data-Driven Frontend Rendering

### The Fundamental Choice

**Backend generates HTML (current approach):**
- ❌ Full DOM replacement destroys event listeners
- ❌ Backend (TypeScript) handles presentation logic (wrong layer)
- ❌ Frontend (JavaScript) becomes passive (just attaches listeners once)
- ❌ State changes require full HTML regeneration
- ❌ Cannot do targeted updates
- ✅ Type safety in HTML generation (minor benefit)

**Frontend renders from ViewModels (correct approach):**
- ✅ Targeted DOM updates preserve event listeners
- ✅ Presentation logic lives in Presentation layer (correct)
- ✅ Backend sends data (ViewModels), frontend renders
- ✅ State changes update only affected DOM nodes
- ✅ Event listeners attach once, work forever
- ❌ Frontend JavaScript less type-safe (acceptable tradeoff)

**Decision: Frontend renders from ViewModels**

**Why this is architecturally correct:**

1. **Clean Architecture compliance:**
   - **Presentation Layer** owns rendering logic (frontend JavaScript)
   - **Application Layer** owns orchestration and ViewModels (backend TypeScript)
   - **Domain Layer** owns business logic (entities with behavior)
   - **Infrastructure Layer** owns external APIs (Dataverse, VS Code APIs)

2. **Separation of concerns:**
   - Backend: "What data does the UI need?" (ViewModels)
   - Frontend: "How should this data be displayed?" (Rendering)
   - Current approach: Backend answers both questions (violation)

3. **Dependency direction:**
   - Presentation depends on Application (ViewModels) ✅
   - Application does NOT depend on Presentation ✅
   - Current approach: Application generates HTML (presentation concern) ❌

4. **Technology alignment:**
   - TypeScript backend: Type-safe business logic, orchestration
   - JavaScript frontend: DOM manipulation, event handling
   - Current approach: TypeScript generates HTML strings (wrong tool)

---

## Implementation Slices

### MVP Slice (Slice 1): Core Data-Driven Pattern

**Goal:** Establish working pattern with Plugin Trace Viewer table

**Deliverables:**
1. ViewModel-based message contract (backend → frontend)
2. Frontend rendering functions (ViewModels → DOM updates)
3. Initial load flow (structural HTML only once)
4. Data update flow (targeted DOM updates)
5. Event listeners persist across updates

**Acceptance Criteria:**
- Table rows update without full HTML replacement
- Search, sorting, row selection work after updates
- Event listeners survive all state changes

### Enhancement Slice 2: Advanced Controls

**Goal:** Extend pattern to dropdowns, detail panels, forms

**Deliverables:**
1. Dropdown state synchronization (selection, enabled/disabled)
2. Detail panel show/hide without HTML replacement
3. Form inputs preserve values across updates

**Acceptance Criteria:**
- Dropdown selection survives data refresh
- Detail panel opens/closes smoothly
- Form state preserved during updates

### Enhancement Slice 3: Type Safety & Validation

**Goal:** Add runtime validation for ViewModels crossing message boundary

**Deliverables:**
1. ViewModel schema validation (JSON Schema or Zod)
2. TypeScript definitions for frontend (if compiling frontend to TS)
3. Dev-mode validation errors

**Acceptance Criteria:**
- Invalid ViewModels caught at runtime
- Clear error messages for schema violations

### Enhancement Slice 4: Generalization & Reusability

**Goal:** Extract reusable patterns for all panels

**Deliverables:**
1. Generic `DataPanel` base class (backend)
2. Reusable frontend rendering utilities
3. Standard message protocol
4. Documentation + templates

**Acceptance Criteria:**
- New panels can adopt pattern with <1 hour setup
- Code reuse >60% between panels

---

## Architecture Design

### Layer Responsibilities

**Domain Layer (No Changes)**
- Business entities with behavior (e.g., `PluginTrace`, `Environment`)
- Value objects (e.g., `TraceLevel`, `Duration`)
- Repository interfaces (e.g., `IPluginTraceRepository`)
- **ZERO rendering logic, ZERO ViewModels**

**Application Layer (Backend TypeScript)**
- **Use cases** orchestrate domain entities
- **ViewModels** (DTOs): Data structures ready for display
- **Mappers** transform domain entities → ViewModels
- **NO HTML generation, NO presentation logic**

**Infrastructure Layer (Backend TypeScript)**
- VS Code webview API wrapper
- Message sending/receiving
- Repository implementations
- External API clients
- **NO rendering logic**

**Presentation Layer (Split: Backend + Frontend)**

**Backend (TypeScript):**
- Panel coordinator (message routing)
- Initial HTML scaffolding (structural, one-time only)
- ViewModel preparation
- **NO content rendering after initial load**

**Frontend (JavaScript):**
- DOM manipulation
- Event listener registration
- Rendering ViewModels to HTML
- Interactive control behavior
- **ALL presentation logic lives here**

---

### Data Flow Architecture

#### Flow 1: Initial Panel Load (Structural HTML - One Time Only)

```
User opens panel
    ↓
Panel.createOrShow() [Presentation Layer - Backend]
    ↓
Generate structural HTML (scaffolding):
    - <html>, <head>, CSS, JS imports
    - Empty containers: <div id="tableContainer"></div>
    - No data, no table rows, no content
    ↓
Set webview.html = structuralHtml (ONLY TIME)
    ↓
Frontend JavaScript initializes:
    - Attach event listeners (once)
    - Send 'ready' message to backend
    ↓
Backend receives 'ready', sends initial data:
    postMessage({ command: 'updateTableData', data: [...viewModels] })
    ↓
Frontend receives ViewModels, renders table:
    - Create <table>, <thead>, <tbody>
    - Populate rows from ViewModels
    - Apply styling, striping
    ↓
Panel displayed with data, all controls functional
```

**Key Principle:** `webview.html = ...` happens EXACTLY ONCE. Everything after is data messages.

---

#### Flow 2: Data Update (95% of operations)

```
User clicks "Refresh" button
    ↓
Frontend: User event → postMessage({ command: 'refresh' })
    ↓
Backend Panel: Receives 'refresh' message
    ↓
PanelCoordinator routes to handler:
    await handleRefresh()
    ↓
Use case executes:
    GetPluginTracesUseCase.execute(envId, filter)
    ↓
Domain entities returned:
    traces: PluginTrace[] (rich domain models)
    ↓
Map to ViewModels:
    viewModels = traces.map(t => mapper.toTableRowViewModel(t))
    ↓
Send ViewModels to frontend:
    postMessage({ command: 'updateTableData', data: viewModels })
    ↓
Frontend receives ViewModels:
    function handleUpdateTableData(viewModels) {
        const tbody = document.querySelector('#tableContainer tbody');
        tbody.innerHTML = ''; // Clear existing rows

        viewModels.forEach(vm => {
            const row = createTableRow(vm);
            tbody.appendChild(row);
        });

        applyRowStriping();
        updateRecordCount(viewModels.length);
    }
    ↓
DOM updated, event listeners still attached:
    - Search input handler: WORKS ✅
    - Dropdown click handlers: WORK ✅
    - Sort header handlers: WORK ✅
    - Row click handlers: WORK ✅
```

**Key Principle:** Targeted DOM updates. Replace `<tbody>` content, not entire HTML document.

---

#### Flow 3: Dropdown State Update

```
User selects trace level "Exception" from dropdown
    ↓
Frontend: Dropdown item click → postMessage({ command: 'setTraceLevel', data: { level: 'Exception' } })
    ↓
Backend: SetTraceLevelUseCase.execute(envId, level)
    ↓
Domain: TraceLevel.fromString('Exception')
    ↓
Backend updates state:
    this.currentTraceLevel = level
    ↓
Send state update to frontend:
    postMessage({
        command: 'updateDropdownState',
        data: {
            dropdownId: 'traceLevelDropdown',
            selectedItemId: '1', // Exception = 1
            buttonLabel: 'Trace Level: Exception'
        }
    })
    ↓
Frontend updates dropdown UI:
    function handleUpdateDropdownState(data) {
        // Update button label
        const button = document.querySelector(`#${data.dropdownId}`);
        button.querySelector('.dropdown-label').textContent = data.buttonLabel;

        // Update checkmarks in menu
        const items = document.querySelectorAll(`[data-dropdown-id="${data.dropdownId}"] .dropdown-item`);
        items.forEach(item => {
            const itemId = item.getAttribute('data-dropdown-item-id');
            const checkmark = item.querySelector('.dropdown-checkmark');
            checkmark.style.display = (itemId === data.selectedItemId) ? 'inline' : 'none';
        });
    }
    ↓
Dropdown reflects new state, click handler still works ✅
```

**Key Principle:** State changes update specific DOM elements, not entire HTML.

---

### Type Contracts

#### Backend (TypeScript) - Application Layer

```typescript
/**
 * ViewModel for table row display.
 *
 * All properties are display-ready strings.
 * Mapped from PluginTrace domain entity.
 */
export interface PluginTraceTableRowViewModel {
    readonly id: string; // Used for row selection, detail view
    readonly createdOn: string; // Pre-formatted: "2025-11-06 14:32:15"
    readonly pluginName: string; // Display text
    readonly entityName: string;
    readonly messageName: string;
    readonly operationType: string;
    readonly mode: string;
    readonly depth: string; // Pre-formatted: "2"
    readonly duration: string; // Pre-formatted: "150ms" or "-"
    readonly status: string; // Display text: "Success", "Failed"
    readonly statusClass: string; // CSS class: "status-success", "status-failed"
}

/**
 * ViewModel for detail panel.
 */
export interface PluginTraceDetailViewModel {
    readonly id: string;
    readonly createdOn: string;
    readonly pluginName: string;
    readonly entityName: string;
    readonly messageName: string;
    readonly operationType: string;
    readonly mode: string;
    readonly stage: string;
    readonly depth: string;
    readonly duration: string;
    readonly executionStartTime: string;
    readonly status: string;
    readonly statusBadgeClass: string;
    readonly exceptionDetails: string; // Pre-formatted HTML (escaped)
    readonly messageBlock: string; // Pre-formatted (escaped)
    readonly configuration: string;
    readonly correlationId: string;
    readonly requestId: string;
}

/**
 * ViewModel for dropdown state.
 */
export interface DropdownStateViewModel {
    readonly dropdownId: string; // e.g., "traceLevelDropdown"
    readonly selectedItemId: string; // e.g., "1" for Exception
    readonly buttonLabel: string; // e.g., "Trace Level: Exception"
    readonly items: ReadonlyArray<DropdownItemViewModel>; // Full item list if changed
}

export interface DropdownItemViewModel {
    readonly id: string;
    readonly label: string;
    readonly icon?: string;
    readonly disabled?: boolean;
}

/**
 * ViewModel for environment selector.
 */
export interface EnvironmentSelectorViewModel {
    readonly currentEnvironmentId: string;
    readonly environments: ReadonlyArray<EnvironmentOptionViewModel>;
}

export interface EnvironmentOptionViewModel {
    readonly id: string;
    readonly displayName: string; // e.g., "Dev (dev.crm.dynamics.com)"
}
```

#### Message Protocol (Backend ↔ Frontend)

```typescript
/**
 * Messages sent from Backend → Frontend (ViewModels)
 */
type BackendToFrontendMessage =
    | { command: 'updateTableData'; data: PluginTraceTableRowViewModel[] }
    | { command: 'updateDetailPanel'; data: PluginTraceDetailViewModel | null }
    | { command: 'updateDropdownState'; data: DropdownStateViewModel }
    | { command: 'updateEnvironmentSelector'; data: EnvironmentSelectorViewModel }
    | { command: 'showDetailPanel' }
    | { command: 'hideDetailPanel' }
    | { command: 'showLoading'; data?: { message?: string } }
    | { command: 'hideLoading' }
    | { command: 'error'; data: { message: string } };

/**
 * Messages sent from Frontend → Backend (Commands)
 */
type FrontendToBackendMessage =
    | { command: 'ready' } // Frontend initialized, request initial data
    | { command: 'refresh' }
    | { command: 'openMaker' }
    | { command: 'environmentChange'; data: { environmentId: string } }
    | { command: 'viewDetail'; data: { traceId: string } }
    | { command: 'closeDetail' }
    | { command: 'deleteSelected'; data: { traceIds: string[] } }
    | { command: 'deleteAll' }
    | { command: 'deleteOld' }
    | { command: 'exportCsv'; data: { traceIds: string[] } }
    | { command: 'exportJson'; data: { traceIds: string[] } }
    | { command: 'setTraceLevel'; data: { level: string } }
    | { command: 'setAutoRefresh'; data: { interval: number } }
    | { command: 'loadRelatedTraces'; data: { correlationId: string } };
```

---

#### Frontend (JavaScript) - Rendering Functions

```javascript
/**
 * Handles message from backend and routes to appropriate handler.
 */
function handleBackendMessage(message) {
    switch (message.command) {
        case 'updateTableData':
            renderTableData(message.data);
            break;
        case 'updateDetailPanel':
            renderDetailPanel(message.data);
            break;
        case 'updateDropdownState':
            updateDropdownState(message.data);
            break;
        case 'updateEnvironmentSelector':
            updateEnvironmentSelector(message.data);
            break;
        case 'showDetailPanel':
            showDetailPanel();
            break;
        case 'hideDetailPanel':
            hideDetailPanel();
            break;
        case 'showLoading':
            showLoadingSpinner(message.data?.message);
            break;
        case 'hideLoading':
            hideLoadingSpinner();
            break;
        case 'error':
            showError(message.data.message);
            break;
    }
}

/**
 * Renders table data from ViewModels.
 *
 * @param {PluginTraceTableRowViewModel[]} viewModels - Display-ready data
 */
function renderTableData(viewModels) {
    const tbody = document.querySelector('#traceTable tbody');
    if (!tbody) {
        console.error('Table tbody not found');
        return;
    }

    // Clear existing rows
    tbody.innerHTML = '';

    // Render each row
    viewModels.forEach(vm => {
        const row = createTableRow(vm);
        tbody.appendChild(row);
    });

    // Apply styling
    applyRowStriping();
    updateRecordCount(viewModels.length);
}

/**
 * Creates table row from ViewModel.
 *
 * @param {PluginTraceTableRowViewModel} vm - View model
 * @returns {HTMLTableRowElement} Table row element
 */
function createTableRow(vm) {
    const row = document.createElement('tr');
    row.setAttribute('data-trace-id', vm.id);

    // Status cell with styling
    const statusCell = document.createElement('td');
    statusCell.className = vm.statusClass;
    statusCell.textContent = vm.status;
    row.appendChild(statusCell);

    // Created date cell
    const createdOnCell = document.createElement('td');
    createdOnCell.textContent = vm.createdOn;
    row.appendChild(createdOnCell);

    // Duration cell
    const durationCell = document.createElement('td');
    durationCell.textContent = vm.duration;
    row.appendChild(durationCell);

    // Operation type cell
    const operationCell = document.createElement('td');
    operationCell.textContent = vm.operationType;
    row.appendChild(operationCell);

    // Entity name cell
    const entityCell = document.createElement('td');
    entityCell.textContent = vm.entityName;
    row.appendChild(entityCell);

    // Message name cell
    const messageCell = document.createElement('td');
    messageCell.textContent = vm.messageName;
    row.appendChild(messageCell);

    // Plugin name cell (clickable link)
    const pluginCell = document.createElement('td');
    const pluginLink = document.createElement('a');
    pluginLink.href = '#';
    pluginLink.textContent = vm.pluginName;
    pluginLink.setAttribute('data-command', 'viewDetail');
    pluginLink.setAttribute('data-trace-id', vm.id);
    pluginLink.addEventListener('click', (e) => {
        e.preventDefault();
        vscode.postMessage({
            command: 'viewDetail',
            data: { traceId: vm.id }
        });
    });
    pluginCell.appendChild(pluginLink);
    row.appendChild(pluginCell);

    // Depth cell
    const depthCell = document.createElement('td');
    depthCell.textContent = vm.depth;
    row.appendChild(depthCell);

    // Mode cell
    const modeCell = document.createElement('td');
    modeCell.textContent = vm.mode;
    row.appendChild(modeCell);

    return row;
}

/**
 * Updates dropdown state (button label, checkmarks).
 *
 * @param {DropdownStateViewModel} stateVM - Dropdown state
 */
function updateDropdownState(stateVM) {
    // Update button label
    const button = document.querySelector(`#${stateVM.dropdownId}`);
    if (button) {
        const labelSpan = button.querySelector('.dropdown-label');
        if (labelSpan) {
            labelSpan.textContent = stateVM.buttonLabel;
        }
    }

    // Update checkmarks in menu items
    const items = document.querySelectorAll(`[data-dropdown-id="${stateVM.dropdownId}"] .dropdown-item`);
    items.forEach(item => {
        const itemId = item.getAttribute('data-dropdown-item-id');
        const checkmark = item.querySelector('.dropdown-checkmark');
        if (checkmark) {
            checkmark.style.display = (itemId === stateVM.selectedItemId) ? 'inline' : 'none';
        }
    });
}

/**
 * Renders detail panel from ViewModel.
 *
 * @param {PluginTraceDetailViewModel | null} vm - Detail view model (null to clear)
 */
function renderDetailPanel(vm) {
    const detailContainer = document.querySelector('#detailPanelContent');
    if (!detailContainer) {
        return;
    }

    if (!vm) {
        detailContainer.innerHTML = '<p>No trace selected</p>';
        return;
    }

    detailContainer.innerHTML = `
        <div class="detail-header">
            <h3>${escapeHtml(vm.pluginName)}</h3>
            <span class="${vm.statusBadgeClass}">${escapeHtml(vm.status)}</span>
        </div>

        <div class="detail-tabs">
            <button class="tab-btn active" data-tab="overview">Overview</button>
            <button class="tab-btn" data-tab="execution">Execution</button>
            <button class="tab-btn" data-tab="exception">Exception</button>
        </div>

        <div class="tab-content active" id="tab-overview">
            <div class="detail-row">
                <span class="detail-label">Entity:</span>
                <span class="detail-value">${escapeHtml(vm.entityName)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Message:</span>
                <span class="detail-value">${escapeHtml(vm.messageName)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Operation:</span>
                <span class="detail-value">${escapeHtml(vm.operationType)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Duration:</span>
                <span class="detail-value">${escapeHtml(vm.duration)}</span>
            </div>
        </div>

        <div class="tab-content" id="tab-execution">
            <div class="detail-row">
                <span class="detail-label">Stage:</span>
                <span class="detail-value">${escapeHtml(vm.stage)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Mode:</span>
                <span class="detail-value">${escapeHtml(vm.mode)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Depth:</span>
                <span class="detail-value">${escapeHtml(vm.depth)}</span>
            </div>
        </div>

        <div class="tab-content" id="tab-exception">
            <pre>${escapeHtml(vm.exceptionDetails || 'No exception')}</pre>
        </div>
    `;

    // Re-attach tab switching handlers
    setupDetailPanelTabs();
}

/**
 * Shows detail panel (slide in from right).
 */
function showDetailPanel() {
    const detailPanel = document.querySelector('#detailPanel');
    if (detailPanel) {
        detailPanel.classList.remove('hidden');
        detailPanel.classList.add('visible');
    }
}

/**
 * Hides detail panel.
 */
function hideDetailPanel() {
    const detailPanel = document.querySelector('#detailPanel');
    if (detailPanel) {
        detailPanel.classList.remove('visible');
        detailPanel.classList.add('hidden');
    }
}

/**
 * Escapes HTML to prevent XSS.
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
```

---

### Backend Implementation (TypeScript)

#### Initial HTML Scaffolding (Once Only)

```typescript
/**
 * Generates initial structural HTML.
 *
 * Contains NO data, only empty containers.
 * Sets webview.html EXACTLY ONCE.
 */
export class HtmlScaffoldingBehavior {
    constructor(
        private readonly webview: vscode.Webview,
        private readonly config: HtmlScaffoldingConfig
    ) {}

    public initialize(): void {
        const html = this.generateStructuralHtml();
        this.webview.html = html; // ONLY TIME webview.html is set
    }

    private generateStructuralHtml(): string {
        const { cssUris, jsUris, cspNonce, title } = this.config;
        const cspSource = this.webview.cspSource;

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${cspNonce}';">
    <title>${this.escapeHtml(title)}</title>
    ${cssUris.map(uri => `<link rel="stylesheet" href="${uri}">`).join('\n    ')}
</head>
<body>
    <!-- Toolbar with empty containers -->
    <div class="toolbar">
        <div id="environmentSelectorContainer"></div>
        <div id="traceLevelDropdownContainer"></div>
        <div id="autoRefreshDropdownContainer"></div>
        <div id="exportDropdownContainer"></div>
        <div id="deleteDropdownContainer"></div>
        <button id="refreshBtn">Refresh</button>
        <button id="openMakerBtn">Open in Maker</button>
    </div>

    <!-- Main panel (split layout) -->
    <div class="split-panel">
        <!-- Table section (left) -->
        <div class="panel-section panel-section--main">
            <div class="search-container">
                <input type="text" id="searchInput" placeholder="🔍 Search plugin traces..." />
            </div>
            <div id="tableContainer">
                <!-- Table rendered by frontend JavaScript -->
            </div>
            <div class="table-footer" id="recordCount">0 records</div>
        </div>

        <!-- Detail section (right, hidden by default) -->
        <div class="panel-section panel-section--detail hidden" id="detailPanel">
            <div class="detail-header">
                <h3>Trace Details</h3>
                <button id="closeDetailBtn" data-command="closeDetail">Close</button>
            </div>
            <div id="detailPanelContent">
                <!-- Detail content rendered by frontend JavaScript -->
            </div>
        </div>
    </div>

    <!-- Loading spinner -->
    <div id="loadingSpinner" class="loading-spinner hidden">
        <div class="spinner"></div>
        <span id="loadingMessage">Loading...</span>
    </div>

    <!-- Scripts -->
    ${jsUris.map(uri => `<script nonce="${cspNonce}" src="${uri}"></script>`).join('\n    ')}
</body>
</html>`;
    }

    private escapeHtml(text: string): string {
        const map: Record<string, string> = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, char => map[char] || char);
    }
}
```

#### Panel Coordinator (Message Routing)

```typescript
/**
 * Panel coordinator handles message routing and ViewModel updates.
 *
 * NO HTML generation after initialization.
 */
export class PluginTraceViewerPanel {
    private traces: readonly PluginTrace[] = [];
    private currentTraceLevel: TraceLevel | null = null;
    private autoRefreshInterval: number = 0;

    constructor(
        private readonly panel: vscode.WebviewPanel,
        private readonly getPluginTracesUseCase: GetPluginTracesUseCase,
        private readonly setTraceLevelUseCase: SetTraceLevelUseCase,
        private readonly viewModelMapper: PluginTraceViewModelMapper,
        private readonly logger: ILogger,
        private readonly environmentId: string
    ) {
        this.setupMessageHandlers();
        this.initializePanel();
    }

    private initializePanel(): void {
        const scaffolding = new HtmlScaffoldingBehavior(this.panel.webview, this.getConfig());
        scaffolding.initialize(); // Sets webview.html once
    }

    private setupMessageHandlers(): void {
        this.panel.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'ready':
                    await this.handleReady();
                    break;
                case 'refresh':
                    await this.handleRefresh();
                    break;
                case 'viewDetail':
                    await this.handleViewDetail(message.data.traceId);
                    break;
                case 'setTraceLevel':
                    await this.handleSetTraceLevel(message.data.level);
                    break;
                // ... other handlers
            }
        });
    }

    /**
     * Handles frontend 'ready' message - sends initial data.
     */
    private async handleReady(): Promise<void> {
        this.logger.debug('Frontend ready, sending initial data');

        // Load initial data
        await this.loadTraces();
        await this.loadTraceLevel();

        // Send all ViewModels to frontend
        await this.sendTableData();
        await this.sendDropdownStates();
        await this.sendEnvironmentSelector();
    }

    /**
     * Loads traces and sends updated table data to frontend.
     */
    private async handleRefresh(): Promise<void> {
        this.logger.info('Refreshing plugin traces');

        await this.showLoading('Loading traces...');

        try {
            await this.loadTraces();
            await this.sendTableData();
            await this.hideLoading();
        } catch (error) {
            this.logger.error('Failed to load traces', error);
            await this.hideLoading();
            await this.sendError('Failed to load plugin traces');
        }
    }

    /**
     * Loads traces from use case, updates internal state.
     */
    private async loadTraces(): Promise<void> {
        const filter = TraceFilter.create({
            top: 100,
            orderBy: 'createdon desc',
            odataFilter: ''
        });

        this.traces = await this.getPluginTracesUseCase.execute(this.environmentId, filter);
    }

    /**
     * Sends table data ViewModels to frontend.
     */
    private async sendTableData(): Promise<void> {
        const viewModels = this.traces.map(t => this.viewModelMapper.toTableRowViewModel(t));

        await this.panel.webview.postMessage({
            command: 'updateTableData',
            data: viewModels
        });

        this.logger.debug('Sent table data to frontend', { count: viewModels.length });
    }

    /**
     * Sends dropdown state ViewModels to frontend.
     */
    private async sendDropdownStates(): Promise<void> {
        // Trace level dropdown
        await this.panel.webview.postMessage({
            command: 'updateDropdownState',
            data: {
                dropdownId: 'traceLevelDropdown',
                selectedItemId: this.currentTraceLevel?.value.toString() || '0',
                buttonLabel: `Trace Level: ${this.getTraceLevelDisplayName()}`,
                items: [
                    { id: '0', label: 'Off' },
                    { id: '1', label: 'Exception' },
                    { id: '2', label: 'All' }
                ]
            }
        });

        // Auto-refresh dropdown
        await this.panel.webview.postMessage({
            command: 'updateDropdownState',
            data: {
                dropdownId: 'autoRefreshDropdown',
                selectedItemId: this.autoRefreshInterval.toString(),
                buttonLabel: this.getAutoRefreshDisplayName(),
                items: [
                    { id: '0', label: 'Off' },
                    { id: '10', label: 'Every 10 seconds' },
                    { id: '30', label: 'Every 30 seconds' },
                    { id: '60', label: 'Every minute' }
                ]
            }
        });
    }

    /**
     * Handles trace detail view request.
     */
    private async handleViewDetail(traceId: string): Promise<void> {
        const trace = this.traces.find(t => t.id === traceId);
        if (!trace) {
            this.logger.warn('Trace not found', { traceId });
            await this.sendError('Trace not found');
            return;
        }

        const detailViewModel = this.viewModelMapper.toDetailViewModel(trace);

        // Send detail data
        await this.panel.webview.postMessage({
            command: 'updateDetailPanel',
            data: detailViewModel
        });

        // Show detail panel
        await this.panel.webview.postMessage({
            command: 'showDetailPanel'
        });

        this.logger.debug('Sent detail view to frontend', { traceId });
    }

    /**
     * Handles trace level change.
     */
    private async handleSetTraceLevel(levelString: string): Promise<void> {
        try {
            const level = TraceLevel.fromString(levelString);

            await this.setTraceLevelUseCase.execute(this.environmentId, level);
            this.currentTraceLevel = level;

            // Update dropdown state
            await this.sendDropdownStates();

            this.logger.info('Trace level updated', { level: level.value });
        } catch (error) {
            this.logger.error('Failed to set trace level', error);
            await this.sendError('Failed to set trace level');
        }
    }

    // Helper methods

    private async showLoading(message?: string): Promise<void> {
        await this.panel.webview.postMessage({
            command: 'showLoading',
            data: { message }
        });
    }

    private async hideLoading(): Promise<void> {
        await this.panel.webview.postMessage({
            command: 'hideLoading'
        });
    }

    private async sendError(message: string): Promise<void> {
        await this.panel.webview.postMessage({
            command: 'error',
            data: { message }
        });
    }

    private getTraceLevelDisplayName(): string {
        if (!this.currentTraceLevel) {
            return 'Off';
        }
        // Delegate formatting to presentation utility
        return TraceLevelFormatter.getDisplayName(this.currentTraceLevel);
    }

    private getAutoRefreshDisplayName(): string {
        if (this.autoRefreshInterval === 0) {
            return 'Auto-Refresh: Off';
        }
        return `Auto-Refresh: Every ${this.autoRefreshInterval}s`;
    }
}
```

---

### Frontend Implementation (JavaScript)

#### Main Frontend Entry Point

```javascript
/**
 * Plugin Trace Viewer Frontend Behavior
 *
 * Initializes event listeners, handles backend messages, renders ViewModels.
 */
(function() {
    // VS Code API (acquired by messaging.js)
    const vscode = window.vscode;

    /**
     * Initialize on page load.
     */
    function initialize() {
        attachStaticEventListeners();
        renderInitialStructure();
        notifyBackendReady();
    }

    /**
     * Attaches event listeners that persist forever.
     * Called ONCE on initialization.
     */
    function attachStaticEventListeners() {
        // Toolbar buttons
        document.getElementById('refreshBtn')?.addEventListener('click', () => {
            vscode.postMessage({ command: 'refresh' });
        });

        document.getElementById('openMakerBtn')?.addEventListener('click', () => {
            vscode.postMessage({ command: 'openMaker' });
        });

        document.getElementById('closeDetailBtn')?.addEventListener('click', () => {
            vscode.postMessage({ command: 'closeDetail' });
        });

        // Search input (client-side filtering)
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', handleSearch);
        }

        // Dropdowns (initialized by DropdownComponent.js)
        initializeDropdowns();

        // Listen for backend messages
        window.addEventListener('message', handleBackendMessage);
    }

    /**
     * Renders initial empty structure (table headers, containers).
     */
    function renderInitialStructure() {
        const tableContainer = document.getElementById('tableContainer');
        if (tableContainer) {
            tableContainer.innerHTML = `
                <table id="traceTable" class="data-table">
                    <thead>
                        <tr>
                            <th data-sort="status">Status</th>
                            <th data-sort="createdOn">Started</th>
                            <th data-sort="duration">Duration</th>
                            <th data-sort="operationType">Operation</th>
                            <th data-sort="entityName">Entity</th>
                            <th data-sort="messageName">Message</th>
                            <th data-sort="pluginName">Plugin</th>
                            <th data-sort="depth">Depth</th>
                            <th data-sort="mode">Mode</th>
                        </tr>
                    </thead>
                    <tbody>
                        <!-- Rows populated by renderTableData() -->
                    </tbody>
                </table>
            `;

            // Attach sorting handlers
            setupSorting();
        }
    }

    /**
     * Notifies backend that frontend is ready.
     */
    function notifyBackendReady() {
        vscode.postMessage({ command: 'ready' });
    }

    /**
     * Handles messages from backend.
     */
    function handleBackendMessage(event) {
        const message = event.data;

        switch (message.command) {
            case 'updateTableData':
                renderTableData(message.data);
                break;
            case 'updateDetailPanel':
                renderDetailPanel(message.data);
                break;
            case 'updateDropdownState':
                updateDropdownState(message.data);
                break;
            case 'showDetailPanel':
                showDetailPanel();
                break;
            case 'hideDetailPanel':
                hideDetailPanel();
                break;
            case 'showLoading':
                showLoadingSpinner(message.data?.message);
                break;
            case 'hideLoading':
                hideLoadingSpinner();
                break;
            case 'error':
                showError(message.data.message);
                break;
        }
    }

    /**
     * Renders table data from ViewModels.
     */
    function renderTableData(viewModels) {
        const tbody = document.querySelector('#traceTable tbody');
        if (!tbody) {
            console.error('Table tbody not found');
            return;
        }

        // Clear existing rows
        tbody.innerHTML = '';

        // Render each row
        viewModels.forEach(vm => {
            const row = createTableRow(vm);
            tbody.appendChild(row);
        });

        // Apply styling
        applyRowStriping();
        updateRecordCount(viewModels.length);

        // Re-apply current search filter (if any)
        const searchInput = document.getElementById('searchInput');
        if (searchInput && searchInput.value) {
            handleSearch();
        }
    }

    /**
     * Creates table row from ViewModel.
     */
    function createTableRow(vm) {
        const row = document.createElement('tr');
        row.setAttribute('data-trace-id', vm.id);

        // Status cell
        const statusCell = document.createElement('td');
        statusCell.className = vm.statusClass;
        statusCell.textContent = vm.status;
        row.appendChild(statusCell);

        // Created date cell
        const createdOnCell = document.createElement('td');
        createdOnCell.textContent = vm.createdOn;
        row.appendChild(createdOnCell);

        // Duration cell
        const durationCell = document.createElement('td');
        durationCell.textContent = vm.duration;
        row.appendChild(durationCell);

        // Operation type cell
        const operationCell = document.createElement('td');
        operationCell.textContent = vm.operationType;
        row.appendChild(operationCell);

        // Entity name cell
        const entityCell = document.createElement('td');
        entityCell.textContent = vm.entityName;
        row.appendChild(entityCell);

        // Message name cell
        const messageCell = document.createElement('td');
        messageCell.textContent = vm.messageName;
        row.appendChild(messageCell);

        // Plugin name cell (clickable link)
        const pluginCell = document.createElement('td');
        const pluginLink = document.createElement('a');
        pluginLink.href = '#';
        pluginLink.textContent = vm.pluginName;
        pluginLink.addEventListener('click', (e) => {
            e.preventDefault();
            selectRow(row);
            vscode.postMessage({
                command: 'viewDetail',
                data: { traceId: vm.id }
            });
        });
        pluginCell.appendChild(pluginLink);
        row.appendChild(pluginCell);

        // Depth cell
        const depthCell = document.createElement('td');
        depthCell.textContent = vm.depth;
        row.appendChild(depthCell);

        // Mode cell
        const modeCell = document.createElement('td');
        modeCell.textContent = vm.mode;
        row.appendChild(modeCell);

        return row;
    }

    /**
     * Handles search input (client-side filtering).
     */
    function handleSearch() {
        const searchInput = document.getElementById('searchInput');
        const query = searchInput.value.toLowerCase();
        const rows = document.querySelectorAll('#traceTable tbody tr');
        const totalCount = rows.length;

        // Filter rows
        let visibleCount = 0;
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            if (text.includes(query)) {
                row.style.display = '';
                visibleCount++;
            } else {
                row.style.display = 'none';
            }
        });

        // Re-apply striping to visible rows
        applyRowStriping();

        // Update record count
        const recordCount = document.getElementById('recordCount');
        if (recordCount) {
            const recordText = totalCount === 1 ? 'record' : 'records';
            if (visibleCount === totalCount) {
                recordCount.textContent = `${totalCount} ${recordText}`;
            } else {
                recordCount.textContent = `${visibleCount} of ${totalCount} ${recordText}`;
            }
        }
    }

    /**
     * Sets up column sorting handlers.
     */
    function setupSorting() {
        let currentColumn = null;
        let currentDirection = 'asc';

        const headers = document.querySelectorAll('#traceTable th[data-sort]');
        headers.forEach(header => {
            header.style.cursor = 'pointer';
            header.addEventListener('click', () => {
                const column = header.getAttribute('data-sort');

                // Toggle direction
                if (currentColumn === column) {
                    currentDirection = currentDirection === 'asc' ? 'desc' : 'asc';
                } else {
                    currentColumn = column;
                    currentDirection = 'asc';
                }

                sortTable(column, currentDirection);
            });
        });
    }

    /**
     * Sorts table rows by column (client-side).
     */
    function sortTable(column, direction) {
        const tbody = document.querySelector('#traceTable tbody');
        const rows = Array.from(tbody.querySelectorAll('tr'));
        const headers = Array.from(document.querySelectorAll('#traceTable th[data-sort]'));
        const columnIndex = headers.findIndex(h => h.getAttribute('data-sort') === column);

        if (columnIndex === -1) {
            return;
        }

        // Sort rows
        rows.sort((a, b) => {
            const aCell = a.querySelectorAll('td')[columnIndex];
            const bCell = b.querySelectorAll('td')[columnIndex];

            if (!aCell || !bCell) {
                return 0;
            }

            const aText = aCell.textContent.trim();
            const bText = bCell.textContent.trim();

            const comparison = aText.localeCompare(bText);
            return direction === 'asc' ? comparison : -comparison;
        });

        // Re-append rows
        rows.forEach(row => tbody.appendChild(row));

        // Update sort indicators
        headers.forEach(h => {
            h.textContent = h.textContent.replace(/ [▲▼]$/, '');
            if (h.getAttribute('data-sort') === column) {
                h.textContent += direction === 'asc' ? ' ▲' : ' ▼';
            }
        });

        // Re-apply striping
        applyRowStriping();
    }

    /**
     * Applies row striping to visible rows.
     */
    function applyRowStriping() {
        const tbody = document.querySelector('#traceTable tbody');
        if (!tbody) {
            return;
        }

        const allRows = tbody.querySelectorAll('tr');
        const visibleRows = Array.from(allRows).filter(row => {
            return window.getComputedStyle(row).display !== 'none';
        });

        // Remove existing classes
        allRows.forEach(row => {
            row.classList.remove('row-even', 'row-odd');
        });

        // Apply classes to visible rows
        visibleRows.forEach((row, index) => {
            row.classList.add(index % 2 === 0 ? 'row-even' : 'row-odd');
        });
    }

    /**
     * Updates record count display.
     */
    function updateRecordCount(count) {
        const recordCount = document.getElementById('recordCount');
        if (recordCount) {
            const text = count === 1 ? 'record' : 'records';
            recordCount.textContent = `${count} ${text}`;
        }
    }

    /**
     * Selects a table row (highlights).
     */
    function selectRow(row) {
        // Clear existing selection
        const allRows = document.querySelectorAll('#traceTable tbody tr');
        allRows.forEach(r => r.classList.remove('selected'));

        // Select clicked row
        row.classList.add('selected');
    }

    /**
     * Updates dropdown state (button label, checkmarks).
     */
    function updateDropdownState(stateVM) {
        // Update button label
        const button = document.getElementById(stateVM.dropdownId);
        if (button) {
            const labelSpan = button.querySelector('.dropdown-label');
            if (labelSpan) {
                labelSpan.textContent = stateVM.buttonLabel;
            }
        }

        // Update checkmarks
        const items = document.querySelectorAll(`[data-dropdown-id="${stateVM.dropdownId}"] .dropdown-item`);
        items.forEach(item => {
            const itemId = item.getAttribute('data-dropdown-item-id');
            const checkmark = item.querySelector('.dropdown-checkmark');
            if (checkmark) {
                checkmark.style.display = (itemId === stateVM.selectedItemId) ? 'inline' : 'none';
            }
        });
    }

    /**
     * Renders detail panel from ViewModel.
     */
    function renderDetailPanel(vm) {
        const detailContent = document.getElementById('detailPanelContent');
        if (!detailContent) {
            return;
        }

        if (!vm) {
            detailContent.innerHTML = '<p>No trace selected</p>';
            return;
        }

        detailContent.innerHTML = `
            <div class="detail-header">
                <h3>${escapeHtml(vm.pluginName)}</h3>
                <span class="${vm.statusBadgeClass}">${escapeHtml(vm.status)}</span>
            </div>

            <div class="detail-tabs">
                <button class="tab-btn active" data-tab="overview">Overview</button>
                <button class="tab-btn" data-tab="execution">Execution</button>
                <button class="tab-btn" data-tab="exception">Exception</button>
            </div>

            <div class="tab-content active" id="tab-overview">
                <div class="detail-row">
                    <span class="detail-label">Entity:</span>
                    <span class="detail-value">${escapeHtml(vm.entityName)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Message:</span>
                    <span class="detail-value">${escapeHtml(vm.messageName)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Duration:</span>
                    <span class="detail-value">${escapeHtml(vm.duration)}</span>
                </div>
            </div>

            <div class="tab-content" id="tab-execution">
                <div class="detail-row">
                    <span class="detail-label">Stage:</span>
                    <span class="detail-value">${escapeHtml(vm.stage)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Mode:</span>
                    <span class="detail-value">${escapeHtml(vm.mode)}</span>
                </div>
            </div>

            <div class="tab-content" id="tab-exception">
                <pre>${escapeHtml(vm.exceptionDetails || 'No exception')}</pre>
            </div>
        `;

        // Re-attach tab handlers
        setupDetailTabs();
    }

    /**
     * Sets up detail panel tab switching.
     */
    function setupDetailTabs() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        tabButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetTab = e.target.dataset.tab;

                // Update button states
                tabButtons.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');

                // Update tab content visibility
                document.querySelectorAll('.tab-content').forEach(content => {
                    content.classList.remove('active');
                });

                const targetContent = document.getElementById('tab-' + targetTab);
                if (targetContent) {
                    targetContent.classList.add('active');
                }
            });
        });
    }

    /**
     * Shows detail panel.
     */
    function showDetailPanel() {
        const detailPanel = document.getElementById('detailPanel');
        if (detailPanel) {
            detailPanel.classList.remove('hidden');
            detailPanel.classList.add('visible');
        }
    }

    /**
     * Hides detail panel.
     */
    function hideDetailPanel() {
        const detailPanel = document.getElementById('detailPanel');
        if (detailPanel) {
            detailPanel.classList.remove('visible');
            detailPanel.classList.add('hidden');
        }
    }

    /**
     * Shows loading spinner.
     */
    function showLoadingSpinner(message) {
        const spinner = document.getElementById('loadingSpinner');
        if (spinner) {
            spinner.classList.remove('hidden');
            const messageEl = document.getElementById('loadingMessage');
            if (messageEl && message) {
                messageEl.textContent = message;
            }
        }
    }

    /**
     * Hides loading spinner.
     */
    function hideLoadingSpinner() {
        const spinner = document.getElementById('loadingSpinner');
        if (spinner) {
            spinner.classList.add('hidden');
        }
    }

    /**
     * Shows error message.
     */
    function showError(message) {
        // Could use VS Code notification or inline message
        console.error('Error:', message);
        // Implement inline error display if needed
    }

    /**
     * Escapes HTML to prevent XSS.
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})();
```

---

## Testing Strategy

### Domain Layer (Already Tested)
- No changes to domain entities
- Existing tests remain valid

### Application Layer (Use Cases)
- **Unit tests:** Verify ViewModels mapped correctly from domain entities
- **Unit tests:** Verify use cases orchestrate correctly (no HTML generation)
- **Mock:** Repository, logger
- **Coverage target:** 90%

### Presentation Layer (Backend)
- **Integration tests:** Verify message routing (PanelCoordinator)
- **Unit tests:** Verify message construction (ViewModel → postMessage payload)
- **Mock:** Webview postMessage
- **Coverage target:** 80%

### Presentation Layer (Frontend)
- **Manual testing:** Event listeners survive updates
- **Manual testing:** Search, sorting, dropdowns work after refresh
- **Manual testing:** Detail panel opens/closes smoothly
- **Optional:** Puppeteer/Playwright for E2E webview tests (future)

### Regression Testing
- **Plugin Trace Viewer:** Full feature parity with current version
- **Checklist:**
  - [ ] Table displays traces correctly
  - [ ] Search filters rows (client-side)
  - [ ] Sorting works on all columns
  - [ ] Refresh updates data without breaking interactions
  - [ ] Trace level dropdown selection persists across refreshes
  - [ ] Auto-refresh dropdown selection persists
  - [ ] Detail panel shows/hides correctly
  - [ ] Row selection highlights correctly
  - [ ] Export CSV/JSON works with filtered data
  - [ ] Delete operations work
  - [ ] Environment selector switches environments

---

## Migration Path

### Phase 1: Proof of Concept (Plugin Trace Viewer Table Only)

**Goal:** Validate pattern with simplest case

**Steps:**
1. Create new `PluginTraceViewerPanelDataDriven.ts` (parallel to existing)
2. Implement data-driven table rendering
3. Test: Refresh, search, sorting work
4. Compare with existing panel (feature parity)

**Validation:** If table works without issues, pattern is sound.

---

### Phase 2: Extend to All Controls

**Goal:** Apply pattern to dropdowns, detail panel, toolbar

**Steps:**
1. Implement dropdown state updates
2. Implement detail panel rendering
3. Remove all HTML generation from backend (except initial scaffolding)
4. Test: All interactive controls work after any state change

**Validation:** Feature-complete panel using data-driven architecture.

---

### Phase 3: Replace Current Implementation

**Goal:** Switch to new architecture

**Steps:**
1. Rename `PluginTraceViewerPanelComposed.ts` → `PluginTraceViewerPanelOld.ts`
2. Rename `PluginTraceViewerPanelDataDriven.ts` → `PluginTraceViewerPanelComposed.ts`
3. Update dependency injection in `extension.ts`
4. Remove old implementation after verification

**Validation:** No regressions, all features work.

---

### Phase 4: Generalize Pattern

**Goal:** Extract reusable patterns for future panels

**Steps:**
1. Create `DataDrivenPanel` base class
2. Extract `RenderableViewModel` interfaces
3. Create frontend rendering utility library
4. Document pattern for other developers

**Validation:** New panel (e.g., Solution Explorer) can adopt pattern quickly.

---

## Open Questions

### 1. Frontend TypeScript Compilation?

**Question:** Should frontend JavaScript be compiled from TypeScript for type safety?

**Options:**
- **Option A:** Keep frontend as plain JavaScript (faster iteration, less tooling)
- **Option B:** Compile frontend TypeScript → JavaScript (type safety, IDE support)

**Recommendation:** Start with plain JavaScript (MVP), migrate to TypeScript in Slice 3 if needed.

**Rationale:**
- ViewModels are validated at runtime (JSON Schema)
- TypeScript compilation adds build complexity
- Plain JS faster for prototyping
- Can always add later without architectural change

---

### 2. ViewModel Schema Validation?

**Question:** Should we validate ViewModels at runtime before sending to frontend?

**Options:**
- **Option A:** No validation (trust mapper correctness)
- **Option B:** JSON Schema validation (dev mode only)
- **Option C:** Zod validation (dev + prod)

**Recommendation:** JSON Schema validation in dev mode (Slice 3).

**Rationale:**
- Catches mapper bugs early
- No performance impact in production
- Documents ViewModel contracts

---

### 3. Incremental DOM Updates vs Full Section Updates?

**Question:** Should we update individual DOM elements or replace entire sections?

**Example:**
- **Incremental:** Update only changed table rows
- **Section:** Replace entire `<tbody>` every time

**Recommendation:** Section updates (MVP), incremental updates (optimization in Slice 4).

**Rationale:**
- Section updates simpler to implement
- Performance acceptable for <1000 rows
- Incremental updates complex (requires diffing algorithm)
- Can optimize later if performance issues

---

### 4. State Management Library?

**Question:** Should frontend use state management library (Redux, MobX, Zustand)?

**Recommendation:** No (MVP), re-evaluate in Slice 4 if state becomes complex.

**Rationale:**
- Current state simple (traces array, dropdown selections)
- Backend owns state, frontend renders
- State management adds dependency
- YAGNI (You Aren't Gonna Need It)

---

### 5. Transition Animation Strategy?

**Question:** How should we handle loading states, panel transitions?

**Recommendation:** Simple CSS transitions (MVP), loading spinner for async operations.

**Rationale:**
- CSS transitions built-in, no library needed
- Loading spinner prevents user confusion during data fetch
- Smooth transitions improve UX

---

## Summary

**Architectural Decision:** Data-driven frontend rendering (ViewModels + JavaScript) ✅

**Key Benefits:**
- Event listeners persist across updates
- Clean separation: Backend = data, Frontend = rendering
- Architecturally correct per Clean Architecture
- Scalable pattern for all panels

**Implementation Approach:**
- Phase 1: Proof of concept (table only)
- Phase 2: Extend to all controls
- Phase 3: Replace current implementation
- Phase 4: Generalize for reuse

**Risk Mitigation:**
- Parallel implementation (no disruption to current panels)
- Incremental rollout (validate at each phase)
- Manual testing checklist (catch regressions)
- Can rollback if issues arise

**Next Steps:**
1. Review and approve design
2. Implement MVP (Slice 1): Table rendering
3. Test and validate pattern
4. Proceed to Slice 2 if successful

---

**Design complete. Ready for review and implementation.**
