# Multi-Agent Workflow Guide

**How to use specialized agents when building features with Clean Architecture**

---

## Architecture Context

This project follows **Clean Architecture** with **feature-first** organization:

```
Domain Layer (entities, value objects, domain services)
    ↑
Application Layer (use cases, commands, ViewModels)
    ↑
Presentation Layer (panels, components) + Infrastructure Layer (repositories, API clients)
```

**Key concepts:**
- **Domain entities** - Rich models with behavior (NOT anemic interfaces)
- **Use cases** - Orchestrate domain logic (no business logic)
- **ViewModels** - DTOs for presentation (mapped from domain)
- **Repositories** - Implement interfaces defined in domain

See `docs/ARCHITECTURE_GUIDE.md` for details.

---

## Agent Setup

We have **3 specialized agents**:

1. **architect** (`.claude/agents/architect.md`)
   - **When:** Before implementing new features
   - **Purpose:** Design domain entities, use cases, ViewModels, repositories
   - **Output:** Clean Architecture implementation specification

2. **code-reviewer** (`.claude/agents/code-reviewer.md`)
   - **When:** After implementing code, before committing
   - **Purpose:** Enforce Clean Architecture principles and SOLID compliance
   - **Output:** APPROVE/REJECT/CHANGES REQUESTED

3. **docs-generator** (`.claude/agents/docs-generator.md`)
   - **When:** After code is approved, or when patterns change
   - **Purpose:** Create/update documentation following style guide
   - **Output:** Documentation files matching project standards

---

## Complete Workflow

### For New Features

```
1. architect designs Clean Architecture solution
   ↓ (designs domain, application, presentation, infrastructure layers)
2. Builder implements layer by layer
   ↓ (domain first, then application, then presentation/infrastructure)
3. code-reviewer reviews each commit
   ↓ (checks for anemic models, business logic placement, etc.)
4. docs-generator documents patterns (if new)
   ↓
5. Commit & push
```

### For Bug Fixes

```
1. Builder implements fix (skip architect)
   ↓
2. code-reviewer reviews
   ↓
3. Commit & push
```

---

## Quick Start Examples

### Example 1: Bug Fix (No Architect Needed)

**Step 1: Builder Fixes**
```
You: "Fix the null reference error in ImportJobRepository line 145"

Builder:
- Fixes the bug
- Runs npm run compile ✅
- Invokes code-reviewer automatically
```

**Step 2: Code Reviewer Approves**
```
code-reviewer: "✅ APPROVED - Ready to commit"
```

**Step 3: You Commit**
```bash
git commit -m "fix: null reference in ImportJobRepository

Added null check before accessing jobData property"
```

**Total time:** ~15-20 mins

---

### Example 2: New Feature (Full Clean Architecture Flow)

**Step 1: Architect Designs**
```
You: "I need to add import job tracking feature"

architect:
- Reads ARCHITECTURE_GUIDE.md and CLAUDE.md
- Designs domain layer (ImportJob entity with behavior, JobStatus value object)
- Designs application layer (LoadImportJobsUseCase, ViewJobXmlCommand, ImportJobViewModel)
- Designs infrastructure layer (ImportJobRepository implementing IImportJobRepository)
- Designs presentation layer (ImportJobViewerPanel using use cases)
- Outputs detailed specification

Time: ~20-30 mins
```

**Step 2: Builder Implements Domain Layer**
```
You: "Implement the domain layer as designed"

Builder:
- Creates src/features/importJobs/domain/entities/ImportJob.ts (rich model)
- Creates domain/valueObjects/JobStatus.ts
- Creates domain/interfaces/IImportJobRepository.ts
- Runs npm run compile ✅
- Invokes code-reviewer

code-reviewer: Checks for anemic models, ensures behavior in entity

code-reviewer: "✅ APPROVED - Domain layer has rich entities"
```

**Step 3: Builder Implements Application Layer**
```
You: "Implement the application layer"

Builder:
- Creates application/useCases/LoadImportJobsUseCase.ts
- Creates application/commands/ViewJobXmlCommand.ts
- Creates application/viewModels/ImportJobViewModel.ts
- Creates application/mappers/ImportJobViewModelMapper.ts
- Runs npm run compile ✅
- Invokes code-reviewer

code-reviewer: Checks use cases don't contain business logic

code-reviewer: "✅ APPROVED - Use cases orchestrate, don't implement logic"
```

