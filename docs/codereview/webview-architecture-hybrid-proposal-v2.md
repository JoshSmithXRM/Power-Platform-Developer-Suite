# Hybrid Webview Architecture Proposal (v2)

> **Author:** Claude Code
> **Date:** 2025-10-31
> **Status:** REVISED - Addressing Agent Feedback
> **Version:** 2.0 (Critical Issues Fixed)

---

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-10-31 | Initial hybrid proposal |
| 2.0 | 2025-10-31 | **Critical fixes:** HTML escaping, Use Cases return ViewModels, Shared components → infrastructure, Tagged template literals, Runtime type guards, Pure functions instead of static classes |

---

## Executive Summary

This document proposes a **hybrid approach** combining the best elements from both the TypeScript-Pro and Clean-Architecture-Guardian recommendations for our webview templating architecture.

**v2 Changes:** This revision addresses critical issues identified by both agents:
- ✅ Fixed broken HTML escaping (Node.js compatible)
- ✅ Use Cases now return ViewModels (Panels don't map)
- ✅ Shared components moved to `infrastructure/ui/`
- ✅ Added tagged template literals for auto-escaping
- ✅ Added runtime type guards for webview messages
- ✅ Converted static View classes to pure functions

### Goals

1. ✅ Architecturally sound (Clean Architecture compliance)
2. ✅ Pragmatic implementation (not over-engineered)
3. ✅ Scalable to complex UIs (Plugin Registration, Solution Explorer)
4. ✅ Type-safe throughout
5. ✅ Testable and maintainable
6. ✅ Supports shared/reusable components
7. ✅ XSS protection enforced automatically

---

## Critical Changes from v1

### 1. HTML Escaping (TypeScript-Pro Critical Issue)

**v1 Problem:** Used `document.createElement()` which doesn't exist in Node.js Extension Host
```typescript
// ❌ BROKEN - ReferenceError in Extension Host
static escape(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
```

**v2 Fix:** Regex-based escaping + tagged template literals
```typescript
// ✅ WORKS in Node.js + Auto-escaping
export function html(strings: TemplateStringsArray, ...values: unknown[]): string {
    let result = strings[0];
    for (let i = 0; i < values.length; i++) {
        result += escapeHtml(String(values[i])) + strings[i + 1];
    }
    return result;
}

export function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
```

### 2. Use Cases Return ViewModels (Clean-Guardian Critical Issue)

**v1 Problem:** Panels injected mappers and performed mapping (orchestration logic in Presentation layer)
```typescript
// ❌ WRONG - Panel doing Application layer work
constructor(private mapper: EnvironmentViewModelMapper) {}

const environment = await this.loadEnvironmentUseCase.execute({ id });
const viewModel = this.mapper.toViewModel(environment);  // Panels shouldn't map!
```

**v2 Fix:** Use Cases return ViewModels directly
```typescript
// ✅ CORRECT - Use Case does mapping (Application layer)
export class LoadEnvironmentByIdUseCase {
    constructor(
        private repository: IEnvironmentRepository,
        private mapper: EnvironmentViewModelMapper
    ) {}

    async execute(request: { environmentId: string }): Promise<EnvironmentSetupViewModel> {
        const environment = await this.repository.getById(request.environmentId);
        return this.mapper.toViewModel(environment);  // Mapping in Application layer
    }
}

// ✅ Panel just receives ViewModel (Presentation layer)
const viewModel = await this.loadEnvironmentUseCase.execute({ environmentId });
```

### 3. Shared Components Location (Clean-Guardian Critical Issue)

**v1 Problem:** `src/core/presentation/components/` creates horizontal feature coupling
```
❌ src/core/presentation/components/  ← Features depend on core, violates feature independence
```

**v2 Fix:** Move to infrastructure layer
```
✅ src/infrastructure/ui/components/  ← Infrastructure dependency (proper Clean Architecture)
✅ src/infrastructure/ui/views/
```

### 4. Tagged Template Literals (TypeScript-Pro Must-Have)

**v1 Problem:** Easy to forget HTML escaping
```typescript
// ❌ Vulnerable to XSS
return `<div>${props.label}</div>`;
```

**v2 Fix:** Automatic escaping via tagged template
```typescript
// ✅ Auto-escaped
import { html } from '@infrastructure/ui/utils/HtmlUtils';

return html`<div>${props.label}</div>`;  // Auto-escaped!
```

### 5. Runtime Type Guards (TypeScript-Pro Must-Have)

**v1 Problem:** Unsafe type casting of webview messages
```typescript
// ❌ Unsafe - no runtime validation
const data = message.data as EnvironmentSetupViewModel;
```

**v2 Fix:** Runtime validation with type guards
```typescript
// ✅ Runtime validation
export function isSaveEnvironmentMessage(message: unknown): message is SaveEnvironmentMessage {
    return (
        typeof message === 'object' &&
        message !== null &&
        'command' in message &&
        message.command === 'save' &&
        'data' in message &&
        typeof message.data === 'object'
    );
}

// Usage
if (isSaveEnvironmentMessage(message)) {
    const data = message.data;  // Type-safe!
}
```

### 6. Pure Functions Instead of Static Classes (Clean-Guardian Recommendation)

**v1 Problem:** Static classes are heavier than needed
```typescript
// ❌ Verbose
export class FormFieldView {
    static render(props: FormFieldViewProps): string { }
}
```

**v2 Fix:** Pure functions
```typescript
// ✅ Simpler, more idiomatic TypeScript
export function renderFormField(props: FormFieldViewProps): string { }
```

---

## Directory Structure (v2)

```
src/
├── infrastructure/
│   ├── ui/                           # 🆕 Shared UI components (NOT in core/)
│   │   ├── components/               # Component classes
│   │   │   ├── BaseComponent.ts
│   │   │   ├── FormFieldComponent.ts
│   │   │   ├── ButtonComponent.ts
│   │   │   └── SelectComponent.ts
│   │   │
│   │   ├── views/                    # Pure view functions
│   │   │   ├── formField.ts         # renderFormField()
│   │   │   ├── button.ts            # renderButton()
│   │   │   ├── select.ts            # renderSelect()
│   │   │   └── section.ts           # renderSection()
│   │   │
│   │   ├── utils/                    # 🆕 HTML utilities
│   │   │   ├── HtmlUtils.ts         # html``, escapeHtml()
│   │   │   └── TypeGuards.ts        # Runtime validation
│   │   │
│   │   └── README.md                 # Usage guide
│   │
│   ├── api/
│   ├── logging/
│   └── auth/
│
├── core/
│   └── presentation/
│       ├── panels/
│       │   └── BasePanel.ts
│       └── components/
│           └── BaseComponent.ts      # Base class only (no shared UI components)
│
├── features/
│   └── environmentSetup/
│       ├── domain/
│       │   └── entities/
│       │       └── Environment.ts
│       │
│       ├── application/
│       │   ├── viewModels/           # ViewModels in Application layer
│       │   │   └── EnvironmentSetupViewModel.ts
│       │   │
│       │   ├── mappers/
│       │   │   └── EnvironmentViewModelMapper.ts
│       │   │
│       │   └── useCases/
│       │       └── LoadEnvironmentByIdUseCase.ts  # 🆕 Returns ViewModel
│       │
│       └── presentation/
│           ├── panels/
│           │   └── EnvironmentSetupPanel.ts      # 🆕 No mapper injection
│           │
│           ├── components/           # Feature-specific components (if needed)
│           │   └── AuthMethodSelectorComponent.ts
│           │
│           └── views/                # Feature-specific views (pure functions)
│               ├── environmentSetup.ts  # renderEnvironmentSetup()
│               └── authMethodSelector.ts
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
        ├── behaviors/                # Client-side behaviors
        │   ├── BaseBehavior.js
        │   └── FormValidationBehavior.js
        │
        └── utils/
            └── ComponentUtils.js
```

**Key Changes:**
- 🆕 `infrastructure/ui/` - Shared UI components (NOT `core/presentation/`)
- 🆕 `infrastructure/ui/utils/` - HTML escaping and type guards
- 🆕 Use Cases return ViewModels
- 🆕 Views are functions (not static classes)

---

## Architecture Layers (v2)

### 1. Application Layer: ViewModels & Use Cases Return ViewModels

**Location:** `features/{feature}/application/viewModels/`

**Responsibility:** Define presentation DTOs, Use Cases return ViewModels

```typescript
// features/environmentSetup/application/viewModels/EnvironmentSetupViewModel.ts
export interface EnvironmentSetupViewModel {
    name: string;
    dataverseUrl: string;
    tenantId: string;
    authenticationMethod: 'Interactive' | 'ServicePrincipal' | 'UsernamePassword' | 'DeviceCode';
    publicClientId: string;

    // 🆕 Rich ViewModels with pre-computed display values
    authenticationMethodLabel: string;
    isServicePrincipalAuth: boolean;
    isUsernamePasswordAuth: boolean;
}
```

**🆕 Use Cases Return ViewModels:**

```typescript
// features/environmentSetup/application/useCases/LoadEnvironmentByIdUseCase.ts
export interface LoadEnvironmentByIdRequest {
    environmentId: string;
}

export class LoadEnvironmentByIdUseCase {
    constructor(
        private repository: IEnvironmentRepository,
        private mapper: EnvironmentViewModelMapper
    ) {}

    async execute(request: LoadEnvironmentByIdRequest): Promise<EnvironmentSetupViewModel> {
        // Load domain entity
        const environment = await this.repository.getById(request.environmentId);

        if (!environment) {
            throw new DomainError(`Environment not found: ${request.environmentId}`);
        }

        // Map to ViewModel HERE (Application layer responsibility)
        return this.mapper.toViewModel(environment);
    }
}
```

**Why Application Layer?**
- ✅ ViewModels are DTOs for presentation layer
- ✅ Application layer orchestrates domain → presentation mapping
- ✅ Keeps presentation layer focused on rendering only
- ✅ Use Cases encapsulate mapping logic

---

### 2. Infrastructure Layer: Shared UI Components & Views

**Location:** `infrastructure/ui/views/` (pure functions)

**Responsibility:** Pure functions that generate HTML from props

**🆕 Pure Functions (Not Static Classes):**

```typescript
// infrastructure/ui/views/formField.ts
import { html, escapeHtml } from '../utils/HtmlUtils';

export interface FormFieldProps {
    id: string;
    label: string;
    type: 'text' | 'email' | 'password' | 'number' | 'url';
    value?: string;
    placeholder?: string;
    helpText?: string;
    required?: boolean;
}

/**
 * Renders a form field with label, input, and optional help text.
 *
 * @param props - Form field configuration
 * @returns HTML string with auto-escaped values
 */
export function renderFormField(props: FormFieldProps): string {
    const requiredAttr = props.required ? 'required' : '';
    const valueAttr = props.value ? `value="${escapeHtml(props.value)}"` : '';
    const placeholderAttr = props.placeholder ? `placeholder="${escapeHtml(props.placeholder)}"` : '';

    // 🆕 Using tagged template literal for auto-escaping
    return html`
        <div class="form-group">
            <label for="${props.id}">
                ${props.label}${props.required ? ' *' : ''}
            </label>
            <input
                type="${props.type}"
                id="${props.id}"
                name="${props.id}"
                ${placeholderAttr}
                ${valueAttr}
                ${requiredAttr}
            >
            ${props.helpText ? html`<span class="help-text">${props.helpText}</span>` : ''}
        </div>
    `;
}
```

**🆕 HTML Utilities with Auto-Escaping:**

```typescript
// infrastructure/ui/utils/HtmlUtils.ts

/**
 * Tagged template literal for HTML with automatic escaping.
 *
 * @example
 * html`<div>${userInput}</div>`  // Auto-escaped
 */
export function html(strings: TemplateStringsArray, ...values: unknown[]): string {
    let result = strings[0];
    for (let i = 0; i < values.length; i++) {
        result += escapeHtml(String(values[i])) + strings[i + 1];
    }
    return result;
}

/**
 * Escapes HTML special characters to prevent XSS attacks.
 * Works in Node.js Extension Host context.
 */
export function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Escapes HTML attribute values.
 */
export function escapeAttribute(text: string): string {
    return escapeHtml(text);
}

/**
 * For trusted HTML that should NOT be escaped (use sparingly).
 *
 * @example
 * html`<div>${raw(trustedHtml)}</div>`
 */
export function raw(html: string): RawHtml {
    return { __html: html };
}

interface RawHtml {
    __html: string;
}

// Enhanced html`` to support raw()
export function html(strings: TemplateStringsArray, ...values: unknown[]): string {
    let result = strings[0];
    for (let i = 0; i < values.length; i++) {
        const value = values[i];
        if (isRawHtml(value)) {
            result += value.__html;  // Don't escape raw HTML
        } else {
            result += escapeHtml(String(value));
        }
        result += strings[i + 1];
    }
    return result;
}

function isRawHtml(value: unknown): value is RawHtml {
    return typeof value === 'object' && value !== null && '__html' in value;
}
```

**Key Characteristics:**
- ✅ Pure functions (no side effects)
- ✅ Type-safe props
- ✅ Automatic HTML escaping via `html``
- ✅ Easy to test (input → output)
- ✅ Works in Node.js Extension Host

---

### 3. Infrastructure Layer: Runtime Type Guards

**Location:** `infrastructure/ui/utils/TypeGuards.ts`

**Responsibility:** Runtime validation for webview messages

```typescript
// infrastructure/ui/utils/TypeGuards.ts

/**
 * Base message structure from webview.
 */
export interface WebviewMessage<T = unknown> {
    command: string;
    data: T;
}

/**
 * Type guard for webview messages.
 */
export function isWebviewMessage(message: unknown): message is WebviewMessage {
    return (
        typeof message === 'object' &&
        message !== null &&
        'command' in message &&
        typeof (message as WebviewMessage).command === 'string'
    );
}

/**
 * Save environment message from webview.
 */
export interface SaveEnvironmentMessage {
    command: 'save';
    data: {
        name: string;
        dataverseUrl: string;
        tenantId: string;
        authenticationMethod: string;
        publicClientId: string;
    };
}

/**
 * Type guard for save environment message.
 */
export function isSaveEnvironmentMessage(message: unknown): message is SaveEnvironmentMessage {
    if (!isWebviewMessage(message)) {
        return false;
    }

    if (message.command !== 'save') {
        return false;
    }

    const data = message.data;
    return (
        typeof data === 'object' &&
        data !== null &&
        'name' in data &&
        typeof data.name === 'string' &&
        'dataverseUrl' in data &&
        typeof data.dataverseUrl === 'string' &&
        'tenantId' in data &&
        typeof data.tenantId === 'string' &&
        'authenticationMethod' in data &&
        typeof data.authenticationMethod === 'string' &&
        'publicClientId' in data &&
        typeof data.publicClientId === 'string'
    );
}

/**
 * Test connection message from webview.
 */
export interface TestConnectionMessage {
    command: 'test';
}

export function isTestConnectionMessage(message: unknown): message is TestConnectionMessage {
    return isWebviewMessage(message) && message.command === 'test';
}
```

**Usage in Panel:**

```typescript
// Panel message handler
private handleWebviewMessage(message: unknown): void {
    if (isSaveEnvironmentMessage(message)) {
        // Type-safe: message.data is correctly typed
        await this.handleSave(message.data);
    } else if (isTestConnectionMessage(message)) {
        await this.handleTest();
    } else {
        this.logger.warn('Unknown message type', message);
    }
}
```

---

### 4. Presentation Layer: Panels (Orchestration Only)

**Location:** `features/{feature}/presentation/panels/`

**Responsibility:** Orchestrate use cases, render ViewModels (NO MAPPING)

**🆕 No Mapper Injection, Use Cases Return ViewModels:**

```typescript
// features/environmentSetup/presentation/panels/EnvironmentSetupPanel.ts
import { BasePanel } from '@core/presentation/panels/BasePanel';
import { LoadEnvironmentByIdUseCase } from '../../application/useCases/LoadEnvironmentByIdUseCase';
import { SaveEnvironmentUseCase } from '../../application/useCases/SaveEnvironmentUseCase';
import { renderEnvironmentSetup } from '../views/environmentSetup';
import { isSaveEnvironmentMessage, isTestConnectionMessage } from '@infrastructure/ui/utils/TypeGuards';

export class EnvironmentSetupPanel extends BasePanel {
    constructor(
        extensionUri: vscode.Uri,
        private loadEnvironmentUseCase: LoadEnvironmentByIdUseCase,  // ✅ Returns ViewModel
        private saveEnvironmentUseCase: SaveEnvironmentUseCase       // ✅ Accepts ViewModel
        // ❌ NO mapper injection!
    ) {
        super(extensionUri);
    }

    protected async initialize(): Promise<void> {
        // ✅ Use Case returns ViewModel directly
        const viewModel = await this.loadEnvironmentUseCase.execute({
            environmentId: this.environmentId
        });

        // ✅ Render with ViewModel (pure function)
        const html = renderEnvironmentSetup(viewModel, this.getResourceUris());

        // Set webview HTML
        this.panel.webview.html = html;

        // Setup message handler
        this.panel.webview.onDidReceiveMessage(
            message => this.handleWebviewMessage(message),
            undefined,
            this.disposables
        );
    }

    private async handleWebviewMessage(message: unknown): Promise<void> {
        // ✅ Runtime type validation
        if (isSaveEnvironmentMessage(message)) {
            await this.handleSave(message.data);
        } else if (isTestConnectionMessage(message)) {
            await this.handleTest();
        }
    }

    private async handleSave(data: SaveEnvironmentMessage['data']): Promise<void> {
        try {
            // ✅ Use Case handles mapping internally
            await this.saveEnvironmentUseCase.execute({
                name: data.name,
                dataverseUrl: data.dataverseUrl,
                tenantId: data.tenantId,
                authenticationMethod: data.authenticationMethod,
                publicClientId: data.publicClientId
            });

            vscode.window.showInformationMessage('Environment saved successfully');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to save: ${error.message}`);
        }
    }
}
```

**Key Characteristics:**
- ✅ Calls use cases (no business logic)
- ✅ NO mapping (Use Cases return ViewModels)
- ✅ Delegates HTML generation to pure functions
- ✅ Runtime type validation for messages
- ✅ Handles webview lifecycle

---

### 5. Presentation Layer: Feature Views (Composition)

**Location:** `features/{feature}/presentation/views/`

**Responsibility:** Compose shared views into feature-specific layouts

**🆕 Pure Functions (Not Static Classes):**

```typescript
// features/environmentSetup/presentation/views/environmentSetup.ts
import { html, raw } from '@infrastructure/ui/utils/HtmlUtils';
import { renderFormField } from '@infrastructure/ui/views/formField';
import { renderButton } from '@infrastructure/ui/views/button';
import { renderSelect } from '@infrastructure/ui/views/select';
import { renderSection } from '@infrastructure/ui/views/section';
import { EnvironmentSetupViewModel } from '../../application/viewModels/EnvironmentSetupViewModel';

interface ResourceUris {
    styleUri: string;
    scriptUri: string;
}

/**
 * Renders the complete Environment Setup panel.
 */
export function renderEnvironmentSetup(
    viewModel: EnvironmentSetupViewModel,
    resources: ResourceUris
): string {
    return html`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link href="${resources.styleUri}" rel="stylesheet">
            <title>Environment Setup</title>
        </head>
        <body>
            <div class="container">
                ${raw(renderHeader())}
                ${raw(renderForm(viewModel))}
            </div>
            <script src="${resources.scriptUri}"></script>
        </body>
        </html>
    `;
}

function renderHeader(): string {
    return html`
        <div class="header">
            <h1>Environment Setup</h1>
            <div class="button-group">
                ${raw(renderButton({ id: 'saveButton', text: 'Save Environment', variant: 'primary' }))}
                ${raw(renderButton({ id: 'testButton', text: 'Test Connection', variant: 'secondary' }))}
            </div>
        </div>
    `;
}

function renderForm(viewModel: EnvironmentSetupViewModel): string {
    return html`
        <form id="environmentForm">
            ${raw(renderSection({
                title: 'Basic Information',
                content: renderBasicInfo(viewModel)
            }))}
            ${raw(renderSection({
                title: 'Authentication',
                content: renderAuthentication(viewModel)
            }))}
        </form>
    `;
}

function renderBasicInfo(viewModel: EnvironmentSetupViewModel): string {
    return html`
        ${raw(renderFormField({
            id: 'name',
            label: 'Environment Name',
            type: 'text',
            value: viewModel.name,
            placeholder: 'e.g., DEV',
            helpText: 'A friendly name to identify this environment',
            required: true
        }))}
        ${raw(renderFormField({
            id: 'dataverseUrl',
            label: 'Dataverse URL',
            type: 'url',
            value: viewModel.dataverseUrl,
            placeholder: 'https://org.crm.dynamics.com',
            helpText: 'The URL of your Dataverse organization',
            required: true
        }))}
    `;
}

function renderAuthentication(viewModel: EnvironmentSetupViewModel): string {
    return html`
        ${raw(renderFormField({
            id: 'tenantId',
            label: 'Tenant ID',
            type: 'text',
            value: viewModel.tenantId,
            placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
            helpText: 'Your Azure AD tenant ID',
            required: true
        }))}
        ${raw(renderSelect({
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
        }))}
        ${raw(renderFormField({
            id: 'publicClientId',
            label: 'Public Client ID',
            type: 'text',
            value: viewModel.publicClientId,
            placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
            helpText: 'Application (client) ID for Interactive/DeviceCode flows',
            required: true
        }))}

        ${viewModel.isServicePrincipalAuth ? raw(renderServicePrincipalFields()) : ''}
        ${viewModel.isUsernamePasswordAuth ? raw(renderUsernamePasswordFields()) : ''}
    `;
}

function renderServicePrincipalFields(): string {
    return html`
        <div class="conditional-field" data-auth-method="ServicePrincipal">
            ${raw(renderFormField({
                id: 'clientId',
                label: 'Client ID',
                type: 'text',
                placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
                helpText: 'Application ID for service principal',
                required: true
            }))}
            ${raw(renderFormField({
                id: 'clientSecret',
                label: 'Client Secret',
                type: 'password',
                placeholder: 'Enter client secret',
                helpText: 'Secret value (stored securely)',
                required: true
            }))}
        </div>
    `;
}

function renderUsernamePasswordFields(): string {
    return html`
        <div class="conditional-field" data-auth-method="UsernamePassword">
            ${raw(renderFormField({
                id: 'username',
                label: 'Username',
                type: 'text',
                placeholder: 'user@domain.com',
                helpText: 'Dataverse username',
                required: true
            }))}
            ${raw(renderFormField({
                id: 'password',
                label: 'Password',
                type: 'password',
                placeholder: 'Enter password',
                helpText: 'Password (stored securely)',
                required: true
            }))}
        </div>
    `;
}
```

**Key Characteristics:**
- ✅ Pure functions (not static classes)
- ✅ Composes shared views (`renderFormField`, etc.)
- ✅ Uses `html`` for auto-escaping
- ✅ Uses `raw()` for trusted HTML from other views
- ✅ Conditional rendering based on ViewModel

---

### 6. Client-Side Behaviors (JavaScript)

**Location:** `resources/webview/js/behaviors/`

**Responsibility:** Client-side interactivity, DOM manipulation, message passing

```javascript
// resources/webview/js/behaviors/FormValidationBehavior.js
(function() {
    const vscode = acquireVsCodeApi();

    // Form submission
    const form = document.getElementById('environmentForm');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();

            if (!validateForm()) {
                return;
            }

            const formData = new FormData(form);
            const data = Object.fromEntries(formData);

            // Send to extension host
            vscode.postMessage({
                command: 'save',
                data: data
            });
        });
    }

    // Real-time validation
    const nameInput = document.getElementById('name');
    if (nameInput) {
        nameInput.addEventListener('blur', () => {
            validateField(nameInput, (value) => {
                if (!value.trim()) {
                    return 'Name is required';
                }
                return null;
            });
        });
    }

    const urlInput = document.getElementById('dataverseUrl');
    if (urlInput) {
        urlInput.addEventListener('blur', () => {
            validateField(urlInput, (value) => {
                if (!value.trim()) {
                    return 'Dataverse URL is required';
                }
                if (!value.startsWith('https://')) {
                    return 'URL must start with https://';
                }
                return null;
            });
        });
    }

    // Conditional field visibility
    const authMethodSelect = document.getElementById('authenticationMethod');
    if (authMethodSelect) {
        authMethodSelect.addEventListener('change', () => {
            updateConditionalFields(authMethodSelect.value);
        });

        // Initialize
        updateConditionalFields(authMethodSelect.value);
    }

    function validateForm() {
        let isValid = true;
        const requiredFields = form.querySelectorAll('[required]');

        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                showError(field, `${field.labels[0].textContent} is required`);
                isValid = false;
            }
        });

        return isValid;
    }

    function validateField(element, validator) {
        const error = validator(element.value);
        if (error) {
            showError(element, error);
            return false;
        } else {
            clearError(element);
            return true;
        }
    }

    function showError(element, message) {
        clearError(element);

        const errorDiv = document.createElement('div');
        errorDiv.className = 'validation-error';
        errorDiv.textContent = message;
        element.parentElement.appendChild(errorDiv);
        element.classList.add('invalid');
    }

    function clearError(element) {
        const error = element.parentElement.querySelector('.validation-error');
        if (error) {
            error.remove();
        }
        element.classList.remove('invalid');
    }

    function updateConditionalFields(authMethod) {
        const allConditionalFields = document.querySelectorAll('.conditional-field');
        allConditionalFields.forEach(field => {
            field.style.display = 'none';
        });

        const activeFields = document.querySelectorAll(`[data-auth-method="${authMethod}"]`);
        activeFields.forEach(field => {
            field.style.display = 'block';
        });
    }
})();
```

---

## Shared Component Library (v2)

### Core Components in infrastructure/ui/

**🆕 Location:** `infrastructure/ui/views/` and `infrastructure/ui/components/`

Create reusable components:

1. **formField.ts** - `renderFormField()` - Text inputs, textareas
2. **select.ts** - `renderSelect()` - Dropdowns
3. **button.ts** - `renderButton()` - Buttons with variants
4. **section.ts** - `renderSection()` - Collapsible sections
5. **checkbox.ts** - `renderCheckbox()` - Checkboxes
6. **radioGroup.ts** - `renderRadioGroup()` - Radio button groups
7. **dataTable.ts** - `renderDataTable()` - Data grids
8. **statusBadge.ts** - `renderStatusBadge()` - Status indicators
9. **validationMessage.ts** - `renderValidationMessage()` - Error/warning messages
10. **loadingSpinner.ts** - `renderLoadingSpinner()` - Loading states

Each component has:
- ✅ Pure function (not static class)
- ✅ Props interface with JSDoc
- ✅ CSS file in `resources/webview/css/components/`
- ✅ Behavior (if needed) in `resources/webview/js/behaviors/`
- ✅ Unit tests

**Example: Button Component**

```typescript
// infrastructure/ui/views/button.ts
import { html, escapeHtml } from '../utils/HtmlUtils';

