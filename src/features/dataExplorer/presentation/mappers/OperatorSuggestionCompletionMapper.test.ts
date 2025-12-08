/**
 * Unit tests for OperatorSuggestionCompletionMapper
 * Tests cover mapping domain OperatorSuggestion to VS Code CompletionItem.
 */

import * as vscode from 'vscode';

import { OperatorSuggestionCompletionMapper } from './OperatorSuggestionCompletionMapper';
import { OperatorSuggestion, type OperatorCategory } from '../../domain/valueObjects/OperatorSuggestion';

// Mock vscode module
jest.mock('vscode', () => ({
	CompletionItem: jest.fn().mockImplementation((label: string, kind: number) => ({
		label,
		kind,
		detail: undefined,
		documentation: undefined,
		insertText: undefined,
		sortText: undefined
	})),
	CompletionItemKind: {
		Operator: 23
	},
	MarkdownString: jest.fn().mockImplementation((value: string) => ({
		value
	}))
}), { virtual: true });

describe('OperatorSuggestionCompletionMapper', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('toCompletionItem', () => {
		it('should map OperatorSuggestion to CompletionItem', () => {
			const operator = OperatorSuggestion.create('eq', 'Equal to', 'comparison');

			const result = OperatorSuggestionCompletionMapper.toCompletionItem(operator, 0);

			expect(vscode.CompletionItem).toHaveBeenCalledWith('eq', vscode.CompletionItemKind.Operator);
			expect(result.label).toBe('eq');
			expect(result.detail).toBe('Equal to');
			expect(result.insertText).toBe('eq');
		});

		it('should set documentation with formatted markdown', () => {
			const operator = OperatorSuggestion.create('like', 'Matches pattern (use % wildcard)', 'string');

			const result = OperatorSuggestionCompletionMapper.toCompletionItem(operator, 0);

			expect(vscode.MarkdownString).toHaveBeenCalledWith(
				'**like**\n\nMatches pattern (use % wildcard)\n\n*Category: string*'
			);
			expect(result.documentation).toEqual({
				value: '**like**\n\nMatches pattern (use % wildcard)\n\n*Category: string*'
			});
		});

		it('should use operator name as insertText', () => {
			const operator = OperatorSuggestion.create('ne', 'Not equal to', 'comparison');

			const result = OperatorSuggestionCompletionMapper.toCompletionItem(operator, 0);

			expect(result.insertText).toBe('ne');
		});

		describe('sortText category ordering', () => {
			const testCategorySortOrder = (
				category: OperatorCategory,
				expectedPrefix: string
			): void => {
				it(`should use prefix "${expectedPrefix}" for ${category} category`, () => {
					const operator = OperatorSuggestion.create('test', 'Test', category);

					const result = OperatorSuggestionCompletionMapper.toCompletionItem(operator, 5);

					expect(result.sortText).toBe(`${expectedPrefix}-00005`);
				});
			};

			testCategorySortOrder('comparison', '1');
			testCategorySortOrder('string', '2');
			testCategorySortOrder('null', '3');
			testCategorySortOrder('collection', '4');
			testCategorySortOrder('date', '5');
			testCategorySortOrder('user', '6');
			testCategorySortOrder('hierarchy', '7');
			testCategorySortOrder('other', '8');
		});

		it('should combine category prefix with zero-padded index', () => {
			const operator = OperatorSuggestion.create('eq', 'Equal', 'comparison');

			const result = OperatorSuggestionCompletionMapper.toCompletionItem(operator, 42);

			expect(result.sortText).toBe('1-00042');
		});

		it('should ensure comparison operators appear before string operators', () => {
			const comparisonOp = OperatorSuggestion.create('eq', 'Equal', 'comparison');
			const stringOp = OperatorSuggestion.create('like', 'Like', 'string');

			const compResult = OperatorSuggestionCompletionMapper.toCompletionItem(comparisonOp, 0);
			const strResult = OperatorSuggestionCompletionMapper.toCompletionItem(stringOp, 0);

			// Comparison (1-) should sort before String (2-) lexicographically
			expect(compResult.sortText!.localeCompare(strResult.sortText!)).toBeLessThan(0);
		});
	});

	describe('toCompletionItems', () => {
		it('should map empty array', () => {
			const result = OperatorSuggestionCompletionMapper.toCompletionItems([]);

			expect(result).toEqual([]);
		});

		it('should map single operator', () => {
			const operators = [OperatorSuggestion.create('eq', 'Equal to', 'comparison')];

			const result = OperatorSuggestionCompletionMapper.toCompletionItems(operators);

			expect(result).toHaveLength(1);
			expect(result[0]?.label).toBe('eq');
		});

		it('should map multiple operators with sequential indices', () => {
			const operators = [
				OperatorSuggestion.create('eq', 'Equal', 'comparison'),
				OperatorSuggestion.create('ne', 'Not equal', 'comparison'),
				OperatorSuggestion.create('gt', 'Greater than', 'comparison')
			];

			const result = OperatorSuggestionCompletionMapper.toCompletionItems(operators);

			expect(result).toHaveLength(3);
			expect(result[0]?.sortText).toBe('1-00000');
			expect(result[1]?.sortText).toBe('1-00001');
			expect(result[2]?.sortText).toBe('1-00002');
		});

		it('should preserve operator order within same category', () => {
			const operators = [
				OperatorSuggestion.create('ne', 'Not equal', 'comparison'),
				OperatorSuggestion.create('eq', 'Equal', 'comparison')
			];

			const result = OperatorSuggestionCompletionMapper.toCompletionItems(operators);

			expect(result[0]?.label).toBe('ne');
			expect(result[1]?.label).toBe('eq');
		});

		it('should map operators from different categories', () => {
			const operators = [
				OperatorSuggestion.create('eq', 'Equal', 'comparison'),
				OperatorSuggestion.create('like', 'Like', 'string'),
				OperatorSuggestion.create('null', 'Is null', 'null')
			];

			const result = OperatorSuggestionCompletionMapper.toCompletionItems(operators);

			expect(result).toHaveLength(3);
			expect(result[0]?.sortText).toBe('1-00000'); // comparison
			expect(result[1]?.sortText).toBe('2-00001'); // string
			expect(result[2]?.sortText).toBe('3-00002'); // null
		});

		it('should handle readonly array input', () => {
			const operators: readonly OperatorSuggestion[] = [
				OperatorSuggestion.create('eq', 'Equal', 'comparison')
			];

			const result = OperatorSuggestionCompletionMapper.toCompletionItems(operators);

			expect(result).toHaveLength(1);
		});
	});

	describe('integration with fromOperatorNames', () => {
		it('should correctly map operators from factory method', () => {
			const operators = OperatorSuggestion.fromOperatorNames(['eq', 'ne', 'like']);

			const result = OperatorSuggestionCompletionMapper.toCompletionItems(operators);

			expect(result).toHaveLength(3);
			expect(result[0]?.label).toBe('eq');
			expect(result[0]?.detail).toBe('Equal to');
			expect(result[1]?.label).toBe('ne');
			expect(result[1]?.detail).toBe('Not equal to');
			expect(result[2]?.label).toBe('like');
			expect(result[2]?.detail).toBe('Matches pattern (use % wildcard)');
		});

		it('should group operators by category in sort order', () => {
			const operators = OperatorSuggestion.fromOperatorNames(['eq', 'like', 'null', 'today']);

			const result = OperatorSuggestionCompletionMapper.toCompletionItems(operators);

			// eq (comparison=1), like (string=2), null (null=3), today (date=5)
			expect(result[0]?.sortText?.startsWith('1')).toBe(true);
			expect(result[1]?.sortText?.startsWith('2')).toBe(true);
			expect(result[2]?.sortText?.startsWith('3')).toBe(true);
			expect(result[3]?.sortText?.startsWith('5')).toBe(true);
		});

		it('should handle unknown operators with "other" category', () => {
			const operators = OperatorSuggestion.fromOperatorNames(['unknown-op']);

			const result = OperatorSuggestionCompletionMapper.toCompletionItems(operators);

			expect(result[0]?.sortText).toBe('8-00000'); // other = 8
		});
	});
});
