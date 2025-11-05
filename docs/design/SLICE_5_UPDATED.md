# Slice 5 Updated Design (With All Architect Fixes)

This file contains the complete updated Slice 5 design with all required and optional architect fixes applied.

---

## Changes Applied:

✅ **Required Fix 1**: Button state management moved to LoadingStateBehavior
✅ **Required Fix 2**: Conditional field logic moved to EnvironmentFormRules domain service
✅ **Required Fix 3**: CustomInlineButtonSection fully specified
✅ **Required Fix 4**: Domain validation added (EnvironmentConfig entity)
✅ **Required Fix 5**: SectionRenderData standardized with typed properties
✅ **Optional Fix 1**: ButtonState extracted to shared/domain/types as value object
✅ **Optional Fix 2**: Form field validation config added (ValidationRule[])
✅ **Optional Fix 3**: State flow documented with sequence diagram

---

### Slice 5: "Migrate EnvironmentSetupPanel (Form-Based, No EnvironmentBehavior)"
**Builds on:** Slice 4

**Goal:** Prove EnvironmentBehavior is optional AND prove framework supports form-based panels (not just data tables).

**Current Implementation:** EnvironmentSetupPanel is a form panel with:
- Basic Information section: Name, Dataverse URL, Environment ID (with Discover button)
- Authentication section: Tenant ID, Auth Method dropdown, conditional fields (Service Principal, Username/Password)
- Header buttons: Save, Test Connection, Delete (conditionally shown)
- Uses EnvironmentSetupBehavior.js for client-side form logic
- Has dynamic fields that show/hide based on auth method selection

---

## Domain Layer (Environment Setup Feature)

### DTO: EnvironmentFormData

```typescript
// src/features/environmentSetup/application/dtos/EnvironmentFormData.ts

/**
 * DTO representing raw form data from the webview.
 * Unvalidated user input.
 */
export interface EnvironmentFormData {
  readonly id?: string;
  readonly name: string;
  readonly dataverseUrl: string;
  readonly authenticationMethod: string;
  readonly tenantId?: string;
  readonly publicClientId?: string;
  readonly powerPlatformEnvironmentId?: string;

  // Service Principal fields
  readonly clientId?: string;
  readonly clientSecret?: string;

  // Username/Password fields
  readonly username?: string;
  readonly password?: string;
}
```

### 1. EnvironmentConfig Entity (Rich Domain Model)

```typescript
// src/features/environmentSetup/domain/entities/EnvironmentConfig.ts

/**
 * Domain entity representing an environment configuration.
 * Rich model with validation and behavior (CLAUDE.md Rule #7).
 */
export class EnvironmentConfig {
  private constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly dataverseUrl: URL,
    public readonly authMethod: AuthenticationMethod,
    public readonly tenantId: string | null,
    public readonly publicClientId: string,
    public readonly powerPlatformEnvironmentId: string | null,
    public readonly credentials: AuthenticationCredentials
  ) {}

  /**
   * Factory method with validation.
   * Enforces business rules at entity creation.
   */
  static create(data: EnvironmentFormData): EnvironmentConfig {
    // Validate required fields
    if (!data.name || data.name.trim() === '') {
      throw new Error('Environment name is required');
    }

    if (!data.dataverseUrl || !this.isValidUrl(data.dataverseUrl)) {
      throw new Error('Valid Dataverse URL is required');
    }

    if (!data.authenticationMethod) {
      throw new Error('Authentication method is required');
    }

    // Validate auth-method-specific requirements
    const authMethod = AuthenticationMethod.fromString(data.authenticationMethod);
    const credentials = this.createCredentials(authMethod, data);

    // Validate Tenant ID requirement for Service Principal
    if (authMethod === AuthenticationMethod.ServicePrincipal && !data.tenantId) {
      throw new Error('Tenant ID is required for Service Principal authentication');
    }

    return new EnvironmentConfig(
      data.id || this.generateId(),
      data.name.trim(),
      new URL(data.dataverseUrl),
      authMethod,
      data.tenantId || null,
      data.publicClientId || '51f81489-12ee-4a9e-aaae-a2591f45987d',
      data.powerPlatformEnvironmentId || null,
      credentials
    );
  }

  private static createCredentials(
    authMethod: AuthenticationMethod,
    data: EnvironmentFormData
  ): AuthenticationCredentials {
    if (authMethod === AuthenticationMethod.ServicePrincipal) {
      if (!data.clientId || !data.clientSecret) {
        throw new Error('Service Principal requires Client ID and Client Secret');
      }
      return new ServicePrincipalCredentials(data.clientId, data.clientSecret);
    }

    if (authMethod === AuthenticationMethod.UsernamePassword) {
      if (!data.username || !data.password) {
        throw new Error('Username/Password authentication requires username and password');
      }
      return new UsernamePasswordCredentials(data.username, data.password);
    }

    return new InteractiveCredentials();
  }

  private static isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:' && parsed.hostname.includes('dynamics.com');
    } catch {
      return false;
    }
  }

  private static generateId(): string {
    return crypto.randomUUID();
  }

  /**
   * Rich behavior: Update authentication method.
   * Returns new instance (immutable entity).
   */
  updateAuthMethod(
    newMethod: AuthenticationMethod,
    newCredentials: AuthenticationCredentials
  ): EnvironmentConfig {
    return new EnvironmentConfig(
      this.id,
      this.name,
      this.dataverseUrl,
      newMethod,
      this.tenantId,
      this.publicClientId,
      this.powerPlatformEnvironmentId,
      newCredentials
    );
  }

  /**
   * Rich behavior: Validate if environment can be saved.
   */
  canSave(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (this.authMethod === AuthenticationMethod.ServicePrincipal && !this.tenantId) {
      errors.push('Tenant ID is required for Service Principal');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
```

