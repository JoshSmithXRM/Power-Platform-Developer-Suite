import { StepStatus } from './StepStatus';

describe('StepStatus', () => {
	describe('static instances', () => {
		it('should have Enabled with value 0', () => {
			expect(StepStatus.Enabled.getValue()).toBe(0);
			expect(StepStatus.Enabled.getName()).toBe('Enabled');
		});

		it('should have Disabled with value 1', () => {
			expect(StepStatus.Disabled.getValue()).toBe(1);
			expect(StepStatus.Disabled.getName()).toBe('Disabled');
		});
	});

	describe('fromValue', () => {
		it('should return Enabled for value 0', () => {
			expect(StepStatus.fromValue(0)).toBe(StepStatus.Enabled);
		});

		it('should return Disabled for value 1', () => {
			expect(StepStatus.fromValue(1)).toBe(StepStatus.Disabled);
		});

		it('should throw error for invalid value', () => {
			expect(() => StepStatus.fromValue(2)).toThrow('Invalid StepStatus value: 2');
		});

		it('should throw error for negative value', () => {
			expect(() => StepStatus.fromValue(-1)).toThrow('Invalid StepStatus value: -1');
		});
	});

	describe('isEnabled', () => {
		it('should return true for Enabled status', () => {
			expect(StepStatus.Enabled.isEnabled()).toBe(true);
		});

		it('should return false for Disabled status', () => {
			expect(StepStatus.Disabled.isEnabled()).toBe(false);
		});
	});

	describe('equals', () => {
		it('should return true for same instance', () => {
			expect(StepStatus.Enabled.equals(StepStatus.Enabled)).toBe(true);
		});

		it('should return true for instances with same value', () => {
			const status1 = StepStatus.fromValue(0);
			const status2 = StepStatus.fromValue(0);
			expect(status1.equals(status2)).toBe(true);
		});

		it('should return false for different statuses', () => {
			expect(StepStatus.Enabled.equals(StepStatus.Disabled)).toBe(false);
		});
	});
});
