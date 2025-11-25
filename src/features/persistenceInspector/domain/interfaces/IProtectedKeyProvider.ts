/**
 * Domain interface for protected key pattern configuration.
 *
 * Clean Architecture Principle: Domain defines the interface, infrastructure implements it.
 *
 * WHY Interface in Domain: Protected key patterns are a business rule (which keys
 * cannot be cleared). Domain layer defines the contract; infrastructure provides
 * the actual list (could be hardcoded, config file, database, etc.).
 *
 * Responsibility:
 * - Provide list of protected key patterns (supports wildcards)
 *
 * Note: Current infrastructure implementation uses hardcoded list, but interface
 * allows future flexibility (user-configurable patterns, etc.).
 */
export interface IProtectedKeyProvider {
	/**
	 * Gets the list of protected key patterns.
	 *
	 * Patterns support wildcards: `power-platform-dev-suite-*`
	 *
	 * @returns {string[]} Array of protected key patterns
	 */
	getProtectedKeyPatterns(): string[];
}
