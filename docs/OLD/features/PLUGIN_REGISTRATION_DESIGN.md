# Plugin Registration - Design Document

**Feature:** Plugin Registration Management
**Version:** 1.0
**Last Updated:** 2025-10-27
**Status:** Design Phase

---

## Executive Summary

Implement comprehensive plugin registration management matching or exceeding Microsoft PAC CLI PRT tool capabilities. Enable developers to register, configure, and manage plugin assemblies, steps, and images directly from VS Code.

**Goals:**
- ✅ Feature parity with `pac tool prt` (Plugin Registration Tool)
- ✅ Streamlined developer workflow without leaving VS Code
- ✅ Safe operations with confirmation dialogs
- ✅ Bulk operations for efficiency
- ✅ Plugin profiler integration
- ✅ Export/import capabilities (stretch)
- ✅ Solution-based plugin view (stretch)

---

## Architecture Overview

### Component Structure

```
PluginRegistrationPanel
├── EnvironmentSelectorComponent (reused)
├── ActionBarComponent (refresh, register assembly, export/import)
├── SplitPanelComponent
│   ├── Left: AssemblyTreeComponent (hierarchical view)
│   └── Right: PropertyEditorComponent (selected item details)
└── Modal Dialogs
    ├── RegisterAssemblyModal
    ├── RegisterStepModal
    ├── RegisterImageModal
    ├── UpdateAssemblyModal
    └── ConfirmationModal
```

### Data Model

```typescript
interface PluginAssembly {
    id: string;
    name: string;
    version: string;
    culture: string;
    publickeytoken: string;
    isolationmode: IsolationMode; // Sandbox, None
    sourcetype: SourceType; // Database, Disk, GAC
    content?: string; // Base64 DLL content
    packageId?: string;
    solutionId?: string;
    solutionName?: string;
}

interface PluginType {
    id: string;
    assemblyId: string;
    typename: string;
    friendlyname: string;
    name: string;
    workflowactivitygroupname?: string;
}

interface PluginStep {
    id: string;
    pluginTypeId: string;
    name: string;
    message: string; // Create, Update, Delete, etc.
    stage: Stage; // PreValidation=10, PreOperation=20, PostOperation=40
    mode: Mode; // Synchronous=0, Asynchronous=1
    rank: number;
    filteringattributes?: string; // Comma-separated
    impersonatinguserid?: string;
    deployment: Deployment; // ServerOnly=0, OfflineOnly=1, Both=2
    description?: string;
    supporteddeployment: number;
}

interface PluginImage {
    id: string;
    stepId: string;
    name: string;
    entityalias: string;
    imagetype: ImageType; // PreImage=0, PostImage=1, Both=2
    attributes: string; // Comma-separated
    messagepropertyname: string;
}

enum IsolationMode {
    None = 1,
    Sandbox = 2
}

enum SourceType {
    Database = 0,
    Disk = 1,
    GAC = 2
}

enum Stage {
    PreValidation = 10,
    PreOperation = 20,
    PostOperation = 40
}

enum Mode {
    Synchronous = 0,
    Asynchronous = 1
}

enum Deployment {
    ServerOnly = 0,
    OfflineOnly = 1,
    Both = 2
}

enum ImageType {
    PreImage = 0,
    PostImage = 1,
    Both = 2
}
```

---

## Service Layer

### PluginRegistrationService