export interface ButtonProps {
    id: string;
    text: string;
    variant?: 'primary' | 'secondary' | 'danger';
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
}

/**
 * Renders a button with variant styles.
 *
 * @param props - Button configuration
 * @returns HTML string for button element
 */
export function renderButton(props: ButtonProps): string {
    const variant = props.variant || 'primary';
    const type = props.type || 'button';
    const disabledAttr = props.disabled ? 'disabled' : '';

    return html`
        <button
            id="${props.id}"
            class="button ${variant}"
            type="${type}"
            ${disabledAttr}
        >
            ${props.text}
        </button>
    `;
}
```

---

## Type Safety Strategy (v2)

### 1. Type-Safe Props with JSDoc

Every view function has a props interface with JSDoc:

```typescript
export interface FormFieldProps {
    /** Unique identifier for the input element */
    id: string;
    /** Label text displayed above the input */
    label: string;
    /** Input type (text, email, password, etc.) */
    type: 'text' | 'email' | 'password' | 'number' | 'url';
    /** Current value of the input */
    value?: string;
    /** Placeholder text shown when input is empty */
    placeholder?: string;
    /** Help text displayed below the input */
    helpText?: string;
    /** Whether the field is required */
    required?: boolean;
}

/**
 * Renders a form field with label, input, and optional help text.
 *
 * @param props - Form field configuration
 * @returns HTML string with auto-escaped values
 *
 * @example
 * renderFormField({
 *   id: 'email',
 *   label: 'Email Address',
 *   type: 'email',
 *   required: true
 * })
 */
