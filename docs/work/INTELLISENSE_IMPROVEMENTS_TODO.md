# IntelliSense Improvements - Task Tracking

**Branch:** `feature/finish-data-explorer-web-resources-metadata`
**Created:** 2025-12-06
**Status:** Implementation

---

## Overview

**Goal:** Fix SQL IntelliSense issues before deployment, then expand to FetchXML support.

**Discovery Findings:**
- Found: Existing `SqlContextDetector` uses regex-based detection with limited keyword positions
- Found: `IntelliSenseContextService` is module-level singleton (testability issue)
- Found: Presentation logic in domain value objects (`getDocumentation()`, etc.)
- Will reuse: Existing metadata cache, repository, completion provider infrastructure
- Need to create: State machine parser for context-aware keyword suggestions

---

## Requirements

### SQL IntelliSense Fixes (Pre-Deployment) - COMPLETED 2025-12-06
- [x] Context-aware keyword suggestions (SELECT at start, WHERE after FROM entity, etc.)
- [x] String literal detection (no suggestions inside quotes)
- [x] Fix module-level singleton (move to proper DI)
- [x] Move presentation logic from value objects to mappers

### Phase 2: Notebook Improvements (Next Priority) - COMPLETED 2025-12-06
- [x] Fix notebook data table links (lookup fields should be clickable)
- [x] Combined SQL/FetchXML notebook support (single notebook type)
  - [x] Update controller supportedLanguages to ['sql', 'xml']
  - [x] Detect cell language in executeHandler
  - [x] Route SQL cells through SQL→FetchXML→Execute path
  - [x] Route XML cells directly to FetchXML execution
  - [x] Serializer handles cell language (sql, xml, markdown)
- [x] Renamed notebook extension to .ppdsnb (Power Platform Developer Suite Notebook)

### Phase 3: FetchXML IntelliSense - COMPLETED 2025-12-06
- [x] FetchXML context detector (XML-aware, element/attribute detection)
- [x] FetchXML completion provider (register for language: 'fetchxml')
- [x] Entity name suggestions (in `<entity name="">`)
- [x] Attribute name suggestions (in `<attribute name="">`)
- [x] Operator suggestions (in `<condition operator="">`)
- [x] Element suggestions (valid child elements based on parent)

### Phase 4: Aggregate & DISTINCT Support (Standard SQL) - COMPLETED 2025-12-06
**Goal:** Add SQL features that have direct FetchXML equivalents.

**SQL Parser Changes:**
- [x] DISTINCT keyword: `SELECT DISTINCT name FROM account`
- [x] COUNT(*): `SELECT COUNT(*) FROM account`
- [x] COUNT(column): `SELECT COUNT(name) FROM account`
- [x] COUNT(DISTINCT column): `SELECT COUNT(DISTINCT statecode) FROM account`
- [x] SUM(column): `SELECT SUM(revenue) FROM opportunity`
- [x] AVG(column): `SELECT AVG(revenue) FROM opportunity`
- [x] MIN(column): `SELECT MIN(createdon) FROM account`
- [x] MAX(column): `SELECT MAX(createdon) FROM account`
- [x] GROUP BY: `SELECT statecode, COUNT(*) FROM account GROUP BY statecode`
- [x] Column aliases for aggregates: `COUNT(*) AS total`

**Transpiler Changes:**
- [x] DISTINCT → `<fetch distinct="true">`
- [x] COUNT(*) → `<attribute name="*" aggregate="count" alias="...">`
- [x] COUNT(column) → `<attribute name="..." aggregate="countcolumn" alias="...">`
- [x] SUM/AVG/MIN/MAX → `<attribute name="..." aggregate="sum/avg/min/max" alias="...">`
- [x] GROUP BY → `<attribute name="..." groupby="true">`
- [x] Set `<fetch aggregate="true">` when aggregates present

**Tests Added:** 39 new unit tests (20 parser + 19 transpiler)

**FetchXML Reference:**
- https://learn.microsoft.com/en-us/power-apps/developer/data-platform/fetchxml/aggregate-data

### Phase 5: SQL Keyword Cleanup
- [ ] Only suggest keywords that are actually usable in Dataverse SQL
- [ ] Review keyword lists - remove unsupported keywords
- [ ] Verify suggestions match Dataverse SQL dialect (constrained by FetchXML)
- [ ] Add DISTINCT, COUNT, SUM, AVG, MIN, MAX, GROUP BY to suggestions

