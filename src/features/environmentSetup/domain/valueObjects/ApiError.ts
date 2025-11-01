/**
 * Domain value object for API errors
 * Encapsulates error interpretation logic
 */
export class ApiError {
	constructor(private readonly message: string) {}

	/**
	 * Determines if the error indicates a permission/authorization issue
	 * that might be resolved with interactive authentication
	 *
	 * Common when Service Principal lacks permissions and user needs to authenticate interactively
	 */
	public requiresInteractiveAuth(): boolean {
		return this.message.includes('403') || this.message.includes('Forbidden');
	}

	public getMessage(): string {
		return this.message;
	}
}
