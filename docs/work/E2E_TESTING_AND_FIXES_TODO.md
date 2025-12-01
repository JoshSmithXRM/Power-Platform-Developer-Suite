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
- [x] E2E environment switch persistence tests pass (2/2)

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

---

## Session 3 - Branch Cleanup & Planning (2025-11-30)

### Topics for Analysis

| # | Topic | Status | Decision |
|---|-------|--------|----------|
| 1 | **Road Map & Future Versions** - Review technical debt, open designs, plan versions and path to 1.0 | ✅ Complete | Philosophy B: Stable core + Data Explorer enhancements = 1.0 |
| 2 | **Workflow Issues** - Missing release notes for last version, README not updated despite following slash commands | ✅ Complete | Fixed: Dynamic badge, created v0.2.4 notes, updated workflow |
| 3 | **Technical Debt Review** - Revisit each issue, validate decisions, determine actions | ⏳ In Progress | Deep dive pending |
| 4 | **ESLint Warnings** - Investigate 38 warnings, resolve or document rationale | ✅ Complete | 38→0 warnings via pattern-specific overrides |
| 5 | **E2E Testing Strategy** - Determine depth of Playwright implementation | ✅ Complete | Critical path focus + E2E-driven bug fixes |
| 6 | **Code Cleanup** - Comments/logging across codebase (pre-requisite to PR) | ⏳ Blocked | After 3 complete |
| 7 | **Code Review** - All changes from this branch + PRs 29+ (pre-requisite to PR) | ⏳ Blocked | After 6 complete |

### Analysis & Recommendations

---

## Topic 1: Road Map & Future Versions

### Current State
- **Version**: 0.2.4 (published)
- **Technical Debt**: 7 items total (5 accepted tradeoffs, 1 will-not-implement, 1 low-priority)
- **Future Enhancements**: 6 category files with substantial planned features

### Future Feature Summary (by category)

| Category | High Priority Features | Medium/Low Features |
|----------|----------------------|---------------------|
| DATA_MANAGEMENT | Data Explorer enhancements (in dev), SQL4CDS, Record Cloning | Bulk Operations |
| DEVELOPMENT_TOOLS | Web Resources Edit/Publish, Plugin Registration Tool | Web Resources Sync |
| ALM_DEVOPS | Deployment Promotion, Solution Diff | Pre-release channel, Rollback docs |
| ADMINISTRATION | Connection Manager, Async Job Monitor, Workflow Manager | Security Role Viewer |
| OBSERVABILITY | - | Flow History, Dependency Graph, Telemetry |
| INFRASTRUCTURE | Version Roadmap (this!) | E2E testing deep dive, Feedback mechanism |

### Path to 1.0 - Recommendations

**Option A: Feature-Driven 1.0**
- 1.0 when Plugin Registration Tool + Web Resources Edit/Publish complete
- Rationale: These are "must have" developer tools that make the suite comprehensive
- Estimated timeline: 3-4 minor versions (0.3, 0.4, 0.5 → 1.0)

**Option B: Stability-Driven 1.0**
- 1.0 when current features are fully polished + E2E coverage solid
- Skip new features, focus on quality
- Could be next minor version (0.3 = stability sprint → 1.0)

**Option C: Milestone-Based Versioning**
- 0.3.0 = Data Explorer complete (SQL4CDS-like)
- 0.4.0 = Web Resources complete (edit/publish/sync)
- 0.5.0 = Plugin Registration Tool MVP
- 1.0.0 = All core tools stable + comprehensive E2E tests

**My Recommendation**: Option C gives clear milestones. Create `ROADMAP.md` documenting:
1. What each MINOR version represents
2. What signals production-ready (1.0)
3. Feature themes per version

### Action Items for Decision
- [ ] Choose versioning philosophy (A/B/C or hybrid)
- [ ] Create `ROADMAP.md` with version milestones
- [ ] Update README with roadmap reference
- [ ] Review/prune future enhancement lists (some may be obsolete)

---

## Topic 2: Workflow Issues (Release Notes / README)

### Problem Identified
- **v0.2.4**: No release notes file in `docs/releases/v0.2.4.md`
- **README.md**: Shows version badge `0.2.0` (outdated by 4 versions!)
- User followed `/prepare-release` command but artifacts still missing

### Root Cause Analysis

1. **README badge is manual**: Badge shows `0.2.0` because nobody updated it
   - Badge uses static text: `![version](https://img.shields.io/badge/version-0.2.0-blue)`
   - Should be: dynamic from package.json or GitHub releases

2. **Release notes directory missing v0.2.4**:
   - `/prepare-release` command DOES create release notes (Step 5)
   - But only if run BEFORE publishing
   - If publishing happened without running the command fully, notes are skipped

3. **Workflow gap**: No verification step that release notes exist before merge to main

### Recommendations

**Fix 1: Make README version dynamic**
```markdown
![version](https://img.shields.io/github/package-json/v/JoshSmithXRM/Power-Platform-Developer-Suite)
```
Or use GitHub releases badge - auto-updates on each release.

