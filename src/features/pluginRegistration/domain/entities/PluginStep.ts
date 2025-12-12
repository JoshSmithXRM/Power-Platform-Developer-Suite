import { ExecutionMode } from '../valueObjects/ExecutionMode';
import { ExecutionStage } from '../valueObjects/ExecutionStage';
import { StepStatus } from '../valueObjects/StepStatus';

/**
 * Represents a registered plugin step (SDK message processing step).
 *
 * Business Rules:
 * - Steps execute at specific stages (PreValidation, PreOperation, PostOperation)
 * - Steps have execution mode (Sync vs Async)
 * - Steps have rank (execution order within same stage)
 * - Filtering attributes apply only to Update message
 * - Hidden steps (isHidden=true) are internal system steps (workflow triggers, etc.)
 *
 * Rich behavior (NOT anemic):
 * - isEnabled(): boolean
 * - canEnable(): boolean (checks if disabled)
 * - canDisable(): boolean (checks if enabled)
 * - canDelete(): boolean (checks if not managed)
 * - getExecutionOrder(): string (formatted stage + rank)
 * - getFilteringAttributesArray(): string[]
 *
 * Note: Enable/disable operations may fail server-side for Microsoft-registered steps.
 * We allow the attempt and handle errors gracefully rather than trying to predict client-side.
 */
export class PluginStep {
	constructor(
		private readonly id: string,
		private readonly name: string,
		private readonly pluginTypeId: string,
		private readonly messageId: string,
		private readonly messageName: string,
		private readonly primaryEntityId: string | null,
		private readonly primaryEntityLogicalName: string | null,
		private readonly stage: ExecutionStage,
		private readonly mode: ExecutionMode,
		private readonly rank: number,
		private readonly status: StepStatus,
		private readonly filteringAttributes: string | null,
		private readonly isManaged: boolean,
		private readonly isCustomizable: boolean,
		private readonly isHidden: boolean,
		private readonly createdOn: Date
	) {}

	/**
	 * Business rule: Step is enabled if status is Enabled.
	 */
	public isEnabled(): boolean {
		return this.status.isEnabled();
	}

	/**
	 * Business rule: Can attempt to enable if currently disabled.
	 * Note: Operation may fail server-side for Microsoft-registered steps.
	 */
	public canEnable(): boolean {
		return !this.isEnabled();
	}

	/**
	 * Business rule: Can attempt to disable if currently enabled.
	 * Note: Operation may fail server-side for Microsoft-registered steps.
	 */
	public canDisable(): boolean {
		return this.isEnabled();
	}

	/**
	 * Business rule: Can delete if not managed.
	 */
	public canDelete(): boolean {
		return !this.isManaged;
	}

	/**
	 * Formats execution order for display.
	 * Example: "PostOperation (40) - Rank 10"
	 */
	public getExecutionOrder(): string {
		const stageName = this.stage.getName();
		const stageValue = this.stage.getValue();
		return `${stageName} (${stageValue}) - Rank ${this.rank}`;
	}

	/**
	 * Gets filtering attributes as array.
	 * Returns empty array if no filtering.
	 */
	public getFilteringAttributesArray(): string[] {
		if (!this.filteringAttributes) {
			return [];
		}
		return this.filteringAttributes.split(',').map((attr) => attr.trim());
	}

	// Getters (NO business logic in getters)
	public getId(): string {
		return this.id;
	}

	public getName(): string {
		return this.name;
	}

	public getPluginTypeId(): string {
		return this.pluginTypeId;
	}

	public getMessageId(): string {
		return this.messageId;
	}

	public getMessageName(): string {
		return this.messageName;
	}

	public getPrimaryEntityId(): string | null {
		return this.primaryEntityId;
	}

	public getPrimaryEntityLogicalName(): string | null {
		return this.primaryEntityLogicalName;
	}

	public getStage(): ExecutionStage {
		return this.stage;
	}

	public getMode(): ExecutionMode {
		return this.mode;
	}

	public getRank(): number {
		return this.rank;
	}

	public getStatus(): StepStatus {
		return this.status;
	}

	public getFilteringAttributes(): string | null {
		return this.filteringAttributes;
	}

	public isInManagedState(): boolean {
		return this.isManaged;
	}

	public isInCustomizableState(): boolean {
		return this.isCustomizable;
	}

	public isInHiddenState(): boolean {
		return this.isHidden;
	}

	public getCreatedOn(): Date {
		return this.createdOn;
	}
}
