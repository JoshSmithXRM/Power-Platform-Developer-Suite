/**
 * Domain error for invalid operations
 */
export class InvalidOperationError extends Error {
	public constructor(message: string) {
		super(message);
		this.name = 'InvalidOperationError';
	}
}
