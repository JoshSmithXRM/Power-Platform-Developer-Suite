/**
 * Interface for panel behaviors that handle cross-cutting concerns.
 *
 * Behaviors can handle:
 * - Environment dropdown (EnvironmentBehavior)
 * - Data loading (DataBehavior)
 * - Section composition (SectionCompositionBehavior)
 * - Message routing (MessageRoutingBehavior)
 *
 * Each behavior is self-contained and optional.
 */
export interface IPanelBehavior {
	/**
	 * Initializes the behavior.
	 * Called during panel initialization.
	 */
	initialize?(): Promise<void>;

	/**
	 * Cleans up behavior resources.
	 * Called when panel is disposed.
	 */
	dispose?(): void;
}
