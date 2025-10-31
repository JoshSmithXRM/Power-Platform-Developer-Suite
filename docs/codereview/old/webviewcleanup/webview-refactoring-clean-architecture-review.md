# Webview Refactoring - Clean Architecture Review

**Review Date:** 2025-10-31
**Reviewer:** AI Code Reviewer (Claude)
**Scope:** Infrastructure UI layer refactoring for webview HTML generation

---

## Executive Summary

**Architectural Health: CONDITIONAL PASS (7.5/10)**

The webview refactoring demonstrates a solid understanding of clean architecture principles with strong separation of concerns between infrastructure utilities and presentation logic. The implementation successfully extracts reusable UI components with proper XSS protection, comprehensive test coverage (85 tests), and maintains correct dependency direction. However, there are critical architectural boundary violations that need immediate attention: the placement of view functions in the infrastructure layer creates inappropriate cross-layer dependencies, and the absence of ViewModels in the view composition layer bypasses the established ViewModel pattern. These issues represent a misunderstanding of where presentation logic should reside in clean architecture.

---

## 1. Layer Analysis

### 1.1 Infrastructure Layer (`src/infrastructure/ui/`)

**Current Structure:**
```
infrastructure/ui/
├── utils/
│   ├── HtmlUtils.ts         (195 lines, 47 tests)
│   └── TypeGuards.ts        (194 lines, 38 tests)
├── views/
│   ├── formField.ts         (62 lines)
│   ├── button.ts            (52 lines)
│   ├── select.ts            (72 lines)
│   └── section.ts           (36 lines)
└── components/              (empty)
```

**✅ Strengths:**
- **Excellent XSS Protection:** `HtmlUtils.ts` implements a robust tagged template literal system with automatic escaping, similar to React's JSX but for server-side HTML generation
- **Zero External Dependencies:** Infrastructure utilities correctly have no dependencies on domain or application layers
- **Comprehensive Type Safety:** `TypeGuards.ts` provides runtime validation at the webview boundary with proper enum validation
- **Pure Functions:** All utility functions are stateless and side-effect free
- **Node.js Context Awareness:** Properly designed for Extension Host context (no DOM dependencies)

**❌ Critical Issues:**

1. **CRITICAL: View Functions in Wrong Layer**
   - **Location:** `infrastructure/ui/views/*.ts`
   - **Problem:** These are NOT infrastructure utilities - they are feature-agnostic presentation components that belong in presentation layer
   - **Impact:** Creates confusion about what belongs in infrastructure vs. presentation
   - **Evidence:** These functions render complete HTML structures (`renderFormField`, `renderButton`) which is presentation logic, not infrastructure utility code

2. **HIGH: Missing Abstraction Boundaries**
   - The `views/` folder contains concrete UI components but infrastructure should only provide primitives
   - No clear distinction between "infrastructure utilities" (HtmlUtils) and "reusable components" (formField, button)

**🔍 Analysis:**

The infrastructure layer should only contain technology-agnostic utilities. The view functions are technology-specific (HTML) AND presentation-specific (form fields, buttons). This violates the principle that infrastructure provides mechanisms, not policies.

**Correct Architecture:**
```
infrastructure/ui/
└── utils/
    ├── HtmlUtils.ts      ← Keep (primitive utilities)
    └── TypeGuards.ts     ← Keep (boundary validation)

shared/presentation/components/  ← NEW: Shared presentation components
└── html/
    ├── formField.ts
    ├── button.ts
    ├── select.ts
    └── section.ts
```

### 1.2 Presentation Layer (`src/features/environmentSetup/presentation/`)

**Current Structure:**
```
presentation/
├── panels/
│   └── EnvironmentSetupPanel.ts    (460 lines)
└── views/
    └── environmentSetup.ts         (232 lines)
```

**✅ Strengths:**
- **Panel Delegates to Use Cases:** Panel correctly contains zero business logic, only orchestration
- **Proper Message Handling:** Uses type guards for runtime validation at boundary
- **Feature-Specific View Composition:** `environmentSetup.ts` composes reusable components for the specific feature

**❌ Critical Issues:**

