import { EntitySuggestion } from './EntitySuggestion';

describe('EntitySuggestion', () => {
	describe('create', () => {
		it('should create an EntitySuggestion with provided values', () => {
			const suggestion = EntitySuggestion.create('account', 'Account', false);

			expect(suggestion.logicalName).toBe('account');
			expect(suggestion.displayName).toBe('Account');
			expect(suggestion.isCustomEntity).toBe(false);
		});

		it('should create a custom entity suggestion', () => {
			const suggestion = EntitySuggestion.create('new_customentity', 'Custom Entity', true);

			expect(suggestion.logicalName).toBe('new_customentity');
			expect(suggestion.displayName).toBe('Custom Entity');
			expect(suggestion.isCustomEntity).toBe(true);
		});
	});

	describe('immutability', () => {
		it('should expose readonly properties', () => {
			const suggestion = EntitySuggestion.create('account', 'Account', false);

			// Properties should be accessible
			expect(suggestion.logicalName).toBe('account');
			expect(suggestion.displayName).toBe('Account');
			expect(suggestion.isCustomEntity).toBe(false);

			// TypeScript prevents assignment at compile time
			// This test documents the intent for runtime behavior
		});
	});
});
