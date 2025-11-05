# Environment Setup Panel Migration to PanelCoordinator - Technical Design

**Status:** Draft
**Date:** 2025-11-05
**Complexity:** Moderate

---

## Overview

**User Problem:** The Environment Setup panel was built with the old manual message routing pattern. It needs to be migrated to the new universal PanelCoordinator pattern for consistency and maintainability.

**Solution:** Migrate the existing EnvironmentSetupPanel.ts to use PanelCoordinator with behaviors and sections while preserving all existing functionality (save, test, delete, discover, validate-name).

**Value:** Ensures architectural consistency across all panels, improves maintainability, and reduces boilerplate code through the universal framework.

---

## Requirements

### Functional Requirements (ALL MUST BE PRESERVED)
- [ ] Save Environment (new vs edit mode, validation, panel mapping updates)
- [ ] Test Connection (progress notifications, credential testing)
- [ ] Discover Environment ID (interactive auth fallback, cancellation support)
- [ ] Delete Environment (confirmation modal, panel cleanup)
- [ ] Validate Name (real-time debounced validation)
- [ ] Concurrent Edit Checking (prevent simultaneous edits)
- [ ] State Management (currentEnvironmentId tracking)
- [ ] Form State (conditional fields, credential placeholders, data loading)
- [ ] Error Handling (inline validation, user feedback)
- [ ] Client-side Integration (EnvironmentSetupBehavior.js continues to work)

### Non-Functional Requirements
- [ ] Zero breaking changes (100% functionality preservation)
- [ ] Clean Architecture compliance (no business logic in panel)
- [ ] Type safety (no `any` types)
- [ ] Proper disposal (unregister edit sessions)
- [ ] Logging consistency (info for user actions, debug for state changes)

### Success Criteria
- [ ] All 5 commands work identically to current implementation
- [ ] Panel singleton mapping works (per environment ID + 'new')
- [ ] Concurrent edit protection functions correctly
- [ ] Client-side JS receives same messages as before
- [ ] Manual testing passes all scenarios

---

## Implementation Slices (Vertical Slicing)

### MVP Slice (Slice 1): "Panel scaffold with basic structure"
**Goal:** Working panel that opens with form rendered (no functionality yet)

**Panel Architecture:**
- Replace manual message routing with PanelCoordinator
- Setup HtmlScaffoldingBehavior + SectionCompositionBehavior
- Integrate EnvironmentFormSection

**Commands:**
- None (just rendering)

**Result:** WORKING PANEL ✅ (opens, displays form, no errors)

---

### Slice 2: "Save Environment command"
**Builds on:** Slice 1

**Command Handler:**
- Register 'save' handler with coordinator
- Integrate EnvironmentSetupMessageHandler.handleSaveEnvironment
- Handle panel mapping updates (new → saved ID)
- Update concurrent edit session tracking

**Result:** SAVE FUNCTIONALITY ✅ (creates/updates environments)

---

### Slice 3: "Test Connection + Discover ID commands"
**Builds on:** Slice 2

**Command Handlers:**
- Register 'test' handler with progress notification
- Register 'discover' handler with cancellation support
- Implement interactive auth fallback dialog

**Result:** CONNECTIVITY FEATURES ✅ (test + discover work)

---

### Slice 4: "Delete + Validate Name commands"
**Builds on:** Slice 3

**Command Handlers:**
- Register 'delete' handler with confirmation modal
- Register 'validate-name' handler (debounced from client)
- Ensure proper panel disposal

**Result:** FULL FUNCTIONALITY ✅ (all commands working)

---

### Slice 5: "Load environment data on open"
**Builds on:** Slice 4

**Data Loading:**
- Load environment data in constructor (if editing)
- Send 'environment-loaded' message to webview
- Client-side populates form fields

**Result:** EDIT MODE ✅ (opens existing environments for editing)

---

## Architecture Design

### Current Architecture (to be replaced)

```
EnvironmentSetupPanel
├── Manual message routing (if/else chain)
├── Direct use case invocation
├── Message handler delegation (EnvironmentSetupMessageHandler)
└── Panel singleton tracking (Map<string, Panel>)

EnvironmentSetupMessageHandler
├── All command logic (save, test, delete, discover, validate)
├── Request builders (conditional properties)
├── Direct webview.postMessage calls
└── Callbacks for panel state updates
```

### New Architecture (PanelCoordinator pattern)

