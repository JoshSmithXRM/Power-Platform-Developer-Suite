import { renderVirtualTableSection, type VirtualTableViewData } from './virtualTableSectionView';
import type { DataTableConfig } from '../DataTablePanel';

describe('virtualTableSectionView', () => {
	const defaultConfig: DataTableConfig = {
		viewType: 'testPanel',
		title: 'Test Panel',
		dataCommand: 'loadData',
		columns: [
			{ key: 'name', label: 'Name' },
			{ key: 'status', label: 'Status' }
		],
		noDataMessage: 'No records found',
		searchPlaceholder: 'Search...',
		enableSearch: true,
		defaultSortColumn: 'name',
		defaultSortDirection: 'asc',
		toolbarButtons: []
	};

	describe('renderVirtualTableSection', () => {
		it('should render table with data', () => {
			const viewData: VirtualTableViewData = {
				data: [
					{ name: 'Test 1', status: 'Active' },
					{ name: 'Test 2', status: 'Inactive' }
				],
				config: defaultConfig
			};

			const result = renderVirtualTableSection(viewData);

			expect(result).toContain('virtual-table-wrapper');
			expect(result).toContain('virtualTableBody');
			expect(result).toContain('Name');
			expect(result).toContain('Status');
		});

		it('should render error message when errorMessage is provided', () => {
			const viewData: VirtualTableViewData = {
				data: [],
				config: defaultConfig,
				errorMessage: 'Failed to load data'
			};

			const result = renderVirtualTableSection(viewData);

			expect(result).toContain('error');
			expect(result).toContain('Failed to load data');
		});

		it('should render search box when enableSearch is true', () => {
			const viewData: VirtualTableViewData = {
				data: [{ name: 'Test', status: 'Active' }],
				config: { ...defaultConfig, enableSearch: true }
			};

			const result = renderVirtualTableSection(viewData);

			expect(result).toContain('searchInput');
			expect(result).toContain('Search...');
		});

		it('should not render search box when enableSearch is false', () => {
			const viewData: VirtualTableViewData = {
				data: [{ name: 'Test', status: 'Active' }],
				config: { ...defaultConfig, enableSearch: false }
			};

			const result = renderVirtualTableSection(viewData);

			expect(result).not.toContain('searchInput');
		});

		it('should include search query value in search box', () => {
			const viewData: VirtualTableViewData = {
				data: [],
				config: defaultConfig,
				searchQuery: 'test query'
			};

			const result = renderVirtualTableSection(viewData);

			expect(result).toContain('value="test query"');
		});

		it('should render sort indicator on sorted column', () => {
			const viewData: VirtualTableViewData = {
				data: [{ name: 'Test', status: 'Active' }],
				config: defaultConfig,
				sortColumn: 'name',
				sortDirection: 'asc'
			};

			const result = renderVirtualTableSection(viewData);

			expect(result).toContain('▲');
		});

		it('should render descending sort indicator', () => {
			const viewData: VirtualTableViewData = {
				data: [{ name: 'Test', status: 'Active' }],
				config: defaultConfig,
				sortColumn: 'name',
				sortDirection: 'desc'
			};

			const result = renderVirtualTableSection(viewData);

			expect(result).toContain('▼');
		});

		it('should render no data message when data is empty', () => {
			const viewData: VirtualTableViewData = {
				data: [],
				config: defaultConfig
			};

			const result = renderVirtualTableSection(viewData);

			expect(result).toContain('No records found');
		});

		it('should render "No matching records" when search has no results', () => {
			const viewData: VirtualTableViewData = {
				data: [],
				config: defaultConfig,
				searchQuery: 'nonexistent'
			};

			const result = renderVirtualTableSection(viewData);

			expect(result).toContain('No matching records found');
		});

		it('should render loading row when isLoading and data is empty', () => {
			const viewData: VirtualTableViewData = {
				data: [],
				config: defaultConfig,
				isLoading: true
			};

			const result = renderVirtualTableSection(viewData);

			expect(result).toContain('spinner');
			expect(result).toContain('Loading...');
		});

		it('should include loading attribute when isLoading', () => {
			const viewData: VirtualTableViewData = {
				data: [],
				config: defaultConfig,
				isLoading: true
			};

			const result = renderVirtualTableSection(viewData);

			expect(result).toContain('data-loading="true"');
		});

		it('should render initial rows for data', () => {
			const viewData: VirtualTableViewData = {
				data: [
					{ name: 'Test 1', status: 'Active' },
					{ name: 'Test 2', status: 'Inactive' }
				],
				config: defaultConfig
			};

			const result = renderVirtualTableSection(viewData);

			expect(result).toContain('Test 1');
			expect(result).toContain('Test 2');
			expect(result).toContain('data-index="0"');
			expect(result).toContain('data-index="1"');
		});

		it('should serialize row data in data-rows attribute', () => {
			const data = [{ name: 'Test', status: 'Active' }];
			const viewData: VirtualTableViewData = {
				data,
				config: defaultConfig
			};

			const result = renderVirtualTableSection(viewData);

			expect(result).toContain('data-rows=');
		});

		it('should include estimated row height', () => {
			const viewData: VirtualTableViewData = {
				data: [{ name: 'Test', status: 'Active' }],
				config: defaultConfig,
				virtualization: {
					estimatedItemHeight: 48,
					totalItems: 1
				}
			};

			const result = renderVirtualTableSection(viewData);

			expect(result).toContain('data-row-height="48"');
		});

		it('should use default row height of 36 when not specified', () => {
			const viewData: VirtualTableViewData = {
				data: [{ name: 'Test', status: 'Active' }],
				config: defaultConfig
			};

			const result = renderVirtualTableSection(viewData);

			expect(result).toContain('data-row-height="36"');
		});

		it('should escape HTML in cell content', () => {
			const viewData: VirtualTableViewData = {
				data: [{ name: '<script>alert("xss")</script>', status: 'Active' }],
				config: defaultConfig
			};

			const result = renderVirtualTableSection(viewData);

			expect(result).not.toContain('<script>');
			expect(result).toContain('&lt;script&gt;');
		});

		it('should include title attribute for tooltips', () => {
			const viewData: VirtualTableViewData = {
				data: [{ name: 'Test Name', status: 'Active' }],
				config: defaultConfig
			};

			const result = renderVirtualTableSection(viewData);

			expect(result).toContain('title="Test Name"');
		});

		it('should render cell with CSS class when provided', () => {
			const viewData: VirtualTableViewData = {
				data: [{ name: 'Test', status: 'Active', statusClass: 'status-active' }],
				config: defaultConfig
			};

			const result = renderVirtualTableSection(viewData);

			expect(result).toContain('class="status-active"');
		});

		it('should render cell link when CellLink data is provided', () => {
			const viewData: VirtualTableViewData = {
				data: [{
					name: 'Test Link',
					nameLink: {
						className: 'entity-link',
						command: 'openEntity',
						commandData: { id: '123' },
						title: 'Open entity'
					},
					status: 'Active'
				}],
				config: defaultConfig
			};

			const result = renderVirtualTableSection(viewData);

			expect(result).toContain('href="#"');
			expect(result).toContain('class="entity-link"');
			expect(result).toContain('data-command="openEntity"');
			expect(result).toContain('data-id="123"');
		});

		it('should include sort value attribute when provided', () => {
			const viewData: VirtualTableViewData = {
				data: [{
					name: 'Test',
					nameSortValue: '2024-01-15T10:30:00Z',
					status: 'Active'
				}],
				config: defaultConfig
			};

			const result = renderVirtualTableSection(viewData);

			expect(result).toContain('data-sort-value="2024-01-15T10:30:00Z"');
		});

		it('should render footer with record count', () => {
			const viewData: VirtualTableViewData = {
				data: [
					{ name: 'Test 1', status: 'Active' },
					{ name: 'Test 2', status: 'Inactive' }
				],
				config: defaultConfig
			};

			const result = renderVirtualTableSection(viewData);

			expect(result).toContain('table-footer');
			expect(result).toContain('2');
			expect(result).toContain('records');
		});

		it('should render singular "record" for single item', () => {
			const viewData: VirtualTableViewData = {
				data: [{ name: 'Test', status: 'Active' }],
				config: defaultConfig
			};

			const result = renderVirtualTableSection(viewData);

			expect(result).toContain('1 record');
		});

		it('should render pagination footer with cached count', () => {
			const viewData: VirtualTableViewData = {
				data: [{ name: 'Test', status: 'Active' }],
				config: defaultConfig,
				pagination: {
					cachedCount: 100,
					totalCount: 500,
					isLoading: false,
					isFullyCached: false,
					currentPage: 1
				}
			};

			const result = renderVirtualTableSection(viewData);

			expect(result).toContain('100');
			expect(result).toContain('records');
		});

		it('should show background loading indicator', () => {
			const viewData: VirtualTableViewData = {
				data: [{ name: 'Test', status: 'Active' }],
				config: defaultConfig,
				pagination: {
					cachedCount: 100,
					totalCount: 500,
					isLoading: true,
					isFullyCached: false,
					currentPage: 2
				}
			};

			const result = renderVirtualTableSection(viewData);

			expect(result).toContain('background-loading-indicator');
			expect(result).toContain('⟳');
		});

		it('should show filtered count when visible < available', () => {
			const viewData: VirtualTableViewData = {
				data: Array.from({ length: 50 }, (_, i) => ({ name: `Test ${i}`, status: 'Active' })),
				config: defaultConfig,
				pagination: {
					cachedCount: 100,
					totalCount: 100,
					isLoading: false,
					isFullyCached: true,
					currentPage: 1
				}
			};

			const result = renderVirtualTableSection(viewData);

			expect(result).toContain('of');
		});

		it('should render column with calculated width', () => {
			const viewData: VirtualTableViewData = {
				data: [{ name: 'Test', count: 100 }],
				config: {
					...defaultConfig,
					columns: [
						{ key: 'name', label: 'Name', type: 'name' },
						{ key: 'count', label: 'Count', type: 'numeric' }
					]
				}
			};

			const result = renderVirtualTableSection(viewData);

			// Should have width style on headers
			expect(result).toContain('style="width:');
		});

		it('should include data-type attribute for typed columns', () => {
			const viewData: VirtualTableViewData = {
				data: [{ date: '2024-01-15' }],
				config: {
					...defaultConfig,
					columns: [
						{ key: 'date', label: 'Date', type: 'datetime' }
					]
				}
			};

			const result = renderVirtualTableSection(viewData);

			expect(result).toContain('data-type="datetime"');
		});

		it('should limit initial rows to 50', () => {
			const data = Array.from({ length: 100 }, (_, i) => ({
				name: `Test ${i}`,
				status: 'Active'
			}));
			const viewData: VirtualTableViewData = {
				data,
				config: defaultConfig
			};

			const result = renderVirtualTableSection(viewData);

			// Should have index 49 but not 50
			expect(result).toContain('data-index="49"');
			expect(result).not.toContain('data-index="50"');
		});

		it('should render loading footer when isLoading with pagination', () => {
			const viewData: VirtualTableViewData = {
				data: [],
				config: defaultConfig,
				isLoading: true,
				pagination: {
					cachedCount: 0,
					totalCount: 0,
					isLoading: false,
					isFullyCached: false,
					currentPage: 0
				}
			};

			const result = renderVirtualTableSection(viewData);

			expect(result).toContain('Loading...');
		});

		it('should serialize columns in data-columns attribute', () => {
			const viewData: VirtualTableViewData = {
				data: [{ name: 'Test', status: 'Active' }],
				config: defaultConfig
			};

			const result = renderVirtualTableSection(viewData);

			expect(result).toContain('data-columns=');
		});
	});
});
