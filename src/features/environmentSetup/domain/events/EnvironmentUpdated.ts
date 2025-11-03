import { EnvironmentId } from '../valueObjects/EnvironmentId';

/**
 * Domain event: Environment was updated
 * Discriminated union pattern enables exhaustive type checking
 */
export class EnvironmentUpdated {
	public readonly type = 'EnvironmentUpdated' as const;

	constructor(
		public readonly environmentId: EnvironmentId,
		public readonly environmentName: string,
		public readonly previousName: string | undefined,
		public readonly occurredAt: Date = new Date()
	) {}
}
