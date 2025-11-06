import { DataverseApiService } from '../DataverseApiService';
import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { ICancellationToken } from '../../../domain/interfaces/ICancellationToken';
import { OperationCancelledException } from '../../../domain/errors/OperationCancelledException';

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
		it('should perform batch delete with correct OData format', async () => {
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

		it('should handle empty entity IDs array', async () => {
			const result = await service.batchDelete('env-123', 'plugintracelogs', []);

			expect(result).toBe(0);
			expect(global.fetch).not.toHaveBeenCalled();
		});

		it('should parse partial success responses', async () => {
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

		it('should throw error when batch request fails', async () => {
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

		it('should throw OperationCancelledException when cancelled', async () => {
			const mockCancellationToken: ICancellationToken = {
				isCancellationRequested: true,
				onCancellationRequested: jest.fn()
			};

			await expect(
				service.batchDelete('env-123', 'plugintracelogs', ['id-1'], mockCancellationToken)
			).rejects.toThrow(OperationCancelledException);

			expect(global.fetch).not.toHaveBeenCalled();
		});

		it('should throw OperationCancelledException when cancelled after token retrieval', async () => {
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

		it('should log batch delete operations', async () => {
			const mockResponse = {
				ok: true,
				text: jest.fn().mockResolvedValue('HTTP/1.1 204\r\n')
			};
			(global.fetch as jest.Mock).mockResolvedValue(mockResponse);

			await service.batchDelete('env-123', 'plugintracelogs', ['id-1']);

			expect(mockLogger.debug).toHaveBeenCalledWith(
				expect.stringContaining('Batch DELETE'),
				expect.any(Object)
			);
		});
	});

	describe('retry logic', () => {
		it('should retry on 429 rate limiting', async () => {
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
				expect.any(Object)
			);
		});

		it('should retry on 503 service unavailable', async () => {
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

		it('should use exponential backoff for retries', async () => {
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

		it('should not retry on 404 not found', async () => {
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

		it('should fail after maximum retry attempts', async () => {
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

		it('should retry on network timeout errors', async () => {
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

		it('should not retry on OperationCancelledException', async () => {
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
		it('should perform GET request', async () => {
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

		it('should perform POST request with body', async () => {
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
				expect.any(String),
				expect.objectContaining({
					method: 'POST',
					body: JSON.stringify(body)
				})
			);
		});

		it('should perform PATCH request', async () => {
			const mockResponse = {
				ok: true,
				status: 200,
				json: jest.fn().mockResolvedValue({})
			};
			(global.fetch as jest.Mock).mockResolvedValue(mockResponse);

			const body = { name: 'Updated' };
			await service.patch('env-123', '/api/data/v9.2/test(id)', body);

			expect(global.fetch).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					method: 'PATCH'
				})
			);
		});

		it('should perform DELETE request', async () => {
			const mockResponse = {
				ok: true,
				status: 204
			};
			(global.fetch as jest.Mock).mockResolvedValue(mockResponse);

			await service.delete('env-123', '/api/data/v9.2/test(id)');

			expect(global.fetch).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					method: 'DELETE'
				})
			);
		});

		it('should return undefined for 204 No Content', async () => {
			const mockResponse = {
				ok: true,
				status: 204
			};
			(global.fetch as jest.Mock).mockResolvedValue(mockResponse);

			const result = await service.get('env-123', '/api/data/v9.2/test');

			expect(result).toBeUndefined();
		});

		it('should validate response is an object', async () => {
			const mockResponse = {
				ok: true,
				status: 200,
				json: jest.fn().mockResolvedValue('invalid')
			};
			(global.fetch as jest.Mock).mockResolvedValue(mockResponse);

			await expect(service.get('env-123', '/api/data/v9.2/test'))
				.rejects.toThrow('Invalid API response structure');
		});
	});
});
