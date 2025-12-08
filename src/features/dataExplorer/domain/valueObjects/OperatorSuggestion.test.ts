import { OperatorSuggestion } from './OperatorSuggestion';

describe('OperatorSuggestion', () => {
	describe('create', () => {
		it('should create an OperatorSuggestion with provided values', () => {
			const suggestion = OperatorSuggestion.create('eq', 'Equal to', 'comparison');

			expect(suggestion.name).toBe('eq');
			expect(suggestion.description).toBe('Equal to');
			expect(suggestion.category).toBe('comparison');
		});

		it('should create a string operator', () => {
			const suggestion = OperatorSuggestion.create('like', 'Matches pattern', 'string');

			expect(suggestion.name).toBe('like');
			expect(suggestion.description).toBe('Matches pattern');
			expect(suggestion.category).toBe('string');
		});

		it('should create a date operator', () => {
			const suggestion = OperatorSuggestion.create('today', 'Date is today', 'date');

			expect(suggestion.name).toBe('today');
			expect(suggestion.description).toBe('Date is today');
			expect(suggestion.category).toBe('date');
		});
	});

	describe('fromOperatorNames', () => {
		describe('comparison operators', () => {
			it('should create suggestions for comparison operators', () => {
				const suggestions = OperatorSuggestion.fromOperatorNames(['eq', 'ne', 'gt', 'ge', 'lt', 'le']);

				expect(suggestions).toHaveLength(6);

				expect(suggestions[0]!.name).toBe('eq');
				expect(suggestions[0]!.description).toBe('Equal to');
				expect(suggestions[0]!.category).toBe('comparison');

				expect(suggestions[1]!.name).toBe('ne');
				expect(suggestions[1]!.description).toBe('Not equal to');
				expect(suggestions[1]!.category).toBe('comparison');

				expect(suggestions[2]!.name).toBe('gt');
				expect(suggestions[2]!.description).toBe('Greater than');
				expect(suggestions[2]!.category).toBe('comparison');

				expect(suggestions[3]!.name).toBe('ge');
				expect(suggestions[3]!.description).toBe('Greater than or equal to');
				expect(suggestions[3]!.category).toBe('comparison');

				expect(suggestions[4]!.name).toBe('lt');
				expect(suggestions[4]!.description).toBe('Less than');
				expect(suggestions[4]!.category).toBe('comparison');

				expect(suggestions[5]!.name).toBe('le');
				expect(suggestions[5]!.description).toBe('Less than or equal to');
				expect(suggestions[5]!.category).toBe('comparison');
			});
		});

		describe('string operators', () => {
			it('should create suggestions for string operators', () => {
				const suggestions = OperatorSuggestion.fromOperatorNames([
					'like',
					'not-like',
					'begins-with',
					'not-begin-with',
					'ends-with',
					'not-end-with',
				]);

				expect(suggestions).toHaveLength(6);

				expect(suggestions[0]!.name).toBe('like');
				expect(suggestions[0]!.description).toBe('Matches pattern (use % wildcard)');
				expect(suggestions[0]!.category).toBe('string');

				expect(suggestions[1]!.name).toBe('not-like');
				expect(suggestions[1]!.description).toBe('Does not match pattern');
				expect(suggestions[1]!.category).toBe('string');

				expect(suggestions[2]!.name).toBe('begins-with');
				expect(suggestions[2]!.description).toBe('Starts with value');
				expect(suggestions[2]!.category).toBe('string');

				expect(suggestions[3]!.name).toBe('not-begin-with');
				expect(suggestions[3]!.description).toBe('Does not start with value');
				expect(suggestions[3]!.category).toBe('string');

				expect(suggestions[4]!.name).toBe('ends-with');
				expect(suggestions[4]!.description).toBe('Ends with value');
				expect(suggestions[4]!.category).toBe('string');

				expect(suggestions[5]!.name).toBe('not-end-with');
				expect(suggestions[5]!.description).toBe('Does not end with value');
				expect(suggestions[5]!.category).toBe('string');
			});
		});

		describe('collection operators', () => {
			it('should create suggestions for collection operators', () => {
				const suggestions = OperatorSuggestion.fromOperatorNames(['in', 'not-in', 'between', 'not-between']);

				expect(suggestions).toHaveLength(4);

				expect(suggestions[0]!.name).toBe('in');
				expect(suggestions[0]!.description).toBe('Value is in list');
				expect(suggestions[0]!.category).toBe('collection');

				expect(suggestions[1]!.name).toBe('not-in');
				expect(suggestions[1]!.description).toBe('Value is not in list');
				expect(suggestions[1]!.category).toBe('collection');

				expect(suggestions[2]!.name).toBe('between');
				expect(suggestions[2]!.description).toBe('Value is between two values');
				expect(suggestions[2]!.category).toBe('collection');

				expect(suggestions[3]!.name).toBe('not-between');
				expect(suggestions[3]!.description).toBe('Value is not between two values');
				expect(suggestions[3]!.category).toBe('collection');
			});
		});

		describe('null operators', () => {
			it('should create suggestions for null operators', () => {
				const suggestions = OperatorSuggestion.fromOperatorNames(['null', 'not-null']);

				expect(suggestions).toHaveLength(2);

				expect(suggestions[0]!.name).toBe('null');
				expect(suggestions[0]!.description).toBe('Value is null');
				expect(suggestions[0]!.category).toBe('null');

				expect(suggestions[1]!.name).toBe('not-null');
				expect(suggestions[1]!.description).toBe('Value is not null');
				expect(suggestions[1]!.category).toBe('null');
			});
		});

		describe('date operators', () => {
			it('should create suggestions for basic date operators', () => {
				const suggestions = OperatorSuggestion.fromOperatorNames([
					'today',
					'yesterday',
					'tomorrow',
					'this-week',
					'this-month',
					'this-year',
				]);

				expect(suggestions).toHaveLength(6);

				expect(suggestions[0]!.name).toBe('today');
				expect(suggestions[0]!.description).toBe('Date is today');
				expect(suggestions[0]!.category).toBe('date');

				expect(suggestions[1]!.name).toBe('yesterday');
				expect(suggestions[1]!.description).toBe('Date is yesterday');
				expect(suggestions[1]!.category).toBe('date');

				expect(suggestions[2]!.name).toBe('tomorrow');
				expect(suggestions[2]!.description).toBe('Date is tomorrow');
				expect(suggestions[2]!.category).toBe('date');

				expect(suggestions[3]!.name).toBe('this-week');
				expect(suggestions[3]!.description).toBe('Date is this week');
				expect(suggestions[3]!.category).toBe('date');

				expect(suggestions[4]!.name).toBe('this-month');
				expect(suggestions[4]!.description).toBe('Date is this month');
				expect(suggestions[4]!.category).toBe('date');

				expect(suggestions[5]!.name).toBe('this-year');
				expect(suggestions[5]!.description).toBe('Date is this year');
				expect(suggestions[5]!.category).toBe('date');
			});

			it('should create suggestions for fiscal date operators', () => {
				const suggestions = OperatorSuggestion.fromOperatorNames(['this-fiscal-year', 'this-fiscal-period']);

				expect(suggestions).toHaveLength(2);

				expect(suggestions[0]!.name).toBe('this-fiscal-year');
				expect(suggestions[0]!.description).toBe('Date is this fiscal year');
				expect(suggestions[0]!.category).toBe('date');

				expect(suggestions[1]!.name).toBe('this-fiscal-period');
				expect(suggestions[1]!.description).toBe('Date is this fiscal period');
				expect(suggestions[1]!.category).toBe('date');
			});

			it('should create suggestions for last-x date operators', () => {
				const suggestions = OperatorSuggestion.fromOperatorNames([
					'last-week',
					'last-month',
					'last-year',
					'last-x-days',
					'last-x-weeks',
					'last-x-months',
					'last-x-years',
				]);

				expect(suggestions).toHaveLength(7);
				suggestions.forEach(s => expect(s.category).toBe('date'));

				expect(suggestions[3]!.name).toBe('last-x-days');
				expect(suggestions[3]!.description).toBe('Date is within last X days');
			});

			it('should create suggestions for next-x date operators', () => {
				const suggestions = OperatorSuggestion.fromOperatorNames([
					'next-week',
					'next-month',
					'next-year',
					'next-x-days',
					'next-x-weeks',
					'next-x-months',
					'next-x-years',
				]);

				expect(suggestions).toHaveLength(7);
				suggestions.forEach(s => expect(s.category).toBe('date'));

				expect(suggestions[3]!.name).toBe('next-x-days');
				expect(suggestions[3]!.description).toBe('Date is within next X days');
			});

			it('should create suggestions for olderthan-x date operators', () => {
				const suggestions = OperatorSuggestion.fromOperatorNames([
					'olderthan-x-days',
					'olderthan-x-weeks',
					'olderthan-x-months',
					'olderthan-x-years',
				]);

				expect(suggestions).toHaveLength(4);
				suggestions.forEach(s => expect(s.category).toBe('date'));

				expect(suggestions[0]!.name).toBe('olderthan-x-days');
				expect(suggestions[0]!.description).toBe('Date is older than X days');
			});

			it('should create suggestions for on date operators', () => {
				const suggestions = OperatorSuggestion.fromOperatorNames(['on', 'on-or-before', 'on-or-after']);

				expect(suggestions).toHaveLength(3);

				expect(suggestions[0]!.name).toBe('on');
				expect(suggestions[0]!.description).toBe('Date is on specific date');
				expect(suggestions[0]!.category).toBe('date');

				expect(suggestions[1]!.name).toBe('on-or-before');
				expect(suggestions[1]!.description).toBe('Date is on or before specific date');
				expect(suggestions[1]!.category).toBe('date');

				expect(suggestions[2]!.name).toBe('on-or-after');
				expect(suggestions[2]!.description).toBe('Date is on or after specific date');
				expect(suggestions[2]!.category).toBe('date');
			});
		});

		describe('user operators', () => {
			it('should create suggestions for user operators', () => {
				const suggestions = OperatorSuggestion.fromOperatorNames([
					'eq-userid',
					'ne-userid',
					'eq-userteams',
					'eq-useroruserteams',
					'eq-useroruserhierarchy',
					'eq-useroruserhierarchyandteams',
					'eq-businessid',
					'ne-businessid',
				]);

				expect(suggestions).toHaveLength(8);
				suggestions.forEach(s => expect(s.category).toBe('user'));

				expect(suggestions[0]!.name).toBe('eq-userid');
				expect(suggestions[0]!.description).toBe('Equals current user ID');

				expect(suggestions[2]!.name).toBe('eq-userteams');
				expect(suggestions[2]!.description).toBe("Equals any of user's teams");
			});
		});

		describe('hierarchy operators', () => {
			it('should create suggestions for hierarchy operators', () => {
				const suggestions = OperatorSuggestion.fromOperatorNames([
					'above',
					'under',
					'not-under',
					'eq-or-above',
					'eq-or-under',
				]);

				expect(suggestions).toHaveLength(5);
				suggestions.forEach(s => expect(s.category).toBe('hierarchy'));

				expect(suggestions[0]!.name).toBe('above');
				expect(suggestions[0]!.description).toBe('In hierarchy above record');

				expect(suggestions[1]!.name).toBe('under');
				expect(suggestions[1]!.description).toBe('In hierarchy under record');
			});
		});

		describe('other operators', () => {
			it('should create suggestions for other operators', () => {
				const suggestions = OperatorSuggestion.fromOperatorNames(['contain-values', 'not-contain-values']);

				expect(suggestions).toHaveLength(2);

				expect(suggestions[0]!.name).toBe('contain-values');
				expect(suggestions[0]!.description).toBe('Contains any of values (multi-select)');
				expect(suggestions[0]!.category).toBe('other');

				expect(suggestions[1]!.name).toBe('not-contain-values');
				expect(suggestions[1]!.description).toBe('Does not contain any of values');
				expect(suggestions[1]!.category).toBe('other');
			});
		});

		describe('unknown operators', () => {
			it('should create generic suggestions for unknown operators', () => {
				const suggestions = OperatorSuggestion.fromOperatorNames(['custom-op', 'unknown']);

				expect(suggestions).toHaveLength(2);

				expect(suggestions[0]!.name).toBe('custom-op');
				expect(suggestions[0]!.description).toBe('FetchXML custom-op operator');
				expect(suggestions[0]!.category).toBe('other');

				expect(suggestions[1]!.name).toBe('unknown');
				expect(suggestions[1]!.description).toBe('FetchXML unknown operator');
				expect(suggestions[1]!.category).toBe('other');
			});
		});

		describe('mixed operators', () => {
			it('should handle mixed known and unknown operators', () => {
				const suggestions = OperatorSuggestion.fromOperatorNames(['eq', 'custom-op', 'like']);

				expect(suggestions).toHaveLength(3);

				expect(suggestions[0]!.name).toBe('eq');
				expect(suggestions[0]!.category).toBe('comparison');

				expect(suggestions[1]!.name).toBe('custom-op');
				expect(suggestions[1]!.category).toBe('other');

				expect(suggestions[2]!.name).toBe('like');
				expect(suggestions[2]!.category).toBe('string');
			});

			it('should return empty array for empty input', () => {
				const suggestions = OperatorSuggestion.fromOperatorNames([]);

				expect(suggestions).toHaveLength(0);
			});

			it('should preserve operator order from input', () => {
				const suggestions = OperatorSuggestion.fromOperatorNames(['like', 'eq', 'today']);

				expect(suggestions[0]!.name).toBe('like');
				expect(suggestions[1]!.name).toBe('eq');
				expect(suggestions[2]!.name).toBe('today');
			});
		});
	});

	describe('immutability', () => {
		it('should expose readonly properties', () => {
			const suggestion = OperatorSuggestion.create('eq', 'Equal to', 'comparison');

			// Properties should be accessible
			expect(suggestion.name).toBe('eq');
			expect(suggestion.description).toBe('Equal to');
			expect(suggestion.category).toBe('comparison');

			// TypeScript prevents assignment at compile time
			// This test documents the intent for runtime behavior
		});
	});
});
