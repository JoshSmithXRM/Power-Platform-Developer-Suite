# Clean Architecture Guardian: Hybrid Webview Proposal Review

> **Reviewer:** Clean Architecture Guardian (Claude Code)
> **Date:** 2025-10-31
> **Proposal:** Hybrid Webview Architecture Proposal
> **Status:** DETAILED ANALYSIS

---

## Executive Summary

### Overall Assessment: CONDITIONALLY APPROVED WITH CRITICAL MODIFICATIONS

The hybrid proposal demonstrates a solid understanding of Clean Architecture principles and makes several correct architectural decisions. However, it contains **critical violations** that must be addressed before implementation.

**Verdict Summary:**
- ✅ **APPROVED:** ViewModels in Application Layer
- ✅ **APPROVED:** Component-View separation pattern
- ✅ **APPROVED:** Explicit Behavior layer
- ⚠️ **REQUIRES MODIFICATION:** Shared components directory structure
- ⚠️ **REQUIRES MODIFICATION:** View implementation (static classes vs pure functions)
- ⚠️ **REQUIRES CLARIFICATION:** Panel responsibilities and enforcement mechanisms
- ❌ **REJECTED:** Current shared component location creates coupling risk

**Overall Score:** 7/10 (Good architectural foundation, needs refinement)

---

## 1. Layer Separation Analysis

### 1.1 Domain Layer ✅ COMPLIANT

**Status:** Fully Compliant

**Analysis:**
The proposal correctly excludes all presentation concerns from the domain layer. The proposal does not introduce any domain layer dependencies on outer layers.

**Evidence:**
- No ViewModels in domain (correct)
- No HTML generation in domain (correct)
- No mention of presentation concerns in domain (correct)

**Recommendation:** Continue this approach. Domain layer isolation is perfect.

---

### 1.2 Application Layer ✅ COMPLIANT

**Status:** Fully Compliant

**Analysis:**
The proposal correctly places ViewModels in the Application layer (`features/{feature}/application/viewModels/`). This is the **correct interpretation** of Clean Architecture.

**Rationale Supporting This Decision:**

1. **ViewModels are DTOs** - Data Transfer Objects that define the contract between Application and Presentation layers
2. **Dependency Direction** - Presentation depends on Application, not vice versa
3. **Application Layer Owns Orchestration** - ViewModels are part of orchestrating data flow to presentation
4. **Testability** - ViewModels can be tested without UI dependencies

**Evidence from Proposal:**
```typescript
// features/environmentSetup/application/viewModels/EnvironmentSetupViewModel.ts
export interface EnvironmentSetupViewModel {
    name: string;
    dataverseUrl: string;
    // ... presentation-ready data
}
```

**Counter-Argument Addressed:**
Some may argue ViewModels belong in Presentation because they have "View" in the name. This is a **naming misconception**. ViewModels are presentation DTOs defined by the Application layer as a contract. The Presentation layer **consumes** them, but does not **define** them.

**From ARCHITECTURE_GUIDE.md:**
```
### 🎮 Application Layer
**Contains:**
- DTOs/ViewModels - Data transfer objects for presentation
```

This confirms the proposal is correct.

**Recommendation:** ✅ **APPROVE** - ViewModels in Application layer is architecturally sound.

---

### 1.3 Presentation Layer ⚠️ REQUIRES MODIFICATION

**Status:** Mostly Compliant with Critical Issues

#### Issue 1: View Static Classes vs Pure Functions

**Problem:**
The proposal uses static classes for Views:

```typescript
export class FormFieldView {
    static render(props: FormFieldViewProps): string {
        // ...
    }

    private static escapeHtml(text: string): string {
        // ...
    }
}
```

**Analysis:**
While this works, it creates an **unnecessary abstraction**. Static classes with only static methods are essentially namespaces in disguise.

**Recommendation:**
Use **pure functions** instead of static classes:

