import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { PluginAssembly } from '../../domain/entities/PluginAssembly';
import type { PluginPackage } from '../../domain/entities/PluginPackage';
import type { PluginStep } from '../../domain/entities/PluginStep';
import type { PluginType } from '../../domain/entities/PluginType';
import type { StepImage } from '../../domain/entities/StepImage';
import type { WebHook } from '../../domain/entities/WebHook';
import type { IPluginAssemblyRepository } from '../../domain/interfaces/IPluginAssemblyRepository';
import type { IPluginPackageRepository } from '../../domain/interfaces/IPluginPackageRepository';
import type { IPluginStepRepository } from '../../domain/interfaces/IPluginStepRepository';
import type { IPluginTypeRepository } from '../../domain/interfaces/IPluginTypeRepository';
import type { IStepImageRepository } from '../../domain/interfaces/IStepImageRepository';
import type { IWebHookRepository } from '../../domain/interfaces/IWebHookRepository';
import type { AssemblyTreeNode, PackageTreeNode } from '../mappers/PluginRegistrationTreeMapper';

/**
 * Result of loading the plugin registration tree.
 */
export interface PluginRegistrationTreeResult {
	readonly packages: ReadonlyArray<PackageTreeNode>;
	readonly standaloneAssemblies: ReadonlyArray<AssemblyTreeNode>;
	readonly webHooks: ReadonlyArray<WebHook>;
	readonly totalNodeCount: number;
}

/**
 * Progress callback for reporting loading steps.
 */
export type LoadingProgressCallback = (step: string, progress: number) => void;

/**
 * Internal interface for bulk fetch results.
 */
interface BulkFetchResult {
	readonly packages: readonly PluginPackage[];
	readonly assemblies: readonly PluginAssembly[];
	readonly pluginTypes: readonly PluginType[];
	readonly steps: readonly PluginStep[];
	readonly images: readonly StepImage[];
	readonly webHooks: readonly WebHook[];
}

/**
 * Loads the complete plugin registration tree for an environment.
 *
 * OPTIMIZED: Uses bulk queries (4 API calls total) instead of N+1 queries.
 *
 * Strategy:
 * 1. Fetch ALL data in parallel (packages, assemblies, types, steps, images)
 * 2. Build lookup maps by parent ID
 * 3. Assemble tree in memory
 *
 * Returns hierarchical structure:
 * - Packages (with their assemblies)
 *   - Assemblies
 *     - PluginTypes
 *       - Steps
 *         - Images
 * - Standalone Assemblies (not in any package)
 *   - PluginTypes
 *     - Steps
 *       - Images
 */
export class LoadPluginRegistrationTreeUseCase {
	constructor(
		private readonly packageRepository: IPluginPackageRepository,
		private readonly assemblyRepository: IPluginAssemblyRepository,
		private readonly pluginTypeRepository: IPluginTypeRepository,
		private readonly stepRepository: IPluginStepRepository,
		private readonly imageRepository: IStepImageRepository,
		private readonly webHookRepository: IWebHookRepository,
		private readonly logger: ILogger
	) {}

	/**
	 * Executes the use case.
	 *
	 * @param environmentId - Target environment
	 * @param solutionId - Optional solution filter (not yet implemented)
	 * @param onProgress - Optional callback for progress reporting
	 * @returns Hierarchical tree data
	 */
	public async execute(
		environmentId: string,
		solutionId?: string,
		onProgress?: LoadingProgressCallback
	): Promise<PluginRegistrationTreeResult> {
		this.logger.info('LoadPluginRegistrationTreeUseCase: Loading tree (bulk query)', {
			environmentId,
			solutionId: solutionId ?? 'all',
		});

		const reportProgress = onProgress ?? ((): void => {});

		// 1. BULK FETCH with progress reporting
		const fetchResult = await this.fetchAllData(environmentId, solutionId, reportProgress);

		reportProgress('Building tree...', 95);

		// 2. Build the tree structure
		const result = this.buildTreeStructure(fetchResult, reportProgress);

		this.logger.info('LoadPluginRegistrationTreeUseCase: Tree built', {
			packageCount: fetchResult.packages.length,
			standaloneAssemblyCount: fetchResult.assemblies.length,
			totalNodeCount: result.totalNodeCount,
		});

		return result;
	}

	/**
	 * Creates a progress tracker for parallel repository fetches.
	 */
	private createProgressTracker(reportProgress: LoadingProgressCallback): (name: string) => void {
		const repoNames = ['packages', 'assemblies', 'plugin types', 'steps', 'images', 'webhooks'];
		const completedNames: string[] = [];

		return (repoName: string): void => {
			completedNames.push(repoName);
			const percent = 10 + Math.round((completedNames.length / repoNames.length) * 80);
			const remaining = repoNames.filter((n) => !completedNames.includes(n));
			const message =
				remaining.length > 0
					? `Loaded ${completedNames.join(', ')}... (${remaining.length} remaining)`
					: 'All data loaded';
			reportProgress(message, percent);
		};
	}

