import { IsolationMode } from './IsolationMode';

describe('IsolationMode', () => {
	describe('static instances', () => {
		it('should have None with value 1', () => {
			expect(IsolationMode.None.getValue()).toBe(1);
			expect(IsolationMode.None.getName()).toBe('None');
		});

		it('should have Sandbox with value 2', () => {
			expect(IsolationMode.Sandbox.getValue()).toBe(2);
			expect(IsolationMode.Sandbox.getName()).toBe('Sandbox');
		});
	});

	describe('fromValue', () => {
		it('should return None for value 0 (legacy system assemblies)', () => {
			// Some system assemblies return 0, which is treated as None
			expect(IsolationMode.fromValue(0)).toBe(IsolationMode.None);
		});

		it('should return None for value 1', () => {
			expect(IsolationMode.fromValue(1)).toBe(IsolationMode.None);
		});

		it('should return Sandbox for value 2', () => {
			expect(IsolationMode.fromValue(2)).toBe(IsolationMode.Sandbox);
		});

		it('should throw error for invalid value', () => {
			expect(() => IsolationMode.fromValue(3)).toThrow('Invalid IsolationMode value: 3');
		});

		it('should throw error for negative value', () => {
			expect(() => IsolationMode.fromValue(-1)).toThrow('Invalid IsolationMode value: -1');
		});
	});

	describe('equals', () => {
		it('should return true for same instance', () => {
			expect(IsolationMode.Sandbox.equals(IsolationMode.Sandbox)).toBe(true);
		});

		it('should return true for instances with same value', () => {
			const mode1 = IsolationMode.fromValue(2);
			const mode2 = IsolationMode.fromValue(2);
			expect(mode1.equals(mode2)).toBe(true);
		});

		it('should return false for different modes', () => {
			expect(IsolationMode.None.equals(IsolationMode.Sandbox)).toBe(false);
		});
	});
});
