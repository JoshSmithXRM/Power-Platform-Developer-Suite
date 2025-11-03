# New Feature Workflow

**Purpose**: Step-by-step checklist for implementing new features with Clean Architecture and type safety.

---

## 🚀 Quick Reference

**Decision Tree**:
- Simple feature (1-2 entities, <1 hour)? → Use **Streamlined Workflow**
- Complex feature (5+ entities, 3+ hours)? → Use **Comprehensive Workflow**

**Key Principles**:
- ✅ Design upfront with clean-architecture-guardian
- ✅ Review type contracts BEFORE implementation
- ✅ Compile after each layer
- ✅ Review per layer (parallel: typescript-pro + clean-architecture-guardian)
- ✅ Commit per layer
- ✅ Write clean code from start (no cleanup phase needed)

**Agent Roles**:
- YOU = Implementer
- typescript-pro = Type safety reviewer
- clean-architecture-guardian = Architecture reviewer + Final approval gate
- code-cleanup-implementer = Logging/comment fixer + Documenter

---

## 📖 Comprehensive Workflow (Complex Features)

**Use when**: 5+ entities, 10+ use cases, 3+ hours estimated

### Phase 1: Type-Safe Architecture Design (50 min)

**1.1 Gather Requirements (10 min)**
- [ ] Document feature requirements
- [ ] Identify business rules
- [ ] List acceptance criteria
- [ ] Sketch data flow

**1.2 Design All Layers (30 min)**

Invoke clean-architecture-guardian:
```
@agent-clean-architecture-guardian - Design a new feature for [DESCRIPTION].

Requirements:
- [Requirement 1]
- [Requirement 2]
- [Requirement 3]

Please design all four layers:
1. Domain: Entities, value objects, domain services, interfaces
2. Application: Use cases, ViewModels, mappers
3. Infrastructure: Repository implementations, API clients
4. Presentation: Panels, views, event handlers

Ensure:
- Rich domain models with behavior (not anemic)
- Use cases orchestrate only (no business logic)
- Dependencies point inward
- Repository interfaces in domain layer
```

**1.3 Review Type Contracts (10 min)**

Invoke typescript-pro:
```
@agent-typescript-pro - Review the TYPE CONTRACTS from clean-architecture-guardian's design.

Focus on:
- Entity interfaces and return types
- Generic constraints
- Null handling (null vs undefined consistency)
- Discriminated unions for type narrowing
- Type guards for safer access

Provide recommendations for:
- Better type inference
- Stronger type safety
- Advanced TypeScript patterns

Do NOT review implementation yet - only type definitions.
```

**1.4 Human Approval (10 min)**
- [ ] Review clean-architecture-guardian's design
- [ ] Review typescript-pro's type recommendations
- [ ] Approve design or request changes
- [ ] Document any exceptions to architectural rules

---

### Phase 2: Domain Layer (45 min)

**2.1 Implementation (30 min)**

Create domain layer files:
- [ ] `src/features/[feature]/domain/entities/[Entity].ts` - Rich models with behavior
- [ ] `src/features/[feature]/domain/valueObjects/[ValueObject].ts` - Immutable value objects
- [ ] `src/features/[feature]/domain/services/[Service].ts` - Complex domain logic
- [ ] `src/features/[feature]/domain/interfaces/I[Repository].ts` - Repository contracts

**Checklist**:
- [ ] Entities have behavior methods (not just getters/setters)
- [ ] Zero imports from infrastructure/presentation layers
- [ ] No logging (pure business logic)
- [ ] Explicit return types on all public methods
- [ ] No `any` types without explicit justification
- [ ] Value objects are immutable

**2.2 Compilation (30 sec)**
```bash
npm run compile
```
- [ ] Compilation succeeds ✅
- [ ] Zero TypeScript errors
- [ ] Zero ESLint errors

**2.3 Type Safety Review (5 min)**

Invoke typescript-pro:
```
@agent-typescript-pro - Review domain layer implementation in:
- src/features/[feature]/domain/

Focus on:
- Explicit return types on all public methods
- No `any` usage
- Proper null handling
- Type inference optimization
- Generic constraints

Create review file: docs/codereview/typescript-pro-domain-review-{YYYY-MM-DD}.md
```

**2.4 Architecture Review + Final Approval (5 min)**

