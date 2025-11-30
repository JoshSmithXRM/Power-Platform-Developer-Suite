import { ErrorSanitizer } from './ErrorSanitizer';

describe('ErrorSanitizer', () => {
    describe('sanitize', () => {
        it('should remove Bearer tokens from error messages', () => {
            const error = new Error('Authentication failed: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U');
            const result = ErrorSanitizer.sanitize(error);

            expect(result).toBe('Authentication failed: [REDACTED]');
            expect(result).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
        });

        it('should remove multiple Bearer tokens from error messages', () => {
            const error = new Error('Token: Bearer abc123 and Bearer xyz789 exposed');
            const result = ErrorSanitizer.sanitize(error);

            expect(result).toBe('Token: [REDACTED] and [REDACTED] exposed');
            expect(result).not.toContain('abc123');
            expect(result).not.toContain('xyz789');
        });

        it('should preserve GUIDs in error messages (useful for debugging)', () => {
            const error = new Error('Entity 12345678-1234-1234-1234-123456789012 not found in environment f0a1b2c3-d4e5-f6a7-b8c9-d0e1f2a3b4c5');
            const result = ErrorSanitizer.sanitize(error);

            // GUIDs are intentionally NOT redacted - they're useful for debugging
            expect(result).toContain('12345678-1234-1234-1234-123456789012');
            expect(result).toContain('f0a1b2c3-d4e5-f6a7-b8c9-d0e1f2a3b4c5');
        });

        it('should remove Windows file paths from error messages', () => {
            const error = new Error('Failed to read file C:\\Users\\admin\\Documents\\secrets.txt');
            const result = ErrorSanitizer.sanitize(error);

            expect(result).toBe('Failed to read file [REDACTED]');
            expect(result).not.toContain('C:\\Users');
            expect(result).not.toContain('secrets.txt');
        });

        it('should remove Unix file paths from error messages', () => {
            const error = new Error('Configuration error at /home/user/.config/app/secrets.json and /var/log/app.log');
            const result = ErrorSanitizer.sanitize(error);

            expect(result).toBe('Configuration error at [REDACTED] and [REDACTED]');
            expect(result).not.toContain('/home/user');
            expect(result).not.toContain('/var/log');
        });

        it('should remove passwords from error messages', () => {
            const error = new Error('Login failed with password=MySecretPass123 for user');
            const result = ErrorSanitizer.sanitize(error);

            expect(result).toBe('Login failed with [REDACTED] for user');
            expect(result).not.toContain('MySecretPass123');
        });

        it('should remove API keys from error messages', () => {
            const error = new Error('API error: api_key=sk_live_1234567890abcdef invalid');
            const result = ErrorSanitizer.sanitize(error);

            expect(result).toBe('API error: [REDACTED] invalid');
            expect(result).not.toContain('sk_live_1234567890abcdef');
        });

        it('should remove stack trace lines from error messages', () => {
            const error = new Error('Error at DataverseService.fetch (C:\\project\\src\\service.ts:42:15) at async main');
            const result = ErrorSanitizer.sanitize(error);

            expect(result).not.toContain('DataverseService.fetch');
            expect(result).not.toContain('service.ts:42:15');
            expect(result).toContain('[REDACTED]');
        });

        it('should truncate very long error messages', () => {
            const longMessage = 'Error: ' + 'A'.repeat(250);
            const error = new Error(longMessage);
            const result = ErrorSanitizer.sanitize(error);

            expect(result.length).toBeLessThanOrEqual(203); // 200 + '...'
            expect(result).toContain('...');
        });

        it('should handle string errors and preserve GUIDs', () => {
            const result = ErrorSanitizer.sanitize('Simple error with GUID 12345678-1234-1234-1234-123456789012');

            // GUIDs preserved for debugging
            expect(result).toBe('Simple error with GUID 12345678-1234-1234-1234-123456789012');
        });

        it('should handle error objects with message property', () => {
            const error = { message: 'API failed with Bearer token123' };
            const result = ErrorSanitizer.sanitize(error);

            expect(result).toBe('API failed with [REDACTED]');
        });

        it('should return generic message for null or undefined', () => {
            expect(ErrorSanitizer.sanitize(null)).toBe('An unexpected error occurred');
            expect(ErrorSanitizer.sanitize(undefined)).toBe('An unexpected error occurred');
        });

        it('should return generic message for empty string', () => {
            expect(ErrorSanitizer.sanitize('')).toBe('An unexpected error occurred');
            expect(ErrorSanitizer.sanitize(new Error(''))).toBe('An unexpected error occurred');
        });

        it('should handle errors with multiple sensitive patterns but preserve GUIDs', () => {
            const error = new Error(
                'API failed at /usr/local/app with Bearer abc123 for org 12345678-1234-1234-1234-123456789012 password=secret123'
            );
            const result = ErrorSanitizer.sanitize(error);

            // GUIDs preserved, other sensitive data redacted
            expect(result).toContain('12345678-1234-1234-1234-123456789012');
            expect(result).not.toContain('Bearer');
            expect(result).not.toContain('abc123');
            expect(result).not.toContain('secret123');
            expect(result).not.toContain('/usr/local');
        });
    });

    describe('getFullDetails', () => {
        it('should preserve full error message and stack for Error objects', () => {
            const error = new Error('Full error with sensitive Bearer token123 data');
            error.stack = 'Error: Full error with sensitive Bearer token123 data\n    at Object.<anonymous> (test.ts:10:15)';

            const result = ErrorSanitizer.getFullDetails(error);

            expect(result).toContain('Full error with sensitive Bearer token123 data');
            expect(result).toContain('test.ts:10:15');
            expect(result).not.toBe('[REDACTED]');
        });

        it('should return message if stack is not available', () => {
            const error = new Error('Error without stack');
            delete error.stack;

            const result = ErrorSanitizer.getFullDetails(error);

            expect(result).toBe('Error without stack');
        });

        it('should handle string errors', () => {
            const result = ErrorSanitizer.getFullDetails('String error with sensitive data');

            expect(result).toBe('String error with sensitive data');
        });

        it('should serialize object errors', () => {
            const error = { message: 'Object error', code: 500, details: 'Bearer token123' };
            const result = ErrorSanitizer.getFullDetails(error);

            const parsed = JSON.parse(result);
            expect(parsed.message).toBe('Object error');
            expect(parsed.code).toBe(500);
            expect(parsed.details).toBe('Bearer token123');
        });

        it('should handle non-serializable objects', () => {
            const circular: { self?: unknown } = {};
            circular.self = circular;

            const result = ErrorSanitizer.getFullDetails(circular);

            expect(result).toBe('[object Object]');
        });

        it('should preserve all sensitive information for logging', () => {
            const error = new Error('API failed: Bearer token123, GUID 12345678-1234-1234-1234-123456789012, path /usr/local/secrets');

            const result = ErrorSanitizer.getFullDetails(error);

            // Full details should NOT sanitize anything
            expect(result).toContain('Bearer token123');
            expect(result).toContain('12345678-1234-1234-1234-123456789012');
            expect(result).toContain('/usr/local/secrets');
        });
    });
});
