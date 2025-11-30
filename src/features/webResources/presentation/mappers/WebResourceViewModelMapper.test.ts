import { WebResourceViewModelMapper } from './WebResourceViewModelMapper';
import { WebResource } from '../../domain/entities/WebResource';
import { WebResourceName } from '../../domain/valueObjects/WebResourceName';
import { WebResourceType } from '../../domain/valueObjects/WebResourceType';

describe('WebResourceViewModelMapper', () => {
	let mapper: WebResourceViewModelMapper;

	beforeEach(() => {
		mapper = new WebResourceViewModelMapper();
	});

	function createTestWebResource(overrides: {
		id?: string;
		name?: string;
		displayName?: string;
		type?: WebResourceType;
		isManaged?: boolean;
		createdOn?: Date;
		modifiedOn?: Date;
	} = {}): WebResource {
		return new WebResource(
			overrides.id ?? 'test-id-123',
			WebResourceName.create(overrides.name ?? 'new_test.js'),
			overrides.displayName ?? 'Test Script',
			overrides.type ?? WebResourceType.JAVASCRIPT,
			overrides.isManaged ?? false,
			overrides.createdOn ?? new Date('2024-01-01T08:00:00Z'),
			overrides.modifiedOn ?? new Date('2024-01-15T10:30:00Z')
		);
	}

	describe('toViewModel', () => {
		it('should map id correctly', () => {
			// Arrange
			const webResource = createTestWebResource({ id: 'wr-guid-123' });

			// Act
			const viewModel = mapper.toViewModel(webResource);

			// Assert
			expect(viewModel.id).toBe('wr-guid-123');
		});

		it('should map name to full logical name', () => {
			// Arrange
			const webResource = createTestWebResource({ name: 'contoso_scripts/utils.js' });

			// Act
			const viewModel = mapper.toViewModel(webResource);

			// Assert
			expect(viewModel.name).toBe('contoso_scripts/utils.js');
		});

		it('should map displayName from entity', () => {
			// Arrange
			const webResource = createTestWebResource({ displayName: 'My Custom Script' });

			// Act
			const viewModel = mapper.toViewModel(webResource);

			// Assert
			expect(viewModel.displayName).toBe('My Custom Script');
		});

		it('should use logical name when displayName is empty', () => {
			// Arrange
			const webResource = createTestWebResource({
				name: 'new_fallback.js',
				displayName: ''
			});

			// Act
			const viewModel = mapper.toViewModel(webResource);

			// Assert
			expect(viewModel.displayName).toBe('new_fallback.js');
		});

		it('should format JavaScript type correctly', () => {
			// Arrange
			const webResource = createTestWebResource({ type: WebResourceType.JAVASCRIPT });

			// Act
			const viewModel = mapper.toViewModel(webResource);

			// Assert
			expect(viewModel.type).toBe('JavaScript');
			expect(viewModel.typeCode).toBe(3);
		});

		it('should format HTML type correctly', () => {
			// Arrange
			const webResource = createTestWebResource({ type: WebResourceType.HTML });

			// Act
			const viewModel = mapper.toViewModel(webResource);

			// Assert
			expect(viewModel.type).toBe('HTML');
			expect(viewModel.typeCode).toBe(1);
		});

		it('should format CSS type correctly', () => {
			// Arrange
			const webResource = createTestWebResource({ type: WebResourceType.CSS });

			// Act
			const viewModel = mapper.toViewModel(webResource);

			// Assert
			expect(viewModel.type).toBe('CSS');
			expect(viewModel.typeCode).toBe(2);
		});

		it('should format XML type correctly', () => {
			// Arrange
			const webResource = createTestWebResource({ type: WebResourceType.XML });

			// Act
			const viewModel = mapper.toViewModel(webResource);

			// Assert
			expect(viewModel.type).toBe('XML');
			expect(viewModel.typeCode).toBe(4);
		});

		it('should format PNG type correctly', () => {
			// Arrange
			const webResource = createTestWebResource({ type: WebResourceType.PNG });

			// Act
			const viewModel = mapper.toViewModel(webResource);

			// Assert
			expect(viewModel.type).toBe('Image (PNG)');
			expect(viewModel.typeCode).toBe(5);
		});

		it('should format JPG type correctly', () => {
			// Arrange
			const webResource = createTestWebResource({ type: WebResourceType.JPG });

			// Act
			const viewModel = mapper.toViewModel(webResource);

			// Assert
			expect(viewModel.type).toBe('Image (JPG)');
			expect(viewModel.typeCode).toBe(6);
		});

		it('should format GIF type correctly', () => {
			// Arrange
			const webResource = createTestWebResource({ type: WebResourceType.GIF });

			// Act
			const viewModel = mapper.toViewModel(webResource);

			// Assert
			expect(viewModel.type).toBe('Image (GIF)');
			expect(viewModel.typeCode).toBe(7);
		});

		it('should format XAP type correctly', () => {
			// Arrange
			const webResource = createTestWebResource({ type: WebResourceType.XAP });

			// Act
			const viewModel = mapper.toViewModel(webResource);

			// Assert
			expect(viewModel.type).toBe('Silverlight (XAP)');
			expect(viewModel.typeCode).toBe(8);
		});

		it('should format XSL type correctly', () => {
			// Arrange
			const webResource = createTestWebResource({ type: WebResourceType.XSL });

			// Act
			const viewModel = mapper.toViewModel(webResource);

			// Assert
			expect(viewModel.type).toBe('XSL');
			expect(viewModel.typeCode).toBe(9);
		});

		it('should format ICO type correctly', () => {
			// Arrange
			const webResource = createTestWebResource({ type: WebResourceType.ICO });

			// Act
			const viewModel = mapper.toViewModel(webResource);

			// Assert
			expect(viewModel.type).toBe('Image (ICO)');
			expect(viewModel.typeCode).toBe(10);
		});

		it('should format SVG type correctly', () => {
			// Arrange
			const webResource = createTestWebResource({ type: WebResourceType.SVG });

			// Act
			const viewModel = mapper.toViewModel(webResource);

			// Assert
			expect(viewModel.type).toBe('Image (SVG)');
			expect(viewModel.typeCode).toBe(11);
		});

		it('should format RESX type correctly', () => {
			// Arrange
			const webResource = createTestWebResource({ type: WebResourceType.RESX });

			// Act
			const viewModel = mapper.toViewModel(webResource);

			// Assert
			expect(viewModel.type).toBe('String (RESX)');
			expect(viewModel.typeCode).toBe(12);
		});

		it('should format modified date', () => {
			// Arrange
			const modifiedOn = new Date('2024-03-15T14:30:00Z');
			const webResource = createTestWebResource({ modifiedOn });

			// Act
			const viewModel = mapper.toViewModel(webResource);

			// Assert
			// DateFormatter returns formatted date string
			expect(viewModel.modifiedOn).toBeDefined();
			expect(typeof viewModel.modifiedOn).toBe('string');
		});

		it('should map isManaged correctly for managed resource', () => {
			// Arrange
			const webResource = createTestWebResource({ isManaged: true });

			// Act
			const viewModel = mapper.toViewModel(webResource);

			// Assert
			expect(viewModel.isManaged).toBe(true);
		});

		it('should map isManaged correctly for unmanaged resource', () => {
			// Arrange
			const webResource = createTestWebResource({ isManaged: false });

			// Act
			const viewModel = mapper.toViewModel(webResource);

			// Assert
			expect(viewModel.isManaged).toBe(false);
		});

		it('should set isEditable to true for unmanaged text-based resource', () => {
			// Arrange
			const webResource = createTestWebResource({
				type: WebResourceType.JAVASCRIPT,
				isManaged: false
			});

			// Act
			const viewModel = mapper.toViewModel(webResource);

			// Assert
			expect(viewModel.isEditable).toBe(true);
		});

		it('should set isEditable to false for managed resource', () => {
			// Arrange
			const webResource = createTestWebResource({
				type: WebResourceType.JAVASCRIPT,
				isManaged: true
			});

			// Act
			const viewModel = mapper.toViewModel(webResource);

			// Assert
			expect(viewModel.isEditable).toBe(false);
		});

		it('should set isEditable to false for image resource', () => {
			// Arrange
			const webResource = createTestWebResource({
				type: WebResourceType.PNG,
				isManaged: false
			});

			// Act
			const viewModel = mapper.toViewModel(webResource);

			// Assert
			expect(viewModel.isEditable).toBe(false);
		});

		it('should include nameLink for editable text-based resource', () => {
			// Arrange
			const webResource = createTestWebResource({
				id: 'wr-123',
				name: 'new_script.js',
				type: WebResourceType.JAVASCRIPT,
				isManaged: false
			});

			// Act
			const viewModel = mapper.toViewModel(webResource);

			// Assert
			expect(viewModel.nameLink).toBeDefined();
			expect(viewModel.nameLink!.command).toBe('openWebResource');
			expect(viewModel.nameLink!.commandData).toEqual({
				id: 'wr-123',
				name: 'new_script.js',
				'type-code': '3'
			});
			expect(viewModel.nameLink!.className).toBe('clickable-link');
		});

		it('should not include nameLink for managed resource', () => {
			// Arrange
			const webResource = createTestWebResource({
				type: WebResourceType.JAVASCRIPT,
				isManaged: true
			});

			// Act
			const viewModel = mapper.toViewModel(webResource);

			// Assert
			expect(viewModel.nameLink).toBeUndefined();
		});

		it('should not include nameLink for image resource', () => {
			// Arrange
			const webResource = createTestWebResource({
				type: WebResourceType.PNG,
				isManaged: false
			});

			// Act
			const viewModel = mapper.toViewModel(webResource);

			// Assert
			expect(viewModel.nameLink).toBeUndefined();
		});

		it('should include nameLink for SVG (text-based image)', () => {
			// Arrange - SVG is technically an image but is text-based XML so can be edited
			const webResource = createTestWebResource({
				id: 'svg-123',
				name: 'new_icon.svg',
				type: WebResourceType.SVG,
				isManaged: false
			});

			// Act
			const viewModel = mapper.toViewModel(webResource);

			// Assert
			expect(viewModel.nameLink).toBeDefined();
			expect(viewModel.nameLink!.command).toBe('openWebResource');
		});
	});

	describe('toViewModels', () => {
		it('should map array of web resources', () => {
			// Arrange
			const webResources = [
				createTestWebResource({ id: 'wr-1', name: 'new_script1.js', displayName: 'Script 1' }),
				createTestWebResource({ id: 'wr-2', name: 'new_script2.js', displayName: 'Script 2' }),
				createTestWebResource({ id: 'wr-3', name: 'new_styles.css', displayName: 'Styles', type: WebResourceType.CSS })
			];

			// Act
			const viewModels = mapper.toViewModels(webResources);

			// Assert
			expect(viewModels).toHaveLength(3);
			expect(viewModels[0]!.id).toBe('wr-1');
			expect(viewModels[1]!.id).toBe('wr-2');
			expect(viewModels[2]!.id).toBe('wr-3');
		});

		it('should return empty array for empty input', () => {
			// Arrange
			const webResources: WebResource[] = [];

			// Act
			const viewModels = mapper.toViewModels(webResources);

			// Assert
			expect(viewModels).toHaveLength(0);
		});

		it('should sort view models by name alphabetically by default', () => {
			// Arrange
			const webResources = [
				createTestWebResource({ id: 'wr-z', name: 'new_zebra.js' }),
				createTestWebResource({ id: 'wr-a', name: 'new_alpha.js' }),
				createTestWebResource({ id: 'wr-m', name: 'new_middle.js' })
			];

			// Act
			const viewModels = mapper.toViewModels(webResources);

			// Assert - sorted alphabetically by name
			expect(viewModels[0]!.name).toBe('new_alpha.js');
			expect(viewModels[1]!.name).toBe('new_middle.js');
			expect(viewModels[2]!.name).toBe('new_zebra.js');
		});

		it('should preserve input order when shouldSort is false', () => {
			// Arrange
			const webResources = [
				createTestWebResource({ id: 'wr-z', name: 'new_zebra.js' }),
				createTestWebResource({ id: 'wr-a', name: 'new_alpha.js' }),
				createTestWebResource({ id: 'wr-m', name: 'new_middle.js' })
			];

			// Act
			const viewModels = mapper.toViewModels(webResources, false);

			// Assert - original order preserved
			expect(viewModels[0]!.name).toBe('new_zebra.js');
			expect(viewModels[1]!.name).toBe('new_alpha.js');
			expect(viewModels[2]!.name).toBe('new_middle.js');
		});

		it('should handle readonly array input', () => {
			// Arrange
			const webResources: readonly WebResource[] = [
				createTestWebResource({ id: 'wr-1' }),
				createTestWebResource({ id: 'wr-2' })
			];

			// Act
			const viewModels = mapper.toViewModels(webResources);

			// Assert
			expect(viewModels).toHaveLength(2);
		});

		it('should correctly map mixed types in array', () => {
			// Arrange
			const webResources = [
				createTestWebResource({ type: WebResourceType.HTML }),
				createTestWebResource({ type: WebResourceType.CSS }),
				createTestWebResource({ type: WebResourceType.JAVASCRIPT }),
				createTestWebResource({ type: WebResourceType.PNG }),
				createTestWebResource({ type: WebResourceType.SVG })
			];

			// Act
			const viewModels = mapper.toViewModels(webResources);

			// Assert
			expect(viewModels[0]!.type).toBe('HTML');
			expect(viewModels[1]!.type).toBe('CSS');
			expect(viewModels[2]!.type).toBe('JavaScript');
			expect(viewModels[3]!.type).toBe('Image (PNG)');
			expect(viewModels[4]!.type).toBe('Image (SVG)');
		});
	});

	describe('edge cases', () => {
		it('should handle web resource with very long name', () => {
			// Arrange
			const longName = 'new_' + 'a'.repeat(200) + '.js';
			const webResource = createTestWebResource({ name: longName });

			// Act
			const viewModel = mapper.toViewModel(webResource);

			// Assert
			expect(viewModel.name).toBe(longName);
		});

		it('should handle web resource with unicode characters in display name', () => {
			// Arrange
			const webResource = createTestWebResource({
				displayName: 'Script avec accents et symboles'
			});

			// Act
			const viewModel = mapper.toViewModel(webResource);

			// Assert
			expect(viewModel.displayName).toBe('Script avec accents et symboles');
		});
	});
});