Invoke clean-architecture-guardian (parallel with 2.3):
```
@agent-clean-architecture-guardian - Review domain layer and provide FINAL APPROVAL:
- src/features/[feature]/domain/

Focus on:
- Rich models with behavior (not anemic)
- Zero external dependencies
- Business logic in entities/services
- Repository interfaces in domain
- SOLID principles
- Code quality (naming, duplication, complexity)

Provide: APPROVE / CHANGES REQUESTED / REJECT

Create review file: docs/codereview/clean-arch-guardian-domain-review-{YYYY-MM-DD}.md
```

**2.5 Address Review Findings**
- [ ] Fix critical issues
- [ ] Fix moderate issues
- [ ] Document any accepted minor issues
- [ ] npm run compile ✅

**2.6 Commit (3 min)**
```bash
git add src/features/[feature]/domain/
git commit -m "feat(domain): add [feature] entities with behavior

- [Entity1] entity with rich behavior
- [ValueObject] value object (immutable)
- [DomainService] for complex logic
- I[Repository] interface (domain contract)

Reviewed-by: typescript-pro, clean-architecture-guardian ✅"
```

---

### Phase 3: Application Layer (45 min)

**3.1 Implementation (30 min)**

Create application layer files:
- [ ] `src/features/[feature]/application/useCases/[UseCase].ts` - Orchestrate domain
- [ ] `src/features/[feature]/application/viewModels/[ViewModel].ts` - DTOs for presentation
- [ ] `src/features/[feature]/application/mappers/[Mapper].ts` - Domain → ViewModel

**Checklist**:
- [ ] Use cases orchestrate domain entities (no business logic)
- [ ] ViewModels are DTOs (no behavior, just data)
- [ ] Mappers transform only (no sorting params - sort before/after mapping)
- [ ] Explicit return types on all public methods
- [ ] Logging at use case boundaries (start/completion/failures)
- [ ] Inject ILogger via constructor (not Logger.getInstance())

**3.2 Compilation (30 sec)**
```bash
npm run compile
```
- [ ] Compilation succeeds ✅

**3.3 Parallel Review (5 min each, run simultaneously)**

Invoke typescript-pro:
```
@agent-typescript-pro - Review application layer:
- src/features/[feature]/application/

Focus on:
- Mapper type safety
- ViewModel shape correctness
- Promise return types
- Explicit return types

Create review file: docs/codereview/typescript-pro-application-review-{YYYY-MM-DD}.md
```

Invoke clean-architecture-guardian:
```
@agent-clean-architecture-guardian - Review application layer:
- src/features/[feature]/application/

Focus on:
- Use cases orchestrate only (no business logic)
- ViewModels have no behavior
- Mappers transform only
- Logging at boundaries

Create review file: docs/codereview/clean-arch-guardian-application-review-{YYYY-MM-DD}.md
```

**3.4 Final Approval (2 min)**
```
@agent-clean-architecture-guardian - Review application layer for final approval.
Provide: APPROVE / CHANGES REQUESTED / REJECT
```

**3.5 Address Review Findings**
- [ ] Fix issues
- [ ] npm run compile ✅

**3.6 Commit (3 min)**
```bash
git add src/features/[feature]/application/
git commit -m "feat(app): add [feature] use cases and ViewModels

- [UseCase1] orchestrates domain logic
- [UseCase2] handles [scenario]
- [ViewModel] DTO for presentation
- [Mapper] maps domain → ViewModel

Reviewed-by: typescript-pro, clean-architecture-guardian, code-reviewer ✅"
```

---

### Phase 4: Infrastructure Layer (45 min)

**4.1 Implementation (30 min)**

Create infrastructure layer files:
- [ ] `src/features/[feature]/infrastructure/repositories/[Repository].ts` - Implement domain interfaces
- [ ] `src/features/[feature]/infrastructure/dtos/[Dto].ts` - API response models (optional)
- [ ] `src/features/[feature]/infrastructure/mappers/[Mapper].ts` - DTO → Domain entity (optional)

**Checklist**:
- [ ] Repositories implement domain interfaces
- [ ] Dependencies point inward (infrastructure → domain)
- [ ] Logging for API calls, auth, storage (debug level)
- [ ] Secrets/tokens redacted in logs
- [ ] Inject ILogger via constructor
- [ ] Explicit return types

