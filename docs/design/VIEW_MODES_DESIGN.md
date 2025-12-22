# View Modes - Technical Design

**Status:** Draft
**Date:** 2025-12-21
**Complexity:** Moderate

---

## Overview

**User Problem:** The Plugin Registration panel currently shows all items in a flat "Assembly View" (packages, assemblies, webhooks, service endpoints, data providers, custom APIs at root level). Users coming from PRT (Plugin Registration Tool) expect to switch between different organizational views, particularly a "Message View" that groups steps by SDK message and entity.

**Solution:** Add a view mode switcher to the toolbar that allows users to toggle between "Assembly View" (current default) and "Message View" (steps grouped by message/entity hierarchy).

**Value:** Improves usability for users migrating from PRT, provides alternative data organization that makes it easier to see which messages/entities have plugin steps registered, and maintains our superior default (showing Custom APIs at root, unlike PRT).

---

## Requirements

### Functional Requirements
- [ ] Display view mode dropdown/toggle in toolbar
- [ ] Support "Assembly View" (current default behavior)
- [ ] Support "Message View" (steps grouped by message/entity)
- [ ] Preserve current view mode in workspace state (per environment)
- [ ] Switch views without reloading data from API
- [ ] Custom APIs appear at root level in BOTH views (better than PRT)

### Non-Functional Requirements
- [ ] View switch should be instant (< 100ms) - no API calls
- [ ] State persists across VS Code restarts
- [ ] Clean Architecture compliance (domain layer knows nothing about view modes)
- [ ] Type-safe view mode handling

### Success Criteria
- [ ] User can switch between Assembly and Message views via toolbar dropdown
- [ ] Message view groups steps by SDK Message → Entity → Steps hierarchy
- [ ] Assembly view shows current behavior (packages, assemblies, webhooks, etc.)
- [ ] View mode persists when panel is closed and reopened
- [ ] Switching views is instantaneous (no loading spinner)

---

## Implementation Slices (Vertical Slicing)

### MVP Slice (Slice 1): "User can switch to Message View (Custom APIs + Messages only)"

**Goal:** Simplest possible view mode toggle with basic Message view rendering.

**Domain:**
- NO CHANGES (view modes are presentation concern)

**Application:**
- Add `TreeViewMode` enum: `'assembly' | 'message'`
- Add `viewMode` parameter to `PluginRegistrationTreeMapper.toTreeItems()`
- Implement message grouping logic in mapper (uses existing `PluginStep.getMessageName()`)

**Infrastructure:**
- NO CHANGES (data fetching unchanged)

**Presentation:**
- Add `ViewModeSection` custom section (dropdown with 2 options)
- Add `viewModeChange` command to `PluginRegistrationCommands`
- Add view mode state management in panel
- Persist view mode in workspace state

**Result:** WORKING VIEW MODE SWITCHER ✅ (proves entire stack)

---

### Slice 2: "Message View shows Entity nodes as children of Messages"

**Builds on:** Slice 1

**Domain:**
- NO CHANGES

**Application:**
- Enhance mapper to group steps by entity within messages
- Add `SdkMessageViewModel` type (for message nodes)
- Add `EntityGroupViewModel` type (for entity nodes under messages)

**Infrastructure:**
- NO CHANGES

**Presentation:**
- Update message rendering to show entity hierarchy

**Result:** FULL MESSAGE VIEW HIERARCHY ✅

---

### Slice 3: "Polish - Icon selection, counts, tooltips"

**Builds on:** Slice 2

**Domain:**
- NO CHANGES

**Application:**
- Add step counts to message/entity nodes
- Add tooltips with metadata

**Presentation:**
- Polish UI with appropriate icons
- Add keyboard shortcuts (optional)

**Result:** POLISHED FEATURE ✅

---

## Architecture Design

### Layer Responsibilities

