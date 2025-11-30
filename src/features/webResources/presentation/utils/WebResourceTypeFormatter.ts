import type { WebResourceType } from '../../domain/valueObjects/WebResourceType';

/**
 * Formats WebResourceType for display in the UI layer.
 * Converts type codes to human-readable display names.
 */
export class WebResourceTypeFormatter {
	/**
	 * Formats WebResourceType as human-readable display name.
	 * @param type - WebResourceType value object
	 * @returns Display name string (e.g., "JavaScript", "Image (PNG)")
	 */
	static formatDisplayName(type: WebResourceType): string {
		const code = type.getCode();
		switch (code) {
			case 1:
				return 'HTML';
			case 2:
				return 'CSS';
			case 3:
				return 'JavaScript';
			case 4:
				return 'XML';
			case 5:
				return 'Image (PNG)';
			case 6:
				return 'Image (JPG)';
			case 7:
				return 'Image (GIF)';
			case 8:
				return 'Silverlight (XAP)';
			case 9:
				return 'XSL';
			case 10:
				return 'Image (ICO)';
			case 11:
				return 'Image (SVG)';
			case 12:
				return 'String (RESX)';
			default:
				return `Unknown (${code})`;
		}
	}
}
