/**
 * Comprehensive Column Type Formatting Tests
 *
 * This file tests the display behavior for ALL Dataverse column types.
 * Each type is documented with:
 * - What Dataverse returns
 * - Current behavior
 * - Expected behavior
 * - Whether there's an issue
 *
 * Column Type Analysis:
 * =====================
 *
 * 1. STRING - Plain text
 *    - Dataverse returns: "Contoso Ltd"
 *    - Current: Shows "Contoso Ltd"
 *    - Expected: Shows "Contoso Ltd"
 *    - Status: CORRECT
 *
 * 2. NUMBER - Numeric value
 *    - Dataverse returns: 42
 *    - Current: Shows "42"
 *    - Expected: Shows "42"
 *    - Status: CORRECT
 *
 * 3. GUID - Unique identifier
 *    - Dataverse returns: "12345678-1234-1234-1234-123456789012"
 *    - Current: Shows the GUID
 *    - Expected: Shows the GUID
 *    - Status: CORRECT
 *
 * 4. DATETIME - Date/time value
 *    - Dataverse returns: "2024-01-15T10:30:00Z" (ISO)
 *    - FormattedValue: "1/15/2024 10:30 AM" (user locale)
 *    - Current: Shows ISO string
 *    - Expected: Shows ISO string (raw value)
 *    - Status: CORRECT (raw value shown, formatted available if needed)
 *
 * 5. BOOLEAN - Two-option field
 *    - Dataverse returns: true/false
 *    - FormattedValue: "Yes"/"No" or custom labels like "Active"/"Inactive"
 *    - Current: Shows "Yes"/"No" (hardcoded transformation)
 *    - Expected: Show true/false (raw value), with optional name column?
 *    - Status: DEBATABLE - "Yes"/"No" is user-friendly but not the raw value
 *
 * 6. OPTIONSET - Choice field (picklist)
 *    - Dataverse returns: 1 (numeric value)
 *    - FormattedValue: "Preferred Customer" (label)
 *    - Current: Shows "1" in column, "Preferred Customer" in columnname
 *    - Expected: Same as current
 *    - Status: FIXED
 *
 * 7. LOOKUP - Reference to another record
 *    - Dataverse returns: GUID in _xxx_value, name in FormattedValue
 *    - Current: Shows GUID in column, display name in columnname
 *    - Expected: Shows GUID in column, display name in columnname
 *    - Status: FIXED
 *    - Example: primarycontactid shows GUID, primarycontactidname shows "John Smith"
 *
 * 8. MONEY - Currency field
 *    - Dataverse returns: 1000000.00 (raw number)
 *    - FormattedValue: "$1,000,000.00" (formatted with currency)
 *    - Current: Shows formatted value "$1,000,000.00"
 *    - Expected: Could show raw in column, formatted in columnname
 *    - Status: DEBATABLE - formatted is user-friendly, but inconsistent with other types
 */

import { QueryResultViewModelMapper } from './QueryResultViewModelMapper';
import { QueryResult } from '../../domain/entities/QueryResult';
import { QueryResultColumn } from '../../domain/valueObjects/QueryResultColumn';
import {
	QueryResultRow,
	QueryLookupValue,
	QueryFormattedValue,
} from '../../domain/valueObjects/QueryResultRow';

