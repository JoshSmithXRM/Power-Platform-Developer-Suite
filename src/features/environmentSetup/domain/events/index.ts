/**
 * Environment Setup Domain Events
 * Discriminated union enables exhaustive type checking in event handlers
 */

export { EnvironmentCreated } from './EnvironmentCreated';
export { EnvironmentUpdated } from './EnvironmentUpdated';
export { EnvironmentDeleted } from './EnvironmentDeleted';
export { AuthenticationCacheInvalidationRequested } from './AuthenticationCacheInvalidationRequested';

import type { EnvironmentCreated } from './EnvironmentCreated';
import type { EnvironmentUpdated } from './EnvironmentUpdated';
import type { EnvironmentDeleted } from './EnvironmentDeleted';
import type { AuthenticationCacheInvalidationRequested } from './AuthenticationCacheInvalidationRequested';

/**
 * Discriminated union of all Environment domain events
 * Enables exhaustive switch/case type checking with TypeScript's never type.
 *
 * @example
 * ```typescript
 * function handleEnvironmentEvent(event: EnvironmentEvent): void {
 *   switch (event.type) {
 *     case 'EnvironmentCreated':
 *       // TypeScript knows event is EnvironmentCreated
 *       console.log(`Created: ${event.environmentName}`);
 *       break;
 *     case 'EnvironmentUpdated':
 *       // TypeScript knows event is EnvironmentUpdated
 *       console.log(`Updated: ${event.previousName} -> ${event.environmentName}`);
 *       break;
 *     case 'EnvironmentDeleted':
 *       // TypeScript knows event is EnvironmentDeleted
 *       console.log(`Deleted: ${event.environmentName}`);
 *       break;
 *     case 'AuthenticationCacheInvalidationRequested':
 *       // TypeScript knows event is AuthenticationCacheInvalidationRequested
 *       console.log(`Cache invalidation: ${event.reason}`);
 *       break;
 *     default:
 *       // Exhaustive check - TypeScript ensures all cases handled
 *       const _exhaustive: never = event;
 *       throw new Error(`Unhandled event type: ${JSON.stringify(_exhaustive)}`);
 *   }
 * }
 * ```
 */
export type EnvironmentEvent =
	| EnvironmentCreated
	| EnvironmentUpdated
	| EnvironmentDeleted
	| AuthenticationCacheInvalidationRequested;