export function renderFormField(props: FormFieldProps): string { }
```

### 2. Type-Safe ViewModels (Rich with Display Logic)

ViewModels are strongly typed interfaces with pre-computed display values:

```typescript
export interface EnvironmentSetupViewModel {
    // Raw data
    name: string;
    dataverseUrl: string;
    tenantId: string;
    authenticationMethod: 'Interactive' | 'ServicePrincipal' | 'UsernamePassword' | 'DeviceCode';
    publicClientId: string;

    // 🆕 Pre-computed display values (NO logic in views)
    authenticationMethodLabel: string;
    isServicePrincipalAuth: boolean;
    isUsernamePasswordAuth: boolean;
    isInteractiveAuth: boolean;
    isDeviceCodeAuth: boolean;
}
```

### 3. Type-Safe Mapping in Use Cases

Mappers used internally by Use Cases:

```typescript
export class EnvironmentViewModelMapper {
    toViewModel(environment: Environment): EnvironmentSetupViewModel {
        const authMethod = environment.authenticationMethod.value;

        return {
            name: environment.name.value,
            dataverseUrl: environment.dataverseUrl.value,
            tenantId: environment.tenantId.value,
            authenticationMethod: authMethod,
            publicClientId: environment.publicClientId.value,

            // Pre-compute display values
            authenticationMethodLabel: this.getAuthMethodLabel(authMethod),
            isServicePrincipalAuth: authMethod === 'ServicePrincipal',
            isUsernamePasswordAuth: authMethod === 'UsernamePassword',
            isInteractiveAuth: authMethod === 'Interactive',
            isDeviceCodeAuth: authMethod === 'DeviceCode'
        };
    }

