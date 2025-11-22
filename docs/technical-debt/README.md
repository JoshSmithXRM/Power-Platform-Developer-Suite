# Technical Debt Documentation

This directory contains analysis and tracking of technical debt, dead code, and cleanup tasks.

---

## 📚 Dead Code Analysis (2025-11-22)

### Quick Links

| Document | Purpose | Audience |
|----------|---------|----------|
| **[DEAD_CODE_SUMMARY.md](DEAD_CODE_SUMMARY.md)** | 🎯 **START HERE** - Quick overview and priorities | Decision makers |
| **[DEAD_CODE_CLEANUP_REPORT.md](DEAD_CODE_CLEANUP_REPORT.md)** | 📊 Comprehensive analysis (400+ lines) | Developers |
| **[CLEANUP_CHECKLIST.md](CLEANUP_CHECKLIST.md)** | ✅ Step-by-step execution plan | Implementers |

### Raw Reports

| File | Tool | Description |
|------|------|-------------|
| `ts-prune-report.txt` | ts-prune | Unused TypeScript exports (85 items) |
| `depcheck-report.json` | depcheck | Unused npm dependencies (4 packages) |
| `madge-report.txt` | madge | Circular dependencies (3 cycles) |

---

## 🎯 Key Findings

### Unused npm Dependencies (High Priority)
```bash
npm uninstall axios node-fetch @types/node-fetch node-persist
```
**Impact**: 4 packages, ~600KB, ZERO risk to remove

### Circular Dependencies
1. **Domain Layer** (FIX FIRST): `FilterCondition ↔ ODataExpressionBuilder`
2. **UI Layer**: `EnvironmentSelectorSection ↔ environmentSelectorView`
3. **UI Layer**: `DropdownSection ↔ dropdownView`

### Unused TypeScript Exports
- **85 total exports flagged**
- **~20 actually dead** (rest are false positives)
- **Categories**:
  - Type-only exports (keep)
  - VS Code API contracts (keep)
  - Data loader classes (decision needed: delete or wire up)
  - Dead utilities (safe to delete)

---

## 📊 Cleanup Impact

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| npm packages | 45 | 41 | -4 |
| TypeScript files | 530 | ~520 | -10 |
| Lines of code | 66,571 | ~65,500 | -1,000 |
| Unused exports | 85 | ~20 | -76% |
| Circular deps | 3 | 0 | -100% |

**Estimated cleanup time**: 6 hours
**Risk level**: Low (most changes are deletions)

---

## 🚀 Quick Start

### Want to start NOW? (5 minutes)

```bash
# Phase 1: Remove unused npm packages (ZERO RISK)
npm uninstall axios node-fetch @types/node-fetch node-persist
npm run compile && npm test
git commit -am "chore: remove unused npm dependencies"
```

### Full Cleanup (6 hours)

Follow **[CLEANUP_CHECKLIST.md](CLEANUP_CHECKLIST.md)** for step-by-step guide.

---

## 🔍 Analysis Tools Used

### ts-prune
Finds unused TypeScript exports across the codebase.

```bash
npx ts-prune > ts-prune-report.txt
```

**Note**: Reports many false positives (type-only imports, VS Code API contracts, etc.)

### depcheck
Finds unused npm dependencies.

```bash
npx depcheck --json > depcheck-report.json
```

**100% accurate** for unused dependencies.

### madge
Analyzes module dependencies and finds circular references.

```bash
# Find circular dependencies
npx madge --circular src/ --extensions ts

# Generate summary
npx madge --summary src/ --extensions ts

# Generate visual graph
npx madge --image graph.png src/ --extensions ts
```

---

## 📅 Cleanup Schedule

### Immediate (This Week)
- [x] Generate analysis reports ✅
- [x] Document findings ✅
- [ ] Remove unused npm packages (30 min)
- [ ] Decide on data loader classes (1 hour)

### Short-term (Next Sprint)
- [ ] Fix domain layer circular dependency (1 hour) - **HIGH PRIORITY**
- [ ] Delete dead view functions (30 min)
- [ ] Fix UI layer circular dependencies (1 hour)
- [ ] Delete dead utilities (2 hours)

### Long-term (Next Quarter)
- [ ] Add CI/CD checks for dead code
- [ ] Quarterly cleanup audits
- [ ] Document export policies

---

## 🎓 Lessons Learned

### Common Causes of Dead Code

1. **Feature exploration** - Tried multiple approaches, kept all code
2. **Refactoring incomplete** - Started migration, never finished
3. **Copy-paste from examples** - Brought in unused dependencies
4. **Over-engineering** - Built abstractions never used (data loaders)

### Prevention Strategies

1. **Delete aggressively** - If you replace code, delete the old version
2. **YAGNI principle** - Don't build abstractions until you need them
3. **Regular audits** - Run cleanup quarterly
4. **CI/CD checks** - Automate detection

---

## 📖 Related Documentation

- [DUPLICATE_RENDERING_INVENTORY.md](DUPLICATE_RENDERING_INVENTORY.md) - Duplicate code analysis
- [../../CLAUDE.md](../../CLAUDE.md) - Coding standards (prevents future debt)
- [../../.eslintrc.json](../../eslint.config.mjs) - Code quality rules

---

## 🤝 Contributing to Cleanup

### Before You Delete

1. **Search for usages**: `grep -r "ClassName" src/ --include="*.ts"`
2. **Check tests**: Deleted code might be tested
3. **Run compilation**: `npm run compile`
4. **Run tests**: `npm test`
5. **Manual smoke test**: Press F5, test affected panels

### Commit Message Format

```
chore: remove unused [category]

- Delete [specific item]
- Delete [specific item]

Verified: npm run compile && npm test passed
```

Examples:
- `chore: remove unused npm dependencies (axios, node-fetch)`
- `chore: remove unused DataLoader classes`
- `refactor: resolve FilterCondition circular dependency`

---

## ❓ Questions?

See **[DEAD_CODE_CLEANUP_REPORT.md](DEAD_CODE_CLEANUP_REPORT.md)** section 9 for open questions and decision points.

---

**Last Updated**: 2025-11-22
**Next Review**: 2025-02-22 (quarterly)