```
┌─────────────────────────────────────────────────────────────┐
│ Presentation Layer                                          │
│ - Panel manages view mode state (NOT domain concern)       │
│ - ViewModeSection provides dropdown UI                     │
│ - Pass view mode to mapper when rendering                  │
└─────────────────────────────────────────────────────────────┘
                          ↓ depends on ↓
┌─────────────────────────────────────────────────────────────┐
│ Application Layer                                           │
│ - Mapper accepts viewMode parameter                        │
│ - Mapper builds appropriate tree structure based on mode   │
│ - New ViewModels: SdkMessageViewModel, EntityGroupViewModel│
└─────────────────────────────────────────────────────────────┘
                          ↓ depends on ↓
┌─────────────────────────────────────────────────────────────┐
│ Domain Layer                                                │
│ - NO CHANGES (view modes are presentation concern)         │
│ - PluginStep.getMessageName() already exists              │
│ - PluginStep.getPrimaryEntityLogicalName() already exists  │
└─────────────────────────────────────────────────────────────┘
                          ↑ implements ↑
┌─────────────────────────────────────────────────────────────┐
│ Infrastructure Layer                                        │
│ - NO CHANGES (data fetching unchanged)                     │
└─────────────────────────────────────────────────────────────┘
```

### Dependency Direction
✅ **CORRECT:**
- Presentation → Application (passes view mode to mapper)
- Application processes view mode (transforms tree structure)
- Domain unchanged (view modes are presentation concern)

❌ **NEVER:**
- Domain knows about view modes
- Use case accepts view mode parameter
- Repository filters by view mode

---

## Type Contracts (Define BEFORE Implementation)

### Application Layer Types

#### View Mode Enum
```typescript
/**
 * View mode for plugin registration tree.
 *
 * - Assembly: Packages → Assemblies → Types → Steps (current default)
 * - Message: Messages → Entities → Steps (PRT-style)
 */
export enum TreeViewMode {
  Assembly = 'assembly',
  Message = 'message'
}
```

#### New ViewModels for Message View

```typescript
/**
 * ViewModel for SDK Message nodes in Message View.
 * Groups steps by message name.
 */
export interface SdkMessageViewModel {
  readonly id: string; // Generated ID (message name)
  readonly messageName: string;
  readonly displayName: string; // "Create", "Update", etc.
  readonly stepCount: number; // Total steps for this message
  readonly hasEntityGroups: boolean; // True if any step has entity
}

/**
 * ViewModel for Entity group nodes in Message View.
 * Groups steps by entity under a message.
 */
export interface EntityGroupViewModel {
  readonly id: string; // Generated ID (message + entity)
  readonly parentMessageName: string;
  readonly entityLogicalName: string;
  readonly displayName: string; // "account", "contact", etc.
  readonly stepCount: number; // Steps for this message/entity combo
}
```

#### Enhanced TreeItemViewModel

```typescript
/**
 * Extended tree item type to include new node types.
 */
export interface TreeItemViewModel {
  readonly id: string;
  readonly parentId: string | null;
  readonly type:
    | 'package'
    | 'assembly'
    | 'pluginType'
    | 'step'
    | 'image'
    | 'webHook'
    | 'serviceEndpoint'
    | 'dataProvider'
    | 'customApi'
    | 'sdkMessage'      // NEW - message grouping node
    | 'entityGroup';    // NEW - entity grouping node
  readonly name: string;
  readonly displayName: string;
  readonly icon: string;
  readonly metadata:
    | PackageMetadata
    | AssemblyMetadata
    | PluginTypeMetadata
    | StepMetadata
    | ImageMetadata
    | WebHookMetadata
    | ServiceEndpointMetadata
    | DataProviderMetadata
    | CustomApiMetadata
    | SdkMessageMetadata    // NEW
    | EntityGroupMetadata;  // NEW
  readonly isManaged: boolean;
  readonly children: TreeItemViewModel[];
}

/**
 * Metadata for SDK Message nodes.
 */
export interface SdkMessageMetadata {
  readonly type: 'sdkMessage';
  readonly messageName: string;
  readonly stepCount: number;
  readonly hasEntityGroups: boolean;
}

/**
 * Metadata for Entity Group nodes.
 */
export interface EntityGroupMetadata {
  readonly type: 'entityGroup';
  readonly messageName: string;
  readonly entityLogicalName: string;
  readonly stepCount: number;
}
```

#### Mapper Signature Changes