### Phase 6: FetchXML File Editor
- [ ] Add "New FetchXML Query" button to panel
- [ ] Add "Open FetchXML File" support
- [ ] FetchXML → SQL preview in panel

---

## Future Phases (After v0.3.0)

### Phase 7: Advanced Aggregates
**Deferred:** These require custom SQL syntax or have no SQL equivalent.

- [ ] HAVING clause: `SELECT statecode, COUNT(*) FROM account GROUP BY statecode HAVING COUNT(*) > 10`
- [ ] Date grouping: `GROUP BY YEAR(createdon)` → `dategrouping="year"`
  - Supported: day, week, month, quarter, year, fiscal-period, fiscal-year
- [ ] User timezone control for date grouping

### Phase 8: Advanced JOIN Types
**Deferred:** FetchXML supports join types without standard SQL equivalents.

| FetchXML link-type | SQL Equivalent | Status |
|--------------------|----------------|--------|
| `inner` | INNER JOIN | ✅ Implemented |
| `outer` | LEFT JOIN | ✅ Implemented |
| `exists` | EXISTS subquery | ❌ No standard SQL |
| `in` | IN subquery | ❌ No standard SQL |
| `any` / `not any` | None | ❌ No SQL equivalent |
| `all` / `not all` | None | ❌ No SQL equivalent |
| `matchfirstrowusingcrossapply` | CROSS APPLY | ❌ Not standard SQL |

**Options for future:**
- Add FetchXML-specific syntax: `JOIN entity USING EXISTS`
- Or leave as FetchXML-only features (use FetchXML mode)

**Success Criteria:**
- [x] Typing `|` at document start shows SELECT, INSERT, UPDATE, DELETE
- [x] Typing `SELECT * FROM account |` shows WHERE, ORDER BY, JOIN keywords
- [x] Typing inside `'string|'` shows NO suggestions
- [x] All tests pass, no architecture violations

---

## Implementation Checklist

### Phase 1: SQL IntelliSense Fixes

#### 1.1 State Machine Context Detector
- [x] Define `SqlParseState` interface (statementType, currentClause, etc.)
- [x] Implement `SqlStateMachine` in domain layer
- [x] Update `SqlContextDetector` to use state machine
- [x] Handle keyword suggestions at each clause position
- [x] Unit tests for all keyword positions
- [x] `npm run compile` passes

#### 1.2 String Literal Detection
- [x] Add quote tracking to context detector
- [x] Return `{ kind: 'none' }` when inside string
- [x] Handle escaped quotes (`''`)
- [x] Unit tests for string detection
- [x] `npm run compile` passes

#### 1.3 Fix Module-Level Singleton
- [x] Refactor `registerDataExplorerIntelliSense.ts` to use class-based registry
- [x] Pass services via extension context or DI container
- [x] Update tests to not rely on module state
- [x] `npm run compile` passes

#### 1.4 Move Presentation Logic to Mappers
- [x] Create `EntitySuggestionMapper` in presentation layer
- [x] Create `AttributeSuggestionMapper` in presentation layer
- [x] Remove `getDisplayLabel()`, `getDetail()`, `getDocumentation()` from value objects
- [x] Update completion provider to use mappers
- [x] Update tests
- [x] `npm run compile` passes

### Phase 2: FetchXML IntelliSense (After Phase 1) - COMPLETED 2025-12-06

#### 2.1 Domain Layer
- [x] Create `FetchXmlContextDetector` domain service
- [x] Create `FetchXmlElementSuggestion` value object
- [x] Create `OperatorSuggestion` value object
- [x] Define valid element hierarchy (fetch → entity → attribute, etc.)
- [x] Unit tests (41 tests)
- [x] `npm run compile` passes

#### 2.2 Application Layer
- [x] Create `GetFetchXmlElementSuggestionsUseCase`
- [x] Create `GetOperatorSuggestionsUseCase`
- [x] Reuse existing `GetEntitySuggestionsUseCase`
- [x] Reuse existing `GetAttributeSuggestionsUseCase`
- [x] `npm run compile` passes

#### 2.3 Presentation Layer
- [x] Create `FetchXmlCompletionProvider`
- [x] Register for 'fetchxml' language
- [x] Create element/operator mappers
- [x] Wire into registration
- [x] `npm run compile` passes

