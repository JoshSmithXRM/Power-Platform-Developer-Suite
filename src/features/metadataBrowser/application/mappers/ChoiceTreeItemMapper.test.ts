import { ChoiceTreeItemMapper } from './ChoiceTreeItemMapper';
import { OptionSetMetadata, OptionMetadata } from '../../domain/valueObjects/OptionSetMetadata';

describe('ChoiceTreeItemMapper', () => {
	let mapper: ChoiceTreeItemMapper;

	beforeEach(() => {
		mapper = new ChoiceTreeItemMapper();
	});

	// Test data factory
	function createOptionSet(
		name: string | null,
		options: Partial<Parameters<typeof OptionSetMetadata.create>[0]> = {}
	): OptionSetMetadata {
		const defaultOptions = [
			OptionMetadata.create({ value: 1, label: 'Option 1' }),
			OptionMetadata.create({ value: 2, label: 'Option 2' })
		];

		return OptionSetMetadata.create({
			name,
			isGlobal: name !== null,
			options: defaultOptions,
			displayName: null,
			isCustom: false,
			...options
		});
	}

	describe('toViewModel - single option set mapping', () => {
		it('should map id from name', () => {
			// Arrange
			const optionSet = createOptionSet('statuscode');

			// Act
			const result = mapper.toViewModel(optionSet);

			// Assert
			expect(result.id).toBe('statuscode');
		});

		it('should map name', () => {
			// Arrange
			const optionSet = createOptionSet('cr_customchoice');

			// Act
			const result = mapper.toViewModel(optionSet);

			// Assert
			expect(result.name).toBe('cr_customchoice');
		});

		it('should map displayName when present', () => {
			// Arrange
			const optionSet = createOptionSet('statuscode', {
				displayName: 'Status Code'
			});

			// Act
			const result = mapper.toViewModel(optionSet);

			// Assert
			expect(result.displayName).toBe('Status Code');
		});

		it('should fallback to name when displayName is null', () => {
			// Arrange
			const optionSet = createOptionSet('statuscode', {
				displayName: null
			});

			// Act
			const result = mapper.toViewModel(optionSet);

			// Assert
			expect(result.displayName).toBe('statuscode');
		});

		it('should fallback to name when displayName is empty', () => {
			// Arrange
			const optionSet = createOptionSet('statuscode', {
				displayName: ''
			});

			// Act
			const result = mapper.toViewModel(optionSet);

			// Assert
			expect(result.displayName).toBe('statuscode');
		});

		it('should map isCustom when true', () => {
			// Arrange
			const optionSet = createOptionSet('cr_custom', {
				isCustom: true
			});

			// Act
			const result = mapper.toViewModel(optionSet);

			// Assert
			expect(result.isCustom).toBe(true);
		});

		it('should map isCustom when false', () => {
			// Arrange
			const optionSet = createOptionSet('statuscode', {
				isCustom: false
			});

			// Act
			const result = mapper.toViewModel(optionSet);

			// Assert
			expect(result.isCustom).toBe(false);
		});

		it('should always set icon to 🔽', () => {
			// Arrange
			const optionSet = createOptionSet('statuscode');

			// Act
			const result = mapper.toViewModel(optionSet);

			// Assert
			expect(result.icon).toBe('🔽');
		});

		it('should set icon to 🔽 for custom option sets', () => {
			// Arrange
			const optionSet = createOptionSet('cr_custom', {
				isCustom: true
			});

			// Act
			const result = mapper.toViewModel(optionSet);

			// Assert
			expect(result.icon).toBe('🔽');
		});

		it('should handle null name with empty id', () => {
			// Arrange
			const optionSet = createOptionSet(null, {
				isGlobal: false
			});

			// Act
			const result = mapper.toViewModel(optionSet);

			// Assert
			expect(result.id).toBe('');
			expect(result.name).toBe('');
		});

		it('should handle null name with empty displayName fallback', () => {
			// Arrange
			const optionSet = createOptionSet(null, {
				isGlobal: false,
				displayName: null
			});

			// Act
			const result = mapper.toViewModel(optionSet);

			// Assert
			expect(result.displayName).toBe('');
		});
	});

	describe('edge cases', () => {
		it('should handle special characters in displayName', () => {
			// Arrange
			const optionSet = createOptionSet('statuscode', {
				displayName: 'Status & Reason <Code>'
			});

			// Act
			const result = mapper.toViewModel(optionSet);

			// Assert
			expect(result.displayName).toBe('Status & Reason <Code>');
		});

		it('should handle very long displayName', () => {
			// Arrange
			const longName = 'A'.repeat(200);
			const optionSet = createOptionSet('test', {
				displayName: longName
			});

			// Act
			const result = mapper.toViewModel(optionSet);

			// Assert
			expect(result.displayName).toBe(longName);
		});

		it('should handle global option sets', () => {
			// Arrange
			const optionSet = createOptionSet('cr_globalchoice', {
				isGlobal: true,
				displayName: 'Global Choice'
			});

			// Act
			const result = mapper.toViewModel(optionSet);

			// Assert
			expect(result.name).toBe('cr_globalchoice');
			expect(result.displayName).toBe('Global Choice');
			expect(result.icon).toBe('🔽');
		});

		it('should handle local option sets', () => {
			// Arrange
			const optionSet = createOptionSet(null, {
				isGlobal: false,
				displayName: 'Local Choice'
			});

			// Act
			const result = mapper.toViewModel(optionSet);

			// Assert
			expect(result.name).toBe('');
			expect(result.displayName).toBe('Local Choice');
			expect(result.icon).toBe('🔽');
		});

		it('should handle option set with cr_ prefix', () => {
			// Arrange
			const optionSet = createOptionSet('cr_customstatus', {
				isCustom: true,
				displayName: 'Custom Status'
			});

			// Act
			const result = mapper.toViewModel(optionSet);

			// Assert
			expect(result.name).toBe('cr_customstatus');
			expect(result.displayName).toBe('Custom Status');
			expect(result.isCustom).toBe(true);
		});

		it('should handle option set with new_ prefix', () => {
			// Arrange
			const optionSet = createOptionSet('new_customchoice', {
				isCustom: true,
				displayName: 'New Choice'
			});

			// Act
			const result = mapper.toViewModel(optionSet);

			// Assert
			expect(result.name).toBe('new_customchoice');
			expect(result.displayName).toBe('New Choice');
			expect(result.isCustom).toBe(true);
		});

		it('should preserve id and name consistency', () => {
			// Arrange
			const optionSet = createOptionSet('statuscode');

			// Act
			const result = mapper.toViewModel(optionSet);

			// Assert
			expect(result.id).toBe(result.name);
		});

		it('should handle system option sets', () => {
			// Arrange
			const systemOptionSets = [
				createOptionSet('statuscode', { displayName: 'Status Code', isCustom: false }),
				createOptionSet('statecode', { displayName: 'State Code', isCustom: false })
			];

			// Act
			const results = systemOptionSets.map(os => mapper.toViewModel(os));

			// Assert
			results.forEach(result => {
				expect(result.isCustom).toBe(false);
				expect(result.icon).toBe('🔽');
			});
		});
	});
});
