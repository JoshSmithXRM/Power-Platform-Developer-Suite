# Hybrid Webview Architecture Proposal

> **Author:** Claude Code
> **Date:** 2025-10-31
> **Status:** PROPOSAL - Under Review

---

## Executive Summary

This document proposes a **hybrid approach** combining the best elements from both the TypeScript-Pro and Clean-Architecture-Guardian recommendations for our webview templating architecture.

### Goals

1. ✅ Architecturally sound (Clean Architecture compliance)
2. ✅ Pragmatic implementation (not over-engineered)
3. ✅ Scalable to complex UIs (Plugin Registration, Solution Explorer)
4. ✅ Type-safe throughout
5. ✅ Testable and maintainable
6. ✅ Supports shared/reusable components

---

## Analysis of Original Recommendations

### TypeScript-Pro: Template Builder Pattern

**Strengths:**
- Pragmatic, lightweight approach
- Full TypeScript type safety
- Zero dependencies
- Easy to understand and implement
- Component reuse via functions

**Weaknesses:**
- HTML still mixed with TypeScript code
- ViewModels could live in wrong layer (Presentation)
- Less strict architectural boundaries
- Client-side behavior not explicitly addressed

### Clean-Architecture-Guardian: Component-View-Behavior Pattern

**Strengths:**
- Strict layer separation
- ViewModels correctly placed in Application layer
- Pure View functions (highly testable)
- Explicit Behavior layer for client-side logic
- Clear architectural boundaries
- Prevents business logic leakage

**Weaknesses:**
- More files (Component + View for each)
- More abstraction layers
- Potentially over-engineered for simple panels
- Steeper learning curve

---

## Hybrid Approach: Best of Both Worlds

### Core Principles

1. **ViewModels in Application Layer** (Clean-Guardian ✅)
   - Proper Clean Architecture layering
   - Application layer owns DTOs for presentation

2. **Component-View Separation** (Clean-Guardian ✅)
   - Component classes manage state/lifecycle
   - Pure View functions generate HTML
   - Clear separation of concerns

3. **Template Builder Pattern for Composition** (TypeScript-Pro ✅)
   - Pragmatic composition approach
   - Avoid over-abstraction
   - Easy to understand flow

4. **Explicit Behavior Layer** (Clean-Guardian ✅)
   - Client-side JavaScript separate from TypeScript
   - Clear boundary between server/client logic

5. **Type Safety Throughout** (TypeScript-Pro ✅)
   - Full TypeScript inference
   - Type-safe props and ViewModels

---

## Directory Structure

```
src/
├── core/
│   └── presentation/
│       ├── components/           # Shared component classes
│       │   ├── BaseComponent.ts
│       │   ├── FormFieldComponent.ts
│       │   ├── ButtonComponent.ts
│       │   ├── SelectComponent.ts
│       │   └── SectionComponent.ts
│       │
│       ├── views/                # Shared pure view functions
│       │   ├── FormFieldView.ts
│       │   ├── ButtonView.ts
│       │   ├── SelectView.ts
│       │   └── SectionView.ts
│       │
│       ├── panels/               # Base panel classes
│       │   └── BasePanel.ts
│       │
│       └── composers/            # HTML composition utilities
│           └── TemplateComposer.ts
│
├── features/
│   └── environmentSetup/
│       ├── domain/
│       │   └── entities/
│       │       └── Environment.ts
│       │
│       ├── application/
│       │   ├── viewModels/       # ViewModels HERE (Application layer)
│       │   │   └── EnvironmentSetupViewModel.ts
│       │   │
│       │   ├── mappers/
│       │   │   └── EnvironmentViewModelMapper.ts
│       │   │
│       │   └── useCases/
│       │       └── LoadEnvironmentUseCase.ts
│       │
│       └── presentation/
│           ├── panels/
│           │   └── EnvironmentSetupPanel.ts
│           │
│           ├── components/       # Feature-specific components (if needed)
│           │   └── AuthMethodSelectorComponent.ts
│           │
│           └── views/            # Feature-specific views
│               ├── EnvironmentSetupView.ts
│               └── AuthMethodSelectorView.ts
│
resources/
└── webview/
    ├── css/
    │   ├── base/
    │   │   ├── component-base.css
    │   │   └── panel-base.css
    │   └── components/
    │       ├── form-field.css
    │       └── button.css
    │
    └── js/
        ├── behaviors/            # Client-side behaviors
        │   ├── BaseBehavior.js
        │   ├── FormValidationBehavior.js
        │   └── AuthMethodSelectorBehavior.js
        │
        └── utils/
            └── ComponentUtils.js
```

