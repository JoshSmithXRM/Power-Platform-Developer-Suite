# Data Table Consistency Pattern - Technical Design

**Status:** Draft
**Date:** 2025-11-27
**Complexity:** Moderate

---

## Overview

**User Problem:** Data tables across panels have inconsistent behavior - columns resize during scroll (Solutions), text wraps creating uneven row heights (Import Jobs "Created By"), and each panel handles tables differently.

**Solution:** Implement a shared column width calculator that determines optimal widths from actual data, with consistent CSS that prevents text wrapping and enforces stable layouts across all panels.

**Value:** Professional, consistent UX across the entire application with predictable data table behavior.

---

## Requirements

### Functional Requirements
- [x] FR1: Column widths calculated from actual data content
- [x] FR2: Widths locked after initial calculation (no resizing during scroll)
- [x] FR3: Consistent row heights (no text wrapping within cells)
- [x] FR4: Tooltips show full content when text is truncated
- [x] FR5: Horizontal scrolling when table exceeds viewport
- [x] FR6: Works for both virtual tables and regular tables
- [x] FR7: Column type system for appropriate min/max bounds

### Non-Functional Requirements
- [x] NF1: Width calculation completes < 50ms for 5000 records
- [x] NF2: No layout shift during user interaction
- [x] NF3: Backward compatible (existing panels opt-in)

### Success Criteria
- [x] Solutions table columns don't resize during scroll
- [x] Import Jobs "Created By" doesn't wrap to multiple lines
- [x] All panels have consistent row heights
- [x] Full content accessible via tooltip on truncated cells

---

## Implementation Slices

### Slice 1: Column Width Calculator Utility
**Goal:** Create shared utility that calculates optimal column widths from data

**Domain:**
- `ColumnType` - Type definitions for column content types
- `ColumnBounds` - Min/max width constraints per type
- `COLUMN_TYPE_BOUNDS` - Standard bounds for each type

**Application:**
- `ColumnWidthCalculator` - Utility to calculate widths from data
- `CalculatedColumn` - Column config with computed width

**Infrastructure:**
- N/A (utility is framework-agnostic)

**Presentation:**
- N/A

**Result:** Reusable width calculation utility

---

### Slice 2: CSS Updates for Consistency
**Goal:** Update CSS to enforce consistent table layout

**Changes:**
- `table-layout: fixed` on all data tables
- `white-space: nowrap` on all cells
- `text-overflow: ellipsis` for overflow
- Fixed row height (36px standard)
- Remove conflicting virtual table CSS

**Result:** Consistent cell rendering across all tables

---

### Slice 3: Update Virtual Table (Solutions)
**Goal:** Apply pattern to VirtualDataTableSection

**Changes:**
- Add column types to Solutions config
- Calculate widths in VirtualDataTableSection
- Apply widths to rendered columns
- Add title attribute for tooltips

**Result:** Solutions table with stable columns

---

### Slice 4: Update Regular Tables (Import Jobs, etc.)
**Goal:** Apply pattern to DataTableSection

**Changes:**
- Add column types to Import Jobs config
- Add column types to Environment Variables config
- Add column types to Plugin Trace Viewer config
- Calculate widths in DataTableSection
- Apply widths to rendered columns

**Result:** All panels with consistent table behavior

---

## Architecture Design

### Layer Responsibilities

```
┌─────────────────────────────────────────────────────────────────┐
│ Presentation Layer                                               │
│ - Panels provide column config with types                       │
│ - Sections calculate widths and render tables                   │
│ - Views apply widths and title attributes                       │
└─────────────────────────────────────────────────────────────────┘
                          ↓ uses ↓
┌─────────────────────────────────────────────────────────────────┐
│ Shared Infrastructure (UI Utilities)                            │
│ - ColumnWidthCalculator - Calculates optimal widths             │
│ - ColumnTypes - Type definitions and bounds                     │
│ - CSS - Enforces layout consistency                             │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
Panel Config          Data Array            CSS
     │                    │                  │
     ▼                    ▼                  │
┌─────────────────────────────────────┐     │
│     ColumnWidthCalculator           │     │
│  - Scan all data for max content    │     │
│  - Apply type-based bounds          │     │
│  - Return columns with widths       │     │
└─────────────────────────────────────┘     │
                  │                          │
                  ▼                          ▼
         ┌─────────────────────────────────────┐
         │        Table Rendering              │
         │  - Apply calculated widths          │
         │  - table-layout: fixed              │
         │  - white-space: nowrap              │
         │  - text-overflow: ellipsis          │
         │  - title attribute for tooltip      │
         └─────────────────────────────────────┘
                          │
                          ▼
              Consistent Table Display
```

