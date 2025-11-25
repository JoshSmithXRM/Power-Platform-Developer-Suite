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
});
