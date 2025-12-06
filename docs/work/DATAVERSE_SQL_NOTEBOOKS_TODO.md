# Dataverse SQL Notebooks - Task Tracking

**Branch:** `feature/finish-data-explorer-web-resources-metadata`
**Created:** 2025-12-04
**Status:** POC Complete - Pending Evaluation

---

## Overview

**Goal:** Provide a notebook experience for writing and executing SQL queries against Dataverse with environment switching, leveraging VS Code's native Notebook API.

**Discovery Findings:**
- Found: Existing SQL→FetchXML transpiler, query execution use cases, result mappers
- Will reuse: `ExecuteSqlQueryUseCase`, `QueryResultViewModelMapper`, `DataverseDataExplorerQueryRepository`
- Need to create: Notebook serializer, controller, registration module

---

## POC Status

### What Works
- [x] `.dataverse-sql` file extension recognized as notebook
- [x] SQL cells with syntax highlighting
- [x] Environment selector in status bar (when notebook is active)
- [x] Cell execution against Dataverse
- [x] Results rendered as theme-aware HTML table
- [x] Environment persisted in notebook metadata
- [x] "New Dataverse SQL Notebook" command

### Known Bugs / Issues

| Bug | Severity | Status | Notes |
|-----|----------|--------|-------|
| IntelliSense uses wrong environment | High | Open | See detailed analysis below |
| Lookup links not clickable | Low | Open | POC limitation - needs webview message handling |

---

## Critical Bug: IntelliSense Environment Mismatch

### Problem Description

The IntelliSense system (`IntelliSenseContextService`, `DataverseCompletionProvider`) is a **singleton** registered for all `.sql` files. It maintains a single "current environment" that was designed for the Data Explorer panel.

When a notebook is opened:
1. The notebook has its own environment stored in metadata
2. The notebook controller uses this environment for query execution
3. But IntelliSense continues using whatever environment the Data Explorer panel last set
4. This causes entity/attribute suggestions to come from the wrong environment

### Why This Matters

If a user:
1. Opens Data Explorer → connects to Environment A
2. Creates a notebook → selects Environment B
3. Types `SELECT * FROM ` → gets entity suggestions from Environment A (wrong!)

This is confusing and could lead to queries failing because entities don't exist in Environment B.

### Root Cause

The `IntelliSenseContextService` was designed as a singleton with global state:
```typescript
// Current architecture (problematic for notebooks)
class IntelliSenseContextService {
    private currentEnvironmentId: string | undefined;  // Single global state

    setEnvironmentId(envId: string): void { ... }
    getEnvironmentId(): string | undefined { ... }
}
```

### Required Fix

The IntelliSense context needs to be **document-scoped**, not global:

**Option 1: Document-scoped context map**
```typescript
class IntelliSenseContextService {
    private environmentByDocument: Map<string, string> = new Map();

    setEnvironmentForDocument(documentUri: string, envId: string): void { ... }
    getEnvironmentForDocument(documentUri: string): string | undefined { ... }
}
```

The `DataverseCompletionProvider` would then look up the environment based on the document being edited.

**Option 2: Notebook-aware context**
```typescript
class IntelliSenseContextService {
    private panelEnvironmentId: string | undefined;
    private notebookEnvironments: Map<string, string> = new Map();

    // Panel sets global context (existing behavior)
    setEnvironmentId(envId: string): void { ... }

    // Notebooks set per-notebook context
    setNotebookEnvironment(notebookUri: string, envId: string): void { ... }

    // Provider resolves based on document type
    getEnvironmentForDocument(document: vscode.TextDocument): string | undefined {
        if (document.uri.scheme === 'vscode-notebook-cell') {
            const notebookUri = this.getNotebookUri(document);
            return this.notebookEnvironments.get(notebookUri) ?? this.panelEnvironmentId;
        }
        return this.panelEnvironmentId;
    }
}
```

### Files to Modify

1. `src/features/dataExplorer/application/services/IntelliSenseContextService.ts`
   - Add document-scoped environment tracking

2. `src/features/dataExplorer/presentation/providers/DataverseCompletionProvider.ts`
   - Pass document to context service when resolving environment

3. `src/features/dataExplorer/notebooks/DataverseSqlNotebookController.ts`
   - Update IntelliSense context when notebook environment changes

4. `src/features/dataExplorer/notebooks/registerNotebooks.ts`
   - Pass IntelliSense services to controller

### Effort Estimate

- Refactoring IntelliSenseContextService: Medium complexity
- Updating CompletionProvider: Low complexity
- Wiring notebook controller: Low complexity
- Testing all scenarios: Medium complexity

**Total: ~2-4 hours of focused work**

---

## Decision: POC Viability

### Should We Proceed?

**Arguments FOR proceeding:**
1. Core notebook functionality works (execution, results, environment switching)
2. IntelliSense bug is fixable with known approach
3. Notebooks provide better UX for exploratory data analysis than panels
4. Reuses existing infrastructure (transpiler, execution, mapping)
5. VS Code Notebook API is mature and well-supported

**Arguments AGAINST proceeding:**
1. IntelliSense bug requires non-trivial refactoring
2. Adds maintenance burden (another surface area)
3. Data Explorer panel already provides similar functionality
4. May confuse users having two ways to query (panel vs notebook)

### Recommendation

**Proceed with caution.** The POC validates the core concept works. However:

1. **Fix the IntelliSense bug first** before adding more notebook features
2. Consider whether notebooks should **replace** or **complement** the Data Explorer panel
3. If complementing, clearly differentiate use cases (panel = quick queries, notebooks = saved analysis)

---

## Implementation Checklist (If Proceeding)

### Phase 1: Fix IntelliSense (Required)
- [ ] Refactor `IntelliSenseContextService` for document-scoped environments
- [ ] Update `DataverseCompletionProvider` to use document context
- [ ] Wire notebook controller to update IntelliSense context
- [ ] Test: Panel and notebook environments work independently
- [ ] `npm run compile` passes

### Phase 2: Polish POC
- [ ] Add clickable lookup links (webview message handling)
- [ ] Add "Run All Cells" support
- [ ] Add keyboard shortcut (Ctrl+Enter already works via controller)
- [ ] Error display improvements

### Phase 3: Feature Parity
- [ ] FetchXML cell support (separate cell type)
- [ ] Query history integration
- [ ] Export results to CSV
- [ ] Copy cell output

---

## Session Notes

### Session 1 (2025-12-04)
- Created POC for Dataverse SQL Notebooks
- Implemented serializer, controller, registration
- Fixed theme colors (CSS variables)
- Fixed status bar visibility
- Identified IntelliSense singleton bug - needs architectural fix
- POC is functional but IntelliSense uses wrong environment

**Handoff context:**
- POC code in `src/features/dataExplorer/notebooks/`
- IntelliSense bug documented above with solution approach
- Decision needed: proceed to Phase 1 or park the feature?
