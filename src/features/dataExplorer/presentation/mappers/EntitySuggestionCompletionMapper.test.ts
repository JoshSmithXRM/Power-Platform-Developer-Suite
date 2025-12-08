/**
 * Unit tests for EntitySuggestionCompletionMapper
 * Tests cover mapping domain EntitySuggestion to VS Code CompletionItem.
 */

import * as vscode from 'vscode';

import { EntitySuggestionCompletionMapper } from './EntitySuggestionCompletionMapper';
import { EntitySuggestion } from '../../domain/valueObjects/EntitySuggestion';

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
		Class: 6
	},
	MarkdownString: jest.fn().mockImplementation((value: string) => ({
		value
	}))
}), { virtual: true });

describe('EntitySuggestionCompletionMapper', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('toCompletionItem', () => {
		it('should map EntitySuggestion to CompletionItem', () => {
			const entity = EntitySuggestion.create('account', 'Account', false);

			const result = EntitySuggestionCompletionMapper.toCompletionItem(entity, 0);

			expect(vscode.CompletionItem).toHaveBeenCalledWith('account', vscode.CompletionItemKind.Class);
			expect(result.label).toBe('account');
			expect(result.detail).toBe('Account');
			expect(result.insertText).toBe('account');
		});

		it('should set sortText with zero-padded index', () => {
			const entity = EntitySuggestion.create('account', 'Account', false);

			const result = EntitySuggestionCompletionMapper.toCompletionItem(entity, 123);

			expect(result.sortText).toBe('00123');
		});

		it('should show "System Entity" documentation for non-custom entities', () => {
			const entity = EntitySuggestion.create('account', 'Account', false);

			const result = EntitySuggestionCompletionMapper.toCompletionItem(entity, 0);

			expect(vscode.MarkdownString).toHaveBeenCalledWith('System Entity');
			expect(result.documentation).toEqual({ value: 'System Entity' });
		});

		it('should show "Custom Entity" documentation for custom entities', () => {
			const entity = EntitySuggestion.create('cr123_custom', 'Custom Entity', true);

			const result = EntitySuggestionCompletionMapper.toCompletionItem(entity, 0);

			expect(vscode.MarkdownString).toHaveBeenCalledWith('Custom Entity');
			expect(result.documentation).toEqual({ value: 'Custom Entity' });
		});

		it('should use logical name as label', () => {
			const entity = EntitySuggestion.create('systemuser', 'User', false);

			const result = EntitySuggestionCompletionMapper.toCompletionItem(entity, 0);

			expect(result.label).toBe('systemuser');
		});

		it('should use display name as detail', () => {
			const entity = EntitySuggestion.create('systemuser', 'User', false);

			const result = EntitySuggestionCompletionMapper.toCompletionItem(entity, 0);

			expect(result.detail).toBe('User');
		});

		it('should use logical name as insertText', () => {
			const entity = EntitySuggestion.create('systemuser', 'User', false);

			const result = EntitySuggestionCompletionMapper.toCompletionItem(entity, 0);

			expect(result.insertText).toBe('systemuser');
		});
	});

	describe('toCompletionItems', () => {
		it('should map empty array', () => {
			const result = EntitySuggestionCompletionMapper.toCompletionItems([]);

			expect(result).toEqual([]);
		});

		it('should map single entity', () => {
			const entities = [EntitySuggestion.create('account', 'Account', false)];

			const result = EntitySuggestionCompletionMapper.toCompletionItems(entities);

			expect(result).toHaveLength(1);
			expect(result[0]?.label).toBe('account');
		});

		it('should map multiple entities with sequential indices', () => {
			const entities = [
				EntitySuggestion.create('account', 'Account', false),
				EntitySuggestion.create('contact', 'Contact', false),
				EntitySuggestion.create('lead', 'Lead', false)
			];

			const result = EntitySuggestionCompletionMapper.toCompletionItems(entities);

			expect(result).toHaveLength(3);
			expect(result[0]?.sortText).toBe('00000');
			expect(result[1]?.sortText).toBe('00001');
			expect(result[2]?.sortText).toBe('00002');
		});

		it('should preserve entity order', () => {
			const entities = [
				EntitySuggestion.create('zzz_custom', 'ZZZ Custom', true),
				EntitySuggestion.create('account', 'Account', false)
			];

			const result = EntitySuggestionCompletionMapper.toCompletionItems(entities);

			expect(result[0]?.label).toBe('zzz_custom');
			expect(result[1]?.label).toBe('account');
		});

		it('should map custom and system entities correctly', () => {
			const entities = [
				EntitySuggestion.create('account', 'Account', false),
				EntitySuggestion.create('cr123_invoice', 'Invoice', true)
			];

			const result = EntitySuggestionCompletionMapper.toCompletionItems(entities);

			expect(result[0]?.documentation).toEqual({ value: 'System Entity' });
			expect(result[1]?.documentation).toEqual({ value: 'Custom Entity' });
		});

		it('should handle readonly array input', () => {
			const entities: readonly EntitySuggestion[] = [
				EntitySuggestion.create('account', 'Account', false)
			];

			const result = EntitySuggestionCompletionMapper.toCompletionItems(entities);

			expect(result).toHaveLength(1);
		});
	});
});