### Phase 3: Notebook & Editor Improvements - COMPLETED 2025-12-06

#### 3.1 FetchXML Cell Support in Notebooks
- [x] Update controller supportedLanguages to ['sql', 'fetchxml']
- [x] Detect cell language and route to appropriate executor
- [x] Serializer handles cell language (sql, xml, markdown)

#### 3.2 Fix Notebook Data Table Links
- [x] Store environment URL in notebook metadata
- [x] Build direct record URLs in HTML output (opens in browser on click)

#### 3.3 Document-Scoped IntelliSense Context
- [x] `resolveEnvironmentId()` checks `vscode-notebook-cell` scheme
- [x] Reads environment from notebook metadata for cells
- [x] Panel and notebook environments work independently

### Phase 4: Aggregate & DISTINCT Support - COMPLETED 2025-12-06

#### 4.1 AST Extensions
- [x] Add `SqlAggregateFunction` type: `'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX'`
- [x] Add `SqlAggregateColumn` class with function, column, distinct flag, alias
- [x] Add `distinct` field to `SqlSelectStatement`
- [x] Add `groupBy` field to `SqlSelectStatement` (array of `SqlColumnRef`)
- [x] Add `SqlSelectColumn` union type for regular and aggregate columns
- [x] `npm run compile` passes

#### 4.2 Token Updates
- [x] Add tokens: DISTINCT, COUNT, SUM, AVG, MIN, MAX, GROUP
- [x] BY already existed for ORDER BY
- [x] `npm run compile` passes

#### 4.3 Parser Updates
- [x] Parse `SELECT DISTINCT` keyword
- [x] Parse aggregate functions: `COUNT(*)`, `COUNT(column)`, `COUNT(DISTINCT column)`
- [x] Parse `SUM(column)`, `AVG(column)`, `MIN(column)`, `MAX(column)`
- [x] Parse `GROUP BY column1, column2`
- [x] Parse aliases for aggregates: `COUNT(*) AS total`
- [x] 20 unit tests for all new syntax
- [x] `npm run compile` passes

#### 4.4 Transpiler Updates
- [x] Add `distinct="true"` to fetch element when DISTINCT
- [x] Add `aggregate="true"` to fetch element when aggregates present
- [x] Transpile `COUNT(*)` → `<attribute name="*" aggregate="count" alias="...">`
- [x] Transpile `COUNT(column)` → `<attribute name="column" aggregate="countcolumn" alias="...">`
- [x] Transpile `SUM/AVG/MIN/MAX` → appropriate aggregate attribute
- [x] Transpile `GROUP BY` → `<attribute name="..." groupby="true">`
- [x] Generate required aliases for aggregate columns
- [x] 19 unit tests for all transpilation
- [x] `npm run compile` passes

#### 4.5 Integration Testing
- [ ] Test aggregate queries execute correctly against Dataverse
- [ ] Test GROUP BY queries return grouped results
- [ ] Test DISTINCT returns unique rows
- [ ] Manual testing (F5) complete

---

## Keyword Suggestion Matrix (Phase 1.1 Reference)

| Cursor Position | Suggest Keywords |
|-----------------|------------------|
| Start of statement | `SELECT`, `INSERT`, `UPDATE`, `DELETE` |
| After `SELECT` (before FROM) | `DISTINCT`, `TOP`, `*`, attributes, `FROM` |
| After `SELECT ... FROM` | entities |
| After `FROM entity` | `WHERE`, `ORDER BY`, `JOIN`, `LEFT JOIN`, `RIGHT JOIN`, `INNER JOIN`, `AS` |
| After `JOIN entity` | `ON` |
| After `ON` | attributes |
| After `WHERE` | attributes |
| After `WHERE attr op value` | `AND`, `OR`, `ORDER BY` |
| After `AND`/`OR` | attributes |
| After `ORDER BY` | attributes |
| After `ORDER BY attr` | `ASC`, `DESC`, `,` |
| After `ORDER BY attr ASC/DESC` | `,`, statement keywords |
| After `INSERT INTO` | entities |
| After `INSERT INTO entity` | `(`, `VALUES` |
| After `UPDATE` | entities |
| After `UPDATE entity` | `SET` |
| After `SET attr = value` | `,`, `WHERE` |
| After `DELETE FROM` | entities |
| After `DELETE FROM entity` | `WHERE` |

