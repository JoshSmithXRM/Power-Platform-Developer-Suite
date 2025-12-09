# Plugin Registration Slice 2: Step & Assembly Management - Technical Design

**Status:** Draft
**Date:** 2025-12-09
**Complexity:** Moderate

---

## Overview

**User Problem:** Developers need to enable/disable plugin steps and update assemblies/packages without leaving VS Code or using the legacy Plugin Registration Tool.

**Solution:** Add context menu actions to tree nodes for enable/disable steps and update assembly/package, with file picker integration and targeted node refresh.

**Value:** Faster iteration cycles when developing plugins - no context switching to external tools.

---

## Requirements

### Functional Requirements
- [ ] Right-click step node shows "Enable Step" or "Disable Step" based on current state
- [ ] Right-click standalone assembly shows "Update Assembly..."
- [ ] Right-click package shows "Update Package..."
- [ ] Right-click assembly-in-package shows "Update Package..." (redirects to parent package)
- [ ] Managed items do not show context menu actions
- [ ] File picker opens to workspace folder, remembers last-used folder per file type
- [ ] After action completes, only affected node(s) refresh (not full tree)

### Non-Functional Requirements
- [ ] Context menus use VS Code native `data-vscode-context` (no custom JS menus)
- [ ] Error messages displayed via `vscode.window.showErrorMessage`
- [ ] File content converted to Base64 before API call

### Success Criteria
- [ ] User can enable/disable a step with two clicks (right-click + menu item)
- [ ] User can update an assembly by right-click → select DLL → done
- [ ] User can update a package by right-click → select .nupkg → done
- [ ] Tree updates immediately after action without full refresh
- [ ] Managed items are protected from modification

---

## Implementation Slices (Vertical Slicing)

### Slice 2.1: "Enable/Disable Plugin Step"
**Goal:** Right-click step → toggle enabled state

**Domain:**
- PluginStep already has `canEnable()`, `canDisable()` methods

**Application:**
- `EnablePluginStepUseCase` - calls repository.enable()
- `DisablePluginStepUseCase` - calls repository.disable()

**Infrastructure:**
- `IPluginStepRepository.enable(environmentId, stepId)`
- `IPluginStepRepository.disable(environmentId, stepId)`
- `DataversePluginStepRepository` implements via PATCH statecode

**Presentation:**
- Add `data-vscode-context` to step nodes with canEnable/canDisable
- Register commands in package.json
- Register webview/context menu items
- Command handlers call use cases
- Send `updateNode` message to refresh single node

**Result:** WORKING ENABLE/DISABLE ✅

---

### Slice 2.2: "Update Standalone Assembly"
**Goal:** Right-click standalone assembly → pick DLL → upload

**Domain:**
- Add `PluginAssembly.canUpdate()` method (unmanaged + standalone)

**Application:**
- `UpdatePluginAssemblyUseCase` - orchestrates file read + repository call

**Infrastructure:**
- `IPluginAssemblyRepository.updateContent(environmentId, assemblyId, base64Content)`
- `DataversePluginAssemblyRepository` implements via PATCH content

**Presentation:**
- Add `data-vscode-context` to assembly nodes with canUpdate/isStandalone
- Register command + menu item
- File picker with .dll filter
- Persist last folder to workspace state
- `updateSubtree` message to refresh assembly + children

**Result:** WORKING ASSEMBLY UPDATE ✅

---

### Slice 2.3: "Update Plugin Package"
**Goal:** Right-click package (or assembly-in-package) → pick .nupkg → upload

**Domain:**
- Add `PluginPackage.canUpdate()` method (unmanaged)

**Application:**
- `UpdatePluginPackageUseCase` - orchestrates file read + repository call

**Infrastructure:**
- `IPluginPackageRepository.updateContent(environmentId, packageId, base64Content)`
- `DataversePluginPackageRepository` implements via PATCH content

**Presentation:**
- Add `data-vscode-context` to package nodes with canUpdate
- Add `data-vscode-context` to assembly-in-package nodes with packageId
- Register command + menu item
- File picker with .nupkg filter
- Persist last folder to workspace state
- `updateSubtree` message to refresh package + all children

**Result:** WORKING PACKAGE UPDATE ✅

---

## Architecture Design

