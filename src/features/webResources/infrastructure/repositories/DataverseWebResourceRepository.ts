import { IDataverseApiService } from '../../../../shared/infrastructure/interfaces/IDataverseApiService';
import { ICancellationToken } from '../../../../shared/domain/interfaces/ICancellationToken';
import { QueryOptions } from '../../../../shared/domain/interfaces/QueryOptions';
import { PaginatedResult } from '../../../../shared/domain/valueObjects/PaginatedResult';
import { ILogger } from '../../../../infrastructure/logging/ILogger';
import { ODataQueryBuilder } from '../../../../shared/infrastructure/utils/ODataQueryBuilder';
import { CancellationHelper } from '../../../../shared/infrastructure/utils/CancellationHelper';
import { IWebResourceRepository } from '../../domain/interfaces/IWebResourceRepository';
import { WebResource } from '../../domain/entities/WebResource';
import { WebResourceType } from '../../domain/valueObjects/WebResourceType';
import { WebResourceName } from '../../domain/valueObjects/WebResourceName';
import { normalizeError } from '../../../../shared/utils/ErrorUtils';

/**
 * OData response wrapper from Dataverse API webresourceset query.
 */
interface DataverseWebResourcesResponse {
	value: DataverseWebResourceDto[];
	/** OData nextLink for pagination - present when more records exist */
	'@odata.nextLink'?: string;
	/** OData count - present when $count=true query param is used */
	'@odata.count'?: number;
}

/**
 * Response for single web resource with content.
 */
interface DataverseWebResourceContentResponse {
	webresourceid: string;
	content: string;
}

/**
 * DTO representing a web resource entity from Dataverse Web API.
 *
 * @remarks
 * External API contract - property names must match Dataverse API exactly.
 */
interface DataverseWebResourceDto {
	/** webresourceid field - Primary key */
	webresourceid: string;
	/** name field - Logical name with publisher prefix (e.g., new_myscript.js) */
	name: string;
	/** displayname field - Friendly name */
	displayname: string | null;
	/** webresourcetype field - Type code (1-12) */
	webresourcetype: number;
	/** ismanaged field - Whether in managed solution */
	ismanaged: boolean;
	/** modifiedon field - Last modification timestamp */
	modifiedon: string;
}

/**
 * Infrastructure implementation of IWebResourceRepository using Dataverse Web API.
 */
export class DataverseWebResourceRepository implements IWebResourceRepository {
	constructor(
		private readonly apiService: IDataverseApiService,
		private readonly logger: ILogger
	) {}

	async findAll(
		environmentId: string,
		options?: QueryOptions,
		cancellationToken?: ICancellationToken
	): Promise<WebResource[]> {
		const defaultOptions: QueryOptions = {
			select: [
				'webresourceid',
				'name',
				'displayname',
				'webresourcetype',
				'ismanaged',
				'modifiedon'
			],
			orderBy: 'name'
		};

		const mergedOptions: QueryOptions = {
			...defaultOptions,
			...options
		};

		const queryString = ODataQueryBuilder.build(mergedOptions);
		const initialEndpoint = `/api/data/v9.2/webresourceset${queryString ? '?' + queryString : ''}`;

		this.logger.debug('Fetching web resources from Dataverse API', { environmentId });

		CancellationHelper.throwIfCancelled(cancellationToken);

		try {
			const allDtos: DataverseWebResourceDto[] = [];
			let endpoint: string | undefined = initialEndpoint;
			let pageCount = 0;

			// Fetch all pages using OData pagination
			while (endpoint) {
				CancellationHelper.throwIfCancelled(cancellationToken);

				const response = await this.apiService.get<DataverseWebResourcesResponse>(
					environmentId,
					endpoint,
					cancellationToken
				);

				allDtos.push(...response.value);
				pageCount++;

				this.logger.debug('Fetched web resources page', {
					page: pageCount,
					pageSize: response.value.length,
					totalSoFar: allDtos.length,
					hasMore: !!response['@odata.nextLink']
				});

				// Get next page URL if available
				const nextLink = response['@odata.nextLink'];
				if (nextLink) {
					// nextLink is a full URL - extract the relative path
					endpoint = this.extractRelativePath(nextLink);
				} else {
					endpoint = undefined;
				}
			}

			CancellationHelper.throwIfCancelled(cancellationToken);

			const webResources = allDtos.map((dto) => this.mapToEntity(dto));

			this.logger.info('Fetched all web resources from Dataverse', {
				environmentId,
				totalCount: webResources.length,
				pages: pageCount
			});

			return webResources;
		} catch (error) {
			const normalizedError = normalizeError(error);
			this.logger.error('Failed to fetch web resources from Dataverse API', normalizedError);
			throw normalizedError;
		}
	}