    private getAuthMethodLabel(method: string): string {
        const labels: Record<string, string> = {
            'Interactive': 'Interactive (Browser)',
            'ServicePrincipal': 'Service Principal (Client Secret)',
            'UsernamePassword': 'Username/Password',
            'DeviceCode': 'Device Code'
        };
        return labels[method] || method;
    }
}
```

### 4. Automatic HTML Escaping

All views use `html`` tagged template or `escapeHtml()`:

```typescript
// ✅ Auto-escaped via tagged template
import { html } from '@infrastructure/ui/utils/HtmlUtils';

export function renderFormField(props: FormFieldProps): string {
    return html`
        <div class="form-group">
            <label>${props.label}</label>
            <input value="${props.value}">
        </div>
    `;
}

// ✅ Manual escaping for attributes
import { escapeHtml } from '@infrastructure/ui/utils/HtmlUtils';

const valueAttr = props.value ? `value="${escapeHtml(props.value)}"` : '';
```

### 5. Runtime Type Guards for Webview Messages

```typescript
// ✅ Type-safe message handling
if (isSaveEnvironmentMessage(message)) {
    // message.data is correctly typed
    await this.handleSave(message.data);
}
```

---

## Migration Path (v2)

### Phase 1: Create Infrastructure UI Layer (Week 1)

