import { IDataverseApiService } from '../../../../shared/infrastructure/interfaces/IDataverseApiService';
import { ICancellationToken } from '../../../../shared/domain/interfaces/ICancellationToken';
import { QueryOptions } from '../../../../shared/domain/interfaces/QueryOptions';
import { OperationCancelledException } from '../../../../shared/domain/errors/OperationCancelledException';
import { ILogger } from '../../../../infrastructure/logging/ILogger';
import { ODataQueryBuilder } from '../../../../shared/infrastructure/utils/ODataQueryBuilder';
import { ISolutionRepository } from '../../domain/interfaces/ISolutionRepository';
import { Solution } from '../../domain/entities/Solution';
import { normalizeError } from '../../../../shared/utils/ErrorUtils';

/**
 * Dataverse API response for solutions endpoint
 */
interface DataverseSolutionsResponse {
  value: DataverseSolutionDto[];
}

/**
 * DTO for solution data from Dataverse API
 */
interface DataverseSolutionDto {
  solutionid: string;
  uniquename: string;
  friendlyname: string;
  version: string;
  ismanaged: boolean;
  _publisherid_value: string;
  installedon: string | null;
  description: string | null;
  modifiedon: string;
  isvisible: boolean;
  isapimanaged: boolean;
  solutiontype: string | null;
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

  /**
   * Fetches all solutions from Dataverse for the specified environment.
   */
  async findAll(
    environmentId: string,
    options?: QueryOptions,
    cancellationToken?: ICancellationToken
  ): Promise<Solution[]> {
    // Default options: expand publisher, order by friendly name
    const defaultOptions: QueryOptions = {
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

    if (cancellationToken?.isCancellationRequested) {
      this.logger.debug('Repository operation cancelled before API call');
      throw new OperationCancelledException();
    }

    try {
      const response = await this.apiService.get<DataverseSolutionsResponse>(
        environmentId,
        endpoint,
        cancellationToken
      );

      if (cancellationToken?.isCancellationRequested) {
        this.logger.debug('Repository operation cancelled after API call');
        throw new OperationCancelledException();
      }

      const solutions = response.value.map((dto) => this.mapToEntity(dto));

      this.logger.debug(`Fetched ${solutions.length} solution(s) from Dataverse`, { environmentId });

      return solutions;
    } catch (error) {
      const normalizedError = normalizeError(error);
      this.logger.error('Failed to fetch solutions from Dataverse API', normalizedError);
      throw normalizedError;
    }
  }

  /**
   * Maps Dataverse DTO to Solution domain entity.
   */
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
