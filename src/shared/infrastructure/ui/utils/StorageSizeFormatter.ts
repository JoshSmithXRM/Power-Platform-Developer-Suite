/**
 * Formats storage sizes for display in the UI layer.
 * Converts byte counts to human-readable sizes (B, KB, MB).
 */
export class StorageSizeFormatter {
	/**
	 * Formats byte count as human-readable size.
	 * @param bytes - Size in bytes
	 * @returns Formatted size string (e.g., "1.50 KB", "2.00 MB")
	 */
	static formatSize(bytes: number): string {
		if (bytes < 1024) {
			return `${bytes} B`;
		}
		if (bytes < 1024 * 1024) {
			return `${(bytes / 1024).toFixed(2)} KB`;
		}
		return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
	}
}
