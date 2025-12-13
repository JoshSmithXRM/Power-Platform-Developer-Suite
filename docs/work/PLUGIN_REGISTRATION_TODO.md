# Plugin Registration Tool - Task Tracking

**Branch:** `feature/plugin-registration`
**Created:** 2025-12-08
**Status:** Implementation (Slice 3 In Progress)

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

#### Register New Assembly - NEXT UP
- [ ] Register dropdown → "New Assembly..." already wired up
- [ ] File picker for .dll files
- [ ] Modal with:
  - Assembly name (extracted from filename, e.g., "PPDSDemo.Plugins")
  - Solution selector (optional - can register without adding to solution)
  - Info text about automatic plugin type discovery
- [ ] API: POST pluginassemblies with:
  - `name`: Assembly name (NO prefix, unlike packages)
  - `content`: Base64 DLL bytes
  - `sourcetype`: 0 (Database) - only valid for cloud Dataverse
  - `isolationmode`: 2 (Sandbox) - only valid for cloud Dataverse
- [ ] Dataverse auto-discovers plugin types and creates plugintype records
- [ ] Refresh tree after successful registration

**Design Decisions for Assembly Registration:**
1. **No plugin type selection (v1):** PRT uses .NET reflection to analyze DLL - not possible in TypeScript. Dataverse auto-discovers all IPlugin/CodeActivity classes after upload.
2. **No isolation mode selector:** Only Sandbox (2) is valid for cloud Dataverse. (Microsoft docs: "Dataverse is not available for on-premises deployments, so you will always accept the default options of SandBox and Database")
3. **No storage location selector:** Only Database (0) is valid for cloud Dataverse. Disk/GAC are on-prem only.
4. **No prefix on name:** Unlike packages, assemblies use just the assembly name (e.g., "PPDSDemo.Plugins")
5. **Solution optional:** Can register without adding to solution, matching PRT behavior.

#### Register New Step
- [ ] Right-click plugin type → "Register New Step..."
- [ ] Modal/form with fields:
  - SDK Message (dropdown/autocomplete)
  - Primary Entity (dropdown/autocomplete, optional)
  - Secondary Entity (optional)
  - Execution Stage (dropdown: PreValidation, PreOperation, PostOperation)
  - Execution Mode (dropdown: Synchronous, Asynchronous)
  - Filtering Attributes (multi-select, optional)
  - Step Name (auto-generated but editable)
  - Rank/Order (number)
  - Configuration (text, optional)
- [ ] API: POST sdkmessageprocessingsteps
- [ ] Refresh tree after successful registration

#### Register New Image
- [ ] Right-click step → "Register New Image..."
- [ ] Modal/form with fields:
  - Image Type (dropdown: PreImage, PostImage, Both)
  - Name/Alias
  - Entity Alias
  - Attributes (multi-select or comma-separated)
- [ ] API: POST sdkmessageprocessingstepimages
- [ ] Refresh tree after successful registration

#### Edit Step
- [ ] Right-click step → "Edit Step..."
- [ ] Same form as Register, pre-populated with current values
- [ ] API: PATCH sdkmessageprocessingsteps

#### Delete Operations
- [ ] Right-click assembly → "Delete Assembly" (with confirmation)
- [ ] Right-click step → "Delete Step" (with confirmation)
- [ ] Right-click image → "Delete Image" (with confirmation)
- [ ] Appropriate refresh after deletion

### Implementation Order (Updated)
1. ✅ Register Package - COMPLETE
2. **Register Assembly** - NEXT (simpler than package - no prefix, fixed isolation/source)
3. Register Step (complex form, needs SDK message/entity lookups)
4. Register Image (moderate complexity)
5. Edit Step (reuses Register Step form)
6. Delete operations (confirmation dialogs)

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

---

## Pre-PR Polish Checklist

Before merging Slices 1+2:
- [ ] Detail panel - Show metadata when node selected
- [ ] Solution filtering - Filter tree by solution
- [ ] Unit tests - Domain and application layer tests
- [x] Update operation UX - Progress indicator shows assembly/environment names ✅
- [ ] Webview filter regression tests (see Session 8)
