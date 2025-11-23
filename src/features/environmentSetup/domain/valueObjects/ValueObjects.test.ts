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

			it.each<{ url: string }>([
				{ url: 'https://org.crm4.dynamics.com' },
				{ url: 'https://org.crm.uk.dynamics.com' }
			])('should accept regional URL: $url', ({ url }) => {
				const dataverseUrl = new DataverseUrl(url);
				expect(dataverseUrl.getValue()).toBe(url);
			});

			it.each<{ input: string }>([
				{ input: '' },
				{ input: '   ' }
			])('should throw error when empty URL provided: $input', ({ input }) => {
				expect(() => new DataverseUrl(input)).toThrow(DomainError);
			});

			it.each<{ input: string }>([
				{ input: 'https://example.com' },
				{ input: 'not-a-url' },
				{ input: 'ftp://org.crm.dynamics.com' }
			])('should throw error when invalid URL format provided: $input', ({ input }) => {
				expect(() => new DataverseUrl(input)).toThrow(DomainError);
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

			it.each<{ url: string; expected: string }>([
				{ url: 'https://myorg.crm4.dynamics.com', expected: 'https://myorg.crm4.dynamics.com/api/data/v9.2' },
				{ url: 'https://myorg.crm.uk.dynamics.com', expected: 'https://myorg.crm.uk.dynamics.com/api/data/v9.2' }
			])('should return API base URL for regional instance: $url', ({ url, expected }) => {
				const dataverseUrl = new DataverseUrl(url);
				expect(dataverseUrl.getApiBaseUrl()).toBe(expected);
			});
		});

		describe('getOrganizationName', () => {
			it('should extract organization name from US URL', () => {
				const url = new DataverseUrl('https://contoso.crm.dynamics.com');
				expect(url.getOrganizationName()).toBe('contoso');
			});

			it.each<{ url: string; expected: string }>([
				{ url: 'https://contoso.crm4.dynamics.com', expected: 'contoso' },
				{ url: 'https://fabrikam.crm.uk.dynamics.com', expected: 'fabrikam' },
				{ url: 'https://adventureworks.crm11.de.dynamics.com', expected: 'adventureworks' }
			])('should extract organization name from regional URL: $url -> $expected', ({ url, expected }) => {
				const dataverseUrl = new DataverseUrl(url);
				expect(dataverseUrl.getOrganizationName()).toBe(expected);
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

			it.each<{ input: string; description: string }>([
				{ input: 'org.crm.dynamics.com', description: 'URL without protocol' },
				{ input: 'https://org.crm.microsoft.com', description: 'non-dynamics.com domain' },
				{ input: 'https://org.crm.dynamics.com/some/path', description: 'URL with path segments' },
				{ input: 'https://org.crm.dynamics.com?param=value', description: 'URL with query parameters' }
			])('should throw for $description: $input', ({ input }) => {
				expect(() => new DataverseUrl(input)).toThrow(DomainError);
			});
		});
	});

	describe('TenantId', () => {
		describe('constructor', () => {
			it.each<{ input: string; expected: string }>([
				{ input: '00000000-0000-0000-0000-000000000000', expected: '00000000-0000-0000-0000-000000000000' },
				{ input: 'ABCDEF12-3456-7890-ABCD-EF1234567890', expected: 'abcdef12-3456-7890-abcd-ef1234567890' },
				{ input: '  00000000-0000-0000-0000-000000000000  ', expected: '00000000-0000-0000-0000-000000000000' }
			])('should create valid tenant ID with normalization: $input -> $expected', ({ input, expected }) => {
				const tenantId = new TenantId(input);
				expect(tenantId.getValue()).toBe(expected);
			});

			it.each<{ input: string | undefined }>([
				{ input: '' },
				{ input: '   ' },
				{ input: undefined }
			])('should allow empty tenant ID (uses organizations authority): $input', ({ input }) => {
				const tenantId = new TenantId(input);
				expect(tenantId.getValue()).toBeUndefined();
				expect(tenantId.isValid()).toBe(true);
				expect(tenantId.isProvided()).toBe(false);
			});

			it.each<{ input: string }>([
				{ input: 'not-a-guid' },
				{ input: '00000000' },
				{ input: '00000000-0000-0000-0000' }
			])('should throw error for invalid GUID format: $input', ({ input }) => {
				expect(() => new TenantId(input)).toThrow(DomainError);
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
			it.each<{ input: string; expected: string }>([
				{ input: '11111111-1111-1111-1111-111111111111', expected: '11111111-1111-1111-1111-111111111111' },
				{ input: 'ABCDEF12-3456-7890-ABCD-EF1234567890', expected: 'abcdef12-3456-7890-abcd-ef1234567890' },
				{ input: '  11111111-1111-1111-1111-111111111111  ', expected: '11111111-1111-1111-1111-111111111111' }
			])('should create valid client ID with normalization: $input -> $expected', ({ input, expected }) => {
				const clientId = new ClientId(input);
				expect(clientId.getValue()).toBe(expected);
			});

			it.each<{ input: string }>([
				{ input: '' },
				{ input: '   ' },
				{ input: 'not-a-guid' },
				{ input: '11111111' }
			])('should throw error for invalid client ID: $input', ({ input }) => {
				expect(() => new ClientId(input)).toThrow(DomainError);
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

			it.each<{ input: string }>([
				{ input: '' },
				{ input: '   ' }
			])('should throw error for empty name: $input', ({ input }) => {
				expect(() => new EnvironmentName(input)).toThrow(DomainError);
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

			it.each<{ input: string }>([
				{ input: '' },
				{ input: '   ' }
			])('should throw error for empty ID: $input', ({ input }) => {
				expect(() => new EnvironmentId(input)).toThrow(DomainError);
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
			it.each<{ type: AuthenticationMethodType }>([
				{ type: AuthenticationMethodType.Interactive },
				{ type: AuthenticationMethodType.ServicePrincipal },
				{ type: AuthenticationMethodType.UsernamePassword },
				{ type: AuthenticationMethodType.DeviceCode }
			])('should create $type auth method', ({ type }) => {
				const method = new AuthenticationMethod(type);
				expect(method.getType()).toBe(type);
			});
		});

		describe('requiresCredentials', () => {
			it.each<{ type: AuthenticationMethodType; expected: boolean }>([
				{ type: AuthenticationMethodType.Interactive, expected: false },
				{ type: AuthenticationMethodType.DeviceCode, expected: false },
				{ type: AuthenticationMethodType.ServicePrincipal, expected: true },
				{ type: AuthenticationMethodType.UsernamePassword, expected: true }
			])('should return $expected for $type', ({ type, expected }) => {
				const method = new AuthenticationMethod(type);
				expect(method.requiresCredentials()).toBe(expected);
			});
		});

		describe('requiresClientCredentials', () => {
			it.each<{ type: AuthenticationMethodType; expected: boolean }>([
				{ type: AuthenticationMethodType.ServicePrincipal, expected: true },
				{ type: AuthenticationMethodType.Interactive, expected: false },
				{ type: AuthenticationMethodType.UsernamePassword, expected: false },
				{ type: AuthenticationMethodType.DeviceCode, expected: false }
			])('should return $expected for $type', ({ type, expected }) => {
				const method = new AuthenticationMethod(type);
				expect(method.requiresClientCredentials()).toBe(expected);
			});
		});

		describe('requiresUsernamePassword', () => {
			it.each<{ type: AuthenticationMethodType; expected: boolean }>([
				{ type: AuthenticationMethodType.UsernamePassword, expected: true },
				{ type: AuthenticationMethodType.Interactive, expected: false },
				{ type: AuthenticationMethodType.ServicePrincipal, expected: false },
				{ type: AuthenticationMethodType.DeviceCode, expected: false }
			])('should return $expected for $type', ({ type, expected }) => {
				const method = new AuthenticationMethod(type);
				expect(method.requiresUsernamePassword()).toBe(expected);
			});
		});

		describe('isInteractiveFlow', () => {
			it.each<{ type: AuthenticationMethodType; expected: boolean }>([
				{ type: AuthenticationMethodType.Interactive, expected: true },
				{ type: AuthenticationMethodType.DeviceCode, expected: true },
				{ type: AuthenticationMethodType.ServicePrincipal, expected: false },
				{ type: AuthenticationMethodType.UsernamePassword, expected: false }
			])('should return $expected for $type', ({ type, expected }) => {
				const method = new AuthenticationMethod(type);
				expect(method.isInteractiveFlow()).toBe(expected);
			});
		});

		describe('toString', () => {
			it.each<{ type: AuthenticationMethodType; expected: string }>([
				{ type: AuthenticationMethodType.Interactive, expected: 'Interactive' },
				{ type: AuthenticationMethodType.ServicePrincipal, expected: 'ServicePrincipal' },
				{ type: AuthenticationMethodType.UsernamePassword, expected: 'UsernamePassword' },
				{ type: AuthenticationMethodType.DeviceCode, expected: 'DeviceCode' }
			])('should return string representation for $expected auth type', ({ type, expected }) => {
				const method = new AuthenticationMethod(type);
				expect(method.toString()).toBe(expected);
			});
		});

		describe('equals', () => {
			it.each<{ type: AuthenticationMethodType }>([
				{ type: AuthenticationMethodType.Interactive },
				{ type: AuthenticationMethodType.ServicePrincipal },
				{ type: AuthenticationMethodType.UsernamePassword },
				{ type: AuthenticationMethodType.DeviceCode }
			])('should return true for same auth method types: $type', ({ type }) => {
				const method1 = new AuthenticationMethod(type);
				const method2 = new AuthenticationMethod(type);
				expect(method1.equals(method2)).toBe(true);
			});

			it.each<{ type1: AuthenticationMethodType; type2: AuthenticationMethodType }>([
				{ type1: AuthenticationMethodType.Interactive, type2: AuthenticationMethodType.ServicePrincipal },
				{ type1: AuthenticationMethodType.ServicePrincipal, type2: AuthenticationMethodType.UsernamePassword },
				{ type1: AuthenticationMethodType.UsernamePassword, type2: AuthenticationMethodType.DeviceCode }
			])('should return false for different auth method types: $type1 vs $type2', ({ type1, type2 }) => {
				const method1 = new AuthenticationMethod(type1);
				const method2 = new AuthenticationMethod(type2);
				expect(method1.equals(method2)).toBe(false);
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
