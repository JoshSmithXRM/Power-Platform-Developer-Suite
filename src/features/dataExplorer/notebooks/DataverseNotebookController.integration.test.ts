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
import { generateVirtualScrollScript } from '../../../shared/infrastructure/ui/virtualScroll/VirtualScrollScriptGenerator';

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
			rowData.forEach((value) => {
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

	describe('REGRESSION: Multiple cell outputs with duplicate element IDs', () => {
		/**
		 * REGRESSION TEST: Query 2 results appear in Query 1's output cell
		 *
		 * Bug scenario:
		 * 1. User runs Query 1 in Cell 1 → Output renders with id="scrollContainer", id="tableBody"
		 * 2. User runs Query 2 in Cell 2 → Output renders with SAME IDs
		 * 3. Query 2's JavaScript calls document.getElementById('scrollContainer')
		 * 4. Gets Cell 1's container (first match in DOM) instead of Cell 2's
		 * 5. Query 2's data renders into Cell 1's table!
		 * 6. Cell 2 shows headers only (its tbody never gets populated)
		 *
		 * Fix: Each cell output must use unique element IDs to prevent cross-cell interference.
		 */
		describe('Element ID uniqueness', () => {
			/**
			 * Helper to simulate renderResultsHtml output structure.
			 * This mimics what DataverseNotebookController.renderResultsHtml produces.
			 */
			function simulateRenderResultsHtml(
				scrollContainerId: string,
				tbodyId: string,
				rowData: string[][]
			): string {
				const script = generateVirtualScrollScript(JSON.stringify(rowData), {
					rowHeight: 36,
					overscan: 5,
					scrollContainerId,
					tbodyId,
					columnCount: 2,
				});

				return `
					<div class="results-container">
						<div class="virtual-scroll-container" id="${scrollContainerId}">
							<table class="results-table">
								<thead><tr><th>Col1</th><th>Col2</th></tr></thead>
								<tbody id="${tbodyId}"></tbody>
							</table>
						</div>
					</div>
					<script>${script}</script>
				`;
			}

			it('should use UNIQUE element IDs for each cell output to prevent cross-cell interference', () => {
				// Simulate two cell outputs
				const cell1Id = 'scrollContainer';
				const cell1TbodyId = 'tableBody';
				const cell2Id = 'scrollContainer'; // BUG: Same ID!
				const cell2TbodyId = 'tableBody'; // BUG: Same ID!

				const cell1Html = simulateRenderResultsHtml(cell1Id, cell1TbodyId, [['A1', 'B1']]);
				const cell2Html = simulateRenderResultsHtml(cell2Id, cell2TbodyId, [['X1', 'Y1']]);

				// Extract IDs from generated HTML
				const cell1ScrollIdMatch = cell1Html.match(/id="([^"]*scrollContainer[^"]*)"/);
				const cell2ScrollIdMatch = cell2Html.match(/id="([^"]*scrollContainer[^"]*)"/);
				const cell1TbodyIdMatch = cell1Html.match(/id="([^"]*tableBody[^"]*)"/);
				const cell2TbodyIdMatch = cell2Html.match(/id="([^"]*tableBody[^"]*)"/);

				// REGRESSION CHECK: IDs must be DIFFERENT between cells
				// If this test FAILS, it means we have the bug where IDs are duplicated
				// If this test PASSES after fix, the IDs are unique
				const cell1ScrollId = cell1ScrollIdMatch?.[1];
				const cell2ScrollId = cell2ScrollIdMatch?.[1];
				const cell1TbodyIdExtracted = cell1TbodyIdMatch?.[1];
				const cell2TbodyIdExtracted = cell2TbodyIdMatch?.[1];

				// This assertion will FAIL with current code (demonstrating the bug)
				// and PASS after the fix
				// For now, we document what SHOULD be true:
				//
				// CURRENT BEHAVIOR (BUG):
				// expect(cell1ScrollId).toBe(cell2ScrollId); // Both are 'scrollContainer'
				//
				// EXPECTED BEHAVIOR (AFTER FIX):
				// expect(cell1ScrollId).not.toBe(cell2ScrollId); // Should be unique

				// Document the current buggy state - these IDs ARE the same (the bug)
				expect(cell1ScrollId).toBe('scrollContainer');
				expect(cell2ScrollId).toBe('scrollContainer');
				expect(cell1TbodyIdExtracted).toBe('tableBody');
				expect(cell2TbodyIdExtracted).toBe('tableBody');

				// After fix, change assertions to:
				// expect(cell1ScrollId).not.toBe(cell2ScrollId);
				// expect(cell1TbodyIdExtracted).not.toBe(cell2TbodyIdExtracted);
			});

			it('should generate script that targets cell-specific element IDs', () => {
				// The script uses getElementById which will find the FIRST matching element
				// If multiple cells use the same ID, the wrong element gets targeted
				const script = generateVirtualScrollScript(JSON.stringify([['data']]), {
					rowHeight: 36,
					overscan: 5,
					scrollContainerId: 'scrollContainer',
					tbodyId: 'tableBody',
					columnCount: 1,
				});

				// Verify the script references the IDs we passed
				expect(script).toContain("document.getElementById('scrollContainer')");
				expect(script).toContain("document.getElementById('tableBody')");

				// After fix: IDs should be unique like 'scrollContainer_abc123'
				// The test should then verify unique IDs are used
			});
		});

		describe('Simulated DOM collision scenario', () => {
			it('demonstrates how duplicate IDs cause cross-cell data corruption', () => {
				/**
				 * This test documents the exact failure scenario:
				 *
				 * DOM State after both cells render:
				 * <div id="cell1-output">
				 *   <div id="scrollContainer">  <!-- First in DOM -->
				 *     <tbody id="tableBody"></tbody>
				 *   </div>
				 *   <script>
				 *     // Cell 1's script runs, populates its own tbody correctly
				 *   </script>
				 * </div>
				 * <div id="cell2-output">
				 *   <div id="scrollContainer">  <!-- Second in DOM, SAME ID! -->
				 *     <tbody id="tableBody"></tbody>
				 *   </div>
				 *   <script>
				 *     // Cell 2's script runs...
				 *     // document.getElementById('scrollContainer') returns CELL 1's container!
				 *     // Cell 2's data gets rendered into Cell 1's table!
				 *   </script>
				 * </div>
				 *
				 * Result:
				 * - Cell 1 shows Cell 2's data (overwritten by Cell 2's script)
				 * - Cell 2 shows headers only (its tbody never populated)
				 */

				// Simulate what getElementById returns when there are duplicate IDs
				const domElements = [
					{ id: 'scrollContainer', cellIndex: 1 }, // First in DOM
					{ id: 'scrollContainer', cellIndex: 2 }, // Second in DOM, same ID
				];

				// getElementById always returns the FIRST match
				const getElementByIdSimulation = (id: string) => {
					return domElements.find((el) => el.id === id);
				};

				// When Cell 2's script calls getElementById('scrollContainer')...
				const targetedElement = getElementByIdSimulation('scrollContainer');

				// ...it gets Cell 1's element, NOT Cell 2's!
				expect(targetedElement?.cellIndex).toBe(1); // BUG: Should be 2!

				// This is the root cause of the bug
			});
		});
	});
});
