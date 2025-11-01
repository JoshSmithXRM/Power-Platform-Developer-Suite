/**
 * Value object representing validation result for a clear all operation.
 *
 * Contains counts of clearable and protected entries to support:
 * - Validation: Check if operation makes sense (any clearable entries?)
 * - User Confirmation: Show counts in confirmation dialog
 * - Result Reporting: Display what was cleared vs. preserved
 *
 * Business Rules:
 * - Must have at least one clearable entry to proceed
 * - Protected entries are automatically skipped (never cleared)
 * - Counts used for generating user-friendly confirmation messages
 *
 * WHY: Separates validation logic from UI concerns. Domain layer computes
 * counts; presentation layer decides how to display them.
 *
 * @example
 * ```typescript
 * const result = collection.validateClearAllOperation();
 * if (result.hasClearableEntries()) {
 *   const confirmed = await confirm(result.getConfirmationMessage());
 *   if (confirmed) {
 *     // proceed with clear operation
 *   }
 * }
 * ```
 */
export class ClearAllValidationResult {
	private constructor(
		private readonly _clearableCount: number,
		private readonly _protectedCount: number
	) {}

	public static create(
		clearableCount: number,
		protectedCount: number
	): ClearAllValidationResult {
		return new ClearAllValidationResult(clearableCount, protectedCount);
	}

	public get clearableCount(): number {
		return this._clearableCount;
	}

	public get protectedCount(): number {
		return this._protectedCount;
	}

	public hasClearableEntries(): boolean {
		return this._clearableCount > 0;
	}

	/**
	 * Generates user-friendly confirmation message for clear all operation.
	 *
	 * WHY: Provides clear, actionable information for user confirmation dialog.
	 * Shows what will happen (counts) and consequences (cannot be undone).
	 *
	 * @returns {string} Confirmation message with counts
	 */
	public getConfirmationMessage(): string {
		return `This will clear ${this._clearableCount} entries. ${this._protectedCount} protected entries will be preserved. This action cannot be undone.`;
	}
}
