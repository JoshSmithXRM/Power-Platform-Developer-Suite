# Session 19 Execution Plan - Plugin Registration MVP Completion

**Date:** 2025-12-17
**Goal:** Complete MVP with Attribute Picker, Solution Filtering, and Unit Tests

---

## MVP Scope (Final)

### Completed
- [x] Tree browsing with filters
- [x] Assembly CRUD (register, update with type selection, unregister)
- [x] Package CRUD (register, update, unregister)
- [x] Step CRUD (register, edit, unregister, enable/disable)
- [x] Image CRUD (register, edit, unregister)
- [x] Plugin Inspector .NET tool
- [x] Detail panel
- [x] Step form UX polish

### Remaining
- [ ] **Attribute Picker** - Modal with searchable checkboxes
- [ ] **Solution Filtering** - Filter tree by solution membership
- [ ] **Unit Tests** - Domain 80%+, Mappers 70%+

---

## Execution Strategy: Two Parallel Streams

### Stream A: Tests (Parallelizable)
**Can run in separate session - no file conflicts**

| Task | Files to Create | Effort |
|------|-----------------|--------|
| PluginStep tests | `PluginStep.test.ts` | 1h |
| PluginAssembly tests | `PluginAssembly.test.ts` | 45m |
| PluginPackage tests | `PluginPackage.test.ts` | 30m |
| PluginType tests | `PluginType.test.ts` | 30m |
| Value object tests | `ExecutionStage.test.ts`, etc. | 1h |
| Mapper tests | `PluginStepViewModelMapper.test.ts`, etc. | 2h |
| **Total** | | **~6h** |

### Stream B: Features (Sequential)
**Must be in main session - touches shared files**

| Task | Key Files | Effort |
|------|-----------|--------|
| Solution Filtering | Panel, webview JS, new repository | 6-8h |
| Attribute Picker | Panel, webview JS, new modal component | 6-8h |
| **Total** | | **~12-16h** |

**Why sequential:** Both features touch `PluginRegistrationPanelComposed.ts` and `plugin-registration.js`. Parallel work would cause merge conflicts.

---

## Feature Design: Attribute Picker

### UI Mockup
```
┌─────────────────────────────────────────────────────────┐
│ Select Attributes - account                         [X] │
├─────────────────────────────────────────────────────────┤
│ 🔍 Search attributes...                                 │
│                                                         │
│ [Select All] [Deselect All]              42 attributes  │
├─────────────────────────────────────────────────────────┤
│ ☑ Account Name (name)                                   │
│ ☑ Account Number (accountnumber)                        │
│ ☐ Account Rating (accountratingcode)                    │
│ ☑ Annual Revenue (revenue)                              │
│ ...                                                     │
├─────────────────────────────────────────────────────────┤
│                               [Cancel]  [OK]            │
└─────────────────────────────────────────────────────────┘
```

### Implementation Steps
1. Create `IEntityMetadataRepository` interface
2. Implement `DataverseEntityMetadataRepository`
3. Create `AttributePickerModal.js` component
4. Add "..." button to text fields in FormModal
5. Wire step form (Filtering Attributes) and image form (Attributes)

### Data Flow
```
Click "..." → postMessage('showAttributePicker', { entity, current })
           → Panel fetches EntityDefinitions/Attributes
           → postMessage('showAttributePickerModal', { attributes })
           → User selects, clicks OK
           → postMessage('confirmAttributeSelection', { selected })
           → Update field value
```

---

## Feature Design: Solution Filtering

### Architecture
```
Load tree: ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 48s
Load sol:  ━━━━ 3s (parallel, hidden)
Total:     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 48s (no regression)
```

### Data Structure
```typescript
// solutionId → Set of objectIds in that solution
Map<string, Set<string>> solutionMemberships;
```

### Implementation Steps
1. Add `ISolutionComponentRepository` interface
2. Implement `DataverseSolutionComponentRepository`
3. Create `LoadSolutionMembershipsUseCase`
4. Modify panel to parallel fetch with tree load
5. Add solution dropdown to toolbar
6. Implement client-side filter in webview JS

### Key Query
```sql
SELECT solutionid, objectid, componenttype
FROM solutioncomponent
WHERE componenttype IN (36, 91, 92, 93, 94)
-- 36=Package, 91=Assembly, 92=Type, 93=Step, 94=Image
```

---

## Prompt for Test Session (Stream A)

Copy this to start a parallel Claude Code session for tests:

```
I need you to write unit tests for the plugin registration feature.

**Branch:** feature/plugin-registration
**Target:** Domain 80%+, Mappers 70%+
**Constraint:** Only create new *.test.ts files. Do NOT modify any source files.

**Domain entities to test** (src/features/pluginRegistration/domain/entities/):
- PluginStep.ts - canEnable(), canDisable(), isManaged()
- PluginAssembly.ts - canUpdate(), isStandalone(), isManaged()
- PluginPackage.ts - canUpdate(), isManaged()
- PluginType.ts - isWorkflowActivity()

**Value objects to test** (src/features/pluginRegistration/domain/valueObjects/):
- ExecutionStage.ts, ExecutionMode.ts, ImageType.ts
- StepStatus.ts, IsolationMode.ts, SourceType.ts

**Mappers to test** (src/features/pluginRegistration/application/mappers/):
- PluginStepViewModelMapper.ts
- PluginAssemblyViewModelMapper.ts
- PluginRegistrationTreeMapper.ts

Read each source file first, then write comprehensive tests.
Run `npm run compile:fast` after each test file to verify.
```

---

## Pre-PR Checklist

- [ ] Attribute Picker implemented and tested (F5)
- [ ] Solution Filtering implemented and tested (F5)
- [ ] Domain tests: 80%+ coverage
- [ ] Mapper tests: 70%+ coverage
- [ ] `npm run compile` passes
- [ ] CHANGELOG.md updated for 0.4.0
- [ ] `/prepare-pr` passes

---

## Decisions Made (Session 19)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Attribute picker UI | Modal with checkboxes | PRT parity, discoverability, bulk selection |
| Solution filter strategy | Background pre-fetch | No UX regression, instant filtering |
| Test coverage target | Domain 80%+, Mappers 70%+ | Per CLAUDE.md standards, non-negotiable |
| Parallel execution | Tests parallel, features sequential | Safe parallelism, avoids merge conflicts |
