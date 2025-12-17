import { StepImage } from './StepImage';
import { ImageType } from '../valueObjects/ImageType';

describe('StepImage', () => {
	const createImage = (overrides: Partial<{
		id: string;
		name: string;
		stepId: string;
		imageType: ImageType;
		entityAlias: string;
		attributes: string;
		messagePropertyName: string;
		createdOn: Date;
	}> = {}): StepImage => {
		const defaults = {
			id: 'image-123',
			name: 'PreImage',
			stepId: 'step-456',
			imageType: ImageType.PreImage,
			entityAlias: 'PreImage',
			attributes: 'name,accountnumber',
			messagePropertyName: 'Target',
			createdOn: new Date('2024-01-01'),
		};
		const props = { ...defaults, ...overrides };
		return new StepImage(
			props.id,
			props.name,
			props.stepId,
			props.imageType,
			props.entityAlias,
			props.attributes,
			props.messagePropertyName,
			props.createdOn
		);
	};

	describe('getAttributesArray', () => {
		it('should split comma-separated attributes', () => {
			const image = createImage({ attributes: 'name,accountnumber,revenue' });
			expect(image.getAttributesArray()).toEqual(['name', 'accountnumber', 'revenue']);
		});

		it('should trim whitespace from attributes', () => {
			const image = createImage({ attributes: ' name , accountnumber , revenue ' });
			expect(image.getAttributesArray()).toEqual(['name', 'accountnumber', 'revenue']);
		});

		it('should handle single attribute', () => {
			const image = createImage({ attributes: 'name' });
			expect(image.getAttributesArray()).toEqual(['name']);
		});

		it('should return empty array when attributes is empty string', () => {
			const image = createImage({ attributes: '' });
			expect(image.getAttributesArray()).toEqual([]);
		});
	});

	describe('getters', () => {
		it('should return correct id', () => {
			const image = createImage({ id: 'test-id' });
			expect(image.getId()).toBe('test-id');
		});

		it('should return correct name', () => {
			const image = createImage({ name: 'PostImage' });
			expect(image.getName()).toBe('PostImage');
		});

		it('should return correct stepId', () => {
			const image = createImage({ stepId: 'step-789' });
			expect(image.getStepId()).toBe('step-789');
		});

		it('should return correct imageType', () => {
			const image = createImage({ imageType: ImageType.PostImage });
			expect(image.getImageType()).toBe(ImageType.PostImage);
		});

		it('should return correct entityAlias', () => {
			const image = createImage({ entityAlias: 'Target' });
			expect(image.getEntityAlias()).toBe('Target');
		});

		it('should return correct attributes', () => {
			const image = createImage({ attributes: 'field1,field2' });
			expect(image.getAttributes()).toBe('field1,field2');
		});

		it('should return correct messagePropertyName', () => {
			const image = createImage({ messagePropertyName: 'Id' });
			expect(image.getMessagePropertyName()).toBe('Id');
		});

		it('should return correct createdOn', () => {
			const date = new Date('2024-06-01');
			const image = createImage({ createdOn: date });
			expect(image.getCreatedOn()).toBe(date);
		});
	});
});
