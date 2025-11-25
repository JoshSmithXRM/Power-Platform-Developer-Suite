# Troubleshooting Guide

Common problems and solutions when using Claude Code with this project.

---

## Agent Issues

### code-guardian keeps rejecting my code

**Symptoms:** CHANGES REQUESTED on every review, even after fixes.

**Common causes:**

1. **Anemic domain models**
   ```typescript
   // ❌ BAD - No behavior methods
   class ImportJob {
     constructor(public id: string, public status: string) {}
   }

   // ✅ GOOD - Rich domain model
   class ImportJob {
     constructor(public readonly id: string, private status: JobStatus) {}

     isComplete(): boolean { return this.status === JobStatus.Completed; }
     getStatus(): JobStatus { return this.status; }
   }
   ```

2. **Business logic in use cases**
   ```typescript
   // ❌ BAD - Logic in use case
   const status = job.completedAt ? 'Done' : 'Pending';

   // ✅ GOOD - Call domain method
   const status = job.isComplete() ? 'Completed' : 'Pending';
   ```

3. **Missing explicit return types**
   ```typescript
   // ❌ BAD - Implicit return type
   async execute() { ... }

   // ✅ GOOD - Explicit return type
   async execute(): Promise<ImportJobViewModel[]> { ... }
   ```

**Solution:** Review CLAUDE.md rules and fix violations before re-submitting.

---

### design-architect creates designs that are too large

**Symptoms:** Design document is 500+ lines, overwhelming to implement.

**Causes:**
- Feature is too complex for single design
- Agent doesn't know about existing patterns

**Solutions:**

1. **Break into slices:**
   ```
   "Design ONLY the domain layer for ImportJob (first slice)"
   ```

2. **Reference existing patterns:**
   ```
   "Design ImportJob following the same pattern as PluginTrace feature"
   ```

3. **Use extended thinking first:**
   ```
   "Think hard about how to break this feature into implementable slices"
   ```

---

### Agent responses are slow or timing out

**Symptoms:** Agent takes 2+ minutes, or times out entirely.

**Causes:**
- Reading too many files
- Context window filling up
- Complex analysis requested

**Solutions:**

1. **Clear context:** Use `/clear` before invoking agent
2. **Be specific:** "Review only the domain layer" vs "Review everything"
3. **Smaller scope:** Review one layer at a time for large features

---

## Build Issues

### npm run compile fails after code changes

**Common errors:**

1. **Type errors in domain layer**
   - Check: Domain has zero external imports
   - Check: All interfaces defined in domain

2. **Import errors**
   ```
   Cannot find module '../../../shared/domain/...'
   ```
   - Check: Path is correct
   - Check: Export exists in target file

3. **Circular dependencies**
   ```bash
   npm run call-graph  # Check for circular deps
   ```

**Solution:** Fix errors before invoking code-guardian.

---

### Tests fail unexpectedly

**Debugging steps:**

1. **Run specific test:**
   ```bash
   npm test -- ImportJob.test.ts
   ```

2. **Check test isolation:**
   - Tests should not depend on each other
   - Use fresh mocks in each test

3. **Check async handling:**
   ```typescript
   // ❌ BAD - Missing await
   it('should load jobs', () => {
     const result = useCase.execute();
   });

   // ✅ GOOD - Proper async
   it('should load jobs', async () => {
     const result = await useCase.execute();
   });
   ```

---

## Permission Issues

### Tool execution blocked

**Symptoms:** "Permission denied" or prompt for every command.

**Causes:**
- Command not in settings.local.json allow list
- Command matches deny pattern

**Solution:** Check `.claude/settings.local.json`:
- Add safe commands to `allow` array
- Git write operations are intentionally denied

**Safe to allow:**
- File reading (cat, head, tail, grep)
- npm commands (npm test, npm run compile)
- PowerShell read operations

**Keep denied:**
- git add/commit/push/merge
- rm -rf, del /s
- sudo, su

---

## Context Issues

### Claude seems to forget project rules

**Symptoms:** Agent suggests patterns that violate CLAUDE.md.

**Causes:**
- Context window full
- Old conversation history taking space

**Solutions:**

1. **Clear and restart:**
   ```
   /clear
   ```

2. **Re-anchor on rules:**
   ```
   "Review CLAUDE.md before proceeding"
   ```

3. **Be explicit:**
   ```
   "Remember: business logic must be in domain entities, not use cases"
   ```

---

### Agent produces inconsistent output

**Symptoms:** Same request gives different results.

**Causes:**
- Ambiguous request
- Missing context about existing patterns

**Solutions:**

1. **Be specific:**
   ```
   // ❌ Vague
   "Review this code"

   // ✅ Specific
   "Review ImportJobUseCase for Clean Architecture violations"
   ```

2. **Provide context:**
   ```
   "This follows the same pattern as PluginTrace feature"
   ```

---

## Pre-Review Checklist

Before invoking code-guardian, verify:

- [ ] `npm run compile` passes
- [ ] `npm test` passes (or relevant tests)
- [ ] Manual testing complete (F5)
- [ ] No `any` types in production code
- [ ] No `console.log` in production code
- [ ] All public methods have explicit return types
- [ ] Domain entities have behavior methods
- [ ] No business logic in use cases or panels
- [ ] No domain imports from outer layers

**If any fail:** Fix locally first, then invoke code-guardian.

---

## Getting Help

1. **Check documentation:**
   - `CLAUDE.md` - Project rules
   - `.claude/WORKFLOW.md` - Development workflows
   - `.claude/AGENTS.md` - Agent usage guide

2. **Use extended thinking:**
   ```
   "Think hard about why this pattern isn't working"
   ```

3. **Ask for clarification:**
   ```
   "What specific rule am I violating?"
   ```
