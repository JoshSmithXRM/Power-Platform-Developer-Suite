# Data Explorer - Technical Design

**Status:** Draft
**Date:** 2025-11-24
**Complexity:** Complex

---

## Overview

**User Problem:** Developers and administrators need to query Dataverse data quickly without leaving VSCode, but have no IDE-native tool for ad-hoc queries.

**Solution:** Data Explorer panel with SQL-to-FetchXML transpilation and raw FetchXML editing for power users, displaying results in interactive tables with CSV export.

**Value:** Eliminates context switching to browser, provides VSCode editing experience for queries, enables rapid data exploration and debugging.

---

## Requirements

### Functional Requirements
- [ ] Write SQL queries with auto-convert to FetchXML (MVP)
- [ ] View and edit generated FetchXML (MVP)
- [ ] Execute queries against selected environment (MVP)
- [ ] Display results in sortable, searchable data table (MVP)
- [ ] Export results to CSV (MVP)
- [ ] Show query execution time and row count (MVP)
- [ ] Handle query errors with helpful messages (MVP)
- [ ] Support pagination for large result sets (Post-MVP)
- [ ] Visual query builder (Post-MVP)
- [ ] Save queries as UserQuery (Post-MVP)

### Non-Functional Requirements
- [ ] SQL parsing errors show line/column position
- [ ] Query execution <3s for typical 100-row result
- [ ] CSV export handles 10,000+ rows
- [ ] Panel responsive during query execution

### Success Criteria
- [ ] User can write SQL SELECT and see results
- [ ] User can view generated FetchXML
- [ ] User can edit FetchXML directly
- [ ] User can export results to CSV
- [ ] Query errors are actionable (show what's wrong, where)

---

## Implementation Slices (Vertical Slicing)

### MVP Slice (Slice 1): "User can execute simple SQL query"
**Goal:** End-to-end query execution with minimal SQL support

**Domain:** (ALREADY COMPLETE)
- SqlLexer, SqlParser, SqlToFetchXmlTranspiler
- QueryResult entity with row/column value objects
- IDataExplorerQueryRepository interface

**Application:**
- `ExecuteSqlQueryUseCase` - orchestrates parse → transpile → execute
- `QueryResultViewModel` - table-friendly DTO
- `QueryResultViewModelMapper` - domain → ViewModel

**Infrastructure:** (ALREADY COMPLETE)
- DataverseDataExplorerQueryRepository implementation

**Presentation:**
- DataExplorerPanelComposed with PanelCoordinator
- Sections: SQL editor, FetchXML preview, results table
- Split layout: editor top, results bottom

**Result:** WORKING FEATURE - User writes `SELECT * FROM account`, sees results

---

### Slice 2: "User can export results to CSV"
**Builds on:** Slice 1

**Domain:**
- `CsvExporter` domain service - formats QueryResult to CSV string
- Business rules: quote values with commas, escape quotes, handle nulls

**Application:**
- `ExportQueryResultToCsvUseCase` - orchestrates export

**Presentation:**
- Add "Export CSV" button to toolbar
- VS Code save dialog for file location
- Progress notification for large exports

**Result:** ENHANCED FEATURE - Results exportable to CSV

---

### Slice 3: "User can edit FetchXML directly"
**Builds on:** Slice 2

**Domain:**
- `FetchXmlValidator` domain service - validates FetchXML syntax
- Business rules: well-formed XML, valid FetchXML schema

**Application:**
- `ExecuteFetchXmlQueryUseCase` - executes raw FetchXML

**Presentation:**
- Mode toggle: SQL / FetchXML
- FetchXML editor with syntax highlighting
- FetchXML errors shown in editor

**Result:** ENHANCED FEATURE - Power users can edit FetchXML

---

### Post-MVP Enhancements (Slice 4+)
- **Slice 4:** Pagination (paging cookie support)
- **Slice 5:** Visual query builder UI
- **Slice 6:** Save queries as UserQuery
- **Slice 7:** SQL JOINs with metadata resolution
- **Slice 8:** SQL aggregates (GROUP BY, COUNT, SUM)

---

## Architecture Design

### Domain Layer (Already Built)

#### Existing Domain Model Review

**✅ APPROVED - No refactoring needed:**

1. **SqlParseError** - Rich error with position info, context snippets
2. **SqlToken** - Immutable value object with helper methods
3. **SqlAst** - Complete AST value objects for SQL grammar
4. **QueryResult** - Rich entity with pagination, row/column access
5. **QueryResultColumn/Row** - Value objects with display formatting
6. **SqlLexer** - Domain service (SQL → tokens)
7. **SqlParser** - Domain service (tokens → AST)
8. **SqlToFetchXmlTranspiler** - Domain service (AST → FetchXML)
9. **IDataExplorerQueryRepository** - Domain interface

**Clean Architecture Compliance:**
- ✅ Zero external dependencies (pure TypeScript)
- ✅ Rich behavior in entities (QueryResult has methods)
- ✅ Value objects immutable
- ✅ Domain services encapsulate complex logic
- ✅ Repository interface defined in domain

**Minor Issues Found:**

**Issue 1: QueryResultColumn.getHeader() - Presentation Logic in Domain**
```typescript
// Current (domain/valueObjects/QueryResultColumn.ts:18-26)
public getHeader(): string {
  if (this.displayName && this.displayName !== this.logicalName) {
    return this.displayName;
  }
  // Convert logical_name to Logical Name
  return this.logicalName
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
```

**Problem:** String formatting for display is presentation concern, not domain behavior.

**Fix:** Move to mapper. Domain should only store data.

```typescript
// Domain (keep simple)
export class QueryResultColumn {
  constructor(
    public readonly logicalName: string,
    public readonly displayName: string,
    public readonly dataType: QueryColumnDataType
  ) {}
}

// Mapper (add formatting)
export class QueryResultViewModelMapper {
  private formatColumnHeader(column: QueryResultColumn): string {
    if (column.displayName && column.displayName !== column.logicalName) {
      return column.displayName;
    }
    return column.logicalName
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
}
```

**Issue 2: QueryResultRow.getDisplayValue() - Similar Presentation Logic**
```typescript
// Current (domain/valueObjects/QueryResultRow.ts:41-68)
public getDisplayValue(columnName: string): string {
  const value = this.getValue(columnName);

  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  // ... more formatting
}
```

**Problem:** Display formatting (Yes/No for booleans, ISO for dates) is presentation concern.

**Fix:** Move to mapper. Domain should expose raw values.

```typescript
// Domain (remove getDisplayValue, keep getValue)
export class QueryResultRow {
  public getValue(columnName: string): QueryCellValue {
    return this.cells.get(columnName) ?? null;
  }
}

// Mapper (add display formatting)
export class QueryResultViewModelMapper {
  private formatCellValue(value: QueryCellValue): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (value instanceof Date) return value.toISOString();
    // ... rest of formatting
  }
}
```

**Rationale:** Domain should be pure business logic without knowledge of how data is displayed. Formatters belong in application layer mappers.

**Action:** Refactor these methods before implementing application layer.

---

#### New Domain Components (Slice 2+)

**REMOVED: CsvExporter Domain Service**

CSV formatting is NOT domain logic - it's a standard file format (RFC 4180).
Use shared `CsvFormatter` in infrastructure instead. See Shared Infrastructure section below.

**FetchXmlToSqlTranspiler Domain Service (Slice 3 - Bidirectional Translation):**
```typescript
/**
 * Domain Service: FetchXML to SQL Transpiler
 *
 * Converts FetchXML back to SQL for bidirectional editing.
 * Best-effort translation - warns user for unsupported features.
 *
 * Business Rules:
 * - <entity name="x"> → FROM x
 * - <attribute name="x"/> → SELECT x (or SELECT * for <all-attributes/>)
 * - <condition attribute="x" operator="eq" value="y"/> → WHERE x = 'y'
 * - <order attribute="x" descending="false"/> → ORDER BY x ASC
 * - <fetch top="n"> → TOP n
 * - <link-entity> → JOIN (basic support)
 * - <filter type="or"> → OR grouping
 *
 * Unsupported (returns warning):
 * - <fetch aggregate="true"> (aggregates)
 * - Complex link-entity nesting
 * - FetchXML-specific features with no SQL equivalent
 */
export class FetchXmlToSqlTranspiler {
  /**
   * Transpiles FetchXML to SQL.
   *
   * @param fetchXml - Valid FetchXML string
   * @returns Transpilation result with SQL and optional warnings
   */
  public transpile(fetchXml: string): FetchXmlTranspileResult {
    const warnings: string[] = [];

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(fetchXml, 'text/xml');

      const fetchElement = doc.documentElement;
      const entityElement = fetchElement.querySelector('entity');

      if (entityElement === null) {
        return { success: false, error: 'No <entity> element found' };
      }

      const entityName = entityElement.getAttribute('name') ?? 'unknown';

      // Build SELECT clause
      const selectClause = this.buildSelectClause(entityElement, warnings);

      // Build FROM clause
      const fromClause = `FROM ${entityName}`;

      // Build WHERE clause
      const whereClause = this.buildWhereClause(entityElement, warnings);

      // Build ORDER BY clause
      const orderByClause = this.buildOrderByClause(entityElement);

      // Build TOP clause
      const topClause = this.buildTopClause(fetchElement);

      // Assemble SQL
      const parts = [
        `SELECT ${topClause}${selectClause}`,
        fromClause,
        whereClause,
        orderByClause
      ].filter(p => p !== '');

      return {
        success: true,
        sql: parts.join('\n'),
        warnings: warnings.length > 0 ? warnings : undefined
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to parse FetchXML: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  private buildSelectClause(entity: Element, warnings: string[]): string {
    const allAttrs = entity.querySelector('all-attributes');
    if (allAttrs !== null) {
      return '*';
    }

    const attributes = entity.querySelectorAll(':scope > attribute');
    if (attributes.length === 0) {
      return '*'; // Default to all if no attributes specified
    }

    const columns: string[] = [];
    attributes.forEach(attr => {
      const name = attr.getAttribute('name');
      const aggregate = attr.getAttribute('aggregate');

      if (aggregate !== null) {
        warnings.push(`Aggregate function '${aggregate}' not supported in SQL mode`);
        return;
      }

      if (name !== null) {
        columns.push(name);
      }
    });

    return columns.length > 0 ? columns.join(', ') : '*';
  }

  private buildWhereClause(entity: Element, warnings: string[]): string {
    const filter = entity.querySelector(':scope > filter');
    if (filter === null) {
      // Check for direct conditions
      const conditions = entity.querySelectorAll(':scope > condition');
      if (conditions.length === 0) return '';
      return 'WHERE ' + this.buildConditions(conditions, 'and', warnings);
    }

    const conditions = this.buildFilterConditions(filter, warnings);
    return conditions !== '' ? `WHERE ${conditions}` : '';
  }

  private buildFilterConditions(filter: Element, warnings: string[]): string {
    const filterType = filter.getAttribute('type') ?? 'and';
    const conditions = filter.querySelectorAll(':scope > condition');
    const nestedFilters = filter.querySelectorAll(':scope > filter');

    const parts: string[] = [];

    // Process conditions
    if (conditions.length > 0) {
      parts.push(this.buildConditions(conditions, filterType, warnings));
    }

    // Process nested filters
    nestedFilters.forEach(nested => {
      const nestedConditions = this.buildFilterConditions(nested, warnings);
      if (nestedConditions !== '') {
        parts.push(`(${nestedConditions})`);
      }
    });

    const connector = filterType === 'or' ? ' OR ' : ' AND ';
    return parts.join(connector);
  }

  private buildConditions(conditions: NodeListOf<Element>, type: string, warnings: string[]): string {
    const parts: string[] = [];

    conditions.forEach(cond => {
      const attr = cond.getAttribute('attribute');
      const operator = cond.getAttribute('operator');
      const value = cond.getAttribute('value');

      if (attr === null || operator === null) return;

      const sqlCondition = this.mapConditionToSql(attr, operator, value, cond, warnings);
      if (sqlCondition !== null) {
        parts.push(sqlCondition);
      }
    });

    const connector = type === 'or' ? ' OR ' : ' AND ';
    return parts.join(connector);
  }

  private mapConditionToSql(
    attr: string,
    operator: string,
    value: string | null,
    condElement: Element,
    warnings: string[]
  ): string | null {
    const operatorMap: Record<string, string> = {
      'eq': '=', 'ne': '<>', 'neq': '<>',
      'gt': '>', 'ge': '>=', 'lt': '<', 'le': '<=',
      'like': 'LIKE', 'not-like': 'NOT LIKE',
      'null': 'IS NULL', 'not-null': 'IS NOT NULL'
    };

    if (operator === 'null') {
      return `${attr} IS NULL`;
    }

    if (operator === 'not-null') {
      return `${attr} IS NOT NULL`;
    }

    if (operator === 'in' || operator === 'not-in') {
      const values = condElement.querySelectorAll('value');
      const valueList = Array.from(values).map(v => `'${v.textContent}'`).join(', ');
      return operator === 'in'
        ? `${attr} IN (${valueList})`
        : `${attr} NOT IN (${valueList})`;
    }

    const sqlOp = operatorMap[operator];
    if (sqlOp === undefined) {
      warnings.push(`Operator '${operator}' not supported in SQL mode`);
      return null;
    }

    if (value === null) {
      return `${attr} ${sqlOp}`;
    }

    // Quote string values
    const quotedValue = /^\d+$/.test(value) ? value : `'${value}'`;
    return `${attr} ${sqlOp} ${quotedValue}`;
  }

  private buildOrderByClause(entity: Element): string {
    const orders = entity.querySelectorAll(':scope > order');
    if (orders.length === 0) return '';

    const orderParts: string[] = [];
    orders.forEach(order => {
      const attr = order.getAttribute('attribute');
      const descending = order.getAttribute('descending') === 'true';
      if (attr !== null) {
        orderParts.push(`${attr} ${descending ? 'DESC' : 'ASC'}`);
      }
    });

    return orderParts.length > 0 ? `ORDER BY ${orderParts.join(', ')}` : '';
  }

  private buildTopClause(fetch: Element): string {
    const top = fetch.getAttribute('top');
    const count = fetch.getAttribute('count');
    const value = top ?? count;
    return value !== null ? `TOP ${value} ` : '';
  }
}

/**
 * Result of FetchXML to SQL transpilation.
 */
export type FetchXmlTranspileResult =
  | { success: true; sql: string; warnings?: string[] }
  | { success: false; error: string };
```

**FetchXmlValidator Domain Service (Slice 3):**
```typescript
/**
 * Domain Service: FetchXML Validator
 *
 * Validates FetchXML syntax and structure.
 *
 * Business Rules:
 * - Must be well-formed XML
 * - Root element must be <fetch>
 * - Must contain at least one <entity> element
 * - Attribute names must be valid identifiers
 */
export class FetchXmlValidator {
  /**
   * Validates FetchXML and returns errors if invalid.
   *
   * @returns null if valid, error message if invalid
   */
  public validate(fetchXml: string): string | null {
    try {
      // Basic XML well-formedness check
      const parser = new DOMParser();
      const doc = parser.parseFromString(fetchXml, 'text/xml');

      const parseError = doc.querySelector('parsererror');
      if (parseError) {
        return `Invalid XML: ${parseError.textContent}`;
      }

      // Check for <fetch> root
      const fetchElement = doc.documentElement;
      if (fetchElement.tagName !== 'fetch') {
        return 'Root element must be <fetch>';
      }

      // Check for <entity> child
      const entityElements = fetchElement.querySelectorAll('entity');
      if (entityElements.length === 0) {
        return '<fetch> must contain at least one <entity> element';
      }

      return null; // Valid
    } catch (error) {
      return `XML parsing error: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
}
```

---

### Application Layer (NEW - To Be Implemented)

#### Use Cases

**ExecuteSqlQueryUseCase:**
```typescript
/**
 * Use Case: Execute SQL Query
 *
 * Orchestrates SQL parsing, FetchXML transpilation, and query execution.
 * Returns QueryResult domain entity for mapper transformation.
 *
 * Also provides preview method for live FetchXML preview without execution.
 */
