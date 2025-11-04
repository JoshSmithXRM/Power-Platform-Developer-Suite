import { IEnvironmentBehavior } from './IEnvironmentBehavior';
import { ISolutionFilterBehavior } from './ISolutionFilterBehavior';
import { IDataBehavior } from './IDataBehavior';
import { IMessageRoutingBehavior } from './IMessageRoutingBehavior';
import { IHtmlRenderingBehavior } from './IHtmlRenderingBehavior';
import { IPanelTrackingBehavior } from './IPanelTrackingBehavior';

/**
 * Registry: Holds all behaviors for a data table panel.
 * Simplifies coordinator management by aggregating all behaviors.
 */
export interface IDataTableBehaviorRegistry {
	readonly environmentBehavior: IEnvironmentBehavior;
	readonly solutionFilterBehavior: ISolutionFilterBehavior;
	readonly dataBehavior: IDataBehavior;
	readonly messageRoutingBehavior: IMessageRoutingBehavior;
	readonly htmlRenderingBehavior: IHtmlRenderingBehavior;
	readonly panelTrackingBehavior: IPanelTrackingBehavior;

	/**
	 * Disposes all behaviors in the registry.
	 */
	dispose(): void;
}
