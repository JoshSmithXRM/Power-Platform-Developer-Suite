import {
	isPublishInProgressError,
	getPublishInProgressMessage
} from './PublishInProgressError';

describe('PublishInProgressError', () => {
	describe('isPublishInProgressError', () => {
		it('should return false for null/undefined', () => {
			expect(isPublishInProgressError(null)).toBe(false);
			expect(isPublishInProgressError(undefined)).toBe(false);
		});

		it('should detect error code 0x80071151', () => {
			const error = new Error('Operation failed with error code 0x80071151');
			expect(isPublishInProgressError(error)).toBe(true);
		});

		it('should detect Publish operation message', () => {
			const error = new Error('Cannot start the requested operation [Publish]');
			expect(isPublishInProgressError(error)).toBe(true);
		});

		it('should detect Import operation message', () => {
			const error = new Error('Cannot start the requested operation [Import]');
			expect(isPublishInProgressError(error)).toBe(true);
		});

		it('should return false for unrelated errors', () => {
			const error = new Error('Network timeout');
			expect(isPublishInProgressError(error)).toBe(false);
		});

		it('should handle string errors', () => {
			expect(isPublishInProgressError('Error code 0x80071151')).toBe(true);
			expect(isPublishInProgressError('Some other error')).toBe(false);
		});

		it('should handle object errors with message property', () => {
			const error = { message: 'Cannot start the requested operation [Publish]' };
			expect(isPublishInProgressError(error)).toBe(true);
		});

		it('should handle object errors with error property', () => {
			const error = { error: 'Error code 0x80071151' };
			expect(isPublishInProgressError(error)).toBe(true);
		});

		it('should handle nested object errors via JSON stringify', () => {
			const error = { details: { code: '0x80071151' } };
			expect(isPublishInProgressError(error)).toBe(true);
		});

		it('should handle objects that fail JSON stringify', () => {
			const circular: Record<string, unknown> = {};
			circular['self'] = circular;
			// Should not throw, just return false
			expect(isPublishInProgressError(circular)).toBe(false);
		});
	});

	describe('getPublishInProgressMessage', () => {
		it('should return user-friendly message', () => {
			const message = getPublishInProgressMessage();
			expect(message).toContain('publish operation is already in progress');
			expect(message).toContain('Please wait');
		});
	});
});
