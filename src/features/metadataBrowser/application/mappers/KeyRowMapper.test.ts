import { KeyRowMapper } from './KeyRowMapper';
import { EntityKey } from '../../domain/entities/EntityKey';
import { LogicalName } from '../../domain/valueObjects/LogicalName';
import { SchemaName } from '../../domain/valueObjects/SchemaName';

describe('KeyRowMapper', () => {
	let mapper: KeyRowMapper;

	beforeEach(() => {
		mapper = new KeyRowMapper();
	});

	// Test data factory
	function createEntityKey(
		logicalName: string,
		options: Partial<Parameters<typeof EntityKey.create>[0]> = {}
	): EntityKey {
		return EntityKey.create({
			metadataId: `key-${logicalName}`,
			logicalName: LogicalName.create(logicalName),
			schemaName: SchemaName.create(logicalName.charAt(0).toUpperCase() + logicalName.slice(1)),
			displayName: logicalName.charAt(0).toUpperCase() + logicalName.slice(1),
			entityLogicalName: 'account',
			keyAttributes: ['name'],
			isManaged: false,
			...options
		});
	}

	describe('toViewModel - single key mapping', () => {
		it('should map id from logicalName', () => {
			// Arrange
			const key = createEntityKey('key_account_name');

			// Act
			const result = mapper.toViewModel(key);

			// Assert
			expect(result.id).toBe('key_account_name');
		});

		it('should map name from logicalName', () => {
			// Arrange
			const key = createEntityKey('cr_custom_key');

			// Act
			const result = mapper.toViewModel(key);

			// Assert
			expect(result.name).toBe('cr_custom_key');
		});

		it('should always set type to "Alternate"', () => {
			// Arrange
			const key = createEntityKey('key_test');

			// Act
			const result = mapper.toViewModel(key);

			// Assert
			expect(result.type).toBe('Alternate');
		});

		it('should format single keyAttribute', () => {
			// Arrange
			const key = createEntityKey('key_name', {
				keyAttributes: ['accountnumber']
			});

			// Act
			const result = mapper.toViewModel(key);

			// Assert
			expect(result.keyAttributes).toBe('accountnumber');
		});

		it('should format multiple keyAttributes with comma separator', () => {
			// Arrange
			const key = createEntityKey('key_composite', {
				keyAttributes: ['firstname', 'lastname', 'emailaddress']
			});

			// Act
			const result = mapper.toViewModel(key);

			// Assert
			expect(result.keyAttributes).toBe('firstname, lastname, emailaddress');
		});

		it('should set isLinkable to true', () => {
			// Arrange
			const key = createEntityKey('key_test');

			// Act
			const result = mapper.toViewModel(key);

			// Assert
			expect(result.isLinkable).toBe(true);
		});

		it('should include metadata reference', () => {
			// Arrange
			const key = createEntityKey('key_test');

			// Act
			const result = mapper.toViewModel(key);

			// Assert
			expect(result.metadata).toBe(key);
		});
	});

	describe('edge cases', () => {
		it('should handle keys with two attributes', () => {
			// Arrange
			const key = createEntityKey('key_two', {
				keyAttributes: ['field1', 'field2']
			});

			// Act
			const result = mapper.toViewModel(key);

			// Assert
			expect(result.keyAttributes).toBe('field1, field2');
			expect(result.metadata.isCompositeKey()).toBe(true);
		});

		it('should handle keys with many attributes', () => {
			// Arrange
			const attributes = ['attr1', 'attr2', 'attr3', 'attr4', 'attr5'];
			const key = createEntityKey('key_many', {
				keyAttributes: attributes
			});

			// Act
			const result = mapper.toViewModel(key);

			// Assert
			expect(result.keyAttributes).toBe('attr1, attr2, attr3, attr4, attr5');
		});

		it('should handle managed keys', () => {
			// Arrange
			const key = createEntityKey('key_managed', {
				isManaged: true
			});

			// Act
			const result = mapper.toViewModel(key);

			// Assert
			expect(result.metadata.isManaged).toBe(true);
			expect(result.type).toBe('Alternate');
		});

		it('should handle custom keys', () => {
			// Arrange
			const key = createEntityKey('cr_custom_key', {
				isManaged: false,
				keyAttributes: ['cr_customfield']
			});

			// Act
			const result = mapper.toViewModel(key);

			// Assert
			expect(result.name).toBe('cr_custom_key');
			expect(result.keyAttributes).toBe('cr_customfield');
		});

		it('should handle special characters in attribute names', () => {
			// Arrange
			const key = createEntityKey('key_test', {
				keyAttributes: ['cr_field_1', 'new_field_2', 'custom_field_3']
			});

			// Act
			const result = mapper.toViewModel(key);

			// Assert
			expect(result.keyAttributes).toBe('cr_field_1, new_field_2, custom_field_3');
		});

		it('should preserve id and name consistency', () => {
			// Arrange
			const key = createEntityKey('key_account');

			// Act
			const result = mapper.toViewModel(key);

			// Assert
			expect(result.id).toBe(result.name);
		});
	});
});
