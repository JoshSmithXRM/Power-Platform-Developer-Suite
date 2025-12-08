import * as vscode from 'vscode';

import type { FetchXmlContextDetector } from '../../domain/services/FetchXmlContextDetector';
import type { GetEntitySuggestionsUseCase } from '../../application/useCases/GetEntitySuggestionsUseCase';
import type { GetAttributeSuggestionsUseCase } from '../../application/useCases/GetAttributeSuggestionsUseCase';
import type { GetFetchXmlElementSuggestionsUseCase } from '../../application/useCases/GetFetchXmlElementSuggestionsUseCase';
import type { GetOperatorSuggestionsUseCase } from '../../application/useCases/GetOperatorSuggestionsUseCase';
import type { IntelliSenseContextService } from '../../application/services/IntelliSenseContextService';
import { FetchXmlElementSuggestionCompletionMapper } from '../mappers/FetchXmlElementSuggestionCompletionMapper';
import { OperatorSuggestionCompletionMapper } from '../mappers/OperatorSuggestionCompletionMapper';
import { EntitySuggestionCompletionMapper } from '../mappers/EntitySuggestionCompletionMapper';
import { AttributeSuggestionCompletionMapper } from '../mappers/AttributeSuggestionCompletionMapper';

/**
 * VS Code Completion Provider for FetchXML queries.
 *
 * Provides context-aware completions for FetchXML in both:
 * - Standalone .fetchxml files
 * - Notebook cells with XML/FetchXML language
 *
 * Completions include:
 * - Element names (based on parent element hierarchy)
 * - Attribute names (based on current element)
 * - Attribute values (entity names, attribute names, operators, etc.)
 */
export class FetchXmlCompletionProvider implements vscode.CompletionItemProvider {
	constructor(
		private readonly contextService: IntelliSenseContextService,
		private readonly contextDetector: FetchXmlContextDetector,
		private readonly getEntitySuggestions: GetEntitySuggestionsUseCase,
		private readonly getAttributeSuggestions: GetAttributeSuggestionsUseCase,
		private readonly getElementSuggestions: GetFetchXmlElementSuggestionsUseCase,
		private readonly getOperatorSuggestions: GetOperatorSuggestionsUseCase
	) {}

	// =========================================================================
	// Document-Aware Environment Resolution
	// =========================================================================

	/**
	 * Resolves the environment ID based on the document type.
	 */
	private resolveEnvironmentId(document: vscode.TextDocument): string | null {
		// Check if this is a notebook cell
		if (document.uri.scheme === 'vscode-notebook-cell') {
			return this.getNotebookEnvironment(document);
		}

		// Regular file - use panel's context service
		return this.contextService.getActiveEnvironment();
	}

	/**
	 * Gets the environment ID from the notebook that contains this cell.
	 */
	private getNotebookEnvironment(document: vscode.TextDocument): string | null {
		for (const notebook of vscode.workspace.notebookDocuments) {
			const containsCell = notebook.getCells().some(
				cell => cell.document.uri.toString() === document.uri.toString()
			);

			if (containsCell) {
				const metadata = notebook.metadata as { environmentId?: unknown } | undefined;
				const envId = metadata?.environmentId;
				if (typeof envId === 'string' && envId.length > 0) {
					return envId;
				}
				return null;
			}
		}

		return null;
	}

	// =========================================================================
	// Completion Provider Implementation
	// =========================================================================

	public async provideCompletionItems(
		document: vscode.TextDocument,
		position: vscode.Position,
		token: vscode.CancellationToken,
		_context: vscode.CompletionContext
	): Promise<vscode.CompletionItem[] | null> {
		if (token.isCancellationRequested) {
			return null;
		}

		const text = document.getText();
		const offset = document.offsetAt(position);
		const wordRange = document.getWordRangeAtPosition(position, /[\w-]+/);
		const currentWord = wordRange !== undefined ? document.getText(wordRange) : '';

		const context = this.contextDetector.detectContext(text, offset);

		switch (context.kind) {
			case 'element':
				return this.getElementCompletions(context.suggestedElements, currentWord);

			case 'attribute-name':
				return this.getAttributeNameCompletions(context.suggestedAttributes, currentWord);

			case 'attribute-value':
				return await this.getAttributeValueCompletions(
					document,
					context.element,
					context.attribute,
					context.entityContext,
					currentWord,
					token
				);

			default:
				return null;
		}
	}

	// =========================================================================
	// Element Completions
	// =========================================================================

	private getElementCompletions(
		suggestedElements: readonly string[],
		prefix: string
	): vscode.CompletionItem[] {
		const suggestions = this.getElementSuggestions.execute(suggestedElements, prefix);
		return FetchXmlElementSuggestionCompletionMapper.toCompletionItems(suggestions);
	}

	// =========================================================================
	// Attribute Name Completions
	// =========================================================================

	private getAttributeNameCompletions(
		suggestedAttributes: readonly string[],
		prefix: string
	): vscode.CompletionItem[] {
		const lowerPrefix = prefix.toLowerCase();

		return suggestedAttributes
			.filter(attr => attr.toLowerCase().startsWith(lowerPrefix))
			.map((attr, index) => {
				const item = new vscode.CompletionItem(attr, vscode.CompletionItemKind.Property);
				item.insertText = new vscode.SnippetString(`${attr}="$1"`);
				item.sortText = index.toString().padStart(5, '0');
				item.command = {
					command: 'editor.action.triggerSuggest',
					title: 'Trigger Suggest',
				};
				return item;
			});
	}

