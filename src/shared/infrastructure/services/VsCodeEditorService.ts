import * as vscode from 'vscode';

import { IEditorService } from '../interfaces/IEditorService';
import { ILogger } from '../../../infrastructure/logging/ILogger';

/**
 * VS Code implementation of IEditorService.
 * Opens content in VS Code editor tabs with appropriate syntax highlighting.
 */
export class VsCodeEditorService implements IEditorService {
	constructor(private readonly logger: ILogger) {}

	/**
	 * Opens XML content in a new untitled VS Code editor with XML syntax highlighting.
	 */
	async openXmlInNewTab(xmlContent: string, _title: string = 'Import Log'): Promise<void> {
		try {
			this.logger.debug('Opening XML in new editor tab', { contentLength: xmlContent.length });

			// Format XML before opening
			const formattedXml = this.formatXml(xmlContent);

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

	/**
	 * Formats XML with proper indentation.
	 */
	private formatXml(xml: string): string {
		try {
			const PADDING = '  ';
			// Insert line breaks between tags to enable proper indentation
			const reg = /(>)(<)(\/*)/g;
			const formatted = xml.replace(reg, '$1\n$2$3');

			let pad = 0;
			const lines = formatted.split('\n');
			const formattedLines: string[] = [];

			for (const line of lines) {
				let indent = 0;
				const trimmedLine = line.trim();

				if (trimmedLine.match(/.+<\/\w[^>]*>$/)) {
					// Single line element (e.g., <tag>content</tag>)
					indent = 0;
				} else if (trimmedLine.match(/^<\/\w/)) {
					// Closing tag
					if (pad > 0) {
						pad -= 1;
					}
				} else if (trimmedLine.match(/^<\w[^>]*[^/]>.*$/)) {
					// Opening tag
					indent = 1;
				}

				formattedLines.push(PADDING.repeat(pad) + trimmedLine);
				pad += indent;
			}

			return formattedLines.join('\n');
		} catch (error) {
			this.logger.warn('Failed to format XML, returning original', error as Error);
			return xml;
		}
	}
}
