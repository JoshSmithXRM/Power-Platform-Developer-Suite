/**
 * Behavior: Data Loading & Display
 * Responsibility: Loading state, data fetching, error handling, cancellation
 */
export interface IDataBehavior {
	/**
	 * Initializes data behavior.
	 * Performs initial data load.
	 */
	initialize(): Promise<void>;

	/**
	 * Loads data from the data source.
	 */
	loadData(): Promise<void>;

	/**
	 * Sends data to the webview.
	 * @param data - Array of view model records
	 */
	sendData(data: Record<string, unknown>[]): void;

	/**
	 * Sets loading state in webview.
	 * @param isLoading - True to show loading indicator
	 */
	setLoading(isLoading: boolean): void;

	/**
	 * Handles and displays error in webview.
	 * @param error - Error to display
	 */
	handleError(error: unknown): void;

	/**
	 * Disposes resources used by this behavior.
	 */
	dispose(): void;
}
