# Webview Architecture: TypeScript-First Template System

> **Status:** Architecture Proposal
> **Author:** Claude (AI Assistant)
> **Date:** 2025-10-31
> **Target:** Power Platform Developer Suite

---

## Executive Summary

This document proposes a **TypeScript-first, component-based webview templating architecture** for VSCode extensions that scales from simple forms to complex multi-panel applications while maintaining Clean Architecture principles.

**Key Decision:** Use a **lightweight TypeScript template builder** with **tagged template literals** and **type-safe component composition** rather than heavyweight frameworks (React/Vue) or string concatenation.

**Why This Approach:**
- TypeScript-native with full type safety
- Zero runtime dependencies
- Minimal learning curve
- Clean Architecture compliant
- Scales to complex UIs
- Reusable component library
- Works seamlessly with VSCode webview constraints

---

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Recommended Architecture](#recommended-architecture)
3. [Type Safety Strategy](#type-safety-strategy)
4. [Directory Structure](#directory-structure)
5. [Component System Design](#component-system-design)
6. [Example Implementation](#example-implementation)
7. [Shared Components Library](#shared-components-library)
8. [Pros and Cons](#pros-and-cons)
9. [Migration Path](#migration-path)
10. [Advanced Patterns](#advanced-patterns)

---

## Problem Statement

### Current Issues

1. **345 lines of inline HTML strings** in EnvironmentSetupPanel.ts
2. **No component reusability** - every panel rebuilds common UI elements
3. **No type safety** - HTML strings are untyped, error-prone
4. **Poor maintainability** - string concatenation doesn't scale
5. **No separation of concerns** - HTML mixed with TypeScript logic

### Requirements

- ✅ Type-safe (TypeScript-friendly)
- ✅ Supports shared/reusable components
- ✅ Proper separation of concerns
- ✅ Scales to complex panels (forms, grids, wizards)
- ✅ Easy to maintain and extend
- ✅ Follows Clean Architecture principles
- ✅ Works with VSCode webview constraints (no React/Vue bundle overhead)

---

## Recommended Architecture

### Core Concept: TypeScript Template Builders

Use **TypeScript classes** as template builders with **tagged template literals** for HTML composition. This gives us:

1. **Type safety** - Full TypeScript inference
2. **Component reusability** - Classes can be extended and composed
3. **Clean Architecture** - Templates are infrastructure concerns
4. **Zero dependencies** - Pure TypeScript, no framework overhead
5. **IDE support** - Full autocomplete and type checking

### Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│ Presentation Layer (TypeScript - Extension Host)            │
├─────────────────────────────────────────────────────────────┤
│  Panels (EnvironmentSetupPanel.ts)                          │
│    ↓ uses                                                    │
│  Template Builders (EnvironmentSetupTemplateBuilder.ts)     │
│    ↓ composes                                                │
│  Component Templates (FormFieldTemplate, ButtonTemplate)    │
│    ↓ generates                                               │
│  HTML strings (sent to webview)                             │
└─────────────────────────────────────────────────────────────┘
                          ↓ postMessage
┌─────────────────────────────────────────────────────────────┐
│ Webview Layer (JavaScript - Separate Context)               │
├─────────────────────────────────────────────────────────────┤
│  HTML + CSS (rendered)                                       │
│  Behavior Scripts (*.Behavior.js)                            │
│    - Handle DOM events                                       │
│    - Manage client-side state                                │
│    - Send messages back to Extension Host                    │
└─────────────────────────────────────────────────────────────┘
```

### Key Design Patterns

1. **Builder Pattern** - Template builders construct complex HTML
2. **Composite Pattern** - Templates compose smaller templates
3. **Factory Pattern** - Template factory creates reusable instances
4. **Strategy Pattern** - Different rendering strategies for different panels

---

## Type Safety Strategy

### 1. Type-Safe Template Props

Every component template defines a TypeScript interface for its props:

```typescript
// Type-safe component props
interface FormFieldProps {
    id: string;
    name: string;
    label: string;
    type: 'text' | 'password' | 'email' | 'url';
    required: boolean;
    placeholder?: string;
    helpText?: string;
    value?: string;
    disabled?: boolean;
    className?: string;
}

// Type-safe template function
function renderFormField(props: FormFieldProps): string {
    // TypeScript enforces all required props
    // Autocomplete works for all props
    return `
        <div class="form-group ${props.className || ''}">
            <label for="${escapeHtml(props.id)}">
                ${escapeHtml(props.label)}
                ${props.required ? ' *' : ''}
            </label>
            <input
                type="${props.type}"
                id="${escapeHtml(props.id)}"
                name="${escapeHtml(props.name)}"
                ${props.required ? 'required' : ''}
                ${props.placeholder ? `placeholder="${escapeHtml(props.placeholder)}"` : ''}
                ${props.value ? `value="${escapeHtml(props.value)}"` : ''}
                ${props.disabled ? 'disabled' : ''}
            >
            ${props.helpText ? `<span class="help-text">${escapeHtml(props.helpText)}</span>` : ''}
        </div>
    `;
}
```

### 2. Type-Safe Data Binding

Use ViewModels to ensure type-safe data flow between TypeScript and HTML:

```typescript
// ViewModel (Application Layer)
interface EnvironmentFormViewModel {
    name: string;
    dataverseUrl: string;
    tenantId: string;
    authenticationMethod: 'Interactive' | 'ServicePrincipal' | 'UsernamePassword' | 'DeviceCode';
    publicClientId: string;
    powerPlatformEnvironmentId?: string;
    clientId?: string;
    username?: string;
    hasStoredClientSecret: boolean;
    hasStoredPassword: boolean;
    clientSecretPlaceholder?: string;
    passwordPlaceholder?: string;
}

// Type-safe template builder method
class EnvironmentSetupTemplateBuilder {
    renderForm(viewModel: EnvironmentFormViewModel): string {
        // TypeScript ensures viewModel has all required properties
        // Autocomplete works for viewModel properties
        return `
            ${renderFormField({
                id: 'name',
                name: 'name',
                label: 'Environment Name',
                type: 'text',
                required: true,
                placeholder: 'e.g., DEV',
                helpText: 'A friendly name to identify this environment',
                value: viewModel.name
            })}

            ${renderFormField({
                id: 'dataverseUrl',
                name: 'dataverseUrl',
                label: 'Dataverse URL',
                type: 'url',
                required: true,
                placeholder: 'https://org.crm.dynamics.com',
                helpText: 'The URL of your Dataverse organization',
                value: viewModel.dataverseUrl
            })}

            ${this.renderAuthMethodSelect(viewModel.authenticationMethod)}

            ${this.renderConditionalFields(viewModel)}
        `;
    }

    private renderAuthMethodSelect(selectedMethod: string): string {
        // Type-safe enum values
        const methods: Array<{ value: EnvironmentFormViewModel['authenticationMethod'], label: string }> = [
            { value: 'Interactive', label: 'Interactive (Browser)' },
            { value: 'ServicePrincipal', label: 'Service Principal (Client Secret)' },
            { value: 'UsernamePassword', label: 'Username/Password' },
            { value: 'DeviceCode', label: 'Device Code' }
        ];

        return renderSelect({
            id: 'authenticationMethod',
            name: 'authenticationMethod',
            label: 'Authentication Method',
            required: true,
            options: methods.map(m => ({ value: m.value, label: m.label })),
            selected: selectedMethod,
            helpText: 'Select how you want to authenticate to this environment'
        });
    }
}
```

### 3. Type-Safe Message Protocol

Define typed messages between Extension Host and Webview:

```typescript
// Shared type definitions (shared/types/WebviewMessage.ts)
type WebviewCommand =
    | 'save-environment'
    | 'test-connection'
    | 'discover-environment-id'
    | 'delete-environment'
    | 'validate-name';

interface WebviewMessage<TCommand extends WebviewCommand = WebviewCommand> {
    command: TCommand;
    data?: WebviewMessageData[TCommand];
}

// Type-safe message data mapping
interface WebviewMessageData {
    'save-environment': EnvironmentFormData;
    'test-connection': EnvironmentFormData;
    'discover-environment-id': EnvironmentFormData;
    'delete-environment': undefined;
    'validate-name': { name: string };
}

// Type-safe message handler
private handleMessage(message: WebviewMessage): void {
    switch (message.command) {
        case 'save-environment':
            // TypeScript knows message.data is EnvironmentFormData
            this.handleSaveEnvironment(message.data);
            break;
        case 'validate-name':
            // TypeScript knows message.data is { name: string }
            this.handleValidateName(message.data);
            break;
        // ...
    }
}
```

### 4. HTML Escaping for Security

Always escape user input to prevent XSS attacks:

```typescript
// Shared utility (shared/utils/HtmlUtils.ts)
export function escapeHtml(unsafe: string | undefined | null): string {
    if (!unsafe) return '';

    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Usage in templates
function renderFormField(props: FormFieldProps): string {
    return `
        <label for="${escapeHtml(props.id)}">
            ${escapeHtml(props.label)}
        </label>
        <input
            id="${escapeHtml(props.id)}"
            placeholder="${escapeHtml(props.placeholder)}"
            value="${escapeHtml(props.value)}"
        >
    `;
}
```

---

## Directory Structure

### Proposed Structure

```
src/
├── core/
│   └── presentation/
│       └── templates/                      # NEW: Core template system
│           ├── TemplateBuilder.ts          # Base template builder class
│           ├── HtmlBuilder.ts              # Fluent HTML builder utility
│           └── components/                 # Reusable component templates
│               ├── FormFieldTemplate.ts    # Form input components
│               ├── ButtonTemplate.ts       # Button components
│               ├── SelectTemplate.ts       # Dropdown components
│               ├── SectionTemplate.ts      # Section/card components
│               ├── DataTableTemplate.ts    # Table components
│               ├── ModalTemplate.ts        # Modal/dialog components
│               └── index.ts                # Barrel export

├── features/
│   └── environmentSetup/
│       └── presentation/
│           ├── panels/
│           │   └── EnvironmentSetupPanel.ts           # Panel class (uses template builder)
│           └── templates/                              # NEW: Feature-specific templates
│               └── EnvironmentSetupTemplateBuilder.ts # Feature template builder

├── shared/
│   └── utils/
│       └── HtmlUtils.ts                    # HTML escaping, sanitization

resources/
└── webview/
    ├── css/
    │   ├── base/
    │   │   ├── reset.css                   # CSS reset
    │   │   ├── variables.css               # CSS variables (VSCode theme)
    │   │   └── panel-base.css              # Base panel styles
    │   └── components/
    │       ├── form-field.css              # Form field styles
    │       ├── button.css                  # Button styles
    │       ├── section.css                 # Section/card styles
    │       ├── data-table.css              # Table styles
    │       └── modal.css                   # Modal styles
    │
    └── js/
        ├── utils/
        │   └── BaseBehavior.js             # Base webview behavior class
        └── behaviors/
            └── FormBehavior.js             # Form-specific behavior
```

### File Responsibilities

| File | Purpose | Layer |
|------|---------|-------|
| `TemplateBuilder.ts` | Abstract base class for all template builders | Core/Presentation |
| `FormFieldTemplate.ts` | Reusable form field component templates | Core/Presentation |
| `EnvironmentSetupTemplateBuilder.ts` | Compose templates for Environment Setup panel | Feature/Presentation |
| `EnvironmentSetupPanel.ts` | Panel class, delegates to template builder | Feature/Presentation |
| `HtmlUtils.ts` | HTML escaping, sanitization utilities | Shared/Utils |
| `form-field.css` | Styles for form fields (VSCode theme-aware) | Resources/Webview |
| `FormBehavior.js` | Client-side form behavior (webview context) | Resources/Webview |

---

## Component System Design

### 1. Base Template Builder

Abstract base class that all template builders extend:

```typescript
// src/core/presentation/templates/TemplateBuilder.ts

import * as vscode from 'vscode';

/**
 * Abstract base class for all template builders
 * Provides common utilities for building HTML templates
 */
export abstract class TemplateBuilder {
    constructor(
        protected readonly extensionUri: vscode.Uri,
        protected readonly webview: vscode.Webview
    ) {}

    /**
     * Get webview URI for a resource
     */
    protected getWebviewUri(pathSegments: string[]): vscode.Uri {
        return this.webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, ...pathSegments)
        );
    }

    /**
     * Generate CSP (Content Security Policy) meta tag
     */
    protected generateCsp(): string {
        const nonce = this.generateNonce();
        return `
            <meta http-equiv="Content-Security-Policy"
                  content="default-src 'none';
                           style-src ${this.webview.cspSource} 'unsafe-inline';
                           script-src 'nonce-${nonce}';
                           img-src ${this.webview.cspSource} https:;">
        `;
    }

    /**
     * Generate nonce for CSP
     */
    protected generateNonce(): string {
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let nonce = '';
        for (let i = 0; i < 32; i++) {
            nonce += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return nonce;
    }

    /**
     * Build complete HTML document
     * Subclasses implement this to provide panel-specific content
     */
    abstract build(): string;

    /**
     * Render HTML head section with CSS references
     */
    protected renderHead(title: string, cssFiles: string[]): string {
        const cssLinks = cssFiles.map(file => {
            const uri = this.getWebviewUri(['resources', 'webview', 'css', ...file.split('/')]);
            return `<link href="${uri}" rel="stylesheet">`;
        }).join('\n\t\t');

        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    ${this.generateCsp()}
    ${cssLinks}
    <title>${title}</title>
</head>`;
    }

    /**
     * Render HTML body with scripts
     */
    protected renderBody(content: string, jsFiles: string[]): string {
        const scripts = jsFiles.map(file => {
            const uri = this.getWebviewUri(['resources', 'webview', 'js', ...file.split('/')]);
            return `<script src="${uri}"></script>`;
        }).join('\n\t');

        return `
<body>
    ${content}

    <script>
        const vscode = acquireVsCodeApi();
    </script>
    ${scripts}
</body>
</html>`;
    }
}
```

### 2. Reusable Component Templates

Create pure functions for reusable components:

```typescript
// src/core/presentation/templates/components/FormFieldTemplate.ts

import { escapeHtml } from '../../../../shared/utils/HtmlUtils';

/**
 * Props for form field component
 */
export interface FormFieldProps {
    id: string;
    name: string;
    label: string;
    type: 'text' | 'password' | 'email' | 'url' | 'number';
    required: boolean;
    placeholder?: string;
    helpText?: string;
    value?: string;
    disabled?: boolean;
    className?: string;
    errorMessage?: string;
}

/**
 * Render a form field component
 * Returns type-safe HTML string
 */
export function renderFormField(props: FormFieldProps): string {
    const {
        id,
        name,
        label,
        type,
        required,
        placeholder,
        helpText,
        value,
        disabled,
        className,
        errorMessage
    } = props;

    return `
        <div class="form-group ${className || ''} ${errorMessage ? 'has-error' : ''}">
            <label for="${escapeHtml(id)}">
                ${escapeHtml(label)}
                ${required ? ' <span class="required">*</span>' : ''}
            </label>
            <input
                type="${type}"
                id="${escapeHtml(id)}"
                name="${escapeHtml(name)}"
                ${required ? 'required' : ''}
                ${placeholder ? `placeholder="${escapeHtml(placeholder)}"` : ''}
                ${value ? `value="${escapeHtml(value)}"` : ''}
                ${disabled ? 'disabled' : ''}
                class="form-control"
            >
            ${helpText ? `<span class="help-text">${escapeHtml(helpText)}</span>` : ''}
            ${errorMessage ? `<div class="validation-error">${escapeHtml(errorMessage)}</div>` : ''}
        </div>
    `.trim();
}
```

```typescript
// src/core/presentation/templates/components/ButtonTemplate.ts

import { escapeHtml } from '../../../../shared/utils/HtmlUtils';

export interface ButtonProps {
    id: string;
    text: string;
    variant: 'primary' | 'secondary' | 'danger' | 'success';
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
    className?: string;
    icon?: string; // Codicon name (e.g., 'save', 'refresh')
}

export function renderButton(props: ButtonProps): string {
    const {
        id,
        text,
        variant,
        type = 'button',
        disabled,
        className,
        icon
    } = props;

    return `
        <button
            id="${escapeHtml(id)}"
            type="${type}"
            class="button ${variant} ${className || ''}"
            ${disabled ? 'disabled' : ''}
        >
            ${icon ? `<span class="codicon codicon-${icon}"></span>` : ''}
            ${escapeHtml(text)}
        </button>
    `.trim();
}
```

```typescript
// src/core/presentation/templates/components/SelectTemplate.ts

import { escapeHtml } from '../../../../shared/utils/HtmlUtils';

export interface SelectOption {
    value: string;
    label: string;
    disabled?: boolean;
}

export interface SelectProps {
    id: string;
    name: string;
    label: string;
    options: SelectOption[];
    selected?: string;
    required: boolean;
    helpText?: string;
    disabled?: boolean;
    className?: string;
}

export function renderSelect(props: SelectProps): string {
    const {
        id,
        name,
        label,
        options,
        selected,
        required,
        helpText,
        disabled,
        className
    } = props;

    const optionsHtml = options.map(opt => `
        <option
            value="${escapeHtml(opt.value)}"
            ${opt.value === selected ? 'selected' : ''}
            ${opt.disabled ? 'disabled' : ''}
        >
            ${escapeHtml(opt.label)}
        </option>
    `).join('');

    return `
        <div class="form-group ${className || ''}">
            <label for="${escapeHtml(id)}">
                ${escapeHtml(label)}
                ${required ? ' <span class="required">*</span>' : ''}
            </label>
            <select
                id="${escapeHtml(id)}"
                name="${escapeHtml(name)}"
                ${required ? 'required' : ''}
                ${disabled ? 'disabled' : ''}
                class="form-control"
            >
                ${optionsHtml}
            </select>
            ${helpText ? `<span class="help-text">${escapeHtml(helpText)}</span>` : ''}
        </div>
    `.trim();
}
```

```typescript
// src/core/presentation/templates/components/SectionTemplate.ts

import { escapeHtml } from '../../../../shared/utils/HtmlUtils';

export interface SectionProps {
    title: string;
    content: string; // Pre-rendered HTML content
    className?: string;
    collapsible?: boolean;
    collapsed?: boolean;
}

export function renderSection(props: SectionProps): string {
    const {
        title,
        content,
        className,
        collapsible,
        collapsed
    } = props;

    return `
        <section class="section ${className || ''} ${collapsible ? 'collapsible' : ''} ${collapsed ? 'collapsed' : ''}">
            <h2 class="section-title">
                ${collapsible ? '<span class="collapse-icon codicon codicon-chevron-down"></span>' : ''}
                ${escapeHtml(title)}
            </h2>
            <div class="section-content">
                ${content}
            </div>
        </section>
    `.trim();
}
```

### 3. Barrel Export for Components

```typescript
// src/core/presentation/templates/components/index.ts

export * from './FormFieldTemplate';
export * from './ButtonTemplate';
export * from './SelectTemplate';
export * from './SectionTemplate';

// Export all component templates for easy import:
// import { renderFormField, renderButton, renderSelect } from '@/core/presentation/templates/components';
```

### 4. Feature-Specific Template Builder

```typescript
// src/features/environmentSetup/presentation/templates/EnvironmentSetupTemplateBuilder.ts

import * as vscode from 'vscode';
import { TemplateBuilder } from '../../../../core/presentation/templates/TemplateBuilder';
import {
    renderFormField,
    renderButton,
    renderSelect,
    renderSection
} from '../../../../core/presentation/templates/components';
import { EnvironmentFormViewModel } from '../../application/viewModels/EnvironmentFormViewModel';

/**
 * Template builder for Environment Setup panel
 * Composes reusable component templates into a complete panel
 */
export class EnvironmentSetupTemplateBuilder extends TemplateBuilder {
    constructor(
        extensionUri: vscode.Uri,
        webview: vscode.Webview,
        private readonly viewModel?: EnvironmentFormViewModel
    ) {
        super(extensionUri, webview);
    }

    /**
     * Build complete HTML document
     */
    build(): string {
        const head = this.renderHead('Environment Setup', [
            'base/reset.css',
            'base/variables.css',
            'base/panel-base.css',
            'components/form-field.css',
            'components/button.css',
            'components/section.css'
        ]);

        const body = this.renderBody(
            this.renderContent(),
            [
                'utils/BaseBehavior.js',
                'behaviors/FormBehavior.js'
            ]
        );

        return head + body;
    }

    /**
     * Render panel content
     */
    private renderContent(): string {
        return `
            <div class="container">
                ${this.renderHeader()}
                <form id="environmentForm">
                    ${this.renderBasicInformationSection()}
                    ${this.renderAuthenticationSection()}
                </form>
            </div>
        `;
    }

    /**
     * Render header with action buttons
     */
    private renderHeader(): string {
        const isEditing = !!this.viewModel;

        return `
            <div class="header">
                <h1>${isEditing ? 'Edit Environment' : 'New Environment'}</h1>
                <div class="button-group">
                    ${renderButton({
                        id: 'saveButton',
                        text: 'Save Environment',
                        variant: 'primary'
                    })}
                    ${renderButton({
                        id: 'testButton',
                        text: 'Test Connection',
                        variant: 'secondary',
                        icon: 'beaker'
                    })}
                    ${isEditing ? renderButton({
                        id: 'deleteButton',
                        text: 'Delete Environment',
                        variant: 'danger',
                        icon: 'trash'
                    }) : ''}
                </div>
            </div>
        `;
    }

    /**
     * Render basic information section
     */
    private renderBasicInformationSection(): string {
        const vm = this.viewModel;

        const content = `
            ${renderFormField({
                id: 'name',
                name: 'name',
                label: 'Environment Name',
                type: 'text',
                required: true,
                placeholder: 'e.g., DEV',
                helpText: 'A friendly name to identify this environment',
                value: vm?.name
            })}

            ${renderFormField({
                id: 'dataverseUrl',
                name: 'dataverseUrl',
                label: 'Dataverse URL',
                type: 'url',
                required: true,
                placeholder: 'https://org.crm.dynamics.com',
                helpText: 'The URL of your Dataverse organization',
                value: vm?.dataverseUrl
            })}

            <div class="form-group">
                <label for="environmentId">Environment ID (Optional)</label>
                <div style="display: flex; gap: 8px;">
                    <input
                        type="text"
                        id="environmentId"
                        name="powerPlatformEnvironmentId"
                        placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                        value="${vm?.powerPlatformEnvironmentId || ''}"
                        style="flex: 1;"
                        class="form-control"
                    >
                    ${renderButton({
                        id: 'discoverButton',
                        text: 'Discover ID',
                        variant: 'secondary'
                    })}
                </div>
                <span class="help-text">
                    Optional: The unique GUID for this environment (for Power Apps Maker portal).
                    Click "Discover ID" to auto-populate from BAP API.
                </span>
            </div>
        `;

        return renderSection({
            title: 'Basic Information',
            content
        });
    }

    /**
     * Render authentication section
     */
    private renderAuthenticationSection(): string {
        const vm = this.viewModel;

        const content = `
            ${renderFormField({
                id: 'tenantId',
                name: 'tenantId',
                label: 'Tenant ID',
                type: 'text',
                required: true,
                placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
                helpText: 'Your Azure AD tenant ID',
                value: vm?.tenantId
            })}

            ${renderSelect({
                id: 'authenticationMethod',
                name: 'authenticationMethod',
                label: 'Authentication Method',
                required: true,
                options: [
                    { value: 'Interactive', label: 'Interactive (Browser)' },
                    { value: 'ServicePrincipal', label: 'Service Principal (Client Secret)' },
                    { value: 'UsernamePassword', label: 'Username/Password' },
                    { value: 'DeviceCode', label: 'Device Code' }
                ],
                selected: vm?.authenticationMethod,
                helpText: 'Select how you want to authenticate to this environment'
            })}

            ${renderFormField({
                id: 'publicClientId',
                name: 'publicClientId',
                label: 'Public Client ID',
                type: 'text',
                required: true,
                placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
                helpText: 'Application (client) ID for Interactive/DeviceCode flows',
                value: vm?.publicClientId
            })}

            ${this.renderConditionalFields()}
        `;

        return renderSection({
            title: 'Authentication',
            content
        });
    }

    /**
     * Render conditional fields (Service Principal, Username/Password)
     */
    private renderConditionalFields(): string {
        const vm = this.viewModel;

        return `
            <!-- Service Principal fields -->
            <div class="conditional-field" data-auth-method="ServicePrincipal" style="display: none;">
                ${renderFormField({
                    id: 'clientId',
                    name: 'clientId',
                    label: 'Client ID',
                    type: 'text',
                    required: false,
                    placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
                    helpText: 'Application ID for service principal',
                    value: vm?.clientId
                })}

                ${renderFormField({
                    id: 'clientSecret',
                    name: 'clientSecret',
                    label: 'Client Secret',
                    type: 'password',
                    required: false,
                    placeholder: vm?.clientSecretPlaceholder || 'Enter client secret',
                    helpText: 'Secret value (stored securely)'
                })}
            </div>

            <!-- Username/Password fields -->
            <div class="conditional-field" data-auth-method="UsernamePassword" style="display: none;">
                ${renderFormField({
                    id: 'username',
                    name: 'username',
                    label: 'Username',
                    type: 'text',
                    required: false,
                    placeholder: 'user@domain.com',
                    helpText: 'Dataverse username',
                    value: vm?.username
                })}

                ${renderFormField({
                    id: 'password',
                    name: 'password',
                    label: 'Password',
                    type: 'password',
                    required: false,
                    placeholder: vm?.passwordPlaceholder || 'Enter password',
                    helpText: 'Password (stored securely)'
                })}
            </div>
        `;
    }
}
```

---

## Example Implementation

### Refactored EnvironmentSetupPanel

```typescript
// src/features/environmentSetup/presentation/panels/EnvironmentSetupPanel.ts

import * as vscode from 'vscode';
import { LoadEnvironmentByIdUseCase } from '../../application/useCases/LoadEnvironmentByIdUseCase';
import { SaveEnvironmentUseCase } from '../../application/useCases/SaveEnvironmentUseCase';
import { DeleteEnvironmentUseCase } from '../../application/useCases/DeleteEnvironmentUseCase';
import { TestConnectionUseCase } from '../../application/useCases/TestConnectionUseCase';
import { DiscoverEnvironmentIdUseCase } from '../../application/useCases/DiscoverEnvironmentIdUseCase';
import { ValidateUniqueNameUseCase } from '../../application/useCases/ValidateUniqueNameUseCase';
import { CheckConcurrentEditUseCase } from '../../application/useCases/CheckConcurrentEditUseCase';
import { ApplicationError } from '../../application/errors/ApplicationError';
import { EnvironmentSetupTemplateBuilder } from '../templates/EnvironmentSetupTemplateBuilder';
import { EnvironmentFormViewModel } from '../../application/viewModels/EnvironmentFormViewModel';

/**
 * Presentation layer panel for Environment Setup
 * Delegates all logic to use cases - NO business logic here
 * Delegates HTML generation to template builder - NO inline HTML here
 */
export class EnvironmentSetupPanel {
    public static currentPanels: Map<string, EnvironmentSetupPanel> = new Map();
    private readonly panel: vscode.WebviewPanel;
    private disposables: vscode.Disposable[] = [];
    private currentEnvironmentId?: string;
    private currentViewModel?: EnvironmentFormViewModel;

    private constructor(
        panel: vscode.WebviewPanel,
        private readonly extensionUri: vscode.Uri,
        private readonly loadEnvironmentByIdUseCase: LoadEnvironmentByIdUseCase,
        private readonly saveEnvironmentUseCase: SaveEnvironmentUseCase,
        private readonly deleteEnvironmentUseCase: DeleteEnvironmentUseCase,
        private readonly testConnectionUseCase: TestConnectionUseCase,
        private readonly discoverEnvironmentIdUseCase: DiscoverEnvironmentIdUseCase,
        private readonly validateUniqueNameUseCase: ValidateUniqueNameUseCase,
        private readonly checkConcurrentEditUseCase: CheckConcurrentEditUseCase,
        environmentId?: string
    ) {
        this.panel = panel;
        this.currentEnvironmentId = environmentId;

        // Check concurrent edit if loading existing
        if (environmentId) {
            const canEdit = this.checkConcurrentEditUseCase.execute({ environmentId });
            if (!canEdit.canEdit) {
                vscode.window.showWarningMessage('This environment is already being edited in another panel');
                this.dispose();
                return;
            }

            // Register edit session
            this.checkConcurrentEditUseCase.registerEditSession(environmentId);
        }

        // Set webview options
        this.panel.webview.options = {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'resources', 'webview')]
        };

        // Handle messages from webview
        this.panel.webview.onDidReceiveMessage(
            message => this.handleMessage(message),
            null,
            this.disposables
        );

        // Handle panel disposal
        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

        // Load environment data if editing
        if (environmentId) {
            this.loadEnvironment(environmentId);
        } else {
            // Set initial HTML (empty form for new environment)
            this.updateWebviewContent();
        }
    }

    // ... (static createOrShow method stays the same)

    /**
     * Update webview content using template builder
     * CLEAN SEPARATION: Panel delegates to template builder
     */
    private updateWebviewContent(): void {
        const templateBuilder = new EnvironmentSetupTemplateBuilder(
            this.extensionUri,
            this.panel.webview,
            this.currentViewModel
        );

        this.panel.webview.html = templateBuilder.build();
    }

    private async loadEnvironment(environmentId: string): Promise<void> {
        try {
            // Delegate to use case
            this.currentViewModel = await this.loadEnvironmentByIdUseCase.execute({ environmentId });

            // Update webview with loaded data
            this.updateWebviewContent();
        } catch (error) {
            this.handleError(error as Error, 'Failed to load environment');
        }
    }

    // ... (message handlers stay the same, they work with ViewModels)
}
```

---

## Shared Components Library

### Component Catalog

Build a library of reusable components in `core/presentation/templates/components/`:

| Component | File | Purpose |
|-----------|------|---------|
| **FormField** | `FormFieldTemplate.ts` | Text/password/email inputs with labels, help text, validation |
| **Select** | `SelectTemplate.ts` | Dropdown select with options |
| **Button** | `ButtonTemplate.ts` | Buttons with variants (primary, secondary, danger) |
| **ButtonGroup** | `ButtonGroupTemplate.ts` | Horizontal/vertical button groups |
| **Section** | `SectionTemplate.ts` | Collapsible sections/cards |
| **DataTable** | `DataTableTemplate.ts` | Sortable/filterable data tables |
| **Modal** | `ModalTemplate.ts` | Modal dialogs |
| **Alert** | `AlertTemplate.ts` | Success/error/warning alerts |
| **Badge** | `BadgeTemplate.ts` | Status badges |
| **Tabs** | `TabsTemplate.ts` | Tab navigation |
| **Breadcrumb** | `BreadcrumbTemplate.ts` | Breadcrumb navigation |
| **Checkbox** | `CheckboxTemplate.ts` | Checkboxes and checkbox groups |
| **Radio** | `RadioTemplate.ts` | Radio buttons and radio groups |
| **Textarea** | `TextareaTemplate.ts` | Multi-line text areas |
| **FileInput** | `FileInputTemplate.ts` | File upload inputs |
| **DatePicker** | `DatePickerTemplate.ts` | Date/time pickers |
| **ProgressBar** | `ProgressBarTemplate.ts` | Progress indicators |
| **Spinner** | `SpinnerTemplate.ts` | Loading spinners |
| **TreeView** | `TreeViewTemplate.ts` | Hierarchical tree views |

### Usage Across Features

Any feature can import and use shared components:

```typescript
// Import from shared component library
import {
    renderFormField,
    renderButton,
    renderSection,
    renderDataTable,
    renderModal
} from '../../../../core/presentation/templates/components';

// Use in your feature-specific template builder
export class PluginRegistrationTemplateBuilder extends TemplateBuilder {
    build(): string {
        return `
            ${renderSection({
                title: 'Plugin Assembly',
                content: `
                    ${renderFormField({
                        id: 'assemblyName',
                        name: 'assemblyName',
                        label: 'Assembly Name',
                        type: 'text',
                        required: true
                    })}

                    ${renderButton({
                        id: 'uploadButton',
                        text: 'Upload Assembly',
                        variant: 'primary',
                        icon: 'cloud-upload'
                    })}
                `
            })}

            ${renderDataTable({
                id: 'pluginsTable',
                columns: [
                    { id: 'name', label: 'Plugin Name', sortable: true },
                    { id: 'message', label: 'Message', sortable: true },
                    { id: 'stage', label: 'Stage', sortable: true }
                ],
                data: []
            })}
        `;
    }
}
```

---

## Pros and Cons

### Pros

#### 1. Type Safety
- ✅ Full TypeScript type checking for props
- ✅ Compile-time errors for missing/invalid props
- ✅ IDE autocomplete for all component properties
- ✅ Type-safe ViewModels ensure data integrity

#### 2. Maintainability
- ✅ Components defined once, reused everywhere
- ✅ Changes to components automatically propagate
- ✅ Clear separation: Panel → Template Builder → Component Templates
- ✅ Easy to locate and update HTML structures

#### 3. Scalability
- ✅ Handles simple forms to complex multi-panel UIs
- ✅ Template builders compose smaller templates
- ✅ Component library grows with project needs
- ✅ Supports conditional rendering, dynamic content

#### 4. Clean Architecture Compliance
- ✅ Templates are infrastructure/presentation concerns
- ✅ ViewModels separate application from presentation
- ✅ Dependency inversion: Panels depend on abstractions
- ✅ Domain layer completely unaware of HTML

#### 5. Developer Experience
- ✅ No new framework to learn (pure TypeScript)
- ✅ Familiar pattern for C# developers (Razor-like)
- ✅ Standard HTML/CSS (no DSL, no magic)
- ✅ Easy to debug (view generated HTML in webview)

#### 6. Performance
- ✅ Zero runtime dependencies (no React/Vue bundle)
- ✅ Lightweight HTML strings (fast to generate)
- ✅ Works within VSCode webview constraints
- ✅ No virtual DOM overhead

### Cons

#### 1. No Reactive Updates
- ❌ HTML is generated once, not reactive
- ❌ To update UI, must regenerate entire HTML or use postMessage
- ❌ More complex than React's state-driven rendering

**Mitigation:** Use postMessage for incremental updates, only regenerate HTML on major state changes (like loading new environment).

#### 2. Manual DOM Manipulation
- ❌ Client-side behavior requires vanilla JavaScript (Behavior.js files)
- ❌ No automatic data binding (must handle form inputs manually)
- ❌ More boilerplate for interactive UIs

**Mitigation:** Create reusable Behavior classes (FormBehavior, TableBehavior) that handle common DOM interactions.

#### 3. String Concatenation
- ❌ Still generating HTML strings (not JSX/components)
- ❌ Easy to forget HTML escaping (XSS risk)
- ❌ No syntax highlighting for HTML in TypeScript strings

**Mitigation:**
- Always use `escapeHtml()` utility
- Use template literal syntax for multiline HTML
- Install VSCode extension for HTML syntax highlighting in template literals

#### 4. Testing Challenges
- ❌ Testing HTML output requires string comparison
- ❌ No component test libraries (like React Testing Library)
- ❌ Harder to test interactive behavior

**Mitigation:**
- Test ViewModels and template builders separately
- Use snapshot testing for HTML output
- Integration tests for webview behavior

#### 5. Learning Curve
- ❌ Developers familiar with React/Vue may find this primitive
- ❌ Requires understanding of VSCode webview constraints
- ❌ No off-the-shelf component libraries

**Mitigation:**
- Build comprehensive component library upfront
- Document patterns and examples
- Provide starter templates for common panel types

---

## Migration Path

### Phase 1: Foundation (Week 1)

**Goal:** Set up core template infrastructure

1. **Create base template system**
   - Create `src/core/presentation/templates/TemplateBuilder.ts`
   - Create `src/shared/utils/HtmlUtils.ts` (escapeHtml, sanitize)
   - Set up directory structure for templates

2. **Build core component library**
   - Create `FormFieldTemplate.ts`
   - Create `ButtonTemplate.ts`
   - Create `SelectTemplate.ts`
   - Create `SectionTemplate.ts`
   - Create barrel export `index.ts`

3. **Set up CSS foundation**
   - Create `resources/webview/css/base/reset.css`
   - Create `resources/webview/css/base/variables.css` (VSCode theme variables)
   - Create `resources/webview/css/base/panel-base.css`
   - Create component-specific CSS files

**Validation:** Core components render correctly in a test panel.

### Phase 2: Refactor EnvironmentSetupPanel (Week 2)

**Goal:** Prove the pattern with real-world refactoring

1. **Create EnvironmentSetupTemplateBuilder**
   - Extract HTML from `getHtmlContent()` method
   - Implement template builder using core components
   - Keep Panel class logic unchanged (message handlers, use cases)

2. **Update EnvironmentSetupPanel**
   - Replace `getHtmlContent()` with template builder call
   - Ensure no regressions (test all functionality)

3. **Create feature-specific CSS**
   - Move styles from `environment-setup.css` to component CSS

**Validation:** Environment Setup panel works identically to before, but with template-based HTML.

### Phase 3: Expand Component Library (Week 3)

**Goal:** Add components needed for other panels

1. **Build additional components**
   - `DataTableTemplate.ts` (for Import Jobs, Plugin Registration)
   - `ModalTemplate.ts` (for dialogs)
   - `AlertTemplate.ts` (for notifications)
   - `BadgeTemplate.ts` (for status indicators)
   - `TabsTemplate.ts` (for multi-section panels)
   - `TreeViewTemplate.ts` (for hierarchical data)

2. **Create advanced components**
   - `FilterPanelTemplate.ts` (for search/filter UIs)
   - `SplitPanelTemplate.ts` (for master-detail views)
   - `WizardTemplate.ts` (for multi-step forms)

**Validation:** Component library covers 80% of common UI patterns.

### Phase 4: Migrate Other Panels (Week 4-5)

**Goal:** Apply pattern to all panels

1. **Migrate panels in order of complexity**
   - Start with simplest: Data Explorer, Metadata Browser
   - Move to medium: Import Job Viewer, Solution Explorer
   - Finish with complex: Plugin Registration, Plugin Trace Viewer

2. **Create feature-specific template builders**
   - One template builder per panel
   - Compose core components
   - Add feature-specific components as needed

**Validation:** All panels use template-based architecture.

### Phase 5: Polish and Optimize (Week 6)

**Goal:** Refine and document the system

1. **Documentation**
   - Write component catalog with examples
   - Document template builder patterns
   - Create starter template for new panels
   - Add JSDoc comments to all components

2. **Testing**
   - Add unit tests for template builders
   - Add integration tests for panels
   - Test HTML escaping and XSS prevention

3. **Performance optimization**
   - Profile HTML generation performance
   - Cache frequently-used templates
   - Optimize CSS (remove unused styles)

**Validation:** System is production-ready, well-documented, and tested.

### Gradual Adoption Strategy

You can adopt this pattern incrementally:

1. **Start small:** Refactor one panel (EnvironmentSetupPanel) to prove the pattern
2. **Build on success:** Add more components as you refactor other panels
3. **Learn and iterate:** Adjust patterns based on real-world usage
4. **No flag day:** Old panels continue working while new panels use templates
5. **Full migration:** Eventually all panels use template-based architecture

---

## Advanced Patterns

### Pattern 1: Template Composition

Compose complex templates from smaller templates:

```typescript
export class PluginRegistrationTemplateBuilder extends TemplateBuilder {
    build(): string {
        return `
            ${this.renderHeader()}
            ${this.renderLeftPanel()}
            ${this.renderRightPanel()}
            ${this.renderFooter()}
        `;
    }

    private renderHeader(): string {
        return renderSection({
            title: 'Plugin Registration',
            content: this.renderToolbar()
        });
    }

    private renderToolbar(): string {
        return `
            <div class="toolbar">
                ${renderButton({ id: 'newPlugin', text: 'New Plugin', variant: 'primary' })}
                ${renderButton({ id: 'refresh', text: 'Refresh', variant: 'secondary', icon: 'refresh' })}
            </div>
        `;
    }

    private renderLeftPanel(): string {
        return `
            <div class="left-panel">
                ${renderTreeView({
                    id: 'assemblyTree',
                    nodes: this.assemblyNodes
                })}
            </div>
        `;
    }

    private renderRightPanel(): string {
        return `
            <div class="right-panel">
                ${this.renderDetailsPanel()}
            </div>
        `;
    }

    private renderDetailsPanel(): string {
        return renderTabs({
            id: 'detailsTabs',
            tabs: [
                { id: 'properties', label: 'Properties', content: this.renderPropertiesTab() },
                { id: 'steps', label: 'Steps', content: this.renderStepsTab() },
                { id: 'images', label: 'Images', content: this.renderImagesTab() }
            ]
        });
    }
}
```

### Pattern 2: Conditional Rendering

Use TypeScript logic to conditionally render templates:

```typescript
export class EnvironmentSetupTemplateBuilder extends TemplateBuilder {
    private renderAuthenticationFields(): string {
        const method = this.viewModel?.authenticationMethod;

        switch (method) {
            case 'ServicePrincipal':
                return this.renderServicePrincipalFields();
            case 'UsernamePassword':
                return this.renderUsernamePasswordFields();
            case 'Interactive':
            case 'DeviceCode':
                return this.renderInteractiveFields();
            default:
                return '';
        }
    }

    private renderServicePrincipalFields(): string {
        return `
            ${renderFormField({
                id: 'clientId',
                name: 'clientId',
                label: 'Client ID',
                type: 'text',
                required: true,
                value: this.viewModel?.clientId
            })}
            ${renderFormField({
                id: 'clientSecret',
                name: 'clientSecret',
                label: 'Client Secret',
                type: 'password',
                required: true
            })}
        `;
    }
}
```

### Pattern 3: Data-Driven Rendering

Render dynamic content from arrays/objects:

```typescript
export class DataTableTemplateBuilder extends TemplateBuilder {
    private renderTableRows(data: unknown[]): string {
        return data.map(row => this.renderTableRow(row)).join('');
    }

    private renderTableRow(row: unknown): string {
        const typedRow = row as Record<string, unknown>;

        return `
            <tr data-row-id="${escapeHtml(String(typedRow.id))}">
                ${this.columns.map(col => `
                    <td data-column="${col.id}">
                        ${escapeHtml(String(typedRow[col.field]))}
                    </td>
                `).join('')}
            </tr>
        `;
    }
}
```

### Pattern 4: Template Inheritance

Extend base template builders for specialized panels:

```typescript
// Base builder for all form panels
export abstract class FormPanelTemplateBuilder extends TemplateBuilder {
    protected renderFormLayout(formContent: string, actions: string): string {
        return `
            <div class="form-container">
                <form id="${this.getFormId()}" class="panel-form">
                    ${formContent}
                </form>
                <div class="form-actions">
                    ${actions}
                </div>
            </div>
        `;
    }

    protected abstract getFormId(): string;
    protected abstract renderFormContent(): string;
    protected abstract renderFormActions(): string;
}

// Specialized builder for environment setup
export class EnvironmentSetupTemplateBuilder extends FormPanelTemplateBuilder {
    protected getFormId(): string {
        return 'environmentForm';
    }

    protected renderFormContent(): string {
        return `
            ${this.renderBasicInformationSection()}
            ${this.renderAuthenticationSection()}
        `;
    }

    protected renderFormActions(): string {
        return `
            ${renderButton({ id: 'save', text: 'Save', variant: 'primary' })}
            ${renderButton({ id: 'test', text: 'Test', variant: 'secondary' })}
        `;
    }
}
```

### Pattern 5: Template Caching

Cache frequently-used templates for performance:

```typescript
export class TemplateCache {
    private static cache: Map<string, string> = new Map();

    static get(key: string, generator: () => string): string {
        if (!this.cache.has(key)) {
            this.cache.set(key, generator());
        }
        return this.cache.get(key)!;
    }

    static clear(): void {
        this.cache.clear();
    }
}

// Usage in template builder
export class MyTemplateBuilder extends TemplateBuilder {
    private renderHeader(): string {
        return TemplateCache.get('header-standard', () => `
            <header class="panel-header">
                <h1>My Panel</h1>
            </header>
        `);
    }
}
```

---

## Conclusion

This TypeScript-first webview templating architecture provides:

1. **Type safety** - Full TypeScript type checking for HTML generation
2. **Component reusability** - Build once, use everywhere
3. **Clean Architecture compliance** - Proper separation of concerns
4. **Scalability** - Handles simple to complex UIs
5. **Zero dependencies** - Pure TypeScript, no framework overhead
6. **Developer experience** - Familiar patterns, easy to learn

**Recommendation:** Adopt this pattern gradually, starting with EnvironmentSetupPanel refactor, then expand component library, and finally migrate all panels. The pattern scales from simple forms to complex multi-panel applications while maintaining Clean Architecture principles.

**Next Steps:**
1. Review and approve this architecture proposal
2. Implement Phase 1 (Foundation) to prove the pattern
3. Refactor EnvironmentSetupPanel (Phase 2) as pilot
4. Expand component library (Phase 3) based on real needs
5. Migrate remaining panels (Phase 4-5)

---

## Appendix: Alternative Approaches Considered

### Alternative 1: React/Preact in Webview

**Pros:**
- Reactive updates
- Component ecosystem
- Mature framework

**Cons:**
- ❌ Large bundle size (affects extension size)
- ❌ Build complexity (webpack, babel)
- ❌ Framework lock-in
- ❌ Overkill for VSCode webviews

**Verdict:** Rejected - Too heavyweight for VSCode extension use case.

### Alternative 2: Template String Libraries (lit-html, nunjucks)

**Pros:**
- Dedicated template syntax
- Some template libraries

**Cons:**
- ❌ Additional dependency
- ❌ Learning curve
- ❌ Not TypeScript-native

**Verdict:** Rejected - Adds dependency without significant benefit over native TypeScript.

### Alternative 3: Continue with Inline HTML Strings

**Pros:**
- No architecture changes needed
- Simple to understand

**Cons:**
- ❌ Doesn't scale
- ❌ No reusability
- ❌ No type safety
- ❌ Hard to maintain

**Verdict:** Rejected - Doesn't meet scalability requirements.

### Alternative 4: HTML Template Files (Handlebars, Mustache)

**Pros:**
- Separate HTML from TypeScript
- Template syntax

**Cons:**
- ❌ No type safety
- ❌ Additional build step
- ❌ Runtime template parsing

**Verdict:** Rejected - Sacrifices type safety and adds complexity.

---

**Final Recommendation:** Use TypeScript Template Builders with tagged template literals as described in this document. This approach balances type safety, maintainability, scalability, and Clean Architecture compliance without introducing heavyweight dependencies.