---

## Architecture Layers

### 1. Application Layer: ViewModels

**Location:** `features/{feature}/application/viewModels/`

**Responsibility:** Define presentation DTOs (no business logic)

```typescript
// features/environmentSetup/application/viewModels/EnvironmentSetupViewModel.ts
export interface EnvironmentSetupViewModel {
    name: string;
    dataverseUrl: string;
    tenantId: string;
    authenticationMethod: string;
    publicClientId: string;
    // ... etc
}

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

**Why Application Layer?**
- ViewModels are DTOs for the presentation layer
- Application layer orchestrates domain → presentation mapping
- Keeps presentation layer focused on rendering only

---

### 2. Presentation Layer: Views (Pure Functions)

**Location:** `core/presentation/views/` (shared) or `features/{feature}/presentation/views/` (feature-specific)

**Responsibility:** Pure functions that generate HTML from ViewModels

```typescript
// core/presentation/views/FormFieldView.ts
export interface FormFieldViewProps {
    id: string;
    label: string;
    type: string;
    value?: string;
    placeholder?: string;
    helpText?: string;
    required?: boolean;
}

export class FormFieldView {
    static render(props: FormFieldViewProps): string {
        const requiredAttr = props.required ? 'required' : '';
        const valueAttr = props.value ? `value="${this.escapeHtml(props.value)}"` : '';

        return `
            <div class="form-group">
                <label for="${props.id}">${this.escapeHtml(props.label)}${props.required ? ' *' : ''}</label>
                <input
                    type="${props.type}"
                    id="${props.id}"
                    name="${props.id}"
                    placeholder="${this.escapeHtml(props.placeholder || '')}"
                    ${valueAttr}
                    ${requiredAttr}
                >
                ${props.helpText ? `<span class="help-text">${this.escapeHtml(props.helpText)}</span>` : ''}
            </div>
        `;
    }

    private static escapeHtml(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
```

**Key Characteristics:**
- ✅ Pure functions (no side effects)
- ✅ Type-safe props
- ✅ HTML escaping for security
- ✅ Easy to test (input → output)

---

### 3. Presentation Layer: Components (State Management)

**Location:** `core/presentation/components/` (shared) or `features/{feature}/presentation/components/` (feature-specific)

**Responsibility:** Manage state, lifecycle, and compose Views

```typescript
// core/presentation/components/FormFieldComponent.ts
export interface FormFieldComponentConfig {
    id: string;
    label: string;
    type: string;
    value?: string;
    placeholder?: string;
    helpText?: string;
    required?: boolean;
}

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

**Key Characteristics:**
- ✅ Manages component state
- ✅ Delegates HTML generation to View
- ✅ Provides API for interaction
- ✅ Can be subclassed for feature-specific behavior

---

### 4. Presentation Layer: Panels (Orchestration)

**Location:** `features/{feature}/presentation/panels/`

**Responsibility:** Orchestrate use cases, map to ViewModels, compose Views

```typescript
// features/environmentSetup/presentation/panels/EnvironmentSetupPanel.ts
export class EnvironmentSetupPanel extends BasePanel {
    constructor(
        extensionUri: vscode.Uri,
        private loadEnvironmentUseCase: LoadEnvironmentUseCase,
        private mapper: EnvironmentViewModelMapper
    ) {
        super(extensionUri);
    }

    protected async initialize(): Promise<void> {
        // Load data via use case
        const environment = await this.loadEnvironmentUseCase.execute({ id: this.environmentId });

        // Map to ViewModel
        const viewModel = this.mapper.toViewModel(environment);

        // Generate HTML
        const html = EnvironmentSetupView.render(viewModel);

        // Set webview HTML
        this.panel.webview.html = html;
    }

    private getHtmlContent(): string {
        // Delegate to View
        return EnvironmentSetupView.render(this.viewModel);
    }
}
```

**Key Characteristics:**
- ✅ Calls use cases (no business logic)
- ✅ Maps domain entities to ViewModels
- ✅ Delegates HTML generation to Views
- ✅ Handles webview lifecycle

---

### 5. Feature-Specific Views (Composition)

**Location:** `features/{feature}/presentation/views/`

**Responsibility:** Compose shared Views into feature-specific layouts

```typescript
// features/environmentSetup/presentation/views/EnvironmentSetupView.ts
export class EnvironmentSetupView {
    static render(viewModel: EnvironmentSetupViewModel): string {
        const styleUri = this.getStyleUri();

        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link href="${styleUri}" rel="stylesheet">
                <title>Environment Setup</title>
            </head>
            <body>
                <div class="container">
                    ${this.renderHeader()}
                    ${this.renderForm(viewModel)}
                </div>
                ${this.renderScript()}
            </body>
            </html>
        `;
    }

