# Plugin Registration Tool - Task Tracking

**Branch:** `feature/plugin-registration`
**Created:** 2025-12-08
**Status:** Implementation (Slice 3 Complete - UX Polish Done, Tests Remaining)

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

### Session 16 (2025-12-13)
**Step Registration UX Polish - COMPLETE**

**Implemented:**
1. **FilterableComboBox Component** - Created reusable type-to-filter dropdown
   - Keyboard navigation (↑/↓/Enter/Escape)
   - Highlighted matching text
   - Loading state support
   - Dynamic option updates

2. **Message Field → Combobox** - Replaced select with filterable combobox
   - Type to filter hundreds of SDK messages
   - Improved usability for finding specific messages

3. **Dynamic Primary Entity Options** - Entity list fetched per message
   - Calls `sdkmessagefilter` repository when message changes
   - Client-side caching (`entityCacheByMessage` Map)
   - Sorted alphabetically by logical name

4. **Secondary Entity Field** - Added for Associate/Disassociate messages
   - Updated `SdkMessageFilter` entity with `secondaryObjectTypeCode`
   - Updated repository to fetch and map secondary entity
   - Populates when message is selected (if applicable)

5. **Step Name Auto-Generation** - Format: `{PluginType}: {Message} of {Entity}[ and {Secondary}]`
   - Tracks `userEditedName` flag - stops regenerating if user customizes
   - Updates on message, primary entity, or secondary entity change

6. **Auto-Expand After Step Registration** - Fixed bug where parent wasn't visible
   - Now expands parent node AND all ancestors before rendering
   - Added `expandAncestors()` helper function
   - Scrolls new step into view

7. **Stage/Mode Validation** - Async mode forces PostOperation
   - When mode changes to Async, stage is automatically set to PostOperation

8. **Run in User's Context Dropdown** - MVP implementation
   - Simple dropdown with "Calling User" option
   - Full user search deferred to post-MVP

**Files Created:**
- `resources/webview/css/components/filterable-combobox.css`
- `resources/webview/js/components/FilterableComboBox.js`

**Files Modified:**
- `resources/webview/js/features/plugin-registration.js` - Added UX enhancements
- `resources/webview/js/components/FormModal.js` - Added combobox field type support
- `src/features/pluginRegistration/domain/entities/SdkMessageFilter.ts` - Added secondary entity
- `src/features/pluginRegistration/infrastructure/repositories/DataverseSdkMessageFilterRepository.ts` - Fetch secondary entity
- `src/features/pluginRegistration/presentation/panels/PluginRegistrationPanelComposed.ts` - Entity loading handlers

---

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
| **Solution selector for steps** | LOW | Add step to solution on registration (like assemblies) |
| **Detail panel** | MEDIUM | Show metadata when node selected |
| Unit tests | HIGH | Domain + application layer (required before PR) |

---

## Implementation Plan: Solution Selector for Steps

**Pattern:** Same as packages/assemblies - established pattern.

**Changes:**
1. **Webview** (`plugin-registration.js`):
   - Add solution dropdown to Register Step form (after Description section)
   - Load solutions same way as assembly registration
   - Include `solutionUniqueName` in `confirmRegisterStep` message data

2. **Panel** (`PluginRegistrationPanelComposed.ts`):
   - Pass solutions list to `showRegisterStepModal` message
   - Extract `solutionUniqueName` from `confirmRegisterStep` handler
   - Pass to use case

3. **Use Case** (`RegisterPluginStepUseCase.ts`):
   - Add `solutionUniqueName?: string` to input interface
   - Pass to repository

4. **Repository Interface** (`IPluginStepRepository.ts`):
   - Add `solutionUniqueName?: string` param to `register()` method

5. **Repository Impl** (`DataversePluginStepRepository.ts`):
   - Add `MSCRM.SolutionUniqueName` header to POST (same as packages/assemblies)

**Effort:** ~30 minutes

---

## Implementation Plan: Detail Panel

**Design:** Collapsible panel below tree (like PRT) showing metadata for selected node.

