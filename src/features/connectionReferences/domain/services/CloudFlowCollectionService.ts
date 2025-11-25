import type { CloudFlow } from '../entities/CloudFlow';

/**
 * Domain service for managing collections of CloudFlow entities.
 */
export class CloudFlowCollectionService {
	/**
	 * Sorts cloud flows alphabetically by name (defensive copy).
	 */
	sort(flows: CloudFlow[]): CloudFlow[] {
		return [...flows].sort((a, b) => a.name.localeCompare(b.name));
	}
}
