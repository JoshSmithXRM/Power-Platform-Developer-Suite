import { ICancellationToken } from '../../../../shared/domain/interfaces/ICancellationToken';
import { QueryOptions } from '../../../../shared/domain/interfaces/QueryOptions';

/**
 * Raw environment variable definition data from Dataverse API.
 * Domain layer defines the contract for data shape.
 */
export interface EnvironmentVariableDefinitionData {
	environmentvariabledefinitionid: string;
	schemaname: string;
	displayname: string;
	type: number;
	defaultvalue: string | null;
	ismanaged: boolean;
	description: string | null;
	modifiedon: string;
}

/**
 * Raw environment variable value data from Dataverse API.
 * Domain layer defines the contract for data shape.
 */
export interface EnvironmentVariableValueData {
	environmentvariablevalueid: string;
	_environmentvariabledefinitionid_value: string;
	value: string | null;
}

/**
 * Repository interface for fetching Power Platform environment variables.
 * Domain defines the contract, infrastructure implements it.
 */
export interface IEnvironmentVariableRepository {
	/**
	 * Retrieves all environment variable definitions from the specified environment.
	 * @param environmentId - Power Platform environment GUID
	 * @param options - Optional query options for filtering, selection, ordering
	 * @param cancellationToken - Optional token to cancel the operation
	 * @returns Promise resolving to array of definition data
	 */
	findAllDefinitions(
		environmentId: string,
		options?: QueryOptions,
		cancellationToken?: ICancellationToken
	): Promise<EnvironmentVariableDefinitionData[]>;

	/**
	 * Retrieves all environment variable values from the specified environment.
	 * @param environmentId - Power Platform environment GUID
	 * @param options - Optional query options for filtering, selection, ordering
	 * @param cancellationToken - Optional token to cancel the operation
	 * @returns Promise resolving to array of value data
	 */
	findAllValues(
		environmentId: string,
		options?: QueryOptions,
		cancellationToken?: ICancellationToken
	): Promise<EnvironmentVariableValueData[]>;
}