```typescript
// ✅ BETTER - Pure function approach
export function renderFormField(props: FormFieldViewProps): string {
    const requiredAttr = props.required ? 'required' : '';
    const valueAttr = props.value ? `value="${escapeHtml(props.value)}"` : '';

    return `
        <div class="form-group">
            <label for="${props.id}">${escapeHtml(props.label)}${props.required ? ' *' : ''}</label>
            <input
                type="${props.type}"
                id="${props.id}"
                name="${props.id}"
                placeholder="${escapeHtml(props.placeholder || '')}"
                ${valueAttr}
                ${requiredAttr}
            >
            ${props.helpText ? `<span class="help-text">${escapeHtml(props.helpText)}</span>` : ''}
        </div>
    `;
}

// Shared utility functions
function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
```

**Rationale:**
1. **Simpler** - Functions are simpler than classes
2. **More functional** - Aligns with "pure functions" principle
3. **Tree-shakeable** - Better for bundling (if ever needed)
4. **Consistent** - Matches React/Vue/Svelte function component patterns

**However, the static class approach is NOT a violation** - it's just not optimal.

**Verdict:** ⚠️ **ACCEPTABLE AS-IS** but recommend refactoring to pure functions for simplicity.

---

#### Issue 2: Component Responsibilities - State Management

**Analysis:**
The proposal has Components manage state and delegate HTML to Views:

```typescript
export class FormFieldComponent extends BaseComponent {
    constructor(private config: FormFieldComponentConfig) {
        super();
    }

    render(): string {
        return FormFieldView.render(this.config);
    }

    getValue(): string {
        return this.config.value || '';
    }

    setValue(value: string): void {
        this.config.value = value;
    }
}
```

**Question:** Is this the right abstraction?

**Analysis:**

**Pros:**
- ✅ Clear separation between state (Component) and rendering (View)
- ✅ Encapsulates component behavior
- ✅ Provides API for interaction

**Cons:**
- ⚠️ Adds abstraction layer that may not be necessary for simple components
- ⚠️ Component instances need lifecycle management
- ⚠️ Unclear how Components integrate with Panels

**Recommendation:**
For **simple form fields**, the Component abstraction may be overkill. For **complex components** (DataTable, FilterPanel), it makes sense.

**Proposed Solution:**
Distinguish between:

1. **Stateless View Functions** - For simple UI elements (buttons, form fields, badges)
2. **Stateful Components** - For complex UI with behavior (DataTable, TreeView, SplitPanel)

```typescript
// ✅ Simple elements: Just functions
export function renderButton(props: ButtonProps): string {
    return `<button class="button ${props.variant}">${escapeHtml(props.text)}</button>`;
}

// ✅ Complex components: Component class + View
export class DataTableComponent<TRow> extends BaseComponent {
    private data: TRow[] = [];
    private sortConfig: SortConfig[] = [];

    render(): string {
        return renderDataTable(this.config, {
            data: this.data,
            sortConfig: this.sortConfig
        });
    }

    setData(data: TRow[]): void {
        this.data = data;
        this.notifyUpdate();
    }

    sort(column: string, direction: 'asc' | 'desc'): void {
        this.sortConfig = [{ column, direction }];
        this.data = this.sortData(this.data);
        this.notifyUpdate();
    }

    private sortData(data: TRow[]): TRow[] {
        // Sorting logic
        return data;
    }
}
```

**Verdict:** ⚠️ **ACCEPTABLE** but recommend distinguishing between simple view functions and stateful components.

---

### 1.4 Panel Responsibilities ⚠️ REQUIRES CLARIFICATION

**Proposal States:**
```
### 4. Presentation Layer: Panels (Orchestration)

**Responsibility:** Orchestrate use cases, map to ViewModels, compose Views
```

**Analysis:**

**Problem 1: "Map to ViewModels"**

The proposal says Panels "map to ViewModels". This is **INCORRECT**.

**Panels should NOT map domain entities to ViewModels.** This is the responsibility of the **Application Layer** (Mappers).

**Current EnvironmentSetupPanel (from codebase):**
```typescript
private async loadEnvironment(environmentId: string): Promise<void> {
    try {
        // ✅ GOOD - Delegate to use case
        const viewModel = await this.loadEnvironmentByIdUseCase.execute({ environmentId });

        // ✅ GOOD - Send ViewModel to webview
        this.panel.webview.postMessage({
            command: 'environment-loaded',
            data: viewModel
        });
    } catch (error) {
        this.handleError(error as Error, 'Failed to load environment');
    }
}
```

