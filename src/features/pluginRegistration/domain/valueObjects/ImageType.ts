/**
 * Image type for step image (pre-image or post-image).
 *
 * Values:
 * - PreImage (0): Entity state before the operation
 * - PostImage (1): Entity state after the operation
 * - Both (2): Both pre and post images
 */
export class ImageType {
	public static readonly PreImage = new ImageType(0, 'PreImage', 'Pre-Image');
	public static readonly PostImage = new ImageType(1, 'PostImage', 'Post-Image');
	public static readonly Both = new ImageType(2, 'Both', 'Both');

	private constructor(
		private readonly value: number,
		private readonly name: string,
		private readonly displayName: string
	) {}

	/**
	 * Creates ImageType from Dataverse numeric value.
	 * @throws Error if value is not recognized
	 */
	public static fromValue(value: number): ImageType {
		switch (value) {
			case 0:
				return ImageType.PreImage;
			case 1:
				return ImageType.PostImage;
			case 2:
				return ImageType.Both;
			default:
				throw new Error(`Invalid ImageType value: ${value}`);
		}
	}

	public getValue(): number {
		return this.value;
	}

	public getName(): string {
		return this.name;
	}

	/**
	 * Returns user-friendly display name.
	 */
	public getDisplayName(): string {
		return this.displayName;
	}

	public equals(other: ImageType): boolean {
		return this.value === other.value;
	}
}
