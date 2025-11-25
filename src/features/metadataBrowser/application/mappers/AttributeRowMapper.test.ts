import { AttributeRowMapper } from './AttributeRowMapper';
import { AttributeMetadata } from '../../domain/entities/AttributeMetadata';
import { LogicalName } from '../../domain/valueObjects/LogicalName';
import { SchemaName } from '../../domain/valueObjects/SchemaName';
import { AttributeType } from '../../domain/valueObjects/AttributeType';

describe('AttributeRowMapper', () => {
	let mapper: AttributeRowMapper;

	beforeEach(() => {
		mapper = new AttributeRowMapper();
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
		it('should map id from logicalName', () => {
			// Arrange
			const attribute = createAttribute('customfield');

			// Act
			const result = mapper.toViewModel(attribute);

			// Assert
			expect(result.id).toBe('customfield');
		});

		it('should map logicalName', () => {
			// Arrange
			const attribute = createAttribute('name');

			// Act
			const result = mapper.toViewModel(attribute);

			// Assert
			expect(result.logicalName).toBe('name');
		});

		it('should map displayName when present', () => {
			// Arrange
			const attribute = createAttribute('name', {
				displayName: 'Full Name'
			});

			// Act
			const result = mapper.toViewModel(attribute);

			// Assert
			expect(result.displayName).toBe('Full Name');
		});

		it('should fallback to logicalName when displayName is empty (defensive coding)', () => {
			// Arrange
			// Note: Domain entity prevents empty displayName, but mapper has defensive fallback.
			// We test the mapper's defensive logic by creating a mock attribute.
			const baseAttribute = createAttribute('testfield', {
				displayName: 'Original Name'
			});

			// Create a mock with empty displayName to test mapper's defensive logic
			const attributeWithEmptyDisplay = {
				...baseAttribute,
				displayName: ''
			} as AttributeMetadata;

			// Act
			const result = mapper.toViewModel(attributeWithEmptyDisplay);

			// Assert
			expect(result.displayName).toBe('testfield');
		});

		it('should map requiredLevel', () => {
			// Arrange
			const attribute = createAttribute('name', {
				requiredLevel: 'ApplicationRequired'
			});

			// Act
			const result = mapper.toViewModel(attribute);

			// Assert
			expect(result.required).toBe('ApplicationRequired');
		});

		it('should always set isLinkable to true', () => {
			// Arrange
			const attribute = createAttribute('name');

			// Act
			const result = mapper.toViewModel(attribute);

			// Assert
			expect(result.isLinkable).toBe(true);
		});

		it('should include metadata reference', () => {
			// Arrange
			const attribute = createAttribute('name');

			// Act
			const result = mapper.toViewModel(attribute);

			// Assert
			expect(result.metadata).toBe(attribute);
		});
	});

	describe('type display mapping', () => {
		it('should strip "Type" suffix from StringType', () => {
			// Arrange
			const attribute = createAttribute('name', {
				attributeType: AttributeType.create('StringType')
			});

			// Act
			const result = mapper.toViewModel(attribute);

			// Assert
			expect(result.type).toBe('String');
		});

		it('should strip "Type" suffix from IntegerType', () => {
			// Arrange
			const attribute = createAttribute('age', {
				attributeType: AttributeType.create('IntegerType')
			});

			// Act
			const result = mapper.toViewModel(attribute);

			// Assert
			expect(result.type).toBe('Integer');
		});

		it('should strip "Type" suffix from BooleanType', () => {
			// Arrange
			const attribute = createAttribute('isactive', {
				attributeType: AttributeType.create('BooleanType')
			});

			// Act
			const result = mapper.toViewModel(attribute);

			// Assert
			expect(result.type).toBe('Boolean');
		});

		it('should strip "Type" suffix from DateTimeType', () => {
			// Arrange
			const attribute = createAttribute('createdon', {
				attributeType: AttributeType.create('DateTimeType')
			});

			// Act
			const result = mapper.toViewModel(attribute);

			// Assert
			expect(result.type).toBe('DateTime');
		});

		it('should strip "Type" suffix from LookupType', () => {
			// Arrange
			const attribute = createAttribute('parentid', {
				attributeType: AttributeType.create('LookupType')
			});

			// Act
			const result = mapper.toViewModel(attribute);

			// Assert
			expect(result.type).toBe('Lookup');
		});

		it('should strip "Type" suffix from PicklistType', () => {
			// Arrange
			const attribute = createAttribute('statuscode', {
				attributeType: AttributeType.create('PicklistType')
			});

			// Act
			const result = mapper.toViewModel(attribute);

			// Assert
			expect(result.type).toBe('Picklist');
		});

		it('should handle type without "Type" suffix', () => {
			// Arrange
			const attribute = createAttribute('name', {
				attributeType: AttributeType.create('String')
			});

			// Act
			const result = mapper.toViewModel(attribute);

			// Assert
			expect(result.type).toBe('String');
		});
	});

	describe('maxLength mapping', () => {
		it('should format maxLength as string when present', () => {
			// Arrange
			const attribute = createAttribute('description', {
				maxLength: 500
			});

			// Act
			const result = mapper.toViewModel(attribute);

			// Assert
			expect(result.maxLength).toBe('500');
		});

		it('should show "-" when maxLength is null', () => {
			// Arrange
			const attribute = createAttribute('name', {
				maxLength: null
			});

			// Act
			const result = mapper.toViewModel(attribute);

			// Assert
			expect(result.maxLength).toBe('-');
		});

		it('should format zero maxLength as "0"', () => {
			// Arrange
			const attribute = createAttribute('test', {
				maxLength: 0
			});

			// Act
			const result = mapper.toViewModel(attribute);

			// Assert
			expect(result.maxLength).toBe('0');
		});

		it('should format large maxLength', () => {
			// Arrange
			const attribute = createAttribute('notes', {
				maxLength: 1000000
			});

			// Act
			const result = mapper.toViewModel(attribute);

			// Assert
			expect(result.maxLength).toBe('1000000');
		});
	});

	describe('required level mapping', () => {
		it('should map None', () => {
			// Arrange
			const attribute = createAttribute('description', {
				requiredLevel: 'None'
			});

			// Act
			const result = mapper.toViewModel(attribute);

			// Assert
			expect(result.required).toBe('None');
		});

		it('should map SystemRequired', () => {
			// Arrange
			const attribute = createAttribute('accountid', {
				requiredLevel: 'SystemRequired'
			});

			// Act
			const result = mapper.toViewModel(attribute);

			// Assert
			expect(result.required).toBe('SystemRequired');
		});

		it('should map ApplicationRequired', () => {
			// Arrange
			const attribute = createAttribute('name', {
				requiredLevel: 'ApplicationRequired'
			});

			// Act
			const result = mapper.toViewModel(attribute);

			// Assert
			expect(result.required).toBe('ApplicationRequired');
		});

		it('should map Recommended', () => {
			// Arrange
			const attribute = createAttribute('email', {
				requiredLevel: 'Recommended'
			});

			// Act
			const result = mapper.toViewModel(attribute);

			// Assert
			expect(result.required).toBe('Recommended');
		});
	});

	describe('edge cases', () => {
		it('should handle special characters in displayName', () => {
			// Arrange
			const attribute = createAttribute('test', {
				displayName: 'Test & Field <Special>'
			});

			// Act
			const result = mapper.toViewModel(attribute);

			// Assert
			expect(result.displayName).toBe('Test & Field <Special>');
		});

		it('should handle very long displayName', () => {
			// Arrange
			const longName = 'A'.repeat(200);
			const attribute = createAttribute('test', {
				displayName: longName
			});

			// Act
			const result = mapper.toViewModel(attribute);

			// Assert
			expect(result.displayName).toBe(longName);
		});

		it('should handle custom attributes with cr_ prefix', () => {
			// Arrange
			const attribute = createAttribute('cr_customfield', {
				isCustomAttribute: true,
				displayName: 'Custom Field'
			});

			// Act
			const result = mapper.toViewModel(attribute);

			// Assert
			expect(result.logicalName).toBe('cr_customfield');
			expect(result.displayName).toBe('Custom Field');
		});

		it('should handle custom attributes with new_ prefix', () => {
			// Arrange
			const attribute = createAttribute('new_customfield', {
				isCustomAttribute: true,
				displayName: 'New Field'
			});

			// Act
			const result = mapper.toViewModel(attribute);

			// Assert
			expect(result.logicalName).toBe('new_customfield');
			expect(result.displayName).toBe('New Field');
		});

		it('should preserve id and logicalName consistency', () => {
			// Arrange
			const attribute = createAttribute('name');

			// Act
			const result = mapper.toViewModel(attribute);

			// Assert
			expect(result.id).toBe(result.logicalName);
		});

		it('should handle all attribute types', () => {
			// Arrange
			const types = [
				'StringType',
				'IntegerType',
				'BooleanType',
				'DateTimeType',
				'LookupType',
				'PicklistType',
				'DecimalType',
				'MoneyType',
				'MemoType'
			];
			const attributes = types.map((type, index) =>
				createAttribute(`field${index}`, {
					attributeType: AttributeType.create(type)
				})
			);

			// Act
			const results = attributes.map(attr => mapper.toViewModel(attr));

			// Assert
			results.forEach((result, index) => {
				const expectedType = types[index]?.replace(/Type$/, '') ?? '';
				expect(result.type).toBe(expectedType);
			});
		});

		it('should handle metadata reference for complex attributes', () => {
			// Arrange
			const attribute = createAttribute('parentid', {
				attributeType: AttributeType.create('LookupType'),
				targets: ['account', 'contact'],
				requiredLevel: 'ApplicationRequired',
				maxLength: null
			});

			// Act
			const result = mapper.toViewModel(attribute);

			// Assert
			expect(result.metadata).toBe(attribute);
			expect(result.metadata.targets).toEqual(['account', 'contact']);
			expect(result.metadata.requiredLevel).toBe('ApplicationRequired');
		});
	});
});