### Context Menu Flow (VS Code Native)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 1. Tree Node HTML (plugin-registration.js)                              │
│    <div data-vscode-context='{"webviewSection":"step",                 │
│         "nodeId":"abc-123", "canEnable":true, "canDisable":false}'>    │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ 2. package.json - webview/context menu contribution                     │
│    {                                                                    │
│      "command": "power-platform-dev-suite.enablePluginStep",           │
│      "when": "webviewId == '...' && webviewSection == 'step'           │
│              && canEnable == true"                                      │
│    }                                                                    │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ 3. extension.ts - Command Handler                                       │
│    vscode.commands.registerCommand('...enablePluginStep', (context) => │
│      // context contains data-vscode-context values                     │
│      panel.handleEnableStep(context.nodeId)                            │
│    )                                                                    │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ 4. Panel Handler → Use Case → Repository → API                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ 5. Targeted Refresh: panel.postMessage({ command: 'updateNode', ... }) │
└─────────────────────────────────────────────────────────────────────────┘
```

### File Upload Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 1. User right-clicks → "Update Assembly..."                             │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ 2. vscode.window.showOpenDialog({                                       │
│      defaultUri: lastUsedFolder || workspaceFolder,                     │
│      filters: { 'DLL Files': ['dll'] }                                 │
│    })                                                                   │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ 3. Read file → Buffer → Base64                                          │
│    const content = await vscode.workspace.fs.readFile(fileUri);        │
│    const base64 = Buffer.from(content).toString('base64');             │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ 4. Use Case → Repository → PATCH /api/data/v9.2/pluginassemblies(id)   │
│    { "content": "<base64>" }                                            │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ 5. Save lastUsedFolder to workspace state                               │
│ 6. Refresh subtree (assembly + types + steps + images)                  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Type Contracts

### Domain Layer

#### PluginAssembly (existing - add method)
```typescript
// Add to existing PluginAssembly entity
public canUpdate(): boolean {
  // Can update if: unmanaged AND standalone (not in a package)
  return !this.isManaged && this.packageId === null;
}

public getPackageId(): string | null {
  return this.packageId;
}
```

#### PluginPackage (existing - add method)
```typescript
// Add to existing PluginPackage entity
public canUpdate(): boolean {
  // Can update if unmanaged
  return !this.isManaged;
}
```

#### Repository Interfaces (add methods)
```typescript
// IPluginStepRepository - add:
enable(environmentId: string, stepId: string): Promise<void>;
disable(environmentId: string, stepId: string): Promise<void>;

// IPluginAssemblyRepository - add:
updateContent(environmentId: string, assemblyId: string, base64Content: string): Promise<void>;

// IPluginPackageRepository - add:
updateContent(environmentId: string, packageId: string, base64Content: string): Promise<void>;
```

---

### Application Layer

#### EnablePluginStepUseCase
```typescript
export class EnablePluginStepUseCase {
  constructor(
    private readonly stepRepository: IPluginStepRepository,
    private readonly logger: ILogger
  ) {}

  public async execute(environmentId: string, stepId: string): Promise<void> {
    this.logger.info('Enabling plugin step', { environmentId, stepId });

    // Fetch step to validate it can be enabled
    const step = await this.stepRepository.findById(environmentId, stepId);
    if (!step) {
      throw new Error(`Plugin step not found: ${stepId}`);
    }
    if (!step.canEnable()) {
      throw new Error(`Plugin step cannot be enabled: ${step.isManaged ? 'managed' : 'already enabled'}`);
    }

    await this.stepRepository.enable(environmentId, stepId);

    this.logger.info('Plugin step enabled', { stepId });
  }
}
```

#### DisablePluginStepUseCase
```typescript
export class DisablePluginStepUseCase {
  constructor(
    private readonly stepRepository: IPluginStepRepository,
    private readonly logger: ILogger
  ) {}

  public async execute(environmentId: string, stepId: string): Promise<void> {
    this.logger.info('Disabling plugin step', { environmentId, stepId });

    const step = await this.stepRepository.findById(environmentId, stepId);
    if (!step) {
      throw new Error(`Plugin step not found: ${stepId}`);
    }
    if (!step.canDisable()) {
      throw new Error(`Plugin step cannot be disabled: ${step.isManaged ? 'managed' : 'already disabled'}`);
    }

    await this.stepRepository.disable(environmentId, stepId);

    this.logger.info('Plugin step disabled', { stepId });
  }
}
```

#### UpdatePluginAssemblyUseCase
```typescript
export class UpdatePluginAssemblyUseCase {
  constructor(
    private readonly assemblyRepository: IPluginAssemblyRepository,
    private readonly logger: ILogger
  ) {}

