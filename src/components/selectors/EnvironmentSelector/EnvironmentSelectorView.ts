import { EnvironmentSelectorConfig, Environment } from '../../base/ComponentInterface';
import { CSS_CLASSES, ICONS } from '../../base/ComponentConfig';
import { escapeHtml } from '../../base/HtmlUtils';

/**
 * EnvironmentSelectorView - HTML generation for EnvironmentSelector component
 * This runs in Extension Host context and generates the HTML structure
 */

export interface EnvironmentSelectorViewState {
    environments: Environment[];
    selectedEnvironmentId: string | null;
    loading: boolean;
    connectionStatus: 'connected' | 'disconnected' | 'error';
}

export class EnvironmentSelectorView {
    /**
     * Render the complete HTML for the EnvironmentSelector component
     */
    static render(config: EnvironmentSelectorConfig, state: EnvironmentSelectorViewState): string {
        const {
            id,
            label = 'Environment:',
            placeholder = 'Select environment...',
            showStatus = true,
            required = false,
            disabled = false,
            className = 'environment-selector'
        } = config;

        const {
            environments,
            selectedEnvironmentId,
            loading,
            connectionStatus: _connectionStatus
        } = state;

        const containerClass = [
            CSS_CLASSES.COMPONENT_BASE,
            CSS_CLASSES.ENVIRONMENT_SELECTOR,
            className,
            disabled ? CSS_CLASSES.COMPONENT_DISABLED : '',
            loading ? CSS_CLASSES.COMPONENT_LOADING : ''
        ].filter(Boolean).join(' ');

        return `
            <div class="${containerClass}"
                 data-component-id="${id}"
                 data-component-type="EnvironmentSelector"
                 data-config-label="${escapeHtml(label)}"
                 data-config-placeholder="${escapeHtml(placeholder)}"
                 data-config-show-status="${showStatus}"
                 data-config-required="${required}"
                 data-config-disabled="${disabled}">

                <div class="${CSS_CLASSES.COMPONENT_ROW}">
                    ${this.renderLabel(label, required, id)}
                    ${this.renderSelector(id, placeholder, environments, selectedEnvironmentId, disabled, loading)}
                </div>

                ${this.renderLoadingContainer()}
                ${this.renderErrorContainer()}

            </div>
        `;
    }

    /**
     * Render the label element
     */
    private static renderLabel(label: string, required: boolean, componentId: string): string {
        const labelClass = [
            CSS_CLASSES.COMPONENT_LABEL,
            required ? CSS_CLASSES.FORM_REQUIRED : ''
        ].filter(Boolean).join(' ');

        return `
            <label for="${componentId}_select" class="${labelClass}">
                ${escapeHtml(label)}${required ? ' *' : ''}
            </label>
        `;
    }

    /**
     * Render the select dropdown
     */
    private static renderSelector(
        componentId: string,
        placeholder: string,
        environments: Environment[],
        selectedEnvironmentId: string | null,
        disabled: boolean,
        loading: boolean
    ): string {
        const selectClass = [
            CSS_CLASSES.COMPONENT_SELECT,
            CSS_CLASSES.SELECTOR_DROPDOWN
        ].join(' ');

        const isDisabled = disabled || loading;

        const optionsHtml = [
            `<option value="">${escapeHtml(placeholder)}</option>`,
            ...environments.map(env => 
                `<option value="${escapeHtml(env.id)}" 
                         ${env.id === selectedEnvironmentId ? 'selected' : ''}>
                    ${escapeHtml(env.displayName || env.name)}
                </option>`
            )
        ].join('');

        return `
            <select id="${componentId}_select" 
                    class="${selectClass}"
                    ${isDisabled ? 'disabled' : ''}
                    data-component-element="selector">
                ${optionsHtml}
            </select>
        `;
    }

