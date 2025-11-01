/**
 * Environment Setup panel view.
 * Renders the complete HTML for the environment setup webview.
 */

import { html, raw, fragment } from '../../../../infrastructure/ui/utils/HtmlUtils';
import { renderFormField } from '../../../../shared/presentation/components/html/formField';
import { renderButton } from '../../../../shared/presentation/components/html/button';
import { renderSelect } from '../../../../shared/presentation/components/html/select';
import { renderSection } from '../../../../shared/presentation/components/html/section';

export interface EnvironmentSetupViewResources {
	styleUri: string;
	scriptUri: string;
}

/**
 * Renders the complete Environment Setup panel HTML.
 *
 * @param resources - URI resources for styles and scripts
 * @returns Complete HTML document
 */
export function renderEnvironmentSetup(resources: EnvironmentSetupViewResources): string {
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
				${raw(renderForm())}
			</div>
			${raw(renderScript(resources))}
		</body>
		</html>
	`.__html;
}

/**
 * Renders the header section with title and action buttons.
 */
function renderHeader(): string {
	return html`
		<div class="header">
			<h1>Environment Setup</h1>
			<div class="button-group">
				${raw(renderButton({ id: 'saveButton', text: 'Save Environment', variant: 'primary' }))}
				${raw(renderButton({ id: 'testButton', text: 'Test Connection', variant: 'secondary' }))}
				${raw(renderButton({ id: 'deleteButton', text: 'Delete Environment', variant: 'danger', style: 'display: none;' }))}
			</div>
		</div>
	`.__html;
}

/**
 * Renders the main form with all sections.
 */
function renderForm(): string {
	return html`
		<form id="environmentForm">
			${raw(renderSection({
				title: 'Basic Information',
				content: renderBasicInformationSection()
			}))}
			${raw(renderSection({
				title: 'Authentication',
				content: renderAuthenticationSection()
			}))}
		</form>
	`.__html;
}

/**
 * Renders the Basic Information section with environment details.
 */
function renderBasicInformationSection(): string {
	return fragment(
		renderFormField({
			id: 'name',
			name: 'name',
			label: 'Environment Name',
			type: 'text',
			placeholder: 'e.g., DEV',
			helpText: 'A friendly name to identify this environment',
			required: true
		}),
		renderFormField({
			id: 'dataverseUrl',
			name: 'dataverseUrl',
			label: 'Dataverse URL',
			type: 'url',
			placeholder: 'https://org.crm.dynamics.com',
			helpText: 'The URL of your Dataverse organization',
			required: true
		}),
		renderEnvironmentIdField()
	).__html;
}

/**
 * Renders the Environment ID field with discover button.
 */
function renderEnvironmentIdField(): string {
	return html`
		<div class="form-group">
			<label for="environmentId">Environment ID (Optional)</label>
			<div style="display: flex; gap: 8px;">
				<input
					type="text"
					id="environmentId"
					name="powerPlatformEnvironmentId"
					placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
					style="flex: 1;"
				/>
				${raw(renderButton({
					id: 'discoverButton',
					text: 'Discover ID',
					variant: 'secondary',
					style: 'white-space: nowrap;'
				}))}
			</div>
			<span class="help-text">Optional: The unique GUID for this environment (for Power Apps Maker portal). Click "Discover ID" to auto-populate from BAP API.</span>
		</div>
	`.__html;
}

/**
 * Renders the Authentication section with auth method selector and conditional fields.
 */
function renderAuthenticationSection(): string {
	return fragment(
		renderFormField({
			id: 'tenantId',
			name: 'tenantId',
			label: 'Tenant ID (Optional)',
			type: 'text',
			placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
			helpText: 'Your Azure AD tenant ID. Optional for Interactive/DeviceCode/UsernamePassword (uses "organizations" authority). Required for Service Principal.',
			required: false
		}),
		renderSelect({
			id: 'authenticationMethod',
			name: 'authenticationMethod',
			label: 'Authentication Method',
			options: [
				{ value: 'Interactive', label: 'Interactive (Browser)' },
				{ value: 'ServicePrincipal', label: 'Service Principal (Client Secret)' },
				{ value: 'UsernamePassword', label: 'Username/Password' },
				{ value: 'DeviceCode', label: 'Device Code' }
			],
			helpText: 'Select how you want to authenticate to this environment',
			required: true
		}),
		renderFormField({
			id: 'publicClientId',
			name: 'publicClientId',
			label: 'Public Client ID',
			type: 'text',
			value: '51f81489-12ee-4a9e-aaae-a2591f45987d',
			placeholder: '51f81489-12ee-4a9e-aaae-a2591f45987d',
			helpText: 'Application (client) ID for Interactive/DeviceCode flows. Default is Microsoft\'s official public client ID.',
			required: true
		}),
		renderServicePrincipalFields(),
		renderUsernamePasswordFields()
	).__html;
}

/**
 * Renders conditional fields for Service Principal authentication.
 */
function renderServicePrincipalFields(): string {
	return html`
		<div class="conditional-field" data-auth-method="ServicePrincipal" style="display: none;">
			${raw(renderFormField({
				id: 'clientId',
				name: 'clientId',
				label: 'Client ID',
				type: 'text',
				placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
				helpText: 'Application ID for service principal'
			}))}
			${raw(renderFormField({
				id: 'clientSecret',
				name: 'clientSecret',
				label: 'Client Secret',
				type: 'password',
				placeholder: 'Enter client secret',
				helpText: 'Secret value (stored securely)'
			}))}
		</div>
	`.__html;
}

/**
 * Renders conditional fields for Username/Password authentication.
 */
function renderUsernamePasswordFields(): string {
	return html`
		<div class="conditional-field" data-auth-method="UsernamePassword" style="display: none;">
			${raw(renderFormField({
				id: 'username',
				name: 'username',
				label: 'Username',
				type: 'text',
				placeholder: 'user@domain.com',
				helpText: 'Dataverse username'
			}))}
			${raw(renderFormField({
				id: 'password',
				name: 'password',
				label: 'Password',
				type: 'password',
				placeholder: 'Enter password',
				helpText: 'Password (stored securely)'
			}))}
		</div>
	`.__html;
}

/**
 * Renders the script tag to load external behavior file.
 */
function renderScript(resources: EnvironmentSetupViewResources): string {
	return html`
		<script src="${resources.scriptUri}"></script>
	`.__html;
}