### 2. EnvironmentFormRules Domain Service

```typescript
// src/features/environmentSetup/domain/services/EnvironmentFormRules.ts

/**
 * Domain service: Business rules for environment form fields.
 * Determines which fields are visible/required based on authentication method.
 *
 * This service implements the business logic for conditional field display,
 * keeping views dumb (pure renderers).
 */
export class EnvironmentFormRules {
  /**
   * Returns fields that should be visible for the given authentication method.
   *
   * Business rules:
   * - Service Principal requires: clientId, clientSecret
   * - Username/Password requires: username, password
   * - Interactive/DeviceCode: no additional fields
   */
  getVisibleFields(
    authMethod: AuthenticationMethod,
    allFields: ReadonlyArray<FormFieldConfig>
  ): ReadonlyArray<FormFieldConfig> {
    return allFields.filter(field => {
      // Fields without conditional display are always visible
      if (!field.conditionalDisplay) {
        return true;
      }

      const { showWhen } = field.conditionalDisplay;

      // Business rule: Show Service Principal fields
      if (authMethod === AuthenticationMethod.ServicePrincipal && showWhen === 'ServicePrincipal') {
        return true;
      }

      // Business rule: Show Username/Password fields
      if (authMethod === AuthenticationMethod.UsernamePassword && showWhen === 'UsernamePassword') {
        return true;
      }

      return false;
    });
  }

  /**
   * Returns validation rules for a field based on context.
   */
  getFieldValidationRules(
    field: FormFieldConfig,
    authMethod: AuthenticationMethod
  ): ReadonlyArray<ValidationRule> {
    const rules: ValidationRule[] = [];

    // Required field validation
    if (field.required) {
      rules.push({
        type: 'required',
        message: `${field.label} is required`
      });
    }

    // URL validation
    if (field.type === 'url') {
      rules.push({
        type: 'pattern',
        pattern: /^https:\/\/.+\.dynamics\.com/,
        message: 'Must be a valid Dynamics 365 URL (https://...dynamics.com)'
      });
    }

    // Tenant ID validation for Service Principal
    if (field.id === 'tenantId' && authMethod === AuthenticationMethod.ServicePrincipal) {
      rules.push({
        type: 'required',
        message: 'Tenant ID is required for Service Principal'
      });
    }

    return rules;
  }

  /**
   * Validate form data against business rules.
   * Returns validation errors keyed by field ID.
   */
  validateFormData(
    formData: Record<string, unknown>,
    visibleFields: ReadonlyArray<FormFieldConfig>,
    authMethod: AuthenticationMethod
  ): Record<string, string[]> {
    const errors: Record<string, string[]> = {};

    for (const field of visibleFields) {
      const fieldErrors: string[] = [];
      const value = formData[field.name];
      const rules = this.getFieldValidationRules(field, authMethod);

      for (const rule of rules) {
        if (rule.type === 'required' && !value) {
          fieldErrors.push(rule.message);
        }

        if (rule.type === 'pattern' && value && typeof value === 'string') {
          if (!rule.pattern.test(value)) {
            fieldErrors.push(rule.message);
          }
        }
      }

      if (fieldErrors.length > 0) {
        errors[field.id] = fieldErrors;
      }
    }

    return errors;
  }
}
```

---

## Shared Domain Types

### ButtonId Branded Type

```typescript
// src/shared/domain/types/ButtonId.ts

/**
 * Branded type for button IDs to prevent typos at compile time.
 * Ensures button IDs used in configs match handler registration.
 */
export type ButtonId = string & { readonly __brand: 'ButtonId' };

/**
 * Factory function to create branded ButtonId.
 * Use this to create all button IDs to ensure type safety.
 */
export function createButtonId(id: string): ButtonId {
  return id as ButtonId;
}
```

### ButtonState Value Object

