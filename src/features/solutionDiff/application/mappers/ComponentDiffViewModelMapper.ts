import { ComponentComparison, ModifiedComponent } from '../../domain/entities/ComponentComparison';
import { SolutionComponent } from '../../domain/entities/SolutionComponent';
import { getComponentTypeDisplayName, ComponentType } from '../../domain/enums/ComponentType';
import { ComponentTypeRegistry } from '../../domain/services/ComponentTypeRegistry';
import { ColumnDiff } from '../../domain/valueObjects/ColumnDiff';
import { ComponentData } from '../../domain/valueObjects/ComponentData';
import {
	ComponentDiffViewModel,
	ComponentTypeGroupViewModel,
	ComponentViewModel,
	ModifiedComponentViewModel
} from '../viewModels/ComponentDiffViewModel';

/**
 * Indicates which environment a component belongs to for display name lookup.
 */
type ComponentSource = 'source' | 'target';

/**
 * Mapper: Transform domain ComponentComparison → ViewModel.
 *
 * Transformation only - NO business logic.
 */
export class ComponentDiffViewModelMapper {
	private sourceComponentData: ReadonlyMap<string, ComponentData> | undefined;
	private targetComponentData: ReadonlyMap<string, ComponentData> | undefined;

	constructor(private readonly registry: ComponentTypeRegistry) {}

	/**
	 * Transforms ComponentComparison entity to ViewModel.
	 *
	 * @param comparison - The domain comparison entity
	 */
	public toViewModel(comparison: ComponentComparison): ComponentDiffViewModel {
		// Store ComponentData maps for display name lookup
		this.sourceComponentData = comparison.getSourceComponentData();
		this.targetComponentData = comparison.getTargetComponentData();

		const isDeepComparison = true; // Always enabled
		const diff = comparison.getDiff();
		const groupedByType = comparison.getComponentsByType();
		const modifiedCount = comparison.getModifiedCount();

		const componentsByType: ComponentTypeGroupViewModel[] = [];

		// Track totals for summary
		let addedCount = 0;
		let removedCount = 0;
		let unchangedCount = 0;

		// Transform each component type group
		for (const [type, components] of groupedByType.entries()) {
			const modified = components.modified.map(m => this.toModifiedComponentViewModel(m, type));

			addedCount += components.added.length;
			removedCount += components.removed.length;
			unchangedCount += components.same.length;

			componentsByType.push({
				type,
				typeName: getComponentTypeDisplayName(type),
				// Added = in target only, so look up name from target
				added: components.added.map(c => this.toComponentViewModel(c, 'target')),
				// Removed = in source only, so look up name from source
				removed: components.removed.map(c => this.toComponentViewModel(c, 'source')),
				modified,
				// Same = in both, prefer source for consistency
				same: components.same.map(c => this.toComponentViewModel(c, 'source')),
				totalCount: components.added.length + components.removed.length +
					components.modified.length + components.same.length,
				hasDifferences: components.added.length > 0 ||
					components.removed.length > 0 ||
					components.modified.length > 0
			});
		}

		// Sort groups by display name for consistent ordering
		componentsByType.sort((a, b) => a.typeName.localeCompare(b.typeName));

		// Build summary
		const summary = this.buildSummary(addedCount, removedCount, modifiedCount, unchangedCount);

		return {
			summary,
			totalCount: diff.getTotalCount() + modifiedCount,
			componentsByType,
			sourceComponentCount: comparison.getSourceComponentCount(),
			targetComponentCount: comparison.getTargetComponentCount(),
			addedCount,
			removedCount,
			modifiedCount,
			unchangedCount,
			isDeepComparison
		};
	}

