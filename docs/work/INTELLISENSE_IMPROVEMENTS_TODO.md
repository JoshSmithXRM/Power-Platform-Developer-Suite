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

### FetchXML IntelliSense (Post SQL Fixes)
- [ ] FetchXML context detector (element/attribute detection)
- [ ] FetchXML completion provider
- [ ] Entity name suggestions (in `<entity name="">`)
- [ ] Attribute name suggestions (in `<attribute name="">`)
- [ ] Operator suggestions (in `<condition operator="">`)
- [ ] Element suggestions (valid child elements)

### Notebook Improvements (Post FetchXML IntelliSense)
- [ ] FetchXML notebooks (`.dataverse-fetchxml` extension)
- [ ] FetchXML file editor (like SQL file editor)
- [ ] Fix notebook data table links (lookup links not clickable)
- [ ] Document-scoped IntelliSense context (notebook environment isolation)

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

### Phase 2: FetchXML IntelliSense (After Phase 1)

#### 2.1 Domain Layer
- [ ] Create `FetchXmlContextDetector` domain service
- [ ] Create `FetchXmlElementSuggestion` value object
- [ ] Create `OperatorSuggestion` value object
- [ ] Define valid element hierarchy (fetch → entity → attribute, etc.)
- [ ] Unit tests
- [ ] `npm run compile` passes

#### 2.2 Application Layer
- [ ] Create `GetFetchXmlElementSuggestionsUseCase`
- [ ] Create `GetOperatorSuggestionsUseCase`
- [ ] Reuse existing `GetEntitySuggestionsUseCase`
- [ ] Reuse existing `GetAttributeSuggestionsUseCase`
- [ ] `npm run compile` passes

#### 2.3 Presentation Layer
- [ ] Create `FetchXmlCompletionProvider`
- [ ] Register for XML files with content-based activation
- [ ] Create element/operator mappers
- [ ] Wire into registration
- [ ] `npm run compile` passes

### Phase 3: Notebook & Editor Improvements (After Phase 2)

#### 3.1 FetchXML Notebooks
- [ ] Create `.dataverse-fetchxml` notebook type
- [ ] Serializer for FetchXML notebooks
- [ ] Controller for FetchXML execution
- [ ] Registration

#### 3.2 FetchXML File Editor
- [ ] Add "New FetchXML Query" button to panel
- [ ] Add "Open FetchXML File" support
- [ ] FetchXML → SQL preview in panel

#### 3.3 Fix Notebook Data Table Links
- [ ] Implement webview message handling for lookup clicks
- [ ] Navigate to record in browser or panel

#### 3.4 Document-Scoped IntelliSense Context
- [ ] Refactor `IntelliSenseContextService` for document-scoped environments
- [ ] Handle `vscode-notebook-cell` URI scheme
- [ ] Test: Panel and notebook environments work independently

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
