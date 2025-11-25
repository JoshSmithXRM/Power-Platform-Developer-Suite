import { PersistenceInspectorSection } from './PersistenceInspectorSection';
import { SectionPosition } from '../../../../shared/infrastructure/ui/types/SectionPosition';

describe('PersistenceInspectorSection', () => {
	describe('position', () => {
		it('should have Main position', () => {
			const section = new PersistenceInspectorSection();
			expect(section.position).toBe(SectionPosition.Main);
		});
	});

	describe('render', () => {
		it('should render Global State section container', () => {
			const section = new PersistenceInspectorSection();

			const html = section.render({});

			expect(html).toContain('id="globalStateSection"');
			expect(html).toContain('class="section"');
		});

		it('should render Global State title', () => {
			const section = new PersistenceInspectorSection();

			const html = section.render({});

			expect(html).toContain('class="section-title"');
			expect(html).toContain('Global State');
		});

		it('should render Global State entries container', () => {
			const section = new PersistenceInspectorSection();

			const html = section.render({});

			expect(html).toContain('id="globalStateEntries"');
		});

		it('should render Workspace State section container', () => {
			const section = new PersistenceInspectorSection();

			const html = section.render({});

			expect(html).toContain('id="workspaceStateSection"');
			expect(html).toContain('class="section"');
		});

		it('should render Workspace State title', () => {
			const section = new PersistenceInspectorSection();

			const html = section.render({});

			expect(html).toContain('class="section-title"');
			expect(html).toContain('Workspace State');
		});

		it('should render Workspace State entries container', () => {
			const section = new PersistenceInspectorSection();

			const html = section.render({});

			expect(html).toContain('id="workspaceStateEntries"');
		});

		it('should render Secrets section container', () => {
			const section = new PersistenceInspectorSection();

			const html = section.render({});

			expect(html).toContain('id="secretsSection"');
			expect(html).toContain('class="section"');
		});

		it('should render Secrets title', () => {
			const section = new PersistenceInspectorSection();

			const html = section.render({});

			expect(html).toContain('class="section-title"');
			expect(html).toContain('Secrets');
		});

		it('should render Secrets entries container', () => {
			const section = new PersistenceInspectorSection();

			const html = section.render({});

			expect(html).toContain('id="secretEntries"');
		});

		it('should render all three storage sections in correct order', () => {
			const section = new PersistenceInspectorSection();

			const html = section.render({});

			const globalStateIndex = html.indexOf('id="globalStateSection"');
			const workspaceStateIndex = html.indexOf('id="workspaceStateSection"');
			const secretsIndex = html.indexOf('id="secretsSection"');

			expect(globalStateIndex).toBeGreaterThan(-1);
			expect(workspaceStateIndex).toBeGreaterThan(globalStateIndex);
			expect(secretsIndex).toBeGreaterThan(workspaceStateIndex);
		});

		it('should render empty containers for client-side population', () => {
			const section = new PersistenceInspectorSection();

			const html = section.render({});

			expect(html).toContain('<div id="globalStateEntries"></div>');
			expect(html).toContain('<div id="workspaceStateEntries"></div>');
			expect(html).toContain('<div id="secretEntries"></div>');
		});

		it('should ignore render data parameter', () => {
			const section = new PersistenceInspectorSection();

			const html1 = section.render({});
			const html2 = section.render({ customData: { foo: 'bar' } });

			expect(html1).toBe(html2);
		});

		it('should render consistent HTML structure', () => {
			const section = new PersistenceInspectorSection();

			const html = section.render({});

			// Verify structure: section > title + entries for each storage type
			expect(html).toMatch(/<div id="globalStateSection" class="section">[\s\S]*?<div class="section-title">Global State<\/div>[\s\S]*?<div id="globalStateEntries"><\/div>[\s\S]*?<\/div>/);
			expect(html).toMatch(/<div id="workspaceStateSection" class="section">[\s\S]*?<div class="section-title">Workspace State<\/div>[\s\S]*?<div id="workspaceStateEntries"><\/div>[\s\S]*?<\/div>/);
			expect(html).toMatch(/<div id="secretsSection" class="section">[\s\S]*?<div class="section-title">Secrets<\/div>[\s\S]*?<div id="secretEntries"><\/div>[\s\S]*?<\/div>/);
		});
	});
});
