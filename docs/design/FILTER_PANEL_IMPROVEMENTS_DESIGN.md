# Filter Panel Improvements - Technical Design

**Feature:** Plugin Trace Viewer Filter Panel Enhancements
**Status:** Design - Ready for Implementation
**Date:** 2025-01-17
**Prerequisites:** TypeScript behavior refactoring must be complete

---

## Problem Statement

The current filter panel implementation has several issues that limit usability for our target audience (developers and administrators):

### Issue 1: Synthetic "Status" Field Hides Real Query
**Current behavior:**
- User sees: `Status = Exception`
- Actual OData: `exceptiondetails ne null`

**Problems:**
- Developers cannot see the actual API field being queried
- Cannot filter by exception text content (e.g., "NullReferenceException")
- Abstracts away real field names, making it harder to correlate with Dataverse API documentation
- Not transparent for technical users who want to understand what's happening

### Issue 2: Only 9 of 26 Properties Are Filterable
**Current filterable fields:**
- Plugin Name, Entity Name, Message Name, Operation Type, Mode, Status (synthetic), Correlation ID, Created On, Duration

**Missing filterable fields (17 properties):**
- Performance: `constructorDuration`, `executionStartTime`, `constructorStartTime`
- Details: `exceptionDetails` (real field), `messageBlock`, `configuration`, `secureConfiguration`, `profile`
- IDs: `requestId`, `pluginStepId`, `persistenceKey`, `organizationId`
- Audit: `isSystemCreated`, `createdBy`, `createdOnBehalfBy`
- Others: `stage`, `depth`

**Why this matters:**
- Users cannot filter by execution depth (to find recursive plugin calls)
- Cannot filter by stage (to isolate specific pipeline stages)
- Cannot search configuration text
- Missing audit fields for security/compliance scenarios

### Issue 3: Quick Filter UX is Confusing
**Current implementation:**
- Quick filters are buttons that add condition rows to the builder
- Clicking "Exceptions" multiple times adds multiple identical conditions
- No visual feedback on which quick filters are "active"
- Not clear if they're shortcuts or templates

**User confusion:**
- "I clicked Exceptions 3 times and now I have 3 exception filters"
- "How do I turn off the 'Last 24 Hours' filter?"
- "Are these quick filters or just examples?"

---

## Proposed Solution

### Overview: Hybrid Approach with Maximum Transparency

**Three-part solution:**
1. **Quick Filters** - Toggle checkboxes for common presets (simple, no duplicates)
2. **Advanced Builder** - Support all 26 properties dynamically (power users)
3. **Transparency Feature** - Show generated OData query (developer-friendly)

### Solution Details

#### 1. Quick Filters as Toggle Checkboxes

