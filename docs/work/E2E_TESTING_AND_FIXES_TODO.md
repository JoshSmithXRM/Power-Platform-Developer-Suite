# E2E Testing and Fixes - Task Tracking

**Branch:** `chore/e2e-testing-and-fixes`
**Created:** 2025-11-30
**Status:** Implementation

---

## Overview

**Goal:** Improve E2E testing infrastructure, fix configuration issues, and address general bug fixes for better developer experience and stability.

---

## Tasks

### Bug Fixes

- [x] Environment Setup panel not scrollable on 1920x1080 displays
- [x] Save button stuck on "Saving..." after error (design smell fix)

### Open Issues (Under Discussion)

1. ~~**Default Environment & Ordering** - Left-click in tool menu opens default environment, but no way to set default or reorder environments~~ ✅ DONE
2. ~~**Environment Switch Persistence Behavior** - Switching environments overwrites target environment's persisted settings with source environment's settings~~ ✅ FIXED (see Session 2 notes below)

### Future Enhancements (Parking Lot)

- [ ] **Environment Reorder Refresh in Panels** - When using Move Up/Down, open panel environment dropdowns don't immediately reflect the new order (they refresh when reopened). Could add `EnvironmentOrderChanged` domain event for immediate sync across all panels. Low priority UX improvement.

### Implemented This Session

- [x] **Interactive Authentication Token Caching** - Implemented persistent token caching via VS Code SecretStorage
- [x] **Low Resolution UI** - Added flex-wrap and responsive CSS for buttons/toolbars at narrow widths (<500px)
- [x] **Default Environment & Ordering** - Added "Set as Default" command and context menu; default environment shown with ★ icon
- [x] **Token Cache in Persistence Inspector** - MSAL token cache entries now visible in Persistence Inspector secrets section
- [x] **Move Up/Move Down Environment Ordering** - Context menu commands for reordering environments in the list
- [x] **Environment Switch Persistence Bug Fix** - Fixed all panels to load target environment's persisted state on environment switch (Option A: Fresh Start)

### E2E Testing Improvements

- [x] **Environment Switch Persistence E2E Test** - Created `e2e/tests/integration/environment-switch-persistence.spec.ts` to verify state isolation per environment

### Configuration Settings

- [ ] (Add configuration tasks as identified)

---

## Completed Work

### Session 1 (2025-11-30)

**Environment Setup Panel Scroll Fix:**
- **Problem:** Panel content not viewable on 1920x1080 displays, no scrollbar
- **Root Cause:** `.form-container` in `environment-setup.css` lacks overflow/height settings, and `.main-section` has `overflow: hidden`
- **Fix:** Add `overflow-y: auto` and `height: 100%` to `.form-container`

---

## Testing Checklist

- [x] Manual testing (F5): Environment Setup panel scrolls on smaller displays
- [x] Manual testing (F5): Low resolution buttons wrap correctly
- [x] Manual testing (F5): Token caching persists across VS Code restarts
- [x] `npm run compile` passes
- [ ] E2E smoke tests pass (if applicable)

---

## Session Notes

### Session 1 (2025-11-30)
- Created branch `chore/e2e-testing-and-fixes`
- Identified scrolling issue in Environment Setup panel
- Fixed by adding scroll support to `.form-container`

**Button State Management Design Smell Fix:**
- **Problem:** Save button stuck on "Saving..." after errors; two competing button state systems
- **Root Cause:** EnvironmentSetupBehavior.js manually managed button state (`button.textContent`, `button.disabled`) while PanelCoordinator also managed state via `setButtonState` messages
- **Analysis:** Only EnvironmentSetup panel had this issue - all other panels correctly used coordinator pattern
- **Fix:**
  - Removed manual button state management from `sendFormCommand()`, `handleSaveComplete()`, `handleTestResult()`, `handleDiscoverResult()`
  - Changed `testConnection` and `discoverEnvironmentId` handlers from `disableOnExecute: false` to `disableOnExecute: true`
  - Kept business logic: success/error CSS styling, validation error display, "Saved!" feedback via `setButtonLabel` message
- **Result:** All button state now managed by PanelCoordinator with automatic spinner and guaranteed state restoration on errors

