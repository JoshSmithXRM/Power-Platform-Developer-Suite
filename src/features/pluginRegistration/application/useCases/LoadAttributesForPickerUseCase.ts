import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type {
	IAttributePickerRepository,
	AttributePickerItem,
} from '../../domain/interfaces/IAttributePickerRepository';

/**
 * DTO for attribute picker webview display.
 */
export interface AttributePickerDto {
	readonly logicalName: string;
	readonly displayName: string;
	readonly attributeType: string;
}

/**
 * Result from loading attributes for the picker.
 */
export interface LoadAttributesForPickerResult {
	readonly entityLogicalName: string;
	readonly attributes: readonly AttributePickerDto[];
}

/**
 * Loads entity attributes for the attribute picker modal.
 * Returns a simplified list of attributes suitable for checkbox selection.
 */
export class LoadAttributesForPickerUseCase {
	constructor(
		private readonly repository: IAttributePickerRepository,
		private readonly logger: ILogger
	) {}

	/**
	 * Loads attributes for a given entity.
	 *
	 * @param environmentId - Environment GUID
	 * @param entityLogicalName - Entity logical name
	 * @returns Attributes formatted for picker display
	 */
	public async execute(
		environmentId: string,
		entityLogicalName: string
	): Promise<LoadAttributesForPickerResult> {
		this.logger.info('LoadAttributesForPickerUseCase: Loading attributes', {
			environmentId,
			entityLogicalName,
		});

		const attributes = await this.repository.getAttributesForPicker(
			environmentId,
			entityLogicalName
		);

		// Map to DTO (currently 1:1, but allows future transformation)
		const dtos: AttributePickerDto[] = attributes.map((attr: AttributePickerItem) => ({
			logicalName: attr.logicalName,
			displayName: attr.displayName,
			attributeType: attr.attributeType,
		}));

		this.logger.info('LoadAttributesForPickerUseCase: Loaded attributes', {
			entityLogicalName,
			count: dtos.length,
		});

		return {
			entityLogicalName,
			attributes: dtos,
		};
	}
}