```
EnvironmentSetupPanelComposed
├── PanelCoordinator<Commands> (message routing)
│   ├── Automatic command registry
│   ├── Type-safe command names
│   └── Auto button loading states
├── Behaviors
│   ├── HtmlScaffoldingBehavior (wraps HTML in scaffold)
│   └── SectionCompositionBehavior (composes sections)
├── Sections
│   ├── ActionButtonsSection (toolbar buttons)
│   └── EnvironmentFormSection (form HTML)
├── Command Handlers (registered with coordinator)
│   ├── 'save' → handleSave()
│   ├── 'test' → handleTestConnection()
│   ├── 'discover' → handleDiscoverEnvironmentId()
│   ├── 'delete' → handleDelete()
│   └── 'validate-name' → handleValidateName()
└── Panel State
    ├── currentEnvironmentId (tracked internally)
    ├── Panel singleton mapping (Map<string, Panel>)
    └── Concurrent edit session (register/unregister)

EnvironmentSetupMessageHandler (KEEP - contains business orchestration)
├── All command logic (UNCHANGED)
├── Request builders (UNCHANGED)
├── Direct webview access (via injected webview)
└── Panel callbacks (UNCHANGED)
```

**Key Decision:** KEEP EnvironmentSetupMessageHandler instead of inlining logic into panel.

**Rationale:**
- Message handler is already well-factored and tested
- Contains complex orchestration (discover with fallback, validation, etc.)
- Separation of concerns: Panel coordinates, MessageHandler orchestrates
- Reduces risk of introducing bugs during migration

---

## Type Contracts

### Command Types

```typescript
/**
 * Commands supported by Environment Setup panel.
 * Must match button IDs and message handler methods.
 */
type EnvironmentSetupCommands =
  | 'save'
  | 'test'
  | 'discover'
  | 'delete'
  | 'validate-name';
```

### Panel Configuration

```typescript
/**
 * Configuration passed to EnvironmentFormSection for rendering.
 */
interface EnvironmentFormData {
  readonly formData?: Record<string, string>;
  readonly environmentData?: EnvironmentFormViewModel;
}
```

### Message Handler Callbacks

```typescript
/**
 * Callbacks provided to EnvironmentSetupMessageHandler.
 * Allows handler to update panel state without tight coupling.
 */
interface MessageHandlerCallbacks {
  /** Get current environment ID */
  getCurrentEnvironmentId: () => string | undefined;

  /** Set current environment ID (after save) */
  setCurrentEnvironmentId: (id: string) => void;

  /** Update panel singleton mapping (old ID → new ID) */
  updatePanelMapping: (oldId: string, newId: string) => void;

  /** Dispose panel (after delete) */
  disposePanel: () => void;
}
```

### Section Data Flow

```typescript
/**
 * Data passed to sections during rendering.
 * Extended by each panel to include panel-specific data.
 */
interface SectionRenderData {
  // Environment Setup specific
  formData?: Record<string, string>;
  environmentData?: EnvironmentFormViewModel;

  // Standard fields
  tableData?: unknown[];
  environments?: EnvironmentOption[];
  currentEnvironmentId?: string;
}
```

---

## Panel Architecture Details

### Panel Lifecycle

