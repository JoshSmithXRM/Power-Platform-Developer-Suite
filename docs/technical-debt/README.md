# Technical Debt Inventory

**Total Items:** 10 (6 items resolved/reclassified earlier, 3 low-priority items, 1 scheduled parser refactoring)

---

## 📊 Quick Summary

| Category | Count | Action Timeline |
|----------|-------|-----------------|
| **Accepted Tradeoffs** | 5 | Keep indefinitely (conscious decisions) |
| **Will Not Implement** | 1 | Rejected (over-engineering) |
| **Scheduled** | 1 | Fix in next 2-3 releases |
| **Low Priority** | 3 | Fix when naturally touching code |

---

## 📖 What Goes Where?

This folder tracks **architectural technical debt** - conscious design decisions and trade-offs.

For **code quality debt** (dead code, unused dependencies, circular dependencies), see:
- [CLEANUP_CHECKLIST.md](CLEANUP_CHECKLIST.md) - Step-by-step execution plan
- [POST_REFACTOR_CLEANUP.md](POST_REFACTOR_CLEANUP.md) - Post-refactor tracking

---

## ✅ Accepted Tradeoffs (5 items)

These are **conscious decisions to keep** based on cost/benefit analysis.

| Item | Type | Bugs Found | Decision |
|------|------|------------|----------|
| [getValue() Pattern](accepted-tradeoffs/getValue-pattern.md) | Tradeoff (effort vs benefit) | 0 | Not justified |
| [Large Panel Files](accepted-tradeoffs/large-panel-files.md) | Tradeoff (coordinator pattern) | 0 | Acceptable |
| [Unsafe Type Assertions](accepted-tradeoffs/unsafe-type-assertions.md) | Tradeoff (repositories validate) | 0 | Safe |
| [ESLint Suppressions](accepted-tradeoffs/eslint-suppressions.md) | Documentation (29 suppressions, 12 removed) | 0 | All justified |
| [Regex FetchXML Parsing](accepted-tradeoffs/regex-fetchxml-parsing.md) | Tradeoff (domain purity vs edge cases) | 0 | Domain purity wins |

### Reclassified as Architectural Patterns (No Longer Debt)
- **Static Factory Methods** → See [docs/architecture/STATIC_FACTORY_PATTERN.md](../architecture/STATIC_FACTORY_PATTERN.md)
- **OData Query Building** → See [docs/architecture/ODATA_DOMAIN_PATTERN.md](../architecture/ODATA_DOMAIN_PATTERN.md)

### When to Revisit
- **getValue():** Only if multiple bugs found due to ID mixing
- **Large Panels:** Only if panel exceeds 1,000 lines or contains business logic
- **Type Assertions:** Only if API contract violations cause runtime errors
- **ESLint Suppressions:** Quarterly review (ensure all still justified)
- **Regex FetchXML:** Only if multiple user complaints about nested filter behavior

---

## 🚫 Will Not Implement (1 item)

Correctly rejected suggestions that would add ceremony without benefit.

| Item | Suggested By | Reason Rejected |
|------|--------------|-----------------|
| [XML Formatter Interface](will-not-implement/xml-formatter-interface.md) | Code Guardian | Cargo cult DIP (infrastructure → infrastructure) |

**Message:** Good architectural judgment - avoided over-engineering.

---

## 📅 Scheduled (1 item)

Items with clear triggers or timelines for fixing.

| Item | Type | Effort | Timeline |
|------|------|--------|----------|
| [Parser Refactoring](scheduled/PARSER_REFACTORING.md) | Architectural (regex → stack-based) | 6-8 hours | Post v0.3.0 (v0.4.0 or v0.5.0) |

### Parser Refactoring Details
- **Problem**: FetchXmlParser uses regex which cannot handle nested XML structures
- **Impact**: Nested `<filter>` elements don't parse correctly (edge case)
- **Solution**: Refactor to stack-based tokenizer approach (zero dependencies)
- **Coverage**: Files excluded from thresholds until refactoring complete

**Previously resolved:**

✅ **Clean Architecture Guide Split** (completed 2025-11-23)
- Split into 3 focused documents:
  - `CLEAN_ARCHITECTURE_GUIDE.md` - 495 lines (Core principles)
  - `CLEAN_ARCHITECTURE_EXAMPLES.md` - 695 lines (Production examples)
  - `CLEAN_ARCHITECTURE_PATTERNS.md` - 773 lines (Mistakes & anti-patterns)
