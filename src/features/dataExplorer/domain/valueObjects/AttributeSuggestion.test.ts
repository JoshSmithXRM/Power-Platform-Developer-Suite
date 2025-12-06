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

		it('should create a lookup attribute suggestion', () => {
			const suggestion = AttributeSuggestion.create('primarycontactid', 'Primary Contact', 'Lookup', false);

			expect(suggestion.logicalName).toBe('primarycontactid');
			expect(suggestion.displayName).toBe('Primary Contact');
			expect(suggestion.attributeType).toBe('Lookup');
			expect(suggestion.isCustomAttribute).toBe(false);
		});
	});

	describe('immutability', () => {
		it('should expose readonly properties', () => {
			const suggestion = AttributeSuggestion.create('name', 'Account Name', 'String', false);

			// Properties should be accessible
			expect(suggestion.logicalName).toBe('name');
			expect(suggestion.displayName).toBe('Account Name');
			expect(suggestion.attributeType).toBe('String');
			expect(suggestion.isCustomAttribute).toBe(false);

			// TypeScript prevents assignment at compile time
			// This test documents the intent for runtime behavior
		});
	});
});
