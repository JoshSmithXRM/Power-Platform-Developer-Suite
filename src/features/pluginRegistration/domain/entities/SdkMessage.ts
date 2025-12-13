/**
 * Represents an SDK Message (e.g., Create, Update, Delete, Retrieve).
 *
 * SDK Messages define the operations that can trigger plugins.
 * Each message can have multiple filters (one per entity that supports it).
 */
export class SdkMessage {
	constructor(
		private readonly id: string,
		private readonly name: string,
		private readonly isPrivate: boolean,
		private readonly isCustomizable: boolean
	) {}

	public getId(): string {
		return this.id;
	}

	public getName(): string {
		return this.name;
	}

	public isInPrivateState(): boolean {
		return this.isPrivate;
	}

	public isInCustomizableState(): boolean {
		return this.isCustomizable;
	}
}
