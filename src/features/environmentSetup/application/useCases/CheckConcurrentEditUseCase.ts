/**
 * Query Use Case: Check if environment is being edited in another panel
 */
export class CheckConcurrentEditUseCase {
	private static editingSessions: Set<string> = new Set();

	public execute(request: CheckConcurrentEditRequest): CheckConcurrentEditResponse {
		const isBeingEdited = CheckConcurrentEditUseCase.editingSessions.has(request.environmentId);

		return {
			isBeingEdited,
			canEdit: !isBeingEdited
		};
	}

	public static registerEditSession(environmentId: string): void {
		CheckConcurrentEditUseCase.editingSessions.add(environmentId);
	}

	public static unregisterEditSession(environmentId: string): void {
		CheckConcurrentEditUseCase.editingSessions.delete(environmentId);
	}
}

export interface CheckConcurrentEditRequest {
	environmentId: string;
}

export interface CheckConcurrentEditResponse {
	isBeingEdited: boolean;
	canEdit: boolean;
}
