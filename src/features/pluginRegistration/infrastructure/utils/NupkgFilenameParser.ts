/**
 * Parsed metadata from a NuGet package filename.
 */
export interface NupkgMetadata {
	readonly name: string;
	readonly version: string;
}

/**
 * Parses NuGet package metadata from filename.
 *
 * NuGet package filenames follow the convention: {PackageId}.{Version}.nupkg
 * Example: PPDSDemo.PluginPackage.1.0.0.nupkg → name: PPDSDemo.PluginPackage, version: 1.0.0
 *
 * Version detection: Finds the first occurrence of a semantic version pattern
 * (digit.digit) after a dot separator.
 */
export class NupkgFilenameParser {
	private static readonly DEFAULT_VERSION = '1.0.0';

	/**
	 * Parse name and version from a .nupkg filename.
	 *
	 * @param filename - The filename (with or without path)
	 * @returns Parsed metadata with name and version
	 */
	public parse(filename: string): NupkgMetadata {
		// Extract just the filename if path is included
		const basename = this.extractBasename(filename);

		// Remove .nupkg extension
		const withoutExtension = this.removeExtension(basename);

		// Try to parse version from filename
		const parsed = this.parseNameAndVersion(withoutExtension);

		return parsed;
	}

	/**
	 * Extract filename from a full path.
	 */
	private extractBasename(filepath: string): string {
		// Handle both Windows and Unix paths
		const lastSlash = Math.max(filepath.lastIndexOf('/'), filepath.lastIndexOf('\\'));
		return lastSlash >= 0 ? filepath.substring(lastSlash + 1) : filepath;
	}

	/**
	 * Remove .nupkg extension (case-insensitive).
	 */
	private removeExtension(filename: string): string {
		const lowerFilename = filename.toLowerCase();
		if (lowerFilename.endsWith('.nupkg')) {
			return filename.substring(0, filename.length - 6);
		}
		return filename;
	}

	/**
	 * Parse name and version from basename (without extension).
	 *
	 * Strategy: Find the last occurrence of .X.Y where X and Y are digits.
	 * This handles cases like:
	 * - PPDSDemo.PluginPackage.1.0.0 → PPDSDemo.PluginPackage, 1.0.0
	 * - Microsoft.CrmSdk.CoreAssemblies.9.0.2.49 → Microsoft.CrmSdk.CoreAssemblies, 9.0.2.49
	 */
	private parseNameAndVersion(basename: string): NupkgMetadata {
		// Pattern: Find .X.Y where X and Y are digits (start of semantic version)
		// We look for the pattern from right to left to handle package names with numbers
		const versionPattern = /\.(\d+\.\d+.*)$/;
		const match = basename.match(versionPattern);

		if (match !== null && match.index !== undefined && match[1] !== undefined) {
			const name = basename.substring(0, match.index);
			const version = match[1];

			// Validate we got something reasonable
			if (name.length > 0 && version.length > 0) {
				return { name, version };
			}
		}

		// Fallback: use entire basename as name, default version
		return {
			name: basename || 'Unknown',
			version: NupkgFilenameParser.DEFAULT_VERSION,
		};
	}
}
