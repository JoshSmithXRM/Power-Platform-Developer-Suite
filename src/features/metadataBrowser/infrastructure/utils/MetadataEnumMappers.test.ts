import { MetadataEnumMappers } from './MetadataEnumMappers';
import { CascadeType } from '../../domain/valueObjects/CascadeConfiguration';

describe('MetadataEnumMappers', () => {
	describe('mapOwnershipType', () => {
		describe('valid ownership types', () => {
			it('should map UserOwned string to UserOwned', () => {
				// Arrange
				const ownershipType = 'UserOwned';

				// Act
				const result = MetadataEnumMappers.mapOwnershipType(ownershipType);

				// Assert
				expect(result).toBe('UserOwned');
			});

			it('should map OrganizationOwned string to OrganizationOwned', () => {
				// Arrange
				const ownershipType = 'OrganizationOwned';

				// Act
				const result = MetadataEnumMappers.mapOwnershipType(ownershipType);

				// Assert
				expect(result).toBe('OrganizationOwned');
			});

			it('should map TeamOwned string to TeamOwned', () => {
				// Arrange
				const ownershipType = 'TeamOwned';

				// Act
				const result = MetadataEnumMappers.mapOwnershipType(ownershipType);

				// Assert
				expect(result).toBe('TeamOwned');
			});
		});

		describe('invalid and unknown values', () => {
			it('should return None for unknown ownership type string', () => {
				// Arrange
				const ownershipType = 'UnknownOwnership';

				// Act
				const result = MetadataEnumMappers.mapOwnershipType(ownershipType);

				// Assert
				expect(result).toBe('None');
			});

			it('should return None for empty string', () => {
				// Arrange
				const ownershipType = '';

				// Act
				const result = MetadataEnumMappers.mapOwnershipType(ownershipType);

				// Assert
				expect(result).toBe('None');
			});

			it('should return None for case-sensitive mismatch (lowercase)', () => {
				// Arrange
				const ownershipType = 'userowned';

				// Act
				const result = MetadataEnumMappers.mapOwnershipType(ownershipType);

				// Assert
				expect(result).toBe('None');
			});

			it('should return None for case-sensitive mismatch (uppercase)', () => {
				// Arrange
				const ownershipType = 'USEROWNED';

				// Act
				const result = MetadataEnumMappers.mapOwnershipType(ownershipType);

				// Assert
				expect(result).toBe('None');
			});

			it('should return None for partial match', () => {
				// Arrange
				const ownershipType = 'UserOwn';

				// Act
				const result = MetadataEnumMappers.mapOwnershipType(ownershipType);

				// Assert
				expect(result).toBe('None');
			});

			it('should return None for string with whitespace', () => {
				// Arrange
				const ownershipType = ' UserOwned ';

				// Act
				const result = MetadataEnumMappers.mapOwnershipType(ownershipType);

				// Assert
				expect(result).toBe('None');
			});

			it('should return None for special characters', () => {
				// Arrange
				const ownershipType = 'UserOwned!@#';

				// Act
				const result = MetadataEnumMappers.mapOwnershipType(ownershipType);

				// Assert
				expect(result).toBe('None');
			});
		});

		describe('null and undefined inputs', () => {
			it('should return None for undefined', () => {
				// Arrange
				const ownershipType = undefined;

				// Act
				const result = MetadataEnumMappers.mapOwnershipType(ownershipType);

				// Assert
				expect(result).toBe('None');
			});

			it('should handle undefined without throwing', () => {
				// Act & Assert
				expect(() => MetadataEnumMappers.mapOwnershipType(undefined)).not.toThrow();
			});

			it('should return consistent default for null-like scenarios', () => {
				// Arrange
				const inputs = [undefined, '', 'InvalidType'];

				// Act
				const results = inputs.map(input => MetadataEnumMappers.mapOwnershipType(input));

				// Assert
				results.forEach(result => {
					expect(result).toBe('None');
				});
			});
		});

		describe('return type correctness', () => {
			it('should return one of the valid ownership types', () => {
				// Arrange
				const validTypes = ['UserOwned', 'OrganizationOwned', 'TeamOwned', 'None'];
				const inputs = ['UserOwned', 'OrganizationOwned', 'TeamOwned', 'Unknown'];

				// Act
				const results = inputs.map(input => MetadataEnumMappers.mapOwnershipType(input));

				// Assert
				results.forEach(result => {
					expect(validTypes).toContain(result);
				});
			});
		});
	});

	describe('mapRequiredLevel', () => {
		describe('valid required levels', () => {
			it('should map None string to None', () => {
				// Arrange
				const requiredLevel = 'None';

				// Act
				const result = MetadataEnumMappers.mapRequiredLevel(requiredLevel);

				// Assert
				expect(result).toBe('None');
			});

			it('should map SystemRequired string to SystemRequired', () => {
				// Arrange
				const requiredLevel = 'SystemRequired';

				// Act
				const result = MetadataEnumMappers.mapRequiredLevel(requiredLevel);

				// Assert
				expect(result).toBe('SystemRequired');
			});

			it('should map ApplicationRequired string to ApplicationRequired', () => {
				// Arrange
				const requiredLevel = 'ApplicationRequired';

				// Act
				const result = MetadataEnumMappers.mapRequiredLevel(requiredLevel);

				// Assert
				expect(result).toBe('ApplicationRequired');
			});

			it('should map Recommended string to Recommended', () => {
				// Arrange
				const requiredLevel = 'Recommended';

				// Act
				const result = MetadataEnumMappers.mapRequiredLevel(requiredLevel);

				// Assert
				expect(result).toBe('Recommended');
			});

			it('should map all valid required levels correctly', () => {
				// Arrange
				const validMappings: Array<[string, ReturnType<typeof MetadataEnumMappers.mapRequiredLevel>]> = [
					['None', 'None'],
					['SystemRequired', 'SystemRequired'],
					['ApplicationRequired', 'ApplicationRequired'],
					['Recommended', 'Recommended']
				];

				// Act & Assert
				validMappings.forEach(([input, expected]) => {
					const result = MetadataEnumMappers.mapRequiredLevel(input);
					expect(result).toBe(expected);
				});
			});
		});

		describe('invalid and unknown values', () => {
			it('should return None for unknown required level', () => {
				// Arrange
				const requiredLevel = 'UnknownLevel';

				// Act
				const result = MetadataEnumMappers.mapRequiredLevel(requiredLevel);

				// Assert
				expect(result).toBe('None');
			});

			it('should return None for empty string', () => {
				// Arrange
				const requiredLevel = '';

				// Act
				const result = MetadataEnumMappers.mapRequiredLevel(requiredLevel);

				// Assert
				expect(result).toBe('None');
			});

			it('should return None for case-sensitive mismatch (lowercase)', () => {
				// Arrange
				const requiredLevel = 'systemrequired';

				// Act
				const result = MetadataEnumMappers.mapRequiredLevel(requiredLevel);

				// Assert
				expect(result).toBe('None');
			});

			it('should return None for case-sensitive mismatch (uppercase)', () => {
				// Arrange
				const requiredLevel = 'SYSTEMREQUIRED';

				// Act
				const result = MetadataEnumMappers.mapRequiredLevel(requiredLevel);

				// Assert
				expect(result).toBe('None');
			});

			it('should return None for partial match', () => {
				// Arrange
				const requiredLevel = 'System';

				// Act
				const result = MetadataEnumMappers.mapRequiredLevel(requiredLevel);

				// Assert
				expect(result).toBe('None');
			});

			it('should return None for string with leading/trailing whitespace', () => {
				// Arrange
				const requiredLevel = ' SystemRequired ';

				// Act
				const result = MetadataEnumMappers.mapRequiredLevel(requiredLevel);

				// Assert
				expect(result).toBe('None');
			});

			it('should return None for numeric strings', () => {
				// Arrange
				const requiredLevel = '0';

				// Act
				const result = MetadataEnumMappers.mapRequiredLevel(requiredLevel);

				// Assert
				expect(result).toBe('None');
			});
		});

		describe('null and undefined inputs', () => {
			it('should return None for undefined', () => {
				// Arrange
				const requiredLevel = undefined;

				// Act
				const result = MetadataEnumMappers.mapRequiredLevel(requiredLevel);

				// Assert
				expect(result).toBe('None');
			});

			it('should handle undefined without throwing', () => {
				// Act & Assert
				expect(() => MetadataEnumMappers.mapRequiredLevel(undefined)).not.toThrow();
			});

			it('should return consistent default for null-like scenarios', () => {
				// Arrange
				const inputs = [undefined, '', 'InvalidLevel'];

				// Act
				const results = inputs.map(input => MetadataEnumMappers.mapRequiredLevel(input));

				// Assert
				results.forEach(result => {
					expect(result).toBe('None');
				});
			});
		});

		describe('return type correctness', () => {
			it('should return one of the valid required levels', () => {
				// Arrange
				const validTypes = ['None', 'SystemRequired', 'ApplicationRequired', 'Recommended'];
				const inputs = ['None', 'SystemRequired', 'ApplicationRequired', 'Recommended', 'Unknown'];

				// Act
				const results = inputs.map(input => MetadataEnumMappers.mapRequiredLevel(input));

				// Assert
				results.forEach(result => {
					expect(validTypes).toContain(result);
				});
			});
		});
	});

	describe('mapCascadeType', () => {
		describe('valid cascade types', () => {
			it('should map Cascade string to Cascade', () => {
				// Arrange
				const cascadeType = 'Cascade';

				// Act
				const result = MetadataEnumMappers.mapCascadeType(cascadeType);

				// Assert
				expect(result).toBe('Cascade');
			});

			it('should map NoCascade string to NoCascade', () => {
				// Arrange
				const cascadeType = 'NoCascade';

				// Act
				const result = MetadataEnumMappers.mapCascadeType(cascadeType);

				// Assert
				expect(result).toBe('NoCascade');
			});

			it('should map Active string to Active', () => {
				// Arrange
				const cascadeType = 'Active';

				// Act
				const result = MetadataEnumMappers.mapCascadeType(cascadeType);

				// Assert
				expect(result).toBe('Active');
			});

			it('should map UserOwned string to UserOwned', () => {
				// Arrange
				const cascadeType = 'UserOwned';

				// Act
				const result = MetadataEnumMappers.mapCascadeType(cascadeType);

				// Assert
				expect(result).toBe('UserOwned');
			});

			it('should map RemoveLink string to RemoveLink', () => {
				// Arrange
				const cascadeType = 'RemoveLink';

				// Act
				const result = MetadataEnumMappers.mapCascadeType(cascadeType);

				// Assert
				expect(result).toBe('RemoveLink');
			});

			it('should map Restrict string to Restrict', () => {
				// Arrange
				const cascadeType = 'Restrict';

				// Act
				const result = MetadataEnumMappers.mapCascadeType(cascadeType);

				// Assert
				expect(result).toBe('Restrict');
			});

			it('should map all valid cascade types correctly', () => {
				// Arrange
				const validMappings: Array<[string, CascadeType]> = [
					['Cascade', 'Cascade'],
					['NoCascade', 'NoCascade'],
					['Active', 'Active'],
					['UserOwned', 'UserOwned'],
					['RemoveLink', 'RemoveLink'],
					['Restrict', 'Restrict']
				];

				// Act & Assert
				validMappings.forEach(([input, expected]) => {
					const result = MetadataEnumMappers.mapCascadeType(input);
					expect(result).toBe(expected);
				});
			});
		});

		describe('invalid and unknown values', () => {
			it('should return NoCascade for unknown cascade type', () => {
				// Arrange
				const cascadeType = 'UnknownCascade';

				// Act
				const result = MetadataEnumMappers.mapCascadeType(cascadeType);

				// Assert
				expect(result).toBe('NoCascade');
			});

			it('should return NoCascade for empty string', () => {
				// Arrange
				const cascadeType = '';

				// Act
				const result = MetadataEnumMappers.mapCascadeType(cascadeType);

				// Assert
				expect(result).toBe('NoCascade');
			});

			it('should return NoCascade for case-sensitive mismatch (lowercase)', () => {
				// Arrange
				const cascadeType = 'cascade';

				// Act
				const result = MetadataEnumMappers.mapCascadeType(cascadeType);

				// Assert
				expect(result).toBe('NoCascade');
			});

			it('should return NoCascade for case-sensitive mismatch (uppercase)', () => {
				// Arrange
				const cascadeType = 'CASCADE';

				// Act
				const result = MetadataEnumMappers.mapCascadeType(cascadeType);

				// Assert
				expect(result).toBe('NoCascade');
			});

			it('should return NoCascade for partial match', () => {
				// Arrange
				const cascadeType = 'Casc';

				// Act
				const result = MetadataEnumMappers.mapCascadeType(cascadeType);

				// Assert
				expect(result).toBe('NoCascade');
			});

			it('should return NoCascade for string with whitespace', () => {
				// Arrange
				const cascadeType = ' Cascade ';

				// Act
				const result = MetadataEnumMappers.mapCascadeType(cascadeType);

				// Assert
				expect(result).toBe('NoCascade');
			});

			it('should return NoCascade for numeric strings', () => {
				// Arrange
				const cascadeType = '0';

				// Act
				const result = MetadataEnumMappers.mapCascadeType(cascadeType);

				// Assert
				expect(result).toBe('NoCascade');
			});

			it('should return NoCascade for special characters', () => {
				// Arrange
				const cascadeType = 'Cascade!@#';

				// Act
				const result = MetadataEnumMappers.mapCascadeType(cascadeType);

				// Assert
				expect(result).toBe('NoCascade');
			});
		});

		describe('null and undefined inputs', () => {
			it('should return NoCascade for undefined', () => {
				// Arrange
				const cascadeType = undefined as unknown as string;

				// Act
				const result = MetadataEnumMappers.mapCascadeType(cascadeType);

				// Assert
				expect(result).toBe('NoCascade');
			});

			it('should handle null-like values gracefully', () => {
				// Act & Assert
				expect(() => MetadataEnumMappers.mapCascadeType(undefined as unknown as string)).not.toThrow();
			});
		});

		describe('return type correctness', () => {
			it('should always return a valid CascadeType', () => {
				// Arrange
				const validCascadeTypes: CascadeType[] = ['NoCascade', 'Cascade', 'Active', 'UserOwned', 'RemoveLink', 'Restrict'];
				const inputs = ['Cascade', 'NoCascade', 'Active', 'UserOwned', 'RemoveLink', 'Restrict', 'Unknown', ''];

				// Act
				const results = inputs.map(input => MetadataEnumMappers.mapCascadeType(input));

				// Assert
				results.forEach(result => {
					expect(validCascadeTypes).toContain(result);
				});
			});

			it('should never return undefined or null', () => {
				// Arrange
				const inputs = ['Cascade', 'Unknown', '', undefined as unknown as string];

				// Act
				const results = inputs.map(input => MetadataEnumMappers.mapCascadeType(input));

				// Assert
				results.forEach(result => {
					expect(result).toBeDefined();
					expect(result).not.toBeNull();
				});
			});
		});
	});

	describe('integration and consistency', () => {
		it('should handle rapid successive calls with different values', () => {
			// Arrange
			const ownershipTypes = ['UserOwned', 'OrganizationOwned', 'Invalid'];
			const requiredLevels = ['SystemRequired', 'Recommended', 'Invalid'];
			const cascadeTypes = ['Cascade', 'NoCascade', 'Invalid'];

			// Act
			const results = {
				ownership: ownershipTypes.map(t => MetadataEnumMappers.mapOwnershipType(t)),
				required: requiredLevels.map(t => MetadataEnumMappers.mapRequiredLevel(t)),
				cascade: cascadeTypes.map(t => MetadataEnumMappers.mapCascadeType(t))
			};

			// Assert
			expect(results.ownership).toEqual(['UserOwned', 'OrganizationOwned', 'None']);
			expect(results.required).toEqual(['SystemRequired', 'Recommended', 'None']);
			expect(results.cascade).toEqual(['Cascade', 'NoCascade', 'NoCascade']);
		});

		it('should provide consistent defaults across all methods', () => {
			// Arrange & Act
			const ownershipDefault = MetadataEnumMappers.mapOwnershipType('unknown');
			const requiredDefault = MetadataEnumMappers.mapRequiredLevel('unknown');
			const cascadeDefault = MetadataEnumMappers.mapCascadeType('unknown');

			// Assert
			expect(ownershipDefault).toBe('None');
			expect(requiredDefault).toBe('None');
			expect(cascadeDefault).toBe('NoCascade');
		});

		it('should be pure functions with no side effects', () => {
			// Arrange
			const input1 = 'UserOwned';
			const input2 = 'SystemRequired';
			const input3 = 'Cascade';

			// Act
			const result1a = MetadataEnumMappers.mapOwnershipType(input1);
			const result2a = MetadataEnumMappers.mapRequiredLevel(input2);
			const result3a = MetadataEnumMappers.mapCascadeType(input3);

			const result1b = MetadataEnumMappers.mapOwnershipType(input1);
			const result2b = MetadataEnumMappers.mapRequiredLevel(input2);
			const result3b = MetadataEnumMappers.mapCascadeType(input3);

			// Assert
			expect(result1a).toBe(result1b);
			expect(result2a).toBe(result2b);
			expect(result3a).toBe(result3b);
		});
	});
});