**Step 4: Builder Implements Infrastructure & Presentation**
```
You: "Implement infrastructure and presentation layers"

Builder:
- Creates infrastructure/repositories/ImportJobRepository.ts
- Updates presentation/ImportJobViewerPanel.ts to use use cases
- Runs npm run compile ✅
- Invokes code-reviewer

code-reviewer: "✅ APPROVED - Clean separation of concerns"
```

**Step 5: Docs Generator Documents (Optional)**
```
You: "Document the import job pattern we just built"

docs-generator:
- Creates/updates docs with Clean Architecture example
- Shows domain entity example
- Shows use case pattern
- Follows DOCUMENTATION_STYLE_GUIDE.md

Time: ~15-20 mins
```

**Step 6: You Commit**
```bash
git commit -m "feat: add import job tracking with Clean Architecture

Domain layer:
- ImportJob entity with rich behavior
- JobStatus value object
- IImportJobRepository interface

Application layer:
- LoadImportJobsUseCase (orchestrates)
- ImportJobViewModel (presentation DTO)
- Mappers (domain → ViewModel)

Infrastructure layer:
- ImportJobRepository (implements interface)

Presentation layer:
- ImportJobViewerPanel (uses use cases, no business logic)

Reviewed-by: code-reviewer ✅"
```

**Total time:** ~3-4 hours (complete feature with Clean Architecture)

---

## When to Use Each Agent

### Use architect When:
✅ Building new features (need domain/application/presentation/infrastructure design)
✅ Adding new domain entities or use cases
✅ Unsure how to structure solution with Clean Architecture
✅ Need to design ViewModels and mappers
❌ Skip for: Bug fixes, documentation updates, minor tweaks

### Use code-reviewer When:
✅ **ALWAYS** - After every code change before commit
✅ Builder automatically invokes it
✅ Catches Clean Architecture violations:
   - Anemic domain models
   - Business logic in use cases
   - Business logic in presentation layer
   - Wrong dependency direction

### Use docs-generator When:
✅ New Clean Architecture patterns introduced
✅ Feature documentation needed (show all layers)
✅ Existing docs are outdated
❌ Skip for: Bug fixes that don't introduce patterns

---

## Detailed Walkthrough: Using All 3 Agents

### Scenario: Add Solution Import Feature

**Phase 1: Design (architect)**

```
You: "I need to add a solution import feature that tracks import jobs and shows progress"
```

**architect researches:**
- Reads ARCHITECTURE_GUIDE.md (Clean Architecture patterns)
- Reads LAYER_RESPONSIBILITIES_GUIDE.md (what goes in each layer)
- Searches for similar features

**architect outputs:**
```markdown
# Design Specification: Solution Import Feature

## Domain Layer
- ImportJob entity (rich model with getStatus(), isComplete(), etc.)
- Progress value object (immutable, validates 0-100)
- JobStatus enum (Pending, InProgress, Completed, Failed)
- IImportJobRepository interface (domain defines contract)

## Application Layer
- LoadImportJobsUseCase (orchestrates loading jobs)
- StartImportCommand (triggers import)
- ImportJobViewModel (DTO for presentation)
- ImportJobViewModelMapper (domain → ViewModel)

## Infrastructure Layer
- ImportJobRepository (implements IImportJobRepository)
- ImportJobDto (API response model)
- Mapper (DTO → domain entity)

## Presentation Layer
- ImportJobViewerPanel (uses use cases, NO business logic)
- DataTable component for job list
- Event handlers call use cases only

[... detailed implementation spec with code examples ...]
```

**You review and approve design.**

---

**Phase 2: Implementation (builder + code-reviewer)**

**2a. Domain Layer**
```
You: "Implement domain layer"

builder:
- Creates src/features/importJobs/domain/entities/ImportJob.ts
  (with getStatus(), isComplete(), getDuration() methods)
- Creates domain/valueObjects/Progress.ts
- Creates domain/enums/JobStatus.ts
- Creates domain/interfaces/IImportJobRepository.ts

code-reviewer:
- ✅ ImportJob has behavior (not anemic)
- ✅ Progress is immutable value object
- ✅ No infrastructure dependencies

code-reviewer: "✅ APPROVED - Rich domain model"

You commit: "feat(domain): add ImportJob entity with behavior"
```

**2b. Application Layer**
```
You: "Implement application layer"

builder:
- Creates application/useCases/LoadImportJobsUseCase.ts
- Creates application/commands/StartImportCommand.ts
- Creates application/viewModels/ImportJobViewModel.ts
- Creates application/mappers/ImportJobViewModelMapper.ts

code-reviewer:
- ✅ Use cases orchestrate, no business logic
- ✅ ViewModels are DTOs (no behavior)
- ✅ Mappers properly convert domain → ViewModel

code-reviewer: "✅ APPROVED - Clean application layer"

You commit: "feat(app): add import job use cases and ViewModels"
```

