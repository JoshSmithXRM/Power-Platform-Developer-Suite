import { ICancellationToken } from '../../../../shared/domain/interfaces/ICancellationToken';
import { QueryOptions } from '../../../../shared/domain/interfaces/QueryOptions';

/**
 * DTO representing environment variable definition entity from Dataverse Web API.
 * Maps to the environmentvariabledefinitions entity schema in Dataverse.
 * Domain layer defines the contract for data shape.
 */
export interface EnvironmentVariableDefinitionData {
	/** environmentvariabledefinitionid field - Primary key */
	environmentvariabledefinitionid: string;
	/** schemaname field - Logical name of the variable */
	schemaname: string;
	/** displayname field - Human-readable display name */
	displayname: string;
	/** type field - Data type (100000000=String, 100000001=Number, 100000002=Boolean, 100000003=JSON) */
	type: number;
	/** defaultvalue field - Default value when no environment-specific value exists */
	defaultvalue: string | null;
	/** ismanaged field - Whether variable is part of managed solution */
	ismanaged: boolean;
	/** description field - Variable description */
	description: string | null;
	/** modifiedon field - Last modification timestamp */
	modifiedon: string;
}

/**
 * DTO representing environment variable value entity from Dataverse Web API.
 * Maps to the environmentvariablevalues entity schema in Dataverse.
 * Domain layer defines the contract for data shape.
 */
export interface EnvironmentVariableValueData {
	/** environmentvariablevalueid field - Primary key */
	environmentvariablevalueid: string;
	/** _environmentvariabledefinitionid_value field - Foreign key to definition */
	_environmentvariabledefinitionid_value: string;
	/** value field - Environment-specific value (overrides default) */
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
