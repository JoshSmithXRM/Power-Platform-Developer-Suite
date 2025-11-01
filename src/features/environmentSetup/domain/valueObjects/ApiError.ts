/**
 * Value object representing an API error from Power Platform services.
 *
 * Encapsulates error interpretation logic to determine error type and recovery actions.
 *
 * WHY: Different API errors require different handling. This value object
 * interprets error messages to provide actionable information (e.g., suggesting
 * interactive auth for permission errors).
 *
 * Common Scenarios:
 * - 403/Forbidden: Service Principal lacks permissions
 * - 401/Unauthorized: Authentication failed or expired
 * - Network errors: Connectivity issues
 */
export class ApiError {
	constructor(private readonly message: string) {}

	/**
	 * Determines if error indicates a permission/authorization issue
	 * that might be resolved with interactive authentication.
	 *
	 * WHY: Service Principal may lack permissions that user account has.
	 * Suggesting interactive auth provides recovery path without requiring
	 * Service Principal permission changes.
	 *
	 * @returns {boolean} True if 403/Forbidden error detected
	 */
	public requiresInteractiveAuth(): boolean {
		return this.message.includes('403') || this.message.includes('Forbidden');
	}

	public getMessage(): string {
		return this.message;
	}
}
