import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { PluginAssembly } from '../../domain/entities/PluginAssembly';
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
 * Loads the complete plugin registration tree for an environment.
 *
 * Orchestrates: Repository fetches → Domain entity creation → Hierarchy building
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
	 * @param solutionId - Optional solution filter
	 * @returns Hierarchical tree data
	 */
	public async execute(
		environmentId: string,
		solutionId?: string
	): Promise<PluginRegistrationTreeResult> {
		this.logger.info('LoadPluginRegistrationTreeUseCase: Loading tree', {
			environmentId,
			solutionId: solutionId ?? 'all',
		});

		// 1. Load packages and standalone assemblies in parallel
		const [packages, standaloneAssemblies] = await Promise.all([
			this.packageRepository.findAll(environmentId, solutionId),
			this.assemblyRepository.findStandalone(environmentId, solutionId),
		]);

		// 2. For each package, load its assemblies
		const packageTrees = await Promise.all(
			packages.map(async (pkg) => {
				const assemblies = await this.assemblyRepository.findByPackageId(
					environmentId,
					pkg.getId()
				);

				const assemblyTrees = await this.loadAssemblyTrees(environmentId, assemblies);
				return { package: pkg, assemblies: assemblyTrees };
			})
		);

		// 3. Load standalone assembly trees
		const standaloneAssemblyTrees = await this.loadAssemblyTrees(
			environmentId,
			standaloneAssemblies
		);

		const totalNodeCount = this.countTotalNodes(packageTrees, standaloneAssemblyTrees);

		this.logger.info('LoadPluginRegistrationTreeUseCase: Tree loaded', {
			packageCount: packages.length,
			standaloneAssemblyCount: standaloneAssemblies.length,
			totalNodeCount,
		});

		return {
			packages: packageTrees,
			standaloneAssemblies: standaloneAssemblyTrees,
			totalNodeCount,
		};
	}

	/**
	 * Loads the full tree for a set of assemblies (plugin types → steps → images).
	 */
	private async loadAssemblyTrees(
		environmentId: string,
		assemblies: readonly PluginAssembly[]
	): Promise<AssemblyTreeNode[]> {
		return Promise.all(
			assemblies.map(async (assembly) => {
				const pluginTypes = await this.pluginTypeRepository.findByAssemblyId(
					environmentId,
					assembly.getId()
				);

				const pluginTypeTrees = await Promise.all(
					pluginTypes.map(async (pluginType) => {
						const steps = await this.stepRepository.findByPluginTypeId(
							environmentId,
							pluginType.getId()
						);

						const stepTrees = await Promise.all(
							steps.map(async (step) => {
								const images = await this.imageRepository.findByStepId(
									environmentId,
									step.getId()
								);

								return { step, images: [...images] };
							})
						);

						return { pluginType, steps: stepTrees };
					})
				);

				return { assembly, pluginTypes: pluginTypeTrees };
			})
		);
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
