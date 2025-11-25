import { DataverseApiService } from './DataverseApiService';
import type { ILogger } from '../../../infrastructure/logging/ILogger';
import type { ICancellationToken } from '../../domain/interfaces/ICancellationToken';
import { OperationCancelledException } from '../../domain/errors/OperationCancelledException';

global.fetch = jest.fn();

describe('DataverseApiService', () => {
	let service: DataverseApiService;
	let mockLogger: jest.Mocked<ILogger>;
	let mockGetAccessToken: jest.Mock;
	let mockGetEnvironmentUrl: jest.Mock;

	beforeEach(() => {
		jest.clearAllMocks();
		(global.fetch as jest.Mock).mockClear();

		mockLogger = {
			trace: jest.fn(),
		debug: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn()
		};

		mockGetAccessToken = jest.fn().mockResolvedValue('test-token');
		mockGetEnvironmentUrl = jest.fn().mockResolvedValue('https://test.dynamics.com');

		service = new DataverseApiService(
			mockGetAccessToken,
			mockGetEnvironmentUrl,
			mockLogger
		);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('batchDelete', () => {
		it('should construct batch delete request with multipart OData format and return success count', async () => {
			const mockResponse = {
				ok: true,
				text: jest.fn().mockResolvedValue('HTTP/1.1 204\r\nHTTP/1.1 204\r\n')
			};
			(global.fetch as jest.Mock).mockResolvedValue(mockResponse);

			const result = await service.batchDelete(
				'env-123',
				'plugintracelogs',
				['id-1', 'id-2']
			);

			expect(result).toBe(2);
			expect(global.fetch).toHaveBeenCalledWith(
				'https://test.dynamics.com/api/data/v9.2/$batch',
				expect.objectContaining({
					method: 'POST',
					headers: expect.objectContaining({
						'Authorization': 'Bearer test-token',
						'Content-Type': expect.stringContaining('multipart/mixed; boundary=batch_')
					})
				})
			);
		});

		it('should return zero and skip API call when entity IDs array is empty', async () => {
			const result = await service.batchDelete('env-123', 'plugintracelogs', []);

			expect(result).toBe(0);
			expect(global.fetch).not.toHaveBeenCalled();
		});

		it('should count only successful 204 responses when batch contains mixed success and failure', async () => {
			const mockResponse = {
				ok: true,
				text: jest.fn().mockResolvedValue('HTTP/1.1 204\r\nHTTP/1.1 404\r\nHTTP/1.1 204\r\n')
			};
			(global.fetch as jest.Mock).mockResolvedValue(mockResponse);

			const result = await service.batchDelete(
				'env-123',
				'plugintracelogs',
				['id-1', 'id-2', 'id-3']
			);

			expect(result).toBe(2);
		});

		it('should throw error and log failure when batch request returns 500 status', async () => {
			const mockResponse = {
				ok: false,
				status: 500,
				statusText: 'Internal Server Error',
				text: jest.fn().mockResolvedValue('Error details')
			};
			(global.fetch as jest.Mock).mockResolvedValue(mockResponse);

			await expect(service.batchDelete('env-123', 'plugintracelogs', ['id-1']))
				.rejects.toThrow('Batch delete failed');

			expect(mockLogger.error).toHaveBeenCalled();
		});

		it('should throw OperationCancelledException immediately when cancellation token is already set', async () => {
			const mockCancellationToken: ICancellationToken = {
				isCancellationRequested: true,
				onCancellationRequested: jest.fn()
			};

			await expect(
				service.batchDelete('env-123', 'plugintracelogs', ['id-1'], mockCancellationToken)
			).rejects.toThrow(OperationCancelledException);

			expect(global.fetch).not.toHaveBeenCalled();
		});

		it('should throw OperationCancelledException when operation cancelled during token retrieval', async () => {
			let cancelled = false;
			const mockCancellationToken: ICancellationToken = {
				get isCancellationRequested() { return cancelled; },
				onCancellationRequested: jest.fn()
			};

			mockGetAccessToken.mockImplementation(async () => {
				cancelled = true;
				return 'test-token';
			});

			await expect(
				service.batchDelete('env-123', 'plugintracelogs', ['id-1'], mockCancellationToken)
			).rejects.toThrow(OperationCancelledException);
		});

		it('should log batch delete operation details at debug level for troubleshooting', async () => {
			const mockResponse = {
				ok: true,
				text: jest.fn().mockResolvedValue('HTTP/1.1 204\r\n')
			};
			(global.fetch as jest.Mock).mockResolvedValue(mockResponse);

			await service.batchDelete('env-123', 'plugintracelogs', ['id-1']);

			expect(mockLogger.debug).toHaveBeenCalledWith(
				expect.stringContaining('Batch DELETE'),
				expect.objectContaining({})
			);
		});
	});

	describe('retry logic', () => {
		it('should automatically retry request after receiving 429 rate limiting response', async () => {
			const mockFailureResponse = {
				ok: false,
				status: 429,
				statusText: 'Too Many Requests',
				text: jest.fn().mockResolvedValue('Rate limit exceeded')
			};

			const mockSuccessResponse = {
				ok: true,
				status: 200,
				json: jest.fn().mockResolvedValue({ value: 'success' })
			};

			(global.fetch as jest.Mock)
				.mockResolvedValueOnce(mockFailureResponse)
				.mockResolvedValueOnce(mockSuccessResponse);

			const result = await service.get('env-123', '/api/data/v9.2/test');

			expect(result).toEqual({ value: 'success' });
			expect(global.fetch).toHaveBeenCalledTimes(2);
			expect(mockLogger.warn).toHaveBeenCalledWith(
				expect.stringContaining('Retrying request'),
				expect.objectContaining({})
			);
		});

		it('should automatically retry request after receiving 503 service unavailable response', async () => {
			const mockFailureResponse = {
				ok: false,
				status: 503,
				statusText: 'Service Unavailable',
				text: jest.fn().mockResolvedValue('Service temporarily unavailable')
			};

			const mockSuccessResponse = {
				ok: true,
				status: 200,
				json: jest.fn().mockResolvedValue({ value: 'success' })
			};

			(global.fetch as jest.Mock)
				.mockResolvedValueOnce(mockFailureResponse)
				.mockResolvedValueOnce(mockSuccessResponse);

			const result = await service.get('env-123', '/api/data/v9.2/test');

			expect(result).toEqual({ value: 'success' });
			expect(global.fetch).toHaveBeenCalledTimes(2);
		});

		it('should apply exponential backoff delays between multiple retry attempts', async () => {
			const mockFailureResponse = {
				ok: false,
				status: 503,
				statusText: 'Service Unavailable',
				text: jest.fn().mockResolvedValue('Temporarily unavailable')
			};

			const mockSuccessResponse = {
				ok: true,
				status: 200,
				json: jest.fn().mockResolvedValue({ value: 'success' })
			};

			(global.fetch as jest.Mock)
				.mockResolvedValueOnce(mockFailureResponse)
				.mockResolvedValueOnce(mockFailureResponse)
				.mockResolvedValueOnce(mockSuccessResponse);

			const startTime = Date.now();
			await service.get('env-123', '/api/data/v9.2/test');
			const duration = Date.now() - startTime;

			expect(global.fetch).toHaveBeenCalledTimes(3);
			expect(duration).toBeGreaterThanOrEqual(3000);
		});

		it('should not retry non-transient 404 errors to avoid unnecessary load', async () => {
			const mockResponse = {
				ok: false,
				status: 404,
				statusText: 'Not Found',
				text: jest.fn().mockResolvedValue('Resource not found')
			};

			(global.fetch as jest.Mock).mockResolvedValue(mockResponse);

			await expect(service.get('env-123', '/api/data/v9.2/test'))
				.rejects.toThrow('Dataverse API request failed');

			expect(global.fetch).toHaveBeenCalledTimes(1);
		});

		it('should throw error after exhausting maximum retry attempts for 503 errors', async () => {
			const mockResponse = {
				ok: false,
				status: 503,
				statusText: 'Service Unavailable',
				text: jest.fn().mockResolvedValue('Service unavailable')
			};

			(global.fetch as jest.Mock).mockResolvedValue(mockResponse);

			await expect(service.get('env-123', '/api/data/v9.2/test'))
				.rejects.toThrow('Dataverse API request failed');

			expect(global.fetch).toHaveBeenCalledTimes(3);
			expect(mockLogger.error).toHaveBeenCalled();
		});

		it('should retry automatically after transient network timeout errors', async () => {
			const timeoutError = new Error('fetch failed');

			const mockSuccessResponse = {
				ok: true,
				status: 200,
				json: jest.fn().mockResolvedValue({ value: 'success' })
			};

			(global.fetch as jest.Mock)
				.mockRejectedValueOnce(timeoutError)
				.mockResolvedValueOnce(mockSuccessResponse);

			const result = await service.get('env-123', '/api/data/v9.2/test');

			expect(result).toEqual({ value: 'success' });
			expect(global.fetch).toHaveBeenCalledTimes(2);
		});

		it('should abort retry logic when operation is cancelled via cancellation token', async () => {
			let cancelled = false;
			const mockCancellationToken: ICancellationToken = {
				get isCancellationRequested() { return cancelled; },
				onCancellationRequested: jest.fn()
			};

			const mockResponse = {
				ok: false,
				status: 503,
				statusText: 'Service Unavailable',
				text: jest.fn().mockResolvedValue('Service unavailable')
			};

			(global.fetch as jest.Mock).mockImplementation(async () => {
				cancelled = true;
				return mockResponse;
			});

			await expect(
				service.get('env-123', '/api/data/v9.2/test', mockCancellationToken)
			).rejects.toThrow(OperationCancelledException);

			expect(global.fetch).toHaveBeenCalledTimes(1);
		});
	});

	describe('HTTP methods', () => {
		it('should execute GET request with authorization header and parse JSON response', async () => {
			const mockResponse = {
				ok: true,
				status: 200,
				json: jest.fn().mockResolvedValue({ value: 'data' })
			};
			(global.fetch as jest.Mock).mockResolvedValue(mockResponse);

			const result = await service.get('env-123', '/api/data/v9.2/test');

			expect(result).toEqual({ value: 'data' });
			expect(global.fetch).toHaveBeenCalledWith(
				'https://test.dynamics.com/api/data/v9.2/test',
				expect.objectContaining({
					method: 'GET'
				})
			);
		});

		it('should include Prefer header to request OData annotations for lookup metadata', async () => {
			const mockResponse = {
				ok: true,
				status: 200,
				json: jest.fn().mockResolvedValue({ value: [] })
			};
			(global.fetch as jest.Mock).mockResolvedValue(mockResponse);

			await service.get('env-123', '/api/data/v9.2/contacts');

			expect(global.fetch).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					headers: expect.objectContaining({
						'Prefer': 'odata.include-annotations="*"'
					})
				})
			);
		});

		it('should execute POST request with JSON-serialized body and return created resource', async () => {
			const mockResponse = {
				ok: true,
				status: 200,
				json: jest.fn().mockResolvedValue({ id: 'new-id' })
			};
			(global.fetch as jest.Mock).mockResolvedValue(mockResponse);

			const body = { name: 'Test' };
			const result = await service.post('env-123', '/api/data/v9.2/test', body);

			expect(result).toEqual({ id: 'new-id' });
			expect(global.fetch).toHaveBeenCalledWith(
				expect.stringContaining('/api/data/v9.2/test'),
				expect.objectContaining({
					method: 'POST',
					body: JSON.stringify(body)
				})
			);
		});

		it('should execute PATCH request to update existing resource with partial data', async () => {
			const mockResponse = {
				ok: true,
				status: 200,
				json: jest.fn().mockResolvedValue({})
			};
			(global.fetch as jest.Mock).mockResolvedValue(mockResponse);

			const body = { name: 'Updated' };
			await service.patch('env-123', '/api/data/v9.2/test(id)', body);

			expect(global.fetch).toHaveBeenCalledWith(
				expect.stringContaining('/api/data/v9.2/test'),
				expect.objectContaining({
					method: 'PATCH'
				})
			);
		});

		it('should execute DELETE request to remove resource from Dataverse', async () => {
			const mockResponse = {
				ok: true,
				status: 204
			};
			(global.fetch as jest.Mock).mockResolvedValue(mockResponse);

			await service.delete('env-123', '/api/data/v9.2/test(id)');

			expect(global.fetch).toHaveBeenCalledWith(
				expect.stringContaining('/api/data/v9.2/test'),
				expect.objectContaining({
					method: 'DELETE'
				})
			);
		});

		it('should return undefined when API responds with 204 No Content status', async () => {
			const mockResponse = {
				ok: true,
				status: 204
			};
			(global.fetch as jest.Mock).mockResolvedValue(mockResponse);

			const result = await service.get('env-123', '/api/data/v9.2/test');

			expect(result).toBeUndefined();
		});

		it('should throw validation error when API returns non-object JSON response', async () => {
			const mockResponse = {
				ok: true,
				status: 200,
				json: jest.fn().mockResolvedValue('invalid')
			};
			(global.fetch as jest.Mock).mockResolvedValue(mockResponse);

			await expect(service.get('env-123', '/api/data/v9.2/test'))
				.rejects.toThrow('Invalid Dataverse API response: expected JSON object');
		});
	});
});