```typescript
// src/shared/domain/types/ButtonState.ts

export type ButtonVariant = 'default' | 'primary' | 'secondary' | 'danger' | 'success';

/**
 * Value object representing the visual state of a button.
 * Immutable - changes create new instances.
 */
export class ButtonState {
  constructor(
    public readonly loading: boolean = false,
    public readonly disabled: boolean = false,
    public readonly variant: ButtonVariant = 'default',
    public readonly hidden: boolean = false
  ) {
    // Validation: loading buttons should be disabled
    if (loading && !disabled) {
      throw new Error('Loading buttons must be disabled');
    }
  }

  /**
   * Create loading state.
   */
  static loading(variant: ButtonVariant = 'default'): ButtonState {
    return new ButtonState(true, true, variant, false);
  }

  /**
   * Create success state.
   */
  static success(): ButtonState {
    return new ButtonState(false, false, 'success', false);
  }

  /**
   * Create error state.
   */
  static error(): ButtonState {
    return new ButtonState(false, false, 'danger', false);
  }

  /**
   * Create default state.
   */
  static default(variant: ButtonVariant = 'default'): ButtonState {
    return new ButtonState(false, false, variant, false);
  }

  /**
   * Create hidden state.
   */
  static hidden(): ButtonState {
    return new ButtonState(false, true, 'default', true);
  }

  /**
   * Convert to plain object for serialization.
   */
  toPlainObject(): {
    loading: boolean;
    disabled: boolean;
    variant: ButtonVariant;
    hidden: boolean;
  } {
    return {
      loading: this.loading,
      disabled: this.disabled,
      variant: this.variant,
      hidden: this.hidden
    };
  }
}
```

### ValidationRule Type

```typescript
// src/shared/domain/types/ValidationRule.ts

export type ValidationRuleType = 'required' | 'pattern' | 'minLength' | 'maxLength' | 'custom';

export interface ValidationRule {
  readonly type: ValidationRuleType;
  readonly message: string;
  readonly pattern?: RegExp;
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly customValidator?: (value: unknown) => boolean;
}
```

---

## Shared Infrastructure (UI Framework)

### LoadingStateBehavior

```typescript
// src/shared/infrastructure/ui/behaviors/LoadingStateBehavior.ts

/**
 * Behavior that automatically manages button loading/success/error states.
 * Encapsulates state management so panels don't manually track button states.
 */
export class LoadingStateBehavior implements IPanelBehavior {
  private buttonStates = new Map<ButtonId, ButtonState>();
  private panel: vscode.WebviewPanel | null = null;
  private onStateChanged: (() => Promise<void>) | null = null;

  async initialize(panel: vscode.WebviewPanel): Promise<void> {
    this.panel = panel;
  }

  /**
   * Register callback to trigger re-render when state changes.
   */
  setRenderCallback(callback: () => Promise<void>): void {
    this.onStateChanged = callback;
  }

  /**
   * Wraps async operation with automatic state tracking.
   * Shows loading spinner, then success/error state, then resets.
   *
   * **Error Handling:**
   * - On error: Sets button to error state (red), waits 2s, resets, then re-throws
   * - Re-throwing allows panel handlers to show VS Code error messages
   * - Button state transitions happen regardless of error handling in panel
   *
   * @param buttonId - Button to track state for
   * @param operation - Async operation to execute
   * @param defaultVariant - Default button variant to reset to
   * @returns Result of operation if successful
   * @throws Re-throws any error from operation after setting error state
   */
  async trackOperation<T>(
    buttonId: ButtonId,
    operation: () => Promise<T>,
    defaultVariant: ButtonVariant = 'primary'
  ): Promise<T> {
    try {
      // Set loading state
      this.setState(buttonId, ButtonState.loading(defaultVariant));
      await this.notifyStateChanged();

      // Execute operation
      const result = await operation();

      // Set success state
      this.setState(buttonId, ButtonState.success());
      await this.notifyStateChanged();

      // Reset after 2s
      setTimeout(() => {
        this.setState(buttonId, ButtonState.default(defaultVariant));
        this.notifyStateChanged();
      }, 2000);

      return result;
    } catch (error) {
      // Set error state (red button)
      this.setState(buttonId, ButtonState.error());
      await this.notifyStateChanged();

      // Reset after 2s
      setTimeout(() => {
        this.setState(buttonId, ButtonState.default(defaultVariant));
        this.notifyStateChanged();
      }, 2000);

      // Re-throw so panel can show VS Code error message
      throw error;
    }
  }

  /**
   * Get current button states for rendering.
   */
  getButtonStates(): Record<string, ButtonState> {
    const states: Record<string, ButtonState> = {};
    for (const [buttonId, state] of this.buttonStates) {
      states[buttonId] = state;
    }
    return states;
  }

  private setState(buttonId: ButtonId, state: ButtonState): void {
    this.buttonStates.set(buttonId, state);
  }

  private async notifyStateChanged(): Promise<void> {
    if (this.onStateChanged) {
      await this.onStateChanged();
    }
  }

  dispose(): void {
    this.buttonStates.clear();
    this.panel = null;
    this.onStateChanged = null;
  }
}
```

### SectionRenderData (Standardized)