    private static renderHeader(): string {
        return `
            <div class="header">
                <h1>Environment Setup</h1>
                <div class="button-group">
                    ${ButtonView.render({ id: 'saveButton', text: 'Save Environment', type: 'primary' })}
                    ${ButtonView.render({ id: 'testButton', text: 'Test Connection', type: 'secondary' })}
                </div>
            </div>
        `;
    }

    private static renderForm(viewModel: EnvironmentSetupViewModel): string {
        return `
            <form id="environmentForm">
                ${SectionView.render({
                    title: 'Basic Information',
                    content: this.renderBasicInfo(viewModel)
                })}
                ${SectionView.render({
                    title: 'Authentication',
                    content: this.renderAuthentication(viewModel)
                })}
            </form>
        `;
    }

    private static renderBasicInfo(viewModel: EnvironmentSetupViewModel): string {
        return `
            ${FormFieldView.render({
                id: 'name',
                label: 'Environment Name',
                type: 'text',
                value: viewModel.name,
                placeholder: 'e.g., DEV',
                helpText: 'A friendly name to identify this environment',
                required: true
            })}
            ${FormFieldView.render({
                id: 'dataverseUrl',
                label: 'Dataverse URL',
                type: 'text',
                value: viewModel.dataverseUrl,
                placeholder: 'https://org.crm.dynamics.com',
                helpText: 'The URL of your Dataverse organization',
                required: true
            })}
        `;
    }

    private static renderAuthentication(viewModel: EnvironmentSetupViewModel): string {
        return `
            ${FormFieldView.render({
                id: 'tenantId',
                label: 'Tenant ID',
                type: 'text',
                value: viewModel.tenantId,
                placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
                helpText: 'Your Azure AD tenant ID',
                required: true
            })}
            ${SelectView.render({
                id: 'authenticationMethod',
                label: 'Authentication Method',
                value: viewModel.authenticationMethod,
                options: [
                    { value: 'Interactive', label: 'Interactive (Browser)' },
                    { value: 'ServicePrincipal', label: 'Service Principal (Client Secret)' },
                    { value: 'UsernamePassword', label: 'Username/Password' },
                    { value: 'DeviceCode', label: 'Device Code' }
                ],
                helpText: 'Select how you want to authenticate to this environment',
                required: true
            })}
        `;
    }

    private static renderScript(): string {
        return `
            <script src="${this.getScriptUri('behaviors/FormValidationBehavior.js')}"></script>
        `;
    }
}
```

---

### 6. Client-Side Behaviors (JavaScript)

**Location:** `resources/webview/js/behaviors/`

**Responsibility:** Client-side interactivity, DOM manipulation, message passing

```javascript
// resources/webview/js/behaviors/FormValidationBehavior.js
(function() {
    const vscode = acquireVsCodeApi();

    // Form validation
    const form = document.getElementById('environmentForm');
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        // Send to extension host
        vscode.postMessage({
            command: 'save',
            data: data
        });
    });

    // Real-time validation
    const nameInput = document.getElementById('name');
    nameInput.addEventListener('blur', () => {
        if (!nameInput.value.trim()) {
            showError(nameInput, 'Name is required');
        } else {
            clearError(nameInput);
        }
    });

    function showError(element, message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'validation-error';
        errorDiv.textContent = message;
        element.parentElement.appendChild(errorDiv);
        element.classList.add('invalid');
    }

    function clearError(element) {
        const error = element.parentElement.querySelector('.validation-error');
        if (error) error.remove();
        element.classList.remove('invalid');
    }
})();
```

---

## Shared Component Library

### Core Components

Create reusable components in `core/presentation/`:

1. **FormFieldComponent/View** - Text inputs, textareas
2. **SelectComponent/View** - Dropdowns
3. **ButtonComponent/View** - Buttons with variants
4. **SectionComponent/View** - Collapsible sections
5. **CheckboxComponent/View** - Checkboxes
6. **RadioGroupComponent/View** - Radio button groups
7. **DataTableComponent/View** - Data grids
8. **StatusBadgeComponent/View** - Status indicators
9. **ValidationMessageComponent/View** - Error/warning messages
10. **LoadingSpinnerComponent/View** - Loading states

Each component has:
- Component class (state management)
- View class (pure HTML generation)
- CSS file in `resources/webview/css/components/`
- Behavior (if needed) in `resources/webview/js/behaviors/`

---

## Type Safety Strategy

### 1. Type-Safe Props

Every View has a props interface:

```typescript
export interface FormFieldViewProps {
    id: string;
    label: string;
    type: 'text' | 'email' | 'password' | 'number';
    value?: string;
    required?: boolean;
}

