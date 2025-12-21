import { DropdownSection } from './DropdownSection';
import type { DropdownItem } from '../types/DropdownTypes';
import { SectionPosition } from '../types/SectionPosition';

/**
 * Test implementation of DropdownSection for testing base class.
 */
class TestDropdownSection extends DropdownSection {
	constructor(
		dropdownId: string,
		icon?: string,
		private readonly items: ReadonlyArray<DropdownItem> = [],
		private readonly buttonLabel = 'Test Dropdown',
		private readonly currentSelectionId?: string,
		private readonly variant: 'default' | 'primary' | 'danger' = 'default'
	) {
		super(dropdownId, icon);
	}

	protected getDropdownItems(): ReadonlyArray<DropdownItem> {
		return this.items;
	}

	protected getButtonLabel(): string {
		return this.buttonLabel;
	}

	protected getCurrentSelectionId(): string | undefined {
		return this.currentSelectionId;
	}

	protected getButtonVariant(): 'default' | 'primary' | 'danger' {
		return this.variant;
	}
}

describe('DropdownSection', () => {
	describe('constructor and position', () => {
		it('should set position to Toolbar', () => {
			const section = new TestDropdownSection('testDropdown');

			expect(section.position).toBe(SectionPosition.Toolbar);
		});

		it('should accept dropdown ID without icon', () => {
			const section = new TestDropdownSection('myDropdown');

			const html = section.render({});

			expect(html).toContain('id="myDropdown"');
		});

		it('should accept dropdown ID with icon', () => {
			const section = new TestDropdownSection('myDropdown', 'settings-gear');

			const html = section.render({});

			expect(html).toContain('id="myDropdown"');
			expect(html).toContain('codicon-settings-gear');
		});
	});

	describe('dropdown HTML structure generation', () => {
		it('should generate dropdown container with correct class', () => {
			const section = new TestDropdownSection('testDropdown');

			const html = section.render({});

			expect(html).toContain('class="dropdown"');
			expect(html).toContain('data-dropdown-id="testDropdown"');
		});

		it('should generate dropdown button with correct ID', () => {
			const section = new TestDropdownSection('testDropdown');

			const html = section.render({});

			expect(html).toContain('id="testDropdown"');
			expect(html).toContain('data-dropdown-trigger="testDropdown"');
		});

		it('should generate dropdown menu with correct data attribute', () => {
			const section = new TestDropdownSection('testDropdown');

			const html = section.render({});

			expect(html).toContain('data-dropdown-menu="testDropdown"');
			expect(html).toContain('class="dropdown-menu"');
		});

		it('should render dropdown menu hidden by default', () => {
			const section = new TestDropdownSection('testDropdown');

			const html = section.render({});

			expect(html).toContain('style="display: none;"');
		});

		it('should render button label from getButtonLabel', () => {
			const section = new TestDropdownSection('testDropdown', undefined, [], 'Custom Button Label');

			const html = section.render({});

			expect(html).toContain('Custom Button Label');
			expect(html).toContain('class="dropdown-label"');
		});

		it('should render chevron-down icon on button', () => {
			const section = new TestDropdownSection('testDropdown');

			const html = section.render({});

			expect(html).toContain('codicon-chevron-down');
		});
	});

	describe('option rendering with custom IDs', () => {
		it('should render single option with custom ID', () => {
			const items: DropdownItem[] = [
				{ id: 'option1', label: 'Option 1' }
			];
			const section = new TestDropdownSection('testDropdown', undefined, items);

			const html = section.render({});

			expect(html).toContain('data-dropdown-item-id="option1"');
		});

		it('should render multiple options with different custom IDs', () => {
			const items: DropdownItem[] = [
				{ id: 'first', label: 'First Option' },
				{ id: 'second', label: 'Second Option' },
				{ id: 'third', label: 'Third Option' }
			];
			const section = new TestDropdownSection('testDropdown', undefined, items);

			const html = section.render({});

			expect(html).toContain('data-dropdown-item-id="first"');
			expect(html).toContain('data-dropdown-item-id="second"');
			expect(html).toContain('data-dropdown-item-id="third"');
		});

		it('should render dropdown ID on each option', () => {
			const items: DropdownItem[] = [
				{ id: 'option1', label: 'Option 1' },
				{ id: 'option2', label: 'Option 2' }
			];
			const section = new TestDropdownSection('myDropdown', undefined, items);

			const html = section.render({});

			const dropdownIdMatches = html.match(/data-dropdown-id="myDropdown"/g);
			expect(dropdownIdMatches).toBeDefined();
			// Should appear on: container, each item (2 items = 3 total)
			expect(dropdownIdMatches!.length).toBeGreaterThanOrEqual(3);
		});
	});

	describe('option rendering with custom labels', () => {
		it('should render option with custom label', () => {
			const items: DropdownItem[] = [
				{ id: 'opt1', label: 'My Custom Label' }
			];
			const section = new TestDropdownSection('testDropdown', undefined, items);

			const html = section.render({});

			expect(html).toContain('My Custom Label');
			expect(html).toContain('class="dropdown-item-label"');
		});

		it('should render multiple options with different labels', () => {
			const items: DropdownItem[] = [
				{ id: 'opt1', label: 'First Label' },
				{ id: 'opt2', label: 'Second Label' },
				{ id: 'opt3', label: 'Third Label' }
			];
			const section = new TestDropdownSection('testDropdown', undefined, items);

			const html = section.render({});

			expect(html).toContain('First Label');
			expect(html).toContain('Second Label');
			expect(html).toContain('Third Label');
		});

		it('should wrap labels in dropdown-item-label span', () => {
			const items: DropdownItem[] = [
				{ id: 'opt1', label: 'Test Label' }
			];
			const section = new TestDropdownSection('testDropdown', undefined, items);

			const html = section.render({});

			expect(html).toContain('<span class="dropdown-item-label">Test Label</span>');
		});
	});

	describe('selected state handling', () => {
		it('should highlight selected option with selected class', () => {
			const items: DropdownItem[] = [
				{ id: 'opt1', label: 'Option 1' },
				{ id: 'opt2', label: 'Option 2' }
			];
			const section = new TestDropdownSection('testDropdown', undefined, items, 'Test', 'opt2');

			const html = section.render({});

			const selectedOption = html.match(/<div[^>]*data-dropdown-item-id="opt2"[^>]*>/);
			expect(selectedOption).toBeDefined();
			expect(selectedOption![0]).toContain('dropdown-item--selected');
		});

		it('should show checkmark for selected option', () => {
			const items: DropdownItem[] = [
				{ id: 'opt1', label: 'Option 1' },
				{ id: 'opt2', label: 'Option 2' }
			];
			const section = new TestDropdownSection('testDropdown', undefined, items, 'Test', 'opt2');

			const html = section.render({});

			const opt2Section = html.match(/<div[^>]*data-dropdown-item-id="opt2"[^>]*>[\s\S]*?<\/div>/);
			expect(opt2Section).toBeDefined();
			expect(opt2Section![0]).toContain('✓');
		});

		it('should not show checkmark for unselected options', () => {
			const items: DropdownItem[] = [
				{ id: 'opt1', label: 'Option 1' },
				{ id: 'opt2', label: 'Option 2' }
			];
			const section = new TestDropdownSection('testDropdown', undefined, items, 'Test', 'opt2');

			const html = section.render({});

			const opt1Section = html.match(/<div[^>]*data-dropdown-item-id="opt1"[^>]*>[\s\S]*?<\/div>/);
			expect(opt1Section).toBeDefined();
			expect(opt1Section![0]).not.toContain('✓');
			expect(opt1Section![0]).toContain('dropdown-item-spacer');
		});

		it('should handle no selection (all options unselected)', () => {
			const items: DropdownItem[] = [
				{ id: 'opt1', label: 'Option 1' },
				{ id: 'opt2', label: 'Option 2' }
			];
			const section = new TestDropdownSection('testDropdown', undefined, items, 'Test', undefined);

			const html = section.render({});

			expect(html).not.toContain('dropdown-item--selected');
			expect(html).not.toContain('✓');
			// Action menus (no currentSelectionId) should NOT have spacers
			expect(html).not.toContain('dropdown-item-spacer');
		});
	});

	describe('multiple options rendering', () => {
		it('should render multiple options in correct order', () => {
			const items: DropdownItem[] = [
				{ id: 'first', label: 'First' },
				{ id: 'second', label: 'Second' },
				{ id: 'third', label: 'Third' }
			];
			const section = new TestDropdownSection('testDropdown', undefined, items);

			const html = section.render({});

			const firstIndex = html.indexOf('data-dropdown-item-id="first"');
			const secondIndex = html.indexOf('data-dropdown-item-id="second"');
			const thirdIndex = html.indexOf('data-dropdown-item-id="third"');

			expect(firstIndex).toBeGreaterThan(0);
			expect(secondIndex).toBeGreaterThan(firstIndex);
			expect(thirdIndex).toBeGreaterThan(secondIndex);
		});

		it('should render each option with dropdown-item class', () => {
			const items: DropdownItem[] = [
				{ id: 'opt1', label: 'Option 1' },
				{ id: 'opt2', label: 'Option 2' },
				{ id: 'opt3', label: 'Option 3' }
			];
			const section = new TestDropdownSection('testDropdown', undefined, items);

			const html = section.render({});

			const itemMatches = html.match(/<div[^>]*class="dropdown-item/g);
			expect(itemMatches).toBeDefined();
			expect(itemMatches!.length).toBe(3);
		});
	});

	describe('empty options array edge case', () => {
		it('should render dropdown with no items when empty array provided', () => {
			const section = new TestDropdownSection('testDropdown', undefined, []);

			const html = section.render({});

			expect(html).toContain('class="dropdown"');
			expect(html).toContain('class="dropdown-menu"');
			expect(html).not.toContain('dropdown-item');
		});

		it('should still render button and menu structure with empty items', () => {
			const section = new TestDropdownSection('testDropdown', undefined, [], 'Empty Dropdown');

			const html = section.render({});

			expect(html).toContain('Empty Dropdown');
			expect(html).toContain('data-dropdown-trigger="testDropdown"');
			expect(html).toContain('data-dropdown-menu="testDropdown"');
		});
	});

	describe('custom attributes on options', () => {
		it('should render disabled attribute when option is disabled', () => {
			const items: DropdownItem[] = [
				{ id: 'opt1', label: 'Enabled Option' },
				{ id: 'opt2', label: 'Disabled Option', disabled: true }
			];
			const section = new TestDropdownSection('testDropdown', undefined, items);

			const html = section.render({});

			expect(html).toContain('data-disabled="true"');
		});

		it('should render disabled class when option is disabled', () => {
			const items: DropdownItem[] = [
				{ id: 'opt1', label: 'Disabled Option', disabled: true }
			];
			const section = new TestDropdownSection('testDropdown', undefined, items);

			const html = section.render({});

			const disabledOption = html.match(/<div[^>]*data-dropdown-item-id="opt1"[^>]*>/);
			expect(disabledOption).toBeDefined();
			expect(disabledOption![0]).toContain('dropdown-item--disabled');
		});

		it('should not render disabled attributes for enabled options', () => {
			const items: DropdownItem[] = [
				{ id: 'opt1', label: 'Enabled Option', disabled: false }
			];
			const section = new TestDropdownSection('testDropdown', undefined, items);

			const html = section.render({});

			const enabledOption = html.match(/<div[^>]*data-dropdown-item-id="opt1"[^>]*>/);
			expect(enabledOption).toBeDefined();
			expect(enabledOption![0]).not.toContain('data-disabled="true"');
			expect(enabledOption![0]).not.toContain('dropdown-item--disabled');
		});

		it('should render separator when separator is true', () => {
			const items: DropdownItem[] = [
				{ id: 'opt1', label: 'Option 1' },
				{ id: 'sep1', label: '', separator: true },
				{ id: 'opt2', label: 'Option 2' }
			];
			const section = new TestDropdownSection('testDropdown', undefined, items);

			const html = section.render({});

			expect(html).toContain('class="dropdown-separator"');
		});

		it('should render icon when icon is provided', () => {
			const items: DropdownItem[] = [
				{ id: 'opt1', label: 'Option with Icon', icon: 'file' }
			];
			const section = new TestDropdownSection('testDropdown', undefined, items);

			const html = section.render({});

			expect(html).toContain('codicon-file');
		});

		it('should not render icon element when icon is not provided', () => {
			const items: DropdownItem[] = [
				{ id: 'opt1', label: 'Option without Icon' }
			];
			const section = new TestDropdownSection('testDropdown', undefined, items);

			const html = section.render({});

			const opt1Section = html.match(/<div[^>]*data-dropdown-item-id="opt1"[^>]*>[\s\S]*?<\/div>/);
			expect(opt1Section).toBeDefined();
			// Should only have codicon for checkmark spacer, not for item icon
			const codiconMatches = opt1Section![0].match(/codicon/g);
			expect(codiconMatches).toBeNull();
		});
	});

	describe('dropdown container classes', () => {
		it('should render default variant class', () => {
			const section = new TestDropdownSection('testDropdown', undefined, [], 'Test', undefined, 'default');

			const html = section.render({});

			expect(html).toContain('dropdown-button--default');
		});

		it('should render primary variant class', () => {
			const section = new TestDropdownSection('testDropdown', undefined, [], 'Test', undefined, 'primary');

			const html = section.render({});

			expect(html).toContain('dropdown-button--primary');
		});

		it('should render danger variant class', () => {
			const section = new TestDropdownSection('testDropdown', undefined, [], 'Test', undefined, 'danger');

			const html = section.render({});

			expect(html).toContain('dropdown-button--danger');
		});

		it('should render base dropdown-button class with variant', () => {
			const section = new TestDropdownSection('testDropdown', undefined, [], 'Test', undefined, 'primary');

			const html = section.render({});

			expect(html).toContain('class="dropdown-button dropdown-button--primary"');
		});
	});

	describe('option value attributes', () => {
		it('should render data-dropdown-id attribute on each option', () => {
			const items: DropdownItem[] = [
				{ id: 'opt1', label: 'Option 1' }
			];
			const section = new TestDropdownSection('myDropdown', undefined, items);

			const html = section.render({});

			const optionMatch = html.match(/<div[^>]*data-dropdown-item-id="opt1"[^>]*>/);
			expect(optionMatch).toBeDefined();
			expect(optionMatch![0]).toContain('data-dropdown-id="myDropdown"');
		});

		it('should render data-dropdown-item-id attribute for each option', () => {
			const items: DropdownItem[] = [
				{ id: 'customId', label: 'Custom Option' }
			];
			const section = new TestDropdownSection('testDropdown', undefined, items);

			const html = section.render({});

			expect(html).toContain('data-dropdown-item-id="customId"');
		});
	});

	describe('label-value pairs', () => {
		it('should render different ID and label correctly', () => {
			const items: DropdownItem[] = [
				{ id: 'internalId', label: 'User Friendly Label' }
			];
			const section = new TestDropdownSection('testDropdown', undefined, items);

			const html = section.render({});

			expect(html).toContain('data-dropdown-item-id="internalId"');
			expect(html).toContain('User Friendly Label');
		});

		it('should support numeric-like IDs with text labels', () => {
			const items: DropdownItem[] = [
				{ id: '0', label: 'Off (No tracing)' },
				{ id: '1', label: 'Exception (Errors only)' },
				{ id: '2', label: 'All (Performance impact)' }
			];
			const section = new TestDropdownSection('testDropdown', undefined, items);

			const html = section.render({});

			expect(html).toContain('data-dropdown-item-id="0"');
			expect(html).toContain('Off (No tracing)');
			expect(html).toContain('data-dropdown-item-id="1"');
			expect(html).toContain('Exception (Errors only)');
			expect(html).toContain('data-dropdown-item-id="2"');
			expect(html).toContain('All (Performance impact)');
		});
	});

	describe('special characters in labels (XSS prevention)', () => {
		it('should escape HTML script tags in labels', () => {
			const items: DropdownItem[] = [
				{ id: 'xss', label: '<script>alert("xss")</script>' }
			];
			const section = new TestDropdownSection('testDropdown', undefined, items);

			const html = section.render({});

			expect(html).toContain('&lt;script&gt;');
			expect(html).not.toContain('<script>alert("xss")</script>');
		});

		it('should escape HTML entities in labels', () => {
			const items: DropdownItem[] = [
				{ id: 'entities', label: 'Label with & " < > characters' }
			];
			const section = new TestDropdownSection('testDropdown', undefined, items);

			const html = section.render({});

			const labelMatch = html.match(/<span class="dropdown-item-label">[^<]+<\/span>/);
			expect(labelMatch).toBeDefined();
			expect(labelMatch![0]).toContain('&amp;');
			expect(labelMatch![0]).toContain('&quot;');
			expect(labelMatch![0]).toContain('&lt;');
			expect(labelMatch![0]).toContain('&gt;');
		});

		it('should escape special characters in button label', () => {
			const section = new TestDropdownSection('testDropdown', undefined, [], 'Button & "Label" <>');

			const html = section.render({});

			const buttonLabelMatch = html.match(/<span class="dropdown-label">[^<]+<\/span>/);
			expect(buttonLabelMatch).toBeDefined();
			expect(buttonLabelMatch![0]).toContain('&amp;');
			expect(buttonLabelMatch![0]).toContain('&quot;');
			expect(buttonLabelMatch![0]).toContain('&lt;');
			expect(buttonLabelMatch![0]).toContain('&gt;');
		});

		it('should escape special characters in dropdown ID', () => {
			const section = new TestDropdownSection('test<script>Dropdown', undefined, []);

			const html = section.render({});

			expect(html).toContain('id="test&lt;script&gt;Dropdown"');
			expect(html).not.toContain('id="test<script>Dropdown"');
		});

		it('should escape special characters in option IDs', () => {
			const items: DropdownItem[] = [
				{ id: 'id<script>xss', label: 'Test' }
			];
			const section = new TestDropdownSection('testDropdown', undefined, items);

			const html = section.render({});

			expect(html).toContain('data-dropdown-item-id="id&lt;script&gt;xss"');
		});

		it('should escape special characters in icon names', () => {
			const section = new TestDropdownSection('testDropdown', 'icon<script>');

			const html = section.render({});

			expect(html).toContain('codicon-icon&lt;script&gt;');
		});

		it('should escape special characters in item icon names', () => {
			const items: DropdownItem[] = [
				{ id: 'opt1', label: 'Test', icon: 'icon<xss>' }
			];
			const section = new TestDropdownSection('testDropdown', undefined, items);

			const html = section.render({});

			expect(html).toContain('codicon-icon&lt;xss&gt;');
		});
	});

	describe('null/undefined option handling', () => {
		it('should handle undefined icon gracefully', () => {
			const section = new TestDropdownSection('testDropdown', undefined);

			const html = section.render({});

			expect(html).toContain('class="dropdown"');
			// Should not have icon span on button
			const buttonMatch = html.match(/<button[^>]*>[\s\S]*?<\/button>/);
			expect(buttonMatch).toBeDefined();
			expect(buttonMatch![0]).not.toContain('codicon-undefined');
		});

		it('should handle option without icon property', () => {
			const items: DropdownItem[] = [
				{ id: 'opt1', label: 'No Icon' }
			];
			const section = new TestDropdownSection('testDropdown', undefined, items);

			const html = section.render({});

			const optionMatch = html.match(/<div[^>]*data-dropdown-item-id="opt1"[^>]*>[\s\S]*?<\/div>/);
			expect(optionMatch).toBeDefined();
			// Should not have item icon span
			expect(optionMatch![0]).not.toContain('codicon-undefined');
		});

		it('should handle option without disabled property (defaults to false)', () => {
			const items: DropdownItem[] = [
				{ id: 'opt1', label: 'Not Disabled' }
			];
			const section = new TestDropdownSection('testDropdown', undefined, items);

			const html = section.render({});

			expect(html).not.toContain('dropdown-item--disabled');
			expect(html).not.toContain('data-disabled="true"');
		});

		it('should handle option without separator property (defaults to false)', () => {
			const items: DropdownItem[] = [
				{ id: 'opt1', label: 'Regular Item' }
			];
			const section = new TestDropdownSection('testDropdown', undefined, items);

			const html = section.render({});

			expect(html).not.toContain('dropdown-separator');
		});

		it('should handle getCurrentSelectionId returning undefined', () => {
			const items: DropdownItem[] = [
				{ id: 'opt1', label: 'Option 1' }
			];
			const section = new TestDropdownSection('testDropdown', undefined, items, 'Test', undefined);

			const html = section.render({});

			expect(html).not.toContain('dropdown-item--selected');
			// Action menus (no currentSelectionId) should NOT have spacers
			expect(html).not.toContain('dropdown-item-spacer');
		});
	});

	describe('render method behavior', () => {
		it('should ignore SectionRenderData parameter (base class does not use it)', () => {
			const items: DropdownItem[] = [
				{ id: 'opt1', label: 'Option 1' }
			];
			const section = new TestDropdownSection('testDropdown', undefined, items);

			const html1 = section.render({});
			const html2 = section.render({ state: { someData: 'test' } });

			// Both should produce same output since base class ignores data
			expect(html1).toContain('data-dropdown-item-id="opt1"');
			expect(html2).toContain('data-dropdown-item-id="opt1"');
		});

		it('should call abstract methods during render', () => {
			const items: DropdownItem[] = [
				{ id: 'opt1', label: 'Option 1' }
			];
			const section = new TestDropdownSection(
				'testDropdown',
				'gear',
				items,
				'Custom Label',
				'opt1',
				'primary'
			);

			const html = section.render({});

			// Should have called getDropdownItems()
			expect(html).toContain('data-dropdown-item-id="opt1"');
			// Should have called getButtonLabel()
			expect(html).toContain('Custom Label');
			// Should have called getCurrentSelectionId()
			expect(html).toContain('dropdown-item--selected');
			// Should have called getButtonVariant()
			expect(html).toContain('dropdown-button--primary');
			// Should have used icon from constructor
			expect(html).toContain('codicon-gear');
		});
	});
});
