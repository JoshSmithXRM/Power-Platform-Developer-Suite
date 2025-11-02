/**
 * Service for opening content in VS Code editors.
 * Infrastructure layer service for managing editor interactions.
 */
export interface IEditorService {
	/**
	 * Opens XML content in a new untitled VS Code editor with XML syntax highlighting.
	 * @param xmlContent - The XML content to display
	 * @param title - Optional title for the editor tab (defaults to "Import Log")
	 * @returns Promise that resolves when editor is opened
	 */
	openXmlInNewTab(xmlContent: string, title?: string): Promise<void>;
}
