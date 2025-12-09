/**
 * ViewModel for displaying solution comparison in panel.
 *
 * DTO only - NO behavior.
 */
export interface SolutionComparisonViewModel {
  /** Solution friendly name */
  readonly solutionName: string;

  /** Solution unique name (for matching) */
  readonly solutionUniqueName: string;

  /** Comparison status (Same | Different | SourceOnly | TargetOnly) */
  readonly status: string;

  /** Human-readable summary */
  readonly summary: string;

  /** Source solution metadata (null if not found) */
  readonly source: SolutionMetadataViewModel | null;

  /** Target solution metadata (null if not found) */
  readonly target: SolutionMetadataViewModel | null;

  /** Array of difference descriptions */
  readonly differences: readonly string[];

  /** Environment IDs for context */
  readonly sourceEnvironmentId: string;
  readonly targetEnvironmentId: string;
}

/**
 * ViewModel for solution metadata (one side of comparison).
 */
export interface SolutionMetadataViewModel {
  readonly uniqueName: string;
  readonly friendlyName: string;
  readonly version: string;
  readonly isManaged: boolean;
  readonly managedStateDisplay: string;
  readonly installedOn: string | null;
  readonly modifiedOn: string;
  readonly publisherName: string;
}

/**
 * ViewModel for solution dropdown options.
 */
export interface SolutionOptionViewModel {
  readonly id: string;
  readonly name: string;
  readonly uniqueName: string;
}