**Persistent Token Caching:**
- **Problem:** Interactive authentication required frequent re-login; tokens lost on VS Code restart
- **Root Cause:** MSAL used in-memory cache only (no persistence plugin configured)
- **Fix:**
  - Created `VsCodeSecretStorageCachePlugin` implementing MSAL's `ICachePlugin` interface
  - Plugin stores serialized token cache in VS Code's SecretStorage (encrypted via OS credential manager)
  - Each environment gets isolated cache key (`power-platform-dev-suite-msal-cache-{environmentId}`)
  - Updated `MsalAuthenticationService` to accept optional `SecretStorage` and configure MSAL with cache plugin
  - Updated `CoreServicesContainer` to pass `context.secrets` to auth service
  - Cache clearing also clears persisted cache from SecretStorage
- **Files changed:**
  - New: `src/features/environmentSetup/infrastructure/services/VsCodeSecretStorageCachePlugin.ts`
  - Modified: `src/features/environmentSetup/infrastructure/services/MsalAuthenticationService.ts`
  - Modified: `src/infrastructure/dependencyInjection/CoreServicesContainer.ts`
- **Result:** Tokens persist across VS Code restarts; users only need to authenticate once until token expires

**Low Resolution UI Fix:**
- **Problem:** Buttons get "smooshed" and UI looks terrible at low resolutions
- **Root Cause:** No flex-wrap on button containers; fixed padding doesn't scale
- **Fix:**
  - Added `flex-wrap: wrap` to `.action-buttons` and `.toolbar-section`
  - Added responsive media query for widths ≤500px with reduced padding and font size
- **Files changed:**
  - `resources/webview/css/sections/action-buttons.css`
  - `resources/webview/css/base/layout.css`
- **Result:** Buttons wrap to next line instead of overflowing; compact mode at narrow widths

**Default Environment & Ordering:**
- **Problem:** Left-click on tools opens first environment by insertion order; no way to set a default
- **Root Cause:** No `isDefault` or `sortOrder` fields in environment storage
- **Fix:**
  - Added `sortOrder` and `isDefault` fields to `EnvironmentConnectionDto`
  - Added `sortOrder` and `isDefault` to `Environment` entity with getter/setter methods
  - Updated `EnvironmentDomainMapper` to map new fields
  - Added `getDefault()` method to `IEnvironmentRepository` interface
  - Updated `EnvironmentRepository.getAll()` to sort by default first, then sortOrder
  - Created `SetDefaultEnvironmentUseCase` for setting default
  - Added "Set as Default" command (`power-platform-dev-suite.setDefaultEnvironment`)
  - Added "Set as Default" context menu item for environments
  - Updated `EnvironmentItem` tree view to show ★ star-full icon for default environment
  - Updated `EnvironmentListViewModel` with `isDefault` field
- **Files changed:**
  - `src/shared/application/dtos/EnvironmentConnectionDto.ts`
  - `src/features/environmentSetup/domain/entities/Environment.ts`
  - `src/features/environmentSetup/domain/interfaces/IEnvironmentRepository.ts`
  - `src/features/environmentSetup/infrastructure/repositories/EnvironmentRepository.ts`
  - `src/features/environmentSetup/infrastructure/mappers/EnvironmentDomainMapper.ts`
  - `src/features/environmentSetup/application/useCases/SetDefaultEnvironmentUseCase.ts` (new)
  - `src/features/environmentSetup/application/viewModels/EnvironmentListViewModel.ts`
  - `src/features/environmentSetup/application/mappers/EnvironmentListViewModelMapper.ts`
  - `src/infrastructure/dependencyInjection/EnvironmentFeature.ts`
  - `src/infrastructure/dependencyInjection/TreeViewProviders.ts`
  - `src/extension.ts`
  - `package.json`
- **Result:** Users can right-click → "Set as Default" on any environment; default shows with ★ icon and is used when clicking tools

**Token Cache in Persistence Inspector:**
- **Problem:** MSAL token cache entries stored via VsCodeSecretStorageCachePlugin not visible in Persistence Inspector
- **Root Cause:** `VsCodeStorageReader.readAllSecretKeys()` only derived keys for clientId and username patterns, not MSAL cache keys
- **Fix:**
  - Added `MSAL_CACHE_PREFIX` constant to `VsCodeStorageReader`
  - Updated `readAllSecretKeys()` to include `power-platform-dev-suite-msal-cache-{environmentId}` for each environment
- **Files changed:**
  - `src/features/persistenceInspector/infrastructure/repositories/VsCodeStorageReader.ts`
