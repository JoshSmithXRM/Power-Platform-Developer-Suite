import * as vscode from 'vscode';

import type { SqlContextDetector } from '../../domain/services/SqlContextDetector';
import type { GetEntitySuggestionsUseCase } from '../../application/useCases/GetEntitySuggestionsUseCase';
import type { GetAttributeSuggestionsUseCase } from '../../application/useCases/GetAttributeSuggestionsUseCase';
import type { IntelliSenseContextService } from '../../application/services/IntelliSenseContextService';
import { EntitySuggestionCompletionMapper } from '../mappers/EntitySuggestionCompletionMapper';
import { AttributeSuggestionCompletionMapper } from '../mappers/AttributeSuggestionCompletionMapper';

/**
 * VS Code Completion Provider for Dataverse SQL queries.
 *
 * Provides context-aware completions for SQL in both:
 * - Regular SQL files (environment from Data Explorer panel)
 * - Notebook cells (environment from notebook metadata)
 *
 * The metadata cache is shared by environment ID, so multiple notebooks/panels
 * using the same environment share cached entity/attribute data.
 */
export class DataverseCompletionProvider implements vscode.CompletionItemProvider {
	constructor(
		private readonly contextService: IntelliSenseContextService,
		private readonly contextDetector: SqlContextDetector,
		private readonly getEntitySuggestions: GetEntitySuggestionsUseCase,
		private readonly getAttributeSuggestions: GetAttributeSuggestionsUseCase
	) {}

	// =========================================================================
	// Document-Aware Environment Resolution
	// =========================================================================

	/**
	 * Resolves the environment ID based on the document type.
	 *
	 * - Notebook cells: Read from notebook metadata
	 * - Regular SQL files: Read from panel's context service
	 *
	 * This allows notebooks and panels to use different environments
	 * while sharing cached metadata when environments match.
	 */
	private resolveEnvironmentId(document: vscode.TextDocument): string | null {
		// Check if this is a notebook cell
		if (document.uri.scheme === 'vscode-notebook-cell') {
			return this.getNotebookEnvironment(document);
		}

		// Regular SQL file - use panel's context service
		return this.contextService.getActiveEnvironment();
	}

	/**
	 * Gets the environment ID from the notebook that contains this cell.
	 */
	private getNotebookEnvironment(document: vscode.TextDocument): string | null {
		// Find the notebook containing this cell
		for (const notebook of vscode.workspace.notebookDocuments) {
			const containsCell = notebook.getCells().some(
				cell => cell.document.uri.toString() === document.uri.toString()
			);

			if (containsCell) {
				// Return environment from notebook metadata
				const metadata = notebook.metadata;
				const envId = metadata?.['environmentId'];
				if (typeof envId === 'string' && envId.length > 0) {
					return envId;
				}
				return null;
			}
		}

		return null;
	}

	public async provideCompletionItems(
		document: vscode.TextDocument,
		position: vscode.Position,
		token: vscode.CancellationToken,
		_context: vscode.CompletionContext
	): Promise<vscode.CompletionItem[] | null> {
		// Check for cancellation early
		if (token.isCancellationRequested) {
			return null;
		}

		const text = document.getText();
		const offset = document.offsetAt(position);
		const wordRange = document.getWordRangeAtPosition(position);
		const currentWord = wordRange !== undefined ? document.getText(wordRange) : '';

		const context = this.contextDetector.detectContext(text, offset);

		// Keywords don't require environment - always provide them
		if (context.kind === 'keyword') {
			return this.getKeywordCompletions(context.suggestedKeywords, currentWord);
		}

		// Entity and attribute completions require an environment
		const environmentId = this.resolveEnvironmentId(document);
		if (environmentId === null) {
			// No environment - can't provide entity/attribute completions
			return null;
		}

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

		return EntitySuggestionCompletionMapper.toCompletionItems(suggestions);
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

		return AttributeSuggestionCompletionMapper.toCompletionItems(suggestions);
	}

	/**
	 * Creates completion items for the suggested keywords.
	 * Keywords are filtered by prefix to support typing partial keywords.
	 */
	private getKeywordCompletions(
		suggestedKeywords: readonly string[],
		prefix: string
	): vscode.CompletionItem[] {
		const lowerPrefix = prefix.toLowerCase();

		return suggestedKeywords
			.filter(kw => kw.toLowerCase().startsWith(lowerPrefix))
			.map((keyword, index) => {
				const item = new vscode.CompletionItem(keyword, vscode.CompletionItemKind.Keyword);
				item.sortText = index.toString().padStart(5, '0');
				return item;
			});
	}
}
