import type { AttributeSuggestion } from '../valueObjects/AttributeSuggestion';

/**
 * Transformation info for a virtual column.
 */
export interface VirtualColumnInfo {
	/** The virtual column name (e.g., createdbyname) */
	virtualColumn: string;
	/** The parent column name (e.g., createdby) */
	parentColumn: string;
	/** Original alias if the virtual column had one */
	alias: string | null;
}

/**
 * Result of virtual column detection.
 */
export interface VirtualColumnTransformation {
	/** Virtual columns found in the SQL */
	virtualColumns: VirtualColumnInfo[];
	/** Parent columns that need to be added (not already in SQL) */
	parentsToAdd: string[];
	/** Original column names from SQL (for result filtering) */
	originalColumns: string[];
	/** Whether any transformation is needed */
	needsTransformation: boolean;
}

/**
 * Domain Service: Virtual Column Detector
 *
 * Detects virtual columns in SQL queries and determines transformation needed.
 * Virtual columns (like createdbyname) derive from parent columns (createdby).
 * Dataverse ignores virtual columns in SELECT unless their parent is present.
 *
 * This service enables transparent transformation:
 * - User writes: SELECT createdbyname FROM account
 * - We transform to: SELECT createdby FROM account
 * - We show only: createdbyname column in results
 */
export class VirtualColumnDetector {
	/**
	 * Analyzes SQL columns against entity metadata to detect virtual columns.
	 *
	 * @param sqlColumns - Column names from SQL (may include table prefix like "a.createdbyname")
	 * @param attributes - Attribute metadata for the entity
	 * @returns Transformation info with virtual columns, parents to add, and original columns
	 */
	public detect(
		sqlColumns: Array<{ name: string; alias: string | null; tablePrefix: string | null }>,
		attributes: AttributeSuggestion[]
	): VirtualColumnTransformation {
		// Build lookup map: column name (lowercase) → attribute
		const attrMap = new Map<string, AttributeSuggestion>();
		for (const attr of attributes) {
			attrMap.set(attr.logicalName.toLowerCase(), attr);
		}

		const virtualColumns: VirtualColumnInfo[] = [];
		const originalColumns: string[] = [];
		const requestedColumns = new Set<string>();

		// Collect all requested columns (lowercase for comparison)
		for (const col of sqlColumns) {
			const colName = col.name.toLowerCase();
			requestedColumns.add(colName);
			// Store original name (with alias if present)
			originalColumns.push(col.alias ?? col.name);
		}

		// Find virtual columns and their parents
		for (const col of sqlColumns) {
			const colName = col.name.toLowerCase();
			const attr = attrMap.get(colName);

			if (attr !== undefined && attr.isVirtual() && attr.attributeOf !== null) {
				virtualColumns.push({
					virtualColumn: col.name,
					parentColumn: attr.attributeOf,
					alias: col.alias,
				});
			}
		}

		// Determine which parents need to be added
		const parentsToAdd: string[] = [];
		for (const vc of virtualColumns) {
			const parentLower = vc.parentColumn.toLowerCase();
			if (!requestedColumns.has(parentLower)) {
				// Parent not in SQL, needs to be added
				if (!parentsToAdd.includes(vc.parentColumn)) {
					parentsToAdd.push(vc.parentColumn);
				}
			}
		}

		return {
			virtualColumns,
			parentsToAdd,
			originalColumns,
			// Transform whenever there are virtual columns - they must be replaced with parents
			needsTransformation: virtualColumns.length > 0,
		};
	}

	/**
	 * Filters result columns to match original SQL request.
	 * Called after query execution to show only what user asked for.
	 *
	 * @param resultColumns - Columns returned from query
	 * @param originalColumns - Original column names from SQL
	 * @param virtualColumns - Virtual column transformation info
	 * @returns Column names to display (in original order)
	 */
	public filterResultColumns(
		resultColumns: string[],
		originalColumns: string[],
		virtualColumns: VirtualColumnInfo[]
	): string[] {
		// Build set of original column names (lowercase for comparison)
		const originalSet = new Set(originalColumns.map(c => c.toLowerCase()));

		// Build map of virtual → expected result column name
		// e.g., if user wrote "createdbyname", result will have "createdbyname" from auto-expansion
		const virtualResultNames = new Map<string, string>();
		for (const vc of virtualColumns) {
			// Virtual column maps to parent's auto-expanded name column
			// e.g., createdby → createdbyname (auto-expanded)
			// But if user explicitly requested createdbyname, show it
			virtualResultNames.set(vc.virtualColumn.toLowerCase(), vc.alias ?? vc.virtualColumn);
		}

		// Filter result columns to original request
		const filtered: string[] = [];
		const seen = new Set<string>();

		// First, add columns in original order
		for (const origCol of originalColumns) {
			const origLower = origCol.toLowerCase();

			// Find matching result column
			for (const resCol of resultColumns) {
				const resLower = resCol.toLowerCase();

				// Direct match
				if (resLower === origLower && !seen.has(resLower)) {
					filtered.push(resCol);
					seen.add(resLower);
					break;
				}

				// Virtual column match - user requested virtual, we added parent,
				// result has auto-expanded name column
				if (virtualResultNames.has(origLower)) {
					const expectedName = virtualResultNames.get(origLower);
					if (expectedName !== undefined && resLower === expectedName.toLowerCase() && !seen.has(resLower)) {
						filtered.push(resCol);
						seen.add(resLower);
						break;
					}
				}
			}
		}

		return filtered;
	}
}
