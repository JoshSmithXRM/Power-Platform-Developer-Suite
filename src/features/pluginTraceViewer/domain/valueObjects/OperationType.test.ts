import { OperationType } from './OperationType';

describe('OperationType', () => {
	describe('constants', () => {
		test.each([
			[OperationType.Plugin, 1],
			[OperationType.Workflow, 2]
		])('should have constant with value %i', (type, expectedValue) => {
			expect(type.value).toBe(expectedValue);
		});
	});

	describe('fromNumber', () => {
		test.each([
			[1, OperationType.Plugin],
			[2, OperationType.Workflow]
		])('should create correct type from number %i', (value, expectedType) => {
			const type = OperationType.fromNumber(value);
			expect(type).toBe(expectedType);
		});

		test.each([
			[0, 'Invalid OperationType: unknown numeric value 0'],
			[3, 'Invalid OperationType: unknown numeric value 3']
		])('should throw error for invalid value %i', (value, expectedError) => {
			expect(() => OperationType.fromNumber(value)).toThrow(expectedError);
		});
	});

	describe('equals', () => {
		test.each([
			[OperationType.Plugin, OperationType.Plugin, true],
			[OperationType.Workflow, OperationType.Workflow, true],
			[OperationType.Plugin, OperationType.Workflow, false],
			[OperationType.Workflow, OperationType.Plugin, false]
		])('should return %s when comparing types', (type1, type2, expected) => {
			expect(type1.equals(type2)).toBe(expected);
		});

		it('should return false for null', () => {
			expect(OperationType.Plugin.equals(null)).toBe(false);
		});
	});
});