	/**
	 * Extracts relative path from a full OData nextLink URL.
	 * OData returns full URLs like https://org.crm.dynamics.com/api/data/v9.2/...
	 * We need just the relative path for our API service.
	 */
	private extractRelativePath(fullUrl: string): string {
		try {
			const url = new URL(fullUrl);
			return url.pathname + url.search;
		} catch {
			// If parsing fails, assume it's already a relative path
			return fullUrl;
		}
	}

	async findById(
		environmentId: string,
		webResourceId: string,
		cancellationToken?: ICancellationToken
	): Promise<WebResource | null> {
		const endpoint = `/api/data/v9.2/webresourceset(${webResourceId})?$select=webresourceid,name,displayname,webresourcetype,ismanaged,modifiedon`;

		this.logger.debug('Fetching web resource by ID', { environmentId, webResourceId });

		CancellationHelper.throwIfCancelled(cancellationToken);

		try {
			const dto = await this.apiService.get<DataverseWebResourceDto>(
				environmentId,
				endpoint,
				cancellationToken
			);

			CancellationHelper.throwIfCancelled(cancellationToken);

			const webResource = this.mapToEntity(dto);

			this.logger.debug('Fetched web resource by ID', { webResourceId, name: dto.name });

			return webResource;
		} catch (error) {
			const normalizedError = normalizeError(error);
			// 404 means not found - return null
			if (normalizedError.message.includes('404') || normalizedError.message.includes('Not Found')) {
				this.logger.debug('Web resource not found', { webResourceId });
				return null;
			}
			this.logger.error('Failed to fetch web resource by ID', normalizedError);
			throw normalizedError;
		}
	}

	async getContent(
		environmentId: string,
		webResourceId: string,
		cancellationToken?: ICancellationToken
	): Promise<string> {
		const endpoint = `/api/data/v9.2/webresourceset(${webResourceId})?$select=content`;

		this.logger.debug('Fetching web resource content', { environmentId, webResourceId });

		CancellationHelper.throwIfCancelled(cancellationToken);

		try {
			const response = await this.apiService.get<DataverseWebResourceContentResponse>(
				environmentId,
				endpoint,
				cancellationToken
			);

			CancellationHelper.throwIfCancelled(cancellationToken);

			this.logger.debug('Fetched web resource content', {
				webResourceId,
				contentLength: response.content?.length ?? 0
			});

			return response.content ?? '';
		} catch (error) {
			const normalizedError = normalizeError(error);
			this.logger.error('Failed to fetch web resource content', normalizedError);
			throw normalizedError;
		}
	}

	async updateContent(
		environmentId: string,
		webResourceId: string,
		base64Content: string,
		cancellationToken?: ICancellationToken
	): Promise<void> {
		const endpoint = `/api/data/v9.2/webresourceset(${webResourceId})`;

		this.logger.debug('Updating web resource content', {
			environmentId,
			webResourceId,
			contentLength: base64Content.length
		});

		CancellationHelper.throwIfCancelled(cancellationToken);

		try {
			await this.apiService.patch(
				environmentId,
				endpoint,
				{ content: base64Content },
				cancellationToken
			);

			CancellationHelper.throwIfCancelled(cancellationToken);

			this.logger.debug('Updated web resource content', { webResourceId });
		} catch (error) {
			const normalizedError = normalizeError(error);
			this.logger.error('Failed to update web resource content', normalizedError);
			throw normalizedError;
		}
	}

	/**
	 * Retrieves a paginated subset of web resources using OData $skip and $top.
	 * Supports true server-side pagination (unlike Solutions which don't support $skip).
	 */
	async findPaginated(
		environmentId: string,
		page: number,
		pageSize: number,
		options?: QueryOptions,
		cancellationToken?: ICancellationToken
	): Promise<PaginatedResult<WebResource>> {
		const skip = (page - 1) * pageSize;

		// Build query with pagination and count
		const queryParts: string[] = [
			'$select=webresourceid,name,displayname,webresourcetype,ismanaged,modifiedon',
			'$count=true',
			`$top=${pageSize}`,
			`$skip=${skip}`,
			'$orderby=name'
		];

		// Add filter if provided
		if (options?.filter) {
			queryParts.push(`$filter=${encodeURIComponent(options.filter)}`);
		}

		// Override orderBy if provided
		if (options?.orderBy) {
			// Replace the default orderby
			const orderByIndex = queryParts.findIndex(p => p.startsWith('$orderby='));
			if (orderByIndex >= 0) {
				queryParts[orderByIndex] = `$orderby=${encodeURIComponent(options.orderBy)}`;
			}
		}

		const endpoint = `/api/data/v9.2/webresourceset?${queryParts.join('&')}`;

		this.logger.debug('Fetching paginated web resources from Dataverse', {
			environmentId,
			page,
			pageSize,
			skip
		});

		CancellationHelper.throwIfCancelled(cancellationToken);

		try {
			const response = await this.apiService.get<DataverseWebResourcesResponse>(
				environmentId,
				endpoint,
				cancellationToken
			);

			CancellationHelper.throwIfCancelled(cancellationToken);

			const webResources = response.value.map((dto) => this.mapToEntity(dto));
			const totalCount = response['@odata.count'] ?? webResources.length;

			this.logger.debug('Fetched paginated web resources', {
				page,
				pageSize,
				returnedCount: webResources.length,
				totalCount
			});

			return PaginatedResult.create(webResources, page, pageSize, totalCount);
		} catch (error) {
			const normalizedError = normalizeError(error);
			this.logger.error('Failed to fetch paginated web resources', normalizedError);
			throw normalizedError;
		}
	}