```typescript
// src/shared/infrastructure/ui/types/SectionRenderData.ts

/**
 * Standardized data passed to sections during rendering.
 * All properties are typed and documented.
 */
export interface SectionRenderData {
  // Optional discriminant for type narrowing
  sectionType?: 'table' | 'tree' | 'detail' | 'filter' | 'form' | 'custom';

  // Table data (for DataTableSection)
  tableData?: ReadonlyArray<Record<string, unknown>>;

  // Detail data (for DetailPanelSection)
  detailData?: unknown;

  // Filter state (for FilterControlsSection)
  filterState?: Record<string, unknown>;

  // Form data (for FormSection) - TYPED
  formData?: Record<string, unknown>;

  // Button states (for ButtonWithStateSection) - TYPED
  buttonStates?: Record<string, ButtonState>;

  // Validation errors (for FormSection) - TYPED
  validationErrors?: Record<string, string[]>;

  // Loading state (for all sections)
  isLoading?: boolean;

  // Error message (for all sections)
  errorMessage?: string;

  // Custom data (escape hatch for feature-specific sections)
  customData?: Record<string, unknown>;
}
```

### FormSection

```typescript
// src/shared/infrastructure/ui/sections/FormSection.ts

export class FormSection implements ISection {
  readonly position = SectionPosition.Main;

  constructor(private config: FormSectionConfig) {}

  render(data: SectionRenderData): string {
    const formData = data.formData || {};
    const validationErrors = data.validationErrors || {};
    return renderForm(this.config, formData, validationErrors);
  }
}

// src/shared/infrastructure/ui/types/FormSectionConfig.ts

export interface FormFieldConfig {
  readonly id: string;
  readonly name: string;
  readonly label: string;
  readonly type: 'text' | 'url' | 'password' | 'select';
  readonly placeholder?: string;
  readonly helpText?: string;
  readonly required?: boolean;
  readonly defaultValue?: string;
  readonly options?: ReadonlyArray<{ value: string; label: string }>;
  readonly validation?: ReadonlyArray<ValidationRule>;  // ADDED: Validation config
  readonly conditionalDisplay?: {
    readonly dependsOn: string;
    readonly showWhen: string;
  };
}

export interface FormFieldGroupConfig {
  readonly title: string;
  readonly fields: ReadonlyArray<FormFieldConfig>;
}

export interface FormSectionConfig {
  readonly id: string;
  readonly fieldGroups: ReadonlyArray<FormFieldGroupConfig>;
}

// src/shared/infrastructure/ui/views/formView.ts

/**
 * Renders form HTML from pre-filtered fields.
 * DUMB renderer - no business logic, just HTML generation.
 */
export function renderForm(
  config: FormSectionConfig,
  formData: Record<string, unknown>,
  validationErrors: Record<string, string[]>
): string {
  return `
    <form id="${config.id}">
      ${config.fieldGroups.map(group => renderFieldGroup(group, formData, validationErrors)).join('\n')}
    </form>
  `;
}

function renderFieldGroup(
  group: FormFieldGroupConfig,
  formData: Record<string, unknown>,
  validationErrors: Record<string, string[]>
): string {
  return `
    <div class="form-group-section">
      <h2>${escapeHtml(group.title)}</h2>
      ${group.fields.map(field => renderFormField(field, formData, validationErrors)).join('\n')}
    </div>
  `;
}

function renderFormField(
  field: FormFieldConfig,
  formData: Record<string, unknown>,
  validationErrors: Record<string, string[]>
): string {
  const value = formData[field.name] || field.defaultValue || '';
  const errors = validationErrors[field.id] || [];
  const hasError = errors.length > 0;

  return `
    <div class="form-field ${hasError ? 'has-error' : ''}">
      <label for="${field.id}">${escapeHtml(field.label)}${field.required ? ' *' : ''}</label>
      ${renderFieldInput(field, value, hasError)}
      ${field.helpText ? `<span class="help-text">${escapeHtml(field.helpText)}</span>` : ''}
      ${hasError ? `<span class="error-message">${escapeHtml(errors.join(', '))}</span>` : ''}
    </div>
  `;
}

function renderFieldInput(field: FormFieldConfig, value: unknown, hasError: boolean): string {
  const valueStr = String(value || '');
  const errorClass = hasError ? 'input-error' : '';

  if (field.type === 'select' && field.options) {
    return `
      <select id="${field.id}" name="${field.name}" class="${errorClass}" ${field.required ? 'required' : ''}>
        ${field.options.map(opt => `
          <option value="${escapeHtml(opt.value)}" ${opt.value === valueStr ? 'selected' : ''}>
            ${escapeHtml(opt.label)}
          </option>
        `).join('')}
      </select>
    `;
  }

  return `
    <input
      type="${field.type}"
      id="${field.id}"
      name="${field.name}"
      class="${errorClass}"
      value="${escapeHtml(valueStr)}"
      placeholder="${escapeHtml(field.placeholder || '')}"
      ${field.required ? 'required' : ''}
    />
  `;
}
```

### ButtonWithStateSection