```typescript
export class PluginRegistrationTreeMapper {
  /**
   * Converts domain tree to ViewModels.
   *
   * @param viewMode - Display mode (assembly or message)
   * @param packages - Package tree nodes
   * @param standaloneAssemblies - Standalone assembly tree nodes
   * @param webHooks - WebHooks (always at root)
   * @param serviceEndpoints - Service endpoints (always at root)
   * @param dataProviders - Data providers (always at root)
   * @param customApis - Custom APIs (always at root in BOTH views)
   * @returns Flat array of tree items (parent/child via parentId)
   */
  public toTreeItems(
    viewMode: TreeViewMode,
    packages: ReadonlyArray<PackageTreeNode>,
    standaloneAssemblies: ReadonlyArray<AssemblyTreeNode>,
    webHooks: ReadonlyArray<WebHook>,
    serviceEndpoints: ReadonlyArray<ServiceEndpoint>,
    dataProviders: ReadonlyArray<DataProvider>,
    customApis: ReadonlyArray<CustomApiTreeNode>
  ): TreeItemViewModel[];

  /**
   * Builds message view tree from all steps in assembly hierarchy.
   * Groups steps by Message → Entity → Steps.
   *
   * Custom APIs are included at root level (same as assembly view).
   *
   * @param packages - Package tree nodes (source of steps)
   * @param standaloneAssemblies - Standalone assembly tree nodes (source of steps)
   * @param customApis - Custom APIs (shown at root level)
   * @returns Tree items in message hierarchy
   */
  private buildMessageViewTree(
    packages: ReadonlyArray<PackageTreeNode>,
    standaloneAssemblies: ReadonlyArray<AssemblyTreeNode>,
    customApis: ReadonlyArray<CustomApiTreeNode>
  ): TreeItemViewModel[];

  /**
   * Extracts all steps from package and assembly hierarchy.
   */
  private extractAllSteps(
    packages: ReadonlyArray<PackageTreeNode>,
    standaloneAssemblies: ReadonlyArray<AssemblyTreeNode>
  ): Array<{ step: PluginStep; pluginTypeId: string }>;

  /**
   * Groups steps by message name, then by entity (if applicable).
   */
  private groupStepsByMessageAndEntity(
    steps: Array<{ step: PluginStep; pluginTypeId: string }>
  ): Map<string, Map<string | null, Array<{ step: PluginStep; pluginTypeId: string }>>>;
}
```

---

### Presentation Layer Types

#### Custom Section for View Mode Selector

```typescript
/**
 * Section displaying view mode dropdown.
 * Allows user to switch between Assembly and Message views.
 */
export class ViewModeSection implements ISection {
  public readonly id = 'viewMode';
  public readonly position = SectionPosition.Toolbar;

  constructor(
    private readonly currentMode: TreeViewMode,
    private readonly onChange: (mode: TreeViewMode) => void
  ) {}

  public render(): string {
    return `
      <div class="section-view-mode">
        <label for="viewModeSelect">View:</label>
        <select id="viewModeSelect" class="view-mode-select">
          <option value="${TreeViewMode.Assembly}" ${this.currentMode === TreeViewMode.Assembly ? 'selected' : ''}>
            Assembly View
          </option>
          <option value="${TreeViewMode.Message}" ${this.currentMode === TreeViewMode.Message ? 'selected' : ''}>
            Message View
          </option>
        </select>
      </div>
    `;
  }

  public getMessageHandlers(): Map<string, (data: unknown) => void | Promise<void>> {
    return new Map([
      ['viewModeChange', async (data) => {
        const mode = (data as { mode?: TreeViewMode })?.mode;
        if (mode) {
          await this.onChange(mode);
        }
      }]
    ]);
  }
}
```

#### Panel State Management

