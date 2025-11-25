import { OperationType } from '../../application/types';
import { OperationTypeFormatter } from './OperationTypeFormatter';

describe('OperationTypeFormatter', () => {
	describe('getDisplayName', () => {
		it('should return "Plugin" for OperationType.Plugin', () => {
			const result = OperationTypeFormatter.getDisplayName(OperationType.Plugin);
			expect(result).toBe('Plugin');
		});

		it('should return "Workflow" for OperationType.Workflow', () => {
			const result = OperationTypeFormatter.getDisplayName(OperationType.Workflow);
			expect(result).toBe('Workflow');
		});

		it('should return "Unknown" for unknown OperationType value', () => {
			const unknownType = { value: 99 } as unknown as OperationType;
			const result = OperationTypeFormatter.getDisplayName(unknownType);
			expect(result).toBe('Unknown');
		});
	});
});