describe('QueryResultViewModelMapper - All Column Types', () => {
	let mapper: QueryResultViewModelMapper;

	beforeEach(() => {
		mapper = new QueryResultViewModelMapper();
	});

	describe('STRING columns', () => {
		it('should display raw string value', () => {
			const columns = [new QueryResultColumn('name', 'name', 'string')];
			const rows = [QueryResultRow.fromRecord({ name: 'Contoso Ltd' })];
			const result = new QueryResult(columns, rows, 1, false, null, '', 0);

			const viewModel = mapper.toViewModel(result);

			expect(viewModel.rows[0]!['name']).toBe('Contoso Ltd');
			// No virtual columns for string
			expect(viewModel.columns).toHaveLength(1);
		});
	});

	describe('NUMBER columns', () => {
		it('should display raw numeric value as string', () => {
			const columns = [new QueryResultColumn('employeecount', 'employeecount', 'number')];
			const rows = [QueryResultRow.fromRecord({ employeecount: 42 })];
			const result = new QueryResult(columns, rows, 1, false, null, '', 0);

			const viewModel = mapper.toViewModel(result);

			expect(viewModel.rows[0]!['employeecount']).toBe('42');
			expect(viewModel.columns).toHaveLength(1);
		});
	});

	describe('GUID columns', () => {
		it('should display raw GUID value', () => {
			const columns = [new QueryResultColumn('accountid', 'accountid', 'guid')];
			const rows = [QueryResultRow.fromRecord({ accountid: '12345678-1234-1234-1234-123456789012' })];
			const result = new QueryResult(columns, rows, 1, false, null, '', 0);

			const viewModel = mapper.toViewModel(result);

			expect(viewModel.rows[0]!['accountid']).toBe('12345678-1234-1234-1234-123456789012');
			expect(viewModel.columns).toHaveLength(1);
		});
	});

	describe('DATETIME columns', () => {
		it('should display datetime as ISO string', () => {
			const columns = [new QueryResultColumn('createdon', 'createdon', 'datetime')];
			const date = new Date('2024-01-15T10:30:00.000Z');
			const rows = [QueryResultRow.fromRecord({ createdon: date })];
			const result = new QueryResult(columns, rows, 1, false, null, '', 0);

			const viewModel = mapper.toViewModel(result);

			expect(viewModel.rows[0]!['createdon']).toBe('2024-01-15T10:30:00.000Z');
			expect(viewModel.columns).toHaveLength(1);
		});
	});

	describe('BOOLEAN columns', () => {
		/**
		 * Boolean column design decision:
		 *
		 * Current behavior: Shows "Yes"/"No" instead of true/false
		 *
		 * Why this is acceptable (unlike optionsets):
		 * 1. Column name doesn't suggest raw value (e.g., "donotphone" not "donotphonecode")
		 * 2. Simple, reversible transformation (Yes → true, No → false)
		 * 3. Booleans aren't stored as QueryFormattedValue - transformation is in mapper
		 * 4. "Yes"/"No" is universally understood
		 *
		 * If we need to change in the future, we could:
		 * - Show true/false in column
		 * - Add donotphonename column with "Yes"/"No"
		 */
		it('should display boolean as Yes/No (acceptable design decision)', () => {
			const columns = [new QueryResultColumn('donotphone', 'donotphone', 'boolean')];
			const rows = [
				QueryResultRow.fromRecord({ donotphone: true }),
			];
			const result = new QueryResult(columns, rows, 1, false, null, '', 0);

			const viewModel = mapper.toViewModel(result);

			// Boolean columns transform to Yes/No - this is intentional and documented
			expect(viewModel.rows[0]!['donotphone']).toBe('Yes');
			expect(viewModel.columns).toHaveLength(1);
		});

		it('should display false as No', () => {
			const columns = [new QueryResultColumn('donotphone', 'donotphone', 'boolean')];
			const rows = [QueryResultRow.fromRecord({ donotphone: false })];
			const result = new QueryResult(columns, rows, 1, false, null, '', 0);

			const viewModel = mapper.toViewModel(result);

			expect(viewModel.rows[0]!['donotphone']).toBe('No');
		});
	});

	describe('OPTIONSET columns', () => {
		it('should show raw value in column and label in name column', () => {
			const formattedValue: QueryFormattedValue = {
				value: 1,
				formattedValue: 'Preferred Customer',
			};
			const columns = [new QueryResultColumn('accountcategorycode', 'accountcategorycode', 'optionset')];
			const rows = [QueryResultRow.fromRecord({ accountcategorycode: formattedValue as never })];
			const result = new QueryResult(columns, rows, 1, false, null, '', 0);

			const viewModel = mapper.toViewModel(result);

			// Should have 2 columns: original + name
			expect(viewModel.columns).toHaveLength(2);
			expect(viewModel.columns.map(c => c.name)).toContain('accountcategorycode');
			expect(viewModel.columns.map(c => c.name)).toContain('accountcategorycodename');

			// Raw value in original column
			expect(viewModel.rows[0]!['accountcategorycode']).toBe('1');
			// Label in name column
			expect(viewModel.rows[0]!['accountcategorycodename']).toBe('Preferred Customer');
		});

		it('should handle null optionset values with empty strings in both columns', () => {
			const columns = [new QueryResultColumn('accountcategorycode', 'accountcategorycode', 'optionset')];
			const rows = [QueryResultRow.fromRecord({ accountcategorycode: null })];
			const result = new QueryResult(columns, rows, 1, false, null, '', 0);

			const viewModel = mapper.toViewModel(result);

			// Should have 2 columns: original + name
			expect(viewModel.columns).toHaveLength(2);
			expect(viewModel.columns.map(c => c.name)).toContain('accountcategorycode');
			expect(viewModel.columns.map(c => c.name)).toContain('accountcategorycodename');

			// Both columns should be empty strings for null values (consistent with lookup behavior)
			expect(viewModel.rows[0]!['accountcategorycode']).toBe('');
			expect(viewModel.rows[0]!['accountcategorycodename']).toBe('');
		});
	});

	describe('LOOKUP columns', () => {
		it('should show GUID in column and display name in name column', () => {
			const lookupValue: QueryLookupValue = {
				id: '12345678-1234-1234-1234-123456789012',
				name: 'John Smith',
				entityType: 'contact',
			};
			const columns = [new QueryResultColumn('primarycontactid', 'primarycontactid', 'lookup')];
			const rows = [QueryResultRow.fromRecord({ primarycontactid: lookupValue as never })];
			const result = new QueryResult(columns, rows, 1, false, null, '', 0);

			const viewModel = mapper.toViewModel(result);

			// Should have 2 columns: original + name (like optionset)
			expect(viewModel.columns).toHaveLength(2);
			expect(viewModel.columns.map(c => c.name)).toContain('primarycontactid');
			expect(viewModel.columns.map(c => c.name)).toContain('primarycontactidname');

			// GUID in original column (column name ends with "id")
			expect(viewModel.rows[0]!['primarycontactid']).toBe('12345678-1234-1234-1234-123456789012');
			// Display name in name column
			expect(viewModel.rows[0]!['primarycontactidname']).toBe('John Smith');
		});

		it('should handle lookup without name gracefully', () => {
			const lookupValue: QueryLookupValue = {
				id: '12345678-1234-1234-1234-123456789012',
				name: undefined,
				entityType: 'contact',
			};
			const columns = [new QueryResultColumn('primarycontactid', 'primarycontactid', 'lookup')];
			const rows = [QueryResultRow.fromRecord({ primarycontactid: lookupValue as never })];
			const result = new QueryResult(columns, rows, 1, false, null, '', 0);

			const viewModel = mapper.toViewModel(result);

			// Should still have 2 columns
			expect(viewModel.columns).toHaveLength(2);
			// GUID in original column
			expect(viewModel.rows[0]!['primarycontactid']).toBe('12345678-1234-1234-1234-123456789012');
			// Empty name column when no name
			expect(viewModel.rows[0]!['primarycontactidname']).toBe('');
		});

		it('should populate rowLookups for BOTH id and name columns (both clickable)', () => {
			const lookupValue: QueryLookupValue = {
				id: '12345678-1234-1234-1234-123456789012',
				name: 'John Smith',
				entityType: 'contact',
			};
			const columns = [new QueryResultColumn('primarycontactid', 'primarycontactid', 'lookup')];
			const rows = [QueryResultRow.fromRecord({ primarycontactid: lookupValue as never })];
			const result = new QueryResult(columns, rows, 1, false, null, '', 0);

			const viewModel = mapper.toViewModel(result);

			const expectedLookupInfo = {
				entityType: 'contact',
				id: '12345678-1234-1234-1234-123456789012',
			};

			// GUID column should be clickable
			expect(viewModel.rowLookups[0]!['primarycontactid']).toEqual(expectedLookupInfo);
			// Name column should ALSO be clickable (same link target)
			expect(viewModel.rowLookups[0]!['primarycontactidname']).toEqual(expectedLookupInfo);
		});
	});

	describe('MONEY columns', () => {
		/**
		 * Money column design decision:
		 *
		 * Current behavior: Shows formatted value like "$1,000,000.00"
		 *
		 * Why this is acceptable (unlike optionsets):
		 * 1. Column name doesn't suggest a code (e.g., "revenue" not "revenuecode")
		 * 2. Formatted value directly represents the same amount (just with currency)
		 * 3. Unlike optionsets where 1 has no relation to "Preferred Customer",
		 *    $1,000,000.00 is semantically equivalent to 1000000.00
		 * 4. Most users prefer seeing formatted currency
		 *
		 * If we need to change in the future, we could:
		 * - Show raw number in column (e.g., "1000000")
		 * - Add revenuename column with formatted value ("$1,000,000.00")
		 */
		it('should display formatted currency value (acceptable design decision)', () => {
			const moneyValue: QueryFormattedValue = {
				value: 1000000,
				formattedValue: '$1,000,000.00',
			};
			const columns = [new QueryResultColumn('revenue', 'revenue', 'money')];
			const rows = [QueryResultRow.fromRecord({ revenue: moneyValue as never })];
			const result = new QueryResult(columns, rows, 1, false, null, '', 0);

			const viewModel = mapper.toViewModel(result);

			// Money columns show formatted value - this is intentional and documented
			expect(viewModel.rows[0]!['revenue']).toBe('$1,000,000.00');
			expect(viewModel.columns).toHaveLength(1);
		});
	});

	describe('NULL handling for all types', () => {
		it('should handle null string', () => {
			const columns = [new QueryResultColumn('name', 'name', 'string')];
			const rows = [QueryResultRow.fromRecord({ name: null })];
			const result = new QueryResult(columns, rows, 1, false, null, '', 0);

			const viewModel = mapper.toViewModel(result);
			expect(viewModel.rows[0]!['name']).toBe('');
		});

		it('should handle null number', () => {
			const columns = [new QueryResultColumn('employeecount', 'employeecount', 'number')];
			const rows = [QueryResultRow.fromRecord({ employeecount: null })];
			const result = new QueryResult(columns, rows, 1, false, null, '', 0);

			const viewModel = mapper.toViewModel(result);
			expect(viewModel.rows[0]!['employeecount']).toBe('');
		});

		it('should handle null lookup', () => {
			const columns = [new QueryResultColumn('primarycontactid', 'primarycontactid', 'lookup')];
			const rows = [QueryResultRow.fromRecord({ primarycontactid: null })];
			const result = new QueryResult(columns, rows, 1, false, null, '', 0);

			const viewModel = mapper.toViewModel(result);
			expect(viewModel.rows[0]!['primarycontactid']).toBe('');
		});

		it('should handle null optionset', () => {
			const columns = [new QueryResultColumn('accountcategorycode', 'accountcategorycode', 'optionset')];
			const rows = [QueryResultRow.fromRecord({ accountcategorycode: null })];
			const result = new QueryResult(columns, rows, 1, false, null, '', 0);

			const viewModel = mapper.toViewModel(result);
			expect(viewModel.rows[0]!['accountcategorycode']).toBe('');
		});
	});

	describe('Mixed column types in single query', () => {
		it('should handle multiple column types correctly', () => {
			const lookupValue: QueryLookupValue = {
				id: 'contact-guid',
				name: 'John Smith',
				entityType: 'contact',
			};
			const optionsetValue: QueryFormattedValue = {
				value: 1,
				formattedValue: 'Preferred Customer',
			};

			const columns = [
				new QueryResultColumn('name', 'name', 'string'),
				new QueryResultColumn('primarycontactid', 'primarycontactid', 'lookup'),
				new QueryResultColumn('accountcategorycode', 'accountcategorycode', 'optionset'),
				new QueryResultColumn('employeecount', 'employeecount', 'number'),
			];
			const rows = [QueryResultRow.fromRecord({
				name: 'Contoso Ltd',
				primarycontactid: lookupValue as never,
				accountcategorycode: optionsetValue as never,
				employeecount: 500,
			})];
			const result = new QueryResult(columns, rows, 1, false, null, '', 0);

			const viewModel = mapper.toViewModel(result);

			// Should have 6 columns: 4 original + 2 virtual (lookup + optionset)
			expect(viewModel.columns).toHaveLength(6);

			// String column
			expect(viewModel.rows[0]!['name']).toBe('Contoso Ltd');

			// Number column
			expect(viewModel.rows[0]!['employeecount']).toBe('500');

			// Optionset columns
			expect(viewModel.rows[0]!['accountcategorycode']).toBe('1');
			expect(viewModel.rows[0]!['accountcategorycodename']).toBe('Preferred Customer');

			// Lookup columns (CURRENTLY FAILING - needs fix)
			expect(viewModel.rows[0]!['primarycontactid']).toBe('contact-guid');
			expect(viewModel.rows[0]!['primarycontactidname']).toBe('John Smith');
		});
	});
});