This is **CORRECT**. The Panel receives a ViewModel from the Use Case (which internally uses a Mapper). The Panel does NOT perform mapping.

**Proposal Example (from line 314):**
```typescript
protected async initialize(): Promise<void> {
    // Load data via use case
    const environment = await this.loadEnvironmentUseCase.execute({ id: this.environmentId });

    // Map to ViewModel  ← ❌ WRONG - Panel should NOT map
    const viewModel = this.mapper.toViewModel(environment);

    // Generate HTML
    const html = EnvironmentSetupView.render(viewModel);

    // Set webview HTML
    this.panel.webview.html = html;
}
```

**This is a violation.** The Panel should receive the ViewModel from the Use Case, NOT map it.

**Correct Pattern:**

```typescript
// ✅ GOOD - Use Case returns ViewModel
export class LoadEnvironmentByIdUseCase {
    constructor(
        private repository: IEnvironmentRepository,
        private mapper: EnvironmentViewModelMapper
    ) {}

    async execute(request: { environmentId: string }): Promise<EnvironmentSetupViewModel> {
        // 1. Get domain entity
        const environment = await this.repository.getById(request.environmentId);

        // 2. Map to ViewModel (in Application layer)
        return this.mapper.toViewModel(environment);
    }
}

// ✅ GOOD - Panel receives ViewModel
protected async initialize(): Promise<void> {
    // Delegate to use case - receive ViewModel directly
    const viewModel = await this.loadEnvironmentUseCase.execute({
        environmentId: this.environmentId
    });

    // Generate HTML
    const html = EnvironmentSetupView.render(viewModel);

    // Set webview HTML
    this.panel.webview.html = html;
}
```

**From CLAUDE.md:**
```
9. **Business logic in panels** - Panels call use cases, no logic
```

Mapping is orchestration logic that belongs in the Application layer, not Presentation.

**Verdict:** ❌ **REJECTED** - Remove mapping responsibility from Panels. Use Cases must return ViewModels.

---

**Problem 2: Panel Composing Views**

The proposal has Panels call Views directly:

```typescript
protected getHtmlContent(): string {
    // Panel composes Views
    return EnvironmentSetupView.render(viewModel);
}
```

**Analysis:**

This is **ACCEPTABLE** for simple panels, but the proposal also mentions PanelComposer:

```typescript
protected getHtmlContent(): string {
    return PanelComposer.compose(
        [this.actionBar, this.filterPanel, this.pluginGrid],
        this.getCommonWebviewResources(),
        'Plugin Registration'
    );
}
```

**Question:** When should Panels use Views directly vs PanelComposer?

**Recommendation:**

1. **Simple Panels (single form):** Call View directly
2. **Complex Panels (multiple components):** Use PanelComposer

**Verdict:** ✅ **ACCEPTABLE** - Clarify when to use each approach.

---

## 2. Dependency Flow Validation

### 2.1 Dependency Direction ✅ MOSTLY CORRECT

**Expected Flow:**
```
Presentation → Application → Domain
```

**Proposal Flow:**
```
Panel (Presentation)
  ↓ depends on
Use Case (Application)
  ↓ returns
ViewModel (Application)
  ↓ consumed by
View (Presentation)
  ↓ renders
HTML
```

**Analysis:** This is correct EXCEPT for the mapper injection into Panel (see section 1.4).

**From Proposal (line 302):**
```typescript
constructor(
    extensionUri: vscode.Uri,
    private loadEnvironmentUseCase: LoadEnvironmentUseCase,
    private mapper: EnvironmentViewModelMapper  // ❌ WRONG - Panel should not have mapper
) {
    super(extensionUri);
}
```

**Verdict:** ⚠️ **REQUIRES MODIFICATION** - Remove mapper from Panel constructors.

---

### 2.2 ViewModels Boundary ✅ CORRECT

**Analysis:**
The proposal correctly has ViewModels act as the boundary between Application and Presentation layers.

**Evidence:**
- Views consume ViewModels (not domain entities) ✅
- ViewModels defined in Application layer ✅
- Presentation layer has no knowledge of domain entities ✅

**Verdict:** ✅ **APPROVED**

---

### 2.3 Circular Dependencies ✅ NONE DETECTED

**Analysis:**
No circular dependencies detected in the proposal. The dependency graph flows correctly inward.