	/**
	 * Builds a human-readable summary of the comparison.
	 */
	private buildSummary(
		added: number,
		removed: number,
		modified: number,
		unchanged: number
	): string {
		const parts: string[] = [];

		if (added > 0) {
			parts.push(`${added} added`);
		}
		if (removed > 0) {
			parts.push(`${removed} removed`);
		}
		if (modified > 0) {
			parts.push(`${modified} modified`);
		}
		if (unchanged > 0) {
			parts.push(`${unchanged} unchanged`);
		}

		return parts.length > 0 ? parts.join(', ') : 'No components';
	}

	/**
	 * Transforms SolutionComponent entity to ComponentViewModel.
	 *
	 * @param component - The domain component entity
	 * @param source - Which environment to look up display name from
	 */
	private toComponentViewModel(component: SolutionComponent, source: ComponentSource): ComponentViewModel {
		const displayName = this.lookupDisplayName(component.getObjectId(), source);

		return {
			objectId: component.getObjectId(),
			name: displayName ?? component.getName(),
			componentType: component.getComponentType()
		};
	}

	/**
	 * Looks up a display name from ComponentData maps.
	 *
	 * @param objectId - Component object ID (GUID)
	 * @param source - Which environment to look up from
	 * @returns Display name if found, undefined otherwise
	 */
	private lookupDisplayName(objectId: string, source: ComponentSource): string | undefined {
		const dataMap = source === 'source' ? this.sourceComponentData : this.targetComponentData;
		if (dataMap === undefined) {
			return undefined;
		}

		const componentData = dataMap.get(objectId.toLowerCase());
		return componentData?.getName();
	}

	/**
	 * Transforms ModifiedComponent to ModifiedComponentViewModel.
	 *
	 * Modified components exist in both environments, so we use source for display name.
	 */
	private toModifiedComponentViewModel(
		modified: ModifiedComponent,
		componentType: ComponentType
	): ModifiedComponentViewModel {
		const config = this.registry.getConfig(componentType);
		const displayName = this.lookupDisplayName(modified.component.getObjectId(), 'source');

		return {
			objectId: modified.component.getObjectId(),
			name: displayName ?? modified.component.getName(),
			componentType: modified.component.getComponentType(),
			columnDiffs: modified.columnDiffs.map(diff => ({
				columnName: diff.getColumnName(),
				columnDisplayName: config?.columnDisplayNames[diff.getColumnName()] ?? diff.getColumnName(),
				summary: this.createColumnDiffSummary(diff)
			}))
		};
	}

	/**
	 * Creates a human-readable summary of a column difference.
	 *
	 * Presentation Rules:
	 * - Short values: Show "column: oldValue → newValue"
	 * - Long values (>50 chars): Show "column changed"
	 * - Base64 content: Show size instead of content
	 */
	private createColumnDiffSummary(diff: ColumnDiff): string {
		const sourceText = this.valueToText(diff.getSourceValue());
		const targetText = this.valueToText(diff.getTargetValue());

		// For very long values, just show "changed"
		if (sourceText.length > 50 || targetText.length > 50) {
			return `${diff.getColumnName()} changed`;
		}

		return `${diff.getColumnName()}: ${sourceText} → ${targetText}`;
	}

	/**
	 * Converts a value to text for display.
	 */
	private valueToText(value: unknown): string {
		if (value === null || value === undefined) {
			return '(empty)';
		}

		if (typeof value === 'string') {
			// Base64 content - just show length
			if (value.length > 100 && this.looksLikeBase64(value)) {
				return `(${this.bytesToText(value.length * 0.75)} binary)`;
			}
			return value;
		}

		if (typeof value === 'number' || typeof value === 'boolean') {
			return String(value);
		}

		return JSON.stringify(value);
	}

	/**
	 * Checks if a string looks like Base64 encoded content.
	 */
	private looksLikeBase64(value: string): boolean {
		return /^[A-Za-z0-9+/=]+$/.test(value.replace(/\s/g, ''));
	}

	/**
	 * Converts byte count to human-readable text.
	 */
	private bytesToText(bytes: number): string {
		if (bytes < 1024) return `${Math.round(bytes)} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}
}
