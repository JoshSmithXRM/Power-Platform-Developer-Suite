# Refactoring Workflow

**Purpose**: Safe, incremental refactoring workflow that maintains Clean Architecture while improving code quality.

---

## 🚀 Quick Reference

**Types of Refactoring**:
1. **Code Quality** - Remove duplication, improve naming, extract methods
2. **Architecture Fix** - Move business logic to correct layer
3. **Type Safety** - Replace `any`, add explicit types, improve null handling
4. **Performance** - Optimize algorithms, reduce complexity

**Core Principle**: **Incremental changes with continuous validation**

**Safety Rules**:
- ✅ Tests pass BEFORE starting refactoring (baseline behavior)
- ✅ Tests pass AFTER each refactoring step (behavior unchanged)
- ✅ Compile after every incremental change
- ✅ Commit working state before next refactor
- ✅ Keep refactors small (30-60 min per commit)
- ❌ Don't refactor multiple concerns at once
- ❌ Don't mix feature work with refactoring

---

## 📖 General Refactoring Workflow

### Phase 1: Plan the Refactoring (15 min)

**1.1 Identify the Problem**
- [ ] What code smells exist? (duplication, long methods, anemic models, etc.)
- [ ] What architecture violations? (business logic in wrong layer, dependency direction wrong)
- [ ] What type safety issues? (`any` usage, missing types, weak inference)
- [ ] What performance issues? (N+1 queries, unnecessary loops, etc.)

**1.2 Document Current State**
- [ ] Take note of files to be changed
- [ ] Identify dependencies (what code uses this?)
- [ ] List tests that cover this code (if any)
- [ ] Document expected behavior

**1.3 Create Refactoring Plan**

Break refactoring into small, incremental steps:

**Example: Moving Business Logic to Domain**
```
Current State: Business logic in use case
Target State: Business logic in domain entity

Steps:
1. Add method to domain entity (with business logic)
2. Compile ✅
3. Update use case to call domain method
4. Compile ✅
5. Remove business logic from use case
6. Compile ✅
7. Review & commit
```

**Rule**: Each step should compile and maintain working state.

---

### Phase 2: Execute Refactoring Incrementally

**2.1 Create Refactoring Branch (Optional but Recommended)**
```bash
git checkout -b refactor/[description]
```

**2.2 Ensure Tests Pass BEFORE Refactoring**
```bash
npm test
```
- [ ] All tests pass ✅ (establishes baseline behavior)

**2.3 Execute One Refactoring Step at a Time**

For each step in your plan:

1. **Make the change**
   - Edit files
   - Keep changes minimal

2. **Run tests immediately**
   ```bash
   npm test
   ```
   - [ ] All tests still pass ✅ (behavior unchanged)
   - [ ] No new test failures

3. **Compile**
   ```bash
   npm run compile  # Includes tests + lint
   ```
   - [ ] Zero errors
   - [ ] Zero new warnings
   - [ ] Tests pass ✅

4. **Manual test (if touching UI)**
   - F5 in VS Code
   - Quick manual test
   - Verify behavior unchanged

5. **Commit if stable**
   ```bash
   git add .
   git commit -m "refactor: [specific change]

   [Brief explanation of what changed and why]

   Tests: All existing tests pass (behavior unchanged)"
   ```

**2.4 Repeat Until Refactoring Complete**

Continue incremental steps until target state achieved.

---

### Phase 3: Review Refactored Code (10 min)

**3.1 Self-Review**
- [ ] Compare before/after using git diff
- [ ] Verify behavior unchanged
- [ ] Check for unintended side effects
- [ ] Ensure architecture improved (not degraded)

**3.2 Agent Review (if significant)**

For architecture refactoring:
```
@agent-clean-architecture-guardian - Review refactoring in:
- [file paths]

Before: [description of old state]
After: [description of new state]

Verify:
- Business logic in correct layer
- Dependencies point inward
- SOLID principles maintained

Create review file: docs/codereview/clean-arch-refactor-review-{YYYY-MM-DD}.md
```

For type safety refactoring:
```
@agent-typescript-pro - Review refactoring in:
- [file paths]

Before: [description of old types]
After: [description of new types]

Verify:
- Type safety improved
- No `any` introduced
- Proper null handling

Create review file: docs/codereview/typescript-refactor-review-{YYYY-MM-DD}.md
```

**3.3 Final Approval**
```
@agent-clean-architecture-guardian - Review refactoring for final approval.

Verify:
- Code quality improved
- No behavior changes
- Architecture improved
```