```typescript
// src/shared/infrastructure/ui/sections/ButtonWithStateSection.ts

export class ButtonWithStateSection implements ISection {
  readonly position = SectionPosition.Header;

  constructor(private config: ButtonWithStateConfig) {}

  render(data: SectionRenderData): string {
    const buttonStates = data.buttonStates || {};
    return renderButtonsWithState(this.config, buttonStates);
  }
}

// src/shared/infrastructure/ui/types/ButtonWithStateConfig.ts

export interface ButtonWithStateConfig {
  readonly buttons: ReadonlyArray<{
    readonly id: ButtonId;
    readonly label: string;
    readonly defaultState?: ButtonState;
  }>;
}

// src/shared/infrastructure/ui/views/buttonWithStateView.ts

export function renderButtonsWithState(
  config: ButtonWithStateConfig,
  states: Record<string, ButtonState>
): string {
  return `
    <div class="button-group">
      ${config.buttons.map(btn => {
        const state = states[btn.id] || btn.defaultState || ButtonState.default();
        const plainState = state.toPlainObject();

        return `
          <button
            id="${btn.id}"
            class="btn btn-${plainState.variant} ${plainState.loading ? 'loading' : ''}"
            ${plainState.disabled ? 'disabled' : ''}
            style="${plainState.hidden ? 'display: none;' : ''}"
          >
            ${plainState.loading ? '<span class="spinner"></span>' : ''}
            ${escapeHtml(btn.label)}
          </button>
        `;
      }).join('\n')}
    </div>
  `;
}
```

### CustomInlineButtonSection (NEW - FULLY SPECIFIED)

```typescript
// src/shared/infrastructure/ui/sections/CustomInlineButtonSection.ts

/**
 * Section for rendering a button inline with a form field.
 * Used for actions like "Discover ID" next to Environment ID field.
 */
export class CustomInlineButtonSection implements ISection {
  readonly position: SectionPosition;

  constructor(private config: CustomInlineButtonConfig) {
    this.position = config.position;
  }

  render(data: SectionRenderData): string {
    const buttonStates = data.buttonStates || {};
    const buttonState = buttonStates[this.config.buttonId] || ButtonState.default();
    return renderCustomInlineButton(this.config, buttonState);
  }
}

// src/shared/infrastructure/ui/types/CustomInlineButtonConfig.ts

export interface CustomInlineButtonConfig {
  readonly position: SectionPosition;
  readonly buttonId: ButtonId;
  readonly label: string;
  readonly targetFieldId: string;  // Which field this button is associated with
}

// src/shared/infrastructure/ui/views/customInlineButtonView.ts

export function renderCustomInlineButton(
  config: CustomInlineButtonConfig,
  state: ButtonState
): string {
  const plainState = state.toPlainObject();

  return `
    <div class="inline-button-wrapper" data-target-field="${config.targetFieldId}">
      <button
        id="${config.buttonId}"
        class="btn-inline btn-${plainState.variant} ${plainState.loading ? 'loading' : ''}"
        ${plainState.disabled ? 'disabled' : ''}
        style="${plainState.hidden ? 'display: none;' : ''}"
      >
        ${plainState.loading ? '<span class="spinner"></span>' : ''}
        ${escapeHtml(config.label)}
      </button>
    </div>
  `;
}
```

---

## Presentation Layer (Environment Setup Feature)

### Panel Implementation (CLEAN - No State Management)

