# Plugin Registration Tool - Task Tracking

**Branch:** `feature/plugin-registration`
**Created:** 2025-12-08
**Status:** Implementation (Slice 3 Near Complete - Step/Image CRUD Done)

---

## Overview

**Goal:** Port Microsoft's Plugin Registration Tool (PRT) functionality to VS Code, enabling developers to browse and manage plugin assemblies, steps, and images directly within the IDE.

**Discovery Findings:**
- Found: Existing panel patterns (WebResourcesPanelComposed, ImportJobViewerPanelComposed)
- Found: PanelCoordinator architecture with type-safe commands
- Found: EnvironmentScopedPanel base class for singleton management
- Will reuse: Solution filtering, environment switching, tree section patterns
- Need to create: Custom tree rendering JavaScript (client-side)

---

## Feature Slices

### Slice 1: Read-Only Browsing - COMPLETE ✅
Browse plugin packages, assemblies, plugin types, steps, and images.

### Slice 2: Step & Assembly Management - COMPLETE ✅
Enable/disable steps, update assemblies and packages.

### Slice 3: Full CRUD Operations - IN PROGRESS
Register new assemblies/packages, add/edit/delete steps, image management.

### Slice 4: Advanced Features - PENDING
Solution filtering, detail panel, additional enhancements.

---

## Slice 1: Read-Only Browsing

### Requirements

- [x] Display plugin packages with assemblies
- [x] Display standalone assemblies (not in packages)
- [x] Display plugin types within assemblies
- [x] Display steps for each plugin type
- [x] Display images for each step
- [x] Environment switching
- [x] Tree search/filtering with ancestor/descendant visibility
- [x] Disabled step visual differentiation
- [x] Expand All / Collapse All buttons
- [ ] Solution filtering (deferred)
- [ ] Node selection shows detail panel (deferred)

**Success Criteria:**
- [x] Panel opens from sidebar
- [x] Tree displays hierarchy correctly
- [x] Package → Assembly relationship works
- [x] Filter shows complete hierarchy chain
- [x] Expand/Collapse All works with filter

---

### Implementation Checklist - Slice 1

#### Domain Layer
- [x] PluginPackage entity with behavior
- [x] PluginAssembly entity with behavior
- [x] PluginType entity with behavior
- [x] PluginStep entity with behavior
- [x] StepImage entity with behavior
- [x] 6 value objects (IsolationMode, SourceType, ExecutionStage, ExecutionMode, StepStatus, ImageType)
- [x] 5 repository interfaces
- [ ] Unit tests (target: 100%) - PENDING
- [x] `npm run compile` passes

#### Application Layer
- [x] LoadPluginRegistrationTreeUseCase
- [x] TreeItemViewModel with metadata types
- [x] 6 mappers (Package, Assembly, Type, Step, Image, Tree)
- [x] Package-Assembly grouping with `groupByNullable`
- [ ] Unit tests (target: 90%) - PENDING
- [x] `npm run compile` passes

#### Infrastructure Layer
- [x] DataversePluginPackageRepository
- [x] DataversePluginAssemblyRepository (with `_packageid_value`)
- [x] DataversePluginTypeRepository
- [x] DataversePluginStepRepository
- [x] DataverseStepImageRepository
- [x] `npm run compile` passes

#### Presentation Layer
- [x] PluginRegistrationPanelComposed
- [x] PluginRegistrationTreeSection
- [x] plugin-registration.js (tree rendering, filtering)
- [x] plugin-registration.css (styling, disabled states)
- [x] Command registration in package.json
- [x] Command handlers in extension.ts
- [x] `npm run compile` passes

---

## Completed Features

### Tree Rendering
- [x] Hierarchical tree display (Package → Assembly → Plugin → Step → Image)
- [x] Expand/collapse individual nodes
- [x] Emoji icons for each node type
- [x] Badge counts (plugins, steps, stage/mode)
- [x] Managed indicator styling

### Filtering
- [x] Search input with icon
- [x] Filter persists on expand/collapse
- [x] Shows ancestors of matching nodes
- [x] Shows descendants of matching nodes
- [x] Complete hierarchy chain visible

### Disabled Steps UX
- [x] 🚫 icon for disabled steps
- [x] Strikethrough text
- [x] Dimmed text color
- [x] Red-tinted badge
- [x] Multiple visual cues

---

## Pre-PR Polish (Slice 1 Completion)

Before PR, return to complete these items:
- [ ] **Detail panel** - Show metadata when node selected
- [ ] **Solution filtering** - Use ISolutionComponentRepository
- [ ] **Unit tests** - Domain and application layer tests

---

## Slice 2: Step & Assembly Management

### Requirements

#### Enable/Disable Plugin Steps
- [x] Right-click step node → context menu with "Enable Step" or "Disable Step"
- [x] Only show option when `canEnable` or `canDisable` is true
- [x] Managed steps: no context menu options (read-only)
- [x] API: PATCH sdkmessageprocessingsteps with statecode 0/1
- [x] Targeted refresh: update only that step node after action

#### Update Standalone Assembly
- [x] Right-click standalone assembly → "Update Assembly..."
- [x] File picker filtered to `.dll`, starts in workspace (remembers last folder)
- [x] API: PATCH pluginassemblies with base64 content
- [x] Targeted refresh: assembly node + all children (types, steps, images)
- [x] Managed assemblies: no context menu option

#### Update Plugin Package
- [x] Right-click package node → "Update Package..."
- [x] Right-click assembly-in-package → "Update Package..." (redirects to package)
- [x] File picker filtered to `.nupkg`, starts in workspace (remembers last folder)
- [x] API: PATCH pluginpackages with base64 content (version from .nupkg)
- [x] Targeted refresh: package node + all children
- [x] Managed packages: no context menu option

#### Cross-Cutting
- [x] Context menu via `data-vscode-context` on tree nodes
- [x] Commands registered in package.json
- [x] Persist last-used folder for file picker (per file type)
- [x] Error handling via `vscode.window.showErrorMessage`

### Implementation Checklist - Slice 2

#### Domain Layer
- [x] PluginAssembly: add `canUpdate()` method
- [x] PluginPackage: add `canUpdate()` method
- [x] `npm run compile` passes

#### Application Layer
- [x] EnablePluginStepUseCase
- [x] DisablePluginStepUseCase
- [x] UpdatePluginAssemblyUseCase
- [x] UpdatePluginPackageUseCase
- [x] `npm run compile` passes

#### Infrastructure Layer
- [x] IPluginStepRepository: add `enable()`, `disable()` methods
- [x] DataversePluginStepRepository: implement enable/disable
- [x] IPluginAssemblyRepository: add `updateContent()` method
- [x] DataversePluginAssemblyRepository: implement updateContent
- [x] IPluginPackageRepository: add `updateContent()` method
- [x] DataversePluginPackageRepository: implement updateContent
- [x] `npm run compile` passes

#### Presentation Layer
- [x] Add `data-vscode-context` to tree nodes in plugin-registration.js
- [x] Register commands in package.json (enable, disable, updateAssembly, updatePackage)
- [x] Register webview/context menu items in package.json
- [x] Command handlers in extension.ts
- [x] Handler methods in PluginRegistrationPanelComposed
- [x] Targeted node refresh (updateNode message type)
- [x] File picker with last-folder persistence
- [x] `npm run compile` passes

