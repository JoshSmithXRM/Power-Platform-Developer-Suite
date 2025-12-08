# Feature Completion Tracking - Data Explorer, Web Resources, Metadata Browser

**Branch:** `feature/finish-data-explorer-web-resources-metadata`
**Created:** 2025-12-02
**Target Version:** v0.3.0

---

## Summary

This document tracks remaining work to complete three features for v0.3.0.

| Feature | Status |
|---------|--------|
| Web Resources | **COMPLETE** |
| Metadata Browser | **COMPLETE** |
| Data Explorer | In Progress |

---

## 1. Web Resources - COMPLETE

All planned features implemented:
- Browse web resources with solution filtering
- Edit and save changes to Dataverse
- Publish: single, publish all, post-save notification
- Conflict detection (warn if modified by another user)
- Version selection UX (published vs unpublished)
- Syntax highlighting for custom URI scheme

---

## 2. Metadata Browser - COMPLETE

All planned features implemented:
- Browse entities with hierarchical navigation
- View attributes, relationships, keys, privileges
- Global choice sets with values
- Export metadata to JSON
- Search within entity/attribute lists

**Deferred to Solution Explorer:**
- Solution-aware filtering (belongs in Solution Explorer, not Metadata Browser)

---

## 3. Data Explorer - Remaining Work

### Completed Phases

| Phase | Feature | Status |
|-------|---------|--------|
| 1 | IntelliSense + Native VS Code Editor | **DONE** (2025-12-04) |
| 1+ | FetchXML IntelliSense | **DONE** (2025-12-06) |
| 1+ | Notebook improvements (links, FetchXML cells) | **DONE** (2025-12-06) |
| 3a | Aggregates (DISTINCT, COUNT, SUM, AVG, MIN, MAX, GROUP BY) | **DONE** (2025-12-06) |
| 3b | Basic JOINs (INNER JOIN, LEFT JOIN) | **DONE** (2025-12-06) |
| 5.3 | Visual Query Builder - Core (Entity, Columns, Filters, Sort, Options) | **DONE** (2025-12-08) |
| 5.4 | Sticky Action Bar (Execute/Clear) | **DONE** (2025-12-08) |
| - | Cell Selection (Excel-style) - all panels except Data Explorer | **DONE** (2025-12-08) |

### Remaining Work (v0.3.0)

| Phase | Feature | Effort | Status |
|-------|---------|--------|--------|
| 5.5 | Export/Import Toolbar | 4-6h | **IN PROGRESS** |
| 5.7 | Notebook ↔ Panel Integration | 4-6h | Planned |
| 5.9 | Cleanup & Polish | 2-4h | Planned |

**Visual Query Builder Details:** See `DATA_EXPLORER_VISUAL_BUILDER_TODO.md`

### Deferred (Not v0.3.0)

Moved to `docs/future/DATA_MANAGEMENT.md`:
- Query History (notebooks serve this purpose)
- INSERT/UPDATE/DELETE (12-16h)
- View Management / UserQuery Save (needs layoutxml)
- Advanced VQB Features (AND/OR groups, Joins, Aggregates in VQB)
- Advanced Aggregates (HAVING, date grouping)
- Advanced JOIN types (EXISTS, IN, ANY, ALL)

---

## Total Remaining: ~10-16 hours

| Item | Effort |
|------|--------|
| Export/Import Toolbar | 4-6h |
| Notebook ↔ Panel Integration | 4-6h |
| Cleanup & Polish | 2-4h |

---

## Pre-Merge Checklist

Before merging this branch:
- [ ] Update `docs/future/DATA_MANAGEMENT.md` - mark implemented items (DONE)
- [ ] Run `/code-review` for final approval
- [ ] Run `/prepare-release` to bump version and update CHANGELOG
- [ ] Delete this tracking doc after PR merge

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2025-12-02 | Defer local folder sync | Bundle with Deployment Settings / ALM features |
| 2025-12-03 | Move solution filtering to Solution Explorer | Metadata Browser is for ALL metadata |
| 2025-12-03 | Defer Excel export | Heavy bundle size; clipboard copy sufficient |
| 2025-12-04 | Visual Query Builder as THIRD mode | Alongside SQL and FetchXML modes |
| 2025-12-04 | Personal Views only (no System Views) | System Views require Solution context |
| 2025-12-06 | Defer HAVING and date grouping | Requires custom syntax or complex handling |
| 2025-12-06 | Defer advanced JOINs | No standard SQL equivalent for EXISTS, IN, etc. |
| 2025-12-07 | Consolidate tracking docs | Merged IntelliSense doc into this + DATA_MANAGEMENT.md |

---

**Last Updated:** 2025-12-08 (scope reduction - deferred Query History, INSERT/UPDATE/DELETE, View Management)
