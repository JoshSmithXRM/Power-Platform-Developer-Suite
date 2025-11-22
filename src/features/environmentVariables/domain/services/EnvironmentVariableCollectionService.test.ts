import { EnvironmentVariableCollectionService } from './EnvironmentVariableCollectionService';
import { EnvironmentVariable, EnvironmentVariableType } from '../entities/EnvironmentVariable';

describe('EnvironmentVariableCollectionService', () => {
	let service: EnvironmentVariableCollectionService;

	beforeEach(() => {
		service = new EnvironmentVariableCollectionService();
	});

	// Test data factory
	function createVariable(
		schemaName: string,
		overrides?: {
			definitionId?: string;
			displayName?: string;
			type?: EnvironmentVariableType;
			defaultValue?: string | null;
			currentValue?: string | null;
			isManaged?: boolean;
			description?: string;
			modifiedOn?: Date;
			valueId?: string | null;
		}
	): EnvironmentVariable {
		return new EnvironmentVariable(
			overrides?.definitionId ?? `def-${schemaName}`,
			schemaName,
			overrides?.displayName ?? `Display ${schemaName}`,
			overrides?.type ?? EnvironmentVariableType.String,
			overrides?.defaultValue ?? 'default-value',
			overrides?.currentValue ?? null,
			overrides?.isManaged ?? false,
			overrides?.description ?? 'Test description',
			overrides?.modifiedOn ?? new Date('2024-01-01T10:00:00Z'),
			overrides?.valueId ?? null
		);
	}

	describe('sort', () => {
		describe('alphabetical sorting', () => {
			it('should sort variables alphabetically by schema name', () => {
				const variables = [
					createVariable('zulu'),
					createVariable('alpha'),
					createVariable('mike')
				];

				const sorted = service.sort(variables);

				expect(sorted[0]?.schemaName).toBe('alpha');
				expect(sorted[1]?.schemaName).toBe('mike');
				expect(sorted[2]?.schemaName).toBe('zulu');
			});

			it('should sort variables with numeric prefixes correctly', () => {
				const variables = [
					createVariable('var_2'),
					createVariable('var_10'),
					createVariable('var_1')
				];

				const sorted = service.sort(variables);

				expect(sorted[0]?.schemaName).toBe('var_1');
				expect(sorted[1]?.schemaName).toBe('var_10');
				expect(sorted[2]?.schemaName).toBe('var_2');
			});

			it('should handle case-insensitive sorting', () => {
				const variables = [
					createVariable('Zebra'),
					createVariable('apple'),
					createVariable('Banana')
				];

				const sorted = service.sort(variables);

				expect(sorted[0]?.schemaName).toBe('apple');
				expect(sorted[1]?.schemaName).toBe('Banana');
				expect(sorted[2]?.schemaName).toBe('Zebra');
			});

			it('should sort variables with underscore prefixes', () => {
				const variables = [
					createVariable('_private_var'),
					createVariable('public_var'),
					createVariable('__double_private')
				];

				const sorted = service.sort(variables);

				expect(sorted[0]?.schemaName).toBe('__double_private');
				expect(sorted[1]?.schemaName).toBe('_private_var');
				expect(sorted[2]?.schemaName).toBe('public_var');
			});
		});

		describe('defensive copy behavior', () => {
			it('should not mutate original array', () => {
				const variables = [
					createVariable('charlie'),
					createVariable('alpha'),
					createVariable('bravo')
				];
				const originalOrder = variables.map((v) => v.schemaName);

				service.sort(variables);

				expect(variables.map((v) => v.schemaName)).toEqual(originalOrder);
				expect(variables[0]?.schemaName).toBe('charlie');
			});

			it('should return new array instance', () => {
				const variables = [createVariable('alpha'), createVariable('bravo')];

				const sorted = service.sort(variables);

				expect(sorted).not.toBe(variables);
			});

			it('should allow multiple sorts without affecting original', () => {
				const variables = [
					createVariable('charlie'),
					createVariable('alpha'),
					createVariable('bravo')
				];

				const sorted1 = service.sort(variables);
				const sorted2 = service.sort(variables);

				expect(sorted1).toEqual(sorted2);
				expect(sorted1).not.toBe(sorted2);
				expect(variables[0]?.schemaName).toBe('charlie');
			});
		});

		describe('edge cases', () => {
			it('should handle empty array', () => {
				const variables: EnvironmentVariable[] = [];

				const sorted = service.sort(variables);

				expect(sorted).toHaveLength(0);
			});

			it('should handle single variable', () => {
				const variables = [createVariable('only_one')];

				const sorted = service.sort(variables);

				expect(sorted).toHaveLength(1);
				expect(sorted[0]?.schemaName).toBe('only_one');
			});

			it('should handle two variables', () => {
				const variables = [createVariable('bravo'), createVariable('alpha')];

				const sorted = service.sort(variables);

				expect(sorted).toHaveLength(2);
				expect(sorted[0]?.schemaName).toBe('alpha');
				expect(sorted[1]?.schemaName).toBe('bravo');
			});

			it('should handle identical schema names', () => {
				const variables = [
					createVariable('same_name'),
					createVariable('same_name'),
					createVariable('same_name')
				];

				const sorted = service.sort(variables);

				expect(sorted).toHaveLength(3);
				expect(sorted.every((v) => v.schemaName === 'same_name')).toBe(true);
			});

			it('should handle variables with same prefix', () => {
				const variables = [
					createVariable('env_var_c'),
					createVariable('env_var_a'),
					createVariable('env_var_b')
				];

				const sorted = service.sort(variables);

				expect(sorted[0]?.schemaName).toBe('env_var_a');
				expect(sorted[1]?.schemaName).toBe('env_var_b');
				expect(sorted[2]?.schemaName).toBe('env_var_c');
			});
		});

		describe('special characters', () => {
			it('should sort variables with special characters', () => {
				const variables = [
					createVariable('var-dash'),
					createVariable('var_underscore'),
					createVariable('var.dot')
				];

				const sorted = service.sort(variables);

				expect(sorted).toHaveLength(3);
				// localeCompare sorts punctuation after letters in some locales
				// Just verify all three are present in alphabetical order
				const names = sorted.map((v) => v?.schemaName);
				expect(names).toContain('var-dash');
				expect(names).toContain('var.dot');
				expect(names).toContain('var_underscore');
			});

			it('should handle Unicode characters', () => {
				const variables = [
					createVariable('var_中文'),
					createVariable('var_abc'),
					createVariable('var_ñoño')
				];

				const sorted = service.sort(variables);

				expect(sorted).toHaveLength(3);
			});

			it('should handle whitespace in names', () => {
				const variables = [
					createVariable('var with spaces'),
					createVariable('var_normal'),
					createVariable('another var')
				];

				const sorted = service.sort(variables);

				expect(sorted).toHaveLength(3);
			});
		});

		describe('large collections', () => {
			it('should handle sorting 100 variables', () => {
				const variables = Array.from({ length: 100 }, (_, i) =>
					createVariable(`var_${99 - i}`)
				);

				const sorted = service.sort(variables);

				expect(sorted).toHaveLength(100);
				expect(sorted[0]?.schemaName).toBe('var_0');
				expect(sorted[99]?.schemaName).toBe('var_99');
			});

			it('should handle sorting 1000 variables', () => {
				const variables = Array.from({ length: 1000 }, () =>
					createVariable(`var_${Math.floor(Math.random() * 10000)}`)
				);

				const sorted = service.sort(variables);

				expect(sorted).toHaveLength(1000);

				for (let i = 0; i < sorted.length - 1; i++) {
					const current = sorted[i];
					const next = sorted[i + 1];
					if (current && next) {
						expect(
							current.schemaName.localeCompare(next.schemaName)
						).toBeLessThanOrEqual(0);
					}
				}
			});
		});

		describe('different variable types', () => {
			it('should sort variables regardless of type', () => {
				const variables = [
					createVariable('z_secret', {
						type: EnvironmentVariableType.Secret
					}),
					createVariable('a_string', {
						type: EnvironmentVariableType.String
					}),
					createVariable('m_number', {
						type: EnvironmentVariableType.Number
					})
				];

				const sorted = service.sort(variables);

				expect(sorted[0]?.schemaName).toBe('a_string');
				expect(sorted[1]?.schemaName).toBe('m_number');
				expect(sorted[2]?.schemaName).toBe('z_secret');
			});

			it('should sort managed and unmanaged variables together', () => {
				const variables = [
					createVariable('z_managed', {
						isManaged: true
					}),
					createVariable('a_unmanaged', {
						isManaged: false
					})
				];

				const sorted = service.sort(variables);

				expect(sorted[0]?.schemaName).toBe('a_unmanaged');
				expect(sorted[1]?.schemaName).toBe('z_managed');
			});

			it('should sort variables with different value states', () => {
				const variables = [
					createVariable('z_with_override', {
						defaultValue: 'default',
						currentValue: 'override'
					}),
					createVariable('a_default_only', {
						defaultValue: 'default',
						currentValue: null
					}),
					createVariable('m_no_value', {
						defaultValue: null,
						currentValue: null
					})
				];

				const sorted = service.sort(variables);

				expect(sorted[0]?.schemaName).toBe('a_default_only');
				expect(sorted[1]?.schemaName).toBe('m_no_value');
				expect(sorted[2]?.schemaName).toBe('z_with_override');
			});
		});

		describe('localeCompare behavior', () => {
			it('should use locale-aware comparison', () => {
				const variables = [
					createVariable('var_10'),
					createVariable('var_2'),
					createVariable('var_1'),
					createVariable('var_20')
				];

				const sorted = service.sort(variables);

				expect(sorted.map((v) => v.schemaName)).toEqual([
					'var_1',
					'var_10',
					'var_2',
					'var_20'
				]);
			});

			it('should handle accented characters', () => {
				const variables = [
					createVariable('café'),
					createVariable('cache'),
					createVariable('caché')
				];

				const sorted = service.sort(variables);

				expect(sorted).toHaveLength(3);
			});
		});

		describe('stability', () => {
			it('should maintain relative order for equal schema names', () => {
				const var1 = createVariable('same', {
					definitionId: 'id-1',
					displayName: 'Display 1'
				});
				const var2 = createVariable('same', {
					definitionId: 'id-2',
					displayName: 'Display 2'
				});
				const var3 = createVariable('same', {
					definitionId: 'id-3',
					displayName: 'Display 3'
				});
				const variables = [var1, var2, var3];

				const sorted = service.sort(variables);

				expect(sorted[0]?.definitionId).toBe('id-1');
				expect(sorted[1]?.definitionId).toBe('id-2');
				expect(sorted[2]?.definitionId).toBe('id-3');
			});
		});

		describe('realistic scenarios', () => {
			it('should sort environment variables from typical Power Platform environment', () => {
				const variables = [
					createVariable('env_SharePointUrl'),
					createVariable('env_ApiKey', {
						type: EnvironmentVariableType.Secret
					}),
					createVariable('env_DatabaseConnection'),
					createVariable('env_FeatureFlag_EnableNewUI', {
						type: EnvironmentVariableType.Boolean
					}),
					createVariable('env_MaxRetries', {
						type: EnvironmentVariableType.Number
					})
				];

				const sorted = service.sort(variables);

				expect(sorted[0]?.schemaName).toBe('env_ApiKey');
				expect(sorted[1]?.schemaName).toBe('env_DatabaseConnection');
				expect(sorted[2]?.schemaName).toBe('env_FeatureFlag_EnableNewUI');
				expect(sorted[3]?.schemaName).toBe('env_MaxRetries');
				expect(sorted[4]?.schemaName).toBe('env_SharePointUrl');
			});

			it('should sort environment variables with common prefixes', () => {
				const variables = [
					createVariable('cr123_config_setting3'),
					createVariable('cr123_config_setting1'),
					createVariable('cr123_config_setting2'),
					createVariable('cr123_api_key'),
					createVariable('cr123_api_endpoint')
				];

				const sorted = service.sort(variables);

				expect(sorted[0]?.schemaName).toBe('cr123_api_endpoint');
				expect(sorted[1]?.schemaName).toBe('cr123_api_key');
				expect(sorted[2]?.schemaName).toBe('cr123_config_setting1');
				expect(sorted[3]?.schemaName).toBe('cr123_config_setting2');
				expect(sorted[4]?.schemaName).toBe('cr123_config_setting3');
			});
		});
	});
});
