import { IProtectedKeyProvider } from '../../domain/interfaces/IProtectedKeyProvider';

/**
 * Infrastructure provider for protected key patterns
 * Returns hardcoded list of storage keys that should never be cleared
 * These keys contain critical environment configurations and credentials
 */
export class HardcodedProtectedKeyProvider implements IProtectedKeyProvider {
	/**
	 * Gets the list of protected key patterns
	 * Protected keys include environment configurations and credential storage
	 * Wildcard patterns (with *) are supported for matching multiple keys
	 * @returns Array of protected key patterns
	 */
	public getProtectedKeyPatterns(): string[] {
		return [
			'power-platform-dev-suite-environments',
			'power-platform-dev-suite-secret-*',
			'power-platform-dev-suite-password-*'
		];
	}
}
