import type { StepImage } from '../../domain/entities/StepImage';
import type { ImageMetadata, TreeItemViewModel } from '../viewModels/TreeItemViewModel';

/**
 * Maps StepImage domain entity to TreeItemViewModel.
 *
 * Transformation only (NO business logic).
 */
export class StepImageViewModelMapper {
	/** Maximum length for attribute list before truncating */
	private static readonly MAX_ATTRIBUTES_LENGTH = 60;

	public toTreeItem(image: StepImage, stepId: string): TreeItemViewModel {
		const metadata: ImageMetadata = {
			type: 'image',
			imageType: image.getImageType().getName(),
			entityAlias: image.getEntityAlias(),
			attributes: image.getAttributesArray(),
			createdOn: image.getCreatedOn().toISOString(),
			canDelete: true, // Images can always be deleted (no managed state)
		};

		const displayName = this.formatDisplayName(image);

		return {
			id: image.getId(),
			parentId: stepId,
			type: 'image',
			name: image.getName(),
			displayName,
			icon: '🖼️',
			metadata,
			isManaged: false,
			children: [],
		};
	}

	/**
	 * Formats display name with attributes and image type.
	 * Format: "(Image) {Name} ({attributes}) - {ImageType}"
	 */
	private formatDisplayName(image: StepImage): string {
		const name = image.getName();
		const imageType = image.getImageType().getName();
		const attributesDisplay = this.formatAttributes(image.getAttributesArray());

		return `(Image) ${name} ${attributesDisplay} - ${imageType}`;
	}

	/**
	 * Formats attributes for display.
	 * Returns "(All Attributes)" if empty, or "(attr1,attr2,...)" with truncation if needed.
	 */
	private formatAttributes(attributes: string[]): string {
		if (attributes.length === 0) {
			return '(All Attributes)';
		}

		const joined = attributes.join(',');
		if (joined.length <= StepImageViewModelMapper.MAX_ATTRIBUTES_LENGTH) {
			return `(${joined})`;
		}

		// Truncate and add ellipsis
		const truncated = joined.substring(0, StepImageViewModelMapper.MAX_ATTRIBUTES_LENGTH);
		// Try to cut at a comma to avoid cutting mid-attribute
		const lastComma = truncated.lastIndexOf(',');
		const cleanTruncated = lastComma > 0 ? truncated.substring(0, lastComma) : truncated;

		return `(${cleanTruncated},...)`;
	}
}
