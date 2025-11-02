import * as vscode from 'vscode';

import { IEditorService } from '../interfaces/IEditorService';
import { ILogger } from '../../../infrastructure/logging/ILogger';
import { XmlFormatter } from '../formatters/XmlFormatter';

/**
 * VS Code implementation of IEditorService.
 * Opens content in VS Code editor tabs with appropriate syntax highlighting.
 */
export class VsCodeEditorService implements IEditorService {
	constructor(
		private readonly logger: ILogger,
		private readonly xmlFormatter: XmlFormatter
	) {}

	/**
	 * Opens XML content in a new untitled VS Code editor with XML syntax highlighting.
	 * Delegates formatting to XmlFormatter domain service before displaying.
	 * @param xmlContent - Raw XML string to display
	 * @throws Rethrows errors after logging
	 */
	async openXmlInNewTab(xmlContent: string): Promise<void> {
		try {
			this.logger.debug('Opening XML in new editor tab', { contentLength: xmlContent.length });

			// Delegate formatting to domain service
			const formattedXml = this.xmlFormatter.format(xmlContent);

			// Create untitled document with XML language mode
			const document = await vscode.workspace.openTextDocument({
				content: formattedXml,
				language: 'xml'
			});

			// Show document in editor
			await vscode.window.showTextDocument(document, {
				preview: false,
				viewColumn: vscode.ViewColumn.Active
			});

			this.logger.debug('Successfully opened and formatted XML in editor');
		} catch (error) {
			this.logger.error('Failed to open XML in editor', error as Error);
			throw error;
		}
	}
}
