# [FEATURE NAME] - Task Tracking

**Branch:** `feature/[branch-name]`
**Created:** YYYY-MM-DD
**Status:** Discovery | Requirements | Design | Implementation | Testing | Review | Complete

---

## Overview

**Goal:** [One sentence description of what this feature accomplishes]

**Discovery Findings:**
- Found: [existing patterns/code that can be reused]
- Will reuse: [specific files/patterns to leverage]
- Need to create: [new code required]

---

## Requirements

- [ ] [Requirement 1]
- [ ] [Requirement 2]
- [ ] [Requirement 3]

**Success Criteria:**
- [ ] [How we know the feature works]

---

## Implementation Checklist

### Domain Layer
- [ ] Entity/Value Object implementation
- [ ] Domain service (if needed)
- [ ] Repository interface
- [ ] Unit tests (target: 100%)
- [ ] `npm run compile` passes
- [ ] Committed

### Application Layer
- [ ] Use case implementation
- [ ] ViewModel definition
- [ ] Mapper implementation
- [ ] Unit tests (target: 90%)
- [ ] `npm run compile` passes
- [ ] Committed

### Infrastructure Layer
- [ ] Repository implementation
- [ ] API integration (if needed)
- [ ] `npm run compile` passes
- [ ] Committed

### Presentation Layer
- [ ] Panel/UI implementation
- [ ] `npm run compile` passes
- [ ] Committed

---

## Testing

- [ ] Unit tests pass: `npm test`
- [ ] Integration tests (if panel): Written and passing
- [ ] E2E tests (if UI changes): `npm run e2e:smoke`
- [ ] Manual testing (F5): Complete

### Bugs Found During Manual Testing

| Bug | Status | Notes |
|-----|--------|-------|
| | | |

---

## Review & Merge

- [ ] All implementation checkboxes complete
- [ ] All bugs from manual testing fixed
- [ ] `/code-review` - APPROVED
- [ ] CHANGELOG.md updated
- [ ] PR created: `gh pr create`
- [ ] CI passes

---

## Cleanup (After Merge)

- [ ] Design doc: Extract patterns OR delete
- [ ] This tracking doc: Delete (`git rm`)
- [ ] Related documentation updated

---

## Session Notes

### Session 1 (YYYY-MM-DD)
- [Notes from this session]
- [Handoff context for next session]

### Session 2 (YYYY-MM-DD)
- [Continue notes]