---

### Phase 4: Merge & Document (5 min)

**4.1 Merge Refactoring Branch**
```bash
git checkout main
git merge refactor/[description]
git push
```

**4.2 Document Significant Refactorings**

If refactoring introduced new patterns:
```
@agent-code-cleanup-implementer - Document refactoring pattern.

Refactoring: [description]
Before: [old pattern]
After: [new pattern]

Update:
- docs/architecture/ARCHITECTURE_GUIDE.md (if architecture pattern changed)
- Add example of new pattern
```

---

## 🎯 Specific Refactoring Patterns

### Pattern 1: Moving Business Logic from Use Case to Domain

**Scenario**: Use case contains complex business logic

**Before**:
```typescript
// Application layer - use case (WRONG)
export class ActivateEnvironmentUseCase {
    public async execute(id: string): Promise<void> {
        const env = await this.repository.getById(id);

        // ❌ Business logic in use case
        if (env.isActive && env.lastUsed !== null) {
            const hoursSinceLastUse =
                (Date.now() - env.lastUsed.getTime()) / (1000 * 60 * 60);
            if (hoursSinceLastUse < 24) {
                throw new Error('Already activated within 24 hours');
            }
        }

        env.isActive = true;
        env.lastUsed = new Date();
        await this.repository.save(env);
    }
}
```

**Target**: Business logic in domain entity

**Refactoring Steps**:

**Step 1: Add domain method** (5 min)
```typescript
// Domain layer - entity
export class Environment {
    public canActivate(): boolean {
        if (!this.isActive) return true;
        if (this.lastUsed === null) return true;

        const hoursSinceLastUse =
            (Date.now() - this.lastUsed.getTime()) / (1000 * 60 * 60);
        return hoursSinceLastUse >= 24;
    }

    public activate(): void {
        if (!this.canActivate()) {
            throw new Error('Cannot activate: already activated within 24 hours');
        }
        this.isActive = true;
        this.lastUsed = new Date();
    }
}
```

Compile:
```bash
npm run compile # ✅ Should succeed
```

Commit:
```bash
git commit -m "refactor: add activate() method to Environment entity

Moved business logic from use case to domain entity.
Environment now encapsulates activation rules."
```

**Step 2: Update use case to call domain method** (3 min)
```typescript
// Application layer - use case (CORRECT)
export class ActivateEnvironmentUseCase {
    public async execute(id: string): Promise<void> {
        const env = await this.repository.getById(id);
        env.activate(); // ✅ Domain handles business logic
        await this.repository.save(env);
        this.logger.info(`Environment ${id} activated`);
    }
}
```

Compile:
```bash
npm run compile # ✅ Should succeed
```

Commit:
```bash
git commit -m "refactor: use Environment.activate() in use case

Use case now orchestrates domain method instead of
containing business logic."
```

**Step 3: Review** (5 min)
```
@agent-clean-architecture-guardian - Review refactoring:
- src/features/environmentSetup/domain/entities/Environment.ts
- src/features/environmentSetup/application/useCases/ActivateEnvironmentUseCase.ts

Verify business logic moved from use case to domain entity.
```

**Total Time**: ~15 mins, 2 commits

---

### Pattern 2: Removing Code Duplication

**Scenario**: Same logic duplicated 3+ times

**Before**:
```typescript
// File 1
const jobs = await this.repository.findAll();
const sortedJobs = jobs.sort((a, b) =>
    b.createdOn.getTime() - a.createdOn.getTime()
);

// File 2
const solutions = await this.solutionRepo.findAll();
const sortedSolutions = solutions.sort((a, b) =>
    b.createdOn.getTime() - a.createdOn.getTime()
);

// File 3
const environments = await this.envRepo.findAll();
const sortedEnvironments = environments.sort((a, b) =>
    b.createdOn.getTime() - a.createdOn.getTime()
);
```

**Target**: Extract to domain service or collection class

**Refactoring Steps**:

**Step 1: Create domain service** (10 min)
```typescript
// src/shared/domain/services/CollectionSorter.ts
export class CollectionSorter {
    public static sortByCreatedOnDescending<T extends { createdOn: Date }>(
        items: T[]
    ): T[] {
        return [...items].sort((a, b) =>
            b.createdOn.getTime() - a.createdOn.getTime()
        );
    }
}
```

Compile:
```bash
npm run compile # ✅
```

Commit:
```bash
git commit -m "refactor: extract sorting logic to CollectionSorter

Created domain service for common sorting operations.
Eliminates duplication across multiple use cases."
```

