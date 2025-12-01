import type { Environment } from '../../domain/entities/Environment';
import type { IEnvironmentRepository } from '../../domain/interfaces/IEnvironmentRepository';
import type { ILogger } from '../../../../infrastructure/logging/ILogger';

export type MoveDirection = 'up' | 'down';

/**
 * Use case for reordering environments in the list.
 *
 * Moves an environment up or down in the display order by adjusting
 * the sortOrder values. The default environment always appears first
 * regardless of sortOrder, but sortOrder determines position among
 * non-default environments.
 */
export class MoveEnvironmentUseCase {
	constructor(
		private readonly repository: IEnvironmentRepository,
		private readonly logger: ILogger
	) {}

	/**
	 * Moves the specified environment up or down in the list.
	 * @param environmentId - ID of environment to move
	 * @param direction - Direction to move ('up' or 'down')
	 * @returns true if the environment was moved, false if it couldn't be moved (already at top/bottom)
	 */
	public async execute(environmentId: string, direction: MoveDirection): Promise<boolean> {
		this.logger.info('Moving environment', { environmentId, direction });

		const allEnvironments = await this.repository.getAll();
		const swapResult = this.findEnvironmentsToSwap(allEnvironments, environmentId, direction);

		if (!swapResult) {
			return false;
		}

		this.ensureDistinctSortOrders(allEnvironments);
		await this.swapAndSave(swapResult.current, swapResult.target);

		this.logger.info('Environment moved', { environmentId, direction });
		return true;
	}

	private findEnvironmentsToSwap(
		environments: Environment[],
		environmentId: string,
		direction: MoveDirection
	): { current: Environment; target: Environment } | null {
		if (environments.length < 2) {
			this.logger.debug('Cannot move: only one environment exists');
			return null;
		}

		const currentIndex = environments.findIndex(env => env.getId().getValue() === environmentId);

		if (currentIndex === -1) {
			this.logger.warn('Environment not found', { environmentId });
			throw new Error(`Environment not found: ${environmentId}`);
		}

		const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

		if (targetIndex < 0 || targetIndex >= environments.length) {
			this.logger.debug('Cannot move: already at boundary', { direction, currentIndex });
			return null;
		}

		const current = environments[currentIndex];
		const target = environments[targetIndex];

		return current && target ? { current, target } : null;
	}

	private ensureDistinctSortOrders(environments: Environment[]): void {
		const allSame = environments.every(env => env.getSortOrder() === environments[0]?.getSortOrder());
		if (allSame) {
			environments.forEach((env, i) => env.setSortOrder(i));
		}
	}

	private async swapAndSave(current: Environment, target: Environment): Promise<void> {
		const currentOrder = current.getSortOrder();
		const targetOrder = target.getSortOrder();

		current.setSortOrder(targetOrder);
		target.setSortOrder(currentOrder);

		await this.repository.save(current, undefined, undefined, true);
		await this.repository.save(target, undefined, undefined, true);
	}
}
