/**
 * Unit tests for visualQueryBuilderView
 * Tests cover HTML generation for the Visual Query Builder panel.
 */

import {
	renderVisualQueryBuilderSection,
	type VisualQueryBuilderRenderData,
	type EntityOption
} from './visualQueryBuilderView';
import type { ColumnOptionViewModel } from '../../application/viewModels/ColumnOptionViewModel';
import type { FilterConditionViewModel } from '../../application/viewModels/FilterConditionViewModel';

describe('visualQueryBuilderView', () => {
	/**
	 * Creates a default render data object for testing.
	 */
	const createDefaultRenderData = (
		overrides?: Partial<VisualQueryBuilderRenderData>
	): VisualQueryBuilderRenderData => ({
		entities: [],
		selectedEntity: null,
		isLoadingEntities: false,
		availableColumns: [],
		isSelectAllColumns: false,
		isLoadingColumns: false,
		filterConditions: [],
		sortAttribute: null,
		sortDescending: false,
		topN: null,
		distinct: false,
		generatedFetchXml: '',
		generatedSql: '',
		...overrides
	});

	const createEntityOption = (
		overrides?: Partial<EntityOption>
	): EntityOption => ({
		logicalName: 'account',
		displayName: 'Account',
		isCustomEntity: false,
		...overrides
	});

	const createColumnOption = (
		overrides?: Partial<ColumnOptionViewModel>
	): ColumnOptionViewModel => ({
		logicalName: 'name',
		displayName: 'Account Name',
		attributeType: 'String',
		isSelected: false,
		...overrides
	});

	const createFilterCondition = (
		overrides?: Partial<FilterConditionViewModel>
	): FilterConditionViewModel => ({
		id: 'cond-1',
		attribute: 'name',
		attributeDisplayName: 'Account Name',
		attributeType: 'String',
		operator: 'eq',
		operatorDisplayName: 'Equals',
		value: 'Test',
		enabled: true,
		...overrides
	});

	describe('renderVisualQueryBuilderSection', () => {
		describe('basic structure', () => {
			it('should render main container elements', () => {
				const data = createDefaultRenderData();
				const result = renderVisualQueryBuilderSection(data);

				expect(result).toContain('class="visual-query-builder-section"');
				expect(result).toContain('id="query-builder-section"');
				expect(result).toContain('class="query-results-section"');
				expect(result).toContain('id="results-table-container"');
			});

			it('should render query builder toggle button', () => {
				const data = createDefaultRenderData();
				const result = renderVisualQueryBuilderSection(data);

				expect(result).toContain('class="query-builder-toggle"');
				expect(result).toContain('id="query-builder-toggle"');
				expect(result).toContain('aria-expanded="true"');
				expect(result).toContain('Query Builder');
			});

			it('should render results status bar', () => {
				const data = createDefaultRenderData();
				const result = renderVisualQueryBuilderSection(data);

				expect(result).toContain('class="results-status-bar"');
				expect(result).toContain('id="results-count"');
				expect(result).toContain('id="execution-time"');
			});

			it('should render warning modal', () => {
				const data = createDefaultRenderData();
				const result = renderVisualQueryBuilderSection(data);

				expect(result).toContain('id="warning-modal"');
				expect(result).toContain('class="modal-overlay"');
				expect(result).toContain('role="dialog"');
			});
		});

		describe('entity picker', () => {
			it('should render entity picker section', () => {
				const data = createDefaultRenderData();
				const result = renderVisualQueryBuilderSection(data);

				expect(result).toContain('class="entity-picker-section"');
				expect(result).toContain('id="entity-picker"');
				expect(result).toContain('aria-label="Select entity"');
			});

			it('should show loading indicator when loading entities', () => {
				const data = createDefaultRenderData({ isLoadingEntities: true });
				const result = renderVisualQueryBuilderSection(data);

				expect(result).toContain('Loading...');
				expect(result).toContain('class="loading-indicator"');
				expect(result).toContain('disabled');
			});

			it('should show placeholder when no entities available', () => {
				const data = createDefaultRenderData({ entities: [] });
				const result = renderVisualQueryBuilderSection(data);

				expect(result).toContain('No entities available');
			});

			it('should render entity options with optgroups', () => {
				const entities: EntityOption[] = [
					createEntityOption({ logicalName: 'account', displayName: 'Account', isCustomEntity: false }),
					createEntityOption({ logicalName: 'cr123_custom', displayName: 'Custom', isCustomEntity: true })
				];
				const data = createDefaultRenderData({ entities });
				const result = renderVisualQueryBuilderSection(data);

				expect(result).toContain('<optgroup label="Standard Entities">');
				expect(result).toContain('<optgroup label="Custom Entities">');
				expect(result).toContain('value="account"');
				expect(result).toContain('value="cr123_custom"');
			});

			it('should mark selected entity', () => {
				const entities: EntityOption[] = [
					createEntityOption({ logicalName: 'account', displayName: 'Account' })
				];
				const data = createDefaultRenderData({
					entities,
					selectedEntity: 'account'
				});
				const result = renderVisualQueryBuilderSection(data);

				expect(result).toContain('value="account" selected');
			});

			it('should escape special characters in entity names', () => {
				const entities: EntityOption[] = [
					createEntityOption({
						logicalName: 'test<entity>',
						displayName: 'Test "Entity" & More'
					})
				];
				const data = createDefaultRenderData({ entities });
				const result = renderVisualQueryBuilderSection(data);

				expect(result).toContain('value="test&lt;entity&gt;"');
				expect(result).toContain('Test &quot;Entity&quot; &amp; More');
			});

			it('should render error banner when error message present', () => {
				const data = createDefaultRenderData({ errorMessage: 'Connection failed' });
				const result = renderVisualQueryBuilderSection(data);

				expect(result).toContain('class="error-banner"');
				expect(result).toContain('role="alert"');
				expect(result).toContain('Connection failed');
			});
		});

		describe('column picker', () => {
			it('should be hidden when no entity selected', () => {
				const data = createDefaultRenderData({ selectedEntity: null });
				const result = renderVisualQueryBuilderSection(data);

				expect(result).toContain('column-picker-hidden');
				expect(result).toContain('Select an entity to see columns');
			});

			it('should show loading state', () => {
				const data = createDefaultRenderData({
					selectedEntity: 'account',
					isLoadingColumns: true
				});
				const result = renderVisualQueryBuilderSection(data);

				expect(result).toContain('Loading columns...');
			});

			it('should show empty state when no columns', () => {
				const data = createDefaultRenderData({
					selectedEntity: 'account',
					availableColumns: []
				});
				const result = renderVisualQueryBuilderSection(data);

				expect(result).toContain('No columns available');
			});

			it('should render column options with checkboxes', () => {
				const columns: ColumnOptionViewModel[] = [
					createColumnOption({ logicalName: 'name', displayName: 'Name', attributeType: 'String' }),
					createColumnOption({ logicalName: 'accountid', displayName: 'Account ID', attributeType: 'UniqueIdentifier', isSelected: true })
				];
				const data = createDefaultRenderData({
					selectedEntity: 'account',
					availableColumns: columns
				});
				const result = renderVisualQueryBuilderSection(data);

				expect(result).toContain('data-column="name"');
				expect(result).toContain('data-column="accountid"');
				expect(result).toContain('class="column-logical-name">name');
				expect(result).toContain('class="column-display-name">Name');
			});

			it('should show count badge with selected columns', () => {
				const columns: ColumnOptionViewModel[] = [
					createColumnOption({ isSelected: true }),
					createColumnOption({ logicalName: 'other', isSelected: false })
				];
				const data = createDefaultRenderData({
					selectedEntity: 'account',
					availableColumns: columns
				});
				const result = renderVisualQueryBuilderSection(data);

				expect(result).toContain('(1 of 2)');
			});

			it('should show "All" when select all is checked', () => {
				const data = createDefaultRenderData({
					selectedEntity: 'account',
					isSelectAllColumns: true,
					availableColumns: [createColumnOption()]
				});
				const result = renderVisualQueryBuilderSection(data);

				expect(result).toContain('(All)');
			});

			it('should escape special characters in column data', () => {
				const columns: ColumnOptionViewModel[] = [
					createColumnOption({
						logicalName: 'test<col>',
						displayName: '"Display" & Name',
						attributeType: 'String<Type>'
					})
				];
				const data = createDefaultRenderData({
					selectedEntity: 'account',
					availableColumns: columns
				});
				const result = renderVisualQueryBuilderSection(data);

				expect(result).toContain('data-column="test&lt;col&gt;"');
				expect(result).toContain('&quot;Display&quot; &amp; Name');
			});
		});

		describe('filter section', () => {
			it('should be hidden when no entity selected', () => {
				const data = createDefaultRenderData({ selectedEntity: null });
				const result = renderVisualQueryBuilderSection(data);

				expect(result).toContain('filter-section-hidden');
				expect(result).toContain('Select an entity to add filters');
			});

			it('should show empty state when no filters', () => {
				const data = createDefaultRenderData({
					selectedEntity: 'account',
					filterConditions: []
				});
				const result = renderVisualQueryBuilderSection(data);

				expect(result).toContain('No filters applied');
			});

			it('should render filter conditions', () => {
				const conditions: FilterConditionViewModel[] = [
					createFilterCondition({ id: 'cond-1', attribute: 'name', operator: 'eq', value: 'Test' })
				];
				const columns: ColumnOptionViewModel[] = [createColumnOption()];
				const data = createDefaultRenderData({
					selectedEntity: 'account',
					filterConditions: conditions,
					availableColumns: columns
				});
				const result = renderVisualQueryBuilderSection(data);

				expect(result).toContain('data-condition-id="cond-1"');
				expect(result).toContain('class="filter-field-select"');
				expect(result).toContain('class="filter-operator-select"');
				expect(result).toContain('class="filter-value-input"');
			});

			it('should show WHERE for first condition and AND for subsequent', () => {
				const conditions: FilterConditionViewModel[] = [
					createFilterCondition({ id: 'cond-1' }),
					createFilterCondition({ id: 'cond-2' })
				];
				const columns: ColumnOptionViewModel[] = [createColumnOption()];
				const data = createDefaultRenderData({
					selectedEntity: 'account',
					filterConditions: conditions,
					availableColumns: columns
				});
				const result = renderVisualQueryBuilderSection(data);

				expect(result).toContain('class="filter-logical-label">WHERE');
				expect(result).toContain('class="filter-logical-label">AND');
			});

			it('should render number input for numeric types', () => {
				const conditions: FilterConditionViewModel[] = [
					createFilterCondition({ attributeType: 'Integer', value: '100' })
				];
				const data = createDefaultRenderData({
					selectedEntity: 'account',
					filterConditions: conditions,
					availableColumns: [createColumnOption()]
				});
				const result = renderVisualQueryBuilderSection(data);

				expect(result).toContain('type="number"');
			});

			it('should render datetime input for DateTime types', () => {
				const conditions: FilterConditionViewModel[] = [
					createFilterCondition({ attributeType: 'DateTime', value: '2024-01-01' })
				];
				const data = createDefaultRenderData({
					selectedEntity: 'account',
					filterConditions: conditions,
					availableColumns: [createColumnOption()]
				});
				const result = renderVisualQueryBuilderSection(data);

				expect(result).toContain('type="datetime-local"');
			});

			it('should render select for Boolean types', () => {
				const conditions: FilterConditionViewModel[] = [
					createFilterCondition({ attributeType: 'Boolean', value: 'true' })
				];
				const data = createDefaultRenderData({
					selectedEntity: 'account',
					filterConditions: conditions,
					availableColumns: [createColumnOption()]
				});
				const result = renderVisualQueryBuilderSection(data);

				expect(result).toContain('value="true" selected>Yes');
				expect(result).toContain('value="false"');
				expect(result).toContain('>No</option>');
			});

			it('should show placeholder for null operators', () => {
				const conditions: FilterConditionViewModel[] = [
					createFilterCondition({ operator: 'null', value: null })
				];
				const data = createDefaultRenderData({
					selectedEntity: 'account',
					filterConditions: conditions,
					availableColumns: [createColumnOption()]
				});
				const result = renderVisualQueryBuilderSection(data);

				expect(result).toContain('(no value needed)');
			});

			it('should show filter count badge', () => {
				const conditions: FilterConditionViewModel[] = [
					createFilterCondition({ id: 'cond-1' }),
					createFilterCondition({ id: 'cond-2' })
				];
				const data = createDefaultRenderData({
					selectedEntity: 'account',
					filterConditions: conditions,
					availableColumns: [createColumnOption()]
				});
				const result = renderVisualQueryBuilderSection(data);

				expect(result).toContain('id="filter-count-badge">(2)');
			});
		});

		describe('sort section', () => {
			it('should be hidden when no entity selected', () => {
				const data = createDefaultRenderData({ selectedEntity: null });
				const result = renderVisualQueryBuilderSection(data);

				expect(result).toContain('sort-section-hidden');
				expect(result).toContain('Select an entity to configure sorting');
			});

			it('should render sort attribute dropdown', () => {
				const columns: ColumnOptionViewModel[] = [
					createColumnOption({ logicalName: 'name', displayName: 'Name' })
				];
				const data = createDefaultRenderData({
					selectedEntity: 'account',
					availableColumns: columns
				});
				const result = renderVisualQueryBuilderSection(data);

				expect(result).toContain('id="sort-attribute-select"');
				expect(result).toContain('ORDER BY');
			});

			it('should mark selected sort attribute', () => {
				const columns: ColumnOptionViewModel[] = [
					createColumnOption({ logicalName: 'name', displayName: 'Name' })
				];
				const data = createDefaultRenderData({
					selectedEntity: 'account',
					availableColumns: columns,
					sortAttribute: 'name'
				});
				const result = renderVisualQueryBuilderSection(data);

				expect(result).toContain('value="name" selected');
			});

			it('should show sort direction selection', () => {
				const data = createDefaultRenderData({
					selectedEntity: 'account',
					sortAttribute: 'name',
					sortDescending: true
				});
				const result = renderVisualQueryBuilderSection(data);

				expect(result).toContain('value="desc" selected>Descending');
			});

			it('should show clear sort button when sort is active', () => {
				const data = createDefaultRenderData({
					selectedEntity: 'account',
					sortAttribute: 'name',
					availableColumns: [createColumnOption()]
				});
				const result = renderVisualQueryBuilderSection(data);

				expect(result).toContain('id="clear-sort-btn"');
			});

			it('should disable direction when no sort attribute', () => {
				const data = createDefaultRenderData({
					selectedEntity: 'account',
					sortAttribute: null,
					availableColumns: [createColumnOption()]
				});
				const result = renderVisualQueryBuilderSection(data);

				expect(result).toContain('id="sort-direction-select"');
				// Check for disabled attribute
				expect(result).toMatch(/sort-direction-select[\s\S]*?disabled/);
			});

			it('should show sort count badge when sorted', () => {
				const data = createDefaultRenderData({
					selectedEntity: 'account',
					sortAttribute: 'name'
				});
				const result = renderVisualQueryBuilderSection(data);

				expect(result).toContain('id="sort-count-badge">(1)');
			});
		});

		describe('query options section', () => {
			it('should be hidden when no entity selected', () => {
				const data = createDefaultRenderData({ selectedEntity: null });
				const result = renderVisualQueryBuilderSection(data);

				expect(result).toContain('query-options-hidden');
				expect(result).toContain('Select an entity to configure options');
			});

			it('should render Top N input', () => {
				const data = createDefaultRenderData({
					selectedEntity: 'account',
					topN: 100
				});
				const result = renderVisualQueryBuilderSection(data);

				expect(result).toContain('id="top-n-input"');
				expect(result).toContain('value="100"');
			});

			it('should render Distinct checkbox', () => {
				const data = createDefaultRenderData({
					selectedEntity: 'account',
					distinct: true
				});
				const result = renderVisualQueryBuilderSection(data);

				expect(result).toContain('id="distinct-checkbox"');
				expect(result).toContain('checked');
				expect(result).toContain('DISTINCT');
			});

			it('should show options summary in header', () => {
				const data = createDefaultRenderData({
					selectedEntity: 'account',
					topN: 50,
					distinct: true
				});
				const result = renderVisualQueryBuilderSection(data);

				expect(result).toContain('Top 50');
				expect(result).toContain('Distinct');
			});
		});

		describe('query preview', () => {
			it('should render FetchXML and SQL tabs', () => {
				const data = createDefaultRenderData();
				const result = renderVisualQueryBuilderSection(data);

				expect(result).toContain('id="preview-tab-fetchxml"');
				expect(result).toContain('id="preview-tab-sql"');
				expect(result).toContain('FetchXML');
				expect(result).toContain('SQL');
			});

			it('should show empty state when no query generated', () => {
				const data = createDefaultRenderData({
					generatedFetchXml: '',
					generatedSql: ''
				});
				const result = renderVisualQueryBuilderSection(data);

				expect(result).toContain('Select an entity to generate FetchXML');
				expect(result).toContain('Select an entity to generate SQL');
			});

			it('should render generated FetchXML', () => {
				const fetchXml = '<fetch><entity name="account" /></fetch>';
				const data = createDefaultRenderData({ generatedFetchXml: fetchXml });
				const result = renderVisualQueryBuilderSection(data);

				expect(result).toContain('id="fetchxml-preview-content"');
				expect(result).toContain('&lt;fetch&gt;&lt;entity name=&quot;account&quot; /&gt;&lt;/fetch&gt;');
			});

			it('should render generated SQL', () => {
				const sql = 'SELECT * FROM account';
				const data = createDefaultRenderData({ generatedSql: sql });
				const result = renderVisualQueryBuilderSection(data);

				expect(result).toContain('id="sql-preview-content"');
				expect(result).toContain('SELECT * FROM account');
			});

			it('should render copy buttons when content available', () => {
				const data = createDefaultRenderData({
					generatedFetchXml: '<fetch />',
					generatedSql: 'SELECT *'
				});
				const result = renderVisualQueryBuilderSection(data);

				expect(result).toContain('data-copy-target="fetchxml"');
				expect(result).toContain('data-copy-target="sql"');
			});
		});

		describe('XSS prevention', () => {
			it('should escape HTML in all user-provided data', () => {
				const maliciousInput = '<script>alert("xss")</script>';
				const data = createDefaultRenderData({
					entities: [createEntityOption({
						logicalName: maliciousInput,
						displayName: maliciousInput
					})],
					selectedEntity: 'account',
					availableColumns: [createColumnOption({
						logicalName: maliciousInput,
						displayName: maliciousInput,
						attributeType: maliciousInput
					})],
					filterConditions: [createFilterCondition({
						id: maliciousInput,
						value: maliciousInput
					})],
					generatedFetchXml: maliciousInput,
					generatedSql: maliciousInput,
					errorMessage: maliciousInput
				});
				const result = renderVisualQueryBuilderSection(data);

				// Should NOT contain raw script tags
				expect(result).not.toContain('<script>');
				expect(result).not.toContain('alert("xss")');
				// Should contain escaped versions
				expect(result).toContain('&lt;script&gt;');
			});

			it('should escape quotes in attribute values', () => {
				const data = createDefaultRenderData({
					filterConditions: [createFilterCondition({
						id: 'cond"with"quotes',
						value: 'value"with"quotes'
					})],
					selectedEntity: 'account',
					availableColumns: [createColumnOption()]
				});
				const result = renderVisualQueryBuilderSection(data);

				expect(result).toContain('&quot;');
				expect(result).not.toContain('cond"with"quotes');
			});

			it('should escape ampersands', () => {
				const data = createDefaultRenderData({
					errorMessage: 'Error & Warning'
				});
				const result = renderVisualQueryBuilderSection(data);

				expect(result).toContain('Error &amp; Warning');
			});
		});

		describe('accessibility', () => {
			it('should have aria labels on interactive elements', () => {
				const data = createDefaultRenderData({
					selectedEntity: 'account',
					availableColumns: [createColumnOption()],
					filterConditions: [createFilterCondition()]
				});
				const result = renderVisualQueryBuilderSection(data);

				expect(result).toContain('aria-label="Select entity"');
				expect(result).toContain('aria-label="Available columns"');
				expect(result).toContain('aria-label="Select field"');
				expect(result).toContain('aria-label="Select operator"');
				expect(result).toContain('aria-label="Filter value"');
			});

			it('should have proper ARIA roles', () => {
				const data = createDefaultRenderData();
				const result = renderVisualQueryBuilderSection(data);

				expect(result).toContain('role="dialog"');
				expect(result).toContain('role="tablist"');
				expect(result).toContain('role="tab"');
				expect(result).toContain('role="tabpanel"');
				expect(result).toContain('role="listbox"');
			});
		});
	});
});