**Design:**
```
┌─────────────────────────────────────────────────────────┐
│ Quick Filters                                           │
│ ┌─────────────────┐ ┌─────────────────┐ ┌──────────┐  │
│ │ ☑ Exceptions    │ │ ☐ Last Hour     │ │ ☐ Today  │  │
│ │ exceptiondetails│ │ createdon >= -1h│ │ created..│  │
│ └─────────────────┘ └─────────────────┘ └──────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Characteristics:**
- Checkbox toggles the filter on/off (clear state)
- Badge shows actual OData field name
- Tooltip shows complete OData condition on hover
- No duplicates possible
- Visual feedback: checked = active (highlighted background)

**Preset Filters:**
- **Exceptions**: `exceptiondetails ne null`
- **Success Only**: `exceptiondetails eq null`
- **Last Hour**: `createdon ge {now-1h}`
- **Last 24 Hours**: `createdon ge {now-24h}`
- **Today**: `createdon ge {startOfToday}`
- **Async Only**: `mode eq 1`
- **Sync Only**: `mode eq 0`
- **Recursive Calls**: `depth gt 1`

#### 2. Advanced Builder with All 26 Properties

**Dynamic Field Generation:**
- Generate filterable fields automatically from `PluginTrace` domain entity
- Map TypeScript types to filter field types:
  - `string` → text field (operators: Equals, Contains, StartsWith, EndsWith, NotEquals)
  - `number` → number field (operators: Equals, NotEquals, GreaterThan, LessThan, GreaterThanOrEqual, LessThanOrEqual)
  - `Date` → date field (operators: Equals, NotEquals, GreaterThan, LessThan, GreaterThanOrEqual, LessThanOrEqual)
  - `boolean` → boolean field (operators: Equals, NotEquals)
  - Enum types → enum field (operators: Equals, NotEquals)
  - Nullable fields → add "Is Null" and "Is Not Null" operators

**Field Mapping:**
| Property | Display Name | Field Type | OData Field | Operators |
|----------|--------------|------------|-------------|-----------|
| id | Trace ID | text | plugintracelogid | eq, ne, contains, startswith, endswith |
| createdOn | Created On | date | createdon | eq, ne, gt, lt, ge, le |
| pluginName | Plugin Name | text | typename | eq, ne, contains, startswith, endswith |
| entityName | Entity Name | text | primaryentity | eq, ne, contains, startswith, endswith, null, notnull |
| messageName | Message Name | text | messagename | eq, ne, contains, startswith, endswith |
| operationType | Operation Type | enum | operationtype | eq, ne |
| mode | Execution Mode | enum | mode | eq, ne |
| stage | Stage | number | stage | eq, ne, gt, lt, ge, le |
| depth | Depth | number | depth | eq, ne, gt, lt, ge, le |
| duration | Duration (ms) | number | performanceexecutionduration | eq, ne, gt, lt, ge, le |
| constructorDuration | Constructor Duration (ms) | number | performanceconstructorduration | eq, ne, gt, lt, ge, le, null, notnull |
| executionStartTime | Execution Start Time | date | performanceexecutionstarttime | eq, ne, gt, lt, ge, le, null, notnull |
| constructorStartTime | Constructor Start Time | date | performanceconstructorstarttime | eq, ne, gt, lt, ge, le, null, notnull |
| exceptionDetails | Exception Details | text | exceptiondetails | eq, ne, contains, startswith, endswith, null, notnull |
| messageBlock | Message Block | text | messageblock | eq, ne, contains, startswith, endswith, null, notnull |
| configuration | Configuration | text | configuration | eq, ne, contains, startswith, endswith, null, notnull |
| secureConfiguration | Secure Configuration | text | secureconfiguration | eq, ne, contains, startswith, endswith, null, notnull |
| correlationId | Correlation ID | text | correlationid | eq, ne, contains, startswith, endswith, null, notnull |
| requestId | Request ID | text | requestid | eq, ne, contains, startswith, endswith, null, notnull |
| pluginStepId | Plugin Step ID | text | pluginstepid | eq, ne, contains, startswith, endswith, null, notnull |
| persistenceKey | Persistence Key | text | persistencekey | eq, ne, contains, startswith, endswith, null, notnull |
| organizationId | Organization ID | text | organizationid | eq, ne, contains, startswith, endswith, null, notnull |
| profile | Profile | text | profile | eq, ne, contains, startswith, endswith, null, notnull |
| isSystemCreated | System Created | boolean | issystemcreated | eq, ne, null, notnull |
| createdBy | Created By | text | _createdby_value | eq, ne, contains, startswith, endswith, null, notnull |
| createdOnBehalfBy | Created On Behalf By | text | _createdonbehalfby_value | eq, ne, contains, startswith, endswith, null, notnull |

**Remove Synthetic Fields:**
- Delete "Status" from FilterField enum
- Add real "Exception Details" field instead
- Users can now search exception text: `Exception Details contains "NullReference"`
- Or use quick filter checkbox for "Has Exception" / "Success Only"

#### 3. OData Query Preview Panel

**Design:**
```
┌─────────────────────────────────────────────────────────┐
│ ▼ Show Generated OData Query                           │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ $filter=exceptiondetails ne null and createdon ge   │ │
│ │ 2025-01-17T12:00:00Z&$orderby=createdon desc&$top=  │ │
│ │ 100                                      📋 Copy    │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**Features:**
- Collapsible section (collapsed by default, expands with ▼)
- Shows complete OData query string as it would be sent to Dataverse
- Read-only, monospace font
- Copy button for easy paste into Postman/browser
- Updates in real-time as filters change
- Helps developers understand exactly what's being queried