```typescript
export class EnvironmentSetupPanelComposed {
  public static currentPanels: Map<string, EnvironmentSetupPanelComposed> = new Map();

  private coordinator!: PanelCoordinator<EnvironmentSetupCommands>;
  private scaffoldingBehavior!: HtmlScaffoldingBehavior;
  private messageHandler!: EnvironmentSetupMessageHandler;
  private currentEnvironmentId?: string;

  private constructor(
    private readonly panel: vscode.WebviewPanel,
    private readonly extensionUri: vscode.Uri,
    // All 7 use cases (injected via factory)
    private readonly loadEnvironmentByIdUseCase: LoadEnvironmentByIdUseCase,
    private readonly saveEnvironmentUseCase: SaveEnvironmentUseCase,
    private readonly deleteEnvironmentUseCase: DeleteEnvironmentUseCase,
    private readonly testConnectionUseCase: TestConnectionUseCase,
    private readonly discoverEnvironmentIdUseCase: DiscoverEnvironmentIdUseCase,
    private readonly validateUniqueNameUseCase: ValidateUniqueNameUseCase,
    private readonly checkConcurrentEditUseCase: CheckConcurrentEditUseCase,
    private readonly logger: ILogger,
    environmentId?: string
  ) {
    // 1. Store current environment ID
    if (environmentId !== undefined) {
      this.currentEnvironmentId = environmentId;
    }

    logger.debug('EnvironmentSetupPanelComposed: Initialized', {
      isEdit: !!environmentId,
      environmentId: environmentId || 'new'
    });

    // 2. Check concurrent edit (same as current)
    if (environmentId) {
      const canEdit = this.checkConcurrentEditUseCase.execute({ environmentId });
      if (!canEdit.canEdit) {
        logger.warn('Concurrent edit detected', { environmentId });
        vscode.window.showWarningMessage('This environment is already being edited in another panel');
        return; // Early exit (panel won't be functional)
      }

      this.checkConcurrentEditUseCase.registerEditSession(environmentId);
      logger.debug('Edit session registered', { environmentId });
    }

    // 3. Configure webview
    panel.webview.options = {
      enableScripts: true,
      localResourceRoots: [extensionUri]
    };

    // 4. Create coordinator with behaviors
    const result = this.createCoordinator();
    this.coordinator = result.coordinator;
    this.scaffoldingBehavior = result.scaffoldingBehavior;

    // 5. Create message handler with callbacks
    this.messageHandler = this.createMessageHandler();

    // 6. Register command handlers
    this.registerCommandHandlers();

    // 7. Register disposal
    panel.onDidDispose(() => {
      this.dispose();
    });

    // 8. Initialize panel and load data
    void this.initializePanel();
  }

  public static createOrShow(
    extensionUri: vscode.Uri,
    // ... all use cases ...
    environmentId?: string
  ): EnvironmentSetupPanelComposed {
    const column = vscode.ViewColumn.One;

    // Panel singleton logic (same as current)
    const panelKey = environmentId || 'new';
    const existingPanel = EnvironmentSetupPanelComposed.currentPanels.get(panelKey);
    if (existingPanel) {
      existingPanel.panel.reveal(column);
      return existingPanel;
    }

    // Create new webview panel
    const panel = vscode.window.createWebviewPanel(
      'environmentSetup',
      environmentId ? 'Edit Environment' : 'New Environment',
      column,
      {
        enableScripts: true,
        localResourceRoots: [extensionUri],
        retainContextWhenHidden: true
      }
    );

    const newPanel = new EnvironmentSetupPanelComposed(
      panel,
      extensionUri,
      // ... pass all use cases ...
      logger,
      environmentId
    );

    EnvironmentSetupPanelComposed.currentPanels.set(panelKey, newPanel);
    return newPanel;
  }

  private async initializePanel(): Promise<void> {
    // Initial render with empty data
    await this.scaffoldingBehavior.refresh({
      formData: {}
    });

    // Load environment data if editing
    if (this.currentEnvironmentId) {
      await this.loadEnvironment(this.currentEnvironmentId);
    }
  }

  private async loadEnvironment(environmentId: string): Promise<void> {
    this.logger.debug('Loading environment for editing', { environmentId });

    try {
      const viewModel = await this.loadEnvironmentByIdUseCase.execute({ environmentId });

      this.logger.info('Environment loaded successfully', {
        environmentId,
        name: viewModel.name
      });

      // Send to webview (client-side populates form)
      this.panel.webview.postMessage({
        command: 'environment-loaded',
        data: viewModel
      });
    } catch (error) {
      this.logger.error('Failed to load environment', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`Failed to load environment: ${errorMessage}`);
    }
  }

  public dispose(): void {
    this.logger.debug('EnvironmentSetupPanelComposed: Disposing', {
      environmentId: this.currentEnvironmentId || 'new'
    });

    // Unregister concurrent edit session
    if (this.currentEnvironmentId) {
      this.checkConcurrentEditUseCase.unregisterEditSession(this.currentEnvironmentId);
    }

    // Remove from singleton map
    const panelKey = this.currentEnvironmentId || 'new';
    EnvironmentSetupPanelComposed.currentPanels.delete(panelKey);

    // Coordinator disposes itself (onDidDispose already registered)
  }
}
```

---

## Coordinator Creation

