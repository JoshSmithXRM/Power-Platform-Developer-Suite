/**
 * Unit tests for clickable link rendering utilities
 */

import { renderDataTableLink, renderLinkClickHandler } from './clickableLinks';

describe('clickableLinks', () => {
	describe('renderDataTableLink', () => {
		it('should render basic link with data-id attribute', () => {
			const result = renderDataTableLink('test-link', '123', 'Test Item');

			expect(result).toContain('<a');
			expect(result).toContain('class="test-link"');
			expect(result).toContain('data-id="123"');
			expect(result).toContain('Test Item');
			expect(result).toContain('</a>');
		});

		it('should include href="#" attribute', () => {
			const result = renderDataTableLink('link', 'id', 'text');

			expect(result).toContain('href="#"');
		});

		it('should escape HTML in display text', () => {
			const result = renderDataTableLink('link', 'id', '<script>alert("xss")</script>');

			expect(result).not.toContain('<script>');
			expect(result).toContain('&lt;script&gt;');
			expect(result).toContain('alert(&quot;xss&quot;)');
		});

		it('should handle special characters in entity ID', () => {
			const result = renderDataTableLink('link', 'id-with-dashes', 'Text');

			expect(result).toContain('data-id="id-with-dashes"');
		});

		it('should handle various CSS classes', () => {
			expect(renderDataTableLink('solution-link', '1', 'Sol')).toContain('class="solution-link"');
			expect(renderDataTableLink('flow-link', '2', 'Flow')).toContain('class="flow-link"');
			expect(renderDataTableLink('job-link', '3', 'Job')).toContain('class="job-link"');
		});

		it('should escape ampersands in display text', () => {
			const result = renderDataTableLink('link', 'id', 'Tom & Jerry');

			expect(result).toContain('Tom &amp; Jerry');
		});

		it('should escape quotes in display text', () => {
			const result = renderDataTableLink('link', 'id', 'He said "hello"');

			expect(result).toContain('&quot;hello&quot;');
		});

		it('should handle empty display text', () => {
			const result = renderDataTableLink('link', 'id', '');

			expect(result).toContain('data-id="id"');
			expect(result).toContain('></a>');
		});
	});

	describe('renderLinkClickHandler', () => {
		it('should generate event handler JavaScript', () => {
			const result = renderLinkClickHandler('.test-link', 'testCommand', 'testId');

			expect(result).toContain('document.querySelectorAll');
			expect(result).toContain('.test-link');
			expect(result).toContain('addEventListener');
			expect(result).toContain('click');
		});

		it('should include preventDefault call', () => {
			const result = renderLinkClickHandler('.link', 'cmd', 'id');

			expect(result).toContain('e.preventDefault()');
		});

		it('should retrieve data-id attribute', () => {
			const result = renderLinkClickHandler('.link', 'cmd', 'entityId');

			expect(result).toContain('getAttribute(\'data-id\')');
		});

		it('should post message with correct command', () => {
			const result = renderLinkClickHandler('.solution-link', 'openInMaker', 'solutionId');

			expect(result).toContain('vscode.postMessage');
			expect(result).toContain('command: \'openInMaker\'');
		});

		it('should include data key in message payload', () => {
			const result = renderLinkClickHandler('.link', 'cmd', 'myId');

			expect(result).toContain('data:');
			expect(result).toContain('myId: entityId');
		});

		it('should handle different CSS selectors', () => {
			expect(renderLinkClickHandler('.solution-link', 'cmd', 'id'))
				.toContain('.solution-link');
			expect(renderLinkClickHandler('.flow-link', 'cmd', 'id'))
				.toContain('.flow-link');
			expect(renderLinkClickHandler('.job-link', 'cmd', 'id'))
				.toContain('.job-link');
		});

		it('should handle different command names', () => {
			expect(renderLinkClickHandler('.link', 'openInMaker', 'id'))
				.toContain('openInMaker');
			expect(renderLinkClickHandler('.link', 'openFlow', 'id'))
				.toContain('openFlow');
			expect(renderLinkClickHandler('.link', 'viewImportJob', 'id'))
				.toContain('viewImportJob');
		});

		it('should handle different data key names', () => {
			expect(renderLinkClickHandler('.link', 'cmd', 'solutionId'))
				.toContain('solutionId: entityId');
			expect(renderLinkClickHandler('.link', 'cmd', 'flowId'))
				.toContain('flowId: entityId');
			expect(renderLinkClickHandler('.link', 'cmd', 'importJobId'))
				.toContain('importJobId: entityId');
		});

		it('should iterate over all matching links', () => {
			const result = renderLinkClickHandler('.test-link', 'cmd', 'id');

			expect(result).toContain('forEach(link =>');
		});
	});

	describe('Integration', () => {
		it('should render link HTML and click handler that work together for complete functionality', () => {
			const linkHtml = renderDataTableLink('solution-link', 'abc-123', 'My Solution');
			const handlerJs = renderLinkClickHandler('.solution-link', 'openInMaker', 'solutionId');

			// Link should have correct structure
			expect(linkHtml).toContain('class="solution-link"');
			expect(linkHtml).toContain('data-id="abc-123"');
			expect(linkHtml).toContain('My Solution');

			// Handler should target the same CSS class
			expect(handlerJs).toContain('.solution-link');
			expect(handlerJs).toContain('getAttribute(\'data-id\')');
			expect(handlerJs).toContain('openInMaker');
			expect(handlerJs).toContain('solutionId');
		});
	});
});
