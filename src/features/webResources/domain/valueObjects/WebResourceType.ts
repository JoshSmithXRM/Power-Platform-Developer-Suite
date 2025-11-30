/**
 * Value object representing web resource type.
 *
 * Immutable, validated on construction.
 * Business logic: Maps Dataverse type codes to file extensions.
 * Display name mapping is done in the application layer mapper.
 *
 * @see https://learn.microsoft.com/en-us/power-apps/developer/data-platform/reference/entities/webresource#webresourcetype-choicesoptions
 */
export class WebResourceType {
	// Dataverse type codes
	public static readonly HTML = new WebResourceType(1, '.html');
	public static readonly CSS = new WebResourceType(2, '.css');
	public static readonly JAVASCRIPT = new WebResourceType(3, '.js');
	public static readonly XML = new WebResourceType(4, '.xml');
	public static readonly PNG = new WebResourceType(5, '.png');
	public static readonly JPG = new WebResourceType(6, '.jpg');
	public static readonly GIF = new WebResourceType(7, '.gif');
	public static readonly XAP = new WebResourceType(8, '.xap');
	public static readonly XSL = new WebResourceType(9, '.xsl');
	public static readonly ICO = new WebResourceType(10, '.ico');
	public static readonly SVG = new WebResourceType(11, '.svg');
	public static readonly RESX = new WebResourceType(12, '.resx');

	private static readonly ALL_TYPES = [
		WebResourceType.HTML,
		WebResourceType.CSS,
		WebResourceType.JAVASCRIPT,
		WebResourceType.XML,
		WebResourceType.PNG,
		WebResourceType.JPG,
		WebResourceType.GIF,
		WebResourceType.XAP,
		WebResourceType.XSL,
		WebResourceType.ICO,
		WebResourceType.SVG,
		WebResourceType.RESX
	];

	private constructor(
		private readonly code: number,
		private readonly extension: string
	) {}

	/**
	 * Factory method to create WebResourceType from Dataverse type code.
	 *
	 * @param code - Dataverse webresourcetype code (1-12)
	 * @returns WebResourceType instance
	 * @throws Error if code is not a valid web resource type
	 */
	public static fromCode(code: number): WebResourceType {
		const type = WebResourceType.ALL_TYPES.find(t => t.code === code);
		if (!type) {
			throw new Error(`Unknown web resource type code: ${code}`);
		}
		return type;
	}

	/**
	 * Returns the Dataverse type code.
	 */
	public getCode(): number {
		return this.code;
	}

	/**
	 * Returns the file extension for this type.
	 * Used by FileSystemProvider to set proper language mode.
	 */
	public getFileExtension(): string {
		return this.extension;
	}

	/**
	 * Determines if this type is text-based (viewable/editable in VS Code).
	 * Binary types like raster images require different handling.
	 */
	public isTextBased(): boolean {
		// HTML, CSS, JS, XML, XSL, SVG, RESX are text-based
		// SVG (11) is XML-based vector graphics
		return [1, 2, 3, 4, 9, 11, 12].includes(this.code);
	}

	/**
	 * Determines if this type is an image.
	 */
	public isImage(): boolean {
		// PNG, JPG, GIF, ICO, SVG
		return [5, 6, 7, 10, 11].includes(this.code);
	}

	/**
	 * Checks equality with another WebResourceType.
	 */
	public equals(other: WebResourceType | null): boolean {
		return other !== null && this.code === other.code;
	}
}