---

## Testing

- [ ] Unit tests pass: `npm test`
- [ ] Manual testing (F5): Verify all keyword positions
- [ ] Manual testing (F5): Verify no suggestions in strings

### Test Scenarios

| Scenario | Expected |
|----------|----------|
| Empty document, Ctrl+Space | SELECT, INSERT, UPDATE, DELETE |
| `SELECT ` | DISTINCT, TOP, *, attributes (if FROM exists) |
| `SELECT * FROM ` | Entity names |
| `SELECT * FROM account ` | WHERE, ORDER BY, JOIN, etc. |
| `SELECT * FROM account WHERE ` | Attribute names |
| `SELECT * FROM account WHERE name = 'te` | NO suggestions (inside string) |
| `SELECT * FROM account WHERE name = 'test' ` | AND, OR, ORDER BY |
| `SELECT * FROM account ORDER BY ` | Attribute names |
| `SELECT * FROM account ORDER BY name ` | ASC, DESC |

---

## Session Notes

### Session 1 (2025-12-06)
- Created tracking document
- Analyzed current IntelliSense implementation
- Identified 4 pre-deployment fixes needed
- Implemented all SQL IntelliSense fixes:

**Completed Changes:**
1. **Enhanced SqlContextDetector** - Added context-aware keyword suggestions
   - Statement keywords at start: SELECT, INSERT, UPDATE, DELETE
   - Column keywords after SELECT: DISTINCT, TOP, FROM, COUNT, etc.
   - Clause keywords after FROM entity: WHERE, ORDER BY, JOIN, etc.
   - Condition keywords after WHERE: AND, OR, ORDER BY
   - Direction keywords after ORDER BY attr: ASC, DESC

2. **String literal detection** - Added `isInsideStringLiteral()` method
   - Counts unescaped quotes to detect cursor inside strings
   - Returns `none` context when inside string

3. **Fixed module-level singleton** - Created `IntelliSenseServicesRegistry` class
   - Moved from module-level `let registeredServices` to class-based registry
   - Exported `resetIntelliSenseServicesForTesting()` for test cleanup

4. **Moved presentation logic to mappers** - Clean Architecture compliance
   - Created `EntitySuggestionCompletionMapper`
   - Created `AttributeSuggestionCompletionMapper`
   - Removed presentation methods from domain value objects
   - Updated completion provider to use mappers

**Test Results:** All 501 Data Explorer tests pass

**Files Changed:**
- `src/features/dataExplorer/domain/services/SqlContextDetector.ts` - Major enhancement
- `src/features/dataExplorer/domain/services/SqlContextDetector.test.ts` - 35 tests, all passing
- `src/features/dataExplorer/presentation/providers/DataverseCompletionProvider.ts` - Uses mappers
- `src/features/dataExplorer/presentation/initialization/registerDataExplorerIntelliSense.ts` - Registry pattern
- `src/features/dataExplorer/presentation/mappers/EntitySuggestionCompletionMapper.ts` - NEW
- `src/features/dataExplorer/presentation/mappers/AttributeSuggestionCompletionMapper.ts` - NEW
- `src/features/dataExplorer/domain/valueObjects/EntitySuggestion.ts` - Removed presentation methods
- `src/features/dataExplorer/domain/valueObjects/AttributeSuggestion.ts` - Removed presentation methods

**Next Steps:**
- Manual testing with F5
- FetchXML IntelliSense (Phase 2)
- FetchXML notebooks and file editor

### Session 1 - Continued: Document-Scoped Environment Resolution

**Problem Identified:** Notebooks stored environment in metadata but completion provider only checked `IntelliSenseContextService` (set by panel). This meant:
- IntelliSense worked in notebooks only because panel happened to set environment
- Notebook's own environment selection (status bar) wasn't used for IntelliSense
- Panel and notebook environments could desync

**Solution Implemented:**
1. **DataverseCompletionProvider.resolveEnvironmentId()** - Checks document type:
   - `vscode-notebook-cell://` scheme → reads from notebook metadata
   - Regular SQL files → reads from context service (panel)