**Verdict:** ✅ **APPROVED**

---

## 3. Component/View/Behavior Pattern Analysis

### 3.1 Component/View Split ⚠️ NEEDS REFINEMENT

**Proposal:**
- Component classes manage state/lifecycle
- Pure View functions generate HTML
- Behaviors handle client-side JS

**Analysis:**

**The Good:**
- ✅ Clear separation of concerns
- ✅ Views are testable (pure functions)
- ✅ Components encapsulate state

**The Questionable:**
- ⚠️ When to use Component vs just View function?
- ⚠️ Component lifecycle not clearly defined
- ⚠️ How do Components integrate with Event Bridge?

**Recommendation:**

**Use Case 1: Simple UI Elements (no state)**
```typescript
// Just a pure function
export function renderButton(props: ButtonProps): string {
    return `<button class="${props.variant}">${props.text}</button>`;
}
```

**Use Case 2: Stateful Components**
```typescript
// Component manages state
export class DataTableComponent<TRow> extends BaseComponent {
    private data: TRow[] = [];

    render(): string {
        return renderDataTable(this.config, { data: this.data });
    }

    setData(data: TRow[]): void {
        this.data = data;
        this.notifyUpdate(); // Event Bridge
    }
}

// View is pure function
export function renderDataTable<TRow>(
    config: DataTableConfig<TRow>,
    state: { data: TRow[] }
): string {
    // Pure rendering
}
```

**Verdict:** ⚠️ **REQUIRES REFINEMENT** - Clarify when Component abstraction is needed vs pure View functions.

---

### 3.2 View Pure Functions ✅ ARCHITECTURALLY SOUND

**Analysis:**

**Pros:**
- ✅ Testable (input → output)
- ✅ No side effects
- ✅ Easy to reason about
- ✅ Aligns with functional programming principles

**Cons:**
- ⚠️ HTML in TypeScript strings (no syntax highlighting)
- ⚠️ No template pre-compilation
- ⚠️ Manual HTML escaping required

**Alternative Considered:**
- Separate `.html` template files with Handlebars/Mustache

**Why Pure Functions Are Better:**
1. **Type Safety** - TypeScript validates props at compile time
2. **No Parse Step** - Templates run directly
3. **Colocation** - View logic near View code
4. **Refactoring** - Easier to extract/inline

**Verdict:** ✅ **APPROVED** - Pure View functions are the right choice for this architecture.

---

### 3.3 Behavior Layer (Client-Side JS) ✅ CORRECT

**Analysis:**

The proposal correctly isolates client-side JavaScript to Behaviors:

```javascript
(function() {
    const vscode = acquireVsCodeApi();

    // ✅ GOOD - Just message passing, no logic
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        vscode.postMessage({
            command: 'save',
            data: data
        });
    });
})();
```

**Key Characteristics:**
- ✅ No business logic
- ✅ Just DOM event handling + message passing
- ✅ Receives updates from Extension Host
- ✅ IIFE to avoid global scope pollution

**Verdict:** ✅ **APPROVED** - Behavior layer is correctly designed.

---

## 4. Shared Components Strategy

### 4.1 Shared Component Location ❌ CRITICAL VIOLATION

**Proposal:**
```
src/
├── core/
│   └── presentation/
│       ├── components/           # Shared component classes
│       │   ├── FormFieldComponent.ts
│       │   ├── ButtonComponent.ts
│       │   └── SelectComponent.ts
│       │
│       └── views/                # Shared pure view functions
│           ├── FormFieldView.ts
│           ├── ButtonView.ts
│           └── SelectView.ts
```

**Problem:** This creates a **SHARED PRESENTATION LAYER** across all features, which violates **feature independence**.

**Why This Is a Violation:**

1. **Feature Coupling Risk**
   - Features now depend on `core/presentation/components`
   - Changes to shared components affect ALL features
   - Testing one feature requires compiling shared components

2. **Violates Feature-First Organization**
   - From ARCHITECTURE_GUIDE.md: "feature-first organization"
   - Features should be self-contained modules
   - Shared UI components create horizontal coupling

3. **Mixed Concerns**
   - `core/` should contain domain-agnostic infrastructure
   - Presentation components are NOT domain-agnostic
   - FormFieldComponent is presentation-specific