1. Create `infrastructure/ui/` directory structure
2. Implement `HtmlUtils.ts` with `html``tagged template and `escapeHtml()`
3. Implement `TypeGuards.ts` with webview message guards
4. Write unit tests for utilities

### Phase 2: Build Shared Components (Week 1-2)

1. Implement core view functions:
   - `renderFormField()`
   - `renderButton()`
   - `renderSelect()`
   - `renderSection()`
2. Create corresponding CSS files in `resources/webview/css/components/`
3. Write unit tests for each view function

### Phase 3: Update Use Cases to Return ViewModels (Week 2)

1. Refactor `LoadEnvironmentByIdUseCase` to return ViewModel
2. Move mapper injection from Panel to Use Case
3. Update all Use Cases to follow pattern
4. Test Use Cases return correct ViewModels

### Phase 4: Refactor EnvironmentSetupPanel (Week 2-3)

1. Remove mapper from Panel constructor
2. Update Panel to receive ViewModels from Use Cases
3. Create `environmentSetup.ts` view function
4. Extract client-side logic to `FormValidationBehavior.js`
5. Add runtime type guards for message handling
6. Test thoroughly

### Phase 5: Update Documentation (Week 3)

1. Update `DIRECTORY_STRUCTURE_GUIDE.md` with `infrastructure/ui/`
2. Document view function pattern (not static classes)
3. Add examples of `html`` usage
4. Document runtime type guard pattern
5. Create ADR for architectural decisions

