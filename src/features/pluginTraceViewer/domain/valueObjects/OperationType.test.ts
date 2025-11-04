import { OperationType } from './OperationType';

describe('OperationType', () => {
	describe('constants', () => {
		it('should have Plugin constant with value 1', () => {
			expect(OperationType.Plugin.value).toBe(1);
		});

		it('should have Workflow constant with value 2', () => {
			expect(OperationType.Workflow.value).toBe(2);
		});
	});

	describe('fromNumber', () => {
		it('should create Plugin from 1', () => {
			const type = OperationType.fromNumber(1);
			expect(type).toBe(OperationType.Plugin);
		});

		it('should create Workflow from 2', () => {
			const type = OperationType.fromNumber(2);
			expect(type).toBe(OperationType.Workflow);
		});

		it('should throw error for invalid value', () => {
			expect(() => OperationType.fromNumber(0)).toThrow('Invalid operation type: 0');
		});

		it('should throw error for value 3', () => {
			expect(() => OperationType.fromNumber(3)).toThrow('Invalid operation type: 3');
		});
	});

	describe('equals', () => {
		it('should return true for same operation type', () => {
			expect(OperationType.Plugin.equals(OperationType.Plugin)).toBe(true);
			expect(OperationType.Workflow.equals(OperationType.Workflow)).toBe(true);
		});

		it('should return false for different operation types', () => {
			expect(OperationType.Plugin.equals(OperationType.Workflow)).toBe(false);
			expect(OperationType.Workflow.equals(OperationType.Plugin)).toBe(false);
		});

		it('should return false for null', () => {
			expect(OperationType.Plugin.equals(null)).toBe(false);
		});
	});
});
