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

		it('should return empty array on error', async () => {
			mockMetadataCache.getAttributeSuggestions.mockRejectedValue(new Error('Network error'));

			const result = await useCase.execute('env-123', 'account', 'na');

			expect(result).toEqual([]);
		});
	});
});
