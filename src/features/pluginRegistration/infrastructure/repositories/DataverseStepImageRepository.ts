import type { IDataverseApiService } from '../../../../shared/infrastructure/interfaces/IDataverseApiService';
import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type {
	IStepImageRepository,
	RegisterImageInput,
	UpdateImageInput,
} from '../../domain/interfaces/IStepImageRepository';
import { StepImage } from '../../domain/entities/StepImage';
import { ImageType } from '../../domain/valueObjects/ImageType';

/**
 * DTO for Dataverse sdkmessageprocessingstepimage entity.
 */
interface StepImageDto {
	sdkmessageprocessingstepimageid: string;
	name: string;
	_sdkmessageprocessingstepid_value: string;
	imagetype: number;
	entityalias: string;
	messagepropertyname: string;
	attributes: string | null;
	createdon: string;
}

/**
 * Dataverse API response for sdkmessageprocessingstepimage collection.
 * Includes optional @odata.nextLink for pagination (Dataverse defaults to 5000 records per page).
 */
interface StepImageCollectionResponse {
	value: StepImageDto[];
	'@odata.nextLink'?: string;
}

/**
 * Dataverse repository for StepImage entities.
 * Implements IStepImageRepository interface.
 */
export class DataverseStepImageRepository implements IStepImageRepository {
	private static readonly ENTITY_SET = 'sdkmessageprocessingstepimages';
	private static readonly SELECT_FIELDS =
		'sdkmessageprocessingstepimageid,name,_sdkmessageprocessingstepid_value,imagetype,entityalias,messagepropertyname,attributes,createdon';

	constructor(
		private readonly apiService: IDataverseApiService,
		private readonly logger: ILogger
	) {}

	public async findAll(environmentId: string): Promise<readonly StepImage[]> {
		this.logger.debug('DataverseStepImageRepository: Fetching ALL images', {
			environmentId,
		});

		// Use primary key ordering for optimal pagination performance
		const initialEndpoint =
			`/api/data/v9.2/${DataverseStepImageRepository.ENTITY_SET}` +
			`?$select=${DataverseStepImageRepository.SELECT_FIELDS}` +
			`&$orderby=sdkmessageprocessingstepimageid asc`;

		const allImages: StepImage[] = [];
		let currentEndpoint: string | null = initialEndpoint;
		let pageCount = 0;

		while (currentEndpoint !== null) {
			const response: StepImageCollectionResponse =
				await this.apiService.get<StepImageCollectionResponse>(environmentId, currentEndpoint);

			const pageImages = response.value.map((dto: StepImageDto) => this.mapToDomain(dto));
			allImages.push(...pageImages);
			pageCount++;

			const nextLink: string | undefined = response['@odata.nextLink'];
			if (nextLink !== undefined) {
				const url: URL = new URL(nextLink);
				currentEndpoint = url.pathname + url.search;
			} else {
				currentEndpoint = null;
			}
		}

		this.logger.debug('DataverseStepImageRepository: Fetched ALL images', {
			count: allImages.length,
			pages: pageCount,
		});

		return allImages;
	}

	public async findByStepId(
		environmentId: string,
		stepId: string
	): Promise<readonly StepImage[]> {
		this.logger.debug('DataverseStepImageRepository: Fetching images', {
			environmentId,
			stepId,
		});

		const endpoint =
			`/api/data/v9.2/${DataverseStepImageRepository.ENTITY_SET}?$select=${DataverseStepImageRepository.SELECT_FIELDS}` +
			`&$filter=_sdkmessageprocessingstepid_value eq ${stepId}&$orderby=name asc`;

		const response = await this.apiService.get<StepImageCollectionResponse>(
			environmentId,
			endpoint
		);

		const images = response.value.map((dto) => this.mapToDomain(dto));

		this.logger.debug('DataverseStepImageRepository: Fetched images', {
			count: images.length,
		});

		return images;
	}