### UI Layout
```
┌─────────────────────────────────────────┐
│ [Refresh] [Expand All] [Collapse All]   │
│ [Register ▼] [☐ Hide Microsoft] [☐ Hide]│
│ ┌─────────────────────────────────────┐ │
│ │ 🔍 Filter...                        │ │
│ ├─────────────────────────────────────┤ │
│ │ 📦 MyPackage                        │ │
│ │   📚 MyAssembly ← SELECTED          │ │
│ │     🔌 MyPlugin                     │ │
│ │       ⚡ Create of account          │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ ▼ Details                           │ │
│ ├─────────────────────────────────────┤ │
│ │ Name:        MyAssembly             │ │
│ │ Version:     1.0.0.0                │ │
│ │ Isolation:   Sandbox                │ │
│ │ Source:      Database               │ │
│ │ Managed:     No                     │ │
│ │ Plugins:     3                      │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### Changes Required

1. **HTML** (`PluginRegistrationTreeSection.ts`):
   - Add detail panel container after tree container
   - Collapsible with header "Details"

2. **CSS** (`plugin-registration.css`):
   - `.tree-node--selected` - highlight for selected node
   - `.detail-panel` - container styles
   - `.detail-panel-header` - collapsible header
   - `.detail-panel-content` - key-value grid
   - `.detail-row`, `.detail-label`, `.detail-value`

3. **JS** (`plugin-registration.js`):
   - Track `selectedNodeId` state
   - On node click: add selected class, post `nodeSelected` message
   - Handle `showNodeDetails` message: render detail panel content
   - `renderDetailPanel(nodeType, details)` function
   - Detail templates for each node type

4. **Panel** (`PluginRegistrationPanelComposed.ts`):
   - Register `nodeSelected` handler
   - Fetch full entity from appropriate repository based on node type
   - Map to detail ViewModel
   - Send `showNodeDetails` message with formatted data

### Detail Fields by Node Type

**Package:**
- Name, Unique Name, Version, Publisher Prefix, Managed, Created On, Modified On

**Assembly:**
- Name, Version, Isolation Mode, Source Type, Managed, Plugin Count, Created On

**Plugin Type:**
- Full Type Name, Friendly Name, Is Workflow Activity, Assembly Name

**Step:**
- Name, Message, Primary Entity, Secondary Entity, Stage, Mode, Rank
- Deployment, Async Auto Delete, Filtering Attributes
- Unsecure Configuration (truncated), Has Secure Configuration (yes/no)
- Enabled, Managed, Created On

**Image:**
- Name, Image Type, Entity Alias, Message Property, Attributes

**Effort:** ~2-3 hours

### UX POLISH - CORE COMPLETE ✅
| Feature | Status | Notes |
|---------|--------|-------|
| Filterable Message combobox | ✅ | Type-to-filter dropdown (hundreds of messages) |
| Primary Entity autocomplete | ✅ | Dynamic fetch based on message, sorted by logical name |
| Secondary Entity field | ✅ | For Merge, Associate, etc. |
| Run in User's Context dropdown | ✅ | "Calling User" default (MVP - type-to-search users deferred) |
| Stage/Mode validation | ✅ | Async → force PostOperation |
| Step name auto-generation | ✅ | `{PluginType}: {Message} of {Entity}[ and {Secondary}]` |
| Auto-expand after add step | ✅ | Expand ancestors, scroll new step into view |

### UX POLISH - DEFERRED (Post-MVP)
| Feature | Priority | Notes |
|---------|----------|-------|
| Filtering Attributes picker | MEDIUM | Searchable checkbox dialog, sorted by logical name |
| Solution selector for steps | MEDIUM | Add step to solution (like assemblies) |
| ~~AsyncAutoDelete conditional~~ | ~~LOW~~ | ✅ DONE (Session 18) - Only shows for Async mode |
| Description field | LOW | Separate from name, both auto-generate independently |
| ~~Image messagepropertyname~~ | ~~MEDIUM~~ | ✅ DONE (Session 18) - Auto-set based on message |
| Image Attributes picker | MEDIUM | Same searchable checkbox dialog as Filtering Attributes |

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
- ✅ **Step form UX polish (CORE COMPLETE):**
  - ✅ Filterable combobox for Message (type-to-filter)
  - ✅ Primary Entity autocomplete (dynamic fetch based on message)
  - ✅ Secondary Entity field (for Merge, Associate, etc.)
  - ✅ Run in User's Context dropdown ("Calling User" default - full user search deferred)
  - ✅ Step name auto-generation (match PRT convention)
  - ⬜ Filtering Attributes picker (deferred - searchable checkbox dialog)
  - ⬜ Solution selector (deferred - add step to solution)
  - ⬜ Description field (deferred - separate from name)
- ✅ **Step form behavior:**
  - ✅ Auto-expand plugin type after adding step
  - ✅ Async mode → force PostOperation
  - ✅ Hide "Delete AsyncOperation" when mode is Synchronous (Session 18)
- ✅ **Image form UX polish:**
  - ✅ Auto-set messagepropertyname (Session 18) - hidden from user
  - ⬜ Attributes picker (deferred - searchable checkbox dialog)
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
- Auto-regenerate when message/entity changes (only if user hasn't customized)
- Both Name and Description auto-generate with same logic, but can be edited independently

#### Decision 5: Image `messagepropertyname` ✅
Auto-set for single property, show dropdown for messages with multiple options.

**Hardcoded property names by message:**
| Message        | PropertyName(s)                    |
|----------------|------------------------------------|
| Create         | id                                 |
| CreateMultiple | Ids                                |
| Update         | Target                             |
| UpdateMultiple | Targets                            |
| Delete         | Target                             |
| Assign         | Target                             |
| SetState       | EntityMoniker                      |
| Merge          | Target, SubordinateId (user picks) |

**Logic:**
```javascript
if (message.imagePropertyNames.length === 1) {
    return message.imagePropertyNames[0]; // Auto-set
}
if (message.imagePropertyNames.length > 1) {
    // Show dropdown for user to pick
}
```

#### Decision 6: Stage/Mode Validation ✅
Dynamically filter/disable based on context (matches PRT behavior).

**Rules:**
- Async mode → Force PostOperation, disable stage dropdown
- Service endpoints → Force Async + PostOperation, disable both dropdowns
- CustomAPI → Special handling (TBD)
- Otherwise → All stages enabled

**Logic:**
```javascript
if (mode === 'Async') {
    stage = 'PostOperation';
    stageDropdownEnabled = false;
}
if (isServiceEndpoint) {
    mode = 'Async';
    stage = 'PostOperation';
    modeEnabled = false;
    stageEnabled = false;
}
```

#### Decision 7: Image Attributes Picker ✅
Use same searchable checkbox picker as Filtering Attributes for consistency.

#### Decision 8: Description Field ✅
Add separate description field (matches PRT).

**Behavior:**
- Both Name and Description auto-generate using same `PluginStepNameGenerator` logic
- Both track independent `userHasEdited*` flags
- User can customize either independently
- Name: Short identifier shown in tree
- Description: Can be more verbose, shown in details/tooltips

### Session 17 (2025-12-13)
**Bug Fix: Plugin Packages Not Added to Solutions**

**Problem:** When registering a plugin package, it was created in Dataverse but NOT added to the selected solution. The package appeared in the tree but was not associated with any solution.

**Root Cause:** The `solutionUniqueName` parameter was never propagated through the entire chain:
1. Webview validated `values.solution` but didn't include it in posted data
2. Panel handler only extracted `name`, `version`, `prefix` - missing solution
3. Use case input didn't have `solutionUniqueName` property
4. Repository `register()` method lacked the solution parameter

**Fix (6 files modified):**
1. **Webview** (`plugin-registration.js`): Added `solutionUniqueName: values.solution` to `confirmRegisterPackage` message data
2. **Panel handler** (`PluginRegistrationPanelComposed.ts`): Extract and validate `solutionUniqueName` from message data
3. **Panel method** (`handleConfirmRegisterPackage`): Accept `solutionUniqueName` parameter
4. **Use case input** (`RegisterPluginPackageUseCase.ts`): Added `solutionUniqueName` to input interface with validation
5. **Repository interface** (`IPluginPackageRepository.ts`): Added `solutionUniqueName` parameter to `register()` method
6. **Repository implementation** (`DataversePluginPackageRepository.ts`): Added `?solutionUniqueName={value}` query parameter to POST endpoint

**API pattern (matching PRT behavior):**
```
POST /api/data/v9.2/pluginpackages
MSCRM.SolutionUniqueName: MySolution

