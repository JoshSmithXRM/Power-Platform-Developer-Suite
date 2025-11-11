# DateTime Filter Architecture Design

## Business Value

**Problem:** Date filtering has manual timezone conversions scattered across 3 layers (webview JS, domain TypeScript, storage), making it error-prone and not reusable. Other features (Metadata Browser, future features) will need date filters and face the same problems.

**Solution:** Centralize datetime handling using Clean Architecture patterns - create a DateTimeFilter value object in the domain layer that encapsulates all datetime business rules, and use mappers at layer boundaries to handle format conversions transparently.

**Value:** Eliminates error-prone manual conversions, makes datetime filtering reusable across all features, enforces consistent timezone handling, and maintains layer separation (domain doesn't know about HTML inputs, webview doesn't know about OData format requirements).

---

## Complexity Assessment

**Complexity:** Moderate

**Rationale:**
- Involves 4 layers (domain value object, infrastructure formatting, presentation conversion, webview handling)
- Requires careful timezone handling (local to UTC conversions)
- Must be backwards-compatible with existing storage
- Creates reusable pattern for all future date filters
- No new external dependencies or UI changes

---

## Current Problems (Architecture Smells)

### Problem 1: Manual Conversion at Webview Layer
```javascript
// PluginTraceViewerBehavior.js:354
// Webview knows about UTC/ISO format requirements (infrastructure concern)
if (valueInput && valueInput.type === 'datetime-local' && value) {
    value = convertLocalDateTimeToUTC(value); // ❌ Manual conversion
}
```

### Problem 2: Manual Formatting at Domain Layer
```typescript
// ODataExpressionBuilder.ts:96
// Domain service has OData-specific formatting (infrastructure concern)
private formatDateForOData(dateValue: string): string {
    if (dateValue.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)) {
        formattedDate = `${dateValue}:00`; // ❌ Add seconds
    }
    return `${formattedDate}Z`; // ❌ Add timezone
}
```

### Problem 3: Manual Restoration at Webview Layer
```javascript
// PluginTraceViewerBehavior.js:879
// Webview manually converts UTC back to local
const localValue = value ? convertUTCToLocalDateTime(value) : ''; // ❌ Manual conversion
```

### Root Causes
1. **No domain concept** - No value object representing "a filter date"
2. **Format knowledge scattered** - 3 layers know about datetime formats
3. **Not reusable** - Every feature needs date filters will duplicate this logic
4. **Violates SRP** - Webview behavior shouldn't know UTC conversion logic

---

## Architecture Design

### Key Insight: Three Distinct Datetime Representations

There are **three formats** representing the **same logical concept** (a point in time for filtering):

1. **User's Local Time** (Presentation Layer)
   - Format: `"2025-11-10T16:46"` (HTML datetime-local)
   - Meaning: "4:46 PM on Nov 10th in user's timezone"
   - Used by: HTML inputs, user display

2. **Canonical UTC Time** (Domain & Application Layers)
   - Format: `"2025-11-11T00:46:00.000Z"` (ISO 8601 UTC)
   - Meaning: "Midnight 46 minutes on Nov 11th UTC" (same instant as above if user is PST)
   - Used by: Domain logic, storage, inter-layer communication

3. **OData Query Format** (Infrastructure Layer)
   - Format: `2025-11-11T00:46:00Z` (ISO 8601 UTC, no milliseconds)
   - Meaning: Same instant, formatted for Dataverse OData API requirements
   - Used by: HTTP query strings to Dataverse

**Strategy:**
- Domain uses **canonical UTC** (format 2) internally
- Mappers at layer boundaries handle conversions transparently
- Each layer only knows its own format

---

### Domain Layer: DateTimeFilter Value Object

**Responsibility:** Encapsulate datetime filtering business rules and provide UTC canonical representation.

