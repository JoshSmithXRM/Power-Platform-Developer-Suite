# Technical Debt Inventory

**Last Updated:** 2025-11-22
**Total Items:** 7

---

## 📊 Quick Summary

| Category | Count | Action Timeline |
|----------|-------|-----------------|
| **Accepted Tradeoffs** | 3 | Keep indefinitely (conscious decisions) |
| **Will Not Implement** | 1 | Rejected (over-engineering) |
| **Scheduled** | 2 | Fix in next 1-2 sprints |
| **Low Priority** | 1 | Fix when naturally touching code |

---

## 📖 What Goes Where?

This folder tracks **architectural technical debt** - conscious design decisions and trade-offs.

For **code quality debt** (dead code, unused dependencies, circular dependencies), see:
- [CLEANUP_CHECKLIST.md](CLEANUP_CHECKLIST.md) - Step-by-step execution plan
- [POST_REFACTOR_CLEANUP.md](POST_REFACTOR_CLEANUP.md) - Post-refactor tracking

---

## ✅ Accepted Tradeoffs (3 items)

These are **conscious decisions to keep** based on cost/benefit analysis. Zero bugs found, high refactoring cost not justified.

| Item | Effort to Fix | Bugs Found | Decision |
|------|---------------|------------|----------|
| [getValue() Pattern](accepted-tradeoffs/getValue-pattern.md) | 6-8 hours | 0 | Not justified |
| [Large Panel Files](accepted-tradeoffs/large-panel-files.md) | N/A | 0 | Coordinator pattern |
| [Unsafe Type Assertions](accepted-tradeoffs/unsafe-type-assertions.md) | 8-12 hours | 0 | Repositories validate |

### When to Revisit
- **getValue():** Only if multiple bugs found due to ID mixing
- **Large Panels:** Only if panel exceeds 1,000 lines or contains business logic
- **Type Assertions:** Only if API contract violations cause runtime errors

---

## 🚫 Will Not Implement (1 item)

Correctly rejected suggestions that would add ceremony without benefit.

| Item | Suggested By | Reason Rejected |
|------|--------------|-----------------|
| [XML Formatter Interface](will-not-implement/xml-formatter-interface.md) | Code Guardian | Cargo cult DIP (infrastructure → infrastructure) |

**Message:** Good architectural judgment - avoided over-engineering.

---

## 📅 Scheduled (2 items)

Items with clear triggers or timelines for fixing.

| Item | Priority | Timeline | Trigger |
|------|----------|----------|---------|
| [Clean Architecture Guide Length](scheduled/clean-architecture-guide-length.md) | **Medium** | Next doc sprint | Already 1,708 lines (42% over limit) |
| [DateTime Filter Mixed Concerns](scheduled/datetime-filter-mixed-concerns.md) | Medium | When touching code | Next filter feature or refactor |

### Details

**Clean Architecture Guide:**
- **Status:** 1,708 lines (approaching 2,000 threshold)
- **Growth:** +21% in one cycle (was 1,403 lines)
- **Action:** Split into 3 documents (~500-600 lines each)
- **Effort:** 2-3 hours

**DateTime Filter:**
- **Status:** Format conversion methods in domain layer
- **Impact:** Low (works correctly, well-tested)
- **Action:** Extract helpers to application/infrastructure layers
- **Effort:** 2-3 hours

---

## 🔵 Low Priority (1 item)

Fix when it becomes a problem or when naturally touching the code.

| Item | Fix When | Effort |
|------|----------|--------|
| [Cross-Feature DTO Coupling](low-priority/cross-feature-dto-coupling.md) | 3rd feature needs environment data | 15-20 min |

**Details:**
- **Current:** Persistence Inspector imports EnvironmentConnectionDto from environmentSetup
- **Why acceptable:** Infrastructure → infrastructure coupling allowed in Clean Architecture
- **When to fix:** Wait for 3rd feature (don't abstract until you need it twice)

---

## 📈 Trends & Health

### Debt by Category (Visual)

```
Accepted Tradeoffs: ███ 3 items (43%)
Will Not Implement: █   1 item  (14%)
Scheduled:          ██  2 items (29%)
Low Priority:       █   1 item  (14%)
```

### Decision Quality

| Metric | Value | Assessment |
|--------|-------|------------|
| **Items with zero bugs** | 6/7 (86%) | ✅ Excellent - decisions validated by reality |
| **Rejected over-engineering** | 1 item | ✅ Good judgment (avoided cargo cult patterns) |
| **Scheduled with clear triggers** | 2 items | ✅ Actionable (not vague "someday" items) |
| **Low-priority deferred** | 1 item | ✅ Pragmatic (YAGNI principle applied) |

**Overall Health:** 🟢 Excellent

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
│   └── unsafe-type-assertions.md
│
├── will-not-implement/                          # Rejected suggestions
│   └── xml-formatter-interface.md
│
├── scheduled/                                   # Has timeline
│   ├── clean-architecture-guide-length.md
│   └── datetime-filter-mixed-concerns.md
│
└── low-priority/                                # Opportunistic fix
    └── cross-feature-dto-coupling.md
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