**Fix 2: Add pre-PR checklist in `/prepare-release`**
- Add explicit check: "Does `docs/releases/vX.Y.Z.md` exist?"
- If not, create it from CHANGELOG
- Block PR if missing

**Fix 3: Create missing release notes retroactively**
- v0.2.4 release notes should be created from CHANGELOG section
- Consider scripting this for future

**Fix 4: Update `/prepare-release` command**
- Step 5 should verify file was created, not just attempt
- Add README version badge check

### Action Items for Decision
- [ ] Fix README version badge (dynamic or manual update to 0.2.4)
- [ ] Create missing `docs/releases/v0.2.4.md`
- [ ] Update `/prepare-release` command with verification steps
- [ ] Consider GitHub Action to auto-generate release notes on tag

---

## Topic 3: Technical Debt Review

### Current Inventory (7 items)

| Category | Item | Original Decision | Recommendation |
|----------|------|-------------------|----------------|
| Accepted | getValue() Pattern | Keep - 0 bugs | ✅ Keep - still valid |
| Accepted | Large Panel Files | Keep - coordinator pattern | ✅ Keep - acceptable |
| Accepted | Unsafe Type Assertions | Keep - repos validate | ✅ Keep - still safe |
| Accepted | ESLint Suppressions (29) | Keep - all documented | ✅ Keep - excellent |
| Accepted | Regex FetchXML Parsing | Keep - domain purity | ✅ Keep - working well |
| Will Not | XML Formatter Interface | Rejected (over-eng) | ✅ Keep rejected |
| Low Priority | Notification Service Abstraction | Defer | 🤔 Revisit |

### Deep Review: Low Priority Item

**Notification Service Abstraction** (`low-priority/notification-service-abstraction.md`)
- 95+ VS Code notification callsites
- Trigger: "When refactoring 10+ notification callsites"
- Current state: 99% consistency (1/95 fixed)

**My Assessment**: This is truly low priority. The trigger hasn't occurred.
- Not causing bugs
- Not blocking features
- Would be 4-6 hours of work for minimal benefit
- **Recommendation**: Keep as low-priority, revisit only if doing major refactor

### Overall Technical Debt Health

- ✅ **Previous decisions validated** - All 5 accepted tradeoffs remain valid
- ✅ **No new bugs** from any deferred items
- ✅ **Good documentation** - All items have clear justification
- ⚠️ **One improvement opportunity**: ESLint suppression quarterly review due Feb 2026

### Action Items for Decision
- [ ] Confirm keep all current decisions as-is
- [ ] Set calendar reminder for quarterly ESLint review (Feb 2026)
- [ ] Delete or archive any resolved items from docs

---

## Topic 4: ESLint Warnings (38 warnings, not 37)

### Current State
- **38 warnings** (0 errors) from `npm run lint:all`
- Build passes, these are warnings only
- All warnings are complexity/size limits

### Warning Breakdown

| Category | Count | Files | Severity |
|----------|-------|-------|----------|
| complexity (>15) | 18 | Transpilers, Mappers, Factories, Repos | Medium |
| max-lines (>500) | 6 | Panel files, Auth service | Low |
| max-lines-per-function (>100) | 4 | Query handlers | Medium |
| max-statements (>30) | 3 | Integration tests | Very Low |
| max-depth (>4) | 2 | Deep nesting in repos | Medium |

### Analysis by Area

**1. Data Explorer Transpilers** (4 warnings)
- `FetchXmlToSqlTranspiler.ts` - complexity 25
- `SqlLexer.ts` - complexity 21
- `SqlToFetchXmlTranspiler.ts` - complexity 19
- These are **parsers** - high complexity is inherent to parsing

**2. Metadata Browser** (8 warnings)
- Entity/Attribute mappers with high complexity
- `create()` static factories with many fields (23-28 complexity)
- `enrichAttributesWithOptionSets` complexity 34 (API aggregation)

**3. Panel Files** (5 warnings)
- DataExplorer: 834 lines, complex query handlers
- WebResources: 622 lines
- MetadataBrowser: 603 lines
- EnvironmentSetup: 518 lines
- MsalAuth: 539 lines

**4. Test Files** (3 warnings)
- Integration tests with many statements (33-64)
- Not production code, acceptable

**5. Test Factories** (7 warnings)
- `EnvironmentFactory` - 19-24 complexity
- `EnvironmentVariableFactory` - 19-21 complexity
- `SolutionFactory` - 28 complexity
- These have many optional parameters - complexity is acceptable

### Recommendations

**Option A: Accept All Warnings (No Action)**
- These are warnings, not errors
- High complexity in parsers/mappers is expected
- Large panel files are documented as acceptable tradeoff
- **Pro**: No work, no risk
- **Con**: Warnings may hide future issues

**Option B: Increase Limits in ESLint Config**
- Raise complexity limit from 15 to 25 for specific file patterns
- Raise max-lines from 500 to 800 for panel files
- **Pro**: Warnings disappear, legitimate
- **Con**: May mask future problems

