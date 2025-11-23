import { DomainError } from '../errors/DomainError';

import { DataverseUrl } from './DataverseUrl';
import { TenantId } from './TenantId';
import { ClientId } from './ClientId';
import { EnvironmentName } from './EnvironmentName';
import { EnvironmentId } from './EnvironmentId';
import { AuthenticationMethod, AuthenticationMethodType } from './AuthenticationMethod';
import { ValidationResult } from './ValidationResult';

describe('ValueObjects', () => {
	describe('DataverseUrl', () => {
		describe('constructor', () => {
			it('should create valid Dataverse URL when valid URL provided', () => {
				const url = new DataverseUrl('https://org.crm.dynamics.com');
				expect(url.getValue()).toBe('https://org.crm.dynamics.com');
			});

			it('should normalize URL by removing trailing slash when URL has trailing slash', () => {
				const url = new DataverseUrl('https://org.crm.dynamics.com/');
				expect(url.getValue()).toBe('https://org.crm.dynamics.com');
			});

			it('should upgrade http to https when http URL provided', () => {
				const url = new DataverseUrl('http://org.crm.dynamics.com');
				expect(url.getValue()).toBe('https://org.crm.dynamics.com');
			});

			it('should accept regional URLs when regional URL provided', () => {
				const url1 = new DataverseUrl('https://org.crm4.dynamics.com');
				expect(url1.getValue()).toBe('https://org.crm4.dynamics.com');

				const url2 = new DataverseUrl('https://org.crm.uk.dynamics.com');
				expect(url2.getValue()).toBe('https://org.crm.uk.dynamics.com');
			});

			it('should throw error when empty URL provided', () => {
				expect(() => new DataverseUrl('')).toThrow(DomainError);
				expect(() => new DataverseUrl('   ')).toThrow(DomainError);
			});

			it('should throw error when invalid URL format provided', () => {
				expect(() => new DataverseUrl('https://example.com')).toThrow(DomainError);
				expect(() => new DataverseUrl('not-a-url')).toThrow(DomainError);
				expect(() => new DataverseUrl('ftp://org.crm.dynamics.com')).toThrow(DomainError);
			});
		});

		describe('isValid', () => {
			it('should return true for valid URL', () => {
				const url = new DataverseUrl('https://org.crm.dynamics.com');
				expect(url.isValid()).toBe(true);
			});
		});

		describe('getApiBaseUrl', () => {
			it('should return API base URL', () => {
				const url = new DataverseUrl('https://org.crm.dynamics.com');
				expect(url.getApiBaseUrl()).toBe('https://org.crm.dynamics.com/api/data/v9.2');
			});

			it('should return API base URL for regional instances', () => {
				const url1 = new DataverseUrl('https://myorg.crm4.dynamics.com');
				expect(url1.getApiBaseUrl()).toBe('https://myorg.crm4.dynamics.com/api/data/v9.2');

				const url2 = new DataverseUrl('https://myorg.crm.uk.dynamics.com');
				expect(url2.getApiBaseUrl()).toBe('https://myorg.crm.uk.dynamics.com/api/data/v9.2');
			});
		});

		describe('getOrganizationName', () => {
			it('should extract organization name from US URL', () => {
				const url = new DataverseUrl('https://contoso.crm.dynamics.com');
				expect(url.getOrganizationName()).toBe('contoso');
			});

			it('should extract organization name from regional URLs', () => {
				const url1 = new DataverseUrl('https://contoso.crm4.dynamics.com');
				expect(url1.getOrganizationName()).toBe('contoso');

				const url2 = new DataverseUrl('https://fabrikam.crm.uk.dynamics.com');
				expect(url2.getOrganizationName()).toBe('fabrikam');

				const url3 = new DataverseUrl('https://adventureworks.crm11.de.dynamics.com');
				expect(url3.getOrganizationName()).toBe('adventureworks');
			});

			it('should extract organization name with hyphens', () => {
				const url = new DataverseUrl('https://my-org-name.crm.dynamics.com');
				expect(url.getOrganizationName()).toBe('my-org-name');
			});

			it('should extract organization name with numbers', () => {
				const url = new DataverseUrl('https://org123.crm.dynamics.com');
				expect(url.getOrganizationName()).toBe('org123');
			});

			it('should throw error if organization name cannot be extracted', () => {
				// Create a valid URL then manipulate internal state to test error path
				const url = new DataverseUrl('https://org.crm.dynamics.com');

				// Override the value to simulate a URL that passes validation but has no hostname parts
				// This tests the error path where parts.length === 0 or parts[0] is empty
				Object.defineProperty(url, 'value', {
					get: () => 'https://.crm.dynamics.com',
					configurable: true
				});

				expect(() => url.getOrganizationName()).toThrow(DomainError);
				expect(() => url.getOrganizationName()).toThrow('Unable to extract organization name from Dataverse URL');
			});

			it('should throw error if URL parsing fails', () => {
				const url = new DataverseUrl('https://org.crm.dynamics.com');

				// Override value to an invalid URL that would cause URL constructor to throw
				Object.defineProperty(url, 'value', {
					get: () => 'not-a-valid-url-scheme',
					configurable: true
				});

				expect(() => url.getOrganizationName()).toThrow(DomainError);
				expect(() => url.getOrganizationName()).toThrow('Invalid Dataverse URL format');
			});
		});

		describe('edge cases', () => {
			it('should normalize URL with trailing slash', () => {
				const url = new DataverseUrl('https://org.crm.dynamics.com/');
				expect(url.getValue()).toBe('https://org.crm.dynamics.com');
			});

			it('should handle URL with whitespace', () => {
				const url = new DataverseUrl('  https://org.crm.dynamics.com  ');
				expect(url.getValue()).toBe('https://org.crm.dynamics.com');
			});

			it('should throw for URL without protocol', () => {
				expect(() => new DataverseUrl('org.crm.dynamics.com')).toThrow(DomainError);
			});

			it('should throw for non-dynamics.com domain', () => {
				expect(() => new DataverseUrl('https://org.crm.microsoft.com')).toThrow(DomainError);
			});

			it('should throw for URL with path segments', () => {
				expect(() => new DataverseUrl('https://org.crm.dynamics.com/some/path')).toThrow(DomainError);
			});

			it('should throw for URL with query parameters', () => {
				expect(() => new DataverseUrl('https://org.crm.dynamics.com?param=value')).toThrow(DomainError);
			});
		});
	});

	describe('TenantId', () => {
		describe('constructor', () => {
			it('should create valid tenant ID', () => {
				const tenantId = new TenantId('00000000-0000-0000-0000-000000000000');
				expect(tenantId.getValue()).toBe('00000000-0000-0000-0000-000000000000');
			});

			it('should normalize to lowercase', () => {
				const tenantId = new TenantId('ABCDEF12-3456-7890-ABCD-EF1234567890');
				expect(tenantId.getValue()).toBe('abcdef12-3456-7890-abcd-ef1234567890');
			});

			it('should trim whitespace', () => {
				const tenantId = new TenantId('  00000000-0000-0000-0000-000000000000  ');
				expect(tenantId.getValue()).toBe('00000000-0000-0000-0000-000000000000');
			});

			it('should allow empty tenant ID (uses organizations authority)', () => {
				const tenantId1 = new TenantId('');
				expect(tenantId1.getValue()).toBeUndefined();
				expect(tenantId1.isValid()).toBe(true);
				expect(tenantId1.isProvided()).toBe(false);

				const tenantId2 = new TenantId('   ');
				expect(tenantId2.getValue()).toBeUndefined();
				expect(tenantId2.isValid()).toBe(true);
				expect(tenantId2.isProvided()).toBe(false);

				const tenantId3 = new TenantId(undefined);
				expect(tenantId3.getValue()).toBeUndefined();
				expect(tenantId3.isValid()).toBe(true);
				expect(tenantId3.isProvided()).toBe(false);
			});

			it('should throw error for invalid GUID format', () => {
				expect(() => new TenantId('not-a-guid')).toThrow(DomainError);
				expect(() => new TenantId('00000000')).toThrow(DomainError);
				expect(() => new TenantId('00000000-0000-0000-0000')).toThrow(DomainError);
			});
		});

		describe('isValid', () => {
			it('should return true for valid tenant ID', () => {
				const tenantId = new TenantId('00000000-0000-0000-0000-000000000000');
				expect(tenantId.isValid()).toBe(true);
			});
		});
	});

	describe('ClientId', () => {
		describe('constructor', () => {
			it('should create valid client ID', () => {
				const clientId = new ClientId('11111111-1111-1111-1111-111111111111');
				expect(clientId.getValue()).toBe('11111111-1111-1111-1111-111111111111');
			});

			it('should normalize to lowercase', () => {
				const clientId = new ClientId('ABCDEF12-3456-7890-ABCD-EF1234567890');
				expect(clientId.getValue()).toBe('abcdef12-3456-7890-abcd-ef1234567890');
			});

			it('should trim whitespace', () => {
				const clientId = new ClientId('  11111111-1111-1111-1111-111111111111  ');
				expect(clientId.getValue()).toBe('11111111-1111-1111-1111-111111111111');
			});

			it('should throw error for empty client ID', () => {
				expect(() => new ClientId('')).toThrow(DomainError);
				expect(() => new ClientId('   ')).toThrow(DomainError);
			});

			it('should throw error for invalid GUID format', () => {
				expect(() => new ClientId('not-a-guid')).toThrow(DomainError);
				expect(() => new ClientId('11111111')).toThrow(DomainError);
			});
		});

		describe('isValid', () => {
			it('should return true for valid client ID', () => {
				const clientId = new ClientId('11111111-1111-1111-1111-111111111111');
				expect(clientId.isValid()).toBe(true);
			});
		});

		describe('isMicrosoftExampleClientId', () => {
			it('should return true for Microsoft example client ID', () => {
				const clientId = new ClientId('51f81489-12ee-4a9e-aaae-a2591f45987d');
				expect(clientId.isMicrosoftExampleClientId()).toBe(true);
			});

			it('should return false for other client IDs', () => {
				const clientId = new ClientId('11111111-1111-1111-1111-111111111111');
				expect(clientId.isMicrosoftExampleClientId()).toBe(false);
			});
		});
	});

	describe('EnvironmentName', () => {
		describe('constructor', () => {
			it('should create valid environment name', () => {
				const name = new EnvironmentName('Production');
				expect(name.getValue()).toBe('Production');
			});

			it('should trim whitespace', () => {
				const name = new EnvironmentName('  Development  ');
				expect(name.getValue()).toBe('Development');
			});

			it('should throw error for empty name', () => {
				expect(() => new EnvironmentName('')).toThrow(DomainError);
				expect(() => new EnvironmentName('   ')).toThrow(DomainError);
			});

			it('should throw error for name exceeding 100 characters', () => {
				const longName = 'a'.repeat(101);
				expect(() => new EnvironmentName(longName)).toThrow(DomainError);
			});
		});

		describe('equals', () => {
			it('should return true for matching names', () => {
				const name = new EnvironmentName('Production');
				expect(name.equals('Production')).toBe(true);
			});

			it('should return false for non-matching names', () => {
				const name = new EnvironmentName('Production');
				expect(name.equals('Development')).toBe(false);
			});

			it('should be case-sensitive', () => {
				const name = new EnvironmentName('Production');
				expect(name.equals('production')).toBe(false);
			});
		});

		describe('isValid', () => {
			it('should return true for valid name', () => {
				const name = new EnvironmentName('Production');
				expect(name.isValid()).toBe(true);
			});
		});
	});

	describe('EnvironmentId', () => {
		describe('constructor', () => {
			it('should create valid environment ID', () => {
				const id = new EnvironmentId('env-123-abc');
				expect(id.getValue()).toBe('env-123-abc');
			});

			it('should throw error for empty ID', () => {
				expect(() => new EnvironmentId('')).toThrow(DomainError);
				expect(() => new EnvironmentId('   ')).toThrow(DomainError);
			});
		});

		describe('generate', () => {
			it('should generate unique IDs', () => {
				const id1 = EnvironmentId.generate();
				const id2 = EnvironmentId.generate();

				expect(id1.getValue()).not.toBe(id2.getValue());
			});

			it('should generate IDs with env- prefix', () => {
				const id = EnvironmentId.generate();
				expect(id.getValue()).toMatch(/^env-\d+-[a-z0-9]+$/);
			});
		});

		describe('equals', () => {
			it('should return true for matching IDs', () => {
				const id1 = new EnvironmentId('env-123-abc');
				const id2 = new EnvironmentId('env-123-abc');

				expect(id1.equals(id2)).toBe(true);
			});

			it('should return false for non-matching IDs', () => {
				const id1 = new EnvironmentId('env-123-abc');
				const id2 = new EnvironmentId('env-456-def');

				expect(id1.equals(id2)).toBe(false);
			});
		});
	});

	describe('AuthenticationMethod', () => {
		describe('constructor', () => {
			it('should create Interactive auth method', () => {
				const method = new AuthenticationMethod(AuthenticationMethodType.Interactive);
				expect(method.getType()).toBe(AuthenticationMethodType.Interactive);
			});

			it('should create ServicePrincipal auth method', () => {
				const method = new AuthenticationMethod(AuthenticationMethodType.ServicePrincipal);
				expect(method.getType()).toBe(AuthenticationMethodType.ServicePrincipal);
			});

			it('should create UsernamePassword auth method', () => {
				const method = new AuthenticationMethod(AuthenticationMethodType.UsernamePassword);
				expect(method.getType()).toBe(AuthenticationMethodType.UsernamePassword);
			});

			it('should create DeviceCode auth method', () => {
				const method = new AuthenticationMethod(AuthenticationMethodType.DeviceCode);
				expect(method.getType()).toBe(AuthenticationMethodType.DeviceCode);
			});
		});

		describe('requiresCredentials', () => {
			it('should return false for Interactive', () => {
				const method = new AuthenticationMethod(AuthenticationMethodType.Interactive);
				expect(method.requiresCredentials()).toBe(false);
			});

			it('should return false for DeviceCode', () => {
				const method = new AuthenticationMethod(AuthenticationMethodType.DeviceCode);
				expect(method.requiresCredentials()).toBe(false);
			});

			it('should return true for ServicePrincipal', () => {
				const method = new AuthenticationMethod(AuthenticationMethodType.ServicePrincipal);
				expect(method.requiresCredentials()).toBe(true);
			});

			it('should return true for UsernamePassword', () => {
				const method = new AuthenticationMethod(AuthenticationMethodType.UsernamePassword);
				expect(method.requiresCredentials()).toBe(true);
			});
		});

		describe('requiresClientCredentials', () => {
			it('should return true only for ServicePrincipal', () => {
				const sp = new AuthenticationMethod(AuthenticationMethodType.ServicePrincipal);
				expect(sp.requiresClientCredentials()).toBe(true);

				const interactive = new AuthenticationMethod(AuthenticationMethodType.Interactive);
				expect(interactive.requiresClientCredentials()).toBe(false);

				const upw = new AuthenticationMethod(AuthenticationMethodType.UsernamePassword);
				expect(upw.requiresClientCredentials()).toBe(false);
			});
		});

		describe('requiresUsernamePassword', () => {
			it('should return true only for UsernamePassword', () => {
				const upw = new AuthenticationMethod(AuthenticationMethodType.UsernamePassword);
				expect(upw.requiresUsernamePassword()).toBe(true);

				const interactive = new AuthenticationMethod(AuthenticationMethodType.Interactive);
				expect(interactive.requiresUsernamePassword()).toBe(false);

				const sp = new AuthenticationMethod(AuthenticationMethodType.ServicePrincipal);
				expect(sp.requiresUsernamePassword()).toBe(false);
			});
		});

		describe('isInteractiveFlow', () => {
			it('should return true for Interactive and DeviceCode', () => {
				const interactive = new AuthenticationMethod(AuthenticationMethodType.Interactive);
				expect(interactive.isInteractiveFlow()).toBe(true);

				const deviceCode = new AuthenticationMethod(AuthenticationMethodType.DeviceCode);
				expect(deviceCode.isInteractiveFlow()).toBe(true);
			});

			it('should return false for ServicePrincipal and UsernamePassword', () => {
				const sp = new AuthenticationMethod(AuthenticationMethodType.ServicePrincipal);
				expect(sp.isInteractiveFlow()).toBe(false);

				const upw = new AuthenticationMethod(AuthenticationMethodType.UsernamePassword);
				expect(upw.isInteractiveFlow()).toBe(false);
			});
		});

		describe('toString', () => {
			it('should return string representation', () => {
				const method = new AuthenticationMethod(AuthenticationMethodType.Interactive);
				expect(method.toString()).toBe('Interactive');
			});

			it('should return string representation for all auth types', () => {
				const sp = new AuthenticationMethod(AuthenticationMethodType.ServicePrincipal);
				expect(sp.toString()).toBe('ServicePrincipal');

				const upw = new AuthenticationMethod(AuthenticationMethodType.UsernamePassword);
				expect(upw.toString()).toBe('UsernamePassword');

				const deviceCode = new AuthenticationMethod(AuthenticationMethodType.DeviceCode);
				expect(deviceCode.toString()).toBe('DeviceCode');
			});
		});

		describe('equals', () => {
			it('should return true for same auth method types', () => {
				const method1 = new AuthenticationMethod(AuthenticationMethodType.Interactive);
				const method2 = new AuthenticationMethod(AuthenticationMethodType.Interactive);
				expect(method1.equals(method2)).toBe(true);
			});

			it('should return false for different auth method types', () => {
				const interactive = new AuthenticationMethod(AuthenticationMethodType.Interactive);
				const sp = new AuthenticationMethod(AuthenticationMethodType.ServicePrincipal);
				expect(interactive.equals(sp)).toBe(false);
			});

			it('should work for ServicePrincipal comparison', () => {
				const sp1 = new AuthenticationMethod(AuthenticationMethodType.ServicePrincipal);
				const sp2 = new AuthenticationMethod(AuthenticationMethodType.ServicePrincipal);
				expect(sp1.equals(sp2)).toBe(true);
			});

			it('should work for UsernamePassword comparison', () => {
				const upw1 = new AuthenticationMethod(AuthenticationMethodType.UsernamePassword);
				const upw2 = new AuthenticationMethod(AuthenticationMethodType.UsernamePassword);
				expect(upw1.equals(upw2)).toBe(true);
			});

			it('should work for DeviceCode comparison', () => {
				const dc1 = new AuthenticationMethod(AuthenticationMethodType.DeviceCode);
				const dc2 = new AuthenticationMethod(AuthenticationMethodType.DeviceCode);
				expect(dc1.equals(dc2)).toBe(true);
			});

			it('should return false when comparing different non-interactive types', () => {
				const sp = new AuthenticationMethod(AuthenticationMethodType.ServicePrincipal);
				const upw = new AuthenticationMethod(AuthenticationMethodType.UsernamePassword);
				expect(sp.equals(upw)).toBe(false);
			});
		});

		describe('requiresClientCredentials - comprehensive coverage', () => {
			it('should return false for DeviceCode', () => {
				const deviceCode = new AuthenticationMethod(AuthenticationMethodType.DeviceCode);
				expect(deviceCode.requiresClientCredentials()).toBe(false);
			});
		});
	});

	describe('ValidationResult', () => {
		describe('success', () => {
			it('should create valid success result', () => {
				const result = ValidationResult.success();

				expect(result.isValid).toBe(true);
				expect(result.errors).toEqual([]);
				expect(result.warnings).toEqual([]);
			});
		});

		describe('failure', () => {
			it('should create invalid result with errors', () => {
				const errors = ['Error 1', 'Error 2'];
				const result = ValidationResult.failure(errors);

				expect(result.isValid).toBe(false);
				expect(result.errors).toEqual(errors);
				expect(result.warnings).toEqual([]);
			});

			it('should create result with single error', () => {
				const result = ValidationResult.failure(['Single error']);

				expect(result.isValid).toBe(false);
				expect(result.errors).toEqual(['Single error']);
			});

			it('should create result with empty error array', () => {
				const result = ValidationResult.failure([]);

				expect(result.isValid).toBe(false);
				expect(result.errors).toEqual([]);
			});
		});

		describe('successWithWarnings', () => {
			it('should create valid result with warnings', () => {
				const warnings = ['Warning 1', 'Warning 2'];
				const result = ValidationResult.successWithWarnings(warnings);

				expect(result.isValid).toBe(true);
				expect(result.errors).toEqual([]);
				expect(result.warnings).toEqual(warnings);
			});

			it('should create result with single warning', () => {
				const result = ValidationResult.successWithWarnings(['Single warning']);

				expect(result.isValid).toBe(true);
				expect(result.warnings).toEqual(['Single warning']);
			});

			it('should create result with empty warning array', () => {
				const result = ValidationResult.successWithWarnings([]);

				expect(result.isValid).toBe(true);
				expect(result.warnings).toEqual([]);
			});
		});

		describe('getFirstError', () => {
			it('should return first error when errors exist', () => {
				const result = ValidationResult.failure(['First error', 'Second error']);

				expect(result.getFirstError()).toBe('First error');
			});

			it('should return undefined when no errors', () => {
				const result = ValidationResult.success();

				expect(result.getFirstError()).toBeUndefined();
			});

			it('should return undefined for empty error array', () => {
				const result = ValidationResult.failure([]);

				expect(result.getFirstError()).toBeUndefined();
			});
		});

		describe('hasWarnings', () => {
			it('should return true when warnings exist', () => {
				const result = ValidationResult.successWithWarnings(['Warning']);

				expect(result.hasWarnings()).toBe(true);
			});

			it('should return false when no warnings', () => {
				const result = ValidationResult.success();

				expect(result.hasWarnings()).toBe(false);
			});

			it('should return false for empty warning array', () => {
				const result = ValidationResult.successWithWarnings([]);

				expect(result.hasWarnings()).toBe(false);
			});

			it('should return false for failure result without warnings', () => {
				const result = ValidationResult.failure(['Error']);

				expect(result.hasWarnings()).toBe(false);
			});
		});

		describe('immutability', () => {
			it('should have readonly properties at compile time', () => {
				const result = ValidationResult.failure(['Error']);

				// TypeScript enforces readonly at compile time
				// Note: @ts-expect-error doesn't prevent runtime assignment in JS
				// but TypeScript will catch this during compilation

				// Verify properties are set correctly
				expect(result.isValid).toBe(false);
				expect(result.errors).toEqual(['Error']);
				expect(result.warnings).toEqual([]);
			});

			it('should expose errors array directly', () => {
				const errors = ['Error 1'];
				const result = ValidationResult.failure(errors);

				// Note: Array is not defensively copied in current implementation
				// Modifying original array WILL affect result
				errors.push('Error 2');
				expect(result.errors).toEqual(['Error 1', 'Error 2']);
			});

			it('should create independent results', () => {
				const result1 = ValidationResult.failure(['Error 1']);
				const result2 = ValidationResult.failure(['Error 2']);

				expect(result1.errors).not.toEqual(result2.errors);
			});
		});
	});
});
