import { AttributeMetadata } from '../../domain/entities/AttributeMetadata';
import { EntityAttributeViewModel } from '../viewModels/EntityAttributeViewModel';

/**
 * Mapper that transforms AttributeMetadata domain entities into EntityAttributeViewModel DTOs.
 * Handles presentation formatting (display values, type names, etc.).
 */
export class EntityAttributeMapper {
    /**
     * Maps attribute type to user-friendly display name.
     */
    private getAttributeTypeDisplay(typeName: string): string {
        const displayNames: Record<string, string> = {
            'String': 'Single Line of Text',
            'Memo': 'Multiple Lines of Text',
            'Integer': 'Whole Number',
            'BigInt': 'Big Integer',
            'Double': 'Decimal Number',
            'Decimal': 'Decimal Number',
            'Money': 'Currency',
            'Boolean': 'Yes/No',
            'DateTime': 'Date and Time',
            'Lookup': 'Lookup',
            'Customer': 'Customer',
            'Owner': 'Owner',
            'Picklist': 'Choice',
            'State': 'State',
            'Status': 'Status Reason',
            'MultiSelectPicklist': 'Multi-Select Choice',
            'Uniqueidentifier': 'Unique Identifier',
            'Virtual': 'Virtual',
            'EntityName': 'Entity Name',
            'ManagedProperty': 'Managed Property',
            'CalendarRules': 'Calendar Rules',
            'PartyList': 'Party List',
            'File': 'File',
            'Image': 'Image'
        };

        return displayNames[typeName] || typeName;
    }

    /**
     * Maps required level to user-friendly display text.
     */
    private getRequiredLevelDisplay(requiredLevel: 'None' | 'SystemRequired' | 'ApplicationRequired' | 'Recommended'): string {
        const displayNames: Record<string, string> = {
            'None': 'Optional',
            'SystemRequired': 'System Required',
            'ApplicationRequired': 'Business Required',
            'Recommended': 'Business Recommended'
        };

        return displayNames[requiredLevel] || requiredLevel;
    }

    /**
     * Maps a domain attribute to a ViewModel for table display.
     */
    public toViewModel(attribute: AttributeMetadata): EntityAttributeViewModel {
        const attributeType = attribute.attributeType.getValue();

        return {
            logicalName: attribute.logicalName.getValue(),
            displayName: attribute.displayName,
            schemaName: attribute.schemaName.getValue(),
            attributeType: attributeType,
            attributeTypeDisplay: this.getAttributeTypeDisplay(attributeType),
            isRequired: attribute.isRequired(),
            requiredLevel: attribute.requiredLevel,
            requiredLevelDisplay: this.getRequiredLevelDisplay(attribute.requiredLevel),
            isCustomAttribute: attribute.isCustomAttribute,
            isPrimaryId: attribute.isPrimaryId,
            isPrimaryName: attribute.isPrimaryName,
            maxLength: attribute.maxLength,
            targets: attribute.targets
        };
    }

    /**
     * Maps multiple domain attributes to ViewModels.
     */
    public toViewModels(attributes: readonly AttributeMetadata[]): readonly EntityAttributeViewModel[] {
        return attributes.map(attribute => this.toViewModel(attribute));
    }
}
