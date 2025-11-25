# Code Cleanup Skill

**Auto-discovered when:** Code quality issues detected (comments, logging violations, duplication)

**Purpose:** Systematically find and fix comment/logging standards violations

**Invoked:** Automatically by Claude when analysis shows code quality issues

---

## When Claude Should Invoke This Skill

**✅ AUTO-INVOKE when Claude detects:**
- Console.log in production code
- Placeholder comments (TODO/FIXME without context)
- Logging format violations (lowercase start, trailing periods, string interpolation)
- Domain layer logging (architectural violation)
- Missing JSDoc on public APIs
- Commented-out code blocks
- Obvious/redundant comments

**✅ USER requests:**
- "Clean up code quality"
- "Fix logging standards"
- "Remove placeholder comments"
- "Enforce comment rules"

**❌ DON'T INVOKE when:**
- Code is greenfield (just written, unlikely to have violations)
- User explicitly says "skip cleanup"
- Working on experimental/prototype code
- In middle of implementing feature (wait until feature complete)

---

## Skill Process

**See:** `.claude/commands/cleanup-code.md` for detailed execution steps

**Quick Summary:**
1. **Discovery** - Find violations using parallel Grep searches
2. **Analysis** - Create TodoList with priorities (CRITICAL > HIGH > MEDIUM)
3. **Remediation** - Fix violations systematically
4. **Validation** - Compile and test must pass

**Output:** Fixed code with enforced standards

---

## Detection Patterns

### CRITICAL (must fix immediately)
- Domain layer logging: `src/*/domain/**/*.ts` contains `logger\.|console\.`
- console.log in production: `console\.(log|debug|info)` in `src/` (not tests)
- Missing error logging: `catch` blocks without `logger.error`

### HIGH (should fix)
- Placeholder comments: `TODO|FIXME` without context
- Commented-out code: `//\s*(const|let|var|function|class)`
- Missing JSDoc: `export class` or `public ` without `/**`
- Wrong logging level: `logger.info` for technical details (should be debug)

### MEDIUM (nice to fix)
- Message format: lowercase start, trailing periods
- String interpolation: `` logger.info(`template ${var}`) ``
- Obvious comments: Explain WHAT instead of WHY

---

## Standards Reference

**Follows:**
- CLAUDE.md - Quick reference rules
- docs/architecture/CODE_QUALITY_GUIDE.md - Comment standards
- docs/architecture/LOGGING_GUIDE.md - Logging architecture

**Key Rules:**
- Domain layer: ZERO logging
- Application layer: ILogger injection, strategic boundaries
- No console.log in production
- JSDoc on public/protected methods
- Comments explain WHY, not WHAT

---

## Typical Session

**Detected Issues:** 15-30 violations in typical feature
**Fix Time:** 10-20 minutes
**Pass Rate:** >95% (compile + tests pass after fixes)

---

## Linked Resources

- Full Command: `.claude/commands/cleanup-code.md`
- Standards: `docs/architecture/CODE_QUALITY_GUIDE.md`, `docs/architecture/LOGGING_GUIDE.md`
- Rules: `CLAUDE.md`
