import { CascadeType } from '../../domain/valueObjects/CascadeConfiguration';

/**
 * Static utility for mapping Dataverse enum strings to typed domain values.
 * Provides type-safe enum conversions with fallback defaults.
 */
export class MetadataEnumMappers {
	/**
	 * Maps ownership type string to typed value.
	 */
	public static mapOwnershipType(ownershipType: string | undefined): 'UserOwned' | 'OrganizationOwned' | 'TeamOwned' | 'None' {
		switch (ownershipType) {
			case 'UserOwned':
				return 'UserOwned';
			case 'OrganizationOwned':
				return 'OrganizationOwned';
			case 'TeamOwned':
				return 'TeamOwned';
			default:
				return 'None';
		}
	}

	/**
	 * Maps required level string to typed value.
	 */
	public static mapRequiredLevel(requiredLevel: string | undefined): 'None' | 'SystemRequired' | 'ApplicationRequired' | 'Recommended' {
		switch (requiredLevel) {
			case 'SystemRequired':
				return 'SystemRequired';
			case 'ApplicationRequired':
				return 'ApplicationRequired';
			case 'Recommended':
				return 'Recommended';
			default:
				return 'None';
		}
	}

	/**
	 * Maps cascade type string to typed value.
	 */
	public static mapCascadeType(cascadeType: string): CascadeType {
		switch (cascadeType) {
			case 'Cascade':
			case 'NoCascade':
			case 'Active':
			case 'UserOwned':
			case 'RemoveLink':
			case 'Restrict':
				return cascadeType;
			default:
				return 'NoCascade';
		}
	}
}