---

## Architecture Changes

### Domain Layer Changes

#### FilterField Value Object (MAJOR REFACTOR)

**Current:** Manual enum with 9 hardcoded fields
**New:** Dynamic generation from PluginTrace entity

**File:** `src/features/pluginTraceViewer/domain/valueObjects/FilterField.ts`

**Option A: Keep Enum, Expand to 26 Fields**
```typescript
export enum FilterField {
  Id = 'id',
  CreatedOn = 'createdon',
  PluginName = 'pluginname',
  EntityName = 'entityname',
  MessageName = 'messagename',
  OperationType = 'operationtype',
  Mode = 'mode',
  Stage = 'stage',
  Depth = 'depth',
  Duration = 'duration',
  ConstructorDuration = 'constructorduration',
  ExecutionStartTime = 'executionstarttime',
  ConstructorStartTime = 'constructorstarttime',
  ExceptionDetails = 'exceptiondetails', // NEW - replaces Status
  MessageBlock = 'messageblock',
  Configuration = 'configuration',
  SecureConfiguration = 'secureconfiguration',
  CorrelationId = 'correlationid',
  RequestId = 'requestid',
  PluginStepId = 'pluginstepid',
  PersistenceKey = 'persistencekey',
  OrganizationId = 'organizationid',
  Profile = 'profile',
  IsSystemCreated = 'issystemcreated',
  CreatedBy = 'createdby',
  CreatedOnBehalfBy = 'createdonbehalfby',
}
```

**Option B: Dynamic Metadata (Preferred)**
```typescript
export interface FilterFieldMetadata {
  readonly propertyName: keyof PluginTrace;
  readonly displayName: string;
  readonly odataFieldName: string;
  readonly fieldType: FieldType;
  readonly isNullable: boolean;
  readonly enumValues?: readonly { value: unknown; label: string }[];
}

export class FilterField {
  private static readonly FIELD_METADATA: readonly FilterFieldMetadata[] = [
    {
      propertyName: 'id',
      displayName: 'Trace ID',
      odataFieldName: 'plugintracelogid',
      fieldType: FieldType.Text,
      isNullable: false,
    },
    {
      propertyName: 'exceptionDetails',
      displayName: 'Exception Details',
      odataFieldName: 'exceptiondetails',
      fieldType: FieldType.Text,
      isNullable: true,
    },
    // ... all 26 fields
  ];

  public static getAllFields(): readonly FilterFieldMetadata[] {
    return this.FIELD_METADATA;
  }

  public static getFieldByPropertyName(
    propertyName: keyof PluginTrace
  ): FilterFieldMetadata | undefined {
    return this.FIELD_METADATA.find(f => f.propertyName === propertyName);
  }
}
```

#### FilterOperator Value Object (ADD NULL OPERATORS)

**File:** `src/features/pluginTraceViewer/domain/valueObjects/FilterOperator.ts`

Add new operators:
```typescript
export enum FilterOperator {
  // ... existing operators
  IsNull = 'isnull',
  IsNotNull = 'isnotnull',
}

export class FilterOperatorHelper {
  public static isApplicableToFieldType(
    operator: FilterOperator,
    fieldType: FieldType
  ): boolean {
    switch (operator) {
      case FilterOperator.IsNull:
      case FilterOperator.IsNotNull:
        return true; // Applicable to ALL nullable fields
      // ... existing logic
    }
  }
}
```

#### ODataExpressionBuilder (REMOVE STATUS LOGIC, ADD NULL OPERATORS)

**File:** `src/features/pluginTraceViewer/domain/services/ODataExpressionBuilder.ts`

**Remove lines 46-67:** Special handling for Status field
**Add:** Null operator handling

