import { ImageType } from './ImageType';

describe('ImageType', () => {
	describe('static instances', () => {
		it('should have PreImage with value 0', () => {
			expect(ImageType.PreImage.getValue()).toBe(0);
			expect(ImageType.PreImage.getName()).toBe('PreImage');
		});

		it('should have PostImage with value 1', () => {
			expect(ImageType.PostImage.getValue()).toBe(1);
			expect(ImageType.PostImage.getName()).toBe('PostImage');
		});

		it('should have Both with value 2', () => {
			expect(ImageType.Both.getValue()).toBe(2);
			expect(ImageType.Both.getName()).toBe('Both');
		});
	});

	describe('fromValue', () => {
		it('should return PreImage for value 0', () => {
			expect(ImageType.fromValue(0)).toBe(ImageType.PreImage);
		});

		it('should return PostImage for value 1', () => {
			expect(ImageType.fromValue(1)).toBe(ImageType.PostImage);
		});

		it('should return Both for value 2', () => {
			expect(ImageType.fromValue(2)).toBe(ImageType.Both);
		});

		it('should throw error for invalid value', () => {
			expect(() => ImageType.fromValue(3)).toThrow('Invalid ImageType value: 3');
		});

		it('should throw error for negative value', () => {
			expect(() => ImageType.fromValue(-1)).toThrow('Invalid ImageType value: -1');
		});
	});

	describe('equals', () => {
		it('should return true for same instance', () => {
			expect(ImageType.PreImage.equals(ImageType.PreImage)).toBe(true);
		});

		it('should return true for instances with same value', () => {
			const type1 = ImageType.fromValue(1);
			const type2 = ImageType.fromValue(1);
			expect(type1.equals(type2)).toBe(true);
		});

		it('should return false for different types', () => {
			expect(ImageType.PreImage.equals(ImageType.PostImage)).toBe(false);
		});
	});
});
