# New Feature Workflow

**Purpose**: Step-by-step checklist for implementing new features with Clean Architecture and type safety.

---

## 🚀 Quick Reference

**Decision Tree**:
- Simple feature (1-2 slices, <1 hour)? → Use **Streamlined Workflow** (skip design doc)
- Complex feature (4+ slices)? → Use **DESIGN_WORKFLOW.md first**, then **Comprehensive Workflow**

**Pre-Implementation:**
- For complex features: See [DESIGN_WORKFLOW.md](DESIGN_WORKFLOW.md) to create technical design document
- Result: Approved design with type contracts, vertical slices, and architecture defined

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

**Use when**: 4+ vertical slices, new architectural patterns, affects multiple domains

**Pre-requisite**: Complete DESIGN_WORKFLOW.md first to create approved technical design

### Phase 1: Type-Safe Architecture Design (Complete via DESIGN_WORKFLOW.md)

**For complex features with 4+ slices:**

Follow the complete design workflow documented in [DESIGN_WORKFLOW.md](DESIGN_WORKFLOW.md).

**Summary:**
1. Create design document from template
2. clean-architecture-guardian designs all layers
3. typescript-pro reviews type contracts
4. Human review and iteration
5. clean-architecture-guardian final approval
6. Post-approval cleanup

**Output:**
- [ ] Approved technical design document in `docs/design/[FEATURE]_DESIGN.md`
- [ ] Type contracts defined
- [ ] Vertical slices identified (MVP + enhancements)
- [ ] File structure mapped out
- [ ] Status: "Approved"

**After approval:** Proceed to Phase 2 (Domain Layer implementation)

---

### Phase 2: Domain Layer

**2.1 Implementation**

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

**2.2 Write Tests**
- [ ] Create `[Entity].test.ts` alongside entity
- [ ] Test all public methods
- [ ] Test validation rules
- [ ] Test state transitions
- [ ] Test value object immutability
- [ ] Test domain service complex logic
- [ ] Target: 100% coverage for entities

**Test Structure**:
```typescript
describe('[EntityName]', () => {
  // Test data factory
  function createValid[Entity](): [Entity] { ... }

  describe('[methodName]', () => {
    it('should [expected behavior]', () => {
      // Arrange
      const entity = createValid[Entity]();

      // Act
      const result = entity.method();

      // Assert
      expect(result).toBe(expected);
    });
  });
});
```

**2.3 Run Tests (30 sec)**
```bash
npm test
```
- [ ] All tests pass ✅
- [ ] No test failures
- [ ] Coverage for new code visible

**2.4 Compilation (30 sec)**
```bash
npm run compile  # Now includes tests
```
- [ ] Compilation succeeds ✅
- [ ] Tests pass ✅
- [ ] Zero TypeScript errors
- [ ] Zero ESLint errors

**2.5 Type Safety Review**

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

**2.6 Architecture Review + Final Approval**

Invoke clean-architecture-guardian (parallel with 2.5):
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
- Tests present for entities and domain services

Provide: APPROVE / CHANGES REQUESTED / REJECT

Create review file: docs/codereview/clean-arch-guardian-domain-review-{YYYY-MM-DD}.md
```

**2.7 Address Review Findings**
- [ ] Fix critical issues
- [ ] Fix moderate issues
- [ ] Document any accepted minor issues
- [ ] npm run compile ✅

**2.8 Commit**
```bash
git add src/features/[feature]/domain/
git commit -m "feat(domain): add [feature] entities with behavior

- [Entity1] entity with rich behavior
- [ValueObject] value object (immutable)
- [DomainService] for complex logic
- I[Repository] interface (domain contract)

Tests:
- [Entity1].test.ts (100% coverage)
- [DomainService].test.ts

