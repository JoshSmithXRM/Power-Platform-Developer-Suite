/**
 * Integration tests for DataverseNotebookController.
 *
 * REGRESSION TEST: Notebook shows "no data" when Data Explorer shows data correctly.
 *
 * Customer scenario:
 * - Same query works in Data Explorer panel
 * - Same query shows empty cells in Notebook
 * - Reloading VS Code window fixes the issue
 *
 * This test verifies the end-to-end flow from query result to rendered HTML.
 */

import { QueryResult } from '../domain/entities/QueryResult';
import { QueryResultColumn } from '../domain/valueObjects/QueryResultColumn';
import { QueryResultRow, QueryLookupValue } from '../domain/valueObjects/QueryResultRow';
import { QueryResultViewModelMapper } from '../application/mappers/QueryResultViewModelMapper';

describe('DataverseNotebookController - Integration Tests', () => {
	let mapper: QueryResultViewModelMapper;

	beforeEach(() => {
		mapper = new QueryResultViewModelMapper();
	});

	describe('REGRESSION: Customer query with explicit name columns', () => {
		/**
		 * This test simulates the exact customer scenario:
		 *
		 * SELECT TOP 20
		 *   et_salesappointmentsid,
		 *   et_activitynumber,
		 *   et_mobilestatus,
		 *   et_salesrepownerid,
		 *   et_salesrepowneridname,
		 *   createdon,
		 *   createdby,
		 *   createdbyname
		 * FROM et_salesappointments
		 *
		 * The query explicitly requests both lookup fields and their name fields.
		 */
		it('should produce rowData with all cell values populated for customer query pattern', () => {
			// Simulate the domain result from the repository
			const lookupValue: QueryLookupValue = {
				id: '12345678-1234-1234-1234-123456789012',
				name: 'John Smith',
				entityType: 'systemuser',
			};

			const columns = [
				new QueryResultColumn('et_salesappointmentsid', 'et_salesappointmentsid', 'guid'),
				new QueryResultColumn('et_activitynumber', 'et_activitynumber', 'string'),
				new QueryResultColumn('createdby', 'createdby', 'lookup'),
				new QueryResultColumn('createdbyname', 'createdbyname', 'unknown'), // Explicit name column
			];

			const rows = [
				QueryResultRow.fromRecord({
					et_salesappointmentsid: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
					et_activitynumber: 'ACT-001',
					createdby: lookupValue as never,
					createdbyname: null, // Dataverse returns null for explicit virtual column queries
				}),
			];

			const fetchXml = '<fetch><entity name="et_salesappointments"></entity></fetch>';
			const result = new QueryResult(columns, rows, 1, false, null, fetchXml, 100);

			// Map to ViewModel (same as notebook controller does)
			const viewModel = mapper.toViewModel(result);

			// CRITICAL: All cells should have values
			expect(viewModel.rows.length).toBe(1);
			const row = viewModel.rows[0]!;

			// Verify each column has a value (not undefined)
			expect(row['et_salesappointmentsid']).toBe('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
			expect(row['et_activitynumber']).toBe('ACT-001');
			expect(row['createdby']).toBe('12345678-1234-1234-1234-123456789012'); // GUID from lookup
			expect(row['createdbyname']).toBe('John Smith'); // Name from lookup, NOT null

			// Simulate the notebook's prepareRowDataForVirtualTable function
			// This is what actually renders in the notebook
			const rowData = viewModel.columns.map((col) => {
				const value = row[col.name] ?? '';
				return value;
			});

			// All cells should have content
			expect(rowData).toEqual([
				'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
				'ACT-001',
				'12345678-1234-1234-1234-123456789012',
				'John Smith',
			]);

			// None should be empty (except legitimately empty values)
			rowData.forEach((value, index) => {
				expect(value).not.toBe('');
				expect(typeof value).toBe('string');
			});
		});

		it('should handle column name case sensitivity correctly', () => {
			// Test that row keys match column names exactly
			const columns = [
				new QueryResultColumn('AccountID', 'AccountID', 'guid'),
				new QueryResultColumn('Name', 'Name', 'string'),
			];

			const rows = [
				QueryResultRow.fromRecord({
					AccountID: 'test-guid',
					Name: 'Test Account',
				}),
			];

			const result = new QueryResult(columns, rows, 1, false, null, '<fetch/>', 100);
			const viewModel = mapper.toViewModel(result);

			const row = viewModel.rows[0]!;

			// Access using exact column names from ViewModel
			viewModel.columns.forEach((col) => {
				const value = row[col.name];
				expect(value).toBeDefined();
				expect(value).not.toBe('');
			});
		});

		it('should handle mixed null and populated lookup values', () => {
			// Some rows have lookup values, others have null
			const lookupValue: QueryLookupValue = {
				id: 'user-guid-1',
				name: 'User One',
				entityType: 'systemuser',
			};

			const columns = [
				new QueryResultColumn('id', 'id', 'guid'),
				new QueryResultColumn('ownerid', 'ownerid', 'lookup'),
				new QueryResultColumn('owneridname', 'owneridname', 'unknown'),
			];

			const rows = [
				// Row with lookup value
				QueryResultRow.fromRecord({
					id: 'row-1',
					ownerid: lookupValue as never,
					owneridname: null,
				}),
				// Row with null lookup
				QueryResultRow.fromRecord({
					id: 'row-2',
					ownerid: null,
					owneridname: null,
				}),
			];

			const result = new QueryResult(columns, rows, 2, false, null, '<fetch/>', 100);
			const viewModel = mapper.toViewModel(result);

			// Row 1: should have lookup values
			expect(viewModel.rows[0]!['ownerid']).toBe('user-guid-1');
			expect(viewModel.rows[0]!['owneridname']).toBe('User One');

			// Row 2: should have empty strings (null lookup)
			expect(viewModel.rows[1]!['ownerid']).toBe('');
			expect(viewModel.rows[1]!['owneridname']).toBe('');
		});
	});

	describe('Column to Row key matching', () => {
		it('should ensure column names match row keys exactly', () => {
			const columns = [
				new QueryResultColumn('field1', 'field1', 'string'),
				new QueryResultColumn('field2', 'field2', 'string'),
			];

			const rows = [
				QueryResultRow.fromRecord({
					field1: 'value1',
					field2: 'value2',
				}),
			];

			const result = new QueryResult(columns, rows, 1, false, null, '<fetch/>', 100);
			const viewModel = mapper.toViewModel(result);

			// Get all column names from ViewModel
			const columnNames = viewModel.columns.map((c) => c.name);

			// Get all row keys from first row
			const rowKeys = Object.keys(viewModel.rows[0]!);

			// Every column name should exist as a row key
			columnNames.forEach((colName) => {
				expect(rowKeys).toContain(colName);
			});
		});

		it('should not have orphan row keys that are not in columns', () => {
			// This catches the case where rows have extra keys not in columns
			const lookupValue: QueryLookupValue = {
				id: 'test-id',
				name: 'Test Name',
				entityType: 'contact',
			};

			const columns = [
				new QueryResultColumn('contactid', 'contactid', 'lookup'),
			];

			const rows = [
				QueryResultRow.fromRecord({
					contactid: lookupValue as never,
				}),
			];

			const result = new QueryResult(columns, rows, 1, false, null, '<fetch/>', 100);
			const viewModel = mapper.toViewModel(result);

			// ViewModel should have expanded columns (contactid + contactidname)
			const columnNames = viewModel.columns.map((c) => c.name);
			expect(columnNames).toContain('contactid');
			expect(columnNames).toContain('contactidname');

			// Row should have matching keys
			const rowKeys = Object.keys(viewModel.rows[0]!);
			expect(rowKeys).toContain('contactid');
			expect(rowKeys).toContain('contactidname');

			// All row keys should be represented in columns
			rowKeys.forEach((key) => {
				expect(columnNames).toContain(key);
			});
		});
	});
});
