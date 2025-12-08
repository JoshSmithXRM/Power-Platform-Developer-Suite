/**
 * Unit tests for AttributeSuggestionCompletionMapper
 * Tests cover mapping domain AttributeSuggestion to VS Code CompletionItem.
 */

import * as vscode from 'vscode';

import { AttributeSuggestionCompletionMapper } from './AttributeSuggestionCompletionMapper';
import { AttributeSuggestion } from '../../domain/valueObjects/AttributeSuggestion';

// Mock vscode module
jest.mock('vscode', () => ({
	CompletionItem: jest.fn().mockImplementation((label: string, kind: number) => ({
		label,
		kind,
		detail: undefined,
		insertText: undefined,
		sortText: undefined
	})),
	CompletionItemKind: {
		Field: 4,
		Reference: 17,
		Enum: 12,
		Value: 11
	}
}), { virtual: true });

describe('AttributeSuggestionCompletionMapper', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('toCompletionItem', () => {
		it('should map AttributeSuggestion to CompletionItem', () => {
			const attr = AttributeSuggestion.create('name', 'Account Name', 'String', false);

			const result = AttributeSuggestionCompletionMapper.toCompletionItem(attr, 0);

			expect(vscode.CompletionItem).toHaveBeenCalledWith('name', vscode.CompletionItemKind.Field);
			expect(result.label).toBe('name');
			expect(result.detail).toBe('Account Name (String)');
			expect(result.insertText).toBe('name');
		});

		it('should set sortText with zero-padded index', () => {
			const attr = AttributeSuggestion.create('name', 'Name', 'String', false);

			const result = AttributeSuggestionCompletionMapper.toCompletionItem(attr, 42);

			expect(result.sortText).toBe('00042');
		});

		it('should use Reference kind for Lookup type', () => {
			const attr = AttributeSuggestion.create('parentaccountid', 'Parent Account', 'Lookup', false);

			AttributeSuggestionCompletionMapper.toCompletionItem(attr, 0);

			expect(vscode.CompletionItem).toHaveBeenCalledWith(
				'parentaccountid',
				vscode.CompletionItemKind.Reference
			);
		});

		it('should use Enum kind for Picklist type', () => {
			const attr = AttributeSuggestion.create('statuscode', 'Status', 'Picklist', false);

			AttributeSuggestionCompletionMapper.toCompletionItem(attr, 0);

			expect(vscode.CompletionItem).toHaveBeenCalledWith(
				'statuscode',
				vscode.CompletionItemKind.Enum
			);
		});

		it('should use Value kind for Boolean type', () => {
			const attr = AttributeSuggestion.create('isactive', 'Is Active', 'Boolean', false);

			AttributeSuggestionCompletionMapper.toCompletionItem(attr, 0);

			expect(vscode.CompletionItem).toHaveBeenCalledWith(
				'isactive',
				vscode.CompletionItemKind.Value
			);
		});

		it('should use Field kind for String type', () => {
			const attr = AttributeSuggestion.create('name', 'Name', 'String', false);

			AttributeSuggestionCompletionMapper.toCompletionItem(attr, 0);

			expect(vscode.CompletionItem).toHaveBeenCalledWith(
				'name',
				vscode.CompletionItemKind.Field
			);
		});

		it('should use Field kind for Integer type', () => {
			const attr = AttributeSuggestion.create('count', 'Count', 'Integer', false);

			AttributeSuggestionCompletionMapper.toCompletionItem(attr, 0);

			expect(vscode.CompletionItem).toHaveBeenCalledWith(
				'count',
				vscode.CompletionItemKind.Field
			);
		});

		it('should use Field kind for Decimal type', () => {
			const attr = AttributeSuggestion.create('rate', 'Rate', 'Decimal', false);

			AttributeSuggestionCompletionMapper.toCompletionItem(attr, 0);

			expect(vscode.CompletionItem).toHaveBeenCalledWith(
				'rate',
				vscode.CompletionItemKind.Field
			);
		});

		it('should use Field kind for Money type', () => {
			const attr = AttributeSuggestion.create('revenue', 'Revenue', 'Money', false);

			AttributeSuggestionCompletionMapper.toCompletionItem(attr, 0);

			expect(vscode.CompletionItem).toHaveBeenCalledWith(
				'revenue',
				vscode.CompletionItemKind.Field
			);
		});

		it('should use Field kind for DateTime type', () => {
			const attr = AttributeSuggestion.create('createdon', 'Created On', 'DateTime', false);

			AttributeSuggestionCompletionMapper.toCompletionItem(attr, 0);

			expect(vscode.CompletionItem).toHaveBeenCalledWith(
				'createdon',
				vscode.CompletionItemKind.Field
			);
		});

		it('should use Field kind for UniqueIdentifier type', () => {
			const attr = AttributeSuggestion.create('accountid', 'Account ID', 'UniqueIdentifier', false);

			AttributeSuggestionCompletionMapper.toCompletionItem(attr, 0);

			expect(vscode.CompletionItem).toHaveBeenCalledWith(
				'accountid',
				vscode.CompletionItemKind.Field
			);
		});

		it('should use Field kind for Memo type', () => {
			const attr = AttributeSuggestion.create('description', 'Description', 'Memo', false);

			AttributeSuggestionCompletionMapper.toCompletionItem(attr, 0);

			expect(vscode.CompletionItem).toHaveBeenCalledWith(
				'description',
				vscode.CompletionItemKind.Field
			);
		});

		it('should use Field kind for Other type', () => {
			const attr = AttributeSuggestion.create('custom', 'Custom', 'Other', false);

			AttributeSuggestionCompletionMapper.toCompletionItem(attr, 0);

			expect(vscode.CompletionItem).toHaveBeenCalledWith(
				'custom',
				vscode.CompletionItemKind.Field
			);
		});

		it('should format detail with display name and type', () => {
			const attr = AttributeSuggestion.create('accountnumber', 'Account Number', 'String', false);

			const result = AttributeSuggestionCompletionMapper.toCompletionItem(attr, 0);

			expect(result.detail).toBe('Account Number (String)');
		});
	});

	describe('toCompletionItems', () => {
		it('should map empty array', () => {
			const result = AttributeSuggestionCompletionMapper.toCompletionItems([]);

			expect(result).toEqual([]);
		});

		it('should map single attribute', () => {
			const attrs = [AttributeSuggestion.create('name', 'Name', 'String', false)];

			const result = AttributeSuggestionCompletionMapper.toCompletionItems(attrs);

			expect(result).toHaveLength(1);
			expect(result[0]?.label).toBe('name');
		});

		it('should map multiple attributes with sequential indices', () => {
			const attrs = [
				AttributeSuggestion.create('name', 'Name', 'String', false),
				AttributeSuggestion.create('accountid', 'Account ID', 'UniqueIdentifier', false),
				AttributeSuggestion.create('statuscode', 'Status', 'Picklist', false)
			];

			const result = AttributeSuggestionCompletionMapper.toCompletionItems(attrs);

			expect(result).toHaveLength(3);
			expect(result[0]?.sortText).toBe('00000');
			expect(result[1]?.sortText).toBe('00001');
			expect(result[2]?.sortText).toBe('00002');
		});

		it('should preserve attribute order', () => {
			const attrs = [
				AttributeSuggestion.create('zzz', 'ZZZ', 'String', false),
				AttributeSuggestion.create('aaa', 'AAA', 'String', false)
			];

			const result = AttributeSuggestionCompletionMapper.toCompletionItems(attrs);

			expect(result[0]?.label).toBe('zzz');
			expect(result[1]?.label).toBe('aaa');
		});

		it('should handle readonly array input', () => {
			const attrs: readonly AttributeSuggestion[] = [
				AttributeSuggestion.create('name', 'Name', 'String', false)
			];

			const result = AttributeSuggestionCompletionMapper.toCompletionItems(attrs);

			expect(result).toHaveLength(1);
		});
	});
});