```typescript
export class PluginRegistrationService {

    // Assembly Management
    async getAssemblies(environmentId: string): Promise<PluginAssembly[]>
    async registerAssembly(environmentId: string, dllPath: string, isolationMode: IsolationMode): Promise<PluginAssembly>
    async updateAssembly(environmentId: string, assemblyId: string, dllPath: string): Promise<PluginAssembly>
    async deleteAssembly(environmentId: string, assemblyId: string): Promise<void>

    // Plugin Type Management
    async getPluginTypes(environmentId: string, assemblyId: string): Promise<PluginType[]>

    // Step Management
    async getSteps(environmentId: string, pluginTypeId: string): Promise<PluginStep[]>
    async registerStep(environmentId: string, step: Partial<PluginStep>): Promise<PluginStep>
    async updateStep(environmentId: string, stepId: string, step: Partial<PluginStep>): Promise<PluginStep>
    async deleteStep(environmentId: string, stepId: string): Promise<void>
    async toggleStep(environmentId: string, stepId: string, enabled: boolean): Promise<void>

    // Image Management
    async getImages(environmentId: string, stepId: string): Promise<PluginImage[]>
    async registerImage(environmentId: string, image: Partial<PluginImage>): Promise<PluginImage>
    async updateImage(environmentId: string, imageId: string, image: Partial<PluginImage>): Promise<PluginImage>
    async deleteImage(environmentId: string, imageId: string): Promise<void>

    // Bulk Operations
    async bulkToggleSteps(environmentId: string, stepIds: string[], enabled: boolean): Promise<void>
    async bulkDeleteSteps(environmentId: string, stepIds: string[]): Promise<void>

    // Export/Import (Stretch Goal)
    async exportRegistration(environmentId: string, assemblyIds: string[]): Promise<string> // Returns JSON
    async importRegistration(environmentId: string, registrationJson: string): Promise<void>

    // Solution View (Stretch Goal)
    async getAssembliesBySolution(environmentId: string, solutionId: string): Promise<PluginAssembly[]>

    // Profiler Integration
    async startProfiler(environmentId: string, stepId: string): Promise<string> // Returns profiler session ID
    async stopProfiler(environmentId: string, sessionId: string): Promise<void>
    async getProfilerResults(environmentId: string, sessionId: string): Promise<ProfilerResult[]>
}

interface ProfilerResult {
    id: string;
    typename: string;
    messagename: string;
    performanceexecutionduration: number;
    performanceexecutionstartime: Date;
    depth: number;
    messageblock: string;
    exceptiondetails?: string;
}
```

---

## UI/UX Design

