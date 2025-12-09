import type { StepImage } from '../../domain/entities/StepImage';
import type { ImageMetadata, TreeItemViewModel } from '../viewModels/TreeItemViewModel';

/**
 * Maps StepImage domain entity to TreeItemViewModel.
 *
 * Transformation only (NO business logic).
 */
export class StepImageViewModelMapper {
	public toTreeItem(image: StepImage, stepId: string): TreeItemViewModel {
		const metadata: ImageMetadata = {
			type: 'image',
			imageType: image.getImageType().getName(),
			entityAlias: image.getEntityAlias(),
			attributes: image.getAttributesArray(),
			createdOn: image.getCreatedOn().toISOString(),
		};

		return {
			id: image.getId(),
			parentId: stepId,
			type: 'image',
			name: image.getName(),
			displayName: image.getName(),
			icon: '🖼️',
			metadata,
			isManaged: false,
			children: [],
		};
	}
}