**2c. Infrastructure & Presentation**
```
You: "Implement infrastructure and presentation"

builder:
- Creates infrastructure/repositories/ImportJobRepository.ts
- Updates presentation/ImportJobViewerPanel.ts

code-reviewer:
- ✅ Repository implements domain interface
- ✅ Panel uses use cases (no business logic in panel)
- ✅ Proper dependency direction (presentation → application → domain)

code-reviewer: "✅ APPROVED - Clean Architecture maintained"

You commit: "feat(infra+pres): add repository and panel"
```

---

**Phase 3: Documentation (optional)**

```
You: "Document the import job feature"

docs-generator:
- Creates docs showing all 4 layers
- Uses real code from the feature
- Shows Clean Architecture pattern
- Follows DOCUMENTATION_STYLE_GUIDE.md

You commit: "docs: add import job Clean Architecture example"
```

---

## Session Structure (Updated)

### Work Session (2-3 hours max)

**For Feature Development (Clean Architecture):**
```
Hour 1:
├─ architect designs all layers (30 min)
├─ Review design (15 min)
└─ Implement domain layer (15 min start)

Hour 2:
├─ Finish domain layer (15 min)
├─ code-reviewer reviews (auto, ~2 min)
├─ Commit domain (3 min)
├─ Implement application layer (35 min)
├─ code-reviewer reviews (auto, ~2 min)
└─ Commit application (3 min)

Hour 3:
├─ Implement infrastructure (25 min)
├─ code-reviewer reviews (auto, ~2 min)
├─ Commit infrastructure (3 min)
├─ Implement presentation (25 min)
├─ code-reviewer reviews (auto, ~2 min)
└─ Commit presentation (3 min)

Result: 1 design spec, 4 layer commits
```

**For Bug Fixes:**
```
Hour 1:
├─ Fix bug (20 min)
├─ code-reviewer reviews (auto, ~2 min)
└─ Commit (3 min)

Result: 1 bug fix commit
```

**Break between sessions!** Don't do 8 hours straight.

---

## How To Invoke Agents

### Via Claude Code CLI (Current Setup)

Agents are stored in `.claude/agents/` and invoked using the `Task` tool:

**Example: Invoke architect**
```
You: "I need to design a new data export feature"

Builder (Claude Code): "Let me invoke the architect agent to design this"
[Uses Task tool with architect agent]

architect: [Returns design specification]
```

**Example: Invoke code-reviewer** (usually automatic)
```
Builder: "I've implemented the feature. Let me invoke code-reviewer"
[Uses Task tool with code-reviewer agent]

code-reviewer: [Returns APPROVE/REJECT]
```

**Example: Invoke docs-generator**
```
You: "Document the export pattern we just built"

Builder: "Let me invoke docs-generator"
[Uses Task tool with docs-generator agent]

docs-generator: [Creates/updates documentation]
```

### Agent Invocation Patterns

**Automatic Invocation (code-reviewer)**
- Builder automatically invokes code-reviewer after implementing
- You don't need to ask for it explicitly
- Happens before every commit

**Manual Invocation (architect, docs-generator)**
- You request these agents when needed
- Builder uses Task tool to invoke them
- Results returned to main session

**Direct Invocation (Advanced)**
- You can invoke agents directly with `@architect` syntax
- Useful for complex design discussions
- Returns control to you immediately

---

## Task Size Guidelines

### ✅ Good Task Size (30-60 mins)
- Implement one domain entity
- Implement one use case
- Implement one repository
- Create ViewModels and mappers for one feature
- Update one panel to use use cases

### ❌ Too Large (>2 hours)
- Implement entire feature (all layers) at once
- Multiple domain entities in one commit
- Multiple use cases in one commit

### 🎯 Perfect Task (Layer-by-Layer)
- **Scope:** One layer at a time (domain → application → infrastructure → presentation)
- **Time:** 30-60 minutes including review
- **Commits:** One commit per layer
- **Review:** Can be reviewed in 10-15 minutes


---

## Handling Disagreements

### Builder vs Reviewer Conflict

**Scenario:** Reviewer rejects, Builder thinks it's correct

