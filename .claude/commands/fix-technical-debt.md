# Fix Technical Debt Command

**Purpose:** Interactively fix documented technical debt items - verify existence, plan solution, implement fix, send for code review

**Frequency:** As needed (per sprint planning or when addressing specific debt)

**Invocation:** `/fix-technical-debt`

---

## Command Execution Process

### Phase 1: Selection

**1. Read current technical debt:**
```bash
Read docs/TECHNICAL_DEBT.md
```

**2. Present interactive list to user:**

```markdown
I found 6 technical debt items. Which would you like to fix?

1. **Business Logic in Command Handlers** (Priority: Medium, Effort: 4-6 hours)
   - Status: Ready to Address
   - Issue: extension.ts contains orchestration logic that belongs in use cases

2. **DateTimeFilter Mixed Concerns** (Priority: Medium, Effort: 2-3 hours)
   - Status: Documented
   - Issue: Value object mixes domain, presentation, and infrastructure concerns

3. **Cross-Feature DTO Coupling** (Priority: Low, Effort: 15-20 min)
   - Status: Deferred
   - Issue: Persistence Inspector imports EnvironmentConnectionDto from environmentSetup

[... list all items ...]

Please select a number (1-6) or say "cancel" to exit.
```

**User selects number (e.g., "2")**

---

### Phase 2: Verification

**3. Verify issue still exists:**

**Run parallel verification:**
```bash
# For DateTimeFilter example
Read src/shared/domain/valueObjects/DateTimeFilter.ts
Grep for "toLocalDateTime" in DateTimeFilter.ts
Grep for "toODataFormat" in DateTimeFilter.ts
Read src/features/pluginTraceViewer/domain/services/ODataExpressionBuilder.ts
Grep for usage of DateTimeFilter conversion methods
```

**4. Confirm with user:**

```markdown
✅ Verified: DateTimeFilter mixed concerns issue still exists.

**Evidence:**
- DateTimeFilter.ts contains toLocalDateTime() (presentation concern)
- DateTimeFilter.ts contains toODataFormat() (infrastructure concern)
- Domain value object should only contain domain logic

Do you want to proceed with fixing this? (yes/no)
```

**User confirms: "yes"**

---

### Phase 3: Solution Planning (Extended Thinking)

**5. Think hard about solution:**

```markdown
Think hard about the best approach to fix DateTimeFilter mixed concerns.

Consider:
- Where should format conversion logic live? (helper functions, services, or mappers?)
- What's the minimal refactor? (extract methods vs redesign entire value object)
- What are the dependencies? (who uses toLocalDateTime and toODataFormat?)
- How to maintain backward compatibility during refactor?
- Testing strategy (existing tests, new tests needed?)

Design the solution to:
1. Pure domain value object (only domain logic)
2. Format conversion in appropriate layers
3. Minimal breaking changes
4. Well-tested
```

**6. Present solution plan:**

```markdown
# Solution Plan: DateTimeFilter Mixed Concerns

## Approach

**Extract format conversion to helper functions in appropriate layers**

### Changes Required

**1. Domain Layer (Pure Value Object)**
- KEEP: `DateTimeFilter` with `fromUtcIso()`, `getUtcIso()`, `isBefore()`
- REMOVE: `toLocalDateTime()` (presentation concern)
- REMOVE: `toODataFormat()` (infrastructure concern)

**2. Application Layer (Conversion Helpers)**
- CREATE: `src/shared/application/helpers/DateTimeHelpers.ts`
- ADD: `localDateTimeToUtc(local: string): string`
- ADD: `utcToLocalDateTime(utc: string): string`

**3. Infrastructure Layer (OData Helpers)**
- CREATE: `src/shared/infrastructure/helpers/ODataHelpers.ts`
- ADD: `formatDateForOData(utc: string): string`

**4. Update Callsites (2 locations)**
- Update PluginTraceViewerPanel presentation code
- Update ODataExpressionBuilder infrastructure code

### Files to Modify

- `src/shared/domain/valueObjects/DateTimeFilter.ts` (remove methods)
- `src/shared/application/helpers/DateTimeHelpers.ts` (new file)
- `src/shared/infrastructure/helpers/ODataHelpers.ts` (new file)
- `src/features/pluginTraceViewer/presentation/panels/PluginTraceViewerPanel.ts` (update callsite)
- `src/features/pluginTraceViewer/domain/services/ODataExpressionBuilder.ts` (update callsite)

### Testing Strategy

- Update DateTimeFilter.test.ts (remove tests for deleted methods)
- Add DateTimeHelpers.test.ts (test conversion logic)
- Add ODataHelpers.test.ts (test OData formatting)
- Run existing integration tests (should still pass)

### Estimated Effort

2-3 hours (as documented in technical debt)

Do you approve this plan? (yes/no/modify)
```

