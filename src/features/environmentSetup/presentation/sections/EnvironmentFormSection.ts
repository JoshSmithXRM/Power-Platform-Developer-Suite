import type { ISection } from '../../../../shared/infrastructure/ui/sections/ISection';
import { SectionPosition } from '../../../../shared/infrastructure/ui/types/SectionPosition';
import type { SectionRenderData } from '../../../../shared/infrastructure/ui/types/SectionRenderData';

export class EnvironmentFormSection implements ISection {
	readonly position = SectionPosition.Main;

	render(data: SectionRenderData): string {
		const formData = (data as { formData?: Record<string, string> }).formData || {};

		const basicInfo = this.renderBasicInfo(formData);

		return `
			<div class="form-container">
				<form id="environmentForm">
					${basicInfo}
				</form>
			</div>
		`;
	}

	private renderBasicInfo(formData: Record<string, string>): string {
		const basicInfoSection = this.renderBasicInfoSection(formData);
		const authSection = this.renderAuthenticationSection(formData);

		return `${basicInfoSection}${authSection}`;
	}

	private renderBasicInfoSection(formData: Record<string, string>): string {
		const name = formData['name'] || '';
		const dataverseUrl = formData['dataverseUrl'] || '';
		const environmentId = formData['powerPlatformEnvironmentId'] || '';

		return `
			<div class="form-section">
				<h2>Basic Information</h2>

				<div class="form-group">
					<label for="name">Environment Name <span style="color: var(--vscode-errorForeground);">*</span></label>
					<input type="text" id="name" name="name" placeholder="e.g., DEV" value="${name}" required>
					<div class="help-text">A friendly name to identify this environment</div>
				</div>

				<div class="form-group">
					<label for="dataverseUrl">Dataverse URL <span style="color: var(--vscode-errorForeground);">*</span></label>
					<input type="text" id="dataverseUrl" name="dataverseUrl" placeholder="https://org.crm.dynamics.com" value="${dataverseUrl}" required>
					<div class="help-text">The URL of your Dataverse organization</div>
				</div>

				<div class="form-group">
					<label for="environmentId">Environment ID (Optional)</label>
					<div style="display: flex; gap: 8px;">
						<input type="text" id="environmentId" name="powerPlatformEnvironmentId" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" value="${environmentId}" style="flex: 1;">
						<button type="button" id="discoverEnvironmentId" style="white-space: nowrap;">Discover ID</button>
					</div>
					<div class="help-text">Optional: The unique GUID for this environment (for Power Apps Maker portal). Click "Discover ID" to auto-populate from BAP API.</div>
				</div>
			</div>
		`;
	}

	private renderAuthenticationSection(formData: Record<string, string>): string {
		const tenantId = formData['tenantId'] || '';
		const publicClientId = formData['publicClientId'] || '51f81489-12ee-4a9e-aaae-a2591f45987d';
		const authMethodSelect = this.renderAuthMethodSelect(formData);
		const conditionalFields = this.renderConditionalAuthFields(formData);

		return `
			<div class="form-section">
				<h2>Authentication</h2>

				<div class="form-group">
					<label for="tenantId">Tenant ID (Optional)</label>
					<input type="text" id="tenantId" name="tenantId" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" value="${tenantId}">
					<div class="help-text">Your Azure AD tenant ID. Optional for Interactive/DeviceCode/UsernamePassword (uses "organizations" authority). Required for Service Principal.</div>
				</div>

				${authMethodSelect}

				<div class="form-group">
					<label for="publicClientId">Public Client ID <span style="color: var(--vscode-errorForeground);">*</span></label>
					<input type="text" id="publicClientId" name="publicClientId" value="${publicClientId}" placeholder="51f81489-12ee-4a9e-aaae-a2591f45987d" required>
					<div class="help-text">Application (client) ID for Interactive/DeviceCode flows. Default is Microsoft's official public client ID.</div>
				</div>

				${conditionalFields}
			</div>
		`;
	}

	private renderAuthMethodSelect(formData: Record<string, string>): string {
		const authMethod = formData['authenticationMethod'] || '';

		return `
			<div class="form-group">
				<label for="authenticationMethod">Authentication Method <span style="color: var(--vscode-errorForeground);">*</span></label>
				<select id="authenticationMethod" name="authenticationMethod" required>
					<option value="Interactive" ${authMethod === 'Interactive' ? 'selected' : ''}>Interactive (Browser)</option>
					<option value="ServicePrincipal" ${authMethod === 'ServicePrincipal' ? 'selected' : ''}>Service Principal (Client Secret)</option>
					<option value="UsernamePassword" ${authMethod === 'UsernamePassword' ? 'selected' : ''}>Username/Password</option>
					<option value="DeviceCode" ${authMethod === 'DeviceCode' ? 'selected' : ''}>Device Code</option>
				</select>
				<div class="help-text">Select how you want to authenticate to this environment</div>
			</div>
		`;
	}

	private renderConditionalAuthFields(formData: Record<string, string>): string {
		const authMethod = formData['authenticationMethod'] || '';
		const clientId = formData['clientId'] || '';
		const clientSecret = formData['clientSecret'] || '';
		const username = formData['username'] || '';
		const password = formData['password'] || '';

		const servicePrincipalDisplay = authMethod === 'ServicePrincipal' ? 'block' : 'none';
		const usernamePasswordDisplay = authMethod === 'UsernamePassword' ? 'block' : 'none';

		return `
			<div class="conditional-field" data-auth-method="ServicePrincipal" style="display: ${servicePrincipalDisplay};">
				<div class="form-group">
					<label for="clientId">Client ID</label>
					<input type="text" id="clientId" name="clientId" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" value="${clientId}">
					<div class="help-text">Application ID for service principal</div>
				</div>

				<div class="form-group">
					<label for="clientSecret">Client Secret</label>
					<input type="password" id="clientSecret" name="clientSecret" placeholder="Enter client secret" value="${clientSecret}">
					<div class="help-text">Secret value (stored securely)</div>
				</div>
			</div>

			<div class="conditional-field" data-auth-method="UsernamePassword" style="display: ${usernamePasswordDisplay};">
				<div class="form-group">
					<label for="username">Username</label>
					<input type="text" id="username" name="username" placeholder="user@domain.com" value="${username}">
					<div class="help-text">Dataverse username</div>
				</div>

				<div class="form-group">
					<label for="password">Password</label>
					<input type="password" id="password" name="password" placeholder="Enter password" value="${password}">
					<div class="help-text">Password (stored securely)</div>
				</div>
			</div>
		`;
	}
}
