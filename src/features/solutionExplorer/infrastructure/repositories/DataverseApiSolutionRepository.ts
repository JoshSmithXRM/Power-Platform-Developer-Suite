import { IDataverseApiService } from '../../../../shared/infrastructure/interfaces/IDataverseApiService';
import { ICancellationToken } from '../../../../shared/domain/interfaces/ICancellationToken';
import { QueryOptions } from '../../../../shared/domain/interfaces/QueryOptions';
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