1. **CRITICAL: No ViewModel Usage in View Layer**
   - **Location:** `environmentSetup.ts`
   - **Problem:** View functions directly accept primitive strings and inline configuration instead of ViewModels
   - **Evidence:**
     ```typescript
     export function renderEnvironmentSetup(resources: EnvironmentSetupViewResources): string {
         // ❌ Takes URI strings directly, not a ViewModel
         return html`...`;
     }
     ```
   - **Impact:** Bypasses the ViewModel pattern that exists in the application layer, creating inconsistent data flow
   - **Correct Pattern:**
     ```typescript
     export interface EnvironmentSetupViewModel {
         formData: EnvironmentFormViewModel;
         resources: ResourceUris;
         uiState: {
             showDeleteButton: boolean;
             isLoading: boolean;
         };
     }

     export function renderEnvironmentSetup(viewModel: EnvironmentSetupViewModel): string {
         // ✅ Single ViewModel parameter with all data
     }
     ```

2. **HIGH: Panel Handles Raw Messages**
   - **Location:** `EnvironmentSetupPanel.ts` line 126-161
   - **Problem:** Panel's `handleMessage` method does string-based command switching instead of using the type guards fully
   - **Evidence:**
     ```typescript
     switch (msg.command) {
         case 'save-environment':  // ❌ String literals
         case 'test-connection':
     }
     ```
   - **Better Approach:** Use discriminated union pattern with type guards:
     ```typescript
     if (isSaveEnvironmentMessage(message)) {
         await this.handleSaveEnvironment(message.data);
     } else if (isTestConnectionMessage(message)) {
         await this.handleTestConnection();
     }
     ```

3. **MEDIUM: Type Casting Without Validation**
   - **Location:** `EnvironmentSetupPanel.ts` lines 178-200
   - **Problem:** Data is cast to `Record<string, unknown>` and then individual fields cast without validation
   - **Evidence:**
     ```typescript
     const envData = data as Record<string, unknown>;
     // ...
     name: envData.name as string,  // ❌ Unsafe cast
     ```
   - **Solution:** Use the `isSaveEnvironmentMessage` type guard that already exists

**🔍 Analysis:**

The panel is well-structured but misses opportunities to use the type system fully. The view layer completely bypasses ViewModels, which is a major architectural inconsistency.

### 1.3 Application Layer (ViewModels)

**Existing ViewModels:**
- `EnvironmentFormViewModel` - ✅ Properly defined with placeholder patterns for credentials
- `EnvironmentListViewModel` - ✅ Used in list view

**❌ Critical Issue:**
- **CRITICAL: ViewModels Not Used in View Generation**
  - ViewModels exist but view functions don't accept them
  - Panel passes raw data to webview instead of ViewModels
  - Breaks the ViewModel pattern that's established elsewhere

### 1.4 Domain Layer

**✅ Perfect Isolation:**
```bash
# All domain imports are internal:
domain/entities/Environment.ts imports from:
  - valueObjects/* ✅
  - errors/DomainError ✅

domain/services/* imports from:
  - entities/* ✅
  - valueObjects/* ✅
```

**Analysis:** Domain layer has ZERO dependencies on outer layers. This is exemplary clean architecture.

---

## 2. Dependency Analysis

### 2.1 Dependency Direction

**Overall Flow:**
```
Presentation → Application → Domain
     ↓              ↓
Infrastructure ←─ Application
```

**✅ Correct Dependencies:**
- Domain has zero external dependencies
- Application depends only on domain
- Presentation depends on application (use cases, ViewModels)
- Infrastructure utilities are self-contained

**❌ Problematic Dependencies:**

1. **Presentation → Infrastructure Views** (VIOLATION)
   ```typescript
   // environmentSetup.ts
   import { renderFormField } from '../../../../infrastructure/ui/views/formField';
   import { renderButton } from '../../../../infrastructure/ui/views/button';
   ```

   **Problem:** Presentation should not depend on infrastructure for UI components. This creates the wrong abstraction level - infrastructure should provide primitives (HtmlUtils), not presentation components (buttons, forms).

   **Why This Matters:** If another feature wants to create webviews with different styling or structure, they'd have to use the same infrastructure components, creating coupling across features.

