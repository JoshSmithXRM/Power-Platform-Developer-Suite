# SafeWebviewPanel Two-Level Cancellation - Task Tracking

**Branch:** `feature/finish-data-explorer-web-resources-metadata`
**Created:** 2024-12-04
**Status:** Ready for Manual Testing

---

## Overview

**Goal:** Implement two-level cancellation to stop API requests when panels are closed or operations are superseded.

**Problem Identified:**
- SafeWebviewPanel.abortSignal was created but never wired to use cases
- When panel closes, API requests continue running (wasting server resources)
- Logs showed paginated API calls continuing after panel disposal

**Discovery Findings:**
- `AbortSignalCancellationTokenAdapter` exists but is never imported/used
- `ListWebResourcesUseCase` already accepts `ICancellationToken` and checks it
- `handleSolutionChange` creates per-operation cancellation tokens (correct pattern)
- `handleEnvironmentChange` and `handleRefresh` pass NO cancellation tokens

---

## Requirements

- [x] SafeWebviewPanel provides abortSignal (already done)
- [x] AbortSignalCancellationTokenAdapter created (already done)
- [x] CompositeCancellationToken created (combines panel + operation tokens)
- [x] Panel-level cancellation: All operations cancelled when panel closes
- [x] Operation-level cancellation: Previous operation cancelled when new one starts
- [ ] Pattern applied to all panels that make API calls (WebResources done)

**Success Criteria:**
- [ ] When panel closes mid-request, subsequent pages are NOT requested
- [ ] Log shows "cancelled" message instead of continued API calls
- [ ] No "Webview is disposed" errors

---

## Two-Level Cancellation Design

### Level 1: Panel-Level (when panel closes)
- Create `AbortSignalCancellationTokenAdapter` from `this.panel.abortSignal` at construction
- Store as `this.panelCancellationToken`
- Pass to ALL use case calls
- When panel disposes, abortSignal triggers, all operations check and stop

### Level 2: Operation-Level (when user changes solution/environment)
- Create per-operation `CancellationTokenSource` (existing pattern in handleSolutionChange)
- Cancel previous operation before starting new one
- Pass both panel-level AND operation-level tokens (composite check)

---

## Implementation Checklist

### Phase 1: WebResourcesPanelComposed (Proof of Concept) - COMPLETE
- [x] Import AbortSignalCancellationTokenAdapter and CompositeCancellationToken
- [x] Create panel-level cancellation token in constructor
- [x] Update getAllWebResourcesWithCache to use composite token
- [x] handleRefresh path now uses panel cancellation token
- [x] handleEnvironmentChange path now uses panel cancellation token
- [x] `npm run compile` passes
- [ ] Manual test: close panel during load, verify no continued API calls

### Phase 2: Apply to Other Panels (Lower Priority)
Note: Other panels use VirtualTableCacheManager which would need refactoring to accept cancellation tokens.
The WebResources panel was the most critical because it fetches 5000+ records per page with multiple pages.

- [ ] SolutionExplorerPanelComposed (uses VirtualTableCacheManager)
- [ ] DataExplorerPanelComposed (executes SQL queries)
- [ ] MetadataBrowserPanel (uses VirtualTableCacheManager)
- [ ] PluginTraceViewerPanelComposed (uses VirtualTableCacheManager)
- [ ] EnvironmentVariablesPanelComposed (smaller datasets)
- [ ] ConnectionReferencesPanelComposed (smaller datasets)
- [ ] ImportJobViewerPanelComposed (uses VirtualTableCacheManager)
- [ ] EnvironmentSetupPanelComposed (no external API calls)
- [ ] PersistenceInspectorPanelComposed (no external API calls)
- [ ] `npm run compile` passes

### Phase 3: Verification
- [ ] All tests pass: `npm test`
- [ ] Manual testing (F5) complete
- [ ] Verified: closing panel stops API calls

---

## Files to Modify

### WebResourcesPanelComposed.ts
- Import `AbortSignalCancellationTokenAdapter`
- Add `private readonly panelCancellationToken: ICancellationToken`
- Initialize in constructor from `this.panel.abortSignal`
- Pass to: `handleRefresh`, `handleEnvironmentChange`, `loadAndDisplayWebResources`, `getFilteredWebResources`

### Other Panel Files (same pattern)
- Each panel that makes use case calls needs the same treatment

---

## Session Notes

### Session 1 (2024-12-04)
- Identified bug: panel closing doesn't stop API calls
- Implemented SafeWebviewPanel with abortSignal
- Discovered abortSignal was never wired to operations
- Analyzed logs showing continued API calls after disposal
- Decided: two-level cancellation, no network-level abort (server work already done)
- Implemented CompositeCancellationToken class
- Updated WebResourcesPanelComposed:
  - Added panelCancellationToken property
  - Initialize from panel.abortSignal in constructor
  - Updated getAllWebResourcesWithCache to use composite token
  - Now ALL paths to use case pass cancellation token
- Build passes
- **Next step:** Manual test to verify fix works