export class ExecuteSqlQueryUseCase {
  constructor(
    private readonly parser: SqlParser,
    private readonly transpiler: SqlToFetchXmlTranspiler,
    private readonly repository: IDataExplorerQueryRepository,
    private readonly logger: ILogger
  ) {}

  /**
   * Executes a SQL query and returns results.
   *
   * @param environmentId - Target environment
   * @param sql - SQL SELECT statement
   * @returns Query result with rows, columns, and metadata
   * @throws SqlParseError if SQL is invalid
   */
  public async execute(
    environmentId: string,
    sql: string
  ): Promise<QueryResult> {
    this.logger.info('Executing SQL query', { environmentId, sqlLength: sql.length });

    try {
      // 1. Parse SQL to AST
      const statement = this.parser.parse(sql);
      this.logger.debug('SQL parsed successfully', {
        entity: statement.getEntityName(),
        columnCount: statement.columns.length
      });

      // 2. Transpile AST to FetchXML
      const fetchXml = this.transpiler.transpile(statement);
      this.logger.debug('SQL transpiled to FetchXML', {
        fetchXmlLength: fetchXml.length
      });

      // 3. Get entity set name (account → accounts)
      const entitySetName = await this.repository.getEntitySetName(
        environmentId,
        statement.getEntityName()
      );

      // 4. Execute FetchXML query
      const result = await this.repository.executeQuery(
        environmentId,
        entitySetName,
        fetchXml
      );

      this.logger.info('SQL query executed', {
        rowCount: result.getRowCount(),
        executionTimeMs: result.executionTimeMs
      });

      return result;
    } catch (error) {
      this.logger.error('SQL query execution failed', error);
      throw error;
    }
  }