```typescript
// src/features/environmentSetup/presentation/panels/EnvironmentSetupPanel.ts

type EnvironmentSetupPanelCommands =
  | 'save'
  | 'testConnection'
  | 'delete'
  | 'discoverEnvironmentId'
  | 'validateName'
  | 'authMethodChanged';

export class EnvironmentSetupPanel {
  private coordinator: PanelCoordinator<EnvironmentSetupPanelCommands>;
  private loadingStateBehavior: LoadingStateBehavior;
  private formRules: EnvironmentFormRules;
  private currentAuthMethod: AuthenticationMethod = AuthenticationMethod.Interactive;
  private isEditMode: boolean;

  constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    private saveEnvironmentUseCase: SaveEnvironmentUseCase,
    private testConnectionUseCase: TestConnectionUseCase,
    private deleteEnvironmentUseCase: DeleteEnvironmentUseCase,
    private discoverEnvironmentIdUseCase: DiscoverEnvironmentIdUseCase,
    private validateUniqueNameUseCase: ValidateUniqueNameUseCase,
    logger: ILogger,
    environmentId?: string
  ) {
    this.isEditMode = !!environmentId;
    this.formRules = new EnvironmentFormRules();
    this.loadingStateBehavior = new LoadingStateBehavior();

    // Create sections
    const sections = this.createSections();

    // Create coordinator with LoadingStateBehavior
    this.coordinator = new PanelCoordinator<EnvironmentSetupPanelCommands>({
      panel,
      extensionUri,
      behaviors: [
        // NO EnvironmentBehavior - this panel manages environments, doesn't operate within one
        this.loadingStateBehavior,  // Handles button states automatically
        new SectionCompositionBehavior(sections, PanelLayout.SingleColumn),
        new MessageRoutingBehavior()
      ],
      logger
    });

    // Register render callback for LoadingStateBehavior
    this.loadingStateBehavior.setRenderCallback(() => this.coordinator.render());

    // Register handlers (CLEAN - no state management)
    this.registerHandlers();
  }

  private createSections(): ISection[] {
    const headerSection = new ButtonWithStateSection({
      buttons: [
        {
          id: createButtonId('save'),
          label: 'Save Environment',
          defaultState: ButtonState.default('primary')
        },
        {
          id: createButtonId('testConnection'),
          label: 'Test Connection',
          defaultState: ButtonState.default('secondary')
        },
        {
          id: createButtonId('delete'),
          label: 'Delete Environment',
          defaultState: this.isEditMode ? ButtonState.default('danger') : ButtonState.hidden()
        }
      ]
    });

    // Get visible fields based on current auth method
    const visibleFields = this.formRules.getVisibleFields(
      this.currentAuthMethod,
      this.getAllFieldConfigs()
    );

    const formSection = new FormSection({
      id: 'environmentForm',
      fieldGroups: [
        {
          title: 'Basic Information',
          fields: visibleFields.filter(f => ['name', 'dataverseUrl', 'environmentId'].includes(f.id))
        },
        {
          title: 'Authentication',
          fields: visibleFields.filter(f => !['name', 'dataverseUrl', 'environmentId'].includes(f.id))
        }
      ]
    });

    const discoverButtonSection = new CustomInlineButtonSection({
      position: SectionPosition.Main,
      buttonId: createButtonId('discoverEnvironmentId'),
      label: 'Discover ID',
      targetFieldId: 'environmentId'
    });

    return [headerSection, formSection, discoverButtonSection];
  }

  private getAllFieldConfigs(): ReadonlyArray<FormFieldConfig> {
    return [
      {
        id: 'name',
        name: 'name',
        label: 'Environment Name',
        type: 'text',
        placeholder: 'e.g., DEV',
        helpText: 'A friendly name to identify this environment',
        required: true,
        validation: [
          { type: 'required', message: 'Environment name is required' }
        ]
      },
      {
        id: 'dataverseUrl',
        name: 'dataverseUrl',
        label: 'Dataverse URL',
        type: 'url',
        placeholder: 'https://org.crm.dynamics.com',
        helpText: 'The URL of your Dataverse organization',
        required: true,
        validation: [
          { type: 'required', message: 'Dataverse URL is required' },
          { type: 'pattern', pattern: /^https:\/\/.+\.dynamics\.com/, message: 'Must be a valid Dynamics 365 URL' }
        ]
      },
      {
        id: 'environmentId',
        name: 'powerPlatformEnvironmentId',
        label: 'Environment ID (Optional)',
        type: 'text',
        placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
        helpText: 'Optional: The unique GUID for this environment'
      },
      {
        id: 'tenantId',
        name: 'tenantId',
        label: 'Tenant ID (Optional)',
        type: 'text',
        placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
        helpText: 'Your Azure AD tenant ID. Required for Service Principal.',
        required: false
      },
      {
        id: 'authenticationMethod',
        name: 'authenticationMethod',
        label: 'Authentication Method',
        type: 'select',
        required: true,
        helpText: 'Select how you want to authenticate to this environment',
        options: [
          { value: 'Interactive', label: 'Interactive (Browser)' },
          { value: 'ServicePrincipal', label: 'Service Principal (Client Secret)' },
          { value: 'UsernamePassword', label: 'Username/Password' },
          { value: 'DeviceCode', label: 'Device Code' }
        ]
      },
      {
        id: 'publicClientId',
        name: 'publicClientId',
        label: 'Public Client ID',
        type: 'text',
        defaultValue: '51f81489-12ee-4a9e-aaae-a2591f45987d',
        placeholder: '51f81489-12ee-4a9e-aaae-a2591f45987d',
        helpText: "Application (client) ID for Interactive/DeviceCode flows.",
        required: true
      },
      // Service Principal conditional fields
      {
        id: 'clientId',
        name: 'clientId',
        label: 'Client ID',
        type: 'text',
        placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
        helpText: 'Application ID for service principal',
        conditionalDisplay: {
          dependsOn: 'authenticationMethod',
          showWhen: 'ServicePrincipal'
        },
        validation: [
          { type: 'required', message: 'Client ID is required for Service Principal' }
        ]
      },
      {
        id: 'clientSecret',
        name: 'clientSecret',
        label: 'Client Secret',
        type: 'password',
        placeholder: 'Enter client secret',
        helpText: 'Secret value (stored securely)',
        conditionalDisplay: {
          dependsOn: 'authenticationMethod',
          showWhen: 'ServicePrincipal'
        },
        validation: [
          { type: 'required', message: 'Client Secret is required for Service Principal' }
        ]
      },
      // Username/Password conditional fields
      {
        id: 'username',
        name: 'username',
        label: 'Username',
        type: 'text',
        placeholder: 'user@domain.com',
        helpText: 'Dataverse username',
        conditionalDisplay: {
          dependsOn: 'authenticationMethod',
          showWhen: 'UsernamePassword'
        },
        validation: [
          { type: 'required', message: 'Username is required for Username/Password authentication' }
        ]
      },
      {
        id: 'password',
        name: 'password',
        label: 'Password',
        type: 'password',
        placeholder: 'Enter password',
        helpText: 'Password (stored securely)',
        conditionalDisplay: {
          dependsOn: 'authenticationMethod',
          showWhen: 'UsernamePassword'
        },
        validation: [
          { type: 'required', message: 'Password is required for Username/Password authentication' }
        ]
      }
    ];
  }

  private registerHandlers(): void {
    // Save handler - LoadingStateBehavior automatically tracks state
    this.coordinator.registerHandler('save', async (payload) => {
      const formData = payload as EnvironmentFormData;

      // Validate using domain service
      const visibleFields = this.formRules.getVisibleFields(this.currentAuthMethod, this.getAllFieldConfigs());
      const validationErrors = this.formRules.validateFormData(formData, visibleFields, this.currentAuthMethod);

      if (Object.keys(validationErrors).length > 0) {
        // Re-render with errors
        await this.coordinator.render({ validationErrors });
        return;
      }

      // LoadingStateBehavior wraps operation
      await this.loadingStateBehavior.trackOperation(
        createButtonId('save'),
        async () => {
          // Domain validates and creates entity
          const config = EnvironmentConfig.create(formData);
          await this.saveEnvironmentUseCase.execute(config);
        },
        'primary'
      );
    });

    // Test Connection handler
    this.coordinator.registerHandler('testConnection', async (payload) => {
      const formData = payload as EnvironmentFormData;

      await this.loadingStateBehavior.trackOperation(
        createButtonId('testConnection'),
        async () => {
          await this.testConnectionUseCase.execute(formData);
        },
        'secondary'
      );
    });

    // Discover Environment ID handler
    this.coordinator.registerHandler('discoverEnvironmentId', async (payload) => {
      const data = payload as { dataverseUrl: string };

      await this.loadingStateBehavior.trackOperation(
        createButtonId('discoverEnvironmentId'),
        async () => {
          const environmentId = await this.discoverEnvironmentIdUseCase.execute(data.dataverseUrl);

          // Update form field
          await this.coordinator.panel.webview.postMessage({
            command: 'updateField',
            data: { fieldId: 'environmentId', value: environmentId }
          });
        }
      );
    });

    // Delete handler
    this.coordinator.registerHandler('delete', async () => {
      const confirmed = await vscode.window.showWarningMessage(
        'Are you sure you want to delete this environment?',
        { modal: true },
        'Delete'
      );

      if (confirmed) {
        await this.deleteEnvironmentUseCase.execute(this.environmentId);
        this.dispose();
      }
    });

    // Validate name handler
    this.coordinator.registerHandler('validateName', async (payload) => {
      const data = payload as { name: string };
      const isUnique = await this.validateUniqueNameUseCase.execute(data.name, this.environmentId);

      await this.coordinator.panel.webview.postMessage({
        command: 'validationResult',
        data: {
          fieldId: 'name',
          valid: isUnique,
          message: isUnique ? '' : 'Name already exists'
        }
      });
    });

    // Auth method changed handler - Re-render with new visible fields
    this.coordinator.registerHandler('authMethodChanged', async (payload) => {
      const data = payload as { authMethod: string };
      this.currentAuthMethod = AuthenticationMethod.fromString(data.authMethod);

      // Get updated visible fields based on new auth method
      const visibleFields = this.formRules.getVisibleFields(
        this.currentAuthMethod,
        this.getAllFieldConfigs()
      );

      // Approach: Pass visible fields via render data
      // FormSection will receive pre-filtered fields and render only those
      await this.coordinator.render({
        formData: { authenticationMethod: data.authMethod },
        customData: {
          visibleFields  // FormSection can check this to render filtered fields
        }
      });

      // Note: Alternative approach would be to add coordinator.updateSections() API:
      // const newSections = this.createSections();
      // this.coordinator.updateSections(newSections);
      //
      // Current approach (render with customData) is simpler and doesn't require
      // coordinator API changes. FormSection can be made aware of visibleFields
      // and render accordingly.
    });
  }
}
```