---

## Type Contracts

### Column Types

```typescript
// src/shared/infrastructure/ui/tables/ColumnTypes.ts

export type ColumnType =
  | 'name'        // Solution Name, Job Name - primary identifiers
  | 'identifier'  // Unique Name, IDs - technical identifiers
  | 'status'      // Status, Type - short categorical values
  | 'boolean'     // Yes/No, True/False, Visible
  | 'version'     // Version numbers (1.0.0.0)
  | 'date'        // Dates (short format)
  | 'datetime'    // Full datetime with time
  | 'user'        // User names, Created By, Modified By
  | 'description' // Long text - caps with ellipsis
  | 'progress'    // Progress indicators
  | 'numeric';    // Numbers, counts

export interface ColumnBounds {
  readonly min: number;
  readonly max: number;
  readonly avgCharWidth: number;
}

export const COLUMN_TYPE_BOUNDS: Readonly<Record<ColumnType, ColumnBounds>> = {
  name:        { min: 150, max: 350, avgCharWidth: 8 },
  identifier:  { min: 120, max: 300, avgCharWidth: 7 },
  status:      { min: 80,  max: 150, avgCharWidth: 8 },
  boolean:     { min: 70,  max: 110, avgCharWidth: 8 },
  version:     { min: 80,  max: 130, avgCharWidth: 8 },
  date:        { min: 100, max: 140, avgCharWidth: 8 },
  datetime:    { min: 140, max: 180, avgCharWidth: 8 },
  user:        { min: 100, max: 200, avgCharWidth: 8 },
  description: { min: 150, max: 400, avgCharWidth: 7 },
  progress:    { min: 80,  max: 150, avgCharWidth: 8 },
  numeric:     { min: 60,  max: 120, avgCharWidth: 9 },
};
```

### Enhanced Column Configuration

```typescript
// Updated column config interface
export interface ColumnConfig {
  readonly key: string;
  readonly label: string;
  readonly type: ColumnType;           // REQUIRED - determines bounds
  readonly minWidth?: number;          // Optional override
  readonly maxWidth?: number;          // Optional override
}

export interface CalculatedColumn extends ColumnConfig {
  readonly width: number;              // Calculated pixel width
}
```

### Column Width Calculator

```typescript
// src/shared/infrastructure/ui/tables/ColumnWidthCalculator.ts

const CELL_PADDING = 24;
const HEADER_EXTRA = 20;

export function calculateColumnWidths(
  data: ReadonlyArray<Record<string, unknown>>,
  columns: ReadonlyArray<ColumnConfig>
): ReadonlyArray<CalculatedColumn> {
  return columns.map(column => ({
    ...column,
    width: calculateSingleColumnWidth(data, column)
  }));
}

function calculateSingleColumnWidth(
  data: ReadonlyArray<Record<string, unknown>>,
  column: ColumnConfig
): number {
  const bounds = COLUMN_TYPE_BOUNDS[column.type];
  const minWidth = column.minWidth ?? bounds.min;
  const maxWidth = column.maxWidth ?? bounds.max;

  // Header width
  const headerWidth = column.label.length * bounds.avgCharWidth + HEADER_EXTRA;

  // Max content width from data
  let maxContentWidth = 0;
  for (const row of data) {
    const value = row[column.key];
    const displayValue = formatForMeasurement(value, column.type);
    const contentWidth = displayValue.length * bounds.avgCharWidth + CELL_PADDING;
    maxContentWidth = Math.max(maxContentWidth, contentWidth);
  }

  // Use larger of header or content, bounded by min/max
  const optimalWidth = Math.max(headerWidth, maxContentWidth);
  return Math.min(Math.max(optimalWidth, minWidth), maxWidth);
}

function formatForMeasurement(value: unknown, type: ColumnType): string {
  if (value === null || value === undefined) return '';

  switch (type) {
    case 'boolean': return value ? 'Yes' : 'No';
    case 'date': return '12/31/2024';
    case 'datetime': return '12/31/2024, 11:59 PM';
    default: return String(value);
  }
}
```

---

## File Structure

```
src/shared/infrastructure/ui/
├── tables/
│   ├── ColumnTypes.ts              # NEW: Type definitions
│   ├── ColumnWidthCalculator.ts    # NEW: Width calculation utility
│   └── index.ts                    # NEW: Re-exports
├── sections/
│   ├── DataTableSection.ts         # MODIFY: Use calculator
│   └── VirtualDataTableSection.ts  # MODIFY: Use calculator
└── views/
    ├── dataTableSectionView.ts     # MODIFY: Apply widths, add titles
    └── virtualTableSectionView.ts  # MODIFY: Apply widths, add titles

resources/webview/css/sections/
└── datatable.css                   # MODIFY: Add consistency CSS
```

