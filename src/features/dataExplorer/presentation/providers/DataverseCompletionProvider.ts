import * as vscode from 'vscode';

import type { SqlContextDetector } from '../../domain/services/SqlContextDetector';
import type { GetEntitySuggestionsUseCase } from '../../application/useCases/GetEntitySuggestionsUseCase';
import type { GetAttributeSuggestionsUseCase } from '../../application/useCases/GetAttributeSuggestionsUseCase';
import type { IntelliSenseContextService } from '../../application/services/IntelliSenseContextService';

/**
 * VS Code Completion Provider for Dataverse SQL queries.
 *
 * Provides context-aware completions for ANY SQL file when an
 * environment is active in the Data Explorer panel.
 *
 * Works with all SQL files and gets environment from IntelliSenseContextService.
 */
export class DataverseCompletionProvider implements vscode.CompletionItemProvider {
	constructor(
		private readonly contextService: IntelliSenseContextService,
		private readonly contextDetector: SqlContextDetector,
		private readonly getEntitySuggestions: GetEntitySuggestionsUseCase,
		private readonly getAttributeSuggestions: GetAttributeSuggestionsUseCase
	) {}

	public async provideCompletionItems(
		document: vscode.TextDocument,
		position: vscode.Position,
		token: vscode.CancellationToken,
		_context: vscode.CompletionContext
	): Promise<vscode.CompletionItem[] | null> {
		// Only provide completions if we have an active environment
		const environmentId = this.contextService.getActiveEnvironment();
		if (environmentId === null) {
			// No environment selected - don't provide Dataverse completions
			// This allows other SQL completion providers to work
			return null;
		}

		// Check for cancellation
		if (token.isCancellationRequested) {
			return null;
		}

		const text = document.getText();
		const offset = document.offsetAt(position);
		const wordRange = document.getWordRangeAtPosition(position);
		const currentWord = wordRange !== undefined ? document.getText(wordRange) : '';

		const context = this.contextDetector.detectContext(text, offset);

		switch (context.kind) {
			case 'entity':
				return await this.getEntityCompletions(environmentId, currentWord, token);

			case 'attribute':
				return await this.getAttributeCompletions(
					environmentId,
					context.entityName,
					currentWord,
					token
				);

			case 'keyword':
				return this.getKeywordCompletions(currentWord);

			default:
				return null;
		}
	}

	private async getEntityCompletions(
		environmentId: string,
		prefix: string,
		token: vscode.CancellationToken
	): Promise<vscode.CompletionItem[]> {
		const suggestions = await this.getEntitySuggestions.execute(environmentId, prefix);

		if (token.isCancellationRequested) {
			return [];
		}

		return suggestions.map((entity, index) => {
			const item = new vscode.CompletionItem(
				entity.getDisplayLabel(),
				vscode.CompletionItemKind.Class
			);
			item.detail = entity.getDetail();
			item.documentation = new vscode.MarkdownString(entity.getDocumentation());
			item.insertText = entity.getInsertText();
			item.sortText = index.toString().padStart(5, '0');
			return item;
		});
	}

	private async getAttributeCompletions(
		environmentId: string,
		entityName: string,
		prefix: string,
		token: vscode.CancellationToken
	): Promise<vscode.CompletionItem[]> {
		const suggestions = await this.getAttributeSuggestions.execute(
			environmentId,
			entityName,
			prefix
		);

		if (token.isCancellationRequested) {
			return [];
		}

		return suggestions.map((attr, index) => {
			const item = new vscode.CompletionItem(
				attr.getDisplayLabel(),
				this.getCompletionKindForType(attr.attributeType)
			);
			item.detail = attr.getDetail();
			item.insertText = attr.getInsertText();
			item.sortText = index.toString().padStart(5, '0');
			return item;
		});
	}

	private getKeywordCompletions(prefix: string): vscode.CompletionItem[] {
		const keywords = this.contextDetector.getKeywords();
		const lowerPrefix = prefix.toLowerCase();

		return keywords
			.filter(kw => kw.toLowerCase().startsWith(lowerPrefix))
			.map((keyword, index) => {
				const item = new vscode.CompletionItem(keyword, vscode.CompletionItemKind.Keyword);
				item.sortText = index.toString().padStart(5, '0');
				return item;
			});
	}

	private getCompletionKindForType(attributeType: string): vscode.CompletionItemKind {
		switch (attributeType) {
			case 'Lookup':
				return vscode.CompletionItemKind.Reference;
			case 'Picklist':
				return vscode.CompletionItemKind.Enum;
			case 'Boolean':
				return vscode.CompletionItemKind.Value;
			default:
				return vscode.CompletionItemKind.Field;
		}
	}
}
