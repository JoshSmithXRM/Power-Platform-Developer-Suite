import { AttributeMetadataMapper } from './AttributeMetadataMapper';
import { OptionSetMetadataMapper } from './OptionSetMetadataMapper';
import { AttributeMetadata } from '../../domain/entities/AttributeMetadata';
import type { AttributeMetadataDto, LocalizedLabel, ManagedProperty } from '../dtos/EntityMetadataDto';
import { OptionMetadata, OptionSetMetadata } from '../../domain/valueObjects/OptionSetMetadata';

// Test helper to create complete LocalizedLabel
function createLocalizedLabel(label: string, languageCode = 1033): LocalizedLabel {
	return {
		Label: label,
		LanguageCode: languageCode,
		IsManaged: false,
		MetadataId: '00000000-0000-0000-0000-000000000000',
		HasChanged: null
	};
}

// Test helper to create ManagedProperty
function createManagedProperty<T>(value: T): ManagedProperty<T> {
	return {
		Value: value,
		CanBeChanged: true,
		ManagedPropertyLogicalName: 'managedpropertylogicalname'
	};
}

describe('AttributeMetadataMapper', () => {
	let mapper: AttributeMetadataMapper;
	let mockOptionSetMapper: jest.Mocked<OptionSetMetadataMapper>;

	beforeEach(() => {
		mockOptionSetMapper = {
			mapOptionSetDtoToValueObject: jest.fn().mockReturnValue(null)
		} as unknown as jest.Mocked<OptionSetMetadataMapper>;

		mapper = new AttributeMetadataMapper(mockOptionSetMapper);
	});

	describe('mapDtoToEntity', () => {
		describe('basic field mapping', () => {
			it('should map all required fields from DTO to domain entity', () => {
				// Arrange
				const dto: AttributeMetadataDto = {
					MetadataId: '12345678-1234-1234-1234-123456789012',
					LogicalName: 'accountname',
					SchemaName: 'AccountName',
					DisplayName: {
						LocalizedLabels: [createLocalizedLabel('Account Name')],
						UserLocalizedLabel: createLocalizedLabel('Account Name')
					},
					Description: {
						LocalizedLabels: [createLocalizedLabel('The name of the account')],
						UserLocalizedLabel: createLocalizedLabel('The name of the account')
					},
					AttributeTypeName: { Value: 'StringType' },
					IsCustomAttribute: false,
					IsManaged: false,
					IsPrimaryId: false,
					IsPrimaryName: true,
					RequiredLevel: createManagedProperty('ApplicationRequired')
				};

				// Act
				const result = mapper.mapDtoToEntity(dto);

				// Assert
				expect(result).toBeInstanceOf(AttributeMetadata);
				expect(result.metadataId).toBe('12345678-1234-1234-1234-123456789012');
				expect(result.logicalName.getValue()).toBe('accountname');
				expect(result.schemaName.getValue()).toBe('AccountName');
				expect(result.displayName).toBe('Account Name');
				expect(result.description).toBe('The name of the account');
				expect(result.attributeType.getValue()).toBe('StringType');
				expect(result.isCustomAttribute).toBe(false);
				expect(result.isManaged).toBe(false);
				expect(result.isPrimaryId).toBe(false);
				expect(result.isPrimaryName).toBe(true);
				expect(result.requiredLevel).toBe('ApplicationRequired');
			});

			it('should use AttributeType as fallback when AttributeTypeName missing', () => {
				// Arrange
				const dto: AttributeMetadataDto = {
					MetadataId: '12345678-1234-1234-1234-123456789012',
					LogicalName: 'testfield',
					SchemaName: 'TestField',
					AttributeType: 'Integer'
				};

				// Act
				const result = mapper.mapDtoToEntity(dto);

				// Assert
				expect(result.attributeType.getValue()).toBe('Integer');
			});

			it('should default to String type when both AttributeTypeName and AttributeType missing', () => {
				// Arrange
				const dto: AttributeMetadataDto = {
					MetadataId: '12345678-1234-1234-1234-123456789012',
					LogicalName: 'testfield',
					SchemaName: 'TestField'
				};

				// Act
				const result = mapper.mapDtoToEntity(dto);

				// Assert
				expect(result.attributeType.getValue()).toBe('String');
			});

			it('should use SchemaName as displayName when DisplayName label missing', () => {
				// Arrange
				const dto: AttributeMetadataDto = {
					MetadataId: '12345678-1234-1234-1234-123456789012',
					LogicalName: 'testfield',
					SchemaName: 'TestField'
				};

				// Act
				const result = mapper.mapDtoToEntity(dto);

				// Assert
				expect(result.displayName).toBe('TestField');
			});

			it('should handle missing Description label as null', () => {
				// Arrange
				const dto: AttributeMetadataDto = {
					MetadataId: '12345678-1234-1234-1234-123456789012',
					LogicalName: 'testfield',
					SchemaName: 'TestField'
				};

				// Act
				const result = mapper.mapDtoToEntity(dto);

				// Assert
				expect(result.description).toBeNull();
			});
		});

		describe('optional boolean fields', () => {
			it('should default all optional boolean flags when not provided', () => {
				// Arrange
				const dto: AttributeMetadataDto = {
					MetadataId: '12345678-1234-1234-1234-123456789012',
					LogicalName: 'testfield',
					SchemaName: 'TestField'
				};

				// Act
				const result = mapper.mapDtoToEntity(dto);

				// Assert
				expect(result.isCustomAttribute).toBe(false);
				expect(result.isManaged).toBe(false);
				expect(result.isPrimaryId).toBe(false);
				expect(result.isPrimaryName).toBe(false);
				expect(result.isValidForCreate).toBe(true);
				expect(result.isValidForUpdate).toBe(true);
				expect(result.isValidForRead).toBe(true);
				expect(result.isValidForForm).toBe(true);
				expect(result.isValidForGrid).toBe(true);
				expect(result.isSecured).toBe(false);
				expect(result.canBeSecuredForRead).toBe(false);
				expect(result.canBeSecuredForCreate).toBe(false);
				expect(result.canBeSecuredForUpdate).toBe(false);
				expect(result.isFilterable).toBe(false);
				expect(result.isSearchable).toBe(false);
				expect(result.isRetrievable).toBe(true);
			});

			it('should map all validation flags when provided', () => {
				// Arrange
				const dto: AttributeMetadataDto = {
					MetadataId: '12345678-1234-1234-1234-123456789012',
					LogicalName: 'testfield',
					SchemaName: 'TestField',
					IsValidForCreate: false,
					IsValidForUpdate: false,
					IsValidForRead: false,
					IsValidForForm: false,
					IsValidForGrid: false
				};

				// Act
				const result = mapper.mapDtoToEntity(dto);

				// Assert
				expect(result.isValidForCreate).toBe(false);
				expect(result.isValidForUpdate).toBe(false);
				expect(result.isValidForRead).toBe(false);
				expect(result.isValidForForm).toBe(false);
				expect(result.isValidForGrid).toBe(false);
			});

			it('should map all security flags when provided', () => {
				// Arrange
				const dto: AttributeMetadataDto = {
					MetadataId: '12345678-1234-1234-1234-123456789012',
					LogicalName: 'testfield',
					SchemaName: 'TestField',
					IsSecured: true,
					CanBeSecuredForRead: true,
					CanBeSecuredForCreate: true,
					CanBeSecuredForUpdate: true
				};

				// Act
				const result = mapper.mapDtoToEntity(dto);

				// Assert
				expect(result.isSecured).toBe(true);
				expect(result.canBeSecuredForRead).toBe(true);
				expect(result.canBeSecuredForCreate).toBe(true);
				expect(result.canBeSecuredForUpdate).toBe(true);
			});

			it('should map searchability and filterability flags when provided', () => {
				// Arrange
				const dto: AttributeMetadataDto = {
					MetadataId: '12345678-1234-1234-1234-123456789012',
					LogicalName: 'testfield',
					SchemaName: 'TestField',
					IsFilterable: true,
					IsSearchable: true
				};

				// Act
				const result = mapper.mapDtoToEntity(dto);

				// Assert
				expect(result.isFilterable).toBe(true);
				expect(result.isSearchable).toBe(true);
			});
		});

		describe('type-specific properties', () => {
			it('should map MaxLength for string attributes', () => {
				// Arrange
				const dto: AttributeMetadataDto = {
					MetadataId: '12345678-1234-1234-1234-123456789012',
					LogicalName: 'accountname',
					SchemaName: 'AccountName',
					AttributeTypeName: { Value: 'StringType' },
					MaxLength: 100
				};

				// Act
				const result = mapper.mapDtoToEntity(dto);

				// Assert
				expect(result.maxLength).toBe(100);
			});

			it('should map Targets for lookup attributes', () => {
				// Arrange
				const dto: AttributeMetadataDto = {
					MetadataId: '12345678-1234-1234-1234-123456789012',
					LogicalName: 'parentaccountid',
					SchemaName: 'ParentAccountId',
					AttributeTypeName: { Value: 'LookupType' },
					Targets: ['account', 'contact']
				};

				// Act
				const result = mapper.mapDtoToEntity(dto);

				// Assert
				expect(result.targets).toEqual(['account', 'contact']);
			});

			it('should map numeric properties for decimal attributes', () => {
				// Arrange
				const dto: AttributeMetadataDto = {
					MetadataId: '12345678-1234-1234-1234-123456789012',
					LogicalName: 'revenue',
					SchemaName: 'Revenue',
					AttributeTypeName: { Value: 'DecimalType' },
					Precision: 2,
					MinValue: 0,
					MaxValue: 1000000
				};

				// Act
				const result = mapper.mapDtoToEntity(dto);

				// Assert
				expect(result.precision).toBe(2);
				expect(result.minValue).toBe(0);
				expect(result.maxValue).toBe(1000000);
			});

			it('should map Format for DateTime attributes', () => {
				// Arrange
				const dto: AttributeMetadataDto = {
					MetadataId: '12345678-1234-1234-1234-123456789012',
					LogicalName: 'createdon',
					SchemaName: 'CreatedOn',
					AttributeTypeName: { Value: 'DateTimeType' },
					Format: 'DateAndTime'
				};

				// Act
				const result = mapper.mapDtoToEntity(dto);

				// Assert
				expect(result.format).toBe('DateAndTime');
			});

			it('should default type-specific properties to null when not provided', () => {
				// Arrange
				const dto: AttributeMetadataDto = {
					MetadataId: '12345678-1234-1234-1234-123456789012',
					LogicalName: 'testfield',
					SchemaName: 'TestField'
				};

				// Act
				const result = mapper.mapDtoToEntity(dto);

				// Assert
				expect(result.maxLength).toBeNull();
				expect(result.targets).toBeNull();
				expect(result.precision).toBeNull();
				expect(result.minValue).toBeNull();
				expect(result.maxValue).toBeNull();
				expect(result.format).toBeNull();
			});
		});

		describe('option set delegation', () => {
			it('should delegate option set mapping to OptionSetMetadataMapper', () => {
				// Arrange
				const mockOptionSet = {
					IsGlobal: false,
					Options: []
				};

				const dto: AttributeMetadataDto = {
					MetadataId: '12345678-1234-1234-1234-123456789012',
					LogicalName: 'statuscode',
					SchemaName: 'StatusCode',
					AttributeTypeName: { Value: 'PicklistType' },
					OptionSet: mockOptionSet
				};

				const mockOptionSetValue = OptionSetMetadata.create({
					name: 'statuscode',
					isGlobal: false,
					options: [OptionMetadata.create({ value: 1, label: 'Active', description: null, color: null })]
				});

				mockOptionSetMapper.mapOptionSetDtoToValueObject.mockReturnValue(mockOptionSetValue);

				// Act
				const result = mapper.mapDtoToEntity(dto);

				// Assert
				expect(mockOptionSetMapper.mapOptionSetDtoToValueObject).toHaveBeenCalledWith(
					mockOptionSet,
					undefined
				);
				expect(result.optionSet).toBe(mockOptionSetValue);
			});

			it('should pass GlobalOptionSet to mapper when present', () => {
				// Arrange
				const mockGlobalOptionSet = {
					Name: 'global_optionset',
					OptionSetType: 'Picklist'
				};

				const dto: AttributeMetadataDto = {
					MetadataId: '12345678-1234-1234-1234-123456789012',
					LogicalName: 'statuscode',
					SchemaName: 'StatusCode',
					AttributeTypeName: { Value: 'PicklistType' },
					GlobalOptionSet: mockGlobalOptionSet
				};

				// Act
				mapper.mapDtoToEntity(dto);

				// Assert
				expect(mockOptionSetMapper.mapOptionSetDtoToValueObject).toHaveBeenCalledWith(
					undefined,
					mockGlobalOptionSet
				);
			});

			it('should handle null option set from mapper', () => {
				// Arrange
				const dto: AttributeMetadataDto = {
					MetadataId: '12345678-1234-1234-1234-123456789012',
					LogicalName: 'accountname',
					SchemaName: 'AccountName',
					AttributeTypeName: { Value: 'StringType' }
				};

				mockOptionSetMapper.mapOptionSetDtoToValueObject.mockReturnValue(null);

				// Act
				const result = mapper.mapDtoToEntity(dto);

				// Assert
				expect(result.optionSet).toBeNull();
			});
		});

		describe('different attribute types', () => {
			it.each([
				['StringType', 'string'],
				['LookupType', 'lookup'],
				['PicklistType', 'picklist'],
				['BooleanType', 'boolean'],
				['DateTimeType', 'dateTime'],
				['DecimalType', 'decimal'],
				['IntegerType', 'integer'],
				['MoneyType', 'money']
			])('should map %s attribute', (attributeType, _description) => {
				// Arrange
				const dto: AttributeMetadataDto = {
					MetadataId: '12345678-1234-1234-1234-123456789012',
					LogicalName: 'testfield',
					SchemaName: 'TestField',
					AttributeTypeName: { Value: attributeType }
				};

				// Act
				const result = mapper.mapDtoToEntity(dto);

				// Assert
				expect(result.attributeType.getValue()).toBe(attributeType);
			});
		});

		describe('custom vs managed attributes', () => {
			it('should identify custom attributes', () => {
				// Arrange
				const dto: AttributeMetadataDto = {
					MetadataId: '12345678-1234-1234-1234-123456789012',
					LogicalName: 'new_customfield',
					SchemaName: 'new_CustomField',
					IsCustomAttribute: true
				};

				// Act
				const result = mapper.mapDtoToEntity(dto);

				// Assert
				expect(result.isCustomAttribute).toBe(true);
			});

			it('should identify managed attributes', () => {
				// Arrange
				const dto: AttributeMetadataDto = {
					MetadataId: '12345678-1234-1234-1234-123456789012',
					LogicalName: 'accountid',
					SchemaName: 'AccountId',
					IsManaged: true
				};

				// Act
				const result = mapper.mapDtoToEntity(dto);

				// Assert
				expect(result.isManaged).toBe(true);
			});
		});

		describe('primary attributes', () => {
			it('should identify primary id attribute', () => {
				// Arrange
				const dto: AttributeMetadataDto = {
					MetadataId: '12345678-1234-1234-1234-123456789012',
					LogicalName: 'accountid',
					SchemaName: 'AccountId',
					IsPrimaryId: true,
					IsPrimaryName: false
				};

				// Act
				const result = mapper.mapDtoToEntity(dto);

				// Assert
				expect(result.isPrimaryId).toBe(true);
				expect(result.isPrimaryName).toBe(false);
			});

			it('should identify primary name attribute', () => {
				// Arrange
				const dto: AttributeMetadataDto = {
					MetadataId: '12345678-1234-1234-1234-123456789012',
					LogicalName: 'accountname',
					SchemaName: 'AccountName',
					IsPrimaryId: false,
					IsPrimaryName: true
				};

				// Act
				const result = mapper.mapDtoToEntity(dto);

				// Assert
				expect(result.isPrimaryId).toBe(false);
				expect(result.isPrimaryName).toBe(true);
			});
		});
	});
});
