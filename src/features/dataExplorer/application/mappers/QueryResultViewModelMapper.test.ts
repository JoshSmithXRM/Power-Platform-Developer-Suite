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

		it('should use formattedValue for QueryFormattedValue', () => {
			const formattedValue: QueryFormattedValue = {
				value: 1,
				formattedValue: 'Active',
			};
			const result = createResultWithValue('statecode', formattedValue);
			const viewModel = mapper.toViewModel(result);
			expect(viewModel.rows[0]!['statecode']).toBe('Active');
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
	});
});
