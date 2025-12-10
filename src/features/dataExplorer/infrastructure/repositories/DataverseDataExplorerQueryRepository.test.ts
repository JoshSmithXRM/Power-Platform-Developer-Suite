import type { IDataverseApiService } from '../../../../shared/infrastructure/interfaces/IDataverseApiService';
import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import { DataverseDataExplorerQueryRepository } from './DataverseDataExplorerQueryRepository';
import { QueryResultViewModelMapper } from '../../application/mappers/QueryResultViewModelMapper';

describe('DataverseDataExplorerQueryRepository', () => {
	let repository: DataverseDataExplorerQueryRepository;
	let mockApiService: jest.Mocked<IDataverseApiService>;
	let mockLogger: jest.Mocked<ILogger>;

	beforeEach(() => {
		mockApiService = {
			get: jest.fn(),
			post: jest.fn(),
			patch: jest.fn(),
			delete: jest.fn(),
			batchDelete: jest.fn(),
		};

		mockLogger = {
			trace: jest.fn(),
			debug: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
		};

		repository = new DataverseDataExplorerQueryRepository(
			mockApiService,
			mockLogger
		);
	});

	describe('executeQuery', () => {
		it('should return all columns from FetchXML even when first record has sparse data', async () => {
			// This test reproduces the bug where columns with null values
			// in the first record are not included in the result
			const fetchXml = `<fetch top="1">
  <entity name="account">
    <attribute name="accountid" />
    <attribute name="name" />
    <attribute name="accountnumber" />
  </entity>
</fetch>`;

			// Simulate Dataverse response where accountnumber is null (not included in response)
			mockApiService.get.mockResolvedValue({
				'@odata.context': 'https://org.crm.dynamics.com/api/data/v9.2/$metadata#accounts',
				value: [
					{
						accountid: '12345678-1234-1234-1234-123456789012',
						name: 'Test Account',
						// accountnumber is NOT in response because it's null
					},
				],
			});

			const result = await repository.executeQuery(
				'env-123',
				'accounts',
				fetchXml
			);

			// Should have 3 columns (all requested in FetchXML), not just 2
			expect(result.columns.length).toBe(3);
			expect(result.columns.map((c) => c.logicalName)).toEqual(
				expect.arrayContaining(['accountid', 'name', 'accountnumber'])
			);
		});

		it('should return columns for multi-row results where some rows have sparse data', async () => {
			const fetchXml = `<fetch>
  <entity name="account">
    <attribute name="accountid" />
    <attribute name="name" />
    <attribute name="accountnumber" />
  </entity>
</fetch>`;

			// First record has no accountnumber, second record has it
			mockApiService.get.mockResolvedValue({
				'@odata.context': 'https://org.crm.dynamics.com/api/data/v9.2/$metadata#accounts',
				value: [
					{
						accountid: '11111111-1111-1111-1111-111111111111',
						name: 'Account One',
						// accountnumber missing in first record
					},
					{
						accountid: '22222222-2222-2222-2222-222222222222',
						name: 'Account Two',
						accountnumber: 'ACCT-002',
					},
				],
			});

			const result = await repository.executeQuery(
				'env-123',
				'accounts',
				fetchXml
			);

			// Should have 3 columns
			expect(result.columns.length).toBe(3);
			expect(result.columns.map((c) => c.logicalName)).toEqual(
				expect.arrayContaining(['accountid', 'name', 'accountnumber'])
			);

			// Second row should have the accountnumber value
			const secondRow = result.rows[1];
			expect(secondRow).toBeDefined();
			expect(secondRow?.getValue('accountnumber')).toBe('ACCT-002');
		});

		it('should return all columns when first record has all data', async () => {
			const fetchXml = `<fetch>
  <entity name="account">
    <attribute name="accountid" />
    <attribute name="name" />
    <attribute name="accountnumber" />
  </entity>
</fetch>`;

			mockApiService.get.mockResolvedValue({
				'@odata.context': 'https://org.crm.dynamics.com/api/data/v9.2/$metadata#accounts',
				value: [
					{
						accountid: '12345678-1234-1234-1234-123456789012',
						name: 'Test Account',
						accountnumber: 'ACCT-001',
					},
				],
			});

			const result = await repository.executeQuery(
				'env-123',
				'accounts',
				fetchXml
			);

			expect(result.columns.length).toBe(3);
			expect(result.columns.map((c) => c.logicalName)).toEqual(
				expect.arrayContaining(['accountid', 'name', 'accountnumber'])
			);
		});

		it('should return empty result for no records', async () => {
			const fetchXml = `<fetch>
  <entity name="account">
    <attribute name="accountid" />
    <attribute name="name" />
  </entity>
</fetch>`;

			mockApiService.get.mockResolvedValue({
				'@odata.context': 'https://org.crm.dynamics.com/api/data/v9.2/$metadata#accounts',
				value: [],
			});

			const result = await repository.executeQuery(
				'env-123',
				'accounts',
				fetchXml
			);

			expect(result.getRowCount()).toBe(0);
			expect(result.isEmpty()).toBe(true);
		});

		it('should handle all-attributes (SELECT *) FetchXML', async () => {
			const fetchXml = `<fetch>
  <entity name="account">
    <all-attributes />
  </entity>
</fetch>`;

			mockApiService.get.mockResolvedValue({
				'@odata.context': 'https://org.crm.dynamics.com/api/data/v9.2/$metadata#accounts',
				value: [
					{
						accountid: '12345678-1234-1234-1234-123456789012',
						name: 'Test Account',
						revenue: 1000000,
					},
				],
			});

			const result = await repository.executeQuery(
				'env-123',
				'accounts',
				fetchXml
			);

			// For all-attributes, we still derive columns from response
			expect(result.columns.length).toBe(3);
		});
	});

	describe('getEntitySetName', () => {
		it('should fetch and return entity set name', async () => {
			mockApiService.get.mockResolvedValue({
				EntitySetName: 'accounts',
				LogicalName: 'account',
			});

			const result = await repository.getEntitySetName('env-123', 'account');

			expect(result).toBe('accounts');
			expect(mockApiService.get).toHaveBeenCalledWith(
				'env-123',
				expect.stringContaining("EntityDefinitions(LogicalName='account')")
			);
		});

		it('should cache entity set name', async () => {
			mockApiService.get.mockResolvedValue({
				EntitySetName: 'accounts',
				LogicalName: 'account',
			});

			// Call twice
			await repository.getEntitySetName('env-123', 'account');
			await repository.getEntitySetName('env-123', 'account');

			// Should only call API once
			expect(mockApiService.get).toHaveBeenCalledTimes(1);
		});
	});

	describe('end-to-end column count verification', () => {
		it('should preserve exact column count from FetchXML through to ViewModel', async () => {
			const fetchXml = `<fetch>
  <entity name="account">
    <attribute name="name" />
    <attribute name="accountid" />
    <attribute name="accountnumber" />
  </entity>
</fetch>`;

			// Response has all 3 columns
			mockApiService.get.mockResolvedValue({
				'@odata.context': 'https://org.crm.dynamics.com/api/data/v9.2/$metadata#accounts',
				value: [
					{
						name: 'Test Account',
						accountid: '12345678-1234-1234-1234-123456789012',
						accountnumber: 'ACC-001',
					},
				],
			});

			const result = await repository.executeQuery(
				'env-123',
				'accounts',
				fetchXml
			);

			// Verify domain layer
			expect(result.columns.length).toBe(3);

			// Verify ViewModel layer
			const mapper = new QueryResultViewModelMapper();
			const viewModel = mapper.toViewModel(result);

			expect(viewModel.columns.length).toBe(3);
			expect(Object.keys(viewModel.rows[0] ?? {}).length).toBe(3);
		});
	});

	describe('alias case sensitivity handling', () => {
		it('should handle alias that case-insensitively matches attribute name', async () => {
			// BUG REPRODUCTION: When alias is "accountID" but Dataverse returns "accountid"
			// The column expects "accountID" but data is stored under "accountid"
			const fetchXml = `<fetch>
  <entity name="account">
    <attribute name="accountid" alias="accountID" />
    <attribute name="name" alias="Name" />
  </entity>
</fetch>`;

			// Dataverse returns lowercase keys when alias matches original attribute (case-insensitive)
			mockApiService.get.mockResolvedValue({
				'@odata.context': 'https://org.crm.dynamics.com/api/data/v9.2/$metadata#accounts',
				value: [
					{
						accountid: '12345678-1234-1234-1234-123456789012', // lowercase!
						Name: 'Test Account', // Dataverse uses alias when different
					},
				],
			});

			const result = await repository.executeQuery(
				'env-123',
				'accounts',
				fetchXml
			);

			// Should have 2 columns
			expect(result.columns.length).toBe(2);

			// The critical test: getValue should find the data even with case mismatch
			const row = result.rows[0];
			expect(row).toBeDefined();

			// Primary key columns are now returned as lookup objects with entityType
			const accountIdValue = row?.getValue(result.columns[0]!.logicalName);
			expect(accountIdValue).toBeDefined();
			expect(typeof accountIdValue).toBe('object');
			expect(accountIdValue).toHaveProperty('id', '12345678-1234-1234-1234-123456789012');
			expect(accountIdValue).toHaveProperty('entityType', 'account');

			const nameValue = row?.getValue(result.columns[1]!.logicalName);
			expect(nameValue).toBe('Test Account');
		});

		it('should handle multiple aliases of same column with different cases', async () => {
			// User query: SELECT accountid AS accountID, accountid as AccountKey FROM account
			const fetchXml = `<fetch>
  <entity name="account">
    <attribute name="accountid" alias="accountID" />
    <attribute name="accountid" alias="AccountKey" />
    <attribute name="name" alias="Name" />
  </entity>
</fetch>`;

			// Dataverse response:
			// - "accountid" for alias "accountID" (lowercase, ignores alias case when similar)
			// - "AccountKey" for alias "AccountKey" (uses alias as-is when genuinely different)
			mockApiService.get.mockResolvedValue({
				'@odata.context': 'https://org.crm.dynamics.com/api/data/v9.2/$metadata#accounts',
				value: [
					{
						accountid: '12345678-1234-1234-1234-123456789012',
						AccountKey: '12345678-1234-1234-1234-123456789012',
						Name: 'Test Account',
					},
				],
			});

			const result = await repository.executeQuery(
				'env-123',
				'accounts',
				fetchXml
			);

			expect(result.columns.length).toBe(3);

			const row = result.rows[0];
			expect(row).toBeDefined();

			// All three columns should return correct values
			for (const column of result.columns) {
				const value = row?.getValue(column.logicalName);
				expect(value).toBeDefined();
				expect(value).not.toBeNull();
			}
		});

		it('should correctly map lookups when using aliases', async () => {
			// When aliasing a lookup column, links should still work
			const fetchXml = `<fetch>
  <entity name="contact">
    <attribute name="contactid" />
    <attribute name="parentcustomerid" alias="AccountRef" />
  </entity>
</fetch>`;

			mockApiService.get.mockResolvedValue({
				'@odata.context': 'https://org.crm.dynamics.com/api/data/v9.2/$metadata#contacts',
				value: [
					{
						contactid: '11111111-1111-1111-1111-111111111111',
						// Lookup ID uses original attribute name pattern, not alias
						'_parentcustomerid_value': '22222222-2222-2222-2222-222222222222',
						'_parentcustomerid_value@OData.Community.Display.V1.FormattedValue': 'Contoso Ltd',
						'_parentcustomerid_value@Microsoft.Dynamics.CRM.lookuplogicalname': 'account',
					},
				],
			});

			const result = await repository.executeQuery(
				'env-123',
				'contacts',
				fetchXml
			);

			// Should have 2 columns
			expect(result.columns.length).toBe(2);

			const row = result.rows[0];
			expect(row).toBeDefined();

			// The aliased lookup column should have data
			const accountRefColumn = result.columns.find(c =>
				c.logicalName === 'AccountRef' || c.logicalName === 'parentcustomerid'
			);
			expect(accountRefColumn).toBeDefined();

			const lookupValue = row?.getValue(accountRefColumn!.logicalName);
			expect(lookupValue).toBeDefined();
			expect(lookupValue).not.toBeNull();
		});

		it('should handle lookup column alias like createdby AS CREATEDBY', async () => {
			// User query: SELECT createdby AS CREATEDBY FROM account
			// Real Dataverse behavior: When alias is used, Dataverse returns the alias as the key
			// with annotations, NOT the _xxx_value pattern
			const fetchXml = `<fetch>
  <entity name="account">
    <attribute name="createdby" alias="CreatedByUser" />
    <attribute name="name" />
  </entity>
</fetch>`;

			mockApiService.get.mockResolvedValue({
				'@odata.context': 'https://org.crm.dynamics.com/api/data/v9.2/$metadata#accounts',
				value: [
					{
						// When alias is used, Dataverse returns alias as key with annotations
						'CreatedByUser@OData.Community.Display.V1.AttributeName': 'createdby',
						'CreatedByUser@OData.Community.Display.V1.FormattedValue': 'John Doe',
						'CreatedByUser@Microsoft.Dynamics.CRM.lookuplogicalname': 'systemuser',
						'CreatedByUser': '11111111-1111-1111-1111-111111111111',
						name: 'Test Account',
					},
				],
			});

			const result = await repository.executeQuery(
				'env-123',
				'accounts',
				fetchXml
			);

			expect(result.columns.length).toBe(2);

			const row = result.rows[0];
			expect(row).toBeDefined();

			// Find the CreatedByUser column - should use the alias as logicalName
			const createdByColumn = result.columns.find(c => c.displayName === 'CreatedByUser');
			expect(createdByColumn).toBeDefined();
			expect(createdByColumn!.logicalName).toBe('CreatedByUser');

			// The lookup value should be accessible via the column's logicalName
			const lookupValue = row?.getValue(createdByColumn!.logicalName);
			expect(lookupValue).toBeDefined();
			expect(lookupValue).not.toBeNull();
			expect(lookupValue).toHaveProperty('entityType', 'systemuser');
			expect(lookupValue).toHaveProperty('id', '11111111-1111-1111-1111-111111111111');
			expect(lookupValue).toHaveProperty('name', 'John Doe');
		});

		it('should also work when createdby is queried without alias', async () => {
			// User query: SELECT createdby FROM account (no alias)
			const fetchXml = `<fetch>
  <entity name="account">
    <attribute name="createdby" />
    <attribute name="name" />
  </entity>
</fetch>`;

			mockApiService.get.mockResolvedValue({
				'@odata.context': 'https://org.crm.dynamics.com/api/data/v9.2/$metadata#accounts',
				value: [
					{
						'_createdby_value': '11111111-1111-1111-1111-111111111111',
						'_createdby_value@OData.Community.Display.V1.FormattedValue': 'John Doe',
						'_createdby_value@Microsoft.Dynamics.CRM.lookuplogicalname': 'systemuser',
						name: 'Test Account',
					},
				],
			});

			const result = await repository.executeQuery(
				'env-123',
				'accounts',
				fetchXml
			);

			const row = result.rows[0];
			expect(row).toBeDefined();

			// Find the createdby column - should use original name as logicalName
			const createdByColumn = result.columns.find(c => c.logicalName === 'createdby');
			expect(createdByColumn).toBeDefined();

			// The lookup value should be accessible
			const lookupValue = row?.getValue('createdby');
			expect(lookupValue).toBeDefined();
			expect(lookupValue).toHaveProperty('entityType', 'systemuser');
			expect(lookupValue).toHaveProperty('id', '11111111-1111-1111-1111-111111111111');
		});

		it('should have matching keys in row data and rowLookups for aliased columns (end-to-end)', async () => {
			// This tests the full flow: repository -> mapper -> ViewModel
			// Real Dataverse behavior: alias is used as key with annotations
			const fetchXml = `<fetch>
  <entity name="account">
    <attribute name="createdby" alias="CreatedByUser" />
    <attribute name="name" />
  </entity>
</fetch>`;

			mockApiService.get.mockResolvedValue({
				'@odata.context': 'https://org.crm.dynamics.com/api/data/v9.2/$metadata#accounts',
				value: [
					{
						// Real Dataverse format: alias as key with annotations
						'CreatedByUser@OData.Community.Display.V1.FormattedValue': 'John Doe',
						'CreatedByUser@Microsoft.Dynamics.CRM.lookuplogicalname': 'systemuser',
						'CreatedByUser': '11111111-1111-1111-1111-111111111111',
						name: 'Test Account',
					},
				],
			});

			const result = await repository.executeQuery('env-123', 'accounts', fetchXml);

			// Map through the mapper
			const { QueryResultViewModelMapper } = await import('../../application/mappers/QueryResultViewModelMapper');
			const mapper = new QueryResultViewModelMapper();
			const viewModel = mapper.toViewModel(result);

			// Get the CreatedByUser column from ViewModel
			const createdByColumn = viewModel.columns.find(c => c.name === 'CreatedByUser');
			expect(createdByColumn).toBeDefined();

			// The rowLookups should have an entry for 'CreatedByUser'
			expect(viewModel.rowLookups[0]).toBeDefined();
			expect(viewModel.rowLookups[0]!['CreatedByUser']).toBeDefined();
			expect(viewModel.rowLookups[0]!['CreatedByUser']).toEqual({
				entityType: 'systemuser',
				id: '11111111-1111-1111-1111-111111111111',
			});

			// The row data should also use 'CreatedByUser' as the key
			expect(viewModel.rows[0]!['CreatedByUser']).toBe('John Doe');
		});

		it('should preserve lookup value when Dataverse returns both alias key and _value pattern', async () => {
			// BUG REPRODUCTION: Real Dataverse may return BOTH:
			// - 'CREATEDBY': just the GUID (from alias)
			// - '_createdby_value': the lookup with annotations
			// The lookup value should NOT be overwritten by the plain GUID
			const fetchXml = `<fetch>
  <entity name="account">
    <attribute name="createdby" alias="CREATEDBY" />
    <attribute name="name" />
  </entity>
</fetch>`;

			mockApiService.get.mockResolvedValue({
				'@odata.context': 'https://org.crm.dynamics.com/api/data/v9.2/$metadata#accounts',
				value: [
					{
						// Dataverse returns BOTH the alias key AND the lookup pattern
						'CREATEDBY': '11111111-1111-1111-1111-111111111111', // Just the GUID
						'_createdby_value': '11111111-1111-1111-1111-111111111111',
						'_createdby_value@OData.Community.Display.V1.FormattedValue': 'John Doe',
						'_createdby_value@Microsoft.Dynamics.CRM.lookuplogicalname': 'systemuser',
						name: 'Test Account',
					},
				],
			});

			const result = await repository.executeQuery('env-123', 'accounts', fetchXml);

			const row = result.rows[0];
			expect(row).toBeDefined();

			// The cell for CREATEDBY should be a lookup object, NOT a plain GUID string
			const createdByValue = row?.getValue('CREATEDBY');
			expect(createdByValue).toBeDefined();
			expect(typeof createdByValue).toBe('object');
			expect(createdByValue).toHaveProperty('entityType', 'systemuser');
			expect(createdByValue).toHaveProperty('id', '11111111-1111-1111-1111-111111111111');
			expect(createdByValue).toHaveProperty('name', 'John Doe');

			// Verify through mapper that rowLookups is correctly populated
			const { QueryResultViewModelMapper } = await import('../../application/mappers/QueryResultViewModelMapper');
			const mapper = new QueryResultViewModelMapper();
			const viewModel = mapper.toViewModel(result);

			expect(viewModel.rowLookups[0]!['CREATEDBY']).toEqual({
				entityType: 'systemuser',
				id: '11111111-1111-1111-1111-111111111111',
			});
		});

		it('should preserve lookup value even when _value pattern comes before alias key in response', async () => {
			// Test reverse order: _createdby_value comes before CREATEDBY
			// This tests that we don't overwrite lookups with plain values
			const fetchXml = `<fetch>
  <entity name="account">
    <attribute name="createdby" alias="CREATEDBY" />
    <attribute name="name" />
  </entity>
</fetch>`;

			mockApiService.get.mockResolvedValue({
				'@odata.context': 'https://org.crm.dynamics.com/api/data/v9.2/$metadata#accounts',
				value: [
					{
						// Lookup pattern comes FIRST in the object
						'_createdby_value': '11111111-1111-1111-1111-111111111111',
						'_createdby_value@OData.Community.Display.V1.FormattedValue': 'John Doe',
						'_createdby_value@Microsoft.Dynamics.CRM.lookuplogicalname': 'systemuser',
						// Alias key comes AFTER - this could overwrite the lookup!
						'CREATEDBY': '11111111-1111-1111-1111-111111111111',
						name: 'Test Account',
					},
				],
			});

			const result = await repository.executeQuery('env-123', 'accounts', fetchXml);

			const row = result.rows[0];
			expect(row).toBeDefined();

			// The cell for CREATEDBY should STILL be a lookup object, NOT a plain GUID string
			const createdByValue = row?.getValue('CREATEDBY');
			expect(createdByValue).toBeDefined();
			expect(typeof createdByValue).toBe('object');
			expect(createdByValue).toHaveProperty('entityType', 'systemuser');
			expect(createdByValue).toHaveProperty('id', '11111111-1111-1111-1111-111111111111');

			// Verify through mapper that rowLookups is correctly populated
			const { QueryResultViewModelMapper } = await import('../../application/mappers/QueryResultViewModelMapper');
			const mapper = new QueryResultViewModelMapper();
			const viewModel = mapper.toViewModel(result);

			expect(viewModel.rowLookups[0]!['CREATEDBY']).toEqual({
				entityType: 'systemuser',
				id: '11111111-1111-1111-1111-111111111111',
			});
		});

		it('should create clickable links for primary key columns and their aliases', async () => {
			// BUG FIX: Primary key columns (accountid) should be clickable links
			// This includes aliases like "accountID" and "AccountKey"
			const fetchXml = `<fetch>
  <entity name="account">
    <attribute name="accountid" alias="accountID" />
    <attribute name="accountid" alias="AccountKey" />
    <attribute name="name" />
  </entity>
</fetch>`;

			mockApiService.get.mockResolvedValue({
				'@odata.context': 'https://org.crm.dynamics.com/api/data/v9.2/$metadata#accounts',
				value: [
					{
						accountid: '12345678-1234-1234-1234-123456789012',
						AccountKey: '12345678-1234-1234-1234-123456789012',
						name: 'Test Account',
					},
				],
			});

			const result = await repository.executeQuery(
				'env-123',
				'accounts',
				fetchXml
			);

			expect(result.columns.length).toBe(3);

			const row = result.rows[0];
			expect(row).toBeDefined();

			// Both primary key columns should be lookup values with entityType
			// Cells are stored under the ALIAS, not the original attribute name
			const accountIdValue = row?.getValue('accountID'); // alias
			expect(accountIdValue).toBeDefined();
			expect(typeof accountIdValue).toBe('object');
			expect(accountIdValue).toHaveProperty('entityType', 'account');
			expect(accountIdValue).toHaveProperty('id', '12345678-1234-1234-1234-123456789012');

			const AccountKeyValue = row?.getValue('AccountKey'); // alias
			expect(AccountKeyValue).toBeDefined();
			expect(typeof AccountKeyValue).toBe('object');
			expect(AccountKeyValue).toHaveProperty('entityType', 'account');
			expect(AccountKeyValue).toHaveProperty('id', '12345678-1234-1234-1234-123456789012');

			// Regular column should still be a string (stored under 'name' - no alias in FetchXML)
			const nameColumn = result.columns.find(c => c.logicalName === 'name');
			expect(nameColumn).toBeDefined();
			const nameValue = row?.getValue('name');
			expect(nameValue).toBe('Test Account');
		});
	});

	describe('lookup column handling', () => {
		it('should return lookup values with GUID in column and name in name column', async () => {
			// Regression test: lookup columns should show GUID, with separate name column
			const fetchXml = `<fetch>
  <entity name="account">
    <attribute name="name" />
    <attribute name="primarycontactid" />
  </entity>
</fetch>`;

			// Dataverse returns lookup with FormattedValue annotation
			mockApiService.get.mockResolvedValue({
				'@odata.context': 'https://org.crm.dynamics.com/api/data/v9.2/$metadata#accounts',
				value: [
					{
						name: 'Contoso Ltd',
						'_primarycontactid_value': '12345678-1234-1234-1234-123456789012',
						'_primarycontactid_value@OData.Community.Display.V1.FormattedValue': 'John Smith',
						'_primarycontactid_value@Microsoft.Dynamics.CRM.lookuplogicalname': 'contact',
					},
				],
			});

			const result = await repository.executeQuery(
				'env-123',
				'accounts',
				fetchXml
			);

			// Verify domain layer correctly identifies lookup type
			expect(result.columns.length).toBe(2);
			const lookupColumn = result.columns.find(c => c.logicalName === 'primarycontactid');
			expect(lookupColumn).toBeDefined();
			expect(lookupColumn!.dataType).toBe('lookup');

			// Verify rows have QueryLookupValue with id and name
			const row = result.rows[0];
			expect(row).toBeDefined();

			const lookupValue = row?.getValue('primarycontactid');
			expect(lookupValue).toHaveProperty('id', '12345678-1234-1234-1234-123456789012');
			expect(lookupValue).toHaveProperty('name', 'John Smith');
			expect(lookupValue).toHaveProperty('entityType', 'contact');
		});

		it('should create both GUID and name columns in ViewModel for lookup', async () => {
			// End-to-end test: verify ViewModel has separate columns for lookup
			const fetchXml = `<fetch>
  <entity name="account">
    <attribute name="name" />
    <attribute name="primarycontactid" />
  </entity>
</fetch>`;

			mockApiService.get.mockResolvedValue({
				'@odata.context': 'https://org.crm.dynamics.com/api/data/v9.2/$metadata#accounts',
				value: [
					{
						name: 'Contoso Ltd',
						'_primarycontactid_value': '12345678-1234-1234-1234-123456789012',
						'_primarycontactid_value@OData.Community.Display.V1.FormattedValue': 'John Smith',
						'_primarycontactid_value@Microsoft.Dynamics.CRM.lookuplogicalname': 'contact',
					},
				],
			});

			const result = await repository.executeQuery('env-123', 'accounts', fetchXml);

			// Map through the mapper
			const mapper = new QueryResultViewModelMapper();
			const viewModel = mapper.toViewModel(result);

			// Should have 3 columns: name, primarycontactid, primarycontactidname (lookup virtual)
			expect(viewModel.columns).toHaveLength(3);
			expect(viewModel.columns.map(c => c.name)).toContain('name');
			expect(viewModel.columns.map(c => c.name)).toContain('primarycontactid');
			expect(viewModel.columns.map(c => c.name)).toContain('primarycontactidname');

			// Row should have GUID in primarycontactid column
			expect(viewModel.rows[0]!['primarycontactid']).toBe('12345678-1234-1234-1234-123456789012');
			// Row should have display name in primarycontactidname column
			expect(viewModel.rows[0]!['primarycontactidname']).toBe('John Smith');
			// Regular string column should work as before
			expect(viewModel.rows[0]!['name']).toBe('Contoso Ltd');

			// rowLookups should be populated for BOTH columns (both clickable)
			const expectedLookupInfo = {
				entityType: 'contact',
				id: '12345678-1234-1234-1234-123456789012',
			};
			expect(viewModel.rowLookups[0]!['primarycontactid']).toEqual(expectedLookupInfo);
			expect(viewModel.rowLookups[0]!['primarycontactidname']).toEqual(expectedLookupInfo);
		});

		it('should handle null lookup values when type is inferred from other rows', async () => {
			// When some rows have lookup values and others don't, the type is still inferred
			const fetchXml = `<fetch>
  <entity name="account">
    <attribute name="name" />
    <attribute name="primarycontactid" />
  </entity>
</fetch>`;

			// First row has null, second row has a value (helps infer type)
			mockApiService.get.mockResolvedValue({
				'@odata.context': 'https://org.crm.dynamics.com/api/data/v9.2/$metadata#accounts',
				value: [
					{
						name: 'Account Without Contact',
						// primarycontactid is null - no _value field returned
					},
					{
						name: 'Account With Contact',
						'_primarycontactid_value': 'contact-guid',
						'_primarycontactid_value@OData.Community.Display.V1.FormattedValue': 'Jane Doe',
						'_primarycontactid_value@Microsoft.Dynamics.CRM.lookuplogicalname': 'contact',
					},
				],
			});

			const result = await repository.executeQuery('env-123', 'accounts', fetchXml);

			const mapper = new QueryResultViewModelMapper();
			const viewModel = mapper.toViewModel(result);

			// Column type is inferred from rows with data
			expect(viewModel.columns.map(c => c.name)).toContain('primarycontactid');
			expect(viewModel.columns.map(c => c.name)).toContain('primarycontactidname');

			// First row (null lookup) should show empty strings
			expect(viewModel.rows[0]!['primarycontactid']).toBe('');
			expect(viewModel.rows[0]!['primarycontactidname']).toBe('');

			// Second row should have proper values
			expect(viewModel.rows[1]!['primarycontactid']).toBe('contact-guid');
			expect(viewModel.rows[1]!['primarycontactidname']).toBe('Jane Doe');
		});
	});

	describe('optionset column handling', () => {
		it('should return optionset values with proper formatting for accountcategorycode', async () => {
			// Regression test: optionset columns should show raw value, with separate name column
			// accountcategorycode: 1 = "Preferred Customer", 2 = "Standard"
			const fetchXml = `<fetch>
  <entity name="account">
    <attribute name="name" />
    <attribute name="accountcategorycode" />
  </entity>
</fetch>`;

			// Dataverse returns optionset with FormattedValue annotation
			mockApiService.get.mockResolvedValue({
				'@odata.context': 'https://org.crm.dynamics.com/api/data/v9.2/$metadata#accounts',
				value: [
					{
						name: 'Contoso Ltd',
						accountcategorycode: 1,
						'accountcategorycode@OData.Community.Display.V1.FormattedValue': 'Preferred Customer',
					},
					{
						name: 'Fabrikam Inc',
						accountcategorycode: 2,
						'accountcategorycode@OData.Community.Display.V1.FormattedValue': 'Standard',
					},
				],
			});

			const result = await repository.executeQuery(
				'env-123',
				'accounts',
				fetchXml
			);

			// Verify domain layer correctly identifies optionset type
			expect(result.columns.length).toBe(2);
			const optionsetColumn = result.columns.find(c => c.logicalName === 'accountcategorycode');
			expect(optionsetColumn).toBeDefined();
			expect(optionsetColumn!.dataType).toBe('optionset');

			// Verify rows have QueryFormattedValue with raw value preserved
			const row1 = result.rows[0];
			const row2 = result.rows[1];
			expect(row1).toBeDefined();
			expect(row2).toBeDefined();

			const value1 = row1?.getValue('accountcategorycode');
			const value2 = row2?.getValue('accountcategorycode');

			// Values should be QueryFormattedValue objects
			expect(value1).toHaveProperty('value', 1);
			expect(value1).toHaveProperty('formattedValue', 'Preferred Customer');
			expect(value2).toHaveProperty('value', 2);
			expect(value2).toHaveProperty('formattedValue', 'Standard');
		});

		it('should create both value and name columns in ViewModel for optionset', async () => {
			// End-to-end test: verify ViewModel has separate columns for optionset
			const fetchXml = `<fetch>
  <entity name="account">
    <attribute name="name" />
    <attribute name="accountcategorycode" />
  </entity>
</fetch>`;

			mockApiService.get.mockResolvedValue({
				'@odata.context': 'https://org.crm.dynamics.com/api/data/v9.2/$metadata#accounts',
				value: [
					{
						name: 'Contoso Ltd',
						accountcategorycode: 1,
						'accountcategorycode@OData.Community.Display.V1.FormattedValue': 'Preferred Customer',
					},
				],
			});

			const result = await repository.executeQuery('env-123', 'accounts', fetchXml);

			// Map through the mapper
			const mapper = new QueryResultViewModelMapper();
			const viewModel = mapper.toViewModel(result);

			// Should have 3 columns: name, accountcategorycode, accountcategorycodename
			expect(viewModel.columns).toHaveLength(3);
			expect(viewModel.columns.map(c => c.name)).toContain('name');
			expect(viewModel.columns.map(c => c.name)).toContain('accountcategorycode');
			expect(viewModel.columns.map(c => c.name)).toContain('accountcategorycodename');

			// Row should have raw numeric value in accountcategorycode column
			expect(viewModel.rows[0]!['accountcategorycode']).toBe('1');
			// Row should have label in accountcategorycodename column
			expect(viewModel.rows[0]!['accountcategorycodename']).toBe('Preferred Customer');
			// Regular string column should work as before
			expect(viewModel.rows[0]!['name']).toBe('Contoso Ltd');
		});

		it('should handle null optionset values', async () => {
			const fetchXml = `<fetch>
  <entity name="account">
    <attribute name="accountcategorycode" />
  </entity>
</fetch>`;

			// Optionset with null value - no FormattedValue annotation returned
			mockApiService.get.mockResolvedValue({
				'@odata.context': 'https://org.crm.dynamics.com/api/data/v9.2/$metadata#accounts',
				value: [
					{
						// accountcategorycode is null (not included in response)
					},
				],
			});

			const result = await repository.executeQuery('env-123', 'accounts', fetchXml);

			const mapper = new QueryResultViewModelMapper();
			const viewModel = mapper.toViewModel(result);

			// Column should still exist even if value is null
			expect(viewModel.columns.map(c => c.name)).toContain('accountcategorycode');
			// Value should be empty string for null
			expect(viewModel.rows[0]!['accountcategorycode']).toBe('');
		});
	});

	describe('aggregate query handling', () => {
		it('should NOT create spurious name columns for aggregate COUNT results', async () => {
			// Regression test: Aggregate queries return FormattedValue annotations too,
			// but they should be identified as numbers, not optionsets.
			// Bug: COUNT(id) alias "count" was getting a spurious "countname" column.
			const fetchXml = `<fetch aggregate="true">
  <entity name="et_salesopportunity">
    <attribute name="et_salesopportunityid" alias="count" aggregate="count" />
  </entity>
</fetch>`;

			// Dataverse returns aggregate results with FormattedValue
			mockApiService.get.mockResolvedValue({
				'@odata.context': 'https://org.crm.dynamics.com/api/data/v9.2/$metadata#et_salesopportunitys',
				value: [
					{
						count: 42,
						'count@OData.Community.Display.V1.FormattedValue': '42',
					},
				],
			});

			const result = await repository.executeQuery(
				'env-123',
				'et_salesopportunitys',
				fetchXml
			);

			const mapper = new QueryResultViewModelMapper();
			const viewModel = mapper.toViewModel(result);

			// Should have exactly 1 column: "count"
			// Should NOT have "countname" (that's the bug we're fixing)
			expect(viewModel.columns.map((c) => c.name)).toEqual(['count']);
			expect(viewModel.columns.map((c) => c.name)).not.toContain('countname');

			// The data type should be 'number', not 'optionset'
			expect(result.columns[0]!.dataType).toBe('number');

			// Value should render correctly
			expect(viewModel.rows[0]!['count']).toBe('42');
		});

		it('should NOT create spurious name columns for aggregate SUM results', async () => {
			const fetchXml = `<fetch aggregate="true">
  <entity name="invoice">
    <attribute name="totalamount" alias="total" aggregate="sum" />
  </entity>
</fetch>`;

			// SUM typically returns decimal with formatted value
			mockApiService.get.mockResolvedValue({
				'@odata.context': 'https://org.crm.dynamics.com/api/data/v9.2/$metadata#invoices',
				value: [
					{
						total: 12345.67,
						'total@OData.Community.Display.V1.FormattedValue': '$12,345.67',
					},
				],
			});

			const result = await repository.executeQuery('env-123', 'invoices', fetchXml);

			const mapper = new QueryResultViewModelMapper();
			const viewModel = mapper.toViewModel(result);

			// Should have exactly 1 column: "total", no "totalname"
			expect(viewModel.columns.map((c) => c.name)).toEqual(['total']);
			expect(viewModel.columns.map((c) => c.name)).not.toContain('totalname');
		});

		it('should handle aggregate COUNT with large numbers and locale formatting', async () => {
			const fetchXml = `<fetch aggregate="true">
  <entity name="contact">
    <attribute name="contactid" alias="recordcount" aggregate="count" />
  </entity>
</fetch>`;

			// Large count with locale-formatted value (thousands separator)
			mockApiService.get.mockResolvedValue({
				'@odata.context': 'https://org.crm.dynamics.com/api/data/v9.2/$metadata#contacts',
				value: [
					{
						recordcount: 1234567,
						'recordcount@OData.Community.Display.V1.FormattedValue': '1,234,567',
					},
				],
			});

			const result = await repository.executeQuery('env-123', 'contacts', fetchXml);

			// Should be identified as number, not optionset
			expect(result.columns[0]!.dataType).toBe('number');

			const mapper = new QueryResultViewModelMapper();
			const viewModel = mapper.toViewModel(result);

			// Should NOT have "recordcountname" column
			expect(viewModel.columns.map((c) => c.name)).not.toContain('recordcountname');
		});
	});

	describe('link-entity column handling', () => {
		it('should extract link-entity columns with alias prefix from FetchXML', async () => {
			const fetchXml = `<fetch top="100">
  <entity name="contact">
    <attribute name="firstname" />
    <attribute name="lastname" />
    <link-entity name="systemuser" from="systemuserid" to="modifiedby" link-type="inner" alias="su">
      <attribute name="domainname" />
    </link-entity>
  </entity>
</fetch>`;

			// Dataverse returns link-entity columns with alias prefix (using _x002e_ encoding)
			mockApiService.get.mockResolvedValue({
				'@odata.context': 'https://org.crm.dynamics.com/api/data/v9.2/$metadata#contacts',
				value: [
					{
						firstname: 'John',
						lastname: 'Doe',
						'su_x002e_domainname': 'DOMAIN\\johndoe',
					},
				],
			});

			const result = await repository.executeQuery(
				'env-123',
				'contacts',
				fetchXml
			);

			// Should have 3 columns including the link-entity column
			expect(result.columns.length).toBe(3);
			expect(result.columns.map((c) => c.logicalName)).toEqual(
				expect.arrayContaining(['firstname', 'lastname', 'su.domainname'])
			);

			// Should be able to get the value using normalized key
			const row = result.rows[0];
			expect(row).toBeDefined();
			expect(row?.getValue('su.domainname')).toBe('DOMAIN\\johndoe');
		});

		it('should handle link-entity columns with dot notation in response', async () => {
			const fetchXml = `<fetch>
  <entity name="contact">
    <attribute name="firstname" />
    <link-entity name="systemuser" from="systemuserid" to="modifiedby" alias="su">
      <attribute name="fullname" />
    </link-entity>
  </entity>
</fetch>`;

			// Some responses might use dot notation directly
			mockApiService.get.mockResolvedValue({
				'@odata.context': 'https://org.crm.dynamics.com/api/data/v9.2/$metadata#contacts',
				value: [
					{
						firstname: 'Jane',
						'su.fullname': 'Jane Smith',
					},
				],
			});

			const result = await repository.executeQuery(
				'env-123',
				'contacts',
				fetchXml
			);

			expect(result.columns.length).toBe(2);
			expect(result.columns.map((c) => c.logicalName)).toContain('su.fullname');

			const row = result.rows[0];
			expect(row?.getValue('su.fullname')).toBe('Jane Smith');
		});

		it('should handle multiple link-entity attributes', async () => {
			const fetchXml = `<fetch>
  <entity name="contact">
    <attribute name="firstname" />
    <link-entity name="systemuser" from="systemuserid" to="modifiedby" alias="su">
      <attribute name="domainname" />
      <attribute name="fullname" />
    </link-entity>
  </entity>
</fetch>`;

			mockApiService.get.mockResolvedValue({
				'@odata.context': 'https://org.crm.dynamics.com/api/data/v9.2/$metadata#contacts',
				value: [
					{
						firstname: 'Test',
						'su_x002e_domainname': 'DOMAIN\\test',
						'su_x002e_fullname': 'Test User',
					},
				],
			});

			const result = await repository.executeQuery(
				'env-123',
				'contacts',
				fetchXml
			);

			expect(result.columns.length).toBe(3);
			expect(result.columns.map((c) => c.logicalName)).toEqual(
				expect.arrayContaining(['firstname', 'su.domainname', 'su.fullname'])
			);

			const row = result.rows[0];
			expect(row?.getValue('su.domainname')).toBe('DOMAIN\\test');
			expect(row?.getValue('su.fullname')).toBe('Test User');
		});

		it('should handle link-entity without alias (uses entity name)', async () => {
			// When no alias is provided, link-entity columns might come back with entity name
			const fetchXml = `<fetch>
  <entity name="contact">
    <attribute name="firstname" />
    <link-entity name="systemuser" from="systemuserid" to="modifiedby">
      <attribute name="domainname" />
    </link-entity>
  </entity>
</fetch>`;

			// Without alias, the attribute is in main entity context
			mockApiService.get.mockResolvedValue({
				'@odata.context': 'https://org.crm.dynamics.com/api/data/v9.2/$metadata#contacts',
				value: [
					{
						firstname: 'Test',
						domainname: 'DOMAIN\\test', // No prefix when no alias
					},
				],
			});

			const result = await repository.executeQuery(
				'env-123',
				'contacts',
				fetchXml
			);

			// Without alias in FetchXML, we expect just the attribute name
			expect(result.columns.map((c) => c.logicalName)).toContain('firstname');
			expect(result.columns.map((c) => c.logicalName)).toContain('domainname');
		});
	});
});
