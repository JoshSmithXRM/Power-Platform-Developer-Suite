import { FetchXmlValidationError } from './FetchXmlValidationError';

describe('FetchXmlValidationError', () => {
	const sampleFetchXml = '<fetch><entity name="account"></entity></fetch>';

	describe('constructor', () => {
		it('should create error with first error message and line number', () => {
			const errors = [
				{ message: 'Missing attribute', line: 5 },
				{ message: 'Invalid element', line: 10 },
			];

			const error = new FetchXmlValidationError(errors, sampleFetchXml);

			expect(error.message).toBe('FetchXML validation failed at line 5: Missing attribute');
			expect(error.errors).toEqual(errors);
			expect(error.fetchXml).toBe(sampleFetchXml);
		});

		it('should create error without line number when not provided', () => {
			const errors = [{ message: 'FetchXML cannot be empty' }];

			const error = new FetchXmlValidationError(errors, '');

			expect(error.message).toBe('FetchXML validation failed: FetchXML cannot be empty');
		});

		it('should handle empty errors array', () => {
			const error = new FetchXmlValidationError([], sampleFetchXml);

			expect(error.message).toBe('FetchXML validation failed');
		});

		it('should be instance of Error', () => {
			const error = new FetchXmlValidationError(
				[{ message: 'Test error' }],
				sampleFetchXml
			);

			expect(error).toBeInstanceOf(Error);
		});

		it('should have correct name property', () => {
			const error = new FetchXmlValidationError(
				[{ message: 'Test error' }],
				sampleFetchXml
			);

			expect(error.name).toBe('FetchXmlValidationError');
		});
	});

	describe('getFormattedErrors', () => {
		it('should format errors with line numbers', () => {
			const errors = [
				{ message: 'Missing attribute', line: 5 },
				{ message: 'Invalid element', line: 10 },
			];

			const error = new FetchXmlValidationError(errors, sampleFetchXml);
			const formatted = error.getFormattedErrors();

			expect(formatted).toBe('Line 5: Missing attribute\nLine 10: Invalid element');
		});

		it('should format errors without line numbers', () => {
			const errors = [
				{ message: 'FetchXML cannot be empty' },
				{ message: 'Another error' },
			];

			const error = new FetchXmlValidationError(errors, '');
			const formatted = error.getFormattedErrors();

			expect(formatted).toBe('FetchXML cannot be empty\nAnother error');
		});

		it('should format mixed errors with and without line numbers', () => {
			const errors = [
				{ message: 'First error', line: 3 },
				{ message: 'Second error' },
				{ message: 'Third error', line: 7 },
			];

			const error = new FetchXmlValidationError(errors, sampleFetchXml);
			const formatted = error.getFormattedErrors();

			expect(formatted).toBe('Line 3: First error\nSecond error\nLine 7: Third error');
		});

		it('should return empty string for empty errors array', () => {
			const error = new FetchXmlValidationError([], sampleFetchXml);

			expect(error.getFormattedErrors()).toBe('');
		});
	});

	describe('getErrorCount', () => {
		it('should return correct count for multiple errors', () => {
			const errors = [
				{ message: 'Error 1' },
				{ message: 'Error 2' },
				{ message: 'Error 3' },
			];

			const error = new FetchXmlValidationError(errors, sampleFetchXml);

			expect(error.getErrorCount()).toBe(3);
		});

		it('should return zero for empty errors array', () => {
			const error = new FetchXmlValidationError([], sampleFetchXml);

			expect(error.getErrorCount()).toBe(0);
		});

		it('should return one for single error', () => {
			const error = new FetchXmlValidationError(
				[{ message: 'Single error' }],
				sampleFetchXml
			);

			expect(error.getErrorCount()).toBe(1);
		});
	});
});
