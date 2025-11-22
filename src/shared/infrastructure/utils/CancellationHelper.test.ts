import { CancellationHelper } from './CancellationHelper';
import { ICancellationToken } from '../../domain/interfaces/ICancellationToken';
import { OperationCancelledException } from '../../domain/errors/OperationCancelledException';

describe('CancellationHelper', () => {
	describe('throwIfCancelled', () => {
		it('should not throw when cancellation token is undefined', () => {
			expect(() => {
				CancellationHelper.throwIfCancelled(undefined);
			}).not.toThrow();
		});

		it('should not throw when cancellation is not requested', () => {
			const token: ICancellationToken = {
				isCancellationRequested: false,
				onCancellationRequested: () => ({ dispose: () => {} }),
			};

			expect(() => {
				CancellationHelper.throwIfCancelled(token);
			}).not.toThrow();
		});

		it('should throw OperationCancelledException when cancellation is requested', () => {
			const token: ICancellationToken = {
				isCancellationRequested: true,
				onCancellationRequested: () => ({ dispose: () => {} }),
			};

			expect(() => {
				CancellationHelper.throwIfCancelled(token);
			}).toThrow(OperationCancelledException);
		});

		it('should throw with default message when cancellation is requested', () => {
			const token: ICancellationToken = {
				isCancellationRequested: true,
				onCancellationRequested: () => ({ dispose: () => {} }),
			};

			expect(() => {
				CancellationHelper.throwIfCancelled(token);
			}).toThrow('Operation was cancelled');
		});
	});
});
