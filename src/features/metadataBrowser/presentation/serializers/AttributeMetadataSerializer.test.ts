import { AttributeMetadataSerializer } from './AttributeMetadataSerializer';
import { AttributeMetadata } from '../../domain/entities/AttributeMetadata';
import { LogicalName } from '../../domain/valueObjects/LogicalName';
import { SchemaName } from '../../domain/valueObjects/SchemaName';
import { AttributeType } from '../../domain/valueObjects/AttributeType';
import { OptionSetMetadata, OptionMetadata } from '../../domain/valueObjects/OptionSetMetadata';

describe('AttributeMetadataSerializer', () => {
	let serializer: AttributeMetadataSerializer;

	beforeEach(() => {
		serializer = new AttributeMetadataSerializer();
	});

	describe('serializeToRaw', () => {
		describe('basic attribute serialization', () => {
			it('should serialize basic attribute without optionSet', () => {
				// Arrange
				const attribute = AttributeMetadata.create({
					metadataId: 'meta-123',
					logicalName: LogicalName.create('new_customfield'),
					schemaName: SchemaName.create('new_CustomField'),
					displayName: 'Custom Field',
					description: 'A custom field',
					attributeType: AttributeType.create('String'),
					isCustomAttribute: true,
					isManaged: false,
					isPrimaryId: false,
					isPrimaryName: false,
					requiredLevel: 'None',
					maxLength: 100,
					isValidForCreate: true,
					isValidForUpdate: true,
					isValidForRead: true,
					isValidForForm: true,
					isValidForGrid: true,
					isSecured: false,
					canBeSecuredForRead: false,
					canBeSecuredForCreate: false,
					canBeSecuredForUpdate: false,
					isFilterable: true,
					isSearchable: true,
					isRetrievable: true
				});

				// Act
				const result = serializer.serializeToRaw(attribute);

				// Assert
				expect(result).toEqual({
					MetadataId: 'meta-123',
					LogicalName: 'new_customfield',
					SchemaName: 'new_CustomField',
					DisplayName: 'Custom Field',
					Description: 'A custom field',
					AttributeTypeName: {
						Value: 'String'
					},
					// Virtual field detection
					AttributeOf: null,
					IsLogical: false,
					// Ownership
					IsCustomAttribute: true,
					IsManaged: false,
					IsPrimaryId: false,
					IsPrimaryName: false,
					RequiredLevel: 'None',
					// Type-specific
					MaxLength: 100,
					Targets: null,
					Precision: null,
					MinValue: null,
					MaxValue: null,
					Format: null,
					OptionSet: null,
					// Validation
					IsValidForCreate: true,
					IsValidForUpdate: true,
					IsValidForRead: true,
					IsValidForForm: true,
					IsValidForGrid: true,
					// Security
					IsSecured: false,
					CanBeSecuredForRead: false,
					CanBeSecuredForCreate: false,
					CanBeSecuredForUpdate: false,
					// Behavior
					IsFilterable: true,
					IsSearchable: true,
					IsRetrievable: true,
					// Source and calculation
					SourceType: null,
					FormulaDefinition: null,
					// Versioning
					IntroducedVersion: null,
					DeprecatedVersion: null
				});
			});

			it('should serialize attribute with null description', () => {
				// Arrange
				const attribute = AttributeMetadata.create({
					metadataId: 'meta-456',
					logicalName: LogicalName.create('accountid'),
					schemaName: SchemaName.create('AccountId'),
					displayName: 'Account',
					description: null,
					attributeType: AttributeType.create('Uniqueidentifier'),
					isCustomAttribute: false,
					isManaged: true,
					isPrimaryId: true,
					isPrimaryName: false,
					requiredLevel: 'SystemRequired'
				});

				// Act
				const result = serializer.serializeToRaw(attribute);

				// Assert
				expect(result['Description']).toBeNull();
				expect(result['IsPrimaryId']).toBe(true);
				expect(result['RequiredLevel']).toBe('SystemRequired');
			});

			it('should serialize attribute with all numeric constraints', () => {
				// Arrange
				const attribute = AttributeMetadata.create({
					metadataId: 'meta-789',
					logicalName: LogicalName.create('new_amount'),
					schemaName: SchemaName.create('new_Amount'),
					displayName: 'Amount',
					description: 'Monetary amount',
					attributeType: AttributeType.create('Decimal'),
					isCustomAttribute: true,
					isManaged: false,
					isPrimaryId: false,
					isPrimaryName: false,
					requiredLevel: 'ApplicationRequired',
					precision: 2,
					minValue: 0,
					maxValue: 1000000
				});

				// Act
				const result = serializer.serializeToRaw(attribute);

				// Assert
				expect(result['Precision']).toBe(2);
				expect(result['MinValue']).toBe(0);
				expect(result['MaxValue']).toBe(1000000);
			});

			it('should serialize attribute with lookup targets', () => {
				// Arrange
				const attribute = AttributeMetadata.create({
					metadataId: 'meta-101',
					logicalName: LogicalName.create('customerid'),
					schemaName: SchemaName.create('CustomerId'),
					displayName: 'Customer',
					description: 'Customer reference',
					attributeType: AttributeType.create('Lookup'),
					isCustomAttribute: false,
					isManaged: true,
					isPrimaryId: false,
					isPrimaryName: false,
					requiredLevel: 'Recommended',
					targets: ['account', 'contact']
				});

				// Act
				const result = serializer.serializeToRaw(attribute);

				// Assert
				expect(result['Targets']).toEqual(['account', 'contact']);
			});

			it('should serialize attribute with format', () => {
				// Arrange
				const attribute = AttributeMetadata.create({
					metadataId: 'meta-202',
					logicalName: LogicalName.create('emailaddress1'),
					schemaName: SchemaName.create('EMailAddress1'),
					displayName: 'Email',
					description: null,
					attributeType: AttributeType.create('String'),
					isCustomAttribute: false,
					isManaged: true,
					isPrimaryId: false,
					isPrimaryName: false,
					requiredLevel: 'None',
					format: 'Email',
					maxLength: 100
				});

				// Act
				const result = serializer.serializeToRaw(attribute);

				// Assert
				expect(result['Format']).toBe('Email');
			});
		});

		describe('optionSet serialization', () => {
			it('should serialize attribute with global optionSet', () => {
				// Arrange
				const options = [
					OptionMetadata.create({
						value: 1,
						label: 'Active',
						description: 'Active status',
						color: '#00FF00'
					}),
					OptionMetadata.create({
						value: 2,
						label: 'Inactive',
						description: 'Inactive status',
						color: '#FF0000'
					})
				];

				const optionSet = OptionSetMetadata.create({
					name: 'statuscode',
					displayName: 'Status Reason',
					isGlobal: true,
					isCustom: false,
					options
				});

				const attribute = AttributeMetadata.create({
					metadataId: 'meta-303',
					logicalName: LogicalName.create('statuscode'),
					schemaName: SchemaName.create('StatusCode'),
					displayName: 'Status Reason',
					description: null,
					attributeType: AttributeType.create('Picklist'),
					isCustomAttribute: false,
					isManaged: true,
					isPrimaryId: false,
					isPrimaryName: false,
					requiredLevel: 'None',
					optionSet
				});

				// Act
				const result = serializer.serializeToRaw(attribute);

				// Assert
				expect(result['OptionSet']).toEqual({
					Name: 'statuscode',
					DisplayName: 'Status Reason',
					IsGlobal: true,
					IsCustom: false,
					Options: [
						{
							Value: 1,
							Label: 'Active',
							Description: 'Active status',
							Color: '#00FF00'
						},
						{
							Value: 2,
							Label: 'Inactive',
							Description: 'Inactive status',
							Color: '#FF0000'
						}
					]
				});
			});

			it('should serialize attribute with local optionSet', () => {
				// Arrange
				const options = [
					OptionMetadata.create({
						value: 100000000,
						label: 'Option A',
						description: null,
						color: null
					}),
					OptionMetadata.create({
						value: 100000001,
						label: 'Option B',
						description: null,
						color: null
					})
				];

				const optionSet = OptionSetMetadata.create({
					name: null,
					displayName: null,
					isGlobal: false,
					isCustom: true,
					options
				});

				const attribute = AttributeMetadata.create({
					metadataId: 'meta-404',
					logicalName: LogicalName.create('new_choices'),
					schemaName: SchemaName.create('new_Choices'),
					displayName: 'Choices',
					description: 'Custom choices',
					attributeType: AttributeType.create('Picklist'),
					isCustomAttribute: true,
					isManaged: false,
					isPrimaryId: false,
					isPrimaryName: false,
					requiredLevel: 'None',
					optionSet
				});

				// Act
				const result = serializer.serializeToRaw(attribute);

				// Assert
				expect(result['OptionSet']).toEqual({
					Name: null,
					DisplayName: null,
					IsGlobal: false,
					IsCustom: true,
					Options: [
						{
							Value: 100000000,
							Label: 'Option A',
							Description: null,
							Color: null
						},
						{
							Value: 100000001,
							Label: 'Option B',
							Description: null,
							Color: null
						}
					]
				});
			});

			it('should serialize attribute without optionSet as null', () => {
				// Arrange
				const attribute = AttributeMetadata.create({
					metadataId: 'meta-505',
					logicalName: LogicalName.create('name'),
					schemaName: SchemaName.create('Name'),
					displayName: 'Name',
					description: null,
					attributeType: AttributeType.create('String'),
					isCustomAttribute: false,
					isManaged: true,
					isPrimaryId: false,
					isPrimaryName: true,
					requiredLevel: 'None'
				});

				// Act
				const result = serializer.serializeToRaw(attribute);

				// Assert
				expect(result['OptionSet']).toBeNull();
			});
		});

		describe('extractValue via different value forms', () => {
			it('should extract value from value object with getValue() method', () => {
				// Arrange - Using actual domain entity with value objects
				const attribute = AttributeMetadata.create({
					metadataId: 'meta-600',
					logicalName: LogicalName.create('new_field'),
					schemaName: SchemaName.create('new_Field'),
					displayName: 'Field',
					description: null,
					attributeType: AttributeType.create('String'),
					isCustomAttribute: true,
					isManaged: false,
					isPrimaryId: false,
					isPrimaryName: false,
					requiredLevel: 'None'
				});

				// Act
				const result = serializer.serializeToRaw(attribute);

				// Assert - Verify value objects were properly extracted via getValue()
				expect(result['LogicalName']).toBe('new_field');
				expect(result['SchemaName']).toBe('new_Field');
				expect(result['AttributeTypeName']).toEqual({
					Value: 'String'
				});
			});

			it('should extract value from JSON-serialized form with .value property', () => {
				// Arrange - Simulate attribute coming from webview (JSON-serialized form)
				const attribute = {
					metadataId: 'meta-700',
					logicalName: { value: 'accountid' },
					schemaName: { value: 'AccountId' },
					displayName: 'Account ID',
					description: null,
					attributeType: { value: 'Uniqueidentifier' },
					isCustomAttribute: false,
					isManaged: true,
					isPrimaryId: true,
					isPrimaryName: false,
					requiredLevel: 'SystemRequired',
					maxLength: null,
					targets: null,
					precision: null,
					minValue: null,
					maxValue: null,
					format: null,
					optionSet: null,
					isValidForCreate: true,
					isValidForUpdate: true,
					isValidForRead: true,
					isValidForForm: true,
					isValidForGrid: true,
					isSecured: false,
					canBeSecuredForRead: false,
					canBeSecuredForCreate: false,
					canBeSecuredForUpdate: false,
					isFilterable: true,
					isSearchable: true,
					isRetrievable: true
				} as unknown as AttributeMetadata;

				// Act
				const result = serializer.serializeToRaw(attribute);

				// Assert
				expect(result['LogicalName']).toBe('accountid');
				expect(result['SchemaName']).toBe('AccountId');
				expect(result['AttributeTypeName']).toEqual({
					Value: 'Uniqueidentifier'
				});
			});

			it('should handle plain string values', () => {
				// Arrange - Simulate attribute with plain string values (edge case)
				const attribute = {
					metadataId: 'meta-800',
					logicalName: 'contactid',
					schemaName: 'ContactId',
					displayName: 'Contact ID',
					description: null,
					attributeType: 'Uniqueidentifier',
					isCustomAttribute: false,
					isManaged: true,
					isPrimaryId: true,
					isPrimaryName: false,
					requiredLevel: 'SystemRequired',
					maxLength: null,
					targets: null,
					precision: null,
					minValue: null,
					maxValue: null,
					format: null,
					optionSet: null,
					isValidForCreate: true,
					isValidForUpdate: true,
					isValidForRead: true,
					isValidForForm: true,
					isValidForGrid: true,
					isSecured: false,
					canBeSecuredForRead: false,
					canBeSecuredForCreate: false,
					canBeSecuredForUpdate: false,
					isFilterable: true,
					isSearchable: true,
					isRetrievable: true
				} as unknown as AttributeMetadata;

				// Act
				const result = serializer.serializeToRaw(attribute);

				// Assert
				expect(result['LogicalName']).toBe('contactid');
				expect(result['SchemaName']).toBe('ContactId');
				expect(result['AttributeTypeName']).toEqual({
					Value: 'Uniqueidentifier'
				});
			});

			it('should fallback to string conversion for non-string, non-object values', () => {
				// Arrange - Simulate attribute with non-standard values (edge case)
				const attribute = {
					metadataId: 'meta-900',
					logicalName: 123,
					schemaName: true,
					displayName: 'Test',
					description: null,
					attributeType: null,
					isCustomAttribute: false,
					isManaged: true,
					isPrimaryId: false,
					isPrimaryName: false,
					requiredLevel: 'None',
					maxLength: null,
					targets: null,
					precision: null,
					minValue: null,
					maxValue: null,
					format: null,
					optionSet: null,
					isValidForCreate: true,
					isValidForUpdate: true,
					isValidForRead: true,
					isValidForForm: true,
					isValidForGrid: true,
					isSecured: false,
					canBeSecuredForRead: false,
					canBeSecuredForCreate: false,
					canBeSecuredForUpdate: false,
					isFilterable: true,
					isSearchable: true,
					isRetrievable: true
				} as unknown as AttributeMetadata;

				// Act
				const result = serializer.serializeToRaw(attribute);

				// Assert - String conversion fallback
				expect(result['LogicalName']).toBe('123');
				expect(result['SchemaName']).toBe('true');
				expect(result['AttributeTypeName']).toEqual({
					Value: 'null'
				});
			});

			it('should handle object without getValue() or value property', () => {
				// Arrange - Object with neither getValue() nor value property
				const attribute = {
					metadataId: 'meta-1000',
					logicalName: { someOtherProperty: 'test' },
					schemaName: { data: 'SchemaName' },
					displayName: 'Test',
					description: null,
					attributeType: { type: 'String' },
					isCustomAttribute: false,
					isManaged: true,
					isPrimaryId: false,
					isPrimaryName: false,
					requiredLevel: 'None',
					maxLength: null,
					targets: null,
					precision: null,
					minValue: null,
					maxValue: null,
					format: null,
					optionSet: null,
					isValidForCreate: true,
					isValidForUpdate: true,
					isValidForRead: true,
					isValidForForm: true,
					isValidForGrid: true,
					isSecured: false,
					canBeSecuredForRead: false,
					canBeSecuredForCreate: false,
					canBeSecuredForUpdate: false,
					isFilterable: true,
					isSearchable: true,
					isRetrievable: true
				} as unknown as AttributeMetadata;

				// Act
				const result = serializer.serializeToRaw(attribute);

				// Assert - Fallback to string conversion
				expect(result['LogicalName']).toBe('[object Object]');
				expect(result['SchemaName']).toBe('[object Object]');
				expect(result['AttributeTypeName']).toEqual({
					Value: '[object Object]'
				});
			});
		});

		describe('all fields correctly mapped', () => {
			it('should map all fields to correct API format', () => {
				// Arrange - Create attribute with all possible fields populated
				const options = [
					OptionMetadata.create({
						value: 1,
						label: 'Yes',
						description: 'Affirmative',
						color: '#00FF00'
					})
				];

				const optionSet = OptionSetMetadata.create({
					name: 'boolean_optionset',
					displayName: 'Boolean',
					isGlobal: true,
					isCustom: false,
					options
				});

				const attribute = AttributeMetadata.create({
					metadataId: 'meta-all-fields',
					logicalName: LogicalName.create('new_allfields'),
					schemaName: SchemaName.create('new_AllFields'),
					displayName: 'All Fields',
					description: 'Test all fields',
					attributeType: AttributeType.create('Picklist'),
					isCustomAttribute: true,
					isManaged: false,
					isPrimaryId: false,
					isPrimaryName: false,
					requiredLevel: 'ApplicationRequired',
					maxLength: 200,
					targets: ['account', 'contact'],
					precision: 3,
					minValue: -100,
					maxValue: 100,
					format: 'Text',
					optionSet,
					isValidForCreate: true,
					isValidForUpdate: false,
					isValidForRead: true,
					isValidForForm: false,
					isValidForGrid: true,
					isSecured: true,
					canBeSecuredForRead: true,
					canBeSecuredForCreate: false,
					canBeSecuredForUpdate: true,
					isFilterable: true,
					isSearchable: false,
					isRetrievable: true
				});

				// Act
				const result = serializer.serializeToRaw(attribute);

				// Assert - Verify ALL fields are present and correctly mapped
				expect(result).toHaveProperty('MetadataId');
				expect(result).toHaveProperty('LogicalName');
				expect(result).toHaveProperty('SchemaName');
				expect(result).toHaveProperty('DisplayName');
				expect(result).toHaveProperty('Description');
				expect(result).toHaveProperty('AttributeTypeName');
				// Virtual field detection
				expect(result).toHaveProperty('AttributeOf');
				expect(result).toHaveProperty('IsLogical');
				// Ownership
				expect(result).toHaveProperty('IsCustomAttribute');
				expect(result).toHaveProperty('IsManaged');
				expect(result).toHaveProperty('IsPrimaryId');
				expect(result).toHaveProperty('IsPrimaryName');
				expect(result).toHaveProperty('RequiredLevel');
				// Type-specific
				expect(result).toHaveProperty('MaxLength');
				expect(result).toHaveProperty('Targets');
				expect(result).toHaveProperty('Precision');
				expect(result).toHaveProperty('MinValue');
				expect(result).toHaveProperty('MaxValue');
				expect(result).toHaveProperty('Format');
				expect(result).toHaveProperty('OptionSet');
				// Validation
				expect(result).toHaveProperty('IsValidForCreate');
				expect(result).toHaveProperty('IsValidForUpdate');
				expect(result).toHaveProperty('IsValidForRead');
				expect(result).toHaveProperty('IsValidForForm');
				expect(result).toHaveProperty('IsValidForGrid');
				// Security
				expect(result).toHaveProperty('IsSecured');
				expect(result).toHaveProperty('CanBeSecuredForRead');
				expect(result).toHaveProperty('CanBeSecuredForCreate');
				expect(result).toHaveProperty('CanBeSecuredForUpdate');
				// Behavior
				expect(result).toHaveProperty('IsFilterable');
				expect(result).toHaveProperty('IsSearchable');
				expect(result).toHaveProperty('IsRetrievable');
				// Source and calculation
				expect(result).toHaveProperty('SourceType');
				expect(result).toHaveProperty('FormulaDefinition');
				// Versioning
				expect(result).toHaveProperty('IntroducedVersion');
				expect(result).toHaveProperty('DeprecatedVersion');

				// Verify values match
				expect(result['MetadataId']).toBe('meta-all-fields');
				expect(result['LogicalName']).toBe('new_allfields');
				expect(result['SchemaName']).toBe('new_AllFields');
				expect(result['DisplayName']).toBe('All Fields');
				expect(result['Description']).toBe('Test all fields');
				expect(result['AttributeTypeName']).toEqual({ Value: 'Picklist' });
				expect(result['IsCustomAttribute']).toBe(true);
				expect(result['IsManaged']).toBe(false);
				expect(result['IsPrimaryId']).toBe(false);
				expect(result['IsPrimaryName']).toBe(false);
				expect(result['RequiredLevel']).toBe('ApplicationRequired');
				expect(result['MaxLength']).toBe(200);
				expect(result['Targets']).toEqual(['account', 'contact']);
				expect(result['Precision']).toBe(3);
				expect(result['MinValue']).toBe(-100);
				expect(result['MaxValue']).toBe(100);
				expect(result['Format']).toBe('Text');
				expect(result['OptionSet']).toBeDefined();
				expect(result['IsValidForCreate']).toBe(true);
				expect(result['IsValidForUpdate']).toBe(false);
				expect(result['IsValidForRead']).toBe(true);
				expect(result['IsValidForForm']).toBe(false);
				expect(result['IsValidForGrid']).toBe(true);
				expect(result['IsSecured']).toBe(true);
				expect(result['CanBeSecuredForRead']).toBe(true);
				expect(result['CanBeSecuredForCreate']).toBe(false);
				expect(result['CanBeSecuredForUpdate']).toBe(true);
				expect(result['IsFilterable']).toBe(true);
				expect(result['IsSearchable']).toBe(false);
				expect(result['IsRetrievable']).toBe(true);
			});
		});
	});
});