### Phase 6: Apply to Future Panels (Week 4+)

1. Use pattern for Plugin Registration panel
2. Use pattern for Solution Explorer panel
3. Refine component library as needed
4. Add more shared components based on usage

---

## Testing Strategy (v2)

### View Testing (Pure Functions)

```typescript
import { renderFormField } from '@infrastructure/ui/views/formField';

describe('renderFormField', () => {
    it('should render text input with label', () => {
        const html = renderFormField({
            id: 'name',
            label: 'Name',
            type: 'text',
            required: true
        });

        expect(html).toContain('<label for="name">Name *</label>');
        expect(html).toContain('<input type="text" id="name"');
        expect(html).toContain('required');
    });

    it('should escape HTML in label to prevent XSS', () => {
        const html = renderFormField({
            id: 'name',
            label: '<script>alert("xss")</script>',
            type: 'text'
        });

        expect(html).not.toContain('<script>');
        expect(html).toContain('&lt;script&gt;');
    });

    it('should escape HTML in value to prevent XSS', () => {
        const html = renderFormField({
            id: 'name',
            label: 'Name',
            type: 'text',
            value: '"><script>alert("xss")</script>'
        });

        expect(html).not.toContain('<script>');
        expect(html).toContain('&quot;&gt;&lt;script&gt;');
    });
});
```

### HTML Escaping Testing

