/**
 * View model for presenting Solution data in the UI.
 * Presentation layer DTO with strings formatted for display.
 */
export interface SolutionViewModel {
  id: string;
  uniqueName: string;
  friendlyName: string;
  version: string;
  isManaged: string;
  publisherName: string;
  installedOn: string;
  description: string;
}
