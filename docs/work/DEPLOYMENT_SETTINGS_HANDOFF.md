# Deployment Settings - Session Handoff

**Date:** 2025-12-09
**Branch:** `feature/deployment-settings-promotion`
**Status:** Mid-pivot - restructuring panel for correct workflow

---

## CRITICAL: Correct Workflow

```
1. Select SOURCE Environment (where solution is configured and working)
2. Select Solution (from source environment - can't pick solution without env first!)
3. Select TARGET Environment (where solution will be deployed)
4. System automatically:
   - Loads connection references from source solution
   - Loads connections from target environment
   - Runs auto-matching algorithm
   - Loads environment variables from source solution
5. User reviews matching results
6. Save → prompts for file location (persisted per target env)
```

**Key insight:** Solution dropdown must load AFTER source environment is selected, because solutions exist within an environment.

---

## What's Done (Foundation)

### Domain Layer - COMPLETE & VALID
- `Connection.ts` - Entity for Power Platform connections
- `ConnectorMatchResult.ts` - Value object for matching results
- `ConnectorMappingService.ts` - Auto-matching algorithm by ConnectorId
- 46 tests passing - `npm test -- --testPathPattern=deploymentSettingsPromotion`

### Infrastructure Layer - COMPLETE
- `PowerAppsAdminApiService.ts` - HTTP client for Power Apps Admin API
- `PowerPlatformApiConnectionRepository.ts` - Fetches connections from target env

### Presentation Layer - NEEDS PIVOT
- `DeploymentSettingsPromotionPanel.ts` - Has wrong workflow (file loading)
- `DeploymentSettingsStatusSection.ts` - Status display (needs update)
- Added to Tools provider as "Deployment Settings" (rocket icon)
- Command: `power-platform-dev-suite.deploymentSettingsPromotion`

---

## What Needs to Change (The Pivot)

### Current (WRONG)
```
Single env selector (target) → Load file button → Match file to target → Save
```

### Correct (TODO)
```
Source env selector → Solution selector → Target env selector → Auto-load APIs → Match → Save
```

### Panel Changes Needed

1. **Remove:**
   - "Load Source File" button
   - File picker logic
   - `sourceFilePath` and `sourceDeploymentSettings` state

2. **Add:**
   - Source Environment selector (first!)
   - Solution selector (loads after source env selected)
   - Target Environment selector (independent of source)
   - Auto-trigger when source+solution+target all selected

3. **Update:**
   - Status section messaging for new workflow
   - State management for three selectors
   - Data loading to query APIs instead of file

---

## Key Files

| File | Purpose | Status |
|------|---------|--------|
| `src/features/deploymentSettingsPromotion/presentation/panels/DeploymentSettingsPromotionPanel.ts` | Main panel | Needs restructure |
| `src/features/deploymentSettingsPromotion/presentation/sections/DeploymentSettingsStatusSection.ts` | Status display | Needs update |
| `src/features/deploymentSettingsPromotion/domain/services/ConnectorMappingService.ts` | Matching logic | KEEP - works |
| `src/shared/infrastructure/ui/sections/SolutionFilterSection.ts` | Solution dropdown | Reuse |
| `src/shared/infrastructure/ui/sections/EnvironmentSelectorSection.ts` | Env dropdown | Reuse (need 2) |
| `docs/work/DEPLOYMENT_SETTINGS_PROMOTION_TODO.md` | Progress tracking | Updated |

---

## Key Concepts to Remember

### Connection References
- Auto-match by ConnectorId (same connector in source and target)
- Unmatched = connector exists in source but no matching connection in target
- Output: ConnectionId from TARGET environment
- Manual mapping UI deferred to future

### Environment Variables
- NO auto-matching (different concept than connection refs)
- Default value goes to all environments unless overridden
- When promoting: add new env vars, user sets values for target
- Output: SchemaName + Value pairs

### Save Behavior
- Prompt for file location
- Persist last location PER TARGET ENVIRONMENT (workspace storage)
- Pre-fill with persisted location on subsequent saves

---

## Existing Code to Leverage

```typescript
// Solution loading - see ConnectionReferencesPanelComposed.ts
const solutions = await this.solutionRepository.findAllForDropdown(environmentId);

// Connection refs - see ListConnectionReferencesUseCase
const result = await this.listConnectionReferencesUseCase.execute(envId, solutionId);

// Target connections - already have this
const connectionRepo = this.createConnectionRepository(targetEnvId);
const connections = await connectionRepo.findAll();

// Matching - already have this
const matchResult = this.connectorMappingService.matchConnectors(sourceConnectorIds, targetConnections);
```

---

## UI Layout Target

```
┌──────────────────────────────────────────────────────────────────────┐
│ Source: [▼ Select env...]  Solution: [▼ disabled]  Target: [▼ ...]  │
│                                                          [Save]      │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Select a source environment to begin                                │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

After source selected → Solution dropdown enables and loads solutions from source env.
After all three selected → Auto-load and show matching results.

---

## Commands to Verify

```bash
npm run compile          # Should pass (0 errors)
npm test -- --testPathPattern=deploymentSettingsPromotion  # 46 tests
```

---

## Next Steps

1. Restructure `DeploymentSettingsPromotionPanel.ts`:
   - Add source env selector, solution selector, target env selector
   - Wire solution loading to trigger after source env selected
   - Wire auto-load to trigger after all three selected
   - Remove file loading logic

2. Update `DeploymentSettingsStatusSection.ts`:
   - New initial message: "Select a source environment to begin"
   - After source: "Select a solution and target environment"
   - After all selected: Show matching results

3. Test with F5

4. Implement save with location persistence

---

## Future Work (Not This Session)

- Manual mapping UI for unmatched connectors
- Environment variable value editing UI
- Deprecate "Sync Deployment Settings" from Connection References panel
- Deprecate sync from Environment Variables panel