**Step 2: Replace first duplication** (3 min)
```typescript
// File 1
const jobs = await this.repository.findAll();
const sortedJobs = CollectionSorter.sortByCreatedOnDescending(jobs);
```

Compile & test:
```bash
npm run compile # ✅
# F5 and test
```

Commit:
```bash
git commit -m "refactor: use CollectionSorter in LoadImportJobsUseCase"
```

**Step 3: Replace second duplication** (3 min)
```typescript
// File 2
const solutions = await this.solutionRepo.findAll();
const sortedSolutions = CollectionSorter.sortByCreatedOnDescending(solutions);
```

Compile & test → Commit

**Step 4: Replace third duplication** (3 min)
```typescript
// File 3
const environments = await this.envRepo.findAll();
const sortedEnvironments = CollectionSorter.sortByCreatedOnDescending(environments);
```

Compile & test → Commit

**Total Time**: ~20 mins, 4 commits

---

### Pattern 3: Replacing `any` with Proper Types

**Scenario**: Method uses `any` type

**Before**:
```typescript
export class DataProcessor {
    public process(data: any): any { // ❌ any types
        return {
            id: data.id,
            name: data.name,
            status: data.status
        };
    }
}
```

**Target**: Explicit types with interfaces

**Refactoring Steps**:

**Step 1: Define input interface** (5 min)
```typescript
interface ProcessorInput {
    id: string;
    name: string;
    status: 'pending' | 'completed' | 'failed';
}

export class DataProcessor {
    public process(data: any): any { // Keep any for now
        return {
            id: data.id,
            name: data.name,
            status: data.status
        };
    }
}
```

Compile:
```bash
npm run compile # ✅
```

Commit:
```bash
git commit -m "refactor: define ProcessorInput interface"
```

**Step 2: Replace input `any`** (3 min)
```typescript
export class DataProcessor {
    public process(data: ProcessorInput): any { // Input typed
        return {
            id: data.id,
            name: data.name,
            status: data.status
        };
    }
}
```

Compile:
```bash
npm run compile # ✅ (may show errors in callers)
```

Fix caller errors → Commit

**Step 3: Define output interface** (5 min)
```typescript
interface ProcessorOutput {
    id: string;
    name: string;
    status: 'pending' | 'completed' | 'failed';
}

export class DataProcessor {
    public process(data: ProcessorInput): ProcessorOutput { // ✅ Fully typed
        return {
            id: data.id,
            name: data.name,
            status: data.status
        };
    }
}
```

Compile → Commit

**Step 4: Review** (5 min)
```
@agent-typescript-pro - Review type refactoring:
- src/.../DataProcessor.ts

Verify:
- No `any` types remaining
- Proper type inference
- Type safety improved
```

**Total Time**: ~20 mins, 3-4 commits

---

### Pattern 4: Extracting Long Method

**Scenario**: Method >50 lines with multiple responsibilities

**Before**:
```typescript
export class ImportJobPanel {
    private async handleLoadJobs(): Promise<void> {
        // 80 lines of code doing:
        // 1. Validate input
        // 2. Call use case
        // 3. Transform data
        // 4. Update UI
        // 5. Handle errors
        // 6. Log results
    }
}
```

**Target**: Extract to smaller, focused methods

**Refactoring Steps**:

**Step 1: Extract validation** (5 min)
```typescript
private validateInput(): boolean {
    // Validation logic extracted
}

private async handleLoadJobs(): Promise<void> {
    if (!this.validateInput()) return;
    // ... rest of original code
}
```

Compile → Test → Commit

**Step 2: Extract error handling** (5 min)
```typescript
private handleLoadError(error: unknown): void {
    // Error handling logic extracted
}

private async handleLoadJobs(): Promise<void> {
    try {
        // ... logic
    } catch (error) {
        this.handleLoadError(error);
    }
}
```

Compile → Test → Commit

**Step 3: Extract UI update** (5 min)
```typescript
private updateJobsUI(viewModels: ImportJobViewModel[]): void {
    // UI update logic extracted
}

private async handleLoadJobs(): Promise<void> {
    // ...
    const viewModels = await this.useCase.execute();
    this.updateJobsUI(viewModels);
}
```

Compile → Test → Commit

**Total Time**: ~20 mins, 3 commits

**After**: Method is <20 lines, each extracted method has single responsibility

---

## ⚠️ Refactoring Safety Checklist

Before each refactoring step:
- [ ] Code currently compiles without errors
- [ ] Tests pass (if tests exist)
- [ ] You understand current behavior