### Panel Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ Environment: [Production ▼]                     [Connected ●]   │
├─────────────────────────────────────────────────────────────────┤
│ [Refresh] [Register Assembly] [Export] [Import] [Start Profiler]│
├─────────────────────────────────────────────────────────────────┤
│ Assembly Tree (Left)        │ Properties (Right)                │
│─────────────────────────────┼───────────────────────────────────│
│ ▼ MyPlugin.Assembly v1.0.0  │ Assembly: MyPlugin.Assembly       │
│   📦 Isolation: Sandbox      │                                   │
│   ├─ ▶ MyPlugin.ContactCreate│ Name: MyPlugin.Assembly          │
│   │   ├─ Create (Post-Op)   │ Version: 1.0.0.0                  │
│   │   └─ Update (Pre-Op)    │ Culture: neutral                  │
│   └─ ▶ MyPlugin.AccountSync │ Public Key Token: 1234abcd        │
│                              │ Isolation Mode: Sandbox           │
│ ▼ AnotherPlugin v2.1.0       │ Source Type: Database             │
│   📦 Isolation: None         │                                   │
│   └─ ▶ AnotherPlugin.Handler│ Solutions:                        │
│                              │   • Default Solution              │
│                              │                                   │
│                              │ [Update Assembly] [Delete]        │
│                              │                                   │
└─────────────────────────────┴───────────────────────────────────┘
```

### Step Details View (Right Panel)

```
┌─────────────────────────────────────────────────────────────────┐
│ Step: Create Contact - Post Operation                           │
├─────────────────────────────────────────────────────────────────┤
│ ✓ Enabled                                                        │
│                                                                  │
│ Basic Information:                                               │
│   Name: Create Contact - Post Operation                         │
│   Plugin Type: MyPlugin.ContactCreate                            │
│   Message: Create                                                │
│   Primary Entity: contact                                        │
│                                                                  │
│ Execution:                                                       │
│   Stage: Post-operation                                          │
│   Execution Mode: Asynchronous                                   │
│   Rank: 1                                                        │
│                                                                  │
│ Configuration:                                                   │
│   Filtering Attributes: firstname, lastname, emailaddress1      │
│   Deployment: Server Only                                        │
│   Impersonating User: (None)                                     │
│                                                                  │
│ Images:                                                          │
│   ├─ PreImage (Target)                                          │
│   │   Attributes: firstname, lastname, company                  │
│   └─ PostImage (Output)                                         │
│       Attributes: contactid, createdon                           │
│                                                                  │
│ [Edit] [Disable] [Delete] [Add Image] [View Profiler Data]     │
└─────────────────────────────────────────────────────────────────┘
```

### Register Assembly Modal

```
┌───────────────────────────────────────────────────────────────┐
│ Register Plugin Assembly                                   [X] │
├───────────────────────────────────────────────────────────────┤
│                                                                │
│ Assembly File:                                                 │
│ [Browse...] C:\Plugins\MyPlugin.dll                           │
│                                                                │
│ Isolation Mode:                                                │
│ ○ Sandbox (Recommended - Runs in partial trust)              │
│ ○ None (Full trust - Not recommended for production)          │
│                                                                │
│ Detected Information:                                          │
│   Assembly Name: MyPlugin.Assembly                             │
│   Version: 1.0.0.0                                             │
│   Culture: neutral                                             │
│   Public Key Token: 1234567890abcdef                           │
│                                                                │
│ Plugin Types Found:                                            │
│   ☑ MyPlugin.ContactCreateHandler                             │
│   ☑ MyPlugin.AccountSyncHandler                               │
│   ☐ MyPlugin.OpportunityUpdateHandler                         │
│                                                                │
│ ℹ️ Only checked types will be registered                      │
│                                                                │
│                              [Cancel] [Register Assembly]      │
└───────────────────────────────────────────────────────────────┘
```

### Register Step Modal

```
┌───────────────────────────────────────────────────────────────┐
│ Register Plugin Step                                       [X] │
├───────────────────────────────────────────────────────────────┤
│                                                                │
│ General:                                                       │
│   Name: [Create Contact Handler                             ] │
│   Plugin Type: [MyPlugin.ContactCreateHandler           ▼]   │
│                                                                │
│ Message Information:                                           │
│   Message: [Create                                       ▼]   │
│   Primary Entity: [contact                               ▼]   │
│   Secondary Entity: [None                                ▼]   │
│                                                                │
│ Event Pipeline Stage:                                          │
│   ○ Pre-validation (Stage 10)                                 │
│   ○ Pre-operation (Stage 20)                                  │
│   ● Post-operation (Stage 40)                                 │
│                                                                │
│ Execution:                                                     │
│   Mode: ○ Synchronous  ● Asynchronous                         │
│   Rank: [1      ] (Execution order within stage)              │
│                                                                │
│ Advanced:                                                      │
│   Filtering Attributes: [firstname,lastname,email         ]   │
│   ℹ️ Comma-separated. Empty = all attributes trigger          │
│                                                                │
│   Deployment: [Server Only                               ▼]   │
│   Impersonating User: [None - Run as calling user       ▼]   │
│                                                                │
│   Description:                                                 │
│   [Handles contact creation and sends welcome email       ]   │
│                                                                │
│                              [Cancel] [Register Step]          │
└───────────────────────────────────────────────────────────────┘
```

### Register Image Modal

```
┌───────────────────────────────────────────────────────────────┐
│ Register Step Image                                        [X] │
├───────────────────────────────────────────────────────────────┤
│                                                                │
│ Image Type:                                                    │
│   ● Pre-Image (Snapshot before data changes)                  │
│   ○ Post-Image (Snapshot after data changes)                  │
│                                                                │
│ Configuration:                                                 │
│   Name: [PreImage                                          ]   │
│   Entity Alias: [Target                                    ]   │
│                                                                │
│ Attributes to Include:                                         │
│   [Select All] [Clear All]                                     │
│                                                                │
│   ☑ contactid                  ☑ emailaddress1                │
│   ☑ firstname                  ☐ address1_city                │
│   ☑ lastname                   ☐ address1_stateorprovince     │
│   ☑ fullname                   ☐ telephone1                   │
│   ☑ company                    ☐ mobilephone                  │
│                                                                │
│ ℹ️ Only selected attributes will be available in the image    │
│                                                                │
│                              [Cancel] [Register Image]         │
└───────────────────────────────────────────────────────────────┘
```

### Confirmation Dialog (Destructive Operations)

```
┌───────────────────────────────────────────────────────────────┐
│ ⚠️  Confirm Delete Assembly                                 [X]│
├───────────────────────────────────────────────────────────────┤
│                                                                │
│ You are about to delete:                                       │
│                                                                │
│   Assembly: MyPlugin.Assembly v1.0.0                           │
│                                                                │
│ This will also delete:                                         │
│   • 3 Plugin Types                                             │
│   • 12 Plugin Steps                                            │
│   • 8 Plugin Images                                            │
│                                                                │
│ ⚠️  This action cannot be undone!                             │
│                                                                │
│ Type the assembly name to confirm:                             │
│ [                                                          ]   │
│                                                                │
│                              [Cancel] [Delete Assembly]        │
└───────────────────────────────────────────────────────────────┘
```

---

## API Requirements

### Dataverse Web API Endpoints

**Plugin Assemblies:**
- `GET /api/data/v9.2/pluginassemblies?$select=...&$expand=plugintypes`
- `POST /api/data/v9.2/pluginassemblies`
- `PATCH /api/data/v9.2/pluginassemblies({id})`
- `DELETE /api/data/v9.2/pluginassemblies({id})`

**Plugin Types:**
- `GET /api/data/v9.2/plugintypes?$filter=pluginassemblyid eq {id}`
- `GET /api/data/v9.2/plugintypes({id})/sdkmessageprocessingsteps`

**SDK Message Processing Steps:**
- `GET /api/data/v9.2/sdkmessageprocessingsteps?$select=...&$expand=sdkmessagefilterid,sdkmessageid`
- `POST /api/data/v9.2/sdkmessageprocessingsteps`
- `PATCH /api/data/v9.2/sdkmessageprocessingsteps({id})`
- `DELETE /api/data/v9.2/sdkmessageprocessingsteps({id})`

**SDK Message Processing Step Images:**
- `GET /api/data/v9.2/sdkmessageprocessingstepimages?$filter=sdkmessageprocessingstepid eq {id}`
- `POST /api/data/v9.2/sdkmessageprocessingstepimages`
- `PATCH /api/data/v9.2/sdkmessageprocessingstepimages({id})`
- `DELETE /api/data/v9.2/sdkmessageprocessingstepimages({id})`

**SDK Messages (Reference Data):**
- `GET /api/data/v9.2/sdkmessages?$select=name,sdkmessageid&$orderby=name`
- `GET /api/data/v9.2/sdkmessagefilters?$filter=sdkmessageid eq {id}`

**Plugin Trace Logs (Profiler):**
- `GET /api/data/v9.2/plugintracelogs?$filter=typename eq '{typename}'&$orderby=createdon desc`

---

## Implementation Phases

### Phase 1: Core Functionality (MVP)
**Target:** v0.2.0

- ✅ Environment selection
- ✅ List assemblies with hierarchical tree
- ✅ Register new assembly from DLL file
- ✅ View assembly/type/step/image details
- ✅ Register new step (basic configuration)
- ✅ Register step images (pre/post)
- ✅ Delete assembly/step/image with confirmation
- ✅ Enable/disable steps
- ✅ Update step configuration

**Deliverables:**
- PluginRegistrationService implementation
- PluginRegistrationPanel with split view
- Modal dialogs for registration
- Confirmation dialogs for destructive operations

### Phase 2: Advanced Features
**Target:** v0.3.0

- ✅ Update existing assembly (versioning)
- ✅ Filtering attributes selector
- ✅ Impersonating user selector
- ✅ Bulk enable/disable steps
- ✅ Bulk delete steps
- ✅ Step rank ordering
- ✅ Advanced step configuration (all fields)

**Deliverables:**
- Enhanced modal dialogs
- Bulk operation support
- Advanced configuration options

### Phase 3: Stretch Goals
**Target:** v0.4.0+

- ⭐ Export registration to JSON
- ⭐ Import registration from JSON
- ⭐ View plugins by solution
- ⭐ NuGet package detection
- ⭐ Plugin profiler integration
- ⭐ Step execution history view
- ⭐ Performance metrics dashboard

---

## Component Implementation

### AssemblyTreeComponent

```typescript
export interface AssemblyTreeNode {
    id: string;
    type: 'assembly' | 'plugintype' | 'step' | 'image';
    label: string;
    icon: string;
    children?: AssemblyTreeNode[];
    data: PluginAssembly | PluginType | PluginStep | PluginImage;
    expanded: boolean;
}