2. **Long Relative Path Hell**
   ```typescript
   import { html } from '../../../../infrastructure/ui/utils/HtmlUtils';
   ```

   **Impact:** Path length indicates architectural smell - the layers are too tightly coupled through direct imports.

### 2.2 Dependency Inversion Compliance

**✅ Good Examples:**
- Domain defines repository interfaces (`IEnvironmentRepository`)
- Application depends on abstractions
- Infrastructure implements concrete repositories

**❌ Missing Inversions:**
- View functions could be abstracted behind interfaces to support multiple rendering strategies (HTML, custom webview frameworks, etc.)

---

## 3. Findings by Severity

### 🔴 CRITICAL (Must Fix Immediately)

#### C1: View Functions in Infrastructure Layer
**Description:** `src/infrastructure/ui/views/*.ts` files contain presentation components misplaced in infrastructure
**Location:**
- `src/infrastructure/ui/views/formField.ts`
- `src/infrastructure/ui/views/button.ts`
- `src/infrastructure/ui/views/select.ts`
- `src/infrastructure/ui/views/section.ts`

**Impact:**
- Violates clean architecture layer responsibilities
- Creates confusion about what belongs in infrastructure
- Makes these components appear as low-level utilities when they're actually high-level presentation components
- Future features will incorrectly depend on infrastructure for presentation