```typescript
private buildExpression(condition: FilterCondition): string {
  const field = condition.getField();
  const operator = condition.getOperator();
  const value = condition.getValue();

  // NEW: Handle null operators
  if (operator === FilterOperator.IsNull) {
    return `${field.getODataFieldName()} eq null`;
  }
  if (operator === FilterOperator.IsNotNull) {
    return `${field.getODataFieldName()} ne null`;
  }

  // REMOVE: Special Status handling (lines 46-67)
  // All fields now use standard OData operators

  // Existing operator handling...
}
```

### Presentation Layer Changes

#### FilterPanelSection (ADD ODATA PREVIEW, UPDATE FIELDS)

**File:** `src/features/pluginTraceViewer/presentation/sections/FilterPanelSection.ts`

**Add method:**
```typescript
private renderODataPreview(odataQuery: string): string {
  return `
    <div class="odata-preview-section">
      <details class="odata-preview-details">
        <summary class="odata-preview-summary">
          <span class="codicon codicon-code"></span>
          Show Generated OData Query
        </summary>
        <div class="odata-preview-content">
          <pre class="odata-query-text">${this.escapeHtml(odataQuery)}</pre>
          <button
            class="copy-query-button"
            data-command="copyODataQuery"
            title="Copy to clipboard"
          >
            <span class="codicon codicon-copy"></span>
            Copy
          </button>
        </div>
      </details>
    </div>
  `;
}
```

**Update render method:**
```typescript
public render(viewModel: FilterPanelViewModel): string {
  return `
    <div class="filter-panel">
      ${this.renderQuickFilters(viewModel.quickFilters)}
      ${this.renderAdvancedBuilder(viewModel.conditions)}
      ${this.renderODataPreview(viewModel.odataQuery)}
      ${this.renderActions()}
    </div>
  `;
}
```

**Update field dropdown:**
```typescript
private renderFieldSelect(selectedField: string): string {
  const fields = FilterField.getAllFields(); // Dynamic from domain

  return `
    <select class="field-select">
      <option value="">Select field...</option>
      ${fields.map(field => `
        <option
          value="${field.propertyName}"
          ${field.propertyName === selectedField ? 'selected' : ''}
        >
          ${field.displayName}
        </option>
      `).join('')}
    </select>
  `;
}
```

#### Quick Filters Section (NEW RENDERING)

**Add method:**
```typescript
private renderQuickFilters(quickFilters: QuickFilterViewModel[]): string {
  if (!quickFilters || quickFilters.length === 0) {
    return '';
  }

  return `
    <div class="quick-filters-section">
      <div class="section-header">Quick Filters</div>
      <div class="quick-filter-list">
        ${quickFilters.map(qf => this.renderQuickFilter(qf)).join('')}
      </div>
    </div>
  `;
}

private renderQuickFilter(filter: QuickFilterViewModel): string {
  return `
    <label class="quick-filter-item ${filter.isActive ? 'active' : ''}">
      <input
        type="checkbox"
        class="quick-filter-checkbox"
        data-filter-id="${filter.id}"
        ${filter.isActive ? 'checked' : ''}
      />
      <span class="quick-filter-label">${this.escapeHtml(filter.label)}</span>
      <span class="quick-filter-badge" title="${this.escapeHtml(filter.tooltip)}">
        ${this.escapeHtml(filter.odataField)}
      </span>
    </label>
  `;
}
```

### Webview Layer Changes (TypeScript Behaviors)

**File:** `src/features/pluginTraceViewer/presentation/behaviors/PluginTraceViewerBehavior.ts` (NEW - migrated from .js)

**Quick Filter Change Handler (REFACTORED):**
```typescript
private handleQuickFilterChange(event: Event): void {
  const checkbox = event.target as HTMLInputElement;
  const filterId = checkbox.dataset.filterId;

  if (!filterId) return;

  if (checkbox.checked) {
    this.activeQuickFilters.add(filterId);
  } else {
    this.activeQuickFilters.delete(filterId);
  }

  // Update filter count badge
  this.updateFilterCount();

  // Auto-apply filters
  this.applyFilters();
}
```