**User approves: "yes"**

---

### Phase 4: Implementation

**7. Implement solution (inside-out: domain → app → infra → presentation):**

**Implementation Order:**
1. ✅ Domain: Remove methods from DateTimeFilter.ts
2. ✅ Application: Create DateTimeHelpers.ts
3. ✅ Infrastructure: Create ODataHelpers.ts
4. ✅ Presentation: Update callsites
5. ✅ Tests: Update all test files

**8. After each layer:**
```bash
npm run compile
```

**9. After all implementation:**
```bash
npm run compile
npm test
```

---

### Phase 5: Validation & Review

**10. Run code-guardian review:**

Use the Task tool to invoke code-guardian:
```markdown
I've fixed the DateTimeFilter mixed concerns issue. Here's what changed:

**Files Modified:**
- src/shared/domain/valueObjects/DateTimeFilter.ts (removed presentation/infra concerns)
- src/shared/application/helpers/DateTimeHelpers.ts (new - conversion logic)
- src/shared/infrastructure/helpers/ODataHelpers.ts (new - OData formatting)
- [2 callsite updates]

**Tests:**
- ✅ npm run compile: PASS
- ✅ npm test: PASS (all 242 tests passing)
- ✅ Updated DateTimeFilter tests
- ✅ Added DateTimeHelpers tests
- ✅ Added ODataHelpers tests

Please review for Clean Architecture compliance.
```

**11. If code-guardian approves:**

Update TECHNICAL_DEBT.md:
```markdown
Remove the "DateTimeFilter Mixed Concerns" section entirely.

Add a note at the top of the file:
"Last cleanup: 2025-11-22 - Resolved DateTimeFilter mixed concerns"
```

**12. Final message to user:**

```markdown
✅ Technical debt item resolved!

**Fixed:** DateTimeFilter Mixed Concerns
**Result:** APPROVED by code-guardian

**Changes:**
- DateTimeFilter now pure domain value object
- Format conversion extracted to helper functions
- All tests passing (242/242)
- Clean Architecture compliance verified

**Updated:** docs/TECHNICAL_DEBT.md (removed resolved item)

Ready to commit? I can create a commit with these changes.
```

---

## Phase 6: Commit (Optional)

**If user wants to commit:**

```bash
git add .
git commit -m "$(cat <<'EOF'
fix: resolve DateTimeFilter mixed concerns technical debt

Extract format conversion logic from DateTimeFilter value object
to appropriate helper functions in application and infrastructure layers.

Changes:
- DateTimeFilter: Remove toLocalDateTime() and toODataFormat()
- DateTimeHelpers: Add conversion utilities (application layer)
- ODataHelpers: Add OData formatting utilities (infrastructure layer)
- Update callsites to use new helper functions
- Update tests to reflect new architecture

Resolves technical debt item: DateTimeFilter Mixed Concerns
Tests: 242/242 passing

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Parallel Execution Patterns

**During verification phase, read all relevant files in parallel:**

**✅ GOOD:**
```
Single message with parallel reads:
- Read DateTimeFilter.ts
- Read ODataExpressionBuilder.ts
- Read PluginTraceViewerPanel.ts
- Grep for toLocalDateTime usage
- Grep for toODataFormat usage
```

**❌ BAD:**
```
Sequential reads:
Read DateTimeFilter.ts
Wait for result
Read ODataExpressionBuilder.ts
Wait for result
(Wastes time!)
```

**During implementation, respect dependencies:**
- Domain → Application → Infrastructure → Presentation (sequential per layer)
- But within each layer, parallelize independent file writes if possible

---

## User Interaction Points

**The user will be asked:**

1. **Which debt item to fix?** (selection from list)
2. **Proceed with fixing?** (after verification)
3. **Approve solution plan?** (after extended thinking)
4. **Commit changes?** (after code-guardian approval)

**Keep user in control - don't auto-fix without confirmation.**

---

## Error Handling

**If verification fails (issue already fixed):**
```markdown
⚠️ This technical debt item appears to be already resolved!

