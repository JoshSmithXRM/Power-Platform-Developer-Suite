import { attributes, classNames, escapeHtml } from './htmlHelpers';

describe('htmlHelpers', () => {
	describe('escapeHtml', () => {
		it('should escape HTML special characters', () => {
			expect(escapeHtml('<script>alert("xss")</script>')).toBe(
				'&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
			);
		});

		it('should escape ampersands', () => {
			expect(escapeHtml('A & B')).toBe('A &amp; B');
		});

		it('should escape double quotes', () => {
			expect(escapeHtml('"quoted"')).toBe('&quot;quoted&quot;');
		});

		it('should escape single quotes', () => {
			expect(escapeHtml("'quoted'")).toBe('&#039;quoted&#039;');
		});

		it('should handle empty string', () => {
			expect(escapeHtml('')).toBe('');
		});

		it('should handle undefined', () => {
			expect(escapeHtml(undefined)).toBe('');
		});

		it('should handle null', () => {
			expect(escapeHtml(null)).toBe('');
		});

		it('should convert numbers to strings', () => {
			expect(escapeHtml('123' as string)).toBe('123');
		});
	});

	describe('classNames', () => {
		it('should return active classes only', () => {
			expect(classNames({ active: true, disabled: false })).toBe('active');
		});

		it('should return multiple active classes', () => {
			const result = classNames({ active: true, selected: true, disabled: false });
			expect(result).toContain('active');
			expect(result).toContain('selected');
			expect(result).not.toContain('disabled');
		});

		it('should return empty string when no classes active', () => {
			expect(classNames({ active: false, disabled: false })).toBe('');
		});

		it('should handle empty object', () => {
			expect(classNames({})).toBe('');
		});
	});

	describe('attributes', () => {
		it('should generate attribute string', () => {
			expect(attributes({ id: '123', 'data-value': 'test' })).toBe('id="123" data-value="test"');
		});

		it('should handle boolean attributes', () => {
			expect(attributes({ disabled: true, hidden: false })).toBe('disabled');
		});

		it('should handle number values', () => {
			expect(attributes({ 'data-count': 42 })).toBe('data-count="42"');
		});

		it('should filter undefined values', () => {
			expect(attributes({ id: '123', title: undefined })).toBe('id="123"');
		});

		it('should escape attribute values', () => {
			expect(attributes({ title: '<script>' })).toContain('&lt;script&gt;');
		});

		it('should handle empty object', () => {
			expect(attributes({})).toBe('');
		});
	});
});
