/**
 * View model for presenting Solution data in the UI.
 * Presentation layer DTO with strings formatted for display.
 * Readonly ensures immutability - ViewModels are snapshots, not mutable state.
 */
export interface SolutionViewModel {
  readonly id: string;
  readonly uniqueName: string;
  readonly friendlyName: string;
  readonly version: string;
  readonly isManaged: string;
  readonly publisherName: string;
  readonly installedOn: string;
  readonly description: string;
  readonly modifiedOn: string;
  readonly isVisible: string;
  readonly isApiManaged: string;
}