**Correct Architecture:**

**Option 1: Feature-Scoped Duplication (Preferred for <3 uses)**
```
src/features/environmentSetup/presentation/
├── views/
│   ├── FormFieldView.ts     # Feature owns its views
│   └── ButtonView.ts

src/features/pluginRegistration/presentation/
├── views/
│   ├── FormFieldView.ts     # Duplicated (intentionally)
│   └── ButtonView.ts
```

**Rationale:**
- From CLAUDE.md: "Duplicate code 3+ times - Stop at 2nd copy. Create abstraction"
- **Two instances of duplication is ACCEPTABLE**
- Only create shared abstraction after **third use**

**Option 2: UI Component Library (After 3+ uses)**
```
src/infrastructure/ui/
├── components/
│   ├── DataTableComponent.ts    # Generic, reusable
│   ├── ActionBarComponent.ts
│   └── README.md                 # "When to use shared vs feature components"
│
└── views/
    ├── renderDataTable.ts        # Pure functions
    └── renderActionBar.ts
```

**Rationale:**
- Treat as **Infrastructure** (external dependency)
- Features depend on infrastructure (allowed)
- Clear boundary: infrastructure is stable, features change

**Option 3: Web Component Standard (Future-Proofing)**
```
src/infrastructure/ui/webComponents/
├── pp-data-table/
│   ├── PPDataTable.ts           # Web Component
│   ├── pp-data-table.css
│   └── pp-data-table.test.ts
│
└── pp-action-bar/
    ├── PPActionBar.ts
    └── pp-action-bar.css
```

**Rationale:**
- Standard web component API
- Framework-agnostic
- Can be published as separate package

**Verdict:** ❌ **REJECTED** - Move shared components to `src/infrastructure/ui/` OR allow feature duplication until 3rd use.

---

### 4.2 Preventing Feature Coupling ⚠️ INSUFFICIENT ENFORCEMENT

**Proposal Recommendation:**
```typescript
// Generic component with configuration callbacks
export class DataTableComponent<TRow = DataTableRow> {
    constructor(config: DataTableConfig<TRow>) { ... }
}
```

**Analysis:**

**The Good:**
- ✅ Generic types prevent ViewModel coupling
- ✅ Configuration callbacks allow feature customization
- ✅ Dependency inversion (component depends on config interface)

**The Concern:**
- ⚠️ No enforcement mechanism
- ⚠️ Developers could import feature ViewModels into shared components
- ⚠️ No compile-time check for feature dependencies

**Recommendation:**

**Add ESLint Rule:**
```javascript
// .eslintrc.js
module.exports = {
    rules: {
        'no-restricted-imports': ['error', {
            patterns: [{
                group: ['**/features/**'],
                message: 'Shared components (core/infrastructure) cannot import from features/'
            }]
        }]
    }
};
```

**Add TypeScript Path Constraints:**
```json
// tsconfig.json
{
    "compilerOptions": {
        "paths": {
            "@core/*": ["src/core/*"],
            "@features/*": ["src/features/*"]
        }
    }
}
```

Then configure ESLint to enforce:
- `@core/*` can NEVER import from `@features/*`
- `@features/*` CAN import from `@core/*`

**Verdict:** ⚠️ **REQUIRES MODIFICATION** - Add enforcement mechanisms (ESLint, tsconfig paths).

---

## 5. Business Logic Prevention

### 5.1 Architecture Enforcement ⚠️ INSUFFICIENT

**Proposal Approach:**
- ViewModels pre-compute display values
- Views are pure functions
- Behaviors just pass messages

**Analysis:**

**The Good:**
- ✅ Clear guidelines established
- ✅ Examples show correct patterns

**The Problem:**
- ⚠️ No **enforcement** mechanisms
- ⚠️ Relies on developer discipline
- ⚠️ Code reviews are the only safeguard

**Recommendation:**

**Enforcement Mechanism 1: TypeScript Branded Types**

```typescript
// Prevent raw domain entities in Views
export type DomainEntity = { __brand: 'DomainEntity' };
export type PresentationDTO = { __brand: 'PresentationDTO' };

// Views can only accept PresentationDTOs
export function renderPluginGrid(
    plugins: PresentationDTO[]  // Compile error if Domain entity passed
): string {
    // ...
}
```

