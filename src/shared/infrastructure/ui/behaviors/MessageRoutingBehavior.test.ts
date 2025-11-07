import { ILogger } from '../../../../infrastructure/logging/ILogger';

import { MessageRoutingBehavior } from './MessageRoutingBehavior';
import type { MessageHandler } from './IMessageRoutingBehavior';

jest.mock('vscode', () => ({
	Disposable: class {
		dispose() {}
	}
}), { virtual: true });

jest.mock('../../../../infrastructure/ui/utils/TypeGuards', () => ({
	isWebviewMessage: jest.fn((message: unknown): boolean => {
		return typeof message === 'object' && message !== null && 'command' in message;
	}),
	isWebviewLogMessage: jest.fn((message: unknown): boolean => {
		if (typeof message !== 'object' || message === null || !('command' in message)) {
			return false;
		}
		const msg = message as Record<string, unknown>;
		return msg['command'] === 'webview-log' &&
			typeof msg['level'] === 'string' &&
			typeof msg['message'] === 'string';
	})
}));

function createMockWebview(): import('vscode').Webview {
	return {
		onDidReceiveMessage: jest.fn()
	} as unknown as import('vscode').Webview;
}

describe('MessageRoutingBehavior', () => {
	let webviewMock: import('vscode').Webview;
	let loggerMock: jest.Mocked<ILogger>;
	let behavior: MessageRoutingBehavior;
	let messageListener: ((message: unknown) => Promise<void>) | null;

	beforeEach(() => {
		jest.clearAllMocks();
		messageListener = null;

		webviewMock = createMockWebview();
		(webviewMock.onDidReceiveMessage as jest.Mock).mockImplementation((callback) => {
			messageListener = callback;
			return { dispose: jest.fn() };
		});

		loggerMock = {
			trace: jest.fn(),
		debug: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn()
		};

		behavior = new MessageRoutingBehavior(webviewMock, loggerMock);
	});

	describe('registerHandler', () => {
		it('should register handler for command', () => {
			const handler = jest.fn();

			behavior.registerHandler('testCommand', handler);

			expect(() => behavior.registerHandler('testCommand', handler)).not.toThrow();
		});

		it('should allow multiple handlers for different commands', () => {
			const handler1 = jest.fn();
			const handler2 = jest.fn();

			behavior.registerHandler('command1', handler1);
			behavior.registerHandler('command2', handler2);

			expect(() => behavior.registerHandler('command1', handler1)).not.toThrow();
		});

		it('should overwrite existing handler for same command', async () => {
			const handler1 = jest.fn().mockResolvedValue(undefined);
			const handler2 = jest.fn().mockResolvedValue(undefined);

			behavior.registerHandler('testCommand', handler1);
			behavior.registerHandler('testCommand', handler2);
			behavior.initialize();

			await messageListener?.({ command: 'testCommand' });

			expect(handler1).not.toHaveBeenCalled();
			expect(handler2).toHaveBeenCalled();
		});
	});

	describe('initialize', () => {
		it('should register message listener on webview', () => {
			behavior.initialize();

			expect(webviewMock.onDidReceiveMessage).toHaveBeenCalled();
		});

		it('should store disposable for cleanup', () => {
			const disposable = { dispose: jest.fn() };
			(webviewMock.onDidReceiveMessage as jest.Mock).mockImplementation(
				(callback, thisArg, disposables) => {
					if (disposables) {
						disposables.push(disposable);
					}
					return disposable;
				}
			);

			behavior.initialize();
			behavior.dispose();

			expect(disposable.dispose).toHaveBeenCalled();
		});
	});

	describe('message handling', () => {
		it('should route valid message to registered handler', async () => {
			const handler = jest.fn().mockResolvedValue(undefined);

			behavior.registerHandler('testCommand', handler);
			behavior.initialize();

			await messageListener?.({ command: 'testCommand', data: { value: 'test' } });

			expect(handler).toHaveBeenCalledWith({ command: 'testCommand', data: { value: 'test' } });
			expect(loggerMock.debug).toHaveBeenCalledWith('Handling webview command', { command: 'testCommand' });
		});

		it('should handle message with no data', async () => {
			const handler = jest.fn().mockResolvedValue(undefined);

			behavior.registerHandler('simpleCommand', handler);
			behavior.initialize();

			await messageListener?.({ command: 'simpleCommand' });

			expect(handler).toHaveBeenCalledWith({ command: 'simpleCommand' });
		});

		it('should warn on invalid message format', async () => {
			behavior.initialize();

			await messageListener?.({ invalidProperty: 'value' });

			expect(loggerMock.warn).toHaveBeenCalledWith(
				'Received invalid message from webview',
				{ invalidProperty: 'value' }
			);
		});

		it('should warn on null message', async () => {
			behavior.initialize();

			await messageListener?.(null);

			expect(loggerMock.warn).toHaveBeenCalledWith(
				'Received invalid message from webview',
				null
			);
		});

		it('should warn on undefined message', async () => {
			behavior.initialize();

			await messageListener?.(undefined);

			expect(loggerMock.warn).toHaveBeenCalledWith(
				'Received invalid message from webview',
				undefined
			);
		});

		it('should warn when no handler registered for command', async () => {
			behavior.initialize();

			await messageListener?.({ command: 'unregisteredCommand' });

			expect(loggerMock.warn).toHaveBeenCalledWith(
				'No handler registered for command',
				{ command: 'unregisteredCommand' }
			);
		});

		it('should catch and log handler errors', async () => {
			const error = new Error('Handler failed');
			const handler = jest.fn().mockRejectedValue(error);

			behavior.registerHandler('failingCommand', handler);
			behavior.initialize();

			await messageListener?.({ command: 'failingCommand' });

			expect(loggerMock.error).toHaveBeenCalledWith(
				'Error handling webview command',
				error
			);
		});

		it('should handle synchronous handler errors', async () => {
			const error = new Error('Sync error');
			const handler: MessageHandler = () => {
				throw error;
			};

			behavior.registerHandler('syncFailCommand', handler);
			behavior.initialize();

			await messageListener?.({ command: 'syncFailCommand' });

			expect(loggerMock.error).toHaveBeenCalledWith(
				'Error handling webview command',
				error
			);
		});
	});

	describe('webview log forwarding', () => {
		beforeEach(() => {
			behavior.initialize();
		});

		it('should forward debug log to logger', async () => {
			await messageListener?.({
				command: 'webview-log',
				level: 'debug',
				message: 'Debug message from webview'
			});

			expect(loggerMock.debug).toHaveBeenCalledWith('[Webview] Debug message from webview');
		});

		it('should forward info log to logger', async () => {
			await messageListener?.({
				command: 'webview-log',
				level: 'info',
				message: 'Info message from webview'
			});

			expect(loggerMock.info).toHaveBeenCalledWith('[Webview] Info message from webview');
		});

		it('should forward warn log to logger', async () => {
			await messageListener?.({
				command: 'webview-log',
				level: 'warn',
				message: 'Warning from webview'
			});

			expect(loggerMock.warn).toHaveBeenCalledWith('[Webview] Warning from webview');
		});

		it('should forward error log to logger', async () => {
			await messageListener?.({
				command: 'webview-log',
				level: 'error',
				message: 'Error from webview'
			});

			expect(loggerMock.error).toHaveBeenCalledWith('[Webview] Error from webview');
		});

		it('should not route log messages to command handlers', async () => {
			const handler = jest.fn().mockResolvedValue(undefined);
			behavior.registerHandler('webview-log', handler);

			await messageListener?.({
				command: 'webview-log',
				level: 'info',
				message: 'Test log'
			});

			expect(handler).not.toHaveBeenCalled();
			expect(loggerMock.info).toHaveBeenCalledWith('[Webview] Test log');
		});
	});

	describe('dispose', () => {
		it('should dispose all registered disposables', () => {
			const disposable1 = { dispose: jest.fn() };
			const disposable2 = { dispose: jest.fn() };
			let callCount = 0;

			(webviewMock.onDidReceiveMessage as jest.Mock).mockImplementation(
				(callback, thisArg, disposables) => {
					callCount++;
					const disposable = callCount === 1 ? disposable1 : disposable2;
					if (disposables) {
						disposables.push(disposable);
					}
					return disposable;
				}
			);

			behavior.initialize();
			behavior.initialize(); // Register twice to test multiple disposables

			behavior.dispose();

			expect(disposable1.dispose).toHaveBeenCalled();
			expect(disposable2.dispose).toHaveBeenCalled();
		});

		it('should handle dispose when no disposables registered', () => {
			expect(() => behavior.dispose()).not.toThrow();
		});

		it('should handle null disposables gracefully', () => {
			(webviewMock.onDidReceiveMessage as jest.Mock).mockReturnValue(null);

			behavior.initialize();

			expect(() => behavior.dispose()).not.toThrow();
		});
	});

	describe('handler execution order', () => {
		it('should execute handlers in registration order for different commands', async () => {
			const executionOrder: string[] = [];
			const handler1 = jest.fn().mockImplementation(async () => {
				executionOrder.push('handler1');
			});
			const handler2 = jest.fn().mockImplementation(async () => {
				executionOrder.push('handler2');
			});

			behavior.registerHandler('command1', handler1);
			behavior.registerHandler('command2', handler2);
			behavior.initialize();

			await messageListener?.({ command: 'command1' });
			await messageListener?.({ command: 'command2' });

			expect(executionOrder).toEqual(['handler1', 'handler2']);
		});

		it('should await handler completion before processing next message', async () => {
			let handlerCompleted = false;
			const handler = jest.fn().mockImplementation(async () => {
				await new Promise(resolve => setTimeout(resolve, 10));
				handlerCompleted = true;
			});

			behavior.registerHandler('asyncCommand', handler);
			behavior.initialize();

			await messageListener?.({ command: 'asyncCommand' });

			expect(handlerCompleted).toBe(true);
		});
	});
});
