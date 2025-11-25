# Fix Technical Debt

Interactively fix documented technical debt items with verification, planning, and code review.

## Process

### 1. Selection
Read `docs/technical-debt/README.md` and category folders (`scheduled/`, `low-priority/`, etc.).

Present numbered list to user:
```
1. **Item Name** (Priority: X, Effort: Y)
   - Status: Z
   - Issue: Brief description
```

Wait for user to select a number.

### 2. Verification
Verify the issue still exists (parallel reads/greps for patterns mentioned in debt file).

If resolved: Offer to delete the debt item file and update README.md.
If exists: Show evidence and ask "Proceed with fixing? (yes/no)"

### 3. Solution Planning
Use extended thinking ("think hard") to design the solution:
- Where should code live? (layer placement)
- Minimal refactor approach
- Dependencies and callsites to update
- Testing strategy

Present plan and ask "Approve this plan? (yes/no/modify)"

### 4. Implementation
Implement inside-out: Domain → Application → Infrastructure → Presentation

Run `npm run compile` after each layer.

### 5. Review
Run `npm test` to verify all tests pass.

Invoke **code-guardian** agent for approval:
```
Review these changes for Clean Architecture compliance.
Files modified: [list]
Tests: PASS
```

### 6. Cleanup
If approved:
- Delete the resolved debt item file: `git rm docs/technical-debt/category/item.md`
- Update `docs/technical-debt/README.md` (remove row, update counts)

### 7. Commit (if requested)
```
fix: resolve [debt item name] technical debt

[Description of changes]

Resolves technical debt item: [name]
```

## Error Handling

- **Already resolved**: Offer to delete debt file
- **code-guardian rejects**: Fix issues and re-submit
- **User cancels**: Exit gracefully

## Key Rules

- Always verify before fixing (issue might be resolved)
- Use extended thinking for solution planning
- Implement inside-out (Clean Architecture)
- code-guardian approval required before commit
- Delete resolved item files (don't leave stale docs)
