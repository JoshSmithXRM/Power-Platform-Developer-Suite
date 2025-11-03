import { EnvironmentVariable } from '../entities/EnvironmentVariable';
import type {
	EnvironmentVariableDefinitionData,
	EnvironmentVariableValueData
} from '../interfaces/IEnvironmentVariableRepository';

/**
 * Domain service responsible for creating EnvironmentVariable entities
 * by joining definition and value data from separate Dataverse tables.
 *
 * Handles the business logic of combining environmentvariabledefinition
 * and environmentvariablevalue records into complete EnvironmentVariable entities.
 */
export class EnvironmentVariableFactory {
	/**
	 * Creates EnvironmentVariable entities by joining definitions with their corresponding values.
	 *
	 * In Dataverse, environment variables are split across two tables:
	 * - environmentvariabledefinition: Schema, type, default value, metadata
	 * - environmentvariablevalue: Current/override value for the definition
	 *
	 * This method performs a left join operation where definitions are primary
	 * and values are matched by definition ID. Definitions without values are
	 * included with null current value (falling back to default value).
	 *
	 * Nullability semantics:
	 * - currentValue: null when definition has no associated value record (undefined coalesced to null)
	 * - valueId: null when definition has no associated value record (undefined coalesced to null)
	 * - description: empty string when definition.description is null (null coalesced to empty string)
	 *
	 * The nullish coalescing operator (??) handles both undefined (no value record found in Map)
	 * and null (value record exists but field is null) by returning the right-hand side.
	 *
	 * @param definitions - Array of environment variable definition records
	 * @param values - Array of environment variable value records
	 * @returns Array of complete EnvironmentVariable entities
	 */
	createFromDefinitionsAndValues(
		definitions: EnvironmentVariableDefinitionData[],
		values: EnvironmentVariableValueData[]
	): EnvironmentVariable[] {
		const valuesByDefinitionId = new Map(
			values.map((val) => [val._environmentvariabledefinitionid_value, val])
		);

		return definitions.map((def) => {
			const value = valuesByDefinitionId.get(def.environmentvariabledefinitionid);

			return new EnvironmentVariable(
				def.environmentvariabledefinitionid,
				def.schemaname,
				def.displayname,
				def.type,
				def.defaultvalue,
				value?.value ?? null,
				def.ismanaged,
				def.description ?? '',
				new Date(def.modifiedon),
				value?.environmentvariablevalueid ?? null
			);
		});
	}
}