  /**
   * Transpiles SQL to FetchXML without executing.
   * Used for live preview as user types.
   *
   * @param sql - SQL SELECT statement
   * @returns FetchXML string, or null if SQL is invalid
   */
  public transpileToFetchXml(sql: string): TranspileResult {
    try {
      const statement = this.parser.parse(sql);
      const fetchXml = this.transpiler.transpile(statement);
      return { success: true, fetchXml, entityName: statement.getEntityName() };
    } catch (error) {
      if (error instanceof SqlParseError) {
        return { success: false, error };
      }
      throw error;
    }
  }
}

/**
 * Result of SQL to FetchXML transpilation (for preview).
 */
export type TranspileResult =
  | { success: true; fetchXml: string; entityName: string }
  | { success: false; error: SqlParseError };
```

**ExecuteFetchXmlQueryUseCase (Slice 3):**
```typescript
/**
 * Use Case: Execute FetchXML Query
 *
 * Executes raw FetchXML queries for power users.
 * Validates FetchXML, extracts entity name, resolves entity set name internally.
 * Panel does NOT need to parse FetchXML - use case handles all orchestration.
 *
 * Also provides reverse transpilation (FetchXML → SQL) for bidirectional editing.
 */
export class ExecuteFetchXmlQueryUseCase {
  constructor(
    private readonly validator: FetchXmlValidator,
    private readonly reverseTranspiler: FetchXmlToSqlTranspiler,
    private readonly repository: IDataExplorerQueryRepository,
    private readonly logger: ILogger
  ) {}

  /**
   * Executes a FetchXML query.
   * Extracts entity name from FetchXML and resolves entity set name internally.
   *
   * @param environmentId - Target environment
   * @param fetchXml - FetchXML query string
   * @returns Query result
   * @throws Error if FetchXML is invalid or entity name cannot be extracted
   */
  public async execute(
    environmentId: string,
    fetchXml: string
  ): Promise<QueryResult> {
    this.logger.info('Executing FetchXML query', {
      environmentId,
      fetchXmlLength: fetchXml.length
    });

    // 1. Validate FetchXML
    const validationError = this.validator.validate(fetchXml);
    if (validationError !== null) {
      this.logger.warn('FetchXML validation failed', { error: validationError });
      throw new Error(`Invalid FetchXML: ${validationError}`);
    }

    // 2. Extract entity name from FetchXML (use case responsibility, NOT panel)
    const entityName = this.extractEntityName(fetchXml);
    this.logger.debug('Entity name extracted', { entityName });

    // 3. Resolve entity set name (account → accounts)
    const entitySetName = await this.repository.getEntitySetName(
      environmentId,
      entityName
    );

    // 4. Execute query
    const result = await this.repository.executeQuery(
      environmentId,
      entitySetName,
      fetchXml
    );

    this.logger.info('FetchXML query executed', {
      entityName,
      rowCount: result.getRowCount(),
      executionTimeMs: result.executionTimeMs
    });

    return result;
  }

  /**
   * Extracts entity name from FetchXML.
   * @throws Error if entity name cannot be extracted
   */
  private extractEntityName(fetchXml: string): string {
    const match = fetchXml.match(/<entity\s+name="([^"]+)"/i);
    if (match === null || match[1] === undefined) {
      throw new Error('FetchXML must contain an <entity name="..."> element');
    }
    return match[1];
  }

  /**
   * Transpiles FetchXML to SQL without executing.
   * Used for bidirectional editing when switching from FetchXML to SQL mode.
   *
   * @param fetchXml - FetchXML query string
   * @returns SQL string with optional warnings for unsupported features
   */
  public transpileToSql(fetchXml: string): FetchXmlTranspileResult {
    this.logger.debug('Transpiling FetchXML to SQL', { fetchXmlLength: fetchXml.length });

    // First validate FetchXML
    const validationError = this.validator.validate(fetchXml);
    if (validationError !== null) {
      return { success: false, error: validationError };
    }

    // Use reverse transpiler
    return this.reverseTranspiler.transpile(fetchXml);
  }
}
```

**ExportQueryResultToCsvUseCase (Slice 2):**
```typescript
import { CsvFormatter } from '../../../../shared/infrastructure/formatters/CsvFormatter';

/**
 * Use Case: Export Query Result to CSV
 *
 * Exports QueryResult to CSV format using shared CsvFormatter.
 * Does NOT duplicate CSV escaping logic - reuses shared infrastructure.
 */
export class ExportQueryResultToCsvUseCase {
  constructor(
    private readonly logger: ILogger
  ) {}

  /**
   * Exports query result to CSV string.
   *
   * @param result - Query result to export
   * @returns CSV string
   */
  public execute(result: QueryResult): string {
    this.logger.info('Exporting query result to CSV', {
      rowCount: result.getRowCount(),
      columnCount: result.getColumnCount()
    });

    // Use shared CsvFormatter - no duplicate escaping logic
    const headers = result.columns.map(col => col.logicalName);
    const rows = result.rows.map(row =>
      result.columns.map(col => this.formatCellForCsv(row.getValue(col.logicalName)))
    );

    const csv = CsvFormatter.formatCsv(headers, rows);

    this.logger.info('CSV export completed', {
      csvLength: csv.length
    });

    return csv;
  }

  /**
   * Formats a cell value for CSV export.
   * Note: This is DIFFERENT from UI display formatting.
   * CSV uses 'true'/'false' for booleans, UI uses 'Yes'/'No'.
   */
  private formatCellForCsv(value: QueryCellValue): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'object') {
      if ('formattedValue' in value && value.formattedValue !== undefined) {
        return String(value.formattedValue);
      }
      if ('name' in value && value.name !== undefined) {
        return String(value.name);
      }
      return JSON.stringify(value);
    }
    return String(value);
  }
}
```

---

#### ViewModels

**QueryResultViewModel:**
```typescript
/**
 * ViewModel for displaying query results in table.
 *
 * Mapped from QueryResult domain entity.
 */
export interface QueryResultViewModel {
  /**
   * Column definitions for table header.
   */
  readonly columns: QueryColumnViewModel[];

  /**
   * Data rows for table body.
   */
  readonly rows: QueryRowViewModel[];

  /**
   * Total number of records (if available).
   */
  readonly totalRecordCount: number | null;

  /**
   * Whether more records are available for paging.
   */
  readonly hasMoreRecords: boolean;

  /**
   * Query execution time in milliseconds.
   */
  readonly executionTimeMs: number;

  /**
   * The FetchXML that was executed.
   */
  readonly executedFetchXml: string;
}

/**
 * Column definition for table display.
 */
export interface QueryColumnViewModel {
  /**
   * Column logical name (used as key in row data).
   */
  readonly name: string;

  /**
   * Display header for column.
   */
  readonly header: string;

  /**
   * Data type hint for rendering.
   */
  readonly dataType: string;
}

/**
 * Row data for table display.
 * Map of column name → formatted display value.
 */
export interface QueryRowViewModel {
  /**
   * Cell values keyed by column name.
   */
  readonly [columnName: string]: string;
}
```

**QueryErrorViewModel:**
```typescript
/**
 * ViewModel for query execution errors.
 *
 * Provides user-friendly error display.
 */
export interface QueryErrorViewModel {
  /**
   * Error message.
   */
  readonly message: string;

  /**
   * Error type for styling (parse, execution, validation).
   */
  readonly errorType: 'parse' | 'execution' | 'validation';

  /**
   * Position information for parse errors.
   */
  readonly position?: {
    readonly line: number;
    readonly column: number;
  };

  /**
   * Context snippet showing error location.
   */
  readonly context?: string;
}
```

---

#### Mappers

**QueryResultViewModelMapper:**
```typescript
/**
 * Mapper: QueryResult → QueryResultViewModel
 *
 * Transforms domain QueryResult to presentation-friendly ViewModel.
 * Handles all display formatting here (not in domain).
 */
export class QueryResultViewModelMapper {
  /**
   * Maps QueryResult entity to ViewModel.
   */
  public toViewModel(result: QueryResult): QueryResultViewModel {
    return {
      columns: result.columns.map(col => this.mapColumn(col)),
      rows: result.rows.map(row => this.mapRow(row, result.columns)),
      totalRecordCount: result.totalRecordCount,
      hasMoreRecords: result.hasMoreRecords(),
      executionTimeMs: result.executionTimeMs,
      executedFetchXml: result.executedFetchXml
    };
  }

  /**
   * Maps QueryResultColumn to ViewModel column.
   */
  private mapColumn(column: QueryResultColumn): QueryColumnViewModel {
    return {
      name: column.logicalName,
      header: this.formatColumnHeader(column),
      dataType: column.dataType
    };
  }

