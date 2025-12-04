import { WebResourceName } from '../valueObjects/WebResourceName';
import { WebResourceType } from '../valueObjects/WebResourceType';

/**
 * Represents a web resource in Dataverse.
 *
 * Business Rules:
 * - Web resources have immutable IDs and names
 * - Managed web resources cannot be edited
 * - File extension determined by web resource type
 *
 * Rich behavior (NOT anemic):
 * - getFileExtension(): Returns extension based on type (.js, .html, etc.)
 * - canEdit(): Business rule for editability
 * - isInSolution(): Check solution membership
 */
export class WebResource {
	constructor(
		public readonly id: string,
		public readonly name: WebResourceName,
		public readonly displayName: string,
		public readonly webResourceType: WebResourceType,
		public readonly isManaged: boolean,
		public readonly createdOn: Date,
		public readonly modifiedOn: Date,
		public readonly createdBy: string,
		public readonly modifiedBy: string
	) {}

	/**
	 * Returns file extension based on web resource type.
	 * Used by FileSystemProvider to set proper language mode.
	 *
	 * Business logic: Delegates to WebResourceType value object.
	 */
	public getFileExtension(): string {
		return this.webResourceType.getFileExtension();
	}

	/**
	 * Business rule: Can edit if type is text-based.
	 *
	 * Note: We intentionally allow editing managed web resources.
	 * While not best practice, Dataverse permits it and it's a valid
	 * scenario for production hotfixes. The "Managed" column indicates
	 * the resource's managed state to inform the user's decision.
	 */
	public canEdit(): boolean {
		return this.webResourceType.isTextBased();
	}

	/**
	 * Checks if this web resource exists in the specified solution.
	 * Used for solution-based filtering.
	 *
	 * @param solutionComponentIds - Set of component IDs from solution
	 * @returns True if this web resource's ID is in the solution
	 */
	public isInSolution(solutionComponentIds: Set<string>): boolean {
		return solutionComponentIds.has(this.id);
	}

	/**
	 * Determines if this type is text-based (can be viewed in editor).
	 */
	public isTextBased(): boolean {
		return this.webResourceType.isTextBased();
	}

	/**
	 * Determines if this is an image resource.
	 */
	public isImage(): boolean {
		return this.webResourceType.isImage();
	}
}
