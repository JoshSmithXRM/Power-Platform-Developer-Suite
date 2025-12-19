import { ServiceEndpointContract } from './ServiceEndpointContract';

describe('ServiceEndpointContract', () => {
	describe('static instances', () => {
		it('should have OneWay with value 1', () => {
			expect(ServiceEndpointContract.OneWay.getValue()).toBe(1);
			expect(ServiceEndpointContract.OneWay.getName()).toBe('OneWay');
		});

		it('should have Queue with value 2', () => {
			expect(ServiceEndpointContract.Queue.getValue()).toBe(2);
			expect(ServiceEndpointContract.Queue.getName()).toBe('Queue');
		});

		it('should have Rest with value 3', () => {
			expect(ServiceEndpointContract.Rest.getValue()).toBe(3);
			expect(ServiceEndpointContract.Rest.getName()).toBe('Rest');
		});

		it('should have TwoWay with value 4', () => {
			expect(ServiceEndpointContract.TwoWay.getValue()).toBe(4);
			expect(ServiceEndpointContract.TwoWay.getName()).toBe('TwoWay');
		});

		it('should have Topic with value 5', () => {
			expect(ServiceEndpointContract.Topic.getValue()).toBe(5);
			expect(ServiceEndpointContract.Topic.getName()).toBe('Topic');
		});

		it('should have QueuePersistent with value 6', () => {
			expect(ServiceEndpointContract.QueuePersistent.getValue()).toBe(6);
			expect(ServiceEndpointContract.QueuePersistent.getName()).toBe('Queue (Persistent)');
		});

		it('should have EventHub with value 7', () => {
			expect(ServiceEndpointContract.EventHub.getValue()).toBe(7);
			expect(ServiceEndpointContract.EventHub.getName()).toBe('EventHub');
		});

		it('should have EventGrid with value 9', () => {
			expect(ServiceEndpointContract.EventGrid.getValue()).toBe(9);
			expect(ServiceEndpointContract.EventGrid.getName()).toBe('Event Grid');
		});

		it('should have ManagedDataLake with value 10', () => {
			expect(ServiceEndpointContract.ManagedDataLake.getValue()).toBe(10);
			expect(ServiceEndpointContract.ManagedDataLake.getName()).toBe('Managed Data Lake');
		});

		it('should have ContainerStorage with value 11', () => {
			expect(ServiceEndpointContract.ContainerStorage.getValue()).toBe(11);
			expect(ServiceEndpointContract.ContainerStorage.getName()).toBe('Container Storage');
		});
	});

	describe('fromValue', () => {
		it('should return OneWay for value 1', () => {
			expect(ServiceEndpointContract.fromValue(1)).toBe(ServiceEndpointContract.OneWay);
		});

		it('should return Queue for value 2', () => {
			expect(ServiceEndpointContract.fromValue(2)).toBe(ServiceEndpointContract.Queue);
		});

		it('should return Rest for value 3', () => {
			expect(ServiceEndpointContract.fromValue(3)).toBe(ServiceEndpointContract.Rest);
		});

		it('should return TwoWay for value 4', () => {
			expect(ServiceEndpointContract.fromValue(4)).toBe(ServiceEndpointContract.TwoWay);
		});

		it('should return Topic for value 5', () => {
			expect(ServiceEndpointContract.fromValue(5)).toBe(ServiceEndpointContract.Topic);
		});

		it('should return QueuePersistent for value 6', () => {
			expect(ServiceEndpointContract.fromValue(6)).toBe(ServiceEndpointContract.QueuePersistent);
		});

		it('should return EventHub for value 7', () => {
			expect(ServiceEndpointContract.fromValue(7)).toBe(ServiceEndpointContract.EventHub);
		});

		it('should return EventGrid for value 9', () => {
			expect(ServiceEndpointContract.fromValue(9)).toBe(ServiceEndpointContract.EventGrid);
		});

		it('should return ManagedDataLake for value 10', () => {
			expect(ServiceEndpointContract.fromValue(10)).toBe(ServiceEndpointContract.ManagedDataLake);
		});

		it('should return ContainerStorage for value 11', () => {
			expect(ServiceEndpointContract.fromValue(11)).toBe(ServiceEndpointContract.ContainerStorage);
		});

		it('should return Unknown for value 8 (WebHook - handled separately)', () => {
			const contract = ServiceEndpointContract.fromValue(8);
			expect(contract.getName()).toBe('Unknown (8)');
			expect(contract.getValue()).toBe(8);
			expect(contract.isUnknown()).toBe(true);
		});

		it('should return Unknown for unrecognized values', () => {
			const contract = ServiceEndpointContract.fromValue(999);
			expect(contract.getName()).toBe('Unknown (999)');
			expect(contract.getValue()).toBe(999);
			expect(contract.isUnknown()).toBe(true);
		});
	});

	describe('isUnknown', () => {
		it('should return false for known contract types', () => {
			expect(ServiceEndpointContract.Queue.isUnknown()).toBe(false);
			expect(ServiceEndpointContract.Topic.isUnknown()).toBe(false);
			expect(ServiceEndpointContract.EventHub.isUnknown()).toBe(false);
		});

		it('should return true for unknown contract types', () => {
			const unknown = ServiceEndpointContract.fromValue(999);
			expect(unknown.isUnknown()).toBe(true);
		});
	});

	describe('all', () => {
		it('should return all contract types excluding WebHook', () => {
			const all = ServiceEndpointContract.all();
			expect(all).toHaveLength(10);
			expect(all).toContain(ServiceEndpointContract.OneWay);
			expect(all).toContain(ServiceEndpointContract.Queue);
			expect(all).toContain(ServiceEndpointContract.Rest);
			expect(all).toContain(ServiceEndpointContract.TwoWay);
			expect(all).toContain(ServiceEndpointContract.Topic);
			expect(all).toContain(ServiceEndpointContract.QueuePersistent);
			expect(all).toContain(ServiceEndpointContract.EventHub);
			expect(all).toContain(ServiceEndpointContract.EventGrid);
			expect(all).toContain(ServiceEndpointContract.ManagedDataLake);
			expect(all).toContain(ServiceEndpointContract.ContainerStorage);
		});
	});

	describe('common', () => {
		it('should return common contract types for registration', () => {
			const common = ServiceEndpointContract.common();
			expect(common).toHaveLength(4);
			expect(common).toContain(ServiceEndpointContract.Queue);
			expect(common).toContain(ServiceEndpointContract.Topic);
			expect(common).toContain(ServiceEndpointContract.EventHub);
			expect(common).toContain(ServiceEndpointContract.EventGrid);
		});
	});

	describe('requiresNamespace', () => {
		it('should return true for OneWay', () => {
			expect(ServiceEndpointContract.OneWay.requiresNamespace()).toBe(true);
		});

		it('should return true for Queue', () => {
			expect(ServiceEndpointContract.Queue.requiresNamespace()).toBe(true);
		});

		it('should return false for Rest (uses URL)', () => {
			expect(ServiceEndpointContract.Rest.requiresNamespace()).toBe(false);
		});

		it('should return true for TwoWay', () => {
			expect(ServiceEndpointContract.TwoWay.requiresNamespace()).toBe(true);
		});

		it('should return true for Topic', () => {
			expect(ServiceEndpointContract.Topic.requiresNamespace()).toBe(true);
		});

		it('should return true for QueuePersistent', () => {
			expect(ServiceEndpointContract.QueuePersistent.requiresNamespace()).toBe(true);
		});

		it('should return false for EventHub', () => {
			expect(ServiceEndpointContract.EventHub.requiresNamespace()).toBe(false);
		});

		it('should return false for EventGrid', () => {
			expect(ServiceEndpointContract.EventGrid.requiresNamespace()).toBe(false);
		});

		it('should return false for ManagedDataLake', () => {
			expect(ServiceEndpointContract.ManagedDataLake.requiresNamespace()).toBe(false);
		});

		it('should return false for ContainerStorage', () => {
			expect(ServiceEndpointContract.ContainerStorage.requiresNamespace()).toBe(false);
		});
	});

	describe('equals', () => {
		it('should return true for same instance', () => {
			expect(ServiceEndpointContract.Queue.equals(ServiceEndpointContract.Queue)).toBe(true);
		});

		it('should return true for instances with same value', () => {
			const contract1 = ServiceEndpointContract.fromValue(2);
			const contract2 = ServiceEndpointContract.fromValue(2);
			expect(contract1.equals(contract2)).toBe(true);
		});

		it('should return false for different contracts', () => {
			expect(ServiceEndpointContract.Queue.equals(ServiceEndpointContract.Topic)).toBe(false);
		});
	});
});
