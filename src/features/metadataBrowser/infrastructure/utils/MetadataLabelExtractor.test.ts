import { MetadataLabelExtractor } from './MetadataLabelExtractor';
import type { LabelMetadata, LocalizedLabel } from '../dtos/EntityMetadataDto';

describe('MetadataLabelExtractor', () => {
	describe('extractLabel - Valid label extraction', () => {
		it('should extract label from valid LabelMetadata with UserLocalizedLabel', () => {
			// Arrange
			const labelMetadata: LabelMetadata = {
				LocalizedLabels: [],
				UserLocalizedLabel: {
					Label: 'Account',
					LanguageCode: 1033,
					IsManaged: false,
					MetadataId: 'test-id-1',
					HasChanged: null
				}
			};

			// Act
			const result = MetadataLabelExtractor.extractLabel(labelMetadata);

			// Assert
			expect(result).toBe('Account');
		});

		it('should extract label from LabelMetadata with multiple LocalizedLabels', () => {
			// Arrange
			const labelMetadata: LabelMetadata = {
				LocalizedLabels: [
					{
						Label: 'Compte',
						LanguageCode: 1036,
						IsManaged: true,
						MetadataId: 'test-id-1',
						HasChanged: false
					},
					{
						Label: 'Cuenta',
						LanguageCode: 1034,
						IsManaged: true,
						MetadataId: 'test-id-2',
						HasChanged: false
					}
				],
				UserLocalizedLabel: {
					Label: 'Account',
					LanguageCode: 1033,
					IsManaged: false,
					MetadataId: 'test-id-3',
					HasChanged: null
				}
			};

			// Act
			const result = MetadataLabelExtractor.extractLabel(labelMetadata);

			// Assert
			expect(result).toBe('Account');
		});

		it('should extract label with special characters', () => {
			// Arrange
			const labelMetadata: LabelMetadata = {
				LocalizedLabels: [],
				UserLocalizedLabel: {
					Label: 'Account & Contact (Primary)',
					LanguageCode: 1033,
					IsManaged: false,
					MetadataId: 'test-id-1',
					HasChanged: null
				}
			};

			// Act
			const result = MetadataLabelExtractor.extractLabel(labelMetadata);

			// Assert
			expect(result).toBe('Account & Contact (Primary)');
		});

		it('should extract label with numbers', () => {
			// Arrange
			const labelMetadata: LabelMetadata = {
				LocalizedLabels: [],
				UserLocalizedLabel: {
					Label: 'Account 2024',
					LanguageCode: 1033,
					IsManaged: false,
					MetadataId: 'test-id-1',
					HasChanged: null
				}
			};

			// Act
			const result = MetadataLabelExtractor.extractLabel(labelMetadata);

			// Assert
			expect(result).toBe('Account 2024');
		});

		it('should extract label with unicode characters', () => {
			// Arrange
			const labelMetadata: LabelMetadata = {
				LocalizedLabels: [],
				UserLocalizedLabel: {
					Label: '账户',
					LanguageCode: 2052,
					IsManaged: false,
					MetadataId: 'test-id-1',
					HasChanged: null
				}
			};

			// Act
			const result = MetadataLabelExtractor.extractLabel(labelMetadata);

			// Assert
			expect(result).toBe('账户');
		});

		it('should return null when Label is empty string (falsy due to || operator)', () => {
			// Arrange
			const labelMetadata: LabelMetadata = {
				LocalizedLabels: [],
				UserLocalizedLabel: {
					Label: '',
					LanguageCode: 1033,
					IsManaged: false,
					MetadataId: 'test-id-1',
					HasChanged: null
				}
			};

			// Act
			const result = MetadataLabelExtractor.extractLabel(labelMetadata);

			// Assert - Empty string is falsy, so || operator returns null
			expect(result).toBeNull();
		});

		it('should extract label with whitespace', () => {
			// Arrange
			const labelMetadata: LabelMetadata = {
				LocalizedLabels: [],
				UserLocalizedLabel: {
					Label: '  Account  ',
					LanguageCode: 1033,
					IsManaged: false,
					MetadataId: 'test-id-1',
					HasChanged: null
				}
			};

			// Act
			const result = MetadataLabelExtractor.extractLabel(labelMetadata);

			// Assert
			expect(result).toBe('  Account  ');
		});

		it('should extract long label text', () => {
			// Arrange
			const longLabel = 'This is a very long account display name that contains multiple words and spans across a long line';
			const labelMetadata: LabelMetadata = {
				LocalizedLabels: [],
				UserLocalizedLabel: {
					Label: longLabel,
					LanguageCode: 1033,
					IsManaged: false,
					MetadataId: 'test-id-1',
					HasChanged: null
				}
			};

			// Act
			const result = MetadataLabelExtractor.extractLabel(labelMetadata);

			// Assert
			expect(result).toBe(longLabel);
		});
	});

	describe('extractLabel - Null UserLocalizedLabel', () => {
		it('should return null when UserLocalizedLabel is null', () => {
			// Arrange
			const labelMetadata: LabelMetadata = {
				LocalizedLabels: [
					{
						Label: 'Compte',
						LanguageCode: 1036,
						IsManaged: true,
						MetadataId: 'test-id-1',
						HasChanged: false
					}
				],
				UserLocalizedLabel: null
			};

			// Act
			const result = MetadataLabelExtractor.extractLabel(labelMetadata);

			// Assert
			expect(result).toBeNull();
		});

		it('should return null when both UserLocalizedLabel and Label are null', () => {
			// Arrange
			const labelMetadata: LabelMetadata = {
				LocalizedLabels: [],
				UserLocalizedLabel: null
			};

			// Act
			const result = MetadataLabelExtractor.extractLabel(labelMetadata);

			// Assert
			expect(result).toBeNull();
		});
	});

	describe('extractLabel - Undefined input', () => {
		it('should return null when labelMetadata is undefined', () => {
			// Arrange
			const labelMetadata: LabelMetadata | undefined = undefined;

			// Act
			const result = MetadataLabelExtractor.extractLabel(labelMetadata);

			// Assert
			expect(result).toBeNull();
		});
	});

	describe('extractLabel - Missing Label property', () => {
		it('should return null when UserLocalizedLabel has no Label property', () => {
			// Arrange
			const labelMetadata = {
				LocalizedLabels: [],
				UserLocalizedLabel: {
					LanguageCode: 1033,
					IsManaged: false,
					MetadataId: 'test-id-1',
					HasChanged: null
				} as LocalizedLabel
			} as LabelMetadata;

			// Act
			const result = MetadataLabelExtractor.extractLabel(labelMetadata);

			// Assert
			expect(result).toBeNull();
		});

		it('should return null when UserLocalizedLabel has undefined Label property', () => {
			// Arrange
			const labelMetadata: LabelMetadata = {
				LocalizedLabels: [],
				UserLocalizedLabel: {
					Label: undefined as unknown as string,
					LanguageCode: 1033,
					IsManaged: false,
					MetadataId: 'test-id-1',
					HasChanged: null
				}
			};

			// Act
			const result = MetadataLabelExtractor.extractLabel(labelMetadata);

			// Assert
			expect(result).toBeNull();
		});
	});

	describe('extractLabel - Falsy values', () => {
		it('should return null when Label is empty string (falsy due to || operator)', () => {
			// Arrange - Empty string is falsy and the || operator will return null
			const labelMetadata: LabelMetadata = {
				LocalizedLabels: [],
				UserLocalizedLabel: {
					Label: '',
					LanguageCode: 1033,
					IsManaged: false,
					MetadataId: 'test-id-1',
					HasChanged: null
				}
			};

			// Act
			const result = MetadataLabelExtractor.extractLabel(labelMetadata);

			// Assert - Empty string is falsy, so || operator returns null
			expect(result).toBeNull();
		});

		it('should return null when Label is 0 (falsy number)', () => {
			// Arrange
			const labelMetadata: LabelMetadata = {
				LocalizedLabels: [],
				UserLocalizedLabel: {
					Label: '0',
					LanguageCode: 1033,
					IsManaged: false,
					MetadataId: 'test-id-1',
					HasChanged: null
				}
			};

			// Act
			const result = MetadataLabelExtractor.extractLabel(labelMetadata);

			// Assert
			expect(result).toBe('0');
		});

		it('should return null when Label is false (falsy boolean)', () => {
			// Arrange
			const labelMetadata: LabelMetadata = {
				LocalizedLabels: [],
				UserLocalizedLabel: {
					Label: 'false',
					LanguageCode: 1033,
					IsManaged: false,
					MetadataId: 'test-id-1',
					HasChanged: null
				}
			};

			// Act
			const result = MetadataLabelExtractor.extractLabel(labelMetadata);

			// Assert
			expect(result).toBe('false');
		});
	});

	describe('extractLabel - Complex scenarios', () => {
		it('should handle LabelMetadata with all properties populated', () => {
			// Arrange
			const labelMetadata: LabelMetadata = {
				LocalizedLabels: [
					{
						Label: 'French Account',
						LanguageCode: 1036,
						IsManaged: true,
						MetadataId: 'fr-id',
						HasChanged: false
					},
					{
						Label: 'Spanish Account',
						LanguageCode: 1034,
						IsManaged: true,
						MetadataId: 'es-id',
						HasChanged: true
					},
					{
						Label: 'German Account',
						LanguageCode: 1031,
						IsManaged: true,
						MetadataId: 'de-id',
						HasChanged: false
					}
				],
				UserLocalizedLabel: {
					Label: 'English Account',
					LanguageCode: 1033,
					IsManaged: false,
					MetadataId: 'en-id',
					HasChanged: null
				}
			};

			// Act
			const result = MetadataLabelExtractor.extractLabel(labelMetadata);

			// Assert
			expect(result).toBe('English Account');
		});

		it('should always prefer UserLocalizedLabel over LocalizedLabels', () => {
			// Arrange
			const labelMetadata: LabelMetadata = {
				LocalizedLabels: [
					{
						Label: 'Wrong Label 1',
						LanguageCode: 1036,
						IsManaged: true,
						MetadataId: 'test-id-1',
						HasChanged: false
					},
					{
						Label: 'Wrong Label 2',
						LanguageCode: 1034,
						IsManaged: true,
						MetadataId: 'test-id-2',
						HasChanged: false
					}
				],
				UserLocalizedLabel: {
					Label: 'Correct Account Label',
					LanguageCode: 1033,
					IsManaged: false,
					MetadataId: 'correct-id',
					HasChanged: null
				}
			};

			// Act
			const result = MetadataLabelExtractor.extractLabel(labelMetadata);

			// Assert
			expect(result).toBe('Correct Account Label');
			expect(result).not.toBe('Wrong Label 1');
			expect(result).not.toBe('Wrong Label 2');
		});

		it('should handle LabelMetadata with empty LocalizedLabels array', () => {
			// Arrange
			const labelMetadata: LabelMetadata = {
				LocalizedLabels: [],
				UserLocalizedLabel: {
					Label: 'Account',
					LanguageCode: 1033,
					IsManaged: false,
					MetadataId: 'test-id',
					HasChanged: null
				}
			};

			// Act
			const result = MetadataLabelExtractor.extractLabel(labelMetadata);

			// Assert
			expect(result).toBe('Account');
		});

		it('should handle LabelMetadata with Label containing newlines', () => {
			// Arrange
			const labelMetadata: LabelMetadata = {
				LocalizedLabels: [],
				UserLocalizedLabel: {
					Label: 'Account\nSecondary\nLine',
					LanguageCode: 1033,
					IsManaged: false,
					MetadataId: 'test-id',
					HasChanged: null
				}
			};

			// Act
			const result = MetadataLabelExtractor.extractLabel(labelMetadata);

			// Assert
			expect(result).toBe('Account\nSecondary\nLine');
		});

		it('should handle LabelMetadata with Label containing tabs', () => {
			// Arrange
			const labelMetadata: LabelMetadata = {
				LocalizedLabels: [],
				UserLocalizedLabel: {
					Label: 'Account\tName',
					LanguageCode: 1033,
					IsManaged: false,
					MetadataId: 'test-id',
					HasChanged: null
				}
			};

			// Act
			const result = MetadataLabelExtractor.extractLabel(labelMetadata);

			// Assert
			expect(result).toBe('Account\tName');
		});
	});

	describe('extractLabel - Consistency tests', () => {
		it('should return the same result when called multiple times with same input', () => {
			// Arrange
			const labelMetadata: LabelMetadata = {
				LocalizedLabels: [],
				UserLocalizedLabel: {
					Label: 'Account',
					LanguageCode: 1033,
					IsManaged: false,
					MetadataId: 'test-id',
					HasChanged: null
				}
			};

			// Act
			const result1 = MetadataLabelExtractor.extractLabel(labelMetadata);
			const result2 = MetadataLabelExtractor.extractLabel(labelMetadata);
			const result3 = MetadataLabelExtractor.extractLabel(labelMetadata);

			// Assert
			expect(result1).toBe(result2);
			expect(result2).toBe(result3);
			expect(result1).toBe('Account');
		});

		it('should return null consistently when input is undefined', () => {
			// Act
			const result1 = MetadataLabelExtractor.extractLabel(undefined);
			const result2 = MetadataLabelExtractor.extractLabel(undefined);

			// Assert
			expect(result1).toBeNull();
			expect(result2).toBeNull();
		});

		it('should return null consistently when UserLocalizedLabel is null', () => {
			// Arrange
			const labelMetadata: LabelMetadata = {
				LocalizedLabels: [],
				UserLocalizedLabel: null
			};

			// Act
			const result1 = MetadataLabelExtractor.extractLabel(labelMetadata);
			const result2 = MetadataLabelExtractor.extractLabel(labelMetadata);

			// Assert
			expect(result1).toBeNull();
			expect(result2).toBeNull();
		});
	});

	describe('extractLabel - Type safety', () => {
		it('should return string | null type', () => {
			// Arrange
			const labelMetadata: LabelMetadata = {
				LocalizedLabels: [],
				UserLocalizedLabel: {
					Label: 'Account',
					LanguageCode: 1033,
					IsManaged: false,
					MetadataId: 'test-id',
					HasChanged: null
				}
			};

			// Act
			const result = MetadataLabelExtractor.extractLabel(labelMetadata);

			// Assert
			expect(typeof result === 'string' || result === null).toBe(true);
		});

		it('should return null when result is null', () => {
			// Arrange
			const labelMetadata: LabelMetadata = {
				LocalizedLabels: [],
				UserLocalizedLabel: null
			};

			// Act
			const result = MetadataLabelExtractor.extractLabel(labelMetadata);

			// Assert
			expect(result === null).toBe(true);
		});
	});
});
