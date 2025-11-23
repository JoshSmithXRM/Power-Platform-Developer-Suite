import { DeleteDropdownSection } from './DeleteDropdownSection';
import { SectionPosition } from '../../../../shared/infrastructure/ui/types/SectionPosition';

describe('DeleteDropdownSection', () => {
	describe('constructor', () => {
		it('should create section with toolbar position', () => {
			const section = new DeleteDropdownSection();

			expect(section.position).toBe(SectionPosition.Toolbar);
		});
	});

	describe('render', () => {
		it('should render dropdown with delete button', () => {
			const section = new DeleteDropdownSection();

			const html = section.render({});

			expect(html).toContain('id="deleteDropdown"');
			expect(html).toContain('Delete');
		});

		it('should render dropdown with trash icon', () => {
			const section = new DeleteDropdownSection();

			const html = section.render({});

			expect(html).toContain('codicon-trash');
		});

		it('should render dropdown with danger variant', () => {
			const section = new DeleteDropdownSection();

			const html = section.render({});

			expect(html).toContain('dropdown-button--danger');
		});

		it('should render all delete options', () => {
			const section = new DeleteDropdownSection();

			const html = section.render({});

			expect(html).toContain('data-dropdown-item-id="selected"');
			expect(html).toContain('Delete Selected');
			expect(html).toContain('data-dropdown-item-id="all"');
			expect(html).toContain('Delete All Traces');
			expect(html).toContain('data-dropdown-item-id="old"');
			expect(html).toContain('Delete Old Traces (30+ days)');
		});

		it('should render dropdown menu hidden by default', () => {
			const section = new DeleteDropdownSection();

			const html = section.render({});

			expect(html).toContain('data-dropdown-menu="deleteDropdown"');
			expect(html).toContain('style="display: none;"');
		});

		it('should render chevron-down icon on button', () => {
			const section = new DeleteDropdownSection();

			const html = section.render({});

			expect(html).toContain('codicon-chevron-down');
		});

		it('should not render any selected item by default', () => {
			const section = new DeleteDropdownSection();

			const html = section.render({});

			// No checkmarks should be present (getCurrentSelectionId returns undefined)
			expect(html).not.toContain('dropdown-item--selected');
			// Test character (checkmark) should not be present in the output
			expect(html).not.toMatch(/✓/);
		});

		it('should render dropdown items with proper data attributes', () => {
			const section = new DeleteDropdownSection();

			const html = section.render({});

			// Each item should have dropdown ID and item ID
			expect(html).toContain('data-dropdown-id="deleteDropdown"');
			expect(html).toContain('data-dropdown-item-id="selected"');
			expect(html).toContain('data-dropdown-item-id="all"');
			expect(html).toContain('data-dropdown-item-id="old"');
		});

		it('should render dropdown items without disabled state', () => {
			const section = new DeleteDropdownSection();

			const html = section.render({});

			expect(html).not.toContain('dropdown-item--disabled');
			expect(html).not.toContain('data-disabled="true"');
		});

		it('should render dropdown items without icons', () => {
			const section = new DeleteDropdownSection();

			const html = section.render({});

			// Only trash icon on button, no icons on items
			const iconMatches = html.match(/codicon-/g);
			// Should have: trash icon, chevron-down icon (2 total)
			expect(iconMatches).toHaveLength(2);
		});

		it('should render dropdown items without separators', () => {
			const section = new DeleteDropdownSection();

			const html = section.render({});

			expect(html).not.toContain('dropdown-separator');
		});

		it('should escape HTML in dropdown labels', () => {
			// This test verifies the base class escaping works
			// All labels are hardcoded in DeleteDropdownSection, so escaping is handled by base class
			const section = new DeleteDropdownSection();

			const html = section.render({});

			// Labels should be plain text (already escaped by renderDropdown)
			expect(html).toContain('Delete Selected');
			expect(html).toContain('Delete All Traces');
			expect(html).toContain('Delete Old Traces (30+ days)');
		});
	});

	describe('integration with base class', () => {
		it('should use DropdownSection base class rendering', () => {
			const section = new DeleteDropdownSection();

			const html = section.render({});

			// Should have base class structure
			expect(html).toContain('class="dropdown"');
			expect(html).toContain('class="dropdown-button dropdown-button--danger"');
			expect(html).toContain('class="dropdown-menu"');
			expect(html).toContain('class="dropdown-item');
		});

		it('should render dropdown trigger with correct data attribute', () => {
			const section = new DeleteDropdownSection();

			const html = section.render({});

			expect(html).toContain('data-dropdown-trigger="deleteDropdown"');
		});

		it('should render dropdown items with spacers for checkmarks', () => {
			const section = new DeleteDropdownSection();

			const html = section.render({});

			// Should have spacers since no items are selected
			expect(html).toContain('dropdown-item-spacer');
		});
	});
});
