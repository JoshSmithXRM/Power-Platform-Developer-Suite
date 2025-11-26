import { EnvironmentFormSection } from './EnvironmentFormSection';
import { SectionPosition } from '../../../../shared/infrastructure/ui/types/SectionPosition';

describe('EnvironmentFormSection', () => {
	let section: EnvironmentFormSection;

	beforeEach(() => {
		section = new EnvironmentFormSection();
	});

	describe('position', () => {
		it('should set position to Main', () => {
			expect(section.position).toBe(SectionPosition.Main);
		});
	});

	describe('render', () => {
		describe('basic structure', () => {
			it('should render form container with correct structure', () => {
				const html = section.render({});

				expect(html).toContain('<div class="form-container">');
				expect(html).toContain('<form id="environmentForm">');
				expect(html).toContain('</form>');
				expect(html).toContain('</div>');
			});

			it('should render Basic Information section', () => {
				const html = section.render({});

				expect(html).toContain('<div class="form-section">');
				expect(html).toContain('<h2>Basic Information</h2>');
			});

			it('should render Authentication section', () => {
				const html = section.render({});

				expect(html).toContain('<h2>Authentication</h2>');
			});
		});

		describe('basic information fields', () => {
			it('should render Environment Name field with required marker', () => {
				const html = section.render({});

				expect(html).toContain('<label for="name">Environment Name <span style="color: var(--vscode-errorForeground);">*</span></label>');
				expect(html).toContain('<input type="text" id="name" name="name"');
				expect(html).toContain('placeholder="e.g., DEV"');
				expect(html).toContain('required>');
			});

			it('should render Environment Name help text', () => {
				const html = section.render({});

				expect(html).toContain('<div class="help-text">A friendly name to identify this environment</div>');
			});

			it('should render Dataverse URL field with required marker', () => {
				const html = section.render({});

				expect(html).toContain('<label for="dataverseUrl">Dataverse URL <span style="color: var(--vscode-errorForeground);">*</span></label>');
				expect(html).toContain('<input type="text" id="dataverseUrl" name="dataverseUrl"');
				expect(html).toContain('placeholder="https://org.crm.dynamics.com"');
				expect(html).toContain('required>');
			});

			it('should render Dataverse URL help text', () => {
				const html = section.render({});

				expect(html).toContain('<div class="help-text">The URL of your Dataverse organization</div>');
			});

			it('should render Environment ID field as optional', () => {
				const html = section.render({});

				expect(html).toContain('<label for="environmentId">Environment ID (Optional)</label>');
				expect(html).toContain('<input type="text" id="environmentId" name="powerPlatformEnvironmentId"');
				expect(html).toContain('placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"');
				expect(html).not.toContain('name="powerPlatformEnvironmentId" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" value="" required>');
			});

			it('should render Environment ID with discover button', () => {
				const html = section.render({});

				expect(html).toContain('<button type="button" id="discoverEnvironmentId" data-custom-handler');
				expect(html).toContain('>Discover ID</button>');
			});

			it('should render Environment ID help text', () => {
				const html = section.render({});

				expect(html).toContain('<div class="help-text">Optional: The unique GUID for this environment (for Power Apps Maker portal). Click "Discover ID" to auto-populate from BAP API.</div>');
			});

			it('should populate Environment Name value from formData', () => {
				const html = section.render({
					formData: { name: 'Production Environment' }
				});

				expect(html).toContain('value="Production Environment"');
			});

			it('should populate Dataverse URL value from formData', () => {
				const html = section.render({
					formData: { dataverseUrl: 'https://contoso.crm.dynamics.com' }
				});

				expect(html).toContain('value="https://contoso.crm.dynamics.com"');
			});

			it('should populate Environment ID value from formData', () => {
				const html = section.render({
					formData: { powerPlatformEnvironmentId: '12345678-1234-1234-1234-123456789012' }
				});

				expect(html).toContain('value="12345678-1234-1234-1234-123456789012"');
			});
		});

		describe('authentication fields', () => {
			it('should render Tenant ID field as optional', () => {
				const html = section.render({});

				expect(html).toContain('<label for="tenantId">Tenant ID (Optional)</label>');
				expect(html).toContain('<input type="text" id="tenantId" name="tenantId"');
				expect(html).toContain('placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"');
				expect(html).not.toContain('name="tenantId" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" value="" required>');
			});

			it('should render Tenant ID help text', () => {
				const html = section.render({});

				expect(html).toContain('<div class="help-text">Your Azure AD tenant ID. Optional for Interactive/DeviceCode/UsernamePassword (uses "organizations" authority). Required for Service Principal.</div>');
			});

			it('should render Authentication Method dropdown with required marker', () => {
				const html = section.render({});

				expect(html).toContain('<label for="authenticationMethod">Authentication Method <span style="color: var(--vscode-errorForeground);">*</span></label>');
				expect(html).toContain('<select id="authenticationMethod" name="authenticationMethod" required>');
			});

			it('should render all authentication method options', () => {
				const html = section.render({});

				expect(html).toContain('<option value="Interactive"');
				expect(html).toContain('>Interactive (Browser)</option>');
				expect(html).toContain('<option value="ServicePrincipal"');
				expect(html).toContain('>Service Principal (Client Secret)</option>');
				expect(html).toContain('<option value="UsernamePassword"');
				expect(html).toContain('>Username/Password</option>');
				expect(html).toContain('<option value="DeviceCode"');
				expect(html).toContain('>Device Code</option>');
			});

			it('should select authentication method from formData', () => {
				const html = section.render({
					formData: { authenticationMethod: 'ServicePrincipal' }
				});

				const servicePrincipalOption = html.match(/<option value="ServicePrincipal"[^>]*>/)?.[0] ?? '';
				expect(servicePrincipalOption).toContain('selected');
			});

			it('should render Authentication Method help text', () => {
				const html = section.render({});

				expect(html).toContain('<div class="help-text">Select how you want to authenticate to this environment</div>');
			});

			it('should render Public Client ID field with required marker', () => {
				const html = section.render({});

				expect(html).toContain('<label for="publicClientId">Public Client ID <span style="color: var(--vscode-errorForeground);">*</span></label>');
				expect(html).toContain('<input type="text" id="publicClientId" name="publicClientId"');
				expect(html).toContain('placeholder="51f81489-12ee-4a9e-aaae-a2591f45987d"');
				expect(html).toContain('required>');
			});

			it('should use default Public Client ID when not provided', () => {
				const html = section.render({});

				expect(html).toContain('value="51f81489-12ee-4a9e-aaae-a2591f45987d"');
			});

			it('should render Public Client ID help text', () => {
				const html = section.render({});

				expect(html).toContain('<div class="help-text">Application (client) ID for Interactive/DeviceCode flows. Default is Microsoft\'s official public client ID.</div>');
			});

			it('should populate Tenant ID value from formData', () => {
				const html = section.render({
					formData: { tenantId: '87654321-4321-4321-4321-210987654321' }
				});

				expect(html).toContain('value="87654321-4321-4321-4321-210987654321"');
			});

			it('should populate Public Client ID value from formData', () => {
				const html = section.render({
					formData: { publicClientId: 'custom-client-id' }
				});

				expect(html).toContain('value="custom-client-id"');
			});
		});

		describe('conditional authentication fields', () => {
			it('should render Service Principal fields with display none by default', () => {
				const html = section.render({});

				expect(html).toContain('<div class="conditional-field" data-auth-method="ServicePrincipal" style="display: none;">');
			});

			it('should render Service Principal fields with display block when selected', () => {
				const html = section.render({
					formData: { authenticationMethod: 'ServicePrincipal' }
				});

				expect(html).toContain('<div class="conditional-field" data-auth-method="ServicePrincipal" style="display: block;">');
			});

			it('should render Client ID field for Service Principal', () => {
				const html = section.render({});

				expect(html).toContain('<label for="clientId">Client ID</label>');
				expect(html).toContain('<input type="text" id="clientId" name="clientId"');
				expect(html).toContain('placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"');
			});

			it('should render Client Secret field for Service Principal', () => {
				const html = section.render({});

				expect(html).toContain('<label for="clientSecret">Client Secret</label>');
				expect(html).toContain('<input type="password" id="clientSecret" name="clientSecret"');
				expect(html).toContain('placeholder="Enter client secret"');
			});

			it('should populate Client ID value from formData', () => {
				const html = section.render({
					formData: { clientId: 'sp-client-id-123' }
				});

				expect(html).toContain('value="sp-client-id-123"');
			});

			it('should populate Client Secret value from formData', () => {
				const html = section.render({
					formData: { clientSecret: 'secret-value-123' }
				});

				expect(html).toContain('value="secret-value-123"');
			});

			it('should render Username/Password fields with display none by default', () => {
				const html = section.render({});

				expect(html).toContain('<div class="conditional-field" data-auth-method="UsernamePassword" style="display: none;">');
			});

			it('should render Username/Password fields with display block when selected', () => {
				const html = section.render({
					formData: { authenticationMethod: 'UsernamePassword' }
				});

				expect(html).toContain('<div class="conditional-field" data-auth-method="UsernamePassword" style="display: block;">');
			});

			it('should render Username field', () => {
				const html = section.render({});

				expect(html).toContain('<label for="username">Username</label>');
				expect(html).toContain('<input type="text" id="username" name="username"');
				expect(html).toContain('placeholder="user@domain.com"');
			});

			it('should render Password field', () => {
				const html = section.render({});

				expect(html).toContain('<label for="password">Password</label>');
				expect(html).toContain('<input type="password" id="password" name="password"');
				expect(html).toContain('placeholder="Enter password"');
			});

			it('should populate Username value from formData', () => {
				const html = section.render({
					formData: { username: 'john.doe@contoso.com' }
				});

				expect(html).toContain('value="john.doe@contoso.com"');
			});

			it('should populate Password value from formData', () => {
				const html = section.render({
					formData: { password: 'password123' }
				});

				expect(html).toContain('value="password123"');
			});
		});

		describe('empty and null handling', () => {
			it('should handle undefined formData', () => {
				const html = section.render({});

				expect(html).toContain('value=""');
				expect(html).toBeDefined();
			});

			it('should handle null formData', () => {
				const html = section.render({ formData: null as unknown as Record<string, string> });

				expect(html).toBeDefined();
				expect(html).toContain('value=""');
			});

			it('should handle empty formData object', () => {
				const html = section.render({ formData: {} });

				expect(html).toContain('value=""');
				expect(html).toBeDefined();
			});

			it('should use empty string for missing field values', () => {
				const html = section.render({ formData: { name: 'Test' } });

				// Other fields should have empty values
				expect(html).toMatch(/name="dataverseUrl"[^>]*value=""/);
			});
		});

		describe('XSS prevention and HTML escaping', () => {
			it('should NOT escape script tags in Environment Name (SECURITY VULNERABILITY)', () => {
				const html = section.render({
					formData: { name: '<script>alert("xss")</script>' }
				});

				// FAILING TEST - demonstrates security issue
				// Current implementation does NOT escape HTML
				expect(html).toContain('value="<script>alert("xss")</script>"');
				// Should be escaped to: value="&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;"
			});

			it('should NOT escape double quotes in Dataverse URL (SECURITY VULNERABILITY)', () => {
				const html = section.render({
					formData: { dataverseUrl: 'https://test.com" onload="alert(1)' }
				});

				// FAILING TEST - demonstrates attribute injection vulnerability
				expect(html).toContain('value="https://test.com" onload="alert(1)"');
				// Should be escaped to: value="https://test.com&quot; onload=&quot;alert(1)"
			});

			it('should NOT escape single quotes in Client ID (SECURITY VULNERABILITY)', () => {
				const html = section.render({
					formData: { clientId: "test' onclick='alert(1)" }
				});

				// FAILING TEST - demonstrates XSS vulnerability
				expect(html).toContain("value=\"test' onclick='alert(1)\"");
				// Should be escaped to: value="test&#39; onclick=&#39;alert(1)"
			});

			it('should NOT escape ampersands in Tenant ID (SECURITY VULNERABILITY)', () => {
				const html = section.render({
					formData: { tenantId: 'test&<>&"' }
				});

				// FAILING TEST
				expect(html).toContain('value="test&<>&"');
				// Should be escaped to: value="test&amp;&lt;&gt;&amp;&quot;"
			});

			it('should NOT escape HTML entities in Username (SECURITY VULNERABILITY)', () => {
				const html = section.render({
					formData: { username: '<img src=x onerror=alert(1)>' }
				});

				// FAILING TEST
				expect(html).toContain('value="<img src=x onerror=alert(1)>"');
				// Should be escaped to: value="&lt;img src=x onerror=alert(1)&gt;"
			});

			it('should NOT escape special characters in Public Client ID (SECURITY VULNERABILITY)', () => {
				const html = section.render({
					formData: { publicClientId: '"><script>alert("xss")</script><input type="text' }
				});

				// FAILING TEST - demonstrates attribute escape vulnerability
				expect(html).toContain('value=""><script>alert("xss")</script><input type="text"');
				// Should be escaped to: value="&quot;&gt;&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;&lt;input type=&quot;text"
			});

			it('should NOT escape newlines and special chars in Environment ID (SECURITY VULNERABILITY)', () => {
				const html = section.render({
					formData: { powerPlatformEnvironmentId: 'test\n<b>bold</b>' }
				});

				// FAILING TEST
				expect(html).toContain('value="test\n<b>bold</b>"');
				// Should be escaped
			});

			it('should handle malicious authentication method value gracefully', () => {
				const html = section.render({
					formData: { authenticationMethod: 'Interactive" selected="selected"><option value="hack' }
				});

				// The malicious value doesn't match any hardcoded option, so no option is selected
				// This test verifies behavior when authenticationMethod has a malicious value
				// Since none of the options match, the form renders without any selected option
				expect(html).toContain('<option value="Interactive"');
				expect(html).toContain('<option value="ServicePrincipal"');
				expect(html).toContain('<option value="UsernamePassword"');
				expect(html).toContain('<option value="DeviceCode"');
				expect(html).toContain('<option value="UsernamePassword"');
				expect(html).toContain('<option value="DeviceCode"');
			});
		});

		describe('label associations', () => {
			it('should associate labels with input fields using for attribute', () => {
				const html = section.render({});

				expect(html).toContain('<label for="name">');
				expect(html).toContain('<input type="text" id="name"');

				expect(html).toContain('<label for="dataverseUrl">');
				expect(html).toContain('<input type="text" id="dataverseUrl"');

				expect(html).toContain('<label for="environmentId">');
				expect(html).toContain('<input type="text" id="environmentId"');

				expect(html).toContain('<label for="tenantId">');
				expect(html).toContain('<input type="text" id="tenantId"');

				expect(html).toContain('<label for="authenticationMethod">');
				expect(html).toContain('<select id="authenticationMethod"');

				expect(html).toContain('<label for="publicClientId">');
				expect(html).toContain('<input type="text" id="publicClientId"');

				expect(html).toContain('<label for="clientId">');
				expect(html).toContain('<input type="text" id="clientId"');

				expect(html).toContain('<label for="clientSecret">');
				expect(html).toContain('<input type="password" id="clientSecret"');

				expect(html).toContain('<label for="username">');
				expect(html).toContain('<input type="text" id="username"');

				expect(html).toContain('<label for="password">');
				expect(html).toContain('<input type="password" id="password"');
			});
		});

		describe('form completeness', () => {
			it('should render all required form elements', () => {
				const html = section.render({});

				// Structure
				expect(html).toContain('class="form-container"');
				expect(html).toContain('id="environmentForm"');

				// Sections
				expect(html).toContain('class="form-section"');
				expect(html).toContain('<h2>Basic Information</h2>');
				expect(html).toContain('<h2>Authentication</h2>');

				// Form groups
				expect(html).toMatch(/class="form-group"/g);

				// Help texts
				expect(html).toMatch(/class="help-text"/g);

				// Conditional fields
				expect(html).toContain('class="conditional-field"');
				expect(html).toContain('data-auth-method="ServicePrincipal"');
				expect(html).toContain('data-auth-method="UsernamePassword"');
			});

			it('should have correct input types for password fields', () => {
				const html = section.render({});

				expect(html).toContain('<input type="password" id="clientSecret"');
				expect(html).toContain('<input type="password" id="password"');
			});

			it('should have correct input types for text fields', () => {
				const html = section.render({});

				expect(html).toContain('<input type="text" id="name"');
				expect(html).toContain('<input type="text" id="dataverseUrl"');
				expect(html).toContain('<input type="text" id="environmentId"');
				expect(html).toContain('<input type="text" id="tenantId"');
				expect(html).toContain('<input type="text" id="publicClientId"');
				expect(html).toContain('<input type="text" id="clientId"');
				expect(html).toContain('<input type="text" id="username"');
			});
		});
	});
});