```typescript
import { html, escapeHtml, raw } from '@infrastructure/ui/utils/HtmlUtils';

describe('HtmlUtils', () => {
    describe('escapeHtml', () => {
        it('should escape HTML special characters', () => {
            expect(escapeHtml('<script>alert("xss")</script>'))
                .toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
        });

        it('should escape ampersands', () => {
            expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
        });

        it('should escape quotes', () => {
            expect(escapeHtml('He said "hello"')).toBe('He said &quot;hello&quot;');
            expect(escapeHtml("It's working")).toBe('It&#39;s working');
        });
    });

    describe('html tagged template', () => {
        it('should auto-escape interpolated values', () => {
            const userInput = '<script>alert("xss")</script>';
            const result = html`<div>${userInput}</div>`;

            expect(result).not.toContain('<script>');
            expect(result).toContain('&lt;script&gt;');
        });

        it('should not escape raw HTML', () => {
            const trustedHtml = '<b>Bold</b>';
            const result = html`<div>${raw(trustedHtml)}</div>`;

            expect(result).toContain('<b>Bold</b>');
        });
    });
});
```

### Runtime Type Guard Testing

```typescript
import { isSaveEnvironmentMessage, isWebviewMessage } from '@infrastructure/ui/utils/TypeGuards';

describe('TypeGuards', () => {
    describe('isWebviewMessage', () => {
        it('should return true for valid webview message', () => {
            const message = { command: 'save', data: {} };
            expect(isWebviewMessage(message)).toBe(true);
        });

        it('should return false for invalid message', () => {
            expect(isWebviewMessage(null)).toBe(false);
            expect(isWebviewMessage(undefined)).toBe(false);
            expect(isWebviewMessage('string')).toBe(false);
            expect(isWebviewMessage({})).toBe(false);
        });
    });

    describe('isSaveEnvironmentMessage', () => {
        it('should return true for valid save message', () => {
            const message = {
                command: 'save',
                data: {
                    name: 'DEV',
                    dataverseUrl: 'https://org.crm.dynamics.com',
                    tenantId: 'xxx',
                    authenticationMethod: 'Interactive',
                    publicClientId: 'yyy'
                }
            };
            expect(isSaveEnvironmentMessage(message)).toBe(true);
        });

        it('should return false for invalid save message', () => {
            const message = {
                command: 'save',
                data: { name: 'DEV' }  // Missing required fields
            };
            expect(isSaveEnvironmentMessage(message)).toBe(false);
        });
    });
});
```

### Use Case Testing (Returns ViewModels)

```typescript
import { LoadEnvironmentByIdUseCase } from '@features/environmentSetup/application/useCases/LoadEnvironmentByIdUseCase';

describe('LoadEnvironmentByIdUseCase', () => {
    it('should return ViewModel with mapped data', async () => {
        const mockRepository = {
            getById: jest.fn().mockResolvedValue(mockEnvironment)
        };
        const useCase = new LoadEnvironmentByIdUseCase(mockRepository, new EnvironmentViewModelMapper());

        const viewModel = await useCase.execute({ environmentId: '123' });

        expect(viewModel.name).toBe('DEV');
        expect(viewModel.authenticationMethodLabel).toBe('Interactive (Browser)');
        expect(viewModel.isInteractiveAuth).toBe(true);
    });

    it('should throw error if environment not found', async () => {
        const mockRepository = {
            getById: jest.fn().mockResolvedValue(null)
        };
        const useCase = new LoadEnvironmentByIdUseCase(mockRepository, new EnvironmentViewModelMapper());

        await expect(useCase.execute({ environmentId: '123' }))
            .rejects.toThrow('Environment not found');
    });
});
```

### Panel Integration Testing

```typescript
describe('EnvironmentSetupPanel', () => {
    it('should render form with ViewModel data from Use Case', async () => {
        const mockUseCase = {
            execute: jest.fn().mockResolvedValue(mockViewModel)
        };
        const panel = new EnvironmentSetupPanel(mockExtensionUri, mockUseCase, mockSaveUseCase);

        await panel.show();

        expect(panel.webview.html).toContain('Environment Setup');
        expect(panel.webview.html).toContain('name="name"');
        expect(panel.webview.html).toContain('value="DEV"');
    });

    it('should handle save message with type guard', async () => {
        const mockSaveUseCase = {
            execute: jest.fn().mockResolvedValue(undefined)
        };
        const panel = new EnvironmentSetupPanel(mockExtensionUri, mockLoadUseCase, mockSaveUseCase);

        const message = {
            command: 'save',
            data: {
                name: 'DEV',
                dataverseUrl: 'https://org.crm.dynamics.com',
                tenantId: 'xxx',
                authenticationMethod: 'Interactive',
                publicClientId: 'yyy'
            }
        };

        await panel['handleWebviewMessage'](message);

        expect(mockSaveUseCase.execute).toHaveBeenCalledWith(message.data);
    });
});
```

---

## Enforcement Mechanisms (v2)

### 1. ESLint Rules

Prevent domain imports in presentation layer:

```javascript
// .eslintrc.js
module.exports = {
    rules: {
        'no-restricted-imports': ['error', {
            patterns: [
                {
                    group: ['**/domain/**'],
                    message: 'Presentation layer should not import from domain layer directly. Use ViewModels from application layer.'
                }
            ]
        }]
    }
};
```

### 2. TypeScript Path Aliases

```json
// tsconfig.json
{
    "compilerOptions": {
        "paths": {
            "@domain/*": ["src/*/domain/*"],
            "@application/*": ["src/*/application/*"],
            "@presentation/*": ["src/*/presentation/*"],
            "@infrastructure/*": ["src/infrastructure/*"],
            "@core/*": ["src/core/*"]
        }
    }
}
```

### 3. Pre-commit Hooks

```bash
# .husky/pre-commit
npm run lint
npm run test:architecture
```

### 4. Architectural Tests

