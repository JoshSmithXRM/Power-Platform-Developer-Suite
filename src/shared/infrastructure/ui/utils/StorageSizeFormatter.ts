/**
 * Formats storage sizes for display in the UI layer.
 * Converts byte counts to human-readable sizes (B, KB, MB).
 */
export class StorageSizeFormatter {
	/**
	 * Number of bytes in one kilobyte (binary: 2^10).
	 */
	private static readonly BYTES_PER_KB = 1024;

	/**
	 * Number of bytes in one megabyte (binary: 2^20).
	 */
	private static readonly BYTES_PER_MB = 1024 * 1024;

	/**
	 * Number of decimal places to display for KB and MB values.
	 */
	private static readonly DECIMAL_PLACES = 2;

	/**
	 * Formats byte count as human-readable size.
	 * @param bytes - Size in bytes
	 * @returns Formatted size string (e.g., "1.50 KB", "2.00 MB")
	 */
	static formatSize(bytes: number): string {
		if (bytes < StorageSizeFormatter.BYTES_PER_KB) {
			return `${bytes} B`;
		}
		if (bytes < StorageSizeFormatter.BYTES_PER_MB) {
			return `${(bytes / StorageSizeFormatter.BYTES_PER_KB).toFixed(StorageSizeFormatter.DECIMAL_PLACES)} KB`;
		}
		return `${(bytes / StorageSizeFormatter.BYTES_PER_MB).toFixed(StorageSizeFormatter.DECIMAL_PLACES)} MB`;
	}
}