---

## State Flow Sequence Diagram (Optional Fix #3)

```
User                Panel               LoadingStateBehavior    UseCase              Coordinator         Section             View
  |                   |                          |                  |                     |                  |                   |
  |--- Click Save --->|                          |                  |                     |                  |                   |
  |                   |                          |                  |                     |                  |                   |
  |                   |--- trackOperation() ---->|                  |                     |                  |                   |
  |                   |                          |                  |                     |                  |                   |
  |                   |                          |-- setState(loading) ------------------>|                  |                   |
  |                   |                          |                  |                     |                  |                   |
  |                   |                          |-- notifyStateChanged() --------------->|                  |                   |
  |                   |                          |                  |                     |                  |                   |
  |                   |                          |                  |                     |--- render() ---->|                   |
  |                   |                          |                  |                     |                  |                   |
  |                   |                          |                  |                     |                  |--- renderButtonsWithState() -->
  |                   |                          |                  |                     |                  |                   |
  |<------------------------------------------------ HTML with spinner ------------------------------------------------------|
  |                   |                          |                  |                     |                  |                   |
  |                   |                          |-- execute() ---->|                     |                  |                   |
  |                   |                          |                  |                     |                  |                   |
  |                   |                          |                  |-- save to repo --   |                  |                   |
  |                   |                          |                  |                     |                  |                   |
  |                   |                          |<-- success ------|                     |                  |                   |
  |                   |                          |                  |                     |                  |                   |
  |                   |                          |-- setState(success) ------------------>|                  |                   |
  |                   |                          |                  |                     |                  |                   |
  |                   |                          |-- notifyStateChanged() --------------->|                  |                   |
  |                   |                          |                  |                     |                  |                   |
  |                   |                          |                  |                     |--- render() ---->|                   |
  |                   |                          |                  |                     |                  |                   |
  |                   |                          |                  |                     |                  |--- renderButtonsWithState() -->
  |                   |                          |                  |                     |                  |                   |
  |<------------------------------------------------ HTML with green button --------------------------------------------------|
  |                   |                          |                  |                     |                  |                   |
  |                   |                          |-- setTimeout(2s, reset) -------------- |                  |                   |
  |                   |                          |                  |                     |                  |                   |
  |                   |                          [2 seconds pass]   |                     |                  |                   |
  |                   |                          |                  |                     |                  |                   |
  |                   |                          |-- setState(default) ------------------>|                  |                   |
  |                   |                          |                  |                     |                  |                   |
  |                   |                          |-- notifyStateChanged() --------------->|                  |                   |
  |                   |                          |                  |                     |                  |                   |
  |                   |                          |                  |                     |--- render() ---->|                   |
  |                   |                          |                  |                     |                  |                   |
  |                   |                          |                  |                     |                  |--- renderButtonsWithState() -->
  |                   |                          |                  |                     |                  |                   |
  |<------------------------------------------------ HTML with normal button -------------------------------------------------|
```