**Apply Filters (UPDATED TO SEND QUICK FILTER IDS):**
```typescript
private applyFilters(): void {
  const advancedConditions = this.collectFilterCriteria();

  this.sendMessage({
    command: 'applyFilters',
    data: {
      quickFilterIds: Array.from(this.activeQuickFilters),
      advancedConditions: advancedConditions,
    },
  });
}
```

**Copy OData Query (NEW):**
```typescript
private handleCopyODataQuery(): void {
  const queryText = this.element.querySelector('.odata-query-text')?.textContent;

  if (!queryText) return;

  navigator.clipboard.writeText(queryText).then(
    () => {
      this.showCopyConfirmation();
    },
    (err) => {
      console.error('Failed to copy query:', err);
    }
  );
}

private showCopyConfirmation(): void {
  const button = this.element.querySelector('.copy-query-button');
  if (!button) return;

  const originalHtml = button.innerHTML;
  button.innerHTML = '<span class="codicon codicon-check"></span> Copied!';

  setTimeout(() => {
    button.innerHTML = originalHtml;
  }, 2000);
}
```

### Panel Layer Changes

**File:** `src/features/pluginTraceViewer/presentation/panels/PluginTraceViewerPanelComposed.ts`

**Apply Filters Handler (UPDATED):**
```typescript
private async handleApplyFilters(message: WebviewMessage): Promise<void> {
  const { quickFilterIds, advancedConditions } = message.data;

  // Convert quick filter IDs to conditions
  const quickFilterConditions = this.expandQuickFilters(quickFilterIds);

  // Merge with advanced conditions
  const allConditions = [...quickFilterConditions, ...advancedConditions];

  // Create filter criteria
  const filterCriteria = FilterCriteriaMapper.toDomain({
    conditions: allConditions,
    top: this.state.top,
  });

  // Apply and refresh
  await this.applyFiltersAndRefresh(filterCriteria);
}

private expandQuickFilters(filterIds: string[]): FilterConditionViewModel[] {
  const conditions: FilterConditionViewModel[] = [];

  for (const id of filterIds) {
    const quickFilter = QUICK_FILTER_DEFINITIONS.find(qf => qf.id === id);
    if (quickFilter) {
      conditions.push(...quickFilter.conditions);
    }
  }

  return conditions;
}
```

**Quick Filter Definitions (NEW CONSTANT):**
```typescript
const QUICK_FILTER_DEFINITIONS: QuickFilterDefinition[] = [
  {
    id: 'exceptions',
    label: 'Exceptions',
    odataField: 'exceptiondetails',
    tooltip: 'exceptiondetails ne null',
    conditions: [
      {
        id: crypto.randomUUID(),
        enabled: true,
        field: 'exceptionDetails',
        operator: 'isnotnull',
        value: '',
        logicalOperator: 'and',
      },
    ],
  },
  {
    id: 'success',
    label: 'Success Only',
    odataField: 'exceptiondetails',
    tooltip: 'exceptiondetails eq null',
    conditions: [
      {
        id: crypto.randomUUID(),
        enabled: true,
        field: 'exceptionDetails',
        operator: 'isnull',
        value: '',
        logicalOperator: 'and',
      },
    ],
  },
  {
    id: 'lastHour',
    label: 'Last Hour',
    odataField: 'createdon',
    tooltip: 'createdon ge {now - 1 hour}',
    conditions: [
      {
        id: crypto.randomUUID(),
        enabled: true,
        field: 'createdOn',
        operator: 'greaterthanorequal',
        value: () => new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        logicalOperator: 'and',
      },
    ],
  },
  // ... more quick filters
];
```

---

## Type Contracts

### New ViewModels

**QuickFilterViewModel:**
```typescript
export interface QuickFilterViewModel {
  readonly id: string;
  readonly label: string;
  readonly odataField: string;
  readonly tooltip: string;
  readonly isActive: boolean;
}
```

