import type { ISection } from '../../../../shared/infrastructure/ui/sections/ISection';
import { SectionPosition } from '../../../../shared/infrastructure/ui/types/SectionPosition';
import type { SectionRenderData } from '../../../../shared/infrastructure/ui/types/SectionRenderData';
import type { ColumnOptionViewModel } from '../../application/viewModels/ColumnOptionViewModel';
import type { FilterConditionViewModel } from '../../application/viewModels/FilterConditionViewModel';
import {
	renderVisualQueryBuilderSection,
	type EntityOption,
} from '../views/visualQueryBuilderView';

/**
 * Section: Visual Query Builder
 *
 * Displays the visual query builder UI for the Data Explorer panel.
 * Contains entity picker, query preview, and results table.
 * Positioned in the main content area.
 */
export class VisualQueryBuilderSection implements ISection {
	public readonly position = SectionPosition.Main;

	/**
	 * Renders the Visual Query Builder section.
	 * Extracts entity list, selected entity, and generated queries from customData.
	 *
	 * @param data - Section render data with customData containing entities, selectedEntity, etc.
	 * @returns HTML string for the visual query builder section
	 */
	public render(data: SectionRenderData): string {
		const customData = data.customData ?? {};

		const entities = (customData['entities'] as readonly EntityOption[]) ?? [];
		const selectedEntity = (customData['selectedEntity'] as string | null) ?? null;
		const isLoadingEntities = (customData['isLoadingEntities'] as boolean) ?? false;
		const availableColumns =
			(customData['availableColumns'] as readonly ColumnOptionViewModel[]) ?? [];
		const isSelectAllColumns = (customData['isSelectAllColumns'] as boolean) ?? true;
		const isLoadingColumns = (customData['isLoadingColumns'] as boolean) ?? false;
		const filterConditions =
			(customData['filterConditions'] as readonly FilterConditionViewModel[]) ?? [];
		const sortAttribute = (customData['sortAttribute'] as string | null) ?? null;
		const sortDescending = (customData['sortDescending'] as boolean) ?? false;
		const topN = (customData['topN'] as number | null) ?? null;
		const distinct = (customData['distinct'] as boolean) ?? false;
		const generatedFetchXml = (customData['generatedFetchXml'] as string) ?? '';
		const generatedSql = (customData['generatedSql'] as string) ?? '';
		const errorMessage = customData['errorMessage'] as string | undefined;

		return renderVisualQueryBuilderSection({
			entities,
			selectedEntity,
			isLoadingEntities,
			availableColumns,
			isSelectAllColumns,
			isLoadingColumns,
			filterConditions,
			sortAttribute,
			sortDescending,
			topN,
			distinct,
			generatedFetchXml,
			generatedSql,
			errorMessage,
		});
	}
}