```typescript
// src/shared/domain/valueObjects/DateTimeFilter.ts

/**
 * Domain Value Object: DateTime Filter
 *
 * Represents a point in time for filtering queries.
 * Immutable, validated, timezone-aware.
 *
 * Business Rules:
 * - Always stored internally as UTC ISO 8601
 * - Provides canonical representation for domain/application layers
 * - Validates datetime is valid (not NaN, not future if required)
 * - Immutable - create new instance for changes
 *
 * Format: ISO 8601 UTC with milliseconds (e.g., "2025-11-11T00:46:00.000Z")
 *
 * This is the CANONICAL format used by:
 * - Domain entities (FilterCondition.value)
 * - Application layer (use cases, ViewModels)
 * - Storage (persisted filters)
 *
 * Layer boundaries use mappers to convert:
 * - Presentation → Domain: Local HTML datetime-local → UTC ISO
 * - Domain → Infrastructure: UTC ISO → OData format (no milliseconds)
 */
export class DateTimeFilter {
    private readonly utcIsoString: string;

    /**
     * Private constructor - use factory methods.
     * Ensures value is always valid ISO 8601 UTC.
     */
    private constructor(utcIsoString: string) {
        this.validateIsoFormat(utcIsoString);
        this.utcIsoString = utcIsoString;
    }

    /**
     * Creates from UTC ISO 8601 string.
     * Used by: Domain layer, storage restoration.
     *
     * @param utcIsoString - UTC datetime in ISO 8601 format (e.g., "2025-11-11T00:46:00.000Z")
     * @throws ValidationError if format invalid or date invalid
     */
    public static fromUtcIso(utcIsoString: string): DateTimeFilter {
        return new DateTimeFilter(utcIsoString);
    }

    /**
     * Creates from user's local datetime (HTML datetime-local format).
     * Used by: Presentation layer mapper when collecting from webview.
     *
     * Converts local time to UTC automatically.
     *
     * @param localDateTime - Local datetime string from HTML input (e.g., "2025-11-10T16:46")
     * @throws ValidationError if format invalid or date invalid
     *
     * @example
     * // User in PST enters "2025-11-10T16:46"
     * const filter = DateTimeFilter.fromLocalDateTime("2025-11-10T16:46");
     * filter.toUtcIso() // "2025-11-11T00:46:00.000Z"
     */
    public static fromLocalDateTime(localDateTime: string): DateTimeFilter {
        // Parse as local time, convert to UTC
        const date = new Date(localDateTime);

        if (isNaN(date.getTime())) {
            throw new ValidationError(
                'DateTimeFilter',
                'localDateTime',
                localDateTime,
                'Invalid datetime format. Expected "YYYY-MM-DDTHH:MM"'
            );
        }

        return new DateTimeFilter(date.toISOString());
    }

    /**
     * Gets UTC ISO 8601 representation (canonical format).
     * Used by: Domain, application, and storage layers.
     *
     * @returns UTC ISO string with milliseconds (e.g., "2025-11-11T00:46:00.000Z")
     */
    public toUtcIso(): string {
        return this.utcIsoString;
    }

    /**
     * Converts to local datetime format for HTML datetime-local inputs.
     * Used by: Presentation layer when restoring filter from storage.
     *
     * @returns Local datetime string (e.g., "2025-11-10T16:46")
     *
     * @example
     * const filter = DateTimeFilter.fromUtcIso("2025-11-11T00:46:00.000Z");
     * filter.toLocalDateTime() // "2025-11-10T16:46" (if user is in PST)
     */
    public toLocalDateTime(): string {
        const date = new Date(this.utcIsoString);

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');

        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    /**
     * Converts to OData query format (infrastructure requirement).
     * Used by: Infrastructure layer (ODataExpressionBuilder).
     *
     * Removes milliseconds and uses 'Z' suffix.
     *
     * @returns OData-compatible datetime (e.g., "2025-11-11T00:46:00Z")
     */
    public toODataFormat(): string {
        // Remove milliseconds: "2025-11-11T00:46:00.000Z" → "2025-11-11T00:46:00Z"
        return this.utcIsoString.replace(/\.\d{3}Z$/, 'Z');
    }

    /**
     * Checks if this datetime is before another.
     * Used by: Domain validation (e.g., startDate must be before endDate).
     */
    public isBefore(other: DateTimeFilter): boolean {
        return new Date(this.utcIsoString) < new Date(other.utcIsoString);
    }

    /**
     * Checks if this datetime is after another.
     * Used by: Domain validation.
     */
    public isAfter(other: DateTimeFilter): boolean {
        return new Date(this.utcIsoString) > new Date(other.utcIsoString);
    }

    /**
     * Gets the underlying Date object.
     * Used by: Domain calculations (rare - prefer value object methods).
     */
    public toDate(): Date {
        return new Date(this.utcIsoString);
    }

    /**
     * Validates ISO 8601 format and datetime validity.
     * Throws if invalid.
     */
    private validateIsoFormat(isoString: string): void {
        // Check basic ISO 8601 format
        const isoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
        if (!isoPattern.test(isoString)) {
            throw new ValidationError(
                'DateTimeFilter',
                'utcIsoString',
                isoString,
                'Invalid UTC ISO 8601 format. Expected "YYYY-MM-DDTHH:MM:SS.sssZ"'
            );
        }

        // Validate date is valid (not NaN)
        const date = new Date(isoString);
        if (isNaN(date.getTime())) {
            throw new ValidationError(
                'DateTimeFilter',
                'utcIsoString',
                isoString,
                'Invalid datetime value'
            );
        }
    }

    /**
     * Value object equality - compare by value, not reference.
     */
    public equals(other: DateTimeFilter): boolean {
        return this.utcIsoString === other.utcIsoString;
    }

    /**
     * String representation for debugging.
     */
    public toString(): string {
        return this.utcIsoString;
    }
}
```