2. **IntelliSenseMetadataCache** - Removed environment change listener:
   - Cache is now keyed by environmentId only
   - Multiple environments can be cached simultaneously
   - Switching environments doesn't clear cache
   - Added `clearEnvironmentCache(envId)` for targeted invalidation

**Architecture After Fix:**
```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│ Panel (env A)       │    │ Notebook 1 (env A)  │    │ Notebook 2 (env B)  │
│ → contextService    │    │ → metadata.envId    │    │ → metadata.envId    │
└─────────│───────────┘    └─────────│───────────┘    └─────────│───────────┘
          │                          │                          │
          ▼                          ▼                          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              DataverseCompletionProvider.resolveEnvironmentId()         │
│  if (notebook cell) → notebook.metadata['environmentId']                │
│  else              → contextService.getActiveEnvironment()              │
└─────────────────────────────────────────────────────────────────────────┘
          │                          │                          │
          ▼                          ▼                          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                 IntelliSenseMetadataCache (SHARED)                      │
│  entityCache: { "env-A": [...], "env-B": [...] }                        │
│  attributeCache: { "env-A:account": [...], "env-B:account": [...] }     │
│                                                                         │
│  → Panel & Notebook 1 share env-A cache                                 │
│  → Notebook 2 has separate env-B cache                                  │
└─────────────────────────────────────────────────────────────────────────┘
```

**Files Changed:**
- `src/features/dataExplorer/presentation/providers/DataverseCompletionProvider.ts` - Added document-aware env resolution
- `src/features/dataExplorer/application/services/IntelliSenseMetadataCache.ts` - Multi-env cache support

**Test Results:** All 501 Data Explorer tests pass

### Session 2 (2025-12-06) - Notebook Clickable Links Fix

**Problem:** Lookup fields in notebook data tables were rendered as styled links but clicking them did nothing (`onclick="return false;"`).

**Root Cause:** Unlike webview panels that can use `vscode.postMessage()`, notebook cell outputs don't have built-in message passing. The notebook controller didn't have access to the Dataverse URL to build actual record links.

**Solution:** Store the Dataverse URL in notebook metadata and build direct record URLs in the HTML output.

**Changes Made:**
1. **DataverseSqlNotebookController** - Added `selectedEnvironmentUrl` field
   - `selectEnvironment()` now stores URL in metadata along with ID/name
   - `loadEnvironmentFromNotebook()` now loads URL from metadata
   - `renderResultsHtml()` accepts `environmentUrl` parameter
   - `renderCell()` builds actual `href` URLs using `buildRecordUrl()` helper
   - New `buildRecordUrl()` method generates Dataverse record URLs

2. **registerNotebooks.ts** - Updated `OpenQueryInNotebookOptions`
   - Added optional `environmentUrl` field for backwards compatibility
   - `openQueryInNotebook()` stores URL in metadata

3. **DataExplorerPanelComposed** - Updated notebook integration
   - `handleOpenInNotebook()` passes `environmentInfo.dataverseUrl` to notebook

**URL Format:**
```
https://{dataverseUrl}/main.aspx?pagetype=entityrecord&etn={entityType}&id={recordId}
```

**Files Changed:**
- `src/features/dataExplorer/notebooks/DataverseSqlNotebookController.ts` - Core fix
- `src/features/dataExplorer/notebooks/registerNotebooks.ts` - Updated options interface
- `src/features/dataExplorer/presentation/panels/DataExplorerPanelComposed.ts` - Pass URL
- `src/features/dataExplorer/presentation/providers/DataverseCompletionProvider.ts` - Fixed type safety

**Test Results:** All 501 Data Explorer tests pass

### Session 2 - Continued: FetchXML Notebook Support

**Goal:** Allow notebooks to contain both SQL and FetchXML cells.

**Changes Made:**
1. **DataverseSqlNotebookController**
   - Updated `supportedLanguages` from `['sql']` to `['sql', 'xml']`
   - Added `ExecuteFetchXmlQueryUseCase` constructor parameter
   - Updated `executeCell()` to detect language and route:
     - XML cells → `ExecuteFetchXmlQueryUseCase` (direct execution)
     - SQL cells → `ExecuteSqlQueryUseCase` (transpile then execute)
   - Added `looksLikeFetchXml()` helper for content-based detection
   - Added `FetchXmlValidationError` handling in `formatError()`

