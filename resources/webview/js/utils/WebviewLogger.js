/**
 * WebviewLogger - Production logging for webviews
 * Bridges webview logs to extension host's OutputChannel via postMessage
 * DEV_MODE is injected at build time by webpack DefinePlugin
 */
export class WebviewLogger {
	/**
	 * @param {ReturnType<typeof acquireVsCodeApi>} vscode - VS Code API instance
	 * @param {string} componentName - Component identifier (e.g., 'EnvironmentSetup')
	 */
	constructor(vscode, componentName) {
		this.vscode = vscode;
		this.componentName = componentName;
	}

	debug(message, context) {
		this.log('debug', message, context);
	}

	info(message, context) {
		this.log('info', message, context);
	}

	warn(message, context) {
		this.log('warn', message, context);
	}

	error(message, error) {
		this.log('error', message, this.serializeError(error));
	}

	/**
	 * Sends log message to extension host
	 * @private
	 */
	log(level, message, data) {
		// Send to extension host (production logging)
		this.vscode.postMessage({
			command: 'webview-log',
			level,
			message,
			componentName: this.componentName,
			data,
			timestamp: new Date().toISOString()
		});

		// In development, ALSO log to console (DEV_MODE injected by webpack)
		if (typeof DEV_MODE !== 'undefined' && DEV_MODE) {
			const formatted = `[${this.componentName}] ${message}`;
			switch (level) {
				case 'debug':
					console.log(formatted, data);
					break;
				case 'info':
					console.info(formatted, data);
					break;
				case 'warn':
					console.warn(formatted, data);
					break;
				case 'error':
					console.error(formatted, data);
					break;
			}
		}
	}

	/**
	 * Serializes Error objects for postMessage
	 * @private
	 */
	serializeError(error) {
		if (!error) return undefined;

		if (error instanceof Error) {
			return {
				message: error.message,
				name: error.name,
				stack: error.stack
			};
		}

		return { message: String(error) };
	}
}