```typescript
/**
 * Extended command type for Plugin Registration panel.
 */
type PluginRegistrationCommands =
  | 'refresh'
  | 'openMaker'
  | 'environmentChange'
  | 'solutionChange'
  | 'viewModeChange'  // NEW
  | 'selectNode'
  | 'filterTree'
  // ... existing commands
  ;

/**
 * Workspace state keys.
 */
interface PluginRegistrationPanelState {
  /**
   * Current view mode per environment.
   * Key: environmentId, Value: TreeViewMode
   */
  viewModes: Record<string, TreeViewMode>;
}

/**
 * State management methods in panel.
 */
export class PluginRegistrationPanelComposed {
  private currentViewMode: TreeViewMode = TreeViewMode.Assembly;

  /**
   * Loads view mode from workspace state.
   */
  private loadViewModeFromState(): TreeViewMode {
    const state = this.extensionContext.workspaceState.get<PluginRegistrationPanelState>(
      'pluginRegistration',
      { viewModes: {} }
    );

    return state.viewModes[this.currentEnvironmentId] ?? TreeViewMode.Assembly;
  }

  /**
   * Saves view mode to workspace state.
   */
  private async saveViewModeToState(mode: TreeViewMode): Promise<void> {
    const state = this.extensionContext.workspaceState.get<PluginRegistrationPanelState>(
      'pluginRegistration',
      { viewModes: {} }
    );

    state.viewModes[this.currentEnvironmentId] = mode;

    await this.extensionContext.workspaceState.update('pluginRegistration', state);
  }

  /**
   * Handles view mode change from UI.
   */
  private async handleViewModeChange(mode: TreeViewMode): Promise<void> {
    this.logger.debug('View mode changed', { from: this.currentViewMode, to: mode });

    this.currentViewMode = mode;
    await this.saveViewModeToState(mode);

    // Re-render tree with existing data (NO API call)
    await this.renderTreeWithCurrentData();
  }

  /**
   * Re-renders tree using cached data and current view mode.
   * Does NOT make API calls - uses data from last successful load.
   */
  private async renderTreeWithCurrentData(): Promise<void> {
    if (!this.cachedTreeResult) {
      this.logger.warn('No cached tree data available for re-render');
      return;
    }

    // Build tree ViewModels with current view mode
    const treeItems = this.treeMapper.toTreeItems(
      this.currentViewMode,  // NEW - pass current view mode
      this.cachedTreeResult.packages,
      this.cachedTreeResult.standaloneAssemblies,
      this.cachedTreeResult.webHooks,
      this.cachedTreeResult.serviceEndpoints,
      this.cachedTreeResult.dataProviders,
      this.cachedTreeResult.customApis
    );

    // Update tree view (data-driven, no full HTML re-render)
    await this.panel.webview.postMessage({
      command: 'updateTree',
      data: { treeItems }
    });
  }
}
```

---

## Message View Tree Structure

### Assembly View (Current Behavior)
```
Root
├─ Package: MyPackage
│  └─ Assembly: MyAssembly.dll
│     └─ PluginType: MyPlugin
│        └─ Step: Create of account
│           └─ Image: PreImage
├─ Assembly: StandaloneAssembly.dll
│  └─ PluginType: StandalonePlugin
│     └─ Step: Update of contact
├─ WebHook: MyWebHook
├─ ServiceEndpoint: MyServiceBus
├─ DataProvider: MyVirtualEntity
└─ CustomApi: my_CustomAction
```

### Message View (New)
```
Root
├─ CustomApi: my_CustomAction (same as assembly view)
├─ Message: Create
│  ├─ Entity: account
│  │  └─ Step: Create of account (PreValidation, Sync, Rank 10)
│  │     └─ Image: PreImage
│  └─ Entity: contact
│     └─ Step: Create of contact (PostOperation, Async, Rank 20)
├─ Message: Update
│  └─ Entity: contact
│     └─ Step: Update of contact (PreOperation, Sync, Rank 1)
└─ Message: Delete
   └─ Step: Delete (no entity - global message)
```

### Grouping Logic

**Assembly View:**
- Packages → Assemblies → PluginTypes → Steps → Images
- WebHooks, ServiceEndpoints, DataProviders, CustomApis at root

**Message View:**
1. **Extract all steps** from packages/assemblies hierarchy
2. **Group by message name** (`step.getMessageName()`)
3. **Group by entity** within each message (`step.getPrimaryEntityLogicalName()`)
   - `null` entity = step directly under message (no entity node)
   - `non-null` entity = entity node → steps as children
