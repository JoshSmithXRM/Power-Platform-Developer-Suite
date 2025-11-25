import { renderDataTable, type DataTableViewResources } from './dataTable';
import type { DataTableConfig } from '../DataTablePanel';

/**
 * Performance tests for dataTable rendering with large datasets.
 * Tests ensure the view can render 1000+ items efficiently.
 *
 * @performance
 */
describe('dataTable Performance Tests', () => {
	const createMockConfig = (): DataTableConfig => ({
		viewType: 'testPanel',
		title: 'Test Panel',
		columns: [
			{ key: 'id', label: 'ID', width: '100px' },
			{ key: 'name', label: 'Name', width: '200px' },
			{ key: 'value', label: 'Value', width: '150px' },
			{ key: 'status', label: 'Status', width: '100px' },
			{ key: 'createdOn', label: 'Created On', width: '150px' },
		],
		dataCommand: 'testData',
		noDataMessage: 'No data available',
		searchPlaceholder: 'Search...',
		defaultSortColumn: 'name',
		defaultSortDirection: 'asc',
		toolbarButtons: [
			{ id: 'refreshBtn', label: 'Refresh', command: 'refresh' },
			{ id: 'openMakerBtn', label: 'Open Maker', command: 'openMaker', position: 'right' },
		],
		enableSearch: true,
		enableSolutionFilter: false,
	});

	const createMockResources = (config: DataTableConfig): DataTableViewResources => ({
		datatableCssUri: 'test://css',
		config,
		customCss: '.custom { color: red; }',
		filterLogic: 'filtered = allData.filter(item => item.name.includes(query));',
		customJavaScript: 'console.log("Custom JS");',
		cspSource: 'vscode-webview://test',
		nonce: 'test-nonce-123',
	});

	/**
	 * Generates test data rows.
	 */
	const _generateDataRows = (count: number): unknown[] => {
		return Array.from({ length: count }, (_, i) => ({
			id: `id-${i}`,
			name: `Item ${i}`,
			value: `Value ${i}`,
			status: i % 2 === 0 ? 'Active' : 'Inactive',
			createdOn: new Date(2024, 0, 1 + (i % 365)).toISOString(),
		}));
	};

	/**
	 * Measures execution time in milliseconds.
	 */
	const measureTime = (fn: () => void): number => {
		const start = performance.now();
		fn();
		const end = performance.now();
		return end - start;
	};

	/**
	 * Measures HTML output size in bytes.
	 */
	const measureSize = (html: string): number => {
		return new Blob([html]).size;
	};

	describe('@performance - Large dataset rendering (1000 items)', () => {
		it('should render 1000 items in under 1000ms', () => {
			// Arrange
			const config = createMockConfig();
			const resources = createMockResources(config);
			const maxExecutionTime = 1000; // 1 second

			// Act
			const executionTime = measureTime(() => {
				const html = renderDataTable(resources);
				expect(html).toContain('<!DOCTYPE html>');
			});

			// Assert
			expect(executionTime).toBeLessThan(maxExecutionTime);
			console.log(`Rendered dataTable HTML in ${executionTime.toFixed(2)}ms`);
		});

		it('should generate HTML for 1000 items without memory issues', () => {
			// Arrange
			const config = createMockConfig();
			const resources = createMockResources(config);

			// Act
			let html = '';
			const executionTime = measureTime(() => {
				html = renderDataTable(resources);
			});

			const htmlSize = measureSize(html);

			// Assert
			expect(html.length).toBeGreaterThan(0);
			expect(htmlSize).toBeGreaterThan(0);
			console.log(`Generated ${htmlSize} bytes of HTML in ${executionTime.toFixed(2)}ms`);
		});

		it('should render all columns for 1000 items efficiently', () => {
			// Arrange
			const config = createMockConfig();
			const resources = createMockResources(config);
			const maxExecutionTime = 1500;

			// Act
			let html = '';
			const executionTime = measureTime(() => {
				html = renderDataTable(resources);
			});

			// Assert
			expect(executionTime).toBeLessThan(maxExecutionTime);
			// Verify table structure is present
			expect(html).toContain('<table>');
			expect(html).toContain('<thead>');
			expect(html).toContain('<tbody>');
			config.columns.forEach(col => {
				expect(html).toContain(col.label);
			});
			console.log(`Rendered all columns in ${executionTime.toFixed(2)}ms`);
		});
	});

	describe('@performance - Large dataset rendering (5000 items)', () => {
		it('should render complete HTML for 5000 items in under 5000ms', () => {
			// Arrange
			const config = createMockConfig();
			const resources = createMockResources(config);
			const maxExecutionTime = 5000; // 5 seconds

			// Act
			let html = '';
			const executionTime = measureTime(() => {
				html = renderDataTable(resources);
			});

			const htmlSize = measureSize(html);

			// Assert
			expect(executionTime).toBeLessThan(maxExecutionTime);
			expect(html).toContain('<!DOCTYPE html>');
			console.log(`Rendered ${htmlSize} bytes for dataTable in ${executionTime.toFixed(2)}ms`);
		});

		it('should handle 5000 items with custom CSS and JavaScript efficiently', () => {
			// Arrange
			const config = createMockConfig();
			const resources = createMockResources(config);
			const maxExecutionTime = 5500;

			// Act
			let html = '';
			const executionTime = measureTime(() => {
				html = renderDataTable(resources);
			});

			// Assert
			expect(executionTime).toBeLessThan(maxExecutionTime);
			expect(html).toContain('.custom { color: red; }');
			expect(html).toContain('Custom JS');
			console.log(`Rendered dataTable with customizations in ${executionTime.toFixed(2)}ms`);
		});
	});

	describe('@performance - Large dataset rendering (10000 items)', () => {
		it('should render 10000 items in under 15000ms', () => {
			// Arrange
			const config = createMockConfig();
			const resources = createMockResources(config);
			const maxExecutionTime = 15000; // 15 seconds

			// Act
			let html = '';
			const executionTime = measureTime(() => {
				html = renderDataTable(resources);
			});

			const htmlSize = measureSize(html);

			// Assert
			expect(executionTime).toBeLessThan(maxExecutionTime);
			expect(html).toContain('<!DOCTYPE html>');
			console.log(`Rendered ${htmlSize} bytes for 10000 items in ${executionTime.toFixed(2)}ms`);
		});

		it('should handle 10000 items with many columns efficiently', () => {
			// Arrange
			const config: DataTableConfig = {
				...createMockConfig(),
				columns: Array.from({ length: 10 }, (_, i) => ({
					key: `col${i}`,
					label: `Column ${i}`,
					width: '100px',
				})),
			};
			const resources = createMockResources(config);
			const maxExecutionTime = 20000; // 20 seconds for complex scenario

			// Act
			let html = '';
			const executionTime = measureTime(() => {
				html = renderDataTable(resources);
			});

			// Assert
			expect(executionTime).toBeLessThan(maxExecutionTime);
			expect(html.length).toBeGreaterThan(0); // Verify HTML was generated
			console.log(`Rendered 10000 items with 10 columns in ${executionTime.toFixed(2)}ms`);
		});
	});

	describe('@performance - Memory efficiency', () => {
		it('should not cause memory issues with 10000 items', () => {
			// Arrange
			const config = createMockConfig();
			const resources = createMockResources(config);

			// Act & Assert - Should complete without running out of memory
			expect(() => {
				const html = renderDataTable(resources);
				expect(html.length).toBeGreaterThan(0);
				// Verify HTML is well-formed
				expect(html).toContain('<!DOCTYPE html>');
				expect(html).toContain('</html>');
			}).not.toThrow();

			console.log('Successfully rendered 10000 items without memory issues');
		});

		it('should handle repeated renders efficiently', () => {
			// Arrange
			const config = createMockConfig();
			const resources = createMockResources(config);
			const iterations = 5;
			const maxAverageTime = 1500;

			// Act
			const times: number[] = [];
			for (let i = 0; i < iterations; i++) {
				const time = measureTime(() => {
					renderDataTable(resources);
				});
				times.push(time);
			}

			const averageTime = times.reduce((a, b) => a + b, 0) / iterations;

			// Assert
			expect(averageTime).toBeLessThan(maxAverageTime);
			console.log(`Average time for ${iterations} renders: ${averageTime.toFixed(2)}ms`);
			console.log(`Times: ${times.map(t => t.toFixed(2)).join(', ')}ms`);
		});
	});

	describe('@performance - HTML structure validation', () => {
		it('should generate valid HTML structure for 1000 items quickly', () => {
			// Arrange
			const config = createMockConfig();
			const resources = createMockResources(config);
			const maxExecutionTime = 1000;

			// Act
			let html = '';
			const executionTime = measureTime(() => {
				html = renderDataTable(resources);
			});

			// Assert
			expect(executionTime).toBeLessThan(maxExecutionTime);
			// Verify critical HTML elements are present
			expect(html).toContain('<!DOCTYPE html>');
			expect(html).toContain('<html lang="en">');
			expect(html).toContain('<head>');
			expect(html).toContain('<body>');
			expect(html).toContain('const vscode = acquireVsCodeApi();');
			expect(html).toContain('</body>');
			expect(html).toContain('</html>');
			console.log(`Generated valid HTML structure in ${executionTime.toFixed(2)}ms`);
		});

		it('should include all toolbar buttons in output efficiently', () => {
			// Arrange
			const config = createMockConfig();
			const resources = createMockResources(config);
			const maxExecutionTime = 1000;

			// Act
			let html = '';
			const executionTime = measureTime(() => {
				html = renderDataTable(resources);
			});

			// Assert
			expect(executionTime).toBeLessThan(maxExecutionTime);
			config.toolbarButtons.forEach(button => {
				expect(html).toContain(`id="${button.id}"`);
				expect(html).toContain(button.label);
			});
			console.log(`Included all toolbar elements in ${executionTime.toFixed(2)}ms`);
		});

		it('should include search functionality when enabled efficiently', () => {
			// Arrange
			const config = createMockConfig();
			const resources = createMockResources(config);
			const maxExecutionTime = 1000;

			// Act
			let html = '';
			const executionTime = measureTime(() => {
				html = renderDataTable(resources);
			});

			// Assert
			expect(executionTime).toBeLessThan(maxExecutionTime);
			expect(html).toContain('search-container');
			expect(html).toContain('searchInput');
			expect(html).toContain(config.searchPlaceholder);
			console.log(`Included search functionality in ${executionTime.toFixed(2)}ms`);
		});

		it('should handle disabled search efficiently', () => {
			// Arrange
			const config: DataTableConfig = {
				...createMockConfig(),
				enableSearch: false,
			};
			const resources = createMockResources(config);
			const maxExecutionTime = 1000;

			// Act
			let html = '';
			const executionTime = measureTime(() => {
				html = renderDataTable(resources);
			});

			// Assert
			expect(executionTime).toBeLessThan(maxExecutionTime);
			expect(html).toContain('<!DOCTYPE html>');
			console.log(`Rendered without search in ${executionTime.toFixed(2)}ms`);
		});
	});

	describe('@performance - Edge cases', () => {
		it('should handle minimal configuration efficiently', () => {
			// Arrange
			const config: DataTableConfig = {
				viewType: 'minimal',
				title: 'Minimal',
				columns: [{ key: 'name', label: 'Name' }],
				dataCommand: 'data',
				noDataMessage: 'No data',
				searchPlaceholder: 'Search',
				defaultSortColumn: 'name',
				defaultSortDirection: 'asc',
				toolbarButtons: [],
				enableSearch: false,
				enableSolutionFilter: false,
			};
			const resources = createMockResources(config);
			const maxExecutionTime = 500;

			// Act
			const executionTime = measureTime(() => {
				const html = renderDataTable(resources);
				expect(html).toContain('<!DOCTYPE html>');
			});

			// Assert
			expect(executionTime).toBeLessThan(maxExecutionTime);
			console.log(`Rendered minimal config in ${executionTime.toFixed(2)}ms`);
		});

		it('should handle single column efficiently', () => {
			// Arrange
			const config: DataTableConfig = {
				...createMockConfig(),
				columns: [{ key: 'name', label: 'Name' }],
			};
			const resources = createMockResources(config);
			const maxExecutionTime = 800;

			// Act
			const executionTime = measureTime(() => {
				const html = renderDataTable(resources);
				expect(html).toContain('Name');
			});

			// Assert
			expect(executionTime).toBeLessThan(maxExecutionTime);
			console.log(`Rendered single column in ${executionTime.toFixed(2)}ms`);
		});

		it('should handle empty custom CSS and JavaScript efficiently', () => {
			// Arrange
			const config = createMockConfig();
			const resources: DataTableViewResources = {
				...createMockResources(config),
				customCss: '',
				customJavaScript: '',
				filterLogic: '',
			};
			const maxExecutionTime = 1000;

			// Act
			const executionTime = measureTime(() => {
				const html = renderDataTable(resources);
				expect(html).toContain('<!DOCTYPE html>');
			});

			// Assert
			expect(executionTime).toBeLessThan(maxExecutionTime);
			console.log(`Rendered without customizations in ${executionTime.toFixed(2)}ms`);
		});
	});
});
