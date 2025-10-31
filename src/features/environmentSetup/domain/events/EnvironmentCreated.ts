import { EnvironmentId } from '../valueObjects/EnvironmentId';

export class EnvironmentCreated {
	constructor(
		public readonly environmentId: EnvironmentId,
		public readonly environmentName: string,
		public readonly occurredAt: Date = new Date()
	) {}
}
