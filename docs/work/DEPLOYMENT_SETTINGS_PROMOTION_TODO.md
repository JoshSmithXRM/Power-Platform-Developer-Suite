# Deployment Settings - Task Tracking

**Branch:** `feature/deployment-settings-promotion`
**Created:** 2025-12-08
**Status:** Building Full Editor UI

---

## Overview

**Goal:** Full ALM management for deployment settings - Create, Edit, Update, Save.

**The Vision: Deployment Settings EDITOR**
- Not just a one-shot generator - a living editor for `.deploymentsettings.json`
- Load existing files, edit values, save updates
- Side-by-side view: Source (what solution needs) | Target (user's configuration)
- Connection References: Dropdown to pick from available target connections
- Environment Variables: Free-form text input (no pool to pick from)
- Smart auto-matching with full user control to override

**Design Document:** `docs/design/DEPLOYMENT_SETTINGS_PROMOTION_DESIGN.md`

---

## Workflow (Corrected Understanding)

```
1. Select SOURCE Environment (where solution is configured and working)
2. Select Solution (from source environment - can't pick without env first!)
3. Select TARGET Environment (where solution will be deployed)
4. System automatically:
   - Loads connection references from source solution
   - Loads connections from target environment
   - Runs auto-matching algorithm
   - Loads environment variables from source solution
5. User reviews:
   - Connection refs: which auto-matched, which need mapping
   - Env vars: which are new to target, which need values set
6. Save → prompts for file location (persisted per target env for convenience)
```

### Key Concepts

**Connection References:**
- Auto-match by ConnectorId (same connector in source and target)
- Unmatched connectors need manual mapping (deferred to future slice)
- Output: ConnectionId from TARGET environment

**Environment Variables:**
- NO auto-matching (different concept)
- Default value goes to all environments unless overridden
- New env vars (not in target file) → add with default value
- User may need to set specific values for target environment
- Output: SchemaName + Value pairs

---

## Completed Work (Foundation)

### Domain Layer - COMPLETE
- [x] `Connection.ts` - Entity with id, displayName, connectorId, status
- [x] `ConnectorMatchResult.ts` - Value object for matching results
- [x] `ConnectorMapping.ts` - Value object for user mappings
- [x] `ConnectorMappingService.ts` - Matching algorithm
- [x] `IPowerPlatformConnectionRepository.ts` - Repository interface
- [x] 46 domain tests passing

### Infrastructure Layer - COMPLETE
- [x] `PowerAppsAdminApiService.ts` - HTTP client for Power Apps Admin API
- [x] `PowerPlatformApiConnectionRepository.ts` - Fetches connections from target env
- [x] Integration with SharedFactories for authentication

### Presentation Layer - PARTIAL (needs pivot)
- [x] `DeploymentSettingsPromotionPanel.ts` - Panel skeleton
- [x] `DeploymentSettingsStatusSection.ts` - Status display in main area
- [x] `deployment-settings.css` - Feature styling
- [x] Tools provider entry ("Deployment Settings" with rocket icon)
- [x] Command registered: `power-platform-dev-suite.deploymentSettingsPromotion`

---

## Pivot Required

### Current Implementation (WRONG)
- Single environment selector (target only)
- "Load Source File" button (loads existing JSON)
- Matches file contents to target connections

### Correct Implementation (TODO)
- Solution selector (scopes everything)
- Source environment selector
- Target environment selector
- Auto-load data when both environments selected
- Query APIs directly (not load from file)
- Show connection refs + env vars separately

---

## Revised Slices

### Slice A: Panel Restructure - COMPLETE
- [x] Add Source Environment selector (FIRST - enables solution loading)
- [x] Add Solution selector (loads after source env selected)
- [x] Add Target Environment selector (independent of source)
- [x] Remove "Load Source File" button and file loading logic
- [x] Update status section for new workflow
- [x] Auto-trigger data load when source + solution + target all selected

### Slice B: Source Data Loading - COMPLETE
- [x] Query connection references from source environment + solution
- [ ] Query environment variables from source environment + solution (deferred)
- [x] Reuse existing ListConnectionReferencesUseCase
- [ ] Reuse existing environment variables query logic (deferred)

### Slice C: Target Matching - COMPLETE
- [x] Query connections from target environment (existing code)
- [x] Run ConnectorMappingService.matchConnectors()
- [x] Display results: auto-matched vs unmatched
- [ ] Display environment variables status (deferred)

### Slice D: Save with Location Persistence - PARTIAL
- [x] Save button generates deployment settings JSON
- [x] Prompt for file location
- [ ] Persist last location per target environment (workspace storage)
- [ ] Pre-fill with persisted location on subsequent saves

### Slice E: Deprecate Old Sync (Future)
- [ ] Add deprecation notice to Connection References "Sync Deployment Settings"
- [ ] Add deprecation notice to Environment Variables sync
- [ ] Redirect users to Deployment Settings panel

---

## Editor UI Implementation (Current Focus)

### Slice F: Connection References Table UI - COMPLETE
- [x] Create `ConnectionReferenceMappingViewModel` - source info + target selection
- [x] Create `ConnectionReferenceMappingSection` - renders the CR table
- [x] Each row: source CR info (read-only) | dropdown of available connections
- [x] Handle unmatched: show text input for manual ConnectionId entry
- [x] Wire dropdown changes back to panel state
- [x] Update Save to use user's selections (not just auto-matched)
- [x] Show status: ✓ configured, ⚠ needs attention

### Slice G: Environment Variables Table UI - TODO
- [ ] Query EVs from source solution (reuse ListEnvironmentVariablesUseCase)
- [ ] Create `EnvironmentVariableMappingViewModel`
- [ ] Create `EnvironmentVariableMappingSection` - renders the EV table
- [ ] Each row: variable info (read-only) | text input for target value
- [ ] Show default value and type for context
- [ ] Include in Save output

### Slice H: Load Existing File - TODO
- [ ] Look for existing `.deploymentsettings.json` in workspace
- [ ] Parse and populate UI with existing values
- [ ] Merge with current solution state (handle new/removed items)
- [ ] Show file status indicator (loaded from X, unsaved changes)

### Slice I: Polish & UX - TODO
- [ ] Save As functionality (new file location)
- [ ] Preview JSON before saving
- [ ] Dirty state tracking (unsaved changes indicator)
- [ ] Collapsible sections
- [ ] Better error handling for edge cases

---

## File Structure

```
src/features/deploymentSettingsPromotion/
├── domain/
│   ├── entities/
│   │   ├── Connection.ts ✓
│   │   └── Connection.test.ts ✓
│   ├── valueObjects/
│   │   ├── ConnectorMatchResult.ts ✓
│   │   ├── ConnectorMatchResult.test.ts ✓
│   │   ├── ConnectorMapping.ts ✓
│   │   └── ConnectorMapping.test.ts ✓
│   ├── services/
│   │   ├── ConnectorMappingService.ts ✓
│   │   └── ConnectorMappingService.test.ts ✓
│   └── interfaces/
│       └── IPowerPlatformConnectionRepository.ts ✓
├── infrastructure/
│   └── repositories/
│       └── PowerPlatformApiConnectionRepository.ts ✓
└── presentation/
    ├── panels/
    │   └── DeploymentSettingsPromotionPanel.ts ✓ (mapping table integrated)
    ├── sections/
    │   ├── DeploymentSettingsStatusSection.ts ✓
    │   ├── DeploymentSettingsToolbarSection.ts ✓
    │   └── ConnectionReferenceMappingSection.ts ✓ (new - table UI)
    ├── viewModels/
    │   └── ConnectionReferenceMappingViewModel.ts ✓ (new)
    └── initialization/
        └── initializeDeploymentSettingsPromotion.ts ✓

resources/webview/
├── js/behaviors/
│   └── DeploymentSettingsBehavior.js ✓ (new)
└── css/features/
    └── deployment-settings.css ✓ (updated)
```

---

## Verification Status

- [x] `npm run compile` - 0 errors (8046 tests passing)
- [x] `npm test deploymentSettingsPromotion` - 46 tests passing
- [x] Command registered in package.json
- [x] Tools provider entry added
- [ ] F5 manual testing (ready to test)

---

## Session Notes

### Session 1 (2025-12-09)
- Completed domain foundation (46 tests)
- Completed infrastructure (Power Apps Admin API integration)
- Created initial panel skeleton

### Session 2 (2025-12-09)
- Wired MVP flow (load file → target → match → generate)
- Fixed button wiring bugs
- Added dependency injection

### Session 3 (2025-12-09)
- Fixed blank panel bug (CSS typo, missing status section)
- Added DeploymentSettingsStatusSection for main content
- Added to Tools provider
- Fixed file picker to start in workspace
- Renamed to "Deployment Settings"

### Session 4 (2025-12-09) - WORKFLOW PIVOT
- **Major realization:** Original workflow was wrong
- Original: Load existing file → Select target → Match → Save
- Correct: Select solution → Select source env → Select target env → Auto-load & match → Save
- Key insights from discussion:
  - Solution-scoped (like Connection References & Environment Variables panels)
  - TWO environment selectors (source AND target)
  - Query APIs directly, don't load from file
  - Connection refs: auto-match by ConnectorId
  - Env vars: no matching, just add/set values
  - Save location persisted per target environment
- Existing sync functionality in CR/EV panels to be deprecated (redirect to this panel)
- Domain layer still valid, presentation layer needs restructure
- Committed checkpoint before pivot

### Session 5 (2025-12-09) - MVP COMPLETE
- Implemented correct workflow with three selectors
- Created `DeploymentSettingsToolbarSection` for custom toolbar layout
- Created `DeploymentSettingsBehavior.js` to wire up selector events
- Rewrote `DeploymentSettingsPromotionPanel.ts` with:
  - Source env selector (enables solution loading)
  - Solution selector (disabled until source selected)
  - Target env selector (independent)
  - Auto-load when all three selected
  - Connector matching with results display
  - Save button generates JSON
- Updated `DeploymentSettingsStatusSection.ts` with stage-based messages
- Updated `initializeDeploymentSettingsPromotion.ts` with new dependencies
- Updated CSS with toolbar styles and loading spinner
- All tests pass (8046), ready for F5 testing

### Session 6 (2025-12-09) - CONNECTOR ID NORMALIZATION & VISION REFINEMENT
- **Bug fix:** ConnectorIds from different APIs had different formats
  - Dataverse API: `/providers/Microsoft.PowerApps/apis/shared_dataverse`
  - Power Apps Admin API: `/providers/.../environments/{guid}/apis/shared_dataverse`
- Added `normalizeConnectorId()` to extract connector name after `/apis/`
- Matching now works: 10 auto-matched, 1 needs mapping (was 0/11)
- Added debug logging to diagnose format differences
- 20 tests for ConnectorMappingService (5 new for normalization)

- **Vision refined:** This is a full EDITOR, not just a generator
  - Create + Edit + Update deployment settings files
  - Side-by-side UI: Source (read-only) | Target (editable)
  - Connection refs: dropdown to pick from available connections
  - Env vars: free text input
  - Load existing files, show unsaved changes
  - Auto-match just pre-populates, user has full control

- Starting Slice F: Connection References Table UI

### Session 7 (2025-12-09) - SLICE F COMPLETE
- **Created Connection References Mapping Table UI**
  - `ConnectionReferenceMappingViewModel.ts` - ViewModel with source info + target selection
  - `ConnectionReferenceMappingSection.ts` - Two-column table rendering
  - Dropdown for matched connectors (with connection status indicators)
  - Manual text input for unmatched connectors
  - Status icons: ✓ configured, ◐ multiple options, ⚠ needs attention
  - Summary header showing "X of Y configured, Z needs attention"
- **Updated Panel** (`DeploymentSettingsPromotionPanel.ts`)
  - Added `buildMappingViewModels()` to transform match results
  - Added `connectionSelections` Map to track user selections
  - Added handlers for dropdown and manual input changes
  - Auto-selects first active connection when available
  - Save button uses user selections (not just auto-matched)
- **Updated Behavior JS** (`DeploymentSettingsBehavior.js`)
  - Event delegation for connection dropdowns
  - Event delegation for manual connection ID inputs
- **Added CSS** (`deployment-settings.css`)
  - Full mapping table styling
  - Status row highlighting
  - Connection status colors in dropdowns
- All tests pass (8046), ready for F5 testing

---

## Dependencies

**Existing code to leverage:**
- `ListConnectionReferencesUseCase` - Query connection refs from environment
- `SolutionFilterSection` - Solution dropdown component
- `EnvironmentSelectorSection` - Environment dropdown component
- `IPanelStateRepository` - For persisting save location per target

**APIs needed:**
- Connection references by solution+environment (existing)
- Environment variables by solution+environment (existing in EV panel)
- Connections by environment (existing in PowerPlatformApiConnectionRepository)
