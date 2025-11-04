import { CorrelationId } from './CorrelationId';

describe('CorrelationId', () => {
	describe('create', () => {
		it('should create correlation ID from valid string', () => {
			const id = CorrelationId.create('abc-123');
			expect(id.value).toBe('abc-123');
		});

		it('should preserve whitespace in value', () => {
			const id = CorrelationId.create('  abc-123  ');
			expect(id.value).toBe('  abc-123  ');
		});

		it('should throw error for empty string', () => {
			expect(() => CorrelationId.create('')).toThrow('Cannot be empty');
		});

		it('should throw error for whitespace-only string', () => {
			expect(() => CorrelationId.create('   ')).toThrow('Cannot be empty');
		});
	});

	describe('equals', () => {
		it('should return true for same correlation ID', () => {
			const id1 = CorrelationId.create('abc-123');
			const id2 = CorrelationId.create('abc-123');
			expect(id1.equals(id2)).toBe(true);
		});

		it('should return false for different correlation IDs', () => {
			const id1 = CorrelationId.create('abc-123');
			const id2 = CorrelationId.create('xyz-789');
			expect(id1.equals(id2)).toBe(false);
		});

		it('should return false for null', () => {
			const id = CorrelationId.create('abc-123');
			expect(id.equals(null)).toBe(false);
		});

		it('should be case-sensitive when comparing', () => {
			const id1 = CorrelationId.create('abc-123');
			const id2 = CorrelationId.create('ABC-123');
			expect(id1.equals(id2)).toBe(false);
		});
	});

	describe('isEmpty', () => {
		it('should return false for non-empty correlation ID', () => {
			const id = CorrelationId.create('abc-123');
			expect(id.isEmpty()).toBe(false);
		});
	});

	describe('toString', () => {
		it('should return string value', () => {
			const id = CorrelationId.create('abc-123');
			expect(id.toString()).toBe('abc-123');
		});

		it('should return exact value including whitespace', () => {
			const id = CorrelationId.create('  abc-123  ');
			expect(id.toString()).toBe('  abc-123  ');
		});
	});
});
