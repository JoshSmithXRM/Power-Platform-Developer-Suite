/**
 * Behavior: Solution Filtering
 * Responsibility: Solution dropdown, persistence, filtering
 */
export interface ISolutionFilterBehavior {
	/**
	 * Initializes solution filter behavior.
	 * Loads solution options and sends to webview.
	 */
	initialize(): Promise<void>;

	/**
	 * Gets the currently selected solution ID.
	 * @returns Current solution ID (DEFAULT_SOLUTION_ID if none selected)
	 */
	getCurrentSolutionId(): string;

	/**
	 * Sets the solution filter.
	 * @param solutionId - Target solution ID
	 */
	setSolutionId(solutionId: string): Promise<void>;

	/**
	 * Disposes resources used by this behavior.
	 */
	dispose(): void;
}
