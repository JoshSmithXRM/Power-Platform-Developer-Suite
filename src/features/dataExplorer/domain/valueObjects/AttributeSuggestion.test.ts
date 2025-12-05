import { AttributeSuggestion } from './AttributeSuggestion';

describe('AttributeSuggestion', () => {
	describe('create', () => {
		it('should create an AttributeSuggestion with provided values', () => {
			const suggestion = AttributeSuggestion.create('name', 'Account Name', 'String', false);

			expect(suggestion.logicalName).toBe('name');
			expect(suggestion.displayName).toBe('Account Name');
			expect(suggestion.attributeType).toBe('String');
			expect(suggestion.isCustomAttribute).toBe(false);
		});

		it('should create a custom attribute suggestion', () => {
			const suggestion = AttributeSuggestion.create('new_customfield', 'Custom Field', 'Picklist', true);

			expect(suggestion.logicalName).toBe('new_customfield');
			expect(suggestion.displayName).toBe('Custom Field');
			expect(suggestion.attributeType).toBe('Picklist');
			expect(suggestion.isCustomAttribute).toBe(true);
		});
	});

	describe('getDisplayLabel', () => {
		it('should return the logical name', () => {
			const suggestion = AttributeSuggestion.create('name', 'Account Name', 'String', false);

			expect(suggestion.getDisplayLabel()).toBe('name');
		});
	});

	describe('getDetail', () => {
		it('should return display name with type in parentheses', () => {
			const suggestion = AttributeSuggestion.create('name', 'Account Name', 'String', false);

			expect(suggestion.getDetail()).toBe('Account Name (String)');
		});

		it('should format lookup type correctly', () => {
			const suggestion = AttributeSuggestion.create('primarycontactid', 'Primary Contact', 'Lookup', false);

			expect(suggestion.getDetail()).toBe('Primary Contact (Lookup)');
		});
	});

	describe('getInsertText', () => {
		it('should return the logical name', () => {
			const suggestion = AttributeSuggestion.create('name', 'Account Name', 'String', false);

			expect(suggestion.getInsertText()).toBe('name');
		});
	});
});