**4.2 Compilation (30 sec)**
```bash
npm run compile
```
- [ ] Compilation succeeds ✅

**4.3 Parallel Review (5 min each)**

Invoke typescript-pro:
```
@agent-typescript-pro - Review infrastructure layer:
- src/features/[feature]/infrastructure/

Focus on:
- Repository implementation matches interface types
- API DTO mapping is type-safe
- Error handling with proper types

Create review file: docs/codereview/typescript-pro-infrastructure-review-{YYYY-MM-DD}.md
```

Invoke clean-architecture-guardian:
```
@agent-clean-architecture-guardian - Review infrastructure layer:
- src/features/[feature]/infrastructure/

Focus on:
- Repositories implement domain interfaces
- Dependencies point inward
- No business logic in repositories

Create review file: docs/codereview/clean-arch-guardian-infrastructure-review-{YYYY-MM-DD}.md
```

**4.4 Final Approval (2 min)**
```
@agent-clean-architecture-guardian - Review infrastructure layer for final approval.
```

**4.5 Address Review Findings**
- [ ] Fix issues
- [ ] npm run compile ✅

**4.6 Commit (3 min)**
```bash
git add src/features/[feature]/infrastructure/
git commit -m "feat(infra): add [feature] repositories

- [Repository] implements I[Repository] interface
- API integration for [feature]
- Logging for API calls

Reviewed-by: typescript-pro, clean-architecture-guardian, code-reviewer ✅"
```

---

### Phase 5: Presentation Layer (45 min)

**5.1 Implementation (30 min)**

Create presentation layer files:
- [ ] `src/features/[feature]/presentation/panels/[Panel].ts` - Panel logic
- [ ] `src/features/[feature]/presentation/views/[view].ts` - HTML render functions
- [ ] `src/features/[feature]/presentation/handlers/[Handler].ts` - Event handlers (optional)

**Checklist**:
- [ ] Panels call use cases only (no business logic)
- [ ] All HTML extracted to separate view files
- [ ] Event handlers call use cases
- [ ] Logging for user actions, panel lifecycle
- [ ] Inject ILogger via constructor
- [ ] Explicit return types

**5.2 Compilation (30 sec)**
```bash
npm run compile
```
- [ ] Compilation succeeds ✅

**5.3 Parallel Review (5 min each)**

Invoke typescript-pro:
```
@agent-typescript-pro - Review presentation layer:
- src/features/[feature]/presentation/

Focus on:
- VS Code API usage type-safe
- Event handlers properly typed
- No business logic in panel

Create review file: docs/codereview/typescript-pro-presentation-review-{YYYY-MM-DD}.md
```

Invoke clean-architecture-guardian:
```
@agent-clean-architecture-guardian - Review presentation layer:
- src/features/[feature]/presentation/

Focus on:
- Panel uses use cases only (no business logic)
- HTML extracted to views
- Dependencies point inward

Create review file: docs/codereview/clean-arch-guardian-presentation-review-{YYYY-MM-DD}.md
```

**5.4 Final Approval (2 min)**
```
@agent-clean-architecture-guardian - Review presentation layer for final approval.
```

**5.5 Address Review Findings**
- [ ] Fix issues
- [ ] npm run compile ✅

**5.6 Commit (3 min)**
```bash
git add src/features/[feature]/presentation/
git commit -m "feat(pres): add [feature] panel

- [Panel] uses use cases for all logic
- HTML extracted to view files
- Event handlers call use cases only

Reviewed-by: typescript-pro, clean-architecture-guardian, code-reviewer ✅"
```

---

### Phase 6: Integration & Testing (15 min)

**6.1 Manual Testing**
- [ ] Open VS Code extension (F5)
- [ ] Test happy path
- [ ] Test error cases
- [ ] Verify logging in OutputChannel
- [ ] Test edge cases

**6.2 Update Extension Registration (if needed)**
```typescript
// src/extension.ts
const [feature]Panel = new [Feature]Panel(...);
context.subscriptions.push(
    vscode.commands.registerCommand('powerplatform.[feature]', () => {
        [feature]Panel.show();
    })
);
```

**6.3 Final Commit (if changes)**
```bash
git add src/extension.ts
git commit -m "feat: register [feature] command"
```

---

### Phase 7: Documentation (Optional, 20 min)

**Only if new patterns introduced**

