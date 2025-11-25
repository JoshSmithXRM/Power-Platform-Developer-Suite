import { EntityAttributeMapper } from './EntityAttributeMapper';
import { AttributeMetadata } from '../../domain/entities/AttributeMetadata';
import { LogicalName } from '../../domain/valueObjects/LogicalName';
import { SchemaName } from '../../domain/valueObjects/SchemaName';
import { AttributeType } from '../../domain/valueObjects/AttributeType';

describe('EntityAttributeMapper', () => {
	let mapper: EntityAttributeMapper;

	beforeEach(() => {
		mapper = new EntityAttributeMapper();
	});

	// Test data factory
	function createAttribute(
		logicalName: string,
		options: Partial<Parameters<typeof AttributeMetadata.create>[0]> = {}
	): AttributeMetadata {
		return AttributeMetadata.create({
			metadataId: `attr-${logicalName}`,
			logicalName: LogicalName.create(logicalName),
			schemaName: SchemaName.create(logicalName.charAt(0).toUpperCase() + logicalName.slice(1)),
			displayName: logicalName.charAt(0).toUpperCase() + logicalName.slice(1),
			description: null,
			attributeType: AttributeType.create('StringType'),
			isCustomAttribute: false,
			isManaged: true,
			isPrimaryId: false,
			isPrimaryName: false,
			requiredLevel: 'None',
			...options
		});
	}

	describe('toViewModel - single attribute mapping', () => {
		it('should map logicalName', () => {
			// Arrange
			const attribute = createAttribute('customfield');

			// Act
			const result = mapper.toViewModel(attribute);

			// Assert
			expect(result.logicalName).toBe('customfield');
		});

		it('should map displayName', () => {
			// Arrange
			const attribute = createAttribute('name', {
				displayName: 'Full Name'
			});

			// Act
			const result = mapper.toViewModel(attribute);

			// Assert
			expect(result.displayName).toBe('Full Name');
		});

		it('should map schemaName', () => {
			// Arrange
			const attribute = createAttribute('name', {
				schemaName: SchemaName.create('cr_CustomName')
			});

			// Act
			const result = mapper.toViewModel(attribute);

			// Assert
			expect(result.schemaName).toBe('cr_CustomName');
		});

		it('should map attributeType', () => {
			// Arrange
			const attribute = createAttribute('age', {
				attributeType: AttributeType.create('IntegerType')
			});

			// Act
			const result = mapper.toViewModel(attribute);

			// Assert
			expect(result.attributeType).toBe('IntegerType');
		});

		it('should map requiredLevel', () => {
			// Arrange
			const attribute = createAttribute('name', {
				requiredLevel: 'ApplicationRequired'
			});

			// Act
			const result = mapper.toViewModel(attribute);

			// Assert
			expect(result.requiredLevel).toBe('ApplicationRequired');
		});

		it('should map isCustomAttribute when true', () => {
			// Arrange
			const attribute = createAttribute('cr_custom', {
				isCustomAttribute: true
			});

			// Act
			const result = mapper.toViewModel(attribute);

			// Assert
			expect(result.isCustomAttribute).toBe(true);
		});

		it('should map isCustomAttribute when false', () => {
			// Arrange
			const attribute = createAttribute('name', {
				isCustomAttribute: false
			});

			// Act
			const result = mapper.toViewModel(attribute);

			// Assert
			expect(result.isCustomAttribute).toBe(false);
		});

		it('should map isPrimaryId when true', () => {
			// Arrange
			const attribute = createAttribute('accountid', {
				isPrimaryId: true
			});

			// Act
			const result = mapper.toViewModel(attribute);

			// Assert
			expect(result.isPrimaryId).toBe(true);
		});

		it('should map isPrimaryName when true', () => {
			// Arrange
			const attribute = createAttribute('name', {
				isPrimaryName: true
			});

			// Act
			const result = mapper.toViewModel(attribute);

			// Assert
			expect(result.isPrimaryName).toBe(true);
		});

		it('should map maxLength when present', () => {
			// Arrange
			const attribute = createAttribute('description', {
				maxLength: 500
			});

			// Act
			const result = mapper.toViewModel(attribute);

			// Assert
			expect(result.maxLength).toBe(500);
		});

		it('should map maxLength when null', () => {
			// Arrange
			const attribute = createAttribute('name', {
				maxLength: null
			});

			// Act
			const result = mapper.toViewModel(attribute);

			// Assert
			expect(result.maxLength).toBeNull();
		});

		it('should map targets when present', () => {
			// Arrange
			const attribute = createAttribute('parentaccountid', {
				attributeType: AttributeType.create('LookupType'),
				targets: ['account', 'contact']
			});

			// Act
			const result = mapper.toViewModel(attribute);

			// Assert
			expect(result.targets).toEqual(['account', 'contact']);
		});

		it('should map targets when null', () => {
			// Arrange
			const attribute = createAttribute('name', {
				targets: null
			});

			// Act
			const result = mapper.toViewModel(attribute);

			// Assert
			expect(result.targets).toBeNull();
		});

		it('should call isRequired() method', () => {
			// Arrange
			const attribute = createAttribute('name', {
				requiredLevel: 'ApplicationRequired'
			});

			// Act
			const result = mapper.toViewModel(attribute);

			// Assert
			expect(result.isRequired).toBe(true);
		});

		it('should return false for isRequired when None', () => {
			// Arrange
			const attribute = createAttribute('description', {
				requiredLevel: 'None'
			});

			// Act
			const result = mapper.toViewModel(attribute);

			// Assert
			expect(result.isRequired).toBe(false);
		});
	});

	describe('attribute type display mapping', () => {
		it('should map String (no suffix) to "Single Line of Text"', () => {
			// Arrange
			const attribute = createAttribute('name', {
				attributeType: AttributeType.create('String')
			});

			// Act
			const result = mapper.toViewModel(attribute);

			// Assert
			expect(result.attributeTypeDisplay).toBe('Single Line of Text');
		});

		it('should return StringType as-is when Type suffix is present', () => {
			// Arrange
			const attribute = createAttribute('name', {
				attributeType: AttributeType.create('StringType')
			});

			// Act
			const result = mapper.toViewModel(attribute);

			// Assert
			expect(result.attributeTypeDisplay).toBe('StringType');
		});

		it('should map Memo (no suffix) to "Multiple Lines of Text"', () => {
			// Arrange
			const attribute = createAttribute('description', {
				attributeType: AttributeType.create('Memo')
			});

			// Act
			const result = mapper.toViewModel(attribute);

			// Assert
			expect(result.attributeTypeDisplay).toBe('Multiple Lines of Text');
		});

		it('should map Integer (no suffix) to "Whole Number"', () => {
			// Arrange
			const attribute = createAttribute('age', {
				attributeType: AttributeType.create('Integer')
			});

			// Act
			const result = mapper.toViewModel(attribute);

			// Assert
			expect(result.attributeTypeDisplay).toBe('Whole Number');
		});

		it('should map Decimal (no suffix) to "Decimal Number"', () => {
			// Arrange
			const attribute = createAttribute('amount', {
				attributeType: AttributeType.create('Decimal')
			});

			// Act
			const result = mapper.toViewModel(attribute);

			// Assert
			expect(result.attributeTypeDisplay).toBe('Decimal Number');
		});

		it('should map Money (no suffix) to "Currency"', () => {
			// Arrange
			const attribute = createAttribute('revenue', {
				attributeType: AttributeType.create('Money')
			});

			// Act
			const result = mapper.toViewModel(attribute);

			// Assert
			expect(result.attributeTypeDisplay).toBe('Currency');
		});

		it('should map Boolean (no suffix) to "Yes/No"', () => {
			// Arrange
			const attribute = createAttribute('isactive', {
				attributeType: AttributeType.create('Boolean')
			});

			// Act
			const result = mapper.toViewModel(attribute);

			// Assert
			expect(result.attributeTypeDisplay).toBe('Yes/No');
		});

		it('should map DateTime (no suffix) to "Date and Time"', () => {
			// Arrange
			const attribute = createAttribute('createdon', {
				attributeType: AttributeType.create('DateTime')
			});

			// Act
			const result = mapper.toViewModel(attribute);

			// Assert
			expect(result.attributeTypeDisplay).toBe('Date and Time');
		});

		it('should map Lookup (no suffix) to "Lookup"', () => {
			// Arrange
			const attribute = createAttribute('parentaccountid', {
				attributeType: AttributeType.create('Lookup')
			});

			// Act
			const result = mapper.toViewModel(attribute);

			// Assert
			expect(result.attributeTypeDisplay).toBe('Lookup');
		});

		it('should map Picklist (no suffix) to "Choice"', () => {
			// Arrange
			const attribute = createAttribute('statuscode', {
				attributeType: AttributeType.create('Picklist')
			});

			// Act
			const result = mapper.toViewModel(attribute);

			// Assert
			expect(result.attributeTypeDisplay).toBe('Choice');
		});

		it('should return unknown attribute type as-is (fallback)', () => {
			// Arrange - BigIntType is valid but not in mapper's display map
			const attribute = createAttribute('custom', {
				attributeType: AttributeType.create('BigIntType')
			});

			// Act
			const result = mapper.toViewModel(attribute);

			// Assert
			expect(result.attributeTypeDisplay).toBe('BigIntType');
		});
	});

	describe('required level display mapping', () => {
		it('should map None to "Optional"', () => {
			// Arrange
			const attribute = createAttribute('description', {
				requiredLevel: 'None'
			});

			// Act
			const result = mapper.toViewModel(attribute);

			// Assert
			expect(result.requiredLevelDisplay).toBe('Optional');
		});

		it('should map SystemRequired to "System Required"', () => {
			// Arrange
			const attribute = createAttribute('accountid', {
				requiredLevel: 'SystemRequired'
			});

			// Act
			const result = mapper.toViewModel(attribute);

			// Assert
			expect(result.requiredLevelDisplay).toBe('System Required');
		});

		it('should map ApplicationRequired to "Business Required"', () => {
			// Arrange
			const attribute = createAttribute('name', {
				requiredLevel: 'ApplicationRequired'
			});

			// Act
			const result = mapper.toViewModel(attribute);

			// Assert
			expect(result.requiredLevelDisplay).toBe('Business Required');
		});

		it('should map Recommended to "Business Recommended"', () => {
			// Arrange
			const attribute = createAttribute('email', {
				requiredLevel: 'Recommended'
			});

			// Act
			const result = mapper.toViewModel(attribute);

			// Assert
			expect(result.requiredLevelDisplay).toBe('Business Recommended');
		});

		it('should return unknown required level as-is (fallback)', () => {
			// Arrange
			const attribute = createAttribute('custom', {
				requiredLevel: 'CustomLevel' as unknown as 'None' | 'SystemRequired' | 'ApplicationRequired' | 'Recommended'
			});

			// Act
			const result = mapper.toViewModel(attribute);

			// Assert
			expect(result.requiredLevelDisplay).toBe('CustomLevel');
		});
	});

	describe('toViewModels - collection mapping', () => {
		it('should map multiple attributes', () => {
			// Arrange
			const attributes = [
				createAttribute('name'),
				createAttribute('description'),
				createAttribute('age')
			];

			// Act
			const result = mapper.toViewModels(attributes);

			// Assert
			expect(result).toHaveLength(3);
			expect(result[0]?.logicalName).toBe('name');
			expect(result[1]?.logicalName).toBe('description');
			expect(result[2]?.logicalName).toBe('age');
		});

		it('should handle empty array', () => {
			// Arrange
			const attributes: AttributeMetadata[] = [];

			// Act
			const result = mapper.toViewModels(attributes);

			// Assert
			expect(result).toHaveLength(0);
		});

		it('should handle single attribute', () => {
			// Arrange
			const attributes = [createAttribute('name')];

			// Act
			const result = mapper.toViewModels(attributes);

			// Assert
			expect(result).toHaveLength(1);
			expect(result[0]?.logicalName).toBe('name');
		});

		it('should preserve all properties in collection', () => {
			// Arrange
			const attributes = [
				createAttribute('accountid', {
					isPrimaryId: true,
					requiredLevel: 'SystemRequired'
				}),
				createAttribute('name', {
					isPrimaryName: true,
					requiredLevel: 'ApplicationRequired',
					maxLength: 100
				})
			];

			// Act
			const result = mapper.toViewModels(attributes);

			// Assert
			expect(result[0]?.isPrimaryId).toBe(true);
			expect(result[0]?.requiredLevelDisplay).toBe('System Required');
			expect(result[1]?.isPrimaryName).toBe(true);
			expect(result[1]?.requiredLevelDisplay).toBe('Business Required');
			expect(result[1]?.maxLength).toBe(100);
		});
	});

	describe('edge cases', () => {
		it('should handle special characters in names', () => {
			// Arrange
			const attribute = createAttribute('cr_test', {
				displayName: 'Test & Field <Special>',
				schemaName: SchemaName.create('cr_TestField')
			});

			// Act
			const result = mapper.toViewModel(attribute);

			// Assert
			expect(result.displayName).toBe('Test & Field <Special>');
			expect(result.logicalName).toBe('cr_test');
			expect(result.schemaName).toBe('cr_TestField');
		});

		it('should handle large collections', () => {
			// Arrange
			const attributes = Array.from({ length: 100 }, (_, i) =>
				createAttribute(`field${i}`)
			);

			// Act
			const result = mapper.toViewModels(attributes);

			// Assert
			expect(result).toHaveLength(100);
			expect(result[0]?.logicalName).toBe('field0');
			expect(result[99]?.logicalName).toBe('field99');
		});

		it('should handle mixed attribute types with Type suffix', () => {
			// Arrange
			const attributes = [
				createAttribute('name', { attributeType: AttributeType.create('StringType') }),
				createAttribute('age', { attributeType: AttributeType.create('IntegerType') }),
				createAttribute('isactive', { attributeType: AttributeType.create('BooleanType') }),
				createAttribute('parentid', { attributeType: AttributeType.create('LookupType') })
			];

			// Act
			const result = mapper.toViewModels(attributes);

			// Assert
			expect(result[0]?.attributeTypeDisplay).toBe('StringType');
			expect(result[1]?.attributeTypeDisplay).toBe('IntegerType');
			expect(result[2]?.attributeTypeDisplay).toBe('BooleanType');
			expect(result[3]?.attributeTypeDisplay).toBe('LookupType');
		});

		it('should handle mixed attribute types without Type suffix', () => {
			// Arrange
			const attributes = [
				createAttribute('name', { attributeType: AttributeType.create('String') }),
				createAttribute('age', { attributeType: AttributeType.create('Integer') }),
				createAttribute('isactive', { attributeType: AttributeType.create('Boolean') }),
				createAttribute('parentid', { attributeType: AttributeType.create('Lookup') })
			];

			// Act
			const result = mapper.toViewModels(attributes);

			// Assert
			expect(result[0]?.attributeTypeDisplay).toBe('Single Line of Text');
			expect(result[1]?.attributeTypeDisplay).toBe('Whole Number');
			expect(result[2]?.attributeTypeDisplay).toBe('Yes/No');
			expect(result[3]?.attributeTypeDisplay).toBe('Lookup');
		});

		it('should handle all required levels', () => {
			// Arrange
			const attributes = [
				createAttribute('optional', { requiredLevel: 'None' }),
				createAttribute('system', { requiredLevel: 'SystemRequired' }),
				createAttribute('business', { requiredLevel: 'ApplicationRequired' }),
				createAttribute('recommended', { requiredLevel: 'Recommended' })
			];

			// Act
			const result = mapper.toViewModels(attributes);

			// Assert
			expect(result[0]?.requiredLevelDisplay).toBe('Optional');
			expect(result[1]?.requiredLevelDisplay).toBe('System Required');
			expect(result[2]?.requiredLevelDisplay).toBe('Business Required');
			expect(result[3]?.requiredLevelDisplay).toBe('Business Recommended');
		});
	});
});
