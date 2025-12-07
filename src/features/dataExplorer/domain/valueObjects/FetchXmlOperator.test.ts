import {
	isValidOperator,
	getOperatorMetadata,
	operatorRequiresValue,
	operatorAllowsMultipleValues,
	getOperatorsByCategory,
	getAllOperators,
	FETCHXML_OPERATOR_METADATA,
} from './FetchXmlOperator';

describe('FetchXmlOperator', () => {
	describe('isValidOperator', () => {
		it('should return true for comparison operators', () => {
			expect(isValidOperator('eq')).toBe(true);
			expect(isValidOperator('ne')).toBe(true);
			expect(isValidOperator('lt')).toBe(true);
			expect(isValidOperator('le')).toBe(true);
			expect(isValidOperator('gt')).toBe(true);
			expect(isValidOperator('ge')).toBe(true);
		});

		it('should return true for string operators', () => {
			expect(isValidOperator('like')).toBe(true);
			expect(isValidOperator('not-like')).toBe(true);
			expect(isValidOperator('begins-with')).toBe(true);
			expect(isValidOperator('not-begin-with')).toBe(true);
			expect(isValidOperator('ends-with')).toBe(true);
			expect(isValidOperator('not-end-with')).toBe(true);
		});

		it('should return true for null operators', () => {
			expect(isValidOperator('null')).toBe(true);
			expect(isValidOperator('not-null')).toBe(true);
		});

		it('should return true for set operators', () => {
			expect(isValidOperator('in')).toBe(true);
			expect(isValidOperator('not-in')).toBe(true);
		});

		it('should return false for invalid operators', () => {
			expect(isValidOperator('invalid')).toBe(false);
			expect(isValidOperator('')).toBe(false);
			expect(isValidOperator('EQ')).toBe(false); // Case-sensitive
		});
	});

	describe('getOperatorMetadata', () => {
		it('should return metadata for eq operator', () => {
			const metadata = getOperatorMetadata('eq');
			expect(metadata.operator).toBe('eq');
			expect(metadata.displayName).toBe('Equals');
			expect(metadata.category).toBe('comparison');
			expect(metadata.requiresValue).toBe(true);
			expect(metadata.allowsMultipleValues).toBe(false);
		});

		it('should return metadata for null operator', () => {
			const metadata = getOperatorMetadata('null');
			expect(metadata.operator).toBe('null');
			expect(metadata.displayName).toBe('Is Null');
			expect(metadata.category).toBe('null');
			expect(metadata.requiresValue).toBe(false);
			expect(metadata.allowsMultipleValues).toBe(false);
		});

		it('should return metadata for in operator', () => {
			const metadata = getOperatorMetadata('in');
			expect(metadata.operator).toBe('in');
			expect(metadata.displayName).toBe('In');
			expect(metadata.category).toBe('set');
			expect(metadata.requiresValue).toBe(true);
			expect(metadata.allowsMultipleValues).toBe(true);
		});

		it('should return metadata for like operator', () => {
			const metadata = getOperatorMetadata('like');
			expect(metadata.operator).toBe('like');
			expect(metadata.displayName).toBe('Contains');
			expect(metadata.category).toBe('string');
			expect(metadata.requiresValue).toBe(true);
			expect(metadata.allowsMultipleValues).toBe(false);
		});
	});

	describe('operatorRequiresValue', () => {
		it('should return true for comparison operators', () => {
			expect(operatorRequiresValue('eq')).toBe(true);
			expect(operatorRequiresValue('ne')).toBe(true);
		});

		it('should return false for null operators', () => {
			expect(operatorRequiresValue('null')).toBe(false);
			expect(operatorRequiresValue('not-null')).toBe(false);
		});

		it('should return true for set operators', () => {
			expect(operatorRequiresValue('in')).toBe(true);
			expect(operatorRequiresValue('not-in')).toBe(true);
		});
	});

	describe('operatorAllowsMultipleValues', () => {
		it('should return true only for set operators', () => {
			expect(operatorAllowsMultipleValues('in')).toBe(true);
			expect(operatorAllowsMultipleValues('not-in')).toBe(true);
		});

		it('should return false for other operators', () => {
			expect(operatorAllowsMultipleValues('eq')).toBe(false);
			expect(operatorAllowsMultipleValues('like')).toBe(false);
			expect(operatorAllowsMultipleValues('null')).toBe(false);
		});
	});

	describe('getOperatorsByCategory', () => {
		it('should return comparison operators', () => {
			const ops = getOperatorsByCategory('comparison');
			expect(ops).toContain('eq');
			expect(ops).toContain('ne');
			expect(ops).toContain('lt');
			expect(ops).toContain('le');
			expect(ops).toContain('gt');
			expect(ops).toContain('ge');
			expect(ops).toHaveLength(6);
		});

		it('should return null operators', () => {
			const ops = getOperatorsByCategory('null');
			expect(ops).toContain('null');
			expect(ops).toContain('not-null');
			expect(ops).toHaveLength(2);
		});

		it('should return set operators', () => {
			const ops = getOperatorsByCategory('set');
			expect(ops).toContain('in');
			expect(ops).toContain('not-in');
			expect(ops).toHaveLength(2);
		});
	});

	describe('getAllOperators', () => {
		it('should return all operators', () => {
			const ops = getAllOperators();
			expect(ops.length).toBeGreaterThan(10);
			expect(ops).toContain('eq');
			expect(ops).toContain('like');
			expect(ops).toContain('null');
			expect(ops).toContain('in');
		});
	});

	describe('FETCHXML_OPERATOR_METADATA', () => {
		it('should contain all operators', () => {
			const ops = getAllOperators();
			for (const op of ops) {
				expect(FETCHXML_OPERATOR_METADATA.has(op)).toBe(true);
			}
		});
	});
});
