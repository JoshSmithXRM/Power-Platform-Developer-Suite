import { EnvironmentDomainMapper } from './EnvironmentDomainMapper';
import type { EnvironmentConnectionDto } from '../../../../shared/application/dtos/EnvironmentConnectionDto';
import { NullLogger } from '../../../../infrastructure/logging/NullLogger';
import { Environment } from '../../domain/entities/Environment';
import { createTestEnvironment, createTestServicePrincipalEnvironment, createTestUsernamePasswordEnvironment } from '../../../../shared/testing/factories/EnvironmentFactory';
import { AuthenticationMethodType } from '../../domain/valueObjects/AuthenticationMethod';

describe('EnvironmentDomainMapper', () => {
	let mapper: EnvironmentDomainMapper;
	let logger: NullLogger;

	beforeEach(() => {
		logger = new NullLogger();
		mapper = new EnvironmentDomainMapper(logger);
	});

	describe('toDomain', () => {
		describe('ServicePrincipal authentication', () => {
			it('should map DTO with ServicePrincipal auth to domain entity', () => {
				// Arrange
				const dto: EnvironmentConnectionDto = {
					id: 'env-sp-123',
					name: 'Service Principal Environment',
					settings: {
						dataverseUrl: 'https://org.crm.dynamics.com',
						tenantId: '00000000-0000-0000-0000-000000000000',
						authenticationMethod: 'ServicePrincipal',
						publicClientId: '51f81489-12ee-4a9e-aaae-a2591f45987d',
						clientId: '11111111-1111-1111-1111-111111111111'
					},
					isActive: true
				};

				// Act
				const result = mapper.toDomain(dto);

				// Assert
				expect(result).toBeInstanceOf(Environment);
				expect(result.getId().getValue()).toBe('env-sp-123');
				expect(result.getName().getValue()).toBe('Service Principal Environment');
				expect(result.getDataverseUrl().getValue()).toBe('https://org.crm.dynamics.com');
				expect(result.getTenantId().getValue()).toBe('00000000-0000-0000-0000-000000000000');
				expect(result.getAuthenticationMethod().getType()).toBe(AuthenticationMethodType.ServicePrincipal);
				expect(result.getPublicClientId().getValue()).toBe('51f81489-12ee-4a9e-aaae-a2591f45987d');
				expect(result.getClientId()?.getValue()).toBe('11111111-1111-1111-1111-111111111111');
				expect(result.getIsActive()).toBe(true);
			});

			it('should throw when ServicePrincipal auth missing required clientId', () => {
				// Arrange
				const dto: EnvironmentConnectionDto = {
					id: 'env-sp-456',
					name: 'SP Without ClientId',
					settings: {
						dataverseUrl: 'https://org.crm.dynamics.com',
						tenantId: '00000000-0000-0000-0000-000000000000',
						authenticationMethod: 'ServicePrincipal',
						publicClientId: '51f81489-12ee-4a9e-aaae-a2591f45987d'
					},
					isActive: false
				};

				// Act & Assert
				expect(() => mapper.toDomain(dto)).toThrow('Client ID is required for Service Principal authentication');
			});
		});

		describe('UsernamePassword authentication', () => {
			it('should map DTO with UsernamePassword auth to domain entity', () => {
				// Arrange
				const dto: EnvironmentConnectionDto = {
					id: 'env-up-123',
					name: 'Username Password Environment',
					settings: {
						dataverseUrl: 'https://org.crm.dynamics.com',
						tenantId: '00000000-0000-0000-0000-000000000000',
						authenticationMethod: 'UsernamePassword',
						publicClientId: '51f81489-12ee-4a9e-aaae-a2591f45987d',
						username: 'user@example.com'
					},
					isActive: true
				};

				// Act
				const result = mapper.toDomain(dto);

				// Assert
				expect(result.getAuthenticationMethod().getType()).toBe(AuthenticationMethodType.UsernamePassword);
				expect(result.getUsername()).toBe('user@example.com');
			});

			it('should throw when UsernamePassword auth missing required username', () => {
				// Arrange
				const dto: EnvironmentConnectionDto = {
					id: 'env-up-456',
					name: 'UP Without Username',
					settings: {
						dataverseUrl: 'https://org.crm.dynamics.com',
						tenantId: '00000000-0000-0000-0000-000000000000',
						authenticationMethod: 'UsernamePassword',
						publicClientId: '51f81489-12ee-4a9e-aaae-a2591f45987d'
					},
					isActive: false
				};

				// Act & Assert
				expect(() => mapper.toDomain(dto)).toThrow('Username is required for Username/Password authentication');
			});
		});

		describe('Interactive authentication', () => {
			it('should map DTO with Interactive auth to domain entity', () => {
				// Arrange
				const dto: EnvironmentConnectionDto = {
					id: 'env-interactive-123',
					name: 'Interactive Environment',
					settings: {
						dataverseUrl: 'https://org.crm.dynamics.com',
						tenantId: '00000000-0000-0000-0000-000000000000',
						authenticationMethod: 'Interactive',
						publicClientId: '51f81489-12ee-4a9e-aaae-a2591f45987d'
					},
					isActive: true
				};

				// Act
				const result = mapper.toDomain(dto);

				// Assert
				expect(result.getAuthenticationMethod().getType()).toBe(AuthenticationMethodType.Interactive);
			});
		});

		describe('DeviceCode authentication', () => {
			it('should map DTO with DeviceCode auth to domain entity', () => {
				// Arrange
				const dto: EnvironmentConnectionDto = {
					id: 'env-devicecode-123',
					name: 'Device Code Environment',
					settings: {
						dataverseUrl: 'https://org.crm.dynamics.com',
						tenantId: '00000000-0000-0000-0000-000000000000',
						authenticationMethod: 'DeviceCode',
						publicClientId: '51f81489-12ee-4a9e-aaae-a2591f45987d'
					},
					isActive: true
				};

				// Act
				const result = mapper.toDomain(dto);

				// Assert
				expect(result.getAuthenticationMethod().getType()).toBe(AuthenticationMethodType.DeviceCode);
			});
		});

		describe('optional fields', () => {
			it('should map lastUsed when provided', () => {
				// Arrange
				const lastUsedDate = '2025-11-23T10:30:00.000Z';
				const dto: EnvironmentConnectionDto = {
					id: 'env-123',
					name: 'Test Environment',
					settings: {
						dataverseUrl: 'https://org.crm.dynamics.com',
						tenantId: '00000000-0000-0000-0000-000000000000',
						authenticationMethod: 'Interactive',
						publicClientId: '51f81489-12ee-4a9e-aaae-a2591f45987d'
					},
					isActive: true,
					lastUsed: lastUsedDate
				};

				// Act
				const result = mapper.toDomain(dto);

				// Assert
				expect(result.getLastUsed()).toEqual(new Date(lastUsedDate));
			});

			it('should handle missing lastUsed field', () => {
				// Arrange
				const dto: EnvironmentConnectionDto = {
					id: 'env-123',
					name: 'Test Environment',
					settings: {
						dataverseUrl: 'https://org.crm.dynamics.com',
						tenantId: '00000000-0000-0000-0000-000000000000',
						authenticationMethod: 'Interactive',
						publicClientId: '51f81489-12ee-4a9e-aaae-a2591f45987d'
					},
					isActive: true
				};

				// Act
				const result = mapper.toDomain(dto);

				// Assert
				expect(result.getLastUsed()).toBeUndefined();
			});

			it('should map environmentId when provided', () => {
				// Arrange
				const dto: EnvironmentConnectionDto = {
					id: 'env-123',
					name: 'Test Environment',
					settings: {
						dataverseUrl: 'https://org.crm.dynamics.com',
						tenantId: '00000000-0000-0000-0000-000000000000',
						authenticationMethod: 'Interactive',
						publicClientId: '51f81489-12ee-4a9e-aaae-a2591f45987d'
					},
					isActive: true,
					environmentId: 'pp-env-guid-123'
				};

				// Act
				const result = mapper.toDomain(dto);

				// Assert
				expect(result.getPowerPlatformEnvironmentId()).toBe('pp-env-guid-123');
			});

			it('should handle missing environmentId field', () => {
				// Arrange
				const dto: EnvironmentConnectionDto = {
					id: 'env-123',
					name: 'Test Environment',
					settings: {
						dataverseUrl: 'https://org.crm.dynamics.com',
						tenantId: '00000000-0000-0000-0000-000000000000',
						authenticationMethod: 'Interactive',
						publicClientId: '51f81489-12ee-4a9e-aaae-a2591f45987d'
					},
					isActive: true
				};

				// Act
				const result = mapper.toDomain(dto);

				// Assert
				expect(result.getPowerPlatformEnvironmentId()).toBeUndefined();
			});
		});

		describe('error handling', () => {
			it('should throw when mapping invalid DTO', () => {
				// Arrange
				const invalidDto = {
					id: 'env-123',
					name: '',  // Empty name should fail EnvironmentName validation
					settings: {
						dataverseUrl: 'https://org.crm.dynamics.com',
						tenantId: '00000000-0000-0000-0000-000000000000',
						authenticationMethod: 'Interactive',
						publicClientId: '51f81489-12ee-4a9e-aaae-a2591f45987d'
					},
					isActive: true
				} as EnvironmentConnectionDto;

				// Act & Assert
				expect(() => mapper.toDomain(invalidDto)).toThrow();
			});
		});
	});

	describe('toDto', () => {
		describe('ServicePrincipal authentication', () => {
			it('should map domain entity with ServicePrincipal auth to DTO', () => {
				// Arrange
				const environment = createTestServicePrincipalEnvironment({
					id: 'env-sp-123',
					name: 'Service Principal Environment',
					dataverseUrl: 'https://org.crm.dynamics.com',
					tenantId: '00000000-0000-0000-0000-000000000000',
					publicClientId: '51f81489-12ee-4a9e-aaae-a2591f45987d',
					clientId: '11111111-1111-1111-1111-111111111111',
					isActive: true
				});

				// Act
				const result = mapper.toDto(environment);

				// Assert
				expect(result.id).toBe('env-sp-123');
				expect(result.name).toBe('Service Principal Environment');
				expect(result.settings.dataverseUrl).toBe('https://org.crm.dynamics.com');
				expect(result.settings.tenantId).toBe('00000000-0000-0000-0000-000000000000');
				expect(result.settings.authenticationMethod).toBe('ServicePrincipal');
				expect(result.settings.publicClientId).toBe('51f81489-12ee-4a9e-aaae-a2591f45987d');
				expect(result.settings.clientId).toBe('11111111-1111-1111-1111-111111111111');
				expect(result.isActive).toBe(true);
			});

			it('should include clientId in DTO when present in domain entity', () => {
				// Arrange - ServicePrincipal requires clientId per business rules
				const environment = createTestServicePrincipalEnvironment({
					clientId: '22222222-2222-2222-2222-222222222222'
				});

				// Act
				const result = mapper.toDto(environment);

				// Assert
				expect(result.settings.clientId).toBe('22222222-2222-2222-2222-222222222222');
			});
		});

		describe('UsernamePassword authentication', () => {
			it('should map domain entity with UsernamePassword auth to DTO', () => {
				// Arrange
				const environment = createTestUsernamePasswordEnvironment({
					id: 'env-up-123',
					name: 'Username Password Environment',
					username: 'user@example.com',
					isActive: true
				});

				// Act
				const result = mapper.toDto(environment);

				// Assert
				expect(result.settings.authenticationMethod).toBe('UsernamePassword');
				expect(result.settings.username).toBe('user@example.com');
			});

			it('should include username in DTO when present in domain entity', () => {
				// Arrange - UsernamePassword requires username per business rules
				const environment = createTestUsernamePasswordEnvironment({
					username: 'test@example.com'
				});

				// Act
				const result = mapper.toDto(environment);

				// Assert
				expect(result.settings.username).toBe('test@example.com');
			});
		});

		describe('Interactive authentication', () => {
			it('should map domain entity with Interactive auth to DTO', () => {
				// Arrange
				const environment = createTestEnvironment({
					authenticationMethod: AuthenticationMethodType.Interactive,
					isActive: true
				});

				// Act
				const result = mapper.toDto(environment);

				// Assert
				expect(result.settings.authenticationMethod).toBe('Interactive');
			});
		});

		describe('DeviceCode authentication', () => {
			it('should map domain entity with DeviceCode auth to DTO', () => {
				// Arrange
				const environment = createTestEnvironment({
					authenticationMethod: AuthenticationMethodType.DeviceCode,
					isActive: true
				});

				// Act
				const result = mapper.toDto(environment);

				// Assert
				expect(result.settings.authenticationMethod).toBe('DeviceCode');
			});
		});

		describe('optional fields', () => {
			it('should map lastUsed when present in domain entity', () => {
				// Arrange
				const lastUsedDate = new Date('2025-11-23T10:30:00.000Z');
				const environment = createTestEnvironment({
					lastUsed: lastUsedDate
				});

				// Act
				const result = mapper.toDto(environment);

				// Assert
				expect(result.lastUsed).toBe(lastUsedDate.toISOString());
			});

			it('should omit lastUsed when not present in domain entity', () => {
				// Arrange
				const environment = createTestEnvironment();

				// Act
				const result = mapper.toDto(environment);

				// Assert
				expect(result.lastUsed).toBeUndefined();
			});

			it('should map environmentId when present in domain entity', () => {
				// Arrange
				const environment = createTestEnvironment({
					powerPlatformEnvironmentId: 'pp-env-guid-123'
				});

				// Act
				const result = mapper.toDto(environment);

				// Assert
				expect(result.environmentId).toBe('pp-env-guid-123');
			});

			it('should omit environmentId when not present in domain entity', () => {
				// Arrange
				const environment = createTestEnvironment();

				// Act
				const result = mapper.toDto(environment);

				// Assert
				expect(result.environmentId).toBeUndefined();
			});
		});
	});

	describe('round-trip mapping', () => {
		it('should preserve all data when mapping DTO → Domain → DTO (ServicePrincipal)', () => {
			// Arrange
			const originalDto: EnvironmentConnectionDto = {
				id: 'env-sp-123',
				name: 'Service Principal Environment',
				settings: {
					dataverseUrl: 'https://org.crm.dynamics.com',
					tenantId: '00000000-0000-0000-0000-000000000000',
					authenticationMethod: 'ServicePrincipal',
					publicClientId: '51f81489-12ee-4a9e-aaae-a2591f45987d',
					clientId: '11111111-1111-1111-1111-111111111111'
				},
				isActive: true,
				lastUsed: '2025-11-23T10:30:00.000Z',
				environmentId: 'pp-env-guid-123',
				sortOrder: 0,
				isDefault: false
			};

			// Act
			const domain = mapper.toDomain(originalDto);
			const resultDto = mapper.toDto(domain);

			// Assert
			expect(resultDto).toEqual(originalDto);
		});

		it('should preserve all data when mapping DTO → Domain → DTO (UsernamePassword)', () => {
			// Arrange
			const originalDto: EnvironmentConnectionDto = {
				id: 'env-up-123',
				name: 'Username Password Environment',
				settings: {
					dataverseUrl: 'https://org.crm.dynamics.com',
					tenantId: '00000000-0000-0000-0000-000000000000',
					authenticationMethod: 'UsernamePassword',
					publicClientId: '51f81489-12ee-4a9e-aaae-a2591f45987d',
					username: 'user@example.com'
				},
				isActive: true,
				lastUsed: '2025-11-23T10:30:00.000Z',
				environmentId: 'pp-env-guid-123',
				sortOrder: 0,
				isDefault: false
			};

			// Act
			const domain = mapper.toDomain(originalDto);
			const resultDto = mapper.toDto(domain);

			// Assert
			expect(resultDto).toEqual(originalDto);
		});

		it('should preserve all data when mapping DTO → Domain → DTO (Interactive)', () => {
			// Arrange
			const originalDto: EnvironmentConnectionDto = {
				id: 'env-interactive-123',
				name: 'Interactive Environment',
				settings: {
					dataverseUrl: 'https://org.crm.dynamics.com',
					tenantId: '00000000-0000-0000-0000-000000000000',
					authenticationMethod: 'Interactive',
					publicClientId: '51f81489-12ee-4a9e-aaae-a2591f45987d'
				},
				isActive: false,
				sortOrder: 0,
				isDefault: false
			};

			// Act
			const domain = mapper.toDomain(originalDto);
			const resultDto = mapper.toDto(domain);

			// Assert
			expect(resultDto).toEqual(originalDto);
		});

		it('should preserve all data when mapping DTO → Domain → DTO (DeviceCode)', () => {
			// Arrange
			const originalDto: EnvironmentConnectionDto = {
				id: 'env-devicecode-123',
				name: 'Device Code Environment',
				settings: {
					dataverseUrl: 'https://org.crm.dynamics.com',
					tenantId: '00000000-0000-0000-0000-000000000000',
					authenticationMethod: 'DeviceCode',
					publicClientId: '51f81489-12ee-4a9e-aaae-a2591f45987d'
				},
				isActive: true,
				lastUsed: '2025-11-23T10:30:00.000Z',
				environmentId: 'pp-env-guid-123',
				sortOrder: 0,
				isDefault: false
			};

			// Act
			const domain = mapper.toDomain(originalDto);
			const resultDto = mapper.toDto(domain);

			// Assert
			expect(resultDto).toEqual(originalDto);
		});

		it('should preserve minimal data when mapping DTO → Domain → DTO (no optional fields)', () => {
			// Arrange
			const originalDto: EnvironmentConnectionDto = {
				id: 'env-minimal-123',
				name: 'Minimal Environment',
				settings: {
					dataverseUrl: 'https://org.crm.dynamics.com',
					tenantId: '00000000-0000-0000-0000-000000000000',
					authenticationMethod: 'Interactive',
					publicClientId: '51f81489-12ee-4a9e-aaae-a2591f45987d'
				},
				isActive: false,
				sortOrder: 0,
				isDefault: false
			};

			// Act
			const domain = mapper.toDomain(originalDto);
			const resultDto = mapper.toDto(domain);

			// Assert
			expect(resultDto).toEqual(originalDto);
		});
	});
});
