import { ImportJobStatusFormatter } from './ImportJobStatusFormatter';
import { ImportJobStatus } from '../../../../features/importJobViewer/domain/entities/ImportJob';

describe('ImportJobStatusFormatter', () => {
	describe('formatStatusLabel', () => {
		it('should return "In Progress" for InProgress status', () => {
			const result = ImportJobStatusFormatter.formatStatusLabel(ImportJobStatus.InProgress);
			expect(result).toBe('In Progress');
		});

		it('should return "Completed" for Completed status', () => {
			const result = ImportJobStatusFormatter.formatStatusLabel(ImportJobStatus.Completed);
			expect(result).toBe('Completed');
		});

		it('should return "Failed" for Failed status', () => {
			const result = ImportJobStatusFormatter.formatStatusLabel(ImportJobStatus.Failed);
			expect(result).toBe('Failed');
		});

		it('should return "Completed with Errors" for CompletedWithErrors status', () => {
			const result = ImportJobStatusFormatter.formatStatusLabel(ImportJobStatus.CompletedWithErrors);
			expect(result).toBe('Completed with Errors');
		});

		it('should return "Cancelled" for Cancelled status', () => {
			const result = ImportJobStatusFormatter.formatStatusLabel(ImportJobStatus.Cancelled);
			expect(result).toBe('Cancelled');
		});

		it('should return "Queued" for status code 5', () => {
			const result = ImportJobStatusFormatter.formatStatusLabel(5);
			expect(result).toBe('Queued');
		});

		it('should return "Unknown" for unknown status codes', () => {
			const result = ImportJobStatusFormatter.formatStatusLabel(999);
			expect(result).toBe('Unknown');
		});

		it('should return "Unknown" for negative status codes', () => {
			const result = ImportJobStatusFormatter.formatStatusLabel(-1);
			expect(result).toBe('Unknown');
		});
	});
});
