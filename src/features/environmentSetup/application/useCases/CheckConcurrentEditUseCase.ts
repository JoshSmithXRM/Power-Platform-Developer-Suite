import { ILogger } from '../../../../infrastructure/logging/ILogger';

/**
 * Query Use Case: Check if environment is being edited in another panel
 * Uses instance-based state for better testability
 */
export class CheckConcurrentEditUseCase {
	private editingSessions: Set<string> = new Set();

	constructor(
		private readonly logger: ILogger
	) {}

	/**
	 * Checks if an environment is currently being edited in another panel
	 * @param request Request containing environment ID to check
	 * @returns Response indicating edit status
	 */
	public execute(request: CheckConcurrentEditRequest): CheckConcurrentEditResponse {
		const isBeingEdited = this.editingSessions.has(request.environmentId);

		this.logger.debug(`Concurrent edit check for ${request.environmentId}: ${isBeingEdited ? 'blocked' : 'allowed'}`);

		return {
			isBeingEdited,
			canEdit: !isBeingEdited
		};
	}

	/**
	 * Registers an active editing session for an environment
	 * @param environmentId Environment ID being edited
	 */
	public registerEditSession(environmentId: string): void {
		this.editingSessions.add(environmentId);
		this.logger.debug(`Edit session registered for ${environmentId}`);
	}

	/**
	 * Unregisters an editing session when panel is closed
	 * @param environmentId Environment ID to unregister
	 */
	public unregisterEditSession(environmentId: string): void {
		this.editingSessions.delete(environmentId);
		this.logger.debug(`Edit session unregistered for ${environmentId}`);
	}
}

export interface CheckConcurrentEditRequest {
	environmentId: string;
}

export interface CheckConcurrentEditResponse {
	isBeingEdited: boolean;
	canEdit: boolean;
}
