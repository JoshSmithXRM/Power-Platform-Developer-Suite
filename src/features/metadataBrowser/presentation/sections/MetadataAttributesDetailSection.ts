import type { ISection } from '../../../../shared/infrastructure/ui/sections/ISection';
import type { SectionRenderData } from '../../../../shared/infrastructure/ui/types/SectionRenderData';
import { SectionPosition } from '../../../../shared/infrastructure/ui/types/SectionPosition';

/**
 * Section for metadata attributes detail table (split panel right side).
 * Displays attributes for the selected entity.
 */
export class MetadataAttributesDetailSection implements ISection {
	public readonly position = SectionPosition.Detail;

	/**
	 * Renders the attributes detail section.
	 * Static structure - data updated via postMessage.
	 */
	public render(_data: SectionRenderData): string {
		return `
			<div class="metadata-attributes-panel">
				<div class="attributes-header">
					<h3>Attributes</h3>
				</div>
				<div class="attributes-table-container">
					<table class="attributes-table" id="attributesTable">
						<thead>
							<tr>
								<th data-column="displayName">Display Name</th>
								<th data-column="logicalName">Logical Name</th>
								<th data-column="attributeTypeDisplay">Type</th>
								<th data-column="requiredLevelDisplay">Required</th>
								<th data-column="isCustomAttribute">Custom</th>
							</tr>
						</thead>
						<tbody>
							<tr class="empty-message">
								<td colspan="5">Select an entity to view attributes</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		`;
	}
}
