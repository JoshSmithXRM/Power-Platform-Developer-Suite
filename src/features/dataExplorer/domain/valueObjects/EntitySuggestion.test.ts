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

	describe('getDisplayLabel', () => {
		it('should return the logical name', () => {
			const suggestion = EntitySuggestion.create('account', 'Account', false);

			expect(suggestion.getDisplayLabel()).toBe('account');
		});
	});

	describe('getDetail', () => {
		it('should return the display name', () => {
			const suggestion = EntitySuggestion.create('account', 'Account', false);

			expect(suggestion.getDetail()).toBe('Account');
		});
	});

	describe('getInsertText', () => {
		it('should return the logical name', () => {
			const suggestion = EntitySuggestion.create('account', 'Account', false);

			expect(suggestion.getInsertText()).toBe('account');
		});
	});

	describe('getDocumentation', () => {
		it('should return "System Entity" for system entities', () => {
			const suggestion = EntitySuggestion.create('account', 'Account', false);

			expect(suggestion.getDocumentation()).toBe('System Entity');
		});

		it('should return "Custom Entity" for custom entities', () => {
			const suggestion = EntitySuggestion.create('new_customentity', 'Custom Entity', true);

			expect(suggestion.getDocumentation()).toBe('Custom Entity');
		});
	});
});
