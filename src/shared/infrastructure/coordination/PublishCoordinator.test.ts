import { PublishCoordinator } from './PublishCoordinator';

// Mock vscode module
jest.mock('vscode', () => ({
	Disposable: class {
		constructor(private readonly callOnDispose: () => void) {}
		dispose(): void {
			this.callOnDispose();
		}
	}
}), { virtual: true });

describe('PublishCoordinator', () => {
	beforeEach(() => {
		PublishCoordinator.reset();
		jest.useFakeTimers();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	describe('isPublishing', () => {
		it('should return false when no publish is active', () => {
			expect(PublishCoordinator.isPublishing('env-123')).toBe(false);
		});

		it('should return true when publish is active', () => {
			PublishCoordinator.notifyPublishStarted('env-123');
			expect(PublishCoordinator.isPublishing('env-123')).toBe(true);
		});

		it('should track environments independently', () => {
			PublishCoordinator.notifyPublishStarted('env-1');

			expect(PublishCoordinator.isPublishing('env-1')).toBe(true);
			expect(PublishCoordinator.isPublishing('env-2')).toBe(false);
		});
	});

	describe('notifyPublishStarted', () => {
		it('should set environment as publishing', () => {
			PublishCoordinator.notifyPublishStarted('env-123');
			expect(PublishCoordinator.isPublishing('env-123')).toBe(true);
		});

		it('should notify listeners', () => {
			const listener = jest.fn();
			PublishCoordinator.onPublishStateChanged(listener);

			PublishCoordinator.notifyPublishStarted('env-123');

			expect(listener).toHaveBeenCalledWith('env-123', true);
		});

		it('should reset timeout when called again for same environment', () => {
			PublishCoordinator.notifyPublishStarted('env-123');
			PublishCoordinator.notifyPublishStarted('env-123');

			expect(PublishCoordinator.isPublishing('env-123')).toBe(true);
		});
	});

	describe('notifyPublishCompleted', () => {
		it('should clear publishing state', () => {
			PublishCoordinator.notifyPublishStarted('env-123');
			PublishCoordinator.notifyPublishCompleted('env-123');

			expect(PublishCoordinator.isPublishing('env-123')).toBe(false);
		});

		it('should notify listeners', () => {
			const listener = jest.fn();
			PublishCoordinator.onPublishStateChanged(listener);

			PublishCoordinator.notifyPublishStarted('env-123');
			PublishCoordinator.notifyPublishCompleted('env-123');

			expect(listener).toHaveBeenCalledWith('env-123', false);
		});

		it('should handle completing when not started', () => {
			// Should not throw
			expect(() => {
				PublishCoordinator.notifyPublishCompleted('env-123');
			}).not.toThrow();
		});
	});

	describe('onPublishStateChanged', () => {
		it('should return disposable that removes listener', () => {
			const listener = jest.fn();
			const disposable = PublishCoordinator.onPublishStateChanged(listener);

			disposable.dispose();

			PublishCoordinator.notifyPublishStarted('env-123');
			expect(listener).not.toHaveBeenCalled();
		});

		it('should continue notifying other listeners if one throws', () => {
			const throwingListener = jest.fn(() => {
				throw new Error('Listener error');
			});
			const normalListener = jest.fn();

			PublishCoordinator.onPublishStateChanged(throwingListener);
			PublishCoordinator.onPublishStateChanged(normalListener);

			PublishCoordinator.notifyPublishStarted('env-123');

			expect(normalListener).toHaveBeenCalledWith('env-123', true);
		});
	});

	describe('safety timeout', () => {
		it('should auto-complete publish after 5 minutes', () => {
			PublishCoordinator.notifyPublishStarted('env-123');
			expect(PublishCoordinator.isPublishing('env-123')).toBe(true);

			// Advance time by 5 minutes
			jest.advanceTimersByTime(5 * 60 * 1000);

			expect(PublishCoordinator.isPublishing('env-123')).toBe(false);
		});

		it('should notify listeners when timeout triggers', () => {
			const listener = jest.fn();
			PublishCoordinator.onPublishStateChanged(listener);

			PublishCoordinator.notifyPublishStarted('env-123');
			listener.mockClear();

			jest.advanceTimersByTime(5 * 60 * 1000);

			expect(listener).toHaveBeenCalledWith('env-123', false);
		});
	});

	describe('reset', () => {
		it('should clear all state', () => {
			PublishCoordinator.notifyPublishStarted('env-1');
			PublishCoordinator.notifyPublishStarted('env-2');

			PublishCoordinator.reset();

			expect(PublishCoordinator.isPublishing('env-1')).toBe(false);
			expect(PublishCoordinator.isPublishing('env-2')).toBe(false);
		});

		it('should clear all listeners', () => {
			const listener = jest.fn();
			PublishCoordinator.onPublishStateChanged(listener);

			PublishCoordinator.reset();

			PublishCoordinator.notifyPublishStarted('env-123');
			expect(listener).not.toHaveBeenCalled();
		});
	});
});