	/**
	 * Fetches all data from repositories with progress reporting.
	 * Uses parallel fetching - reports progress as each repository completes.
	 */
	private async fetchAllData(
		environmentId: string,
		solutionId: string | undefined,
		reportProgress: LoadingProgressCallback
	): Promise<BulkFetchResult> {
		const startTime = Date.now();
		const trackProgress = this.createProgressTracker(reportProgress);

		reportProgress('Fetching data from Dataverse...', 10);

		// Parallel fetch all data with progress tracking per repository
		const [packages, assemblies, pluginTypes, steps, images, webHooks] = await Promise.all([
			this.packageRepository.findAll(environmentId, solutionId).then((r) => {
				trackProgress('packages');
				return r;
			}),
			this.assemblyRepository.findAll(environmentId, solutionId).then((r) => {
				trackProgress('assemblies');
				return r;
			}),
			this.pluginTypeRepository.findAll(environmentId).then((r) => {
				trackProgress('plugin types');
				return r;
			}),
			this.stepRepository.findAll(environmentId).then((r) => {
				trackProgress('steps');
				return r;
			}),
			this.imageRepository.findAll(environmentId).then((r) => {
				trackProgress('images');
				return r;
			}),
			this.webHookRepository.findAll(environmentId).then((r) => {
				trackProgress('webhooks');
				return r;
			}),
		]);

		this.logger.debug('LoadPluginRegistrationTreeUseCase: Bulk fetch complete', {
			packages: packages.length,
			assemblies: assemblies.length,
			pluginTypes: pluginTypes.length,
			steps: steps.length,
			images: images.length,
			webHooks: webHooks.length,
			totalMs: Date.now() - startTime,
		});

		return { packages, assemblies, pluginTypes, steps, images, webHooks };
	}

	/**
	 * Builds the tree structure from fetched data.
	 */
	private buildTreeStructure(
		data: BulkFetchResult,
		reportProgress: LoadingProgressCallback
	): PluginRegistrationTreeResult {
		// Build lookup maps for O(1) access
		const pluginTypesByAssemblyId = this.groupBy(data.pluginTypes, (pt) => pt.getAssemblyId());
		const stepsByPluginTypeId = this.groupBy(data.steps, (s) => s.getPluginTypeId());
		const imagesByStepId = this.groupBy(data.images, (img) => img.getStepId());

		// Group assemblies by package ID (null = standalone)
		const assembliesByPackageId = this.groupByNullable(
			data.assemblies,
			(a) => a.getPackageId()
		);

		// Build package trees with their assemblies
		const packageTrees: PackageTreeNode[] = data.packages.map((pkg) => {
			const packageAssemblies = assembliesByPackageId.get(pkg.getId()) ?? [];
			const assemblyTrees = this.buildAssemblyTrees(
				packageAssemblies,
				pluginTypesByAssemblyId,
				stepsByPluginTypeId,
				imagesByStepId
			);
			return { package: pkg, assemblies: assemblyTrees };
		});

		// Standalone assemblies (no package)
		const standaloneAssemblies = assembliesByPackageId.get(null) ?? [];
		const standaloneAssemblyTrees = this.buildAssemblyTrees(
			standaloneAssemblies,
			pluginTypesByAssemblyId,
			stepsByPluginTypeId,
			imagesByStepId
		);

		const totalNodeCount = this.countTotalNodes(packageTrees, standaloneAssemblyTrees, data.webHooks);

		reportProgress('Complete!', 100);

		return {
			packages: packageTrees,
			standaloneAssemblies: standaloneAssemblyTrees,
			webHooks: data.webHooks,
			totalNodeCount,
		};
	}

	/**
	 * Groups items by a key derived from each item.
	 */
	private groupBy<T>(items: readonly T[], keyFn: (item: T) => string): Map<string, T[]> {
		const map = new Map<string, T[]>();
		for (const item of items) {
			const key = keyFn(item);
			const existing = map.get(key);
			if (existing) {
				existing.push(item);
			} else {
				map.set(key, [item]);
			}
		}
		return map;
	}

	/**
	 * Groups items by a nullable key (null keys are grouped together).
	 */
	private groupByNullable<T>(
		items: readonly T[],
		keyFn: (item: T) => string | null
	): Map<string | null, T[]> {
		const map = new Map<string | null, T[]>();
		for (const item of items) {
			const key = keyFn(item);
			const existing = map.get(key);
			if (existing) {
				existing.push(item);
			} else {
				map.set(key, [item]);
			}
		}
		return map;
	}

	/**
	 * Builds assembly tree nodes from pre-fetched data.
	 */
	private buildAssemblyTrees(
		assemblies: readonly PluginAssembly[],
		pluginTypesByAssemblyId: Map<string, PluginType[]>,
		stepsByPluginTypeId: Map<string, PluginStep[]>,
		imagesByStepId: Map<string, StepImage[]>
	): AssemblyTreeNode[] {
		return assemblies.map((assembly) => {
			const pluginTypes = pluginTypesByAssemblyId.get(assembly.getId()) ?? [];

			const pluginTypeTrees = pluginTypes.map((pluginType) => {
				const steps = stepsByPluginTypeId.get(pluginType.getId()) ?? [];

				const stepTrees = steps.map((step) => {
					const images = imagesByStepId.get(step.getId()) ?? [];
					return { step, images: [...images] };
				});

				return { pluginType, steps: stepTrees };
			});

			return { assembly, pluginTypes: pluginTypeTrees };
		});
	}

	/**
	 * Counts total nodes in the tree.
	 */
	private countTotalNodes(
		packages: ReadonlyArray<PackageTreeNode>,
		standaloneAssemblies: ReadonlyArray<AssemblyTreeNode>,
		webHooks: ReadonlyArray<WebHook>
	): number {
		let count = packages.length + standaloneAssemblies.length + webHooks.length;

		for (const packageNode of packages) {
			count += this.countAssemblyTreeNodes(packageNode.assemblies);
		}

		count += this.countAssemblyTreeNodes(standaloneAssemblies);

		return count;
	}

	private countAssemblyTreeNodes(assemblies: ReadonlyArray<AssemblyTreeNode>): number {
		let count = assemblies.length;

		for (const assemblyNode of assemblies) {
			count += assemblyNode.pluginTypes.length;

			for (const pluginTypeNode of assemblyNode.pluginTypes) {
				count += pluginTypeNode.steps.length;

				for (const stepNode of pluginTypeNode.steps) {
					count += stepNode.images.length;
				}
			}
		}

		return count;
	}
}
