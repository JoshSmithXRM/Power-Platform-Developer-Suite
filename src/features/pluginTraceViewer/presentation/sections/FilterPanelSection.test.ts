import { FilterPanelSection } from './FilterPanelSection';
import { SectionPosition } from '../../../../shared/infrastructure/ui/types/SectionPosition';
import type { FilterConditionViewModel, FilterCriteriaViewModel } from '../../application/viewModels/FilterCriteriaViewModel';

describe('FilterPanelSection', () => {
	describe('initialization and position', () => {
		it('should create section with Filters position', () => {
			const section = new FilterPanelSection();

			expect(section.position).toBe(SectionPosition.Filters);
		});

		it('should be instantiable without arguments', () => {
			const section = new FilterPanelSection();

			expect(section).toBeDefined();
		});
	});

	describe('render - filter panel structure', () => {
		it('should render filter panel container', () => {
			const section = new FilterPanelSection();

			const html = section.render({});

			expect(html).toContain('class="filter-panel"');
		});

		it('should render filter panel header with ID', () => {
			const section = new FilterPanelSection();

			const html = section.render({});

			expect(html).toContain('id="filterPanelHeader"');
			expect(html).toContain('class="filter-panel-header"');
		});

		it('should render filter panel body with ID and collapsed class', () => {
			const section = new FilterPanelSection();

			const html = section.render({});

			expect(html).toContain('id="filterPanelBody"');
			expect(html).toContain('class="filter-panel-body collapsed"');
		});

		it('should render filter toggle button with ID', () => {
			const section = new FilterPanelSection();

			const html = section.render({});

			expect(html).toContain('id="filterToggleBtn"');
			expect(html).toContain('class="filter-toggle-btn"');
			expect(html).toContain('codicon-chevron-up');
		});

		it('should render filter title with icon', () => {
			const section = new FilterPanelSection();

			const html = section.render({});

			expect(html).toContain('class="filter-panel-title"');
			expect(html).toContain('codicon-filter');
			expect(html).toContain('Filters');
		});
	});

	describe('render - quick filters section', () => {
		it('should render quick filters section label', () => {
			const section = new FilterPanelSection();

			const html = section.render({});

			expect(html).toContain('class="section-label"');
			expect(html).toMatch(/Quick Filters/);
		});

		it('should render all quick filter definitions', () => {
			const section = new FilterPanelSection();

			const html = section.render({});

			// Check for all quick filter IDs
			expect(html).toContain('data-filter-id="exceptions"');
			expect(html).toContain('data-filter-id="success"');
			expect(html).toContain('data-filter-id="lastHour"');
			expect(html).toContain('data-filter-id="last24Hours"');
			expect(html).toContain('data-filter-id="today"');
			expect(html).toContain('data-filter-id="asyncOnly"');
			expect(html).toContain('data-filter-id="syncOnly"');
			expect(html).toContain('data-filter-id="recursive"');
		});

		it('should render quick filter checkboxes', () => {
			const section = new FilterPanelSection();

			const html = section.render({});

			expect(html).toContain('type="checkbox"');
			expect(html).toContain('class="quick-filter-checkbox"');
		});

		it('should render quick filter labels with tooltip', () => {
			const section = new FilterPanelSection();

			const html = section.render({});

			expect(html).toContain('class="quick-filter-item"');
			expect(html).toContain('title=');
			expect(html).toContain('class="quick-filter-label"');
			expect(html).toContain('Exceptions');
			expect(html).toContain('Success Only');
		});

		it('should render quick filter badges with OData fields', () => {
			const section = new FilterPanelSection();

			const html = section.render({});

			expect(html).toContain('class="quick-filter-badge"');
			expect(html).toContain('exceptiondetails');
			expect(html).toContain('createdon');
			expect(html).toContain('mode');
			expect(html).toContain('depth');
		});
	});

	describe('render - advanced filters section', () => {
		it('should render advanced filters section label', () => {
			const section = new FilterPanelSection();

			const html = section.render({});

			expect(html).toContain('class="advanced-filters-section"');
			expect(html).toMatch(/Advanced Filters/);
		});

		it('should render filter conditions container with ID', () => {
			const section = new FilterPanelSection();

			const html = section.render({});

			expect(html).toContain('id="filterConditions"');
			expect(html).toContain('class="filter-conditions"');
		});

		it('should render empty conditions container when no filters provided', () => {
			const section = new FilterPanelSection();

			const html = section.render({ state: { filterCriteria: { conditions: [], top: 50 } } });

			expect(html).toContain('id="filterConditions"');
			// Should not contain any condition rows
			expect(html).not.toContain('data-condition-id=');
		});
	});

	describe('render - filter condition rows', () => {
		it('should render single condition row with all controls', () => {
			const section = new FilterPanelSection();
			const condition: FilterConditionViewModel = {
				id: 'cond-1',
				enabled: true,
				field: 'Plugin Name',
				operator: 'Contains',
				value: 'Test',
				logicalOperator: 'and'
			};
			const filterState: FilterCriteriaViewModel = {
				conditions: [condition],
				top: 50
			};

			const html = section.render({ state: { filterCriteria: filterState } });

			expect(html).toContain('data-condition-id="cond-1"');
			expect(html).toContain('class="filter-condition-row"');
			expect(html).toContain('data-field-type="text"');
		});

		it('should render condition enable/disable checkbox checked when enabled', () => {
			const section = new FilterPanelSection();
			const condition: FilterConditionViewModel = {
				id: 'cond-1',
				enabled: true,
				field: 'Plugin Name',
				operator: 'Contains',
				value: 'Test',
				logicalOperator: 'and'
			};

			const html = section.render({ state: { filterCriteria: { conditions: [condition], top: 50 } } });

			const checkbox = html.match(/<input[^>]*class="condition-enabled"[^>]*>/)?.[0] ?? '';
			expect(checkbox).toContain('checked');
		});

		it('should render condition enable/disable checkbox unchecked when disabled', () => {
			const section = new FilterPanelSection();
			const condition: FilterConditionViewModel = {
				id: 'cond-1',
				enabled: false,
				field: 'Plugin Name',
				operator: 'Contains',
				value: 'Test',
				logicalOperator: 'and'
			};

			const html = section.render({ state: { filterCriteria: { conditions: [condition], top: 50 } } });

			const checkbox = html.match(/<input[^>]*class="condition-enabled"[^>]*>/)?.[0] ?? '';
			expect(checkbox).not.toContain('checked');
		});

		it('should render field dropdown with all available fields', () => {
			const section = new FilterPanelSection();
			const condition: FilterConditionViewModel = {
				id: 'cond-1',
				enabled: true,
				field: 'Plugin Name',
				operator: 'Contains',
				value: '',
				logicalOperator: 'and'
			};

			const html = section.render({ state: { filterCriteria: { conditions: [condition], top: 50 } } });

			expect(html).toContain('class="condition-field"');
			expect(html).toContain('Plugin Name');
			expect(html).toContain('Created On');
			expect(html).toContain('Duration (ms)');
		});

		it('should render operator dropdown with applicable operators for field', () => {
			const section = new FilterPanelSection();
			const condition: FilterConditionViewModel = {
				id: 'cond-1',
				enabled: true,
				field: 'Plugin Name',
				operator: 'Contains',
				value: 'Test',
				logicalOperator: 'and'
			};

			const html = section.render({ state: { filterCriteria: { conditions: [condition], top: 50 } } });

			expect(html).toContain('class="condition-operator"');
			expect(html).toContain('Contains');
			expect(html).toContain('Equals');
		});

		it('should render text value input for text field type', () => {
			const section = new FilterPanelSection();
			const condition: FilterConditionViewModel = {
				id: 'cond-1',
				enabled: true,
				field: 'Plugin Name',
				operator: 'Contains',
				value: 'TestValue',
				logicalOperator: 'and'
			};

			const html = section.render({ state: { filterCriteria: { conditions: [condition], top: 50 } } });

			expect(html).toContain('type="text"');
			expect(html).toContain('class="condition-value"');
			expect(html).toContain('value="TestValue"');
		});

		it('should render number input for number field type', () => {
			const section = new FilterPanelSection();
			const condition: FilterConditionViewModel = {
				id: 'cond-1',
				enabled: true,
				field: 'Duration (ms)',
				operator: 'Greater Than',
				value: '1000',
				logicalOperator: 'and'
			};

			const html = section.render({ state: { filterCriteria: { conditions: [condition], top: 50 } } });

			expect(html).toContain('type="number"');
			expect(html).toContain('value="1000"');
			expect(html).toContain('min="0"');
		});

		it('should render datetime-local input for date field type', () => {
			const section = new FilterPanelSection();
			const condition: FilterConditionViewModel = {
				id: 'cond-1',
				enabled: true,
				field: 'Created On',
				operator: 'Greater Than or Equal',
				value: '2025-11-10T10:30:00.000Z',
				logicalOperator: 'and'
			};

			const html = section.render({ state: { filterCriteria: { conditions: [condition], top: 50 } } });

			expect(html).toContain('type="datetime-local"');
			expect(html).toContain('class="condition-value"');
		});

		it('should render enum select for enum field type', () => {
			const section = new FilterPanelSection();
			const condition: FilterConditionViewModel = {
				id: 'cond-1',
				enabled: true,
				field: 'Mode',
				operator: 'Equals',
				value: 'Synchronous',
				logicalOperator: 'and'
			};

			const html = section.render({ state: { filterCriteria: { conditions: [condition], top: 50 } } });

			expect(html).toContain('class="condition-value"');
			expect(html).toContain('Synchronous');
			expect(html).toContain('Asynchronous');
		});

		it('should render placeholder for null operators (Is Null, Is Not Null)', () => {
			const section = new FilterPanelSection();
			const condition: FilterConditionViewModel = {
				id: 'cond-1',
				enabled: true,
				field: 'Exception Details',
				operator: 'Is Null',
				value: '',
				logicalOperator: 'and'
			};

			const html = section.render({ state: { filterCriteria: { conditions: [condition], top: 50 } } });

			expect(html).toContain('class="condition-value-placeholder"');
			expect(html).toContain('(no value needed)');
		});

		it('should render logical operator dropdown for non-last condition rows', () => {
			const section = new FilterPanelSection();
			const conditions: FilterConditionViewModel[] = [
				{
					id: 'cond-1',
					enabled: true,
					field: 'Plugin Name',
					operator: 'Contains',
					value: 'Test',
					logicalOperator: 'and'
				},
				{
					id: 'cond-2',
					enabled: true,
					field: 'Entity Name',
					operator: 'Equals',
					value: 'Account',
					logicalOperator: 'or'
				}
			];

			const html = section.render({ state: { filterCriteria: { conditions, top: 50 } } });

			// First condition should have logical operator select
			const rows = html.match(/class="filter-condition-row"/g);
			expect(rows).toHaveLength(2);
			expect(html).toContain('class="condition-logical-operator"');
			expect(html).toContain('value="and"');
			expect(html).toContain('value="or"');
		});

		it('should render placeholder instead of logical operator for last condition row', () => {
			const section = new FilterPanelSection();
			const conditions: FilterConditionViewModel[] = [
				{
					id: 'cond-1',
					enabled: true,
					field: 'Plugin Name',
					operator: 'Contains',
					value: 'Test',
					logicalOperator: 'and'
				},
				{
					id: 'cond-2',
					enabled: true,
					field: 'Entity Name',
					operator: 'Equals',
					value: 'Account',
					logicalOperator: 'or'
				}
			];

			const html = section.render({ state: { filterCriteria: { conditions, top: 50 } } });

			expect(html).toContain('class="logical-operator-placeholder"');
		});

		it('should render remove condition button for each row', () => {
			const section = new FilterPanelSection();
			const conditions: FilterConditionViewModel[] = [
				{
					id: 'cond-1',
					enabled: true,
					field: 'Plugin Name',
					operator: 'Contains',
					value: 'Test',
					logicalOperator: 'and'
				},
				{
					id: 'cond-2',
					enabled: true,
					field: 'Entity Name',
					operator: 'Equals',
					value: 'Account',
					logicalOperator: 'and'
				}
			];

			const html = section.render({ state: { filterCriteria: { conditions, top: 50 } } });

			const removeButtons = html.match(/class="icon-button remove-condition-btn"/g);
			expect(removeButtons).toHaveLength(2);
			expect(html).toContain('title="Remove condition"');
		});
	});

	describe('render - filter actions buttons', () => {
		it('should render Add Condition button with ID', () => {
			const section = new FilterPanelSection();

			const html = section.render({});

			expect(html).toContain('id="addConditionBtn"');
			expect(html).toContain('class="secondary-button"');
			expect(html).toContain('codicon-add');
			expect(html).toContain('Add Condition');
		});

		it('should render Apply Filters button with command', () => {
			const section = new FilterPanelSection();

			const html = section.render({});

			expect(html).toContain('id="applyFiltersBtn"');
			expect(html).toContain('class="primary-button"');
			expect(html).toContain('data-command="applyFilters"');
			expect(html).toContain('codicon-check');
			expect(html).toContain('Apply Filters');
		});

		it('should render Clear All button with command', () => {
			const section = new FilterPanelSection();

			const html = section.render({});

			expect(html).toContain('id="clearFiltersBtn"');
			expect(html).toContain('class="secondary-button"');
			expect(html).toContain('data-command="clearFilters"');
			expect(html).toContain('codicon-close');
			expect(html).toContain('Clear All');
		});
	});

	describe('render - OData preview section', () => {
		it('should render OData preview details section', () => {
			const section = new FilterPanelSection();

			const html = section.render({});

			expect(html).toContain('class="odata-preview-details"');
			expect(html).toContain('class="odata-preview-summary"');
		});

		it('should render OData preview summary with icon and label', () => {
			const section = new FilterPanelSection();

			const html = section.render({});

			expect(html).toContain('codicon-code');
			expect(html).toContain('Show Generated OData Query');
		});

		it('should render OData query text area with ID', () => {
			const section = new FilterPanelSection();

			const html = section.render({});

			expect(html).toContain('id="odataQueryText"');
			expect(html).toContain('class="odata-query-text"');
			expect(html).toContain('No filters applied');
		});

		it('should render copy OData query button with ID', () => {
			const section = new FilterPanelSection();

			const html = section.render({});

			expect(html).toContain('id="copyODataQueryBtn"');
			expect(html).toContain('class="icon-button copy-query-button"');
			expect(html).toContain('title="Copy to clipboard"');
			expect(html).toContain('codicon-copy');
			expect(html).toContain('Copy');
		});
	});

	describe('render - filter state and counts', () => {
		it('should display correct active count and total count', () => {
			const section = new FilterPanelSection();
			const conditions: FilterConditionViewModel[] = [
				{
					id: 'cond-1',
					enabled: true,
					field: 'Plugin Name',
					operator: 'Contains',
					value: 'Test',
					logicalOperator: 'and'
				},
				{
					id: 'cond-2',
					enabled: false,
					field: 'Entity Name',
					operator: 'Equals',
					value: 'Account',
					logicalOperator: 'and'
				},
				{
					id: 'cond-3',
					enabled: true,
					field: 'Duration (ms)',
					operator: 'Greater Than',
					value: '',
					logicalOperator: 'and'
				}
			];

			const html = section.render({ state: { filterCriteria: { conditions, top: 50 } } });

			// Should show active count (1 - only first condition has enabled=true with value)
			expect(html).toContain('Filters (1 / 3)');
		});

		it('should count null operators as active even without values', () => {
			const section = new FilterPanelSection();
			const conditions: FilterConditionViewModel[] = [
				{
					id: 'cond-1',
					enabled: true,
					field: 'Exception Details',
					operator: 'Is Null',
					value: '',
					logicalOperator: 'and'
				}
			];

			const html = section.render({ state: { filterCriteria: { conditions, top: 50 } } });

			// Is Null operator counts as active even without value
			expect(html).toContain('Filters (1 / 1)');
		});

		it('should count eq/ne operators as active even with empty string value', () => {
			const section = new FilterPanelSection();
			const conditions: FilterConditionViewModel[] = [
				{
					id: 'cond-1',
					enabled: true,
					field: 'Exception Details',
					operator: 'Equals',
					value: '',
					logicalOperator: 'and'
				}
			];

			const html = section.render({ state: { filterCriteria: { conditions, top: 50 } } });

			// Equals operator with empty string counts as active
			expect(html).toContain('Filters (1 / 1)');
		});

		it('should show zero active filters when no conditions are enabled', () => {
			const section = new FilterPanelSection();
			const conditions: FilterConditionViewModel[] = [
				{
					id: 'cond-1',
					enabled: false,
					field: 'Plugin Name',
					operator: 'Contains',
					value: 'Test',
					logicalOperator: 'and'
				}
			];

			const html = section.render({ state: { filterCriteria: { conditions, top: 50 } } });

			expect(html).toContain('Filters (0 / 1)');
		});

		it('should show zero filters when state is missing', () => {
			const section = new FilterPanelSection();

			const html = section.render({});

			expect(html).toContain('Filters (0 / 0)');
		});

		it('should show zero filters when filterCriteria is missing', () => {
			const section = new FilterPanelSection();

			const html = section.render({ state: {} });

			expect(html).toContain('Filters (0 / 0)');
		});
	});

	describe('render - HTML escaping and security', () => {
		it('should escape HTML in field values', () => {
			const section = new FilterPanelSection();
			const condition: FilterConditionViewModel = {
				id: 'cond-1',
				enabled: true,
				field: 'Plugin Name',
				operator: 'Contains',
				value: '<script>alert("xss")</script>',
				logicalOperator: 'and'
			};

			const html = section.render({ state: { filterCriteria: { conditions: [condition], top: 50 } } });

			expect(html).toContain('&lt;script&gt;');
			expect(html).not.toContain('<script>alert("xss")</script>');
		});

		it('should include condition IDs in data attributes', () => {
			const section = new FilterPanelSection();
			const condition: FilterConditionViewModel = {
				id: 'test-condition-123',
				enabled: true,
				field: 'Plugin Name',
				operator: 'Contains',
				value: 'Test',
				logicalOperator: 'and'
			};

			const html = section.render({ state: { filterCriteria: { conditions: [condition], top: 50 } } });

			// Condition ID should be present in data attribute
			expect(html).toContain('data-condition-id="test-condition-123"');
		});

		it('should properly escape HTML in enum dropdown selection', () => {
			const section = new FilterPanelSection();
			const condition: FilterConditionViewModel = {
				id: 'cond-1',
				enabled: true,
				field: 'Mode',
				operator: 'Equals',
				value: 'Synchronous',
				logicalOperator: 'and'
			};

			const html = section.render({ state: { filterCriteria: { conditions: [condition], top: 50 } } });

			// Verify enum options are properly displayed without HTML injection
			expect(html).toContain('Synchronous');
			expect(html).toContain('Asynchronous');
			// Make sure dangerous characters are escaped if they appear
			expect(html).not.toContain('</select>alert');
		});
	});

	describe('render - field type detection', () => {
		it('should set correct field-type data attribute for text fields', () => {
			const section = new FilterPanelSection();
			const condition: FilterConditionViewModel = {
				id: 'cond-1',
				enabled: true,
				field: 'Plugin Name',
				operator: 'Contains',
				value: 'Test',
				logicalOperator: 'and'
			};

			const html = section.render({ state: { filterCriteria: { conditions: [condition], top: 50 } } });

			expect(html).toContain('data-field-type="text"');
		});

		it('should set correct field-type data attribute for date fields', () => {
			const section = new FilterPanelSection();
			const condition: FilterConditionViewModel = {
				id: 'cond-1',
				enabled: true,
				field: 'Created On',
				operator: 'Greater Than or Equal',
				value: '2025-11-10T10:30:00.000Z',
				logicalOperator: 'and'
			};

			const html = section.render({ state: { filterCriteria: { conditions: [condition], top: 50 } } });

			expect(html).toContain('data-field-type="date"');
		});

		it('should set correct field-type data attribute for number fields', () => {
			const section = new FilterPanelSection();
			const condition: FilterConditionViewModel = {
				id: 'cond-1',
				enabled: true,
				field: 'Depth',
				operator: 'Greater Than',
				value: '2',
				logicalOperator: 'and'
			};

			const html = section.render({ state: { filterCriteria: { conditions: [condition], top: 50 } } });

			expect(html).toContain('data-field-type="number"');
		});

		it('should set correct field-type data attribute for enum fields', () => {
			const section = new FilterPanelSection();
			const condition: FilterConditionViewModel = {
				id: 'cond-1',
				enabled: true,
				field: 'Mode',
				operator: 'Equals',
				value: 'Synchronous',
				logicalOperator: 'and'
			};

			const html = section.render({ state: { filterCriteria: { conditions: [condition], top: 50 } } });

			expect(html).toContain('data-field-type="enum"');
		});

		it('should handle unknown field names gracefully', () => {
			const section = new FilterPanelSection();
			const condition: FilterConditionViewModel = {
				id: 'cond-1',
				enabled: true,
				field: 'Unknown Field',
				operator: 'Contains',
				value: 'Test',
				logicalOperator: 'and'
			};

			const html = section.render({ state: { filterCriteria: { conditions: [condition], top: 50 } } });

			// Should render a text input as fallback
			expect(html).toContain('type="text"');
			expect(html).toContain('data-field-type="text"');
		});
	});

	describe('render - multiple conditions and complex queries', () => {
		it('should render multiple conditions in sequence', () => {
			const section = new FilterPanelSection();
			const conditions: FilterConditionViewModel[] = [
				{
					id: 'cond-1',
					enabled: true,
					field: 'Plugin Name',
					operator: 'Contains',
					value: 'Test',
					logicalOperator: 'and'
				},
				{
					id: 'cond-2',
					enabled: true,
					field: 'Entity Name',
					operator: 'Equals',
					value: 'Account',
					logicalOperator: 'or'
				},
				{
					id: 'cond-3',
					enabled: true,
					field: 'Duration (ms)',
					operator: 'Greater Than',
					value: '500',
					logicalOperator: 'and'
				}
			];

			const html = section.render({ state: { filterCriteria: { conditions, top: 50 } } });

			expect(html).toContain('data-condition-id="cond-1"');
			expect(html).toContain('data-condition-id="cond-2"');
			expect(html).toContain('data-condition-id="cond-3"');

			const rows = html.match(/class="filter-condition-row"/g);
			expect(rows).toHaveLength(3);
		});

		it('should properly set selected values in dropdowns for multiple conditions', () => {
			const section = new FilterPanelSection();
			const conditions: FilterConditionViewModel[] = [
				{
					id: 'cond-1',
					enabled: true,
					field: 'Plugin Name',
					operator: 'Contains',
					value: 'Test',
					logicalOperator: 'and'
				},
				{
					id: 'cond-2',
					enabled: true,
					field: 'Entity Name',
					operator: 'Equals',
					value: 'Account',
					logicalOperator: 'or'
				}
			];

			const html = section.render({ state: { filterCriteria: { conditions, top: 50 } } });

			expect(html).toContain('Plugin Name');
			expect(html).toContain('Entity Name');
			expect(html).toContain('Contains');
			expect(html).toContain('Equals');
		});
	});

	describe('render - edge cases and error handling', () => {
		it('should handle render data with empty state object', () => {
			const section = new FilterPanelSection();

			const html = section.render({ state: {} });

			expect(html).toBeDefined();
			expect(html).toContain('Filters (0 / 0)');
		});

		it('should handle render data without state property', () => {
			const section = new FilterPanelSection();

			const html = section.render({});

			expect(html).toBeDefined();
			expect(html).toContain('Filters (0 / 0)');
		});

		it('should handle conditions array with empty filter criteria', () => {
			const section = new FilterPanelSection();

			const html = section.render({ state: { filterCriteria: { conditions: [], top: 50 } } });

			expect(html).toBeDefined();
			expect(html).toContain('Filters (0 / 0)');
		});

		it('should handle invalid operator gracefully', () => {
			const section = new FilterPanelSection();
			const condition: FilterConditionViewModel = {
				id: 'cond-1',
				enabled: true,
				field: 'Plugin Name',
				operator: 'InvalidOperator',
				value: 'Test',
				logicalOperator: 'and'
			};

			const html = section.render({ state: { filterCriteria: { conditions: [condition], top: 50 } } });

			// Should still render the condition row even with invalid operator
			expect(html).toContain('data-condition-id="cond-1"');
		});

		it('should handle missing enabled property gracefully', () => {
			const section = new FilterPanelSection();
			const condition = {
				id: 'cond-1',
				field: 'Plugin Name',
				operator: 'Contains',
				value: 'Test',
				logicalOperator: 'and'
			} as FilterConditionViewModel;

			// Should not throw
			expect(() => {
				section.render({ state: { filterCriteria: { conditions: [condition], top: 50 } } });
			}).not.toThrow();
		});
	});
});
