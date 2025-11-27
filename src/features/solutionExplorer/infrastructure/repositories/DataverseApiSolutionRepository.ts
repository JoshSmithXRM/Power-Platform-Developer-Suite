import { IDataverseApiService } from '../../../../shared/infrastructure/interfaces/IDataverseApiService';
import { ICancellationToken } from '../../../../shared/domain/interfaces/ICancellationToken';
import { QueryOptions } from '../../../../shared/domain/interfaces/QueryOptions';
import { PaginatedResult } from '../../../../shared/domain/valueObjects/PaginatedResult';
import { ILogger } from '../../../../infrastructure/logging/ILogger';
import { ODataQueryBuilder } from '../../../../shared/infrastructure/utils/ODataQueryBuilder';
import { CancellationHelper } from '../../../../shared/infrastructure/utils/CancellationHelper';
import { ISolutionRepository } from '../../domain/interfaces/ISolutionRepository';
import { Solution } from '../../domain/entities/Solution';
import { normalizeError } from '../../../../shared/utils/ErrorUtils';

/**
 * OData response wrapper from Dataverse API solutions query.
 */
interface DataverseSolutionsResponse {
  value: DataverseSolutionDto[];
}

/**
 * DTO representing a solution entity from Dataverse Web API.
 * Maps to the solutions entity schema in Dataverse.
 */
interface DataverseSolutionDto {
  /** solutionid field - Primary key */
  solutionid: string;
  /** uniquename field - Logical name of the solution */
  uniquename: string;
  /** friendlyname field - Display name */
  friendlyname: string;
  /** version field - Solution version (e.g., "1.0.0.0") */
  version: string;
  /** ismanaged field - Whether solution is managed */
  ismanaged: boolean;
  /** _publisherid_value field - Publisher GUID */
  _publisherid_value: string;
  /** installedon field - Installation timestamp */
  installedon: string | null;
  /** description field - Solution description */
  description: string | null;
  /** modifiedon field - Last modification timestamp */
  modifiedon: string;
  /** isvisible field - Whether solution appears in UI */
  isvisible: boolean;
  /** isapimanaged field - Whether solution is API-managed */
  isapimanaged: boolean;
  /** solutiontype field - Solution type identifier */
  solutiontype: string | null;
  /** publisherid expanded navigation - Publisher entity */
  publisherid?: {
    friendlyname: string;
  };
}

/**
 * Infrastructure implementation of ISolutionRepository using Dataverse Web API.
 */
export class DataverseApiSolutionRepository implements ISolutionRepository {
  constructor(
    private readonly apiService: IDataverseApiService,
    private readonly logger: ILogger
  ) {}

  async findAll(
    environmentId: string,
    options?: QueryOptions,
    cancellationToken?: ICancellationToken
  ): Promise<Solution[]> {
    const defaultOptions: QueryOptions = {
      select: [
        'solutionid',
        'uniquename',
        'friendlyname',
        'version',
        'ismanaged',
        '_publisherid_value',
        'installedon',
        'description',
        'modifiedon',
        'isvisible',
        'isapimanaged',
        'solutiontype'
      ],
      expand: 'publisherid($select=friendlyname)',
      orderBy: 'friendlyname'
    };

    const mergedOptions: QueryOptions = {
      ...defaultOptions,
      ...options
    };

    const queryString = ODataQueryBuilder.build(mergedOptions);
    const endpoint = `/api/data/v9.2/solutions${queryString ? '?' + queryString : ''}`;

    this.logger.debug('Fetching solutions from Dataverse API', { environmentId });

    CancellationHelper.throwIfCancelled(cancellationToken);

    try {
      const response = await this.apiService.get<DataverseSolutionsResponse>(
        environmentId,
        endpoint,
        cancellationToken
      );

      CancellationHelper.throwIfCancelled(cancellationToken);

      const solutions = response.value.map((dto) => this.mapToEntity(dto));

      this.logger.debug('Fetched solutions from Dataverse', { environmentId, count: solutions.length });

      return solutions;
    } catch (error) {
      const normalizedError = normalizeError(error);
      this.logger.error('Failed to fetch solutions from Dataverse API', normalizedError);
      throw normalizedError;
    }
  }

