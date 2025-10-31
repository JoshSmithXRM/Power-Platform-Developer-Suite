/**
 * Query Use Case: Check if environment is being edited in another panel
 * Uses instance-based state for better testability
 */
export class CheckConcurrentEditUseCase {
	private editingSessions: Set<string> = new Set();

	public execute(request: CheckConcurrentEditRequest): CheckConcurrentEditResponse {
		const isBeingEdited = this.editingSessions.has(request.environmentId);

		return {
			isBeingEdited,
			canEdit: !isBeingEdited
		};
	}

	public registerEditSession(environmentId: string): void {
		this.editingSessions.add(environmentId);
	}

	public unregisterEditSession(environmentId: string): void {
		this.editingSessions.delete(environmentId);
	}
}

export interface CheckConcurrentEditRequest {
	environmentId: string;
}

export interface CheckConcurrentEditResponse {
	isBeingEdited: boolean;
	canEdit: boolean;
}
