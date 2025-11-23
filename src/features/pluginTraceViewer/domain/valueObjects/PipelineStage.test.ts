import { PipelineStage } from './PipelineStage';

describe('PipelineStage Value Object', () => {
	describe('Static Instance Properties', () => {
		test.each([
			[PipelineStage.PreValidation, 10, 'PreValidation'],
			[PipelineStage.PreOperation, 20, 'PreOperation'],
			[PipelineStage.PostOperation, 30, 'PostOperation'],
			[PipelineStage.PostOperationDeprecated, 40, 'PostOperationDeprecated']
		])('should provide static instance with value %i and name %s', (stage, expectedValue, expectedName) => {
			expect(stage.value).toBe(expectedValue);
			expect(stage.name).toBe(expectedName);
		});
	});

	describe('fromNumber Factory Method', () => {
		test.each([
			[10, PipelineStage.PreValidation, 'PreValidation'],
			[20, PipelineStage.PreOperation, 'PreOperation'],
			[30, PipelineStage.PostOperation, 'PostOperation'],
			[40, PipelineStage.PostOperationDeprecated, 'PostOperationDeprecated']
		])('should create %s stage from number %i', (value, expectedStage, expectedName) => {
			const stage = PipelineStage.fromNumber(value);
			expect(stage).toBe(expectedStage);
			expect(stage.value).toBe(value);
			expect(stage.name).toBe(expectedName);
		});

		test.each([
			[-1, 'Invalid pipeline stage: -1'],
			[0, 'Invalid pipeline stage: 0'],
			[15, 'Invalid pipeline stage: 15'],
			[25, 'Invalid pipeline stage: 25'],
			[50, 'Invalid pipeline stage: 50'],
			[999999, 'Invalid pipeline stage: 999999']
		])('should throw error for invalid pipeline stage number %i', (value, expectedError) => {
			expect(() => PipelineStage.fromNumber(value)).toThrow(new Error(expectedError));
		});
	});

	describe('equals Method', () => {
		it('should return true when comparing stage with itself', () => {
			const stage = PipelineStage.PreValidation;
			expect(stage.equals(stage)).toBe(true);
		});

		test.each([
			[PipelineStage.fromNumber(10), PipelineStage.PreValidation, true],
			[PipelineStage.fromNumber(10), PipelineStage.fromNumber(10), true],
			[PipelineStage.PreValidation, PipelineStage.PreOperation, false],
			[PipelineStage.PostOperation, PipelineStage.fromNumber(30), true],
			[PipelineStage.fromNumber(20), PipelineStage.fromNumber(30), false]
		])('should return correct equality result when comparing stages', (stage1, stage2, expected) => {
			expect(stage1.equals(stage2)).toBe(expected);
		});

		it('should return false when comparing with null', () => {
			const stage = PipelineStage.PreValidation;
			expect(stage.equals(null)).toBe(false);
		});
	});

	describe('isDeprecated Method', () => {
		test.each([
			[PipelineStage.PreValidation, false],
			[PipelineStage.PreOperation, false],
			[PipelineStage.PostOperation, false],
			[PipelineStage.PostOperationDeprecated, true],
			[PipelineStage.fromNumber(10), false],
			[PipelineStage.fromNumber(40), true]
		])('should return %s for stage deprecation status', (stage, expected) => {
			expect(stage.isDeprecated()).toBe(expected);
		});
	});

	describe('Value Object Properties', () => {
		it('should have both value and name properties defined', () => {
			// Arrange
			const stage = PipelineStage.PreValidation;

			// Act & Assert
			expect(stage.value).toBeDefined();
			expect(stage.name).toBeDefined();
			expect(typeof stage.value).toBe('number');
			expect(typeof stage.name).toBe('string');
		});

		it('should have consistent value and name across all stages', () => {
			// Arrange
			const allStages: Array<{ stage: PipelineStage; expectedValue: number; expectedName: string }> = [
				{ stage: PipelineStage.PreValidation, expectedValue: 10, expectedName: 'PreValidation' },
				{ stage: PipelineStage.PreOperation, expectedValue: 20, expectedName: 'PreOperation' },
				{ stage: PipelineStage.PostOperation, expectedValue: 30, expectedName: 'PostOperation' },
				{ stage: PipelineStage.PostOperationDeprecated, expectedValue: 40, expectedName: 'PostOperationDeprecated' }
			];

			// Act & Assert
			allStages.forEach(({ stage, expectedValue, expectedName }) => {
				expect(stage.value).toBe(expectedValue);
				expect(stage.name).toBe(expectedName);
			});
		});
	});

	describe('Edge Cases', () => {
		it('should handle multiple calls to fromNumber with same value consistently', () => {
			// Act
			const stage1 = PipelineStage.fromNumber(20);
			const stage2 = PipelineStage.fromNumber(20);

			// Assert
			expect(stage1).toBe(stage2);
		});

		it('should return same reference for all static instances', () => {
			// Act
			const instance1 = PipelineStage.PreValidation;
			const instance2 = PipelineStage.PreValidation;

			// Assert
			expect(instance1).toBe(instance2);
		});

		it('should correctly identify deprecated status across all stages', () => {
			// Arrange
			const stages: PipelineStage[] = [
				PipelineStage.PreValidation,
				PipelineStage.PreOperation,
				PipelineStage.PostOperation,
				PipelineStage.PostOperationDeprecated
			];

			// Act & Assert
			expect(stages[0]!.isDeprecated()).toBe(false);
			expect(stages[1]!.isDeprecated()).toBe(false);
			expect(stages[2]!.isDeprecated()).toBe(false);
			expect(stages[3]!.isDeprecated()).toBe(true);
		});

		it('should have correct stage progression with numeric values', () => {
			// Arrange
			const stages: PipelineStage[] = [
				PipelineStage.PreValidation,
				PipelineStage.PreOperation,
				PipelineStage.PostOperation,
				PipelineStage.PostOperationDeprecated
			];

			// Act & Assert
			expect(stages[0]!.value).toBeLessThan(stages[1]!.value);
			expect(stages[1]!.value).toBeLessThan(stages[2]!.value);
			expect(stages[2]!.value).toBeLessThan(stages[3]!.value);
		});
	});
});
