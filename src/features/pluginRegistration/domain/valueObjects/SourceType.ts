/**
 * Source type for assembly storage location.
 *
 * Values:
 * - Database (0): Assembly stored in Dataverse database
 * - Disk (1): Assembly stored on disk (on-premises only)
 * - Normal (2): Normal/standard deployment
 * - AzureWebApp (3): Assembly deployed as Azure web app
 * - NuGet (4): Assembly from NuGet package (plugin packages)
 *
 * Note: Values may vary by Dataverse version. Unknown values handled gracefully.
 */
export class SourceType {
	public static readonly Database = new SourceType(0, 'Database');
	public static readonly Disk = new SourceType(1, 'Disk');
	public static readonly Normal = new SourceType(2, 'Normal');
	public static readonly AzureWebApp = new SourceType(3, 'AzureWebApp');
	public static readonly NuGet = new SourceType(4, 'NuGet');

	private constructor(
		private readonly value: number,
		private readonly name: string
	) {}

	/**
	 * Creates SourceType from Dataverse numeric value.
	 * Returns "Unknown" for unrecognized values instead of throwing.
	 */
	public static fromValue(value: number): SourceType {
		switch (value) {
			case 0:
				return SourceType.Database;
			case 1:
				return SourceType.Disk;
			case 2:
				return SourceType.Normal;
			case 3:
				return SourceType.AzureWebApp;
			case 4:
				return SourceType.NuGet;
			default:
				return new SourceType(value, `Unknown (${value})`);
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
