import { WebHook } from './WebHook';
import { WebHookAuthType } from '../valueObjects/WebHookAuthType';

describe('WebHook', () => {
	const createWebHook = (overrides: Partial<{
		id: string;
		name: string;
		url: string;
		authType: WebHookAuthType;
		description: string | null;
		createdOn: Date;
		modifiedOn: Date;
		isManaged: boolean;
	}> = {}): WebHook => {
		const defaults = {
			id: 'webhook-123',
			name: 'Test WebHook',
			url: 'https://example.com/webhook',
			authType: WebHookAuthType.HttpHeader,
			description: null,
			createdOn: new Date('2024-01-01'),
			modifiedOn: new Date('2024-01-02'),
			isManaged: false,
		};
		const props = { ...defaults, ...overrides };
		return new WebHook(
			props.id,
			props.name,
			props.url,
			props.authType,
			props.description,
			props.createdOn,
			props.modifiedOn,
			props.isManaged
		);
	};

	describe('canUpdate', () => {
		it('should return true for unmanaged webhook', () => {
			const webhook = createWebHook({ isManaged: false });
			expect(webhook.canUpdate()).toBe(true);
		});

		it('should return true for managed webhook', () => {
			// WebHooks can always be updated regardless of managed state
			const webhook = createWebHook({ isManaged: true });
			expect(webhook.canUpdate()).toBe(true);
		});
	});

	describe('canDelete', () => {
		it('should return true for unmanaged webhook', () => {
			const webhook = createWebHook({ isManaged: false });
			expect(webhook.canDelete()).toBe(true);
		});

		it('should return false for managed webhook', () => {
			const webhook = createWebHook({ isManaged: true });
			expect(webhook.canDelete()).toBe(false);
		});
	});

	describe('hasValidUrl', () => {
		it('should return true for HTTPS URL', () => {
			const webhook = createWebHook({ url: 'https://example.com/webhook' });
			expect(webhook.hasValidUrl()).toBe(true);
		});

		it('should return true for HTTPS URL with port', () => {
			const webhook = createWebHook({ url: 'https://example.com:8443/webhook' });
			expect(webhook.hasValidUrl()).toBe(true);
		});

		it('should return true for HTTPS URL with query params', () => {
			const webhook = createWebHook({ url: 'https://example.com/webhook?key=value' });
			expect(webhook.hasValidUrl()).toBe(true);
		});

		it('should return false for HTTP URL', () => {
			const webhook = createWebHook({ url: 'http://example.com/webhook' });
			expect(webhook.hasValidUrl()).toBe(false);
		});

		it('should return false for invalid URL', () => {
			const webhook = createWebHook({ url: 'not-a-valid-url' });
			expect(webhook.hasValidUrl()).toBe(false);
		});

		it('should return false for empty URL', () => {
			const webhook = createWebHook({ url: '' });
			expect(webhook.hasValidUrl()).toBe(false);
		});
	});

	describe('getters', () => {
		it('should return correct id', () => {
			const webhook = createWebHook({ id: 'test-id' });
			expect(webhook.getId()).toBe('test-id');
		});

		it('should return correct name', () => {
			const webhook = createWebHook({ name: 'My WebHook' });
			expect(webhook.getName()).toBe('My WebHook');
		});

		it('should return correct url', () => {
			const webhook = createWebHook({ url: 'https://api.example.com/hook' });
			expect(webhook.getUrl()).toBe('https://api.example.com/hook');
		});

		it('should return correct authType', () => {
			const webhook = createWebHook({ authType: WebHookAuthType.HttpHeader });
			expect(webhook.getAuthType()).toBe(WebHookAuthType.HttpHeader);
		});

		it('should return correct description when set', () => {
			const webhook = createWebHook({ description: 'Test description' });
			expect(webhook.getDescription()).toBe('Test description');
		});

		it('should return null description when not set', () => {
			const webhook = createWebHook({ description: null });
			expect(webhook.getDescription()).toBeNull();
		});

		it('should return correct createdOn', () => {
			const date = new Date('2024-03-15');
			const webhook = createWebHook({ createdOn: date });
			expect(webhook.getCreatedOn()).toBe(date);
		});

		it('should return correct modifiedOn', () => {
			const date = new Date('2024-03-20');
			const webhook = createWebHook({ modifiedOn: date });
			expect(webhook.getModifiedOn()).toBe(date);
		});

		it('should return correct isInManagedState', () => {
			const webhook = createWebHook({ isManaged: true });
			expect(webhook.isInManagedState()).toBe(true);
		});
	});
});