**Enforcement Mechanism 2: Linting**

```javascript
// ESLint custom rule
module.exports = {
    rules: {
        'no-domain-in-presentation': {
            create(context) {
                return {
                    ImportDeclaration(node) {
                        const filename = context.getFilename();
                        const importPath = node.source.value;

                        // If in presentation/ folder
                        if (filename.includes('/presentation/')) {
                            // And importing from domain/
                            if (importPath.includes('/domain/')) {
                                context.report({
                                    node,
                                    message: 'Presentation layer cannot import from domain layer'
                                });
                            }
                        }
                    }
                };
            }
        }
    }
};
```

**Enforcement Mechanism 3: Unit Test Requirements**

```typescript
// Require tests that Views are pure functions
describe('PluginGridView', () => {
    it('should be a pure function (same input = same output)', () => {
        const props = { /* ... */ };

        const output1 = renderPluginGrid(props);
        const output2 = renderPluginGrid(props);

        expect(output1).toBe(output2); // Must be identical
    });

    it('should not perform calculations', () => {
        // Test that View doesn't compute anything
        // All computed values come from ViewModel
    });
});
```

**Verdict:** ⚠️ **REQUIRES MODIFICATION** - Add enforcement mechanisms beyond code review.

---

### 5.2 ViewModel Richness ✅ CORRECT

**Proposal:**
```typescript
export interface EnvironmentSetupViewModel {
    name: string;
    dataverseUrl: string;
    authenticationMethod: string;
    // Pre-computed display values
}
```

**Analysis:**

The proposal correctly advocates for **rich ViewModels** with pre-computed display values.

**Example from Proposal:**
```typescript
export interface FormFieldViewModel {
    id: string;
    label: string;
    type: string;
    value: string;
    placeholder: string;
    helpText: string;
    required: boolean;
}
```

This is a **presentation-ready DTO**. The View can render it directly without logic.

**Verdict:** ✅ **APPROVED** - ViewModels are correctly designed.

---

## 6. Anti-Patterns Detected

### 6.1 Panel Mapping Responsibility ❌ VIOLATION

**From Proposal (line 320):**
```typescript
// Map to ViewModel
const viewModel = this.mapper.toViewModel(environment);
```

**Violation:** Panels should NOT have mappers injected or perform mapping.

**Fix:** Use Cases return ViewModels.

---

### 6.2 Static View Classes ⚠️ SUBOPTIMAL

**From Proposal (line 217):**
```typescript
export class FormFieldView {
    static render(props: FormFieldViewProps): string {
        // ...
    }
}
```

**Not a violation, but suboptimal.** Use pure functions instead.

---

### 6.3 Shared Components in core/presentation ❌ VIOLATION

**From Proposal (line 93):**
```
src/core/presentation/components/
```

**Violation:** Creates horizontal coupling between features.

**Fix:** Move to `src/infrastructure/ui/` or allow feature duplication.

---

## 7. Recommended Changes

### Critical (Must Fix Before Implementation)

1. **Remove Mapper from Panels**
   - Use Cases must return ViewModels
   - Panels receive ViewModels, never map

2. **Move Shared Components to Infrastructure**
   ```
   src/infrastructure/ui/
   ├── components/
   ├── views/
   └── README.md
   ```

3. **Add Enforcement Mechanisms**
   - ESLint rule: `no-restricted-imports`
   - TypeScript path constraints
   - Custom linting for domain in presentation

### Important (Should Fix)

4. **Refactor Static Classes to Pure Functions**
   ```typescript
   // Instead of:
   export class FormFieldView {
       static render() { }
   }

   // Use:
   export function renderFormField(props: FormFieldViewProps): string { }
   ```

5. **Clarify Component vs View Function Usage**
   - Document when to use Component class (stateful)
   - Document when to use View function (stateless)

6. **Add Architectural Tests**
   ```typescript
   describe('Architecture', () => {
       it('should not have domain imports in presentation', () => {
           // Test imports with dependency-cruiser or similar
       });
   });
   ```

### Nice to Have

7. **Add ADR for Shared Component Strategy**
   - Document decision rationale
   - Define when to create shared vs feature components