	public async findById(environmentId: string, imageId: string): Promise<StepImage | null> {
		this.logger.debug('DataverseStepImageRepository: Fetching image by ID', {
			environmentId,
			imageId,
		});

		const endpoint = `/api/data/v9.2/${DataverseStepImageRepository.ENTITY_SET}(${imageId})?$select=${DataverseStepImageRepository.SELECT_FIELDS}`;

		try {
			const dto = await this.apiService.get<StepImageDto>(environmentId, endpoint);
			return this.mapToDomain(dto);
		} catch (error) {
			if (error instanceof Error && error.message.includes('404')) {
				return null;
			}
			throw error;
		}
	}

	public async delete(environmentId: string, imageId: string): Promise<void> {
		this.logger.debug('DataverseStepImageRepository: Deleting image', {
			environmentId,
			imageId,
		});

		const endpoint = `/api/data/v9.2/${DataverseStepImageRepository.ENTITY_SET}(${imageId})`;

		await this.apiService.delete(environmentId, endpoint);

		this.logger.debug('DataverseStepImageRepository: Image deleted', { imageId });
	}

	public async register(environmentId: string, input: RegisterImageInput): Promise<string> {
		this.logger.debug('DataverseStepImageRepository: Registering image', {
			environmentId,
			name: input.name,
			stepId: input.stepId,
		});

		const endpoint = `/api/data/v9.2/${DataverseStepImageRepository.ENTITY_SET}`;

		// Build payload
		const payload: Record<string, unknown> = {
			name: input.name,
			'sdkmessageprocessingstepid@odata.bind': `/sdkmessageprocessingsteps(${input.stepId})`,
			imagetype: input.imageType,
			entityalias: input.entityAlias,
			messagepropertyname: input.messagePropertyName,
		};

		if (input.attributes) {
			payload['attributes'] = input.attributes;
		}

		interface CreateResponse {
			sdkmessageprocessingstepimageid: string;
		}

		const response = await this.apiService.post<CreateResponse>(
			environmentId,
			endpoint,
			payload
		);

		this.logger.debug('DataverseStepImageRepository: Image registered', {
			imageId: response.sdkmessageprocessingstepimageid,
		});

		return response.sdkmessageprocessingstepimageid;
	}

	public async update(
		environmentId: string,
		imageId: string,
		input: UpdateImageInput
	): Promise<void> {
		this.logger.debug('DataverseStepImageRepository: Updating image', {
			environmentId,
			imageId,
		});

		const endpoint = `/api/data/v9.2/${DataverseStepImageRepository.ENTITY_SET}(${imageId})`;

		// Build payload - always include step reference (required by Dataverse, observed from PRT SOAP trace)
		const payload: Record<string, unknown> = {
			'sdkmessageprocessingstepid@odata.bind': `/sdkmessageprocessingsteps(${input.stepId})`,
		};

		if (input.name !== undefined) {
			payload['name'] = input.name;
		}

		if (input.imageType !== undefined) {
			payload['imagetype'] = input.imageType;
		}

		if (input.entityAlias !== undefined) {
			payload['entityalias'] = input.entityAlias;
		}

		if (input.messagePropertyName !== undefined) {
			payload['messagepropertyname'] = input.messagePropertyName;
		}

		if (input.attributes !== undefined) {
			payload['attributes'] = input.attributes || null;
		}

		await this.apiService.patch(environmentId, endpoint, payload);

		this.logger.debug('DataverseStepImageRepository: Image updated', { imageId });
	}

	private mapToDomain(dto: StepImageDto): StepImage {
		return new StepImage(
			dto.sdkmessageprocessingstepimageid,
			dto.name,
			dto._sdkmessageprocessingstepid_value,
			ImageType.fromValue(dto.imagetype),
			dto.entityalias,
			dto.attributes ?? '',
			dto.messagepropertyname,
			new Date(dto.createdon)
		);
	}
}