Reviewed-by: typescript-pro, clean-architecture-guardian ✅"
```

---

### Phase 3: Application Layer

**3.1 Implementation**

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

**3.2 Write Tests**
- [ ] Create `[UseCase].test.ts` alongside use case
- [ ] Test orchestration flow
- [ ] Test error handling paths
- [ ] Test mapper transformations
- [ ] Mock repositories and dependencies
- [ ] Target: 90% coverage for use cases

**Test Structure**:
```typescript
describe('[UseCaseName]', () => {
  let useCase: [UseCaseName];
  let mockRepository: jest.Mocked<I[Repository]>;
  let mockLogger: jest.Mocked<ILogger>;

  beforeEach(() => {
    mockRepository = { ... } as jest.Mocked<I[Repository]>;
    mockLogger = { ... } as jest.Mocked<ILogger>;
    useCase = new [UseCaseName](mockRepository, mockLogger);
  });

  it('should orchestrate domain logic successfully', async () => {
    // Arrange
    const entity = createValidEntity();
    mockRepository.getById.mockResolvedValue(entity);

    // Act
    await useCase.execute('id');

    // Assert
    expect(mockRepository.save).toHaveBeenCalledWith(entity);
  });
});
```

**3.3 Run Tests (30 sec)**
```bash
npm test
```
- [ ] All tests pass ✅

**3.4 Compilation (30 sec)**
```bash
npm run compile  # Includes tests
```
- [ ] Compilation succeeds ✅
- [ ] Tests pass ✅

**3.5 Parallel Review (5 min each, run simultaneously)**

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
- Tests present for use cases

Create review file: docs/codereview/clean-arch-guardian-application-review-{YYYY-MM-DD}.md
```

**3.6 Final Approval**
```
@agent-clean-architecture-guardian - Review application layer for final approval.
Provide: APPROVE / CHANGES REQUESTED / REJECT
```

**3.7 Address Review Findings**
- [ ] Fix issues
- [ ] npm run compile ✅

**3.8 Commit**
```bash
git add src/features/[feature]/application/
git commit -m "feat(app): add [feature] use cases and ViewModels

- [UseCase1] orchestrates domain logic
- [UseCase2] handles [scenario]
- [ViewModel] DTO for presentation
- [Mapper] maps domain → ViewModel

Tests:
- [UseCase1].test.ts (90% coverage)
- [Mapper].test.ts

Reviewed-by: typescript-pro, clean-architecture-guardian ✅"
```

---

### Phase 4: Infrastructure Layer

**4.1 Implementation**

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

**4.2 Write Tests (10-15 min, optional)**
- [ ] Test complex query logic in repositories
- [ ] Test DTO → Domain entity transformations
- [ ] Test error handling for API failures
- [ ] Target: 70% coverage for complex logic only

**Note**: Simple repositories with direct pass-through logic don't need tests. Focus on:
- Complex data transformations
- Complex query building
- Error mapping logic

**4.3 Run Tests (30 sec)**
```bash
npm test
```
- [ ] All tests pass ✅

**4.4 Compilation (30 sec)**
```bash
npm run compile  # Includes tests
```
- [ ] Compilation succeeds ✅
- [ ] Tests pass ✅

**4.5 Parallel Review (5 min each)**

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
- Tests present for complex transformations (if applicable)

Create review file: docs/codereview/clean-arch-guardian-infrastructure-review-{YYYY-MM-DD}.md
```

**4.6 Final Approval**
```
@agent-clean-architecture-guardian - Review infrastructure layer for final approval.
```

**4.7 Address Review Findings**
- [ ] Fix issues
- [ ] npm run compile ✅

**4.8 Commit**
```bash
git add src/features/[feature]/infrastructure/
git commit -m "feat(infra): add [feature] repositories

- [Repository] implements I[Repository] interface
- API integration for [feature]
- Logging for API calls

Tests:
- [Repository].test.ts (if complex logic present)

