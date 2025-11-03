# Agent Roles Reference

**Purpose**: Clarify the role of each specialized agent - who implements vs who reviews vs who documents.

---

## 🚀 Quick Reference

### Agent Categories

**IMPLEMENTERS** (write code):
- YOU (human developer or general builder agent)

**REVIEWERS** (analyze code):
- `clean-architecture-guardian` - Architecture, layer separation, and final approval
- `typescript-pro` - Type safety and TypeScript patterns

**IMPLEMENTERS** (fix/create code):
- `code-cleanup-implementer` - Logging/comment fixes and documentation

---

## 📖 Detailed Agent Roles

### YOU (Implementer)

**Role**: Primary code implementer

**Responsibilities**:
- ✅ Implement domain entities with rich behavior
- ✅ Implement use cases that orchestrate domain
- ✅ Implement repositories that satisfy domain interfaces
- ✅ Implement panels that call use cases
- ✅ Write clean code following CLAUDE.md rules
- ✅ Compile after each layer (`npm run compile`)
- ✅ Fix issues identified by reviewers
- ✅ Manual testing (F5 in VS Code)

**When to Invoke**: You ARE the implementer, you don't invoke yourself

**Example Usage**:
```
You: "I need to implement a new import job tracking feature"

[YOU design and implement the feature following NEW_FEATURE_WORKFLOW.md]
[YOU compile after each layer]
[YOU invoke reviewers when ready]
```

---

### clean-architecture-guardian (Designer + Reviewer + Final Approval Gate)

**Agent File**: `.claude/agents/clean-architecture-guardian.md`

**Role**: Clean Architecture specialist, design consultant, and final approval authority

**Responsibilities**:

#### As Designer (Proactive):
- ✅ Design all four layers upfront (domain, application, infrastructure, presentation)
- ✅ Define domain entities with rich behavior
- ✅ Define use case orchestration patterns
- ✅ Define repository interfaces in domain
- ✅ Ensure dependency direction flows inward
- ✅ Create comprehensive design specifications

#### As Reviewer + Final Approval Gate (Reactive):
- ✅ Review domain layer for purity (zero external dependencies)
- ✅ Verify entities have behavior (not anemic)
- ✅ Verify use cases orchestrate only (no business logic)
- ✅ Verify panels have no business logic
- ✅ Check dependency direction
- ✅ Validate SOLID principles
- ✅ **Review code quality** (naming, duplication, complexity)
- ✅ **Provide FINAL APPROVAL**: APPROVE / CHANGES REQUESTED / REJECT

**Note**: This agent absorbed the final approval responsibilities from the deprecated `code-reviewer` agent.

**When to Invoke**:

**Design Phase** (before implementation):
```
@agent-clean-architecture-guardian - Design a new [feature] following Clean Architecture.

Requirements:
- [List requirements]

Design all four layers:
1. Domain: Entities, value objects, domain services, interfaces
2. Application: Use cases, ViewModels, mappers
3. Infrastructure: Repository implementations
4. Presentation: Panels, views

Ensure:
- Rich domain models with behavior
- Use cases orchestrate only
- Dependencies point inward
```

**Review Phase + Final Approval** (after implementation):
```
@agent-clean-architecture-guardian - Review domain layer and provide FINAL APPROVAL:
- src/features/[feature]/domain/

Focus on:
- Rich models with behavior (not anemic)
- Zero external dependencies
- Business logic in correct layer
- SOLID principles
- Code quality (naming, duplication, complexity)

Provide: APPROVE / CHANGES REQUESTED / REJECT

Create review file: docs/codereview/clean-arch-guardian-review-{YYYY-MM-DD}.md
```

**Invoked**:
- Once at design phase (30 min)
- Once per layer during review (5 min each)

**Does NOT**:
- ❌ Implement code
- ❌ Write TypeScript files
- ❌ Execute code changes
- ❌ Review type safety (that's typescript-pro's job)

---

### typescript-pro (Reviewer)

**Agent File**: `.claude/agents/typescript-pro.md`

**Role**: TypeScript type safety specialist

**Responsibilities**:

#### Type Contract Review (Before Implementation):
- ✅ Review entity interfaces and type definitions
- ✅ Suggest generic constraints
- ✅ Recommend discriminated unions for type narrowing
- ✅ Suggest type guards for safer access
- ✅ Optimize type inference

#### Type Safety Review (After Implementation):
- ✅ Verify no `any` usage without justification
- ✅ Check explicit return types on public methods
- ✅ Verify proper null handling (null vs undefined consistency)
- ✅ Check generic type parameters and constraints
- ✅ Review type narrowing and type guards
- ✅ Verify VS Code extension API type usage
- ✅ Check for non-null assertions (`!`) without validation

