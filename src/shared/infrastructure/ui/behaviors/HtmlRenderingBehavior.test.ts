import type { DataTableConfig } from '../DataTablePanel';
import { renderDataTable } from '../views/dataTable';

import { HtmlRenderingBehavior, HtmlCustomization } from './HtmlRenderingBehavior';

jest.mock('vscode', () => ({
	Uri: {
		joinPath: jest.fn((...parts) => ({
			toString: () => parts.join('/'),
			fsPath: parts.join('/')
		}))
	}
}), { virtual: true });

jest.mock('../views/dataTable', () => ({
	renderDataTable: jest.fn((params) => {
		return `<html>
		<link href="${params.datatableCssUri}" rel="stylesheet">
		<style>${params.customCss}</style>
		<script>${params.filterLogic}</script>
		<script>${params.customJavaScript}</script>
	</html>`;
	})
}));

function createMockWebview(): import('vscode').Webview {
	return {
		asWebviewUri: jest.fn((uri) => ({
			toString: () => `webview-uri://${uri.toString()}`
		}))
	} as unknown as import('vscode').Webview;
}

function createMockUri(path: string): import('vscode').Uri {
	return {
		toString: () => path,
		fsPath: path
	} as import('vscode').Uri;
}

describe('HtmlRenderingBehavior', () => {
	let webviewMock: import('vscode').Webview;
	let extensionUri: import('vscode').Uri;
	let config: DataTableConfig;
	let customization: HtmlCustomization;
	let behavior: HtmlRenderingBehavior;

	beforeEach(() => {
		jest.clearAllMocks();

		webviewMock = createMockWebview();
		extensionUri = createMockUri('/extension/path');

		config = {
			viewType: 'test-panel',
			title: 'Test Panel',
			dataCommand: 'testData',
			defaultSortColumn: 'name',
			defaultSortDirection: 'asc',
			columns: [
				{ key: 'name', label: 'Name', width: '100%' }
			],
			searchPlaceholder: 'Search...',
			noDataMessage: 'No data',
			enableSearch: true,
			enableSolutionFilter: false,
			toolbarButtons: []
		};

		customization = {
			customCss: '',
			filterLogic: '',
			customJavaScript: ''
		};
	});

	describe('renderHtml', () => {
		it('should generate HTML with CSS URI', () => {
			behavior = new HtmlRenderingBehavior(webviewMock, extensionUri, config, customization);

			const html = behavior.renderHtml();

			expect(html).toContain('webview-uri://');
			expect(html).toContain('datatable.css');
		});

		it('should convert CSS file path to webview URI', () => {
			behavior = new HtmlRenderingBehavior(webviewMock, extensionUri, config, customization);

			behavior.renderHtml();

			expect(webviewMock.asWebviewUri).toHaveBeenCalledWith(
				expect.objectContaining({
					toString: expect.any(Function)
				})
			);
		});

		it('should include custom CSS in HTML', () => {
			customization = {
				...customization,
				customCss: '.custom-class { color: red; }'
			};
			behavior = new HtmlRenderingBehavior(webviewMock, extensionUri, config, customization);

			const html = behavior.renderHtml();

			expect(html).toContain('.custom-class { color: red; }');
		});

		it('should include filter logic in HTML', () => {
			customization = {
				...customization,
				filterLogic: 'function filterData(data) { return data; }'
			};
			behavior = new HtmlRenderingBehavior(webviewMock, extensionUri, config, customization);

			const html = behavior.renderHtml();

			expect(html).toContain('function filterData(data) { return data; }');
		});

		it('should include custom JavaScript in HTML', () => {
			customization = {
				...customization,
				customJavaScript: 'console.log("custom script");' // Test data for custom JS injection
			};
			behavior = new HtmlRenderingBehavior(webviewMock, extensionUri, config, customization);

			const html = behavior.renderHtml();

			expect(html).toContain('console.log("custom script");');
		});

		it('should include all customizations when provided', () => {
			customization = {
				customCss: '.custom { color: blue; }',
				filterLogic: 'function filter() {}',
				customJavaScript: 'console.log("test");'
			};
			behavior = new HtmlRenderingBehavior(webviewMock, extensionUri, config, customization);

			const html = behavior.renderHtml();

			expect(html).toContain('.custom { color: blue; }');
			expect(html).toContain('function filter() {}');
			expect(html).toContain('console.log("test");');
		});

		it('should render with empty customizations', () => {
			behavior = new HtmlRenderingBehavior(webviewMock, extensionUri, config, customization);

			const html = behavior.renderHtml();

			expect(html).toBeDefined();
			expect(html).toContain('<html>');
		});

		it('should use correct CSS file path', () => {
			behavior = new HtmlRenderingBehavior(webviewMock, extensionUri, config, customization);

			behavior.renderHtml();

			expect(webviewMock.asWebviewUri).toHaveBeenCalledTimes(1);
			const [uriCall] = (webviewMock.asWebviewUri as jest.Mock).mock.calls[0]!;
			expect(uriCall.toString()).toContain('resources');
			expect(uriCall.toString()).toContain('webview');
			expect(uriCall.toString()).toContain('css');
			expect(uriCall.toString()).toContain('datatable.css');
		});

		it('should pass config to renderDataTable', () => {
			behavior = new HtmlRenderingBehavior(webviewMock, extensionUri, config, customization);

			behavior.renderHtml();

			expect(renderDataTable).toHaveBeenCalledWith(
				expect.objectContaining({
					config: config
				})
			);
		});

		it('should handle multiple renderHtml calls', () => {
			behavior = new HtmlRenderingBehavior(webviewMock, extensionUri, config, customization);

			const html1 = behavior.renderHtml();
			const html2 = behavior.renderHtml();

			expect(html1).toBeDefined();
			expect(html2).toBeDefined();
			expect(html1).toBe(html2);
		});
	});

	describe('customization variations', () => {
		it('should handle multiline custom CSS', () => {
			customization = {
				...customization,
				customCss: `.class1 {
					color: red;
				}
				.class2 {
					color: blue;
				}`
			};
			behavior = new HtmlRenderingBehavior(webviewMock, extensionUri, config, customization);

			const html = behavior.renderHtml();

			expect(html).toContain('.class1');
			expect(html).toContain('.class2');
		});

		it('should handle complex filter logic', () => {
			customization = {
				...customization,
				filterLogic: `
					function complexFilter(data, searchTerm) {
						return data.filter(item =>
							item.name.toLowerCase().includes(searchTerm.toLowerCase())
						);
					}
				`
			};
			behavior = new HtmlRenderingBehavior(webviewMock, extensionUri, config, customization);

			const html = behavior.renderHtml();

			expect(html).toContain('complexFilter');
			expect(html).toContain('toLowerCase');
		});

		it('should handle custom JavaScript with special characters', () => {
			customization = {
				...customization,
				customJavaScript: 'const regex = /[a-z]+/gi; console.log("test");'
			};
			behavior = new HtmlRenderingBehavior(webviewMock, extensionUri, config, customization);

			const html = behavior.renderHtml();

			expect(html).toContain('const regex');
		});
	});

	describe('URI generation', () => {
		it('should generate different URIs for different extension paths', () => {
			const extensionUri1 = createMockUri('/path1');
			const extensionUri2 = createMockUri('/path2');

			const behavior1 = new HtmlRenderingBehavior(webviewMock, extensionUri1, config, customization);
			const behavior2 = new HtmlRenderingBehavior(webviewMock, extensionUri2, config, customization);

			behavior1.renderHtml();
			expect(webviewMock.asWebviewUri).toHaveBeenCalledTimes(1);
			const [uri1Call] = (webviewMock.asWebviewUri as jest.Mock).mock.calls[0]!;

			(webviewMock.asWebviewUri as jest.Mock).mockClear();

			behavior2.renderHtml();
			expect(webviewMock.asWebviewUri).toHaveBeenCalledTimes(1);
			const [uri2Call] = (webviewMock.asWebviewUri as jest.Mock).mock.calls[0]!;

			expect(uri1Call.toString()).toContain('/path1');
			expect(uri2Call.toString()).toContain('/path2');
		});

		it('should call asWebviewUri exactly once per render', () => {
			behavior = new HtmlRenderingBehavior(webviewMock, extensionUri, config, customization);

			behavior.renderHtml();

			expect(webviewMock.asWebviewUri).toHaveBeenCalledTimes(1);
		});
	});
});
