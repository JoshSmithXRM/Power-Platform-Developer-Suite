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
		return `
			<div class="form-container">
				<form id="environmentForm">
					<div class="form-section">
						<h2>Basic Information</h2>

						<div class="form-group">
							<label for="name">Environment Name <span style="color: var(--vscode-errorForeground);">*</span></label>
							<input type="text" id="name" name="name" placeholder="e.g., DEV" value="${formData['name'] || ''}" required>
							<div class="help-text">A friendly name to identify this environment</div>
						</div>

						<div class="form-group">
							<label for="dataverseUrl">Dataverse URL <span style="color: var(--vscode-errorForeground);">*</span></label>
							<input type="text" id="dataverseUrl" name="dataverseUrl" placeholder="https://org.crm.dynamics.com" value="${formData['dataverseUrl'] || ''}" required>
							<div class="help-text">The URL of your Dataverse organization</div>
						</div>

						<div class="form-group">
							<label for="environmentId">Environment ID (Optional)</label>
							<div style="display: flex; gap: 8px;">
								<input type="text" id="environmentId" name="powerPlatformEnvironmentId" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" value="${formData['powerPlatformEnvironmentId'] || ''}" style="flex: 1;">
								<button type="button" id="discoverButton" style="white-space: nowrap;">Discover ID</button>
							</div>
							<div class="help-text">Optional: The unique GUID for this environment (for Power Apps Maker portal). Click "Discover ID" to auto-populate from BAP API.</div>
						</div>
					</div>

					<div class="form-section">
						<h2>Authentication</h2>

						<div class="form-group">
							<label for="tenantId">Tenant ID (Optional)</label>
							<input type="text" id="tenantId" name="tenantId" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" value="${formData['tenantId'] || ''}">
							<div class="help-text">Your Azure AD tenant ID. Optional for Interactive/DeviceCode/UsernamePassword (uses "organizations" authority). Required for Service Principal.</div>
						</div>

						<div class="form-group">
							<label for="authenticationMethod">Authentication Method <span style="color: var(--vscode-errorForeground);">*</span></label>
							<select id="authenticationMethod" name="authenticationMethod" required>
								<option value="Interactive" ${formData['authenticationMethod'] === 'Interactive' ? 'selected' : ''}>Interactive (Browser)</option>
								<option value="ServicePrincipal" ${formData['authenticationMethod'] === 'ServicePrincipal' ? 'selected' : ''}>Service Principal (Client Secret)</option>
								<option value="UsernamePassword" ${formData['authenticationMethod'] === 'UsernamePassword' ? 'selected' : ''}>Username/Password</option>
								<option value="DeviceCode" ${formData['authenticationMethod'] === 'DeviceCode' ? 'selected' : ''}>Device Code</option>
							</select>
							<div class="help-text">Select how you want to authenticate to this environment</div>
						</div>

						<div class="form-group">
							<label for="publicClientId">Public Client ID <span style="color: var(--vscode-errorForeground);">*</span></label>
							<input type="text" id="publicClientId" name="publicClientId" value="${formData['publicClientId'] || '51f81489-12ee-4a9e-aaae-a2591f45987d'}" placeholder="51f81489-12ee-4a9e-aaae-a2591f45987d" required>
							<div class="help-text">Application (client) ID for Interactive/DeviceCode flows. Default is Microsoft's official public client ID.</div>
						</div>

						<div class="conditional-field" data-auth-method="ServicePrincipal" style="display: ${formData['authenticationMethod'] === 'ServicePrincipal' ? 'block' : 'none'};">
							<div class="form-group">
								<label for="clientId">Client ID</label>
								<input type="text" id="clientId" name="clientId" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" value="${formData['clientId'] || ''}">
								<div class="help-text">Application ID for service principal</div>
							</div>

							<div class="form-group">
								<label for="clientSecret">Client Secret</label>
								<input type="password" id="clientSecret" name="clientSecret" placeholder="Enter client secret" value="${formData['clientSecret'] || ''}">
								<div class="help-text">Secret value (stored securely)</div>
							</div>
						</div>

						<div class="conditional-field" data-auth-method="UsernamePassword" style="display: ${formData['authenticationMethod'] === 'UsernamePassword' ? 'block' : 'none'};">
							<div class="form-group">
								<label for="username">Username</label>
								<input type="text" id="username" name="username" placeholder="user@domain.com" value="${formData['username'] || ''}">
								<div class="help-text">Dataverse username</div>
							</div>

							<div class="form-group">
								<label for="password">Password</label>
								<input type="password" id="password" name="password" placeholder="Enter password" value="${formData['password'] || ''}">
								<div class="help-text">Password (stored securely)</div>
							</div>
						</div>
					</div>
				</form>
			</div>
		`;
	}
}
