import { PipelineStage } from './PipelineStage';

describe('PipelineStage Value Object', () => {
	describe('Static Instance Properties', () => {
		it('should provide PreValidation static instance with value 10', () => {
			// Act
			const stage = PipelineStage.PreValidation;

			// Assert
			expect(stage.value).toBe(10);
			expect(stage.name).toBe('PreValidation');
		});

		it('should provide PreOperation static instance with value 20', () => {
			// Act
			const stage = PipelineStage.PreOperation;

			// Assert
			expect(stage.value).toBe(20);
			expect(stage.name).toBe('PreOperation');
		});

		it('should provide PostOperation static instance with value 30', () => {
			// Act
			const stage = PipelineStage.PostOperation;

			// Assert
			expect(stage.value).toBe(30);
			expect(stage.name).toBe('PostOperation');
		});

		it('should provide PostOperationDeprecated static instance with value 40', () => {
			// Act
			const stage = PipelineStage.PostOperationDeprecated;

			// Assert
			expect(stage.value).toBe(40);
			expect(stage.name).toBe('PostOperationDeprecated');
		});
	});

	describe('fromNumber Factory Method', () => {
		it('should create PreValidation stage from number 10', () => {
			// Act
			const stage = PipelineStage.fromNumber(10);

			// Assert
			expect(stage).toBe(PipelineStage.PreValidation);
			expect(stage.value).toBe(10);
			expect(stage.name).toBe('PreValidation');
		});

		it('should create PreOperation stage from number 20', () => {
			// Act
			const stage = PipelineStage.fromNumber(20);

			// Assert
			expect(stage).toBe(PipelineStage.PreOperation);
			expect(stage.value).toBe(20);
			expect(stage.name).toBe('PreOperation');
		});

		it('should create PostOperation stage from number 30', () => {
			// Act
			const stage = PipelineStage.fromNumber(30);

			// Assert
			expect(stage).toBe(PipelineStage.PostOperation);
			expect(stage.value).toBe(30);
			expect(stage.name).toBe('PostOperation');
		});

		it('should create PostOperationDeprecated stage from number 40', () => {
			// Act
			const stage = PipelineStage.fromNumber(40);

			// Assert
			expect(stage).toBe(PipelineStage.PostOperationDeprecated);
			expect(stage.value).toBe(40);
			expect(stage.name).toBe('PostOperationDeprecated');
		});

		it('should throw error for invalid negative pipeline stage number', () => {
			// Act & Assert
			expect(() => PipelineStage.fromNumber(-1)).toThrow(
				new Error('Invalid pipeline stage: -1')
			);
		});

		it('should throw error for invalid zero pipeline stage number', () => {
			// Act & Assert
			expect(() => PipelineStage.fromNumber(0)).toThrow(
				new Error('Invalid pipeline stage: 0')
			);
		});

		it('should throw error for invalid positive pipeline stage number', () => {
			// Act & Assert
			expect(() => PipelineStage.fromNumber(50)).toThrow(
				new Error('Invalid pipeline stage: 50')
			);
		});

		it('should throw error for invalid pipeline stage number 15', () => {
			// Act & Assert
			expect(() => PipelineStage.fromNumber(15)).toThrow(
				new Error('Invalid pipeline stage: 15')
			);
		});

		it('should throw error for invalid pipeline stage number 25', () => {
			// Act & Assert
			expect(() => PipelineStage.fromNumber(25)).toThrow(
				new Error('Invalid pipeline stage: 25')
			);
		});

		it('should throw error for very large pipeline stage number', () => {
			// Act & Assert
			expect(() => PipelineStage.fromNumber(999999)).toThrow(
				new Error('Invalid pipeline stage: 999999')
			);
		});
	});

	describe('equals Method', () => {
		it('should return true when comparing stage with itself', () => {
			// Arrange
			const stage = PipelineStage.PreValidation;

			// Act
			const result = stage.equals(stage);

			// Assert
			expect(result).toBe(true);
		});

		it('should return true when comparing two instances of same stage', () => {
			// Arrange
			const stage1 = PipelineStage.fromNumber(10);
			const stage2 = PipelineStage.PreValidation;

			// Act
			const result = stage1.equals(stage2);

			// Assert
			expect(result).toBe(true);
		});

		it('should return true when comparing PreValidation stages created differently', () => {
			// Arrange
			const stage1 = PipelineStage.fromNumber(10);
			const stage2 = PipelineStage.fromNumber(10);

			// Act
			const result = stage1.equals(stage2);

			// Assert
			expect(result).toBe(true);
		});

		it('should return false when comparing different pipeline stages', () => {
			// Arrange
			const preValidation = PipelineStage.PreValidation;
			const preOperation = PipelineStage.PreOperation;

			// Act
			const result = preValidation.equals(preOperation);

			// Assert
			expect(result).toBe(false);
		});

		it('should return false when comparing with null', () => {
			// Arrange
			const stage = PipelineStage.PreValidation;

			// Act
			const result = stage.equals(null);

			// Assert
			expect(result).toBe(false);
		});

		it('should return true when comparing PostOperation stages with different creation methods', () => {
			// Arrange
			const stage1 = PipelineStage.PostOperation;
			const stage2 = PipelineStage.fromNumber(30);

			// Act
			const result = stage1.equals(stage2);

			// Assert
			expect(result).toBe(true);
		});

		it('should return false when comparing PreOperation with PostOperation', () => {
			// Arrange
			const preOperation = PipelineStage.fromNumber(20);
			const postOperation = PipelineStage.fromNumber(30);

			// Act
			const result = preOperation.equals(postOperation);

			// Assert
			expect(result).toBe(false);
		});
	});

	describe('isDeprecated Method', () => {
		it('should return false for PreValidation stage', () => {
			// Act
			const result = PipelineStage.PreValidation.isDeprecated();

			// Assert
			expect(result).toBe(false);
		});

		it('should return false for PreOperation stage', () => {
			// Act
			const result = PipelineStage.PreOperation.isDeprecated();

			// Assert
			expect(result).toBe(false);
		});

		it('should return false for PostOperation stage', () => {
			// Act
			const result = PipelineStage.PostOperation.isDeprecated();

			// Assert
			expect(result).toBe(false);
		});

		it('should return true for PostOperationDeprecated stage', () => {
			// Act
			const result = PipelineStage.PostOperationDeprecated.isDeprecated();

			// Assert
			expect(result).toBe(true);
		});

		it('should return false for PreValidation created via fromNumber', () => {
			// Arrange
			const stage = PipelineStage.fromNumber(10);

			// Act
			const result = stage.isDeprecated();

			// Assert
			expect(result).toBe(false);
		});

		it('should return true for PostOperationDeprecated created via fromNumber', () => {
			// Arrange
			const stage = PipelineStage.fromNumber(40);

			// Act
			const result = stage.isDeprecated();

			// Assert
			expect(result).toBe(true);
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
