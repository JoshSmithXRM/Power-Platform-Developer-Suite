import { ServiceEndpointViewModelMapper } from './ServiceEndpointViewModelMapper';
import { ServiceEndpoint } from '../../domain/entities/ServiceEndpoint';
import { ServiceEndpointContract } from '../../domain/valueObjects/ServiceEndpointContract';
import { ServiceEndpointConnectionMode } from '../../domain/valueObjects/ServiceEndpointConnectionMode';
import { WebHookAuthType } from '../../domain/valueObjects/WebHookAuthType';
import { MessageFormat } from '../../domain/valueObjects/MessageFormat';
import { UserClaimType } from '../../domain/valueObjects/UserClaimType';

describe('ServiceEndpointViewModelMapper', () => {
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
			description: 'A test endpoint',
			solutionNamespace: 'mybus',
			namespaceAddress: 'sb://mybus.servicebus.windows.net',
			path: 'myqueue',
			contract: ServiceEndpointContract.Queue,
			connectionMode: ServiceEndpointConnectionMode.Normal,
			authType: WebHookAuthType.SASKey,
			sasKeyName: 'RootManageSharedAccessKey',
			messageFormat: MessageFormat.Json,
			userClaim: UserClaimType.UserId,
			createdOn: new Date('2024-01-01T10:00:00Z'),
			modifiedOn: new Date('2024-01-02T10:00:00Z'),
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

	describe('toViewModel', () => {
		it('should map all fields correctly for Queue endpoint', () => {
			const endpoint = createServiceEndpoint();
			const viewModel = ServiceEndpointViewModelMapper.toViewModel(endpoint);

			expect(viewModel.id).toBe('endpoint-123');
			expect(viewModel.name).toBe('Test Service Endpoint');
			expect(viewModel.description).toBe('A test endpoint');
			expect(viewModel.contract).toBe('Queue');
			expect(viewModel.contractValue).toBe(6);
			expect(viewModel.authType).toBe('SASKey');
			expect(viewModel.authTypeValue).toBe(2);
			expect(viewModel.messageFormat).toBe('JSON');
			expect(viewModel.messageFormatValue).toBe(2);
			expect(viewModel.userClaim).toBe('UserId');
			expect(viewModel.userClaimValue).toBe(2);
			expect(viewModel.namespace).toBe('mybus'); // Uses solutionNamespace for Queue
			expect(viewModel.namespaceAddress).toBe('sb://mybus.servicebus.windows.net');
			expect(viewModel.path).toBe('myqueue');
			expect(viewModel.connectionMode).toBe('Normal');
			expect(viewModel.connectionModeValue).toBe(1);
			expect(viewModel.sasKeyName).toBe('RootManageSharedAccessKey');
			expect(viewModel.createdOn).toBe('2024-01-01T10:00:00.000Z');
			expect(viewModel.modifiedOn).toBe('2024-01-02T10:00:00.000Z');
			expect(viewModel.isManaged).toBe(false);
			expect(viewModel.canUpdate).toBe(true);
			expect(viewModel.canDelete).toBe(true);
		});

		it('should use namespaceAddress for EventHub endpoint', () => {
			const endpoint = createServiceEndpoint({
				contract: ServiceEndpointContract.EventHub,
				solutionNamespace: '',
				namespaceAddress: 'sb://eventhub.servicebus.windows.net',
			});
			const viewModel = ServiceEndpointViewModelMapper.toViewModel(endpoint);

			expect(viewModel.namespace).toBe('sb://eventhub.servicebus.windows.net');
			expect(viewModel.contract).toBe('EventHub');
		});

		it('should handle null description', () => {
			const endpoint = createServiceEndpoint({ description: null });
			const viewModel = ServiceEndpointViewModelMapper.toViewModel(endpoint);

			expect(viewModel.description).toBeNull();
		});

		it('should handle null path', () => {
			const endpoint = createServiceEndpoint({ path: null });
			const viewModel = ServiceEndpointViewModelMapper.toViewModel(endpoint);

			expect(viewModel.path).toBeNull();
		});

		it('should set canDelete to false for managed endpoints', () => {
			const endpoint = createServiceEndpoint({ isManaged: true });
			const viewModel = ServiceEndpointViewModelMapper.toViewModel(endpoint);

			expect(viewModel.isManaged).toBe(true);
			expect(viewModel.canDelete).toBe(false);
			expect(viewModel.canUpdate).toBe(true); // Still updatable when managed
		});

		it('should map Topic contract correctly', () => {
			const endpoint = createServiceEndpoint({ contract: ServiceEndpointContract.Topic });
			const viewModel = ServiceEndpointViewModelMapper.toViewModel(endpoint);

			expect(viewModel.contract).toBe('Topic');
			expect(viewModel.contractValue).toBe(5);
		});

		it('should map Federated connection mode correctly', () => {
			const endpoint = createServiceEndpoint({
				connectionMode: ServiceEndpointConnectionMode.Federated,
			});
			const viewModel = ServiceEndpointViewModelMapper.toViewModel(endpoint);

			expect(viewModel.connectionMode).toBe('Federated');
			expect(viewModel.connectionModeValue).toBe(2);
		});

		it('should map all message formats correctly', () => {
			const dotNetEndpoint = createServiceEndpoint({ messageFormat: MessageFormat.DotNet });
			const xmlEndpoint = createServiceEndpoint({ messageFormat: MessageFormat.Xml });

			expect(ServiceEndpointViewModelMapper.toViewModel(dotNetEndpoint).messageFormat).toBe(
				'.NET Binary'
			);
			expect(ServiceEndpointViewModelMapper.toViewModel(xmlEndpoint).messageFormat).toBe(
				'XML'
			);
		});

		it('should map all user claim types correctly', () => {
			const noneEndpoint = createServiceEndpoint({ userClaim: UserClaimType.None });
			const userInfoEndpoint = createServiceEndpoint({ userClaim: UserClaimType.UserInfo });

			expect(ServiceEndpointViewModelMapper.toViewModel(noneEndpoint).userClaim).toBe('None');
			expect(ServiceEndpointViewModelMapper.toViewModel(userInfoEndpoint).userClaim).toBe(
				'UserInfo'
			);
		});
	});

	describe('toViewModels', () => {
		it('should map empty array', () => {
			const viewModels = ServiceEndpointViewModelMapper.toViewModels([]);
			expect(viewModels).toHaveLength(0);
		});

		it('should map multiple endpoints', () => {
			const endpoints = [
				createServiceEndpoint({ id: 'ep-1', name: 'Endpoint 1' }),
				createServiceEndpoint({ id: 'ep-2', name: 'Endpoint 2' }),
				createServiceEndpoint({ id: 'ep-3', name: 'Endpoint 3' }),
			];
			const viewModels = ServiceEndpointViewModelMapper.toViewModels(endpoints);

			expect(viewModels).toHaveLength(3);

			const vm0 = viewModels[0];
			const vm1 = viewModels[1];
			const vm2 = viewModels[2];

			expect(vm0).toBeDefined();
			expect(vm1).toBeDefined();
			expect(vm2).toBeDefined();

			if (vm0 && vm1 && vm2) {
				expect(vm0.id).toBe('ep-1');
				expect(vm0.name).toBe('Endpoint 1');
				expect(vm1.id).toBe('ep-2');
				expect(vm1.name).toBe('Endpoint 2');
				expect(vm2.id).toBe('ep-3');
				expect(vm2.name).toBe('Endpoint 3');
			}
		});
	});
});