2. **DataverseSqlNotebookSerializer**
   - Updated cell kind type to include `'xml'`
   - `parseNotebookData()` now maps 'xml' kind to 'xml' language
   - `serializeCell()` preserves cell language (sql/xml/markdown)

3. **registerNotebooks.ts**
   - Added lazy import of `ExecuteFetchXmlQueryUseCase`
   - Created and injected `executeFetchXmlUseCase` to controller

**Detection Logic:**
```
if (cell.languageId === 'xml' || content.startsWith('<fetch'))
  → Execute as FetchXML
else
  → Execute as SQL (transpile first)
```

**Files Changed:**
- `src/features/dataExplorer/notebooks/DataverseSqlNotebookController.ts`
- `src/features/dataExplorer/notebooks/DataverseSqlNotebookSerializer.ts`
- `src/features/dataExplorer/notebooks/registerNotebooks.ts`

**Test Results:** Build successful, all lint checks pass

### Session 3 (2025-12-06) - FetchXML IntelliSense

**Goal:** Implement context-aware IntelliSense for FetchXML queries.

**Changes Made:**

1. **Domain Layer**
   - `FetchXmlContextDetector` - Parses XML and detects cursor context:
     - `element` - After `<`, suggests valid child elements
     - `attribute-name` - Inside element tag, suggests valid attributes
     - `attribute-value` - Inside `="..."`, suggests values based on context
   - `FetchXmlElementSuggestion` - Value object for element suggestions
   - `OperatorSuggestion` - Value object for condition operators (70+ operators)
   - 41 unit tests covering all context detection scenarios

2. **Application Layer**
   - `GetFetchXmlElementSuggestionsUseCase` - Returns element suggestions filtered by prefix
   - `GetOperatorSuggestionsUseCase` - Returns operator suggestions filtered by prefix
   - Reuses existing entity/attribute use cases for metadata-based suggestions

3. **Presentation Layer**
   - `FetchXmlCompletionProvider` - VS Code completion provider for 'fetchxml' language
     - Element suggestions with smart snippets (container vs leaf elements)
     - Attribute name suggestions with `="$1"` snippets
     - Attribute value suggestions:
       - Entity names from metadata
       - Attribute names for current entity context
       - Operators, filter types, link types, boolean values
   - `FetchXmlElementSuggestionCompletionMapper` - Maps domain to VS Code
   - `OperatorSuggestionCompletionMapper` - Maps domain to VS Code

4. **Registration**
   - Updated `registerDataExplorerIntelliSense.ts` to register FetchXML provider
   - Trigger characters: `<` (element), ` ` (attribute), `"` (value)

**Context-Aware Suggestions:**

| Context | Suggestions |
|---------|-------------|
| `<fetch><` | entity |
| `<entity name="` | Entity names from metadata |
| `<attribute name="` | Attribute names for current entity |
| `<condition operator="` | eq, ne, like, null, today, etc. (70+ operators) |
| `<filter type="` | and, or |
| `<link-entity link-type="` | inner, outer, exists, etc. |

**Files Created:**
- `src/features/dataExplorer/domain/services/FetchXmlContextDetector.ts`
- `src/features/dataExplorer/domain/services/FetchXmlContextDetector.test.ts`
- `src/features/dataExplorer/domain/valueObjects/FetchXmlElementSuggestion.ts`
- `src/features/dataExplorer/domain/valueObjects/OperatorSuggestion.ts`
- `src/features/dataExplorer/application/useCases/GetFetchXmlElementSuggestionsUseCase.ts`
- `src/features/dataExplorer/application/useCases/GetOperatorSuggestionsUseCase.ts`
- `src/features/dataExplorer/presentation/providers/FetchXmlCompletionProvider.ts`
- `src/features/dataExplorer/presentation/mappers/FetchXmlElementSuggestionCompletionMapper.ts`
- `src/features/dataExplorer/presentation/mappers/OperatorSuggestionCompletionMapper.ts`

**Files Modified:**
- `src/features/dataExplorer/presentation/initialization/registerDataExplorerIntelliSense.ts`

**Test Results:** 542 Data Explorer tests pass (41 new FetchXML tests)

**Next Steps:**
- Manual testing with F5 to verify IntelliSense in `.fetchxml` files and notebooks
- Phase 4: Aggregate query support (COUNT, SUM, etc.)
- Phase 5: SQL keyword cleanup (remove unsupported keywords)