**Recommendation:**
1. Create `src/shared/presentation/components/html/` directory
2. Move all view functions there (they're shared presentation components, not infrastructure)
3. Update imports in `environmentSetup.ts`
4. Add architectural decision record explaining why shared presentation components are NOT infrastructure

**Example Migration:**
```typescript
// OLD (WRONG):
// src/infrastructure/ui/views/button.ts
export function renderButton(props: ButtonProps): string { ... }

// NEW (CORRECT):
// src/shared/presentation/components/html/button.ts
export function renderButton(props: ButtonProps): string { ... }
```

#### C2: ViewModels Bypassed in View Layer
**Description:** View functions don't use ViewModels, breaking the established ViewModel pattern
**Location:** `src/features/environmentSetup/presentation/views/environmentSetup.ts`

**Impact:**
- Inconsistent with rest of architecture (ViewModels exist but aren't used)
- View functions receive raw primitive data instead of structured ViewModels
- Bypasses application layer's data transformation responsibility
- Makes view composition harder to test in isolation

**Recommendation:**
1. Create `EnvironmentSetupViewModel` interface in application layer
2. Update `renderEnvironmentSetup` to accept ViewModel instead of raw resources
3. Panel should prepare ViewModel before passing to view
4. Add mapper from domain entity to complete view ViewModel

**Code Example:**
```typescript
// application/viewModels/EnvironmentSetupViewModel.ts
export interface EnvironmentSetupViewModel {
    form: EnvironmentFormViewModel;
    resources: {
        styleUri: string;
        scriptUri: string;
    };
    uiState: {
        showDeleteButton: boolean;
        isNewEnvironment: boolean;
    };
}

// presentation/views/environmentSetup.ts
export function renderEnvironmentSetup(viewModel: EnvironmentSetupViewModel): string {
    return html`
        <!DOCTYPE html>
        ...
        ${raw(renderForm(viewModel.form))}
        ...
    `;
}

// Panel prepares complete ViewModel:
const viewModel = {
    form: await this.loadEnvironmentByIdUseCase.execute({ environmentId }),
    resources: { styleUri, scriptUri },
    uiState: { showDeleteButton: !!environmentId, isNewEnvironment: !environmentId }
};
this.panel.webview.html = renderEnvironmentSetup(viewModel);
```

### 🟠 HIGH (Fix Soon)

#### H1: Type Guards Not Fully Utilized
**Description:** Panel uses string-based command switching instead of leveraging type guards
**Location:** `EnvironmentSetupPanel.ts` lines 126-161

**Impact:**
- Runtime safety not enforced at message boundary
- Type information lost immediately after validation
- Manual casting required, prone to errors

**Recommendation:**
Replace switch statement with type guard chain:
```typescript
private async handleMessage(message: unknown): Promise<void> {
    try {
        if (isSaveEnvironmentMessage(message)) {
            // TypeScript knows message.data shape here
            await this.handleSaveEnvironment(message.data);
        } else if (isTestConnectionMessage(message)) {
            await this.handleTestConnection();
        } else if (isDiscoverEnvironmentIdMessage(message)) {
            await this.handleDiscoverEnvironmentId();
        } else if (isDeleteEnvironmentMessage(message)) {
            await this.handleDeleteEnvironment();
        } else if (isCheckUniqueNameMessage(message)) {
            await this.handleValidateName(message.data);
        }
        // Unknown messages silently ignored (acceptable)
    } catch (error) {
        this.handleError(error as Error, 'Operation failed');
    }
}
```

#### H2: Client-Side JavaScript Not Reviewed
**Description:** `EnvironmentSetupBehavior.js` is plain JavaScript without type safety
**Location:** `resources/webview/js/behaviors/EnvironmentSetupBehavior.js`

**Impact:**
- No compile-time verification of message contracts
- Runtime errors possible from type mismatches
- Hard to refactor when message types change

**Recommendation:**
1. Convert to TypeScript: `EnvironmentSetupBehavior.ts`
2. Share type definitions between extension and webview using:
   ```typescript
   // shared/types/webviewMessages.ts (included in both extension and webview builds)
   export interface SaveEnvironmentMessage { ... }
   ```
3. Compile webview TypeScript separately with appropriate target (ES2015+ for modern webview)

#### H3: Components Directory Empty
**Description:** `src/infrastructure/ui/components/` exists but is unused
**Location:** `src/infrastructure/ui/components/`

**Impact:**
- Directory structure suggests a design that wasn't implemented
- Creates confusion about whether to use `views/` or `components/`

**Recommendation:**
- Remove empty `components/` directory
- If components vs views distinction is needed, document it in README
- Consolidate everything into `shared/presentation/components/html/` as suggested in C1

### 🟡 MEDIUM (Should Fix)

#### M1: Missing Interface Abstraction for View Rendering
**Description:** View functions are concrete implementations without abstraction
**Impact:** Cannot swap rendering strategies (e.g., template engine, JSX, custom DSL)

**Recommendation:**
```typescript
// application/interfaces/IViewRenderer.ts
export interface IViewRenderer<TViewModel> {
    render(viewModel: TViewModel): string;
}

// presentation/views/EnvironmentSetupRenderer.ts
export class EnvironmentSetupHtmlRenderer implements IViewRenderer<EnvironmentSetupViewModel> {
    render(viewModel: EnvironmentSetupViewModel): string {
        return renderEnvironmentSetup(viewModel);
    }
}
```

#### M2: View Functions Return `string` Instead of `RawHtml`
**Description:** Public APIs return `string` but internally work with `RawHtml`
**Location:** All `render*` functions in `infrastructure/ui/views/`

**Current:**
```typescript
export function renderButton(props: ButtonProps): string {
    return html`...`.__html;  // ❌ Extracting __html
}
```

**Better:**
```typescript
export function renderButton(props: ButtonProps): RawHtml {
    return html`...`;  // ✅ Return RawHtml directly
}
```

**Impact:**
- Inconsistent API design
- Loses type information about HTML safety
- Forces extraction of internal `__html` property

**Recommendation:**
1. Export `RawHtml` type from `HtmlUtils.ts`
2. Change all view functions to return `RawHtml`
3. Only convert to string at the final boundary (panel's `getHtmlContent()`)

#### M3: No Tests for View Functions
**Description:** Comprehensive tests for utilities (85 tests) but zero tests for view functions
**Location:** Missing tests for `infrastructure/ui/views/*.ts`

**Impact:**
- Cannot verify view functions produce correct HTML structure
- No regression protection when refactoring
- XSS protection not verified at component level

**Recommendation:**
Create test file for each view function:
```typescript
// formField.test.ts
describe('renderFormField', () => {
    it('should render text input with label', () => {
        const html = renderFormField({
            id: 'test',
            label: 'Test Field',
            type: 'text'
        }).__html;

        expect(html).toContain('<label for="test">');
        expect(html).toContain('<input');
        expect(html).toContain('type="text"');
    });

    it('should escape XSS in label', () => {
        const html = renderFormField({
            id: 'test',
            label: '<script>alert("xss")</script>',
            type: 'text'
        }).__html;

        expect(html).not.toContain('<script>');
        expect(html).toContain('&lt;script&gt;');
    });
});
```

#### M4: Inconsistent Prop Naming Conventions
**Description:** Some props use `helpText`, others might use `description` or `hint`
**Impact:** Developer experience suffers from inconsistent API

**Recommendation:**
- Establish naming conventions in documentation
- Use `helpText` consistently (current choice is good)
- Add JSDoc examples to every props interface

### 🔵 LOW (Nice to Have)

#### L1: Missing JSDoc for View Functions
**Description:** View functions lack comprehensive JSDoc comments
**Recommendation:** Add JSDoc with examples to all public view functions

#### L2: No Storybook or Visual Testing
**Description:** View components can't be visually previewed in isolation
**Recommendation:** Consider adding Storybook or similar tool for component development

#### L3: Hardcoded CSS Classes
**Description:** CSS classes are hardcoded strings (`"form-group"`, `"button primary"`)
**Recommendation:**
- Consider CSS-in-JS or CSS module approach
- Or centralize class name constants

#### L4: No Accessibility Attributes
**Description:** Rendered HTML lacks ARIA attributes and accessibility features
**Recommendation:**
```typescript
renderButton({
    id: 'save',
    text: 'Save',
    ariaLabel: 'Save environment configuration',  // New
    ariaDisabled: false  // New
})
```

---

## 4. Positive Patterns (What Was Done Well)

### 🌟 Exemplary Implementations

#### 1. XSS Protection System
**Why It's Excellent:**
- Tagged template literals provide compile-time safety
- Automatic escaping is opt-out (secure by default)
- `raw()` function makes dangerous operations explicit
- Matches React's approach (proven pattern)

**Code Example:**
```typescript
// Automatic escaping
const userInput = '<script>alert("xss")</script>';
html`<div>${userInput}</div>`
// Result: <div>&lt;script&gt;...</div>

// Explicit trust with raw()
const trustedHtml = renderButton({ ... });
html`<div>${raw(trustedHtml)}</div>`
```

**Learning:** This is a textbook example of making the safe path easy and the dangerous path explicit.

#### 2. Type Guard Implementation
**Why It's Excellent:**
- Proper runtime validation at boundary
- TypeScript type narrowing works correctly
- Enum validation prevents invalid states
- Comprehensive test coverage (38 tests)

**Code Example:**
```typescript
if (isSaveEnvironmentMessage(message)) {
    // TypeScript knows message.data.name is string
    const name = message.data.name;  // No casting needed
}
```

**Learning:** Boundaries need both compile-time AND runtime validation. This implementation provides both.

#### 3. Domain Layer Isolation
**Why It's Excellent:**
- Zero external dependencies
- Rich domain models with behavior
- Value objects with validation
- Domain events for cross-cutting concerns

**Evidence:**
```typescript
// Environment.ts - Rich domain model
export class Environment {
    public validateConfiguration(): ValidationResult { ... }
    public updateName(name: EnvironmentName): void { ... }
    public activate(): void { ... }
}
```

**Learning:** Domain models contain behavior, not just data. This is proper DDD implementation.

#### 4. Test Coverage
**Why It's Excellent:**
- 47 tests for HtmlUtils (every edge case covered)
- 38 tests for TypeGuards (comprehensive validation)
- Tests verify architectural boundaries
- Integration tests verify end-to-end flows

**Examples:**
- XSS protection tested with malicious input
- Null/undefined handling tested
- Array flattening tested
- Type narrowing verified in TypeScript

#### 5. Pure Function Design
**Why It's Excellent:**
- All utility functions are pure (no side effects)
- Deterministic output for given input
- Easy to test and reason about
- Thread-safe by design

**Example:**
```typescript
// Pure function - no side effects, deterministic
export function escapeHtml(text: string | null | undefined): string {
    if (text == null) return '';
    return String(text).replace(/&/g, '&amp;')...;
}
```

---

## 5. Architectural Score: 7.5/10

### Scoring Breakdown

| Category | Score | Weight | Weighted Score | Notes |
|----------|-------|--------|----------------|-------|
| **Layer Separation** | 6/10 | 25% | 1.5 | View functions in wrong layer (-3), but utilities well-separated (+1) |
| **Dependency Direction** | 9/10 | 25% | 2.25 | Domain perfect, minor presentation issues |
| **Domain Independence** | 10/10 | 20% | 2.0 | Zero external dependencies, exemplary |
| **Presentation Quality** | 7/10 | 15% | 1.05 | Panel good, views bypass ViewModels |
| **Testing** | 8/10 | 10% | 0.8 | Excellent utility tests, missing view tests |
| **Code Quality** | 9/10 | 5% | 0.45 | Clean, well-documented, type-safe |

**Total: 7.5/10**

### What's Preventing a Higher Score

**Why Not 8+:**
- Critical architectural boundary violation (views in infrastructure)
- ViewModels bypassed in view layer
- Type guards not fully utilized

**Why Not 9+:**
- Would need all CRITICAL and HIGH issues resolved
- Plus comprehensive view component tests
- Plus client-side TypeScript conversion

**Why Not 10:**
- Would need above + all MEDIUM issues resolved
- Plus accessibility features
- Plus visual regression testing

---

## 6. Recommendations

### Immediate Actions (Sprint Priority)

1. **Move View Functions to Shared Presentation** (2-3 hours)
   - Create `src/shared/presentation/components/html/`
   - Move `formField.ts`, `button.ts`, `select.ts`, `section.ts`
   - Update all imports
   - Update architectural documentation

2. **Implement ViewModels in View Layer** (3-4 hours)
   - Create `EnvironmentSetupViewModel` interface
   - Update `renderEnvironmentSetup` signature
   - Modify panel to prepare complete ViewModels
   - Update tests

3. **Refactor Message Handling with Type Guards** (1-2 hours)
   - Replace switch statement with type guard chain
   - Remove manual type casts
   - Add test for message handling

### Short-Term (Next Sprint)

4. **Add View Component Tests** (4-6 hours)
   - Test each view function's HTML output
   - Verify XSS protection at component level
   - Add snapshot tests for regression protection

5. **Convert Client JavaScript to TypeScript** (3-4 hours)
   - Create `EnvironmentSetupBehavior.ts`
   - Share type definitions between extension and webview
   - Set up separate webview build

6. **Remove Empty Components Directory** (5 minutes)
   - Delete `src/infrastructure/ui/components/`
   - Update any documentation referencing it

### Medium-Term (Next Quarter)

7. **Establish View Renderer Abstraction** (1-2 days)
   - Create `IViewRenderer<T>` interface
   - Implement HTML renderer
   - Allow for future alternative rendering strategies

8. **Add Accessibility Features** (2-3 days)
   - ARIA attributes on all interactive elements
   - Keyboard navigation support
   - Screen reader testing

9. **Component Documentation** (1 day)
   - Add Storybook or similar
   - Document all props interfaces
   - Provide usage examples

### Pattern for Future Features

When creating new webview panels:

1. **DO:**
   - Use `HtmlUtils` for all HTML generation (infrastructure utility)
   - Create feature-specific view functions in `presentation/views/`
   - Use shared presentation components from `shared/presentation/components/html/`
   - Pass ViewModels to view functions, not raw data
   - Use type guards for all webview messages

2. **DON'T:**
   - Put view functions in infrastructure layer
   - Bypass ViewModels in view composition
   - Manually cast types after validation
   - Create HTML strings with concatenation
   - Trust client-side input without validation

---

## 7. Conclusion

This refactoring represents a significant improvement in code organization, security, and testability. The XSS protection system is exemplary, the domain layer is perfectly isolated, and the test coverage for utilities is comprehensive. However, critical architectural decisions about layer boundaries need correction to prevent this pattern from being replicated incorrectly across the codebase.

The two CRITICAL issues (view functions in infrastructure, ViewModels bypassed) indicate a misunderstanding of clean architecture boundaries rather than technical incompetence. Once these are corrected, this code will serve as an excellent reference implementation for future webview development.

**Key Takeaway:** Infrastructure provides mechanisms (utilities, guards), not policies (UI components). Presentation components, even shared ones, belong in presentation layer or a dedicated shared presentation layer, not infrastructure.

---

## Appendix A: File-by-File Summary

| File | Lines | Layer | Status | Notes |
|------|-------|-------|--------|-------|
| `HtmlUtils.ts` | 195 | Infrastructure | ✅ GOOD | Perfect infrastructure utility |
| `TypeGuards.ts` | 194 | Infrastructure | ✅ GOOD | Excellent boundary validation |
| `formField.ts` | 62 | Infrastructure | ❌ WRONG LAYER | Should be shared presentation |
| `button.ts` | 52 | Infrastructure | ❌ WRONG LAYER | Should be shared presentation |
| `select.ts` | 72 | Infrastructure | ❌ WRONG LAYER | Should be shared presentation |
| `section.ts` | 36 | Infrastructure | ❌ WRONG LAYER | Should be shared presentation |
| `environmentSetup.ts` | 232 | Presentation | ⚠️ NEEDS VM | Should use ViewModels |
| `EnvironmentSetupPanel.ts` | 460 | Presentation | ⚠️ MINOR ISSUES | Good structure, minor improvements |
| `EnvironmentSetupBehavior.js` | 280 | Client-Side | ⚠️ NO TYPES | Convert to TypeScript |
| `HtmlUtils.test.ts` | 293 | Infrastructure | ✅ EXCELLENT | Comprehensive coverage |
| `TypeGuards.test.ts` | 382 | Infrastructure | ✅ EXCELLENT | Thorough validation tests |

---

## Appendix B: Architectural Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         PRESENTATION                         │
├─────────────────────────────────────────────────────────────┤
│  EnvironmentSetupPanel.ts                                    │
│  ├─ Uses: LoadEnvironmentByIdUseCase                        │
│  ├─ Uses: SaveEnvironmentUseCase                            │
│  └─ Renders: environmentSetup.ts                            │
│                                                              │
│  environmentSetup.ts                                         │
│  ├─ Composes: renderFormField, renderButton, etc.          │
│  └─ Uses: html, raw from HtmlUtils                          │
└──────────────┬───────────────────────────────────────────────┘
               │
               │ ❌ VIOLATES: Should not depend on infrastructure
               │              for presentation components
               │
┌──────────────▼───────────────────────────────────────────────┐
│                      INFRASTRUCTURE                           │
├──────────────────────────────────────────────────────────────┤
│  HtmlUtils.ts (✅ Correct - primitive utilities)            │
│  TypeGuards.ts (✅ Correct - boundary validation)           │
│                                                              │
│  ❌ MISPLACED:                                              │
│  views/formField.ts (Should be in shared presentation)      │
│  views/button.ts (Should be in shared presentation)         │
│  views/select.ts (Should be in shared presentation)         │
│  views/section.ts (Should be in shared presentation)        │
└──────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      CORRECT STRUCTURE                        │
├─────────────────────────────────────────────────────────────┤
│  PRESENTATION/EnvironmentSetupPanel                          │
│           │                                                  │
│           ├──► PRESENTATION/views/environmentSetup          │
│           │                │                                 │
│           │                └──► SHARED PRESENTATION/         │
│           │                     components/html/             │
│           │                     ├─ formField                 │
│           │                     ├─ button                    │
│           │                     └─ select                    │
│           │                                                  │
│           └──► INFRASTRUCTURE/ui/utils/                     │
│                              ├─ HtmlUtils                    │
│                              └─ TypeGuards                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Appendix C: References

- **CLAUDE.md**: Project's clean architecture rules
- **ARCHITECTURE_GUIDE.md**: Layer responsibilities
- **LAYER_RESPONSIBILITIES_GUIDE.md**: Detailed layer boundaries
- **Clean Architecture** by Robert C. Martin: Chapter on layer boundaries
- **Domain-Driven Design** by Eric Evans: Chapter on presentation layer

---

*End of Review*
