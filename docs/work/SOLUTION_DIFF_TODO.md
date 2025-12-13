# Solution Diff - Task Tracking

**Branch:** `feature/solution-diff`
**Created:** 2025-12-08
**Status:** Phase 1 + Option C implementation in progress

---

## Overview

**Goal:** Compare Power Platform solutions between two environments to identify meaningful differences in components and metadata.

**Key Decision (Session 3):** Current implementation only checks component EXISTENCE, not CONTENT. We need deep comparison that fetches actual component records and compares columns.

---

## Implementation Plan

### Phase 1: Bug Fixes (Required for PR)
Fix issues that make current implementation misleading.

- [ ] Remove timestamp comparisons (modifiedOn, installedOn) - always different, pure noise
- [ ] Make managed state informational only (expected: dev=unmanaged, downstream=managed)
- [ ] Collapsible solution info section (consistent with component sections)
- [ ] Remove redundant header (solution name already in dropdown)
- [ ] Better status badge ("Version mismatch" not "3 differences found")
- [ ] Add publisher comparison (should match, mismatch = problem)

### Phase 2: Component Type Registry (Domain)
Map component types to their tables and comparable columns.

- [ ] Create `ComponentTypeRegistry` class
- [ ] Define for each type:
  - Table name to query
  - Comparable columns (content, config, etc.)
  - Ignored columns (modifiedon, modifiedby, etc.)
  - Display name column
  - Identity column (for matching across environments)
- [ ] Start with 5 data component types (Option C):
  - Workflow (29) → `workflows` table
  - PluginAssembly (91) → `pluginassemblies` table
  - PluginStep (92) → `sdkmessageprocessingsteps` table
  - WebResource (61) → `webresourceset` table
  - EnvironmentVariable (380) → `environmentvariabledefinitions` table

### Phase 3: Component Fetcher (Infrastructure)
Fetch actual component records for comparison.

- [ ] Create `ComponentDataFetcher` service
- [ ] Parallel fetch from both environments
- [ ] Respect API limits (6000 req/5min, 52 concurrent)
- [ ] Error handling for failed fetches
- [ ] Progress callback for UI updates

### Phase 4: Deep Comparison (Domain)
Compare actual component records column-by-column.

- [ ] Update `ComponentComparison` entity
- [ ] Add `Modified` category (in both, but columns differ)
- [ ] Generate specific diff messages ("clientdata changed", "version: 1.0→1.1")
- [ ] Column-by-column comparison logic
- [ ] Handle different data types (strings, JSON, base64, etc.)

### Phase 5: UI Enhancement (Presentation)
Show meaningful diff results.

- [ ] Progress bar for deep comparison (implement simple version, refactor when plugin-registration merges)
- [ ] "Modified" section with expandable details
- [ ] Show component display names (from fetched records)
- [ ] Show which specific columns changed
- [ ] Summary: "3 added, 2 removed, 5 modified, 40 unchanged"

---

## Deferred Items

### Entity Metadata (Future - Before Relationships)
- Requires Metadata API (different from OData)
- Nested structure (entity → attributes → relationships)
- Complex comparison logic
- **Deferred:** Will implement after data components working

### Relationships (Future - After Entity Metadata)
- Need to determine use cases first
- Complex nested comparisons
- **Deferred:** Need clearer requirements

### Additional Component Types (Future)
- View (26) → `savedqueries`
- Form (60) → `systemforms`
- ModelDrivenApp (80) → `appmodules`
- CanvasApp (300) → `canvasapps`
- ConnectionReference (381) → `connectionreferences`
- **Deferred:** Add incrementally based on user needs

---

## Component Type Reference

### Phase 2 Target Types (Option C - Data Components)

| Type | Code | Table | Comparable Columns | Display Name |
|------|------|-------|-------------------|--------------|
| Workflow | 29 | `workflows` | clientdata, xaml, statecode, category | name |
| PluginAssembly | 91 | `pluginassemblies` | content, version, publickeytoken | name |
| PluginStep | 92 | `sdkmessageprocessingsteps` | configuration, stage, mode, filteringattributes | name |
| WebResource | 61 | `webresourceset` | content, webresourcetype | displayname |
| EnvVariable | 380 | `environmentvariabledefinitions` | defaultvalue, type | displayname |

