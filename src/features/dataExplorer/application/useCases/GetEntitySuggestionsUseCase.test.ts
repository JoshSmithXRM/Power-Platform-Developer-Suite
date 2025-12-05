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

		it('should return empty array on error', async () => {
			mockMetadataCache.getEntitySuggestions.mockRejectedValue(new Error('Network error'));

			const result = await useCase.execute('env-123', 'acc');

			expect(result).toEqual([]);
		});
	});
});