Evidence:
- DateTimeFilter.ts no longer contains toLocalDateTime()
- Helpers already exist in application layer

Would you like me to:
1. Remove this item from TECHNICAL_DEBT.md
2. Select a different item to fix
3. Cancel
```

**If code-guardian rejects:**
```markdown
⚠️ Code review requested changes

code-guardian found 3 issues:
1. Missing null check in DateTimeHelpers.ts
2. Incorrect test coverage (85%, expected 90%+)
3. Missing JSDoc on public methods

I'll fix these issues and re-submit for review.

[Fixes issues]
[Re-submits to code-guardian]
```

---

## Workflow Integration

**This command follows the standard workflow:**

1. ✅ Design phase: Extended thinking (solution planning)
2. ✅ Implementation phase: Inside-out (domain → app → infra → presentation)
3. ✅ Testing phase: Tests written/updated after implementation
4. ✅ Review phase: code-guardian approval
5. ✅ Commit phase: Standard commit format

**See:** `.claude/WORKFLOW.md` for complete workflow details

---

## Best Practices

**DO:**
- ✅ Use extended thinking for solution planning (think hard)
- ✅ Verify issue exists before implementing fix
- ✅ Get user approval for solution plan
- ✅ Run compile + test after each layer
- ✅ Invoke code-guardian for review
- ✅ Update TECHNICAL_DEBT.md after resolution

**DON'T:**
- ❌ Auto-fix without user confirmation (keep user in control)
- ❌ Skip verification (issue might already be fixed)
- ❌ Skip extended thinking (rushed fixes create new debt)
- ❌ Skip code-guardian review (quality gate is mandatory)
- ❌ Forget to update TECHNICAL_DEBT.md (creates stale documentation)

---

## Example Full Session

**User:** `/fix-technical-debt`

**Claude:**
```
I found 6 technical debt items. Which would you like to fix?

1. Business Logic in Command Handlers (Medium, 4-6h)
2. DateTimeFilter Mixed Concerns (Medium, 2-3h)
3. Cross-Feature DTO Coupling (Low, 15-20min)
...

Please select a number (1-6).
```

**User:** `2`

**Claude:**
```
Verifying DateTimeFilter mixed concerns issue...

[Parallel reads and greps]

✅ Verified: Issue still exists.

Evidence:
- DateTimeFilter.ts contains toLocalDateTime() (presentation concern)
- DateTimeFilter.ts contains toODataFormat() (infrastructure concern)

Proceed with fixing? (yes/no)
```

**User:** `yes`

**Claude:**
```
Thinking hard about the best solution...

[Extended thinking output]

# Solution Plan
...
[Detailed plan as shown above]
...

Do you approve this plan? (yes/no/modify)
```

**User:** `yes`

**Claude:**
```
Implementing solution (domain → app → infra → presentation)...

✅ Domain: DateTimeFilter.ts updated
✅ Application: DateTimeHelpers.ts created
✅ Infrastructure: ODataHelpers.ts created
✅ Presentation: Callsites updated
✅ Tests: All tests updated
✅ npm run compile: PASS
✅ npm test: PASS (242/242)

Invoking code-guardian for review...

[code-guardian runs]

✅ APPROVED by code-guardian

Technical debt item resolved!

Updated docs/TECHNICAL_DEBT.md (removed resolved item)

Ready to commit? (yes/no)
```

**User:** `yes`

**Claude:**
```
[Creates commit with standard format]

✅ Committed!

Technical debt item "DateTimeFilter Mixed Concerns" successfully resolved.
```

---

## Success Criteria

**Fix is successful when:**

1. ✅ Issue verified to still exist
2. ✅ Solution planned with extended thinking
3. ✅ User approved solution plan
4. ✅ Implementation follows Clean Architecture (inside-out)
5. ✅ All tests pass (npm run compile + npm test)
6. ✅ code-guardian approved changes
7. ✅ TECHNICAL_DEBT.md updated (item removed)
8. ✅ Changes committed (if user requested)

**Typical duration:** 2-6 hours (depending on debt item complexity)
