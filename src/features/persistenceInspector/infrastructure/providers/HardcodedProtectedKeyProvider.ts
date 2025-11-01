import { IProtectedKeyProvider } from '../../domain/interfaces/IProtectedKeyProvider';

/**
 * Infrastructure provider for protected key patterns
 * Currently hardcoded, could be made configurable in the future
 */
export class HardcodedProtectedKeyProvider implements IProtectedKeyProvider {
	public getProtectedKeyPatterns(): string[] {
		return [
			'power-platform-dev-suite-environments',
			'power-platform-dev-suite-secret-*',
			'power-platform-dev-suite-password-*'
		];
	}
}
