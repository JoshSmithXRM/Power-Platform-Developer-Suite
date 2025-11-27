/**
 * Immutable configuration for virtual table behavior.
 *
 * Business Rules:
 * - initialPageSize: First page load (default: 100, range: 10-1000)
 * - maxCachedRecords: Max records in memory (default: 5000, range: 100-50000)
 * - backgroundPageSize: Background load page size (default: 500, range: 100-5000)
 * - maxCachedRecords must be >= initialPageSize
 *
 * @example
 * // Use defaults (recommended for most cases)
 * const config = VirtualTableConfig.createDefault();
 *
 * // Custom configuration
 * const customConfig = VirtualTableConfig.create(50, 10000, 1000, true);
 */
export class VirtualTableConfig {
	/** Minimum allowed initial page size */
	public static readonly MIN_INITIAL_PAGE_SIZE = 10;
	/** Maximum allowed initial page size */
	public static readonly MAX_INITIAL_PAGE_SIZE = 1000;
	/** Minimum allowed max cached records */
	public static readonly MIN_MAX_CACHED_RECORDS = 100;
	/** Maximum allowed max cached records */
	public static readonly MAX_MAX_CACHED_RECORDS = 50000;
	/** Minimum allowed background page size */
	public static readonly MIN_BACKGROUND_PAGE_SIZE = 100;
	/** Maximum allowed background page size */
	public static readonly MAX_BACKGROUND_PAGE_SIZE = 5000;

	private constructor(
		private readonly initialPageSize: number,
		private readonly maxCachedRecords: number,
		private readonly backgroundPageSize: number,
		private readonly enableBackgroundLoading: boolean
	) {
		this.validate();
	}

	/**
	 * Creates default configuration.
	 *
	 * Defaults optimized for 70k record datasets:
	 * - initialPageSize: 100 (instant load)
	 * - maxCachedRecords: 5000 (reasonable memory footprint)
	 * - backgroundPageSize: 500 (efficient batching)
	 * - enableBackgroundLoading: true
	 */
	public static createDefault(): VirtualTableConfig {
		return new VirtualTableConfig(
			100, // initialPageSize
			5000, // maxCachedRecords
			500, // backgroundPageSize
			true // enableBackgroundLoading
		);
	}

	/**
	 * Creates custom configuration.
	 *
	 * @param initialPageSize - Records to load on first page (10-1000)
	 * @param maxCachedRecords - Maximum records to cache in memory (100-50000)
	 * @param backgroundPageSize - Records per background load batch (100-5000)
	 * @param enableBackgroundLoading - Whether to load additional pages in background
	 * @returns Immutable VirtualTableConfig instance
	 * @throws Error if validation fails
	 */
	public static create(
		initialPageSize: number,
		maxCachedRecords: number,
		backgroundPageSize: number,
		enableBackgroundLoading: boolean = true
	): VirtualTableConfig {
		return new VirtualTableConfig(
			initialPageSize,
			maxCachedRecords,
			backgroundPageSize,
			enableBackgroundLoading
		);
	}

	/**
	 * Validates business rules.
	 *
	 * @throws Error if constraints violated
	 */
	private validate(): void {
		if (
			this.initialPageSize < VirtualTableConfig.MIN_INITIAL_PAGE_SIZE ||
			this.initialPageSize > VirtualTableConfig.MAX_INITIAL_PAGE_SIZE
		) {
			throw new Error(
				`Initial page size must be between ${VirtualTableConfig.MIN_INITIAL_PAGE_SIZE} and ${VirtualTableConfig.MAX_INITIAL_PAGE_SIZE}`
			);
		}

		if (
			this.maxCachedRecords < VirtualTableConfig.MIN_MAX_CACHED_RECORDS ||
			this.maxCachedRecords > VirtualTableConfig.MAX_MAX_CACHED_RECORDS
		) {
			throw new Error(
				`Max cached records must be between ${VirtualTableConfig.MIN_MAX_CACHED_RECORDS} and ${VirtualTableConfig.MAX_MAX_CACHED_RECORDS}`
			);
		}

		if (
			this.backgroundPageSize < VirtualTableConfig.MIN_BACKGROUND_PAGE_SIZE ||
			this.backgroundPageSize > VirtualTableConfig.MAX_BACKGROUND_PAGE_SIZE
		) {
			throw new Error(
				`Background page size must be between ${VirtualTableConfig.MIN_BACKGROUND_PAGE_SIZE} and ${VirtualTableConfig.MAX_BACKGROUND_PAGE_SIZE}`
			);
		}

		if (this.maxCachedRecords < this.initialPageSize) {
			throw new Error('Max cached records must be >= initial page size');
		}
	}

	/**
	 * Checks if background loading is enabled.
	 */
	public shouldLoadInBackground(): boolean {
		return this.enableBackgroundLoading;
	}

	/**
	 * Calculates how many background pages to load to reach max cache.
	 *
	 * Business Rule: (maxCachedRecords - initialPageSize) / backgroundPageSize
	 * Returns 0 if background loading is disabled.
	 */
	public getBackgroundPageCount(): number {
		if (!this.enableBackgroundLoading) {
			return 0;
		}

		const remainingRecords = this.maxCachedRecords - this.initialPageSize;
		if (remainingRecords <= 0) {
			return 0;
		}

		return Math.ceil(remainingRecords / this.backgroundPageSize);
	}

	/**
	 * Calculates the total number of records that could be loaded.
	 *
	 * This is initialPageSize + (backgroundPageCount * backgroundPageSize),
	 * capped at maxCachedRecords.
	 */
	public getMaxLoadableRecords(): number {
		if (!this.enableBackgroundLoading) {
			return this.initialPageSize;
		}
		return this.maxCachedRecords;
	}

	/**
	 * Gets the initial page size.
	 */
	public getInitialPageSize(): number {
		return this.initialPageSize;
	}

	/**
	 * Gets the maximum cached records.
	 */
	public getMaxCachedRecords(): number {
		return this.maxCachedRecords;
	}

	/**
	 * Gets the background page size.
	 */
	public getBackgroundPageSize(): number {
		return this.backgroundPageSize;
	}

	/**
	 * Gets whether background loading is enabled.
	 */
	public isBackgroundLoadingEnabled(): boolean {
		return this.enableBackgroundLoading;
	}

	/**
	 * Creates a new config with background loading disabled.
	 */
	public withBackgroundLoadingDisabled(): VirtualTableConfig {
		return new VirtualTableConfig(
			this.initialPageSize,
			this.maxCachedRecords,
			this.backgroundPageSize,
			false
		);
	}

	/**
	 * Creates a new config with different initial page size.
	 */
	public withInitialPageSize(size: number): VirtualTableConfig {
		return new VirtualTableConfig(
			size,
			this.maxCachedRecords,
			this.backgroundPageSize,
			this.enableBackgroundLoading
		);
	}

	/**
	 * Creates a new config with different max cached records.
	 */
	public withMaxCachedRecords(max: number): VirtualTableConfig {
		return new VirtualTableConfig(
			this.initialPageSize,
			max,
			this.backgroundPageSize,
			this.enableBackgroundLoading
		);
	}
}