**New Files:** 3 files
**Modified Files:** 5 files
**Total:** 8 files

---

## Panel Column Types

### Solutions Panel
```typescript
columns: [
  { key: 'friendlyName', label: 'Solution Name', type: 'name' },
  { key: 'uniqueName', label: 'Unique Name', type: 'identifier' },
  { key: 'version', label: 'Version', type: 'version' },
  { key: 'isManaged', label: 'Type', type: 'status' },
  { key: 'publisherName', label: 'Publisher', type: 'name' },
  { key: 'isVisible', label: 'Visible', type: 'boolean' },
  { key: 'isApiManaged', label: 'API Managed', type: 'boolean' },
  { key: 'installedOn', label: 'Installed On', type: 'datetime' },
  { key: 'modifiedOn', label: 'Modified On', type: 'datetime' }
]
```

### Import Jobs Panel
```typescript
columns: [
  { key: 'solutionName', label: 'Solution', type: 'name' },
  { key: 'status', label: 'Status', type: 'status' },
  { key: 'progress', label: 'Progress', type: 'progress' },
  { key: 'startedOn', label: 'Started', type: 'datetime' },
  { key: 'completedOn', label: 'Completed', type: 'datetime' },
  { key: 'createdBy', label: 'Created By', type: 'user' },
  { key: 'createdOn', label: 'Created', type: 'datetime' },
  { key: 'modifiedOn', label: 'Modified', type: 'datetime' }
]
```

### Environment Variables Panel
```typescript
columns: [
  { key: 'displayName', label: 'Display Name', type: 'name' },
  { key: 'schemaName', label: 'Schema Name', type: 'identifier' },
  { key: 'type', label: 'Type', type: 'status' },
  { key: 'currentValue', label: 'Current Value', type: 'description' },
  { key: 'defaultValue', label: 'Default Value', type: 'description' }
]
```

### Plugin Trace Viewer Panel
```typescript
columns: [
  { key: 'messageName', label: 'Message', type: 'name' },
  { key: 'primaryEntity', label: 'Entity', type: 'identifier' },
  { key: 'depth', label: 'Depth', type: 'numeric' },
  { key: 'mode', label: 'Mode', type: 'status' },
  { key: 'performanceExecutionDuration', label: 'Duration (ms)', type: 'numeric' },
  { key: 'createdOn', label: 'Created', type: 'datetime' }
]
```

---

## CSS Updates

```css
/* Data Table Consistency Pattern */

/* Fixed layout enforces calculated column widths */
table.data-table,
table.virtual-table {
  table-layout: fixed;
}

/* Consistent cell rendering - no wrapping */
table.data-table td,
table.data-table th,
table.virtual-table td,
table.virtual-table th {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  height: 36px;
  max-height: 36px;
  vertical-align: middle;
}

/* Tooltip cursor for truncated content */
td[title] {
  cursor: default;
}
```

---

## Testing Strategy

### Unit Tests
- ColumnWidthCalculator with various data sizes
- Edge cases: empty data, single row, null values
- Type-specific formatting

### Integration Tests
- Verify column widths applied correctly in rendered HTML
- Verify title attributes present on cells

### Manual Testing
1. Solutions panel - scroll and verify columns don't shift
2. Import Jobs panel - verify "Created By" doesn't wrap
3. All panels - verify consistent row heights
4. Hover over truncated text - verify tooltip appears

---

## Clean Architecture Compliance Checklist

**Shared Infrastructure:**
- [x] Utility is framework-agnostic (pure TypeScript)
- [x] No external dependencies
- [x] Explicit return types
- [x] Immutable data patterns

**Type Safety:**
- [x] No `any` types
- [x] Column type is required (not optional)
- [x] Proper null handling

---

## Open Questions

- [x] **Q1:** Should we support custom formatters per column type?
  - **A:** Not in initial implementation. Can add later if needed.

- [x] **Q2:** What about columns with HTML content (links)?
  - **A:** Width calculation uses text length. HTML content still works.

---

## References

- Virtual Table Design: `docs/design/VIRTUAL_DATA_TABLE_DESIGN.md`
- Panel Architecture: `docs/architecture/PANEL_ARCHITECTURE.md`
- CSS Modules: `docs/architecture/CSS_ARCHITECTURE.md`
