import { EnvironmentListViewModelMapper } from './EnvironmentListViewModelMapper';
import { Environment } from '../../domain/entities/Environment';
import { EnvironmentId } from '../../domain/valueObjects/EnvironmentId';
import { EnvironmentName } from '../../domain/valueObjects/EnvironmentName';
import { DataverseUrl } from '../../domain/valueObjects/DataverseUrl';
import { TenantId } from '../../domain/valueObjects/TenantId';
import { ClientId } from '../../domain/valueObjects/ClientId';
import { AuthenticationMethod, AuthenticationMethodType } from '../../domain/valueObjects/AuthenticationMethod';

describe('EnvironmentListViewModelMapper', () => {
	let mapper: EnvironmentListViewModelMapper;

	beforeEach(() => {
		mapper = new EnvironmentListViewModelMapper();
	});

	// Test data factory
	function createEnvironment(
		id: string,
		name: string,
		isActive: boolean = false,
		lastUsed?: Date
	): Environment {
		return new Environment(
			new EnvironmentId(id),
			new EnvironmentName(name),
			new DataverseUrl('https://test.crm.dynamics.com'),
			new TenantId('00000000-0000-0000-0000-000000000000'),
			new AuthenticationMethod(AuthenticationMethodType.Interactive),
			new ClientId('51f81489-12ee-4a9e-aaae-a2591f45987d'),
			isActive,
			lastUsed
		);
	}

	describe('toViewModel - individual environment mapping', () => {
		it('should map id from EnvironmentId', () => {
			// Arrange
			const environment = createEnvironment('env-abc-123', 'Test');

			// Act
			const result = mapper.toViewModel(environment);

			// Assert
			expect(result.id).toBe('env-abc-123');
		});

		it('should map name from EnvironmentName', () => {
			// Arrange
			const environment = createEnvironment('env-123', 'Production');

			// Act
			const result = mapper.toViewModel(environment);

			// Assert
			expect(result.name).toBe('Production');
		});

		it('should map dataverseUrl from DataverseUrl', () => {
			// Arrange
			const environment = createEnvironment('env-123', 'Test');

			// Act
			const result = mapper.toViewModel(environment);

			// Assert
			expect(result.dataverseUrl).toBe('https://test.crm.dynamics.com');
		});

		it('should map authenticationMethod as string', () => {
			// Arrange
			const env = new Environment(
				new EnvironmentId('env-123'),
				new EnvironmentName('Test'),
				new DataverseUrl('https://test.crm.dynamics.com'),
				new TenantId('00000000-0000-0000-0000-000000000000'),
				new AuthenticationMethod(AuthenticationMethodType.ServicePrincipal),
				new ClientId('51f81489-12ee-4a9e-aaae-a2591f45987d'),
				false,
				undefined,
				undefined,
				new ClientId('11111111-2222-3333-4444-555555555555') // Required for ServicePrincipal
			);

			// Act
			const result = mapper.toViewModel(env);

			// Assert
			expect(result.authenticationMethod).toBe('ServicePrincipal');
		});

		it('should map isActive flag', () => {
			// Arrange
			const activeEnv = createEnvironment('env-1', 'Active', true);
			const inactiveEnv = createEnvironment('env-2', 'Inactive', false);

			// Act
			const activeResult = mapper.toViewModel(activeEnv);
			const inactiveResult = mapper.toViewModel(inactiveEnv);

			// Assert
			expect(activeResult.isActive).toBe(true);
			expect(inactiveResult.isActive).toBe(false);
		});

		it('should set statusBadge to "active" when environment is active', () => {
			// Arrange
			const environment = createEnvironment('env-123', 'Active', true);

			// Act
			const result = mapper.toViewModel(environment);

			// Assert
			expect(result.statusBadge).toBe('active');
		});

		it('should set statusBadge to "inactive" when environment is inactive', () => {
			// Arrange
			const environment = createEnvironment('env-123', 'Inactive', false);

			// Act
			const result = mapper.toViewModel(environment);

			// Assert
			expect(result.statusBadge).toBe('inactive');
		});

		it('should include lastUsedTimestamp when lastUsed is set', () => {
			// Arrange
			const lastUsed = new Date('2024-01-15T10:30:00Z');
			const environment = createEnvironment('env-123', 'Test', false, lastUsed);

			// Act
			const result = mapper.toViewModel(environment);

			// Assert
			expect(result.lastUsedTimestamp).toBe(lastUsed.getTime());
		});

		it('should exclude lastUsedTimestamp when lastUsed is not set', () => {
			// Arrange
			const environment = createEnvironment('env-123', 'Test', false, undefined);

			// Act
			const result = mapper.toViewModel(environment);

			// Assert
			expect(result.lastUsedTimestamp).toBeUndefined();
		});

		it('should format lastUsedDisplay using RelativeTimeFormatter', () => {
			// Arrange
			const lastUsed = new Date();
			const environment = createEnvironment('env-123', 'Test', false, lastUsed);

			// Act
			const result = mapper.toViewModel(environment);

			// Assert
			expect(result.lastUsedDisplay).toBeDefined();
			expect(typeof result.lastUsedDisplay).toBe('string');
		});

		it('should format lastUsedDisplay for undefined lastUsed', () => {
			// Arrange
			const environment = createEnvironment('env-123', 'Test', false, undefined);

			// Act
			const result = mapper.toViewModel(environment);

			// Assert
			expect(result.lastUsedDisplay).toBeDefined();
			expect(typeof result.lastUsedDisplay).toBe('string');
		});
	});

	describe('toSortedViewModels - collection mapping', () => {
		it('should map multiple environments', () => {
			// Arrange
			const environments = [
				createEnvironment('env-1', 'Env1'),
				createEnvironment('env-2', 'Env2'),
				createEnvironment('env-3', 'Env3')
			];

			// Act
			const result = mapper.toSortedViewModels(environments);

			// Assert
			expect(result).toHaveLength(3);
			expect(result[0]?.id).toBeDefined();
			expect(result[1]?.id).toBeDefined();
			expect(result[2]?.id).toBeDefined();
		});

		it('should handle empty array', () => {
			// Arrange
			const environments: Environment[] = [];

			// Act
			const result = mapper.toSortedViewModels(environments);

			// Assert
			expect(result).toHaveLength(0);
			expect(result).toEqual([]);
		});

		it('should handle single environment', () => {
			// Arrange
			const environments = [createEnvironment('env-1', 'Single')];

			// Act
			const result = mapper.toSortedViewModels(environments);

			// Assert
			expect(result).toHaveLength(1);
			expect(result[0]?.name).toBe('Single');
		});
	});

	describe('sorting logic', () => {
		it('should sort by last used descending (most recent first) when both have lastUsed', () => {
			// Arrange
			const older = createEnvironment('env-1', 'Older', false, new Date('2024-01-01'));
			const newer = createEnvironment('env-2', 'Newer', false, new Date('2024-01-15'));
			const environments = [older, newer];

			// Act
			const result = mapper.toSortedViewModels(environments);

			// Assert
			expect(result[0]?.name).toBe('Newer');
			expect(result[1]?.name).toBe('Older');
		});

		it('should sort environments with lastUsed before those without', () => {
			// Arrange
			const withLastUsed = createEnvironment('env-1', 'Used', false, new Date('2024-01-01'));
			const withoutLastUsed = createEnvironment('env-2', 'Never', false, undefined);
			const environments = [withoutLastUsed, withLastUsed];

			// Act
			const result = mapper.toSortedViewModels(environments);

			// Assert
			expect(result[0]?.name).toBe('Used');
			expect(result[1]?.name).toBe('Never');
		});

		it('should sort alphabetically by name when neither has lastUsed', () => {
			// Arrange
			const zEnv = createEnvironment('env-1', 'Zebra', false, undefined);
			const aEnv = createEnvironment('env-2', 'Alpha', false, undefined);
			const mEnv = createEnvironment('env-3', 'Middle', false, undefined);
			const environments = [zEnv, aEnv, mEnv];

			// Act
			const result = mapper.toSortedViewModels(environments);

			// Assert
			expect(result[0]?.name).toBe('Alpha');
			expect(result[1]?.name).toBe('Middle');
			expect(result[2]?.name).toBe('Zebra');
		});

		it('should handle mixed scenario: some with lastUsed, some without', () => {
			// Arrange
			const used1 = createEnvironment('env-1', 'Used1', false, new Date('2024-01-10'));
			const neverUsed1 = createEnvironment('env-2', 'ZNever', false, undefined);
			const used2 = createEnvironment('env-3', 'Used2', false, new Date('2024-01-15'));
			const neverUsed2 = createEnvironment('env-4', 'ANever', false, undefined);
			const environments = [neverUsed1, used1, neverUsed2, used2];

			// Act
			const result = mapper.toSortedViewModels(environments);

			// Assert
			expect(result[0]?.name).toBe('Used2'); // Most recent lastUsed
			expect(result[1]?.name).toBe('Used1'); // Older lastUsed
			expect(result[2]?.name).toBe('ANever'); // No lastUsed, alphabetically first
			expect(result[3]?.name).toBe('ZNever'); // No lastUsed, alphabetically last
		});

		it('should handle all environments with same lastUsed timestamp', () => {
			// Arrange
			const sameTime = new Date('2024-01-15T10:00:00Z');
			const env1 = createEnvironment('env-1', 'Zebra', false, sameTime);
			const env2 = createEnvironment('env-2', 'Alpha', false, sameTime);
			const env3 = createEnvironment('env-3', 'Middle', false, sameTime);
			const environments = [env1, env2, env3];

			// Act
			const result = mapper.toSortedViewModels(environments);

			// Assert - When timestamps are equal, order is preserved (stable sort)
			// But names should all be present
			const names = result.map(r => r.name);
			expect(names).toContain('Zebra');
			expect(names).toContain('Alpha');
			expect(names).toContain('Middle');
		});

		it('should preserve all properties during sorting', () => {
			// Arrange
			const env1 = createEnvironment('env-1', 'Env1', true, new Date('2024-01-01'));
			const env2 = createEnvironment('env-2', 'Env2', false, new Date('2024-01-15'));
			const environments = [env1, env2];

			// Act
			const result = mapper.toSortedViewModels(environments);

			// Assert
			expect(result[0]?.id).toBe('env-2');
			expect(result[0]?.name).toBe('Env2');
			expect(result[0]?.isActive).toBe(false);
			expect(result[0]?.statusBadge).toBe('inactive');

			expect(result[1]?.id).toBe('env-1');
			expect(result[1]?.name).toBe('Env1');
			expect(result[1]?.isActive).toBe(true);
			expect(result[1]?.statusBadge).toBe('active');
		});
	});

	describe('edge cases', () => {
		it('should handle environment with special characters in name', () => {
			// Arrange
			const environment = createEnvironment('env-123', 'Dev-Test (2024) & Staging');

			// Act
			const result = mapper.toViewModel(environment);

			// Assert
			expect(result.name).toBe('Dev-Test (2024) & Staging');
		});

		it('should handle long environment names', () => {
			// Arrange
			const longName = 'A'.repeat(100); // Max allowed length
			const environment = createEnvironment('env-123', longName);

			// Act
			const result = mapper.toViewModel(environment);

			// Assert
			expect(result.name).toBe(longName);
		});

		it('should handle different authentication methods', () => {
			// Arrange
			const interactive = new Environment(
				new EnvironmentId('env-1'),
				new EnvironmentName('Interactive'),
				new DataverseUrl('https://test.crm.dynamics.com'),
				new TenantId('00000000-0000-0000-0000-000000000000'),
				new AuthenticationMethod(AuthenticationMethodType.Interactive),
				new ClientId('51f81489-12ee-4a9e-aaae-a2591f45987d'),
				false
			);

			const servicePrincipal = new Environment(
				new EnvironmentId('env-2'),
				new EnvironmentName('ServicePrincipal'),
				new DataverseUrl('https://test.crm.dynamics.com'),
				new TenantId('00000000-0000-0000-0000-000000000000'),
				new AuthenticationMethod(AuthenticationMethodType.ServicePrincipal),
				new ClientId('51f81489-12ee-4a9e-aaae-a2591f45987d'),
				false,
				undefined,
				undefined,
				new ClientId('11111111-2222-3333-4444-555555555555') // Required for ServicePrincipal
			);

			const usernamePassword = new Environment(
				new EnvironmentId('env-3'),
				new EnvironmentName('UsernamePassword'),
				new DataverseUrl('https://test.crm.dynamics.com'),
				new TenantId('00000000-0000-0000-0000-000000000000'),
				new AuthenticationMethod(AuthenticationMethodType.UsernamePassword),
				new ClientId('51f81489-12ee-4a9e-aaae-a2591f45987d'),
				false,
				undefined,
				undefined,
				undefined,
				'user@contoso.com' // Required for UsernamePassword
			);

			// Act
			const result1 = mapper.toViewModel(interactive);
			const result2 = mapper.toViewModel(servicePrincipal);
			const result3 = mapper.toViewModel(usernamePassword);

			// Assert
			expect(result1.authenticationMethod).toBe('Interactive');
			expect(result2.authenticationMethod).toBe('ServicePrincipal');
			expect(result3.authenticationMethod).toBe('UsernamePassword');
		});

		it('should handle large collection of environments', () => {
			// Arrange
			const environments = Array.from({ length: 100 }, (_, i) =>
				createEnvironment(`env-${i}`, `Environment ${i}`, i % 2 === 0, i % 3 === 0 ? new Date(`2024-01-${(i % 28) + 1}`) : undefined)
			);

			// Act
			const result = mapper.toSortedViewModels(environments);

			// Assert
			expect(result).toHaveLength(100);
			// All environments should be present
			expect(result.map(r => r.id)).toContain('env-0');
			expect(result.map(r => r.id)).toContain('env-99');
		});

		it('should handle timestamps with millisecond precision', () => {
			// Arrange
			const time1 = new Date('2024-01-15T10:30:00.123Z');
			const time2 = new Date('2024-01-15T10:30:00.456Z');
			const env1 = createEnvironment('env-1', 'First', false, time1);
			const env2 = createEnvironment('env-2', 'Second', false, time2);
			const environments = [env1, env2];

			// Act
			const result = mapper.toSortedViewModels(environments);

			// Assert
			expect(result[0]?.name).toBe('Second'); // More recent by milliseconds
			expect(result[1]?.name).toBe('First');
		});
	});
});
