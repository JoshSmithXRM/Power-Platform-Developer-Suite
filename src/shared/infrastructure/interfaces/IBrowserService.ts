/**
 * Service for opening URLs in external browser.
 * Infrastructure layer service for managing external browser interactions.
 */
export interface IBrowserService {
	/**
	 * Opens a URL in the system's default external browser.
	 * @param url - The URL to open
	 * @returns Promise that resolves when the browser is opened
	 */
	openExternal(url: string): Promise<void>;
}
