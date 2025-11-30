/**
 * Value object representing web resource name.
 *
 * Typical format: publisher_prefix/optional/path/filename.ext
 *
 * Examples:
 * - new_myscript.js
 * - contoso_/scripts/utilities.js
 * - cr123_styles/main.css
 * - legacy_resource (no prefix)
 *
 * Note: Some web resources (system/legacy) may not follow the prefix_name convention.
 * The value object accepts these to handle real-world Dataverse data.
 */
export class WebResourceName {
	private constructor(private readonly value: string) {}

	/**
	 * Factory method to create WebResourceName with validation.
	 *
	 * @param value - The web resource logical name
	 * @returns WebResourceName instance
	 * @throws Error if name is empty
	 */
	public static create(value: string): WebResourceName {
		if (!value || value.trim().length === 0) {
			throw new Error('Web resource name cannot be empty');
		}

		return new WebResourceName(value);
	}

	/**
	 * Returns the full web resource name.
	 */
	public getValue(): string {
		return this.value;
	}

	/**
	 * Returns the publisher prefix (part before first underscore).
	 * Returns empty string if name has no underscore.
	 *
	 * Example: "new_myscript.js" returns "new"
	 * Example: "legacyfile.js" returns ""
	 */
	public getPrefix(): string {
		if (!this.value.includes('_')) {
			return '';
		}
		const parts = this.value.split('_');
		return parts[0] ?? '';
	}

	/**
	 * Returns the name without the publisher prefix.
	 * Returns full name if no underscore present.
	 *
	 * Example: "new_myscript.js" returns "myscript.js"
	 * Example: "new_scripts/utils.js" returns "scripts/utils.js"
	 * Example: "legacyfile.js" returns "legacyfile.js"
	 */
	public getNameWithoutPrefix(): string {
		if (!this.value.includes('_')) {
			return this.value;
		}
		const parts = this.value.split('_');
		return parts.slice(1).join('_');
	}

	/**
	 * Checks equality with another WebResourceName.
	 */
	public equals(other: WebResourceName | null): boolean {
		return other !== null && this.value === other.value;
	}

	/**
	 * String representation.
	 */
	public toString(): string {
		return this.value;
	}
}
