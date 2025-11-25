import type { ISection } from '../../../../shared/infrastructure/ui/sections/ISection';
import { SectionPosition } from '../../../../shared/infrastructure/ui/types/SectionPosition';
import type { SectionRenderData } from '../../../../shared/infrastructure/ui/types/SectionRenderData';
import { renderQueryEditorSection } from '../views/queryEditorView';

/**
 * Section: Query Editor
 *
 * Displays SQL editor with FetchXML preview for the Data Explorer panel.
 * Positioned in the main content area.
 */
export class QueryEditorSection implements ISection {
	public readonly position = SectionPosition.Main;

	/**
	 * Renders the Query Editor section.
	 * Extracts SQL and FetchXML from customData.
	 *
	 * @param data - Section render data with customData containing sql, fetchXml, error info
	 * @returns HTML string for the query editor section
	 */
	public render(data: SectionRenderData): string {
		const customData = data.customData || {};

		const sql = (customData['sql'] as string) || '';
		const fetchXml = (customData['fetchXml'] as string) || '';
		const errorMessage = customData['errorMessage'] as string | undefined;
		const errorPosition = customData['errorPosition'] as
			| { line: number; column: number }
			| undefined;

		return renderQueryEditorSection({
			sql,
			fetchXml,
			errorMessage,
			errorPosition,
		});
	}
}
