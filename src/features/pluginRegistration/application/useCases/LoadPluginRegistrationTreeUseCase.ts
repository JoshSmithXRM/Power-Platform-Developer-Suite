import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { PluginAssembly } from '../../domain/entities/PluginAssembly';
import type { PluginPackage } from '../../domain/entities/PluginPackage';
import type { PluginStep } from '../../domain/entities/PluginStep';
import type { PluginType } from '../../domain/entities/PluginType';
import type { StepImage } from '../../domain/entities/StepImage';
import type { IPluginAssemblyRepository } from '../../domain/interfaces/IPluginAssemblyRepository';
import type { IPluginPackageRepository } from '../../domain/interfaces/IPluginPackageRepository';
import type { IPluginStepRepository } from '../../domain/interfaces/IPluginStepRepository';
import type { IPluginTypeRepository } from '../../domain/interfaces/IPluginTypeRepository';
import type { IStepImageRepository } from '../../domain/interfaces/IStepImageRepository';
import type { AssemblyTreeNode, PackageTreeNode } from '../mappers/PluginRegistrationTreeMapper';

/**
 * Result of loading the plugin registration tree.
 */
export interface PluginRegistrationTreeResult {
	readonly packages: ReadonlyArray<PackageTreeNode>;
	readonly standaloneAssemblies: ReadonlyArray<AssemblyTreeNode>;
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
	 * Fetches all data from repositories with progress reporting.
	 */
	private async fetchAllData(
		environmentId: string,
		solutionId: string | undefined,
		reportProgress: LoadingProgressCallback
	): Promise<BulkFetchResult> {
		reportProgress('Loading plugin packages...', 0);
		const packages = await this.packageRepository.findAll(environmentId, solutionId);

		reportProgress('Loading assemblies...', 20);
		const assemblies = await this.assemblyRepository.findAll(environmentId, solutionId);

		reportProgress('Loading plugin types...', 40);
		const pluginTypes = await this.pluginTypeRepository.findAll(environmentId);

		reportProgress('Loading steps...', 60);
		const steps = await this.stepRepository.findAll(environmentId);

		reportProgress('Loading images...', 80);
		const images = await this.imageRepository.findAll(environmentId);

		this.logger.debug('LoadPluginRegistrationTreeUseCase: Bulk fetch complete', {
			packages: packages.length,
			assemblies: assemblies.length,
			pluginTypes: pluginTypes.length,
			steps: steps.length,
			images: images.length,
		});

		return { packages, assemblies, pluginTypes, steps, images };
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

		// Build assembly trees (all standalone since we can't link to packages)
		const standaloneAssemblyTrees = this.buildAssemblyTrees(
			data.assemblies,
			pluginTypesByAssemblyId,
			stepsByPluginTypeId,
			imagesByStepId
		);

		// Package trees are empty since we can't link assemblies to packages
		const packageTrees: PackageTreeNode[] = data.packages.map((pkg) => ({
			package: pkg,
			assemblies: [],
		}));

		const totalNodeCount = this.countTotalNodes(packageTrees, standaloneAssemblyTrees);

		reportProgress('Complete!', 100);

		return { packages: packageTrees, standaloneAssemblies: standaloneAssemblyTrees, totalNodeCount };
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
		standaloneAssemblies: ReadonlyArray<AssemblyTreeNode>
	): number {
		let count = packages.length + standaloneAssemblies.length;

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
