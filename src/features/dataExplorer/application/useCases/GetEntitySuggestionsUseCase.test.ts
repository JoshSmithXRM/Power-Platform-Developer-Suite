import { EntitySuggestion } from '../../domain/valueObjects/EntitySuggestion';
import { NullLogger } from '../../../../infrastructure/logging/NullLogger';

import { GetEntitySuggestionsUseCase } from './GetEntitySuggestionsUseCase';

describe('GetEntitySuggestionsUseCase', () => {
	let useCase: GetEntitySuggestionsUseCase;
	let mockMetadataCache: { getEntitySuggestions: jest.Mock };
	const logger = new NullLogger();

	beforeEach(() => {
		mockMetadataCache = {
			getEntitySuggestions: jest.fn(),
		};
		useCase = new GetEntitySuggestionsUseCase(mockMetadataCache as never, logger);
	});

	describe('execute', () => {
		it('should return all entities when prefix is empty', async () => {
			const entities = [
				EntitySuggestion.create('account', 'Account', false),
				EntitySuggestion.create('contact', 'Contact', false),
			];
			mockMetadataCache.getEntitySuggestions.mockResolvedValue(entities);

			const result = await useCase.execute('env-123', '');

			expect(result).toHaveLength(2);
			expect(mockMetadataCache.getEntitySuggestions).toHaveBeenCalledWith('env-123');
		});

		it('should filter entities by prefix on logical name', async () => {
			const entities = [
				EntitySuggestion.create('account', 'Account', false),
				EntitySuggestion.create('contact', 'Contact', false),
				EntitySuggestion.create('activity', 'Activity', false),
			];
			mockMetadataCache.getEntitySuggestions.mockResolvedValue(entities);

			const result = await useCase.execute('env-123', 'acc');

			expect(result).toHaveLength(1);
			expect(result[0]!.logicalName).toBe('account');
		});

		it('should filter entities by prefix on display name', async () => {
			const entities = [
				EntitySuggestion.create('new_customer', 'Customer', true),
				EntitySuggestion.create('contact', 'Contact', false),
			];
			mockMetadataCache.getEntitySuggestions.mockResolvedValue(entities);

			const result = await useCase.execute('env-123', 'Cus');

			expect(result).toHaveLength(1);
			expect(result[0]!.logicalName).toBe('new_customer');
		});

		it('should be case insensitive', async () => {
			const entities = [
				EntitySuggestion.create('Account', 'Account', false),
			];
			mockMetadataCache.getEntitySuggestions.mockResolvedValue(entities);

			const result = await useCase.execute('env-123', 'account');

			expect(result).toHaveLength(1);
		});

		it('should sort exact matches first', async () => {
			const entities = [
				EntitySuggestion.create('accounthistory', 'Account History', false),
				EntitySuggestion.create('account', 'Account', false),
			];
			mockMetadataCache.getEntitySuggestions.mockResolvedValue(entities);

			const result = await useCase.execute('env-123', 'account');

			expect(result[0]!.logicalName).toBe('account');
			expect(result[1]!.logicalName).toBe('accounthistory');
		});

		it('should sort prefix matches before non-prefix matches', async () => {
			const entities = [
				EntitySuggestion.create('myaccount', 'My Account', true),
				EntitySuggestion.create('account', 'Account', false),
			];
			mockMetadataCache.getEntitySuggestions.mockResolvedValue(entities);

			const result = await useCase.execute('env-123', 'acc');

			expect(result[0]!.logicalName).toBe('account');
		});

		it('should match on display name when logical name does not match', async () => {
			const entities = [
				EntitySuggestion.create('new_customer', 'Account', true),
				EntitySuggestion.create('contact', 'Contact', false),
			];
			mockMetadataCache.getEntitySuggestions.mockResolvedValue(entities);

			const result = await useCase.execute('env-123', 'Acc');

			expect(result).toHaveLength(1);
			expect(result[0]!.logicalName).toBe('new_customer');
			expect(result[0]!.displayName).toBe('Account');
		});

		it('should sort display name matches after logical name matches', async () => {
			const entities = [
				EntitySuggestion.create('new_customer', 'Customer Info', true),
				EntitySuggestion.create('account', 'Account', false),
				EntitySuggestion.create('another', 'Other Details', false),
			];
			mockMetadataCache.getEntitySuggestions.mockResolvedValue(entities);

			const result = await useCase.execute('env-123', 'acc');

			// Only 'account' matches 'acc' prefix (logical name match)
			expect(result).toHaveLength(1);
			expect(result[0]!.logicalName).toBe('account');
		});

		it('should sort exact match before prefix match', async () => {
			const entities = [
				EntitySuggestion.create('accountbase', 'Account Base', false),
				EntitySuggestion.create('account', 'Account', false),
			];
			mockMetadataCache.getEntitySuggestions.mockResolvedValue(entities);

			const result = await useCase.execute('env-123', 'account');

			expect(result[0]!.logicalName).toBe('account');
			expect(result[1]!.logicalName).toBe('accountbase');
		});

		it('should sort display name prefix matches after logical name prefix matches', async () => {
			const entities = [
				EntitySuggestion.create('custom', 'Account Info', true),
				EntitySuggestion.create('account', 'System Account', false),
			];
			mockMetadataCache.getEntitySuggestions.mockResolvedValue(entities);

			const result = await useCase.execute('env-123', 'acc');

			expect(result[0]!.logicalName).toBe('account');
			expect(result[1]!.logicalName).toBe('custom');
		});

		it('should sort logical name prefix second when comparing to exact match', async () => {
			const entities = [
				EntitySuggestion.create('accounthistory', 'Account History', false),
				EntitySuggestion.create('account', 'Account', false),
			];
			mockMetadataCache.getEntitySuggestions.mockResolvedValue(entities);

			const result = await useCase.execute('env-123', 'account');

			// 'account' is exact match, 'accounthistory' is prefix match
			expect(result[0]!.logicalName).toBe('account');
			expect(result[1]!.logicalName).toBe('accounthistory');
		});

		it('should sort display name matches after logical name starts with prefix', async () => {
			const entities = [
				EntitySuggestion.create('myentity', 'Account Info', true),
				EntitySuggestion.create('account', 'Custom Entity', false),
			];
			mockMetadataCache.getEntitySuggestions.mockResolvedValue(entities);

			const result = await useCase.execute('env-123', 'acc');

			// 'account' starts with 'acc', 'myentity' only matches via display name
			expect(result[0]!.logicalName).toBe('account');
			expect(result[1]!.logicalName).toBe('myentity');
		});

		it('should handle sorting when non-exact comes before exact in array', async () => {
			const entities = [
				EntitySuggestion.create('zaccount', 'Z Account', false), // Prefix match but alphabetically last
				EntitySuggestion.create('account', 'Account', false), // Exact match
				EntitySuggestion.create('aaccount', 'A Account', false), // Prefix match but alphabetically first
			];
			mockMetadataCache.getEntitySuggestions.mockResolvedValue(entities);

			const result = await useCase.execute('env-123', 'account');

			// 'account' exact match should be first despite being in middle
			expect(result[0]!.logicalName).toBe('account');
		});

		it('should handle sorting when display name match comes before logical name match in array', async () => {
			const entities = [
				EntitySuggestion.create('zzz', 'Account', false), // Display name match, alphabetically last logical name
				EntitySuggestion.create('account', 'Other Name', false), // Logical name prefix match
				EntitySuggestion.create('aaa', 'Accounting', false), // Display name match, alphabetically first logical name
			];
			mockMetadataCache.getEntitySuggestions.mockResolvedValue(entities);

			const result = await useCase.execute('env-123', 'acc');

			// 'account' should be first (logical name starts with prefix)
			expect(result[0]!.logicalName).toBe('account');
			// Display name matches sorted alphabetically after
			expect(result[1]!.logicalName).toBe('aaa');
			expect(result[2]!.logicalName).toBe('zzz');
		});

		it('should return empty array on error', async () => {
			mockMetadataCache.getEntitySuggestions.mockRejectedValue(new Error('Network error'));

			const result = await useCase.execute('env-123', 'acc');

			expect(result).toEqual([]);
		});
	});
});
