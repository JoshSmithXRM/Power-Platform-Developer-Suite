import type { StepImage } from '../../domain/entities/StepImage';
import type { ImageMetadata, TreeItemViewModel } from '../viewModels/TreeItemViewModel';

/**
 * Maps StepImage domain entity to TreeItemViewModel.
 *
 * Transformation only (NO business logic).
 */
export class StepImageViewModelMapper {
	public toTreeItem(image: StepImage, stepId: string): TreeItemViewModel {
		// Use raw ImageType name - presentation layer handles display formatting
		const imageTypeName = image.getImageType().getName();

		const metadata: ImageMetadata = {
			type: 'image',
			imageType: imageTypeName,
			entityAlias: image.getEntityAlias(),
			attributes: image.getAttributesArray(),
			createdOn: image.getCreatedOn().toISOString(),
		};

		return {
			id: image.getId(),
			parentId: stepId,
			type: 'image',
			name: image.getName(),
			displayName: `${image.getEntityAlias()} (${imageTypeName})`,
			icon: '🖼️',
			metadata,
			isManaged: false,
			children: [],
		};
	}
}
