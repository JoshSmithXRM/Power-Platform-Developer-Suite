import { CsvExportService, type TabularData } from './CsvExportService';
import { NullLogger } from '../../../infrastructure/logging/NullLogger';

describe('CsvExportService', () => {
	let service: CsvExportService;

	beforeEach(() => {
		service = new CsvExportService(new NullLogger());
	});

	describe('toCsv', () => {
		it('should convert simple tabular data to CSV', () => {
			const data: TabularData = {
				headers: ['Name', 'Email', 'Age'],
				rows: [
					['Alice', 'alice@example.com', '30'],
					['Bob', 'bob@example.com', '25'],
				],
			};

			const result = service.toCsv(data);

			expect(result).toBe(
				'Name,Email,Age\n' +
				'Alice,alice@example.com,30\n' +
				'Bob,bob@example.com,25'
			);
		});

		it('should handle empty rows', () => {
			const data: TabularData = {
				headers: ['Name', 'Email'],
				rows: [],
			};

			const result = service.toCsv(data);

			expect(result).toBe('Name,Email');
		});

		it('should escape fields containing commas', () => {
			const data: TabularData = {
				headers: ['Name', 'Address'],
				rows: [['Smith, John', '123 Main St']],
			};

			const result = service.toCsv(data);

			expect(result).toBe('Name,Address\n"Smith, John",123 Main St');
		});

		it('should escape fields containing double quotes', () => {
			const data: TabularData = {
				headers: ['Name', 'Quote'],
				rows: [['Alice', 'She said "Hello"']],
			};

			const result = service.toCsv(data);

			expect(result).toBe('Name,Quote\nAlice,"She said ""Hello"""');
		});

		it('should escape fields containing newlines', () => {
			const data: TabularData = {
				headers: ['Name', 'Notes'],
				rows: [['Alice', 'Line 1\nLine 2']],
			};

			const result = service.toCsv(data);

			expect(result).toBe('Name,Notes\nAlice,"Line 1\nLine 2"');
		});

		it('should handle complex escaping with multiple special characters', () => {
			const data: TabularData = {
				headers: ['Name', 'Description'],
				rows: [['Test', '"Hello", she said\nThen left']],
			};

			const result = service.toCsv(data);

			expect(result).toBe('Name,Description\nTest,"""Hello"", she said\nThen left"');
		});

		it('should handle empty string values', () => {
			const data: TabularData = {
				headers: ['Name', 'Email', 'Phone'],
				rows: [['Alice', '', '555-1234']],
			};

			const result = service.toCsv(data);

			expect(result).toBe('Name,Email,Phone\nAlice,,555-1234');
		});
	});

	describe('toJson', () => {
		it('should convert array of objects to pretty JSON', () => {
			const data = [
				{ name: 'Alice', age: 30 },
				{ name: 'Bob', age: 25 },
			];

			const result = service.toJson(data);

			expect(result).toBe(JSON.stringify(data, null, 2));
		});

		it('should handle empty array', () => {
			const result = service.toJson([]);

			expect(result).toBe('[]');
		});

		it('should handle nested objects', () => {
			const data = [
				{
					name: 'Alice',
					address: { city: 'Seattle', zip: '98101' },
				},
			];

			const result = service.toJson(data);

			expect(JSON.parse(result)).toEqual(data);
		});

		it('should handle null values', () => {
			const data = [{ name: 'Alice', email: null }];

			const result = service.toJson(data);

			expect(JSON.parse(result)).toEqual(data);
		});
	});

	describe('escapeCsvField', () => {
		it('should not escape simple values', () => {
			expect(service.escapeCsvField('Hello')).toBe('Hello');
		});

		it('should escape value with comma', () => {
			expect(service.escapeCsvField('Hello, World')).toBe('"Hello, World"');
		});

		it('should escape value with double quote', () => {
			expect(service.escapeCsvField('Say "Hi"')).toBe('"Say ""Hi"""');
		});

		it('should escape value with newline', () => {
			expect(service.escapeCsvField('Line1\nLine2')).toBe('"Line1\nLine2"');
		});

		it('should handle empty string', () => {
			expect(service.escapeCsvField('')).toBe('');
		});

		it('should escape value with all special characters', () => {
			expect(service.escapeCsvField('"Hi,\nBye"')).toBe('"""Hi,\nBye"""');
		});
	});
});
