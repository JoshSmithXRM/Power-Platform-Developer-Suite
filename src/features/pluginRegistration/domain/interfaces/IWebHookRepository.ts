import type { WebHook } from '../entities/WebHook';

/**
 * Input for registering a new WebHook.
 */
export interface RegisterWebHookInput {
	readonly name: string;
	readonly url: string;
	readonly authType: number;
	readonly authValue?: string | undefined;
	readonly description?: string | undefined;
	readonly solutionUniqueName?: string | undefined;
}

/**
 * Input for updating an existing WebHook.
 * All fields are optional - only provided fields will be updated.
 */
export interface UpdateWebHookInput {
	readonly name?: string | undefined;
	readonly url?: string | undefined;
	readonly authType?: number | undefined;
	readonly authValue?: string | undefined;
	readonly description?: string | undefined;
}

/**
 * Repository interface for WebHook (Service Endpoint) operations.
 * Defined in domain layer, implemented in infrastructure layer.
 */
export interface IWebHookRepository {
	/**
	 * Finds all WebHooks in the environment.
	 */
	findAll(environmentId: string): Promise<readonly WebHook[]>;

	/**
	 * Finds a WebHook by ID.
	 * Returns null if not found.
	 */
	findById(environmentId: string, webHookId: string): Promise<WebHook | null>;

	/**
	 * Registers a new WebHook.
	 * Returns the ID of the created WebHook.
	 */
	register(environmentId: string, input: RegisterWebHookInput): Promise<string>;

	/**
	 * Updates an existing WebHook.
	 */
	update(environmentId: string, webHookId: string, input: UpdateWebHookInput): Promise<void>;

	/**
	 * Deletes a WebHook.
	 */
	delete(environmentId: string, webHookId: string): Promise<void>;
}