```typescript
private createCoordinator(): {
  coordinator: PanelCoordinator<EnvironmentSetupCommands>;
  scaffoldingBehavior: HtmlScaffoldingBehavior;
} {
  // 1. Create sections
  const formSection = new EnvironmentFormSection();

  const actionButtons = new ActionButtonsSection({
    buttons: [
      { id: 'save', label: 'Save Environment' },
      { id: 'test', label: 'Test Connection' },
      { id: 'discover', label: 'Discover ID' },
      { id: 'delete', label: 'Delete Environment' }
    ],
    position: 'right'
  }, SectionPosition.Toolbar);

  // 2. Create composition behavior
  const compositionBehavior = new SectionCompositionBehavior(
    [actionButtons, formSection],
    PanelLayout.SingleColumn
  );

  // 3. Resolve CSS modules
  const cssUris = resolveCssModules(
    {
      base: true,
      components: ['buttons', 'inputs'],
      sections: ['action-buttons']
    },
    this.extensionUri,
    this.panel.webview
  );

  // 4. Create scaffolding config
  const scaffoldingConfig: HtmlScaffoldingConfig = {
    cssUris,
    jsUris: [
      this.panel.webview.asWebviewUri(
        vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'EnvironmentSetupBehavior.js')
      ).toString()
    ],
    cspNonce: getNonce(),
    title: 'Environment Setup',
    customCss: `
      .form-container {
        max-width: 800px;
        margin: 0 auto;
        padding: 24px;
      }

      .form-section {
        margin-bottom: 24px;
      }

      .form-section h2 {
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 16px;
        color: var(--vscode-foreground);
      }

      .form-group {
        margin-bottom: 16px;
      }

      .form-group label {
        display: block;
        margin-bottom: 6px;
        font-size: 13px;
        color: var(--vscode-foreground);
      }

      .form-group input,
      .form-group select {
        width: 100%;
      }

      .help-text {
        font-size: 12px;
        color: var(--vscode-descriptionForeground);
        margin-top: 4px;
      }

      .conditional-field {
        margin-top: 16px;
      }

      select {
        font-family: var(--vscode-font-family);
        font-size: var(--vscode-font-size);
        background: var(--vscode-input-background);
        color: var(--vscode-input-foreground);
        border: 1px solid var(--vscode-input-border);
        padding: 6px 12px;
        border-radius: 2px;
        width: 100%;
      }

      select:focus {
        outline: 1px solid var(--vscode-focusBorder);
        outline-offset: -1px;
      }

      .validation-error {
        color: var(--vscode-inputValidation-errorForeground);
        background: var(--vscode-inputValidation-errorBackground);
        border: 1px solid var(--vscode-inputValidation-errorBorder);
        padding: 4px 8px;
        margin-top: 4px;
        font-size: 12px;
        border-radius: 2px;
      }

      .invalid {
        border-color: var(--vscode-inputValidation-errorBorder) !important;
      }
    `
  };

  // 5. Create scaffolding behavior
  const scaffoldingBehavior = new HtmlScaffoldingBehavior(
    this.panel.webview,
    compositionBehavior,
    scaffoldingConfig
  );

  // 6. Create coordinator
  const coordinator = new PanelCoordinator<EnvironmentSetupCommands>({
    panel: this.panel,
    extensionUri: this.extensionUri,
    behaviors: [scaffoldingBehavior],
    logger: this.logger
  });

  return { coordinator, scaffoldingBehavior };
}
```

---

## Message Handler Integration

```typescript
private createMessageHandler(): EnvironmentSetupMessageHandler {
  return new EnvironmentSetupMessageHandler(
    this.panel.webview,
    this.loadEnvironmentByIdUseCase,
    this.saveEnvironmentUseCase,
    this.deleteEnvironmentUseCase,
    this.testConnectionUseCase,
    this.discoverEnvironmentIdUseCase,
    this.validateUniqueNameUseCase,
    this.checkConcurrentEditUseCase,
    this.logger,
    // Callbacks for panel state updates
    () => this.currentEnvironmentId,
    (id: string) => { this.currentEnvironmentId = id; },
    (oldId: string, newId: string) => {
      EnvironmentSetupPanelComposed.currentPanels.delete(oldId);
      EnvironmentSetupPanelComposed.currentPanels.set(newId, this);
    },
    () => { this.dispose(); }
  );
}
```

---

## Command Handlers

```typescript
private registerCommandHandlers(): void {
  // Save Environment
  this.coordinator.registerHandler('save', async (data) => {
    const formData = data as SaveEnvironmentMessage['data'];
    await this.messageHandler.handleSaveEnvironment(formData);
  }, { disableOnExecute: true });

  // Test Connection
  this.coordinator.registerHandler('test', async (data) => {
    const formData = data as TestConnectionMessage['data'];
    await this.messageHandler.handleTestConnection(formData);
  }, { disableOnExecute: true });

  // Discover Environment ID
  this.coordinator.registerHandler('discover', async (data) => {
    const formData = data as DiscoverEnvironmentIdMessage['data'];
    await this.messageHandler.handleDiscoverEnvironmentId(formData);
  }, { disableOnExecute: true });

  // Delete Environment
  this.coordinator.registerHandler('delete', async () => {
    await this.messageHandler.handleDeleteEnvironment();
  }, { disableOnExecute: false }); // Don't disable (modal blocks anyway)

  // Validate Name (debounced from client)
  this.coordinator.registerHandler('validate-name', async (data) => {
    const nameData = data as CheckUniqueNameMessage['data'];
    await this.messageHandler.handleValidateName(nameData);
  }, { disableOnExecute: false }); // Don't disable (real-time validation)
}
```

---

## Section Enhancement: EnvironmentFormSection

**Current Implementation:** Renders basic form HTML with hardcoded values.

**Required Enhancement:** Support data binding for edit mode.

