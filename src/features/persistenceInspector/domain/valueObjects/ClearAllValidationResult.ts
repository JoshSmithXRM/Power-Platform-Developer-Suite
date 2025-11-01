/**
 * Value object representing the result of validating a clear all operation
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
	 * Generates confirmation message for clear all operation
	 */
	public getConfirmationMessage(): string {
		return `This will clear ${this._clearableCount} entries. ${this._protectedCount} protected entries will be preserved. This action cannot be undone.`;
	}
}