  /**
   * Formats column header for display.
   * Presentation logic extracted from domain.
   */
  private formatColumnHeader(column: QueryResultColumn): string {
    if (column.displayName && column.displayName !== column.logicalName) {
      return column.displayName;
    }
    // Convert logical_name to Logical Name
    return column.logicalName
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  /**
   * Maps QueryResultRow to ViewModel row.
   */
  private mapRow(
    row: QueryResultRow,
    columns: readonly QueryResultColumn[]
  ): QueryRowViewModel {
    const viewModelRow: Record<string, string> = {};

    for (const column of columns) {
      const value = row.getValue(column.logicalName);
      viewModelRow[column.logicalName] = this.formatCellValue(value);
    }

    return viewModelRow;
  }

  /**
   * Formats cell value for display.
   * Presentation logic extracted from domain.
   */
  private formatCellValue(value: QueryCellValue): string {
    if (value === null || value === undefined) {
      return '';
    }

    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (typeof value === 'object') {
      // Lookup or formatted value
      if ('formattedValue' in value && value.formattedValue !== undefined) {
        return String(value.formattedValue);
      }
      if ('name' in value && value.name !== undefined) {
        return String(value.name);
      }
      return JSON.stringify(value);
    }

    return String(value);
  }
}
```

**SqlParseErrorViewModelMapper:**
```typescript
/**
 * Mapper: SqlParseError → QueryErrorViewModel
 *
 * Transforms domain error to user-friendly ViewModel.
 */
export class SqlParseErrorViewModelMapper {
  /**
   * Maps SqlParseError to ViewModel.
   */
  public toViewModel(error: SqlParseError): QueryErrorViewModel {
    return {
      message: error.message,
      errorType: 'parse',
      position: {
        line: error.line,
        column: error.column
      },
      context: error.getErrorContext(30)
    };
  }