8. **Create Component Library Documentation**
   - When to use each component
   - Configuration examples
   - Customization patterns

---

## 8. Enforcement Mechanisms

### 8.1 Compile-Time Enforcement

**TypeScript Configuration:**
```json
// tsconfig.json
{
    "compilerOptions": {
        "strict": true,
        "noImplicitAny": true,
        "strictNullChecks": true,
        "paths": {
            "@domain/*": ["src/*/domain/*"],
            "@application/*": ["src/*/application/*"],
            "@presentation/*": ["src/*/presentation/*"],
            "@infrastructure/*": ["src/infrastructure/*"]
        }
    }
}
```

**ESLint Rules:**
```javascript
// .eslintrc.js
module.exports = {
    rules: {
        'no-restricted-imports': ['error', {
            patterns: [
                {
                    group: ['**/domain/**'],
                    importNames: ['*'],
                    message: 'Presentation layer cannot import domain entities directly'
                },
                {
                    group: ['**/features/**'],
                    importNames: ['*'],
                    message: 'Infrastructure cannot import from features'
                }
            ]
        }]
    },
    overrides: [
        {
            files: ['**/presentation/**'],
            rules: {
                'no-restricted-imports': ['error', {
                    patterns: ['**/domain/**']
                }]
            }
        },
        {
            files: ['**/infrastructure/**'],
            rules: {
                'no-restricted-imports': ['error', {
                    patterns: ['**/features/**']
                }]
            }
        }
    ]
};
```

---

### 8.2 Runtime Enforcement

**Unit Test Requirements:**

Every View function MUST have:
1. **Pure Function Test** - Same input = same output
2. **No Logic Test** - No calculations in View
3. **HTML Escaping Test** - XSS prevention

```typescript
// test/presentation/views/FormFieldView.test.ts
describe('renderFormField', () => {
    it('should be pure (same input = same output)', () => {
        const props: FormFieldViewProps = {
            id: 'name',
            label: 'Name',
            type: 'text',
            required: true
        };

        const output1 = renderFormField(props);
        const output2 = renderFormField(props);

        expect(output1).toBe(output2);
    });

    it('should escape HTML in user input', () => {
        const props: FormFieldViewProps = {
            id: 'name',
            label: '<script>alert("xss")</script>',
            type: 'text'
        };

        const html = renderFormField(props);

        expect(html).not.toContain('<script>');
        expect(html).toContain('&lt;script&gt;');
    });

    it('should not perform business logic', () => {
        // This test ensures View doesn't calculate anything
        // All display values must come from ViewModel
        const props: FormFieldViewProps = {
            id: 'name',
            label: 'Name',
            type: 'text',
            required: true  // Already computed by ViewModel
        };

        const html = renderFormField(props);

        // View just renders what it receives
        expect(html).toContain('required');
        expect(html).toContain('Name *');
    });
});
```

---

### 8.3 Code Review Checklist

**For Every PR Touching Presentation Layer:**

- [ ] Views are pure functions (no state, no side effects)
- [ ] Views do not import domain entities
- [ ] ViewModels come from Application layer
- [ ] Panels do not perform mapping
- [ ] Shared components do not depend on feature ViewModels
- [ ] Business logic is in Domain/Application, not Presentation
- [ ] HTML is properly escaped for XSS prevention
- [ ] Tests verify Views are pure functions

---

## 9. Architectural Decision Records

### Recommended ADRs to Create

1. **ADR: ViewModels in Application Layer**
   - **Decision:** ViewModels live in `application/viewModels/`
   - **Rationale:** Application layer owns presentation contracts
   - **Status:** Approved

2. **ADR: Pure View Functions vs Static Classes**
   - **Decision:** Use pure functions for Views
   - **Rationale:** Simpler, more functional, easier to test
   - **Status:** Recommended

3. **ADR: Shared UI Components Location**
   - **Decision:** Shared components live in `infrastructure/ui/`
   - **Rationale:** Prevents feature coupling
   - **Status:** Required

4. **ADR: Use Cases Return ViewModels**
   - **Decision:** Use Cases perform domain → ViewModel mapping
   - **Rationale:** Keeps mapping out of Presentation layer
   - **Status:** Required

5. **ADR: Component Abstraction Strategy**
   - **Decision:** Component class for stateful, View function for stateless
   - **Rationale:** Right abstraction for the problem
   - **Status:** Recommended

