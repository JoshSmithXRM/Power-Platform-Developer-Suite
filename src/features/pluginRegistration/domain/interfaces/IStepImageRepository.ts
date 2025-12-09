import type { StepImage } from '../entities/StepImage';

/**
 * Repository interface for step images.
 * Domain defines contract, infrastructure implements.
 */
export interface IStepImageRepository {
	/**
	 * Find ALL images in the environment.
	 * Used for bulk loading to avoid N+1 queries.
	 */
	findAll(environmentId: string): Promise<readonly StepImage[]>;

	/**
	 * Find all images for a step.
	 */
	findByStepId(environmentId: string, stepId: string): Promise<readonly StepImage[]>;

	/**
	 * Find image by ID.
	 */
	findById(environmentId: string, imageId: string): Promise<StepImage | null>;
}