    /**
     * Render the status indicator
     */
    private static renderStatusIndicator(
        connectionStatus: 'connected' | 'disconnected' | 'error',
        loading: boolean
    ): string {
        if (loading) {
            return `
                <span class="${CSS_CLASSES.COMPONENT_STATUS} ${CSS_CLASSES.COMPONENT_LOADING}">
                    ${ICONS.LOADING} Loading...
                </span>
            `;
        }

        const statusClass = [
            CSS_CLASSES.COMPONENT_STATUS,
            CSS_CLASSES.ENVIRONMENT_STATUS,
            `environment-${connectionStatus}`
        ].join(' ');

        const statusText = connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1);
        const statusIcon = connectionStatus === 'connected' ? ICONS.CONNECTED : 
                          connectionStatus === 'error' ? ICONS.ERROR : ICONS.DISCONNECTED;

        return `
            <span class="${statusClass}" data-component-element="status">
                ${statusIcon} ${statusText}
            </span>
        `;
    }

    /**
     * Render the refresh button
     */
    private static renderRefreshButton(
        componentId: string,
        disabled: boolean,
        loading: boolean
    ): string {
        const buttonClass = [
            CSS_CLASSES.COMPONENT_BUTTON,
            CSS_CLASSES.ACTION_SECONDARY
        ].join(' ');

        const isDisabled = disabled || loading;

        return `
            <button type="button" 
                    class="${buttonClass}" 
                    id="${componentId}_refresh"
                    ${isDisabled ? 'disabled' : ''}
                    data-component-element="refresh"
                    title="Refresh environments">
                ${loading ? ICONS.LOADING : ICONS.REFRESH}
            </button>
        `;
    }

    /**
     * Render the loading container (hidden by default)
     */
    private static renderLoadingContainer(): string {
        return `
            <div class="${CSS_CLASSES.COMPONENT_LOADING_CONTAINER}" data-component-element="loading">
                ${ICONS.LOADING} Loading environments...
            </div>
        `;
    }

    /**
     * Render the error container (hidden by default)
     */
    private static renderErrorContainer(): string {
        return `
            <div class="${CSS_CLASSES.COMPONENT_ERROR_CONTAINER}" data-component-element="error">
                ${ICONS.ERROR} <span data-component-element="error-message"></span>
            </div>
        `;
    }

    /**
     * Generate options HTML for environments
     */
    static generateOptionsHTML(environments: Environment[], selectedId?: string): string {
        return environments.map(env => {
            const selected = env.id === selectedId ? 'selected' : '';
            const displayName = env.displayName || env.name;
            const description = env.settings?.dataverseUrl ? 
                ` - ${new URL(env.settings.dataverseUrl).hostname}` : '';
            
            return `<option value="${escapeHtml(env.id)}" ${selected} title="${escapeHtml(env.settings?.dataverseUrl || '')}">
                        ${escapeHtml(displayName)}${escapeHtml(description)}
                    </option>`;
        }).join('');
    }

    /**
     * Generate environment info tooltip
     */
    static generateEnvironmentTooltip(environment: Environment): string {
        const info = [
            `Name: ${environment.displayName || environment.name}`,
            `URL: ${environment.settings?.dataverseUrl || 'Not configured'}`,
            `Auth: ${environment.settings?.authenticationMethod || 'Unknown'}`,
            environment.environmentId ? `ID: ${environment.environmentId}` : null
        ].filter(Boolean);

        return info.join('\n');
    }


    /**
     * Generate validation error HTML
     */
    static generateValidationError(error: string): string {
        return `
            <div class="${CSS_CLASSES.FORM_VALIDATION_ERROR}">
                ${ICONS.ERROR} ${escapeHtml(error)}
            </div>
        `;
    }

    /**
     * Generate empty state HTML
     */
    static generateEmptyState(message: string = 'No environments configured'): string {
        return `
            <div class="environment-selector-empty">
                ${ICONS.INFO} ${escapeHtml(message)}
            </div>
        `;
    }

    /**
     * Generate minimal selector HTML (for inline use)
     */
    static renderMinimal(
        id: string,
        environments: Environment[],
        selectedId?: string,
        placeholder: string = 'Select environment...'
    ): string {
        const optionsHtml = [
            `<option value="">${escapeHtml(placeholder)}</option>`,
            this.generateOptionsHTML(environments, selectedId)
        ].join('');

        return `
            <select id="${id}" 
                    class="${CSS_CLASSES.COMPONENT_SELECT}" 
                    data-component-id="${id}"
                    data-component-type="EnvironmentSelector">
                ${optionsHtml}
            </select>
        `;
    }
}