---

### Domain Layer: FilterCondition Changes

**Change:** FilterCondition.value stays as `string`, but datetime values are always in UTC ISO format.

**Why not change to `DateTimeFilter` type?**
- FilterCondition handles multiple value types (text, number, date, enum)
- Keeping value as `string` maintains consistency
- DateTimeFilter is used at layer boundaries for conversion

```typescript
// src/features/pluginTraceViewer/domain/entities/FilterCondition.ts
// NO CHANGES TO ENTITY - value remains string
// DateTimeFilter is used in MAPPERS at layer boundaries

export class FilterCondition {
    constructor(
        public readonly field: FilterField,
        public readonly operator: FilterOperator,
        public readonly value: string, // ✅ Still string (UTC ISO for dates)
        public readonly enabled: boolean = true,
        public readonly logicalOperator: 'and' | 'or' = 'and'
    ) {
        this.validateInvariants();
    }
    // ... rest unchanged
}
```

---

### Infrastructure Layer: ODataExpressionBuilder Changes

**Change:** Use DateTimeFilter to format dates for OData queries.

```typescript
// src/features/pluginTraceViewer/domain/services/ODataExpressionBuilder.ts

import { DateTimeFilter } from '../../../../shared/domain/valueObjects/DateTimeFilter';

export class ODataExpressionBuilder {
    /**
     * Formats value for OData query based on field type.
     */
    private formatValue(value: string, fieldType: string): string {
        if (fieldType === 'date') {
            // ✅ Use DateTimeFilter to handle OData formatting
            const dateFilter = DateTimeFilter.fromUtcIso(value);
            return dateFilter.toODataFormat(); // "2025-11-11T00:46:00Z"
        }

        if (fieldType === 'text' || fieldType === 'enum') {
            return this.escapeAndQuote(value);
        }

        // Number - no formatting needed
        return value;
    }

    // ❌ REMOVE: formatDateForOData method (no longer needed)
}
```

---

### Presentation Layer: Message Handler Changes

**Change:** Use DateTimeFilter in mapper to convert webview data to domain format.

```typescript
// src/features/pluginTraceViewer/presentation/panels/PluginTraceViewerPanelComposed.ts

import { DateTimeFilter } from '../../../../shared/domain/valueObjects/DateTimeFilter';

export class PluginTraceViewerPanelComposed {
    private async handleApplyFilter(message: { filters: WebviewFilterData }): Promise<void> {
        try {
            // Convert webview data to domain entities
            const filterConditions = message.filters.conditions.map(c =>
                this.mapWebviewConditionToDomain(c)
            );

            // ... rest of handler
        } catch (error) {
            // Handle ValidationError from DateTimeFilter
        }
    }

    /**
     * Maps webview filter condition to domain FilterCondition entity.
     * Handles datetime conversion using DateTimeFilter value object.
     */
    private mapWebviewConditionToDomain(webviewCondition: WebviewCondition): FilterCondition {
        const field = FilterField.fromDisplayName(webviewCondition.field);
        const operator = FilterOperator.fromDisplayName(webviewCondition.operator);

        // ✅ Use DateTimeFilter for datetime values (local → UTC conversion)
        let value = webviewCondition.value;
        if (field.fieldType === 'date' && value) {
            const dateFilter = DateTimeFilter.fromLocalDateTime(value);
            value = dateFilter.toUtcIso(); // Store as canonical UTC ISO
        }

        return FilterCondition.create({
            field,
            operator,
            value,
            enabled: webviewCondition.enabled,
            logicalOperator: webviewCondition.logicalOperator
        });
    }

    /**
     * Maps domain FilterCondition to webview ViewModel for display.
     * Handles datetime conversion using DateTimeFilter value object.
     */
    private mapDomainConditionToWebview(condition: FilterCondition): WebviewConditionViewModel {
        let displayValue = condition.value;

        // ✅ Use DateTimeFilter for datetime values (UTC → local conversion)
        if (condition.field.fieldType === 'date') {
            const dateFilter = DateTimeFilter.fromUtcIso(condition.value);
            displayValue = dateFilter.toLocalDateTime();
        }

        return {
            id: crypto.randomUUID(),
            field: condition.field.displayName,
            operator: condition.operator.displayName,
            value: displayValue,
            enabled: condition.enabled,
            logicalOperator: condition.logicalOperator
        };
    }
}
```

