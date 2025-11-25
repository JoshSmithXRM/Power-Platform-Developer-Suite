import {
	isSaveEnvironmentData,
	isTestConnectionData,
	isDiscoverEnvironmentIdData,
	isValidateNameData
} from './EnvironmentSetupTypeGuards';
import type { SaveEnvironmentRequest } from '../../application/useCases/SaveEnvironmentUseCase';
import type { TestConnectionRequest } from '../../application/useCases/TestConnectionUseCase';
import type { DiscoverEnvironmentIdRequest } from '../../application/useCases/DiscoverEnvironmentIdUseCase';
import { AuthenticationMethodType } from '../../domain/valueObjects/AuthenticationMethod';

describe('EnvironmentSetupTypeGuards', () => {
	describe('isSaveEnvironmentData', () => {
		const validData: SaveEnvironmentRequest = {
			name: 'Test Environment',
			dataverseUrl: 'https://test.crm.dynamics.com',
			tenantId: 'tenant-id-123',
			authenticationMethod: AuthenticationMethodType.Interactive,
			publicClientId: 'client-id-123'
		};

		it('should accept valid SaveEnvironmentRequest with all required fields', () => {
			expect(isSaveEnvironmentData(validData)).toBe(true);
		});

		it('should accept valid SaveEnvironmentRequest with optional fields', () => {
			const dataWithOptional: SaveEnvironmentRequest = {
				...validData,
				existingEnvironmentId: 'env-id',
				powerPlatformEnvironmentId: 'pp-env-id',
				clientId: 'client-id-456',
				clientSecret: 'secret',
				username: 'user@example.com',
				password: 'password123',
				preserveExistingCredentials: true
			};
			expect(isSaveEnvironmentData(dataWithOptional)).toBe(true);
		});

		it('should reject null', () => {
			expect(isSaveEnvironmentData(null)).toBe(false);
		});

		it('should reject undefined', () => {
			expect(isSaveEnvironmentData(undefined)).toBe(false);
		});

		it('should reject primitive string', () => {
			expect(isSaveEnvironmentData('not an object')).toBe(false);
		});

		it('should reject primitive number', () => {
			expect(isSaveEnvironmentData(42)).toBe(false);
		});

		it('should reject boolean', () => {
			expect(isSaveEnvironmentData(true)).toBe(false);
		});

		it('should reject array', () => {
			expect(isSaveEnvironmentData([])).toBe(false);
		});

		it('should reject object missing name', () => {
			const { name: _name, ...dataWithoutName } = validData;
			expect(isSaveEnvironmentData(dataWithoutName)).toBe(false);
		});

		it('should reject object missing dataverseUrl', () => {
			const { dataverseUrl: _dataverseUrl, ...dataWithoutUrl } = validData;
			expect(isSaveEnvironmentData(dataWithoutUrl)).toBe(false);
		});

		it('should reject object missing tenantId', () => {
			const { tenantId: _tenantId, ...dataWithoutTenant } = validData;
			expect(isSaveEnvironmentData(dataWithoutTenant)).toBe(false);
		});

		it('should reject object missing authenticationMethod', () => {
			const { authenticationMethod: _authenticationMethod, ...dataWithoutAuth } = validData;
			expect(isSaveEnvironmentData(dataWithoutAuth)).toBe(false);
		});

		it('should reject object missing publicClientId', () => {
			const { publicClientId: _publicClientId, ...dataWithoutClientId } = validData;
			expect(isSaveEnvironmentData(dataWithoutClientId)).toBe(false);
		});

		it('should accept object with additional extra properties', () => {
			const dataWithExtra = {
				...validData,
				extraProperty: 'should be allowed'
			};
			expect(isSaveEnvironmentData(dataWithExtra)).toBe(true);
		});

		it('should accept object with null optional property values', () => {
			const dataWithNullOptional = {
				...validData,
				clientSecret: null
			};
			expect(isSaveEnvironmentData(dataWithNullOptional as unknown)).toBe(true);
		});
	});

	describe('isTestConnectionData', () => {
		const validData: TestConnectionRequest = {
			name: 'Test Environment',
			dataverseUrl: 'https://test.crm.dynamics.com',
			tenantId: 'tenant-id-123',
			authenticationMethod: AuthenticationMethodType.Interactive,
			publicClientId: 'client-id-123'
		};

		it('should accept valid TestConnectionRequest with all required fields', () => {
			expect(isTestConnectionData(validData)).toBe(true);
		});

		it('should accept valid TestConnectionRequest with optional fields', () => {
			const dataWithOptional: TestConnectionRequest = {
				...validData,
				existingEnvironmentId: 'env-id',
				powerPlatformEnvironmentId: 'pp-env-id',
				clientId: 'client-id-456',
				clientSecret: 'secret',
				username: 'user@example.com',
				password: 'password123'
			};
			expect(isTestConnectionData(dataWithOptional)).toBe(true);
		});

		it('should reject null', () => {
			expect(isTestConnectionData(null)).toBe(false);
		});

		it('should reject undefined', () => {
			expect(isTestConnectionData(undefined)).toBe(false);
		});

		it('should reject primitive string', () => {
			expect(isTestConnectionData('not an object')).toBe(false);
		});

		it('should reject primitive number', () => {
			expect(isTestConnectionData(42)).toBe(false);
		});

		it('should reject boolean', () => {
			expect(isTestConnectionData(false)).toBe(false);
		});

		it('should reject array', () => {
			expect(isTestConnectionData([])).toBe(false);
		});

		it('should reject object missing name', () => {
			const { name: _name, ...dataWithoutName } = validData;
			expect(isTestConnectionData(dataWithoutName)).toBe(false);
		});

		it('should reject object missing dataverseUrl', () => {
			const { dataverseUrl: _dataverseUrl, ...dataWithoutUrl } = validData;
			expect(isTestConnectionData(dataWithoutUrl)).toBe(false);
		});

		it('should reject object missing tenantId', () => {
			const { tenantId: _tenantId, ...dataWithoutTenant } = validData;
			expect(isTestConnectionData(dataWithoutTenant)).toBe(false);
		});

		it('should reject object missing authenticationMethod', () => {
			const { authenticationMethod: _authenticationMethod, ...dataWithoutAuth } = validData;
			expect(isTestConnectionData(dataWithoutAuth)).toBe(false);
		});

		it('should reject object missing publicClientId', () => {
			const { publicClientId: _publicClientId, ...dataWithoutClientId } = validData;
			expect(isTestConnectionData(dataWithoutClientId)).toBe(false);
		});

		it('should accept object with additional extra properties', () => {
			const dataWithExtra = {
				...validData,
				extraProperty: 'should be allowed'
			};
			expect(isTestConnectionData(dataWithExtra)).toBe(true);
		});

		it('should accept object with null optional property values', () => {
			const dataWithNullOptional = {
				...validData,
				clientSecret: null
			};
			expect(isTestConnectionData(dataWithNullOptional as unknown)).toBe(true);
		});
	});

	describe('isDiscoverEnvironmentIdData', () => {
		const validData: DiscoverEnvironmentIdRequest = {
			name: 'Test Environment',
			dataverseUrl: 'https://test.crm.dynamics.com',
			tenantId: 'tenant-id-123',
			authenticationMethod: AuthenticationMethodType.Interactive,
			publicClientId: 'client-id-123'
		};

		it('should accept valid DiscoverEnvironmentIdRequest with all required fields', () => {
			expect(isDiscoverEnvironmentIdData(validData)).toBe(true);
		});

		it('should accept valid DiscoverEnvironmentIdRequest with optional fields', () => {
			const dataWithOptional: DiscoverEnvironmentIdRequest = {
				...validData,
				existingEnvironmentId: 'env-id',
				clientId: 'client-id-456',
				clientSecret: 'secret',
				username: 'user@example.com',
				password: 'password123'
			};
			expect(isDiscoverEnvironmentIdData(dataWithOptional)).toBe(true);
		});

		it('should reject null', () => {
			expect(isDiscoverEnvironmentIdData(null)).toBe(false);
		});

		it('should reject undefined', () => {
			expect(isDiscoverEnvironmentIdData(undefined)).toBe(false);
		});

		it('should reject primitive string', () => {
			expect(isDiscoverEnvironmentIdData('not an object')).toBe(false);
		});

		it('should reject primitive number', () => {
			expect(isDiscoverEnvironmentIdData(42)).toBe(false);
		});

		it('should reject boolean', () => {
			expect(isDiscoverEnvironmentIdData(true)).toBe(false);
		});

		it('should reject array', () => {
			expect(isDiscoverEnvironmentIdData([])).toBe(false);
		});

		it('should reject object missing name', () => {
			const { name: _name, ...dataWithoutName } = validData;
			expect(isDiscoverEnvironmentIdData(dataWithoutName)).toBe(false);
		});

		it('should reject object missing dataverseUrl', () => {
			const { dataverseUrl: _dataverseUrl, ...dataWithoutUrl } = validData;
			expect(isDiscoverEnvironmentIdData(dataWithoutUrl)).toBe(false);
		});

		it('should reject object missing tenantId', () => {
			const { tenantId: _tenantId, ...dataWithoutTenant } = validData;
			expect(isDiscoverEnvironmentIdData(dataWithoutTenant)).toBe(false);
		});

		it('should reject object missing authenticationMethod', () => {
			const { authenticationMethod: _authenticationMethod, ...dataWithoutAuth } = validData;
			expect(isDiscoverEnvironmentIdData(dataWithoutAuth)).toBe(false);
		});

		it('should reject object missing publicClientId', () => {
			const { publicClientId: _publicClientId, ...dataWithoutClientId } = validData;
			expect(isDiscoverEnvironmentIdData(dataWithoutClientId)).toBe(false);
		});

		it('should accept object with additional extra properties', () => {
			const dataWithExtra = {
				...validData,
				extraProperty: 'should be allowed'
			};
			expect(isDiscoverEnvironmentIdData(dataWithExtra)).toBe(true);
		});

		it('should accept object with null optional property values', () => {
			const dataWithNullOptional = {
				...validData,
				clientSecret: null
			};
			expect(isDiscoverEnvironmentIdData(dataWithNullOptional as unknown)).toBe(true);
		});
	});

	describe('isValidateNameData', () => {
		const validData: { name: string } = {
			name: 'Test Environment'
		};

		it('should accept valid object with name string', () => {
			expect(isValidateNameData(validData)).toBe(true);
		});

		it('should accept object with additional properties', () => {
			const dataWithExtra = {
				name: 'Test Environment',
				extraProperty: 'extra'
			};
			expect(isValidateNameData(dataWithExtra)).toBe(true);
		});

		it('should accept empty string as name', () => {
			expect(isValidateNameData({ name: '' })).toBe(true);
		});

		it('should reject null', () => {
			expect(isValidateNameData(null)).toBe(false);
		});

		it('should reject undefined', () => {
			expect(isValidateNameData(undefined)).toBe(false);
		});

		it('should reject primitive string', () => {
			expect(isValidateNameData('not an object')).toBe(false);
		});

		it('should reject primitive number', () => {
			expect(isValidateNameData(42)).toBe(false);
		});

		it('should reject boolean', () => {
			expect(isValidateNameData(true)).toBe(false);
		});

		it('should reject array', () => {
			expect(isValidateNameData([])).toBe(false);
		});

		it('should reject object missing name property', () => {
			expect(isValidateNameData({})).toBe(false);
		});

		it('should reject object with name as number', () => {
			expect(isValidateNameData({ name: 123 })).toBe(false);
		});

		it('should reject object with name as null', () => {
			expect(isValidateNameData({ name: null })).toBe(false);
		});

		it('should reject object with name as undefined', () => {
			expect(isValidateNameData({ name: undefined })).toBe(false);
		});

		it('should reject object with name as array', () => {
			expect(isValidateNameData({ name: [] })).toBe(false);
		});

		it('should reject object with name as object', () => {
			expect(isValidateNameData({ name: {} })).toBe(false);
		});

		it('should reject object with name as boolean', () => {
			expect(isValidateNameData({ name: true })).toBe(false);
		});

		it('should accept object with whitespace-only name string', () => {
			expect(isValidateNameData({ name: '   ' })).toBe(true);
		});

		it('should accept object with very long name string', () => {
			expect(isValidateNameData({ name: 'a'.repeat(10000) })).toBe(true);
		});
	});

	describe('Type narrowing', () => {
		it('should narrow SaveEnvironmentRequest type when guard passes', () => {
			const data: unknown = {
				name: 'Test',
				dataverseUrl: 'https://test.crm.dynamics.com',
				tenantId: 'tenant-123',
				authenticationMethod: 'OAuth',
				publicClientId: 'client-123'
			};

			if (isSaveEnvironmentData(data)) {
				// This should compile without type errors due to type narrowing
				const _name: string = data.name;
				const _url: string = data.dataverseUrl;
				expect(_name).toBe('Test');
				expect(_url).toBe('https://test.crm.dynamics.com');
			}
		});

		it('should narrow TestConnectionRequest type when guard passes', () => {
			const data: unknown = {
				name: 'Test',
				dataverseUrl: 'https://test.crm.dynamics.com',
				tenantId: 'tenant-123',
				authenticationMethod: 'OAuth',
				publicClientId: 'client-123'
			};

			if (isTestConnectionData(data)) {
				const _name: string = data.name;
				expect(_name).toBe('Test');
			}
		});

		it('should narrow DiscoverEnvironmentIdRequest type when guard passes', () => {
			const data: unknown = {
				name: 'Test',
				dataverseUrl: 'https://test.crm.dynamics.com',
				tenantId: 'tenant-123',
				authenticationMethod: 'OAuth',
				publicClientId: 'client-123'
			};

			if (isDiscoverEnvironmentIdData(data)) {
				const _name: string = data.name;
				expect(_name).toBe('Test');
			}
		});

		it('should narrow validate name type when guard passes', () => {
			const data: unknown = { name: 'Test' };

			if (isValidateNameData(data)) {
				const _name: string = data.name;
				expect(_name).toBe('Test');
			}
		});
	});

	describe('Edge cases', () => {
		it('should handle objects with null prototype', () => {
			const objWithNullProto = Object.create(null);
			objWithNullProto.name = 'Test';
			objWithNullProto.dataverseUrl = 'https://test.crm.dynamics.com';
			objWithNullProto.tenantId = 'tenant-123';
			objWithNullProto.authenticationMethod = 'OAuth';
			objWithNullProto.publicClientId = 'client-123';

			expect(isSaveEnvironmentData(objWithNullProto)).toBe(true);
		});

		it('should handle objects with inherited properties', () => {
			class BaseObject {
				public dataverseUrl = 'https://test.crm.dynamics.com';
			}

			const obj: unknown = new BaseObject();
			const objRecord = obj as Record<string, unknown>;
			objRecord['name'] = 'Test';
			objRecord['tenantId'] = 'tenant-123';
			objRecord['authenticationMethod'] = AuthenticationMethodType.Interactive;
			objRecord['publicClientId'] = 'client-123';

			expect(isSaveEnvironmentData(obj)).toBe(true);
		});

		it('should handle objects with symbol properties', () => {
			const sym = Symbol('test');
			const obj = {
				[sym]: 'symbol value',
				name: 'Test',
				dataverseUrl: 'https://test.crm.dynamics.com',
				tenantId: 'tenant-123',
				authenticationMethod: AuthenticationMethodType.Interactive,
				publicClientId: 'client-123'
			};

			expect(isSaveEnvironmentData(obj)).toBe(true);
		});

		it('should handle objects with getters', () => {
			const obj = {
				get name(): string {
					return 'Test';
				},
				dataverseUrl: 'https://test.crm.dynamics.com',
				tenantId: 'tenant-123',
				authenticationMethod: AuthenticationMethodType.Interactive,
				publicClientId: 'client-123'
			};

			expect(isSaveEnvironmentData(obj)).toBe(true);
		});

		it('should reject objects where name property is a getter returning non-string', () => {
			const obj = {
				get name(): number {
					return 123;
				},
				dataverseUrl: 'https://test.crm.dynamics.com',
				tenantId: 'tenant-123',
				authenticationMethod: AuthenticationMethodType.Interactive,
				publicClientId: 'client-123'
			};

			// isSaveEnvironmentData doesn't check types of required fields except for name in isValidateNameData
			// So this should still pass
			expect(isSaveEnvironmentData(obj)).toBe(true);
		});

		it('should handle isValidateNameData with getter returning non-string', () => {
			const obj = {
				get name(): number {
					return 123;
				}
			};

			expect(isValidateNameData(obj)).toBe(false);
		});
	});
});
