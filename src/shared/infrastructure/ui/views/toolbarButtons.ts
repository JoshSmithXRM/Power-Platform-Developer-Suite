/**
 * Toolbar button rendering utilities for DataTablePanel.
 * Provides config-driven toolbar button injection.
 */

import type { ToolbarButtonConfig } from '../DataTablePanel';

/**
 * Renders JavaScript for generic toolbar buttons.
 * Supports multiple buttons with configurable position and commands.
 *
 * @param buttons - Array of button configurations
 * @returns JavaScript code to inject buttons into toolbar
 */
export function renderToolbarButtons(buttons: ReadonlyArray<ToolbarButtonConfig>): string {
	if (buttons.length === 0) {
		return '';
	}

	const renderButtonCode = (button: ToolbarButtonConfig): string => {
		const position = button.position || 'left';
		const toolbarSelector = position === 'left' ? '.toolbar-left' : '.toolbar-right';

		return `
			// Add ${button.label} button
			const toolbar_${button.id} = document.querySelector('${toolbarSelector}');
			if (toolbar_${button.id} && !document.getElementById('${button.id}')) {
				const btn_${button.id} = document.createElement('button');
				btn_${button.id}.id = '${button.id}';
				btn_${button.id}.textContent = '${button.label}';
				btn_${button.id}.addEventListener('click', () => {
					vscode.postMessage({ command: '${button.command}' });
				});
				toolbar_${button.id}.appendChild(btn_${button.id});
			}
		`;
	};

	return buttons.map(renderButtonCode).join('\n');
}