### Status: READY FOR F5 TESTING ✅

---

## Session Notes

### Session 3 (2025-12-09)
**Completed:**
- Fixed tree rendering with createBehavior pattern (was calling acquireVsCodeApi twice)
- Fixed CSS Unicode escapes for expand/collapse triangles
- Added emoji font-family for icon rendering
- Fixed package-assembly hierarchy (`_packageid_value` field)
- Updated use case to group assemblies by package
- Changed display names to use `name` field consistently
- Improved badge visibility (better contrast colors)
- Changed badge text from "types" to "plugins"
- Added filter persistence on expand/collapse
- Added ancestor/descendant visibility in filter
- Added disabled step visual differentiation (🚫 icon, strikethrough, red badge)

### Session 4 (2025-12-09)
**Completed:**
- Added Expand All / Collapse All toolbar buttons
- Buttons respect current filter (only expand/collapse visible nodes)
- Created Slice 2 design document
- Domain layer: Added enable/disable to IPluginStepRepository, updateContent to assembly/package repos
- Domain layer: Updated PluginAssembly.canUpdate() to check standalone (not in package)
- Application layer: Created 4 new use cases (Enable, Disable, UpdateAssembly, UpdatePackage)
- Infrastructure layer: Implemented enable/disable/updateContent in repositories
- Presentation layer: Added data-vscode-context to tree nodes in JS
- Presentation layer: Added updateNode/updateSubtree message handlers in JS
- Presentation layer: Added packageId to AssemblyMetadata ViewModel
- package.json: Added 4 new commands and webview/context menu items

**Architectural Decision - Context Menu Commands:**
- VS Code webview context menus pass `data-vscode-context` values to command handlers
- Command handler receives object: `{ webview, webviewSection, nodeId, canEnable, ... }`
- Pattern: extension.ts registers commands → finds active panel → calls panel method
- Panel receives use cases via DI (composition root pattern in initializePluginRegistration)
- NOT a shortcut: follows Clean Architecture, DI, and existing codebase patterns

**Remaining for Slice 2:**
- [ ] Expand initializePluginRegistration to create all use cases
- [ ] Expand panel constructor to receive use cases + repositories for reads
- [ ] Add public action methods to panel (enableStep, disableStep, updateAssembly, updatePackage)
- [ ] Register commands in extension.ts that route to panel methods
- [ ] Add file picker with last-folder persistence for update operations
- [ ] Test with F5

**Deferred to Pre-PR Polish:**
- Detail panel
- Solution filtering
- Unit tests

**Deferred to Slice 3:**
- Add/edit/delete steps
- Register new assemblies
- Image management

### Session 5 (2025-12-10)
**Bug Found & Fixed: Missing Steps**
- Problem: Only 5,000 of 68,724 steps were showing in tree
- Root cause: Dataverse API paginates at 5,000 records, repository wasn't fetching subsequent pages
- Fix: Added pagination handling with `@odata.nextLink` to `DataversePluginStepRepository.findAll()`

**Performance Optimization Investigation:**
- Used Dataverse MCP to query actual record counts directly
- Baseline benchmark (sequential fetching):
  ```
  Packages:          0 records in    377ms
  Assemblies:      338 records in    397ms
  Plugin Types:   3879 records in   1007ms
  Steps:         68724 records in  51790ms  ← 95% of total time!
  Images:         2316 records in    712ms
  TOTAL:         75257 records in  54284ms
  ```
- Steps fetching takes 51.8s (14 sequential API pages at ~3.7s each)

**Optimization Strategy Identified:**
1. ✅ Quick win: Parallelize 5 repository calls with Promise.all() - IN PROGRESS
2. ⏳ Partition steps by `sdkmessageid` for parallel fetching (max bucket ~5,300, most fit in 1 page)
3. Data analysis from MCP:
   - 2,581 distinct SDK messages
   - Max steps per message: ~5,300 (just over 1 page)
   - Most messages have <5,000 steps (single page each)

**Files Modified:**
- `DataversePluginStepRepository.ts` - Added pagination with `@odata.nextLink`
- `LoadPluginRegistrationTreeUseCase.ts` - Added benchmarking, converted to parallel fetch

**Minor Bug Found:**
- Notification shows "Loading Plugin Registration: Loading steps..." (redundant "Loading")

**Performance Experiment Results:**
- Parallel `In` filter approach: **FAILED** (74s vs 51s baseline - 45% SLOWER!)
- Root cause: `Microsoft.Dynamics.CRM.In()` filter is not indexed efficiently
- Each of 52 separate queries starts fresh with no cursor optimization
- Dataverse's sequential `@odata.nextLink` pagination is actually OPTIMAL

**Key Learnings:**
1. Dataverse pre-computes cursors on first query - subsequent pages are fast
2. `In` filters with many GUIDs cause table scans, not index seeks
3. You cannot parallelize Dataverse pagination without knowing boundaries
4. ~51s for 68,724 records is near-optimal for this data volume (~34MB)

**Final Approach:**
- Reverted to optimized sequential pagination
- Added primary key ordering (`$orderby=sdkmessageprocessingstepid asc`) for optimal index usage
- Kept `$expand` for message/filter names (single query is faster than separate lookups)
- Parallel repository fetching saves ~3s (all 5 repos run concurrently)

**Final Performance Results:**
| Approach | Time | Improvement |
|----------|------|-------------|
| Original baseline | 54.3s | - |
| + Parallel repos | 51.2s | -3.1s (6%) |
| + Primary key ordering | **48.6s** | **-5.7s (11%)** |

**Remaining Tasks:**
- [x] Verify optimized sequential benchmark - DONE (48.6s)
- [x] Fix redundant "Loading" text in notification - Changed to "Fetching data from Dataverse..."
- [x] Remove benchmark logging before PR

**Known Issue: DOM Performance with Large Trees** - RESOLVED ✅
- With 75,000+ nodes, the DOM was sluggish due to full re-renders
- FIXED: Implemented two optimizations in `plugin-registration.js`:

### Session 6 (2025-12-10)
**DOM Performance Optimization**

**Problem:** Full tree re-render on every expand/collapse with 75k+ nodes

**Solution 1: Targeted Subtree Rendering**
- `handleNodeClick()` no longer calls `renderTree(treeData)`
- New `toggleExpansion()` function manipulates only the affected subtree:
  - Collapse: Removes `tree-children` container from DOM
  - Expand: Renders just that node's children and attaches handlers
- Helper functions: `findNodeInTree()`, `getNodeDepth()`, `renderChildrenContainer()`
- Also optimized `handleNodeUpdate()` and `handleSubtreeUpdate()` for targeted DOM updates

**Solution 2: Virtual Scrolling**
- Automatically enabled when flattened node count > 500 (`VIRTUAL_SCROLL_THRESHOLD`)
- Uses spacer divs + only renders visible nodes + buffer (OVERSCAN_COUNT = 10)
- Key functions:
  - `flattenTree()` - Flattens hierarchical tree to list for virtual scrolling
  - `renderVirtualTree()` - Renders with top/bottom spacers
  - `handleVirtualScroll()` - Debounced scroll handler with requestAnimationFrame
- Filter works with virtual scrolling via `buildVisibleNodeIds()` helper

