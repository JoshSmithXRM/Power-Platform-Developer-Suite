import { AttributeSuggestion } from '../../domain/valueObjects/AttributeSuggestion';
import { NullLogger } from '../../../../infrastructure/logging/NullLogger';

import { GetAttributeSuggestionsUseCase } from './GetAttributeSuggestionsUseCase';

describe('GetAttributeSuggestionsUseCase', () => {
	let useCase: GetAttributeSuggestionsUseCase;
	let mockMetadataCache: { getAttributeSuggestions: jest.Mock };
	const logger = new NullLogger();

	beforeEach(() => {
		mockMetadataCache = {
			getAttributeSuggestions: jest.fn(),
		};
		useCase = new GetAttributeSuggestionsUseCase(mockMetadataCache as never, logger);
	});

	describe('execute', () => {
		it('should return all attributes when prefix is empty', async () => {
			const attributes = [
				AttributeSuggestion.create('name', 'Account Name', 'String', false),
				AttributeSuggestion.create('accountid', 'Account ID', 'UniqueIdentifier', false),
			];
			mockMetadataCache.getAttributeSuggestions.mockResolvedValue(attributes);

			const result = await useCase.execute('env-123', 'account', '');

			expect(result).toHaveLength(2);
			expect(mockMetadataCache.getAttributeSuggestions).toHaveBeenCalledWith('env-123', 'account');
		});

		it('should filter attributes by prefix on logical name', async () => {
			const attributes = [
				AttributeSuggestion.create('name', 'Account Name', 'String', false),
				AttributeSuggestion.create('accountid', 'Account ID', 'UniqueIdentifier', false),
				AttributeSuggestion.create('numberofemployees', 'Number of Employees', 'Integer', false),
			];
			mockMetadataCache.getAttributeSuggestions.mockResolvedValue(attributes);

			const result = await useCase.execute('env-123', 'account', 'na');

			expect(result).toHaveLength(1);
			expect(result[0]!.logicalName).toBe('name');
		});

		it('should filter attributes by prefix on display name', async () => {
			const attributes = [
				AttributeSuggestion.create('ownerid', 'Owner', 'Lookup', false),
				AttributeSuggestion.create('createdon', 'Created On', 'DateTime', false),
			];
			mockMetadataCache.getAttributeSuggestions.mockResolvedValue(attributes);

			const result = await useCase.execute('env-123', 'account', 'Own');

			expect(result).toHaveLength(1);
			expect(result[0]!.logicalName).toBe('ownerid');
		});

		it('should be case insensitive', async () => {
			const attributes = [
				AttributeSuggestion.create('Name', 'Account Name', 'String', false),
			];
			mockMetadataCache.getAttributeSuggestions.mockResolvedValue(attributes);

			const result = await useCase.execute('env-123', 'account', 'name');

			expect(result).toHaveLength(1);
		});

		it('should sort exact matches first', async () => {
			const attributes = [
				AttributeSuggestion.create('nameprefix', 'Name Prefix', 'String', false),
				AttributeSuggestion.create('name', 'Name', 'String', false),
			];
			mockMetadataCache.getAttributeSuggestions.mockResolvedValue(attributes);

			const result = await useCase.execute('env-123', 'account', 'name');

			expect(result[0]!.logicalName).toBe('name');
			expect(result[1]!.logicalName).toBe('nameprefix');
		});

		it('should sort prefix matches before non-prefix matches', async () => {
			const attributes = [
				AttributeSuggestion.create('fullname', 'Full Name', 'String', false),
				AttributeSuggestion.create('name', 'Name', 'String', false),
			];
			mockMetadataCache.getAttributeSuggestions.mockResolvedValue(attributes);

			const result = await useCase.execute('env-123', 'account', 'na');

			expect(result[0]!.logicalName).toBe('name');
		});

		it('should match on display name when logical name does not match', async () => {
			const attributes = [
				AttributeSuggestion.create('new_accountname', 'Name', 'String', true),
				AttributeSuggestion.create('description', 'Description', 'String', false),
			];
			mockMetadataCache.getAttributeSuggestions.mockResolvedValue(attributes);

			const result = await useCase.execute('env-123', 'account', 'Na');

			expect(result).toHaveLength(1);
			expect(result[0]!.logicalName).toBe('new_accountname');
			expect(result[0]!.displayName).toBe('Name');
		});

		it('should sort logical name prefix matches before display name matches', async () => {
			const attributes = [
				AttributeSuggestion.create('custom', 'Name Field', 'String', true),
				AttributeSuggestion.create('name', 'Primary Name', 'String', false),
				AttributeSuggestion.create('other', 'Other Field', 'String', false),
			];
			mockMetadataCache.getAttributeSuggestions.mockResolvedValue(attributes);

			const result = await useCase.execute('env-123', 'account', 'na');

			// 'name' matches prefix on logical name, 'custom' matches via display name 'Name Field'
			expect(result).toHaveLength(2);
			expect(result[0]!.logicalName).toBe('name');
			expect(result[1]!.logicalName).toBe('custom');
		});

		it('should sort exact match before prefix match', async () => {
			const attributes = [
				AttributeSuggestion.create('namebase', 'Name Base', 'String', false),
				AttributeSuggestion.create('name', 'Name', 'String', false),
			];
			mockMetadataCache.getAttributeSuggestions.mockResolvedValue(attributes);

			const result = await useCase.execute('env-123', 'account', 'name');

			expect(result[0]!.logicalName).toBe('name');
			expect(result[1]!.logicalName).toBe('namebase');
		});

		it('should sort display name prefix matches after logical name prefix matches', async () => {
			const attributes = [
				AttributeSuggestion.create('custom', 'Name Value', 'String', true),
				AttributeSuggestion.create('name', 'Display Name', 'String', false),
			];
			mockMetadataCache.getAttributeSuggestions.mockResolvedValue(attributes);

			const result = await useCase.execute('env-123', 'account', 'na');

			expect(result[0]!.logicalName).toBe('name');
			expect(result[1]!.logicalName).toBe('custom');
		});

		it('should sort logical name prefix second when comparing to exact match', async () => {
			const attributes = [
				AttributeSuggestion.create('namehistory', 'Name History', 'String', false),
				AttributeSuggestion.create('name', 'Name', 'String', false),
			];
			mockMetadataCache.getAttributeSuggestions.mockResolvedValue(attributes);

			const result = await useCase.execute('env-123', 'account', 'name');

			// 'name' is exact match, 'namehistory' is prefix match
			expect(result[0]!.logicalName).toBe('name');
			expect(result[1]!.logicalName).toBe('namehistory');
		});

		it('should sort display name matches after logical name starts with prefix', async () => {
			const attributes = [
				AttributeSuggestion.create('myfield', 'Name Info', 'String', true),
				AttributeSuggestion.create('name', 'Custom Field', 'String', false),
			];
			mockMetadataCache.getAttributeSuggestions.mockResolvedValue(attributes);

			const result = await useCase.execute('env-123', 'account', 'na');

			// 'name' starts with 'na', 'myfield' only matches via display name
			expect(result[0]!.logicalName).toBe('name');
			expect(result[1]!.logicalName).toBe('myfield');
		});

		it('should handle sorting when non-exact comes before exact in array', async () => {
			const attributes = [
				AttributeSuggestion.create('zname', 'Z Name', 'String', false), // Prefix match but alphabetically last
				AttributeSuggestion.create('name', 'Name', 'String', false), // Exact match
				AttributeSuggestion.create('aname', 'A Name', 'String', false), // Prefix match but alphabetically first
			];
			mockMetadataCache.getAttributeSuggestions.mockResolvedValue(attributes);

			const result = await useCase.execute('env-123', 'account', 'name');

			// 'name' exact match should be first despite being in middle
			expect(result[0]!.logicalName).toBe('name');
		});

		it('should handle sorting when display name match comes before logical name match in array', async () => {
			const attributes = [
				AttributeSuggestion.create('zzz', 'Name', 'String', false), // Display name match, alphabetically last logical name
				AttributeSuggestion.create('name', 'Other Field', 'String', false), // Logical name prefix match
				AttributeSuggestion.create('aaa', 'Naming', 'String', false), // Display name match, alphabetically first logical name
			];
			mockMetadataCache.getAttributeSuggestions.mockResolvedValue(attributes);

			const result = await useCase.execute('env-123', 'account', 'na');

			// 'name' should be first (logical name starts with prefix)
			expect(result[0]!.logicalName).toBe('name');
			// Display name matches sorted alphabetically after
			expect(result[1]!.logicalName).toBe('aaa');
			expect(result[2]!.logicalName).toBe('zzz');
		});

		it('should return empty array on error', async () => {
			mockMetadataCache.getAttributeSuggestions.mockRejectedValue(new Error('Network error'));

			const result = await useCase.execute('env-123', 'account', 'na');

			expect(result).toEqual([]);
		});
	});
});
