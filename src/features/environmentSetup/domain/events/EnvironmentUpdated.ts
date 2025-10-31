import { EnvironmentId } from '../valueObjects/EnvironmentId';

export class EnvironmentUpdated {
	constructor(
		public readonly environmentId: EnvironmentId,
		public readonly environmentName: string,
		public readonly previousName: string | undefined,
		public readonly occurredAt: Date = new Date()
	) {}
}
