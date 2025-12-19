import { WebHookAuthType } from './WebHookAuthType';

describe('WebHookAuthType', () => {
	describe('static instances - Service Bus types', () => {
		it('should have ACS with value 1 (Service Bus)', () => {
			expect(WebHookAuthType.ACS.getValue()).toBe(1);
			expect(WebHookAuthType.ACS.getName()).toBe('ACS');
			expect(WebHookAuthType.ACS.isForServiceBus()).toBe(true);
		});

		it('should have SASKey with value 2 (Service Bus)', () => {
			expect(WebHookAuthType.SASKey.getValue()).toBe(2);
			expect(WebHookAuthType.SASKey.getName()).toBe('SASKey');
			expect(WebHookAuthType.SASKey.isForServiceBus()).toBe(true);
		});

		it('should have SASToken with value 3 (Service Bus)', () => {
			expect(WebHookAuthType.SASToken.getValue()).toBe(3);
			expect(WebHookAuthType.SASToken.getName()).toBe('SASToken');
			expect(WebHookAuthType.SASToken.isForServiceBus()).toBe(true);
		});
	});

	describe('static instances - WebHook types', () => {
		it('should have WebhookKey with value 4', () => {
			expect(WebHookAuthType.WebhookKey.getValue()).toBe(4);
			expect(WebHookAuthType.WebhookKey.getName()).toBe('WebhookKey');
			expect(WebHookAuthType.WebhookKey.isForServiceBus()).toBe(false);
		});

		it('should have HttpHeader with value 5', () => {
			expect(WebHookAuthType.HttpHeader.getValue()).toBe(5);
			expect(WebHookAuthType.HttpHeader.getName()).toBe('HttpHeader');
			expect(WebHookAuthType.HttpHeader.isForServiceBus()).toBe(false);
		});

		it('should have HttpQueryString with value 6', () => {
			expect(WebHookAuthType.HttpQueryString.getValue()).toBe(6);
			expect(WebHookAuthType.HttpQueryString.getName()).toBe('HttpQueryString');
			expect(WebHookAuthType.HttpQueryString.isForServiceBus()).toBe(false);
		});
	});

	describe('fromValue', () => {
		it('should return ACS for value 1', () => {
			expect(WebHookAuthType.fromValue(1)).toBe(WebHookAuthType.ACS);
		});

		it('should return SASKey for value 2', () => {
			expect(WebHookAuthType.fromValue(2)).toBe(WebHookAuthType.SASKey);
		});

		it('should return SASToken for value 3', () => {
			expect(WebHookAuthType.fromValue(3)).toBe(WebHookAuthType.SASToken);
		});

		it('should return WebhookKey for value 4', () => {
			expect(WebHookAuthType.fromValue(4)).toBe(WebHookAuthType.WebhookKey);
		});

		it('should return HttpHeader for value 5', () => {
			expect(WebHookAuthType.fromValue(5)).toBe(WebHookAuthType.HttpHeader);
		});

		it('should return HttpQueryString for value 6', () => {
			expect(WebHookAuthType.fromValue(6)).toBe(WebHookAuthType.HttpQueryString);
		});

		it('should throw error for invalid value 0', () => {
			expect(() => WebHookAuthType.fromValue(0)).toThrow('Invalid WebHookAuthType value: 0');
		});

		it('should throw error for invalid value 7', () => {
			expect(() => WebHookAuthType.fromValue(7)).toThrow('Invalid WebHookAuthType value: 7');
		});

		it('should throw error for negative value', () => {
			expect(() => WebHookAuthType.fromValue(-1)).toThrow('Invalid WebHookAuthType value: -1');
		});
	});

	describe('allForWebHook', () => {
		it('should return only WebHook auth types (not Service Bus)', () => {
			const webhookTypes = WebHookAuthType.allForWebHook();
			expect(webhookTypes).toHaveLength(3);
			expect(webhookTypes).toContain(WebHookAuthType.WebhookKey);
			expect(webhookTypes).toContain(WebHookAuthType.HttpHeader);
			expect(webhookTypes).toContain(WebHookAuthType.HttpQueryString);
		});

		it('should not include Service Bus types', () => {
			const webhookTypes = WebHookAuthType.allForWebHook();
			expect(webhookTypes).not.toContain(WebHookAuthType.ACS);
			expect(webhookTypes).not.toContain(WebHookAuthType.SASKey);
			expect(webhookTypes).not.toContain(WebHookAuthType.SASToken);
		});
	});

	describe('all', () => {
		it('should return all six auth types', () => {
			const allTypes = WebHookAuthType.all();
			expect(allTypes).toHaveLength(6);
			expect(allTypes).toContain(WebHookAuthType.ACS);
			expect(allTypes).toContain(WebHookAuthType.SASKey);
			expect(allTypes).toContain(WebHookAuthType.SASToken);
			expect(allTypes).toContain(WebHookAuthType.WebhookKey);
			expect(allTypes).toContain(WebHookAuthType.HttpHeader);
			expect(allTypes).toContain(WebHookAuthType.HttpQueryString);
		});
	});

	describe('requiresAuthValue', () => {
		it('should return false for Service Bus types (auth handled differently)', () => {
			expect(WebHookAuthType.ACS.requiresAuthValue()).toBe(false);
			expect(WebHookAuthType.SASKey.requiresAuthValue()).toBe(false);
			expect(WebHookAuthType.SASToken.requiresAuthValue()).toBe(false);
		});

		it('should return true for WebHook types', () => {
			expect(WebHookAuthType.WebhookKey.requiresAuthValue()).toBe(true);
			expect(WebHookAuthType.HttpHeader.requiresAuthValue()).toBe(true);
			expect(WebHookAuthType.HttpQueryString.requiresAuthValue()).toBe(true);
		});
	});

	describe('isForServiceBus', () => {
		it('should return true for Service Bus types', () => {
			expect(WebHookAuthType.ACS.isForServiceBus()).toBe(true);
			expect(WebHookAuthType.SASKey.isForServiceBus()).toBe(true);
			expect(WebHookAuthType.SASToken.isForServiceBus()).toBe(true);
		});

		it('should return false for WebHook types', () => {
			expect(WebHookAuthType.WebhookKey.isForServiceBus()).toBe(false);
			expect(WebHookAuthType.HttpHeader.isForServiceBus()).toBe(false);
			expect(WebHookAuthType.HttpQueryString.isForServiceBus()).toBe(false);
		});
	});

	describe('equals', () => {
		it('should return true for same instance', () => {
			expect(WebHookAuthType.HttpHeader.equals(WebHookAuthType.HttpHeader)).toBe(true);
		});

		it('should return true for instances with same value', () => {
			const type1 = WebHookAuthType.fromValue(5);
			const type2 = WebHookAuthType.fromValue(5);
			expect(type1.equals(type2)).toBe(true);
		});

		it('should return false for different types', () => {
			expect(WebHookAuthType.WebhookKey.equals(WebHookAuthType.HttpHeader)).toBe(false);
		});
	});
});
