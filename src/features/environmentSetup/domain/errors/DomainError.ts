/**
 * Base error for domain layer
 */
export class DomainError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'DomainError';
	}
}