**QuickFilterDefinition:**
```typescript
export interface QuickFilterDefinition {
  readonly id: string;
  readonly label: string;
  readonly odataField: string;
  readonly tooltip: string;
  readonly conditions: readonly FilterConditionViewModel[];
}
```

**FilterPanelViewModel (UPDATED):**
```typescript
export interface FilterPanelViewModel {
  readonly quickFilters: readonly QuickFilterViewModel[];
  readonly conditions: readonly FilterConditionViewModel[];
  readonly odataQuery: string; // NEW - for preview
  readonly activeFilterCount: number;
}
```

### Updated Domain Types

**FieldType (ADD BOOLEAN):**
```typescript
export enum FieldType {
  Text = 'text',
  Number = 'number',
  Date = 'date',
  Enum = 'enum',
  Boolean = 'boolean', // NEW
}
```

---

## Implementation Phases

### Phase 1: Backend Foundation (Domain & Infrastructure)
**No behavior file changes - safe to implement during TS refactoring**

**Tasks:**
1. Update `FilterField.ts` to include all 26 properties
2. Remove synthetic "Status" field
3. Add "Exception Details" field
4. Update `FilterOperator.ts` to add `IsNull` and `IsNotNull`
5. Update `ODataExpressionBuilder.ts`:
   - Remove Status special handling
   - Add null operator handling
6. Add tests for new fields and operators
7. Run `npm run compile` to verify

**Files modified:**
- `src/features/pluginTraceViewer/domain/valueObjects/FilterField.ts`
- `src/features/pluginTraceViewer/domain/valueObjects/FilterOperator.ts`
- `src/features/pluginTraceViewer/domain/services/ODataExpressionBuilder.ts`
- `src/features/pluginTraceViewer/domain/entities/__tests__/FilterCondition.test.ts`

**Validation:**
- All existing tests pass
- TypeScript compilation succeeds
- No runtime changes (UX still works with existing fields)

### Phase 2: Quick Filters UX (After TS Behavior Refactoring)
**Requires TypeScript behaviors to be complete**

**Tasks:**
1. Create `QuickFilterDefinition` constants in panel
2. Add quick filter ViewModels and mappers
3. Update `FilterPanelSection.ts` to render toggle checkboxes
4. Update behavior to handle checkbox state
5. Update panel to expand quick filter IDs to conditions
6. Add CSS for checkbox styling
7. Manual testing of quick filter toggles

**Files modified:**
- `src/features/pluginTraceViewer/presentation/panels/PluginTraceViewerPanelComposed.ts`
- `src/features/pluginTraceViewer/presentation/sections/FilterPanelSection.ts`
- `src/features/pluginTraceViewer/presentation/behaviors/PluginTraceViewerBehavior.ts`
- `resources/webview/css/sections/filter-panel.css`

**Validation:**
- Quick filters toggle on/off without duplicates
- Checkbox state persists with panel state
- Visual feedback works (active highlighting)

### Phase 3: OData Preview & Polish
**Final transparency features**

**Tasks:**
1. Add OData query generation to ViewModel mapper
2. Update `FilterPanelSection.ts` to render preview panel
3. Add copy-to-clipboard functionality in behavior
4. Add tooltips showing complete conditions on quick filters
5. Add field type badges in advanced builder
6. CSS polish for preview panel
7. Manual testing of copy functionality

**Files modified:**
- `src/features/pluginTraceViewer/presentation/mappers/FilterCriteriaMapper.ts`
- `src/features/pluginTraceViewer/presentation/sections/FilterPanelSection.ts`
- `src/features/pluginTraceViewer/presentation/behaviors/PluginTraceViewerBehavior.ts`
- `resources/webview/css/sections/filter-panel.css`

**Validation:**
- OData preview shows correct query
- Copy button works
- Preview updates in real-time as filters change
- Tooltips display correct OData conditions

### Phase 4: Testing & Documentation