Reviewed-by: typescript-pro, clean-architecture-guardian ✅"
```

---

### Phase 5: Presentation Layer

**5.1 Implementation**

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

**5.2 Write Tests (5-10 min, optional)**
- [ ] Test view render functions (HTML generation)
- [ ] Test complex event handler logic (if any)
- [ ] Target: <50% coverage (manual testing preferred)

**Note**: Presentation layer tests are optional. Prefer manual testing (F5 in VS Code) for UI verification. Only write tests for:
- Complex view rendering logic
- Reusable UI components
- View helpers with business logic (should be refactored to domain)

**5.3 Run Tests (30 sec)**
```bash
npm test
```
- [ ] All tests pass ✅

**5.4 Compilation (30 sec)**
```bash
npm run compile  # Includes tests
```
- [ ] Compilation succeeds ✅
- [ ] Tests pass ✅

**5.5 Parallel Review (5 min each)**

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

**5.6 Final Approval**
```
@agent-clean-architecture-guardian - Review presentation layer for final approval.
```

**5.7 Address Review Findings**
- [ ] Fix issues
- [ ] npm run compile ✅

**5.8 Commit**
```bash
git add src/features/[feature]/presentation/
git commit -m "feat(pres): add [feature] panel

- [Panel] uses use cases for all logic
- HTML extracted to view files
- Event handlers call use cases only

Tests:
- View tests (if applicable)

Reviewed-by: typescript-pro, clean-architecture-guardian ✅"
```

---

### Phase 6: Integration & Registration

**CRITICAL: This phase is REQUIRED for all panels/commands** - Do not skip!

**6.1 Update package.json (REQUIRED for panels/commands)**
```json
// package.json - "contributes.commands" section
{
  "command": "power-platform-dev-suite.[feature]",
  "title": "[Feature Name]",
  "category": "Power Platform Developer Suite"
},
{
  "command": "power-platform-dev-suite.[feature]PickEnvironment",
  "title": "[Feature Name]: Choose Environment",
  "category": "Power Platform Developer Suite"
}
```

Checklist:
- [ ] Commands added to `"contributes.commands"` array
- [ ] Activation events added to `"activationEvents"` (if needed)
- [ ] Command IDs match extension.ts registration (exact string match)
- [ ] npm run compile ✅

**6.2 Register in extension.ts (REQUIRED for panels/commands)**

Create feature initializer function:
```typescript
// src/extension.ts - Add before activate()

async function initialize[Feature](
    context: vscode.ExtensionContext,
    authService: MsalAuthenticationService,
    environmentRepository: IEnvironmentRepository,
    logger: ILogger,
    initialEnvironmentId?: string
): Promise<void> {
    // Lazy imports
    const { DataverseApiService } = await import('./shared/infrastructure/services/DataverseApiService.js');
    const { [Repository] } = await import('./features/[feature]/infrastructure/repositories/[Repository].js');
    const { [UseCase] } = await import('./features/[feature]/application/useCases/[UseCase].js');
    const { [Panel] } = await import('./features/[feature]/presentation/panels/[Panel].js');

    // Setup dependencies
    const getEnvironments = createGetEnvironments(environmentRepository);
    const getEnvironmentById = createGetEnvironmentById(environmentRepository);
    const { getAccessToken, getDataverseUrl } = createDataverseApiServiceFactory(authService, environmentRepository);
    const dataverseApiService = new DataverseApiService(getAccessToken, getDataverseUrl, logger);

    // Create repositories and use cases
    const repository = new [Repository](dataverseApiService, logger);
    const useCase = new [UseCase](repository, logger);

    // Show panel
    await [Panel].createOrShow(
        context.extensionUri,
        getEnvironments,
        getEnvironmentById,
        useCase,
        logger,
        initialEnvironmentId
    );
}
```

Register commands in activate():
```typescript
// src/extension.ts - Inside activate() function

