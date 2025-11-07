import type { TraceFilter } from '../../domain/entities/TraceFilter';

/**
 * Presentation Formatter: Filter Summary
 *
 * Formats TraceFilter domain entity into human-readable summary text.
 * Presentation logic kept separate from domain entities.
 */
export class FilterSummaryFormatter {
	/**
	 * Formats filter criteria as human-readable summary.
	 * @returns Summary string (e.g., "Plugin Name contains 'MyPlugin', Status is Failed")
	 */
	// eslint-disable-next-line complexity -- Complexity from formatting multiple filter types, acceptable in formatter
	public format(filter: TraceFilter): string {
		const parts: string[] = [];

		// Legacy filters
		if (filter.pluginNameFilter) {
			parts.push(`Plugin Name contains '${filter.pluginNameFilter}'`);
		}

		if (filter.entityNameFilter) {
			parts.push(`Entity Name contains '${filter.entityNameFilter}'`);
		}

		if (filter.messageNameFilter) {
			parts.push(`Message Name contains '${filter.messageNameFilter}'`);
		}

		if (filter.operationTypeFilter) {
			parts.push(`Operation Type is ${filter.operationTypeFilter.toString()}`);
		}

		if (filter.modeFilter) {
			parts.push(`Mode is ${filter.modeFilter.toString()}`);
		}

		if (filter.statusFilter) {
			parts.push(`Status is ${filter.statusFilter.toString()}`);
		}

		if (filter.createdOnFrom || filter.createdOnTo) {
			if (filter.createdOnFrom && filter.createdOnTo) {
				parts.push(
					`Created between ${this.formatDate(filter.createdOnFrom)} and ${this.formatDate(filter.createdOnTo)}`
				);
			} else if (filter.createdOnFrom) {
				parts.push(`Created after ${this.formatDate(filter.createdOnFrom)}`);
			} else if (filter.createdOnTo) {
				parts.push(`Created before ${this.formatDate(filter.createdOnTo)}`);
			}
		}

		if (filter.durationMin !== undefined || filter.durationMax !== undefined) {
			if (filter.durationMin !== undefined && filter.durationMax !== undefined) {
				parts.push(`Duration between ${filter.durationMin}ms and ${filter.durationMax}ms`);
			} else if (filter.durationMin !== undefined) {
				parts.push(`Duration >= ${filter.durationMin}ms`);
			} else if (filter.durationMax !== undefined) {
				parts.push(`Duration <= ${filter.durationMax}ms`);
			}
		}

		if (filter.hasExceptionFilter !== undefined) {
			parts.push(filter.hasExceptionFilter ? 'Has Exception' : 'No Exception');
		}

		if (filter.correlationIdFilter && !filter.correlationIdFilter.isEmpty()) {
			parts.push(`Correlation ID is '${filter.correlationIdFilter.getValue()}'`);
		}

		// Query builder conditions
		if (filter.conditions.length > 0) {
			const enabledConditions = filter.conditions.filter(c => c.enabled);
			if (enabledConditions.length > 0) {
				const conditionSummaries = enabledConditions.map(c => c.getDescription());
				parts.push(...conditionSummaries);
			}
		}

		return parts.join(', ');
	}

	private formatDate(date: Date): string {
		return date.toLocaleDateString();
	}
}