```typescript
export class EnvironmentFormSection implements ISection {
  readonly position = SectionPosition.Main;

  render(data: SectionRenderData): string {
    // Extract environment data if present
    const envData = (data as { environmentData?: EnvironmentFormViewModel }).environmentData;
    const formData = (data as { formData?: Record<string, string> }).formData || {};

    // If environmentData provided, use it to populate form
    const effectiveData = envData ? this.mapViewModelToFormData(envData) : formData;

    return `
      <div class="form-container">
        <form id="environmentForm">
          ${this.renderBasicInfo(effectiveData)}
          ${this.renderAuthentication(effectiveData)}
        </form>
      </div>
    `;
  }

  private mapViewModelToFormData(vm: EnvironmentFormViewModel): Record<string, string> {
    return {
      name: vm.name,
      dataverseUrl: vm.dataverseUrl,
      tenantId: vm.tenantId,
      authenticationMethod: vm.authenticationMethod,
      publicClientId: vm.publicClientId,
      powerPlatformEnvironmentId: vm.powerPlatformEnvironmentId || '',
      clientId: vm.clientId || '',
      username: vm.username || '',
      // Placeholders handled in renderAuthentication
      clientSecretPlaceholder: vm.clientSecretPlaceholder || '',
      passwordPlaceholder: vm.passwordPlaceholder || '',
      hasStoredClientSecret: String(vm.hasStoredClientSecret),
      hasStoredPassword: String(vm.hasStoredPassword)
    };
  }

  private renderBasicInfo(formData: Record<string, string>): string {
    return `
      <div class="form-section">
        <h2>Basic Information</h2>

        <div class="form-group">
          <label for="name">Environment Name <span style="color: var(--vscode-errorForeground);">*</span></label>
          <input type="text" id="name" name="name" placeholder="e.g., DEV" value="${this.escapeHtml(formData['name'] || '')}" required>
          <div class="help-text">A friendly name to identify this environment</div>
        </div>

        <div class="form-group">
          <label for="dataverseUrl">Dataverse URL <span style="color: var(--vscode-errorForeground);">*</span></label>
          <input type="text" id="dataverseUrl" name="dataverseUrl" placeholder="https://org.crm.dynamics.com" value="${this.escapeHtml(formData['dataverseUrl'] || '')}" required>
          <div class="help-text">The URL of your Dataverse organization</div>
        </div>

        <div class="form-group">
          <label for="environmentId">Environment ID (Optional)</label>
          <div style="display: flex; gap: 8px;">
            <input type="text" id="environmentId" name="powerPlatformEnvironmentId" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" value="${this.escapeHtml(formData['powerPlatformEnvironmentId'] || '')}" style="flex: 1;">
            <button type="button" id="discoverButton" style="white-space: nowrap;">Discover ID</button>
          </div>
          <div class="help-text">Optional: The unique GUID for this environment (for Power Apps Maker portal). Click "Discover ID" to auto-populate from BAP API.</div>
        </div>
      </div>
    `;
  }

  private renderAuthentication(formData: Record<string, string>): string {
    const authMethod = formData['authenticationMethod'] || 'Interactive';

    return `
      <div class="form-section">
        <h2>Authentication</h2>

        <div class="form-group">
          <label for="tenantId">Tenant ID (Optional)</label>
          <input type="text" id="tenantId" name="tenantId" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" value="${this.escapeHtml(formData['tenantId'] || '')}">
          <div class="help-text">Your Azure AD tenant ID. Optional for Interactive/DeviceCode/UsernamePassword (uses "organizations" authority). Required for Service Principal.</div>
        </div>

        <div class="form-group">
          <label for="authenticationMethod">Authentication Method <span style="color: var(--vscode-errorForeground);">*</span></label>
          <select id="authenticationMethod" name="authenticationMethod" required>
            <option value="Interactive" ${authMethod === 'Interactive' ? 'selected' : ''}>Interactive (Browser)</option>
            <option value="ServicePrincipal" ${authMethod === 'ServicePrincipal' ? 'selected' : ''}>Service Principal (Client Secret)</option>
            <option value="UsernamePassword" ${authMethod === 'UsernamePassword' ? 'selected' : ''}>Username/Password</option>
            <option value="DeviceCode" ${authMethod === 'DeviceCode' ? 'selected' : ''}>Device Code</option>
          </select>
          <div class="help-text">Select how you want to authenticate to this environment</div>
        </div>

        <div class="form-group">
          <label for="publicClientId">Public Client ID <span style="color: var(--vscode-errorForeground);">*</span></label>
          <input type="text" id="publicClientId" name="publicClientId" value="${this.escapeHtml(formData['publicClientId'] || '51f81489-12ee-4a9e-aaae-a2591f45987d')}" placeholder="51f81489-12ee-4a9e-aaae-a2591f45987d" required>
          <div class="help-text">Application (client) ID for Interactive/DeviceCode flows. Default is Microsoft's official public client ID.</div>
        </div>

        ${this.renderServicePrincipalFields(formData, authMethod)}
        ${this.renderUsernamePasswordFields(formData, authMethod)}
      </div>
    `;
  }

  private renderServicePrincipalFields(formData: Record<string, string>, authMethod: string): string {
    const display = authMethod === 'ServicePrincipal' ? 'block' : 'none';
    const clientSecretPlaceholder = formData['clientSecretPlaceholder'] || 'Enter client secret';

    return `
      <div class="conditional-field" data-auth-method="ServicePrincipal" style="display: ${display};">
        <div class="form-group">
          <label for="clientId">Client ID</label>
          <input type="text" id="clientId" name="clientId" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" value="${this.escapeHtml(formData['clientId'] || '')}">
          <div class="help-text">Application ID for service principal</div>
        </div>

        <div class="form-group">
          <label for="clientSecret">Client Secret</label>
          <input type="password" id="clientSecret" name="clientSecret" placeholder="${this.escapeHtml(clientSecretPlaceholder)}">
          <div class="help-text">Secret value (stored securely)</div>
        </div>
      </div>
    `;
  }

  private renderUsernamePasswordFields(formData: Record<string, string>, authMethod: string): string {
    const display = authMethod === 'UsernamePassword' ? 'block' : 'none';
    const passwordPlaceholder = formData['passwordPlaceholder'] || 'Enter password';

    return `
      <div class="conditional-field" data-auth-method="UsernamePassword" style="display: ${display};">
        <div class="form-group">
          <label for="username">Username</label>
          <input type="text" id="username" name="username" placeholder="user@domain.com" value="${this.escapeHtml(formData['username'] || '')}">
          <div class="help-text">Dataverse username</div>
        </div>

        <div class="form-group">
          <label for="password">Password</label>
          <input type="password" id="password" name="password" placeholder="${this.escapeHtml(passwordPlaceholder)}">
          <div class="help-text">Password (stored securely)</div>
        </div>
      </div>
    `;
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

---

## Client-Side Integration

**Key Point:** Client-side JavaScript (EnvironmentSetupBehavior.js) continues to work WITHOUT changes.

**Why it works:**
1. Client sends same message format: `{ command: 'save', data: {...} }`
2. Coordinator routes to registered handler
3. Handler delegates to MessageHandler (same as before)
4. MessageHandler posts same response messages: `{ command: 'environment-saved', data: {...} }`
5. Client receives same messages and processes them

**Message Flow:**

```
Client (EnvironmentSetupBehavior.js)
  ↓ postMessage({ command: 'save', data: formData })