### Columns to ALWAYS Ignore
- `modifiedon` - Per-environment timestamp
- `modifiedby` - Per-environment user
- `createdon` - Per-environment timestamp
- `createdby` - Per-environment user
- `ownerid` - May differ between environments
- `organizationid` - Always different

---

## Performance Analysis

Based on DATAVERSE_THROUGHPUT_GUIDE.md:

| Metric | Value |
|--------|-------|
| API Limit | 6,000 requests per 5 minutes |
| Concurrent | 52 requests |
| Effective Rate | ~20 requests/second |

**For 100-component solution:**
- Current: 2 API calls (list components)
- Deep: 2 + (100 × 2 envs) = 202 API calls
- Time: 202 ÷ 20 = **~10 seconds**

**For 500-component solution:**
- Deep: 2 + (500 × 2) = 1002 API calls
- Time: 1002 ÷ 20 = **~50 seconds**
- **Progress bar essential for this case**

---

## Definition of "Difference"

### Metadata Level
| Attribute | Counts as Diff? | Rationale |
|-----------|----------------|-----------|
| Version | ✅ YES | Target behind = deployment needed |
| Publisher | ✅ YES | Should match, mismatch = problem |
| Managed State | ❌ NO | Expected: dev=unmanaged, downstream=managed |
| Modified Date | ❌ NO | Per-environment timestamp |
| Installed Date | ❌ NO | Per-environment timestamp |

### Component Level
| Status | Meaning | Actionable? |
|--------|---------|-------------|
| Added (target only) | Component exists in target but not source | ⚠️ Possible drift |
| Removed (source only) | Component not deployed to target | ✅ Deploy needed |
| Modified | Component in both but content differs | ✅ Deploy needed |
| Unchanged | Component identical in both | ✅ No action |

---

## Completed Work

### Slice 1: Metadata Comparison ✅
- [x] Dual-environment selection
- [x] Solution dropdown from source
- [x] Side-by-side metadata table
- [x] Status badges (Same, Different, SourceOnly, TargetOnly)

### Slice 3: Component-Level Diff (Existence Only) ✅
- [x] Fetch solutioncomponents from both environments
- [x] Group by component type
- [x] Expandable sections
- [x] Added/Removed/Unchanged categories

### Session 3 Fixes ✅
- [x] Scrollbar on comparison results
- [x] Solution Diff in Tools menu
- [x] Panel opens directly (no picker dialog)
- [x] Spinner uses standard animated class
- [x] solutionDiffPickEnvironments command for context menu

---

## Session Notes

### Session 1 (2025-12-08)
- Implemented Slice 1 (metadata comparison)
- Fixed JS postMessage bug

### Session 2 (2025-12-09)
- Implemented Slice 3 (component-level diff - existence only)

### Session 3 (2025-12-13)
- Fixed scrollbar, Tools menu, spinner, panel direct open
- Analyzed fundamental flaw: not comparing actual component content
- Decided on Phase 1 + Option C approach
- Key insight: Current "diff" only checks existence, not content
- Plan: Implement deep comparison for data components (Workflow, Plugin, WebResource, EnvVariable)
- Defer: Entity metadata, relationships, additional component types
- Progress bar: Implement simple version now, refactor when plugin-registration merges

---

## Next Steps

1. **Commit current session changes** (bug fixes, tracking doc)
2. **Phase 1**: Fix metadata comparison bugs
3. **Phase 2**: Create ComponentTypeRegistry
4. **Phase 3**: Create ComponentDataFetcher
5. **Phase 4**: Implement deep comparison
6. **Phase 5**: UI enhancements with progress bar
7. **Test**: Manual F5 testing with real solutions
8. **PR**: After all phases complete