  public async execute(
    environmentId: string,
    assemblyId: string,
    base64Content: string
  ): Promise<void> {
    this.logger.info('Updating plugin assembly', { environmentId, assemblyId });

    const assembly = await this.assemblyRepository.findById(environmentId, assemblyId);
    if (!assembly) {
      throw new Error(`Plugin assembly not found: ${assemblyId}`);
    }
    if (!assembly.canUpdate()) {
      throw new Error(
        assembly.isManaged
          ? 'Cannot update managed assembly'
          : 'Cannot update assembly in package - update the package instead'
      );
    }

    await this.assemblyRepository.updateContent(environmentId, assemblyId, base64Content);

    this.logger.info('Plugin assembly updated', { assemblyId });
  }
}
```

#### UpdatePluginPackageUseCase
```typescript
export class UpdatePluginPackageUseCase {
  constructor(
    private readonly packageRepository: IPluginPackageRepository,
    private readonly logger: ILogger
  ) {}

  public async execute(
    environmentId: string,
    packageId: string,
    base64Content: string
  ): Promise<void> {
    this.logger.info('Updating plugin package', { environmentId, packageId });

    const pkg = await this.packageRepository.findById(environmentId, packageId);
    if (!pkg) {
      throw new Error(`Plugin package not found: ${packageId}`);
    }
    if (!pkg.canUpdate()) {
      throw new Error('Cannot update managed package');
    }

    await this.packageRepository.updateContent(environmentId, packageId, base64Content);

    this.logger.info('Plugin package updated', { packageId });
  }
}
```

---

### Infrastructure Layer

#### DataversePluginStepRepository (add methods)
```typescript
public async enable(environmentId: string, stepId: string): Promise<void> {
  const endpoint = `/api/data/v9.2/sdkmessageprocessingsteps(${stepId})`;

  this.logger.debug('Enabling plugin step', { environmentId, stepId });

  await this.apiService.patch(environmentId, endpoint, { statecode: 0 });

  this.logger.debug('Plugin step enabled', { stepId });
}