4. **CustomApis at root** (same as assembly view - our improvement over PRT)

---

## File Structure

```
src/features/pluginRegistration/
├── domain/
│   └── (NO CHANGES - view modes are presentation concern)
│
├── application/
│   ├── viewModels/
│   │   └── TreeItemViewModel.ts           # MODIFIED - add sdkMessage, entityGroup types
│   ├── mappers/
│   │   └── PluginRegistrationTreeMapper.ts # MODIFIED - add viewMode parameter
│   └── enums/
│       └── TreeViewMode.ts                # NEW - view mode enum
│
├── infrastructure/
│   └── (NO CHANGES - data fetching unchanged)
│
└── presentation/
    ├── panels/
    │   └── PluginRegistrationPanelComposed.ts # MODIFIED - view mode state management
    └── sections/
        └── ViewModeSection.ts             # NEW - view mode dropdown section
```

**New Files:** 2 files
- `application/enums/TreeViewMode.ts`
- `presentation/sections/ViewModeSection.ts`

**Modified Files:** 3 existing files
- `application/viewModels/TreeItemViewModel.ts` (add new node types)
- `application/mappers/PluginRegistrationTreeMapper.ts` (add viewMode parameter, message view logic)
- `presentation/panels/PluginRegistrationPanelComposed.ts` (state management, command handler)

**Total:** 5 files for this feature

---

## Testing Strategy

### Domain Tests (Target: N/A - no domain changes)
- No domain changes required

### Application Tests (Target: 90% coverage)

#### Mapper Tests
```typescript
describe('PluginRegistrationTreeMapper', () => {
  describe('toTreeItems - Assembly View', () => {
    it('should render assembly view hierarchy', () => {
      const mapper = new PluginRegistrationTreeMapper();
      const result = mapper.toTreeItems(
        TreeViewMode.Assembly,
        packages, assemblies, [], [], [], customApis
      );

      expect(result).toHaveLength(/* package + assembly + customApi count */);
      // Verify hierarchy: packages → assemblies → types → steps
    });
  });

  describe('toTreeItems - Message View', () => {
    it('should group steps by message and entity', () => {
      const mapper = new PluginRegistrationTreeMapper();
      const result = mapper.toTreeItems(
        TreeViewMode.Message,
        packages, assemblies, [], [], [], customApis
      );

      // Verify message nodes at root
      const messageNodes = result.filter(n => n.type === 'sdkMessage');
      expect(messageNodes).toHaveLength(/* unique message count */);

      // Verify entity nodes under messages
      const entityNodes = result.filter(n => n.type === 'entityGroup');
      expect(entityNodes).toHaveLength(/* unique message/entity combos */);

      // Verify steps under entities
      const steps = result.filter(n => n.type === 'step');
      expect(steps).toHaveLength(/* total step count */);

      // Verify custom APIs at root (same as assembly view)
      const customApiNodes = result.filter(n => n.type === 'customApi');
      expect(customApiNodes).toHaveLength(customApis.length);
    });

    it('should handle steps without entities (global messages)', () => {
      const stepWithoutEntity = PluginStepTestFactory.create({
        messageName: 'Delete',
        primaryEntityLogicalName: null
      });

      const mapper = new PluginRegistrationTreeMapper();
      const result = mapper.toTreeItems(
        TreeViewMode.Message,
        [], [{ assembly, pluginTypes: [{ pluginType, steps: [{ step: stepWithoutEntity, images: [] }] }] }],
        [], [], [], []
      );

      // Verify step is directly under message (no entity node)
      const messageNode = result.find(n => n.type === 'sdkMessage' && n.name === 'Delete');
      expect(messageNode).toBeDefined();

      const stepNode = result.find(n => n.type === 'step' && n.parentId === messageNode.id);
      expect(stepNode).toBeDefined();
    });
  });

  describe('extractAllSteps', () => {
    it('should extract steps from packages and standalone assemblies', () => {
      const mapper = new PluginRegistrationTreeMapper();
      const steps = mapper['extractAllSteps'](packages, standaloneAssemblies);

      expect(steps).toHaveLength(/* total steps across all assemblies */);
    });
  });

  describe('groupStepsByMessageAndEntity', () => {
    it('should create message → entity → steps hierarchy', () => {
      const mapper = new PluginRegistrationTreeMapper();
      const grouped = mapper['groupStepsByMessageAndEntity'](steps);

      expect(grouped.has('Create')).toBe(true);
      expect(grouped.get('Create')?.has('account')).toBe(true);
      expect(grouped.get('Create')?.get('account')).toHaveLength(/* steps for Create/account */);
    });
  });
});
```

