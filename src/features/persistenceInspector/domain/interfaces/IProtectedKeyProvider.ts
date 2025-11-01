/**
 * Domain interface for protected key configuration
 * Infrastructure layer implements this
 */
export interface IProtectedKeyProvider {
	/**
	 * Gets the list of protected key patterns
	 */
	getProtectedKeyPatterns(): string[];
}
