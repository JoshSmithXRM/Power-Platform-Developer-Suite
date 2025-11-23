import { PluginTraceToolbarSection } from './PluginTraceToolbarSection';
import { SectionPosition } from '../../../../shared/infrastructure/ui/types/SectionPosition';

describe('PluginTraceToolbarSection', () => {
	describe('constructor', () => {
		it('should create section with header position', () => {
			const section = new PluginTraceToolbarSection();

			expect(section.position).toBe(SectionPosition.Header);
		});

		it('should initialize with default Loading trace level', () => {
			const section = new PluginTraceToolbarSection();

			const html = section.render({});

			expect(html).toContain('Loading...');
		});
	});

	describe('setTraceLevel', () => {
		it('should update trace level display', () => {
			const section = new PluginTraceToolbarSection();

			section.setTraceLevel('Verbose');
			const html = section.render({});

			expect(html).toContain('Verbose');
			expect(html).not.toContain('Loading...');
		});

		it('should support multiple trace level updates', () => {
			const section = new PluginTraceToolbarSection();

			section.setTraceLevel('Verbose');
			let html = section.render({});
			expect(html).toContain('Verbose');

			section.setTraceLevel('Error');
			html = section.render({});
			expect(html).toContain('Error');
			expect(html).not.toContain('Verbose');
		});

		it('should escape HTML in trace level values', () => {
			const section = new PluginTraceToolbarSection();

			section.setTraceLevel('<script>alert("xss")</script>');
			const html = section.render({});

			expect(html).toContain('&lt;script&gt;');
			expect(html).not.toContain('<script>alert');
		});
	});

	describe('render', () => {
		it('should render trace level section container', () => {
			const section = new PluginTraceToolbarSection();

			const html = section.render({});

			expect(html).toContain('class="trace-level-section"');
		});

		it('should render trace level label', () => {
			const section = new PluginTraceToolbarSection();

			const html = section.render({});

			expect(html).toContain('class="trace-level-label"');
			expect(html).toContain('Current Trace Level:');
		});

		it('should render trace level value with ID', () => {
			const section = new PluginTraceToolbarSection();
			section.setTraceLevel('Verbose');

			const html = section.render({});

			expect(html).toContain('class="trace-level-value"');
			expect(html).toContain('id="currentTraceLevel"');
			expect(html).toContain('Verbose');
		});

		it('should render change level button', () => {
			const section = new PluginTraceToolbarSection();

			const html = section.render({});

			expect(html).toContain('<button');
			expect(html).toContain('class="trace-level-btn"');
			expect(html).toContain('Change Level');
		});

		it('should render button with correct ID', () => {
			const section = new PluginTraceToolbarSection();

			const html = section.render({});

			expect(html).toContain('id="changeLevelBtn"');
		});

		it('should render button with data command attribute', () => {
			const section = new PluginTraceToolbarSection();

			const html = section.render({});

			expect(html).toContain('data-command="changeTraceLevel"');
		});

		it('should render complete HTML structure', () => {
			const section = new PluginTraceToolbarSection();
			section.setTraceLevel('Verbose');

			const html = section.render({});

			// Verify structure hierarchy
			expect(html).toContain('<div class="trace-level-section">');
			expect(html).toContain('<span class="trace-level-label">');
			expect(html).toContain('<span class="trace-level-value"');
			expect(html).toContain('<button class="trace-level-btn"');
			expect(html).toContain('</button>');
			expect(html).toContain('</div>');
		});

		it('should ignore render data parameter', () => {
			const section = new PluginTraceToolbarSection();
			section.setTraceLevel('Info');

			const html1 = section.render({});
			const html2 = section.render({ customData: { someData: 'value' } });

			expect(html1).toBe(html2);
		});

		it('should handle empty string trace level', () => {
			const section = new PluginTraceToolbarSection();
			section.setTraceLevel('');

			const html = section.render({});

			expect(html).toContain('id="currentTraceLevel"');
			// Should render empty but valid HTML
			expect(html).toMatch(/<span class="trace-level-value" id="currentTraceLevel"><\/span>/);
		});

		it('should handle special characters in trace level', () => {
			const section = new PluginTraceToolbarSection();
			section.setTraceLevel('Level & Status > Normal');

			const html = section.render({});

			expect(html).toContain('&amp;');
			expect(html).toContain('&gt;');
			expect(html).not.toContain('Level & Status >');
		});
	});
});