PanelCoordinator
  ↓ routes to registered 'save' handler
Panel.handleSave()
  ↓ delegates to
MessageHandler.handleSaveEnvironment(formData)
  ↓ executes use case
  ↓ posts message back
  ↓ webview.postMessage({ command: 'environment-saved', data: {...} })
Client receives message
  ↓ handleSaveComplete(data)
  ↓ updates UI
```

**No changes needed to:**
- Form submission logic
- Validation error display
- Progress indicators
- Button state management
- Conditional field visibility

**The ONLY difference:** Messages routed through PanelCoordinator instead of manual if/else chain.

---

## State Management

### Panel Singleton Mapping

**Current Behavior (PRESERVE):**
- Map key: `environmentId || 'new'`
- New environments: key = `'new'`
- After save: key changes from `'new'` → `actualEnvironmentId`

**Implementation:**

```typescript
// In constructor
const panelKey = environmentId || 'new';
EnvironmentSetupPanelComposed.currentPanels.set(panelKey, this);

// In message handler callback (after save)
private updatePanelMapping(oldId: string, newId: string): void {
  EnvironmentSetupPanelComposed.currentPanels.delete(oldId);
  EnvironmentSetupPanelComposed.currentPanels.set(newId, this);
}

// In dispose
const panelKey = this.currentEnvironmentId || 'new';
EnvironmentSetupPanelComposed.currentPanels.delete(panelKey);
```

### Current Environment ID Tracking

**Current Behavior (PRESERVE):**
- `undefined` for new environments
- Set to actual ID after save
- Used for concurrent edit checking
- Used for exclude filter in name validation

**Implementation:**

```typescript
private currentEnvironmentId?: string;

// Getter callback for message handler
() => this.currentEnvironmentId

// Setter callback for message handler
(id: string) => { this.currentEnvironmentId = id; }
```

### Concurrent Edit Sessions

**Current Behavior (PRESERVE):**
- Check on panel open (if editing)
- Register session on panel open
- Unregister session on panel dispose
- Prevent multiple panels editing same environment

**Implementation:**

```typescript
// In constructor (before coordinator creation)
if (environmentId) {
  const canEdit = this.checkConcurrentEditUseCase.execute({ environmentId });
  if (!canEdit.canEdit) {
    vscode.window.showWarningMessage('This environment is already being edited in another panel');
    return; // Early exit
  }

  this.checkConcurrentEditUseCase.registerEditSession(environmentId);
}

