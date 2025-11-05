import { ActionButtonsSection } from './ActionButtonsSection';
import { SectionPosition } from '../types/SectionPosition';
import type { ActionButtonsConfig } from '../types/ButtonConfig';

describe('ActionButtonsSection', () => {
	describe('constructor', () => {
		it('should create section with default toolbar position', () => {
			const config: ActionButtonsConfig = {
				buttons: [{ id: 'test', label: 'Test' }]
			};
			const section = new ActionButtonsSection(config);

			expect(section.position).toBe(SectionPosition.Toolbar);
		});

		it('should create section with custom position', () => {
			const config: ActionButtonsConfig = {
				buttons: [{ id: 'test', label: 'Test' }]
			};
			const section = new ActionButtonsSection(config, SectionPosition.Footer);

			expect(section.position).toBe(SectionPosition.Footer);
		});
	});

	describe('render', () => {
		it('should render single button', () => {
			const config: ActionButtonsConfig = {
				buttons: [{ id: 'refresh', label: 'Refresh' }]
			};
			const section = new ActionButtonsSection(config);

			const html = section.render({});

			expect(html).toContain('id="refresh"');
			expect(html).toContain('Refresh');
		});

		it('should render multiple buttons', () => {
			const config: ActionButtonsConfig = {
				buttons: [
					{ id: 'refresh', label: 'Refresh' },
					{ id: 'delete', label: 'Delete' }
				]
			};
			const section = new ActionButtonsSection(config);

			const html = section.render({});

			expect(html).toContain('id="refresh"');
			expect(html).toContain('Refresh');
			expect(html).toContain('id="delete"');
			expect(html).toContain('Delete');
		});

		it('should render button with icon', () => {
			const config: ActionButtonsConfig = {
				buttons: [{ id: 'save', label: 'Save', icon: '💾' }]
			};
			const section = new ActionButtonsSection(config);

			const html = section.render({});

			expect(html).toContain('💾');
			expect(html).toContain('Save');
		});

		it('should render button with variant', () => {
			const config: ActionButtonsConfig = {
				buttons: [{ id: 'delete', label: 'Delete', variant: 'danger' }]
			};
			const section = new ActionButtonsSection(config);

			const html = section.render({});

			expect(html).toContain('btn-danger');
			expect(html).toContain('Delete');
		});

		it('should render disabled button', () => {
			const config: ActionButtonsConfig = {
				buttons: [{ id: 'save', label: 'Save', disabled: true }]
			};
			const section = new ActionButtonsSection(config);

			const html = section.render({});

			expect(html).toContain('disabled');
			expect(html).toContain('Save');
		});

		it('should render empty when no buttons', () => {
			const config: ActionButtonsConfig = {
				buttons: []
			};
			const section = new ActionButtonsSection(config);

			const html = section.render({});

			expect(html).toBe('');
		});

		it('should pass position to view', () => {
			const config: ActionButtonsConfig = {
				buttons: [{ id: 'test', label: 'Test' }],
				position: 'right'
			};
			const section = new ActionButtonsSection(config);

			const html = section.render({});

			expect(html).toContain('align-right');
		});

		it('should escape HTML in button labels', () => {
			const config: ActionButtonsConfig = {
				buttons: [{ id: 'test', label: '<script>alert("xss")</script>' }]
			};
			const section = new ActionButtonsSection(config);

			const html = section.render({});

			expect(html).toContain('&lt;script&gt;');
			expect(html).not.toContain('<script>alert');
		});
	});
});