---

### Webview Layer: Remove Manual Conversions

**Change:** Remove all manual datetime conversion functions - let presentation layer handle it.

```javascript
// resources/webview/js/behaviors/PluginTraceViewerBehavior.js

function collectFilterData() {
    const conditionRows = Array.from(document.querySelectorAll('.filter-condition-row'));

    const conditions = conditionRows.map((row, index) => {
        const field = row.querySelector('.condition-field')?.value;
        const operator = row.querySelector('.condition-operator')?.value;
        const enabled = row.querySelector('.condition-enabled')?.checked ?? true;

        // Collect raw value from input
        let value = row.querySelector('.condition-value')?.value?.trim() || '';

        // ✅ REMOVE: Manual datetime conversion (presentation layer handles this now)
        // ❌ const valueInput = row.querySelector('.condition-value');
        // ❌ if (valueInput && valueInput.type === 'datetime-local' && value) {
        // ❌     value = convertLocalDateTimeToUTC(value);
        // ❌ }

        // Get logical operator from previous row
        let logicalOperator = 'and';
        if (index > 0) {
            const prevRow = conditionRows[index - 1];
            logicalOperator = prevRow?.querySelector('.condition-logical-operator')?.value || 'and';
        }

        return { id, enabled, field, operator, value, logicalOperator };
    });

    return {
        conditions,
        top: 100
    };
}

function createInputHtml(fieldName, fieldType, value) {
    switch (fieldType) {
        case 'date':
            // ✅ REMOVE: Manual UTC → local conversion
            // ❌ const localValue = value ? convertUTCToLocalDateTime(value) : '';

            // Value is already in local format (presentation layer converted it)
            return `<input type="datetime-local" class="condition-value" value="${escapeHtml(value)}" />`;

        case 'number':
            const placeholder = fieldName === 'Duration (ms)' ? 'Duration in ms' : 'Enter number...';
            return `<input type="number" class="condition-value" placeholder="${placeholder}" value="${escapeHtml(value)}" min="0" />`;

        case 'text':
        default:
            return `<input type="text" class="condition-value" placeholder="Enter value..." value="${escapeHtml(value)}" />`;
    }
}

// ❌ REMOVE: convertLocalDateTimeToUTC function (no longer needed)
// ❌ REMOVE: convertUTCToLocalDateTime function (no longer needed)
```

---

## Implementation Flow (Inside-Out)

### Flow 1: User Applies Filter (Local → Domain → Infrastructure)

```
User enters local time
  "2025-11-10T16:46"
  ↓
Webview collects raw value
  { value: "2025-11-10T16:46" }
  ↓
Presentation layer mapper (TypeScript)
  DateTimeFilter.fromLocalDateTime("2025-11-10T16:46")
  ↓
Domain entity (canonical UTC)
  FilterCondition.value = "2025-11-11T00:46:00.000Z"
  ↓
Use case executes
  (value stays in UTC ISO)
  ↓
Infrastructure layer (OData formatting)
  DateTimeFilter.fromUtcIso(value).toODataFormat()
  → "2025-11-11T00:46:00Z" (no milliseconds)
  ↓
HTTP query string
  $filter=createdon ge 2025-11-11T00:46:00Z
```

### Flow 2: Restore Filter from Storage (Domain → Presentation)

