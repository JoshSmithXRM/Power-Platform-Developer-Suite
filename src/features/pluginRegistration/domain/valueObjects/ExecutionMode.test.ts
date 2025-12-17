import { ExecutionMode } from './ExecutionMode';

describe('ExecutionMode', () => {
	describe('static instances', () => {
		it('should have Synchronous with value 0', () => {
			expect(ExecutionMode.Synchronous.getValue()).toBe(0);
			expect(ExecutionMode.Synchronous.getName()).toBe('Synchronous');
		});

		it('should have Asynchronous with value 1', () => {
			expect(ExecutionMode.Asynchronous.getValue()).toBe(1);
			expect(ExecutionMode.Asynchronous.getName()).toBe('Asynchronous');
		});
	});

	describe('fromValue', () => {
		it('should return Synchronous for value 0', () => {
			expect(ExecutionMode.fromValue(0)).toBe(ExecutionMode.Synchronous);
		});

		it('should return Asynchronous for value 1', () => {
			expect(ExecutionMode.fromValue(1)).toBe(ExecutionMode.Asynchronous);
		});

		it('should throw error for invalid value', () => {
			expect(() => ExecutionMode.fromValue(2)).toThrow('Invalid ExecutionMode value: 2');
		});

		it('should throw error for negative value', () => {
			expect(() => ExecutionMode.fromValue(-1)).toThrow('Invalid ExecutionMode value: -1');
		});
	});

	describe('isAsync', () => {
		it('should return false for Synchronous', () => {
			expect(ExecutionMode.Synchronous.isAsync()).toBe(false);
		});

		it('should return true for Asynchronous', () => {
			expect(ExecutionMode.Asynchronous.isAsync()).toBe(true);
		});
	});

	describe('equals', () => {
		it('should return true for same instance', () => {
			expect(ExecutionMode.Synchronous.equals(ExecutionMode.Synchronous)).toBe(true);
		});

		it('should return true for instances with same value', () => {
			const mode1 = ExecutionMode.fromValue(0);
			const mode2 = ExecutionMode.fromValue(0);
			expect(mode1.equals(mode2)).toBe(true);
		});

		it('should return false for different modes', () => {
			expect(ExecutionMode.Synchronous.equals(ExecutionMode.Asynchronous)).toBe(false);
		});
	});
});
