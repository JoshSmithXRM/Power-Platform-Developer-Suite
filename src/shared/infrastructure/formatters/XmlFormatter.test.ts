import { XmlFormatter } from './XmlFormatter';

describe('XmlFormatter', () => {
	let formatter: XmlFormatter;

	beforeEach(() => {
		formatter = new XmlFormatter();
	});

	describe('format', () => {
		it('should add indentation to nested elements', () => {
			const input = '<root><child><nested>Value</nested></child></root>';
			const result = formatter.format(input);

			expect(result).toContain('<root>');
			expect(result).toContain('  <child>');
			expect(result).toContain('    <nested>Value</nested>');
			expect(result).toContain('  </child>');
			expect(result).toContain('</root>');
		});

		it('should preserve single-line elements', () => {
			const input = '<root><title>Test Title</title></root>';
			const result = formatter.format(input);

			expect(result).toContain('<title>Test Title</title>');
		});

		it('should handle self-closing tags', () => {
			const input = '<root><item /><item /></root>';
			const result = formatter.format(input);

			expect(result).toContain('<item />');
		});

		it('should handle empty XML', () => {
			expect(formatter.format('')).toBe('');
			expect(formatter.format('   ')).toBe('   ');
		});

		it('should handle malformed XML gracefully', () => {
			const malformed = '<root><unclosed><tag>Value</tag>';
			const result = formatter.format(malformed);

			// Should return original on error (or formatted as best as possible)
			expect(result).toBeTruthy();
		});

		it('should preserve XML attributes', () => {
			const input = '<root id="1" name="test"><child attr="value">Content</child></root>';
			const result = formatter.format(input);

			expect(result).toContain('id="1"');
			expect(result).toContain('name="test"');
			expect(result).toContain('attr="value"');
		});

		it('should preserve CDATA sections', () => {
			const input = '<root><![CDATA[Special <data>]]></root>';
			const result = formatter.format(input);

			expect(result).toContain('<![CDATA[Special <data>]]>');
		});

		it('should preserve XML entities', () => {
			const input = '<root>&lt;special&gt; &amp; &quot;quoted&quot;</root>';
			const result = formatter.format(input);

			expect(result).toContain('&lt;special&gt;');
			expect(result).toContain('&amp;');
			expect(result).toContain('&quot;');
		});

		it('should handle deeply nested structures', () => {
			const input = '<l1><l2><l3><l4>Deep</l4></l3></l2></l1>';
			const result = formatter.format(input);

			// Verify increasing indentation
			const lines = result.split('\n');
			expect(lines.length).toBeGreaterThan(4);
			expect(result).toContain('<l1>');
			expect(result).toContain('  <l2>');
			expect(result).toContain('    <l3>');
			expect(result).toContain('      <l4>Deep</l4>');
		});

		it('should format complex XML with multiple siblings', () => {
			const input = '<root><item1>A</item1><item2>B</item2><item3>C</item3></root>';
			const result = formatter.format(input);

			expect(result).toContain('  <item1>A</item1>');
			expect(result).toContain('  <item2>B</item2>');
			expect(result).toContain('  <item3>C</item3>');
		});

		it('should handle mixed content and elements', () => {
			const input = '<root>Text<child>Value</child>More text</root>';
			const result = formatter.format(input);

			// Should still format, even with mixed content
			expect(result).toBeTruthy();
			expect(result).toContain('<root>');
			expect(result).toContain('<child>Value</child>');
		});

		it('should handle XML with comments', () => {
			const input = '<root><!-- Comment --><child>Value</child></root>';
			const result = formatter.format(input);

			expect(result).toContain('<!-- Comment -->');
			expect(result).toContain('<child>Value</child>');
		});

		it('should handle very long XML without errors', () => {
			// Generate large XML structure
			let largeXml = '<root>';
			for (let i = 0; i < 100; i++) {
				largeXml += `<item${i}>Value${i}</item${i}>`;
			}
			largeXml += '</root>';

			const result = formatter.format(largeXml);

			// Should complete without throwing
			expect(result).toBeTruthy();
			expect(result.length).toBeGreaterThan(largeXml.length); // Has newlines
		});
	});
});