**Tasks:**
1. Write domain tests for all 26 filter fields
2. Write integration tests for filter scenarios
3. Update user documentation
4. Manual test all filter combinations
5. Test with real Dataverse environment

**Test Scenarios:**
- Filter by exception details text (new capability)
- Filter by depth > 1 (recursive calls)
- Filter by stage (pipeline filtering)
- Combine quick filters + advanced filters
- Null operator handling for nullable fields
- Copy OData query and execute in browser/Postman

---

## Migration Strategy

**No migration required** - This feature is pre-production.

**Breaking Changes:**
1. Saved filters with "Status" field will need to be manually recreated
2. Users will need to understand new quick filter toggle behavior vs. old button behavior

**User Communication:**
- Add release note explaining new filter capabilities
- Document that "Status" is now "Exception Details" with more operators
- Provide examples of new filtering capabilities (depth, stage, etc.)

---

## Testing Approach

### Domain Layer Tests

**FilterField Tests:**
```typescript
describe('FilterField', () => {
  it('should provide all 26 PluginTrace properties', () => {
    const fields = FilterField.getAllFields();
    expect(fields).toHaveLength(26);
  });

  it('should map exceptionDetails to exceptiondetails OData field', () => {
    const field = FilterField.getFieldByPropertyName('exceptionDetails');
    expect(field?.odataFieldName).toBe('exceptiondetails');
  });

  it('should mark nullable fields correctly', () => {
    const entityName = FilterField.getFieldByPropertyName('entityName');
    expect(entityName?.isNullable).toBe(true);
  });
});
```

**FilterOperator Tests:**
```typescript
describe('FilterOperator - Null Operators', () => {
  it('should support IsNull operator for nullable fields', () => {
    const applicable = FilterOperatorHelper.isApplicableToFieldType(
      FilterOperator.IsNull,
      FieldType.Text
    );
    expect(applicable).toBe(true);
  });

  it('should support IsNotNull operator for all field types', () => {
    expect(
      FilterOperatorHelper.isApplicableToFieldType(
        FilterOperator.IsNotNull,
        FieldType.Text
      )
    ).toBe(true);
    expect(
      FilterOperatorHelper.isApplicableToFieldType(
        FilterOperator.IsNotNull,
        FieldType.Number
      )
    ).toBe(true);
  });
});
```

**ODataExpressionBuilder Tests:**
```typescript
describe('ODataExpressionBuilder - Exception Details', () => {
  it('should build correct expression for exception details contains', () => {
    const condition = FilterCondition.create({
      field: 'exceptionDetails',
      operator: FilterOperator.Contains,
      value: 'NullReference',
    });

    const expression = builder.build(condition);
    expect(expression).toBe("contains(exceptiondetails, 'NullReference')");
  });

  it('should build correct expression for IsNull operator', () => {
    const condition = FilterCondition.create({
      field: 'exceptionDetails',
      operator: FilterOperator.IsNull,
      value: '',
    });

    const expression = builder.build(condition);
    expect(expression).toBe('exceptiondetails eq null');
  });

  it('should no longer support synthetic Status field', () => {
    expect(() => {
      FilterCondition.create({
        field: 'status', // OLD field
        operator: FilterOperator.Equals,
        value: 'Exception',
      });
    }).toThrow();
  });
});
```

### Integration Tests

