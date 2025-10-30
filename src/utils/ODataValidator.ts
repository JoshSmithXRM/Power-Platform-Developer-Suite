/**
 * Runtime type validation for OData responses from Dataverse API
 *
 * ARCHITECTURE PRINCIPLES:
 * - Fail-fast: Throw errors on invalid data (don't silently return bad types)
 * - Pragmatic validation: Check structure, not entity contents
 * - DRY: Single source of truth for all 9 services
 * - Performance: O(1) validation - don't iterate arrays
 */

/**
 * OData collection response structure (most common)
 */
export interface ODataResponse<T> {
    value: T[];
    '@odata.nextLink'?: string;
    '@odata.count'?: number;
}

/**
 * OData single entity response structure
 */
export interface ODataSingleResponse<_T> {
    value?: never; // Discriminator - single responses don't have value array
    '@odata.context'?: string;
    [key: string]: unknown; // Entity properties
}

/**
 * Type guard for OData collection responses
 *
 * Validates:
 * - Response is object (not null/undefined/primitive)
 * - value property exists and is array
 * - Optional pagination links are strings
 *
 * Does NOT validate:
 * - Array element structure (too expensive, entities vary)
 * - Entity field types (TypeScript handles this after cast)
 *
 * @param response - Response from await response.json()
 * @returns True if response matches ODataResponse structure
 */
export function isODataResponse<T>(response: unknown): response is ODataResponse<T> {
    if (!response || typeof response !== 'object') {
        return false;
    }

    const obj = response as Record<string, unknown>;

    // MUST have 'value' array
    if (!Array.isArray(obj.value)) {
        return false;
    }

    // Optional fields must be correct type if present
    if (obj['@odata.nextLink'] !== undefined && typeof obj['@odata.nextLink'] !== 'string') {
        return false;
    }

    if (obj['@odata.count'] !== undefined && typeof obj['@odata.count'] !== 'number') {
        return false;
    }

    return true;
}

/**
 * Type guard for OData single entity responses
 *
 * Single entity responses are returned when querying by ID:
 * - GET /api/data/v9.2/pluginassemblies(guid)
 * - GET /api/data/v9.2/EntityDefinitions(LogicalName='account')
 *
 * Structure: Plain object with entity properties (no 'value' wrapper)
 *
 * @param response - Response from await response.json()
 * @returns True if response is object without 'value' array
 */
export function isODataSingleResponse<T>(response: unknown): response is T {
    if (!response || typeof response !== 'object') {
        return false;
    }

    const obj = response as Record<string, unknown>;

    // Single responses NEVER have 'value' array
    // (This is the discriminator from collection responses)
    if ('value' in obj) {
        return false;
    }

    return true;
}

/**
 * Validated OData collection response parser
 *
 * FAIL-FAST: Throws on invalid structure
 *
 * Usage:
 * ```typescript
 * const response = await fetch(url, options);
 * const data = await response.json();
 * const validated = parseODataResponse<PluginAssembly>(data);
 * // validated is now ODataResponse<PluginAssembly> with runtime guarantee
 * ```
 *
 * @param response - Untyped response from await response.json()
 * @returns Validated ODataResponse<T>
 * @throws Error if response structure is invalid
 */
export function parseODataResponse<T>(response: unknown): ODataResponse<T> {
    if (!isODataResponse<T>(response)) {
        throw new Error(
            `Invalid OData response structure. Expected { value: T[], '@odata.nextLink'?: string, '@odata.count'?: number }. ` +
            `Got: ${JSON.stringify(response).substring(0, 200)}`
        );
    }
    return response;
}

/**
 * Validated OData single entity response parser
 *
 * FAIL-FAST: Throws on invalid structure
 *
 * Usage:
 * ```typescript
 * const response = await fetch(`${url}/pluginassemblies(${id})`, options);
 * const data = await response.json();
 * const validated = parseODataSingleResponse<PluginAssembly>(data);
 * // validated is now PluginAssembly with runtime guarantee it's an object
 * ```
 *
 * @param response - Untyped response from await response.json()
 * @returns Validated entity object
 * @throws Error if response structure is invalid
 */
export function parseODataSingleResponse<T>(response: unknown): T {
    if (!isODataSingleResponse<T>(response)) {
        throw new Error(
            `Invalid OData single entity response. Expected object without 'value' array. ` +
            `Got: ${typeof response === 'object' ? JSON.stringify(response).substring(0, 200) : typeof response}`
        );
    }
    return response as T;
}

/**
 * Validated fetch wrapper for OData collection endpoints
 *
 * Combines fetch + JSON parse + validation in one call
 *
 * Usage:
 * ```typescript
 * const data = await fetchODataCollection<PluginAssembly>(url, token);
 * // data is ODataResponse<PluginAssembly> with runtime validation
 * ```
 *
 * @param url - OData endpoint URL
 * @param token - Bearer token
 * @returns Validated ODataResponse<T>
 * @throws Error if HTTP fails or response structure invalid
 */
export async function fetchODataCollection<T>(
    url: string,
    token: string
): Promise<ODataResponse<T>> {
    const response = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'OData-MaxVersion': '4.0',
            'OData-Version': '4.0'
        }
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: unknown = await response.json();
    return parseODataResponse<T>(data);
}

/**
 * Validated fetch wrapper for OData single entity endpoints
 *
 * Usage:
 * ```typescript
 * const entity = await fetchODataSingle<PluginAssembly>(`${url}/pluginassemblies(${id})`, token);
 * // entity is PluginAssembly with runtime validation
 * ```
 *
 * @param url - OData entity URL (with ID in path)
 * @param token - Bearer token
 * @returns Validated entity object
 * @throws Error if HTTP fails or response structure invalid
 */
export async function fetchODataSingle<T>(
    url: string,
    token: string
): Promise<T> {
    const response = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'OData-MaxVersion': '4.0',
            'OData-Version': '4.0'
        }
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: unknown = await response.json();
    return parseODataSingleResponse<T>(data);
}
