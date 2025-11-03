/**
 * Constants related to Power Platform Solutions.
 * These constants are shared across features to avoid cross-feature coupling.
 */

/**
 * The GUID of the Default Solution across all Dataverse environments.
 *
 * The Default Solution is a special system solution that exists in every Dataverse environment.
 * It contains all unmanaged customizations that are not part of any other solution.
 * All customizations start here before being added to a specific solution.
 *
 * This GUID is consistent across all Dataverse instances worldwide and is maintained by Microsoft.
 *
 * Use cases:
 * - Filtering components by solution (show all vs. show specific solution)
 * - Identifying system-managed customizations
 * - Default selection in solution dropdowns
 */
export const DEFAULT_SOLUTION_ID = 'fd140aaf-4df4-11dd-bd17-0019b9312238';