**When to Invoke**:

**Type Contract Review** (during design phase):
```
@agent-typescript-pro - Review TYPE CONTRACTS from clean-architecture-guardian's design.

Focus on:
- Entity interfaces and return types
- Generic constraints
- Null handling consistency
- Discriminated unions for type narrowing
- Type guards

Provide recommendations BEFORE implementation.
```

**Type Safety Review** (after implementation):
```
@agent-typescript-pro - Review domain layer for type safety:
- src/features/[feature]/domain/

Focus on:
- Explicit return types on all public methods
- No `any` usage
- Proper null handling
- Type inference optimization

Create review file: docs/codereview/typescript-pro-review-{YYYY-MM-DD}.md
```

**Invoked**:
- Once during design for type contracts (10 min)
- Once per layer during review (5 min each)

**Does NOT**:
- ❌ Implement features
- ❌ Write code during development
- ❌ Review architecture (that's clean-architecture-guardian's job)
- ❌ Make business logic decisions

**Note**: The `code-reviewer` agent has been **deprecated** and its responsibilities absorbed into `clean-architecture-guardian`. See `.claude/agents/archived/DEPRECATION_NOTE.md` for details.

---

### code-cleanup-implementer (Documentation Specialist)

**Agent File**: `.claude/agents/code-cleanup-implementer.md`

**Role**: Documentation creator and maintainer

**Responsibilities**:
- ✅ Add/update JSDoc comments to code
- ✅ Create new documentation files
- ✅ Update existing documentation
- ✅ Clean up logging (remove domain logs, ensure boundary logging)
- ✅ Clean up comments (remove placeholders, add "Why" explanations)
- ✅ Follow DOCUMENTATION_STYLE_GUIDE.md
- ✅ Follow LOGGING_GUIDE.md
- ✅ Document new patterns in ARCHITECTURE_GUIDE.md

**When to Invoke**:

**Cleanup Phase** (after implementation):
```
@agent-code-cleanup-implementer - Perform comment and logging cleanup on all uncommitted changes.

Standards:
- Comments: docs/DOCUMENTATION_STYLE_GUIDE.md
- Logging: docs/architecture/LOGGING_GUIDE.md

Requirements:
✅ Add "Why" explanations for non-obvious code
✅ Keep JSDoc on public/protected methods
❌ Remove placeholder comments
❌ Remove obvious comments
✅ Ensure domain layer has ZERO logging
✅ Replace console.log with ILogger

Execution:
- Fix issues directly (no review file)
- Only touch uncommitted changes
```

**Documentation Phase** (for new patterns):
```
@agent-code-cleanup-implementer - Document the [feature] pattern.

Create/update:
- docs/architecture/ARCHITECTURE_GUIDE.md (add example)
- README.md (add feature to list)

Show all four layers in example.
Follow: docs/DOCUMENTATION_STYLE_GUIDE.md
```

**Invoked**:
- Optionally after implementation (cleanup phase)
- After feature complete (documentation phase)

**Does NOT**:
- ❌ Review architecture
- ❌ Review type safety
- ❌ Implement features
- ❌ Make architectural decisions

---

## 🎯 Agent Workflow Patterns

### Pattern 1: New Feature (Complex)

```
Phase 1: Design
├─ clean-architecture-guardian designs all layers (30 min)
├─ typescript-pro reviews type contracts (10 min)
└─ Human approves (10 min)

Phase 2-5: Implementation (per layer)
├─ YOU implement layer (30 min)
├─ npm run compile ✅
├─ typescript-pro reviews (5 min) [parallel]
├─ clean-architecture-guardian reviews (5 min) [parallel]
├─ clean-architecture-guardian final approval (2 min)
├─ YOU fix issues (if any)
├─ npm run compile ✅
└─ YOU commit (3 min)

Phase 6: Documentation (optional)
└─ code-cleanup-implementer creates docs (20 min)
```

---

### Pattern 2: New Feature (Simple)

```
Phase 1: Quick Design
├─ YOU sketch design (10 min)
└─ typescript-pro reviews type contracts (5 min)

Phase 2: Domain + Application
├─ YOU implement (30 min)
├─ npm run compile ✅
├─ typescript-pro reviews [parallel]
├─ clean-architecture-guardian reviews [parallel]
├─ clean-architecture-guardian final approval
└─ YOU commit

Phase 3: Infrastructure + Presentation
├─ YOU implement (20 min)
├─ npm run compile ✅
├─ typescript-pro reviews [parallel]
├─ clean-architecture-guardian reviews [parallel]
├─ clean-architecture-guardian final approval
└─ YOU commit
```