**Key Points:**
1. User clicks Save button
2. Panel delegates to LoadingStateBehavior.trackOperation()
3. LoadingStateBehavior sets loading state → triggers re-render → user sees spinner
4. LoadingStateBehavior executes use case
5. On success: LoadingStateBehavior sets success state → triggers re-render → user sees green button
6. After 2s: LoadingStateBehavior resets state → triggers re-render → user sees normal button
7. **Panel never manually manages state** - LoadingStateBehavior handles everything

---

## Testing Strategy

**Unit Tests:**

1. **Domain Layer (100% target):**
   - EnvironmentConfig.create() validation
   - EnvironmentFormRules.getVisibleFields() business logic
   - EnvironmentFormRules.getFieldValidationRules()
   - EnvironmentFormRules.validateFormData()
   - ButtonState value object methods

2. **Infrastructure - Behaviors (80% target):**
   - LoadingStateBehavior.trackOperation() state transitions
   - LoadingStateBehavior success/error paths
   - LoadingStateBehavior timeout/reset logic

3. **Infrastructure - Sections (90% target):**
   - FormSection.render() with various formData
   - ButtonWithStateSection.render() with various buttonStates
   - CustomInlineButtonSection.render()

4. **Infrastructure - Views (90% target):**
   - renderForm() HTML output
   - renderButtonsWithState() HTML output with different states
   - renderCustomInlineButton() HTML output
   - HTML escaping tests (XSS prevention)

5. **Presentation - Panel (85% target):**
   - Handler registration
   - LoadingStateBehavior integration
   - Section creation with visible fields
   - Auth method change triggering re-render

**Integration Tests:**
- Panel opens correctly (form mode, not table)
- NO environment dropdown shown (no EnvironmentBehavior)
- Form fields render correctly
- Conditional fields show/hide based on auth method
- Save button: spinner → green on success / red on failure
- Test Connection button: spinner → green on success / red on failure
- Discover ID button: spinner → green on success / red on failure
- Delete button only shown when editing
- Validation errors display correctly
- Panel look and feel matches current implementation

---

## Result

**GOALS ACHIEVED:**
✅ EnvironmentBehavior proven optional (no environment dropdown, panel works without it)
✅ Framework supports form-based panels (FormSection + ButtonWithStateSection)
✅ Button state management encapsulated in LoadingStateBehavior (no manual panel state tracking)
✅ Conditional field logic in domain layer (EnvironmentFormRules service)
✅ Domain validation in EnvironmentConfig entity (rich domain model)
✅ Form field validation config added (ValidationRule[])
✅ State flow documented with sequence diagram

**CLEAN ARCHITECTURE COMPLIANCE:**
✅ Business logic in domain (EnvironmentConfig, EnvironmentFormRules)
✅ Views are dumb renderers (no logic, just HTML)
✅ Sections delegate to views (separation of concerns)
✅ Panel is clean (no state management, just use case orchestration)
✅ LoadingStateBehavior encapsulates cross-cutting concern (button states)

**COMPLEXITY:** Moderate (3 new sections, state management behavior, domain validation, conditional fields)
