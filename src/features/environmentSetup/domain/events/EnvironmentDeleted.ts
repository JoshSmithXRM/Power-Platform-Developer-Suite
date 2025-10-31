import { EnvironmentId } from '../valueObjects/EnvironmentId';

export class EnvironmentDeleted {
	constructor(
		public readonly environmentId: EnvironmentId,
		public readonly environmentName: string,
		public readonly wasActive: boolean,
		public readonly occurredAt: Date = new Date()
	) {}
}
