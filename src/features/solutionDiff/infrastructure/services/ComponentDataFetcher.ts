import { IDataverseApiService } from '../../../../shared/infrastructure/interfaces/IDataverseApiService';
import { ICancellationToken } from '../../../../shared/domain/interfaces/ICancellationToken';
import { ILogger } from '../../../../infrastructure/logging/ILogger';
import { ODataQueryBuilder } from '../../../../shared/infrastructure/utils/ODataQueryBuilder';
import { CancellationHelper } from '../../../../shared/infrastructure/utils/CancellationHelper';
import { normalizeError } from '../../../../shared/utils/ErrorUtils';
import { ComponentType } from '../../domain/enums/ComponentType';
import { ComponentTypeRegistry, ComponentTypeConfig } from '../../domain/services/ComponentTypeRegistry';
import { SolutionComponent } from '../../domain/entities/SolutionComponent';

/**
 * Progress callback for deep comparison operations.
 */
export interface DeepComparisonProgress {
  /** Current phase: "fetching" | "comparing" */
  readonly phase: 'fetching' | 'comparing';

  /** Number of components processed */
  readonly completed: number;

  /** Total number of components to process */
  readonly total: number;

  /** Current component type being processed */
  readonly currentType: ComponentType | null;
}

export type ProgressCallback = (progress: DeepComparisonProgress) => void;

/**
 * Fetched component data for comparison.
 */
export interface FetchedComponentData {
  /** Component object ID (GUID) */
  readonly objectId: string;

  /** Component type */
  readonly componentType: ComponentType;

  /** Display name from Dataverse */
  readonly displayName: string;

  /** Column values (only comparable columns) */
  readonly columnValues: Readonly<Record<string, unknown>>;
}

/**
 * Error that occurred when fetching a component.
 */
export interface ComponentFetchError {
  readonly objectId: string;
  readonly componentType: ComponentType;
  readonly message: string;
}

/**
 * Result of fetching component data from an environment.
 */
export interface EnvironmentComponentData {
  readonly environmentId: string;
  readonly components: readonly FetchedComponentData[];
  readonly errors: readonly ComponentFetchError[];
}

/**
 * Infrastructure service that fetches component records for deep comparison.
 *
 * Responsibilities:
 * - Fetch component records from Dataverse by object IDs
 * - Batch requests by component type (one API call per type per environment)
 * - Use $filter with 'or' to fetch multiple records per call
 * - Report progress via callback
 * - Handle errors gracefully (partial results are still useful)
 *
 * This is an INFRASTRUCTURE service, not domain. It knows about:
 * - API endpoints
 * - Query construction
 * - Error handling for API calls
 */
export class ComponentDataFetcher {
  /** Maximum number of IDs per $filter clause to avoid URL length limits */
  private static readonly MAX_IDS_PER_BATCH = 50;

  constructor(
    private readonly apiService: IDataverseApiService,
    private readonly registry: ComponentTypeRegistry,
    private readonly logger: ILogger
  ) {}

  /**
   * Fetches component data from both environments in parallel.
   *
   * @param sourceEnvironmentId - Source environment GUID
   * @param targetEnvironmentId - Target environment GUID
   * @param sourceComponents - Components from source (from ComponentComparison)
   * @param targetComponents - Components from target
   * @param onProgress - Progress callback for UI updates
   * @param cancellationToken - Cancellation support
   */
  async fetchComponentData(
    sourceEnvironmentId: string,
    targetEnvironmentId: string,
    sourceComponents: readonly SolutionComponent[],
    targetComponents: readonly SolutionComponent[],
    onProgress?: ProgressCallback,
    cancellationToken?: ICancellationToken
  ): Promise<{
    source: EnvironmentComponentData;
    target: EnvironmentComponentData;
  }> {
    this.logger.info('Starting deep comparison fetch', {
      sourceEnvironmentId,
      targetEnvironmentId,
      sourceComponentCount: sourceComponents.length,
      targetComponentCount: targetComponents.length
    });

    // Group components by type for batch fetching
    const sourceByType = this.groupByType(sourceComponents);
    const targetByType = this.groupByType(targetComponents);

    // Calculate totals for progress
    const totalSource = this.countSupportedComponents(sourceByType);
    const totalTarget = this.countSupportedComponents(targetByType);
    let completedSource = 0;
    let completedTarget = 0;

    // Create progress wrapper for source
    const sourceProgressCallback = onProgress ? (increment: number, currentType: ComponentType | null): void => {
      completedSource += increment;
      onProgress({
        phase: 'fetching',
        completed: completedSource + completedTarget,
        total: totalSource + totalTarget,
        currentType
      });
    } : undefined;

    // Create progress wrapper for target
    const targetProgressCallback = onProgress ? (increment: number, currentType: ComponentType | null): void => {
      completedTarget += increment;
      onProgress({
        phase: 'fetching',
        completed: completedSource + completedTarget,
        total: totalSource + totalTarget,
        currentType
      });
    } : undefined;

    // Fetch from both environments in parallel
    const [source, target] = await Promise.all([
      this.fetchForEnvironment(
        sourceEnvironmentId,
        sourceByType,
        'source',
        sourceProgressCallback,
        cancellationToken
      ),
      this.fetchForEnvironment(
        targetEnvironmentId,
        targetByType,
        'target',
        targetProgressCallback,
        cancellationToken
      )
    ]);

    this.logger.info('Deep comparison fetch complete', {
      sourceFetched: source.components.length,
      sourceErrors: source.errors.length,
      targetFetched: target.components.length,
      targetErrors: target.errors.length
    });

    return { source, target };
  }