public async disable(environmentId: string, stepId: string): Promise<void> {
  const endpoint = `/api/data/v9.2/sdkmessageprocessingsteps(${stepId})`;

  this.logger.debug('Disabling plugin step', { environmentId, stepId });

  await this.apiService.patch(environmentId, endpoint, { statecode: 1 });

  this.logger.debug('Plugin step disabled', { stepId });
}
```

#### DataversePluginAssemblyRepository (add method)
```typescript
public async updateContent(
  environmentId: string,
  assemblyId: string,
  base64Content: string
): Promise<void> {
  const endpoint = `/api/data/v9.2/pluginassemblies(${assemblyId})`;

  this.logger.debug('Updating plugin assembly content', {
    environmentId,
    assemblyId,
    contentLength: base64Content.length
  });

  await this.apiService.patch(environmentId, endpoint, { content: base64Content });

  this.logger.debug('Plugin assembly content updated', { assemblyId });
}
```

#### DataversePluginPackageRepository (add method)
```typescript
public async updateContent(
  environmentId: string,
  packageId: string,
  base64Content: string
): Promise<void> {
  const endpoint = `/api/data/v9.2/pluginpackages(${packageId})`;

  this.logger.debug('Updating plugin package content', {
    environmentId,
    packageId,
    contentLength: base64Content.length
  });

  await this.apiService.patch(environmentId, endpoint, { content: base64Content });

  this.logger.debug('Plugin package content updated', { packageId });
}
```

---

### Presentation Layer

#### data-vscode-context Structure

**Step Node:**
```json
{
  "webviewSection": "step",
  "nodeId": "step-guid-here",
  "canEnable": true,
  "canDisable": false,
  "preventDefaultContextMenuItems": true
}
```

**Standalone Assembly Node:**
```json
{
  "webviewSection": "assembly",
  "nodeId": "assembly-guid-here",
  "canUpdate": true,
  "isStandalone": true,
  "preventDefaultContextMenuItems": true
}
```

**Assembly-in-Package Node:**
```json
{
  "webviewSection": "assembly",
  "nodeId": "assembly-guid-here",
  "packageId": "package-guid-here",
  "canUpdate": false,
  "isStandalone": false,
  "preventDefaultContextMenuItems": true
}
```

**Package Node:**
```json
{
  "webviewSection": "package",
  "nodeId": "package-guid-here",
  "canUpdate": true,
  "preventDefaultContextMenuItems": true
}
```

#### package.json Commands
```json
{
  "contributes": {
    "commands": [
      {
        "command": "power-platform-dev-suite.enablePluginStep",
        "title": "Enable Step"
      },
      {
        "command": "power-platform-dev-suite.disablePluginStep",
        "title": "Disable Step"
      },
      {
        "command": "power-platform-dev-suite.updatePluginAssembly",
        "title": "Update Assembly..."
      },
      {
        "command": "power-platform-dev-suite.updatePluginPackage",
        "title": "Update Package..."
      }
    ],
    "menus": {
      "webview/context": [
        {
          "command": "power-platform-dev-suite.enablePluginStep",
          "when": "webviewId == 'powerPlatformDevSuite.pluginRegistration' && webviewSection == 'step' && canEnable == true",
          "group": "1_actions@1"
        },
        {
          "command": "power-platform-dev-suite.disablePluginStep",
          "when": "webviewId == 'powerPlatformDevSuite.pluginRegistration' && webviewSection == 'step' && canDisable == true",
          "group": "1_actions@2"
        },
        {
          "command": "power-platform-dev-suite.updatePluginAssembly",
          "when": "webviewId == 'powerPlatformDevSuite.pluginRegistration' && webviewSection == 'assembly' && canUpdate == true",
          "group": "1_actions@1"
        },
        {
          "command": "power-platform-dev-suite.updatePluginPackage",
          "when": "webviewId == 'powerPlatformDevSuite.pluginRegistration' && webviewSection == 'package' && canUpdate == true",
          "group": "1_actions@1"
        },
        {
          "command": "power-platform-dev-suite.updatePluginPackage",
          "when": "webviewId == 'powerPlatformDevSuite.pluginRegistration' && webviewSection == 'assembly' && isStandalone == false",
          "group": "1_actions@1"
        }
      ]
    }
  }
}
```

#### Targeted Node Refresh Messages

**updateNode** - Single node update (for enable/disable step):
```typescript
// Extension sends to webview
await panel.postMessage({
  command: 'updateNode',
  data: {
    nodeId: 'step-guid',
    updates: {
      icon: '⚡',  // or '🚫⚡' for disabled
      metadata: { isEnabled: true }
    }
  }
});
```

**updateSubtree** - Node + all descendants (for assembly/package update):
```typescript
// Extension sends to webview
await panel.postMessage({
  command: 'updateSubtree',
  data: {
    nodeId: 'assembly-guid',
    subtree: {
      // Full TreeItemViewModel for assembly and all children
      id: 'assembly-guid',
      displayName: 'MyAssembly',
      children: [/* types with steps with images */]
    }
  }
});
```

#### Last-Folder Persistence

```typescript
// In PluginRegistrationPanelComposed

private async pickAssemblyFile(): Promise<vscode.Uri | undefined> {
  const lastFolder = this.context.workspaceState.get<string>('pluginRegistration.lastDllFolder');
  const defaultUri = lastFolder
    ? vscode.Uri.file(lastFolder)
    : vscode.workspace.workspaceFolders?.[0]?.uri;

  const result = await vscode.window.showOpenDialog({
    defaultUri,
    canSelectMany: false,
    filters: { 'DLL Files': ['dll'] },
    title: 'Select Plugin Assembly'
  });

  if (result?.[0]) {
    // Save folder for next time
    const folder = vscode.Uri.joinPath(result[0], '..').fsPath;
    await this.context.workspaceState.update('pluginRegistration.lastDllFolder', folder);
    return result[0];
  }
  return undefined;
}

