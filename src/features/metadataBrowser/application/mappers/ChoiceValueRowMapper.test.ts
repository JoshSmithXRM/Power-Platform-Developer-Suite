import { ChoiceValueRowMapper } from './ChoiceValueRowMapper';
import { OptionMetadata } from '../../domain/valueObjects/OptionSetMetadata';

describe('ChoiceValueRowMapper', () => {
	let mapper: ChoiceValueRowMapper;

	beforeEach(() => {
		mapper = new ChoiceValueRowMapper();
	});

	// Test data factory
	function createOption(
		value: number,
		label: string,
		options: Partial<Parameters<typeof OptionMetadata.create>[0]> = {}
	): OptionMetadata {
		return OptionMetadata.create({
			value,
			label,
			...options
		});
	}

	describe('toViewModel - single option mapping', () => {
		it('should map id from value as string', () => {
			// Arrange
			const option = createOption(1, 'Active');

			// Act
			const result = mapper.toViewModel(option);

			// Assert
			expect(result.id).toBe('1');
		});

		it('should map label', () => {
			// Arrange
			const option = createOption(1, 'In Progress');

			// Act
			const result = mapper.toViewModel(option);

			// Assert
			expect(result.label).toBe('In Progress');
		});

		it('should map value as string', () => {
			// Arrange
			const option = createOption(42, 'Custom Status');

			// Act
			const result = mapper.toViewModel(option);

			// Assert
			expect(result.value).toBe('42');
		});

		it('should map color when present', () => {
			// Arrange
			const option = createOption(1, 'Active', {
				color: '#00FF00'
			});

			// Act
			const result = mapper.toViewModel(option);

			// Assert
			expect(result.color).toBe('#00FF00');
		});

		it('should map color to "-" when null', () => {
			// Arrange
			const option = createOption(1, 'Inactive', {
				color: null
			});

			// Act
			const result = mapper.toViewModel(option);

			// Assert
			expect(result.color).toBe('-');
		});

		it('should set isLinkable to true', () => {
			// Arrange
			const option = createOption(1, 'Test');

			// Act
			const result = mapper.toViewModel(option);

			// Assert
			expect(result.isLinkable).toBe(true);
		});

		it('should include metadata reference', () => {
			// Arrange
			const option = createOption(1, 'Test');

			// Act
			const result = mapper.toViewModel(option);

			// Assert
			expect(result.metadata).toBe(option);
		});
	});

	describe('edge cases', () => {
		it('should handle zero value', () => {
			// Arrange
			const option = createOption(0, 'None');

			// Act
			const result = mapper.toViewModel(option);

			// Assert
			expect(result.id).toBe('0');
			expect(result.value).toBe('0');
		});

		it('should handle negative value', () => {
			// Arrange
			const option = createOption(-1, 'Error');

			// Act
			const result = mapper.toViewModel(option);

			// Assert
			expect(result.id).toBe('-1');
			expect(result.value).toBe('-1');
		});

		it('should handle large value', () => {
			// Arrange
			const option = createOption(999999, 'Max');

			// Act
			const result = mapper.toViewModel(option);

			// Assert
			expect(result.id).toBe('999999');
			expect(result.value).toBe('999999');
		});

		it('should handle special characters in label', () => {
			// Arrange
			const option = createOption(1, 'Status & State <Active>');

			// Act
			const result = mapper.toViewModel(option);

			// Assert
			expect(result.label).toBe('Status & State <Active>');
		});

		it('should handle very long label', () => {
			// Arrange
			const longLabel = 'A'.repeat(200);
			const option = createOption(1, longLabel);

			// Act
			const result = mapper.toViewModel(option);

			// Assert
			expect(result.label).toBe(longLabel);
		});

		it('should handle various color formats', () => {
			// Arrange
			const colors = [
				'#FF0000',
				'#00FF00',
				'#0000FF',
				'#FFFFFF',
				'#000000'
			];
			const options = colors.map((color, index) =>
				createOption(index, `Color${index}`, { color })
			);

			// Act
			const results = options.map(opt => mapper.toViewModel(opt));

			// Assert
			results.forEach((result, index) => {
				expect(result.color).toBe(colors[index]);
			});
		});

		it('should handle description when present in metadata', () => {
			// Arrange
			const option = createOption(1, 'Active', {
				description: 'This is an active status',
				color: '#00FF00'
			});

			// Act
			const result = mapper.toViewModel(option);

			// Assert
			expect(result.metadata.description).toBe('This is an active status');
		});

		it('should preserve id and value consistency', () => {
			// Arrange
			const option = createOption(123, 'Test');

			// Act
			const result = mapper.toViewModel(option);

			// Assert
			expect(result.id).toBe(result.value);
		});
	});
});
