import { WebResource } from './WebResource';
import { WebResourceName } from '../valueObjects/WebResourceName';
import { WebResourceType } from '../valueObjects/WebResourceType';

describe('WebResource', () => {
	// ========== Test Helpers ==========

	function createTestWebResource(overrides: Partial<{
		id: string;
		name: WebResourceName;
		displayName: string;
		webResourceType: WebResourceType;
		isManaged: boolean;
		modifiedOn: Date;
	}> = {}): WebResource {
		return new WebResource(
			overrides.id ?? 'test-id-123',
			overrides.name ?? WebResourceName.create('new_test.js'),
			overrides.displayName ?? 'Test Script',
			overrides.webResourceType ?? WebResourceType.JAVASCRIPT,
			overrides.isManaged ?? false,
			overrides.modifiedOn ?? new Date('2024-01-15T10:30:00Z')
		);
	}

	// ========== Constructor & Properties ==========

	describe('constructor', () => {
		it('should create WebResource with all properties', () => {
			// Arrange
			const id = 'resource-guid-123';
			const name = WebResourceName.create('contoso_script.js');
			const displayName = 'Contoso Script';
			const type = WebResourceType.JAVASCRIPT;
			const isManaged = false;
			const modifiedOn = new Date('2024-01-15T10:30:00Z');

			// Act
			const resource = new WebResource(
				id,
				name,
				displayName,
				type,
				isManaged,
				modifiedOn
			);

			// Assert
			expect(resource.id).toBe(id);
			expect(resource.name).toBe(name);
			expect(resource.displayName).toBe(displayName);
			expect(resource.webResourceType).toBe(type);
			expect(resource.isManaged).toBe(isManaged);
			expect(resource.modifiedOn).toBe(modifiedOn);
		});

		it('should create managed WebResource', () => {
			// Arrange & Act
			const resource = createTestWebResource({ isManaged: true });

			// Assert
			expect(resource.isManaged).toBe(true);
		});
	});

	// ========== getFileExtension ==========

	describe('getFileExtension', () => {
		it('should return .js for JavaScript resource', () => {
			// Arrange
			const resource = createTestWebResource({
				webResourceType: WebResourceType.JAVASCRIPT
			});

			// Act
			const result = resource.getFileExtension();

			// Assert
			expect(result).toBe('.js');
		});

		it('should return .html for HTML resource', () => {
			// Arrange
			const resource = createTestWebResource({
				webResourceType: WebResourceType.HTML
			});

			// Act
			const result = resource.getFileExtension();

			// Assert
			expect(result).toBe('.html');
		});

		it('should return .css for CSS resource', () => {
			// Arrange
			const resource = createTestWebResource({
				webResourceType: WebResourceType.CSS
			});

			// Act
			const result = resource.getFileExtension();

			// Assert
			expect(result).toBe('.css');
		});

		it('should return .xml for XML resource', () => {
			// Arrange
			const resource = createTestWebResource({
				webResourceType: WebResourceType.XML
			});

			// Act
			const result = resource.getFileExtension();

			// Assert
			expect(result).toBe('.xml');
		});

		it('should return .png for PNG resource', () => {
			// Arrange
			const resource = createTestWebResource({
				webResourceType: WebResourceType.PNG
			});

			// Act
			const result = resource.getFileExtension();

			// Assert
			expect(result).toBe('.png');
		});
	});

	// ========== canEdit ==========

	describe('canEdit', () => {
		it('should return true for unmanaged text-based resource', () => {
			// Arrange
			const resource = createTestWebResource({
				isManaged: false,
				webResourceType: WebResourceType.JAVASCRIPT
			});

			// Act
			const result = resource.canEdit();

			// Assert
			expect(result).toBe(true);
		});

		it('should return true for unmanaged HTML resource', () => {
			// Arrange
			const resource = createTestWebResource({
				isManaged: false,
				webResourceType: WebResourceType.HTML
			});

			// Act
			const result = resource.canEdit();

			// Assert
			expect(result).toBe(true);
		});

		it('should return true for unmanaged CSS resource', () => {
			// Arrange
			const resource = createTestWebResource({
				isManaged: false,
				webResourceType: WebResourceType.CSS
			});

			// Act
			const result = resource.canEdit();

			// Assert
			expect(result).toBe(true);
		});

		it('should return false for managed text-based resource', () => {
			// Arrange
			const resource = createTestWebResource({
				isManaged: true,
				webResourceType: WebResourceType.JAVASCRIPT
			});

			// Act
			const result = resource.canEdit();

			// Assert
			expect(result).toBe(false);
		});

		it('should return false for unmanaged image resource (PNG)', () => {
			// Arrange
			const resource = createTestWebResource({
				isManaged: false,
				webResourceType: WebResourceType.PNG
			});

			// Act
			const result = resource.canEdit();

			// Assert
			expect(result).toBe(false);
		});

		it('should return false for unmanaged image resource (JPG)', () => {
			// Arrange
			const resource = createTestWebResource({
				isManaged: false,
				webResourceType: WebResourceType.JPG
			});

			// Act
			const result = resource.canEdit();

			// Assert
			expect(result).toBe(false);
		});

		it('should return false for managed image resource', () => {
			// Arrange
			const resource = createTestWebResource({
				isManaged: true,
				webResourceType: WebResourceType.PNG
			});

			// Act
			const result = resource.canEdit();

			// Assert
			expect(result).toBe(false);
		});

		it('should return false for unmanaged XAP resource', () => {
			// Arrange
			const resource = createTestWebResource({
				isManaged: false,
				webResourceType: WebResourceType.XAP
			});

			// Act
			const result = resource.canEdit();

			// Assert
			expect(result).toBe(false);
		});
	});

	// ========== isInSolution ==========

	describe('isInSolution', () => {
		it('should return true when resource ID is in solution component set', () => {
			// Arrange
			const resource = createTestWebResource({ id: 'resource-123' });
			const solutionComponentIds = new Set(['resource-123', 'resource-456']);

			// Act
			const result = resource.isInSolution(solutionComponentIds);

			// Assert
			expect(result).toBe(true);
		});

		it('should return false when resource ID is not in solution component set', () => {
			// Arrange
			const resource = createTestWebResource({ id: 'resource-123' });
			const solutionComponentIds = new Set(['resource-456', 'resource-789']);

			// Act
			const result = resource.isInSolution(solutionComponentIds);

			// Assert
			expect(result).toBe(false);
		});

		it('should return false for empty solution component set', () => {
			// Arrange
			const resource = createTestWebResource({ id: 'resource-123' });
			const solutionComponentIds = new Set<string>();

			// Act
			const result = resource.isInSolution(solutionComponentIds);

			// Assert
			expect(result).toBe(false);
		});

		it('should be case-sensitive when checking IDs', () => {
			// Arrange
			const resource = createTestWebResource({ id: 'Resource-123' });
			const solutionComponentIds = new Set(['resource-123']);

			// Act
			const result = resource.isInSolution(solutionComponentIds);

			// Assert
			expect(result).toBe(false);
		});
	});

	// ========== isTextBased ==========

	describe('isTextBased', () => {
		it('should return true for JavaScript resource', () => {
			// Arrange
			const resource = createTestWebResource({
				webResourceType: WebResourceType.JAVASCRIPT
			});

			// Act
			const result = resource.isTextBased();

			// Assert
			expect(result).toBe(true);
		});

		it('should return true for HTML resource', () => {
			// Arrange
			const resource = createTestWebResource({
				webResourceType: WebResourceType.HTML
			});

			// Act
			const result = resource.isTextBased();

			// Assert
			expect(result).toBe(true);
		});

		it('should return true for CSS resource', () => {
			// Arrange
			const resource = createTestWebResource({
				webResourceType: WebResourceType.CSS
			});

			// Act
			const result = resource.isTextBased();

			// Assert
			expect(result).toBe(true);
		});

		it('should return false for PNG resource', () => {
			// Arrange
			const resource = createTestWebResource({
				webResourceType: WebResourceType.PNG
			});

			// Act
			const result = resource.isTextBased();

			// Assert
			expect(result).toBe(false);
		});

		it('should return false for XAP resource', () => {
			// Arrange
			const resource = createTestWebResource({
				webResourceType: WebResourceType.XAP
			});

			// Act
			const result = resource.isTextBased();

			// Assert
			expect(result).toBe(false);
		});
	});

	// ========== isImage ==========

	describe('isImage', () => {
		it('should return true for PNG resource', () => {
			// Arrange
			const resource = createTestWebResource({
				webResourceType: WebResourceType.PNG
			});

			// Act
			const result = resource.isImage();

			// Assert
			expect(result).toBe(true);
		});

		it('should return true for JPG resource', () => {
			// Arrange
			const resource = createTestWebResource({
				webResourceType: WebResourceType.JPG
			});

			// Act
			const result = resource.isImage();

			// Assert
			expect(result).toBe(true);
		});

		it('should return true for GIF resource', () => {
			// Arrange
			const resource = createTestWebResource({
				webResourceType: WebResourceType.GIF
			});

			// Act
			const result = resource.isImage();

			// Assert
			expect(result).toBe(true);
		});

		it('should return true for SVG resource', () => {
			// Arrange
			const resource = createTestWebResource({
				webResourceType: WebResourceType.SVG
			});

			// Act
			const result = resource.isImage();

			// Assert
			expect(result).toBe(true);
		});

		it('should return true for ICO resource', () => {
			// Arrange
			const resource = createTestWebResource({
				webResourceType: WebResourceType.ICO
			});

			// Act
			const result = resource.isImage();

			// Assert
			expect(result).toBe(true);
		});

		it('should return false for JavaScript resource', () => {
			// Arrange
			const resource = createTestWebResource({
				webResourceType: WebResourceType.JAVASCRIPT
			});

			// Act
			const result = resource.isImage();

			// Assert
			expect(result).toBe(false);
		});

		it('should return false for HTML resource', () => {
			// Arrange
			const resource = createTestWebResource({
				webResourceType: WebResourceType.HTML
			});

			// Act
			const result = resource.isImage();

			// Assert
			expect(result).toBe(false);
		});
	});

	// ========== Integration Tests ==========

	describe('integration', () => {
		it('should correctly categorize all text-based types as editable when unmanaged', () => {
			// Arrange
			const textBasedTypes = [
				WebResourceType.HTML,
				WebResourceType.CSS,
				WebResourceType.JAVASCRIPT,
				WebResourceType.XML,
				WebResourceType.XSL,
				WebResourceType.RESX
			];

			// Act & Assert
			textBasedTypes.forEach(type => {
				const resource = createTestWebResource({
					isManaged: false,
					webResourceType: type
				});
				expect(resource.canEdit()).toBe(true);
				expect(resource.isTextBased()).toBe(true);
			});
		});

		it('should correctly categorize binary image types as non-editable', () => {
			// Arrange - Binary images are not editable
			const binaryImageTypes = [
				WebResourceType.PNG,
				WebResourceType.JPG,
				WebResourceType.GIF,
				WebResourceType.ICO
			];

			// Act & Assert
			binaryImageTypes.forEach(type => {
				const resource = createTestWebResource({
					isManaged: false,
					webResourceType: type
				});
				expect(resource.canEdit()).toBe(false);
				expect(resource.isImage()).toBe(true);
			});
		});

		it('should correctly categorize SVG as editable (text-based image)', () => {
			// Arrange - SVG is text-based XML, so it's editable
			const resource = createTestWebResource({
				isManaged: false,
				webResourceType: WebResourceType.SVG
			});

			// Act & Assert
			expect(resource.canEdit()).toBe(true);
			expect(resource.isImage()).toBe(true);
			expect(resource.isTextBased()).toBe(true);
		});

		it('should make all managed resources non-editable regardless of type', () => {
			// Arrange
			const allTypes = [
				WebResourceType.HTML,
				WebResourceType.CSS,
				WebResourceType.JAVASCRIPT,
				WebResourceType.XML,
				WebResourceType.PNG,
				WebResourceType.JPG,
				WebResourceType.GIF,
				WebResourceType.XAP,
				WebResourceType.XSL,
				WebResourceType.ICO,
				WebResourceType.SVG,
				WebResourceType.RESX
			];

			// Act & Assert
			allTypes.forEach(type => {
				const resource = createTestWebResource({
					isManaged: true,
					webResourceType: type
				});
				expect(resource.canEdit()).toBe(false);
			});
		});

		it('should have readonly properties', () => {
			// Arrange
			const resource = createTestWebResource();

			// Assert - properties should be accessible
			expect(resource.id).toBeDefined();
			expect(resource.name).toBeDefined();
			expect(resource.displayName).toBeDefined();
			expect(resource.webResourceType).toBeDefined();
			expect(resource.isManaged).toBeDefined();
			expect(resource.modifiedOn).toBeDefined();
		});
	});
});
