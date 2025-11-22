import type { ISection } from '../sections/ISection';
import { SectionPosition } from '../types/SectionPosition';
import { PanelLayout } from '../types/PanelLayout';
import type { SectionRenderData } from '../types/SectionRenderData';

import { SectionCompositionBehavior } from './SectionCompositionBehavior';

// Mock section implementation
class MockSection implements ISection {
	constructor(
		public readonly position: SectionPosition,
		private readonly content: string
	) {}

	render(_data: SectionRenderData): string {
		return this.content;
	}
}

describe('SectionCompositionBehavior', () => {
	describe('constructor', () => {
		it('should create behavior with no sections', () => {
			const behavior = new SectionCompositionBehavior([]);
			expect(behavior).toBeDefined();
		});

		it('should create behavior with single section', () => {
			const section = new MockSection(SectionPosition.Main, '<div>Main</div>');
			const behavior = new SectionCompositionBehavior([section]);
			expect(behavior).toBeDefined();
		});

		it('should create behavior with custom layout', () => {
			const section = new MockSection(SectionPosition.Main, '<div>Main</div>');
			const behavior = new SectionCompositionBehavior([section], PanelLayout.SplitHorizontal);
			expect(behavior).toBeDefined();
		});
	});

	describe('initialize', () => {
		it('should initialize without errors', async () => {
			const behavior = new SectionCompositionBehavior([]);
			await expect(behavior.initialize()).resolves.toBeUndefined();
		});
	});

	describe('compose - SingleColumn layout', () => {
		it('should render empty layout with no sections', () => {
			const behavior = new SectionCompositionBehavior([]);
			const html = behavior.compose({});

			// Testing HTML structure is necessary here because this behavior's purpose
			// is to generate the correct HTML layout structure with specific container classes
			expect(html).toContain('<div class="panel-container">');
			expect(html).toContain('<div class="toolbar-section">');
			expect(html).toContain('<div class="main-section">');
			expect(html).toContain('<div class="footer-section">');
		});

		it('should inject single section in main position', () => {
			const section = new MockSection(SectionPosition.Main, '<div>Main Content</div>');
			const behavior = new SectionCompositionBehavior([section]);
			const html = behavior.compose({});

			expect(html).toContain('<div>Main Content</div>');
			expect(html).toContain('<div class="main-section"><div>Main Content</div>');
		});

		it('should inject section in toolbar position', () => {
			const section = new MockSection(SectionPosition.Toolbar, '<button>Action</button>');
			const behavior = new SectionCompositionBehavior([section]);
			const html = behavior.compose({});

			expect(html).toContain('<button>Action</button>');
			expect(html).toContain('<div class="toolbar-section"><button>Action</button>');
		});

		it('should inject sections in multiple positions', () => {
			const toolbarSection = new MockSection(SectionPosition.Toolbar, '<button>Refresh</button>');
			const mainSection = new MockSection(SectionPosition.Main, '<table></table>');
			const footerSection = new MockSection(SectionPosition.Footer, '<div>Footer</div>');

			const behavior = new SectionCompositionBehavior([toolbarSection, mainSection, footerSection]);
			const html = behavior.compose({});

			expect(html).toContain('<button>Refresh</button>');
			expect(html).toContain('<table></table>');
			expect(html).toContain('<div>Footer</div>');
		});

		it('should inject multiple sections in same position', () => {
			const section1 = new MockSection(SectionPosition.Main, '<div>Section 1</div>');
			const section2 = new MockSection(SectionPosition.Main, '<div>Section 2</div>');

			const behavior = new SectionCompositionBehavior([section1, section2]);
			const html = behavior.compose({});

			expect(html).toContain('<div>Section 1</div>');
			expect(html).toContain('<div>Section 2</div>');
			// Sections should be on separate lines
			expect(html).toMatch(/<div>Section 1<\/div>\s+<div>Section 2<\/div>/);
		});

		it('should pass data to sections during rendering', () => {
			const renderSpy = jest.fn(() => '<div>Rendered</div>');
			const section: ISection = {
				position: SectionPosition.Main,
				render: renderSpy,
			};

			const behavior = new SectionCompositionBehavior([section]);
			const data: SectionRenderData = { tableData: [{ id: '1' }], isLoading: false };
			behavior.compose(data);

			expect(renderSpy).toHaveBeenCalledWith(data);
		});
	});

	describe('compose - SplitHorizontal layout', () => {
		it('should render split-horizontal layout', () => {
			const behavior = new SectionCompositionBehavior([], PanelLayout.SplitHorizontal);
			const html = behavior.compose({});

			expect(html).toContain('<div class="panel-container split-horizontal">');
			expect(html).toContain('<div class="content-split">');
			expect(html).toContain('<div class="main-section">');
			expect(html).toContain('<div class="detail-section hidden">');
		});

		it('should inject main and detail sections in split layout', () => {
			const mainSection = new MockSection(SectionPosition.Main, '<table>Main</table>');
			const detailSection = new MockSection(SectionPosition.Detail, '<div>Detail</div>');

			const behavior = new SectionCompositionBehavior([mainSection, detailSection], PanelLayout.SplitHorizontal);
			const html = behavior.compose({});

			expect(html).toContain('<table>Main</table>');
			expect(html).toContain('<div>Detail</div>');
			expect(html).toContain('<div class="content-split">');
		});
	});

	describe('compose - SplitVertical layout', () => {
		it('should render split-vertical layout', () => {
			const behavior = new SectionCompositionBehavior([], PanelLayout.SplitVertical);
			const html = behavior.compose({});

			expect(html).toContain('<div class="panel-container split-vertical">');
			expect(html).toContain('<div class="main-section">');
			expect(html).toContain('<div class="detail-section hidden">');
			// In vertical layout, sections are stacked, not side-by-side
			expect(html).not.toContain('<div class="content-split">');
		});

		it('should inject sections in vertical split layout', () => {
			const mainSection = new MockSection(SectionPosition.Main, '<table>Main</table>');
			const detailSection = new MockSection(SectionPosition.Detail, '<div>Detail</div>');

			const behavior = new SectionCompositionBehavior([mainSection, detailSection], PanelLayout.SplitVertical);
			const html = behavior.compose({});

			expect(html).toContain('<table>Main</table>');
			expect(html).toContain('<div>Detail</div>');
		});
	});

	describe('compose - All section positions', () => {
		it('should handle all section positions', () => {
			const sections = [
				new MockSection(SectionPosition.Toolbar, '<toolbar/>'),
				new MockSection(SectionPosition.Header, '<header/>'),
				new MockSection(SectionPosition.Filters, '<filters/>'),
				new MockSection(SectionPosition.Main, '<main/>'),
				new MockSection(SectionPosition.Detail, '<detail/>'),
				new MockSection(SectionPosition.Footer, '<footer/>'),
			];

			const behavior = new SectionCompositionBehavior(sections);
			const html = behavior.compose({});

			expect(html).toContain('<toolbar/>');
			expect(html).toContain('<header/>');
			expect(html).toContain('<filters/>');
			expect(html).toContain('<main/>');
			expect(html).toContain('<footer/>');
		});
	});
});
