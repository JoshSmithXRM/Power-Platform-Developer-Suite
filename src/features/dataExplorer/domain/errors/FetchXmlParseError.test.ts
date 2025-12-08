import { FetchXmlParseError } from './FetchXmlParseError';
import { DomainError } from '../../../../shared/domain/errors/DomainError';

describe('FetchXmlParseError', () => {
	const sampleFetchXml = '<fetch><entity name="account"><attribute name="name"/></entity></fetch>';

	describe('constructor', () => {
		it('should create error with all properties', () => {
			const error = new FetchXmlParseError(
				'Invalid XML',
				10,
				2,
				5,
				sampleFetchXml
			);

			expect(error.message).toBe('Invalid XML');
			expect(error.position).toBe(10);
			expect(error.line).toBe(2);
			expect(error.column).toBe(5);
			expect(error.fetchXml).toBe(sampleFetchXml);
		});

		it('should extend DomainError', () => {
			const error = new FetchXmlParseError('Test', 0, 1, 1, sampleFetchXml);

			expect(error).toBeInstanceOf(DomainError);
		});

		it('should store line and column info', () => {
			const error = new FetchXmlParseError('Test error', 0, 3, 15, sampleFetchXml);

			expect(error.line).toBe(3);
			expect(error.column).toBe(15);
			expect(error.message).toBe('Test error');
		});
	});

	describe('atPosition', () => {
		it('should calculate line and column from position', () => {
			const multiLineFetchXml = '<fetch>\n  <entity name="account">\n    <attribute name="name"/>\n  </entity>\n</fetch>';
			const position = 30; // After "entity name="

			const error = FetchXmlParseError.atPosition('Test error', position, multiLineFetchXml);

			expect(error.position).toBe(position);
			expect(error.line).toBeGreaterThan(1);
			expect(error.column).toBeGreaterThan(0);
		});

		it('should handle position at start of string', () => {
			const error = FetchXmlParseError.atPosition('Test error', 0, sampleFetchXml);

			expect(error.position).toBe(0);
			expect(error.line).toBe(1);
			expect(error.column).toBe(1);
		});

		it('should handle position in middle of line', () => {
			const error = FetchXmlParseError.atPosition('Test error', 10, sampleFetchXml);

			expect(error.position).toBe(10);
			expect(error.line).toBe(1);
			expect(error.column).toBe(11);
		});

		it('should handle multi-line content correctly', () => {
			const multiLineFetchXml = 'line1\nline2\nline3';
			// Position 7 is at 'i' in 'line2'
			const error = FetchXmlParseError.atPosition('Test', 7, multiLineFetchXml);

			expect(error.line).toBe(2);
			expect(error.column).toBe(2);
		});
	});

	describe('missingElement', () => {
		it('should create error with missing element message', () => {
			const error = FetchXmlParseError.missingElement('entity', sampleFetchXml);

			expect(error.message).toBe('Missing required element: <entity>');
			expect(error.position).toBe(0);
			expect(error.line).toBe(1);
			expect(error.column).toBe(1);
			expect(error.fetchXml).toBe(sampleFetchXml);
		});

		it('should create error for different element names', () => {
			const error = FetchXmlParseError.missingElement('attribute', sampleFetchXml);

			expect(error.message).toBe('Missing required element: <attribute>');
		});
	});

	describe('missingAttribute', () => {
		it('should create error with missing attribute message', () => {
			const error = FetchXmlParseError.missingAttribute(
				'entity',
				'name',
				7,
				sampleFetchXml
			);

			expect(error.message).toBe("Missing required attribute 'name' on <entity>");
			expect(error.position).toBe(7);
			expect(error.fetchXml).toBe(sampleFetchXml);
		});

		it('should calculate line and column from position', () => {
			const multiLineFetchXml = '<fetch>\n  <entity>\n  </entity>\n</fetch>';
			const error = FetchXmlParseError.missingAttribute(
				'entity',
				'name',
				10,
				multiLineFetchXml
			);

			expect(error.line).toBeGreaterThan(1);
		});
	});

	describe('invalidOperator', () => {
		it('should create error with invalid operator message', () => {
			const error = FetchXmlParseError.invalidOperator('invalid-op', 20, sampleFetchXml);

			expect(error.message).toBe("Invalid operator: 'invalid-op'");
			expect(error.position).toBe(20);
			expect(error.fetchXml).toBe(sampleFetchXml);
		});

		it('should calculate line and column from position', () => {
			const error = FetchXmlParseError.invalidOperator('bad', 15, sampleFetchXml);

			expect(error.line).toBe(1);
			expect(error.column).toBe(16);
		});
	});

	describe('invalidStructure', () => {
		it('should create error with structure message', () => {
			const error = FetchXmlParseError.invalidStructure(
				'Root element must be <fetch>',
				sampleFetchXml
			);

			expect(error.message).toBe('Root element must be <fetch>');
			expect(error.position).toBe(0);
			expect(error.line).toBe(1);
			expect(error.column).toBe(1);
			expect(error.fetchXml).toBe(sampleFetchXml);
		});
	});

	describe('getErrorContext', () => {
		it('should return context around error position', () => {
			const error = new FetchXmlParseError('Test', 20, 1, 21, sampleFetchXml);

			const context = error.getErrorContext(10);

			expect(context).toContain('[HERE]');
		});

		it('should add ellipsis when context is truncated at start', () => {
			const error = new FetchXmlParseError('Test', 40, 1, 41, sampleFetchXml);

			const context = error.getErrorContext(10);

			expect(context.startsWith('...')).toBe(true);
		});

		it('should add ellipsis when context is truncated at end', () => {
			const error = new FetchXmlParseError('Test', 20, 1, 21, sampleFetchXml);

			const context = error.getErrorContext(10);

			expect(context.endsWith('...')).toBe(true);
		});

		it('should not add ellipsis when at start of string', () => {
			const error = new FetchXmlParseError('Test', 0, 1, 1, sampleFetchXml);

			const context = error.getErrorContext(5);

			expect(context.startsWith('...')).toBe(false);
			expect(context.startsWith('[HERE]')).toBe(true);
		});

		it('should not add ellipsis when at end of string', () => {
			const error = new FetchXmlParseError(
				'Test',
				sampleFetchXml.length,
				1,
				sampleFetchXml.length + 1,
				sampleFetchXml
			);

			const context = error.getErrorContext(10);

			expect(context.endsWith('...')).toBe(false);
			expect(context.endsWith('[HERE]')).toBe(true);
		});

		it('should use default context chars when not specified', () => {
			const error = new FetchXmlParseError('Test', 20, 1, 21, sampleFetchXml);

			const context = error.getErrorContext();

			expect(context).toContain('[HERE]');
			expect(context.length).toBeGreaterThan(10);
		});

		it('should handle entire string within context', () => {
			const shortXml = '<fetch/>';
			const error = new FetchXmlParseError('Test', 4, 1, 5, shortXml);

			const context = error.getErrorContext(30);

			expect(context).toBe('<fet[HERE]ch/>');
			expect(context.startsWith('...')).toBe(false);
			expect(context.endsWith('...')).toBe(false);
		});
	});
});
