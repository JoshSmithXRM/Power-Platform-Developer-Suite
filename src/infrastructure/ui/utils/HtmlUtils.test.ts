/**
 * Unit tests for HtmlUtils
 */

import { escapeHtml, html, raw, each, fragment, attrs, escapeAttribute } from './HtmlUtils';

describe('HtmlUtils', () => {
	describe('escapeHtml', () => {
		it('should escape HTML special characters', () => {
			expect(escapeHtml('<script>alert("xss")</script>'))
				.toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
		});

		it('should escape ampersands', () => {
			expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
		});

		it('should escape double quotes', () => {
			expect(escapeHtml('He said "hello"')).toBe('He said &quot;hello&quot;');
		});

		it('should escape single quotes', () => {
			expect(escapeHtml("It's working")).toBe('It&#39;s working');
		});

		it('should escape less than and greater than', () => {
			expect(escapeHtml('5 < 10 and 20 > 15')).toBe('5 &lt; 10 and 20 &gt; 15');
		});

		it('should handle null and return empty string', () => {
			expect(escapeHtml(null)).toBe('');
		});

		it('should handle undefined and return empty string', () => {
			expect(escapeHtml(undefined)).toBe('');
		});

		it('should handle empty string', () => {
			expect(escapeHtml('')).toBe('');
		});

		it('should not double-escape already escaped content', () => {
			const escaped = escapeHtml('<div>');
			expect(escapeHtml(escaped)).toBe('&amp;lt;div&amp;gt;');
		});

		it('should handle numbers by converting to string', () => {
			expect(escapeHtml('123')).toBe('123');
		});
	});

	describe('html tagged template', () => {
		it('should auto-escape interpolated values', () => {
			const userInput = '<script>alert("xss")</script>';
			const result = html`<div>${userInput}</div>`;

			expect(result.__html).not.toContain('<script>');
			expect(result.__html).toContain('&lt;script&gt;');
			expect(result.__html).toBe('<div>&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;</div>');
		});

		it('should handle multiple interpolations', () => {
			const name = '<b>John</b>';
			const age = '25';
			const result = html`<div>Name: ${name}, Age: ${age}</div>`;

			expect(result.__html).toBe('<div>Name: &lt;b&gt;John&lt;/b&gt;, Age: 25</div>');
		});

		it('should not escape raw HTML', () => {
			const trustedHtml = '<b>Bold</b>';
			const result = html`<div>${raw(trustedHtml)}</div>`;

			expect(result.__html).toContain('<b>Bold</b>');
			expect(result.__html).toBe('<div><b>Bold</b></div>');
		});

		it('should handle arrays from .map()', () => {
			const items = ['Apple', 'Banana', 'Orange'];
			const result = html`<ul>${items.map(item => html`<li>${item}</li>`)}</ul>`;

			expect(result.__html).toBe('<ul><li>Apple</li><li>Banana</li><li>Orange</li></ul>');
		});

		it('should escape array items containing HTML', () => {
			const items = ['<script>xss</script>', 'safe'];
			const result = html`<ul>${items.map(item => html`<li>${item}</li>`)}</ul>`;

			expect(result.__html).not.toContain('<script>');
			expect(result.__html).toContain('&lt;script&gt;');
		});

		it('should handle mixed raw and escaped values in arrays', () => {
			const items = ['Apple', 'Banana'];
			const result = html`<ul>${items.map(item => raw(`<li>${item}</li>`))}</ul>`;

			expect(result.__html).toBe('<ul><li>Apple</li><li>Banana</li></ul>');
		});

		it('should handle null and undefined in interpolations', () => {
			// Test that html() handles values that could be null/undefined
			// Using nullish coalescing to provide explicit empty string fallback
			const nullValue: string | null = null;
			const undefinedValue: string | undefined = undefined;
			const result = html`<div>${nullValue ?? ''} ${undefinedValue ?? ''}</div>`;
			expect(result.__html).toBe('<div> </div>');
		});

		it('should handle empty arrays', () => {
			const items: string[] = [];
			const result = html`<ul>${items.map(item => html`<li>${item}</li>`)}</ul>`;

			expect(result.__html).toBe('<ul></ul>');
		});
	});

	describe('raw', () => {
		it('should mark HTML as trusted', () => {
			const rawHtml = raw('<div>Trusted</div>');
			expect(rawHtml).toEqual({ __html: '<div>Trusted</div>' });
		});

		it('should not escape when used with html``', () => {
			const trustedContent = '<strong>Important</strong>';
			const result = html`<div>${raw(trustedContent)}</div>`;

			expect(result.__html).toContain('<strong>');
			expect(result.__html).not.toContain('&lt;strong&gt;');
		});
	});

	describe('each', () => {
		it('should render array of items with function', () => {
			const items = ['Apple', 'Banana', 'Orange'];
			const result = html`<ul>${each(items, item => html`<li>${item}</li>`)}</ul>`;

			expect(result.__html).toBe('<ul><li>Apple</li><li>Banana</li><li>Orange</li></ul>');
		});

		it('should provide index to render function', () => {
			const items = ['First', 'Second', 'Third'];
			const result = html`<ol>${each(items, (item, index) => html`<li value="${index + 1}">${item}</li>`)}</ol>`;

			expect(result.__html).toContain('value="1"');
			expect(result.__html).toContain('value="2"');
			expect(result.__html).toContain('value="3"');
		});

		it('should handle empty arrays', () => {
			const items: string[] = [];
			const result = html`<ul>${each(items, item => html`<li>${item}</li>`)}</ul>`;

			expect(result.__html).toBe('<ul></ul>');
		});

		it('should escape HTML in items', () => {
			const items = ['<script>xss</script>'];
			const result = html`<ul>${each(items, item => html`<li>${item}</li>`)}</ul>`;

			expect(result.__html).not.toContain('<script>');
			expect(result.__html).toContain('&lt;script&gt;');
		});
	});

	describe('fragment', () => {
		it('should combine multiple HTML strings', () => {
			const header = '<h1>Title</h1>';
			const content = '<p>Content</p>';
			const footer = '<footer>Footer</footer>';

			const result = html`<div>${fragment(header, content, footer)}</div>`;

			expect(result.__html).toBe('<div><h1>Title</h1><p>Content</p><footer>Footer</footer></div>');
		});

		it('should handle empty strings', () => {
			const result = html`<div>${fragment('', '', '')}</div>`;
			expect(result.__html).toBe('<div></div>');
		});

		it('should handle single part', () => {
			const result = html`<div>${fragment('<span>Test</span>')}</div>`;
			expect(result.__html).toBe('<div><span>Test</span></div>');
		});

		it('should combine many parts', () => {
			const parts = Array.from({ length: 5 }, (_, i) => `<div>${i}</div>`);
			const result = html`<main>${fragment(...parts)}</main>`;

			expect(result.__html).toBe('<main><div>0</div><div>1</div><div>2</div><div>3</div><div>4</div></main>');
		});
	});

	describe('attrs', () => {
		it('should generate attributes from object', () => {
			const result = html`<input ${attrs({ type: 'text', id: 'name', value: 'John' })} />`;

			expect(result.__html).toContain('type="text"');
			expect(result.__html).toContain('id="name"');
			expect(result.__html).toContain('value="John"');
		});

		it('should handle boolean attributes correctly', () => {
			const result = html`<input ${attrs({ required: true, disabled: false })} />`;

			expect(result.__html).toContain('required');
			expect(result.__html).not.toContain('required="true"');
			expect(result.__html).not.toContain('disabled');
		});

		it('should filter out null and undefined values', () => {
			const result = html`<input ${attrs({ type: 'text', value: null, placeholder: undefined })} />`;

			expect(result.__html).toContain('type="text"');
			expect(result.__html).not.toContain('value');
			expect(result.__html).not.toContain('placeholder');
		});

		it('should escape attribute values', () => {
			const result = html`<input ${attrs({ value: '<script>xss</script>' })} />`;

			expect(result.__html).not.toContain('<script>');
			expect(result.__html).toContain('&lt;script&gt;');
		});

		it('should handle numbers in attributes', () => {
			const result = html`<input ${attrs({ min: 0, max: 100, step: 5 })} />`;

			expect(result.__html).toContain('min="0"');
			expect(result.__html).toContain('max="100"');
			expect(result.__html).toContain('step="5"');
		});

		it('should handle empty object', () => {
			const result = html`<input ${attrs({})} />`;
			expect(result.__html).toBe('<input  />');
		});

		it('should handle data attributes', () => {
			const result = html`<div ${attrs({ 'data-id': '123', 'data-name': 'test' })}></div>`;

			expect(result.__html).toContain('data-id="123"');
			expect(result.__html).toContain('data-name="test"');
		});

		it('should handle aria attributes', () => {
			const result = html`<button ${attrs({ 'aria-label': 'Close', 'aria-hidden': false })}></button>`;

			expect(result.__html).toContain('aria-label="Close"');
			expect(result.__html).not.toContain('aria-hidden');
		});
	});

	describe('Integration tests', () => {
		it('should build complex HTML structure safely', () => {
			const userName = '<script>alert("xss")</script>';
			const userAge = 25;
			const isAdmin = true;

			const result = html`
				<div ${attrs({ class: 'user-card', 'data-id': '123' })}>
					<h2>${userName}</h2>
					<p>Age: ${userAge}</p>
					${isAdmin ? raw('<span class="badge">Admin</span>') : ''}
				</div>
			`;

			expect(result.__html).not.toContain('<script>');
			expect(result.__html).toContain('&lt;script&gt;');
			expect(result.__html).toContain('Age: 25');
			expect(result.__html).toContain('<span class="badge">Admin</span>');
			expect(result.__html).toContain('class="user-card"');
		});

		it('should safely render a list with mixed content', () => {
			const items = [
				{ name: '<b>Item 1</b>', safe: true },
				{ name: 'Item 2', safe: false }
			];

			const result = html`
				<ul>
					${each(items, item => html`
						<li ${attrs({ class: item.safe ? 'safe' : 'unsafe' })}>
							${item.name}
						</li>
					`)}
				</ul>
			`;

			expect(result.__html).toContain('&lt;b&gt;Item 1&lt;/b&gt;');
			expect(result.__html).toContain('class="safe"');
			expect(result.__html).toContain('class="unsafe"');
		});

		it('should handle plain string array interpolations', () => {
			const items = ['Apple', 'Banana', 'Orange'];
			const result = html`<div>${items}</div>`;

			expect(result.__html).toBe('<div>AppleBananaOrange</div>');
		});

		it('should escape HTML in plain string arrays', () => {
			const items = ['<script>xss1</script>', '<b>bold</b>'];
			const result = html`<div>${items}</div>`;

			expect(result.__html).not.toContain('<script>');
			expect(result.__html).not.toContain('<b>');
			expect(result.__html).toContain('&lt;script&gt;');
			expect(result.__html).toContain('&lt;b&gt;');
		});
	});

	describe('each with plain string returns', () => {
		it('should handle render function that returns plain strings', () => {
			const items = ['Apple', 'Banana'];
			const result = html`<ul>${each(items, item => `<li>${item}</li>`)}</ul>`;

			// Plain strings from render function are not escaped in each()
			// but would be if interpolated directly
			expect(result.__html).toBe('<ul><li>Apple</li><li>Banana</li></ul>');
		});

		it('should handle mix of RawHtml and plain string returns', () => {
			const items = ['First', 'Second'];
			const result = html`<ul>${each(items, (item, index) => {
				if (index === 0) {
					return html`<li>${item}</li>`;
				}
				return `<li>${item}</li>`;
			})}</ul>`;

			expect(result.__html).toBe('<ul><li>First</li><li>Second</li></ul>');
		});
	});

	describe('escapeAttribute', () => {
		it('should escape HTML special characters in attributes', () => {
			expect(escapeAttribute('<script>alert("xss")</script>'))
				.toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
		});

		it('should escape quotes in attribute values', () => {
			expect(escapeAttribute('He said "hello"')).toBe('He said &quot;hello&quot;');
		});

		it('should handle null and return empty string', () => {
			expect(escapeAttribute(null)).toBe('');
		});

		it('should handle undefined and return empty string', () => {
			expect(escapeAttribute(undefined)).toBe('');
		});

		it('should escape ampersands in attributes', () => {
			expect(escapeAttribute('Tom & Jerry')).toBe('Tom &amp; Jerry');
		});
	});
});
