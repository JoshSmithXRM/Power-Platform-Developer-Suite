import type { AttributeMetadata } from '../../domain/entities/AttributeMetadata';
import type { AttributeRowViewModel } from '../viewModels/AttributeRowViewModel';

/**
 * Maps AttributeMetadata to AttributeRowViewModel.
 *
 * Transformation rules:
 * - maxLength: Format as string, "-" if null
 * - required: Enum string (None, ApplicationRequired, SystemRequired)
 * - type: Strip "Type" suffix from AttributeType for display
 */
export class AttributeRowMapper {
    public toViewModel(attribute: AttributeMetadata): AttributeRowViewModel {
        const logicalName = attribute.logicalName.getValue();
        const typeValue = attribute.attributeType.getValue();
        const typeDisplay = typeValue.replace(/Type$/, '');

        return {
            id: logicalName,
            displayName: attribute.displayName || logicalName,
            logicalName,
            type: typeDisplay,
            required: attribute.requiredLevel,
            maxLength: attribute.maxLength?.toString() ?? '-',
            isLinkable: true,
            metadata: attribute
        };
    }
}
