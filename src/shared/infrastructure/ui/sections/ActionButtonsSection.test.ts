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

		it('should disable all buttons when isLoading is true', () => {
			const config: ActionButtonsConfig = {
				buttons: [
					{ id: 'refresh', label: 'Refresh' },
					{ id: 'openMaker', label: 'Open in Maker' }
				]
			};
			const section = new ActionButtonsSection(config);

			const html = section.render({ isLoading: true });

			// Both buttons should be disabled
			const refreshMatch = html.match(/<button[^>]*id="refresh"[^>]*>/);
			const openMakerMatch = html.match(/<button[^>]*id="openMaker"[^>]*>/);
			expect(refreshMatch?.[0]).toContain('disabled');
			expect(openMakerMatch?.[0]).toContain('disabled');
		});

		it('should not disable buttons when isLoading is false', () => {
			const config: ActionButtonsConfig = {
				buttons: [
					{ id: 'refresh', label: 'Refresh' },
					{ id: 'openMaker', label: 'Open in Maker' }
				]
			};
			const section = new ActionButtonsSection(config);

			const html = section.render({ isLoading: false });

			// Neither button should be disabled
			const refreshMatch = html.match(/<button[^>]*id="refresh"[^>]*>/);
			const openMakerMatch = html.match(/<button[^>]*id="openMaker"[^>]*>/);
			expect(refreshMatch?.[0]).not.toContain('disabled');
			expect(openMakerMatch?.[0]).not.toContain('disabled');
		});

		it('should not disable buttons when isLoading is undefined', () => {
			const config: ActionButtonsConfig = {
				buttons: [{ id: 'refresh', label: 'Refresh' }]
			};
			const section = new ActionButtonsSection(config);

			const html = section.render({});

			const buttonMatch = html.match(/<button[^>]*id="refresh"[^>]*>/);
			expect(buttonMatch?.[0]).not.toContain('disabled');
		});

		it('should preserve existing disabled state on buttons when not loading', () => {
			const config: ActionButtonsConfig = {
				buttons: [
					{ id: 'save', label: 'Save', disabled: true },
					{ id: 'cancel', label: 'Cancel', disabled: false }
				]
			};
			const section = new ActionButtonsSection(config);

			const html = section.render({ isLoading: false });

			const saveMatch = html.match(/<button[^>]*id="save"[^>]*>/);
			const cancelMatch = html.match(/<button[^>]*id="cancel"[^>]*>/);
			expect(saveMatch?.[0]).toContain('disabled');
			expect(cancelMatch?.[0]).not.toContain('disabled');
		});
	});
});
