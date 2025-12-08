# README Screenshots and Visual Documentation

**Category:** Scheduled
**Priority:** Medium
**Effort:** 2-3 hours
**Last Reviewed:** 2025-12-08

---

## Summary

The README lacks visual documentation (screenshots, GIFs) that would help users understand the extension's capabilities at a glance. Visual documentation is standard for VS Code extensions and significantly improves discoverability.

**Decision: Add screenshots in a future documentation sprint**

---

## Current State

The README is text-only with no visual examples of any panels or features. Users must install the extension to see what it looks like.

**Affected files:**
- `README.md`
- `images/` (would need new screenshot files)

---

## Why Deferred

Screenshots require:
1. Consistent sample data across environments
2. Dark/light mode variants (or choosing one)
3. Maintenance when UI changes
4. Storage decisions (repo vs. external hosting)

Current focus is on feature completion (Data Explorer, Web Resources). Visual documentation is a polish item for post-feature-complete phase.

---

## When to Address

**Triggers (OR condition):**
- Before major marketplace promotion
- Before v1.0 release
- During a documentation sprint
- When preparing demo materials

**Timeline:** Next 2-3 releases (after current feature work stabilizes)

---

## Proposed Solution

### Step 1: Capture Screenshots

Create screenshots for each major panel:
- Environment Setup (add environment form)
- Solution Explorer (solution list with search)
- Data Explorer (query builder + results)
- Web Resources (file list + editor)
- Metadata Browser (three-panel view)
- Plugin Trace Viewer (trace list + detail)

### Step 2: Optimize Images

```bash
# Use imageoptim or similar to reduce file sizes
# Target: < 200KB per screenshot
```

### Step 3: Add to README

```markdown
## Features

### Data Explorer
![Data Explorer - SQL query with results](images/screenshots/data-explorer.png)

Query Dataverse using SQL or FetchXML...
```

**Effort:** 2-3 hours (capturing, optimizing, updating README)

---

## Risks of Not Addressing

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Lower discoverability | Medium | High | Feature descriptions partially compensate |
| Users don't understand capabilities | Medium | Medium | Detailed text descriptions help |

**Current risk level:** Low (extension is functional, just less discoverable)

---

## Related Items

- None (standalone documentation task)

---

## References

**Pattern Documentation:**
- VS Code extension best practices recommend visual documentation
- Top marketplace extensions use screenshots prominently

**Discussions:**
- README review 2025-12-08: Identified missing screenshots as documentation debt
