import type { StepImage } from '../entities/StepImage';

/**
 * Input for registering a new step image.
 */
export interface RegisterImageInput {
	readonly stepId: string;
	readonly name: string;
	readonly imageType: number; // 0=PreImage, 1=PostImage, 2=Both
	readonly entityAlias: string;
	readonly attributes?: string | undefined; // Comma-separated
}

/**
 * Input for updating an existing step image.
 */
export interface UpdateImageInput {
	readonly name?: string | undefined;
	readonly imageType?: number | undefined;
	readonly entityAlias?: string | undefined;
	readonly attributes?: string | undefined;
}

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

	/**
	 * Delete a step image.
	 */
	delete(environmentId: string, imageId: string): Promise<void>;

	/**
	 * Register a new step image.
	 * @returns The ID of the created image.
	 */
	register(environmentId: string, input: RegisterImageInput): Promise<string>;

	/**
	 * Update an existing step image.
	 */
	update(environmentId: string, imageId: string, input: UpdateImageInput): Promise<void>;
}
