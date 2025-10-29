/**
 * State Management Module
 *
 * Provides type-safe, multi-tier state management for panels:
 * - IStateRepository: Low-level storage abstraction
 * - IPanelStateManager: High-level state lifecycle management
 *
 * Usage:
 * ```typescript
 * import { IPanelStateManager, PanelStateManager } from '@services/state';
 *
 * interface MyInstanceState { selectedEnvironmentId: string; }
 * interface MyPreferences { filters?: {...}; }
 *
 * const stateManager: IPanelStateManager<MyInstanceState, MyPreferences> =
 *     new PanelStateManager(...);
 * ```
 */

// Storage abstractions
export { IStateRepository } from './IStateRepository';
export { InMemoryStateRepository } from './InMemoryStateRepository';
export { VSCodeStateRepository } from './VSCodeStateRepository';

// State management
export { IPanelStateManager } from './IPanelStateManager';
export { PanelStateManager } from './PanelStateManager';
