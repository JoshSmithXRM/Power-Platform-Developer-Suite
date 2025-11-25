import { EntityKeyMapper } from './EntityKeyMapper';
import { EntityKey } from '../../domain/entities/EntityKey';
import type { EntityKeyDto, LocalizedLabel } from '../dtos/EntityMetadataDto';

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

describe('EntityKeyMapper', () => {
	let mapper: EntityKeyMapper;

	beforeEach(() => {
		mapper = new EntityKeyMapper();
	});

	describe('mapDtoToEntity', () => {
		describe('basic field mapping', () => {
			it('should map all required fields from DTO to domain entity', () => {
				// Arrange
				const dto: EntityKeyDto = {
					MetadataId: '12345678-1234-1234-1234-123456789012',
					LogicalName: 'accountnumber_key',
					SchemaName: 'AccountNumberKey',
					DisplayName: {
						LocalizedLabels: [createLocalizedLabel('Account Number Key')],
						UserLocalizedLabel: createLocalizedLabel('Account Number Key')
					},
					EntityLogicalName: 'account',
					KeyAttributes: ['accountnumber'],
					IsManaged: false,
					EntityKeyIndexStatus: 'Active'
				};

				// Act
				const result = mapper.mapDtoToEntity(dto);

				// Assert
				expect(result).toBeInstanceOf(EntityKey);
				expect(result.metadataId).toBe('12345678-1234-1234-1234-123456789012');
				expect(result.logicalName.getValue()).toBe('accountnumber_key');
				expect(result.schemaName.getValue()).toBe('AccountNumberKey');
				expect(result.displayName).toBe('Account Number Key');
				expect(result.entityLogicalName).toBe('account');
				expect(result.keyAttributes).toEqual(['accountnumber']);
				expect(result.isManaged).toBe(false);
				expect(result.entityKeyIndexStatus).toBe('Active');
			});

			it('should use SchemaName as displayName when DisplayName label missing', () => {
				// Arrange
				const dto: EntityKeyDto = {
					MetadataId: '12345678-1234-1234-1234-123456789012',
					LogicalName: 'accountnumber_key',
					SchemaName: 'AccountNumberKey',
					EntityLogicalName: 'account',
					KeyAttributes: ['accountnumber'],
					IsManaged: false
				};

				// Act
				const result = mapper.mapDtoToEntity(dto);

				// Assert
				expect(result.displayName).toBe('AccountNumberKey');
			});

			it('should handle missing EntityKeyIndexStatus as null', () => {
				// Arrange
				const dto: EntityKeyDto = {
					MetadataId: '12345678-1234-1234-1234-123456789012',
					LogicalName: 'accountnumber_key',
					SchemaName: 'AccountNumberKey',
					EntityLogicalName: 'account',
					KeyAttributes: ['accountnumber'],
					IsManaged: false
				};

				// Act
				const result = mapper.mapDtoToEntity(dto);

				// Assert
				expect(result.entityKeyIndexStatus).toBeNull();
			});
		});

		describe('single attribute keys', () => {
			it('should map single attribute key', () => {
				// Arrange
				const dto: EntityKeyDto = {
					MetadataId: '12345678-1234-1234-1234-123456789012',
					LogicalName: 'accountnumber_key',
					SchemaName: 'AccountNumberKey',
					EntityLogicalName: 'account',
					KeyAttributes: ['accountnumber'],
					IsManaged: false,
					EntityKeyIndexStatus: 'Active'
				};

				// Act
				const result = mapper.mapDtoToEntity(dto);

				// Assert
				expect(result.keyAttributes).toHaveLength(1);
				expect(result.keyAttributes).toContain('accountnumber');
			});
		});

		describe('composite keys', () => {
			it('should map composite key with multiple attributes', () => {
				// Arrange
				const dto: EntityKeyDto = {
					MetadataId: '12345678-1234-1234-1234-123456789012',
					LogicalName: 'name_email_key',
					SchemaName: 'NameEmailKey',
					DisplayName: {
						LocalizedLabels: [createLocalizedLabel('Name and Email Key')],
						UserLocalizedLabel: createLocalizedLabel('Name and Email Key')
					},
					EntityLogicalName: 'contact',
					KeyAttributes: ['firstname', 'lastname', 'emailaddress1'],
					IsManaged: false,
					EntityKeyIndexStatus: 'Active'
				};

				// Act
				const result = mapper.mapDtoToEntity(dto);

				// Assert
				expect(result.keyAttributes).toHaveLength(3);
				expect(result.keyAttributes).toContain('firstname');
				expect(result.keyAttributes).toContain('lastname');
				expect(result.keyAttributes).toContain('emailaddress1');
			});
		});

		describe('managed keys', () => {
			it('should identify managed keys', () => {
				// Arrange
				const dto: EntityKeyDto = {
					MetadataId: '12345678-1234-1234-1234-123456789012',
					LogicalName: 'accountnumber_key',
					SchemaName: 'AccountNumberKey',
					EntityLogicalName: 'account',
					KeyAttributes: ['accountnumber'],
					IsManaged: true,
					EntityKeyIndexStatus: 'Active'
				};

				// Act
				const result = mapper.mapDtoToEntity(dto);

				// Assert
				expect(result.isManaged).toBe(true);
			});

			it('should identify unmanaged keys', () => {
				// Arrange
				const dto: EntityKeyDto = {
					MetadataId: '12345678-1234-1234-1234-123456789012',
					LogicalName: 'new_customkey',
					SchemaName: 'new_CustomKey',
					EntityLogicalName: 'account',
					KeyAttributes: ['accountnumber'],
					IsManaged: false,
					EntityKeyIndexStatus: 'Active'
				};

				// Act
				const result = mapper.mapDtoToEntity(dto);

				// Assert
				expect(result.isManaged).toBe(false);
			});
		});

		describe('key status', () => {
			it.each([
				['Active', 'Active'],
				['Pending', 'Pending'],
				['Failed', 'Failed']
			])('should map EntityKeyIndexStatus %s', (status, expected) => {
				// Arrange
				const dto: EntityKeyDto = {
					MetadataId: '12345678-1234-1234-1234-123456789012',
					LogicalName: 'accountnumber_key',
					SchemaName: 'AccountNumberKey',
					EntityLogicalName: 'account',
					KeyAttributes: ['accountnumber'],
					IsManaged: false,
					EntityKeyIndexStatus: status
				};

				// Act
				const result = mapper.mapDtoToEntity(dto);

				// Assert
				expect(result.entityKeyIndexStatus).toBe(expected);
			});
		});

		describe('entity association', () => {
			it('should preserve entity logical name', () => {
				// Arrange
				const dto: EntityKeyDto = {
					MetadataId: '12345678-1234-1234-1234-123456789012',
					LogicalName: 'contactid_key',
					SchemaName: 'ContactIdKey',
					EntityLogicalName: 'contact',
					KeyAttributes: ['contactid'],
					IsManaged: false,
					EntityKeyIndexStatus: 'Active'
				};

				// Act
				const result = mapper.mapDtoToEntity(dto);

				// Assert
				expect(result.entityLogicalName).toBe('contact');
			});
		});
	});
});