**Resolution:**
1. Builder explains reasoning: "I used `any` here because..."
2. Reviewer explains concern: "This violates ISP because..."
3. **You (human) decide:** Read both arguments, make call
4. Update rules if needed (document exception in CLAUDE.md)

**Example:**
```
Builder: "I used `any` for EventEmitter signature to match Node.js"
Reviewer: "REJECT - no `any` allowed"
You: "This is valid - update CLAUDE.md to document this exception"
→ Builder adds comment + eslint-disable
→ Reviewer approves with exception noted
```

---

## Progress Tracking

Track features in TODO.md using this pattern:

```markdown
## Feature: Import Job Tracking

- [x] Domain layer (commit: abc123)
  - ImportJob entity with rich behavior
  - JobStatus value object
  - IImportJobRepository interface

- [x] Application layer (commit: def456)
  - LoadImportJobsUseCase
  - ImportJobViewModel and mapper

- [x] Infrastructure layer (commit: ghi789)
  - ImportJobRepository implementation

- [x] Presentation layer (commit: jkl012)
  - ImportJobViewerPanel using use cases

- [ ] Documentation
  - Clean Architecture example
```

---

## Tips for Success

### 1. Commit Early, Commit Often
- One task = one commit
- Never batch 5 tasks into one commit
- Easy to rollback if something breaks

### 2. Test After Each Commit
```bash
npm run compile  # Must succeed
code .           # Launch VS Code
# F5 to test extension
# Manually verify changed feature works
```

### 3. Keep Notes
Track progress in TODO.md:
```
## Feature: Import Job Tracking

**Status:** In Progress

**Completed:**
- [x] Domain layer (commit: abc123)
- [x] Application layer (commit: def456)
- [ ] Infrastructure layer (in progress)

**Blocked:** None

**Next:** Finish ImportJobRepository, then presentation layer
```

### 4. Take Breaks
- Every 2-3 hours: Take 15-minute break
- Every 6 hours: Stop for the day
- Don't burn out - this is a marathon, not sprint

### 5. Celebrate Small Wins
- Each approved commit is progress
- Track lines of code deleted (duplication removed)
- Track reduction in complexity

---

## Rollback Plan (If Things Break)

### Quick Rollback
```bash
git log --oneline  # Find last good commit
git reset --hard abc123  # Rollback to that commit
```

### Safer: Branch Strategy
```bash
# Before starting phase
git checkout -b refactor/phase-1-1
# Work on branch, commit frequently
# When phase complete and tested:
git checkout main
git merge refactor/phase-1-1
```

---

## Success Metrics

Track these after each session:

- **Tasks completed:** [number]
- **Commits made:** [number]
- **Lines deleted (duplication):** [number]
- **Compilation errors:** [should be 0]
- **Manual test result:** [pass/fail]
- **Feeling:** [confident/uncertain/confused]

If "Feeling" is uncertain/confused → STOP, ask questions, don't push forward.

---

## Summary

**The workflow is:**

**For New Features (Clean Architecture):**
1. architect designs all layers (~30 min)
   - Domain: Entities, value objects, interfaces
   - Application: Use cases, ViewModels, mappers
   - Infrastructure: Repository implementations
   - Presentation: Panels using use cases
2. Review design and approve (~15 min)
3. Implement layer by layer (~30 min per layer)
   - Domain first (rich entities, no dependencies)
   - Application second (use cases orchestrate)
   - Infrastructure third (repositories implement interfaces)
   - Presentation last (panels use use cases)
4. code-reviewer auto-reviews each layer (~2 min)
   - Checks for anemic models
   - Checks business logic placement
   - Checks dependency direction
5. Commit each layer separately (~5 min)
6. docs-generator documents pattern if new (~20 min)

**For Bug Fixes:**
1. Implement fix (~20 min)
2. code-reviewer auto-reviews (~2 min)
3. Commit if approved (~5 min)

**The keys are:**
- **Clean Architecture** - Domain → Application → Infrastructure/Presentation
- **Rich domain models** - Entities with behavior (not anemic)
- **Use cases orchestrate** - No business logic in use cases
- **Layer by layer** - Commit domain, then application, then infra/presentation
- **code-reviewer catches** - Anemic models, wrong layer responsibilities
- **Manual test after commit** - F5 in VS Code, verify it works

**Current Validation:**
- ✅ TypeScript compilation (`npm run compile`)
- ✅ ESLint rules (part of compile)
- ✅ Manual testing (F5 in VS Code)
- ✅ code-reviewer (Clean Architecture compliance)

**You've got this. Start with ONE feature today.**
