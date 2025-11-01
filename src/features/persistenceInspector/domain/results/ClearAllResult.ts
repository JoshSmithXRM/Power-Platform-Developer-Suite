/**
 * Result object for clear all operation
 */
export class ClearAllResult {
	public constructor(
		public readonly clearedGlobalKeys: number,
		public readonly clearedSecretKeys: number,
		public readonly errors: Array<{ key: string; error: string }>
	) {}

	public get totalCleared(): number {
		return this.clearedGlobalKeys + this.clearedSecretKeys;
	}

	public hasErrors(): boolean {
		return this.errors.length > 0;
	}
}
