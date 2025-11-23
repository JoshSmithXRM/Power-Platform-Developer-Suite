import { Solution } from '../../../features/solutionExplorer/domain/entities/Solution';
import { DEFAULT_SOLUTION_ID } from '../../../shared/domain/constants/SolutionConstants';

/**
 * Test factory for creating Solution entities with sensible defaults.
 * Reduces duplication in test files and provides consistent test data.
 */
export function createTestSolution(overrides?: {
	id?: string;
	uniqueName?: string;
	friendlyName?: string;
	version?: string;
	isManaged?: boolean;
	publisherId?: string;
	publisherName?: string;
	installedOn?: Date | null;
	description?: string;
	modifiedOn?: Date;
	isVisible?: boolean;
	isApiManaged?: boolean;
	solutionType?: string | null;
}): Solution {
	const installedOn: Date | null = overrides && 'installedOn' in overrides
		? overrides.installedOn ?? null
		: null;

	return new Solution(
		overrides?.id ?? 'solution-123',
		overrides?.uniqueName ?? 'TestSolution',
		overrides?.friendlyName ?? 'Test Solution',
		overrides?.version ?? '1.0.0.0',
		overrides?.isManaged ?? false,
		overrides?.publisherId ?? 'publisher-123',
		overrides?.publisherName ?? 'Test Publisher',
		installedOn,
		overrides?.description ?? 'Test solution description',
		overrides?.modifiedOn ?? new Date('2024-01-15T10:00:00Z'),
		overrides?.isVisible ?? true,
		overrides?.isApiManaged ?? false,
		overrides?.solutionType ?? null
	);
}

/**
 * Creates the Default solution entity.
 * The Default solution is special and always present in Dataverse.
 */
export function createTestDefaultSolution(overrides?: {
	version?: string;
	modifiedOn?: Date;
}): Solution {
	return new Solution(
		DEFAULT_SOLUTION_ID,
		'Default',
		'Default Solution',
		overrides?.version ?? '1.0',
		false,
		'default-publisher-123',
		'Default Publisher',
		null,
		'Active Solution',
		overrides?.modifiedOn ?? new Date('2024-01-01T00:00:00Z'),
		true,
		false,
		null
	);
}

/**
 * Creates a managed solution entity.
 */
export function createTestManagedSolution(overrides?: {
	id?: string;
	uniqueName?: string;
	friendlyName?: string;
	version?: string;
	installedOn?: Date | null;
}): Solution {
	return createTestSolution({
		isManaged: true,
		installedOn: overrides?.installedOn ?? new Date('2024-01-10T08:00:00Z'),
		...overrides
	});
}
