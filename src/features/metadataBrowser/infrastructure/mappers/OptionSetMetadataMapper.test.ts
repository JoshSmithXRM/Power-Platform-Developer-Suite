import { OptionSetMetadataMapper } from './OptionSetMetadataMapper';
import { OptionSetMetadata } from '../../domain/valueObjects/OptionSetMetadata';
import type {
	OptionSetMetadataDto,
	OptionMetadataDto,
	GlobalOptionSetDefinitionDto,
	LocalizedLabel
} from '../dtos/EntityMetadataDto';

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

describe('OptionSetMetadataMapper', () => {
	let mapper: OptionSetMetadataMapper;

	beforeEach(() => {
		mapper = new OptionSetMetadataMapper();
	});

	describe('mapOptionSetDtoToValueObject', () => {
		describe('priority logic', () => {
			it('should prioritize optionSetDto with options over globalOptionSetDto', () => {
				// Arrange
				const optionSetDto: OptionSetMetadataDto = {
					Name: 'statuscode',
					IsGlobal: false,
					Options: [
						{
							Value: 1,
							Label: {
								LocalizedLabels: [createLocalizedLabel('Active')],
								UserLocalizedLabel: createLocalizedLabel('Active')
							}
						}
					]
				};

				const globalOptionSetDto = {
					Name: 'global_statuscode'
				};

				// Act
				const result = mapper.mapOptionSetDtoToValueObject(optionSetDto, globalOptionSetDto);

				// Assert
				expect(result).not.toBeNull();
				expect(result!.name).toBe('statuscode');
				expect(result!.options).toHaveLength(1);
			});

			it('should use optionSetDto even with empty options when globalOptionSetDto present', () => {
				// Arrange
				const optionSetDto: OptionSetMetadataDto = {
					Name: 'statuscode',
					IsGlobal: false,
					Options: []
				};

				const globalOptionSetDto = {
					Name: 'global_statuscode'
				};

				// Act
				const result = mapper.mapOptionSetDtoToValueObject(optionSetDto, globalOptionSetDto);

				// Assert
				expect(result).not.toBeNull();
				expect(result!.name).toBe('statuscode');
				expect(result!.options).toHaveLength(0);
			});

			it('should use globalOptionSetDto as fallback when optionSetDto missing', () => {
				// Arrange
				const globalOptionSetDto = {
					Name: 'global_statuscode'
				};

				// Act
				const result = mapper.mapOptionSetDtoToValueObject(undefined, globalOptionSetDto);

				// Assert
				expect(result).not.toBeNull();
				expect(result!.name).toBe('global_statuscode');
				expect(result!.isGlobal).toBe(true);
				expect(result!.options).toHaveLength(0);
			});

			it('should return null when both optionSetDto and globalOptionSetDto missing', () => {
				// Act
				const result = mapper.mapOptionSetDtoToValueObject(undefined, undefined);

				// Assert
				expect(result).toBeNull();
			});
		});

		describe('inline option set mapping', () => {
			it('should map inline option set with all fields', () => {
				// Arrange
				const optionSetDto: OptionSetMetadataDto = {
					Name: 'statuscode',
					IsGlobal: false,
					OptionSetType: 'Picklist',
					Options: [
						{
							Value: 1,
							Label: {
								LocalizedLabels: [createLocalizedLabel('Active')],
								UserLocalizedLabel: createLocalizedLabel('Active')
							},
							Description: {
								LocalizedLabels: [createLocalizedLabel('Status is active')],
								UserLocalizedLabel: createLocalizedLabel('Status is active')
							},
							Color: '#00FF00'
						},
						{
							Value: 2,
							Label: {
								LocalizedLabels: [createLocalizedLabel('Inactive')],
								UserLocalizedLabel: createLocalizedLabel('Inactive')
							},
							Description: {
								LocalizedLabels: [createLocalizedLabel('Status is inactive')],
								UserLocalizedLabel: createLocalizedLabel('Status is inactive')
							},
							Color: '#FF0000'
						}
					]
				};

				// Act
				const result = mapper.mapOptionSetDtoToValueObject(optionSetDto, undefined);

				// Assert
				expect(result).not.toBeNull();
				expect(result!.name).toBe('statuscode');
				expect(result!.isGlobal).toBe(false);
				expect(result!.options).toHaveLength(2);
				expect(result!.options[0]!.value).toBe(1);
				expect(result!.options[0]!.label).toBe('Active');
				expect(result!.options[1]!.value).toBe(2);
				expect(result!.options[1]!.label).toBe('Inactive');
			});

			it('should handle missing Name as null', () => {
				// Arrange
				const optionSetDto: OptionSetMetadataDto = {
					IsGlobal: false,
					Options: [
						{
							Value: 1,
							Label: {
								LocalizedLabels: [createLocalizedLabel('Active')],
								UserLocalizedLabel: createLocalizedLabel('Active')
							}
						}
					]
				};

				// Act
				const result = mapper.mapOptionSetDtoToValueObject(optionSetDto, undefined);

				// Assert
				expect(result!.name).toBeNull();
			});

			it('should default IsGlobal to false when not provided', () => {
				// Arrange
				const optionSetDto: OptionSetMetadataDto = {
					Name: 'statuscode',
					Options: [
						{
							Value: 1,
							Label: {
								LocalizedLabels: [createLocalizedLabel('Active')],
								UserLocalizedLabel: createLocalizedLabel('Active')
							}
						}
					]
				};

				// Act
				const result = mapper.mapOptionSetDtoToValueObject(optionSetDto, undefined);

				// Assert
				expect(result!.isGlobal).toBe(false);
			});

			it('should handle optionSetDto with undefined Options as empty array', () => {
				// Arrange
				const optionSetDto: OptionSetMetadataDto = {
					Name: 'statuscode',
					IsGlobal: false
				};

				// Act
				const result = mapper.mapOptionSetDtoToValueObject(optionSetDto, undefined);

				// Assert
				expect(result!.options).toEqual([]);
			});
		});

		describe('global option set reference mapping', () => {
			it('should map global option set reference with empty options', () => {
				// Arrange
				const globalOptionSetDto = {
					Name: 'global_statuscode'
				};

				// Act
				const result = mapper.mapOptionSetDtoToValueObject(undefined, globalOptionSetDto);

				// Assert
				expect(result).not.toBeNull();
				expect(result!.name).toBe('global_statuscode');
				expect(result!.isGlobal).toBe(true);
				expect(result!.options).toHaveLength(0);
				expect(result!.displayName).toBeNull();
			});

			it('should handle optionSetDto with no Name and no Options as fallback', () => {
				// Arrange
				const optionSetDto: OptionSetMetadataDto = {
					IsGlobal: false
				};

				// Act
				const result = mapper.mapOptionSetDtoToValueObject(optionSetDto, undefined);

				// Assert
				expect(result).not.toBeNull();
				expect(result!.name).toBeNull();
				expect(result!.isGlobal).toBe(false);
				expect(result!.options).toEqual([]);
			});
		});
	});

	describe('mapOptionMetadataDtoToValueObject', () => {
		describe('basic option mapping', () => {
			it('should map all fields from DTO to value object', () => {
				// Arrange
				const dto: OptionMetadataDto = {
					Value: 1,
					Label: {
						LocalizedLabels: [createLocalizedLabel('Active')],
						UserLocalizedLabel: createLocalizedLabel('Active')
					},
					Description: {
						LocalizedLabels: [createLocalizedLabel('Status is active')],
						UserLocalizedLabel: createLocalizedLabel('Status is active')
					},
					Color: '#00FF00'
				};

				// Act
				const result = mapper.mapOptionMetadataDtoToValueObject(dto);

				// Assert
				expect(result.value).toBe(1);
				expect(result.label).toBe('Active');
				expect(result.description).toBe('Status is active');
				expect(result.color).toBe('#00FF00');
			});

			it('should use Value as label when Label missing', () => {
				// Arrange
				const dto: OptionMetadataDto = {
					Value: 1
				};

				// Act
				const result = mapper.mapOptionMetadataDtoToValueObject(dto);

				// Assert
				expect(result.label).toBe('1');
			});

			it('should handle missing Description as null', () => {
				// Arrange
				const dto: OptionMetadataDto = {
					Value: 1,
					Label: {
						LocalizedLabels: [createLocalizedLabel('Active')],
						UserLocalizedLabel: createLocalizedLabel('Active')
					}
				};

				// Act
				const result = mapper.mapOptionMetadataDtoToValueObject(dto);

				// Assert
				expect(result.description).toBeNull();
			});

			it('should handle missing Color as null', () => {
				// Arrange
				const dto: OptionMetadataDto = {
					Value: 1,
					Label: {
						LocalizedLabels: [createLocalizedLabel('Active')],
						UserLocalizedLabel: createLocalizedLabel('Active')
					}
				};

				// Act
				const result = mapper.mapOptionMetadataDtoToValueObject(dto);

				// Assert
				expect(result.color).toBeNull();
			});
		});

		describe('option values', () => {
			it.each([
				[0, '0'],
				[1, 'Active'],
				[100000001, 'Custom'],
				[-1, 'Inactive']
			])('should map option with value %i', (value, expectedLabel) => {
				// Arrange
				const dto: OptionMetadataDto = {
					Value: value,
					Label: {
						LocalizedLabels: [createLocalizedLabel(expectedLabel)],
						UserLocalizedLabel: createLocalizedLabel(expectedLabel)
					}
				};

				// Act
				const result = mapper.mapOptionMetadataDtoToValueObject(dto);

				// Assert
				expect(result.value).toBe(value);
				expect(result.label).toBe(expectedLabel);
			});
		});
	});

	describe('mapGlobalOptionSetDtoToValueObject', () => {
		describe('basic field mapping', () => {
			it('should map all fields from DTO to value object', () => {
				// Arrange
				const dto: GlobalOptionSetDefinitionDto = {
					MetadataId: '12345678-1234-1234-1234-123456789012',
					Name: 'statuscode',
					DisplayName: {
						LocalizedLabels: [createLocalizedLabel('Status')],
						UserLocalizedLabel: createLocalizedLabel('Status')
					},
					Description: {
						LocalizedLabels: [createLocalizedLabel('Status of the record')],
						UserLocalizedLabel: createLocalizedLabel('Status of the record')
					},
					IsCustomOptionSet: false,
					IsGlobal: true,
					IsManaged: false,
					OptionSetType: 'Picklist',
					Options: [
						{
							Value: 1,
							Label: {
								LocalizedLabels: [createLocalizedLabel('Active')],
								UserLocalizedLabel: createLocalizedLabel('Active')
							}
						},
						{
							Value: 2,
							Label: {
								LocalizedLabels: [createLocalizedLabel('Inactive')],
								UserLocalizedLabel: createLocalizedLabel('Inactive')
							}
						}
					]
				};

				// Act
				const result = mapper.mapGlobalOptionSetDtoToValueObject(dto);

				// Assert
				expect(result).toBeInstanceOf(OptionSetMetadata);
				expect(result.name).toBe('statuscode');
				expect(result.displayName).toBe('Status');
				expect(result.isGlobal).toBe(true);
				expect(result.isCustom).toBe(false);
				expect(result.options).toHaveLength(2);
			});

			it('should default IsGlobal to true when not provided', () => {
				// Arrange
				const dto: GlobalOptionSetDefinitionDto = {
					MetadataId: '12345678-1234-1234-1234-123456789012',
					Name: 'statuscode'
				};

				// Act
				const result = mapper.mapGlobalOptionSetDtoToValueObject(dto);

				// Assert
				expect(result.isGlobal).toBe(true);
			});

			it('should default IsCustomOptionSet to false when not provided', () => {
				// Arrange
				const dto: GlobalOptionSetDefinitionDto = {
					MetadataId: '12345678-1234-1234-1234-123456789012',
					Name: 'statuscode'
				};

				// Act
				const result = mapper.mapGlobalOptionSetDtoToValueObject(dto);

				// Assert
				expect(result.isCustom).toBe(false);
			});

			it('should handle missing Options as empty array', () => {
				// Arrange
				const dto: GlobalOptionSetDefinitionDto = {
					MetadataId: '12345678-1234-1234-1234-123456789012',
					Name: 'statuscode'
				};

				// Act
				const result = mapper.mapGlobalOptionSetDtoToValueObject(dto);

				// Assert
				expect(result.options).toEqual([]);
			});

			it('should handle missing DisplayName as null', () => {
				// Arrange
				const dto: GlobalOptionSetDefinitionDto = {
					MetadataId: '12345678-1234-1234-1234-123456789012',
					Name: 'statuscode'
				};

				// Act
				const result = mapper.mapGlobalOptionSetDtoToValueObject(dto);

				// Assert
				expect(result.displayName).toBeNull();
			});
		});

		describe('custom vs system option sets', () => {
			it('should identify custom global option sets', () => {
				// Arrange
				const dto: GlobalOptionSetDefinitionDto = {
					MetadataId: '12345678-1234-1234-1234-123456789012',
					Name: 'new_customoptionset',
					IsCustomOptionSet: true
				};

				// Act
				const result = mapper.mapGlobalOptionSetDtoToValueObject(dto);

				// Assert
				expect(result.isCustom).toBe(true);
			});

			it('should identify system global option sets', () => {
				// Arrange
				const dto: GlobalOptionSetDefinitionDto = {
					MetadataId: '12345678-1234-1234-1234-123456789012',
					Name: 'statuscode',
					IsCustomOptionSet: false
				};

				// Act
				const result = mapper.mapGlobalOptionSetDtoToValueObject(dto);

				// Assert
				expect(result.isCustom).toBe(false);
			});
		});

		describe('global option set with options', () => {
			it('should map all options correctly', () => {
				// Arrange
				const dto: GlobalOptionSetDefinitionDto = {
					MetadataId: '12345678-1234-1234-1234-123456789012',
					Name: 'statuscode',
					Options: [
						{
							Value: 1,
							Label: {
								LocalizedLabels: [createLocalizedLabel('Active')],
								UserLocalizedLabel: createLocalizedLabel('Active')
							},
							Color: '#00FF00'
						},
						{
							Value: 2,
							Label: {
								LocalizedLabels: [createLocalizedLabel('Inactive')],
								UserLocalizedLabel: createLocalizedLabel('Inactive')
							},
							Color: '#FF0000'
						},
						{
							Value: 3,
							Label: {
								LocalizedLabels: [createLocalizedLabel('Pending')],
								UserLocalizedLabel: createLocalizedLabel('Pending')
							},
							Color: '#FFFF00'
						}
					]
				};

				// Act
				const result = mapper.mapGlobalOptionSetDtoToValueObject(dto);

				// Assert
				expect(result.options).toHaveLength(3);
				expect(result.options[0]!.value).toBe(1);
				expect(result.options[0]!.label).toBe('Active');
				expect(result.options[0]!.color).toBe('#00FF00');
				expect(result.options[2]!.value).toBe(3);
				expect(result.options[2]!.label).toBe('Pending');
			});
		});
	});
});
