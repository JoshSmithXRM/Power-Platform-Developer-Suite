import { ServiceEndpointContract } from './ServiceEndpointContract';

describe('ServiceEndpointContract', () => {
	describe('static instances', () => {
		it('should have OneWay with value 1', () => {
			expect(ServiceEndpointContract.OneWay.getValue()).toBe(1);
			expect(ServiceEndpointContract.OneWay.getName()).toBe('OneWay');
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

		it('should have Queue with value 6', () => {
			expect(ServiceEndpointContract.Queue.getValue()).toBe(6);
			expect(ServiceEndpointContract.Queue.getName()).toBe('Queue');
		});

		it('should have EventHub with value 7', () => {
			expect(ServiceEndpointContract.EventHub.getValue()).toBe(7);
			expect(ServiceEndpointContract.EventHub.getName()).toBe('EventHub');
		});
	});

	describe('fromValue', () => {
		it('should return OneWay for value 1', () => {
			expect(ServiceEndpointContract.fromValue(1)).toBe(ServiceEndpointContract.OneWay);
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

		it('should return Queue for value 6', () => {
			expect(ServiceEndpointContract.fromValue(6)).toBe(ServiceEndpointContract.Queue);
		});

		it('should return EventHub for value 7', () => {
			expect(ServiceEndpointContract.fromValue(7)).toBe(ServiceEndpointContract.EventHub);
		});

		it('should throw for value 2 (not used)', () => {
			expect(() => ServiceEndpointContract.fromValue(2)).toThrow(
				'Invalid ServiceEndpointContract value: 2'
			);
		});

		it('should throw for value 8 (WebHook)', () => {
			expect(() => ServiceEndpointContract.fromValue(8)).toThrow(
				'Invalid ServiceEndpointContract value: 8'
			);
		});

		it('should throw for invalid value', () => {
			expect(() => ServiceEndpointContract.fromValue(999)).toThrow(
				'Invalid ServiceEndpointContract value: 999'
			);
		});
	});

	describe('all', () => {
		it('should return all contract types excluding WebHook', () => {
			const all = ServiceEndpointContract.all();
			expect(all).toHaveLength(6);
			expect(all).toContain(ServiceEndpointContract.OneWay);
			expect(all).toContain(ServiceEndpointContract.Rest);
			expect(all).toContain(ServiceEndpointContract.TwoWay);
			expect(all).toContain(ServiceEndpointContract.Topic);
			expect(all).toContain(ServiceEndpointContract.Queue);
			expect(all).toContain(ServiceEndpointContract.EventHub);
		});
	});

	describe('common', () => {
		it('should return common contract types (Queue, Topic, EventHub)', () => {
			const common = ServiceEndpointContract.common();
			expect(common).toHaveLength(3);
			expect(common).toContain(ServiceEndpointContract.Queue);
			expect(common).toContain(ServiceEndpointContract.Topic);
			expect(common).toContain(ServiceEndpointContract.EventHub);
		});
	});

	describe('requiresNamespace', () => {
		it('should return true for Queue', () => {
			expect(ServiceEndpointContract.Queue.requiresNamespace()).toBe(true);
		});

		it('should return true for Topic', () => {
			expect(ServiceEndpointContract.Topic.requiresNamespace()).toBe(true);
		});

		it('should return true for OneWay', () => {
			expect(ServiceEndpointContract.OneWay.requiresNamespace()).toBe(true);
		});

		it('should return true for TwoWay', () => {
			expect(ServiceEndpointContract.TwoWay.requiresNamespace()).toBe(true);
		});

		it('should return true for Rest', () => {
			expect(ServiceEndpointContract.Rest.requiresNamespace()).toBe(true);
		});

		it('should return false for EventHub', () => {
			expect(ServiceEndpointContract.EventHub.requiresNamespace()).toBe(false);
		});
	});

	describe('equals', () => {
		it('should return true for same instance', () => {
			expect(ServiceEndpointContract.Queue.equals(ServiceEndpointContract.Queue)).toBe(true);
		});

		it('should return true for instances with same value', () => {
			const contract1 = ServiceEndpointContract.fromValue(6);
			const contract2 = ServiceEndpointContract.fromValue(6);
			expect(contract1.equals(contract2)).toBe(true);
		});

		it('should return false for different contracts', () => {
			expect(ServiceEndpointContract.Queue.equals(ServiceEndpointContract.Topic)).toBe(false);
		});
	});
});
