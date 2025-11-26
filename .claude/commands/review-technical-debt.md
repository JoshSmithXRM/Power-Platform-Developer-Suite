# Review Technical Debt

Audit documented technical debt items to verify relevance and clean up resolved issues.

## Process

### 1. Discovery
Read `docs/technical-debt/README.md` and all category folders in parallel:
- `accepted-tradeoffs/`
- `will-not-implement/`
- `scheduled/`
- `low-priority/`

### 2. Verification (Parallel)
For each debt item, verify it still exists:
- Grep for patterns mentioned in the file
- Read referenced code files
- Check if code matches description

### 3. Classification

| Status | Action |
|--------|--------|
| ✅ RESOLVED | Delete file (`git rm`), update README |
| ⚠️ OUTDATED | Update description or delete |
| 📋 STILL VALID | Update "Last Reviewed" date |
| ❌ RECLASSIFY | Move to correct category folder |
| ❓ NEEDS INVESTIGATION | Flag for user review |

### 4. Cleanup
- Delete resolved item files
- Update `docs/technical-debt/README.md` (counts, tables)
- Update "Last Reviewed" dates in valid items

### 5. Report
Generate summary:
```
# Technical Debt Review - [date]

Reviewed: X items

- ✅ Resolved: N (deleted)
- 📋 Still Valid: N (updated dates)
- ⚠️ Outdated: N (updated/deleted)
- ❌ Reclassified: N (moved)
- ❓ Needs Investigation: N

[Details for each category]
```

## Key Rules

- Verify ALL items in parallel (don't waste time sequentially)
- Provide evidence for RESOLVED classification
- Delete resolved files (don't leave stale docs)
- Update README.md after any file changes
