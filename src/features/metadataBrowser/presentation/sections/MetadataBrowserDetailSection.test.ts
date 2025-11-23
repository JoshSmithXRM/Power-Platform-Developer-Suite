import { MetadataBrowserDetailSection } from './MetadataBrowserDetailSection';
import { SectionPosition } from '../../../../shared/infrastructure/ui/types/SectionPosition';

describe('MetadataBrowserDetailSection', () => {
	describe('constructor and position', () => {
		it('should set position to Detail', () => {
			const section = new MetadataBrowserDetailSection();

			expect(section.position).toBe(SectionPosition.Detail);
		});
	});

	describe('render', () => {
		it('should generate correct panel ID with metadata prefix', () => {
			const section = new MetadataBrowserDetailSection();

			const html = section.render({});

			expect(html).toContain('id="metadataDetailPanel"');
		});

		it('should render panel with display none initially', () => {
			const section = new MetadataBrowserDetailSection();

			const html = section.render({});

			expect(html).toContain('style="display: none;"');
		});

		it('should render both tab buttons in correct order', () => {
			const section = new MetadataBrowserDetailSection();

			const html = section.render({});

			expect(html).toContain('data-tab="properties"');
			expect(html).toContain('>Properties</button>');
			expect(html).toContain('data-tab="rawData"');
			expect(html).toContain('>Raw Data</button>');
		});

		it('should render content containers with correct IDs', () => {
			const section = new MetadataBrowserDetailSection();

			const html = section.render({});

			expect(html).toContain('id="metadataPropertiesContent"');
			expect(html).toContain('id="metadataRawDataContent"');
		});

		it('should mark properties tab as active by default', () => {
			const section = new MetadataBrowserDetailSection();

			const html = section.render({});

			// Properties tab button should have active class
			const propertiesButton = html.match(/<button[^>]*data-tab="properties"[^>]*>/)?.[0] ?? '';
			expect(propertiesButton).toContain('class="detail-tab-button active"');

			// Properties tab panel should have active class
			const propertiesPanel = html.match(/<div[^>]*id="metadataPropertiesContent"[^>]*>/)?.[0] ?? '';
			expect(propertiesPanel).toContain('class="detail-tab-panel active"');

			// Raw data tab should not be active
			const rawDataButton = html.match(/<button[^>]*data-tab="rawData"[^>]*>/)?.[0] ?? '';
			expect(rawDataButton).not.toContain('active');
		});

		it('should render resize handle with correct attributes', () => {
			const section = new MetadataBrowserDetailSection();

			const html = section.render({});

			expect(html).toContain('id="detailPanelResizeHandle"');
			expect(html).toContain('class="detail-panel-resize-handle"');
			expect(html).toContain('title="Drag to resize"');
		});

		it('should render close button with correct label', () => {
			const section = new MetadataBrowserDetailSection();

			const html = section.render({});

			expect(html).toContain('id="detailPanelClose"');
			expect(html).toContain('data-command="closeDetail"');
			expect(html).toContain('aria-label="Close detail panel"');
		});
	});
});
