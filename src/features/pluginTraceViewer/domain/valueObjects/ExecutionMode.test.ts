import { ExecutionMode } from './ExecutionMode';

describe('ExecutionMode', () => {
	describe('constants', () => {
		it('should have Synchronous constant with value 0', () => {
			expect(ExecutionMode.Synchronous.value).toBe(0);
		});

		it('should have Asynchronous constant with value 1', () => {
			expect(ExecutionMode.Asynchronous.value).toBe(1);
		});
	});

	describe('fromNumber', () => {
		it('should create Synchronous from 0', () => {
			const mode = ExecutionMode.fromNumber(0);
			expect(mode).toBe(ExecutionMode.Synchronous);
		});

		it('should create Asynchronous from 1', () => {
			const mode = ExecutionMode.fromNumber(1);
			expect(mode).toBe(ExecutionMode.Asynchronous);
		});

		it('should throw error for invalid value', () => {
			expect(() => ExecutionMode.fromNumber(2)).toThrow('Invalid execution mode: 2');
		});

		it('should throw error for negative value', () => {
			expect(() => ExecutionMode.fromNumber(-1)).toThrow('Invalid execution mode: -1');
		});
	});

	describe('isSynchronous', () => {
		it('should return true for Synchronous mode', () => {
			expect(ExecutionMode.Synchronous.isSynchronous()).toBe(true);
		});

		it('should return false for Asynchronous mode', () => {
			expect(ExecutionMode.Asynchronous.isSynchronous()).toBe(false);
		});
	});

	describe('equals', () => {
		it('should return true for same execution mode', () => {
			expect(ExecutionMode.Synchronous.equals(ExecutionMode.Synchronous)).toBe(true);
			expect(ExecutionMode.Asynchronous.equals(ExecutionMode.Asynchronous)).toBe(true);
		});

		it('should return false for different execution modes', () => {
			expect(ExecutionMode.Synchronous.equals(ExecutionMode.Asynchronous)).toBe(false);
			expect(ExecutionMode.Asynchronous.equals(ExecutionMode.Synchronous)).toBe(false);
		});

		it('should return false for null', () => {
			expect(ExecutionMode.Synchronous.equals(null)).toBe(false);
		});
	});
});
