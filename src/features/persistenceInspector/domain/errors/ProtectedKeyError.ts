/**
 * Domain error for attempts to clear protected keys
 */
export class ProtectedKeyError extends Error {
	public constructor(message: string) {
		super(message);
		this.name = 'ProtectedKeyError';
	}
}
