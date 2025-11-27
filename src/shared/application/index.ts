/**
 * Application layer exports.
 *
 * Re-exports domain types that presentation layer needs access to,
 * following Clean Architecture dependency rules.
 */

// Services
export { VirtualTableCacheManager } from './services/VirtualTableCacheManager';
export type { CacheStateChangeCallback } from './services/VirtualTableCacheManager';

// Use Cases
export { SearchVirtualTableUseCase } from './useCases/SearchVirtualTableUseCase';
export type { SearchResult, ODataFilterBuilder } from './useCases/SearchVirtualTableUseCase';

// ViewModels
export type {
	VirtualTableViewModel,
	VirtualTablePaginationState,
	VirtualTableFilterState,
	VirtualTableVirtualizationState
} from './viewModels/VirtualTableViewModel';

// Re-exported domain types (for presentation layer access)
export { VirtualTableConfig } from '../domain/valueObjects/VirtualTableConfig';
export { VirtualTableCacheState } from '../domain/valueObjects/VirtualTableCacheState';
