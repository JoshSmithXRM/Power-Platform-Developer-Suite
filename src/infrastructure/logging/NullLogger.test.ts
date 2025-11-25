import { NullLogger } from './NullLogger';

describe('NullLogger', () => {
	let logger: NullLogger;

	beforeEach(() => {
		logger = new NullLogger();
	});

	describe('trace', () => {
		it('should accept message without args', () => {
			expect(() => logger.trace('Trace message')).not.toThrow();
		});

		it('should accept message with single arg', () => {
			expect(() => logger.trace('Trace message', { key: 'value' })).not.toThrow();
		});

		it('should accept message with multiple args', () => {
			expect(() => logger.trace('Trace message', { key: 'value' }, 'string', 123)).not.toThrow();
		});
	});

	describe('debug', () => {
		it('should accept message without args', () => {
			expect(() => logger.debug('Debug message')).not.toThrow();
		});

		it('should accept message with single arg', () => {
			expect(() => logger.debug('Debug message', { key: 'value' })).not.toThrow();
		});

		it('should accept message with multiple args', () => {
			expect(() => logger.debug('Debug message', { key: 'value' }, 'string', 123)).not.toThrow();
		});
	});

	describe('info', () => {
		it('should accept message without args', () => {
			expect(() => logger.info('Info message')).not.toThrow();
		});

		it('should accept message with single arg', () => {
			expect(() => logger.info('Info message', { key: 'value' })).not.toThrow();
		});

		it('should accept message with multiple args', () => {
			expect(() => logger.info('Info message', { key: 'value' }, 'string', 123)).not.toThrow();
		});
	});

	describe('warn', () => {
		it('should accept message without args', () => {
			expect(() => logger.warn('Warn message')).not.toThrow();
		});

		it('should accept message with single arg', () => {
			expect(() => logger.warn('Warn message', { key: 'value' })).not.toThrow();
		});

		it('should accept message with multiple args', () => {
			expect(() => logger.warn('Warn message', { key: 'value' }, 'string', 123)).not.toThrow();
		});
	});

	describe('error', () => {
		it('should accept message without error arg', () => {
			expect(() => logger.error('Error message')).not.toThrow();
		});

		it('should accept message with error object', () => {
			const error = new Error('Test error');
			expect(() => logger.error('Error message', error)).not.toThrow();
		});

		it('should accept message with error string', () => {
			expect(() => logger.error('Error message', 'Error string')).not.toThrow();
		});

		it('should accept message with error as any value', () => {
			expect(() => logger.error('Error message', { details: 'error details' })).not.toThrow();
		});
	});
});