---

## 10. Final Recommendation

### Should We Proceed?

**Yes, with modifications.**

The hybrid proposal demonstrates a **solid understanding** of Clean Architecture and makes **correct decisions** on critical points (ViewModels in Application, Component-View-Behavior separation).

However, it contains **critical violations** that must be addressed:

1. ❌ Panels performing mapping (must fix)
2. ❌ Shared components in `core/presentation/` (must fix)
3. ⚠️ Insufficient enforcement mechanisms (should fix)

---

### Approval Conditions

**✅ APPROVED** if the following changes are made:

#### Must Fix (Before Implementation)
1. **Remove mapper injection from Panels**
   - Use Cases return ViewModels
   - Update all examples in proposal

2. **Move shared components to infrastructure**
   ```
   src/infrastructure/ui/
   ├── components/
   ├── views/
   └── README.md
   ```

3. **Add ESLint enforcement rules**
   - Prevent domain imports in presentation
   - Prevent feature imports in infrastructure

#### Should Fix (Before Wider Adoption)
4. **Refactor static classes to pure functions**
   - Simpler, more functional
   - Update proposal examples

5. **Add architectural tests**
   - Verify no domain in presentation
   - Verify dependency direction

6. **Document component abstraction strategy**
   - When to use Component class
   - When to use View function

---

### Modified Proposal Summary

**✅ APPROVED:**
- ViewModels in Application Layer
- Component-View-Behavior pattern
- Pure View functions (conceptually)
- Explicit Behavior layer
- Type-safe ViewModels
- Rich ViewModels (pre-computed display values)

**⚠️ MODIFY:**
- Remove mapping from Panels → Use Cases return ViewModels
- Move shared components → `src/infrastructure/ui/`
- Static classes → Pure functions
- Add enforcement mechanisms → ESLint + tests

**❌ REJECTED AS-IS:**
- Panel mapping responsibility
- Shared components in `core/presentation/`

---

## 11. Scorecard

| Criterion | Score | Notes |
|-----------|-------|-------|
| **Layer Separation** | 8/10 | Good, but Panels have mapping |
| **Dependency Direction** | 7/10 | Correct except mapper in Panel |
| **ViewModels Location** | 10/10 | Correct - Application layer |
| **Component-View Pattern** | 8/10 | Good, prefer pure functions |
| **Behavior Isolation** | 10/10 | Perfect |
| **Shared Component Strategy** | 5/10 | Wrong location, coupling risk |
| **Enforcement Mechanisms** | 4/10 | Insufficient, relies on discipline |
| **Business Logic Prevention** | 8/10 | Good guidelines, weak enforcement |
| **Anti-Pattern Avoidance** | 7/10 | Some violations present |
| **Overall Architecture** | 7.5/10 | Good foundation, needs refinement |

---

## 12. Conclusion

The hybrid proposal is **architecturally sound** with critical modifications needed.

**Key Strengths:**
- ✅ Correct understanding of layer responsibilities
- ✅ ViewModels in Application layer (correct)
- ✅ Component-View-Behavior separation (good)
- ✅ Pure View functions (testable)
- ✅ Behavior layer isolation (correct)

**Critical Issues:**
- ❌ Panels performing mapping (violates Application layer responsibility)
- ❌ Shared components in `core/presentation/` (creates feature coupling)
- ⚠️ Insufficient enforcement mechanisms

**Recommendation:**
**CONDITIONALLY APPROVE** with mandatory fixes to:
1. Remove mapping from Panels
2. Move shared components to infrastructure
3. Add enforcement mechanisms (ESLint, tests)

**After fixes, this architecture will be:**
- ✅ Clean Architecture compliant
- ✅ Scalable to complex UIs
- ✅ Testable and maintainable
- ✅ Type-safe throughout
- ✅ Feature-independent

---

**Reviewed By:** Clean Architecture Guardian (Claude Code)
**Date:** 2025-10-31
**Status:** CONDITIONALLY APPROVED - Pending Critical Fixes
**Next Steps:**
1. Address critical issues
2. Update proposal document
3. Create ADRs
4. Implement enforcement mechanisms
5. Proceed with Phase 1 implementation
