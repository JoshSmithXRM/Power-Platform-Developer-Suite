/**
 * Application layer error
 */
export class ApplicationError extends Error {
	constructor(message: string, public readonly cause?: Error) {
		super(message);
		this.name = 'ApplicationError';
	}
}
