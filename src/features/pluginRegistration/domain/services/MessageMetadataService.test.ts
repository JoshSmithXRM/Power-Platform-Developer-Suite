import { MessageMetadataService } from './MessageMetadataService';

describe('MessageMetadataService', () => {
	let service: MessageMetadataService;

	beforeEach(() => {
		service = new MessageMetadataService();
	});

	describe('supportsFilteredAttributes', () => {
		it('should return true for Update message', () => {
			expect(service.supportsFilteredAttributes('Update')).toBe(true);
		});

		it('should return true for Create message', () => {
			expect(service.supportsFilteredAttributes('Create')).toBe(true);
		});

		it('should return true for CreateMultiple message', () => {
			expect(service.supportsFilteredAttributes('CreateMultiple')).toBe(true);
		});

		it('should return true for UpdateMultiple message', () => {
			expect(service.supportsFilteredAttributes('UpdateMultiple')).toBe(true);
		});

		it('should return true for OnExternalUpdated message', () => {
			expect(service.supportsFilteredAttributes('OnExternalUpdated')).toBe(
				true
			);
		});

		it('should return false for Delete message', () => {
			expect(service.supportsFilteredAttributes('Delete')).toBe(false);
		});

		it('should return false for Assign message', () => {
			expect(service.supportsFilteredAttributes('Assign')).toBe(false);
		});

		it('should return false for unknown message', () => {
			expect(service.supportsFilteredAttributes('UnknownMessage')).toBe(false);
		});
	});

	describe('getImagePropertyNames', () => {
		it('should return correct property for Update message', () => {
			const result = service.getImagePropertyNames('Update');

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({
				name: 'Target',
				label: 'Updated Entity',
			});
		});

		it('should return two properties for Merge message', () => {
			const result = service.getImagePropertyNames('Merge');

			expect(result).toHaveLength(2);
			expect(result[0]).toEqual({
				name: 'Target',
				label: 'Parent Entity',
			});
			expect(result[1]).toEqual({
				name: 'SubordinateId',
				label: 'Child Entity',
			});
		});

		it('should return EntityMoniker for SetState message', () => {
			const result = service.getImagePropertyNames('SetState');

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({
				name: 'EntityMoniker',
				label: 'Entity',
			});
		});

		it('should return id for Create message', () => {
			const result = service.getImagePropertyNames('Create');

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({
				name: 'id',
				label: 'Created Entity',
			});
		});

		it('should return EmailId for Send message', () => {
			const result = service.getImagePropertyNames('Send');

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({
				name: 'EmailId',
				label: 'Sent Entity Id',
			});
		});

		it('should return empty array for unknown message', () => {
			const result = service.getImagePropertyNames('UnknownMessage');

			expect(result).toEqual([]);
		});
	});

	describe('getDefaultImagePropertyName', () => {
		it('should return Target for Update message', () => {
			expect(service.getDefaultImagePropertyName('Update')).toBe('Target');
		});

		it('should return Target for Delete message', () => {
			expect(service.getDefaultImagePropertyName('Delete')).toBe('Target');
		});

		it('should return EntityMoniker for SetState message', () => {
			expect(service.getDefaultImagePropertyName('SetState')).toBe(
				'EntityMoniker'
			);
		});

		it('should return null for Merge message (has multiple options)', () => {
			expect(service.getDefaultImagePropertyName('Merge')).toBeNull();
		});

		it('should return null for unknown message', () => {
			expect(service.getDefaultImagePropertyName('UnknownMessage')).toBeNull();
		});
	});
});
