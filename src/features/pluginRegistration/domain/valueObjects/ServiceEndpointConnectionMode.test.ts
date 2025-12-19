import { ServiceEndpointConnectionMode } from './ServiceEndpointConnectionMode';

describe('ServiceEndpointConnectionMode', () => {
	describe('static instances', () => {
		it('should have Normal with value 1', () => {
			expect(ServiceEndpointConnectionMode.Normal.getValue()).toBe(1);
			expect(ServiceEndpointConnectionMode.Normal.getName()).toBe('Normal');
		});

		it('should have Federated with value 2', () => {
			expect(ServiceEndpointConnectionMode.Federated.getValue()).toBe(2);
			expect(ServiceEndpointConnectionMode.Federated.getName()).toBe('Federated');
		});
	});

	describe('fromValue', () => {
		it('should return Normal for value 1', () => {
			expect(ServiceEndpointConnectionMode.fromValue(1)).toBe(
				ServiceEndpointConnectionMode.Normal
			);
		});

		it('should return Federated for value 2', () => {
			expect(ServiceEndpointConnectionMode.fromValue(2)).toBe(
				ServiceEndpointConnectionMode.Federated
			);
		});

		it('should throw for invalid value', () => {
			expect(() => ServiceEndpointConnectionMode.fromValue(0)).toThrow(
				'Invalid ServiceEndpointConnectionMode value: 0'
			);
		});

		it('should throw for value 3', () => {
			expect(() => ServiceEndpointConnectionMode.fromValue(3)).toThrow(
				'Invalid ServiceEndpointConnectionMode value: 3'
			);
		});
	});

	describe('all', () => {
		it('should return all connection modes', () => {
			const all = ServiceEndpointConnectionMode.all();
			expect(all).toHaveLength(2);
			expect(all).toContain(ServiceEndpointConnectionMode.Normal);
			expect(all).toContain(ServiceEndpointConnectionMode.Federated);
		});
	});

	describe('equals', () => {
		it('should return true for same instance', () => {
			expect(
				ServiceEndpointConnectionMode.Normal.equals(ServiceEndpointConnectionMode.Normal)
			).toBe(true);
		});

		it('should return true for instances with same value', () => {
			const mode1 = ServiceEndpointConnectionMode.fromValue(1);
			const mode2 = ServiceEndpointConnectionMode.fromValue(1);
			expect(mode1.equals(mode2)).toBe(true);
		});

		it('should return false for different modes', () => {
			expect(
				ServiceEndpointConnectionMode.Normal.equals(ServiceEndpointConnectionMode.Federated)
			).toBe(false);
		});
	});
});
