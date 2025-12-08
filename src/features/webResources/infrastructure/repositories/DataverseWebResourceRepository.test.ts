import { ILogger } from '../../../../infrastructure/logging/ILogger';
import { ICancellationToken } from '../../../../shared/domain/interfaces/ICancellationToken';
import { OperationCancelledException } from '../../../../shared/domain/errors/OperationCancelledException';
import { IDataverseApiService } from '../../../../shared/infrastructure/interfaces/IDataverseApiService';
import { WebResource } from '../../domain/entities/WebResource';
import { WebResourceType } from '../../domain/valueObjects/WebResourceType';
import {
	assertDefined,
	createMockDataverseApiService,
	createMockLogger
} from '../../../../shared/testing';

import { DataverseWebResourceRepository } from './DataverseWebResourceRepository';

describe('DataverseWebResourceRepository', () => {
	let repository: DataverseWebResourceRepository;
	let mockApiService: jest.Mocked<IDataverseApiService>;
	let mockLogger: jest.Mocked<ILogger>;

	beforeEach(() => {
		mockApiService = createMockDataverseApiService();
		mockLogger = createMockLogger();
		repository = new DataverseWebResourceRepository(mockApiService, mockLogger);
	});

	describe('findAll', () => {
		it('should fetch web resources from Dataverse API and map to domain entities', async () => {
			const mockResponse = {
				value: [
					{
						webresourceid: 'wr-1',
						name: 'new_script.js',
						displayname: 'My Script',
						webresourcetype: 3, // JavaScript
						ismanaged: false,
						createdon: '2024-01-01T08:00:00Z',
						modifiedon: '2024-01-15T10:00:00Z',
						_createdby_value: 'user-1',
						createdby: { fullname: 'John Doe' },
						_modifiedby_value: 'user-2',
						modifiedby: { fullname: 'Jane Smith' }
					}
				]
			};

			mockApiService.get.mockResolvedValue(mockResponse);

			const result = await repository.findAll('env-123');

			expect(mockApiService.get).toHaveBeenCalledWith(
				'env-123',
				expect.stringContaining('/api/data/v9.2/webresourceset'),
				undefined
			);
			expect(result).toHaveLength(1);
			assertDefined(result[0]);
			expect(result[0]).toBeInstanceOf(WebResource);
			expect(result[0].id).toBe('wr-1');
			expect(result[0].name.getValue()).toBe('new_script.js');
			expect(result[0].displayName).toBe('My Script');
			expect(result[0].webResourceType.equals(WebResourceType.JAVASCRIPT)).toBe(true);
			expect(result[0].isManaged).toBe(false);
		});

		it('should handle null displayname by using name as fallback', async () => {
			const mockResponse = {
				value: [
					{
						webresourceid: 'wr-1',
						name: 'new_styles.css',
						displayname: null,
						webresourcetype: 2, // CSS
						ismanaged: false,
						createdon: '2024-01-01T08:00:00Z',
						modifiedon: '2024-01-15T10:00:00Z',
						_createdby_value: 'user-1',
						createdby: { fullname: 'Test User' },
						_modifiedby_value: 'user-1',
						modifiedby: { fullname: 'Test User' }
					}
				]
			};

			mockApiService.get.mockResolvedValue(mockResponse);

			const result = await repository.findAll('env-123');

			assertDefined(result[0]);
			expect(result[0].displayName).toBe('new_styles.css');
		});

		it('should handle multiple pages of results via OData pagination', async () => {
			const page1Response = {
				value: [
					{
						webresourceid: 'wr-1',
						name: 'new_script1.js',
						displayname: 'Script 1',
						webresourcetype: 3,
						ismanaged: false,
						createdon: '2024-01-01T08:00:00Z',
						modifiedon: '2024-01-15T10:00:00Z',
						_createdby_value: 'user-1',
						createdby: { fullname: 'Test User' },
						_modifiedby_value: 'user-1',
						modifiedby: { fullname: 'Test User' }
					}
				],
				'@odata.nextLink': 'https://org.crm.dynamics.com/api/data/v9.2/webresourceset?$skiptoken=abc'
			};

			const page2Response = {
				value: [
					{
						webresourceid: 'wr-2',
						name: 'new_script2.js',
						displayname: 'Script 2',
						webresourcetype: 3,
						ismanaged: false,
						createdon: '2024-01-01T08:00:00Z',
						modifiedon: '2024-01-15T11:00:00Z',
						_createdby_value: 'user-1',
						createdby: { fullname: 'Test User' },
						_modifiedby_value: 'user-1',
						modifiedby: { fullname: 'Test User' }
					}
				]
			};

			mockApiService.get
				.mockResolvedValueOnce(page1Response)
				.mockResolvedValueOnce(page2Response);

			const result = await repository.findAll('env-123');

			expect(mockApiService.get).toHaveBeenCalledTimes(2);
			expect(result).toHaveLength(2);
			expect(result[0]!.id).toBe('wr-1');
			expect(result[1]!.id).toBe('wr-2');
		});

		it('should extract relative path from full OData nextLink URL', async () => {
			const page1Response = {
				value: [
					{
						webresourceid: 'wr-1',
						name: 'new_script.js',
						displayname: 'Script',
						webresourcetype: 3,
						ismanaged: false,
						createdon: '2024-01-01T08:00:00Z',
						modifiedon: '2024-01-15T10:00:00Z',
						_createdby_value: 'user-1',
						createdby: { fullname: 'Test User' },
						_modifiedby_value: 'user-1',
						modifiedby: { fullname: 'Test User' }
					}
				],
				'@odata.nextLink':
					'https://myorg.crm.dynamics.com/api/data/v9.2/webresourceset?$skiptoken=abc123'
			};

			const page2Response = {
				value: []
			};

			mockApiService.get
				.mockResolvedValueOnce(page1Response)
				.mockResolvedValueOnce(page2Response);

			await repository.findAll('env-123');

			// Second call should use relative path extracted from nextLink
			expect(mockApiService.get).toHaveBeenNthCalledWith(
				2,
				'env-123',
				'/api/data/v9.2/webresourceset?$skiptoken=abc123',
				undefined
			);
		});

		it('should pass query options to OData query builder', async () => {
			const mockResponse = { value: [] };
			mockApiService.get.mockResolvedValue(mockResponse);

			await repository.findAll('env-123', {
				filter: "webresourcetype eq 3",
				orderBy: 'modifiedon desc'
			});

			expect(mockApiService.get).toHaveBeenCalledWith(
				'env-123',
				expect.stringContaining('$filter=webresourcetype%20eq%203'),
				undefined
			);
		});

		it('should handle cancellation during pagination', async () => {
			const page1Response = {
				value: [
					{
						webresourceid: 'wr-1',
						name: 'new_script.js',
						displayname: 'Script',
						webresourcetype: 3,
						ismanaged: false,
						createdon: '2024-01-01T08:00:00Z',
						modifiedon: '2024-01-15T10:00:00Z',
						_createdby_value: 'user-1',
						createdby: { fullname: 'Test User' },
						_modifiedby_value: 'user-1',
						modifiedby: { fullname: 'Test User' }
					}
				],
				'@odata.nextLink': 'https://org.crm.dynamics.com/api/data/v9.2/webresourceset?$skiptoken=abc'
			};

			mockApiService.get.mockResolvedValueOnce(page1Response);

			const cancellationToken: ICancellationToken = {
				isCancellationRequested: true,
				onCancellationRequested: jest.fn()
			};

			await expect(repository.findAll('env-123', undefined, cancellationToken)).rejects.toThrow(
				OperationCancelledException
			);
		});

		it('should map all web resource types correctly', async () => {
			// Default user fields for all test resources
			const userFields = { createdon: '2024-01-01T08:00:00Z', modifiedon: '2024-01-15T10:00:00Z', _createdby_value: 'user-1', createdby: { fullname: 'Test User' }, _modifiedby_value: 'user-1', modifiedby: { fullname: 'Test User' } };
			const mockResponse = {
				value: [
					{ webresourceid: 'wr-1', name: 'new_page.html', displayname: null, webresourcetype: 1, ismanaged: false, ...userFields },
					{ webresourceid: 'wr-2', name: 'new_styles.css', displayname: null, webresourcetype: 2, ismanaged: false, ...userFields },
					{ webresourceid: 'wr-3', name: 'new_script.js', displayname: null, webresourcetype: 3, ismanaged: false, ...userFields },
					{ webresourceid: 'wr-4', name: 'new_data.xml', displayname: null, webresourcetype: 4, ismanaged: false, ...userFields },
					{ webresourceid: 'wr-5', name: 'new_image.png', displayname: null, webresourcetype: 5, ismanaged: false, ...userFields },
					{ webresourceid: 'wr-6', name: 'new_image.jpg', displayname: null, webresourcetype: 6, ismanaged: false, ...userFields },
					{ webresourceid: 'wr-7', name: 'new_image.gif', displayname: null, webresourcetype: 7, ismanaged: false, ...userFields },
					{ webresourceid: 'wr-8', name: 'new_app.xap', displayname: null, webresourcetype: 8, ismanaged: false, ...userFields },
					{ webresourceid: 'wr-9', name: 'new_transform.xsl', displayname: null, webresourcetype: 9, ismanaged: false, ...userFields },
					{ webresourceid: 'wr-10', name: 'new_icon.ico', displayname: null, webresourcetype: 10, ismanaged: false, ...userFields },
					{ webresourceid: 'wr-11', name: 'new_vector.svg', displayname: null, webresourcetype: 11, ismanaged: false, ...userFields },
					{ webresourceid: 'wr-12', name: 'new_strings.resx', displayname: null, webresourcetype: 12, ismanaged: false, ...userFields }
				]
			};

			mockApiService.get.mockResolvedValue(mockResponse);

			const result = await repository.findAll('env-123');

			expect(result).toHaveLength(12);
			expect(result[0]!.webResourceType.equals(WebResourceType.HTML)).toBe(true);
			expect(result[1]!.webResourceType.equals(WebResourceType.CSS)).toBe(true);
			expect(result[2]!.webResourceType.equals(WebResourceType.JAVASCRIPT)).toBe(true);
			expect(result[3]!.webResourceType.equals(WebResourceType.XML)).toBe(true);
			expect(result[4]!.webResourceType.equals(WebResourceType.PNG)).toBe(true);
			expect(result[5]!.webResourceType.equals(WebResourceType.JPG)).toBe(true);
			expect(result[6]!.webResourceType.equals(WebResourceType.GIF)).toBe(true);
			expect(result[7]!.webResourceType.equals(WebResourceType.XAP)).toBe(true);
			expect(result[8]!.webResourceType.equals(WebResourceType.XSL)).toBe(true);
			expect(result[9]!.webResourceType.equals(WebResourceType.ICO)).toBe(true);
			expect(result[10]!.webResourceType.equals(WebResourceType.SVG)).toBe(true);
			expect(result[11]!.webResourceType.equals(WebResourceType.RESX)).toBe(true);
		});

		it('should handle API errors and rethrow with logging', async () => {
			const apiError = new Error('API connection failed');
			mockApiService.get.mockRejectedValue(apiError);

			await expect(repository.findAll('env-123')).rejects.toThrow('API connection failed');
			expect(mockLogger.error).toHaveBeenCalledWith(
				'Failed to fetch web resources from Dataverse API',
				expect.any(Error)
			);
		});

		it('should handle empty response', async () => {
			mockApiService.get.mockResolvedValue({ value: [] });

			const result = await repository.findAll('env-123');

			expect(result).toHaveLength(0);
		});
	});

	describe('findById', () => {
		it('should fetch a single web resource by ID', async () => {
			const mockResponse = {
				webresourceid: 'wr-123',
				name: 'new_script.js',
				displayname: 'My Script',
				webresourcetype: 3,
				ismanaged: false,
				createdon: '2024-01-01T08:00:00Z',
				modifiedon: '2024-01-15T10:00:00Z',
				_createdby_value: 'user-1',
				createdby: { fullname: 'Test User' },
				_modifiedby_value: 'user-1',
				modifiedby: { fullname: 'Test User' }
			};

			mockApiService.get.mockResolvedValue(mockResponse);

			const result = await repository.findById('env-123', 'wr-123');

			expect(mockApiService.get).toHaveBeenCalledWith(
				'env-123',
				expect.stringContaining('/api/data/v9.2/webresourceset(wr-123)'),
				undefined
			);
			assertDefined(result);
			expect(result.id).toBe('wr-123');
			expect(result.name.getValue()).toBe('new_script.js');
		});

		it('should map createdBy and modifiedBy from expanded user lookups', async () => {
			const mockResponse = {
				webresourceid: 'wr-123',
				name: 'new_script.js',
				displayname: 'My Script',
				webresourcetype: 3,
				ismanaged: false,
				createdon: '2024-01-01T08:00:00Z',
				modifiedon: '2024-01-15T10:00:00Z',
				_createdby_value: 'user-creator-guid',
				createdby: { fullname: 'John Creator' },
				_modifiedby_value: 'user-modifier-guid',
				modifiedby: { fullname: 'Jane Modifier' }
			};

			mockApiService.get.mockResolvedValue(mockResponse);

			const result = await repository.findById('env-123', 'wr-123');

			assertDefined(result);
			expect(result.createdBy).toBe('John Creator');
			expect(result.modifiedBy).toBe('Jane Modifier');
		});

		it('should use Unknown fallback when createdby/modifiedby lookups are missing', async () => {
			const mockResponse = {
				webresourceid: 'wr-123',
				name: 'new_script.js',
				displayname: 'My Script',
				webresourcetype: 3,
				ismanaged: false,
				createdon: '2024-01-01T08:00:00Z',
				modifiedon: '2024-01-15T10:00:00Z',
				_createdby_value: 'user-1',
				_modifiedby_value: 'user-1'
				// Note: createdby and modifiedby expanded objects are missing
			};

			mockApiService.get.mockResolvedValue(mockResponse);

			const result = await repository.findById('env-123', 'wr-123');

			assertDefined(result);
			expect(result.createdBy).toBe('Unknown');
			expect(result.modifiedBy).toBe('Unknown');
		});

		it('should return null when web resource not found (404)', async () => {
			const notFoundError = new Error('404 Not Found');
			mockApiService.get.mockRejectedValue(notFoundError);

			const result = await repository.findById('env-123', 'nonexistent');

			expect(result).toBeNull();
			expect(mockLogger.debug).toHaveBeenCalledWith('Web resource not found', {
				webResourceId: 'nonexistent'
			});
		});

		it('should rethrow non-404 errors', async () => {
			const serverError = new Error('500 Internal Server Error');
			mockApiService.get.mockRejectedValue(serverError);

			await expect(repository.findById('env-123', 'wr-123')).rejects.toThrow(
				'500 Internal Server Error'
			);
		});

		it('should handle cancellation', async () => {
			const cancellationToken: ICancellationToken = {
				isCancellationRequested: true,
				onCancellationRequested: jest.fn()
			};

			await expect(
				repository.findById('env-123', 'wr-123', cancellationToken)
			).rejects.toThrow(OperationCancelledException);
		});
	});

	describe('getContent', () => {
		it('should fetch web resource content', async () => {
			const mockResponse = {
				webresourceid: 'wr-123',
				content: 'Y29uc29sZS5sb2coIkhlbGxvIik7' // base64 for console.log("Hello");
			};

			mockApiService.get.mockResolvedValue(mockResponse);

			const result = await repository.getContent('env-123', 'wr-123');

			expect(mockApiService.get).toHaveBeenCalledWith(
				'env-123',
				'/api/data/v9.2/webresourceset(wr-123)/Microsoft.Dynamics.CRM.RetrieveUnpublished?$select=content',
				undefined
			);
			expect(result).toBe('Y29uc29sZS5sb2coIkhlbGxvIik7');
		});

		it('should return empty string when content is null', async () => {
			const mockResponse = {
				webresourceid: 'wr-123',
				content: null
			};

			mockApiService.get.mockResolvedValue(mockResponse);

			const result = await repository.getContent('env-123', 'wr-123');

			expect(result).toBe('');
		});

		it('should handle API errors', async () => {
			const apiError = new Error('Failed to fetch content');
			mockApiService.get.mockRejectedValue(apiError);

			await expect(repository.getContent('env-123', 'wr-123')).rejects.toThrow(
				'Failed to fetch content'
			);
			expect(mockLogger.error).toHaveBeenCalledWith(
				'Failed to fetch web resource content',
				expect.any(Error)
			);
		});

		it('should handle cancellation', async () => {
			const cancellationToken: ICancellationToken = {
				isCancellationRequested: true,
				onCancellationRequested: jest.fn()
			};

			await expect(
				repository.getContent('env-123', 'wr-123', cancellationToken)
			).rejects.toThrow(OperationCancelledException);
		});
	});

	describe('getPublishedContent', () => {
		it('should fetch published web resource content using standard OData query', async () => {
			const mockResponse = {
				webresourceid: 'wr-123',
				content: 'Y29uc29sZS5sb2coIlB1Ymxpc2hlZCIp' // base64 for console.log("Published")
			};

			mockApiService.get.mockResolvedValue(mockResponse);

			const result = await repository.getPublishedContent('env-123', 'wr-123');

			expect(mockApiService.get).toHaveBeenCalledWith(
				'env-123',
				'/api/data/v9.2/webresourceset(wr-123)?$select=content',
				undefined
			);
			expect(result).toBe('Y29uc29sZS5sb2coIlB1Ymxpc2hlZCIp');
		});

		it('should return empty string when content is null', async () => {
			const mockResponse = {
				webresourceid: 'wr-123',
				content: null
			};

			mockApiService.get.mockResolvedValue(mockResponse);

			const result = await repository.getPublishedContent('env-123', 'wr-123');

			expect(result).toBe('');
		});

		it('should handle API errors', async () => {
			const apiError = new Error('Failed to fetch published content');
			mockApiService.get.mockRejectedValue(apiError);

			await expect(repository.getPublishedContent('env-123', 'wr-123')).rejects.toThrow(
				'Failed to fetch published content'
			);
			expect(mockLogger.error).toHaveBeenCalledWith(
				'Failed to fetch published web resource content',
				expect.any(Error)
			);
		});

		it('should handle cancellation', async () => {
			const cancellationToken: ICancellationToken = {
				isCancellationRequested: true,
				onCancellationRequested: jest.fn()
			};

			await expect(
				repository.getPublishedContent('env-123', 'wr-123', cancellationToken)
			).rejects.toThrow(OperationCancelledException);
		});
	});

	describe('updateContent', () => {
		it('should update web resource content via PATCH', async () => {
			mockApiService.patch.mockResolvedValue(undefined);

			const base64Content = 'Y29uc29sZS5sb2coIkhlbGxvIik7'; // base64 for console.log("Hello");

			await repository.updateContent('env-123', 'wr-123', base64Content);

			expect(mockApiService.patch).toHaveBeenCalledWith(
				'env-123',
				'/api/data/v9.2/webresourceset(wr-123)',
				{ content: base64Content },
				undefined
			);
		});

		it('should pass cancellation token to API service', async () => {
			mockApiService.patch.mockResolvedValue(undefined);

			const cancellationToken: ICancellationToken = {
				isCancellationRequested: false,
				onCancellationRequested: jest.fn()
			};

			await repository.updateContent('env-123', 'wr-123', 'dGVzdA==', cancellationToken);

			expect(mockApiService.patch).toHaveBeenCalledWith(
				'env-123',
				'/api/data/v9.2/webresourceset(wr-123)',
				{ content: 'dGVzdA==' },
				cancellationToken
			);
		});

		it('should handle cancellation before API call', async () => {
			const cancellationToken: ICancellationToken = {
				isCancellationRequested: true,
				onCancellationRequested: jest.fn()
			};

			await expect(
				repository.updateContent('env-123', 'wr-123', 'dGVzdA==', cancellationToken)
			).rejects.toThrow(OperationCancelledException);

			expect(mockApiService.patch).not.toHaveBeenCalled();
		});

		it('should handle API errors', async () => {
			const apiError = new Error('Failed to update content');
			mockApiService.patch.mockRejectedValue(apiError);

			await expect(repository.updateContent('env-123', 'wr-123', 'dGVzdA==')).rejects.toThrow(
				'Failed to update content'
			);
			expect(mockLogger.error).toHaveBeenCalledWith(
				'Failed to update web resource content',
				expect.any(Error)
			);
		});

		it('should log debug messages', async () => {
			mockApiService.patch.mockResolvedValue(undefined);

			await repository.updateContent('env-123', 'wr-123', 'dGVzdA==');

			expect(mockLogger.debug).toHaveBeenCalledWith('Updating web resource content', {
				environmentId: 'env-123',
				webResourceId: 'wr-123',
				contentLength: 8
			});
			expect(mockLogger.debug).toHaveBeenCalledWith('Updated web resource content', {
				webResourceId: 'wr-123'
			});
		});

		it('should handle empty content', async () => {
			mockApiService.patch.mockResolvedValue(undefined);

			await repository.updateContent('env-123', 'wr-123', '');

			expect(mockApiService.patch).toHaveBeenCalledWith(
				'env-123',
				'/api/data/v9.2/webresourceset(wr-123)',
				{ content: '' },
				undefined
			);
		});
	});

	describe('publish', () => {
		it('should publish a single web resource via PublishXml action', async () => {
			mockApiService.post.mockResolvedValue(undefined);

			await repository.publish('env-123', 'wr-guid-123');

			expect(mockApiService.post).toHaveBeenCalledWith(
				'env-123',
				'/api/data/v9.2/PublishXml',
				{
					ParameterXml: '<importexportxml><webresources><webresource>{wr-guid-123}</webresource></webresources></importexportxml>'
				},
				undefined
			);
		});

		it('should pass cancellation token to API service', async () => {
			mockApiService.post.mockResolvedValue(undefined);

			const cancellationToken: ICancellationToken = {
				isCancellationRequested: false,
				onCancellationRequested: jest.fn()
			};

			await repository.publish('env-123', 'wr-guid-123', cancellationToken);

			expect(mockApiService.post).toHaveBeenCalledWith(
				'env-123',
				'/api/data/v9.2/PublishXml',
				expect.any(Object),
				cancellationToken
			);
		});

		it('should handle cancellation before API call', async () => {
			const cancellationToken: ICancellationToken = {
				isCancellationRequested: true,
				onCancellationRequested: jest.fn()
			};

			await expect(
				repository.publish('env-123', 'wr-guid-123', cancellationToken)
			).rejects.toThrow(OperationCancelledException);

			expect(mockApiService.post).not.toHaveBeenCalled();
		});

		it('should handle API errors', async () => {
			const apiError = new Error('Failed to publish');
			mockApiService.post.mockRejectedValue(apiError);

			await expect(repository.publish('env-123', 'wr-guid-123')).rejects.toThrow(
				'Failed to publish'
			);
			expect(mockLogger.error).toHaveBeenCalledWith(
				'Failed to publish web resources',
				expect.any(Error)
			);
		});

		it('should log success messages', async () => {
			mockApiService.post.mockResolvedValue(undefined);

			await repository.publish('env-123', 'wr-guid-123');

			expect(mockLogger.info).toHaveBeenCalledWith('Web resources published successfully', {
				environmentId: 'env-123',
				count: 1
			});
		});
	});

	describe('publishMultiple', () => {
		it('should publish multiple web resources via PublishXml action', async () => {
			mockApiService.post.mockResolvedValue(undefined);

			await repository.publishMultiple('env-123', ['wr-1', 'wr-2', 'wr-3']);

			expect(mockApiService.post).toHaveBeenCalledWith(
				'env-123',
				'/api/data/v9.2/PublishXml',
				{
					ParameterXml: '<importexportxml><webresources><webresource>{wr-1}</webresource><webresource>{wr-2}</webresource><webresource>{wr-3}</webresource></webresources></importexportxml>'
				},
				undefined
			);
		});

		it('should not call API when ids array is empty', async () => {
			await repository.publishMultiple('env-123', []);

			expect(mockApiService.post).not.toHaveBeenCalled();
		});

		it('should pass cancellation token to API service', async () => {
			mockApiService.post.mockResolvedValue(undefined);

			const cancellationToken: ICancellationToken = {
				isCancellationRequested: false,
				onCancellationRequested: jest.fn()
			};

			await repository.publishMultiple('env-123', ['wr-1', 'wr-2'], cancellationToken);

			expect(mockApiService.post).toHaveBeenCalledWith(
				'env-123',
				'/api/data/v9.2/PublishXml',
				expect.any(Object),
				cancellationToken
			);
		});

		it('should handle cancellation before API call', async () => {
			const cancellationToken: ICancellationToken = {
				isCancellationRequested: true,
				onCancellationRequested: jest.fn()
			};

			await expect(
				repository.publishMultiple('env-123', ['wr-1', 'wr-2'], cancellationToken)
			).rejects.toThrow(OperationCancelledException);

			expect(mockApiService.post).not.toHaveBeenCalled();
		});

		it('should handle API errors', async () => {
			const apiError = new Error('Bulk publish failed');
			mockApiService.post.mockRejectedValue(apiError);

			await expect(repository.publishMultiple('env-123', ['wr-1', 'wr-2'])).rejects.toThrow(
				'Bulk publish failed'
			);
			expect(mockLogger.error).toHaveBeenCalledWith(
				'Failed to publish web resources',
				expect.any(Error)
			);
		});

		it('should log debug and success messages', async () => {
			mockApiService.post.mockResolvedValue(undefined);

			await repository.publishMultiple('env-123', ['wr-1', 'wr-2']);

			expect(mockLogger.debug).toHaveBeenCalledWith('Publishing web resources via PublishXml', {
				environmentId: 'env-123',
				count: 2,
				webResourceIds: ['wr-1', 'wr-2']
			});
			expect(mockLogger.info).toHaveBeenCalledWith('Web resources published successfully', {
				environmentId: 'env-123',
				count: 2
			});
		});
	});

	describe('publishAll', () => {
		it('should call PublishAllXml endpoint with empty body', async () => {
			mockApiService.post.mockResolvedValue(undefined);

			await repository.publishAll('env-123');

			expect(mockApiService.post).toHaveBeenCalledWith(
				'env-123',
				'/api/data/v9.2/PublishAllXml',
				{},
				undefined
			);
		});

		it('should pass cancellation token to API service', async () => {
			mockApiService.post.mockResolvedValue(undefined);

			const cancellationToken: ICancellationToken = {
				isCancellationRequested: false,
				onCancellationRequested: jest.fn()
			};

			await repository.publishAll('env-123', cancellationToken);

			expect(mockApiService.post).toHaveBeenCalledWith(
				'env-123',
				'/api/data/v9.2/PublishAllXml',
				{},
				cancellationToken
			);
		});

		it('should handle cancellation before API call', async () => {
			const cancellationToken: ICancellationToken = {
				isCancellationRequested: true,
				onCancellationRequested: jest.fn()
			};

			await expect(
				repository.publishAll('env-123', cancellationToken)
			).rejects.toThrow(OperationCancelledException);

			expect(mockApiService.post).not.toHaveBeenCalled();
		});

		it('should handle API errors', async () => {
			const apiError = new Error('PublishAllXml failed');
			mockApiService.post.mockRejectedValue(apiError);

			await expect(repository.publishAll('env-123')).rejects.toThrow(
				'PublishAllXml failed'
			);
			expect(mockLogger.error).toHaveBeenCalledWith(
				'Failed to publish all customizations',
				expect.any(Error)
			);
		});

		it('should log debug and success messages', async () => {
			mockApiService.post.mockResolvedValue(undefined);

			await repository.publishAll('env-123');

			expect(mockLogger.debug).toHaveBeenCalledWith('Publishing all customizations via PublishAllXml', {
				environmentId: 'env-123'
			});
			expect(mockLogger.info).toHaveBeenCalledWith('All customizations published successfully', {
				environmentId: 'env-123'
			});
		});
	});
});