	// =========================================================================
	// Attribute Value Completions
	// =========================================================================

	private async getAttributeValueCompletions(
		document: vscode.TextDocument,
		element: string,
		attribute: string,
		entityContext: string | null,
		prefix: string,
		token: vscode.CancellationToken
	): Promise<vscode.CompletionItem[]> {
		const lowerElement = element.toLowerCase();
		const lowerAttribute = attribute.toLowerCase();

		// Entity name attribute - suggest entity names from metadata
		if (this.isEntityNameAttribute(lowerElement, lowerAttribute)) {
			return await this.getEntityNameCompletions(document, prefix, token);
		}

		// Attribute name attribute - suggest attribute names for current entity
		if (this.isAttributeNameAttribute(lowerElement, lowerAttribute)) {
			return await this.getAttributeNameValueCompletions(
				document,
				entityContext,
				prefix,
				token
			);
		}

		// Operator attribute - suggest operators
		if (lowerElement === 'condition' && lowerAttribute === 'operator') {
			return this.getOperatorCompletions(prefix);
		}

		// Filter type attribute
		if (lowerElement === 'filter' && lowerAttribute === 'type') {
			return this.getStaticValueCompletions(
				this.contextDetector.getFilterTypes(),
				prefix,
				'Filter type'
			);
		}

		// Link type attribute
		if (lowerElement === 'link-entity' && lowerAttribute === 'link-type') {
			return this.getStaticValueCompletions(
				this.contextDetector.getLinkTypes(),
				prefix,
				'Join type'
			);
		}

		// Boolean attributes
		if (this.isBooleanAttribute(lowerAttribute)) {
			return this.getStaticValueCompletions(
				this.contextDetector.getBooleanValues(),
				prefix,
				'Boolean value'
			);
		}

		// Aggregate attribute
		if (lowerAttribute === 'aggregate') {
			return this.getStaticValueCompletions(
				this.contextDetector.getAggregateFunctions(),
				prefix,
				'Aggregate function'
			);
		}

		// Date grouping attribute
		if (lowerAttribute === 'dategrouping') {
			return this.getStaticValueCompletions(
				this.contextDetector.getDateGroupings(),
				prefix,
				'Date grouping'
			);
		}

		return [];
	}

	/**
	 * Checks if the attribute expects an entity logical name.
	 */
	private isEntityNameAttribute(element: string, attribute: string): boolean {
		return (
			(element === 'entity' && attribute === 'name') ||
			(element === 'link-entity' && attribute === 'name')
		);
	}

	/**
	 * Checks if the attribute expects an attribute logical name.
	 */
	private isAttributeNameAttribute(element: string, attribute: string): boolean {
		return (
			(element === 'attribute' && attribute === 'name') ||
			(element === 'order' && attribute === 'attribute') ||
			(element === 'condition' && attribute === 'attribute') ||
			(element === 'link-entity' && (attribute === 'from' || attribute === 'to'))
		);
	}

	/**
	 * Checks if the attribute is a boolean type.
	 */
	private isBooleanAttribute(attribute: string): boolean {
		return [
			'distinct',
			'aggregate',
			'no-lock',
			'returntotalrecordcount',
			'descending',
			'groupby',
			'visible',
			'intersect',
			'enableprefiltering',
			'isquickfindfields',
		].includes(attribute);
	}

	/**
	 * Gets entity name suggestions from metadata.
	 */
	private async getEntityNameCompletions(
		document: vscode.TextDocument,
		prefix: string,
		token: vscode.CancellationToken
	): Promise<vscode.CompletionItem[]> {
		const environmentId = this.resolveEnvironmentId(document);
		if (environmentId === null) {
			return [];
		}

		const suggestions = await this.getEntitySuggestions.execute(environmentId, prefix);

		if (token.isCancellationRequested) {
			return [];
		}

		return EntitySuggestionCompletionMapper.toCompletionItems(suggestions);
	}

	/**
	 * Gets attribute name suggestions for the current entity context.
	 */
	private async getAttributeNameValueCompletions(
		document: vscode.TextDocument,
		entityContext: string | null,
		prefix: string,
		token: vscode.CancellationToken
	): Promise<vscode.CompletionItem[]> {
		if (entityContext === null) {
			return [];
		}

		const environmentId = this.resolveEnvironmentId(document);
		if (environmentId === null) {
			return [];
		}

		const suggestions = await this.getAttributeSuggestions.execute(
			environmentId,
			entityContext,
			prefix
		);

		if (token.isCancellationRequested) {
			return [];
		}

		return AttributeSuggestionCompletionMapper.toCompletionItems(suggestions);
	}

	/**
	 * Gets operator suggestions.
	 */
	private getOperatorCompletions(prefix: string): vscode.CompletionItem[] {
		const operators = this.contextDetector.getOperators();
		const suggestions = this.getOperatorSuggestions.execute(operators, prefix);
		return OperatorSuggestionCompletionMapper.toCompletionItems(suggestions);
	}

	/**
	 * Gets completions for static value lists (filter types, link types, etc.).
	 */
	private getStaticValueCompletions(
		values: readonly string[],
		prefix: string,
		description: string
	): vscode.CompletionItem[] {
		const lowerPrefix = prefix.toLowerCase();

		return values
			.filter(value => value.toLowerCase().startsWith(lowerPrefix))
			.map((value, index) => {
				const item = new vscode.CompletionItem(value, vscode.CompletionItemKind.EnumMember);
				item.detail = description;
				item.sortText = index.toString().padStart(5, '0');
				return item;
			});
	}
}
