/**
 * Service for opening content in VS Code editors.
 * Infrastructure layer service for managing editor interactions.
 */
export interface IEditorService {
	/**
	 * Opens XML content in a new untitled VS Code editor with XML syntax highlighting.
	 * @param xmlContent - The XML content to display
	 * @returns Promise that resolves when editor is opened
	 */
	openXmlInNewTab(xmlContent: string): Promise<void>;
}
