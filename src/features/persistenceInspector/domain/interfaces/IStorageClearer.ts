import { PropertyPath } from '../valueObjects/PropertyPath';
import { ClearAllResult } from '../results/ClearAllResult';

/**
 * Domain interface for clearing storage
 * Infrastructure layer implements this
 */
export interface IStorageClearer {
	/**
	 * Clears a specific key from global state
	 */
	clearGlobalStateKey(key: string): Promise<void>;

	/**
	 * Clears a specific key from secrets
	 */
	clearSecretKey(key: string): Promise<void>;

	/**
	 * Clears a specific property at a path within a global state key
	 */
	clearGlobalStateProperty(key: string, path: PropertyPath): Promise<void>;

	/**
	 * Clears all non-protected keys from both storage types
	 */
	clearAllNonProtected(protectedKeys: string[]): Promise<ClearAllResult>;
}
