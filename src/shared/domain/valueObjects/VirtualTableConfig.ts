/**
 * Immutable configuration for virtual table behavior.
 *
 * Business Rules:
 * - initialPageSize: First page load (default: 100, min: 10)
 * - maxCachedRecords: Max records in memory (no artificial limit - modern browsers handle 100k+ records easily)
 * - backgroundPageSize: Background load page size (default: 500, min: 100)
 * - maxCachedRecords must be >= initialPageSize
 *
 * Note: At 100k records with ~400 bytes each, we're talking ~40MB - trivial for modern systems.
 *
 * @example
 * // Use defaults (recommended for most cases)
 * const config = VirtualTableConfig.createDefault();
 *
 * // Custom configuration - no artificial upper limits
 * const customConfig = VirtualTableConfig.create(50, 100000, 1000, true);
 */
export class VirtualTableConfig {
	/** Minimum allowed initial page size */
	public static readonly MIN_INITIAL_PAGE_SIZE = 10;
	/** Minimum allowed max cached records */
	public static readonly MIN_MAX_CACHED_RECORDS = 100;
	/** Minimum allowed background page size */
	public static readonly MIN_BACKGROUND_PAGE_SIZE = 100;

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
	 * Defaults optimized for large datasets (100k+ records):
	 * - initialPageSize: 100 (instant initial render)
	 * - maxCachedRecords: unlimited (Number.MAX_SAFE_INTEGER)
	 * - backgroundPageSize: 500 (efficient batching)
	 * - enableBackgroundLoading: true
	 */
	public static createDefault(): VirtualTableConfig {
		return new VirtualTableConfig(
			100, // initialPageSize
			Number.MAX_SAFE_INTEGER, // maxCachedRecords - no artificial limit
			500, // backgroundPageSize
			true // enableBackgroundLoading
		);
	}

	/**
	 * Creates custom configuration.
	 *
	 * @param initialPageSize - Records to load on first page (min: 10)
	 * @param maxCachedRecords - Maximum records to cache in memory (min: 100, no upper limit)
	 * @param backgroundPageSize - Records per background load batch (min: 100)
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
	 * Only enforces minimum values - no artificial upper limits.
	 *
	 * @throws Error if constraints violated
	 */
	private validate(): void {
		if (this.initialPageSize < VirtualTableConfig.MIN_INITIAL_PAGE_SIZE) {
			throw new Error(
				`Initial page size must be at least ${VirtualTableConfig.MIN_INITIAL_PAGE_SIZE}`
			);
		}

		if (this.maxCachedRecords < VirtualTableConfig.MIN_MAX_CACHED_RECORDS) {
			throw new Error(
				`Max cached records must be at least ${VirtualTableConfig.MIN_MAX_CACHED_RECORDS}`
			);
		}

		if (this.backgroundPageSize < VirtualTableConfig.MIN_BACKGROUND_PAGE_SIZE) {
			throw new Error(
				`Background page size must be at least ${VirtualTableConfig.MIN_BACKGROUND_PAGE_SIZE}`
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
