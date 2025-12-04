import type * as vscode from 'vscode';

import { HtmlScaffoldingBehavior, type HtmlScaffoldingConfig } from './HtmlScaffoldingBehavior';
import { SectionCompositionBehavior } from './SectionCompositionBehavior';
import { PanelLayout } from '../types/PanelLayout';
import type { ISafePanel } from '../panels/ISafePanel';

// Mock ISafePanel
interface MockSafePanel {
	html: string;
	cspSource: string;
	webview: vscode.Webview;
	disposed: boolean;
	abortSignal: AbortSignal;
	postMessage: jest.Mock;
	onDidReceiveMessage: jest.Mock;
}

const createMockSafePanel = (): MockSafePanel => {
	const mockWebview = {
		html: '',
		cspSource: 'https://example.com',
		asWebviewUri: jest.fn(),
		onDidReceiveMessage: jest.fn(),
		postMessage: jest.fn(),
		options: {}
	} as unknown as vscode.Webview;

	return {
		html: '',
		cspSource: 'https://example.com',
		webview: mockWebview,
		disposed: false,
		abortSignal: new AbortController().signal,
		postMessage: jest.fn().mockResolvedValue(true),
		onDidReceiveMessage: jest.fn()
	};
};

describe('HtmlScaffoldingBehavior', () => {
	describe('initialize', () => {
		it('should set webview HTML on initialize', async () => {
			const panel = createMockSafePanel();
			const composer = new SectionCompositionBehavior([], PanelLayout.SingleColumn);
			const config: HtmlScaffoldingConfig = {
				cssUris: [],
				jsUris: [],
				cspNonce: 'test-nonce',
				title: 'Test Panel'
			};

			const behavior = new HtmlScaffoldingBehavior(panel as unknown as ISafePanel, composer, config);
			await behavior.initialize();

			expect(panel.html).toContain('<!DOCTYPE html>');
			expect(panel.html).toContain('<html');
			expect(panel.html).toContain('</html>');
		});

		it('should include title in HTML', async () => {
			const panel = createMockSafePanel();
			const composer = new SectionCompositionBehavior([], PanelLayout.SingleColumn);
			const config: HtmlScaffoldingConfig = {
				cssUris: [],
				jsUris: [],
				cspNonce: 'test-nonce',
				title: 'My Test Panel'
			};

			const behavior = new HtmlScaffoldingBehavior(panel as unknown as ISafePanel, composer, config);
			await behavior.initialize();

			expect(panel.html).toContain('<title>My Test Panel</title>');
		});

		it('should include CSP with nonce', async () => {
			const panel = createMockSafePanel();
			const composer = new SectionCompositionBehavior([], PanelLayout.SingleColumn);
			const config: HtmlScaffoldingConfig = {
				cssUris: [],
				jsUris: [],
				cspNonce: 'abc123',
				title: 'Test'
			};

			const behavior = new HtmlScaffoldingBehavior(panel as unknown as ISafePanel, composer, config);
			await behavior.initialize();

			expect(panel.html).toContain('Content-Security-Policy');
			expect(panel.html).toContain("script-src 'nonce-abc123'");
		});

		it('should inject CSS URIs', async () => {
			const panel = createMockSafePanel();
			const composer = new SectionCompositionBehavior([], PanelLayout.SingleColumn);
			const config: HtmlScaffoldingConfig = {
				cssUris: [
					'https://example.com/style1.css',
					'https://example.com/style2.css'
				],
				jsUris: [],
				cspNonce: 'test',
				title: 'Test'
			};

			const behavior = new HtmlScaffoldingBehavior(panel as unknown as ISafePanel, composer, config);
			await behavior.initialize();

			expect(panel.html).toContain('<link rel="stylesheet" href="https://example.com/style1.css">');
			expect(panel.html).toContain('<link rel="stylesheet" href="https://example.com/style2.css">');
		});

		it('should inject JS URIs with nonce', async () => {
			const panel = createMockSafePanel();
			const composer = new SectionCompositionBehavior([], PanelLayout.SingleColumn);
			const config: HtmlScaffoldingConfig = {
				cssUris: [],
				jsUris: [
					'https://example.com/script1.js',
					'https://example.com/script2.js'
				],
				cspNonce: 'nonce123',
				title: 'Test'
			};

			const behavior = new HtmlScaffoldingBehavior(panel as unknown as ISafePanel, composer, config);
			await behavior.initialize();

			expect(panel.html).toContain('<script nonce="nonce123" src="https://example.com/script1.js"></script>');
			expect(panel.html).toContain('<script nonce="nonce123" src="https://example.com/script2.js"></script>');
		});

		it('should include composed section HTML', async () => {
			const panel = createMockSafePanel();
			const composer = new SectionCompositionBehavior([], PanelLayout.SingleColumn);
			const config: HtmlScaffoldingConfig = {
				cssUris: [],
				jsUris: [],
				cspNonce: 'test',
				title: 'Test'
			};

			const behavior = new HtmlScaffoldingBehavior(panel as unknown as ISafePanel, composer, config);
			await behavior.initialize();

			// Should contain panel-container from SectionCompositionBehavior
			expect(panel.html).toContain('<div class="panel-container">');
		});

		it('should escape HTML in title', async () => {
			const panel = createMockSafePanel();
			const composer = new SectionCompositionBehavior([], PanelLayout.SingleColumn);
			const config: HtmlScaffoldingConfig = {
				cssUris: [],
				jsUris: [],
				cspNonce: 'test',
				title: '<script>alert("xss")</script>'
			};

			const behavior = new HtmlScaffoldingBehavior(panel as unknown as ISafePanel, composer, config);
			await behavior.initialize();

			expect(panel.html).toContain('&lt;script&gt;');
			expect(panel.html).not.toContain('<script>alert');
		});
	});

	describe('refresh', () => {
		it('should update webview HTML on refresh', async () => {
			const panel = createMockSafePanel();
			const composer = new SectionCompositionBehavior([], PanelLayout.SingleColumn);
			const config: HtmlScaffoldingConfig = {
				cssUris: [],
				jsUris: [],
				cspNonce: 'test',
				title: 'Test'
			};

			const behavior = new HtmlScaffoldingBehavior(panel as unknown as ISafePanel, composer, config);
			await behavior.refresh({ tableData: [{ test: 'data' }] });

			expect(panel.html).toContain('<!DOCTYPE html>');
		});

		it('should pass data to composer', async () => {
			const panel = createMockSafePanel();
			const composer = new SectionCompositionBehavior([], PanelLayout.SingleColumn);
			const composeSpy = jest.spyOn(composer, 'compose');

			const config: HtmlScaffoldingConfig = {
				cssUris: [],
				jsUris: [],
				cspNonce: 'test',
				title: 'Test'
			};

			const behavior = new HtmlScaffoldingBehavior(panel as unknown as ISafePanel, composer, config);
			const data = { tableData: [{ id: '1', name: 'Test' }] };
			await behavior.refresh(data);

			expect(composeSpy).toHaveBeenCalledWith(data);
		});
	});
});