  /**
   * Fetches minimal solution data for dropdown display (only visible solutions).
   * Optimized query: only fetches id, friendlyName, uniqueName.
   * Filters to isvisible = true.
   */
  async findAllForDropdown(
    environmentId: string,
    cancellationToken?: ICancellationToken
  ): Promise<Array<{ id: string; name: string; uniqueName: string }>> {
    const queryString = ODataQueryBuilder.build({
      select: ['solutionid', 'friendlyname', 'uniquename'],
      filter: 'isvisible eq true',
      orderBy: 'friendlyname'
    });

    const endpoint = `/api/data/v9.2/solutions?${queryString}`;

    this.logger.debug('Fetching solutions for dropdown from Dataverse API', { environmentId });

    CancellationHelper.throwIfCancelled(cancellationToken);

    try {
      const response = await this.apiService.get<DataverseSolutionsResponse>(
        environmentId,
        endpoint,
        cancellationToken
      );

      CancellationHelper.throwIfCancelled(cancellationToken);

      const solutions = response.value.map(dto => ({
        id: dto.solutionid,
        name: dto.friendlyname,
        uniqueName: dto.uniquename
      }));

      this.logger.debug('Fetched visible solutions for dropdown', { environmentId, count: solutions.length });

      return solutions;
    } catch (error) {
      const normalizedError = normalizeError(error);
      this.logger.error('Failed to fetch solutions for dropdown from Dataverse API', normalizedError);
      throw normalizedError;
    }
  }

  /**
   * Retrieves a paginated subset of solutions from the specified environment.
   * Note: Dataverse Solutions entity doesn't support $skip, so we load all in page 1.
   * This is acceptable for Solutions (~1200 records) but won't scale to larger datasets.
   */
  async findPaginated(
    environmentId: string,
    page: number,
    _pageSize: number,
    options?: QueryOptions,
    cancellationToken?: ICancellationToken
  ): Promise<PaginatedResult<Solution>> {
    // Dataverse Solutions doesn't support $skip pagination
    // Load all solutions in page 1, return empty for subsequent pages
    if (page > 1) {
      this.logger.debug('Solutions pagination: returning empty for page > 1 (all loaded in page 1)', { page });
      return PaginatedResult.create([], page, _pageSize, 0);
    }

    this.logger.debug('Fetching all solutions from Dataverse API (no $skip support)', { environmentId });

    CancellationHelper.throwIfCancelled(cancellationToken);

    try {
      // Load all solutions at once since $skip isn't supported
      const solutions = await this.findAll(environmentId, options, cancellationToken);

      this.logger.debug('Fetched all solutions from Dataverse', {
        environmentId,
        count: solutions.length
      });

      // Return all solutions as page 1 with totalCount = solutions.length
      // This tells the cache manager all data is loaded
      return PaginatedResult.create(solutions, 1, solutions.length, solutions.length);
    } catch (error) {
      const normalizedError = normalizeError(error);
      this.logger.error('Failed to fetch solutions from Dataverse API', normalizedError);
      throw normalizedError;
    }
  }

  /**
   * Gets the total count of solutions in the specified environment.
   * Uses OData $count=true query parameter which returns @odata.count in response.
   */
  async getCount(
    environmentId: string,
    options?: QueryOptions,
    cancellationToken?: ICancellationToken
  ): Promise<number> {
    // Use $count=true with $top=1 for efficient count query (Dataverse doesn't allow $top=0)
    // This returns @odata.count in a JSON response (compatible with DataverseApiService)
    const filterParam = options?.filter ? `&$filter=${encodeURIComponent(options.filter)}` : '';
    const endpoint = `/api/data/v9.2/solutions?$count=true&$top=1&$select=solutionid${filterParam}`;

    this.logger.debug('Fetching solution count from Dataverse API', { environmentId });

    CancellationHelper.throwIfCancelled(cancellationToken);

    try {
      const response = await this.apiService.get<{ '@odata.count': number }>(
        environmentId,
        endpoint,
        cancellationToken
      );

      const count = response['@odata.count'];
      this.logger.debug('Fetched solution count from Dataverse', { environmentId, count });

      return count;
    } catch (error) {
      const normalizedError = normalizeError(error);
      this.logger.error('Failed to fetch solution count from Dataverse API', normalizedError);
      throw normalizedError;
    }
  }

  private mapToEntity(dto: DataverseSolutionDto): Solution {
    return new Solution(
      dto.solutionid,
      dto.uniquename,
      dto.friendlyname,
      dto.version,
      dto.ismanaged,
      dto._publisherid_value,
      dto.publisherid?.friendlyname ?? 'Unknown',
      dto.installedon ? new Date(dto.installedon) : null,
      dto.description ?? '',
      new Date(dto.modifiedon),
      dto.isvisible,
      dto.isapimanaged,
      dto.solutiontype
    );
  }
}
