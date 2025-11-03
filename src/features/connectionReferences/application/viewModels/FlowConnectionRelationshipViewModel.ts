/**
 * View model for presenting FlowConnectionRelationship data in the UI.
 * Presentation layer DTO with strings formatted for display.
 * Readonly ensures immutability - ViewModels are snapshots, not mutable state.
 */
export interface FlowConnectionRelationshipViewModel {
	readonly flowId: string;
	readonly flowName: string;
	readonly connectionReferenceId: string;
	readonly connectionReferenceLogicalName: string;
	readonly connectionReferenceDisplayName: string;
	readonly relationshipType: string;
	readonly flowIsManaged: string;
	readonly connectionReferenceIsManaged: string;
	readonly flowModifiedOn: string;
	readonly connectionReferenceModifiedOn: string;
}
