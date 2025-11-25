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
	isWebviewLogMessage,
	isRefreshDataMessage,
	isEnvironmentChangedMessage,
	isRevealSecretMessage,
	isClearEntryMessage,
	isClearPropertyMessage,
	isViewImportJobMessage,
	isOpenInMakerMessage,
	isOpenFlowMessage,
	isSolutionChangedMessage,
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

	describe('isWebviewLogMessage', () => {
		const validMessage = {
			command: 'webview-log',
			level: 'info',
			message: 'Log message',
			componentName: 'TestComponent',
			timestamp: '2024-01-01T00:00:00.000Z'
		};

		it('should return true for valid webview log message', () => {
			expect(isWebviewLogMessage(validMessage)).toBe(true);
		});

		it('should return true with optional data', () => {
			const messageWithData = {
				...validMessage,
				data: { key: 'value' }
			};
			expect(isWebviewLogMessage(messageWithData)).toBe(true);
		});

		it('should validate all log levels', () => {
			const levels = ['debug', 'info', 'warn', 'error'];
			levels.forEach(level => {
				const message = { ...validMessage, level };
				expect(isWebviewLogMessage(message)).toBe(true);
			});
		});

		it('should return false for invalid log level', () => {
			const message = { ...validMessage, level: 'invalid' };
			expect(isWebviewLogMessage(message)).toBe(false);
		});

		it('should return false for non-string level', () => {
			const message = { ...validMessage, level: 123 };
			expect(isWebviewLogMessage(message)).toBe(false);
		});

		it('should return false for missing message', () => {
			const message = { ...validMessage, message: undefined };
			expect(isWebviewLogMessage(message)).toBe(false);
		});

		it('should return false for non-string componentName', () => {
			const message = { ...validMessage, componentName: 123 };
			expect(isWebviewLogMessage(message)).toBe(false);
		});

		it('should return false for missing timestamp', () => {
			const message = { ...validMessage, timestamp: undefined };
			expect(isWebviewLogMessage(message)).toBe(false);
		});

		it('should return false for invalid command', () => {
			const message = { ...validMessage, command: 'log' };
			expect(isWebviewLogMessage(message)).toBe(false);
		});

		it('should return false for non-message', () => {
			expect(isWebviewLogMessage(null)).toBe(false);
		});
	});

	describe('isRefreshDataMessage', () => {
		it('should return true for valid refresh message', () => {
			const message = { command: 'refresh' };
			expect(isRefreshDataMessage(message)).toBe(true);
		});

		it('should return true even with data', () => {
			const message = { command: 'refresh', data: {} };
			expect(isRefreshDataMessage(message)).toBe(true);
		});

		it('should return false for invalid command', () => {
			const message = { command: 'reload' };
			expect(isRefreshDataMessage(message)).toBe(false);
		});

		it('should return false for non-message', () => {
			expect(isRefreshDataMessage(null)).toBe(false);
		});
	});

	describe('isEnvironmentChangedMessage', () => {
		const validMessage = {
			command: 'environmentChanged',
			data: {
				environmentId: 'env-123'
			}
		};

		it('should return true for valid environment changed message', () => {
			expect(isEnvironmentChangedMessage(validMessage)).toBe(true);
		});

		it('should return false for invalid command', () => {
			const message = { ...validMessage, command: 'envChanged' };
			expect(isEnvironmentChangedMessage(message)).toBe(false);
		});

		it('should return false for missing environmentId', () => {
			const message = {
				command: 'environmentChanged',
				data: {}
			};
			expect(isEnvironmentChangedMessage(message)).toBe(false);
		});

		it('should return false for non-string environmentId', () => {
			const message = {
				command: 'environmentChanged',
				data: { environmentId: 123 }
			};
			expect(isEnvironmentChangedMessage(message)).toBe(false);
		});

		it('should return false for null data', () => {
			const message = {
				command: 'environmentChanged',
				data: null
			};
			expect(isEnvironmentChangedMessage(message)).toBe(false);
		});

		it('should return false for non-message', () => {
			expect(isEnvironmentChangedMessage(null)).toBe(false);
		});
	});

	describe('isRevealSecretMessage', () => {
		const validMessage = {
			command: 'revealSecret',
			key: 'secret-key'
		};

		it('should return true for valid reveal secret message', () => {
			expect(isRevealSecretMessage(validMessage)).toBe(true);
		});

		it('should return false for invalid command', () => {
			const message = { ...validMessage, command: 'reveal' };
			expect(isRevealSecretMessage(message)).toBe(false);
		});

		it('should return false for missing key', () => {
			const message = { command: 'revealSecret' };
			expect(isRevealSecretMessage(message)).toBe(false);
		});

		it('should return false for non-string key', () => {
			const message = { command: 'revealSecret', key: 123 };
			expect(isRevealSecretMessage(message)).toBe(false);
		});

		it('should return false for non-message', () => {
			expect(isRevealSecretMessage(null)).toBe(false);
		});
	});

	describe('isClearEntryMessage', () => {
		const validMessage = {
			command: 'clearEntry',
			key: 'entry-key'
		};

		it('should return true for valid clear entry message', () => {
			expect(isClearEntryMessage(validMessage)).toBe(true);
		});

		it('should return false for invalid command', () => {
			const message = { ...validMessage, command: 'clear' };
			expect(isClearEntryMessage(message)).toBe(false);
		});

		it('should return false for missing key', () => {
			const message = { command: 'clearEntry' };
			expect(isClearEntryMessage(message)).toBe(false);
		});

		it('should return false for non-string key', () => {
			const message = { command: 'clearEntry', key: 123 };
			expect(isClearEntryMessage(message)).toBe(false);
		});

		it('should return false for non-message', () => {
			expect(isClearEntryMessage(null)).toBe(false);
		});
	});

	describe('isClearPropertyMessage', () => {
		const validMessage = {
			command: 'clearProperty',
			key: 'property-key',
			path: 'property.path'
		};

		it('should return true for valid clear property message', () => {
			expect(isClearPropertyMessage(validMessage)).toBe(true);
		});

		it('should return false for invalid command', () => {
			const message = { ...validMessage, command: 'clear' };
			expect(isClearPropertyMessage(message)).toBe(false);
		});

		it('should return false for missing key', () => {
			const message = {
				command: 'clearProperty',
				path: 'property.path'
			};
			expect(isClearPropertyMessage(message)).toBe(false);
		});

		it('should return false for missing path', () => {
			const message = {
				command: 'clearProperty',
				key: 'property-key'
			};
			expect(isClearPropertyMessage(message)).toBe(false);
		});

		it('should return false for non-string key', () => {
			const message = { ...validMessage, key: 123 };
			expect(isClearPropertyMessage(message)).toBe(false);
		});

		it('should return false for non-string path', () => {
			const message = { ...validMessage, path: 123 };
			expect(isClearPropertyMessage(message)).toBe(false);
		});

		it('should return false for non-message', () => {
			expect(isClearPropertyMessage(null)).toBe(false);
		});
	});

	describe('isViewImportJobMessage', () => {
		const validMessage = {
			command: 'viewImportJob',
			data: {
				importJobId: 'job-123'
			}
		};

		it('should return true for valid view import job message', () => {
			expect(isViewImportJobMessage(validMessage)).toBe(true);
		});

		it('should return false for invalid command', () => {
			const message = { ...validMessage, command: 'viewJob' };
			expect(isViewImportJobMessage(message)).toBe(false);
		});

		it('should return false for missing importJobId', () => {
			const message = {
				command: 'viewImportJob',
				data: {}
			};
			expect(isViewImportJobMessage(message)).toBe(false);
		});

		it('should return false for non-string importJobId', () => {
			const message = {
				command: 'viewImportJob',
				data: { importJobId: 123 }
			};
			expect(isViewImportJobMessage(message)).toBe(false);
		});

		it('should return false for null data', () => {
			const message = {
				command: 'viewImportJob',
				data: null
			};
			expect(isViewImportJobMessage(message)).toBe(false);
		});

		it('should return false for non-message', () => {
			expect(isViewImportJobMessage(null)).toBe(false);
		});
	});

	describe('isOpenInMakerMessage', () => {
		const validMessage = {
			command: 'openInMaker',
			data: {
				solutionId: 'solution-123'
			}
		};

		it('should return true for valid open in maker message', () => {
			expect(isOpenInMakerMessage(validMessage)).toBe(true);
		});

		it('should return false for invalid command', () => {
			const message = { ...validMessage, command: 'open' };
			expect(isOpenInMakerMessage(message)).toBe(false);
		});

		it('should return false for missing solutionId', () => {
			const message = {
				command: 'openInMaker',
				data: {}
			};
			expect(isOpenInMakerMessage(message)).toBe(false);
		});

		it('should return false for non-string solutionId', () => {
			const message = {
				command: 'openInMaker',
				data: { solutionId: 123 }
			};
			expect(isOpenInMakerMessage(message)).toBe(false);
		});

		it('should return false for null data', () => {
			const message = {
				command: 'openInMaker',
				data: null
			};
			expect(isOpenInMakerMessage(message)).toBe(false);
		});

		it('should return false for non-message', () => {
			expect(isOpenInMakerMessage(null)).toBe(false);
		});
	});

	describe('isOpenFlowMessage', () => {
		const validMessage = {
			command: 'openFlow',
			data: {
				flowId: 'flow-123'
			}
		};

		it('should return true for valid open flow message', () => {
			expect(isOpenFlowMessage(validMessage)).toBe(true);
		});

		it('should return false for invalid command', () => {
			const message = { ...validMessage, command: 'open' };
			expect(isOpenFlowMessage(message)).toBe(false);
		});

		it('should return false for missing flowId', () => {
			const message = {
				command: 'openFlow',
				data: {}
			};
			expect(isOpenFlowMessage(message)).toBe(false);
		});

		it('should return false for non-string flowId', () => {
			const message = {
				command: 'openFlow',
				data: { flowId: 123 }
			};
			expect(isOpenFlowMessage(message)).toBe(false);
		});

		it('should return false for null data', () => {
			const message = {
				command: 'openFlow',
				data: null
			};
			expect(isOpenFlowMessage(message)).toBe(false);
		});

		it('should return false for non-message', () => {
			expect(isOpenFlowMessage(null)).toBe(false);
		});
	});

	describe('isSolutionChangedMessage', () => {
		const validMessage = {
			command: 'solutionChanged',
			data: {
				solutionId: 'solution-123'
			}
		};

		it('should return true for valid solution changed message', () => {
			expect(isSolutionChangedMessage(validMessage)).toBe(true);
		});

		it('should return false for invalid command', () => {
			const message = { ...validMessage, command: 'changed' };
			expect(isSolutionChangedMessage(message)).toBe(false);
		});

		it('should return false for missing solutionId', () => {
			const message = {
				command: 'solutionChanged',
				data: {}
			};
			expect(isSolutionChangedMessage(message)).toBe(false);
		});

		it('should return false for non-string solutionId', () => {
			const message = {
				command: 'solutionChanged',
				data: { solutionId: 123 }
			};
			expect(isSolutionChangedMessage(message)).toBe(false);
		});

		it('should return false for null data', () => {
			const message = {
				command: 'solutionChanged',
				data: null
			};
			expect(isSolutionChangedMessage(message)).toBe(false);
		});

		it('should return false for non-message', () => {
			expect(isSolutionChangedMessage(null)).toBe(false);
		});
	});
});