{
  "name": "prefix_PackageName",
  "uniquename": "prefix_PackageName",
  "version": "1.0.0",
  "content": "<base64>"
}
```

**Note:** Query parameter `?solutionUniqueName=` does NOT work for pluginpackages - returns 400 error.
Must use `MSCRM.SolutionUniqueName` header (same as pluginassemblies).

**Additional fix:** Solution dropdown was using `id` (GUID) as value instead of `uniqueName`.
Dataverse requires the actual unique name string, not the ID.

**Files Modified:**
- `resources/webview/js/features/plugin-registration.js`
- `src/.../presentation/panels/PluginRegistrationPanelComposed.ts`
- `src/.../application/useCases/RegisterPluginPackageUseCase.ts`
- `src/.../domain/interfaces/IPluginPackageRepository.ts`
- `src/.../infrastructure/repositories/DataversePluginPackageRepository.ts`

**F5 Testing Status (2025-12-13):**
| Feature | Status | Notes |
|---------|--------|-------|
| Register Package | ✅ WORKING | Adds to solution correctly |
| Unregister Package | ✅ WORKING | |
| Register Assembly | ✅ WORKING | With plugin type selection |
| Unregister Assembly | ✅ WORKING | |
| Update Package | ✅ WORKING | Needs more testing |
| Update Assembly | ✅ WORKING | Needs more testing |
| Register Step | ⏳ NEEDS TESTING | |
| Edit Step | ⏳ NEEDS TESTING | |
| Unregister Step | ⏳ NEEDS TESTING | |
| Register Image | ⏳ NEEDS TESTING | |
| Edit Image | ⏳ NEEDS TESTING | |
| Unregister Image | ⏳ NEEDS TESTING | |

### Session 18 (2025-12-13)
**UX Polish & Bug Fixes - COMPLETE**

**Fixes Implemented:**
1. **Combobox highlight styling** - Was using background color as text color (unreadable)
   - Fixed `filterable-combobox.css` to use proper background highlight only

2. **AsyncAutoDelete checkbox placement** - Now only shows for async mode
   - Moved field right after Mode selector
   - Added `hidden` property support to FormModal fields
   - Added 4th param to `updateField()` for visibility toggling
   - Checkbox auto-shows when mode=Async, auto-hides when mode=Sync

3. **Step name auto-generation** - Was inconsistent
   - Fixed `userEditedName` flag to reset when user clears field
   - Stored `generateStepName` in `activeStepModal` for async access
   - Name now regenerates after async entity loading

4. **Escape key dirty check** - Modal now warns if unsaved changes
   - Added `initialValues` tracking for all field types
   - Added `isDirty()` function to check for changes
   - Escape/overlay click shows confirm dialog if dirty

5. **Register dropdown wiring** - Steps and Images now work from dropdown
   - Added `handleRegisterStepFromDropdown()` - shows quick pick of plugin types
   - Added `handleRegisterImageFromDropdown()` - shows quick pick of steps
   - Both use VS Code native quick pick for selection

6. **Validation feedback** - Register step now shows which fields are missing
   - Added explicit validation with `missingFields` array
   - Shows error message: "Cannot register step: Missing required fields: X, Y, Z"

7. **Notification messages** - Now include parent context
   - Step: `Step "MyStep" registered for MyPluginType in Dev Environment.`
   - Image: `Image "PreImage" registered for MyStep in Dev Environment.`

8. **Message Property field hidden** - Auto-determined like PRT
   - Removed from both Register and Edit Image forms
   - Uses `getImagePropertyNamesForMessage()` to auto-select first/primary option

**Files Modified:**
- `resources/webview/css/components/filterable-combobox.css` - Fixed highlight styling
- `resources/webview/js/components/FormModal.js` - Added visibility toggle, dirty tracking
- `resources/webview/js/features/plugin-registration.js` - Multiple UX fixes
- `src/.../presentation/panels/PluginRegistrationPanelComposed.ts` - Dropdown handlers, validation

---

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

---

### Session 20 (2025-12-18)
**Bug Fixes - Multiple Issues**

**Bugs Reported:**
1. ❓ **Solution picker not loading** - Dropdown shows "Loading..." and never populates
2. ✅ **Register Step/Image buttons disabled** - Dropdown items were permanently disabled
3. ✅ **Primary entity showing "(none)"** - Edit Step modal was missing `primaryEntity` field
4. ✅ **Tree click behavior** - Clicking nodes would toggle expand/collapse unexpectedly
5. ✅ **Images not showing under steps** - First click fix broke expansion behavior
6. ✅ **Step form validation** - Async mode + non-Server Only deployment allowed (Dataverse rejects)

**Fixes Implemented:**

**1. Step Form Async/Deployment Validation (✅ FIXED)**
- **Problem:** Dataverse returns "400 Bad Request - Asynchronous steps are only supported in ServerOnly mode" when user selects Async + Offline deployment
- **Solution:**
  - Added 5th `disabled` parameter to `updateField()` in FormModal.js
  - When mode changes to Async, auto-set deployment to "Server Only" and disable dropdown
  - Re-enable dropdown when mode changes back to Synchronous
- **Files:** `FormModal.js`, `plugin-registration.js`

**2. Tree Click Behavior (✅ FIXED)**
- **Problem:** Clicking anywhere on a node would both show details AND toggle expand/collapse
- **Solution:**
  - Click on toggle arrow (▶) → toggle expand/collapse only
  - Click on node content → expand if collapsed + select + show details (never collapse)
- **File:** `plugin-registration.js` - `handleNodeClick()` function

**3. Images Not Showing (✅ FIXED - was caused by #2)**
- **Problem:** After first click fix, clicking on steps didn't expand to show images
- **Root Cause:** First fix removed expansion entirely on content click
- **Solution:** Content click now expands if collapsed, but doesn't collapse if already expanded
- **File:** `plugin-registration.js` - `handleNodeClick()` function

**4. Register Step/Image Buttons (✅ FIXED)**
- **Problem:** "Register New Step" and "Register New Image" dropdown items were permanently disabled
- **Solution:** Removed `disabled: true` from dropdown item definitions
- **File:** `RegisterDropdownSection.ts`

**5. Edit Step Modal Missing Fields (✅ FIXED)**
- **Problem:** Edit Step modal showed "(none)" for Primary Entity even when step had one
- **Root Cause:** `showEditStepModal` command was missing `primaryEntity` in data
- **Solution:** Added missing fields to modal data:
  - `primaryEntity`
  - `supportedDeployment`
  - `asyncAutoDelete`
  - `unsecureConfiguration`
- **File:** `PluginRegistrationPanelComposed.ts` - `editStep()` method

**6. Solution Picker (✅ WORKING)**
- **Problem:** Was reported as not loading, but testing confirmed it works
- **Status:** Working correctly - solutions load and populate the dropdown

**7. Images Filtered Out by Solution Filter (✅ FIXED)**
- **Problem:** Images disappeared when solution filter was active (even Default Solution)
- **Root Cause:** `filterBySolution()` recursively filtered ALL children, including images. But images are NOT solution components - Dataverse only tracks assemblies, plugin types, and steps in `solutioncomponent`.
- **Solution:** Modified `filterBySolution()` to skip filtering image children - when processing a step, keep all its images without checking solution membership.
- **File:** `plugin-registration.js` - `filterBySolution()` function

**Files Modified:**
- `resources/webview/js/components/FormModal.js` - Added disabled parameter to updateField
- `resources/webview/js/features/plugin-registration.js` - Click behavior fixes
- `src/.../presentation/panels/PluginRegistrationPanelComposed.ts` - Edit modal data, solution debug logging
- `src/.../presentation/sections/RegisterDropdownSection.ts` - Enabled step/image buttons

**Testing Status:**
| Issue | Status | Notes |
|-------|--------|-------|
| Async/Deployment validation | ✅ Fixed | Dropdown disables when Async selected |
| Tree click behavior | ✅ Fixed | Content click expands, arrow toggles |
| Images showing under steps | ✅ Fixed | Expansion works correctly |
| Register Step/Image buttons | ✅ Fixed | Dropdown items now enabled |
| Edit Step primary entity | ✅ Fixed | Shows correct entity name |
| Solution picker | ✅ Working | Loads and populates correctly |
| Images filtered by solution | ✅ Fixed | Images now preserved when parent step is in solution |

**8. Attribute Picker for Images (✅ FIXED)**
- **Problem:** Image forms (Register/Edit) used plain text fields for attributes instead of the attribute picker
- **Root Cause:** `handleShowRegisterImageModal` and `handleShowEditImageModal` weren't updated to use `type: 'attributeInput'`
- **Solution:**
  - Extension already sends `primaryEntity` from the step when showing image modals
  - Updated `handleShowRegisterImageModal` to use `type: 'attributeInput'` with `entityField: 'primaryEntity'`
  - Updated `handleShowEditImageModal` to use the same pattern
  - If no primary entity available, falls back to plain text field
- **File:** `plugin-registration.js` - Both image modal handlers

| Attribute picker for images | ✅ Fixed | Uses same attribute picker as steps |

**9. PRT-Compatible Attribute Filtering (✅ FIXED)**
- **Problem:** Attribute picker showed invalid attributes (versionnumber, stageid, processid, importsequencenumber, address IDs) that Dataverse rejects for plugin images
- **Root Cause:** Original blacklist approach couldn't identify all invalid attributes by metadata properties
- **Solution:** Implemented PRT's whitelist approach (decompiled from Plugin Registration Tool):
  - **Always include:** Boolean, Customer, DateTime, Decimal, Double, Integer, Lookup, Memo, Money, Owner, PartyList, Picklist, State, Status, String
  - **Conditionally include:**
    - `Uniqueidentifier` - only if it's the entity's actual primary ID (`{entityLogicalName}id`)
    - `CalendarRules` - only if primary ID
    - `Virtual` - only if primary ID OR MultiSelectPicklist
  - **Exclude everything else:** BigInt, Binary, File, Image, EntityName, ManagedProperty, etc.
- **Key insight:** Address ID fields (`address1_addressid`, `address2_addressid`) have `IsPrimaryId=true` but are foreign keys - fixed by checking logical name matches `{entity}id` pattern
- **File:** `DataverseAttributePickerRepository.ts`

| PRT-compatible attribute filter | ✅ Fixed | Whitelist approach matches PRT exactly |

**10. "All Attributes" UX Improvement (✅ FIXED)**
- **Problem:** Empty attributes field showed placeholder "Comma-separated (leave empty for all)" - confusing UX
- **Solution:**
  - Display "All Attributes" as actual value (not grayed placeholder) when empty
  - On form submit, "All Attributes" converts to `undefined` (Dataverse treats as capture all)
  - When attribute picker returns all selected or none, shows "All Attributes"
- **File:** `plugin-registration.js` - Register/Edit image modal handlers

| "All Attributes" UX | ✅ Fixed | Shows actual value instead of placeholder |

**11. Details Panel Attribute Scrolling (✅ FIXED)**
- **Problem:** When image has many attributes, the details panel truncated them without scroll
- **Solution:** Changed `.detail-value.truncated` CSS from `overflow: hidden` to `overflow-y: auto` with `max-height: 120px`
- **File:** `plugin-registration.css`

| Details panel scrolling | ✅ Fixed | Long attribute lists now scrollable |

### Session 21 (2025-12-18)
**Image Update Fix - Step Reference Required**

**Problem:** When updating step images via Web API, certain attribute combinations would fail while the same attributes worked in PRT.

**Investigation:**
- Captured Fiddler trace of PRT updating step images
- PRT uses SOAP/Organization Service (`/XRMServices/2011/Organization.svc/web`)
- Key discovery: PRT's UpdateRequest includes ALL fields, notably `sdkmessageprocessingstepid` (parent step reference)

**Root Cause Analysis:**
| Aspect | PRT (SOAP - works) | Our Implementation (Web API - fails) |
|--------|-------------------|--------------------------------------|
| API | Organization Service | Web API |
| Fields sent | ALL fields | Only changed fields |
| Step reference | Always included as EntityReference | Not included in PATCH |

**Solution:**
1. Added `stepId` to `UpdateImageInput` interface (required for Dataverse)
2. Updated `DataverseStepImageRepository.update()` to always include `sdkmessageprocessingstepid@odata.bind` in PATCH
3. Modified `UpdateStepImageUseCase` to fetch the image first (for stepId) then merge into the update input

**Key Insight:** Dataverse's Web API for step image updates requires the parent step navigation property, even though it's not changing. This matches PRT's behavior of always sending all fields in updates.

**Files Modified:**
- `src/.../domain/interfaces/IStepImageRepository.ts` - Added `stepId` to `UpdateImageInput`
- `src/.../infrastructure/repositories/DataverseStepImageRepository.ts` - Include step reference in PATCH
- `src/.../application/useCases/UpdateStepImageUseCase.ts` - Get stepId from fetched image

**Cleanup:**
- Removed debug logging from `DataverseAttributePickerRepository.ts` (PRT comparison logging)

**F5 Testing Results:**
- [x] Test updating image attributes (same set that failed before) - **WORKING**
- [x] Test updating other image fields (name, entityAlias, imageType) - **WORKING**

**Additional UX Improvement:**
- [x] Changed tree default to expanded instead of collapsed for better discoverability
- Reused existing `expandAll()` function in `handleTreeUpdate()` (no new code needed)
