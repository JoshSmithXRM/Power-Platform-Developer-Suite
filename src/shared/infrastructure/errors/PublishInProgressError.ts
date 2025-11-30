/**
 * Detects if an error is a "publish in progress" error from Dataverse.
 *
 * Dataverse returns HTTP 429 with error code 0x80071151 when another
 * publish or import operation is already running.
 *
 * @param error - The error to check
 * @returns True if this is a publish-in-progress error
 */
export function isPublishInProgressError(error: unknown): boolean {
	if (!error) {
		return false;
	}

	// Convert to string for pattern matching
	const errorString = getErrorString(error);

	// Check for Dataverse error code for concurrent publish/import
	// Error code: 0x80071151
	// Message contains: "Cannot start the requested operation [Publish]"
	if (errorString.includes('0x80071151')) {
		return true;
	}

	// Also check for the message pattern
	if (
		errorString.includes('Cannot start the requested operation') &&
		(errorString.includes('[Publish]') || errorString.includes('[Import]'))
	) {
		return true;
	}

	return false;
}

/**
 * Extracts a string representation from various error types.
 */
function getErrorString(error: unknown): string {
	if (typeof error === 'string') {
		return error;
	}

	if (error instanceof Error) {
		return error.message;
	}

	if (typeof error === 'object' && error !== null) {
		// Check for common error properties
		const obj = error as Record<string, unknown>;
		if (typeof obj['message'] === 'string') {
			return obj['message'];
		}
		if (typeof obj['error'] === 'string') {
			return obj['error'];
		}
		// Try JSON stringify for nested structures
		try {
			return JSON.stringify(error);
		} catch {
			return String(error);
		}
	}

	return String(error);
}

/**
 * Returns a user-friendly message for publish-in-progress errors.
 */
export function getPublishInProgressMessage(): string {
	return (
		'A publish operation is already in progress ' +
		'(possibly from Power Apps or another user). ' +
		'Please wait a moment and try again.'
	);
}