### Infrastructure Tests (No changes required)

### Manual Testing Scenarios

1. **Happy path - Assembly View:**
   - Open Plugin Registration panel
   - Verify default view is "Assembly View"
   - See packages, assemblies, custom APIs at root
   - Expand tree to see PluginType → Step hierarchy

2. **Happy path - Message View:**
   - Open Plugin Registration panel
   - Switch to "Message View" via dropdown
   - Verify Custom APIs remain at root
   - Verify steps grouped by Message → Entity
   - Expand "Create" message, see "account", "contact" entities
   - Expand entity, see steps for that message/entity combo

3. **State persistence:**
   - Switch to Message View
   - Close panel
   - Reopen panel (same environment)
   - Verify Message View is still active

4. **Environment switching:**
   - Set Environment A to Message View
   - Set Environment B to Assembly View
   - Switch between environments
   - Verify each environment preserves its view mode

5. **Performance:**
   - Load panel with 100+ plugin steps
   - Switch between Assembly and Message views
   - Verify switch is instantaneous (< 100ms, no loading spinner)

---

## Dependencies & Prerequisites

### External Dependencies
- [ ] VS Code APIs: workspace state for persistence
- [ ] No new NPM packages required

### Internal Prerequisites
- [ ] Existing `PluginRegistrationTreeMapper` (will be extended)
- [ ] Existing tree rendering infrastructure
- [ ] Existing workspace state management

### Breaking Changes
- [ ] None - additive feature only

---

## Clean Architecture Compliance Checklist

**Domain Layer:**
- [x] Zero changes (view modes are presentation concern)
- [x] Business logic unchanged (PluginStep methods already exist)

**Application Layer:**
- [x] Mapper accepts view mode parameter (presentation passes it)
- [x] Mapper transforms tree structure based on mode (transformation only)
- [x] New ViewModels are DTOs (no behavior)
- [x] No business logic in mapper (grouping is transformation, not business logic)

**Infrastructure Layer:**
- [x] Zero changes (data fetching unchanged)

**Presentation Layer:**
- [x] Panel manages view mode state (presentation concern)
- [x] ViewModeSection provides UI
- [x] Panel passes view mode to mapper
- [x] State persisted via workspace API
- [x] No business logic in panel (calls mapper with mode parameter)

**Type Safety:**
- [x] `TreeViewMode` enum (no string literals)
- [x] Type-safe command union (includes `viewModeChange`)
- [x] Explicit return types on all new methods

---

## Extension Integration Checklist

**Commands:**
- [x] No new VS Code commands (internal panel command only)

**Extension Registration:**
- [ ] No changes to extension.ts (feature is internal to existing panel)

**Verification:**
- [ ] `npm run compile` passes
- [ ] Manual testing completed (F5, switch views, verify persistence)

---

## Key Architectural Decisions

### Decision 1: View Mode is Presentation Concern

**Considered:**
1. **View mode in domain** - Domain entities know about view modes
2. **View mode in use case** - Use case returns different data structures
3. **View mode in mapper** - Mapper transforms data based on view mode (CHOSEN)

**Chosen:** View mode in mapper (application layer)

**Rationale:**
- Clean Architecture: Domain should not know about UI presentation
- Use cases orchestrate domain logic, not UI concerns
- Mapper's job is transformation - view mode controls transformation logic
- Domain entities remain pure business logic

**Tradeoffs:**
- ✅ Domain stays clean (zero external dependencies)
- ✅ Use case unchanged (single responsibility)
- ✅ Mapper complexity increases slightly (acceptable - transformation logic belongs here)
- ❌ Mapper has more logic (mitigated by clear grouping methods with tests)

