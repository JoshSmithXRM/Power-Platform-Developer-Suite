/**
 * Immutable value object representing a single page of results.
 *
 * Contains domain entities (T) and pagination metadata.
 * Created by repositories, consumed by use cases.
 *
 * Business Rules:
 * - Page must be >= 1 (1-based pagination)
 * - Page size must be > 0
 * - Total count must be >= 0
 * - Items length must be <= pageSize
 *
 * @example
 * const result = PaginatedResult.create(webResources, 1, 100, 5000);
 * if (result.hasNextPage()) {
 *   const nextPage = result.getNextPage(); // 2
 * }
 */
export class PaginatedResult<T> {
	private constructor(
		private readonly items: readonly T[],
		private readonly page: number,
		private readonly pageSize: number,
		private readonly totalCount: number
	) {
		this.validate();
	}

	/**
	 * Creates a paginated result.
	 *
	 * @param items - Records for this page (readonly array)
	 * @param page - Current page number (1-based)
	 * @param pageSize - Maximum records per page
	 * @param totalCount - Total records across all pages
	 * @returns Immutable PaginatedResult instance
	 * @throws Error if invariants violated
	 */
	public static create<T>(
		items: readonly T[],
		page: number,
		pageSize: number,
		totalCount: number
	): PaginatedResult<T> {
		return new PaginatedResult(items, page, pageSize, totalCount);
	}

	/**
	 * Creates an empty paginated result.
	 *
	 * @param pageSize - Page size (defaults to 100)
	 * @returns Empty PaginatedResult with totalCount = 0
	 */
	public static createEmpty<T>(pageSize: number = 100): PaginatedResult<T> {
		return new PaginatedResult<T>([], 1, pageSize, 0);
	}

	/**
	 * Validates business rules on construction.
	 *
	 * @throws Error if page < 1
	 * @throws Error if pageSize < 1
	 * @throws Error if totalCount < 0
	 * @throws Error if items.length > pageSize
	 */
	private validate(): void {
		if (this.page < 1) {
			throw new Error('Page must be >= 1 (1-based pagination)');
		}

		if (this.pageSize < 1) {
			throw new Error('Page size must be > 0');
		}

		if (this.totalCount < 0) {
			throw new Error('Total count must be >= 0');
		}

		if (this.items.length > this.pageSize) {
			throw new Error(
				`Items length (${this.items.length}) exceeds page size (${this.pageSize})`
			);
		}
	}

	/**
	 * Checks if this is the first page.
	 */
	public isFirstPage(): boolean {
		return this.page === 1;
	}

	/**
	 * Checks if this is the last page.
	 *
	 * Business Rule: Last page when start index + items >= total count
	 */
	public isLastPage(): boolean {
		if (this.totalCount === 0) {
			return true;
		}
		const startIndex = (this.page - 1) * this.pageSize;
		return startIndex + this.items.length >= this.totalCount;
	}

	/**
	 * Calculates total number of pages.
	 *
	 * Business Rule: Math.ceil(totalCount / pageSize)
	 * Empty dataset = 0 pages
	 */
	public getTotalPages(): number {
		if (this.totalCount === 0) {
			return 0;
		}
		return Math.ceil(this.totalCount / this.pageSize);
	}

	/**
	 * Checks if more pages exist after this one.
	 */
	public hasNextPage(): boolean {
		return !this.isLastPage();
	}

	/**
	 * Gets next page number (or null if last page).
	 */
	public getNextPage(): number | null {
		return this.hasNextPage() ? this.page + 1 : null;
	}

	/**
	 * Checks if more pages exist before this one.
	 */
	public hasPreviousPage(): boolean {
		return !this.isFirstPage();
	}

	/**
	 * Gets previous page number (or null if first page).
	 */
	public getPreviousPage(): number | null {
		return this.hasPreviousPage() ? this.page - 1 : null;
	}

	/**
	 * Calculates the start index of items on this page (0-based).
	 */
	public getStartIndex(): number {
		return (this.page - 1) * this.pageSize;
	}

	/**
	 * Calculates the end index of items on this page (0-based, exclusive).
	 */
	public getEndIndex(): number {
		return this.getStartIndex() + this.items.length;
	}

	/**
	 * Checks if the result is empty (no items).
	 */
	public isEmpty(): boolean {
		return this.items.length === 0;
	}

	/**
	 * Gets the items for this page (immutable access).
	 */
	public getItems(): readonly T[] {
		return this.items;
	}

	/**
	 * Gets the current page number.
	 */
	public getPage(): number {
		return this.page;
	}

	/**
	 * Gets the page size.
	 */
	public getPageSize(): number {
		return this.pageSize;
	}

	/**
	 * Gets the total count across all pages.
	 */
	public getTotalCount(): number {
		return this.totalCount;
	}
}
