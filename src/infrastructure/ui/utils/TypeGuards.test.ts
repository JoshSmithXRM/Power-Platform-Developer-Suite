/**
 * Unit tests for TypeGuards
 */

import { AuthenticationMethodType } from '../../../features/environmentSetup/domain/valueObjects/AuthenticationMethod';

import {
	isWebviewMessage,
	isSaveEnvironmentMessage,
	isTestConnectionMessage,
	isDeleteEnvironmentMessage,
	isDiscoverEnvironmentIdMessage,
	isCheckUniqueNameMessage,
	AUTHENTICATION_METHODS
} from './TypeGuards';

describe('TypeGuards', () => {
	describe('AUTHENTICATION_METHODS', () => {
		it('should have correct authentication method values', () => {
			expect(AUTHENTICATION_METHODS).toEqual([
				AuthenticationMethodType.Interactive,
				AuthenticationMethodType.ServicePrincipal,
				AuthenticationMethodType.UsernamePassword,
				AuthenticationMethodType.DeviceCode
			]);
		});

		it('should be readonly', () => {
			const methods: readonly AuthenticationMethodType[] = AUTHENTICATION_METHODS;
			// TypeScript enforces readonly at compile time
			expect(methods.length).toBe(4);
		});
	});

	describe('isWebviewMessage', () => {
		it('should return true for valid webview message', () => {
			const message = { command: 'save', data: {} };
			expect(isWebviewMessage(message)).toBe(true);
		});

		it('should return true for message with command only', () => {
			const message = { command: 'test' };
			expect(isWebviewMessage(message)).toBe(true);
		});

		it('should return false for null', () => {
			expect(isWebviewMessage(null)).toBe(false);
		});

		it('should return false for undefined', () => {
			expect(isWebviewMessage(undefined)).toBe(false);
		});

		it('should return false for string', () => {
			expect(isWebviewMessage('string')).toBe(false);
		});

		it('should return false for number', () => {
			expect(isWebviewMessage(123)).toBe(false);
		});

		it('should return false for object without command', () => {
			expect(isWebviewMessage({ data: {} })).toBe(false);
		});

		it('should return false for object with non-string command', () => {
			expect(isWebviewMessage({ command: 123 })).toBe(false);
		});
	});

	describe('isSaveEnvironmentMessage', () => {
		const validMessage = {
			command: 'save-environment',
			data: {
				name: 'DEV',
				dataverseUrl: 'https://org.crm.dynamics.com',
				tenantId: 'tenant-123',
				authenticationMethod: AuthenticationMethodType.Interactive,
				publicClientId: 'client-123'
			}
		};

		it('should return true for valid save message', () => {
			expect(isSaveEnvironmentMessage(validMessage)).toBe(true);
		});

		it('should return true with optional fields', () => {
			const messageWithOptional = {
				command: 'save-environment',
				data: {
					...validMessage.data,
					environmentId: 'env-123',
					clientId: 'client-456',
					clientSecret: 'secret',
					username: 'user@domain.com',
					password: 'pass'
				}
			};

			expect(isSaveEnvironmentMessage(messageWithOptional)).toBe(true);
		});

		it('should return false for invalid command', () => {
			const message = { ...validMessage, command: 'test' };
			expect(isSaveEnvironmentMessage(message)).toBe(false);
		});

		it('should return false for missing name', () => {
			const message = {
				command: 'save-environment',
				data: { ...validMessage.data, name: undefined }
			};
			expect(isSaveEnvironmentMessage(message)).toBe(false);
		});

		it('should return false for missing dataverseUrl', () => {
			const message = {
				command: 'save-environment',
				data: { ...validMessage.data, dataverseUrl: undefined }
			};
			expect(isSaveEnvironmentMessage(message)).toBe(false);
		});

		it('should return false for missing tenantId', () => {
			const message = {
				command: 'save-environment',
				data: { ...validMessage.data, tenantId: undefined }
			};
			expect(isSaveEnvironmentMessage(message)).toBe(false);
		});

		it('should return false for missing authenticationMethod', () => {
			const message = {
				command: 'save-environment',
				data: { ...validMessage.data, authenticationMethod: undefined }
			};
			expect(isSaveEnvironmentMessage(message)).toBe(false);
		});

		it('should return false for missing publicClientId', () => {
			const message = {
				command: 'save-environment',
				data: { ...validMessage.data, publicClientId: undefined }
			};
			expect(isSaveEnvironmentMessage(message)).toBe(false);
		});

		it('should return false for invalid authentication method', () => {
			const message = {
				command: 'save-environment',
				data: { ...validMessage.data, authenticationMethod: 'InvalidMethod' }
			};
			expect(isSaveEnvironmentMessage(message)).toBe(false);
		});

		it('should validate all authentication methods', () => {
			const methods: readonly AuthenticationMethodType[] = AUTHENTICATION_METHODS;
			methods.forEach((method: AuthenticationMethodType) => {
				const message = {
					command: 'save-environment',
					data: { ...validMessage.data, authenticationMethod: method }
				};
				expect(isSaveEnvironmentMessage(message)).toBe(true);
			});
		});

		it('should return false for null data', () => {
			const message = { command: 'save', data: null };
			expect(isSaveEnvironmentMessage(message)).toBe(false);
		});

		it('should return false for non-object data', () => {
			const message = { command: 'save', data: 'string' };
			expect(isSaveEnvironmentMessage(message)).toBe(false);
		});

		it('should return false for wrong field types', () => {
			const message = {
				command: 'save-environment',
				data: { ...validMessage.data, name: 123 }
			};
			expect(isSaveEnvironmentMessage(message)).toBe(false);
		});
	});

	describe('isTestConnectionMessage', () => {
		it('should return true for valid test message with data', () => {
			const message = {
				command: 'test-connection',
				data: {
					name: 'DEV',
					dataverseUrl: 'https://org.crm.dynamics.com',
					tenantId: 'tenant-123',
					authenticationMethod: 'Interactive',
					publicClientId: 'client-123'
				}
			};
			expect(isTestConnectionMessage(message)).toBe(true);
		});

		it('should return false for missing required fields', () => {
			const message = { command: 'test-connection', data: {} };
			expect(isTestConnectionMessage(message)).toBe(false);
		});

		it('should return false for invalid command', () => {
			const message = {
				command: 'save-environment',
				data: {
					name: 'DEV',
					dataverseUrl: 'https://org.crm.dynamics.com',
					tenantId: 'tenant-123',
					authenticationMethod: 'Interactive',
					publicClientId: 'client-123'
				}
			};
			expect(isTestConnectionMessage(message)).toBe(false);
		});

		it('should return false for non-message', () => {
			expect(isTestConnectionMessage(null)).toBe(false);
			expect(isTestConnectionMessage(undefined)).toBe(false);
			expect(isTestConnectionMessage('test')).toBe(false);
		});
	});

	describe('isDeleteEnvironmentMessage', () => {
		it('should return true for valid delete message', () => {
			const message = { command: 'delete-environment' };
			expect(isDeleteEnvironmentMessage(message)).toBe(true);
		});

		it('should return true even with data', () => {
			const message = { command: 'delete-environment', data: {} };
			expect(isDeleteEnvironmentMessage(message)).toBe(true);
		});

		it('should return false for invalid command', () => {
			const message = { command: 'save' };
			expect(isDeleteEnvironmentMessage(message)).toBe(false);
		});

		it('should return false for non-message', () => {
			expect(isDeleteEnvironmentMessage(null)).toBe(false);
		});
	});

	describe('isDiscoverEnvironmentIdMessage', () => {
		it('should return true for valid discover message with data', () => {
			const message = {
				command: 'discover-environment-id',
				data: {
					name: 'DEV',
					dataverseUrl: 'https://org.crm.dynamics.com',
					tenantId: 'tenant-123',
					authenticationMethod: 'Interactive',
					publicClientId: 'client-123'
				}
			};
			expect(isDiscoverEnvironmentIdMessage(message)).toBe(true);
		});

		it('should return false for missing required fields', () => {
			const message = { command: 'discover-environment-id', data: {} };
			expect(isDiscoverEnvironmentIdMessage(message)).toBe(false);
		});

		it('should return false for invalid command', () => {
			const message = {
				command: 'discover',
				data: {
					name: 'DEV',
					dataverseUrl: 'https://org.crm.dynamics.com',
					tenantId: 'tenant-123',
					authenticationMethod: 'Interactive',
					publicClientId: 'client-123'
				}
			};
			expect(isDiscoverEnvironmentIdMessage(message)).toBe(false);
		});

		it('should return false for non-message', () => {
			expect(isDiscoverEnvironmentIdMessage(null)).toBe(false);
		});
	});

	describe('isCheckUniqueNameMessage', () => {
		it('should return true for valid check unique name message', () => {
			const message = {
				command: 'validate-name',
				data: { name: 'DEV' }
			};
			expect(isCheckUniqueNameMessage(message)).toBe(true);
		});

		it('should return true with currentId', () => {
			const message = {
				command: 'validate-name',
				data: { name: 'DEV', currentId: 'env-123' }
			};
			expect(isCheckUniqueNameMessage(message)).toBe(true);
		});

		it('should return false for missing name', () => {
			const message = {
				command: 'validate-name',
				data: {}
			};
			expect(isCheckUniqueNameMessage(message)).toBe(false);
		});

		it('should return false for non-string name', () => {
			const message = {
				command: 'validate-name',
				data: { name: 123 }
			};
			expect(isCheckUniqueNameMessage(message)).toBe(false);
		});

		it('should return false for null data', () => {
			const message = {
				command: 'validate-name',
				data: null
			};
			expect(isCheckUniqueNameMessage(message)).toBe(false);
		});

		it('should return false for invalid command', () => {
			const message = {
				command: 'checkName',
				data: { name: 'DEV' }
			};
			expect(isCheckUniqueNameMessage(message)).toBe(false);
		});

		it('should return false for non-message', () => {
			expect(isCheckUniqueNameMessage(null)).toBe(false);
		});
	});

	describe('Type narrowing in TypeScript', () => {
		it('should narrow type after guard check', () => {
			const message: unknown = {
				command: 'save-environment',
				data: {
					name: 'DEV',
					dataverseUrl: 'https://org.crm.dynamics.com',
					tenantId: 'tenant-123',
					authenticationMethod: 'Interactive',
					publicClientId: 'client-123'
				}
			};

			if (isSaveEnvironmentMessage(message)) {
				// TypeScript should know message.data exists and has correct shape
				expect(message.data.name).toBe('DEV');
				expect(message.data.dataverseUrl).toBe('https://org.crm.dynamics.com');
				expect(message.command).toBe('save-environment');
			} else {
				throw new Error('Should have been a save environment message');
			}
		});
	});

	describe('Edge cases', () => {
		it('should handle messages with extra properties', () => {
			const message = {
				command: 'save-environment',
				data: {
					name: 'DEV',
					dataverseUrl: 'https://org.crm.dynamics.com',
					tenantId: 'tenant-123',
					authenticationMethod: 'Interactive',
					publicClientId: 'client-123',
					extraProperty: 'should be ignored'
				},
				extraTopLevel: 'also ignored'
			};

			expect(isSaveEnvironmentMessage(message)).toBe(true);
		});

		it('should handle empty strings in required fields', () => {
			const message = {
				command: 'save-environment',
				data: {
					name: '',
					dataverseUrl: '',
					tenantId: '',
					authenticationMethod: 'Interactive',
					publicClientId: ''
				}
			};

			// Empty strings are still strings, so validation passes
			// Business logic validation should happen elsewhere
			expect(isSaveEnvironmentMessage(message)).toBe(true);
		});

		it('should handle case-sensitive commands', () => {
			const message = { command: 'Save', data: {} };
			expect(isSaveEnvironmentMessage(message)).toBe(false);
		});

		it('should handle case-sensitive authentication methods', () => {
			const message = {
				command: 'save-environment',
				data: {
					name: 'DEV',
					dataverseUrl: 'https://org.crm.dynamics.com',
					tenantId: 'tenant-123',
					authenticationMethod: 'interactive', // lowercase
					publicClientId: 'client-123'
				}
			};

			expect(isSaveEnvironmentMessage(message)).toBe(false);
		});
	});
});
