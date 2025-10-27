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

export interface ComponentWithEvents extends BaseComponent {
    on(event: 'update', listener: (event: ComponentUpdateEvent) => void): this;
    on(event: 'stateChange', listener: (event: ComponentStateChangeEvent) => void): this;
    getData?(): unknown;
    getType(): string;
    generateHTML(): string;
}