**Filter Scenario Tests:**
```typescript
describe('Plugin Trace Filtering - Integration', () => {
  it('should filter recursive plugin calls (depth > 1)', async () => {
    const criteria = TraceFilter.create({
      conditions: [
        FilterCondition.create({
          field: 'depth',
          operator: FilterOperator.GreaterThan,
          value: '1',
        }),
      ],
    });

    const query = queryBuilder.build(criteria);
    expect(query).toContain('depth gt 1');
  });

  it('should filter by exception text content', async () => {
    const criteria = TraceFilter.create({
      conditions: [
        FilterCondition.create({
          field: 'exceptionDetails',
          operator: FilterOperator.Contains,
          value: 'Object reference not set',
        }),
      ],
    });

    const query = queryBuilder.build(criteria);
    expect(query).toContain(
      "contains(exceptiondetails, 'Object reference not set')"
    );
  });

  it('should combine quick filter + advanced filter', async () => {
    const quickFilterConditions = [
      /* Exceptions quick filter */
      FilterCondition.create({
        field: 'exceptionDetails',
        operator: FilterOperator.IsNotNull,
        value: '',
      }),
    ];

    const advancedConditions = [
      FilterCondition.create({
        field: 'messageName',
        operator: FilterOperator.Equals,
        value: 'Update',
      }),
    ];

    const criteria = TraceFilter.create({
      conditions: [...quickFilterConditions, ...advancedConditions],
    });

    const query = queryBuilder.build(criteria);
    expect(query).toContain('exceptiondetails ne null');
    expect(query).toContain("messagename eq 'Update'");
  });
});
```

### Manual Test Scenarios

**Scenario 1: Exception Text Search**
1. Click "Exceptions" quick filter checkbox
2. Add advanced condition: `Exception Details contains "NullReference"`
3. Apply filters
4. Verify only traces with "NullReference" in exception text are shown
5. Check OData preview shows both conditions

**Scenario 2: Recursive Plugin Detection**
1. Add condition: `Depth > 1`
2. Apply filters
3. Verify only recursive plugin calls are shown
4. Copy OData query and verify in browser

**Scenario 3: Quick Filter Toggle**
1. Check "Last Hour" checkbox
2. Verify recent traces are shown
3. Uncheck "Last Hour" checkbox
4. Verify all traces are shown again
5. Check both "Exceptions" and "Last Hour"
6. Verify both filters are applied

**Scenario 4: Null Handling**
1. Add condition: `Entity Name is null`
2. Apply filters
3. Verify only traces with no entity name are shown

---

## Success Metrics

**Transparency:**
- ✅ Users can see actual OData field names in UI
- ✅ Users can copy and execute OData queries directly
- ✅ No synthetic fields hiding real API structure

**Coverage:**
- ✅ All 26 PluginTrace properties are filterable
- ✅ All appropriate operators for each field type
- ✅ Null operators for nullable fields

**Usability:**
- ✅ Quick filters have clear on/off state (no confusion)
- ✅ No duplicate filters from multiple clicks
- ✅ Advanced builder supports power user scenarios
- ✅ Tooltips explain OData conditions

**Performance:**
- ✅ No degradation from current implementation
- ✅ Dynamic field generation doesn't impact render time

---

## Future Enhancements (Out of Scope)

1. **Saved Filter Presets** - Allow users to save custom filter combinations
2. **Filter History** - Recent filters dropdown
3. **Natural Language Filters** - "Show me exceptions in the last hour"
4. **Filter Templates** - Share filters between users
5. **Field Autocomplete** - Suggest values based on existing trace data
6. **Regex Support** - Advanced text matching
7. **Filter Import/Export** - JSON format for sharing

---

## Open Questions

1. **Field Ordering:** Should fields be alphabetical or grouped by category (Core, Performance, Details, Audit)?
2. **Field Visibility:** Should we hide extremely technical fields (like `persistenceKey`) by default with "Show Advanced" toggle?
3. **Boolean Field UI:** Checkboxes, dropdown, or operator-based (Equals True/False)?
4. **Date Relative Filters:** Should we support "Last N hours/days" as a special date operator?
5. **Performance:** Should we lazy-load large text field filtering (like `profile`, `messageBlock`)?

---

## References

- Current Implementation: `src/features/pluginTraceViewer/presentation/sections/FilterPanelSection.ts`
- Old Implementation: `TEMP/src/components/panels/FilterPanel/`
- Domain Entity: `src/features/pluginTraceViewer/domain/entities/PluginTrace.ts`
- OData Spec: https://www.odata.org/documentation/odata-version-2-0/uri-conventions/
- VS Code Webview API: https://code.visualstudio.com/api/extension-guides/webview

---

**Ready for implementation after TypeScript behavior refactoring is complete.**
