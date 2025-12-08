import { NullLogger } from '../../../../infrastructure/logging/NullLogger';
import { GetOperatorSuggestionsUseCase } from './GetOperatorSuggestionsUseCase';

describe('GetOperatorSuggestionsUseCase', () => {
	let useCase: GetOperatorSuggestionsUseCase;
	const logger = new NullLogger();

	beforeEach(() => {
		useCase = new GetOperatorSuggestionsUseCase(logger);
	});

	describe('execute', () => {
		it('should return all operator suggestions when prefix is empty', () => {
			const operatorNames = ['eq', 'ne', 'like'];

			const result = useCase.execute(operatorNames, '');

			expect(result).toHaveLength(3);
			expect(result.map(r => r.name)).toEqual(['eq', 'ne', 'like']);
		});

		it('should filter operators by prefix', () => {
			const operatorNames = ['eq', 'ne', 'like', 'not-like'];

			const result = useCase.execute(operatorNames, 'li');

			expect(result).toHaveLength(1);
			expect(result[0]!.name).toBe('like');
		});

		it('should be case insensitive', () => {
			const operatorNames = ['EQ', 'Like', 'NOT-NULL'];

			const result = useCase.execute(operatorNames, 'li');

			expect(result).toHaveLength(1);
			expect(result[0]!.name).toBe('Like');
		});

		it('should return empty array when no operators match', () => {
			const operatorNames = ['eq', 'ne', 'like'];

			const result = useCase.execute(operatorNames, 'xyz');

			expect(result).toHaveLength(0);
		});

		it('should return empty array for empty operator names', () => {
			const result = useCase.execute([], 'any');

			expect(result).toHaveLength(0);
		});

		it('should filter multiple matching operators', () => {
			const operatorNames = ['eq', 'eq-userid', 'eq-userteams', 'ne'];

			const result = useCase.execute(operatorNames, 'eq');

			expect(result).toHaveLength(3);
			expect(result.map(r => r.name)).toContain('eq');
			expect(result.map(r => r.name)).toContain('eq-userid');
			expect(result.map(r => r.name)).toContain('eq-userteams');
		});

		it('should include metadata for known operators', () => {
			const operatorNames = ['eq', 'like', 'null'];

			const result = useCase.execute(operatorNames, '');

			expect(result).toHaveLength(3);

			const eqSuggestion = result.find(r => r.name === 'eq')!;
			expect(eqSuggestion.description).toBe('Equal to');
			expect(eqSuggestion.category).toBe('comparison');

			const likeSuggestion = result.find(r => r.name === 'like')!;
			expect(likeSuggestion.description).toBe('Matches pattern (use % wildcard)');
			expect(likeSuggestion.category).toBe('string');

			const nullSuggestion = result.find(r => r.name === 'null')!;
			expect(nullSuggestion.description).toBe('Value is null');
			expect(nullSuggestion.category).toBe('null');
		});

		it('should handle unknown operators with generic metadata', () => {
			const operatorNames = ['custom-op'];

			const result = useCase.execute(operatorNames, '');

			expect(result).toHaveLength(1);
			expect(result[0]!.name).toBe('custom-op');
			expect(result[0]!.description).toBe('FetchXML custom-op operator');
			expect(result[0]!.category).toBe('other');
		});

		it('should filter with exact prefix match', () => {
			const operatorNames = ['eq', 'eq-userid', 'ne'];

			const result = useCase.execute(operatorNames, 'eq-');

			expect(result).toHaveLength(1);
			expect(result[0]!.name).toBe('eq-userid');
		});

		it('should handle prefix with hyphen', () => {
			const operatorNames = ['not-like', 'not-null', 'not-in', 'like'];

			const result = useCase.execute(operatorNames, 'not-');

			expect(result).toHaveLength(3);
			expect(result.map(r => r.name)).toEqual(['not-like', 'not-null', 'not-in']);
		});

		it('should handle date operators filtering', () => {
			const operatorNames = [
				'today',
				'this-week',
				'this-month',
				'this-year',
				'tomorrow',
			];

			const result = useCase.execute(operatorNames, 'to');

			expect(result).toHaveLength(2);
			expect(result.map(r => r.name)).toContain('today');
			expect(result.map(r => r.name)).toContain('tomorrow');
		});

		it('should handle all comparison operators', () => {
			const comparisonOps = ['eq', 'ne', 'gt', 'ge', 'lt', 'le'];

			const result = useCase.execute(comparisonOps, '');

			expect(result).toHaveLength(6);
			result.forEach(r => expect(r.category).toBe('comparison'));
		});

		it('should preserve operator order from input', () => {
			const operatorNames = ['like', 'eq', 'null'];

			const result = useCase.execute(operatorNames, '');

			expect(result[0]!.name).toBe('like');
			expect(result[1]!.name).toBe('eq');
			expect(result[2]!.name).toBe('null');
		});
	});
});
