import { ExecutionStage } from './ExecutionStage';

describe('ExecutionStage', () => {
	describe('static instances', () => {
		it('should have PreValidation with value 10', () => {
			expect(ExecutionStage.PreValidation.getValue()).toBe(10);
			expect(ExecutionStage.PreValidation.getName()).toBe('PreValidation');
		});

		it('should have PreOperation with value 20', () => {
			expect(ExecutionStage.PreOperation.getValue()).toBe(20);
			expect(ExecutionStage.PreOperation.getName()).toBe('PreOperation');
		});

		it('should have InternalPreOperation with value 25', () => {
			expect(ExecutionStage.InternalPreOperation.getValue()).toBe(25);
			expect(ExecutionStage.InternalPreOperation.getName()).toBe('Internal Pre-Operation');
		});

		it('should have MainOperation with value 30', () => {
			expect(ExecutionStage.MainOperation.getValue()).toBe(30);
			expect(ExecutionStage.MainOperation.getName()).toBe('MainOperation');
		});

		it('should have InternalPostOperation with value 35', () => {
			expect(ExecutionStage.InternalPostOperation.getValue()).toBe(35);
			expect(ExecutionStage.InternalPostOperation.getName()).toBe('Internal Post-Operation');
		});

		it('should have PostOperation with value 40', () => {
			expect(ExecutionStage.PostOperation.getValue()).toBe(40);
			expect(ExecutionStage.PostOperation.getName()).toBe('PostOperation');
		});

		it('should have PostOperationAsync with value 45', () => {
			expect(ExecutionStage.PostOperationAsync.getValue()).toBe(45);
			expect(ExecutionStage.PostOperationAsync.getName()).toBe('PostOperation (Async)');
		});

		it('should have PostOperationDeprecated with value 50', () => {
			expect(ExecutionStage.PostOperationDeprecated.getValue()).toBe(50);
			expect(ExecutionStage.PostOperationDeprecated.getName()).toBe('PostOperation (Deprecated)');
		});

		it('should have FinalPostOperation with value 55', () => {
			expect(ExecutionStage.FinalPostOperation.getValue()).toBe(55);
			expect(ExecutionStage.FinalPostOperation.getName()).toBe('Final Post-Operation');
		});
	});

	describe('fromValue', () => {
		it('should return PreValidation for value 10', () => {
			expect(ExecutionStage.fromValue(10)).toBe(ExecutionStage.PreValidation);
		});

		it('should return PreOperation for value 20', () => {
			expect(ExecutionStage.fromValue(20)).toBe(ExecutionStage.PreOperation);
		});

		it('should return InternalPreOperation for value 25', () => {
			expect(ExecutionStage.fromValue(25)).toBe(ExecutionStage.InternalPreOperation);
		});

		it('should return MainOperation for value 30', () => {
			expect(ExecutionStage.fromValue(30)).toBe(ExecutionStage.MainOperation);
		});

		it('should return InternalPostOperation for value 35', () => {
			expect(ExecutionStage.fromValue(35)).toBe(ExecutionStage.InternalPostOperation);
		});

		it('should return PostOperation for value 40', () => {
			expect(ExecutionStage.fromValue(40)).toBe(ExecutionStage.PostOperation);
		});

		it('should return PostOperationAsync for value 45', () => {
			expect(ExecutionStage.fromValue(45)).toBe(ExecutionStage.PostOperationAsync);
		});

		it('should return PostOperationDeprecated for value 50', () => {
			expect(ExecutionStage.fromValue(50)).toBe(ExecutionStage.PostOperationDeprecated);
		});

		it('should return FinalPostOperation for value 55', () => {
			expect(ExecutionStage.fromValue(55)).toBe(ExecutionStage.FinalPostOperation);
		});

		it('should return Unknown stage for unrecognized value', () => {
			const unknown = ExecutionStage.fromValue(999);
			expect(unknown.getValue()).toBe(999);
			expect(unknown.getName()).toBe('Unknown (999)');
		});

		it('should return Unknown stage for negative value', () => {
			const unknown = ExecutionStage.fromValue(-1);
			expect(unknown.getValue()).toBe(-1);
			expect(unknown.getName()).toBe('Unknown (-1)');
		});
	});

	describe('equals', () => {
		it('should return true for same instance', () => {
			expect(ExecutionStage.PostOperation.equals(ExecutionStage.PostOperation)).toBe(true);
		});

		it('should return true for instances with same value', () => {
			const stage1 = ExecutionStage.fromValue(40);
			const stage2 = ExecutionStage.fromValue(40);
			expect(stage1.equals(stage2)).toBe(true);
		});

		it('should return false for different stages', () => {
			expect(ExecutionStage.PreOperation.equals(ExecutionStage.PostOperation)).toBe(false);
		});
	});
});
