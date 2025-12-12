# Plugin Step Filtering Investigation

Investigation into which SDK Message Processing Steps can be disabled and how to filter the view for better UX.

## Background

When displaying plugin steps in the Plugin Registration panel, the full list contains ~69,000+ enabled steps. Most are internal Microsoft steps that cannot be disabled. We needed to understand:

1. What makes a step "disableable" vs "Microsoft-locked"?
2. How can we filter the view to reduce noise?

## Investigation Method

Created a LINQPad script (`scripts/test-disable-steps-parallel.linq`) that:
1. Queries all enabled SDK Message Processing Steps (69,225 in test environment)
2. Attempts to disable each step
3. If successful, immediately re-enables it
4. Records success/failure with all relevant metadata

### Performance Optimization

Initial sequential script estimated 9+ hours. Applied Microsoft's parallel request best practices:
- `Parallel.ForEach` with cloned `ServiceClient` per thread
- Disabled affinity cookie (`EnableAffinityCookie = false`)
- Increased parallelism from server-recommended 5 to 15
- Achieved ~49 steps/sec, completed in 23 minutes

See `docs/architecture/DATAVERSE_THROUGHPUT_GUIDE.md` for full parallelization documentation.

## Results

**234 out of 69,225 steps can be disabled (0.34%)**

### Field Analysis

| Field | Distribution Among Disableable Steps | Useful for Filtering? |
|-------|-------------------------------------|----------------------|
| `Step_CustomizationLevel = 1` | 230 of 234 (98.3%) | No - 65,007 steps have this value |
| `Step_IsCustomizable = false` | 135 of 234 (57.7%) | No - doesn't predict disableability |
| `Step_IsManaged = false` | 65 of 234 (27.8%) | No - 61,347 steps are unmanaged |
| `Step_IsHidden = false` | ~195 of 234 | **YES - only 2,688 total steps** |
| `Assembly_IsManaged = true` | 232 of 234 (99.1%) | No - would hide custom plugins in managed solutions |

### Key Finding: `ishidden` is the Best Discriminator

| ishidden Value | Count | Description |
|---------------|-------|-------------|
| `true` | 66,537 (96.1%) | Internal workflow triggers, empty-named steps, system plumbing |
| `false` | 2,688 (3.9%) | Named plugin steps users actually want to see/manage |

Filtering on `ishidden = false` reduces the list from 69K to 2.7K steps - a 96% reduction while keeping all relevant steps visible.

### What `ishidden = true` Steps Look Like

- Empty `name` field
- Assembly: `Microsoft.Crm.ObjectModel`
- Plugin: `SyncWorkflowExecutionPlugin`
- Purpose: Internal workflow execution triggers

### What `ishidden = false` Steps Look Like

- Named steps like "PPDSDemo.Plugins: Account Pre-Create Validation"
- Actual business logic plugins
- Both custom and Microsoft plugins users might want to manage

## Disableability is NOT Predictable

We initially hypothesized various fields could predict whether a step can be disabled:

| Hypothesis | Result |
|------------|--------|
| `iscustomizable = false` means can't disable | **FALSE** - 135 disableable steps have this |
| `customizationlevel = 0` means can't disable | **FALSE** - 4 disableable steps have this |
| `ismanaged = true` means can't disable | **FALSE** - 169 disableable steps are managed |

**Conclusion:** There is no reliable client-side way to predict if a step can be disabled. The only way to know is to try and handle the error.

### The GDPR Step Example

The GDPR-related steps that prompted this investigation all have:
- `customizationlevel = 1`
- Various `iscustomizable` values (true/false)
- `ismanaged = true/false` (mixed)

Yet some can be disabled and others cannot. The determination is made server-side based on internal Microsoft rules we cannot query.

## Recommended Implementation

### Two Filters

1. **"Hide hidden steps"** (Default: ON)
   - Filter: `ishidden = false`
   - Reduces noise from 69K to 2.7K steps
   - Shows all "real" plugin steps users care about

2. **"Hide Microsoft assemblies"** (Default: OFF)
   - Filter: `assembly.name NOT LIKE 'Microsoft.%'`
   - Further reduces to only custom assemblies
   - Note: Uses name prefix, NOT `ismanaged`, so custom plugins deployed as managed solutions still appear

### Error Handling for Disable

Instead of trying to predict disableability:
1. Allow users to attempt disabling any step
2. Catch error code `0x8004419a` (or similar)
3. Display user-friendly message: "This step is registered by Microsoft and cannot be disabled"

## Files

- `scripts/test-disable-steps-parallel.linq` - Parallel test script
- `scripts/test-disable-steps.linq` - Original sequential script (slower)
- `scripts/disableable-steps.json` - Results (234 disableable steps with metadata)

## Queries Used

```sql
-- Distribution of ishidden
SELECT ishidden, COUNT(*) as count
FROM sdkmessageprocessingstep
WHERE statecode = 0
GROUP BY ishidden

-- Distribution of customizationlevel
SELECT customizationlevel, COUNT(*) as count
FROM sdkmessageprocessingstep
WHERE statecode = 0
GROUP BY customizationlevel

-- Visible steps with assembly info
SELECT s.name, s.ishidden, s.iscustomizable, a.name as assembly_name, a.ismanaged
FROM sdkmessageprocessingstep s
LEFT JOIN plugintype p ON s.plugintypeid = p.plugintypeid
LEFT JOIN pluginassembly a ON p.pluginassemblyid = a.pluginassemblyid
WHERE s.statecode = 0 AND s.ishidden = 0
```
