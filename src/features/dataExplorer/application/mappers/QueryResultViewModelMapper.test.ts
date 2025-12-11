import { QueryResultViewModelMapper } from './QueryResultViewModelMapper';
import { QueryResult } from '../../domain/entities/QueryResult';
import { QueryResultColumn } from '../../domain/valueObjects/QueryResultColumn';
import {
	QueryResultRow,
	QueryLookupValue,
	QueryFormattedValue,
} from '../../domain/valueObjects/QueryResultRow';

describe('QueryResultViewModelMapper', () => {
	let mapper: QueryResultViewModelMapper;

	beforeEach(() => {
		mapper = new QueryResultViewModelMapper();
	});

	describe('toViewModel', () => {
		it('should map empty result', () => {
			const result = QueryResult.empty('<fetch />', 100);

			const viewModel = mapper.toViewModel(result);

			expect(viewModel.columns).toHaveLength(0);
			expect(viewModel.rows).toHaveLength(0);
			expect(viewModel.executionTimeMs).toBe(100);
			expect(viewModel.executedFetchXml).toBe('<fetch />');
		});

		it('should map result with data', () => {
			const columns = [
				new QueryResultColumn('name', 'Account Name', 'string'),
				new QueryResultColumn('revenue', 'Annual Revenue', 'money'),
			];
			const rows = [
				QueryResultRow.fromRecord({ name: 'Contoso', revenue: 1000000 }),
				QueryResultRow.fromRecord({ name: 'Fabrikam', revenue: 500000 }),
			];
			const result = new QueryResult(
				columns,
				rows,
				2,
				false,
				null,
				'<fetch />',
				150
			);

			const viewModel = mapper.toViewModel(result);

			expect(viewModel.columns).toHaveLength(2);
			expect(viewModel.rows).toHaveLength(2);
			expect(viewModel.totalRecordCount).toBe(2);
			expect(viewModel.hasMoreRecords).toBe(false);
		});
	});

	describe('column header formatting', () => {
		it('should use displayName when different from logicalName', () => {
			const columns = [
				new QueryResultColumn('accountname', 'Account Name', 'string'),
			];
			const result = new QueryResult(columns, [], 0, false, null, '', 0);

			const viewModel = mapper.toViewModel(result);

			expect(viewModel.columns[0]!.header).toBe('Account Name');
		});

		it('should use logicalName as-is when displayName matches', () => {
			const columns = [
				new QueryResultColumn('accountname', 'accountname', 'string'),
			];
			const result = new QueryResult(columns, [], 0, false, null, '', 0);

			const viewModel = mapper.toViewModel(result);

			expect(viewModel.columns[0]!.header).toBe('accountname');
		});

		it('should preserve underscores in logicalName when no distinct displayName', () => {
			const columns = [
				new QueryResultColumn(
					'primary_contact_id',
					'primary_contact_id',
					'lookup'
				),
			];
			const result = new QueryResult(columns, [], 0, false, null, '', 0);

			const viewModel = mapper.toViewModel(result);

			expect(viewModel.columns[0]!.header).toBe('primary_contact_id');
		});

		it('should use logicalName when displayName is empty', () => {
			const columns = [new QueryResultColumn('name', '', 'string')];
			const result = new QueryResult(columns, [], 0, false, null, '', 0);

			const viewModel = mapper.toViewModel(result);

			expect(viewModel.columns[0]!.header).toBe('name');
		});
	});

	describe('cell value formatting', () => {
		function createResultWithValue(
			columnName: string,
			value: unknown
		): QueryResult {
			const columns = [new QueryResultColumn(columnName, columnName, 'unknown')];
			const rows = [
				QueryResultRow.fromRecord({ [columnName]: value as never }),
			];
			return new QueryResult(columns, rows, 1, false, null, '', 0);
		}

		it('should format null as empty string', () => {
			const result = createResultWithValue('name', null);
			const viewModel = mapper.toViewModel(result);
			expect(viewModel.rows[0]!['name']).toBe('');
		});

		it('should format undefined as empty string', () => {
			const result = createResultWithValue('name', undefined);
			const viewModel = mapper.toViewModel(result);
			expect(viewModel.rows[0]!['name']).toBe('');
		});

		it('should format string values', () => {
			const result = createResultWithValue('name', 'Contoso');
			const viewModel = mapper.toViewModel(result);
			expect(viewModel.rows[0]!['name']).toBe('Contoso');
		});

		it('should format number values', () => {
			const result = createResultWithValue('revenue', 1000000);
			const viewModel = mapper.toViewModel(result);
			expect(viewModel.rows[0]!['revenue']).toBe('1000000');
		});

		it('should format boolean true as Yes', () => {
			const result = createResultWithValue('active', true);
			const viewModel = mapper.toViewModel(result);
			expect(viewModel.rows[0]!['active']).toBe('Yes');
		});

		it('should format boolean false as No', () => {
			const result = createResultWithValue('active', false);
			const viewModel = mapper.toViewModel(result);
			expect(viewModel.rows[0]!['active']).toBe('No');
		});

		it('should format Date as ISO string', () => {
			const date = new Date('2024-01-15T10:30:00.000Z');
			const result = createResultWithValue('createdon', date);
			const viewModel = mapper.toViewModel(result);
			expect(viewModel.rows[0]!['createdon']).toBe('2024-01-15T10:30:00.000Z');
		});

		it('should show raw numeric value for optionset columns, not formatted label', () => {
			// Regression test for optionset formatting issue
			// accountcategorycode optionset: 1 = "Preferred Customer", 2 = "Standard"
			// Expected: accountcategorycode column shows 1, NOT "Preferred Customer"
			const formattedValue: QueryFormattedValue = {
				value: 1,
				formattedValue: 'Preferred Customer',
			};
			// Must use 'optionset' dataType - this is what the repository infers for integer formatted values
			const columns = [new QueryResultColumn('accountcategorycode', 'accountcategorycode', 'optionset')];
			const rows = [
				QueryResultRow.fromRecord({ accountcategorycode: formattedValue as never }),
			];
			const queryResult = new QueryResult(columns, rows, 1, false, null, '', 0);
			const viewModel = mapper.toViewModel(queryResult);
			// Should show the raw numeric value, not the label
			expect(viewModel.rows[0]!['accountcategorycode']).toBe('1');
		});

		it('should create virtual "name" column for optionset formatted labels', () => {
			// Regression test: optionset fields should have a companion "name" column
			// accountcategorycode = 1, accountcategorycodename = "Preferred Customer"
			const formattedValue: QueryFormattedValue = {
				value: 1,
				formattedValue: 'Preferred Customer',
			};
			const columns = [new QueryResultColumn('accountcategorycode', 'accountcategorycode', 'optionset')];
			const rows = [
				QueryResultRow.fromRecord({ accountcategorycode: formattedValue as never }),
			];
			const queryResult = new QueryResult(columns, rows, 1, false, null, '', 0);

			const viewModel = mapper.toViewModel(queryResult);

			// Should have 2 columns: original + name column
			expect(viewModel.columns).toHaveLength(2);
			expect(viewModel.columns.map(c => c.name)).toContain('accountcategorycode');
			expect(viewModel.columns.map(c => c.name)).toContain('accountcategorycodename');

			// Original column shows numeric value
			expect(viewModel.rows[0]!['accountcategorycode']).toBe('1');
			// Name column shows formatted label
			expect(viewModel.rows[0]!['accountcategorycodename']).toBe('Preferred Customer');
		});

		it('should handle null optionset values gracefully', () => {
			// Optionset with null value should not create name column with undefined
			const formattedValue: QueryFormattedValue = {
				value: null,
				formattedValue: '',
			};
			const columns = [new QueryResultColumn('accountcategorycode', 'accountcategorycode', 'optionset')];
			const rows = [
				QueryResultRow.fromRecord({ accountcategorycode: formattedValue as never }),
			];
			const queryResult = new QueryResult(columns, rows, 1, false, null, '', 0);

			const viewModel = mapper.toViewModel(queryResult);

			// Should still have 2 columns
			expect(viewModel.columns).toHaveLength(2);
			// Both should show empty for null values
			expect(viewModel.rows[0]!['accountcategorycode']).toBe('');
			expect(viewModel.rows[0]!['accountcategorycodename']).toBe('');
		});

		it('should use formattedValue for non-optionset QueryFormattedValue (money)', () => {
			// Money columns should still use formatted value for display
			const formattedValue: QueryFormattedValue = {
				value: 1000000,
				formattedValue: '$1,000,000.00',
			};
			const columns = [new QueryResultColumn('revenue', 'revenue', 'money')];
			const rows = [
				QueryResultRow.fromRecord({ revenue: formattedValue as never }),
			];
			const queryResult = new QueryResult(columns, rows, 1, false, null, '', 0);
			const viewModel = mapper.toViewModel(queryResult);
			// Money should still show formatted value
			expect(viewModel.rows[0]!['revenue']).toBe('$1,000,000.00');
		});

		it('should use name for QueryLookupValue', () => {
			const lookupValue: QueryLookupValue = {
				id: '123',
				name: 'John Smith',
				entityType: 'contact',
			};
			const result = createResultWithValue('primarycontactid', lookupValue);
			const viewModel = mapper.toViewModel(result);
			expect(viewModel.rows[0]!['primarycontactid']).toBe('John Smith');
		});

		it('should use ID for lookup without name', () => {
			const lookupValue: QueryLookupValue = {
				id: '123',
				name: undefined,
				entityType: 'contact',
			};
			const result = createResultWithValue('primarycontactid', lookupValue);
			const viewModel = mapper.toViewModel(result);
			// Falls back to ID when name is missing (e.g., owninguser system field)
			expect(viewModel.rows[0]!['primarycontactid']).toBe('123');
		});

		it('should populate rowLookups for lookup columns', () => {
			const lookupValue: QueryLookupValue = {
				id: '123',
				name: 'John Smith',
				entityType: 'contact',
			};
			const result = createResultWithValue('primarycontactid', lookupValue);
			const viewModel = mapper.toViewModel(result);

			// rowLookups should have the lookup info keyed by column name
			expect(viewModel.rowLookups).toHaveLength(1);
			expect(viewModel.rowLookups[0]).toBeDefined();
			expect(viewModel.rowLookups[0]!['primarycontactid']).toEqual({
				entityType: 'contact',
				id: '123',
			});
		});

		it('should populate rowLookups for aliased lookup columns', () => {
			// Simulate an aliased column: column.logicalName = 'CREATEDBY'
			// The lookup value is stored under this key
			const lookupValue: QueryLookupValue = {
				id: '456',
				name: 'Jane Doe',
				entityType: 'systemuser',
			};
			// Create result with aliased column name
			const result = createResultWithValue('CREATEDBY', lookupValue);
			const viewModel = mapper.toViewModel(result);

			// rowLookups should have the lookup info keyed by the column's logicalName
			expect(viewModel.rowLookups).toHaveLength(1);
			expect(viewModel.rowLookups[0]).toBeDefined();
			expect(viewModel.rowLookups[0]!['CREATEDBY']).toEqual({
				entityType: 'systemuser',
				id: '456',
			});

			// The column.name in ViewModel should also be 'CREATEDBY'
			expect(viewModel.columns[0]!.name).toBe('CREATEDBY');
		});

		it('should show GUID in lookup column and name in companion name column', () => {
			// Lookup columns should show GUID in main column, name in "name" column
			const lookupValue: QueryLookupValue = {
				id: 'abc-123-def',
				name: 'John Smith',
				entityType: 'contact',
			};
			const columns = [new QueryResultColumn('primarycontactid', 'Primary Contact', 'lookup')];
			const rows = [
				QueryResultRow.fromRecord({ primarycontactid: lookupValue as never }),
			];
			const queryResult = new QueryResult(columns, rows, 1, false, null, '', 0);

			const viewModel = mapper.toViewModel(queryResult);

			// Should have 2 columns: original (GUID) + name column
			expect(viewModel.columns).toHaveLength(2);
			expect(viewModel.columns.map(c => c.name)).toContain('primarycontactid');
			expect(viewModel.columns.map(c => c.name)).toContain('primarycontactidname');

			// Original column shows GUID
			expect(viewModel.rows[0]!['primarycontactid']).toBe('abc-123-def');
			// Name column shows display name
			expect(viewModel.rows[0]!['primarycontactidname']).toBe('John Smith');
		});

		it('should handle null lookup values', () => {
			// Null lookup should show empty string in both columns
			const columns = [new QueryResultColumn('primarycontactid', 'Primary Contact', 'lookup')];
			const rows = [
				QueryResultRow.fromRecord({ primarycontactid: null as never }),
			];
			const queryResult = new QueryResult(columns, rows, 1, false, null, '', 0);

			const viewModel = mapper.toViewModel(queryResult);

			// Should have 2 columns
			expect(viewModel.columns).toHaveLength(2);
			// Both should be empty for null lookup
			expect(viewModel.rows[0]!['primarycontactid']).toBe('');
			expect(viewModel.rows[0]!['primarycontactidname']).toBe('');
		});

		it('should handle raw null optionset values', () => {
			// Null optionset value (not wrapped in FormattedValue)
			const columns = [new QueryResultColumn('statuscode', 'Status', 'optionset')];
			const rows = [
				QueryResultRow.fromRecord({ statuscode: null as never }),
			];
			const queryResult = new QueryResult(columns, rows, 1, false, null, '', 0);

			const viewModel = mapper.toViewModel(queryResult);

			// Should have 2 columns
			expect(viewModel.columns).toHaveLength(2);
			// Both should be empty for null
			expect(viewModel.rows[0]!['statuscode']).toBe('');
			expect(viewModel.rows[0]!['statuscodename']).toBe('');
		});

		it('should stringify unknown objects', () => {
			// Unknown object type should be JSON stringified
			const unknownValue = { custom: 'data', nested: { value: 42 } };
			const columns = [new QueryResultColumn('customfield', 'Custom Field', 'unknown')];
			const rows = [
				QueryResultRow.fromRecord({ customfield: unknownValue as never }),
			];
			const queryResult = new QueryResult(columns, rows, 1, false, null, '', 0);

			const viewModel = mapper.toViewModel(queryResult);

			// Should JSON.stringify unknown objects
			expect(viewModel.rows[0]!['customfield']).toBe('{"custom":"data","nested":{"value":42}}');
		});
	});

	describe('columnsToShow filtering', () => {
		it('should filter columns when columnsToShow is provided', () => {
			const columns = [
				new QueryResultColumn('name', 'Name', 'string'),
				new QueryResultColumn('revenue', 'Revenue', 'money'),
				new QueryResultColumn('status', 'Status', 'string'),
			];
			const rows = [
				QueryResultRow.fromRecord({ name: 'Contoso', revenue: 1000000, status: 'Active' }),
			];
			const result = new QueryResult(columns, rows, 1, false, null, '', 0);

			const viewModel = mapper.toViewModel(result, ['name', 'status']);

			expect(viewModel.columns).toHaveLength(2);
			expect(viewModel.columns.map(c => c.name)).toContain('name');
			expect(viewModel.columns.map(c => c.name)).toContain('status');
			expect(viewModel.columns.map(c => c.name)).not.toContain('revenue');
		});

		it('should filter row data when columnsToShow is provided', () => {
			const columns = [
				new QueryResultColumn('name', 'Name', 'string'),
				new QueryResultColumn('revenue', 'Revenue', 'money'),
			];
			const rows = [
				QueryResultRow.fromRecord({ name: 'Contoso', revenue: 1000000 }),
			];
			const result = new QueryResult(columns, rows, 1, false, null, '', 0);

			const viewModel = mapper.toViewModel(result, ['name']);

			// Row data should only have 'name'
			expect(Object.keys(viewModel.rows[0] || {})).toEqual(['name']);
		});

		it('should filter rowLookups when columnsToShow is provided', () => {
			const lookupValue: QueryLookupValue = {
				id: '123',
				name: 'John Smith',
				entityType: 'contact',
			};
			const columns = [
				new QueryResultColumn('name', 'Name', 'string'),
				new QueryResultColumn('primarycontactid', 'Primary Contact', 'lookup'),
			];
			const rows = [
				QueryResultRow.fromRecord({ name: 'Contoso', primarycontactid: lookupValue as never }),
			];
			const result = new QueryResult(columns, rows, 1, false, null, '', 0);

			const viewModel = mapper.toViewModel(result, ['name']);

			// rowLookups should not include primarycontactid since it's filtered out
			expect(viewModel.rowLookups[0]!['primarycontactid']).toBeUndefined();
		});

		it('should be case-insensitive when filtering columns', () => {
			const columns = [
				new QueryResultColumn('Name', 'Name', 'string'),
				new QueryResultColumn('Revenue', 'Revenue', 'money'),
			];
			const rows = [
				QueryResultRow.fromRecord({ Name: 'Contoso', Revenue: 1000000 }),
			];
			const result = new QueryResult(columns, rows, 1, false, null, '', 0);

			// Use lowercase in columnsToShow
			const viewModel = mapper.toViewModel(result, ['name']);

			expect(viewModel.columns).toHaveLength(1);
			expect(viewModel.columns[0]!.name).toBe('Name');
		});
	});
});