Invoke docs-generator:
```
@agent-code-cleanup-implementer - Document the new [feature] pattern.

Create/update:
- Example in docs/architecture/ARCHITECTURE_GUIDE.md (if new pattern)
- Add to README.md feature list

Show:
- Domain entity example
- Use case pattern
- ViewModel mapping
- All four layers

Follow: docs/DOCUMENTATION_STYLE_GUIDE.md
```

Commit:
```bash
git add docs/
git commit -m "docs: add [feature] Clean Architecture example"
```

---

## 🎯 Streamlined Workflow (Simple Features)

**Use when**: 1-2 entities, 1-2 use cases, <1 hour estimated

### Phase 1: Quick Design (15 min)
1. Sketch domain entities on paper (5 min)
2. Identify use case orchestration (5 min)
3. Invoke typescript-pro to review type contracts (5 min)

### Phase 2: Domain + Application (40 min)
1. Implement domain entities + use cases (30 min)
2. npm run compile ✅
3. Parallel review: typescript-pro + clean-architecture-guardian (5 min)
4. code-reviewer final approval (2 min)
5. Commit (3 min)

### Phase 3: Infrastructure + Presentation (30 min)
1. Implement repositories + panels (20 min)
2. npm run compile ✅
3. Parallel review: typescript-pro + clean-architecture-guardian (5 min)
4. code-reviewer final approval (2 min)
5. Commit (3 min)

### Phase 4: Testing (10 min)
1. F5 in VS Code
2. Test feature end-to-end
3. Verify logging

**Total Time**: ~95 mins, 2 commits

---

## ⚠️ Common Mistakes to Avoid

### ❌ Mistake 1: Implementing All Layers at Once
```
Implement domain + app + infra + pres → Compile → Review
```
**Problem**: Type errors cascade across layers (15x rework multiplier)

**Fix**: Implement per layer, compile after each

---

### ❌ Mistake 2: Skipping Type Contract Review
```
Design → Implement → Review implementation
```
**Problem**: Domain types wrong, application built on wrong assumptions

**Fix**: Review type contracts BEFORE implementation

---

### ❌ Mistake 3: Treating Review Agents as Implementers
```
"Deploy typescript-pro to implement the feature"
```
**Problem**: typescript-pro is a REVIEWER, not implementer

**Fix**: YOU implement, typescript-pro REVIEWS

---

### ❌ Mistake 4: Cleanup at End
```
Implement all layers → code-cleanup-implementer removes logging from domain
```
**Problem**: If domain needs cleanup, it was impure during implementation

**Fix**: Write clean code from start (follow LOGGING_GUIDE.md)

---

### ❌ Mistake 5: Skipping Compilation Between Layers
```
Implement domain → Implement application → Implement infrastructure → Compile all
```
**Problem**: 50+ compilation errors, unclear root causes

**Fix**: Compile after each layer

---

## 📊 Success Metrics

After completing the workflow, verify:

- [ ] All layers compile without errors
- [ ] Zero ESLint violations
- [ ] All review agents approved (APPROVE status)
- [ ] Manual testing passed
- [ ] Domain layer has zero external dependencies
- [ ] Use cases have no business logic
- [ ] Panels have no business logic
- [ ] Logging only at boundaries (not in domain)
- [ ] 4-5 commits (one per layer) for complex features
- [ ] Feature works end-to-end in VS Code

---

## 🔗 See Also

- [AGENT_ROLES.md](../AGENT_ROLES.md) - Agent responsibilities (reviewer vs implementer)
- [BUG_FIX_WORKFLOW.md](BUG_FIX_WORKFLOW.md) - Quick workflow for bug fixes
- [REFACTORING_WORKFLOW.md](REFACTORING_WORKFLOW.md) - Safe refactoring process
- [WORKFLOW_GUIDE.md](../WORKFLOW_GUIDE.md) - Comprehensive workflow guide with examples
- [ARCHITECTURE_GUIDE.md](../../docs/architecture/ARCHITECTURE_GUIDE.md) - Clean Architecture principles
- [LOGGING_GUIDE.md](../../docs/architecture/LOGGING_GUIDE.md) - Logging by layer
- [DOCUMENTATION_STYLE_GUIDE.md](../../docs/DOCUMENTATION_STYLE_GUIDE.md) - Comment standards
