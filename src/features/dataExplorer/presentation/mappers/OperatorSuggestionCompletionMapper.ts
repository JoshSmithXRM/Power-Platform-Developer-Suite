import * as vscode from 'vscode';

import type { OperatorSuggestion, OperatorCategory } from '../../domain/valueObjects/OperatorSuggestion';

/**
 * Presentation Mapper: Operator Suggestion → VS Code CompletionItem
 *
 * Maps domain OperatorSuggestion value objects to VS Code CompletionItem.
 * All presentation formatting logic belongs here, not in the domain entity.
 */
export class OperatorSuggestionCompletionMapper {
	/**
	 * Maps category to a sort prefix to group operators by category.
	 */
	private static readonly CATEGORY_SORT_ORDER: Record<OperatorCategory, string> = {
		comparison: '1',
		string: '2',
		null: '3',
		collection: '4',
		date: '5',
		user: '6',
		hierarchy: '7',
		other: '8',
	};

	/**
	 * Maps an OperatorSuggestion to a VS Code CompletionItem.
	 *
	 * @param operator - The domain operator suggestion
	 * @param sortIndex - Index for sort ordering within category
	 * @returns VS Code CompletionItem ready for display
	 */
	public static toCompletionItem(
		operator: OperatorSuggestion,
		sortIndex: number
	): vscode.CompletionItem {
		const item = new vscode.CompletionItem(
			operator.name,
			vscode.CompletionItemKind.Operator
		);

		item.detail = operator.description;
		item.documentation = new vscode.MarkdownString(
			`**${operator.name}**\n\n${operator.description}\n\n*Category: ${operator.category}*`
		);
		item.insertText = operator.name;

		// Sort by category first, then by index within category
		const categoryPrefix = OperatorSuggestionCompletionMapper.CATEGORY_SORT_ORDER[operator.category];
		item.sortText = `${categoryPrefix}-${sortIndex.toString().padStart(5, '0')}`;

		return item;
	}

	/**
	 * Maps an array of OperatorSuggestions to CompletionItems.
	 *
	 * @param operators - Array of domain operator suggestions
	 * @returns Array of VS Code CompletionItems
	 */
	public static toCompletionItems(
		operators: readonly OperatorSuggestion[]
	): vscode.CompletionItem[] {
		return operators.map((operator, index) =>
			OperatorSuggestionCompletionMapper.toCompletionItem(operator, index)
		);
	}
}
