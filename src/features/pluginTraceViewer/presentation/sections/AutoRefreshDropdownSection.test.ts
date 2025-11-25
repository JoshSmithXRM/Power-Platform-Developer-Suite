import { AutoRefreshDropdownSection } from './AutoRefreshDropdownSection';
import { SectionPosition } from '../../../../shared/infrastructure/ui/types/SectionPosition';

describe('AutoRefreshDropdownSection', () => {
	describe('constructor', () => {
		it('should create section with toolbar position', () => {
			const section = new AutoRefreshDropdownSection();

			expect(section.position).toBe(SectionPosition.Toolbar);
		});
	});

	describe('render', () => {
		it('should render dropdown HTML structure with correct ID', () => {
			const section = new AutoRefreshDropdownSection();

			const html = section.render({});

			expect(html).toContain('id="autoRefreshDropdown"');
			expect(html).toContain('data-dropdown-id="autoRefreshDropdown"');
		});

		it('should render refresh icon in button', () => {
			const section = new AutoRefreshDropdownSection();

			const html = section.render({});

			expect(html).toContain('codicon-refresh');
		});

		it('should render all four interval options with correct IDs', () => {
			const section = new AutoRefreshDropdownSection();

			const html = section.render({});

			expect(html).toContain('data-dropdown-item-id="0"');
			expect(html).toContain('data-dropdown-item-id="10"');
			expect(html).toContain('data-dropdown-item-id="30"');
			expect(html).toContain('data-dropdown-item-id="60"');
		});

		it('should render all interval options with correct labels', () => {
			const section = new AutoRefreshDropdownSection();

			const html = section.render({});

			expect(html).toContain('Off');
			expect(html).toContain('Every 10 seconds');
			expect(html).toContain('Every 30 seconds');
			expect(html).toContain('Every 60 seconds');
		});

		it('should show "..." as button label when no state is provided', () => {
			const section = new AutoRefreshDropdownSection();

			const html = section.render({});

			expect(html).toContain('Auto-Refresh: ...');
		});

		it('should show "Off" as button label when autoRefreshInterval is 0', () => {
			const section = new AutoRefreshDropdownSection();

			const html = section.render({
				state: { autoRefreshInterval: 0 }
			});

			expect(html).toContain('Auto-Refresh: Off');
		});

		it('should show "10s" as button label when autoRefreshInterval is 10', () => {
			const section = new AutoRefreshDropdownSection();

			const html = section.render({
				state: { autoRefreshInterval: 10 }
			});

			expect(html).toContain('Auto-Refresh: 10s');
		});

		it('should show "30s" as button label when autoRefreshInterval is 30', () => {
			const section = new AutoRefreshDropdownSection();

			const html = section.render({
				state: { autoRefreshInterval: 30 }
			});

			expect(html).toContain('Auto-Refresh: 30s');
		});

		it('should show "60s" as button label when autoRefreshInterval is 60', () => {
			const section = new AutoRefreshDropdownSection();

			const html = section.render({
				state: { autoRefreshInterval: 60 }
			});

			expect(html).toContain('Auto-Refresh: 60s');
		});

		it('should mark "Off" option as selected when autoRefreshInterval is 0', () => {
			const section = new AutoRefreshDropdownSection();

			const html = section.render({
				state: { autoRefreshInterval: 0 }
			});

			// Check for checkmark indicator (✓) in the Off option
			const offOptionMatch = html.match(/data-dropdown-item-id="0"[^>]*>([\s\S]*?)<\/div>/);
			expect(offOptionMatch).toBeDefined();
			expect(offOptionMatch![0]).toContain('✓');
		});

		it('should mark "10 seconds" option as selected when autoRefreshInterval is 10', () => {
			const section = new AutoRefreshDropdownSection();

			const html = section.render({
				state: { autoRefreshInterval: 10 }
			});

			// Check for checkmark indicator in the 10s option
			const tenSecOptionMatch = html.match(/data-dropdown-item-id="10"[^>]*>([\s\S]*?)<\/div>/);
			expect(tenSecOptionMatch).toBeDefined();
			expect(tenSecOptionMatch![0]).toContain('✓');
		});

		it('should mark "30 seconds" option as selected when autoRefreshInterval is 30', () => {
			const section = new AutoRefreshDropdownSection();

			const html = section.render({
				state: { autoRefreshInterval: 30 }
			});

			// Check for checkmark indicator in the 30s option
			const thirtySecOptionMatch = html.match(/data-dropdown-item-id="30"[^>]*>([\s\S]*?)<\/div>/);
			expect(thirtySecOptionMatch).toBeDefined();
			expect(thirtySecOptionMatch![0]).toContain('✓');
		});

		it('should mark "60 seconds" option as selected when autoRefreshInterval is 60', () => {
			const section = new AutoRefreshDropdownSection();

			const html = section.render({
				state: { autoRefreshInterval: 60 }
			});

			// Check for checkmark indicator in the 60s option
			const sixtySecOptionMatch = html.match(/data-dropdown-item-id="60"[^>]*>([\s\S]*?)<\/div>/);
			expect(sixtySecOptionMatch).toBeDefined();
			expect(sixtySecOptionMatch![0]).toContain('✓');
		});

		it('should not mark any option as selected when no state is provided', () => {
			const section = new AutoRefreshDropdownSection();

			const html = section.render({});

			// Count checkmarks - there should be no selected items
			const checkmarks = html.match(/✓/g);
			expect(checkmarks).toBeNull();
		});

		it('should handle state with missing autoRefreshInterval property', () => {
			const section = new AutoRefreshDropdownSection();

			const html = section.render({
				state: {}
			});

			expect(html).toContain('Auto-Refresh: ...');
		});

		it('should render dropdown button with default variant', () => {
			const section = new AutoRefreshDropdownSection();

			const html = section.render({});

			expect(html).toContain('dropdown-button--default');
		});

		it('should render dropdown menu initially hidden', () => {
			const section = new AutoRefreshDropdownSection();

			const html = section.render({});

			expect(html).toContain('style="display: none;"');
		});

		it('should render chevron-down icon in button', () => {
			const section = new AutoRefreshDropdownSection();

			const html = section.render({});

			expect(html).toContain('codicon-chevron-down');
		});

		it('should persist state across multiple renders', () => {
			const section = new AutoRefreshDropdownSection();

			// First render with state
			section.render({
				state: { autoRefreshInterval: 30 }
			});

			// Second render without state - should preserve previous state
			const html = section.render({});

			expect(html).toContain('Auto-Refresh: 30s');
		});

		it('should update state when new autoRefreshInterval is provided', () => {
			const section = new AutoRefreshDropdownSection();

			// First render
			section.render({
				state: { autoRefreshInterval: 10 }
			});

			// Second render with different state
			const html = section.render({
				state: { autoRefreshInterval: 60 }
			});

			expect(html).toContain('Auto-Refresh: 60s');
		});
	});
});