private async pickPackageFile(): Promise<vscode.Uri | undefined> {
  const lastFolder = this.context.workspaceState.get<string>('pluginRegistration.lastNupkgFolder');
  const defaultUri = lastFolder
    ? vscode.Uri.file(lastFolder)
    : vscode.workspace.workspaceFolders?.[0]?.uri;

  const result = await vscode.window.showOpenDialog({
    defaultUri,
    canSelectMany: false,
    filters: { 'NuGet Packages': ['nupkg'] },
    title: 'Select Plugin Package'
  });

  if (result?.[0]) {
    const folder = vscode.Uri.joinPath(result[0], '..').fsPath;
    await this.context.workspaceState.update('pluginRegistration.lastNupkgFolder', folder);
    return result[0];
  }
  return undefined;
}
```

---

## File Structure

### New Files
```
src/features/pluginRegistration/
├── application/
│   └── useCases/
│       ├── EnablePluginStepUseCase.ts       # NEW
│       ├── DisablePluginStepUseCase.ts      # NEW
│       ├── UpdatePluginAssemblyUseCase.ts   # NEW
│       └── UpdatePluginPackageUseCase.ts    # NEW
```

### Modified Files
```
src/features/pluginRegistration/
├── domain/
│   ├── entities/
│   │   ├── PluginAssembly.ts               # ADD canUpdate(), getPackageId()
│   │   └── PluginPackage.ts                # ADD canUpdate()
│   └── interfaces/
│       ├── IPluginStepRepository.ts        # ADD enable(), disable()
│       ├── IPluginAssemblyRepository.ts    # ADD updateContent()
│       └── IPluginPackageRepository.ts     # ADD updateContent()
├── infrastructure/
│   └── repositories/
│       ├── DataversePluginStepRepository.ts      # IMPLEMENT enable(), disable()
│       ├── DataversePluginAssemblyRepository.ts  # IMPLEMENT updateContent()
│       └── DataversePluginPackageRepository.ts   # IMPLEMENT updateContent()
├── presentation/
│   └── panels/
│       └── PluginRegistrationPanelComposed.ts    # ADD command handlers, file pickers
│
resources/webview/js/features/
└── plugin-registration.js                   # ADD data-vscode-context, updateNode handler

package.json                                 # ADD commands, menu items
src/extension.ts                             # ADD command registrations
```

**New Files:** 4
**Modified Files:** 11
**Total:** 15 files

---

## Testing Strategy

### Manual Testing Scenarios (F5)

#### Enable/Disable Step
1. Expand tree to see a disabled step (🚫 icon)
2. Right-click → should see "Enable Step"
3. Click Enable Step → step updates to enabled (⚡ icon, no strikethrough)
4. Right-click again → should see "Disable Step"
5. Click Disable Step → step updates to disabled
6. Right-click managed step → should NOT see enable/disable options

#### Update Assembly
1. Right-click standalone assembly → should see "Update Assembly..."
2. Click → file picker opens to workspace folder
3. Select .dll file → assembly updates
4. Right-click again → file picker opens to same folder as before
5. Right-click assembly-in-package → should see "Update Package..." (not Update Assembly)
6. Right-click managed assembly → should NOT see update option

#### Update Package
1. Right-click package → should see "Update Package..."
2. Click → file picker opens with .nupkg filter
3. Select .nupkg file → package and all children refresh
4. Right-click managed package → should NOT see update option

### Unit Tests (Defer to Pre-PR)
- Domain: canUpdate() methods
- Use Cases: orchestration with mocked repositories
- Repositories: API endpoint construction

---

## Dependencies & Prerequisites

### External Dependencies
- VS Code APIs: `vscode.window.showOpenDialog`, `vscode.workspace.fs.readFile`
- Dataverse APIs: PATCH sdkmessageprocessingsteps, PATCH pluginassemblies, PATCH pluginpackages

### Internal Prerequisites
- Slice 1 complete (tree rendering works)
- Existing repository infrastructure (IDataverseApiService.patch)

### Breaking Changes
- None

---

## Clean Architecture Compliance Checklist

**Domain Layer:**
- [x] Entities have behavior (canUpdate methods)
- [x] Zero external dependencies
- [x] Repository interfaces defined in domain

**Application Layer:**
- [x] Use cases orchestrate only (fetch → validate → call repository)
- [x] Logging at use case boundaries

**Infrastructure Layer:**
- [x] Repositories implement domain interfaces
- [x] No business logic in repositories

**Presentation Layer:**
- [x] Context menus via VS Code native mechanism
- [x] File picker via VS Code API
- [x] Targeted refresh (not full reload)

---

## Open Questions

None - all questions resolved in planning discussion.

---

## References

- [VS Code Webview Context Menu API](https://kellylin.me/blog/vscode_api_webview_context.html)
- [data-vscode-context documentation](https://code.visualstudio.com/api/extension-guides/webview)
- Existing pattern: WebResourcesPanelComposed (file upload, Base64 encoding)
- Existing pattern: EnvironmentVariablesPanelComposed (PATCH operations)
