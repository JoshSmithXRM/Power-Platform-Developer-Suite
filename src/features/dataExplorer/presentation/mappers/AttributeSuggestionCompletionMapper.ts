import * as vscode from 'vscode';

import type { AttributeSuggestion } from '../../domain/valueObjects/AttributeSuggestion';

/**
 * Presentation Mapper: Attribute Suggestion → VS Code CompletionItem
 *
 * Maps domain AttributeSuggestion value objects to VS Code CompletionItem.
 * All presentation formatting logic belongs here, not in the domain entity.
 */
export class AttributeSuggestionCompletionMapper {
	/**
	 * Maps an AttributeSuggestion to a VS Code CompletionItem.
	 *
	 * @param attr - The domain attribute suggestion
	 * @param sortIndex - Index for sort ordering in completion list
	 * @returns VS Code CompletionItem ready for display
	 */
	public static toCompletionItem(
		attr: AttributeSuggestion,
		sortIndex: number
	): vscode.CompletionItem {
		const item = new vscode.CompletionItem(
			attr.logicalName,
			AttributeSuggestionCompletionMapper.getCompletionKindForType(attr.attributeType)
		);

		item.detail = `${attr.displayName} (${attr.attributeType})`;
		item.insertText = attr.logicalName;
		item.sortText = sortIndex.toString().padStart(5, '0');

		// Allow VS Code to match on both logical name and display name
		item.filterText = `${attr.logicalName} ${attr.displayName}`;

		return item;
	}

	/**
	 * Maps an array of AttributeSuggestions to CompletionItems.
	 *
	 * @param attributes - Array of domain attribute suggestions
	 * @returns Array of VS Code CompletionItems
	 */
	public static toCompletionItems(
		attributes: readonly AttributeSuggestion[]
	): vscode.CompletionItem[] {
		return attributes.map((attr, index) =>
			AttributeSuggestionCompletionMapper.toCompletionItem(attr, index)
		);
	}

	/**
	 * Maps Dataverse attribute types to VS Code CompletionItemKind.
	 */
	private static getCompletionKindForType(attributeType: string): vscode.CompletionItemKind {
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
