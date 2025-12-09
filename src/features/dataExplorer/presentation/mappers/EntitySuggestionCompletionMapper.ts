import * as vscode from 'vscode';

import type { EntitySuggestion } from '../../domain/valueObjects/EntitySuggestion';

/**
 * Presentation Mapper: Entity Suggestion → VS Code CompletionItem
 *
 * Maps domain EntitySuggestion value objects to VS Code CompletionItem.
 * All presentation formatting logic belongs here, not in the domain entity.
 */
export class EntitySuggestionCompletionMapper {
	/**
	 * Maps an EntitySuggestion to a VS Code CompletionItem.
	 *
	 * @param entity - The domain entity suggestion
	 * @param sortIndex - Index for sort ordering in completion list
	 * @returns VS Code CompletionItem ready for display
	 */
	public static toCompletionItem(
		entity: EntitySuggestion,
		sortIndex: number
	): vscode.CompletionItem {
		const item = new vscode.CompletionItem(
			entity.logicalName,
			vscode.CompletionItemKind.Class
		);

		item.detail = entity.displayName;
		item.documentation = new vscode.MarkdownString(
			entity.isCustomEntity ? 'Custom Entity' : 'System Entity'
		);
		item.insertText = entity.logicalName;
		item.sortText = sortIndex.toString().padStart(5, '0');

		// Allow VS Code to match on both logical name and display name
		// e.g., typing "account" matches "account" or "Account" display name
		item.filterText = `${entity.logicalName} ${entity.displayName}`;

		return item;
	}

	/**
	 * Maps an array of EntitySuggestions to CompletionItems.
	 *
	 * @param entities - Array of domain entity suggestions
	 * @returns Array of VS Code CompletionItems
	 */
	public static toCompletionItems(
		entities: readonly EntitySuggestion[]
	): vscode.CompletionItem[] {
		return entities.map((entity, index) =>
			EntitySuggestionCompletionMapper.toCompletionItem(entity, index)
		);
	}
}
