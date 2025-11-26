import * as vscode from 'vscode';

/**
 * Service for building and handling Dataverse record URLs.
 * Provides methods for opening records in browser and copying URLs to clipboard.
 *
 * URL format: https://{orgUrl}/main.aspx?pagetype=entityrecord&etn={entityLogicalName}&id={recordId}
 */
export class DataverseRecordUrlService {
	/**
	 * Builds a Dataverse record URL.
	 *
	 * @param dataverseUrl - The Dataverse organization URL (e.g., https://org.crm.dynamics.com)
	 * @param entityLogicalName - The entity logical name (e.g., "contact", "account")
	 * @param recordId - The record GUID
	 * @returns The full record URL
	 */
	public buildRecordUrl(
		dataverseUrl: string,
		entityLogicalName: string,
		recordId: string
	): string {
		// Ensure dataverseUrl doesn't have trailing slash
		const baseUrl = dataverseUrl.replace(/\/+$/, '');

		// Build the model-driven app record URL
		const params = new URLSearchParams({
			pagetype: 'entityrecord',
			etn: entityLogicalName,
			id: recordId,
		});

		return `${baseUrl}/main.aspx?${params.toString()}`;
	}

	/**
	 * Opens a Dataverse record in the default browser.
	 *
	 * @param dataverseUrl - The Dataverse organization URL
	 * @param entityLogicalName - The entity logical name
	 * @param recordId - The record GUID
	 * @returns Promise that resolves when the browser opens
	 */
	public async openRecord(
		dataverseUrl: string,
		entityLogicalName: string,
		recordId: string
	): Promise<void> {
		const url = this.buildRecordUrl(dataverseUrl, entityLogicalName, recordId);
		await vscode.env.openExternal(vscode.Uri.parse(url));
	}

	/**
	 * Copies a Dataverse record URL to the clipboard.
	 *
	 * @param dataverseUrl - The Dataverse organization URL
	 * @param entityLogicalName - The entity logical name
	 * @param recordId - The record GUID
	 * @returns Promise that resolves when the URL is copied
	 */
	public async copyRecordUrl(
		dataverseUrl: string,
		entityLogicalName: string,
		recordId: string
	): Promise<void> {
		const url = this.buildRecordUrl(dataverseUrl, entityLogicalName, recordId);
		await vscode.env.clipboard.writeText(url);
	}

	/**
	 * Opens a record and shows an information message.
	 *
	 * @param dataverseUrl - The Dataverse organization URL
	 * @param entityLogicalName - The entity logical name
	 * @param recordId - The record GUID
	 */
	public async openRecordWithFeedback(
		dataverseUrl: string,
		entityLogicalName: string,
		recordId: string
	): Promise<void> {
		await this.openRecord(dataverseUrl, entityLogicalName, recordId);
	}

	/**
	 * Copies a record URL and shows a confirmation message.
	 *
	 * @param dataverseUrl - The Dataverse organization URL
	 * @param entityLogicalName - The entity logical name
	 * @param recordId - The record GUID
	 */
	public async copyRecordUrlWithFeedback(
		dataverseUrl: string,
		entityLogicalName: string,
		recordId: string
	): Promise<void> {
		await this.copyRecordUrl(dataverseUrl, entityLogicalName, recordId);
		await vscode.window.showInformationMessage('Record URL copied to clipboard');
	}
}
