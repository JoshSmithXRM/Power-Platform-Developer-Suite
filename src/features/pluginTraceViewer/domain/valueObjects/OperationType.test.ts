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

	describe('fromString', () => {
		test.each([
			['Plugin', OperationType.Plugin],
			['Workflow', OperationType.Workflow]
		])('should create correct type from string "%s"', (value, expectedType) => {
			const type = OperationType.fromString(value);
			expect(type).toBe(expectedType);
		});

		test.each([
			['plugin', 'Invalid OperationType: unknown string value "plugin"'],
			['Unknown', 'Invalid OperationType: unknown string value "Unknown"'],
			['', 'Invalid OperationType: unknown string value ""']
		])('should throw error for invalid string "%s"', (value, expectedError) => {
			expect(() => OperationType.fromString(value)).toThrow(expectedError);
		});
	});

	describe('toNumber', () => {
		it('should return 1 for Plugin', () => {
			expect(OperationType.Plugin.toNumber()).toBe(1);
		});

		it('should return 2 for Workflow', () => {
			expect(OperationType.Workflow.toNumber()).toBe(2);
		});
	});

	describe('toString', () => {
		it('should return "Plugin" for Plugin type', () => {
			expect(OperationType.Plugin.toString()).toBe('Plugin');
		});

		it('should return "Workflow" for Workflow type', () => {
			expect(OperationType.Workflow.toString()).toBe('Workflow');
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
