/**
 * Domain error for attempts to clear non-existent properties
 */
export class PropertyNotFoundError extends Error {
	public constructor(message: string) {
		super(message);
		this.name = 'PropertyNotFoundError';
	}
}