- **Result:** MSAL token cache entries now appear in Persistence Inspector's secrets section and can be viewed/cleared

**Move Up/Move Down Environment Ordering:**
- **Problem:** Users could set a default environment, but couldn't manually reorder environments in the list
- **Root Cause:** No UI to modify `sortOrder` field; all environments had `sortOrder: 0`
- **Fix:**
  - Added "Move Up" and "Move Down" commands to `package.json`
  - Created `MoveEnvironmentUseCase` for reordering logic (swaps sortOrder values)
  - Added context menu items in new `4_order` group (Set as Default, Move Up, Move Down)
  - Registered commands in `extension.ts`
- **Files changed:**
  - `package.json` - New commands and context menu entries
  - `src/features/environmentSetup/application/useCases/MoveEnvironmentUseCase.ts` (new)
  - `src/features/environmentSetup/application/useCases/MoveEnvironmentUseCase.test.ts` (new)
  - `src/infrastructure/dependencyInjection/EnvironmentFeature.ts`
  - `src/extension.ts`
- **Result:** Right-click environment → Move Up/Move Down to reorder; Set as Default moved to its own section

### Session 2 (2025-11-30)

**Environment Switch Persistence Bug Fix:**
- **Problem:** When switching between environments, settings from the source environment would override/overwrite the persisted settings for the target environment
- **Root Cause:** `handleEnvironmentChange()` in all panel files did NOT load the target environment's persisted state. In-memory state from the source environment carried over, then got saved to the target environment's storage on any subsequent action.
- **Analysis:** Traced the flow:
  1. User on Env A with SQL query "SELECT * FROM account"
  2. User switches to Env B
  3. `handleEnvironmentChange()` updates `currentEnvironmentId` but leaves in-memory state (SQL query, filters) unchanged
  4. User makes any change → state saved to Env B's storage slot
  5. Env B's previously saved state is now overwritten with Env A's state
- **Solution:** Option A (Fresh Start) - When switching environments, load the target environment's persisted state
- **Implementation:**
  - Added `loadPersistedStateForEnvironment(environmentId)` method to each affected panel
  - Called at the end of `handleEnvironmentChange()` after updating environment context
  - Reset in-memory state to defaults, then load persisted state for new environment
  - Update webview with loaded state
- **Panels Fixed:**
  - `DataExplorerPanelComposed` - Loads SQL/FetchXML query and query mode for target environment
  - `PluginTraceViewerPanelComposed` - Loads filter criteria, auto-refresh interval, detail panel width for target environment
  - `MetadataBrowserPanel` - Loads selected tab, selected entity/choice, detail panel width for target environment
  - `EnvironmentVariablesPanelComposed` - Loads selected solution filter for target environment
  - `WebResourcesPanelComposed` - Loads selected solution filter for target environment
- **Panels Already Correct:**
  - `ConnectionReferencesPanelComposed` - Already loaded persisted state for new environment (lines 449-464)
  - `SolutionExplorerPanelComposed` - No persistent state to carry over (stateless refresh)
  - `ImportJobViewerPanelComposed` - No persistent state (stateless refresh)
- **E2E Test Created:**
  - `e2e/tests/integration/environment-switch-persistence.spec.ts`
  - Test creates two environments (Test Env A, Test Env B)
  - Sets distinct query in each environment (with unique marker comments)
  - Switches between environments and verifies state is correctly restored
  - Test confirmed FAILING before fix, PASSING after fix
- **Files changed:**
  - `src/features/dataExplorer/presentation/panels/DataExplorerPanelComposed.ts` - Added `loadPersistedStateForEnvironment()`
  - `src/features/pluginTraceViewer/presentation/panels/PluginTraceViewerPanelComposed.ts` - Added `loadPersistedStateForEnvironment()`
  - `src/features/metadataBrowser/presentation/panels/MetadataBrowserPanel.ts` - Added `loadPersistedStateForEnvironment()`
  - `src/features/environmentVariables/presentation/panels/EnvironmentVariablesPanelComposed.ts` - Added `loadPersistedStateForEnvironment()`
  - `src/features/webResources/presentation/panels/WebResourcesPanelComposed.ts` - Added `loadPersistedStateForEnvironment()`
  - `e2e/tests/integration/environment-switch-persistence.spec.ts` (new)
- **Result:** Each environment now correctly maintains its own independent state. Switching environments loads the target environment's saved state rather than carrying over source environment state.
