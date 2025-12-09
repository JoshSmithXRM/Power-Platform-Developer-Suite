# Deployment Settings - Task Tracking

**Branch:** `feature/deployment-settings-promotion`
**Created:** 2025-12-08
**Status:** Workflow Pivot - Restructuring

---

## Overview

**Goal:** Enable Power Platform developers to create and promote deployment settings between environments with:
- Solution-scoped workflow (select solution first)
- Source environment selection (where solution works)
- Target environment selection (where deploying to)
- Auto-matching of connection references by ConnectorId
- Environment variable management (add new, set values for target)

**Design Document:** `docs/design/DEPLOYMENT_SETTINGS_PROMOTION_DESIGN.md`

---

## Workflow (Corrected Understanding)

```
1. Select Solution (scopes all data)
2. Select Source Environment (where solution is configured and working)
3. Select Target Environment (where solution will be deployed)
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

### Slice A: Panel Restructure - TODO
- [ ] Add Solution selector (reuse SolutionFilterSection pattern)
- [ ] Change single env selector to Source Environment selector
- [ ] Add Target Environment selector
- [ ] Remove "Load Source File" button
- [ ] Update status section for new workflow
- [ ] Auto-trigger data load when source + target both selected

### Slice B: Source Data Loading - TODO
- [ ] Query connection references from source environment + solution
- [ ] Query environment variables from source environment + solution
- [ ] Reuse existing ListConnectionReferencesUseCase (or extract shared logic)
- [ ] Reuse existing environment variables query logic

### Slice C: Target Matching - TODO
- [ ] Query connections from target environment (existing code)
- [ ] Run ConnectorMappingService.matchConnectors()
- [ ] Display results: auto-matched vs unmatched
- [ ] Display environment variables status

### Slice D: Save with Location Persistence - TODO
- [ ] Save button generates deployment settings JSON
- [ ] Prompt for file location
- [ ] Persist last location per target environment (workspace storage)
- [ ] Pre-fill with persisted location on subsequent saves

### Slice E: Deprecate Old Sync (Future)
- [ ] Add deprecation notice to Connection References "Sync Deployment Settings"
- [ ] Add deprecation notice to Environment Variables sync
- [ ] Redirect users to Deployment Settings panel

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
    │   └── DeploymentSettingsPromotionPanel.ts (needs pivot)
    ├── sections/
    │   └── DeploymentSettingsStatusSection.ts (needs update)
    └── initialization/
        └── initializeDeploymentSettingsPromotion.ts ✓
```

---

## Verification Status

- [x] `npm run compile` - 0 errors
- [x] `npm test deploymentSettingsPromotion` - 46 tests passing
- [x] Command registered in package.json
- [x] Tools provider entry added
- [ ] F5 manual testing (blocked on workflow pivot)

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
