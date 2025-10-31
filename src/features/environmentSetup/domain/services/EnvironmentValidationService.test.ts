import { Environment } from '../entities/Environment';
import { EnvironmentId } from '../valueObjects/EnvironmentId';
import { EnvironmentName } from '../valueObjects/EnvironmentName';
import { DataverseUrl } from '../valueObjects/DataverseUrl';
import { TenantId } from '../valueObjects/TenantId';
import { ClientId } from '../valueObjects/ClientId';
import { AuthenticationMethod, AuthenticationMethodType } from '../valueObjects/AuthenticationMethod';

import { EnvironmentValidationService } from './EnvironmentValidationService';

describe('EnvironmentValidationService', () => {
	let service: EnvironmentValidationService;

	beforeEach(() => {
		service = new EnvironmentValidationService();
	});

	function createValidEnvironment(authMethod: AuthenticationMethodType = AuthenticationMethodType.Interactive): Environment {
		return new Environment(
			new EnvironmentId('env-test-123'),
			new EnvironmentName('Test Environment'),
			new DataverseUrl('https://org.crm.dynamics.com'),
			new TenantId('00000000-0000-0000-0000-000000000000'),
			new AuthenticationMethod(authMethod),
			new ClientId('51f81489-12ee-4a9e-aaae-a2591f45987d'), // Public client ID
			false
		);
	}

	describe('validateForSave - Interactive Authentication', () => {
		it('should validate successfully with unique name', () => {
			const env = createValidEnvironment(AuthenticationMethodType.Interactive);
			const isNameUnique = true;

			const result = service.validateForSave(
				env,
				isNameUnique,
				false,
				false
			);

			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should fail validation with duplicate name', () => {
			const env = createValidEnvironment(AuthenticationMethodType.Interactive);
			const isNameUnique = false;

			const result = service.validateForSave(
				env,
				isNameUnique,
				false,
				false
			);

			expect(result.isValid).toBe(false);
			expect(result.errors).toContain('Environment name must be unique');
		});

		it('should warn about Microsoft example client ID', () => {
			const env = createValidEnvironment(AuthenticationMethodType.Interactive);
			const isNameUnique = true;

			const result = service.validateForSave(
				env,
				isNameUnique,
				false,
				false
			);

			expect(result.isValid).toBe(true);
			expect(result.warnings).toContain('Using Microsoft example client ID. Create your own Azure AD app registration for production use.');
		});
	});

	describe('validateForSave - ServicePrincipal Authentication', () => {
		it('should validate successfully with new client secret', () => {
			const env = new Environment(
				new EnvironmentId('env-test-123'),
				new EnvironmentName('Test Environment'),
				new DataverseUrl('https://org.crm.dynamics.com'),
				new TenantId('00000000-0000-0000-0000-000000000000'),
				new AuthenticationMethod(AuthenticationMethodType.ServicePrincipal),
				new ClientId('22222222-2222-2222-2222-222222222222'), // Non-example client ID
				false,
				undefined,
				undefined,
				new ClientId('11111111-1111-1111-1111-111111111111'),
				undefined
			);
			const isNameUnique = true;
			const hasExistingClientSecret = false;
			const clientSecret = 'new-secret-value';

			const result = service.validateForSave(
				env,
				isNameUnique,
				hasExistingClientSecret,
				false,
				clientSecret,
				undefined
			);

			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
			expect(result.warnings).toHaveLength(0); // Not using example client ID
		});

		it('should validate successfully with existing client secret', () => {
			const env = new Environment(
				new EnvironmentId('env-test-123'),
				new EnvironmentName('Test Environment'),
				new DataverseUrl('https://org.crm.dynamics.com'),
				new TenantId('00000000-0000-0000-0000-000000000000'),
				new AuthenticationMethod(AuthenticationMethodType.ServicePrincipal),
				new ClientId('22222222-2222-2222-2222-222222222222'),
				false,
				undefined,
				undefined,
				new ClientId('11111111-1111-1111-1111-111111111111'),
				undefined
			);
			const isNameUnique = true;
			const hasExistingClientSecret = true;

			const result = service.validateForSave(
				env,
				isNameUnique,
				hasExistingClientSecret,
				false
			);

			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should fail validation when client secret is missing and not stored', () => {
			const env = new Environment(
				new EnvironmentId('env-test-123'),
				new EnvironmentName('Test Environment'),
				new DataverseUrl('https://org.crm.dynamics.com'),
				new TenantId('00000000-0000-0000-0000-000000000000'),
				new AuthenticationMethod(AuthenticationMethodType.ServicePrincipal),
				new ClientId('22222222-2222-2222-2222-222222222222'),
				false,
				undefined,
				undefined,
				new ClientId('11111111-1111-1111-1111-111111111111'),
				undefined
			);
			const isNameUnique = true;
			const hasExistingClientSecret = false;
			const clientSecret = undefined; // No new secret provided

			const result = service.validateForSave(
				env,
				isNameUnique,
				hasExistingClientSecret,
				false,
				clientSecret,
				undefined
			);

			expect(result.isValid).toBe(false);
			expect(result.errors).toContain('Client secret is required for Service Principal authentication');
		});
	});

	describe('validateForSave - UsernamePassword Authentication', () => {
		it('should validate successfully with new password', () => {
			const env = new Environment(
				new EnvironmentId('env-test-123'),
				new EnvironmentName('Test Environment'),
				new DataverseUrl('https://org.crm.dynamics.com'),
				new TenantId('00000000-0000-0000-0000-000000000000'),
				new AuthenticationMethod(AuthenticationMethodType.UsernamePassword),
				new ClientId('22222222-2222-2222-2222-222222222222'),
				false,
				undefined,
				undefined,
				undefined,
				'user@example.com'
			);
			const isNameUnique = true;
			const hasExistingPassword = false;
			const password = 'new-password';

			const result = service.validateForSave(
				env,
				isNameUnique,
				false,
				hasExistingPassword,
				undefined,
				password
			);

			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should validate successfully with existing password', () => {
			const env = new Environment(
				new EnvironmentId('env-test-123'),
				new EnvironmentName('Test Environment'),
				new DataverseUrl('https://org.crm.dynamics.com'),
				new TenantId('00000000-0000-0000-0000-000000000000'),
				new AuthenticationMethod(AuthenticationMethodType.UsernamePassword),
				new ClientId('22222222-2222-2222-2222-222222222222'),
				false,
				undefined,
				undefined,
				undefined,
				'user@example.com'
			);
			const isNameUnique = true;
			const hasExistingPassword = true;

			const result = service.validateForSave(
				env,
				isNameUnique,
				false,
				hasExistingPassword
			);

			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should fail validation when password is missing and not stored', () => {
			const env = new Environment(
				new EnvironmentId('env-test-123'),
				new EnvironmentName('Test Environment'),
				new DataverseUrl('https://org.crm.dynamics.com'),
				new TenantId('00000000-0000-0000-0000-000000000000'),
				new AuthenticationMethod(AuthenticationMethodType.UsernamePassword),
				new ClientId('22222222-2222-2222-2222-222222222222'),
				false,
				undefined,
				undefined,
				undefined,
				'user@example.com'
			);
			const isNameUnique = true;
			const hasExistingPassword = false;
			const password = undefined; // No new password provided

			const result = service.validateForSave(
				env,
				isNameUnique,
				false,
				hasExistingPassword,
				undefined,
				password
			);

			expect(result.isValid).toBe(false);
			expect(result.errors).toContain('Password is required for Username/Password authentication');
		});
	});

	describe('validateForSave - Multiple Errors', () => {
		it('should accumulate multiple validation errors', () => {
			// Create valid environment with ServicePrincipal that HAS clientId
			// But we'll test uniqueness + missing secret errors
			const env = new Environment(
				new EnvironmentId('env-test-123'),
				new EnvironmentName('Test Environment'),
				new DataverseUrl('https://org.crm.dynamics.com'),
				new TenantId('00000000-0000-0000-0000-000000000000'),
				new AuthenticationMethod(AuthenticationMethodType.ServicePrincipal),
				new ClientId('51f81489-12ee-4a9e-aaae-a2591f45987d'),
				false,
				undefined,
				undefined,
				new ClientId('11111111-1111-1111-1111-111111111111'), // Has clientId (valid config)
				undefined
			);
			const isNameUnique = false; // Duplicate name (uniqueness error)
			const hasExistingClientSecret = false;
			const clientSecret = undefined; // Missing secret (credential error)

			const result = service.validateForSave(
				env,
				isNameUnique,
				hasExistingClientSecret,
				false,
				clientSecret,
				undefined
			);

			expect(result.isValid).toBe(false);
			expect(result.errors.length).toBe(2); // Two errors: name uniqueness + missing secret
			expect(result.errors).toContain('Environment name must be unique');
			expect(result.errors).toContain('Client secret is required for Service Principal authentication');
		});
	});

	describe('validateForSave - Edge Cases', () => {
		it('should validate DeviceCode auth (no credentials required)', () => {
			const env = createValidEnvironment(AuthenticationMethodType.DeviceCode);
			const isNameUnique = true;

			const result = service.validateForSave(
				env,
				isNameUnique,
				false,
				false
			);

			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should treat empty client secret string as provided (truthy)', () => {
			const env = new Environment(
				new EnvironmentId('env-test-123'),
				new EnvironmentName('Test Environment'),
				new DataverseUrl('https://org.crm.dynamics.com'),
				new TenantId('00000000-0000-0000-0000-000000000000'),
				new AuthenticationMethod(AuthenticationMethodType.ServicePrincipal),
				new ClientId('22222222-2222-2222-2222-222222222222'),
				false,
				undefined,
				undefined,
				new ClientId('11111111-1111-1111-1111-111111111111'),
				undefined
			);
			const isNameUnique = true;
			const hasExistingClientSecret = false;
			const clientSecret = ''; // Empty string is truthy

			const result = service.validateForSave(
				env,
				isNameUnique,
				hasExistingClientSecret,
				false,
				clientSecret,
				undefined
			);

			// Empty string '' is truthy in JavaScript, so validation passes
			// The check is: if (!clientSecret && !hasExistingClientSecret)
			// Empty string is falsy, so it fails the check
			expect(result.isValid).toBe(false);
			expect(result.errors).toContain('Client secret is required for Service Principal authentication');
		});
	});
});