**Architecture:**
```
Initial Load (collapsed):
  338 assemblies → Regular DOM rendering (fast)

After Expand All:
  75,000+ nodes → Virtual scrolling kicks in
  - Only renders ~50-100 nodes in viewport
  - Spacer divs maintain scroll height
  - Scroll triggers incremental re-render
```

**Files Modified:**
- `resources/webview/js/features/plugin-registration.js` - Major refactor
- `resources/webview/css/features/plugin-registration.css` - Added spacer styles

**Performance Impact:**
- Expand/collapse: Instant (was ~2-3s for full re-render)
- Expand All with 75k nodes: Smooth scrolling (~50ms render)
- Filter with virtual scroll: Works correctly

**Testing Needed:**
- [x] F5 test with large dataset - DONE
- [x] Verify expand/collapse behavior - DONE
- [x] Verify filter behavior in both modes - DONE
- [x] Verify context menus still work - DONE (see Session 7)
- [x] Verify Expand All / Collapse All buttons work - DONE

### Session 7 (2025-12-10)
**Context Menu Fixes & UX Improvements**

**Problem 1: Duplicate progress indicators**
- Both panel loading bar AND status bar notification shown
- Fix: Removed status bar notification, panel UI is sufficient

**Problem 2: Context menus not appearing**
- `data-vscode-context` attribute wasn't being read by VS Code
- Root cause: HTML escaping issue with quotes
- Fix: Use single quotes for attribute, raw JSON inside
- Added `preventDefaultContextMenuItems: true` to tree container

**Problem 3: Managed steps couldn't be enabled/disabled**
- Business rule incorrectly prevented enable/disable on managed steps
- Fix: Removed managed check from `canEnable()` and `canDisable()` in PluginStep entity
- Developers need this for debugging - don't artificially limit

**Problem 4: Step loses position after enable/disable** - BUG FOUND
- After enabling/disabling a step, it appears at wrong position in tree
- Likely issue with `handleNodeUpdate()` targeted DOM update
- Need to investigate and fix

**Known Limitation: Virtual Entity plugins can't be disabled**
- Dataverse returns error 0x80044184: "Invalid plug-in registration stage"
- These are internal system plugins with special stages
- Not a bug in our code - Dataverse limitation

**Files Modified:**
- `PluginRegistrationPanelComposed.ts` - Removed duplicate status bar notification
- `PluginStep.ts` - Allow enable/disable on managed steps
- `plugin-registration.js` - Fixed context menu attribute escaping
- `PluginRegistrationTreeSection.ts` - Added preventDefaultContextMenuItems to container
- `package.json` - Simplified when clause conditions (truthy checks)

**Problem 4 Resolution:**
- Fixed step positioning bug - was caused by targeted DOM updates not working with virtual scrolling
- Solution: Use full re-render after node updates (simpler and reliable)
- Removed unused `renderNodeOnly()` and `getVisibleNodeIds()` functions

**Additional Fixes:**
- Added pagination to `DataversePluginTypeRepository` (3,879 records, close to 5k limit)
- Added pagination to `DataverseStepImageRepository` (2,316 records, could grow)
- Improved loading progress - shows incremental updates as each repo completes

---

### Slice 2 Status: COMPLETE ✅
- [x] Enable/disable steps - WORKING
- [x] Update assembly - WORKING (with progress notification)
- [x] Update package - WORKING (with progress notification)

### Session 8 (2025-12-12)
**Bug Fixes & Filter Improvements**

**Issue 1: Error 0x80044184 (Custom API Implementation Steps)**
- Custom API implementation steps cannot be disabled - special internal stage
- Example: "CustomApi 'mspp_NotesAzureBlobUrlApi' implementation"
- Fix: Added graceful error handling in `DisablePluginStepUseCase.ts` (like 0x8004419a)
- User sees: "Custom API implementation steps cannot be disabled..."

**Issue 2: Microsoft Assembly Filter Gap**
- `MicrosoftPowerAppsCardsPlugins` slipped through filter (no dot after "Microsoft")
- Fix: Changed `startsWith('Microsoft.')` to `startsWith('Microsoft')` in `plugin-registration.js`

**Issue 3: Empty Plugin Packages Disappearing** - BUG FIX
- Problem: "Hide hidden steps" filter removed user's plugin package entirely
- Root cause: Filter removed ALL empty containers, not just those that BECAME empty due to filtering
- User's plugin had no steps registered yet → pluginType empty → assembly empty → package removed
- Fix: Track `_wasOriginallyEmpty` flag - only remove containers that became empty due to filtering
- Applied same fix to `filterMicrosoftAssemblies()` for consistency

**Update Operation UX - Already Fixed** ✅
- Progress notification shows: "Uploading {AssemblyName} to {Environment}..."
- Success message shows: "{AssemblyName} updated successfully in {Environment}"
- No additional work needed

**Files Modified:**
- `src/features/pluginRegistration/application/useCases/DisablePluginStepUseCase.ts` - Added 0x80044184 handling
- `resources/webview/js/features/plugin-registration.js` - Fixed filter logic + Microsoft prefix

**Regression Tests Needed:**
- [ ] `filterHiddenSteps()` - preserves originally empty containers
- [ ] `filterHiddenSteps()` - removes containers that became empty due to hidden step filtering
- [ ] `filterMicrosoftAssemblies()` - preserves originally empty packages
- [ ] `filterMicrosoftAssemblies()` - removes packages that became empty due to Microsoft assembly filtering
- [ ] Microsoft filter catches `Microsoft*` (no dot) assemblies

---

## Slice 3: Full CRUD Operations - IN PROGRESS

### Requirements

#### Register New Package - COMPLETE ✅
- [x] Register dropdown in toolbar with Package/Assembly/Step/Image options
- [x] File picker for .nupkg files
- [x] Modal with solution selector (for publisher prefix) + name/version auto-populated
- [x] API: POST pluginpackages with prefixed name/uniquename
- [x] Refresh tree after successful registration

**Key Learnings from Package Registration:**
- Both `name` and `uniquename` must be `{prefix}_{packageId}` (identical values)
- PackageId inside nupkg does NOT need prefix - added at registration time
- Dataverse POST returns 204 No Content by default - need `Prefer: return=representation` header
- Analyzed Plugin Registration Tool source code (`PackageRegistrationForm.cs`) for correct field values

#### Register New Assembly - COMPLETE ✅
- [x] Register dropdown → "New Assembly..." wired up
- [x] File picker for .dll files
- [x] Plugin Inspector tool analyzes DLL for IPlugin/CodeActivity types
- [x] Modal with:
  - Assembly name (from inspector or filename)
  - Assembly version (from inspector)
  - Solution selector (optional)
  - **Checkbox list of discovered plugin types** (all selected by default)
- [x] API: POST pluginassemblies + POST plugintypes for each selected type
- [x] Refresh tree after successful registration
- [x] **Plugin Type Registration** - Now handled automatically via inspector integration