```
Storage layer
  { value: "2025-11-11T00:46:00.000Z" } (canonical UTC)
  ↓
Domain entity
  FilterCondition.value = "2025-11-11T00:46:00.000Z"
  ↓
Presentation layer mapper
  DateTimeFilter.fromUtcIso(value).toLocalDateTime()
  ↓
Webview ViewModel
  { value: "2025-11-10T16:46" } (local format for HTML input)
  ↓
HTML input displays
  "2025-11-10T16:46" (user's local time)
```

---

## Type Contracts

### Domain Layer

```typescript
// src/shared/domain/valueObjects/DateTimeFilter.ts
export class DateTimeFilter {
    static fromUtcIso(utcIsoString: string): DateTimeFilter;
    static fromLocalDateTime(localDateTime: string): DateTimeFilter;
    toUtcIso(): string;
    toLocalDateTime(): string;
    toODataFormat(): string;
    isBefore(other: DateTimeFilter): boolean;
    isAfter(other: DateTimeFilter): boolean;
    toDate(): Date;
    equals(other: DateTimeFilter): boolean;
}
```

### Presentation Layer

```typescript
// Mapper functions in PluginTraceViewerPanelComposed
interface WebviewCondition {
    field: string;
    operator: string;
    value: string; // Local datetime format for date fields
    enabled: boolean;
    logicalOperator: 'and' | 'or';
}

interface WebviewConditionViewModel {
    id: string;
    field: string;
    operator: string;
    value: string; // Local datetime format for date fields
    enabled: boolean;
    logicalOperator: 'and' | 'or';
}

// Mapper methods
private mapWebviewConditionToDomain(webviewCondition: WebviewCondition): FilterCondition;
private mapDomainConditionToWebview(condition: FilterCondition): WebviewConditionViewModel;
```

---

## Testing Strategy

### Domain Layer Tests (100% Coverage Target)

```typescript
// src/shared/domain/valueObjects/DateTimeFilter.test.ts
describe('DateTimeFilter', () => {
    describe('fromLocalDateTime', () => {
        it('converts local datetime to UTC ISO', () => {
            // Arrange: Mock user in PST (UTC-8)
            const localDateTime = '2025-11-10T16:46';

            // Act
            const filter = DateTimeFilter.fromLocalDateTime(localDateTime);

            // Assert
            expect(filter.toUtcIso()).toBe('2025-11-11T00:46:00.000Z');
        });

        it('throws ValidationError for invalid format', () => {
            expect(() => DateTimeFilter.fromLocalDateTime('invalid'))
                .toThrow(ValidationError);
        });
    });

    describe('fromUtcIso', () => {
        it('accepts valid UTC ISO string', () => {
            const utcIso = '2025-11-11T00:46:00.000Z';
            const filter = DateTimeFilter.fromUtcIso(utcIso);
            expect(filter.toUtcIso()).toBe(utcIso);
        });

        it('throws ValidationError for invalid format', () => {
            expect(() => DateTimeFilter.fromUtcIso('2025-11-10'))
                .toThrow(ValidationError);
        });
    });

    describe('toLocalDateTime', () => {
        it('converts UTC ISO to local datetime format', () => {
            const filter = DateTimeFilter.fromUtcIso('2025-11-11T00:46:00.000Z');
            // Assuming user in PST
            expect(filter.toLocalDateTime()).toBe('2025-11-10T16:46');
        });
    });

    describe('toODataFormat', () => {
        it('removes milliseconds and keeps Z suffix', () => {
            const filter = DateTimeFilter.fromUtcIso('2025-11-11T00:46:00.000Z');
            expect(filter.toODataFormat()).toBe('2025-11-11T00:46:00Z');
        });
    });

    describe('isBefore', () => {
        it('returns true when this is before other', () => {
            const earlier = DateTimeFilter.fromUtcIso('2025-11-10T00:00:00.000Z');
            const later = DateTimeFilter.fromUtcIso('2025-11-11T00:00:00.000Z');
            expect(earlier.isBefore(later)).toBe(true);
        });
    });

    describe('isAfter', () => {
        it('returns true when this is after other', () => {
            const earlier = DateTimeFilter.fromUtcIso('2025-11-10T00:00:00.000Z');
            const later = DateTimeFilter.fromUtcIso('2025-11-11T00:00:00.000Z');
            expect(later.isAfter(earlier)).toBe(true);
        });
    });

    describe('equals', () => {
        it('returns true for same UTC instant', () => {
            const filter1 = DateTimeFilter.fromUtcIso('2025-11-11T00:46:00.000Z');
            const filter2 = DateTimeFilter.fromUtcIso('2025-11-11T00:46:00.000Z');
            expect(filter1.equals(filter2)).toBe(true);
        });
    });
});
```