  /**
   * Maps generic Error to ViewModel.
   */
  public genericErrorToViewModel(error: Error): QueryErrorViewModel {
    return {
      message: error.message,
      errorType: 'execution'
    };
  }
}
```

---

### Infrastructure Layer (Already Built)

**No changes needed.** DataverseDataExplorerQueryRepository is complete and compliant.

---

### Shared Infrastructure: CsvFormatter

**Location:** `src/shared/infrastructure/formatters/CsvFormatter.ts`

CSV formatting is a generic file format concern (RFC 4180), NOT domain business logic.
The `CsvFormatter` is shared infrastructure used by multiple features.

**Existing Pattern:** `FileSystemPluginTraceExporter` already implements CSV escaping:
```typescript
// From: src/features/pluginTraceViewer/infrastructure/exporters/FileSystemPluginTraceExporter.ts
private escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/\"/g, '\"\"')}"`;
  }
  return value;
}
```

**New Shared Component:**
```typescript
/**
 * Shared Infrastructure: CSV Formatter
 *
 * Generic CSV formatting following RFC 4180.
 * Reused by multiple features (Plugin Trace Exporter, Data Explorer, etc.)
 *
 * NOT domain logic - CSV is a file format, not business behavior.
 */
export class CsvFormatter {
  /**
   * Formats data as CSV string.
   *
   * @param headers - Column headers
   * @param rows - Data rows (already converted to strings)
   * @returns RFC 4180 compliant CSV string
   */
  public static formatCsv(headers: string[], rows: string[][]): string {
    const escapedHeaders = headers.map(h => CsvFormatter.escapeField(h));
    const escapedRows = rows.map(row =>
      row.map(cell => CsvFormatter.escapeField(cell))
    );

    return [
      escapedHeaders.join(','),
      ...escapedRows.map(row => row.join(','))
    ].join('\n');
  }

  /**
   * Escapes a CSV field according to RFC 4180.
   *
   * Rules:
   * - Fields containing comma, quote, or newline are wrapped in quotes
   * - Quotes within fields are doubled
   */
  public static escapeField(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
```

**Migration:** After creating shared `CsvFormatter`:
1. Update `FileSystemPluginTraceExporter` to use `CsvFormatter.escapeField()`
2. Update `ExportQueryResultToCsvUseCase` to use `CsvFormatter.formatCsv()`
3. Remove duplicate `escapeCsvField` methods

---

### Presentation Layer (NEW - To Be Implemented)

#### Panel Architecture

**Layout:**
```
┌────────────────────────────────────────────────────────┐
│ Toolbar: [Execute] [Export CSV] [Mode: SQL ▼]         │
├────────────────────────────────────────────────────────┤
│ Environment: [Production ▼]                           │
├────────────────────────────────────────────────────────┤
│                                                        │
│ SQL Editor (60% height)                               │
│ ┌────────────────────────────────────────────────────┐│
│ │ SELECT name, revenue                               ││
│ │ FROM account                                       ││
│ │ WHERE statecode = 0                                ││
│ │ ORDER BY revenue DESC                              ││
│ └────────────────────────────────────────────────────┘│
│                                                        │
│ FetchXML Preview (collapsible)                        │
│ ┌────────────────────────────────────────────────────┐│
│ │ <fetch>                                            ││
│ │   <entity name="account">                          ││
│ │     <attribute name="name" />                      ││
│ │     <attribute name="revenue" />                   ││
│ │     ...                                            ││
│ │   </entity>                                        ││
│ │ </fetch>                                           ││
│ └────────────────────────────────────────────────────┘│
├────────────────────────────────────────────────────────┤
│                                                        │
│ Results Table (40% height)                            │
│ ┌────────────────────────────────────────────────────┐│
│ │ Name              │ Revenue       │ ...            ││
│ │───────────────────│───────────────│────            ││
│ │ Contoso Ltd       │ 1,000,000     │ ...            ││
│ │ Fabrikam Inc      │ 500,000       │ ...            ││
│ │ ...               │ ...           │ ...            ││
│ └────────────────────────────────────────────────────┘│
│                                                        │
│ Status: 2 rows | 125ms | FetchXML: 245 chars         │
└────────────────────────────────────────────────────────┘
```

**Mode Toggle (Slice 3) - Bidirectional Translation:**
- **SQL Mode:** Shows SQL editor + FetchXML preview (read-only)
- **FetchXML Mode:** Shows FetchXML editor (editable) + SQL preview (read-only)

**Mode Switching Behavior:**
1. **SQL → FetchXML:** User clicks "FetchXML" tab
   - Current SQL is transpiled to FetchXML (use case method)
   - FetchXML becomes editable, SQL becomes read-only preview
   - User can edit FetchXML directly

2. **FetchXML → SQL:** User clicks "SQL" tab
   - Current FetchXML is reverse-transpiled to SQL via `FetchXmlToSqlTranspiler`
   - If translation is complete: SQL shown without warnings
   - If translation has unsupported features: SQL shown with warning banner
     ```
     ⚠️ Some FetchXML features couldn't be converted to SQL:
     - Aggregate function 'count' not supported in SQL mode
     - Link-entity 'contact' partially supported
     ```
   - User can edit SQL (original FetchXML features may be lost on re-execute)

3. **Warning UX:**
   - Warnings are non-blocking (user can still proceed)
   - Warning banner shows above editor, collapsible
   - "Execute" button still works regardless of warnings
   - Warning clears when user modifies the query

4. **State Preservation:**
   - Switching modes preserves query state
   - Results table persists across mode switches
   - Environment selection persists

---

#### Type Contracts

**Panel Commands:**
```typescript
type DataExplorerPanelCommands =
  | 'executeQuery'
  | 'exportCsv'
  | 'environmentChange'
  | 'modeChange'
  | 'updateSqlQuery'
  | 'updateFetchXmlQuery';
```

**Panel Implementation:**
```typescript
/**
 * Data Explorer Panel (PanelCoordinator Pattern)
 *
 * Unified panel with mode tabs (SQL / FetchXML) and results table.
 */
export class DataExplorerPanelComposed {
  public static readonly viewType = 'powerPlatformDevSuite.dataExplorer';
  private static panels = new Map<string, DataExplorerPanelComposed>();

  private readonly coordinator: PanelCoordinator<DataExplorerPanelCommands>;
  private readonly scaffoldingBehavior: HtmlScaffoldingBehavior;

  private currentEnvironmentId: string;
  private currentMode: 'sql' | 'fetchxml' = 'sql';
  private currentSqlQuery: string = '';
  private currentFetchXml: string = '';
  private currentResult: QueryResult | null = null;

  private constructor(
    private readonly panel: vscode.WebviewPanel,
    private readonly extensionUri: vscode.Uri,
    private readonly executeSqlUseCase: ExecuteSqlQueryUseCase,
    private readonly executeFetchXmlUseCase: ExecuteFetchXmlQueryUseCase,
    private readonly exportCsvUseCase: ExportQueryResultToCsvUseCase,
    private readonly resultMapper: QueryResultViewModelMapper,
    private readonly errorMapper: SqlParseErrorViewModelMapper,
    private readonly logger: ILogger,
    environmentId: string
  ) {
    this.currentEnvironmentId = environmentId;

    panel.webview.options = {
      enableScripts: true,
      localResourceRoots: [extensionUri]
    };

    const result = this.createCoordinator();
    this.coordinator = result.coordinator;
    this.scaffoldingBehavior = result.scaffoldingBehavior;

    this.registerCommandHandlers();

    void this.initializeAndLoadData();
  }

  private createCoordinator(): {
    coordinator: PanelCoordinator<DataExplorerPanelCommands>;
    scaffoldingBehavior: HtmlScaffoldingBehavior;
  } {
    // 1. Define sections
    const sections = [
      new ActionButtonsSection({
        buttons: [
          { id: 'executeQuery', label: 'Execute' },
          { id: 'exportCsv', label: 'Export CSV' }
        ]
      }, SectionPosition.Toolbar),

      new EnvironmentSelectorSection(),

      // Custom section: Query editor (SQL or FetchXML)
      new QueryEditorSection({
        modes: ['sql', 'fetchxml'],
        defaultMode: 'sql'
      }),

      // Custom section: Results table
      new QueryResultsSection({
        columns: [], // Dynamic based on query
        emptyMessage: 'Run a query to see results'
      })
    ];

    // 2. Create composition behavior (split vertical: editor top, results bottom)
    const compositionBehavior = new SectionCompositionBehavior(
      sections,
      PanelLayout.SplitVertical // 60% editor, 40% results
    );

    // 3. Resolve CSS modules
    const cssUris = resolveCssModules(
      {
        base: true,
        components: ['buttons', 'inputs', 'code-editor'],
        sections: ['environment-selector', 'action-buttons', 'query-editor', 'datatable']
      },
      this.extensionUri,
      this.panel.webview
    );

    // 4. Create scaffolding behavior
    const scaffoldingBehavior = new HtmlScaffoldingBehavior(
      this.panel.webview,
      compositionBehavior,
      {
        cssUris,
        jsUris: [
          // Core messaging
          this.panel.webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'resources', 'webview', 'js', 'messaging.js')
          ).toString(),
          // Table renderer
          this.panel.webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'TableRenderer.js')
          ).toString(),
          // Code editor (Monaco or simple textarea)
          this.panel.webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'resources', 'webview', 'js', 'codeEditor.js')
          ).toString()
        ],
        cspNonce: getNonce(),
        title: 'Data Explorer'
      }
    );

    // 5. Create coordinator
    const coordinator = new PanelCoordinator<DataExplorerPanelCommands>({
      panel: this.panel,
      extensionUri: this.extensionUri,
      behaviors: [scaffoldingBehavior],
      logger: this.logger
    });

    return { coordinator, scaffoldingBehavior };
  }

  private registerCommandHandlers(): void {
    this.coordinator.registerHandler('executeQuery', async () => {
      await this.handleExecuteQuery();
    });

    this.coordinator.registerHandler('exportCsv', async () => {
      await this.handleExportCsv();
    });

    this.coordinator.registerHandler('environmentChange', async (data) => {
      const environmentId = (data as { environmentId?: string })?.environmentId;
      if (environmentId) {
        await this.handleEnvironmentChange(environmentId);
      }
    });

    this.coordinator.registerHandler('modeChange', async (data) => {
      const mode = (data as { mode?: 'sql' | 'fetchxml' })?.mode;
      if (mode) {
        await this.handleModeChange(mode);
      }
    });

    this.coordinator.registerHandler('updateSqlQuery', async (data) => {
      const sql = (data as { sql?: string })?.sql;
      if (sql !== undefined) {
        this.currentSqlQuery = sql;
        await this.updateFetchXmlPreview();
      }
    });

    this.coordinator.registerHandler('updateFetchXmlQuery', async (data) => {
      const fetchXml = (data as { fetchXml?: string })?.fetchXml;
      if (fetchXml !== undefined) {
        this.currentFetchXml = fetchXml;
      }
    });
  }

  /**
   * Executes query based on current mode.
   */
  private async handleExecuteQuery(): Promise<void> {
    this.logger.debug('Executing query', { mode: this.currentMode });

    // Show loading spinner (reuses existing pattern from DataTableSection)
    await this.panel.webview.postMessage({
      command: 'setLoadingState',
      data: { isLoading: true }
    });

    try {
      let result: QueryResult;

      if (this.currentMode === 'sql') {
        // Execute SQL query - use case handles all orchestration
        result = await this.executeSqlUseCase.execute(
          this.currentEnvironmentId,
          this.currentSqlQuery
        );

        // Update FetchXML preview with executed FetchXML
        this.currentFetchXml = result.executedFetchXml;
      } else {
        // Execute FetchXML query - use case handles entity name extraction
        // and entity set name resolution internally
        result = await this.executeFetchXmlUseCase.execute(
          this.currentEnvironmentId,
          this.currentFetchXml
        );
      }

      this.currentResult = result;

      // Map to ViewModel
      const viewModel = this.resultMapper.toViewModel(result);

      this.logger.info('Query executed successfully', {
        rowCount: result.getRowCount(),
        executionTimeMs: result.executionTimeMs
      });

      // Send results to webview
      await this.panel.webview.postMessage({
        command: 'queryResultsUpdated',
        data: viewModel
      });

      vscode.window.showInformationMessage(
        `Query executed: ${result.getRowCount()} rows in ${result.executionTimeMs}ms`
      );
    } catch (error: unknown) {
      this.logger.error('Query execution failed', error);

      // Hide loading spinner on error
      await this.panel.webview.postMessage({
        command: 'setLoadingState',
        data: { isLoading: false }
      });

      // Map error to ViewModel
      let errorViewModel: QueryErrorViewModel;
      if (error instanceof SqlParseError) {
        errorViewModel = this.errorMapper.toViewModel(error);
      } else {
        errorViewModel = this.errorMapper.genericErrorToViewModel(
          error instanceof Error ? error : new Error(String(error))
        );
      }

      // Send error to webview
      await this.panel.webview.postMessage({
        command: 'queryError',
        data: errorViewModel
      });

      vscode.window.showErrorMessage(`Query failed: ${errorViewModel.message}`);
    }
  }

  /**
   * Exports current query result to CSV.
   */
  private async handleExportCsv(): Promise<void> {
    if (this.currentResult === null) {
      vscode.window.showWarningMessage('No query results to export');
      return;
    }

    this.logger.debug('Exporting results to CSV');

    try {
      // Get save location from user
      const uri = await vscode.window.showSaveDialog({
        filters: { 'CSV Files': ['csv'] },
        defaultUri: vscode.Uri.file('query-results.csv')
      });

      if (uri === undefined) {
        return; // User cancelled
      }

      // Generate CSV
      const csv = this.exportCsvUseCase.execute(this.currentResult);

      // Write to file
      await vscode.workspace.fs.writeFile(uri, Buffer.from(csv, 'utf-8'));

      this.logger.info('CSV export completed', { path: uri.fsPath });

      vscode.window.showInformationMessage(
        `Exported ${this.currentResult.getRowCount()} rows to ${uri.fsPath}`
      );
    } catch (error: unknown) {
      this.logger.error('CSV export failed', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`Export failed: ${errorMessage}`);
    }
  }

  /**
   * Updates FetchXML preview when SQL query changes.
   * Uses use case method - panel does NOT instantiate domain services directly.
   */
  private async updateFetchXmlPreview(): Promise<void> {
    if (this.currentSqlQuery.trim() === '') {
      return;
    }

    // Use use case method for transpilation (not direct domain service)
    const result = this.executeSqlUseCase.transpileToFetchXml(this.currentSqlQuery);

    if (result.success) {
      this.currentFetchXml = result.fetchXml;

      // Send to webview
      await this.panel.webview.postMessage({
        command: 'fetchXmlPreviewUpdated',
        data: { fetchXml: result.fetchXml }
      });
    } else {
      // Don't show errors during preview (user might be typing)
      this.logger.debug('FetchXML preview failed', { error: result.error.message });
    }
  }

  private async handleEnvironmentChange(environmentId: string): Promise<void> {
    this.currentEnvironmentId = environmentId;
    this.logger.info('Environment changed', { environmentId });

    // Clear results when environment changes
    this.currentResult = null;
    await this.panel.webview.postMessage({
      command: 'clearResults'
    });
  }

  /**
   * Handles mode toggle between SQL and FetchXML.
   * Performs bidirectional translation with warning support.
   */
  private async handleModeChange(mode: 'sql' | 'fetchxml'): Promise<void> {
    const previousMode = this.currentMode;
    this.currentMode = mode;
    this.logger.debug('Mode changed', { from: previousMode, to: mode });

    if (mode === 'fetchxml' && previousMode === 'sql') {
      // SQL → FetchXML: transpile current SQL to FetchXML
      await this.updateFetchXmlPreview();
    } else if (mode === 'sql' && previousMode === 'fetchxml') {
      // FetchXML → SQL: reverse transpile with warning support
      await this.updateSqlPreview();
    }
  }

  /**
   * Updates SQL preview when switching from FetchXML mode.
   * Uses FetchXmlToSqlTranspiler via use case for reverse translation.
   */
  private async updateSqlPreview(): Promise<void> {
    if (this.currentFetchXml.trim() === '') {
      return;
    }

    // Use use case method for reverse transpilation
    const result = this.executeFetchXmlUseCase.transpileToSql(this.currentFetchXml);

    if (result.success) {
      this.currentSqlQuery = result.sql;

      // Send to webview with optional warnings
      await this.panel.webview.postMessage({
        command: 'sqlPreviewUpdated',
        data: {
          sql: result.sql,
          warnings: result.warnings // May be undefined if no warnings
        }
      });
    } else {
      // Show error in webview (FetchXML couldn't be parsed)
      await this.panel.webview.postMessage({
        command: 'sqlPreviewError',
        data: { error: result.error }
      });
    }
  }

  private async initializeAndLoadData(): Promise<void> {
    // Initialize panel HTML
    await this.coordinator.initialize();

    // Send initial state
    await this.panel.webview.postMessage({
      command: 'initialize',
      data: {
        mode: this.currentMode,
        sqlQuery: this.currentSqlQuery,
        fetchXml: this.currentFetchXml
      }
    });
  }

  /**
   * Factory: Creates or shows existing panel.
   */
  public static async createOrShow(
    extensionUri: vscode.Uri,
    executeSqlUseCase: ExecuteSqlQueryUseCase,
    executeFetchXmlUseCase: ExecuteFetchXmlQueryUseCase,
    exportCsvUseCase: ExportQueryResultToCsvUseCase,
    resultMapper: QueryResultViewModelMapper,
    errorMapper: SqlParseErrorViewModelMapper,
    logger: ILogger,
    environmentId: string
  ): Promise<DataExplorerPanelComposed> {
    // Singleton per environment
    const existingPanel = DataExplorerPanelComposed.panels.get(environmentId);
    if (existingPanel !== undefined) {
      existingPanel.panel.reveal();
      return existingPanel;
    }

    // Create new panel
    const panel = vscode.window.createWebviewPanel(
      DataExplorerPanelComposed.viewType,
      `Data Explorer - ${environmentId}`,
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true, // Preserve query state
        localResourceRoots: [extensionUri]
      }
    );

    const newPanel = new DataExplorerPanelComposed(
      panel,
      extensionUri,
      executeSqlUseCase,
      executeFetchXmlUseCase,
      exportCsvUseCase,
      resultMapper,
      errorMapper,
      logger,
      environmentId
    );

    DataExplorerPanelComposed.panels.set(environmentId, newPanel);

    panel.onDidDispose(() => {
      DataExplorerPanelComposed.panels.delete(environmentId);
    });

    return newPanel;
  }
}
```

---

#### Custom Sections

**QueryEditorSection:**
```typescript
/**
 * Custom Section: Query Editor
 *
 * Dual-mode editor for SQL and FetchXML.
 */
export class QueryEditorSection implements ISection {
  constructor(
    private readonly config: {
      modes: ('sql' | 'fetchxml')[];
      defaultMode: 'sql' | 'fetchxml';
    }
  ) {}

  public render(): string {
    return `
      <div class="query-editor-section">
        <div class="mode-tabs">
          <button class="mode-tab active" data-mode="sql">SQL</button>
          <button class="mode-tab" data-mode="fetchxml">FetchXML</button>
        </div>

