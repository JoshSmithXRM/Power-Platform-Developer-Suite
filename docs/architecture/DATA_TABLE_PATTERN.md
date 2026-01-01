# Data Table Pattern

**Purpose:** Ensure consistent, professional data table behavior across all panels.

---

## Core Principles

1. **Data-Driven Widths** - Column widths calculated from actual data, not arbitrary values
2. **Stable Layout** - No column resizing during scroll or interaction
3. **Consistent Rows** - Fixed row height, no text wrapping within cells
4. **Full Content Access** - Tooltips show full text when truncated
5. **Mandatory Pattern** - All data tables MUST follow this pattern

---

## Quick Start

### 1. Define Column Types

Every column MUST have a `type` property:

```typescript
columns: [
  { key: 'friendlyName', label: 'Solution Name', type: 'name' },
  { key: 'status', label: 'Status', type: 'status' },
  { key: 'createdOn', label: 'Created', type: 'datetime' },
  { key: 'createdBy', label: 'Created By', type: 'user' },
]
```

### 2. Use the Calculator

```typescript
import { calculateColumnWidths } from '../../shared/infrastructure/ui/tables';

// In your section or panel
const calculatedColumns = calculateColumnWidths(data, config.columns);
```

### 3. Apply Widths in Views

```typescript
// In view rendering
function renderTableHeader(column: CalculatedColumn): string {
  return `<th style="width: ${column.width}px">${column.label}</th>`;
}

function renderTableCell(value: unknown, column: CalculatedColumn): string {
  const displayValue = formatCellValue(value);
  const fullValue = String(value || '');
  return `<td style="width: ${column.width}px" title="${escapeHtml(fullValue)}">${displayValue}</td>`;
}
```

---

## Column Types Reference

| Type | Use For | Min | Max | Examples |
|------|---------|-----|-----|----------|
| `name` | Primary identifiers | 150px | 350px | Solution Name, Job Name |
| `identifier` | Technical identifiers | 120px | 300px | Unique Name, Schema Name |
| `status` | Short categorical | 80px | 150px | Status, Type, Mode |
| `boolean` | Yes/No values | 70px | 110px | Visible, API Managed |
| `version` | Version numbers | 80px | 130px | Version (1.0.0.0) |
| `date` | Date only | 100px | 140px | Installed On (short) |
| `datetime` | Date and time | 140px | 180px | Created On, Modified On |
| `user` | User names | 100px | 200px | Created By, Modified By |
| `description` | Long text | 150px | 400px | Description, Notes |
| `progress` | Progress indicators | 80px | 150px | Progress percentage |
| `numeric` | Numbers | 60px | 120px | Count, Duration, Depth |

### Adding New Column Types

If you need a new type:

1. Add to `ColumnType` union in `ColumnTypes.ts`
2. Add bounds to `COLUMN_TYPE_BOUNDS`
3. Add formatting logic to `formatForMeasurement` if needed
4. Update this documentation

---

## CSS Requirements

All data tables MUST have these CSS rules applied:

```css
/* Fixed layout enforces column widths */
table.data-table,
table.virtual-table {
  table-layout: fixed;
}

/* No text wrapping - consistent row height */
table td, table th {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  height: 36px;
  max-height: 36px;
  vertical-align: middle;
}
```

These are included in `datatable.css` and applied automatically when using DataTableSection or VirtualDataTableSection.

---

## Width Calculation Algorithm

```
For each column:
  1. Get type bounds (min, max, avgCharWidth)
  2. Calculate header width = label.length × avgCharWidth + padding
  3. Scan ALL data rows:
     - Format value for measurement
     - Calculate content width = value.length × avgCharWidth + padding
     - Track maximum content width
  4. Optimal width = max(header width, max content width)
  5. Final width = clamp(optimal, min, max)
```

### Why Scan ALL Data?

- **Virtual tables:** Only ~50 rows visible at a time, but we need widths based on ALL data to prevent column shifting during scroll
- **Regular tables:** Browser does this naturally, but explicit calculation ensures consistency
- **Performance:** Character-based estimation is O(n) and fast (~10ms for 5000 rows)

---

## Overriding Defaults

You can override min/max bounds per column:

```typescript
columns: [
  // Use default bounds for 'name' type
  { key: 'friendlyName', label: 'Solution Name', type: 'name' },

  // Override max width for a specific column
  { key: 'description', label: 'Description', type: 'description', maxWidth: 250 },

  // Override both min and max
  { key: 'customField', label: 'Custom', type: 'name', minWidth: 200, maxWidth: 400 },
]
```

---

## Tooltips for Truncated Content

When content is truncated (ellipsis shown), users can hover to see the full text.

**Implementation:**
- Add `title` attribute to every `<td>` element
- Title contains the full, unformatted value

```typescript
<td title="${escapeHtml(fullValue)}">${truncatedDisplay}</td>
```

**User Experience:**
- Hover over any cell → native browser tooltip shows full content
- No JavaScript required
- Works consistently across all browsers

---

## Panel Checklist

When creating or updating a panel with a data table:

- [ ] All columns have `type` property defined
- [ ] Using `calculateColumnWidths()` utility
- [ ] Widths applied to `<th>` and `<td>` elements
- [ ] `title` attribute on all `<td>` elements
- [ ] Using `data-table` or `virtual-table` CSS class
- [ ] Tested: columns don't shift during scroll
- [ ] Tested: no text wrapping in cells
- [ ] Tested: tooltip appears on hover

---

## Examples

### Solutions Panel

```typescript
private getTableConfig(): DataTableConfig {
  return {
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
    ],
    // ... other config
  };
}
```

### Import Jobs Panel

```typescript
private getTableConfig(): DataTableConfig {
  return {
    columns: [
      { key: 'solutionName', label: 'Solution', type: 'name' },
      { key: 'status', label: 'Status', type: 'status' },
      { key: 'progress', label: 'Progress', type: 'progress' },
      { key: 'startedOn', label: 'Started', type: 'datetime' },
      { key: 'completedOn', label: 'Completed', type: 'datetime' },
      { key: 'createdBy', label: 'Created By', type: 'user' },
      { key: 'createdOn', label: 'Created', type: 'datetime' },
      { key: 'modifiedOn', label: 'Modified', type: 'datetime' }
    ],
    // ... other config
  };
}
```

---

## Troubleshooting

### Columns still shifting during scroll
- Verify `table-layout: fixed` is applied
- Verify widths are calculated from ALL data, not just visible rows
- Check that width is applied to both `<th>` and `<td>`

### Text still wrapping
- Verify `white-space: nowrap` is applied
- Check for conflicting CSS rules
- Ensure using correct CSS class (`data-table` or `virtual-table`)

### Tooltips not appearing
- Verify `title` attribute is on `<td>` elements
- Check that value is properly escaped
- Note: empty values don't show tooltips (expected)

### Column too narrow/wide
- Check if type is appropriate for the content
- Consider overriding min/max bounds for that column
- Review the type bounds - may need adjustment for your data

---

## Related Documentation

- [Virtual Table Design](../design/VIRTUAL_DATA_TABLE_DESIGN.md)
