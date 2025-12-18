import { WebHookAuthType } from './WebHookAuthType';

describe('WebHookAuthType', () => {
	describe('static instances', () => {
		it('should have None with value 1', () => {
			expect(WebHookAuthType.None.getValue()).toBe(1);
			expect(WebHookAuthType.None.getName()).toBe('None');
		});

		it('should have HttpHeader with value 2', () => {
			expect(WebHookAuthType.HttpHeader.getValue()).toBe(2);
			expect(WebHookAuthType.HttpHeader.getName()).toBe('HttpHeader');
		});

		it('should have WebhookKey with value 3', () => {
			expect(WebHookAuthType.WebhookKey.getValue()).toBe(3);
			expect(WebHookAuthType.WebhookKey.getName()).toBe('WebhookKey');
		});

		it('should have HttpQueryString with value 4', () => {
			expect(WebHookAuthType.HttpQueryString.getValue()).toBe(4);
			expect(WebHookAuthType.HttpQueryString.getName()).toBe('HttpQueryString');
		});

		it('should have AADSASKey with value 5', () => {
			expect(WebHookAuthType.AADSASKey.getValue()).toBe(5);
			expect(WebHookAuthType.AADSASKey.getName()).toBe('AADSASKey');
		});
	});

	describe('fromValue', () => {
		it('should return None for value 1', () => {
			expect(WebHookAuthType.fromValue(1)).toBe(WebHookAuthType.None);
		});

		it('should return HttpHeader for value 2', () => {
			expect(WebHookAuthType.fromValue(2)).toBe(WebHookAuthType.HttpHeader);
		});

		it('should return WebhookKey for value 3', () => {
			expect(WebHookAuthType.fromValue(3)).toBe(WebHookAuthType.WebhookKey);
		});

		it('should return HttpQueryString for value 4', () => {
			expect(WebHookAuthType.fromValue(4)).toBe(WebHookAuthType.HttpQueryString);
		});

		it('should return AADSASKey for value 5', () => {
			expect(WebHookAuthType.fromValue(5)).toBe(WebHookAuthType.AADSASKey);
		});

		it('should throw error for invalid value 0', () => {
			expect(() => WebHookAuthType.fromValue(0)).toThrow('Invalid WebHookAuthType value: 0');
		});

		it('should throw error for invalid value 6', () => {
			expect(() => WebHookAuthType.fromValue(6)).toThrow('Invalid WebHookAuthType value: 6');
		});

		it('should throw error for negative value', () => {
			expect(() => WebHookAuthType.fromValue(-1)).toThrow('Invalid WebHookAuthType value: -1');
		});
	});

	describe('all', () => {
		it('should return all five auth types', () => {
			const allTypes = WebHookAuthType.all();
			expect(allTypes).toHaveLength(5);
			expect(allTypes).toContain(WebHookAuthType.None);
			expect(allTypes).toContain(WebHookAuthType.HttpHeader);
			expect(allTypes).toContain(WebHookAuthType.WebhookKey);
			expect(allTypes).toContain(WebHookAuthType.HttpQueryString);
			expect(allTypes).toContain(WebHookAuthType.AADSASKey);
		});
	});

	describe('requiresAuthValue', () => {
		it('should return false for None', () => {
			expect(WebHookAuthType.None.requiresAuthValue()).toBe(false);
		});

		it('should return true for HttpHeader', () => {
			expect(WebHookAuthType.HttpHeader.requiresAuthValue()).toBe(true);
		});

		it('should return true for WebhookKey', () => {
			expect(WebHookAuthType.WebhookKey.requiresAuthValue()).toBe(true);
		});

		it('should return true for HttpQueryString', () => {
			expect(WebHookAuthType.HttpQueryString.requiresAuthValue()).toBe(true);
		});

		it('should return true for AADSASKey', () => {
			expect(WebHookAuthType.AADSASKey.requiresAuthValue()).toBe(true);
		});
	});

	describe('isNone', () => {
		it('should return true for None', () => {
			expect(WebHookAuthType.None.isNone()).toBe(true);
		});

		it('should return false for HttpHeader', () => {
			expect(WebHookAuthType.HttpHeader.isNone()).toBe(false);
		});

		it('should return false for WebhookKey', () => {
			expect(WebHookAuthType.WebhookKey.isNone()).toBe(false);
		});

		it('should return false for HttpQueryString', () => {
			expect(WebHookAuthType.HttpQueryString.isNone()).toBe(false);
		});

		it('should return false for AADSASKey', () => {
			expect(WebHookAuthType.AADSASKey.isNone()).toBe(false);
		});
	});

	describe('equals', () => {
		it('should return true for same instance', () => {
			expect(WebHookAuthType.None.equals(WebHookAuthType.None)).toBe(true);
		});

		it('should return true for instances with same value', () => {
			const type1 = WebHookAuthType.fromValue(2);
			const type2 = WebHookAuthType.fromValue(2);
			expect(type1.equals(type2)).toBe(true);
		});

		it('should return false for different types', () => {
			expect(WebHookAuthType.None.equals(WebHookAuthType.HttpHeader)).toBe(false);
		});
	});
});
