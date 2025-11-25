/**
 * Utility for generating Content Security Policy (CSP) nonces.
 */

import * as crypto from 'crypto';

/**
 * Generates a cryptographically secure random nonce for CSP.
 * @returns Base64-encoded random nonce string
 */
export function getNonce(): string {
	return crypto.randomBytes(16).toString('base64');
}