**Option C: Targeted Refactoring (High Effort)**
- Split DataExplorerPanelComposed into smaller coordinators
- Extract complex mapper logic to helper functions
- **Pro**: Cleaner code
- **Con**: 10-20 hours of work, risk of regressions

**Option D: Document and Suppress with Justification**
- Add `// eslint-disable-next-line` with clear comments
- Document in `eslint-suppressions.md` inventory
- **Pro**: Explicit acknowledgment
- **Con**: 38 suppressions to add/document

**My Recommendation**: **Option A + B hybrid**
- Keep test file warnings as-is (they're fine)
- Consider raising panel file max-lines to 800 (documented exception already exists)
- Accept complexity warnings in parsers/factories (inherent to domain)

### Action Items for Decision
- [ ] Decide on approach (A/B/C/D or hybrid)
- [ ] If B: Update .eslintrc with raised limits for specific patterns
- [ ] If D: Add suppressions to inventory

---

## Topic 5: E2E Testing Strategy

### Current State
- **Infrastructure**: ✅ Fully implemented (Playwright, helpers, reporters)
- **Smoke tests**: 2 files (VS Code launch, panel open)
- **Integration tests**: 6 files (Data Explorer, Environment Setup, Plugin Traces, Solutions, Environment Switch)
- **Usage**: Ad-hoc during bug fixes

### Test Coverage Summary

| Test Type | Files | What It Tests | Credential Req |
|-----------|-------|---------------|----------------|
| Smoke | 2 | VS Code launches, commands registered | No |
| Integration | 6 | Panel behavior, API calls, state persistence | Some |

### Gap Analysis

**Covered**:
- Extension activation
- Command registration
- Panel opening
- Data Explorer query execution
- Environment switch state isolation
- Solutions panel with real API

**Not Covered**:
- Web Resources panel
- Connection References panel
- Environment Variables panel
- Metadata Browser panel
- Import Job Viewer panel
- Plugin Trace Viewer (partial - has test file but minimal)
- Visual regression testing
- Error state testing
- Edge cases (network failures, invalid data)

### Strategy Options

**Option A: Minimal (Keep Current)**
- Keep current tests for smoke + critical workflows
- Add tests only when fixing bugs (E2E-driven bug fix pattern)
- **Pro**: No upfront investment
- **Con**: Coverage gaps may cause regressions

**Option B: Panel Coverage Sprint**
- Write E2E tests for each remaining panel (basic happy path)
- ~2-3 hours per panel = 10-15 hours total
- **Pro**: Comprehensive coverage
- **Con**: Significant time investment

**Option C: Critical Path Focus**
- Test most-used features only:
  - Environment Setup (auth flows)
  - Solutions (most used tool)
  - Data Explorer (complex queries)
  - Plugin Traces (filtering)
- ~6-8 hours total
- **Pro**: High value, moderate effort
- **Con**: Some panels still uncovered

**Option D: Visual Regression Testing**
- Add screenshot comparison tests
- Catch UI regressions automatically
- **Pro**: Catches CSS/layout bugs
- **Con**: Flaky, maintenance burden

### My Recommendation

**Option C + E2E-driven bug fixes**

1. **Now**: Keep existing tests
2. **This branch**: Add basic E2E for any panels we've modified (if not already covered)
3. **Going forward**: Continue E2E-driven bug fix pattern
4. **Defer**: Visual regression (low value for current team size)

### Integration Test Infrastructure Note

The current E2E tests use Playwright with real VS Code. There's also mention of `@vscode/test-electron` in INFRASTRUCTURE.md. These are different:
- **Playwright E2E**: Full VS Code UI testing (current)
- **@vscode/test-electron**: Extension host integration tests (not implemented)

Both have value, but Playwright E2E gives more coverage for UI bugs.

### Action Items for Decision
- [ ] Choose E2E strategy (A/B/C/D)
- [ ] If B/C: Prioritize which panels to cover first
- [ ] Document E2E test requirements in CLAUDE.md (when to write E2E vs unit tests)

---

## Summary: Decision Matrix

| Topic | Options | Effort | My Recommendation |
|-------|---------|--------|-------------------|
| 1. Roadmap | A/B/C versioning | 2-4h | Option C: Milestone-based |
| 2. Workflow | Fix release process | 1-2h | Fix all 4 issues |
| 3. Tech Debt | Keep/action | 0h | Keep current decisions |
| 4. Warnings | A/B/C/D | 0-20h | Option A+B: Accept + raise limits |
| 5. E2E Testing | A/B/C/D | 0-15h | Option C: Critical path |
| 6. Code Cleanup | - | 2-4h | After above complete |
| 7. Code Review | - | 2-4h | After cleanup complete |

---

## Awaiting Your Decisions

Please review each topic and indicate your decisions:

1. **Roadmap**: Which versioning philosophy? Create ROADMAP.md?
2. **Workflow**: Fix all 4 release process issues?
3. **Tech Debt**: Confirm keep all current decisions?
4. **Warnings**: Which approach (A/B/C/D)?
5. **E2E Testing**: Which strategy (A/B/C/D)?