### Infrastructure Layer Tests

```typescript
// src/features/pluginTraceViewer/domain/services/ODataExpressionBuilder.test.ts
describe('ODataExpressionBuilder - Date Formatting', () => {
    it('formats date values using DateTimeFilter', () => {
        // Arrange
        const condition = FilterCondition.create({
            field: FilterField.CreatedOn,
            operator: FilterOperator.GreaterThanOrEqual,
            value: '2025-11-11T00:46:00.000Z' // UTC ISO (canonical)
        });

        const builder = new ODataExpressionBuilder();

        // Act
        const expression = builder.buildExpression(condition);

        // Assert
        expect(expression).toBe('createdon ge 2025-11-11T00:46:00Z'); // OData format (no milliseconds)
    });
});
```

### Presentation Layer Tests

```typescript
// src/features/pluginTraceViewer/presentation/panels/PluginTraceViewerPanelComposed.test.ts
describe('PluginTraceViewerPanelComposed - DateTime Mapping', () => {
    describe('mapWebviewConditionToDomain', () => {
        it('converts local datetime to UTC ISO', () => {
            // Arrange
            const webviewCondition = {
                field: 'Created On',
                operator: 'After',
                value: '2025-11-10T16:46', // Local datetime-local format
                enabled: true,
                logicalOperator: 'and'
            };

            // Act
            const domainCondition = panel.mapWebviewConditionToDomain(webviewCondition);

            // Assert
            expect(domainCondition.value).toBe('2025-11-11T00:46:00.000Z'); // UTC ISO
        });
    });

    describe('mapDomainConditionToWebview', () => {
        it('converts UTC ISO to local datetime', () => {
            // Arrange
            const domainCondition = FilterCondition.create({
                field: FilterField.CreatedOn,
                operator: FilterOperator.GreaterThanOrEqual,
                value: '2025-11-11T00:46:00.000Z' // UTC ISO
            });

            // Act
            const viewModel = panel.mapDomainConditionToWebview(domainCondition);

            // Assert
            expect(viewModel.value).toBe('2025-11-10T16:46'); // Local format
        });
    });
});
```

---

## Migration Path (Backwards Compatibility)

**Existing storage** already uses UTC ISO format, so no migration needed:
```json
{
  "conditions": [
    {
      "field": "Created On",
      "operator": "After",
      "value": "2025-11-11T00:46:00.000Z"  // ✅ Already UTC ISO (canonical)
    }
  ]
}
```

**No breaking changes:**
- Domain layer still uses string for FilterCondition.value
- Storage format unchanged (UTC ISO)
- Webview API unchanged (still sends/receives local format)
- Only difference: Conversions now explicit via DateTimeFilter value object

---

## Reusability for Future Features

### Other Features Needing Date Filters

**Metadata Browser** (future: filter entities by modified date)
```typescript
// Same pattern - reuse DateTimeFilter
const webviewDate = '2025-11-10T16:46'; // From HTML input
const filter = DateTimeFilter.fromLocalDateTime(webviewDate);
const utcIso = filter.toUtcIso(); // Store/use in domain

// OData query
const odataDate = filter.toODataFormat(); // "2025-11-11T00:46:00Z"
```

**Any feature with date filtering:**
1. Webview collects local datetime
2. Presentation mapper uses `DateTimeFilter.fromLocalDateTime()`
3. Domain stores as UTC ISO string
4. Infrastructure uses `DateTimeFilter.toODataFormat()` for queries
5. Restoration uses `DateTimeFilter.toLocalDateTime()` for display

**Zero duplication - all datetime logic centralized in one value object.**

---

## Benefits of This Design

### 1. Separation of Concerns
- **Domain:** Only knows UTC ISO (canonical format)
- **Presentation:** Knows HTML datetime-local format
- **Infrastructure:** Knows OData format requirements
- **Webview:** Only knows raw user input

### 2. Explicit Conversions
```typescript
// ✅ Explicit and discoverable
const filter = DateTimeFilter.fromLocalDateTime(localTime);
const utcIso = filter.toUtcIso();

// ❌ Before: Implicit and scattered
value = convertLocalDateTimeToUTC(value); // Where does this happen? Who knows!
```