```typescript
// tests/architecture/layerDependencies.test.ts
import { checkDependencies } from 'dependency-cruiser';

describe('Architecture', () => {
    it('should not allow presentation to import from domain', () => {
        const result = checkDependencies({
            forbidden: [
                {
                    from: { path: '^src/.*/presentation' },
                    to: { path: '^src/.*/domain' }
                }
            ]
        });

        expect(result.violations).toHaveLength(0);
    });

    it('should not allow shared components in core/presentation', () => {
        const result = checkDependencies({
            forbidden: [
                {
                    from: { path: '^src/features' },
                    to: { path: '^src/core/presentation/components/(?!BaseComponent)' }
                }
            ]
        });

        expect(result.violations).toHaveLength(0);
    });
});
```

---

## Pros and Cons (v2)

### Pros

✅ **Architecturally Sound**
- ViewModels in Application layer (correct layering)
- Use Cases return ViewModels (no mapping in Presentation)
- Shared components in infrastructure (proper dependency)
- Clear separation of concerns (View/Component/Behavior)
- Proper dependency direction (inward)

✅ **Type-Safe**
- Full TypeScript inference
- Runtime type guards for webview messages
- Compile-time checking
- JSDoc for all public APIs

✅ **Secure**
- Automatic HTML escaping via `html``
- XSS protection enforced by default
- Manual escaping only when explicitly using `raw()`

✅ **Pragmatic**
- Pure functions (simpler than static classes)
- Works in Node.js Extension Host
- Easy to understand
- Leverages TypeScript strengths

✅ **Scalable**
- View functions scale to complex UIs
- Shared component library prevents duplication
- Feature-specific views for custom layouts

✅ **Testable**
- Pure view functions trivial to test
- Runtime type guards testable
- Use Cases testable (return ViewModels)
- Clear boundaries for integration tests

✅ **Maintainable**
- Single responsibility (each file has one job)
- Easy to locate code (predictable structure)
- Refactoring-friendly (pure functions)

### Cons

❌ **More Files**
- Separate view functions for each component
- More initial setup

❌ **HTML Still Strings**
- No editor syntax highlighting (though `html``helps)
- Template logic in TypeScript (not separate HTML files)

❌ **Learning Curve**
- Team needs to understand View/Component/Behavior pattern
- Need to learn `html`` tagged template usage
- More abstraction than inline HTML

❌ **Raw HTML Requires Care**
- Must use `raw()` for trusted HTML from other views
- Could be misused if not careful

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
- Harder to track view → template relationship
- No type safety between TypeScript and HTML
- Requires file reading at runtime
- Editor switching between files

### 4. Static View Classes (v1 Approach)

**Rejected because:**
- Heavier than needed
- Less idiomatic TypeScript
- Pure functions simpler and clearer

### 5. ViewModels in Presentation Layer

**Rejected because:**
- Violates Clean Architecture
- Application layer owns DTOs
- Makes testing harder

### 6. Shared Components in core/presentation/

**Rejected because:**
- Creates horizontal feature coupling
- Violates feature independence
- `core/` should be domain-agnostic base classes

---

## Decision Summary

### ✅ Approved Decisions

1. **ViewModels in Application Layer** - Correct Clean Architecture placement
2. **Use Cases Return ViewModels** - No mapping in Presentation layer
3. **Shared Components in infrastructure/ui/** - Proper infrastructure dependency
4. **Pure View Functions** - Simpler than static classes
5. **Tagged Template Literals** - Automatic XSS protection
6. **Runtime Type Guards** - Type-safe webview messages
7. **HTML as Strings** - Type safety over editor features

### 🔧 Implementation Requirements

1. **MUST:** Use `html`` tagged template for all HTML generation
2. **MUST:** Use runtime type guards for webview messages
3. **MUST:** Use Cases return ViewModels (Panels don't map)
4. **MUST:** Shared components in `infrastructure/ui/`
5. **MUST:** Views are pure functions (not classes)
6. **MUST:** Add ESLint rules to enforce layer boundaries

### 📝 Next Steps

1. ✅ **This Week:** Implement `infrastructure/ui/utils/` (HtmlUtils, TypeGuards)
2. ✅ **Week 2:** Build shared view functions (formField, button, select, section)
3. ✅ **Week 2-3:** Refactor EnvironmentSetupPanel using new pattern
4. ✅ **Week 3:** Update DIRECTORY_STRUCTURE_GUIDE.md
5. ✅ **Week 4+:** Apply to Plugin Registration and future panels

---

## Open Questions (Resolved in v2)

| Question | v1 | v2 Decision |
|----------|----|----|
| Should we extract HTML escaping to shared utility? | Open | ✅ YES - `infrastructure/ui/utils/HtmlUtils.ts` |
| Should Views be classes or functions? | Classes | ✅ Functions (simpler, more idiomatic) |
| Should we support template caching? | Open | ⏸️ DEFER until performance issue identified |
| Should we create CLI tool for scaffolding? | Open | ⏸️ DEFER until pattern stabilizes |
| Should we add JSDoc comments? | Open | ✅ YES - All public APIs |
| Where should shared components live? | `core/presentation/` | ✅ `infrastructure/ui/` |
| Should Panels map ViewModels? | Yes | ✅ NO - Use Cases return ViewModels |

---

## References

- TypeScript-Pro Recommendations: `docs/codereview/webview-architecture-typescript-pro.md`
- TypeScript-Pro Review of v1: `docs/codereview/webview-architecture-hybrid-typescript-pro-review.md`
- Clean-Guardian Recommendations: `docs/codereview/webview-architecture-clean-guardian.md`
- Clean-Guardian Review of v1: `docs/codereview/webview-architecture-hybrid-clean-guardian-review.md`
- Current Implementation: `src/features/environmentSetup/presentation/panels/EnvironmentSetupPanel.ts`
- Architecture Guide: `docs/ARCHITECTURE_GUIDE.md`
- Directory Structure Guide: `docs/DIRECTORY_STRUCTURE_GUIDE.md`
- Project Guidelines: `CLAUDE.md`
