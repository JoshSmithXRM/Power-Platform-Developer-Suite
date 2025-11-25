import { ExportDropdownSection } from './ExportDropdownSection';
import { SectionPosition } from '../../../../shared/infrastructure/ui/types/SectionPosition';

describe('ExportDropdownSection', () => {
	describe('constructor', () => {
		it('should create section with toolbar position', () => {
			const section = new ExportDropdownSection();

			expect(section.position).toBe(SectionPosition.Toolbar);
		});
	});

	describe('render', () => {
		it('should render dropdown with correct structure', () => {
			const section = new ExportDropdownSection();

			const html = section.render({});

			expect(html).toContain('class="dropdown"');
			expect(html).toContain('data-dropdown-id="exportDropdown"');
			expect(html).toContain('class="dropdown-menu"');
		});

		it('should render dropdown button with export icon', () => {
			const section = new ExportDropdownSection();

			const html = section.render({});

			expect(html).toContain('id="exportDropdown"');
			expect(html).toContain('codicon-export');
			expect(html).toContain('<span class="dropdown-label">Export</span>');
		});

		it('should render dropdown button with chevron icon', () => {
			const section = new ExportDropdownSection();

			const html = section.render({});

			expect(html).toContain('codicon-chevron-down');
		});

		it('should render CSV export option', () => {
			const section = new ExportDropdownSection();

			const html = section.render({});

			expect(html).toContain('data-dropdown-item-id="csv"');
			expect(html).toContain('Export to CSV');
		});

		it('should render JSON export option', () => {
			const section = new ExportDropdownSection();

			const html = section.render({});

			expect(html).toContain('data-dropdown-item-id="json"');
			expect(html).toContain('Export to JSON');
		});

		it('should render both export options in order', () => {
			const section = new ExportDropdownSection();

			const html = section.render({});

			const csvIndex = html.indexOf('data-dropdown-item-id="csv"');
			const jsonIndex = html.indexOf('data-dropdown-item-id="json"');

			expect(csvIndex).toBeGreaterThan(0);
			expect(jsonIndex).toBeGreaterThan(csvIndex);
		});

		it('should render dropdown menu with hidden style', () => {
			const section = new ExportDropdownSection();

			const html = section.render({});

			expect(html).toContain('data-dropdown-menu="exportDropdown"');
			expect(html).toContain('style="display: none;"');
		});

		it('should render dropdown button with default variant', () => {
			const section = new ExportDropdownSection();

			const html = section.render({});

			expect(html).toContain('dropdown-button--default');
		});

		it('should include dropdown trigger attribute', () => {
			const section = new ExportDropdownSection();

			const html = section.render({});

			expect(html).toContain('data-dropdown-trigger="exportDropdown"');
		});

		it('should render dropdown items with correct data attributes', () => {
			const section = new ExportDropdownSection();

			const html = section.render({});

			expect(html).toContain('data-dropdown-id="exportDropdown"');
			expect(html).toContain('data-dropdown-item-id="csv"');
			expect(html).toContain('data-dropdown-item-id="json"');
		});

		it('should not render checkmarks for unselected items', () => {
			const section = new ExportDropdownSection();

			const html = section.render({});

			// No items should be selected by default (ExportDropdownSection doesn't override getCurrentSelectionId)
			const checkmarkCount = (html.match(/✓/g) || []).length;
			expect(checkmarkCount).toBe(0);
		});

		it('should render items without disabled state', () => {
			const section = new ExportDropdownSection();

			const html = section.render({});

			expect(html).not.toContain('data-disabled="true"');
			expect(html).not.toContain('dropdown-item--disabled');
		});

		it('should render items without separator', () => {
			const section = new ExportDropdownSection();

			const html = section.render({});

			expect(html).not.toContain('dropdown-separator');
		});

		it('should escape HTML in dropdown labels', () => {
			const section = new ExportDropdownSection();

			const html = section.render({});

			// Labels should be properly escaped
			expect(html).toContain('Export to CSV');
			expect(html).toContain('Export to JSON');
			expect(html).not.toContain('<script>');
		});
	});
});
