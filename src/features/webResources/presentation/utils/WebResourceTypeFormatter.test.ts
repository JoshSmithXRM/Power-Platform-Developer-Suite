/**
 * Tests for WebResourceTypeFormatter presentation utility.
 * Validates display name formatting for WebResourceType value objects.
 */

import { WebResourceTypeFormatter } from './WebResourceTypeFormatter';
import { WebResourceType } from '../../domain/valueObjects/WebResourceType';

describe('WebResourceTypeFormatter', () => {
	describe('formatDisplayName', () => {
		it('should return "HTML" for HTML type', () => {
			expect(WebResourceTypeFormatter.formatDisplayName(WebResourceType.HTML)).toBe('HTML');
		});

		it('should return "CSS" for CSS type', () => {
			expect(WebResourceTypeFormatter.formatDisplayName(WebResourceType.CSS)).toBe('CSS');
		});

		it('should return "JavaScript" for JavaScript type', () => {
			expect(WebResourceTypeFormatter.formatDisplayName(WebResourceType.JAVASCRIPT)).toBe(
				'JavaScript'
			);
		});

		it('should return "XML" for XML type', () => {
			expect(WebResourceTypeFormatter.formatDisplayName(WebResourceType.XML)).toBe('XML');
		});

		it('should return "Image (PNG)" for PNG type', () => {
			expect(WebResourceTypeFormatter.formatDisplayName(WebResourceType.PNG)).toBe(
				'Image (PNG)'
			);
		});

		it('should return "Image (JPG)" for JPG type', () => {
			expect(WebResourceTypeFormatter.formatDisplayName(WebResourceType.JPG)).toBe(
				'Image (JPG)'
			);
		});

		it('should return "Image (GIF)" for GIF type', () => {
			expect(WebResourceTypeFormatter.formatDisplayName(WebResourceType.GIF)).toBe(
				'Image (GIF)'
			);
		});

		it('should return "Silverlight (XAP)" for XAP type', () => {
			expect(WebResourceTypeFormatter.formatDisplayName(WebResourceType.XAP)).toBe(
				'Silverlight (XAP)'
			);
		});

		it('should return "XSL" for XSL type', () => {
			expect(WebResourceTypeFormatter.formatDisplayName(WebResourceType.XSL)).toBe('XSL');
		});

		it('should return "Image (ICO)" for ICO type', () => {
			expect(WebResourceTypeFormatter.formatDisplayName(WebResourceType.ICO)).toBe(
				'Image (ICO)'
			);
		});

		it('should return "Image (SVG)" for SVG type', () => {
			expect(WebResourceTypeFormatter.formatDisplayName(WebResourceType.SVG)).toBe(
				'Image (SVG)'
			);
		});

		it('should return "String (RESX)" for RESX type', () => {
			expect(WebResourceTypeFormatter.formatDisplayName(WebResourceType.RESX)).toBe(
				'String (RESX)'
			);
		});

		it('should return "Unknown (code)" for invalid type code', () => {
			// Create a mock type with an invalid code for edge case testing
			const mockType = { getCode: () => 999 } as WebResourceType;
			expect(WebResourceTypeFormatter.formatDisplayName(mockType)).toBe('Unknown (999)');
		});

		it('should handle all valid web resource types', () => {
			const types = [
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

			const expectedNames = [
				'HTML',
				'CSS',
				'JavaScript',
				'XML',
				'Image (PNG)',
				'Image (JPG)',
				'Image (GIF)',
				'Silverlight (XAP)',
				'XSL',
				'Image (ICO)',
				'Image (SVG)',
				'String (RESX)'
			];

			types.forEach((type, index) => {
				expect(WebResourceTypeFormatter.formatDisplayName(type)).toBe(expectedNames[index]);
			});
		});
	});
});