### 3. Single Responsibility
- **DateTimeFilter:** All datetime business logic
- **ODataExpressionBuilder:** Only OData syntax (uses DateTimeFilter for formatting)
- **Webview:** Only UI logic (no timezone knowledge)
- **Presentation Mapper:** Only layer conversion (uses DateTimeFilter for heavy lifting)

### 4. Testability
- Value object fully testable in isolation (no infrastructure)
- Easy to mock in tests
- Clear boundaries between layers

### 5. Reusability
- Any feature needing date filters uses same value object
- Consistent behavior across entire application
- No duplication of timezone logic

### 6. Maintainability
- Change datetime handling in ONE place
- Type safety prevents format errors
- ValidationError provides clear feedback

---

## Open Questions

### Q1: Should we support date-only filters (no time)?
**Answer:** Not in MVP. If needed later, add `DateFilter` value object (date without time).

### Q2: Should we support relative dates ("last 7 days")?
**Answer:** Not in MVP. Current design supports absolute datetimes only.

### Q3: Should DateTimeFilter live in shared/domain or feature-specific?
**Answer:** Shared domain - it's a general concept not specific to plugin traces.

### Q4: Should we validate "no future dates" in DateTimeFilter?
**Answer:** No - that's feature-specific business logic. DateTimeFilter is a general-purpose value object. Add validation in FilterCondition if needed.

---

## Implementation Slices

### Slice 1: MVP - DateTimeFilter Value Object (Domain)
- Create `DateTimeFilter` value object in `src/shared/domain/valueObjects/`
- Factory methods: `fromUtcIso()`, `fromLocalDateTime()`
- Conversion methods: `toUtcIso()`, `toLocalDateTime()`, `toODataFormat()`
- Validation and error handling
- **Tests:** 100% coverage (all methods, edge cases, validation)
- **Compile:** `npm run compile` must pass

### Slice 2: Update Infrastructure Layer
- Refactor `ODataExpressionBuilder.formatValue()` to use `DateTimeFilter.toODataFormat()`
- Remove `formatDateForOData()` private method
- **Tests:** Update existing tests to verify OData format
- **Compile:** `npm run compile` must pass

### Slice 3: Update Presentation Layer
- Add mapper methods in `PluginTraceViewerPanelComposed`
- `mapWebviewConditionToDomain()` - use `DateTimeFilter.fromLocalDateTime()`
- `mapDomainConditionToWebview()` - use `DateTimeFilter.toLocalDateTime()`
- **Tests:** Test both mapping directions
- **Compile:** `npm run compile` must pass

### Slice 4: Update Webview Layer
- Remove `convertLocalDateTimeToUTC()` function
- Remove `convertUTCToLocalDateTime()` function
- Simplify `collectFilterData()` - remove manual conversion
- Simplify `createInputHtml()` - value already in correct format
- **Manual Test:** F5, test filter creation and restoration

### Slice 5: Documentation and Cleanup
- Update code comments
- Add JSDoc examples
- Remove old TODO comments about datetime handling
- **Manual Test:** Full end-to-end test (apply filter, save, reload, verify dates correct)

---

## Success Criteria

**Feature complete when:**
- [ ] DateTimeFilter value object implemented with all methods
- [ ] 100% test coverage on DateTimeFilter
- [ ] ODataExpressionBuilder uses DateTimeFilter (no manual formatting)
- [ ] Presentation layer uses DateTimeFilter for all datetime mappings
- [ ] Webview layer has NO manual datetime conversion logic
- [ ] All tests pass (`npm test`)
- [ ] Code compiles (`npm run compile`)
- [ ] Manual testing confirms filters work correctly:
  - User enters local time → stored as UTC → OData query correct
  - Reload panel → filter restored with correct local time
  - Timezone conversions accurate (test in different timezones if possible)

---

## Code Guardian Checklist

**Before invoking code-guardian, verify:**
- [ ] All 4 layers implemented (domain, infrastructure, presentation, webview)
- [ ] Tests written for domain and application layers
- [ ] Manual testing complete (F5, test filters)
- [ ] `npm test` passes
- [ ] `npm run compile` passes
- [ ] No `eslint-disable` added without approval
- [ ] No anemic domain models (DateTimeFilter has rich behavior)
- [ ] No business logic in use cases (only orchestration)
- [ ] Dependencies point inward (domain has zero external deps)
