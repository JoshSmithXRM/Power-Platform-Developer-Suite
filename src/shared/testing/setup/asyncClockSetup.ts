/**
 * Async clock utilities for testing timer-dependent code.
 *
 * Uses @sinonjs/fake-timers directly (already a transitive dependency via Jest)
 * to provide proper control over setTimeout, setImmediate, and other async primitives.
 *
 * This solves the Jest fake timer + setImmediate conflict that causes
 * "unhandled promise rejection" errors in tests involving OAuth flows,
 * timeouts, and cancellation.
 *
 * @example
 * ```typescript
 * import { installAsyncClock, type AsyncClock } from '../../shared/testing/setup';
 *
 * describe('MyService', () => {
 *   let clock: AsyncClock;
 *
 *   beforeEach(() => {
 *     clock = installAsyncClock();
 *   });
 *
 *   afterEach(() => {
 *     clock.uninstall();
 *   });
 *
 *   it('should timeout after 90 seconds', async () => {
 *     const promise = myService.doSomethingWithTimeout();
 *     await clock.tickAsync(90000);
 *     await expect(promise).rejects.toThrow(/timeout/);
 *   });
 * });
 * ```
 */

import FakeTimers, { InstalledClock } from '@sinonjs/fake-timers';

/**
 * Type alias for the installed clock instance.
 * Exposes key methods for test control.
 */
export type AsyncClock = InstalledClock;

/**
 * Configuration options for the async clock.
 */
export interface AsyncClockOptions {
	/**
	 * Whether to automatically advance time (default: false).
	 * When true, time advances in real-time but can still be controlled.
	 */
	shouldAdvanceTime?: boolean;

	/**
	 * Initial date/time for the clock (default: current time).
	 */
	now?: number | Date;

	/**
	 * Which APIs to fake. Default includes setTimeout, setImmediate, clearTimeout, clearImmediate, Date.
	 * Add 'nextTick' if testing Node.js process.nextTick behavior.
	 */
	toFake?: FakeTimers.FakeMethod[];
}

/**
 * Default APIs to fake for most timer-sensitive tests.
 */
const DEFAULT_FAKE_METHODS: FakeTimers.FakeMethod[] = [
	'setTimeout',
	'clearTimeout',
	'setImmediate',
	'clearImmediate',
	'setInterval',
	'clearInterval',
	'Date'
];

/**
 * Installs a fake timer clock that provides deterministic control over
 * async operations including setTimeout and setImmediate.
 *
 * IMPORTANT: Always call clock.uninstall() in afterEach to restore real timers.
 *
 * @param options - Configuration options for the clock
 * @returns The installed clock instance
 *
 * @example
 * ```typescript
 * const clock = installAsyncClock();
 * try {
 *   // Start an async operation
 *   const promise = service.authenticate();
 *
 *   // Advance time by 90 seconds (handles all pending callbacks)
 *   await clock.tickAsync(90000);
 *
 *   // Assert the result
 *   await expect(promise).rejects.toThrow(/timeout/);
 * } finally {
 *   clock.uninstall();
 * }
 * ```
 */
export function installAsyncClock(options: AsyncClockOptions = {}): AsyncClock {
	return FakeTimers.install({
		toFake: options.toFake ?? DEFAULT_FAKE_METHODS,
		shouldAdvanceTime: options.shouldAdvanceTime ?? false,
		now: options.now
	});
}

/**
 * Helper to run a test with a managed async clock.
 * Automatically installs and uninstalls the clock.
 *
 * @param testFn - The test function that receives the clock
 * @param options - Configuration options for the clock
 *
 * @example
 * ```typescript
 * it('should timeout', async () => {
 *   await withAsyncClock(async (clock) => {
 *     const promise = service.authenticate();
 *     await clock.tickAsync(90000);
 *     await expect(promise).rejects.toThrow(/timeout/);
 *   });
 * });
 * ```
 */
export async function withAsyncClock(
	testFn: (clock: AsyncClock) => Promise<void>,
	options: AsyncClockOptions = {}
): Promise<void> {
	const clock = installAsyncClock(options);
	try {
		await testFn(clock);
	} finally {
		clock.uninstall();
	}
}
