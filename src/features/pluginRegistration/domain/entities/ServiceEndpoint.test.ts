import { ServiceEndpoint } from './ServiceEndpoint';
import { ServiceEndpointContract } from '../valueObjects/ServiceEndpointContract';
import { ServiceEndpointConnectionMode } from '../valueObjects/ServiceEndpointConnectionMode';
import { WebHookAuthType } from '../valueObjects/WebHookAuthType';
import { MessageFormat } from '../valueObjects/MessageFormat';
import { UserClaimType } from '../valueObjects/UserClaimType';

describe('ServiceEndpoint', () => {
	const createServiceEndpoint = (
		overrides: Partial<{
			id: string;
			name: string;
			description: string | null;
			solutionNamespace: string;
			namespaceAddress: string;
			path: string | null;
			contract: ServiceEndpointContract;
			connectionMode: ServiceEndpointConnectionMode;
			authType: WebHookAuthType;
			sasKeyName: string | null;
			messageFormat: MessageFormat;
			userClaim: UserClaimType;
			createdOn: Date;
			modifiedOn: Date;
			isManaged: boolean;
		}> = {}
	): ServiceEndpoint => {
		const defaults = {
			id: 'endpoint-123',
			name: 'Test Service Endpoint',
			description: null,
			solutionNamespace: 'mybus',
			namespaceAddress: 'sb://mybus.servicebus.windows.net',
			path: 'myqueue',
			contract: ServiceEndpointContract.Queue,
			connectionMode: ServiceEndpointConnectionMode.Normal,
			authType: WebHookAuthType.SASKey,
			sasKeyName: 'RootManageSharedAccessKey',
			messageFormat: MessageFormat.Json,
			userClaim: UserClaimType.None,
			createdOn: new Date('2024-01-01'),
			modifiedOn: new Date('2024-01-02'),
			isManaged: false,
		};
		const props = { ...defaults, ...overrides };
		return new ServiceEndpoint(
			props.id,
			props.name,
			props.description,
			props.solutionNamespace,
			props.namespaceAddress,
			props.path,
			props.contract,
			props.connectionMode,
			props.authType,
			props.sasKeyName,
			props.messageFormat,
			props.userClaim,
			props.createdOn,
			props.modifiedOn,
			props.isManaged
		);
	};

	describe('constructor validation', () => {
		it('should throw when namespace required but not provided', () => {
			expect(() =>
				createServiceEndpoint({
					contract: ServiceEndpointContract.Queue,
					solutionNamespace: '',
				})
			).toThrow('Solution namespace required for Queue/Topic/OneWay/TwoWay/Rest contracts');
		});

		it('should not throw for EventHub without namespace', () => {
			expect(() =>
				createServiceEndpoint({
					contract: ServiceEndpointContract.EventHub,
					solutionNamespace: '',
					namespaceAddress: 'sb://eventhub.servicebus.windows.net',
				})
			).not.toThrow();
		});

		it('should throw when SASKey auth but no sasKeyName', () => {
			expect(() =>
				createServiceEndpoint({
					authType: WebHookAuthType.SASKey,
					sasKeyName: null,
				})
			).toThrow('SAS Key Name required for SASKey auth type');
		});

		it('should not throw for SASToken auth without sasKeyName', () => {
			expect(() =>
				createServiceEndpoint({
					authType: WebHookAuthType.SASToken,
					sasKeyName: null,
				})
			).not.toThrow();
		});

		it('should not throw for ACS auth without sasKeyName', () => {
			expect(() =>
				createServiceEndpoint({
					authType: WebHookAuthType.ACS,
					sasKeyName: null,
				})
			).not.toThrow();
		});
	});

	describe('canUpdate', () => {
		it('should return true for unmanaged endpoint', () => {
			const endpoint = createServiceEndpoint({ isManaged: false });
			expect(endpoint.canUpdate()).toBe(true);
		});

		it('should return true for managed endpoint', () => {
			// Service endpoints can always be updated regardless of managed state
			const endpoint = createServiceEndpoint({ isManaged: true });
			expect(endpoint.canUpdate()).toBe(true);
		});
	});

	describe('canDelete', () => {
		it('should return true for unmanaged endpoint', () => {
			const endpoint = createServiceEndpoint({ isManaged: false });
			expect(endpoint.canDelete()).toBe(true);
		});

		it('should return false for managed endpoint', () => {
			const endpoint = createServiceEndpoint({ isManaged: true });
			expect(endpoint.canDelete()).toBe(false);
		});
	});

	describe('isEventHub', () => {
		it('should return true for EventHub contract', () => {
			const endpoint = createServiceEndpoint({
				contract: ServiceEndpointContract.EventHub,
				solutionNamespace: '',
			});
			expect(endpoint.isEventHub()).toBe(true);
		});

		it('should return false for Queue contract', () => {
			const endpoint = createServiceEndpoint({ contract: ServiceEndpointContract.Queue });
			expect(endpoint.isEventHub()).toBe(false);
		});

		it('should return false for Topic contract', () => {
			const endpoint = createServiceEndpoint({ contract: ServiceEndpointContract.Topic });
			expect(endpoint.isEventHub()).toBe(false);
		});
	});

	describe('isQueueOrTopic', () => {
		it('should return true for Queue contract', () => {
			const endpoint = createServiceEndpoint({ contract: ServiceEndpointContract.Queue });
			expect(endpoint.isQueueOrTopic()).toBe(true);
		});

		it('should return true for Topic contract', () => {
			const endpoint = createServiceEndpoint({ contract: ServiceEndpointContract.Topic });
			expect(endpoint.isQueueOrTopic()).toBe(true);
		});

		it('should return false for EventHub contract', () => {
			const endpoint = createServiceEndpoint({
				contract: ServiceEndpointContract.EventHub,
				solutionNamespace: '',
			});
			expect(endpoint.isQueueOrTopic()).toBe(false);
		});

		it('should return false for OneWay contract', () => {
			const endpoint = createServiceEndpoint({ contract: ServiceEndpointContract.OneWay });
			expect(endpoint.isQueueOrTopic()).toBe(false);
		});
	});

	describe('isLegacyServiceBus', () => {
		it('should return true for OneWay contract', () => {
			const endpoint = createServiceEndpoint({ contract: ServiceEndpointContract.OneWay });
			expect(endpoint.isLegacyServiceBus()).toBe(true);
		});

		it('should return true for TwoWay contract', () => {
			const endpoint = createServiceEndpoint({ contract: ServiceEndpointContract.TwoWay });
			expect(endpoint.isLegacyServiceBus()).toBe(true);
		});

		it('should return false for Queue contract', () => {
			const endpoint = createServiceEndpoint({ contract: ServiceEndpointContract.Queue });
			expect(endpoint.isLegacyServiceBus()).toBe(false);
		});

		it('should return false for EventHub contract', () => {
			const endpoint = createServiceEndpoint({
				contract: ServiceEndpointContract.EventHub,
				solutionNamespace: '',
			});
			expect(endpoint.isLegacyServiceBus()).toBe(false);
		});
	});

	describe('getters', () => {
		it('should return correct id', () => {
			const endpoint = createServiceEndpoint({ id: 'test-id' });
			expect(endpoint.getId()).toBe('test-id');
		});

		it('should return correct name', () => {
			const endpoint = createServiceEndpoint({ name: 'My Endpoint' });
			expect(endpoint.getName()).toBe('My Endpoint');
		});

		it('should return correct description when set', () => {
			const endpoint = createServiceEndpoint({ description: 'Test description' });
			expect(endpoint.getDescription()).toBe('Test description');
		});

		it('should return null description when not set', () => {
			const endpoint = createServiceEndpoint({ description: null });
			expect(endpoint.getDescription()).toBeNull();
		});

		it('should return correct solutionNamespace', () => {
			const endpoint = createServiceEndpoint({ solutionNamespace: 'myns' });
			expect(endpoint.getSolutionNamespace()).toBe('myns');
		});

		it('should return correct namespaceAddress', () => {
			const endpoint = createServiceEndpoint({
				namespaceAddress: 'sb://test.servicebus.windows.net',
			});
			expect(endpoint.getNamespaceAddress()).toBe('sb://test.servicebus.windows.net');
		});

		it('should return correct path when set', () => {
			const endpoint = createServiceEndpoint({ path: 'myqueue' });
			expect(endpoint.getPath()).toBe('myqueue');
		});

		it('should return null path when not set', () => {
			const endpoint = createServiceEndpoint({ path: null });
			expect(endpoint.getPath()).toBeNull();
		});

		it('should return correct contract', () => {
			const endpoint = createServiceEndpoint({ contract: ServiceEndpointContract.Topic });
			expect(endpoint.getContract()).toBe(ServiceEndpointContract.Topic);
		});

		it('should return correct connectionMode', () => {
			const endpoint = createServiceEndpoint({
				connectionMode: ServiceEndpointConnectionMode.Federated,
			});
			expect(endpoint.getConnectionMode()).toBe(ServiceEndpointConnectionMode.Federated);
		});

		it('should return correct authType', () => {
			const endpoint = createServiceEndpoint({ authType: WebHookAuthType.SASToken });
			expect(endpoint.getAuthType()).toBe(WebHookAuthType.SASToken);
		});

		it('should return correct sasKeyName', () => {
			const endpoint = createServiceEndpoint({ sasKeyName: 'MySasKey' });
			expect(endpoint.getSasKeyName()).toBe('MySasKey');
		});

		it('should return correct messageFormat', () => {
			const endpoint = createServiceEndpoint({ messageFormat: MessageFormat.Xml });
			expect(endpoint.getMessageFormat()).toBe(MessageFormat.Xml);
		});

		it('should return correct userClaim', () => {
			const endpoint = createServiceEndpoint({ userClaim: UserClaimType.UserInfo });
			expect(endpoint.getUserClaim()).toBe(UserClaimType.UserInfo);
		});

		it('should return correct createdOn', () => {
			const date = new Date('2024-03-15');
			const endpoint = createServiceEndpoint({ createdOn: date });
			expect(endpoint.getCreatedOn()).toBe(date);
		});

		it('should return correct modifiedOn', () => {
			const date = new Date('2024-03-20');
			const endpoint = createServiceEndpoint({ modifiedOn: date });
			expect(endpoint.getModifiedOn()).toBe(date);
		});

		it('should return correct isInManagedState', () => {
			const endpoint = createServiceEndpoint({ isManaged: true });
			expect(endpoint.isInManagedState()).toBe(true);
		});
	});
});
