import { DomainError } from '../errors/DomainError';

import { DataverseUrl } from './DataverseUrl';
import { TenantId } from './TenantId';
import { ClientId } from './ClientId';
import { EnvironmentName } from './EnvironmentName';
import { EnvironmentId } from './EnvironmentId';
import { AuthenticationMethod, AuthenticationMethodType } from './AuthenticationMethod';

describe('ValueObjects', () => {
	describe('DataverseUrl', () => {
		describe('constructor', () => {
			it('should create valid Dataverse URL', () => {
				const url = new DataverseUrl('https://org.crm.dynamics.com');
				expect(url.getValue()).toBe('https://org.crm.dynamics.com');
			});

			it('should normalize URL by removing trailing slash', () => {
				const url = new DataverseUrl('https://org.crm.dynamics.com/');
				expect(url.getValue()).toBe('https://org.crm.dynamics.com');
			});

			it('should upgrade http to https', () => {
				const url = new DataverseUrl('http://org.crm.dynamics.com');
				expect(url.getValue()).toBe('https://org.crm.dynamics.com');
			});

			it('should accept regional URLs', () => {
				const url1 = new DataverseUrl('https://org.crm4.dynamics.com');
				expect(url1.getValue()).toBe('https://org.crm4.dynamics.com');

				const url2 = new DataverseUrl('https://org.crm.uk.dynamics.com');
				expect(url2.getValue()).toBe('https://org.crm.uk.dynamics.com');
			});

			it('should throw error for empty URL', () => {
				expect(() => new DataverseUrl('')).toThrow(DomainError);
				expect(() => new DataverseUrl('   ')).toThrow(DomainError);
			});

			it('should throw error for invalid URL format', () => {
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

				const tenantId3 = new TenantId();
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
		});
	});
});