// In dispose
if (this.currentEnvironmentId) {
  this.checkConcurrentEditUseCase.unregisterEditSession(this.currentEnvironmentId);
}
```

---

## Error Handling

### Validation Errors

**Current Behavior (PRESERVE):**
- Server-side validation returns errors array
- Client displays inline validation messages
- Field highlighting with red border
- Error messages below fields

**Implementation:** NO CHANGES (handled by MessageHandler + client JS)

### Connection Errors

**Current Behavior (PRESERVE):**
- Test connection shows progress notification
- Errors displayed via VS Code error message
- Button state updated (disabled → error → enabled)

**Implementation:** NO CHANGES (handled by MessageHandler)

### Discovery Errors

**Current Behavior (PRESERVE):**
- Cancellation supported (token)
- Interactive auth fallback dialog
- Progress notifications
- Error messages

**Implementation:** NO CHANGES (handled by MessageHandler)

---

## File Structure

### Files to Modify

```
src/features/environmentSetup/
├── presentation/
│   ├── panels/
│   │   └── EnvironmentSetupPanelComposed.ts  ← MODIFY (implement pattern)
│   ├── sections/
│   │   └── EnvironmentFormSection.ts         ← MODIFY (add data binding)
│   └── handlers/
│       └── EnvironmentSetupMessageHandler.ts ← KEEP (no changes)
```

### Files to Keep (No Changes)

```
src/features/environmentSetup/
├── application/
│   ├── useCases/                             ← UNCHANGED
│   ├── viewModels/
│   │   └── EnvironmentFormViewModel.ts       ← UNCHANGED
│   └── mappers/                              ← UNCHANGED
├── infrastructure/                           ← UNCHANGED
└── presentation/
    └── handlers/
        └── EnvironmentSetupMessageHandler.ts ← UNCHANGED
```

### Files to Delete (After Migration)

```
src/features/environmentSetup/
└── presentation/
    ├── panels/
    │   └── EnvironmentSetupPanel.ts          ← DELETE (replaced by Composed)
    └── views/
        └── environmentSetup.ts               ← DELETE (functionality in Section)
