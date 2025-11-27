import type { CellLink } from '../../../../shared/infrastructure/ui/types/CellLink';

/**
 * View model for presenting Solution data in the UI.
 * Presentation layer DTO with strings formatted for display.
 * Readonly ensures immutability - ViewModels are snapshots, not mutable state.
 */
export interface SolutionViewModel {
  [key: string]: unknown;
  readonly id: string;
  readonly uniqueName: string;
  readonly friendlyName: string;
  /** Structured link data for creating clickable solution name (no raw HTML) */
  readonly friendlyNameLink: CellLink;
  readonly version: string;
  readonly isManaged: string;
  readonly publisherName: string;
  readonly installedOn: string;
  readonly installedOnSortValue: number;
  readonly description: string;
  readonly modifiedOn: string;
  readonly modifiedOnSortValue: number;
  readonly isVisible: string;
  readonly isApiManaged: string;
}