- Total: 1,963 lines (well-organized, each <800 lines)

✅ **DateTimeFilter Mixed Concerns** (resolved 2025-11-23)
- Extracted presentation helpers to `src/shared/presentation/utils/DateTimeFormatters.ts`
- Extracted domain helpers to `src/features/pluginTraceViewer/domain/utils/ODataFormatters.ts`
- DateTimeFilter now pure domain value object (UTC ISO only)
- Updated 3 callsites and comprehensive test suite
- Clean layer separation achieved

---

## 🔵 Low Priority (3 items)

Fix when it becomes a problem or when naturally touching the code.

| Item | Type | Effort | Trigger |
|------|------|--------|---------|
| [Notification Service Abstraction](low-priority/notification-service-abstraction.md) | Refactoring (consistency enforcement) | 4-6 hours | When refactoring 10+ notification callsites |
| [FileSystemProvider Complexity](low-priority/filesystemprovider-complexity.md) | Refactoring (separation of concerns) | 4-6 hours | When adding new content modes or conflict features |
| [Environment Repository Caching](low-priority/environment-repository-caching.md) | Performance (redundant loading) | 2-3 hours | When modifying EnvironmentRepository or SharedFactories |

**Previously resolved items:**

✅ **Cross-Feature DTO Coupling** (resolved 2025-11-23)
- Created `src/shared/application/dtos/EnvironmentConnectionDto.ts`
- Updated 4 import statements across codebase
- Features now independent, no cross-feature coupling

---

## 📈 Trends & Health

### Debt by Category (Visual)

```
Accepted Tradeoffs: █████  5 items (50%)
Will Not Implement: █      1 item  (10%)
Scheduled:          █      1 item  (10%)
Low Priority:       ███    3 items (30%)
```

### Decision Quality

| Metric | Value | Assessment |
|--------|-------|------------|
| **Items with zero bugs** | 9/9 (100%) | ✅ Excellent - all decisions validated |
| **Patterns promoted to architecture docs** | 2 items | ✅ Industry standards (static factories, OData) |
| **Rejected over-engineering** | 1 item | ✅ Good judgment (avoided cargo cult patterns) |
| **Items resolved in last review** | 4 items | ✅ Proactive (DateTimeFilter, split guide, shared DTO, ESLint rule) |
| **Documentation quality** | 29/29 suppressions documented | ✅ Perfect (100% documented) |
| **ESLint rule quality** | Prefix matching (future-proof) | ✅ Improved (12 suppressions eliminated) |
| **Notification consistency** | 99% (1/95 fixed) | ✅ Excellent (abstraction deferred, not urgent) |

**Overall Health:** 🟢 Excellent (9 items total: 5 accepted, 1 rejected over-engineering, 3 low-priority future improvements)

---

## 🔄 Lifecycle Management

### Adding New Technical Debt

1. **Create file** in appropriate category folder
2. **Use template** (see [TEMPLATE.md](TEMPLATE.md))
3. **Update this README** (add row to appropriate table)
4. **Link related items** (cross-reference if applicable)

### Moving Between Categories

```bash
# Example: Scheduled → Accepted Tradeoffs (after deciding not to fix)
git mv scheduled/some-item.md accepted-tradeoffs/
# Update README.md tables
```

### Resolving Technical Debt

```bash
# Delete the file when resolved
git rm accepted-tradeoffs/some-item.md
# Update README.md (remove row from table)
# Commit with message: "fix: resolve [item name] technical debt"
```

---

## 📋 File Structure