**Critical Finding:** Dataverse does NOT auto-discover plugin types. PRT uses .NET reflection to analyze the DLL and explicitly registers each `plugintype` record. Without plugin types, assemblies are useless (can't register steps).

**Solution: .NET Reflection Tool**
We need to build a .NET tool that:
1. Uses Mono.Cecil to inspect the DLL (metadata-only, no dependency loading)
2. Finds all types implementing `Microsoft.Xrm.Sdk.IPlugin`
3. Returns type names as JSON
4. Gets bundled with the VS Code extension
5. Extension invokes it when user selects a DLL

See: `#### .NET Plugin Inspector Tool` section below for design.

**Design Decisions for Assembly Registration:**
1. **No isolation mode selector:** Only Sandbox (2) is valid for cloud Dataverse. (Microsoft docs: "Dataverse is not available for on-premises deployments, so you will always accept the default options of SandBox and Database")
2. **No storage location selector:** Only Database (0) is valid for cloud Dataverse. Disk/GAC are on-prem only.
3. **No prefix on name:** Unlike packages, assemblies use just the assembly name (e.g., "PPDSDemo.Plugins")
4. **Solution optional:** Can register without adding to solution, matching PRT behavior.

#### Register New Step - COMPLETE ✅
- [x] Right-click plugin type → "Register New Step..."
- [x] Modal/form with fields:
  - SDK Message dropdown (required)
  - Primary Entity text field (looked up to sdkMessageFilter)
  - Filtering Attributes (comma-separated, for Create/Update messages)
  - Step Name (auto-populated with plugin type name)
  - Execution Stage (dropdown: PreValidation, PreOperation, PostOperation)
  - Execution Mode (dropdown: Synchronous, Asynchronous)
  - Execution Order (rank)
  - Deployment (Server Only, Offline Only, Server and Offline)
  - Delete AsyncOperation if Successful (checkbox)
  - Unsecure Configuration (textarea)
  - Secure Configuration (textarea, stored in separate entity)
- [x] API: POST sdkmessageprocessingsteps + POST sdkmessageprocessingstepsecureconfig
- [x] Delta update (no full tree refresh)

#### Register New Image - COMPLETE ✅
- [x] Right-click step → "Register New Image..."
- [x] Modal/form with fields:
  - Image Type (dropdown: PreImage, PostImage, Both)
  - Name/Entity Alias
  - Attributes (comma-separated)
- [x] API: POST sdkmessageprocessingstepimages
- [x] Delta update (no full tree refresh)

#### Edit Step - COMPLETE ✅
- [x] Right-click step → "Edit Step..."
- [x] Same form as Register, pre-populated with current values
- [x] API: PATCH sdkmessageprocessingsteps

#### Edit Image - COMPLETE ✅
- [x] Right-click image → "Edit Image..."
- [x] Same form as Register, pre-populated with current values
- [x] API: PATCH sdkmessageprocessingstepimages

#### Delete Operations - COMPLETE ✅
- [x] Right-click assembly → "Unregister Assembly" (with confirmation)
- [x] Right-click package → "Unregister Package" (with confirmation)
- [x] Right-click step → "Unregister Step" (with confirmation)
- [x] Right-click image → "Unregister Image" (with confirmation)
- [x] Delta updates (node removal, no full refresh)

#### .NET Plugin Inspector Tool - TODO
A .NET console application bundled with the extension to analyze plugin DLLs.

**Why needed:**
- TypeScript cannot do .NET reflection
- Dataverse does NOT auto-discover plugin types
- Plugin devs should not manually type 50+ class names
- PRT uses reflection - we need parity

**Requirements:**
- [ ] .NET 6+ console application (cross-platform)
- [ ] Uses Mono.Cecil for metadata-only inspection (no dependency loading)
- [ ] Input: DLL file path
- [ ] Output: JSON with discovered types
- [ ] Detects: IPlugin implementations, CodeActivity implementations
- [ ] Returns: typename, friendlyname, isworkflowactivity flag

**Output format:**
```json
{
  "assemblyName": "PPDSDemo.Plugins",
  "types": [
    { "typeName": "PPDSDemo.Plugins.PreAccountCreate", "isWorkflowActivity": false },
    { "typeName": "PPDSDemo.Plugins.PostContactUpdate", "isWorkflowActivity": false }
  ]
}
```

**Project structure:** TBD (see Session 10 design notes)

**Integration with extension:**
- [ ] Bundle compiled DLL with extension (in `resources/tools/` or similar)
- [ ] Extension invokes: `dotnet <tool.dll> <plugin.dll>`
- [ ] Parse JSON output
- [ ] Populate type selection UI in registration modal
- [ ] Register selected types as `plugintype` records

### Implementation Order (COMPLETE ✅)
1. ✅ Register Package
2. ✅ Register Assembly (with Plugin Inspector Tool)
3. ✅ Plugin Inspector Tool (.NET tool for DLL analysis)
4. ✅ Register Plugin Types (integrated with assembly registration)
5. ✅ Register Step (with sdkMessageFilter lookup, secure config)
6. ✅ Register Image
7. ✅ Edit Step
8. ✅ Edit Image
9. ✅ Unregister operations (assembly, package, step, image)

### Session 9 (2025-12-12)
**Register Plugin Package - COMPLETE**

**Implemented:**
- Register dropdown component in toolbar (Package/Assembly/Step/Image options)
- FormModal component for registration dialogs
- NupkgFilenameParser utility to extract name/version from filename
- RegisterPluginPackageUseCase
- Solution selector with publisher prefix (loads unmanaged solutions only)
- Fixed DataverseApiService to return created entity on POST (`Prefer: return=representation`)

**Investigation & Debugging:**
- Initial error: "nuget file name does not contain a solution prefix named: 0"
- Investigated by comparing Empire.Plugins (working) vs PPDSDemo.PluginPackage (failing)
- Found Pipeline renames nupkg: `Empire.Plugins.1.0.0.nupkg` → `et_Empire.Plugins.nupkg`
- Queried actual Dataverse data to see registered package format
- Analyzed Plugin Registration Tool source code (`PackageRegistrationForm.cs`)
- Key finding: Both `name` and `uniquename` must have prefix (were only adding to uniquename)

**Key Insight from PRT Source:**
```csharp
var name = $"{txtPrefix.Text}_{txtName.Text}";  // Line 185
pluginPackage = new Entity("pluginpackage") {
    {"name", name},           // prefix_packageId
    {"uniquename", name},     // SAME value
    {"content", content},
    {"version", txtVersion.Text},
};
```

**Files Created:**
- `resources/webview/css/components/form-modal.css`
- `resources/webview/js/components/FormModal.js`
- `src/features/pluginRegistration/application/useCases/RegisterPluginPackageUseCase.ts`
- `src/features/pluginRegistration/infrastructure/utils/NupkgFilenameParser.ts`
- `src/features/pluginRegistration/presentation/sections/RegisterDropdownSection.ts`

**Files Modified:**
- `DataverseApiService.ts` - Added `Prefer: return=representation` for POST
- `PluginRegistrationPanelComposed.ts` - Added register handlers, modal flow
- `DataversePluginPackageRepository.ts` - Added `register()` method
- `IPluginPackageRepository.ts` - Added `register()` interface
- `ISolutionRepository.ts` - Added `findUnmanagedWithPublisherPrefix()`
- `DataverseApiSolutionRepository.ts` - Implemented prefix query
- `plugin-registration.js` - Added modal handling, dropdown events

**Next: Register Assembly**
- Simpler than package (no prefix, fixed isolation mode)
- Solution optional (can register without)
- Dataverse auto-discovers plugin types

### Session 10 (2025-12-12)
**Register Plugin Assembly - PARTIAL (Assembly uploads, but types not registered)**

**Implemented:**
- RegisterPluginAssemblyUseCase (orchestrates assembly registration)
- IPluginAssemblyRepository.register() method
- DataversePluginAssemblyRepository.register() with cloud-only fixed values
- handleRegisterAssembly() in panel (file picker → modal flow)
- handleConfirmRegisterAssembly() to call use case
- showRegisterAssemblyModal handler in plugin-registration.js
- FormModal 'info' field type for displaying helper text
- Fixed FormModal validation bug (info fields were breaking submit)

**Key Differences from Package Registration:**
- NO prefix on assembly name (just "PPDSDemo.Plugins", unlike "et_PPDSDemo.PluginPackage")
- Solution is OPTIONAL (user can select "None" to register without solution)
- Fixed values for cloud: sourcetype=0 (Database), isolationmode=2 (Sandbox)
- Uses solutionUniqueName query parameter for solution association

**API Details:**
```
POST /api/data/v9.2/pluginassemblies?solutionUniqueName=MySolution
{
  "name": "PPDSDemo.Plugins",
  "content": "<base64 DLL>",
  "sourcetype": 0,
  "isolationmode": 2
}
```

**Critical Discovery:**
After successful F5 test, discovered that Dataverse does NOT auto-discover plugin types.
- Assembly registered successfully: "PPDSDemo.Plugins registered successfully in Demo - DEV"
- But ZERO plugin types were created
- This matches PRT behavior: PRT uses .NET reflection to find IPlugin types, then explicitly registers each

**Analysis of Options:**
1. Manual type entry - Rejected (50+ types is unacceptable UX)
2. Pure TypeScript parsing of .NET metadata - No mature libraries exist, 3-5 days work
3. .NET reflection tool bundled with extension - **SELECTED** (1.5-2 days, reliable)

**Decision: Build .NET Plugin Inspector Tool**
- Uses Mono.Cecil for metadata-only inspection
- Cross-platform .NET 6+
- Bundled with VS Code extension
- Extension invokes when user selects DLL
- Returns JSON with discovered types
- See design section above

**Files Created:**
- `src/features/pluginRegistration/application/useCases/RegisterPluginAssemblyUseCase.ts`

**Files Modified:**
- `IPluginAssemblyRepository.ts` - Added `register()` interface
- `DataversePluginAssemblyRepository.ts` - Implemented `register()`
- `PluginRegistrationPanelComposed.ts` - Added assembly registration handlers
- `initializePluginRegistration.ts` - Wired up RegisterPluginAssemblyUseCase
- `plugin-registration.js` - Added showRegisterAssemblyModal handler
- `FormModal.js` - Added 'info' field type support, fixed validation bug
- `form-modal.css` - Added .form-modal-info styling
- `ListSolutionsUseCase.test.ts` - Fixed mock for new interface method

**Next Steps:**
1. ~~Commit current changes~~ - DONE
2. ~~Design .NET tool project structure and extension integration~~ - DONE
3. ~~Implement Plugin Inspector Tool~~ - DONE (Session 11)
4. ~~Integrate with assembly registration flow~~ - DONE (Session 11)
5. F5 Test full flow with PPDSDemo.Plugins.dll
6. Commit and push

### Session 11 (2025-12-12)
**Plugin Inspector Tool - COMPLETE**

**Implemented:**
- .NET 8.0 console app (`tools/PluginInspector/`) using Mono.Cecil
- Detects IPlugin and CodeActivity implementations (including inherited)
- TypeScript service (`PluginInspectorService.ts`) to invoke the tool
- Full integration into assembly registration flow
- Checkbox UI for type selection in registration modal

**.NET Tool Details:**
```
tools/PluginInspector/
├── Models/InspectionResult.cs    # JSON output model
├── Services/AssemblyInspector.cs # Mono.Cecil inspection logic
├── Program.cs                    # Entry point
└── PluginInspector.csproj        # .NET 8.0 project
```

**Output format:**
```json
{
  "success": true,
  "assemblyName": "PPDSDemo.Plugins",
  "assemblyVersion": "1.0.0.0",
  "types": [
    { "typeName": "PPDSDemo.Plugins.PreAccountCreate", "displayName": "PreAccountCreate", "typeKind": "Plugin" }
  ],
  "error": null
}
```

**Updated Flow:**
1. User clicks Register → New Assembly
2. File picker for .dll
3. Extension invokes PluginInspector tool
4. Modal shows: assembly name, version, solution selector, **checkbox list of discovered types**
5. User selects types to register (all selected by default)
6. On submit: Register assembly → Register each selected plugin type
7. Tree refreshes showing assembly with types

**Key Files Created/Modified:**
- `tools/PluginInspector/` - New .NET project
- `src/.../services/PluginInspectorService.ts` - TypeScript wrapper
- `IPluginTypeRepository.ts` - Added `register()` interface
- `DataversePluginTypeRepository.ts` - Implemented `register()`
- `RegisterPluginAssemblyUseCase.ts` - Extended to register types
- `PluginRegistrationPanelComposed.ts` - Inspector integration
- `plugin-registration.js` - Checkbox UI for type selection
- `FormModal.js` - Added `checkboxGroup` field type
- `form-modal.css` - Checkbox group styles
- `package.json` - Added `build:tools` script
- `.vscodeignore` - Exclude `tools/` source
- `.gitignore` - Exclude .NET build artifacts

**Build Integration:**
- `npm run build:tools` publishes .NET tool to `resources/tools/`
- Added to `compile`, `compile:fast`, `package` scripts
- Extension looks for tool at `resources/tools/PluginInspector.dll`

**Ready for F5 Testing:**
- [ ] Test with PPDSDemo.Plugins.dll (3 types)
- [ ] Test with assembly with workflow activities
- [ ] Test partial selection (not all types)
- [ ] Test error handling (no types found, invalid DLL)

### Session 12 (2025-12-12)
**Delta Updates for Tree UX - IN PROGRESS**

**Problem:** After register/unregister operations, full tree refresh takes ~45 seconds (terrible UX).

**Solution:** Implement delta updates - only update the affected node(s) instead of full refresh.

**Design Decisions:**
1. **Confirmed Updates Only** - Never update UI speculatively; only after server confirms
2. **Fetch After Create** - After registration, fetch new assembly+types (1 API call) for accurate data
3. **Partial Failure Handling** - Keep partial state, show error for failed types, UI reflects what succeeded
4. **Timestamps** - Use server timestamps from fetch for accuracy
5. **Visual Feedback** - Scroll new node into view (no animation initially)

**For Unregister (instant):**
1. DELETE assembly → 204 success
2. Send `removeNode` command to webview with assemblyId
3. Webview removes node from local `treeData` and re-renders
4. Zero additional API calls

**For Register (near-instant):**
1. POST assembly → assemblyId
2. POST types → typeIds[]
3. **Fetch assembly with expanded types (1 API call):**
   ```
   GET pluginassemblies({id})?$select=...&$expand=pluginassembly_plugintype($select=...)
   ```
4. Build TreeItemViewModel from fetched server data
5. Send `addStandaloneAssembly` to webview
6. Webview adds node to local `treeData` and re-renders

**Implementation Checklist:**
- [x] Add `handleRemoveNode()` handler in plugin-registration.js
- [x] Add `handleAddStandaloneAssembly()` handler in plugin-registration.js
- [x] Add `findByIdWithTypes()` method to IPluginAssemblyRepository
- [x] Implement `findByIdWithTypes()` in DataversePluginAssemblyRepository
- [x] Update `unregisterAssembly()` in panel to send `removeNode` instead of `handleRefresh()`
- [x] Update `handleConfirmRegisterAssembly()` to fetch and send `addStandaloneAssembly`
- [x] Add scroll-into-view behavior for new nodes
- [ ] Test register flow (should be near-instant)
- [ ] Test unregister flow (should be instant)

**Files Modified:**
- `resources/webview/js/features/plugin-registration.js` - Added `handleRemoveNode()`, `handleAddStandaloneAssembly()`, `scrollNodeIntoView()`
- `IPluginAssemblyRepository.ts` - Added `AssemblyWithTypes` interface and `findByIdWithTypes()` method
- `DataversePluginAssemblyRepository.ts` - Implemented `findByIdWithTypes()` with $expand for plugintypes
- `PluginRegistrationPanelComposed.ts` - Added `sendAssemblyDeltaUpdate()`, updated unregister to use `removeNode`, register to use `addStandaloneAssembly`

### Session 13 (2025-12-12)
**Update Assembly Type Selection (Like PRT) - COMPLETE**

**Feature:** When updating an assembly, users can now select which types to register/unregister (matching PRT behavior).

**Before:** Update Assembly modal showed plugin types as disabled checkboxes (read-only). Users couldn't add new types or remove existing ones.

**After:** Checkboxes are editable. Users can:
- Select new types to register (if new types were added to DLL)
- Deselect existing types to unregister them
- See clear status indicators: `[NEW]`, `[REMOVED FROM DLL]`

**Implementation:**
1. Added `delete()` method to `IPluginTypeRepository` interface
2. Implemented `delete()` in `DataversePluginTypeRepository`
3. Modified `updateAssembly()` to fetch existing registered types before showing modal
4. Built merged type list showing:
   - Types in new DLL (marked NEW if not registered)
   - Types removed from DLL (marked REMOVED, unchecked by default)
5. Made checkboxes editable in webview JS
6. Modified `handleConfirmUpdateAssembly()` to:
   - Register new types (selected but not existing)
   - Unregister removed types (existing but not selected)
   - Show summary message: "Assembly updated, X type(s) added, Y type(s) removed"

**Bug Fix: Workflow Activity Icon Wrong After Re-registration**

**Problem:** When user unregistered a workflow activity and re-registered it, it showed as a plugin (wrong icon) instead of workflow activity.

**Root Cause:** `DataversePluginTypeRepository.register()` only set `workflowactivitygroupname` if explicitly provided. Without it, the field was null in Dataverse, and our domain entity's `isWorkflowActivity()` returned false (checks `workflowActivityGroupName !== null`).

**Fix:** Always set `workflowactivitygroupname` when registering workflow activities, defaulting to `friendlyName` if not provided.

```typescript
// Before (bug):
if (input.workflowActivityGroupName) {
    payload['workflowactivitygroupname'] = input.workflowActivityGroupName;
}

// After (fixed):
payload['workflowactivitygroupname'] =
    input.workflowActivityGroupName ?? input.friendlyName;
```

**Files Modified:**
- `IPluginTypeRepository.ts` - Added `delete()` method
- `DataversePluginTypeRepository.ts` - Implemented `delete()`, fixed workflow activity registration
- `PluginRegistrationPanelComposed.ts` - Added `pendingUpdateAssemblyTypes`, modified update flow
- `plugin-registration.js` - Made checkboxes editable, added status indicators

### Session 14 (2025-12-12)
**Unregister Plugin Package - COMPLETE**

**Implemented:**
- `IPluginPackageRepository.delete()` method
- `DataversePluginPackageRepository.delete()` implementation
- `UnregisterPluginPackageUseCase`
- `unregisterPackage()` method in panel with confirmation dialog
- Context menu command in package.json
- Command handler in extension.ts
- Context menu shows on both package nodes AND assembly-in-package nodes (consistency with Update Package)

**Files Created:**
- `src/features/pluginRegistration/application/useCases/UnregisterPluginPackageUseCase.ts`

**Files Modified:**
- `IPluginPackageRepository.ts` - Added `delete()` method
- `DataversePluginPackageRepository.ts` - Implemented `delete()`
- `PluginRegistrationPanelComposed.ts` - Added import, interface update, `unregisterPackage()` method
- `initializePluginRegistration.ts` - Wired up UnregisterPluginPackageUseCase
- `extension.ts` - Added command handler with packageId fallback
- `package.json` - Added command and two context menu entries (package + assembly-in-package)

### Session 15 (2025-12-13)
**Step/Image CRUD Operations - COMPLETE**

**Register Step - Full PRT Parity:**
- Created `RegisterPluginStepUseCase` with full field support
- Created `SdkMessageFilter` entity and repository for entity-specific step registration
- Added `DataverseSdkMessageFilterRepository` with `findByMessageAndEntity()` lookup
- `sdkmessagefilterid` links message to entity (required for entity-specific steps)
- Secure configuration stored in separate `sdkmessageprocessingstepsecureconfig` entity
- Created secure config automatically and linked to step on registration

**Register/Edit Step Form Fields:**
1. **General Configuration section:**
   - Message dropdown (required)
   - Primary Entity text field (looked up to sdkMessageFilter)
   - Filtering Attributes (only for Create/Update/CreateMultiple/UpdateMultiple/OnExternalUpdated)
   - Step Name (auto-populated with plugin type name)
2. **Execution section:**
   - Stage (Pre-validation/Pre-operation/Post-operation)
   - Mode (Synchronous/Asynchronous)
   - Execution Order (rank)
   - Deployment (Server Only/Offline Only/Server and Offline)
   - Delete AsyncOperation if Successful checkbox
3. **Configuration section:**
   - Unsecure Configuration textarea
   - Secure Configuration textarea

**Register/Edit Image Form Fields:**
- Image Type (PreImage/PostImage/Both)
- Name (entity alias)
- Attributes (comma-separated list)

**FormModal Component Enhancements:**
- Added `type: 'section'` - renders visual section headers
- Added `type: 'checkbox'` - single checkbox with inline label
- Made form body scrollable (max-height: 60vh)
- Added custom `width` parameter support

**Bug Fixes:**
- Fixed `iscustomizable` property not existing on sdkmessage entity
- Fixed `Microsoft.Crm.ServiceBus` filter exclusion
- Refactored `RegisterPluginAssemblyUseCase` to satisfy max-lines-per-function rule

**Files Created:**
- `src/.../domain/entities/SdkMessageFilter.ts`
- `src/.../domain/interfaces/ISdkMessageFilterRepository.ts`
- `src/.../infrastructure/repositories/DataverseSdkMessageFilterRepository.ts`
- `src/.../application/useCases/RegisterPluginStepUseCase.ts`
- `src/.../application/useCases/UpdatePluginStepUseCase.ts`
- `src/.../application/useCases/RegisterStepImageUseCase.ts`
- `src/.../application/useCases/UpdateStepImageUseCase.ts`
- `src/.../application/useCases/UnregisterPluginStepUseCase.ts`
- `src/.../application/useCases/UnregisterStepImageUseCase.ts`

**Files Modified:**
- `FormModal.js` - Section and checkbox support
- `form-modal.css` - Section header and checkbox styles
- `plugin-registration.js` - Step/image modal handlers
- `IPluginStepRepository.ts` - Extended RegisterStepInput/UpdateStepInput
- `DataversePluginStepRepository.ts` - Full step registration with secure config
- `DataverseSdkMessageRepository.ts` - Removed non-existent iscustomizable field
- `PluginRegistrationPanelComposed.ts` - Step/image CRUD handlers
- `initializePluginRegistration.ts` - Wired up new use cases and repositories
- `RegisterPluginAssemblyUseCase.ts` - Refactored into smaller methods

---

## Current Status Summary

### COMPLETED ✅
| Feature | Status |
|---------|--------|
| Read-only browsing (tree, filter, expand/collapse) | ✅ Slice 1 |
| Enable/Disable steps | ✅ Slice 2 |
| Update assembly (with type selection) | ✅ Slice 2+3 |
| Update package | ✅ Slice 2 |
| Register package | ✅ Slice 3 |
| Register assembly (with Plugin Inspector) | ✅ Slice 3 |
| Unregister assembly | ✅ Slice 3 |
| Unregister package | ✅ Slice 3 |
| Delta updates (instant UI for register/unregister) | ✅ Slice 3 |
| Plugin Inspector .NET tool | ✅ Slice 3 |
| **Register step** | ✅ Slice 3 |
| **Edit step** | ✅ Slice 3 |
| **Unregister step** | ✅ Slice 3 |
| **Register image** | ✅ Slice 3 |
| **Edit image** | ✅ Slice 3 |
| **Unregister image** | ✅ Slice 3 |
| **SdkMessageFilter repository** | ✅ Slice 3 |
| **Secure config handling** | ✅ Slice 3 |
| **FormModal enhancements (sections, checkboxes)** | ✅ Slice 3 |

### REMAINING - MVP
| Feature | Complexity | Notes |
|---------|------------|-------|
| Detail panel | MEDIUM | Show metadata when node selected |
| Selected item indicator | LOW | Visual highlight for selected tree node |
| Unit tests | HIGH | Domain + application layer (required before PR) |

### REQUIRED UX POLISH (Before MVP Complete)
| Feature | Priority | Notes |
|---------|----------|-------|
| Filterable Message combobox | HIGH | Type-to-filter dropdown (hundreds of messages) |
| Primary Entity autocomplete | HIGH | Filter entities based on selected message |
| Secondary Entity field | HIGH | For messages that support it (Associate, SetState, etc.) |
| Run in User's Context dropdown | HIGH | Type-to-search user lookup for impersonation |
| Filtering Attributes picker | HIGH | Picker dialog with entity attribute checkboxes |
| Solution selector for steps | HIGH | Add step to solution (like assemblies) |
| Auto-expand after add step | HIGH | Show new step in tree without manual expand |
| AsyncAutoDelete conditional | HIGH | Only enable for Asynchronous mode |
| Step name auto-generation | HIGH | Match PRT naming convention (user researching)

### DEFERRED - Post-MVP
| Feature | Priority | Notes |
|---------|----------|-------|
| Solution filtering | Medium | Filter tree by solution (performance optimization) |
| Add to Solution action | Low | Right-click → add assembly/package to solution |
| Persist filter checkboxes | Low | Remember Hide Microsoft / Hide Hidden Steps |

### MVP Definition (Updated)
**MVP = Core CRUD + Polished UX**

**Completed:**
- ✅ Tree browsing with filters (packages, assemblies, types, steps, images)
- ✅ Assembly CRUD (register, update with type selection, unregister)
- ✅ Package CRUD (register, update, unregister)
- ✅ Step CRUD (register, edit, unregister, enable/disable)
- ✅ Image CRUD (register, edit, unregister)
- ✅ Plugin Inspector tool for DLL analysis

**Required before MVP complete:**
- ⬜ **Step form UX polish:**
  - Filterable combobox for Message (type-to-filter)
  - Primary Entity autocomplete (dynamic fetch based on message)
  - Secondary Entity field (for Associate, SetState, etc.)
  - Run in User's Context dropdown (type-to-search users)
  - Filtering Attributes picker (dialog with checkboxes)
  - Solution selector (add step to solution)
  - Step name auto-generation (match PRT convention)
- ⬜ **Step form behavior:**
  - Auto-expand plugin type after adding step
  - Disable "Delete AsyncOperation" when mode is Synchronous
- ⬜ Detail panel (show metadata when node selected)
- ⬜ Unit tests (required before PR)

**Explicitly OUT of MVP:**
- Solution filtering (complex, deferred pending user feedback)
- Add to Solution action (nice-to-have)
- Filter checkbox persistence (nice-to-have)

---

## Pre-PR Polish Checklist

Before merging Slices 1-3:
- [ ] Detail panel - Show metadata when node selected
- [ ] Unit tests - Domain and application layer tests
- [x] Update operation UX - Progress indicator shows assembly/environment names ✅
- [x] All CRUD operations - Package, Assembly, Step, Image ✅
- [x] FormModal enhancements - Sections, single checkboxes, scrollable ✅
- [ ] Webview filter regression tests (see Session 8)

**Deferred to Post-MVP:**
- [ ] Solution filtering - Filter tree by solution (complex, user feedback pending)

---

## UX Polish Plan - Step Registration Forms

### Current Problems

1. **Message Field**: Standard `<select>` dropdown with hundreds of messages - impossible to find specific message quickly
2. **Primary Entity Field**: Plain text input - user must know exact entity logical name
3. **Secondary Entity Field**: Missing entirely - needed for Associate, SetState, etc.
4. **Run in User's Context**: Missing - needed for impersonation scenarios
5. **Filtering Attributes Field**: Plain text comma-separated - user must know exact attribute logical names
6. **Solution Selector**: Missing - steps should be added to a solution like assemblies
7. **AsyncAutoDelete**: Shows for Synchronous mode (invalid - only applies to Async)
8. **Step Name**: Not auto-generated per PRT convention
9. **After Add Step**: Tree doesn't expand to show new step

### Proposed Solutions

#### Phase 1: Filterable Combobox Component

Create a reusable `FilterableComboBox` component that:
- Shows input field with dropdown arrow
- As user types, filters options (case-insensitive)
- Supports keyboard navigation (↑/↓/Enter/Escape)
- Shows "no matches" when filter has no results
- Can still click dropdown to see all options

**Files to create:**
- `resources/webview/js/components/FilterableComboBox.js`
- `resources/webview/css/components/filterable-combobox.css`

**Apply to Message field:** Replace `type: 'select'` with `type: 'combobox'`

#### Phase 2: Dynamic Primary Entity Options

When message changes:
1. Fetch available entities from `sdkmessagefilter` records for that message
2. Populate Primary Entity combobox with those entities
3. Some messages (like Create/Update) support ALL entities - show full entity list

**Data flow:**
```
Message selected → postMessage('getEntitiesForMessage', messageId)
                → Extension calls sdkMessageFilterRepository.findByMessageId()
                → Returns entity list → Updates Primary Entity combobox options
```

**Alternative (simpler):** Pre-load ALL sdkmessagefilters when modal opens, filter client-side.

#### Phase 3: Filtering Attributes Picker

**Option A: Picker Dialog (Recommended)**
- Add "..." button next to Filtering Attributes field
- Only enabled when Primary Entity is selected AND message supports filtering
- Clicking opens dialog with:
  - Search/filter input
  - Checkbox list of entity attributes
  - OK/Cancel buttons
- Returns comma-separated selected attribute names

**Data flow:**
```
Click "..." → postMessage('getEntityAttributes', entityLogicalName)
           → Extension calls metadataRepository.getEntityAttributes()
           → Returns attribute list → Shows picker dialog
```

**Option B: Tag Input with Autocomplete**
- Type attribute name, autocomplete suggests
- Press Enter/comma to add tag
- Click X to remove tag
- More compact but less discoverable

**Option C: Keep Text Field (Minimal)**
- Add help text: "Enter attribute logical names (use Metadata Browser to find names)"
- Least effort, acceptable for power users

#### Phase 4: Secondary Entity Field

For messages like Associate, SetState, SetStateDynamicEntity:
- Add Secondary Entity combobox below Primary Entity
- Same autocomplete behavior as Primary Entity
- Only shown/enabled for messages that support it
- Can be determined from sdkmessagefilter (secondaryobjecttypecode field)

#### Phase 5: Run in User's Context Dropdown

For step impersonation:
- Add "Run in User's Context" combobox
- Options: "Calling User" (default), or specific system user
- Need to fetch system users from Dataverse
- Maps to `impersonatinguserid` field on step

**Data flow:**
```
Modal opens → postMessage('getSystemUsers')
           → Extension fetches systemuser records (id, fullname)
           → Populates dropdown with user options
```

#### Phase 6: Solution Selector

Add solution dropdown to Register Step form:
- Same pattern as Register Assembly (optional solution)
- Load unmanaged solutions with publisher prefix
- Maps to `solutionUniqueName` query parameter on POST
- Images inherit from step (no separate solution selector needed)

#### Phase 7: Conditional AsyncAutoDelete

- Only show/enable "Delete AsyncOperation if Successful" when Mode = Asynchronous
- When Mode changes to Synchronous, hide or disable the checkbox
- Use `onFieldChange` callback to react to mode changes

#### Phase 8: Step Name Auto-Generation

**Format:** `{PluginTypeName}: {MessageName} of {PrimaryEntity}[ and {SecondaryEntity}]`

**Examples:**
- `MyCompany.Plugins.AccountHandler: Create of account`
- `MyCompany.Plugins.ContactMerge: Merge of contact and lead`
- `Microsoft.Crm.ServiceBus.ServiceBusPlugin: Update of any Entity`

**Logic (from PRT source):**
1. Plugin type name + `: ` (if provided)
2. Message name + ` of ` (or "Not Specified of " if missing)
3. Primary entity name (if provided and not "none")
4. If secondary entity exists, add ` and {secondaryEntity}`
5. If no entity specified, use "any Entity"

**Implementation:**
- Create domain service: `src/features/pluginRegistration/domain/services/PluginStepNameGenerator.ts`
- Track `userHasEditedName` flag in form state
- Auto-regenerate when message/entity changes (only if user hasn't customized)
- Use same value for both `name` and `description` fields (PRT does this)

#### Phase 9: Auto-Expand After Add Step

When step is successfully added:
1. Find the plugin type node in tree
2. Expand it (set expanded = true)
3. Scroll new step into view
4. Optionally highlight/select the new step

### Implementation Order

1. **FilterableComboBox component** - Unlocks all other improvements
2. **Message field → combobox** - Immediate high-value improvement
3. **Primary Entity → combobox** - Need to load sdkmessagefilters per message
4. **Secondary Entity field** - Similar to Primary Entity, conditional display
5. **Run in User's Context dropdown** - Type-to-search system users
6. **Solution selector** - Reuse existing solution dropdown pattern
7. **Filtering Attributes picker** - Dialog with entity attribute checkboxes
8. **Conditional AsyncAutoDelete** - Simple JS show/hide logic
9. **Step name auto-generation** - Format TBD based on PRT research
10. **Auto-expand after add step** - Expand parent node + scroll into view

### Design Decisions (APPROVED ✅)

#### Decision 1: Filtering Attributes - Picker Dialog ✅
- Picker dialog with searchable checkbox list
- Sorted by logical name ascending
- Search filter at top for large entities

#### Decision 2: System Users - Type-to-Search ✅
- "Calling User" as default
- Type 2+ chars to trigger search
- Search on BOTH `fullname` AND `domainname` (email)
- Query: `$filter=isdisabled eq false and (contains(fullname, '{search}') or contains(domainname, '{search}'))&$top=50`

#### Decision 3: Entity List - Dynamic with Caching ✅
- On message change: fetch `sdkmessagefilter?$filter=_sdkmessageid_value eq '{messageId}'`
- Cache results (Map of messageId → entities)
- Sorted by logical name ascending
- Entity field is combobox-constrained (no validation needed - user can only select valid entities)

#### Decision 4: Step Name Generation ✅
- Format: `{PluginTypeName}: {MessageName} of {PrimaryEntity}[ and {SecondaryEntity}]`
- Auto-regenerate when message/entity changes (only if user hasn't customized name)
- Same value for `name` and `description` fields

### Open Questions (Need User Input)

#### Question 1: Image `messagepropertyname`
When registering step images, we need to set the correct `messagepropertyname`:
- Create/Update/Delete → "Target"
- SetState/SetStateDynamicEntity → "EntityMoniker"
- Associate/Disassociate → "Target", "RelatedEntities", "Relationship"

**Options:**
A. Auto-set based on message (most common case is "Target")
B. Add dropdown for user to select from valid options
C. Auto-set to "Target" as default, allow user to override

#### Question 2: Stage Validation
Some message/stage combinations are invalid (e.g., can't do PostOperation on certain messages).

**Options:**
A. Validate client-side and show warning before submit
B. Let Dataverse return the error (simpler, but worse UX)
C. Filter stage dropdown based on message (only show valid stages)

#### Question 3: Image Attributes Picker
The image form has an "Attributes" field for selecting which entity attributes to include in the image.

**Options:**
A. Same picker dialog as Filtering Attributes (searchable checkbox list)
B. Simple text field (current implementation)

#### Question 4: Description Field for Steps
PRT has a description field. We're now using step name for both `name` and `description`.

**Options:**
A. Keep it simple - same value for both (current plan)
B. Add separate description field for custom descriptions

### Technical Considerations

**FormModal changes needed:**
- Add `type: 'combobox'` field type
- Support dynamic option updates (for Primary Entity, Secondary Entity)
- Support button addon for picker (for Filtering Attributes)
- Support conditional show/hide (for AsyncAutoDelete)
- Support `onFieldChange` for cross-field dependencies

**Extension changes needed:**
- Add `getEntitiesForMessage` handler in panel (fetch sdkmessagefilters)
- Add `searchSystemUsers` handler (type-to-search users)
- Add `getEntityAttributes` handler (leverage existing Metadata Browser code)
- Send data back to webview via postMessage

**CSS considerations:**
- Dropdown must appear above modal footer (z-index)
- Dropdown should be scrollable (max-height)
- Selected item highlight
- Keyboard focus indicators
- Loading spinner for async operations
