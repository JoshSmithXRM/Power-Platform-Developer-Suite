import type { ISection } from '../../../../shared/infrastructure/ui/sections/ISection';
import { SectionPosition } from '../../../../shared/infrastructure/ui/types/SectionPosition';
import type { SectionRenderData } from '../../../../shared/infrastructure/ui/types/SectionRenderData';
import {
	renderQueryEditorSection,
	type QueryMode,
	type TranspilationWarning,
} from '../views/queryEditorView';

/**
 * Section: Query Editor
 *
 * Displays SQL/FetchXML editor with preview for the Data Explorer panel.
 * Supports mode toggle between SQL and FetchXML editing.
 * Positioned in the main content area.
 */
export class QueryEditorSection implements ISection {
	public readonly position = SectionPosition.Main;

	/**
	 * Renders the Query Editor section.
	 * Extracts SQL, FetchXML, and query mode from customData.
	 *
	 * @param data - Section render data with customData containing sql, fetchXml, queryMode, error info
	 * @returns HTML string for the query editor section
	 */
	public render(data: SectionRenderData): string {
		const customData = data.customData || {};

		const sql = (customData['sql'] as string) || '';
		const fetchXml = (customData['fetchXml'] as string) || '';
		const queryMode = (customData['queryMode'] as QueryMode) || 'sql';
		const errorMessage = customData['errorMessage'] as string | undefined;
		const errorPosition = customData['errorPosition'] as
			| { line: number; column: number }
			| undefined;
		const transpilationWarnings = (customData['transpilationWarnings'] as
			| readonly TranspilationWarning[]
			| undefined) ?? [];

		return renderQueryEditorSection({
			sql,
			fetchXml,
			queryMode,
			errorMessage,
			errorPosition,
			transpilationWarnings,
		});
	}
}