        <div class="editor-container">
          <textarea
            id="sql-editor"
            class="code-editor active"
            placeholder="SELECT * FROM account WHERE statecode = 0"
            rows="10"></textarea>

          <textarea
            id="fetchxml-editor"
            class="code-editor"
            placeholder="<fetch>...</fetch>"
            rows="10"></textarea>
        </div>

        <div class="fetchxml-preview" id="fetchxml-preview">
          <details>
            <summary>FetchXML Preview</summary>
            <pre><code id="fetchxml-preview-content"></code></pre>
          </details>
        </div>
      </div>
    `;
  }
}
```

**QueryResultsSection:**
```typescript
/**
 * Custom Section: Query Results
 *
 * Displays query results in sortable table.
 */
export class QueryResultsSection implements ISection {
  constructor(
    private readonly config: {
      columns: QueryColumnViewModel[];
      emptyMessage: string;
    }
  ) {}

  public render(): string {
    return `
      <div class="query-results-section">
        <div id="results-table-container">
          <div class="empty-state">
            <p>${this.config.emptyMessage}</p>
          </div>
        </div>

        <div class="results-status-bar">
          <span id="results-count">0 rows</span>
          <span id="execution-time">0ms</span>
        </div>
      </div>
    `;
  }
}
```

---

## File Structure

```
src/features/dataExplorer/
├── domain/
│   ├── entities/
│   │   └── QueryResult.ts                       (EXISTING ✅)
│   ├── valueObjects/
│   │   ├── SqlToken.ts                          (EXISTING ✅)
│   │   ├── SqlAst.ts                            (EXISTING ✅)
│   │   ├── QueryResultColumn.ts                 (EXISTING ✅ - needs refactor ⚠️)
│   │   └── QueryResultRow.ts                    (EXISTING ✅ - needs refactor ⚠️)
│   ├── services/
│   │   ├── SqlLexer.ts                          (EXISTING ✅)
│   │   ├── SqlParser.ts                         (EXISTING ✅)
│   │   ├── SqlToFetchXmlTranspiler.ts           (EXISTING ✅)
│   │   ├── FetchXmlToSqlTranspiler.ts           (NEW - Slice 3, bidirectional)
│   │   └── FetchXmlValidator.ts                 (NEW - Slice 3)
│   ├── errors/
│   │   └── SqlParseError.ts                     (EXISTING ✅)
│   └── repositories/
│       └── IDataExplorerQueryRepository.ts      (EXISTING ✅)
│
├── application/
│   ├── useCases/
│   │   ├── ExecuteSqlQueryUseCase.ts            (NEW - Slice 1)
│   │   ├── ExecuteFetchXmlQueryUseCase.ts       (NEW - Slice 3)
│   │   └── ExportQueryResultToCsvUseCase.ts     (NEW - Slice 2)
│   ├── viewModels/
│   │   ├── QueryResultViewModel.ts              (NEW - Slice 1)
│   │   └── QueryErrorViewModel.ts               (NEW - Slice 1)
│   └── mappers/
│       ├── QueryResultViewModelMapper.ts        (NEW - Slice 1)
│       └── SqlParseErrorViewModelMapper.ts      (NEW - Slice 1)
│
├── infrastructure/
│   └── repositories/
│       └── DataverseDataExplorerQueryRepository.ts  (EXISTING ✅)
│
└── presentation/
    ├── panels/
    │   └── DataExplorerPanelComposed.ts         (NEW - Slice 1)
    └── sections/
        ├── QueryEditorSection.ts                (NEW - Slice 1)
        └── QueryResultsSection.ts               (NEW - Slice 1)

src/shared/infrastructure/
└── formatters/
    └── CsvFormatter.ts                          (NEW - shared, Slice 2)
```

**Files Summary:**
- **Existing:** 11 files (domain + infrastructure complete)
- **Refactor Needed:** 2 files (QueryResultColumn, QueryResultRow - move display logic to mapper)
- **New Files:** 12 files (application + presentation + shared infrastructure)
- **Total Impact:** 25 files

---

## Testing Strategy

### Domain Tests (Target: 100% coverage)

**Existing tests:** SqlLexer, SqlParser, SqlToFetchXmlTranspiler (assume covered)

**New tests:**

```typescript
// FetchXmlToSqlTranspiler.test.ts
describe('FetchXmlToSqlTranspiler', () => {
  let transpiler: FetchXmlToSqlTranspiler;

  beforeEach(() => {
    transpiler = new FetchXmlToSqlTranspiler();
  });

  it('should transpile simple SELECT *', () => {
    const fetchXml = '<fetch><entity name="account"><all-attributes/></entity></fetch>';
    const result = transpiler.transpile(fetchXml);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.sql).toContain('SELECT *');
      expect(result.sql).toContain('FROM account');
    }
  });

  it('should transpile specific attributes', () => {
    const fetchXml = `<fetch><entity name="account">
      <attribute name="name"/>
      <attribute name="revenue"/>
    </entity></fetch>`;
    const result = transpiler.transpile(fetchXml);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.sql).toContain('SELECT name, revenue');
    }
  });

  it('should transpile WHERE conditions', () => {
    const fetchXml = `<fetch><entity name="account">
      <all-attributes/>
      <filter>
        <condition attribute="statecode" operator="eq" value="0"/>
      </filter>
    </entity></fetch>`;
    const result = transpiler.transpile(fetchXml);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.sql).toContain("WHERE statecode = '0'");
    }
  });

  it('should return warnings for unsupported features', () => {
    const fetchXml = `<fetch aggregate="true"><entity name="account">
      <attribute name="revenue" aggregate="sum"/>
    </entity></fetch>`;
    const result = transpiler.transpile(fetchXml);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.warnings).toBeDefined();
      expect(result.warnings).toContain(expect.stringContaining('aggregate'));
    }
  });

  it('should return error for invalid XML', () => {
    const result = transpiler.transpile('not xml');
    expect(result.success).toBe(false);
  });
});
```

### Shared Infrastructure Tests

```typescript
// CsvFormatter.test.ts
describe('CsvFormatter', () => {
  describe('escapeField', () => {
    it('should return plain values unchanged', () => {
      expect(CsvFormatter.escapeField('hello')).toBe('hello');
    });

    it('should escape fields with commas', () => {
      expect(CsvFormatter.escapeField('hello, world')).toBe('"hello, world"');
    });

    it('should escape fields with quotes', () => {
      expect(CsvFormatter.escapeField('say "hello"')).toBe('"say ""hello"""');
    });

    it('should escape fields with newlines', () => {
      expect(CsvFormatter.escapeField('line1\nline2')).toBe('"line1\nline2"');
    });
  });

  describe('formatCsv', () => {
    it('should format headers and rows', () => {
      const csv = CsvFormatter.formatCsv(
        ['name', 'revenue'],
        [['Contoso', '1000000'], ['Fabrikam', '500000']]
      );

      expect(csv).toBe('name,revenue\nContoso,1000000\nFabrikam,500000');
    });

    it('should escape special characters in data', () => {
      const csv = CsvFormatter.formatCsv(
        ['name'],
        [['Contoso, Ltd']]
      );

      expect(csv).toBe('name\n"Contoso, Ltd"');
    });
  });
});
```

### Application Tests (Target: 90% coverage)

```typescript
// ExecuteSqlQueryUseCase.test.ts
describe('ExecuteSqlQueryUseCase', () => {
  let useCase: ExecuteSqlQueryUseCase;
  let mockParser: jest.Mocked<SqlParser>;
  let mockTranspiler: jest.Mocked<SqlToFetchXmlTranspiler>;
  let mockRepository: jest.Mocked<IDataExplorerQueryRepository>;

  beforeEach(() => {
    mockParser = { parse: jest.fn() } as any;
    mockTranspiler = { transpile: jest.fn() } as any;
    mockRepository = {
      getEntitySetName: jest.fn(),
      executeQuery: jest.fn()
    } as any;

    useCase = new ExecuteSqlQueryUseCase(
      mockParser,
      mockTranspiler,
      mockRepository,
      new NullLogger()
    );
  });

  it('should orchestrate SQL query execution', async () => {
    const sql = 'SELECT * FROM account';
    const statement = new SqlSelectStatement(/* ... */);
    const fetchXml = '<fetch><entity name="account" /></fetch>';
    const result = QueryResult.empty(fetchXml, 100);

    mockParser.parse.mockReturnValue(statement);
    mockTranspiler.transpile.mockReturnValue(fetchXml);
    mockRepository.getEntitySetName.mockResolvedValue('accounts');
    mockRepository.executeQuery.mockResolvedValue(result);

    const actual = await useCase.execute('env-123', sql);

    expect(mockParser.parse).toHaveBeenCalledWith(sql);
    expect(mockTranspiler.transpile).toHaveBeenCalledWith(statement);
    expect(mockRepository.executeQuery).toHaveBeenCalledWith(
      'env-123',
      'accounts',
      fetchXml
    );
    expect(actual).toBe(result);
  });

  it('should propagate SqlParseError', async () => {
    mockParser.parse.mockImplementation(() => {
      throw SqlParseError.atPosition('Unexpected token', 10, 'SELECT *');
    });

    await expect(useCase.execute('env-123', 'SELECT *')).rejects.toThrow(SqlParseError);
  });
});
```

### Manual Testing Scenarios

**Slice 1 - SQL Query Execution:**
1. Open Data Explorer panel
2. Select environment
3. Enter SQL: `SELECT name, revenue FROM account WHERE statecode = 0 ORDER BY revenue DESC`
4. Click Execute
5. Verify results table shows data
6. Verify FetchXML preview shows generated FetchXML
7. Verify status bar shows row count and execution time

**Slice 2 - CSV Export:**
1. Execute query from Slice 1
2. Click "Export CSV"
3. Choose save location
4. Verify CSV file created
5. Open CSV in Excel - verify data matches table

**Slice 3 - FetchXML Mode:**
1. Switch mode to "FetchXML"
2. Enter FetchXML: `<fetch><entity name="account"><attribute name="name" /></entity></fetch>`
3. Click Execute
4. Verify results table shows account names

**Error Scenarios:**
1. Invalid SQL syntax → Shows parse error with line/column
2. Invalid FetchXML → Shows XML validation error
3. Non-existent entity → Shows execution error
4. Network failure → Shows error message

---

## Dependencies & Prerequisites

### External Dependencies
- [ ] VS Code Extension API (Webview, FileSystem)
- [ ] No new NPM packages required (all features use existing dependencies)
- [ ] Dataverse OData API (FetchXML endpoint)

### Internal Prerequisites
- [ ] EnvironmentManager (environment selection)
- [ ] IDataverseApiService (API communication)
- [ ] PanelCoordinator framework (panel architecture)
- [ ] Shared sections (ActionButtonsSection, EnvironmentSelectorSection)

### Breaking Changes
- [ ] None - new feature, no existing code impacted

---

## Clean Architecture Compliance Checklist

**Domain Layer:**
- [x] Entities have behavior (QueryResult has methods)
- [x] Zero external dependencies (pure TypeScript)
- [x] Business logic in entities/services (SQL parsing, FetchXML generation)
- [x] Repository interfaces defined in domain
- [x] Value objects are immutable
- [x] No logging (pure business logic)
- [ ] **REFACTOR NEEDED:** Remove presentation logic from QueryResultColumn.getHeader() and QueryResultRow.getDisplayValue()

**Application Layer:**
- [ ] Use cases orchestrate only (NO business logic)
- [ ] ViewModels are DTOs (no behavior)
- [ ] Mappers transform only (display formatting in mapper, not domain)
- [ ] Logging at use case boundaries
- [ ] Explicit return types on all methods

**Infrastructure Layer:**
- [x] Repositories implement domain interfaces
- [x] Dependencies point inward (infra → domain)
- [x] No business logic in repositories
- [x] Logging for API calls

**Presentation Layer:**
- [ ] Panels use PanelCoordinator<TCommands> pattern
- [ ] Command type defined (DataExplorerPanelCommands)
- [ ] Sections defined (QueryEditorSection, QueryResultsSection)
- [ ] Layout chosen (SplitVertical: 60% editor, 40% results)
- [ ] Command handlers registered with coordinator
- [ ] EnvironmentSelectorSection included (operates within environment)
- [ ] Data-driven updates via postMessage (no HTML re-renders)
- [ ] Panels call use cases only (NO business logic)
- [ ] Dependencies point inward (pres → app → domain)
- [ ] Logging for user actions

**Type Safety:**
- [ ] No `any` types without explicit justification
- [ ] Explicit return types on all public methods
- [ ] Proper null handling (no `!` assertions)
- [ ] Type guards for runtime safety

---

## Extension Integration Checklist

**Commands (for package.json):**
- [ ] Command ID: `power-platform-dev-suite.dataExplorer`
- [ ] Command ID (pick env): `power-platform-dev-suite.dataExplorerPickEnvironment`
- [ ] Command titles: "Data Explorer", "Data Explorer (Pick Environment)"
- [ ] Activation events: `onCommand:power-platform-dev-suite.dataExplorer`
- [ ] Commands added to `"contributes.commands"` array

**Extension Registration (for extension.ts):**
- [ ] Feature initializer: `initializeDataExplorer()`
- [ ] Lazy imports with dynamic `import()`
- [ ] Command handlers registered (direct + pick environment)
- [ ] Commands added to `context.subscriptions`
- [ ] Error handling in command handlers
- [ ] Environment picker logic

**Verification:**
- [ ] `npm run compile` passes
- [ ] Command appears in Command Palette
- [ ] Manual testing (F5, invoke command, panel opens)

---

## Key Architectural Decisions

### Decision 1: SQL Parser - Hand-Rolled vs Library
**Considered:**
- Use existing SQL parser library (sql-parser, node-sql-parser)
- Build hand-rolled recursive descent parser

**Chosen:** Hand-rolled recursive descent parser

**Rationale:**
- Control over error messages (line/column position, helpful context)
- No external dependencies in domain layer (Clean Architecture)
- SQL subset is limited (maps to FetchXML, not full T-SQL)
- Parser already built (~400 lines, well-tested)

**Tradeoffs:**
- More code to maintain vs dependency on library
- Limited SQL features vs full SQL support
- But: Better error UX, cleaner architecture, smaller bundle

---

### Decision 2: Panel Layout - Unified vs Separate Panels
**Considered:**
- Separate panels for SQL mode and FetchXML mode
- Unified panel with mode toggle

**Chosen:** Unified panel with mode toggle

**Rationale:**
- User workflow: SQL → see FetchXML → edit FetchXML → re-execute
- Single source of truth for query results
- FetchXML preview teaches users FetchXML syntax

**Tradeoffs:**
- More complex panel logic vs simpler separate panels
- But: Better UX, educational value, single panel state

---

### Decision 3: Display Formatting - Domain vs Mapper
**Considered:**
- Keep formatting in domain (QueryResultColumn.getHeader(), QueryResultRow.getDisplayValue())
- Move formatting to application layer mapper

**Chosen:** Move formatting to mapper

**Rationale:**
- Domain should be presentation-agnostic
- Formatting rules (Yes/No for booleans, ISO for dates) are UI concerns
- Mappers exist to transform domain → presentation
- Cleaner separation of concerns

**Tradeoffs:**
- More code in mapper vs convenience in domain
- But: Better architecture, reusable domain entities, testable formatters

---

### Decision 4: Query Persistence - UserQuery vs Local Files
**Considered:**
- Save queries as UserQuery entities in Dataverse (MVP)
- Save queries as local files in workspace (MVP)
- Support both (Post-MVP)

**Chosen:** Defer to Post-MVP (Slice 6)

**Rationale:**
- MVP focuses on ad-hoc queries (run once, explore data)
- UserQuery persistence adds complexity (entity metadata, CRUD operations)
- Local file storage needs workspace integration
- Users can manually copy/paste queries for now

**Tradeoffs:**
- No query reuse in MVP vs full persistence
- But: Faster MVP delivery, can add later without breaking changes

---

## Refactoring Required Before Implementation

**CRITICAL:** These refactors must happen BEFORE implementing application layer.

### Refactor 1: QueryResultColumn - Remove getHeader()
**File:** `src/features/dataExplorer/domain/valueObjects/QueryResultColumn.ts`

**Change:**
```typescript
// BEFORE (domain has presentation logic)
export class QueryResultColumn {
  public getHeader(): string {
    // String formatting logic...
  }
}

// AFTER (domain stores data only)
export class QueryResultColumn {
  constructor(
    public readonly logicalName: string,
    public readonly displayName: string,
    public readonly dataType: QueryColumnDataType
  ) {}
  // No getHeader() method
}
```

**Migration:** Move formatting to `QueryResultViewModelMapper.formatColumnHeader()`

---

### Refactor 2: QueryResultRow - Remove getDisplayValue()
**File:** `src/features/dataExplorer/domain/valueObjects/QueryResultRow.ts`

**Change:**
```typescript
// BEFORE (domain has presentation logic)
export class QueryResultRow {
  public getDisplayValue(columnName: string): string {
    // Display formatting logic...
  }
}

// AFTER (domain provides raw values)
export class QueryResultRow {
  public getValue(columnName: string): QueryCellValue {
    return this.cells.get(columnName) ?? null;
  }
  // No getDisplayValue() method
}
```

**Migration:** Move formatting to `QueryResultViewModelMapper.formatCellValue()`

---

## UX & Technical Decisions

### Loading State (Reusing Existing Pattern)

The Data Explorer panel reuses the existing loading spinner pattern from `DataTableSection`.

**Pattern:**
```typescript
// Show loading before query
await this.panel.webview.postMessage({
  command: 'setLoadingState',
  data: { isLoading: true }
});

// Hide loading after query (success or error)
await this.panel.webview.postMessage({
  command: 'setLoadingState',
  data: { isLoading: false }
});
```

**Webview Implementation:**
- Reuse existing CSS spinner classes from `datatable.css`
- Show spinner overlay on results table during query execution
- Disable Execute button while query is running
- Enable Export CSV button only when results are present

---

### Query Cancellation

**OData API Investigation Required:**

The Dataverse OData endpoint's support for request cancellation needs investigation:

1. **HTTP/2 Stream Cancellation:** Modern browsers/Node.js can cancel HTTP/2 streams, but server must cooperate
2. **OData `$cancel` Not Standard:** OData v4 doesn't have a standard cancellation mechanism
3. **AbortController:** Can be used client-side, but server may continue processing

**Recommendation:**
- **MVP:** No cancellation support - queries should complete quickly for typical use cases
- **Post-MVP:** Investigate if Dataverse respects connection closure as cancellation signal
- **Workaround:** Implement client-side timeout with user-friendly message:
  ```
  ⚠️ Query taking longer than expected. Consider adding filters to reduce result size.
  ```

**Implementation (Post-MVP):**
```typescript
// In repository - add AbortSignal support
public async executeQuery(
  environmentId: string,
  entitySetName: string,
  fetchXml: string,
  signal?: AbortSignal
): Promise<QueryResult> {
  // Pass signal to fetch API
}

// In use case - create AbortController with timeout
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
try {
  return await this.repository.executeQuery(envId, entitySet, fetchXml, controller.signal);
} finally {
  clearTimeout(timeoutId);
}
```

---

### Integration Testing Plan

**Strategy:** Follow existing panel integration test patterns from Plugin Trace Viewer.

**Test File:** `src/features/dataExplorer/presentation/panels/DataExplorerPanelComposed.integration.test.ts`

**Test Scenarios:**

1. **Panel Lifecycle:**
   - Panel creates successfully with dependencies
   - Panel disposes cleanly
   - Singleton per environment (same env returns same panel)

2. **SQL Query Flow:**
   - User enters SQL → FetchXML preview updates
   - User clicks Execute → Loading shown → Results displayed
   - Parse error → Error message with position shown
   - Execution error → Error message shown

3. **FetchXML Query Flow:**
   - User switches to FetchXML mode → SQL reverse-transpiled
   - Unsupported features → Warning banner shown
   - User edits FetchXML → Executes successfully

4. **Mode Switching:**
   - SQL → FetchXML preserves query intent
   - FetchXML → SQL with warnings shown
   - Results persist across mode switches

5. **CSV Export:**
   - Export with results → CSV generated correctly
   - Export without results → Warning shown
   - Large export → Progress indication

6. **Environment Changes:**
   - Environment change → Results cleared
   - Query re-execution on new environment works

**Test Utilities:**
```typescript
// Test factory for panel dependencies
function createTestDependencies(): DataExplorerPanelDependencies {
  return {
    executeSqlUseCase: createMockExecuteSqlUseCase(),
    executeFetchXmlUseCase: createMockExecuteFetchXmlUseCase(),
    exportCsvUseCase: createMockExportCsvUseCase(),
    resultMapper: new QueryResultViewModelMapper(),
    errorMapper: new SqlParseErrorViewModelMapper(),
    logger: new NullLogger()
  };
}

// Mock use case that returns predefined results
function createMockExecuteSqlUseCase(): ExecuteSqlQueryUseCase {
  const mock = {
    execute: jest.fn().mockResolvedValue(createTestQueryResult()),
    transpileToFetchXml: jest.fn().mockReturnValue({
      success: true,
      fetchXml: '<fetch><entity name="account"/></fetch>',
      entityName: 'account'
    })
  };
  return mock as unknown as ExecuteSqlQueryUseCase;
}
```

**Test Implementation Order:**
1. Slice 1: Basic SQL query execution tests
2. Slice 2: CSV export tests
3. Slice 3: FetchXML mode and bidirectional translation tests

---

## Open Questions

- [ ] **Monaco Editor vs Simple Textarea:** Use full Monaco editor for SQL/FetchXML editing, or simple textarea? Monaco adds bundle size but better UX.
  - **Recommendation:** Start with textarea (Slice 1), upgrade to Monaco if users request (Post-MVP)

- [ ] **Entity Set Name Resolution:** Cache entity set names globally (across panels) or per-panel?
  - **Recommendation:** Repository already has per-instance cache. Good enough for MVP.

- [ ] **Large Result Sets:** Virtual scrolling for 10,000+ rows, or pagination only?
  - **Recommendation:** Pagination for MVP (paging cookie support in Slice 4), virtual scrolling in Post-MVP if needed

- [ ] **SQL Aggregates:** Support GROUP BY, COUNT, SUM in MVP or defer?
  - **Decision:** Defer to Post-MVP (Slice 8). FetchXML aggregates are complex, need separate design.

---

## References

**Critical Files to Reference:**
- **Panel Pattern:** `src/features/solutionExplorer/presentation/panels/SolutionExplorerPanelComposed.ts`
- **Split Layout:** `src/shared/presentation/behaviors/SectionCompositionBehavior.ts` (PanelLayout.SplitVertical)
- **Data Table:** `src/shared/presentation/sections/DataTableSection.ts`
- **Use Case Pattern:** `src/features/solutionExplorer/application/useCases/LoadSolutionsUseCase.ts`
- **Mapper Pattern:** `src/features/solutionExplorer/application/mappers/SolutionViewModelMapper.ts`

**Architecture Guides:**
- `docs/architecture/CLEAN_ARCHITECTURE_GUIDE.md`
- `docs/architecture/PANEL_ARCHITECTURE.md`
- `docs/architecture/MAPPER_PATTERNS.md`
- `.claude/templates/PANEL_DEVELOPMENT_GUIDE.md`

**Feature Specification:**
- `docs/future/DATA_MANAGEMENT.md` - Data Explorer feature enhancements

---

## Next Steps

**Phase 1: Refactoring (Before Implementation)**
1. Refactor QueryResultColumn - remove getHeader()
2. Refactor QueryResultRow - remove getDisplayValue()
3. Write tests for refactored domain classes
4. Verify existing infrastructure tests still pass

**Phase 2: Slice 1 Implementation**
1. Implement application layer (use cases, ViewModels, mappers)
2. Implement presentation layer (panel, sections)
3. Register commands in extension.ts
4. Manual testing (F5, execute SQL query, verify results)

**Phase 3: Slice 2 Implementation**
1. Implement CsvExporter domain service
2. Implement ExportQueryResultToCsvUseCase
3. Add Export CSV button to panel
4. Manual testing (export to CSV, verify format)

**Phase 4: Slice 3 Implementation**
1. Implement FetchXmlValidator domain service
2. Implement ExecuteFetchXmlQueryUseCase
3. Add FetchXML mode to panel
4. Manual testing (edit FetchXML, execute, verify results)

**Phase 5: Final Review**
- [ ] All tests passing (domain + application)
- [ ] Manual testing complete (all scenarios)
- [ ] Code review (invoke `/code-review`)
- [ ] Documentation updated
- [ ] Ready for production

---

**End of Design Document**
