import { ResizableDetailPanelSection, type ResizableDetailPanelConfig } from './ResizableDetailPanelSection';
import { SectionPosition } from '../types/SectionPosition';

/**
 * Test implementation of ResizableDetailPanelSection for testing base class.
 */
class TestDetailSection extends ResizableDetailPanelSection {
	constructor(config: ResizableDetailPanelConfig) {
		super(config);
	}
}

describe('ResizableDetailPanelSection', () => {
	describe('constructor and position', () => {
		it('should set position to Detail', () => {
			const config: ResizableDetailPanelConfig = {
				featurePrefix: 'test',
				tabs: [{ id: 'tab1', label: 'Tab 1' }]
			};
			const section = new TestDetailSection(config);

			expect(section.position).toBe(SectionPosition.Detail);
		});
	});

	describe('config validation', () => {
		it('should reject empty featurePrefix', () => {
			const config: ResizableDetailPanelConfig = {
				featurePrefix: '',
				tabs: [{ id: 'tab1', label: 'Tab 1' }]
			};

			expect(() => new TestDetailSection(config)).toThrow('featurePrefix cannot be empty');
		});

		it('should reject whitespace-only featurePrefix', () => {
			const config: ResizableDetailPanelConfig = {
				featurePrefix: '   ',
				tabs: [{ id: 'tab1', label: 'Tab 1' }]
			};

			expect(() => new TestDetailSection(config)).toThrow('featurePrefix cannot be empty');
		});

		it('should reject empty tabs array', () => {
			const config: ResizableDetailPanelConfig = {
				featurePrefix: 'test',
				tabs: []
			};

			expect(() => new TestDetailSection(config)).toThrow('Invalid ResizableDetailPanelSection config: at least one tab is required');
		});

		it('should reject tabs with empty id', () => {
			const config: ResizableDetailPanelConfig = {
				featurePrefix: 'test',
				tabs: [{ id: '', label: 'Tab 1' }]
			};

			expect(() => new TestDetailSection(config)).toThrow('Invalid ResizableDetailPanelSection config: tab id cannot be empty');
		});

		it('should reject tabs with whitespace-only id', () => {
			const config: ResizableDetailPanelConfig = {
				featurePrefix: 'test',
				tabs: [{ id: '  ', label: 'Tab 1' }]
			};

			expect(() => new TestDetailSection(config)).toThrow('Invalid ResizableDetailPanelSection config: tab id cannot be empty');
		});

		it('should reject tabs with empty label', () => {
			const config: ResizableDetailPanelConfig = {
				featurePrefix: 'test',
				tabs: [{ id: 'tab1', label: '' }]
			};

			expect(() => new TestDetailSection(config)).toThrow('Invalid ResizableDetailPanelSection config: tab label cannot be empty');
		});

		it('should reject tabs with whitespace-only label', () => {
			const config: ResizableDetailPanelConfig = {
				featurePrefix: 'test',
				tabs: [{ id: 'tab1', label: '   ' }]
			};

			expect(() => new TestDetailSection(config)).toThrow('Invalid ResizableDetailPanelSection config: tab label cannot be empty');
		});

		it('should reject duplicate tab ids', () => {
			const config: ResizableDetailPanelConfig = {
				featurePrefix: 'test',
				tabs: [
					{ id: 'duplicate', label: 'Tab 1' },
					{ id: 'duplicate', label: 'Tab 2' }
				]
			};

			expect(() => new TestDetailSection(config)).toThrow('Invalid ResizableDetailPanelSection config: duplicate tab id "duplicate"');
		});

		it('should reject multiple default tabs', () => {
			const config: ResizableDetailPanelConfig = {
				featurePrefix: 'test',
				tabs: [
					{ id: 'tab1', label: 'Tab 1', isDefault: true },
					{ id: 'tab2', label: 'Tab 2', isDefault: true }
				]
			};

			expect(() => new TestDetailSection(config)).toThrow('Invalid ResizableDetailPanelSection config: only one tab can be marked as default');
		});

		it('should accept valid single tab config', () => {
			const config: ResizableDetailPanelConfig = {
				featurePrefix: 'test',
				tabs: [{ id: 'tab1', label: 'Tab 1' }]
			};

			expect(() => new TestDetailSection(config)).not.toThrow();
		});

		it('should accept valid multiple tabs config', () => {
			const config: ResizableDetailPanelConfig = {
				featurePrefix: 'test',
				tabs: [
					{ id: 'tab1', label: 'Tab 1' },
					{ id: 'tab2', label: 'Tab 2' },
					{ id: 'tab3', label: 'Tab 3' }
				]
			};

			expect(() => new TestDetailSection(config)).not.toThrow();
		});
	});

	describe('render', () => {
		it('should generate correct panel ID', () => {
			const config: ResizableDetailPanelConfig = {
				featurePrefix: 'myFeature',
				tabs: [{ id: 'tab1', label: 'Tab 1' }]
			};
			const section = new TestDetailSection(config);

			const html = section.render({});

			expect(html).toContain('id="myFeatureDetailPanel"');
		});

		it('should render panel with display none initially', () => {
			const config: ResizableDetailPanelConfig = {
				featurePrefix: 'test',
				tabs: [{ id: 'tab1', label: 'Tab 1' }]
			};
			const section = new TestDetailSection(config);

			const html = section.render({});

			expect(html).toContain('style="display: none;"');
		});

		it('should render resize handle with correct ID', () => {
			const config: ResizableDetailPanelConfig = {
				featurePrefix: 'test',
				tabs: [{ id: 'tab1', label: 'Tab 1' }]
			};
			const section = new TestDetailSection(config);

			const html = section.render({});

			expect(html).toContain('id="detailPanelResizeHandle"');
			expect(html).toContain('class="detail-panel-resize-handle"');
		});

		it('should render default resize handle title', () => {
			const config: ResizableDetailPanelConfig = {
				featurePrefix: 'test',
				tabs: [{ id: 'tab1', label: 'Tab 1' }]
			};
			const section = new TestDetailSection(config);

			const html = section.render({});

			expect(html).toContain('title="Drag to resize"');
		});

		it('should render custom resize handle title', () => {
			const config: ResizableDetailPanelConfig = {
				featurePrefix: 'test',
				tabs: [{ id: 'tab1', label: 'Tab 1' }],
				resizeHandleTitle: 'Custom resize title'
			};
			const section = new TestDetailSection(config);

			const html = section.render({});

			expect(html).toContain('title="Custom resize title"');
		});

		it('should render panel title element', () => {
			const config: ResizableDetailPanelConfig = {
				featurePrefix: 'test',
				tabs: [{ id: 'tab1', label: 'Tab 1' }]
			};
			const section = new TestDetailSection(config);

			const html = section.render({});

			expect(html).toContain('id="detailPanelTitle"');
			expect(html).toContain('>Details</span>');
		});

		it('should render close button with correct attributes', () => {
			const config: ResizableDetailPanelConfig = {
				featurePrefix: 'test',
				tabs: [{ id: 'tab1', label: 'Tab 1' }]
			};
			const section = new TestDetailSection(config);

			const html = section.render({});

			expect(html).toContain('id="detailPanelClose"');
			expect(html).toContain('data-command="closeDetail"');
			expect(html).toContain('aria-label="Close detail panel"');
		});

		it('should render custom close button label', () => {
			const config: ResizableDetailPanelConfig = {
				featurePrefix: 'test',
				tabs: [{ id: 'tab1', label: 'Tab 1' }],
				closeButtonLabel: 'Custom close label'
			};
			const section = new TestDetailSection(config);

			const html = section.render({});

			expect(html).toContain('aria-label="Custom close label"');
		});

		it('should render single tab button', () => {
			const config: ResizableDetailPanelConfig = {
				featurePrefix: 'test',
				tabs: [{ id: 'overview', label: 'Overview' }]
			};
			const section = new TestDetailSection(config);

			const html = section.render({});

			expect(html).toContain('data-tab="overview"');
			expect(html).toContain('>Overview</button>');
			expect(html).toContain('class="detail-tab-button active"');
		});

		it('should render multiple tab buttons', () => {
			const config: ResizableDetailPanelConfig = {
				featurePrefix: 'test',
				tabs: [
					{ id: 'overview', label: 'Overview' },
					{ id: 'details', label: 'Details' },
					{ id: 'raw', label: 'Raw Data' }
				]
			};
			const section = new TestDetailSection(config);

			const html = section.render({});

			expect(html).toContain('data-tab="overview"');
			expect(html).toContain('>Overview</button>');
			expect(html).toContain('data-tab="details"');
			expect(html).toContain('>Details</button>');
			expect(html).toContain('data-tab="raw"');
			expect(html).toContain('>Raw Data</button>');
		});

		it('should render content containers with correct IDs', () => {
			const config: ResizableDetailPanelConfig = {
				featurePrefix: 'myFeature',
				tabs: [
					{ id: 'overview', label: 'Overview' },
					{ id: 'details', label: 'Details' }
				]
			};
			const section = new TestDetailSection(config);

			const html = section.render({});

			expect(html).toContain('id="myFeatureOverviewContent"');
			expect(html).toContain('id="myFeatureDetailsContent"');
		});

		it('should capitalize first letter of tab ID in content container ID', () => {
			const config: ResizableDetailPanelConfig = {
				featurePrefix: 'test',
				tabs: [
					{ id: 'rawData', label: 'Raw Data' }
				]
			};
			const section = new TestDetailSection(config);

			const html = section.render({});

			expect(html).toContain('id="testRawDataContent"');
		});

		it('should mark first tab as active by default', () => {
			const config: ResizableDetailPanelConfig = {
				featurePrefix: 'test',
				tabs: [
					{ id: 'tab1', label: 'Tab 1' },
					{ id: 'tab2', label: 'Tab 2' }
				]
			};
			const section = new TestDetailSection(config);

			const html = section.render({});

			// First tab button should have active class
			const firstTabButton = html.match(/<button[^>]*data-tab="tab1"[^>]*>/)?.[0] ?? '';
			expect(firstTabButton).toContain('class="detail-tab-button active"');

			// First tab panel should have active class
			const firstTabPanel = html.match(/<div[^>]*id="testTab1Content"[^>]*>/)?.[0] ?? '';
			expect(firstTabPanel).toContain('class="detail-tab-panel active"');
		});

		it('should mark explicitly default tab as active', () => {
			const config: ResizableDetailPanelConfig = {
				featurePrefix: 'test',
				tabs: [
					{ id: 'tab1', label: 'Tab 1' },
					{ id: 'tab2', label: 'Tab 2', isDefault: true },
					{ id: 'tab3', label: 'Tab 3' }
				]
			};
			const section = new TestDetailSection(config);

			const html = section.render({});

			// Second tab button should have active class
			const secondTabButton = html.match(/<button[^>]*data-tab="tab2"[^>]*>/)?.[0] ?? '';
			expect(secondTabButton).toContain('class="detail-tab-button active"');

			// Second tab panel should have active class
			const secondTabPanel = html.match(/<div[^>]*id="testTab2Content"[^>]*>/)?.[0] ?? '';
			expect(secondTabPanel).toContain('class="detail-tab-panel active"');

			// First tab should not be active
			const firstTabButton = html.match(/<button[^>]*data-tab="tab1"[^>]*>/)?.[0] ?? '';
			expect(firstTabButton).not.toContain('active');
		});

		it('should escape HTML in tab labels', () => {
			const config: ResizableDetailPanelConfig = {
				featurePrefix: 'test',
				tabs: [{ id: 'tab1', label: '<script>alert("xss")</script>' }]
			};
			const section = new TestDetailSection(config);

			const html = section.render({});

			// Label content should be escaped
			expect(html).toContain('&lt;script&gt;');
			expect(html).not.toContain('><script>alert');
		});

		it('should escape special characters in labels', () => {
			const config: ResizableDetailPanelConfig = {
				featurePrefix: 'test',
				tabs: [{ id: 'tab1', label: 'Tab & "Details" <>' }]
			};
			const section = new TestDetailSection(config);

			const html = section.render({});

			// Only in label content, not in IDs
			const labelMatch = html.match(/>Tab[^<]+</);
			expect(labelMatch?.[0]).toContain('&amp;');
			expect(labelMatch?.[0]).toContain('&quot;');
			expect(labelMatch?.[0]).toContain('&lt;');
			expect(labelMatch?.[0]).toContain('&gt;');
		});

		it('should escape HTML in custom titles and labels', () => {
			const config: ResizableDetailPanelConfig = {
				featurePrefix: 'test',
				tabs: [{ id: 'tab1', label: 'Tab 1' }],
				closeButtonLabel: '<script>xss</script>',
				resizeHandleTitle: '<img src=x>'
			};
			const section = new TestDetailSection(config);

			const html = section.render({});

			// Aria-label and title attributes should be escaped
			expect(html).toContain('aria-label="&lt;script&gt;xss&lt;/script&gt;"');
			expect(html).toContain('title="&lt;img src=x&gt;"');
		});
	});
});