	/**
	 * Gets the total count of web resources using OData $count query parameter.
	 * Uses $top=1 for efficiency (Dataverse doesn't allow $top=0).
	 */
	async getCount(
		environmentId: string,
		options?: QueryOptions,
		cancellationToken?: ICancellationToken
	): Promise<number> {
		const queryParts: string[] = [
			'$count=true',
			'$top=1',
			'$select=webresourceid'
		];

		if (options?.filter) {
			queryParts.push(`$filter=${encodeURIComponent(options.filter)}`);
		}

		const endpoint = `/api/data/v9.2/webresourceset?${queryParts.join('&')}`;

		this.logger.debug('Fetching web resource count from Dataverse', { environmentId });

		CancellationHelper.throwIfCancelled(cancellationToken);

		try {
			const response = await this.apiService.get<DataverseWebResourcesResponse>(
				environmentId,
				endpoint,
				cancellationToken
			);

			const count = response['@odata.count'] ?? 0;

			this.logger.debug('Fetched web resource count', { environmentId, count });

			return count;
		} catch (error) {
			const normalizedError = normalizeError(error);
			this.logger.error('Failed to fetch web resource count', normalizedError);
			throw normalizedError;
		}
	}

	/**
	 * Publishes a single web resource using the PublishXml action.
	 * Makes changes visible to users after updating content.
	 */
	async publish(
		environmentId: string,
		webResourceId: string,
		cancellationToken?: ICancellationToken
	): Promise<void> {
		await this.publishMultiple(environmentId, [webResourceId], cancellationToken);
	}

	/**
	 * Publishes multiple web resources at once using the PublishXml action.
	 * More efficient than publishing one at a time for bulk operations.
	 */
	async publishMultiple(
		environmentId: string,
		webResourceIds: string[],
		cancellationToken?: ICancellationToken
	): Promise<void> {
		if (webResourceIds.length === 0) {
			return;
		}

		// Build ParameterXml for PublishXml action
		// Format: <importexportxml><webresources><webresource>{guid}</webresource>...</webresources></importexportxml>
		const webResourceElements = webResourceIds
			.map((id) => `<webresource>{${id}}</webresource>`)
			.join('');
		const parameterXml = `<importexportxml><webresources>${webResourceElements}</webresources></importexportxml>`;

		const endpoint = '/api/data/v9.2/PublishXml';

		this.logger.debug('Publishing web resources via PublishXml', {
			environmentId,
			count: webResourceIds.length,
			webResourceIds
		});

		CancellationHelper.throwIfCancelled(cancellationToken);

		try {
			await this.apiService.post(
				environmentId,
				endpoint,
				{ ParameterXml: parameterXml },
				cancellationToken
			);

			CancellationHelper.throwIfCancelled(cancellationToken);

			this.logger.info('Web resources published successfully', {
				environmentId,
				count: webResourceIds.length
			});
		} catch (error) {
			const normalizedError = normalizeError(error);
			this.logger.error('Failed to publish web resources', normalizedError);
			throw normalizedError;
		}
	}

	/**
	 * Publishes all customizations in the environment using PublishAllXml.
	 * This publishes ALL solution components (entities, web resources, etc.), not just web resources.
	 */
	async publishAll(
		environmentId: string,
		cancellationToken?: ICancellationToken
	): Promise<void> {
		const endpoint = '/api/data/v9.2/PublishAllXml';

		this.logger.debug('Publishing all customizations via PublishAllXml', { environmentId });

		CancellationHelper.throwIfCancelled(cancellationToken);

		try {
			// PublishAllXml takes no parameters - just POST to the endpoint
			await this.apiService.post(
				environmentId,
				endpoint,
				{},
				cancellationToken
			);

			CancellationHelper.throwIfCancelled(cancellationToken);

			this.logger.info('All customizations published successfully', { environmentId });
		} catch (error) {
			const normalizedError = normalizeError(error);
			this.logger.error('Failed to publish all customizations', normalizedError);
			throw normalizedError;
		}
	}

	private mapToEntity(dto: DataverseWebResourceDto): WebResource {
		return new WebResource(
			dto.webresourceid,
			WebResourceName.create(dto.name),
			dto.displayname ?? dto.name,
			WebResourceType.fromCode(dto.webresourcetype),
			dto.ismanaged,
			new Date(dto.modifiedon)
		);
	}
}
