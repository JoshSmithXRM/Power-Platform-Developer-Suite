import { SectionPosition } from '../../../../shared/infrastructure/ui/types/SectionPosition';
import type { SectionRenderData } from '../../../../shared/infrastructure/ui/types/SectionRenderData';
import { QueryEditorSection } from './QueryEditorSection';

describe('QueryEditorSection', () => {
	let section: QueryEditorSection;

	beforeEach(() => {
		section = new QueryEditorSection();
	});

	describe('position', () => {
		it('should be positioned in main area', () => {
			expect(section.position).toBe(SectionPosition.Main);
		});
	});

	describe('render', () => {
		it('should render query editor with SQL textarea', () => {
			const data: SectionRenderData = {
				customData: {
					sql: 'SELECT name FROM account',
					fetchXml: '<fetch><entity name="account"/></fetch>',
				},
			};

			const html = section.render(data);

			expect(html).toContain('query-editor-section');
			expect(html).toContain('sql-editor');
			expect(html).toContain('SELECT name FROM account');
		});

		it('should render FetchXML preview', () => {
			const data: SectionRenderData = {
				customData: {
					sql: 'SELECT name FROM account',
					fetchXml: '<fetch><entity name="account"/></fetch>',
				},
			};

			const html = section.render(data);

			expect(html).toContain('fetchxml-preview');
			// FetchXML is escaped for security
			expect(html).toContain('&lt;fetch&gt;');
		});

		it('should render error banner when errorMessage is provided', () => {
			const data: SectionRenderData = {
				customData: {
					sql: 'SELECT * FORM account',
					fetchXml: '',
					errorMessage: 'Unexpected token',
					errorPosition: { line: 1, column: 10 },
				},
			};

			const html = section.render(data);

			expect(html).toContain('error-banner');
			expect(html).toContain('Unexpected token');
			expect(html).toContain('line 1');
			expect(html).toContain('column 10');
		});

		it('should not render error banner when no error', () => {
			const data: SectionRenderData = {
				customData: {
					sql: 'SELECT name FROM account',
					fetchXml: '<fetch><entity name="account"/></fetch>',
				},
			};

			const html = section.render(data);

			expect(html).not.toContain('error-banner');
		});

		it('should handle empty customData', () => {
			const data: SectionRenderData = {};

			const html = section.render(data);

			expect(html).toContain('query-editor-section');
			expect(html).toContain('sql-editor');
		});

		it('should escape HTML in SQL to prevent XSS', () => {
			const data: SectionRenderData = {
				customData: {
					sql: '<script>alert("xss")</script>',
					fetchXml: '',
				},
			};

			const html = section.render(data);

			expect(html).not.toContain('<script>');
			expect(html).toContain('&lt;script&gt;');
		});
	});
});
