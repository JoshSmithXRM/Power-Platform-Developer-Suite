import { FetchXmlElementSuggestion } from './FetchXmlElementSuggestion';

describe('FetchXmlElementSuggestion', () => {
	describe('create', () => {
		it('should create a FetchXmlElementSuggestion with provided values', () => {
			const suggestion = FetchXmlElementSuggestion.create('entity', 'Primary entity to query', true);

			expect(suggestion.name).toBe('entity');
			expect(suggestion.description).toBe('Primary entity to query');
			expect(suggestion.hasChildren).toBe(true);
		});

		it('should create an element without children', () => {
			const suggestion = FetchXmlElementSuggestion.create('attribute', 'Column to retrieve', false);

			expect(suggestion.name).toBe('attribute');
			expect(suggestion.description).toBe('Column to retrieve');
			expect(suggestion.hasChildren).toBe(false);
		});
	});

	describe('fromElementNames', () => {
		it('should create suggestions for known elements with pre-defined metadata', () => {
			const suggestions = FetchXmlElementSuggestion.fromElementNames(['fetch', 'entity', 'attribute']);

			expect(suggestions).toHaveLength(3);

			expect(suggestions[0]!.name).toBe('fetch');
			expect(suggestions[0]!.description).toBe('Root element for FetchXML query');
			expect(suggestions[0]!.hasChildren).toBe(true);

			expect(suggestions[1]!.name).toBe('entity');
			expect(suggestions[1]!.description).toBe('Primary entity to query');
			expect(suggestions[1]!.hasChildren).toBe(true);

			expect(suggestions[2]!.name).toBe('attribute');
			expect(suggestions[2]!.description).toBe('Column to retrieve from entity');
			expect(suggestions[2]!.hasChildren).toBe(false);
		});

		it('should create suggestions for all known elements', () => {
			const knownElements = [
				'fetch',
				'entity',
				'attribute',
				'all-attributes',
				'order',
				'filter',
				'condition',
				'link-entity',
			];

			const suggestions = FetchXmlElementSuggestion.fromElementNames(knownElements);

			expect(suggestions).toHaveLength(8);

			// Verify each known element has proper metadata
			const fetchSuggestion = suggestions.find(s => s.name === 'fetch')!;
			expect(fetchSuggestion.description).toBe('Root element for FetchXML query');
			expect(fetchSuggestion.hasChildren).toBe(true);

			const allAttrSuggestion = suggestions.find(s => s.name === 'all-attributes')!;
			expect(allAttrSuggestion.description).toBe('Retrieve all columns from entity');
			expect(allAttrSuggestion.hasChildren).toBe(false);

			const orderSuggestion = suggestions.find(s => s.name === 'order')!;
			expect(orderSuggestion.description).toBe('Sort results by an attribute');
			expect(orderSuggestion.hasChildren).toBe(false);

			const filterSuggestion = suggestions.find(s => s.name === 'filter')!;
			expect(filterSuggestion.description).toBe('Filter conditions (AND/OR group)');
			expect(filterSuggestion.hasChildren).toBe(true);

			const conditionSuggestion = suggestions.find(s => s.name === 'condition')!;
			expect(conditionSuggestion.description).toBe('Single filter condition');
			expect(conditionSuggestion.hasChildren).toBe(false);

			const linkEntitySuggestion = suggestions.find(s => s.name === 'link-entity')!;
			expect(linkEntitySuggestion.description).toBe('Join to related entity');
			expect(linkEntitySuggestion.hasChildren).toBe(true);
		});

		it('should create generic suggestions for unknown elements', () => {
			const suggestions = FetchXmlElementSuggestion.fromElementNames(['custom-element', 'unknown']);

			expect(suggestions).toHaveLength(2);

			expect(suggestions[0]!.name).toBe('custom-element');
			expect(suggestions[0]!.description).toBe('FetchXML custom-element element');
			expect(suggestions[0]!.hasChildren).toBe(false);

			expect(suggestions[1]!.name).toBe('unknown');
			expect(suggestions[1]!.description).toBe('FetchXML unknown element');
			expect(suggestions[1]!.hasChildren).toBe(false);
		});

		it('should handle mixed known and unknown elements', () => {
			const suggestions = FetchXmlElementSuggestion.fromElementNames(['entity', 'custom-element', 'attribute']);

			expect(suggestions).toHaveLength(3);

			// Known element
			expect(suggestions[0]!.name).toBe('entity');
			expect(suggestions[0]!.description).toBe('Primary entity to query');
			expect(suggestions[0]!.hasChildren).toBe(true);

			// Unknown element
			expect(suggestions[1]!.name).toBe('custom-element');
			expect(suggestions[1]!.description).toBe('FetchXML custom-element element');
			expect(suggestions[1]!.hasChildren).toBe(false);

			// Known element
			expect(suggestions[2]!.name).toBe('attribute');
			expect(suggestions[2]!.description).toBe('Column to retrieve from entity');
			expect(suggestions[2]!.hasChildren).toBe(false);
		});

		it('should return empty array for empty input', () => {
			const suggestions = FetchXmlElementSuggestion.fromElementNames([]);

			expect(suggestions).toHaveLength(0);
		});

		it('should preserve element order from input', () => {
			const suggestions = FetchXmlElementSuggestion.fromElementNames(['condition', 'filter', 'entity']);

			expect(suggestions[0]!.name).toBe('condition');
			expect(suggestions[1]!.name).toBe('filter');
			expect(suggestions[2]!.name).toBe('entity');
		});
	});

	describe('immutability', () => {
		it('should expose readonly properties', () => {
			const suggestion = FetchXmlElementSuggestion.create('entity', 'Primary entity', true);

			// Properties should be accessible
			expect(suggestion.name).toBe('entity');
			expect(suggestion.description).toBe('Primary entity');
			expect(suggestion.hasChildren).toBe(true);

			// TypeScript prevents assignment at compile time
			// This test documents the intent for runtime behavior
		});
	});
});
