import type { DataProvider } from '../entities/DataProvider';

/**
 * Input for registering a new Data Provider.
 */
export interface RegisterDataProviderInput {
	readonly name: string;
	readonly dataSourceLogicalName: string;
	readonly description?: string | undefined;
	/** Plugin type ID for Retrieve operation. Omit or null for "not implemented". */
	readonly retrievePluginId?: string | undefined;
	/** Plugin type ID for RetrieveMultiple operation. Omit or null for "not implemented". */
	readonly retrieveMultiplePluginId?: string | undefined;
	/** Plugin type ID for Create operation. Omit or null for "not implemented". */
	readonly createPluginId?: string | undefined;
	/** Plugin type ID for Update operation. Omit or null for "not implemented". */
	readonly updatePluginId?: string | undefined;
	/** Plugin type ID for Delete operation. Omit or null for "not implemented". */
	readonly deletePluginId?: string | undefined;
	/** Solution unique name to add the data provider to. */
	readonly solutionUniqueName?: string | undefined;
}

/**
 * Input for updating an existing Data Provider.
 * All fields are optional - only provided fields will be updated.
 * Use null to clear a plugin reference to "not implemented".
 */
export interface UpdateDataProviderInput {
	readonly name?: string | undefined;
	readonly description?: string | undefined;
	/** Plugin type ID for Retrieve operation. null clears to "not implemented". */
	readonly retrievePluginId?: string | null | undefined;
	/** Plugin type ID for RetrieveMultiple operation. null clears to "not implemented". */
	readonly retrieveMultiplePluginId?: string | null | undefined;
	/** Plugin type ID for Create operation. null clears to "not implemented". */
	readonly createPluginId?: string | null | undefined;
	/** Plugin type ID for Update operation. null clears to "not implemented". */
	readonly updatePluginId?: string | null | undefined;
	/** Plugin type ID for Delete operation. null clears to "not implemented". */
	readonly deletePluginId?: string | null | undefined;
}

/**
 * Repository interface for Data Provider operations.
 * Defined in domain layer, implemented in infrastructure layer.
 */
export interface IDataProviderRepository {
	/**
	 * Finds all Data Providers in the environment.
	 */
	findAll(environmentId: string): Promise<readonly DataProvider[]>;

	/**
	 * Finds a Data Provider by ID.
	 * Returns null if not found.
	 */
	findById(environmentId: string, dataProviderId: string): Promise<DataProvider | null>;

	/**
	 * Registers a new Data Provider.
	 * Returns the ID of the created Data Provider.
	 */
	register(environmentId: string, input: RegisterDataProviderInput): Promise<string>;

	/**
	 * Updates an existing Data Provider.
	 */
	update(environmentId: string, dataProviderId: string, input: UpdateDataProviderInput): Promise<void>;

	/**
	 * Deletes a Data Provider.
	 */
	delete(environmentId: string, dataProviderId: string): Promise<void>;
}