```
docs/technical-debt/
├── README.md                                    # This file (index)
├── TEMPLATE.md                                  # Template for new items
│
├── accepted-tradeoffs/                          # Indefinite (keep)
│   ├── getValue-pattern.md
│   ├── large-panel-files.md
│   ├── unsafe-type-assertions.md
│   ├── eslint-suppressions.md                  # 29 suppressions (12 removed 2025-11-23)
│   └── regex-fetchxml-parsing.md               # Domain purity vs XML parser (2025-11-30)
│
├── will-not-implement/                          # Rejected suggestions
│   └── xml-formatter-interface.md
│
├── scheduled/                                   # Has timeline
│   └── PARSER_REFACTORING.md                    # Regex → stack-based (v0.4.0+)
│
└── low-priority/                                # Opportunistic fix
    ├── notification-service-abstraction.md      # 95+ callsites, defer until refactoring
    ├── filesystemprovider-complexity.md         # ~800 lines, extract when adding features
    └── environment-repository-caching.md        # Redundant getAll() calls, add TTL cache

Reclassified as architectural patterns (moved to docs/architecture/):
- static-factory-methods.md → STATIC_FACTORY_PATTERN.md
- odata-query-building.md → ODATA_DOMAIN_PATTERN.md

Resolved:
- clean-architecture-guide-length.md → Split completed
- cross-feature-dto-coupling.md → Shared DTO created
- datetime-filter-mixed-concerns.md → Extracted to presentation/domain helpers
```

---

## 🎯 Quick Actions

### View All Scheduled Items
```bash
ls docs/technical-debt/scheduled/
```

### Find All Medium Priority Items
```bash
grep -r "Priority: Medium" docs/technical-debt/
```

### Check When Item Was Last Reviewed
```bash
grep "Last Reviewed" docs/technical-debt/scheduled/clean-architecture-guide-length.md
```

### List All Items by Category
```bash
find docs/technical-debt -name "*.md" -not -name "README.md" -not -name "TEMPLATE.md" -not -name "CLEANUP_CHECKLIST.md" -not -name "POST_REFACTOR_CLEANUP.md" | sort
```

---

## 📚 Related Documentation

| Document | Purpose |
|----------|---------|
| [CLEANUP_CHECKLIST.md](CLEANUP_CHECKLIST.md) | Code quality cleanup (dead code, unused deps, circular deps) |
| [POST_REFACTOR_CLEANUP.md](POST_REFACTOR_CLEANUP.md) | Post-refactor documentation cleanup tracking |
| [TEMPLATE.md](TEMPLATE.md) | Template for adding new technical debt items |
| `docs/TECHNICAL_DEBT.md` | **DEPRECATED** - Now split into categorized files |

---

## ❓ FAQ

### Q: When should I add something to technical debt?

**A:** Add when you make a **conscious decision to defer** a fix for valid reasons:
- ✅ High effort, low/zero bugs → Accepted Tradeoff
- ✅ Suggested improvement you rejected → Will Not Implement
- ✅ Has clear trigger to fix → Scheduled
- ✅ Wait for pattern to emerge → Low Priority

❌ **Don't add:**
- TODO comments (those go in code or issues)
- Bugs (those go in bug tracker)
- Feature requests (those go in product backlog)

---

### Q: How is this different from code quality debt?

**A:**

| Type | Examples | Detection | Location |
|------|----------|-----------|----------|
| **Architectural Debt** | getValue() pattern, cross-feature coupling | Manual review, architectural decisions | This folder (categorized files) |
| **Code Quality Debt** | Dead code, unused deps, circular dependencies | Automated tools (ts-prune, depcheck, madge) | CLEANUP_CHECKLIST.md |

---

### Q: What if I disagree with an "Accepted Tradeoff"?

**A:**
1. Read the full item file (has detailed reasoning)
2. Check "Bugs Found" (usually zero)
3. Check "Effort to Fix" (usually high)
4. If you still disagree, propose a discussion with evidence

---

### Q: How often should we review technical debt?

**A:**
- **Quarterly** (every 3 months) - Full review of all items
- **On-demand** - When touching related code
- **Before major releases** - Ensure nothing critical deferred

---

### Q: Can I delete items from "Will Not Implement"?

**A:** Only after significant time (1+ year) when context is no longer relevant. These serve as **architectural decision records** to prevent re-suggesting the same rejected ideas.

---

## 🔍 Quarterly Review Checklist

Run this checklist every 3 months:

- [ ] Review all **Scheduled** items - Are timelines still accurate?
- [ ] Review all **Accepted Tradeoffs** - Have bugs appeared? (If yes, reconsider)
- [ ] Review all **Low Priority** items - Has trigger occurred?
- [ ] Update "Last Reviewed" dates in each file
- [ ] Update this README with current counts
- [ ] Generate fresh code quality reports (see CLEANUP_CHECKLIST.md)

---

**Next Review:** 2026-02-22 (quarterly)
