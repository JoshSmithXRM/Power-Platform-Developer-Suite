/**
 * Domain entity: Trace Filter
 *
 * Represents filter criteria for querying plugin traces.
 * Immutable entity that uses builder pattern for modifications.
 */
export class TraceFilter {
	constructor(
		public readonly top: number,
		public readonly orderBy: string,
		public readonly odataFilter?: string
	) {}

	static default(): TraceFilter {
		return new TraceFilter(100, 'createdon desc');
	}

	static create(params: {
		top?: number;
		orderBy?: string;
		odataFilter?: string;
	}): TraceFilter {
		return new TraceFilter(
			params.top ?? 100,
			params.orderBy ?? 'createdon desc',
			params.odataFilter
		);
	}

	/**
	 * Immutable - returns new instance.
	 */
	withFilter(odataFilter: string): TraceFilter {
		return new TraceFilter(this.top, this.orderBy, odataFilter);
	}

	/**
	 * Immutable - returns new instance.
	 */
	withTop(top: number): TraceFilter {
		return new TraceFilter(top, this.orderBy, this.odataFilter);
	}
}
