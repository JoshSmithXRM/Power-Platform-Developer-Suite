import { NullLogger } from '../../../infrastructure/logging/NullLogger';
import type { ILogger } from '../../../infrastructure/logging/ILogger';

/**
 * Creates a mocked logger for testing.
 * By default, returns a NullLogger with all methods spied on.
 *
 * @returns A jest-mocked logger instance
 *
 * @example
 * ```typescript
 * const logger = createMockLogger();
 * expect(logger.info).toHaveBeenCalledWith('Message', { data: 'value' });
 * ```
 */
export function createMockLogger(): jest.Mocked<ILogger> {
	const logger = new NullLogger();

	// Spy on all logger methods
	jest.spyOn(logger, 'trace');
	jest.spyOn(logger, 'debug');
	jest.spyOn(logger, 'info');
	jest.spyOn(logger, 'warn');
	jest.spyOn(logger, 'error');

	return logger as jest.Mocked<ILogger>;
}

/**
 * Creates a fresh NullLogger instance for testing (not mocked).
 * Use this when you don't need to assert on logger calls.
 *
 * @returns A NullLogger instance
 *
 * @example
 * ```typescript
 * const useCase = new SomeUseCase(repository, createNullLogger());
 * ```
 */
export function createNullLogger(): ILogger {
	return new NullLogger();
}