```

---

## Testing Strategy

### Manual Testing Scenarios

**New Environment:**
1. Open command: "New Environment"
2. Fill form fields
3. Click "Save Environment"
4. Verify: Panel key changes from 'new' → actual ID
5. Verify: Delete button appears
6. Verify: Concurrent edit session registered

**Edit Existing:**
1. Open command: "Edit Environment" (pick existing)
2. Verify: Form populated with existing data
3. Verify: Credential placeholders shown
4. Modify fields
5. Click "Save Environment"
6. Verify: Changes persisted

**Test Connection:**
1. Fill valid credentials
2. Click "Test Connection"
3. Verify: Progress notification appears
4. Verify: Success/error message shown
5. Verify: Button state updates correctly

**Discover Environment ID:**
1. Fill valid credentials
2. Click "Discover ID"
3. Verify: Progress notification (cancellable)
4. Verify: Field populated on success
5. Verify: Interactive fallback offered if needed

**Delete Environment:**
1. Open existing environment
2. Click "Delete Environment"
3. Verify: Confirmation modal appears
4. Confirm deletion
5. Verify: Panel closes
6. Verify: Environment removed from tree
7. Verify: Concurrent edit session unregistered

**Validate Name:**
1. Type environment name
2. Verify: Debounced validation (500ms)
3. Verify: Error shown if duplicate
4. Verify: Error clears when unique

**Concurrent Edit:**
1. Open environment A for editing
2. Try to open same environment A again
3. Verify: Warning message shown
4. Verify: Second panel doesn't open

**Form State:**
1. Change authentication method
2. Verify: Conditional fields show/hide
3. Verify: Client-side JS handles visibility
4. Verify: Orphaned credentials cleared on save

### Unit Tests (Not Required for Migration)

**Rationale:** This is a refactoring (behavior preservation). Manual testing sufficient.

**Future Tests (if needed):**
- Test command handler registration
- Test panel singleton logic
- Test state updates via callbacks

---

## Dependencies & Prerequisites

### External Dependencies
- VS Code APIs: webview, window, commands (existing)
- PanelCoordinator (already implemented)
- HtmlScaffoldingBehavior (already implemented)
- SectionCompositionBehavior (already implemented)

### Internal Prerequisites
- EnvironmentFormSection exists (already mocked)
- EnvironmentSetupMessageHandler exists (fully implemented)
- All use cases exist (fully implemented)
- Client-side JS exists (EnvironmentSetupBehavior.js)

### Breaking Changes
- NONE (100% functionality preservation)

---

## Clean Architecture Compliance Checklist

**Domain Layer:**
- N/A (no domain changes)

**Application Layer:**
- N/A (no application changes)

**Infrastructure Layer:**
- N/A (no infrastructure changes)

**Presentation Layer:**
- [x] Panel uses PanelCoordinator (orchestration framework)
- [x] No business logic in panel (delegates to MessageHandler)
- [x] HTML generated by Section (separation of concerns)
- [x] Dependencies point inward (panel → application → domain)
- [x] Logging for user actions (preserved from current)

**Type Safety:**
- [x] No `any` types
- [x] Explicit command types (`EnvironmentSetupCommands` union)
- [x] Type-safe message handler callbacks
- [x] Proper null handling (currentEnvironmentId?: string)

---

## Migration Strategy

### Step 1: Enhance EnvironmentFormSection
- Add data binding support (mapViewModelToFormData)
- Add escapeHtml helper
- Add conditional field rendering with display logic

### Step 2: Implement EnvironmentSetupPanelComposed
- Copy structure from SolutionExplorerPanelComposed
- Adapt constructor parameters (7 use cases + logger)
- Implement createCoordinator with form section
- Create message handler with callbacks
- Register 5 command handlers
- Implement dispose logic

### Step 3: Wire Up Commands
- Update extension.ts to use EnvironmentSetupPanelComposed
- Ensure both "New Environment" and "Edit Environment" work
- Test panel singleton logic

### Step 4: Manual Testing
- Test all 5 commands (save, test, discover, delete, validate)
- Test new vs edit mode
- Test concurrent edit protection
- Test panel singleton mapping
- Test client-side integration

### Step 5: Cleanup
- Delete EnvironmentSetupPanel.ts (old implementation)
- Delete environmentSetup.ts view (replaced by Section)
- Update imports if needed

### Step 6: Commit
- Single commit: "Migrate Environment Setup panel to PanelCoordinator pattern"
- Include all changes (panel, section, deletions)

---

## Key Architectural Decisions

### Decision 1: Keep EnvironmentSetupMessageHandler
**Considered:** Inline all logic into panel command handlers
**Chosen:** Keep MessageHandler as separate class
**Rationale:**
- Already well-factored and tested
- Complex orchestration logic (discover with fallback, etc.)
- Separation of concerns (panel coordinates, handler orchestrates)
- Reduces migration risk
**Tradeoffs:** Extra indirection, but cleaner separation

### Decision 2: Enhance EnvironmentFormSection Instead of New View
**Considered:** Keep old view file, create new rendering approach
**Chosen:** Enhance existing section to support data binding
**Rationale:**
- Sections are the new pattern (views being deprecated)
- Centralizes form rendering logic
- Consistent with other panels
**Tradeoffs:** Section becomes slightly more complex, but still manageable

### Decision 3: No Custom Behaviors
**Considered:** Create custom behavior for form state management
**Chosen:** Use HtmlScaffoldingBehavior + client-side JS
**Rationale:**
- Form state (conditional fields) already handled client-side
- No need to replicate in behavior
- Simpler architecture
**Tradeoffs:** Client-side JS required, but already exists

### Decision 4: Preserve Panel Singleton Mapping Logic
**Considered:** Simplify to one panel per environment ID
**Chosen:** Keep 'new' + actual ID mapping
**Rationale:**
- Existing behavior works well
- Allows multiple "new environment" panels (different forms)
- Prevents concurrent edits of same environment
**Tradeoffs:** Slightly more complex mapping, but well-understood

---

## Open Questions

- [ ] Should ActionButtonsSection support dynamic button visibility (hide delete for new environments)?
  - **Current:** Delete button hidden via client-side JS (`style="display: none"`)
  - **Alternative:** Server-side render logic in section
  - **Recommendation:** Keep client-side (simpler, already working)

- [ ] Should EnvironmentFormSection handle credential placeholders?
  - **Current:** Client-side sets placeholder after load
  - **Alternative:** Server-side render with placeholders
  - **Recommendation:** Server-side (data available in ViewModel)

- [ ] Do we need a FormStateBehavior for conditional field visibility?
  - **Current:** Client-side JS handles show/hide on auth method change
  - **Alternative:** Create behavior to sync form state
  - **Recommendation:** Keep client-side (no server-side logic needed)

---

## References

- Related features: SolutionExplorerPanelComposed (reference implementation)
- PanelCoordinator: `src/shared/infrastructure/ui/coordinators/PanelCoordinator.ts`
- Current implementation: `src/features/environmentSetup/presentation/panels/EnvironmentSetupPanel.ts`
- Message handler: `src/features/environmentSetup/presentation/handlers/EnvironmentSetupMessageHandler.ts`
- Client-side: `resources/webview/js/behaviors/EnvironmentSetupBehavior.js`

---

## Review & Approval

### Design Phase
- [ ] Design review (all aspects covered)
- [ ] Human approval of migration approach

### Implementation Phase
- [ ] Slice 1: Panel scaffold
- [ ] Slice 2: Save command
- [ ] Slice 3: Test + Discover commands
- [ ] Slice 4: Delete + Validate commands
- [ ] Slice 5: Load environment data

### Final Approval
- [ ] All slices implemented
- [ ] Manual testing completed (all scenarios pass)
- [ ] Old files deleted
- [ ] Extension integration verified (F5 test)

**Status:** Draft
**Approver:** [Pending]
**Date:** [Pending]
