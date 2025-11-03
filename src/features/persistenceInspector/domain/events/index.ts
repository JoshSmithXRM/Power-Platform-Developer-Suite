/**
 * Persistence Inspector Domain Events
 * Discriminated union enables exhaustive type checking in event handlers
 */

export { DomainEvent } from './DomainEvent';
export { StorageInspected } from './StorageInspected';
export { StorageEntryCleared } from './StorageEntryCleared';
export { StoragePropertyCleared } from './StoragePropertyCleared';
export { StorageClearedAll } from './StorageClearedAll';
export { SecretRevealed } from './SecretRevealed';

import type { StorageInspected } from './StorageInspected';
import type { StorageEntryCleared } from './StorageEntryCleared';
import type { StoragePropertyCleared } from './StoragePropertyCleared';
import type { StorageClearedAll } from './StorageClearedAll';
import type { SecretRevealed } from './SecretRevealed';

/**
 * Discriminated union of all Storage domain events
 * Enables exhaustive switch/case type checking with TypeScript's never type.
 *
 * @example
 * ```typescript
 * function handleStorageEvent(event: StorageEvent): void {
 *   switch (event.type) {
 *     case 'StorageInspected':
 *       console.log(`Inspected: ${event.totalEntries} entries`);
 *       break;
 *     case 'StorageEntryCleared':
 *       console.log(`Cleared entry: ${event.key}`);
 *       break;
 *     case 'StoragePropertyCleared':
 *       console.log(`Cleared property: ${event.key}.${event.path}`);
 *       break;
 *     case 'StorageClearedAll':
 *       console.log(`Cleared all: ${event.clearedCount} entries`);
 *       break;
 *     case 'SecretRevealed':
 *       console.log(`Secret revealed: ${event.key}`);
 *       break;
 *     default:
 *       const _exhaustive: never = event;
 *       throw new Error(`Unhandled event type: ${JSON.stringify(_exhaustive)}`);
 *   }
 * }
 * ```
 */
export type StorageEvent =
	| StorageInspected
	| StorageEntryCleared
	| StoragePropertyCleared
	| StorageClearedAll
	| SecretRevealed;
