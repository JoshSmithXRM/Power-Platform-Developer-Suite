import { WebResourceType } from './WebResourceType';

describe('WebResourceType', () => {
	// ========== Creation via fromCode ==========

	describe('fromCode', () => {
		it('should create HTML type from code 1', () => {
			// Arrange & Act
			const type = WebResourceType.fromCode(1);

			// Assert
			expect(type).toBe(WebResourceType.HTML);
			expect(type.getCode()).toBe(1);
		});

		it('should create CSS type from code 2', () => {
			// Arrange & Act
			const type = WebResourceType.fromCode(2);

			// Assert
			expect(type).toBe(WebResourceType.CSS);
			expect(type.getCode()).toBe(2);
		});

		it('should create JavaScript type from code 3', () => {
			// Arrange & Act
			const type = WebResourceType.fromCode(3);

			// Assert
			expect(type).toBe(WebResourceType.JAVASCRIPT);
			expect(type.getCode()).toBe(3);
		});

		it('should create XML type from code 4', () => {
			// Arrange & Act
			const type = WebResourceType.fromCode(4);

			// Assert
			expect(type).toBe(WebResourceType.XML);
			expect(type.getCode()).toBe(4);
		});

		it('should create PNG type from code 5', () => {
			// Arrange & Act
			const type = WebResourceType.fromCode(5);

			// Assert
			expect(type).toBe(WebResourceType.PNG);
			expect(type.getCode()).toBe(5);
		});

		it('should create JPG type from code 6', () => {
			// Arrange & Act
			const type = WebResourceType.fromCode(6);

			// Assert
			expect(type).toBe(WebResourceType.JPG);
			expect(type.getCode()).toBe(6);
		});

		it('should create GIF type from code 7', () => {
			// Arrange & Act
			const type = WebResourceType.fromCode(7);

			// Assert
			expect(type).toBe(WebResourceType.GIF);
			expect(type.getCode()).toBe(7);
		});

		it('should create XAP type from code 8', () => {
			// Arrange & Act
			const type = WebResourceType.fromCode(8);

			// Assert
			expect(type).toBe(WebResourceType.XAP);
			expect(type.getCode()).toBe(8);
		});

		it('should create XSL type from code 9', () => {
			// Arrange & Act
			const type = WebResourceType.fromCode(9);

			// Assert
			expect(type).toBe(WebResourceType.XSL);
			expect(type.getCode()).toBe(9);
		});

		it('should create ICO type from code 10', () => {
			// Arrange & Act
			const type = WebResourceType.fromCode(10);

			// Assert
			expect(type).toBe(WebResourceType.ICO);
			expect(type.getCode()).toBe(10);
		});

		it('should create SVG type from code 11', () => {
			// Arrange & Act
			const type = WebResourceType.fromCode(11);

			// Assert
			expect(type).toBe(WebResourceType.SVG);
			expect(type.getCode()).toBe(11);
		});

		it('should create RESX type from code 12', () => {
			// Arrange & Act
			const type = WebResourceType.fromCode(12);

			// Assert
			expect(type).toBe(WebResourceType.RESX);
			expect(type.getCode()).toBe(12);
		});

		it('should throw error for unknown code 0', () => {
			// Arrange, Act & Assert
			expect(() => WebResourceType.fromCode(0)).toThrow('Unknown web resource type code: 0');
		});

		it('should throw error for unknown code 13', () => {
			// Arrange, Act & Assert
			expect(() => WebResourceType.fromCode(13)).toThrow('Unknown web resource type code: 13');
		});

		it('should throw error for negative code', () => {
			// Arrange, Act & Assert
			expect(() => WebResourceType.fromCode(-1)).toThrow('Unknown web resource type code: -1');
		});
	});

	// ========== File Extensions ==========

	describe('getFileExtension', () => {
		it('should return .html for HTML type', () => {
			// Arrange
			const type = WebResourceType.HTML;

			// Act
			const result = type.getFileExtension();

			// Assert
			expect(result).toBe('.html');
		});

		it('should return .css for CSS type', () => {
			// Arrange
			const type = WebResourceType.CSS;

			// Act
			const result = type.getFileExtension();

			// Assert
			expect(result).toBe('.css');
		});

		it('should return .js for JavaScript type', () => {
			// Arrange
			const type = WebResourceType.JAVASCRIPT;

			// Act
			const result = type.getFileExtension();

			// Assert
			expect(result).toBe('.js');
		});

		it('should return .xml for XML type', () => {
			// Arrange
			const type = WebResourceType.XML;

			// Act
			const result = type.getFileExtension();

			// Assert
			expect(result).toBe('.xml');
		});

		it('should return .png for PNG type', () => {
			// Arrange
			const type = WebResourceType.PNG;

			// Act
			const result = type.getFileExtension();

			// Assert
			expect(result).toBe('.png');
		});

		it('should return .jpg for JPG type', () => {
			// Arrange
			const type = WebResourceType.JPG;

			// Act
			const result = type.getFileExtension();

			// Assert
			expect(result).toBe('.jpg');
		});

		it('should return .gif for GIF type', () => {
			// Arrange
			const type = WebResourceType.GIF;

			// Act
			const result = type.getFileExtension();

			// Assert
			expect(result).toBe('.gif');
		});

		it('should return .xap for XAP type', () => {
			// Arrange
			const type = WebResourceType.XAP;

			// Act
			const result = type.getFileExtension();

			// Assert
			expect(result).toBe('.xap');
		});

		it('should return .xsl for XSL type', () => {
			// Arrange
			const type = WebResourceType.XSL;

			// Act
			const result = type.getFileExtension();

			// Assert
			expect(result).toBe('.xsl');
		});

		it('should return .ico for ICO type', () => {
			// Arrange
			const type = WebResourceType.ICO;

			// Act
			const result = type.getFileExtension();

			// Assert
			expect(result).toBe('.ico');
		});

		it('should return .svg for SVG type', () => {
			// Arrange
			const type = WebResourceType.SVG;

			// Act
			const result = type.getFileExtension();

			// Assert
			expect(result).toBe('.svg');
		});

		it('should return .resx for RESX type', () => {
			// Arrange
			const type = WebResourceType.RESX;

			// Act
			const result = type.getFileExtension();

			// Assert
			expect(result).toBe('.resx');
		});
	});

	// ========== isTextBased ==========

	describe('isTextBased', () => {
		it('should return true for HTML type', () => {
			// Arrange
			const type = WebResourceType.HTML;

			// Act
			const result = type.isTextBased();

			// Assert
			expect(result).toBe(true);
		});

		it('should return true for CSS type', () => {
			// Arrange
			const type = WebResourceType.CSS;

			// Act
			const result = type.isTextBased();

			// Assert
			expect(result).toBe(true);
		});

		it('should return true for JavaScript type', () => {
			// Arrange
			const type = WebResourceType.JAVASCRIPT;

			// Act
			const result = type.isTextBased();

			// Assert
			expect(result).toBe(true);
		});

		it('should return true for XML type', () => {
			// Arrange
			const type = WebResourceType.XML;

			// Act
			const result = type.isTextBased();

			// Assert
			expect(result).toBe(true);
		});

		it('should return true for XSL type', () => {
			// Arrange
			const type = WebResourceType.XSL;

			// Act
			const result = type.isTextBased();

			// Assert
			expect(result).toBe(true);
		});

		it('should return true for RESX type', () => {
			// Arrange
			const type = WebResourceType.RESX;

			// Act
			const result = type.isTextBased();

			// Assert
			expect(result).toBe(true);
		});

		it('should return false for PNG type', () => {
			// Arrange
			const type = WebResourceType.PNG;

			// Act
			const result = type.isTextBased();

			// Assert
			expect(result).toBe(false);
		});

		it('should return false for JPG type', () => {
			// Arrange
			const type = WebResourceType.JPG;

			// Act
			const result = type.isTextBased();

			// Assert
			expect(result).toBe(false);
		});

		it('should return false for GIF type', () => {
			// Arrange
			const type = WebResourceType.GIF;

			// Act
			const result = type.isTextBased();

			// Assert
			expect(result).toBe(false);
		});

		it('should return false for XAP type', () => {
			// Arrange
			const type = WebResourceType.XAP;

			// Act
			const result = type.isTextBased();

			// Assert
			expect(result).toBe(false);
		});

		it('should return false for ICO type', () => {
			// Arrange
			const type = WebResourceType.ICO;

			// Act
			const result = type.isTextBased();

			// Assert
			expect(result).toBe(false);
		});

		it('should return true for SVG type (XML-based)', () => {
			// Arrange
			const type = WebResourceType.SVG;

			// Act
			const result = type.isTextBased();

			// Assert - SVG is XML-based and can be viewed/edited as text
			expect(result).toBe(true);
		});
	});

	// ========== isImage ==========

	describe('isImage', () => {
		it('should return true for PNG type', () => {
			// Arrange
			const type = WebResourceType.PNG;

			// Act
			const result = type.isImage();

			// Assert
			expect(result).toBe(true);
		});

		it('should return true for JPG type', () => {
			// Arrange
			const type = WebResourceType.JPG;

			// Act
			const result = type.isImage();

			// Assert
			expect(result).toBe(true);
		});

		it('should return true for GIF type', () => {
			// Arrange
			const type = WebResourceType.GIF;

			// Act
			const result = type.isImage();

			// Assert
			expect(result).toBe(true);
		});

		it('should return true for ICO type', () => {
			// Arrange
			const type = WebResourceType.ICO;

			// Act
			const result = type.isImage();

			// Assert
			expect(result).toBe(true);
		});

		it('should return true for SVG type', () => {
			// Arrange
			const type = WebResourceType.SVG;

			// Act
			const result = type.isImage();

			// Assert
			expect(result).toBe(true);
		});

		it('should return false for HTML type', () => {
			// Arrange
			const type = WebResourceType.HTML;

			// Act
			const result = type.isImage();

			// Assert
			expect(result).toBe(false);
		});

		it('should return false for JavaScript type', () => {
			// Arrange
			const type = WebResourceType.JAVASCRIPT;

			// Act
			const result = type.isImage();

			// Assert
			expect(result).toBe(false);
		});

		it('should return false for CSS type', () => {
			// Arrange
			const type = WebResourceType.CSS;

			// Act
			const result = type.isImage();

			// Assert
			expect(result).toBe(false);
		});

		it('should return false for XAP type', () => {
			// Arrange
			const type = WebResourceType.XAP;

			// Act
			const result = type.isImage();

			// Assert
			expect(result).toBe(false);
		});
	});

	// ========== Equality ==========

	describe('equals', () => {
		it('should return true when comparing same static instance', () => {
			// Arrange
			const type1 = WebResourceType.HTML;
			const type2 = WebResourceType.HTML;

			// Act
			const result = type1.equals(type2);

			// Assert
			expect(result).toBe(true);
		});

		it('should return true when comparing same type from fromCode', () => {
			// Arrange
			const type1 = WebResourceType.fromCode(3);
			const type2 = WebResourceType.JAVASCRIPT;

			// Act
			const result = type1.equals(type2);

			// Assert
			expect(result).toBe(true);
		});

		it('should return false when comparing different types', () => {
			// Arrange
			const type1 = WebResourceType.HTML;
			const type2 = WebResourceType.CSS;

			// Act
			const result = type1.equals(type2);

			// Assert
			expect(result).toBe(false);
		});

		it('should return false when comparing with null', () => {
			// Arrange
			const type = WebResourceType.HTML;

			// Act
			const result = type.equals(null);

			// Assert
			expect(result).toBe(false);
		});
	});

	// ========== Integration Tests ==========

	describe('integration', () => {
		it('should return singleton instances for all types', () => {
			// All fromCode calls should return the same static instance
			expect(WebResourceType.fromCode(1)).toBe(WebResourceType.HTML);
			expect(WebResourceType.fromCode(2)).toBe(WebResourceType.CSS);
			expect(WebResourceType.fromCode(3)).toBe(WebResourceType.JAVASCRIPT);
			expect(WebResourceType.fromCode(4)).toBe(WebResourceType.XML);
			expect(WebResourceType.fromCode(5)).toBe(WebResourceType.PNG);
			expect(WebResourceType.fromCode(6)).toBe(WebResourceType.JPG);
			expect(WebResourceType.fromCode(7)).toBe(WebResourceType.GIF);
			expect(WebResourceType.fromCode(8)).toBe(WebResourceType.XAP);
			expect(WebResourceType.fromCode(9)).toBe(WebResourceType.XSL);
			expect(WebResourceType.fromCode(10)).toBe(WebResourceType.ICO);
			expect(WebResourceType.fromCode(11)).toBe(WebResourceType.SVG);
			expect(WebResourceType.fromCode(12)).toBe(WebResourceType.RESX);
		});

		it('should have mutually exclusive text-based and image categories (except XAP and SVG)', () => {
			// Arrange
			const textBasedOnlyTypes = [
				WebResourceType.HTML,
				WebResourceType.CSS,
				WebResourceType.JAVASCRIPT,
				WebResourceType.XML,
				WebResourceType.XSL,
				WebResourceType.RESX
			];
			const binaryImageTypes = [
				WebResourceType.PNG,
				WebResourceType.JPG,
				WebResourceType.GIF,
				WebResourceType.ICO
			];

			// Act & Assert
			textBasedOnlyTypes.forEach(type => {
				expect(type.isTextBased()).toBe(true);
				expect(type.isImage()).toBe(false);
			});

			binaryImageTypes.forEach(type => {
				expect(type.isTextBased()).toBe(false);
				expect(type.isImage()).toBe(true);
			});

			// SVG is both text-based (XML) AND an image
			expect(WebResourceType.SVG.isTextBased()).toBe(true);
			expect(WebResourceType.SVG.isImage()).toBe(true);

			// XAP is neither text-based nor image
			expect(WebResourceType.XAP.isTextBased()).toBe(false);
			expect(WebResourceType.XAP.isImage()).toBe(false);
		});
	});
});