---

### Decision 2: Message View Grouping Logic

**Considered:**
1. **Fetch message/entity data separately** - Query Dataverse for SDK messages
2. **Extract from existing step data** - Group steps using `getMessageName()` and `getPrimaryEntityLogicalName()` (CHOSEN)
3. **Pre-compute in use case** - Use case builds message hierarchy

**Chosen:** Extract from existing step data in mapper

**Rationale:**
- No additional API calls (instant view switching)
- Steps already contain message and entity information
- Mapper transformation aligns with Clean Architecture
- Use case returns same data for both views (orchestration, not presentation)

**Tradeoffs:**
- ✅ Zero additional API calls (instant view switching)
- ✅ Use case remains simple (orchestration only)
- ✅ Works with existing data structure
- ❌ Mapper must iterate all steps to build message tree (acceptable - O(n) complexity, happens client-side)

---

### Decision 3: Custom APIs at Root in BOTH Views

**Considered:**
1. **PRT behavior** - Custom APIs only in Message view
2. **Always at root** - Custom APIs in both Assembly and Message views (CHOSEN)

**Chosen:** Custom APIs at root in both views

**Rationale:**
- Our current implementation is BETTER than PRT (Custom APIs visible in default view)
- Custom APIs are not steps (they're message-like entities invokable via Web API)
- Consistency: if user sees Custom APIs in Assembly view, hiding them in Message view is confusing
- Custom APIs can have plugin implementations (shown in tree), so visibility is valuable

**Tradeoffs:**
- ✅ Consistency across views
- ✅ Better than PRT (improvement, not regression)
- ✅ Custom APIs remain discoverable in both views
- ❌ Slight deviation from PRT (acceptable - we're improving the experience)

---

### Decision 4: State Persistence Strategy

**Considered:**
1. **Global view mode** - Same view mode for all environments
2. **Per-environment view mode** - Each environment remembers its view mode (CHOSEN)
3. **Session-only** - Reset to Assembly view on panel close

**Chosen:** Per-environment view mode

**Rationale:**
- User may prefer different views for different environments (dev vs. prod)
- Matches environment-scoped panel pattern (each environment is independent)
- Better UX - preserves user preference per context

**Tradeoffs:**
- ✅ Flexible (user can have different preferences per environment)
- ✅ Preserves user intent
- ❌ Slightly more state management code (acceptable - simple Map<envId, mode>)

---

## Review & Approval

### Design Phase
- [ ] design-architect invoked
- [ ] Human approval of design

### Implementation Phase (per slice)
- [ ] Slice 1 implemented (View mode switcher + basic message view)
- [ ] Slice 2 implemented (Entity hierarchy in message view)
- [ ] Slice 3 implemented (Polish - icons, counts, tooltips)

### Final Approval
- [ ] All slices implemented
- [ ] Tests written and passing (`npm test`)
- [ ] Manual testing completed (F5)
- [ ] `/code-review` - code-guardian APPROVED

**Status:** Pending
**Date:** TBD

---

## Open Questions

- [x] **Should Custom APIs appear in Message view?** - YES (both views for consistency)
- [x] **Should we support Entity view (third mode from PRT)?** - NO (defer to future, MVP is Assembly + Message)
- [x] **Should we support Package view (fourth mode from PRT)?** - NO (packages already at root in Assembly view)
- [ ] **What icon for Message nodes?** - TBD during implementation (maybe `symbol-event` or `pulse`)
- [ ] **What icon for Entity Group nodes?** - TBD during implementation (maybe `symbol-class` or `database`)

---

## References

- PRT implementation: `C:\VS\ppds\tmp\decompiled\PluginRegistration\Microsoft.Crm.Tools.PluginRegistration\OrganizationControlViewModel.cs` (lines 1719-1818)
- Panel architecture: `docs/architecture/PANEL_ARCHITECTURE.md`
- Clean Architecture guide: `docs/architecture/CLEAN_ARCHITECTURE_GUIDE.md`
- Mapper patterns: `docs/architecture/MAPPER_PATTERNS.md`
- Workflow guide: `.claude/WORKFLOW.md`
