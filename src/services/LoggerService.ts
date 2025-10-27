import * as vscode from 'vscode';

/**
 * Centralized logging service for Power Platform Developer Suite
 * Uses VS Code's native LogOutputChannel for professional logging
 */
export class LoggerService {
    private static instance: LoggerService;
    private logger: vscode.LogOutputChannel;
    private readonly extensionName = 'Power Platform Developer Suite';

    private constructor() {
        // Create VS Code native log output channel
        this.logger = vscode.window.createOutputChannel(
            this.extensionName,
            { log: true }
        );
    }

    /**
     * Get the singleton instance of LoggerService
     */
    public static getInstance(): LoggerService {
        if (!LoggerService.instance) {
            LoggerService.instance = new LoggerService();
        }
        return LoggerService.instance;
    }

    /**
     * Log trace level message (most detailed)
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public trace(component: string, message: string, metadata?: Record<string, any>): void {
        this.log('trace', component, message, metadata);
    }

    /**
     * Log debug level message
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public debug(component: string, message: string, metadata?: Record<string, any>): void {
        this.log('debug', component, message, metadata);
    }

    /**
     * Log info level message (default)
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public info(component: string, message: string, metadata?: Record<string, any>): void {
        this.log('info', component, message, metadata);
    }

    /**
     * Log warning level message
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public warn(component: string, message: string, metadata?: Record<string, any>): void {
        this.log('warn', component, message, metadata);
    }

    /**
     * Log error level message
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public error(component: string, message: string, error?: Error, metadata?: Record<string, any>): void {
        const errorMetadata = error ? {
            errorName: error.name,
            errorMessage: error.message,
            stack: error.stack,
            ...metadata
        } : metadata;
        
        this.log('error', component, message, errorMetadata);
    }

    /**
     * Internal logging method with structured format
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private log(level: 'trace' | 'debug' | 'info' | 'warn' | 'error', component: string, message: string, metadata?: Record<string, any>): void {
        const formattedComponent = `[${component}]`;
        
        // Create structured log message
        let logMessage = `${formattedComponent} ${message}`;
        
        // Add metadata if provided (sanitized)
        if (metadata) {
            const sanitizedMetadata = this.sanitizeMetadata(metadata);
            if (Object.keys(sanitizedMetadata).length > 0) {
                logMessage += ` ${JSON.stringify(sanitizedMetadata)}`;
            }
        }

        // Use VS Code's native log levels
        switch (level) {
            case 'trace':
                this.logger.trace(logMessage);
                break;
            case 'debug':
                this.logger.debug(logMessage);
                break;
            case 'info':
                this.logger.info(logMessage);
                break;
            case 'warn':
                this.logger.warn(logMessage);
                break;
            case 'error':
                this.logger.error(logMessage);
                break;
        }
    }

    /**
     * Sanitize metadata to remove sensitive information
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sanitized: Record<string, any> = {};
        const sensitiveKeys = [
            'token', 'password', 'secret', 'key', 'auth', 'credential',
            'access_token', 'refresh_token', 'bearer', 'authorization'
        ];

        for (const [key, value] of Object.entries(metadata)) {
            const lowerKey = key.toLowerCase();
            
            // Check if key contains sensitive data
            if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
                sanitized[key] = '[REDACTED]';
            } else if (typeof value === 'string' && this.looksLikeToken(value)) {
                sanitized[key] = '[REDACTED]';
            } else if (typeof value === 'object' && value !== null) {
                // Recursively sanitize nested objects
                sanitized[key] = this.sanitizeMetadata(value);
            } else {
                sanitized[key] = value;
            }
        }

        return sanitized;
    }

    /**
     * Check if a string looks like a token or credential
     */
    private looksLikeToken(value: string): boolean {
        // Check for common token patterns
        const tokenPatterns = [
            /^[A-Za-z0-9+/]{20,}={0,2}$/, // Base64-like
            /^[a-f0-9]{32,}$/i,           // Hex strings
            /^Bearer\s+/i,                // Bearer tokens
            /^[A-Z0-9]{20,}$/             // All caps alphanumeric
        ];

        return tokenPatterns.some(pattern => pattern.test(value)) && value.length > 20;
    }

    /**
     * Show the log output channel to user
     */
    public show(): void {
        this.logger.show();
    }

    /**
     * Clear all logs
     */
    public clear(): void {
        this.logger.clear();
    }

    /**
     * Dispose of the logger (for extension deactivation)
     */
    public dispose(): void {
        this.logger.dispose();
    }

    /**
     * Create a component-specific logger for easier usage
     */
    public createComponentLogger(componentName: string): {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        trace: (message: string, metadata?: Record<string, any>) => void;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        debug: (message: string, metadata?: Record<string, any>) => void;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        info: (message: string, metadata?: Record<string, any>) => void;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        warn: (message: string, metadata?: Record<string, any>) => void;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        error: (message: string, error?: Error, metadata?: Record<string, any>) => void;
    } {
        return {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            trace: (message: string, metadata?: Record<string, any>) => this.trace(componentName, message, metadata),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            debug: (message: string, metadata?: Record<string, any>) => this.debug(componentName, message, metadata),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            info: (message: string, metadata?: Record<string, any>) => this.info(componentName, message, metadata),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            warn: (message: string, metadata?: Record<string, any>) => this.warn(componentName, message, metadata),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            error: (message: string, error?: Error, metadata?: Record<string, any>) => this.error(componentName, message, error, metadata)
        };
    }
}

/**
 * Global logger instance for convenient access
 */
export const logger = LoggerService.getInstance();