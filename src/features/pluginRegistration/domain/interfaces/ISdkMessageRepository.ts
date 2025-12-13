import type { SdkMessage } from '../entities/SdkMessage';

/**
 * Repository interface for SDK Messages.
 * Domain defines contract, infrastructure implements.
 */
export interface ISdkMessageRepository {
	/**
	 * Find all public (non-private) SDK messages.
	 * Used for step registration message dropdown.
	 */
	findAllPublic(environmentId: string): Promise<readonly SdkMessage[]>;

	/**
	 * Find SDK message by ID.
	 */
	findById(environmentId: string, messageId: string): Promise<SdkMessage | null>;

	/**
	 * Find SDK message by name.
	 */
	findByName(environmentId: string, messageName: string): Promise<SdkMessage | null>;
}