export interface AssemblyTreeConfig {
    id: string;
    data: AssemblyTreeNode[];
    onNodeSelect: (node: AssemblyTreeNode) => void;
    onNodeExpand: (node: AssemblyTreeNode) => void;
    onContextMenu: (node: AssemblyTreeNode, actions: string[]) => void;
}
```

**HTML Structure:**
```html
<div class="assembly-tree">
    <ul class="tree-root">
        <li class="tree-node assembly-node">
            <span class="tree-toggle">▼</span>
            <span class="tree-icon">📦</span>
            <span class="tree-label">MyPlugin.Assembly v1.0.0</span>
            <ul class="tree-children">
                <li class="tree-node plugintype-node">
                    <span class="tree-toggle">▶</span>
                    <span class="tree-icon">🔌</span>
                    <span class="tree-label">MyPlugin.ContactCreate</span>
                    <ul class="tree-children" style="display: none;">
                        <li class="tree-node step-node">
                            <span class="tree-icon">⚡</span>
                            <span class="tree-label">Create (Post-Op)</span>
                        </li>
                    </ul>
                </li>
            </ul>
        </li>
    </ul>
</div>
```

### PropertyEditorComponent

Displays selected node details with inline editing capabilities.

**For Assembly:**
- Display: Name, Version, Culture, PublicKeyToken, IsolationMode, SourceType
- Actions: Update Assembly, Delete Assembly

**For Plugin Type:**
- Display: TypeName, FriendlyName, AssemblyName
- Actions: (Read-only)

**For Step:**
- Display: All step properties with inline editing
- Actions: Edit, Enable/Disable, Delete, Add Image

**For Image:**
- Display: Name, EntityAlias, ImageType, Attributes
- Actions: Edit, Delete

---

## Error Handling

### Validation Rules

**Register Assembly:**
- ✅ File must be a valid .NET assembly
- ✅ Assembly must implement IPlugin interface
- ✅ Assembly version must be unique (or prompt for update)
- ✅ Public key token required for Sandbox isolation

**Register Step:**
- ✅ Name is required
- ✅ Message + Entity combination must be valid
- ✅ Rank must be positive integer
- ✅ Filtering attributes must exist on entity
- ✅ Async steps cannot be Pre-validation stage

**Register Image:**
- ✅ Name and EntityAlias required
- ✅ At least one attribute must be selected
- ✅ PreImage only valid for Pre-op and Post-op stages
- ✅ PostImage only valid for Post-op stage

### Error Messages

```typescript
enum PluginRegistrationError {
    ASSEMBLY_NOT_FOUND = 'Assembly file not found',
    ASSEMBLY_INVALID = 'File is not a valid .NET assembly',
    ASSEMBLY_NO_PLUGINS = 'Assembly does not contain any IPlugin implementations',
    ASSEMBLY_VERSION_EXISTS = 'Assembly version already exists. Update existing?',
    STEP_INVALID_STAGE = 'Invalid stage for async step. Async steps cannot use Pre-validation.',
    STEP_ENTITY_NOT_FOUND = 'Primary entity not found in system',
    STEP_MESSAGE_NOT_FOUND = 'Message not supported for this entity',
    IMAGE_INVALID_STAGE = 'Pre-images are not available for this stage',
    IMAGE_NO_ATTRIBUTES = 'At least one attribute must be selected',
    IMAGE_ATTRIBUTE_NOT_FOUND = 'One or more attributes do not exist on entity'
}
```

---

## Testing Strategy

### Unit Tests
- Service methods (mock Dataverse API)
- Data transformation logic
- Validation rules

### Integration Tests
- Assembly registration flow
- Step configuration
- Image registration
- Bulk operations

### Manual Testing Scenarios

1. **Register New Assembly**
   - Select DLL file from file system
   - Verify detected plugin types
   - Register with Sandbox isolation
   - Confirm assembly appears in tree

2. **Register Step**
   - Select plugin type
   - Configure Create message on Contact entity
   - Set Post-operation stage, Asynchronous mode
   - Add filtering attributes
   - Verify step appears under plugin type

3. **Register Images**
   - Add PreImage to step
   - Select specific attributes
   - Add PostImage to same step
   - Verify both images appear

4. **Enable/Disable Steps**
   - Disable a step
   - Verify step shows as disabled
   - Enable step again

5. **Delete with Confirmation**
   - Attempt to delete assembly
   - Verify confirmation dialog shows counts
   - Require typed confirmation
   - Verify cascade delete

6. **Bulk Operations**
   - Select multiple steps (Ctrl+Click)
   - Disable all selected
   - Verify all disabled
   - Delete all selected with confirmation

---

## Security Considerations

### Permissions Required

Users must have the following Dataverse privileges:
- **prvCreatePluginAssembly** - Register assemblies
- **prvWritePluginAssembly** - Update assemblies
- **prvDeletePluginAssembly** - Delete assemblies
- **prvCreateSdkMessageProcessingStep** - Register steps
- **prvWriteSdkMessageProcessingStep** - Update steps
- **prvDeleteSdkMessageProcessingStep** - Delete steps
- **prvCreateSdkMessageProcessingStepImage** - Register images
- **prvWriteSdkMessageProcessingStepImage** - Update images
- **prvDeleteSdkMessageProcessingStepImage** - Delete images

### Safety Features

1. **Confirmation Dialogs**
   - All destructive operations require confirmation
   - Cascade delete warnings (assembly → types → steps → images)
   - Type assembly name to confirm deletion

2. **Audit Trail**
   - All operations logged to LoggerService
   - Include user, timestamp, operation type
   - Include before/after state for updates

3. **Rollback Support (Stretch)**
   - Export current state before major changes
   - Allow "undo" of recent operations

---

## Performance Considerations

### Optimization Strategies

1. **Lazy Loading**
   - Load assembly list on panel open
   - Load plugin types when assembly expanded
   - Load steps when plugin type expanded
   - Load images when step selected

2. **Caching**
   - Cache SDK messages (rarely change)
   - Cache entity metadata (only refresh on demand)
   - Cache assembly list (refresh on user action)

3. **Bulk Operations**
   - Batch API calls when possible
   - Show progress indicator for long operations
   - Support cancellation of bulk operations

---

## Open Questions & Decisions

### Resolved
- ✅ Panel layout: Single panel with modals (not split panels)
- ✅ Bulk operations: Yes, implement (enhancement over PAC)
- ✅ Profiler integration: Yes, include
- ✅ Export/import: Yes, but stretch goal
- ✅ Solution view: Yes, but stretch goal

### To Discuss
- ❓ NuGet package detection: How deep? Parse .csproj or just display package references?
- ❓ Assembly versioning: Allow side-by-side versions or force update?
- ❓ Offline support: Should we support plugin registration for offline-capable plugins?

---

## Success Criteria

### MVP (Phase 1)
- ✅ Register assembly from DLL file
- ✅ View hierarchical assembly/type/step structure
- ✅ Register new steps with basic configuration
- ✅ Register pre/post images
- ✅ Enable/disable/delete steps
- ✅ Confirmation dialogs for destructive operations

### Full Feature (Phase 2)
- ✅ Update existing assemblies
- ✅ Advanced step configuration (all fields)
- ✅ Bulk operations on steps
- ✅ Feature parity with PAC tool PRT

### Stretch Goals (Phase 3)
- ⭐ Export/import registration
- ⭐ Solution-based view
- ⭐ Plugin profiler integration
- ⭐ Performance metrics

---

## References

- [Microsoft Dataverse SDK Message Processing Steps](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/register-plug-in)
- [PAC CLI Plugin Registration Tool](https://learn.microsoft.com/en-us/power-platform/developer/cli/reference/tool#pac-tool-prt)
- [Plugin Isolation Modes](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/plug-ins#isolation-modes)
- [Event Framework Pipeline Stages](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/event-framework#event-execution-pipeline)
