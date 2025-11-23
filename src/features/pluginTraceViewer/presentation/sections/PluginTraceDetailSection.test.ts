import { PluginTraceDetailSection } from './PluginTraceDetailSection';
import { SectionPosition } from '../../../../shared/infrastructure/ui/types/SectionPosition';

describe('PluginTraceDetailSection', () => {
	describe('constructor and position', () => {
		it('should set position to Detail', () => {
			const section = new PluginTraceDetailSection();

			expect(section.position).toBe(SectionPosition.Detail);
		});
	});

	describe('render', () => {
		it('should generate correct panel ID with pluginTrace prefix', () => {
			const section = new PluginTraceDetailSection();

			const html = section.render({});

			expect(html).toContain('id="pluginTraceDetailPanel"');
		});

		it('should render panel with display none initially', () => {
			const section = new PluginTraceDetailSection();

			const html = section.render({});

			expect(html).toContain('style="display: none;"');
		});

		it('should render all four tab buttons in correct order', () => {
			const section = new PluginTraceDetailSection();

			const html = section.render({});

			expect(html).toContain('data-tab="overview"');
			expect(html).toContain('>Overview</button>');
			expect(html).toContain('data-tab="details"');
			expect(html).toContain('>Details</button>');
			expect(html).toContain('data-tab="timeline"');
			expect(html).toContain('>Timeline</button>');
			expect(html).toContain('data-tab="raw"');
			expect(html).toContain('>Raw Data</button>');
		});

		it('should render content containers with correct IDs', () => {
			const section = new PluginTraceDetailSection();

			const html = section.render({});

			expect(html).toContain('id="pluginTraceOverviewContent"');
			expect(html).toContain('id="pluginTraceDetailsContent"');
			expect(html).toContain('id="pluginTraceTimelineContent"');
			expect(html).toContain('id="pluginTraceRawContent"');
		});

		it('should mark overview tab as active by default', () => {
			const section = new PluginTraceDetailSection();

			const html = section.render({});

			// Overview tab button should have active class
			const overviewButton = html.match(/<button[^>]*data-tab="overview"[^>]*>/)?.[0] ?? '';
			expect(overviewButton).toContain('class="detail-tab-button active"');

			// Overview tab panel should have active class
			const overviewPanel = html.match(/<div[^>]*id="pluginTraceOverviewContent"[^>]*>/)?.[0] ?? '';
			expect(overviewPanel).toContain('class="detail-tab-panel active"');

			// Other tabs should not be active
			const detailsButton = html.match(/<button[^>]*data-tab="details"[^>]*>/)?.[0] ?? '';
			expect(detailsButton).not.toContain('active');
		});

		it('should render resize handle with correct attributes', () => {
			const section = new PluginTraceDetailSection();

			const html = section.render({});

			expect(html).toContain('id="detailPanelResizeHandle"');
			expect(html).toContain('class="detail-panel-resize-handle"');
			expect(html).toContain('title="Drag to resize"');
		});

		it('should render close button with correct label', () => {
			const section = new PluginTraceDetailSection();

			const html = section.render({});

			expect(html).toContain('id="detailPanelClose"');
			expect(html).toContain('data-command="closeDetail"');
			expect(html).toContain('aria-label="Close detail panel"');
		});
	});
});
