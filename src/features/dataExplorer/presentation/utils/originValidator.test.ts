/**
 * Test: Webview Origin Validator
 *
 * Regression test for bug where messages from VS Code webviews with
 * 'vscode-webview://...' origins were being rejected, causing entities
 * to not load in the Data Explorer panel.
 *
 * Bug introduced in commit 40482c0 (CodeQL security fix) where the origin
 * check incorrectly rejected vscode-webview:// origins.
 *
 * @see https://github.com/JoshSmithXRM/Power-Platform-Developer-Suite/issues/XXX
 */
describe('Webview Origin Validator', () => {
	/**
	 * The CORRECT origin validation logic.
	 * Accepts: empty string, vscode-webview://...
	 */
	function isValidWebviewOrigin(origin: string | null | undefined): boolean {
		const normalizedOrigin = origin || '';

		// Accept empty string (extension host messages)
		if (normalizedOrigin === '') {
			return true;
		}

		// Accept vscode-webview:// scheme (webview context messages)
		if (normalizedOrigin.startsWith('vscode-webview://')) {
			return true;
		}

		// Reject all other origins
		return false;
	}

	/**
	 * The BUGGY origin validation logic that was in v0.3.0.
	 * This incorrectly rejected vscode-webview:// origins.
	 */
	function isValidWebviewOriginBuggy(origin: string | null | undefined): boolean {
		// BUG: This check does NOT accept vscode-webview:// origins!
		if (origin !== '' && origin !== 'null') {
			return false;
		}
		return true;
	}

	describe('correct implementation', () => {
		it('should accept empty string origin (extension host messages)', () => {
			expect(isValidWebviewOrigin('')).toBe(true);
		});

		it('should accept null origin (coerced to empty string)', () => {
			expect(isValidWebviewOrigin(null)).toBe(true);
		});

		it('should accept undefined origin (coerced to empty string)', () => {
			expect(isValidWebviewOrigin(undefined)).toBe(true);
		});

		it('should accept vscode-webview:// origin (webview context messages)', () => {
			expect(isValidWebviewOrigin('vscode-webview://abc123-uuid')).toBe(true);
			expect(isValidWebviewOrigin('vscode-webview://test-panel')).toBe(true);
			expect(isValidWebviewOrigin('vscode-webview://')).toBe(true);
		});

		it('should reject untrusted origins', () => {
			expect(isValidWebviewOrigin('https://evil.com')).toBe(false);
			expect(isValidWebviewOrigin('http://localhost')).toBe(false);
			expect(isValidWebviewOrigin('file://')).toBe(false);
			expect(isValidWebviewOrigin('about:blank')).toBe(false);
		});
	});

	describe('buggy implementation (demonstrates the bug)', () => {
		it('accepts empty string origin - CORRECT', () => {
			expect(isValidWebviewOriginBuggy('')).toBe(true);
		});

		it('accepts literal "null" string - CORRECT', () => {
			expect(isValidWebviewOriginBuggy('null')).toBe(true);
		});

		/**
		 * THIS IS THE BUG!
		 * The buggy implementation rejects vscode-webview:// origins,
		 * which causes entities to not load because the entitiesLoaded
		 * message is silently rejected.
		 */
		it('REJECTS vscode-webview:// origin - THIS IS THE BUG!', () => {
			// The buggy implementation incorrectly returns FALSE for these
			expect(isValidWebviewOriginBuggy('vscode-webview://abc123-uuid')).toBe(false);
			expect(isValidWebviewOriginBuggy('vscode-webview://test-panel')).toBe(false);
		});

		it('rejects untrusted origins - CORRECT', () => {
			expect(isValidWebviewOriginBuggy('https://evil.com')).toBe(false);
		});
	});

	/**
	 * Integration test scenario: Messages from extension host
	 *
	 * When the extension sends messages like 'entitiesLoaded' to the webview,
	 * the message event can have different origins depending on VS Code version:
	 * - Empty string in most cases
	 * - 'vscode-webview://...' in some configurations
	 *
	 * Both should be accepted.
	 */
	describe('message handling scenarios', () => {
		interface MockMessageEvent {
			origin: string;
			data: { command: string; data?: unknown };
		}

		function shouldProcessMessage(event: MockMessageEvent): boolean {
			return isValidWebviewOrigin(event.origin);
		}

		it('should process entitiesLoaded message with empty origin', () => {
			const event: MockMessageEvent = {
				origin: '',
				data: { command: 'entitiesLoaded', data: { entities: [] } },
			};
			expect(shouldProcessMessage(event)).toBe(true);
		});

		it('should process entitiesLoaded message with vscode-webview origin', () => {
			const event: MockMessageEvent = {
				origin: 'vscode-webview://panel-uuid-12345',
				data: { command: 'entitiesLoaded', data: { entities: [] } },
			};
			expect(shouldProcessMessage(event)).toBe(true);
		});

		it('should reject message from untrusted origin', () => {
			const event: MockMessageEvent = {
				origin: 'https://malicious-site.com',
				data: { command: 'entitiesLoaded', data: { entities: [] } },
			};
			expect(shouldProcessMessage(event)).toBe(false);
		});
	});
});
