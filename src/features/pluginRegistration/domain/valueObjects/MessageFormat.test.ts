import { MessageFormat } from './MessageFormat';

describe('MessageFormat', () => {
	describe('static instances', () => {
		it('should have DotNet with value 1', () => {
			expect(MessageFormat.DotNet.getValue()).toBe(1);
			expect(MessageFormat.DotNet.getName()).toBe('.NET Binary');
		});

		it('should have Json with value 2', () => {
			expect(MessageFormat.Json.getValue()).toBe(2);
			expect(MessageFormat.Json.getName()).toBe('JSON');
		});

		it('should have Xml with value 3', () => {
			expect(MessageFormat.Xml.getValue()).toBe(3);
			expect(MessageFormat.Xml.getName()).toBe('XML');
		});
	});

	describe('fromValue', () => {
		it('should return DotNet for value 1', () => {
			expect(MessageFormat.fromValue(1)).toBe(MessageFormat.DotNet);
		});

		it('should return Json for value 2', () => {
			expect(MessageFormat.fromValue(2)).toBe(MessageFormat.Json);
		});

		it('should return Xml for value 3', () => {
			expect(MessageFormat.fromValue(3)).toBe(MessageFormat.Xml);
		});

		it('should throw for invalid value', () => {
			expect(() => MessageFormat.fromValue(0)).toThrow('Invalid MessageFormat value: 0');
		});

		it('should throw for value 4', () => {
			expect(() => MessageFormat.fromValue(4)).toThrow('Invalid MessageFormat value: 4');
		});
	});

	describe('all', () => {
		it('should return all message formats', () => {
			const all = MessageFormat.all();
			expect(all).toHaveLength(3);
			expect(all).toContain(MessageFormat.DotNet);
			expect(all).toContain(MessageFormat.Json);
			expect(all).toContain(MessageFormat.Xml);
		});
	});

	describe('equals', () => {
		it('should return true for same instance', () => {
			expect(MessageFormat.Json.equals(MessageFormat.Json)).toBe(true);
		});

		it('should return true for instances with same value', () => {
			const format1 = MessageFormat.fromValue(2);
			const format2 = MessageFormat.fromValue(2);
			expect(format1.equals(format2)).toBe(true);
		});

		it('should return false for different formats', () => {
			expect(MessageFormat.Json.equals(MessageFormat.Xml)).toBe(false);
		});
	});
});