export class FormFieldView {
    static render(props: FormFieldViewProps): string {
        // TypeScript ensures props conform to interface
    }
}
```

### 2. Type-Safe ViewModels

ViewModels are strongly typed interfaces in Application layer:

```typescript
export interface EnvironmentSetupViewModel {
    name: string;
    dataverseUrl: string;
    tenantId: string;
    authenticationMethod: 'Interactive' | 'ServicePrincipal' | 'UsernamePassword' | 'DeviceCode';
}
```

### 3. Type-Safe Mapping

Mappers ensure type-safe domain → ViewModel conversion:

```typescript
export class EnvironmentViewModelMapper {
    toViewModel(environment: Environment): EnvironmentSetupViewModel {
        return {
            name: environment.name.value,
            dataverseUrl: environment.dataverseUrl.value,
            tenantId: environment.tenantId.value,
            authenticationMethod: environment.authenticationMethod.value
        };
    }
}
```

### 4. HTML Escaping

All Views use HTML escaping utilities:

```typescript
export class HtmlUtils {
    static escape(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    static escapeAttribute(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }
}
```

---

## Migration Path

### Phase 1: Create Shared Component Library (Week 1-2)

1. Create `core/presentation/components/` and `core/presentation/views/`
2. Build shared components:
   - FormFieldComponent/View
   - ButtonComponent/View
   - SelectComponent/View
   - SectionComponent/View
3. Create corresponding CSS files
4. Write unit tests for Views (pure functions)

### Phase 2: Refactor EnvironmentSetupPanel (Week 2-3)

1. Move ViewModel to `application/viewModels/`
2. Create `EnvironmentSetupView.ts` in `presentation/views/`
3. Extract client-side logic to `FormValidationBehavior.js`
4. Update panel to use View composition
5. Test thoroughly

### Phase 3: Update DIRECTORY_STRUCTURE_GUIDE.md (Week 3)

1. Document new structure
2. Add examples
3. Update migration guidelines

### Phase 4: Apply to Future Panels (Week 4+)

1. Use pattern for Plugin Registration panel
2. Use pattern for Solution Explorer panel
3. Refine component library as needed

---

## Testing Strategy

### View Testing (Pure Functions)

```typescript
describe('FormFieldView', () => {
    it('should render text input with label', () => {
        const html = FormFieldView.render({
            id: 'name',
            label: 'Name',
            type: 'text',
            required: true
        });

        expect(html).toContain('<label for="name">Name *</label>');
        expect(html).toContain('<input type="text" id="name"');
        expect(html).toContain('required');
    });

    it('should escape HTML in label', () => {
        const html = FormFieldView.render({
            id: 'name',
            label: '<script>alert("xss")</script>',
            type: 'text'
        });

        expect(html).not.toContain('<script>');
        expect(html).toContain('&lt;script&gt;');
    });
});
```

### Component Testing

```typescript
describe('FormFieldComponent', () => {
    it('should manage value state', () => {
        const component = new FormFieldComponent({
            id: 'name',
            label: 'Name',
            type: 'text'
        });

        component.setValue('John');
        expect(component.getValue()).toBe('John');
    });
});
```

### Panel Integration Testing

```typescript
describe('EnvironmentSetupPanel', () => {
    it('should render form with ViewModel data', async () => {
        const panel = new EnvironmentSetupPanel(
            mockExtensionUri,
            mockUseCase,
            mockMapper
        );

        await panel.show();

        expect(panel.webview.html).toContain('Environment Setup');
        expect(panel.webview.html).toContain('name="name"');
    });
});
```

---

## Pros and Cons

### Pros

✅ **Architecturally Sound**
- ViewModels in Application layer (correct layering)
- Clear separation of concerns (Component/View/Behavior)
- Proper dependency direction (inward)

✅ **Pragmatic**
- Not over-abstracted
- Easy to understand
- Leverages TypeScript strengths

✅ **Scalable**
- Component/View split scales to complex UIs
- Shared component library prevents duplication
- Feature-specific Views for custom layouts

✅ **Testable**
- Pure View functions trivial to test
- Component state easy to test
- Clear boundaries for integration tests

✅ **Type-Safe**
- Full TypeScript inference
- Compile-time checking
- HTML escaping utilities

✅ **Maintainable**
- Single responsibility (each file has one job)
- Easy to locate code (predictable structure)
- Refactoring-friendly (Views are pure functions)

### Cons

❌ **More Files**
- Component + View for each (though clearer)
- More initial setup

❌ **HTML Still Strings**
- No editor syntax highlighting
- Template logic in TypeScript (not separate HTML files)

❌ **Learning Curve**
- Team needs to understand Component/View/Behavior pattern
- More abstraction than inline HTML

---

## Alternatives Considered and Rejected

### 1. React/Vue in Webview

**Rejected because:**
- Build complexity (bundling, transpiling)
- Large bundle size
- Overkill for form-heavy UIs
- VSCode webview constraints

### 2. Handlebars/Mustache Templates

**Rejected because:**
- No TypeScript type safety
- Logic-less templates too restrictive
- Requires separate parsing step
- No compile-time checking

### 3. Separate HTML Template Files

**Rejected because:**
- Harder to track component → template relationship
- No type safety between TypeScript and HTML
- Requires file reading at runtime
- Editor switching between files

### 4. Template Builders Only (TypeScript-Pro)

**Rejected because:**
- ViewModels in wrong layer (Presentation)
- Less clear separation of concerns
- Harder to test (not pure functions)

### 5. Strict Component-View-Behavior Only (Clean-Guardian)

**Rejected because:**
- Over-engineered for simple panels
- Too many abstraction layers
- Steeper learning curve

---

## Decision Points for Review

### 1. ViewModels in Application Layer

**Proposal:** ViewModels MUST live in `application/viewModels/`, not `presentation/`

**Rationale:** Application layer owns orchestration and DTOs for presentation

**Question:** Do we agree this is correct Clean Architecture?

### 2. Component/View Split

**Proposal:** Separate Component (state) from View (HTML generation)

**Rationale:** Testability, single responsibility, scalability

**Question:** Is this worth the extra files?

### 3. HTML as Strings vs. Template Files

**Proposal:** Keep HTML as TypeScript strings (not separate .html files)

**Rationale:** Type safety, easier debugging, no runtime file reading

**Question:** Are we comfortable with HTML in TypeScript?

### 4. Shared Component Library

**Proposal:** Build reusable components in `core/presentation/components/` and `core/presentation/views/`

**Rationale:** Prevent duplication across features

**Question:** Should we start with FormField, Button, Select, Section?

### 5. Migration Strategy

**Proposal:** Phase 1: Shared components, Phase 2: Refactor EnvironmentSetupPanel, Phase 3: New panels

**Rationale:** Gradual adoption, proof of concept, learn as we go

**Question:** Should we refactor EnvironmentSetupPanel or start with a new panel?

---

## Next Steps

1. **Review this proposal** with TypeScript-Pro and Clean-Architecture-Guardian
2. **Get feedback** on hybrid approach
3. **Refine** based on their input
4. **Document final decision** in ARCHITECTURAL_DECISION_RECORDS.md
5. **Update** DIRECTORY_STRUCTURE_GUIDE.md
6. **Begin implementation** with Phase 1 (shared components)

---

## Open Questions

1. Should we extract HTML escaping to a shared utility class?
2. Should Components be classes or factories?
3. Should we support template caching for performance?
4. Should we create a CLI tool to scaffold new components?
5. Should we add JSDoc comments to all View render methods?

---

## References

- TypeScript-Pro Recommendations: `docs/codereview/webview-architecture-typescript-pro.md`
- Clean-Guardian Recommendations: `docs/codereview/webview-architecture-clean-guardian.md`
- Current Implementation: `src/features/environmentSetup/presentation/panels/EnvironmentSetupPanel.ts`
- Architecture Guide: `docs/ARCHITECTURE_GUIDE.md`
- Directory Structure Guide: `docs/DIRECTORY_STRUCTURE_GUIDE.md`
