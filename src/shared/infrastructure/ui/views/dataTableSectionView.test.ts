import type { DataTableConfig } from '../DataTablePanel';

import { renderDataTableSection } from './dataTableSectionView';

describe('dataTableSectionView', () => {
	const mockConfig: DataTableConfig = {
		viewType: 'testPanel',
		title: 'Test Table',
		columns: [
			{ key: 'name', label: 'Name', width: '200px' },
			{ key: 'value', label: 'Value' },
		],
		dataCommand: 'testData',
		noDataMessage: 'No items found',
		searchPlaceholder: 'Search items...',
		defaultSortColumn: 'name',
		defaultSortDirection: 'asc',
		toolbarButtons: [],
		enableSearch: true,
		enableSolutionFilter: false,
	};

	describe('renderDataTableSection', () => {
		it('should render error message', () => {
			const html = renderDataTableSection({
				data: [],
				config: mockConfig,
				errorMessage: 'Connection failed',
			});

			expect(html).toContain('Connection failed');
			expect(html).toContain('class="error"');
		});

		it('should render loading state', () => {
			const html = renderDataTableSection({
				data: [],
				config: mockConfig,
				isLoading: true,
			});

			expect(html).toContain('Loading');
			expect(html).toContain('spinner');
		});

		it('should render empty state', () => {
			const html = renderDataTableSection({
				data: [],
				config: mockConfig,
			});

			expect(html).toContain('No items found');
		});

		it('should render search box when enabled', () => {
			const html = renderDataTableSection({
				data: [{ name: 'Test', value: 'Value' }],
				config: mockConfig,
			});

			expect(html).toContain('search-container');
			expect(html).toContain('placeholder="Search items..."');
		});

		it('should not render search box when disabled', () => {
			const configNoSearch = { ...mockConfig, enableSearch: false };
			const html = renderDataTableSection({
				data: [{ name: 'Test', value: 'Value' }],
				config: configNoSearch,
			});

			expect(html).not.toContain('search-container');
		});

		it('should render table headers with sort indicators', () => {
			const html = renderDataTableSection({
				data: [{ name: 'Test', value: 'Value' }],
				config: mockConfig,
				sortColumn: 'name',
				sortDirection: 'asc',
			});

			expect(html).toContain('<th data-sort="name"');
			expect(html).toContain('▲');
		});

		it('should render descending sort indicator', () => {
			const html = renderDataTableSection({
				data: [{ name: 'Test', value: 'Value' }],
				config: mockConfig,
				sortColumn: 'value',
				sortDirection: 'desc',
			});

			expect(html).toContain('▼');
		});

		it('should render column widths', () => {
			const html = renderDataTableSection({
				data: [{ name: 'Test', value: 'Value' }],
				config: mockConfig,
			});

			expect(html).toContain('width: 200px');
		});

		it('should render data rows', () => {
			const html = renderDataTableSection({
				data: [
					{ name: 'Test 1', value: 'Value 1' },
					{ name: 'Test 2', value: 'Value 2' },
				],
				config: mockConfig,
			});

			expect(html).toContain('Test 1');
			expect(html).toContain('Value 1');
			expect(html).toContain('Test 2');
			expect(html).toContain('Value 2');
		});

		it('should render cell links from structured CellLink data', () => {
			const html = renderDataTableSection({
				data: [
					{
						name: 'Test',
						value: 'Value',
						nameLink: {
							command: 'testCommand',
							commandData: { 'item-id': '123' },
							className: 'test-link',
						},
					},
				],
				config: mockConfig,
			});

			expect(html).toContain('<a href="#"');
			expect(html).toContain('class="test-link"');
			expect(html).toContain('data-command="testCommand"');
			expect(html).toContain('data-item-id="123"');
			expect(html).toContain('>Test</a>');
		});

		it('should render cell classes', () => {
			const html = renderDataTableSection({
				data: [
					{
						name: 'Test',
						value: 'Value',
						valueClass: 'highlight',
					},
				],
				config: mockConfig,
			});

			expect(html).toContain('class="highlight"');
		});

		it('should escape HTML in cell values', () => {
			const html = renderDataTableSection({
				data: [{ name: '<script>alert("xss")</script>', value: 'Safe' }],
				config: mockConfig,
			});

			expect(html).toContain('&lt;script&gt;');
			expect(html).not.toContain('<script>alert');
		});

		it('should render footer with record count', () => {
			const html = renderDataTableSection({
				data: [
					{ name: 'Test 1', value: 'Value 1' },
					{ name: 'Test 2', value: 'Value 2' },
				],
				config: mockConfig,
			});

			expect(html).toContain('2 records');
		});

		it('should render singular "record" for single item', () => {
			const html = renderDataTableSection({
				data: [{ name: 'Test', value: 'Value' }],
				config: mockConfig,
			});

			expect(html).toContain('1 record');
			expect(html).not.toContain('1 records');
		});

		it('should render search query value', () => {
			const html = renderDataTableSection({
				data: [{ name: 'Test', value: 'Value' }],
				config: mockConfig,
				searchQuery: 'my search',
			});

			expect(html).toContain('value="my search"');
		});

		it('should use default sort values when not provided', () => {
			const html = renderDataTableSection({
				data: [{ name: 'Test', value: 'Value' }],
				config: mockConfig,
			});

			expect(html).toContain('data-sort="name"');
			expect(html).toContain('▲');
		});

		it('should render "No matching records" for filtered results', () => {
			const html = renderDataTableSection({
				data: [],
				config: mockConfig,
				searchQuery: 'nonexistent',
			});

			expect(html).toContain('No matching records found');
		});
	});
});
