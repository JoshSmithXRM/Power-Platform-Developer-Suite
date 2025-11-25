import { TraceLevelDropdownSection } from './TraceLevelDropdownSection';
import { SectionPosition } from '../../../../shared/infrastructure/ui/types/SectionPosition';

describe('TraceLevelDropdownSection', () => {
	describe('constructor', () => {
		it('should create section with toolbar position', () => {
			const section = new TraceLevelDropdownSection();

			expect(section.position).toBe(SectionPosition.Toolbar);
		});
	});

	describe('render', () => {
		it('should render dropdown with all trace level options', () => {
			const section = new TraceLevelDropdownSection();

			const html = section.render({});

			expect(html).toContain('id="traceLevelDropdown"');
			expect(html).toContain('data-dropdown-id="traceLevelDropdown"');
			expect(html).toContain('Off (No tracing)');
			expect(html).toContain('Exception (Errors only)');
			expect(html).toContain('All (Performance impact)');
		});

		it('should render dropdown with settings-gear icon', () => {
			const section = new TraceLevelDropdownSection();

			const html = section.render({});

			expect(html).toContain('codicon-settings-gear');
		});

		it('should render dropdown items with correct IDs', () => {
			const section = new TraceLevelDropdownSection();

			const html = section.render({});

			expect(html).toContain('data-dropdown-item-id="0"');
			expect(html).toContain('data-dropdown-item-id="1"');
			expect(html).toContain('data-dropdown-item-id="2"');
		});

		it('should render button label with "..." when no trace level is set', () => {
			const section = new TraceLevelDropdownSection();

			const html = section.render({});

			expect(html).toContain('Trace Level: ...');
		});

		it('should render button label with "Off" when trace level is 0', () => {
			const section = new TraceLevelDropdownSection();

			const html = section.render({
				state: { traceLevel: 0 }
			});

			expect(html).toContain('Trace Level: Off');
		});

		it('should render button label with "Exception" when trace level is 1', () => {
			const section = new TraceLevelDropdownSection();

			const html = section.render({
				state: { traceLevel: 1 }
			});

			expect(html).toContain('Trace Level: Exception');
		});

		it('should render button label with "All" when trace level is 2', () => {
			const section = new TraceLevelDropdownSection();

			const html = section.render({
				state: { traceLevel: 2 }
			});

			expect(html).toContain('Trace Level: All');
		});

		it('should mark Off option as selected when trace level is 0', () => {
			const section = new TraceLevelDropdownSection();

			const html = section.render({
				state: { traceLevel: 0 }
			});

			const offOption = html.match(/<div[^>]*data-dropdown-item-id="0"[^>]*>/);
			expect(offOption).toBeDefined();
			expect(offOption![0]).toContain('dropdown-item--selected');
		});

		it('should mark Exception option as selected when trace level is 1', () => {
			const section = new TraceLevelDropdownSection();

			const html = section.render({
				state: { traceLevel: 1 }
			});

			const exceptionOption = html.match(/<div[^>]*data-dropdown-item-id="1"[^>]*>/);
			expect(exceptionOption).toBeDefined();
			expect(exceptionOption![0]).toContain('dropdown-item--selected');
		});

		it('should mark All option as selected when trace level is 2', () => {
			const section = new TraceLevelDropdownSection();

			const html = section.render({
				state: { traceLevel: 2 }
			});

			const allOption = html.match(/<div[^>]*data-dropdown-item-id="2"[^>]*>/);
			expect(allOption).toBeDefined();
			expect(allOption![0]).toContain('dropdown-item--selected');
		});

		it('should show checkmark for selected option', () => {
			const section = new TraceLevelDropdownSection();

			const html = section.render({
				state: { traceLevel: 1 }
			});

			const exceptionOptionMatch = html.match(
				/<div[^>]*data-dropdown-item-id="1"[^>]*>[\s\S]*?<\/div>/
			);
			expect(exceptionOptionMatch).toBeDefined();
			expect(exceptionOptionMatch![0]).toContain('✓');
		});

		it('should not show checkmark for unselected options', () => {
			const section = new TraceLevelDropdownSection();

			const html = section.render({
				state: { traceLevel: 1 }
			});

			const offOptionMatch = html.match(
				/<div[^>]*data-dropdown-item-id="0"[^>]*>[\s\S]*?<\/div>/
			);
			expect(offOptionMatch).toBeDefined();
			expect(offOptionMatch![0]).not.toContain('✓');
		});

		it('should handle missing state property in data', () => {
			const section = new TraceLevelDropdownSection();

			const html = section.render({});

			expect(html).toContain('Trace Level: ...');
			expect(html).toContain('Off (No tracing)');
		});

		it('should handle missing traceLevel property in state', () => {
			const section = new TraceLevelDropdownSection();

			const html = section.render({
				state: {}
			});

			expect(html).toContain('Trace Level: ...');
		});

		it('should update state across multiple render calls', () => {
			const section = new TraceLevelDropdownSection();

			const html1 = section.render({
				state: { traceLevel: 0 }
			});
			expect(html1).toContain('Trace Level: Off');

			const html2 = section.render({
				state: { traceLevel: 2 }
			});
			expect(html2).toContain('Trace Level: All');
		});

		it('should render dropdown menu hidden by default', () => {
			const section = new TraceLevelDropdownSection();

			const html = section.render({});

			expect(html).toContain('data-dropdown-menu="traceLevelDropdown"');
			expect(html).toContain('style="display: none;"');
		});

		it('should render chevron icon on dropdown button', () => {
			const section = new TraceLevelDropdownSection();

			const html = section.render({});

			expect(html).toContain('codicon-chevron-down');
		});

		it('should render all three options in correct order', () => {
			const section = new TraceLevelDropdownSection();

			const html = section.render({});

			const offIndex = html.indexOf('Off (No tracing)');
			const exceptionIndex = html.indexOf('Exception (Errors only)');
			const allIndex = html.indexOf('All (Performance impact)');

			expect(offIndex).toBeGreaterThan(0);
			expect(exceptionIndex).toBeGreaterThan(offIndex);
			expect(allIndex).toBeGreaterThan(exceptionIndex);
		});
	});
});
