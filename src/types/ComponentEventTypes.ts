/**
 * Component Event Types
 * Used for event bridges between components and panels
 */

import { BaseComponent } from '../components/base/BaseComponent';

export interface ComponentUpdateEvent {
    componentId: string;
    timestamp: number;
}

export interface ComponentStateChangeEvent {
    componentId: string;
    state: unknown;
    timestamp: number;
}

export interface ComponentWithEvents extends BaseComponent<unknown> {
    on(event: 'update', listener: (event: ComponentUpdateEvent) => void): this;
    on(event: 'stateChange', listener: (event: ComponentStateChangeEvent) => void): this;
}

/**
 * Interface for components that need targeted DOM updates
 *
 * Components with child components (e.g., SolutionSelector has SearchInput child)
 * implement this to provide pre-rendered HTML for partial updates.
 * This avoids destroying/recreating the entire component HTML which would
 * destroy child component instances and their event handlers.
 *
 * @example
 * // SolutionSelector implements this to update only the options container
 * // while preserving the SearchInput child component
 * class SolutionSelectorComponent implements ITargetedUpdateRenderer {
 *     renderTargetedUpdate(data: object): string {
 *         return SolutionSelectorView.renderOptionsContainer(...);
 *     }
 * }
 */
export interface ITargetedUpdateRenderer {
    /**
     * Render HTML for targeted partial DOM update
     * @param data - Component data from getData()
     * @returns HTML string to inject into specific container
     */
    renderTargetedUpdate(data: object): string;
}