const [feature]Command = vscode.commands.registerCommand(
    'power-platform-dev-suite.[feature]',
    async (environmentItem?: { envId: string }) => {
        try {
            let initialEnvironmentId: string | undefined;
            if (environmentItem?.envId) {
                initialEnvironmentId = environmentItem.envId;
            }
            void initialize[Feature](context, authService, environmentRepository, logger, initialEnvironmentId);
        } catch (error) {
            vscode.window.showErrorMessage(
                `Failed to open [Feature]: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }
);

const [feature]PickEnvironmentCommand = vscode.commands.registerCommand(
    'power-platform-dev-suite.[feature]PickEnvironment',
    async () => {
        try {
            const environments = await environmentRepository.getAll();

            if (environments.length === 0) {
                vscode.window.showErrorMessage('No environments configured. Please add an environment first.');
                return;
            }

            const quickPickItems = environments.map(env => ({
                label: env.getName().getValue(),
                description: env.getDataverseUrl().getValue(),
                envId: env.getId().getValue()
            }));

            const selected = await vscode.window.showQuickPick(quickPickItems, {
                placeHolder: 'Select an environment to view [Feature]'
            });

            if (selected) {
                void initialize[Feature](context, authService, environmentRepository, logger, selected.envId);
            }
        } catch (error) {
            vscode.window.showErrorMessage(
                `Failed to open [Feature]: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }
);

// Add to subscriptions
context.subscriptions.push(
    [feature]Command,
    [feature]PickEnvironmentCommand
    // ... other commands
);
```

Checklist:
- [ ] Feature initializer function created
- [ ] Command handlers registered (both direct and pick-environment)
- [ ] Commands added to context.subscriptions
- [ ] Error handling present in command handlers
- [ ] npm run compile ✅

**6.3 Manual Testing (CRITICAL - verify registration)**
- [ ] Open VS Code extension (F5)
- [ ] Open Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
- [ ] Type feature name
- [ ] **VERIFY: Command appears in palette** ⭐ CRITICAL CHECK
- [ ] Invoke command, verify panel opens
- [ ] Test happy path
- [ ] Test error cases
- [ ] Verify logging in OutputChannel
- [ ] Test edge cases
- [ ] Test "Choose Environment" command variant

**6.4 Commit Registration**
```bash
git add package.json src/extension.ts
git commit -m "feat: register [feature] commands

- Add commands to package.json
- Register command handlers in extension.ts
- Initialize[Feature]() function with lazy loading
- Both direct and pick-environment commands

Tested: Command appears in palette ✅
Reviewed-by: Manual testing ✅"
```

---

### Phase 7: Documentation

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

**Use when**: 1-2 vertical slices, simple functionality

**Skip design document for simple features** - No need for formal design doc, just implement directly.

### Phase 1: Quick Design
1. Sketch domain entities on paper
2. Identify use case orchestration
3. Optional: Invoke typescript-pro to review type contracts if complex types

### Phase 2: Domain + Application
1. Implement domain entities + use cases
2. Write tests for entities and use cases
3. npm test ✅
4. npm run compile ✅
5. Parallel review: typescript-pro + clean-architecture-guardian
6. code-reviewer final approval
7. Commit with tests

### Phase 3: Infrastructure + Presentation
1. Implement repositories + panels
2. Write tests for complex repository logic (optional)
3. npm test ✅
4. npm run compile ✅
5. Parallel review: typescript-pro + clean-architecture-guardian
6. code-reviewer final approval
7. Commit with tests

### Phase 4: Manual Testing
1. F5 in VS Code
2. Test feature end-to-end
3. Verify logging

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
- [ ] All tests pass (npm test)
- [ ] Domain entities have tests (100% coverage target)
- [ ] Use cases have tests (90% coverage target)
- [ ] All review agents approved (APPROVE status)
- [ ] Manual testing passed
- [ ] Domain layer has zero external dependencies
- [ ] Use cases have no business logic
- [ ] Panels have no business logic
- [ ] Logging only at boundaries (not in domain)
- [ ] 4-5 commits (one per layer) for complex features
- [ ] Each commit includes test file paths
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
