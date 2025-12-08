import { NullLogger } from '../../../../infrastructure/logging/NullLogger';
import { GetFetchXmlElementSuggestionsUseCase } from './GetFetchXmlElementSuggestionsUseCase';

describe('GetFetchXmlElementSuggestionsUseCase', () => {
	let useCase: GetFetchXmlElementSuggestionsUseCase;
	const logger = new NullLogger();

	beforeEach(() => {
		useCase = new GetFetchXmlElementSuggestionsUseCase(logger);
	});

	describe('execute', () => {
		it('should return all element suggestions when prefix is empty', () => {
			const elementNames = ['fetch', 'entity', 'attribute'];

			const result = useCase.execute(elementNames, '');

			expect(result).toHaveLength(3);
			expect(result.map(r => r.name)).toEqual(['fetch', 'entity', 'attribute']);
		});

		it('should filter elements by prefix', () => {
			const elementNames = ['fetch', 'filter', 'entity', 'attribute'];

			const result = useCase.execute(elementNames, 'fi');

			expect(result).toHaveLength(1);
			expect(result[0]!.name).toBe('filter');
		});

		it('should be case insensitive', () => {
			const elementNames = ['fetch', 'Filter', 'ENTITY'];

			const result = useCase.execute(elementNames, 'FI');

			expect(result).toHaveLength(1);
			expect(result[0]!.name).toBe('Filter');
		});

		it('should return empty array when no elements match', () => {
			const elementNames = ['fetch', 'entity', 'attribute'];

			const result = useCase.execute(elementNames, 'xyz');

			expect(result).toHaveLength(0);
		});

		it('should return empty array for empty element names', () => {
			const result = useCase.execute([], 'any');

			expect(result).toHaveLength(0);
		});

		it('should filter multiple matching elements', () => {
			const elementNames = ['all-attributes', 'attribute', 'activity'];

			const result = useCase.execute(elementNames, 'a');

			expect(result).toHaveLength(3);
		});

		it('should include metadata for known elements', () => {
			const elementNames = ['entity', 'link-entity'];

			const result = useCase.execute(elementNames, '');

			expect(result).toHaveLength(2);

			const entitySuggestion = result.find(r => r.name === 'entity')!;
			expect(entitySuggestion.description).toBe('Primary entity to query');
			expect(entitySuggestion.hasChildren).toBe(true);

			const linkEntitySuggestion = result.find(r => r.name === 'link-entity')!;
			expect(linkEntitySuggestion.description).toBe('Join to related entity');
			expect(linkEntitySuggestion.hasChildren).toBe(true);
		});

		it('should handle unknown elements with generic metadata', () => {
			const elementNames = ['custom-element'];

			const result = useCase.execute(elementNames, '');

			expect(result).toHaveLength(1);
			expect(result[0]!.name).toBe('custom-element');
			expect(result[0]!.description).toBe('FetchXML custom-element element');
			expect(result[0]!.hasChildren).toBe(false);
		});

		it('should filter with exact prefix match', () => {
			const elementNames = ['fetch', 'entity', 'link-entity'];

			const result = useCase.execute(elementNames, 'fetch');

			expect(result).toHaveLength(1);
			expect(result[0]!.name).toBe('fetch');
		});

		it('should handle prefix with hyphen', () => {
			const elementNames = ['link-entity', 'all-attributes', 'entity'];

			const result = useCase.execute(elementNames, 'link');

			expect(result).toHaveLength(1);
			expect(result[0]!.name).toBe('link-entity');
		});

		it('should handle all FetchXML elements', () => {
			const allElements = [
				'fetch',
				'entity',
				'attribute',
				'all-attributes',
				'order',
				'filter',
				'condition',
				'link-entity',
			];

			const result = useCase.execute(allElements, '');

			expect(result).toHaveLength(8);
		});
	});
});
