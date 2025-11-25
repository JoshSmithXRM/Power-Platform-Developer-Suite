import { EnvironmentId } from '../valueObjects/EnvironmentId';

/**
 * Domain event: Environment was created
 * Discriminated union pattern enables exhaustive type checking
 */
export class EnvironmentCreated {
	public readonly type = 'EnvironmentCreated' as const;

	constructor(
		public readonly environmentId: EnvironmentId,
		public readonly environmentName: string,
		public readonly occurredAt: Date = new Date()
	) {}
}
