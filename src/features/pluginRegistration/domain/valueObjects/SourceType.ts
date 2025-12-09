/**
 * Source type for assembly storage location.
 *
 * Values:
 * - Database (0): Assembly stored in Dataverse database
 * - Disk (1): Assembly stored on disk (on-premises only)
 * - AzureWebApp (2): Assembly deployed as Azure web app
 */
export class SourceType {
	public static readonly Database = new SourceType(0, 'Database');
	public static readonly Disk = new SourceType(1, 'Disk');
	public static readonly AzureWebApp = new SourceType(2, 'AzureWebApp');

	private constructor(
		private readonly value: number,
		private readonly name: string
	) {}

	/**
	 * Creates SourceType from Dataverse numeric value.
	 * @throws Error if value is not recognized
	 */
	public static fromValue(value: number): SourceType {
		switch (value) {
			case 0:
				return SourceType.Database;
			case 1:
				return SourceType.Disk;
			case 2:
				return SourceType.AzureWebApp;
			default:
				throw new Error(`Invalid SourceType value: ${value}`);
		}
	}

	public getValue(): number {
		return this.value;
	}

	public getName(): string {
		return this.name;
	}

	public equals(other: SourceType): boolean {
		return this.value === other.value;
	}
}
