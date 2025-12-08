import * as vscode from 'vscode';

import type { FetchXmlElementSuggestion } from '../../domain/valueObjects/FetchXmlElementSuggestion';

/**
 * Presentation Mapper: FetchXML Element Suggestion → VS Code CompletionItem
 *
 * Maps domain FetchXmlElementSuggestion value objects to VS Code CompletionItem.
 * All presentation formatting logic belongs here, not in the domain entity.
 */
export class FetchXmlElementSuggestionCompletionMapper {
	/**
	 * Maps a FetchXmlElementSuggestion to a VS Code CompletionItem.
	 *
	 * @param element - The domain element suggestion
	 * @param sortIndex - Index for sort ordering in completion list
	 * @returns VS Code CompletionItem ready for display
	 */
	public static toCompletionItem(
		element: FetchXmlElementSuggestion,
		sortIndex: number
	): vscode.CompletionItem {
		const item = new vscode.CompletionItem(
			element.name,
			element.hasChildren ? vscode.CompletionItemKind.Module : vscode.CompletionItemKind.Property
		);

		item.detail = 'FetchXML Element';
		item.documentation = new vscode.MarkdownString(element.description);

		// Insert as XML tag with cursor inside
		if (element.hasChildren) {
			// Container elements: <element>|</element>
			item.insertText = new vscode.SnippetString(`${element.name}>$0</${element.name}>`);
		} else {
			// Leaf elements: <element |/>
			item.insertText = new vscode.SnippetString(`${element.name} $0/>`);
		}

		item.sortText = sortIndex.toString().padStart(5, '0');

		// Trigger attribute suggestions after inserting
		item.command = {
			command: 'editor.action.triggerSuggest',
			title: 'Trigger Suggest',
		};

		return item;
	}

	/**
	 * Maps an array of FetchXmlElementSuggestions to CompletionItems.
	 *
	 * @param elements - Array of domain element suggestions
	 * @returns Array of VS Code CompletionItems
	 */
	public static toCompletionItems(
		elements: readonly FetchXmlElementSuggestion[]
	): vscode.CompletionItem[] {
		return elements.map((element, index) =>
			FetchXmlElementSuggestionCompletionMapper.toCompletionItem(element, index)
		);
	}
}
