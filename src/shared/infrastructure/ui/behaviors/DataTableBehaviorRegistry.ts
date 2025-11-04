import { IDataTableBehaviorRegistry } from './IDataTableBehaviorRegistry';
import { IEnvironmentBehavior } from './IEnvironmentBehavior';
import { ISolutionFilterBehavior } from './ISolutionFilterBehavior';
import { IDataBehavior } from './IDataBehavior';
import { IMessageRoutingBehavior } from './IMessageRoutingBehavior';
import { IHtmlRenderingBehavior } from './IHtmlRenderingBehavior';
import { IPanelTrackingBehavior } from './IPanelTrackingBehavior';

/**
 * Implementation: Behavior Registry
 * Aggregates all data table panel behaviors into a single container.
 */
export class DataTableBehaviorRegistry implements IDataTableBehaviorRegistry {
	constructor(
		public readonly environmentBehavior: IEnvironmentBehavior,
		public readonly solutionFilterBehavior: ISolutionFilterBehavior,
		public readonly dataBehavior: IDataBehavior,
		public readonly messageRoutingBehavior: IMessageRoutingBehavior,
		public readonly htmlRenderingBehavior: IHtmlRenderingBehavior,
		public readonly panelTrackingBehavior: IPanelTrackingBehavior
	) {}

	/**
	 * Disposes all registered behaviors in the registry.
	 *
	 * Called when the panel is closed to clean up resources and event subscriptions.
	 */
	public dispose(): void {
		this.environmentBehavior.dispose();
		this.solutionFilterBehavior.dispose();
		this.dataBehavior.dispose();
		this.messageRoutingBehavior.dispose();
		this.panelTrackingBehavior.dispose();
	}
}
