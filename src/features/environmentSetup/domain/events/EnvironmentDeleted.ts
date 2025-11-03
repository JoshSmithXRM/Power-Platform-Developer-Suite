import { EnvironmentId } from '../valueObjects/EnvironmentId';

/**
 * Domain event: Environment was deleted
 * Discriminated union pattern enables exhaustive type checking
 */
export class EnvironmentDeleted {
	public readonly type = 'EnvironmentDeleted' as const;

	constructor(
		public readonly environmentId: EnvironmentId,
		public readonly environmentName: string,
		public readonly wasActive: boolean,
		public readonly occurredAt: Date = new Date()
	) {}
}