After each refactoring step:
- [ ] npm run compile succeeds ✅
- [ ] No new TypeScript errors
- [ ] No new ESLint warnings
- [ ] Behavior unchanged (manual test)
- [ ] Commit working state

Before final merge:
- [ ] All incremental commits compile
- [ ] Manual testing complete
- [ ] Agent reviews complete (if significant)
- [ ] Architecture improved (not degraded)

---

## 🚨 Common Refactoring Mistakes

### ❌ Mistake 1: Refactoring Too Much at Once

**Wrong**:
```
Refactor entire feature in one commit:
- Move business logic to domain
- Remove code duplication
- Replace all `any` types
- Extract long methods
- Rename variables for clarity
```

**Problem**: If something breaks, hard to identify which change caused it

**Right**:
```
Commit 1: Move business logic to domain → Compile → Test → Commit
Commit 2: Remove code duplication → Compile → Test → Commit
Commit 3: Replace `any` types → Compile → Test → Commit
```

---

### ❌ Mistake 2: Mixing Feature Work with Refactoring

**Wrong**:
```
git commit -m "refactor: improve ImportJob entity

- Moved business logic to domain
- Added new getProgress() method ← NEW FEATURE
- Fixed activation bug ← BUG FIX
- Renamed variables ← REFACTORING
"
```

**Right**:
```
Commit 1: "refactor: move business logic to domain"
Commit 2: "fix: activation timestamp bug"
Commit 3: "feat: add getProgress() method"
```

---

### ❌ Mistake 3: Skipping Compilation Between Steps

**Wrong**:
```
Step 1: Extract method A (don't compile)
Step 2: Extract method B (don't compile)
Step 3: Extract method C (don't compile)
Step 4: Compile → 15 errors, unclear which step broke
```

**Right**:
```
Step 1: Extract method A → npm run compile ✅ → Commit
Step 2: Extract method B → npm run compile ✅ → Commit
Step 3: Extract method C → npm run compile ✅ → Commit
```

---

### ❌ Mistake 4: Refactoring Without Tests/Manual Verification

**Wrong**:
```
Refactor 10 methods → Commit → Push (never tested)
```

**Right**:
```
Refactor method 1 → Compile → F5 and test → Commit
Refactor method 2 → Compile → F5 and test → Commit
```

---

## 🎯 When to Refactor

### ✅ Good Times to Refactor

1. **Before Adding Feature**
   - Refactor existing code to make feature addition easier
   - Clean up area where feature will be added

2. **After Bug Fix**
   - Fix immediate bug first
   - Then refactor to prevent similar bugs

3. **When Code Smells Identified**
   - Duplication appears 3rd time → Refactor immediately
   - Method exceeds 50 lines → Extract methods
   - Class exceeds 300 lines → Split responsibilities

4. **During Code Review**
   - Reviewer identifies architecture violation
   - Schedule refactoring before merge

### ❌ Bad Times to Refactor

1. **During Feature Development**
   - Don't refactor unrelated code while building feature
   - Finish feature first, refactor after

2. **Under Time Pressure**
   - Refactoring requires careful testing
   - Don't rush refactoring before deadline

3. **Without Understanding Code**
   - Must understand current behavior first
   - Study code before refactoring

4. **Just for Style**
   - Renaming variables for personal preference
   - Reformatting that doesn't improve readability
   - Only refactor when improving architecture/quality

---

## 🔄 Rollback Plan

If refactoring breaks something:

### Option 1: Revert Last Commit
```bash
git log --oneline  # Find last good commit
git revert HEAD    # Revert most recent commit
```

### Option 2: Reset to Last Good State
```bash
git log --oneline
git reset --hard <commit-hash>  # Reset to last working commit
```

### Option 3: Fix Forward
```bash
# If error is obvious and quick to fix
# Fix the issue
npm run compile ✅
git commit -m "fix: resolve refactoring issue"
```

---

## 🔗 See Also

- [NEW_FEATURE_WORKFLOW.md](NEW_FEATURE_WORKFLOW.md) - For adding new features
- [BUG_FIX_WORKFLOW.md](BUG_FIX_WORKFLOW.md) - For fixing bugs
- [AGENT_ROLES.md](../AGENT_ROLES.md) - Understanding reviewer roles
- [ARCHITECTURE_GUIDE.md](../../docs/architecture/ARCHITECTURE_GUIDE.md) - Clean Architecture principles
- [CLAUDE.md](../../CLAUDE.md) - Coding rules and principles