  /**
   * Fetches component data for a single environment.
   */
  private async fetchForEnvironment(
    environmentId: string,
    componentsByType: Map<ComponentType, SolutionComponent[]>,
    label: string,
    onProgress?: (increment: number, currentType: ComponentType | null) => void,
    cancellationToken?: ICancellationToken
  ): Promise<EnvironmentComponentData> {
    const results: FetchedComponentData[] = [];
    const errors: ComponentFetchError[] = [];

    for (const [componentType, components] of componentsByType) {
      CancellationHelper.throwIfCancelled(cancellationToken);

      const config = this.registry.getConfig(componentType);
      if (!config) {
        // Unsupported type - skip deep comparison
        this.logger.debug('Skipping unsupported component type for deep comparison', {
          componentType,
          label
        });
        continue;
      }

      try {
        const fetched = await this.fetchBatch(
          environmentId,
          componentType,
          components,
          config,
          cancellationToken
        );
        results.push(...fetched);

        onProgress?.(components.length, componentType);
      } catch (error) {
        // Log but don't fail - partial results are still useful
        const normalizedError = normalizeError(error);
        this.logger.warn('Failed to fetch components for deep comparison', {
          environmentId,
          label,
          componentType,
          componentCount: components.length,
          error: normalizedError.message
        });

        for (const component of components) {
          errors.push({
            objectId: component.getObjectId(),
            componentType,
            message: normalizedError.message
          });
        }

        onProgress?.(components.length, componentType);
      }
    }

    return { environmentId, components: results, errors };
  }

  /**
   * Fetches a batch of components of the same type.
   */
  private async fetchBatch(
    environmentId: string,
    componentType: ComponentType,
    components: readonly SolutionComponent[],
    config: ComponentTypeConfig,
    cancellationToken?: ICancellationToken
  ): Promise<FetchedComponentData[]> {
    const objectIds = components.map(c => c.getObjectId());

    // Split into smaller batches to avoid URL length limits
    const batches = this.splitIntoBatches(objectIds, ComponentDataFetcher.MAX_IDS_PER_BATCH);
    const results: FetchedComponentData[] = [];

    for (const batchIds of batches) {
      CancellationHelper.throwIfCancelled(cancellationToken);

      const batchResults = await this.fetchSingleBatch(
        environmentId,
        componentType,
        batchIds,
        config,
        cancellationToken
      );
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Fetches a single batch of components (up to MAX_IDS_PER_BATCH).
   */
  private async fetchSingleBatch(
    environmentId: string,
    componentType: ComponentType,
    objectIds: readonly string[],
    config: ComponentTypeConfig,
    cancellationToken?: ICancellationToken
  ): Promise<FetchedComponentData[]> {
    // Build OData query with $filter for all object IDs
    const idFilter = objectIds
      .map(id => `${config.primaryKeyColumn} eq ${id}`)
      .join(' or ');

    const selectColumns = [
      config.primaryKeyColumn,
      config.displayNameColumn,
      ...config.comparableColumns
    ];

    const queryString = ODataQueryBuilder.build({
      select: selectColumns,
      filter: idFilter
    });

    const endpoint = `/api/data/v9.2/${config.tableName}${queryString ? '?' + queryString : ''}`;

    this.logger.debug('Fetching component batch', {
      environmentId,
      componentType,
      tableName: config.tableName,
      batchSize: objectIds.length
    });

    const response = await this.apiService.get<{ value: Record<string, unknown>[] }>(
      environmentId,
      endpoint,
      cancellationToken
    );

    return response.value.map(record => this.mapToFetchedData(record, componentType, config));
  }

  /**
   * Maps a Dataverse record to FetchedComponentData interface.
   */
  private mapToFetchedData(
    record: Record<string, unknown>,
    componentType: ComponentType,
    config: ComponentTypeConfig
  ): FetchedComponentData {
    const columnValues: Record<string, unknown> = {};
    for (const col of config.comparableColumns) {
      columnValues[col] = record[col];
    }

    const primaryKey = record[config.primaryKeyColumn];
    const displayName = record[config.displayNameColumn];

    return {
      objectId: String(primaryKey),
      componentType,
      displayName: String(displayName ?? primaryKey),
      columnValues
    };
  }

  /**
   * Groups components by their type.
   */
  private groupByType(components: readonly SolutionComponent[]): Map<ComponentType, SolutionComponent[]> {
    const groups = new Map<ComponentType, SolutionComponent[]>();
    for (const component of components) {
      const type = component.getComponentType();
      const existing = groups.get(type) ?? [];
      existing.push(component);
      groups.set(type, existing);
    }
    return groups;
  }

  /**
   * Counts total supported components (those with registry config).
   */
  private countSupportedComponents(componentsByType: Map<ComponentType, SolutionComponent[]>): number {
    let total = 0;
    for (const [type, components] of componentsByType) {
      if (this.registry.isDeepComparisonSupported(type)) {
        total += components.length;
      }
    }
    return total;
  }

  /**
   * Splits an array into smaller batches.
   */
  private splitIntoBatches<T>(items: readonly T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push([...items.slice(i, i + batchSize)]);
    }
    return batches;
  }
}
