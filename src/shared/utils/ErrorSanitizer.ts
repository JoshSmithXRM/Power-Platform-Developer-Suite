/**
 * Sanitizes error messages to prevent information disclosure in user-facing errors.
 *
 * This utility removes sensitive patterns from error messages before displaying them to users,
 * while preserving full error details for developer logging.
 *
 * Security Concerns Addressed:
 * - OAuth/Bearer tokens in error responses
 * - File system paths (Windows and Unix)
 * - Passwords and API keys in query strings
 * - Stack trace information
 * - Raw HTTP response bodies
 *
 * Note: GUIDs are intentionally NOT redacted - they're useful for debugging
 * and are not sensitive (internal record IDs, not secrets).
 */
export class ErrorSanitizer {
    /**
     * Patterns that indicate sensitive information in error messages.
     * These patterns are removed and replaced with [REDACTED] in sanitized output.
     */
    private static readonly SENSITIVE_PATTERNS = [
        // OAuth/Bearer tokens (JWT format or random strings) - match token only, not "Bearer" keyword
        /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi,

        // Note: GUIDs are NOT redacted - they're useful for debugging in a developer tool
        // and are not considered sensitive (they're internal record IDs, not secrets)

        // Windows file paths
        /[A-Za-z]:\\[^\s"'<>|]*/g,

        // Unix file paths (home, usr, var directories)
        /\/(?:home|usr|var|opt|etc)\/[^\s"'<>]*/g,

        // Passwords in query strings or JSON
        /\bpassword[=:]\s*[^\s&"',}]*/gi,

        // API keys in query strings or JSON
        /\b(?:api[_-]?key|apikey)[=:]\s*[^\s&"',}]*/gi,

        // Generic secrets in query strings or JSON (lowercase only to avoid false positives)
        /\b(?:secret|token)=\s*[^\s&"',}]*/gi,

        // Stack trace lines (at ClassName.method (file:line:col))
        // Matches: "at DataverseService.fetch (file.ts:42:15)" or " at async main"
        /\s+at\s+(?:async\s+)?[A-Za-z0-9.$_<>]+(?:\s+\([^)]+\))?/g,
        /\bat\s+[A-Za-z0-9.$_<>]+\s+\([^)]+\)/g,
    ];

    /**
     * Maximum length for sanitized error messages.
     * Long messages are truncated to prevent information leakage through verbose errors.
     */
    private static readonly MAX_MESSAGE_LENGTH = 500;

    /**
     * Sanitizes an error for display to end users.
     *
     * This method:
     * 1. Extracts the error message from various error types
     * 2. Removes all sensitive patterns (tokens, paths, IDs)
     * 3. Truncates long messages
     * 4. Returns a generic message if extraction fails
     *
     * @param error - The error to sanitize (can be Error, string, or unknown)
     * @returns A sanitized error message safe for user display
     *
     * @example
     * ```typescript
     * try {
     *   await apiCall();
     * } catch (error) {
     *   // Log full error for developers
     *   logger.error('API call failed', error);
     *
     *   // Show sanitized error to user
     *   vscode.window.showErrorMessage(ErrorSanitizer.sanitize(error));
     * }
     * ```
     */
    public static sanitize(error: unknown): string {
        let message = this.extractMessage(error);

        // Remove all sensitive patterns
        for (const pattern of this.SENSITIVE_PATTERNS) {
            message = message.replace(pattern, '[REDACTED]');
        }

        // Truncate very long messages (they may contain sensitive data)
        if (message.length > this.MAX_MESSAGE_LENGTH) {
            message = message.substring(0, this.MAX_MESSAGE_LENGTH) + '...';
        }

        // Return sanitized message or generic fallback
        return message.trim() || 'An unexpected error occurred';
    }

    /**
     * Gets full error details for developer logging.
     *
     * This method preserves ALL error information including:
     * - Full error message (not sanitized)
     * - Stack trace
     * - Error properties
     *
     * **IMPORTANT:** This output should ONLY be used for logging to developer channels
     * (output panels, log files, telemetry). NEVER display this to end users.
     *
     * @param error - The error to get details from
     * @returns Full error details including stack trace
     *
     * @example
     * ```typescript
     * catch (error) {
     *   // For developers: Full details to output channel
     *   logger.error('Operation failed', ErrorSanitizer.getFullDetails(error));
     *
     *   // For users: Sanitized message
     *   throw new Error(ErrorSanitizer.sanitize(error));
     * }
     * ```
     */
    public static getFullDetails(error: unknown): string {
        if (error instanceof Error) {
            const stack = error.stack || '';
            return stack || error.message;
        }

        if (typeof error === 'string') {
            return error;
        }

        if (error && typeof error === 'object') {
            try {
                return JSON.stringify(error, null, 2);
            } catch {
                return String(error);
            }
        }

        return String(error);
    }

    /**
     * Extracts a message string from various error types.
     *
     * @param error - The error to extract a message from
     * @returns The extracted message string
     */
    private static extractMessage(error: unknown): string {
        // Null or undefined
        if (error === null || error === undefined) {
            return '';
        }

        // Standard Error object
        if (error instanceof Error) {
            return error.message;
        }

        // String error
        if (typeof error === 'string') {
            return error;
        }

        // Object with message property
        if (typeof error === 'object' && 'message' in error) {
            const msg = (error as { message: unknown }).message;
            if (typeof msg === 'string') {
                return msg;
            }
        }

        // Fallback: Convert to string
        try {
            return String(error);
        } catch {
            return '';
        }
    }
}
