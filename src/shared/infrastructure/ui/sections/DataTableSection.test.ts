import type { DataTableConfig } from '../DataTablePanel';
import { SectionPosition } from '../types/SectionPosition';
import type { SectionRenderData } from '../types/SectionRenderData';

import { DataTableSection } from './DataTableSection';

describe('DataTableSection', () => {
	const mockConfig: DataTableConfig = {
		viewType: 'testPanel',
		title: 'Test Table',
		columns: [
			{ key: 'name', label: 'Name' },
			{ key: 'value', label: 'Value' },
		],
		dataCommand: 'testData',
		noDataMessage: 'No data available',
		searchPlaceholder: 'Search...',
		defaultSortColumn: 'name',
		defaultSortDirection: 'asc',
		toolbarButtons: [],
		enableSearch: true,
		enableSolutionFilter: false,
	};

	describe('position', () => {
		it('should have Main position', () => {
			const section = new DataTableSection(mockConfig);
			expect(section.position).toBe(SectionPosition.Main);
		});
	});

	describe('render', () => {
		it('should render empty data', () => {
			const section = new DataTableSection(mockConfig);
			const renderData: SectionRenderData = {
				tableData: [],
			};

			const html = section.render(renderData);

			expect(html).toContain('No data available');
		});

		it('should render data rows', () => {
			const section = new DataTableSection(mockConfig);
			const renderData: SectionRenderData = {
				tableData: [
					{ name: 'Test 1', value: 'Value 1' },
					{ name: 'Test 2', value: 'Value 2' },
				],
			};

			const html = section.render(renderData);

			expect(html).toContain('Test 1');
			expect(html).toContain('Value 1');
			expect(html).toContain('Test 2');
			expect(html).toContain('Value 2');
		});

		it('should render loading state', () => {
			const section = new DataTableSection(mockConfig);
			const renderData: SectionRenderData = {
				isLoading: true,
			};

			const html = section.render(renderData);

			expect(html).toContain('Loading');
		});

		it('should render error message', () => {
			const section = new DataTableSection(mockConfig);
			const renderData: SectionRenderData = {
				errorMessage: 'Failed to load data',
			};

			const html = section.render(renderData);

			expect(html).toContain('Failed to load data');
		});

		it('should pass sort column from customData', () => {
			const section = new DataTableSection(mockConfig);
			const renderData: SectionRenderData = {
				tableData: [{ name: 'Test', value: 'Value' }],
				customData: {
					sortColumn: 'value',
					sortDirection: 'desc',
				},
			};

			const html = section.render(renderData);

			expect(html).toContain('data-sort="value"');
		});

		it('should pass search query from customData', () => {
			const section = new DataTableSection(mockConfig);
			const renderData: SectionRenderData = {
				tableData: [{ name: 'Test', value: 'Value' }],
				customData: {
					searchQuery: 'test query',
				},
			};

			const html = section.render(renderData);

			expect(html).toContain('value="test query"');
		});

		it('should handle missing tableData', () => {
			const section = new DataTableSection(mockConfig);
			const renderData: SectionRenderData = {};

			const html = section.render(renderData);

			expect(html).toContain('No data available');
		});

		it('should handle missing customData', () => {
			const section = new DataTableSection(mockConfig);
			const renderData: SectionRenderData = {
				tableData: [{ name: 'Test', value: 'Value' }],
			};

			const html = section.render(renderData);

			expect(html).toContain('Test');
		});
	});
});