---

### Pattern 3: Bug Fix

```
Phase 1: Implement
├─ YOU reproduce bug (5 min)
├─ YOU fix bug (15 min)
└─ npm run compile ✅

Phase 2: Review (minimal)
├─ typescript-pro reviews (if type-related) (2 min)
└─ clean-architecture-guardian final approval (2 min)

Phase 3: Commit & Test
├─ YOU commit (3 min)
└─ YOU test (5 min)
```

---

### Pattern 4: Refactoring

```
Phase 1: Plan
└─ YOU create refactoring plan (15 min)

Phase 2: Execute Incrementally
├─ YOU refactor step 1 (10 min)
├─ npm run compile ✅
├─ YOU commit (3 min)
├─ YOU refactor step 2 (10 min)
├─ npm run compile ✅
├─ YOU commit (3 min)
└─ [Repeat for each step]

Phase 3: Review (if significant)
├─ clean-architecture-guardian reviews (if architecture changed)
├─ typescript-pro reviews (if types changed)
└─ clean-architecture-guardian final approval
```

---

## 🚨 Common Agent Role Confusion

### ❌ Mistake 1: Asking Reviewers to Implement

**Wrong**:
```
"@agent-typescript-pro - Implement the ImportJob feature with proper type safety"
```

**Problem**: typescript-pro is a REVIEWER, not an implementer

**Right**:
```
[YOU implement the ImportJob feature]
[npm run compile ✅]

"@agent-typescript-pro - Review ImportJob implementation for type safety"
```

---

### ❌ Mistake 2: Asking Implementer to Review

**Wrong**:
```
"Implement the feature and review it for Clean Architecture compliance"
```

**Problem**: Mixing implementation and review responsibilities

**Right**:
```
[YOU implement the feature]
"@agent-clean-architecture-guardian - Review for Clean Architecture compliance"
```

---

### ❌ Mistake 3: Skipping clean-architecture-guardian Design Phase

**Wrong**:
```
[YOU design the architecture yourself]
[YOU implement]
"@agent-clean-architecture-guardian - Review my implementation"
```

**Problem**: Missing opportunity for upfront architecture guidance

**Right**:
```
"@agent-clean-architecture-guardian - Design the [feature] with Clean Architecture"
[YOU review and approve design]
[YOU implement following the design]
"@agent-clean-architecture-guardian - Review implementation matches design"
```

---

### ❌ Mistake 4: Using code-cleanup-implementer for Architecture Review

**Wrong**:
```
"@agent-code-cleanup-implementer - Review the architecture of this feature"
```

**Problem**: code-cleanup-implementer doesn't review architecture

**Right**:
```
"@agent-clean-architecture-guardian - Review architecture"
[After architecture is correct]
"@agent-code-cleanup-implementer - Document the pattern"
```

---

## 📋 Agent Invocation Checklist

### Before invoking any agent:

- [ ] Understand what the agent does (reviewer vs implementer vs documenter)
- [ ] Understand when to invoke (design vs implementation vs cleanup)
- [ ] Have code compiled if invoking reviewer
- [ ] Know what you expect from the agent (design spec vs review findings vs docs)

### When invoking clean-architecture-guardian:

- [ ] Design phase: Provide clear requirements
- [ ] Review phase: Specify which layer to review
- [ ] Review phase: Code compiles without errors
- [ ] Specify output format (design spec or review file)

### When invoking typescript-pro:

- [ ] Type contracts: Provide design from clean-architecture-guardian
- [ ] Review phase: Specify which layer to review
- [ ] Review phase: Code compiles without errors
- [ ] Specify focus areas (type safety, generics, null handling)

### When invoking code-cleanup-implementer:

- [ ] Code is implemented and working
- [ ] Know whether you want cleanup or documentation
- [ ] Specify standards to follow (LOGGING_GUIDE.md, DOCUMENTATION_STYLE_GUIDE.md)

---

## 🔗 See Also

- [NEW_FEATURE_WORKFLOW.md](workflows/NEW_FEATURE_WORKFLOW.md) - Step-by-step feature workflow
- [BUG_FIX_WORKFLOW.md](workflows/BUG_FIX_WORKFLOW.md) - Bug fix process
- [REFACTORING_WORKFLOW.md](workflows/REFACTORING_WORKFLOW.md) - Refactoring process
- [WORKFLOW_GUIDE.md](WORKFLOW_GUIDE.md) - Comprehensive workflow guide
- [CLAUDE.md](../CLAUDE.md) - Coding rules and principles
