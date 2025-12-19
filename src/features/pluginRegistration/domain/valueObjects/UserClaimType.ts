/**
 * User claim type for Service Bus messages.
 * Determines what user context info is included in events.
 *
 * Values from PRT (ServiceEndpointUserClaim enum):
 * - None (1): No user info
 * - UserId (2): Just user GUID
 * - UserInfo (3): Full user context
 */
export class UserClaimType {
	public static readonly None = new UserClaimType(1, 'None');
	public static readonly UserId = new UserClaimType(2, 'UserId');
	public static readonly UserInfo = new UserClaimType(3, 'UserInfo');

	private constructor(
		private readonly value: number,
		private readonly name: string
	) {}

	/**
	 * Creates UserClaimType from Dataverse numeric value.
	 * @throws Error if value is not recognized
	 */
	public static fromValue(value: number): UserClaimType {
		switch (value) {
			case 1:
				return UserClaimType.None;
			case 2:
				return UserClaimType.UserId;
			case 3:
				return UserClaimType.UserInfo;
			default:
				throw new Error(`Invalid UserClaimType value: ${value}`);
		}
	}

	/**
	 * Returns all valid user claim types.
	 */
	public static all(): readonly UserClaimType[] {
		return [UserClaimType.None, UserClaimType.UserId, UserClaimType.UserInfo];
	}

	public getValue(): number {
		return this.value;
	}

	public getName(): string {
		return this.name;
	}

	public equals(other: UserClaimType): boolean {
		return this.value === other.value;
	}
}
