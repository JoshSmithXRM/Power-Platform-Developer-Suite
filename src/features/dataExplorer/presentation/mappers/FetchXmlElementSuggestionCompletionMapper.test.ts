/**
 * Unit tests for FetchXmlElementSuggestionCompletionMapper
 * Tests cover mapping domain FetchXmlElementSuggestion to VS Code CompletionItem.
 */

import * as vscode from 'vscode';

import { FetchXmlElementSuggestionCompletionMapper } from './FetchXmlElementSuggestionCompletionMapper';
import { FetchXmlElementSuggestion } from '../../domain/valueObjects/FetchXmlElementSuggestion';

// Mock vscode module
jest.mock('vscode', () => ({
	CompletionItem: jest.fn().mockImplementation((label: string, kind: number) => ({
		label,
		kind,
		detail: undefined,
		documentation: undefined,
		insertText: undefined,
		sortText: undefined,
		command: undefined
	})),
	CompletionItemKind: {
		Module: 8,
		Property: 9
	},
	MarkdownString: jest.fn().mockImplementation((value: string) => ({
		value
	})),
	SnippetString: jest.fn().mockImplementation((value: string) => ({
		value
	}))
}), { virtual: true });

describe('FetchXmlElementSuggestionCompletionMapper', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('toCompletionItem', () => {
		it('should map FetchXmlElementSuggestion to CompletionItem', () => {
			const element = FetchXmlElementSuggestion.create('entity', 'Primary entity to query', true);

			const result = FetchXmlElementSuggestionCompletionMapper.toCompletionItem(element, 0);

			expect(vscode.CompletionItem).toHaveBeenCalledWith('entity', vscode.CompletionItemKind.Module);
			expect(result.label).toBe('entity');
			expect(result.detail).toBe('FetchXML Element');
		});

		it('should use Module kind for container elements (hasChildren=true)', () => {
			const element = FetchXmlElementSuggestion.create('fetch', 'Root element', true);

			FetchXmlElementSuggestionCompletionMapper.toCompletionItem(element, 0);

			expect(vscode.CompletionItem).toHaveBeenCalledWith('fetch', vscode.CompletionItemKind.Module);
		});

		it('should use Property kind for leaf elements (hasChildren=false)', () => {
			const element = FetchXmlElementSuggestion.create('attribute', 'Column to retrieve', false);

			FetchXmlElementSuggestionCompletionMapper.toCompletionItem(element, 0);

			expect(vscode.CompletionItem).toHaveBeenCalledWith('attribute', vscode.CompletionItemKind.Property);
		});

		it('should set documentation from element description', () => {
			const element = FetchXmlElementSuggestion.create('filter', 'Filter conditions (AND/OR group)', true);

			const result = FetchXmlElementSuggestionCompletionMapper.toCompletionItem(element, 0);

			expect(vscode.MarkdownString).toHaveBeenCalledWith('Filter conditions (AND/OR group)');
			expect(result.documentation).toEqual({ value: 'Filter conditions (AND/OR group)' });
		});

		it('should create container snippet for elements with children', () => {
			const element = FetchXmlElementSuggestion.create('entity', 'Primary entity', true);

			const result = FetchXmlElementSuggestionCompletionMapper.toCompletionItem(element, 0);

			// Should create snippet: entity>$0</entity>
			expect(vscode.SnippetString).toHaveBeenCalledWith('entity>$0</entity>');
			expect(result.insertText).toEqual({ value: 'entity>$0</entity>' });
		});

		it('should create self-closing snippet for leaf elements', () => {
			const element = FetchXmlElementSuggestion.create('attribute', 'Column', false);

			const result = FetchXmlElementSuggestionCompletionMapper.toCompletionItem(element, 0);

			// Should create snippet: attribute $0/>
			expect(vscode.SnippetString).toHaveBeenCalledWith('attribute $0/>');
			expect(result.insertText).toEqual({ value: 'attribute $0/>' });
		});

		it('should set sortText with zero-padded index', () => {
			const element = FetchXmlElementSuggestion.create('entity', 'Entity', true);

			const result = FetchXmlElementSuggestionCompletionMapper.toCompletionItem(element, 42);

			expect(result.sortText).toBe('00042');
		});

		it('should set trigger suggest command', () => {
			const element = FetchXmlElementSuggestion.create('entity', 'Entity', true);

			const result = FetchXmlElementSuggestionCompletionMapper.toCompletionItem(element, 0);

			expect(result.command).toEqual({
				command: 'editor.action.triggerSuggest',
				title: 'Trigger Suggest'
			});
		});
	});

	describe('toCompletionItems', () => {
		it('should map empty array', () => {
			const result = FetchXmlElementSuggestionCompletionMapper.toCompletionItems([]);

			expect(result).toEqual([]);
		});

		it('should map single element', () => {
			const elements = [FetchXmlElementSuggestion.create('fetch', 'Root element', true)];

			const result = FetchXmlElementSuggestionCompletionMapper.toCompletionItems(elements);

			expect(result).toHaveLength(1);
			expect(result[0]?.label).toBe('fetch');
		});

		it('should map multiple elements with sequential indices', () => {
			const elements = [
				FetchXmlElementSuggestion.create('fetch', 'Root', true),
				FetchXmlElementSuggestion.create('entity', 'Entity', true),
				FetchXmlElementSuggestion.create('attribute', 'Attribute', false)
			];

			const result = FetchXmlElementSuggestionCompletionMapper.toCompletionItems(elements);

			expect(result).toHaveLength(3);
			expect(result[0]?.sortText).toBe('00000');
			expect(result[1]?.sortText).toBe('00001');
			expect(result[2]?.sortText).toBe('00002');
		});

		it('should preserve element order', () => {
			const elements = [
				FetchXmlElementSuggestion.create('order', 'Order', false),
				FetchXmlElementSuggestion.create('attribute', 'Attribute', false)
			];

			const result = FetchXmlElementSuggestionCompletionMapper.toCompletionItems(elements);

			expect(result[0]?.label).toBe('order');
			expect(result[1]?.label).toBe('attribute');
		});

		it('should map container and leaf elements correctly', () => {
			const elements = [
				FetchXmlElementSuggestion.create('filter', 'Filter', true),
				FetchXmlElementSuggestion.create('condition', 'Condition', false)
			];

			const result = FetchXmlElementSuggestionCompletionMapper.toCompletionItems(elements);

			expect(result).toHaveLength(2);
			// First should be Module (container)
			expect(vscode.CompletionItem).toHaveBeenNthCalledWith(1, 'filter', vscode.CompletionItemKind.Module);
			// Second should be Property (leaf)
			expect(vscode.CompletionItem).toHaveBeenNthCalledWith(2, 'condition', vscode.CompletionItemKind.Property);
		});

		it('should handle readonly array input', () => {
			const elements: readonly FetchXmlElementSuggestion[] = [
				FetchXmlElementSuggestion.create('fetch', 'Root', true)
			];

			const result = FetchXmlElementSuggestionCompletionMapper.toCompletionItems(elements);

			expect(result).toHaveLength(1);
		});
	});

	describe('integration with fromElementNames', () => {
		it('should correctly map elements from factory method', () => {
			const elements = FetchXmlElementSuggestion.fromElementNames(['fetch', 'entity', 'attribute']);

			const result = FetchXmlElementSuggestionCompletionMapper.toCompletionItems(elements);

			expect(result).toHaveLength(3);
			expect(result[0]?.label).toBe('fetch');
			expect(result[1]?.label).toBe('entity');
			expect(result[2]?.label).toBe('attribute');
		});

		it('should use correct snippets for known elements', () => {
			// 'fetch' and 'entity' have children, 'attribute' does not
			const elements = FetchXmlElementSuggestion.fromElementNames(['fetch', 'attribute']);

			const result = FetchXmlElementSuggestionCompletionMapper.toCompletionItems(elements);

			// fetch is container, attribute is leaf
			expect(result[0]?.insertText).toEqual({ value: 'fetch>$0</fetch>' });
			expect(result[1]?.insertText).toEqual({ value: 'attribute $0/>' });
		});
	});
});
