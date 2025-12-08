import { FetchXmlGenerator } from './FetchXmlGenerator';
import { FetchXmlParser } from './FetchXmlParser';
import { VisualQuery } from '../valueObjects/VisualQuery';
import { QueryColumn } from '../valueObjects/QueryColumn';
import { QueryCondition } from '../valueObjects/QueryCondition';
import { QueryFilterGroup } from '../valueObjects/QueryFilterGroup';
import { QuerySort } from '../valueObjects/QuerySort';

describe('FetchXmlGenerator', () => {
	const generator = new FetchXmlGenerator();

	describe('generate', () => {
		describe('minimal query', () => {
			it('should generate minimal SELECT * query', () => {
				const query = new VisualQuery('contact');
				const xml = generator.generate(query);
				expect(xml).toContain('<fetch>');
				expect(xml).toContain('<entity name="contact">');
				expect(xml).toContain('<all-attributes />');
				expect(xml).toContain('</entity>');
				expect(xml).toContain('</fetch>');
			});
		});

		describe('fetch attributes', () => {
			it('should generate top attribute', () => {
				const query = new VisualQuery(
					'contact',
					{ kind: 'all' },
					null,
					[],
					100
				);
				const xml = generator.generate(query);
				expect(xml).toContain('top="100"');
			});

			it('should generate distinct attribute', () => {
				const query = new VisualQuery(
					'contact',
					{ kind: 'all' },
					null,
					[],
					null,
					true
				);
				const xml = generator.generate(query);
				expect(xml).toContain('distinct="true"');
			});

			it('should generate both top and distinct', () => {
				const query = new VisualQuery(
					'contact',
					{ kind: 'all' },
					null,
					[],
					50,
					true
				);
				const xml = generator.generate(query);
				expect(xml).toContain('top="50"');
				expect(xml).toContain('distinct="true"');
			});

			it('should not include attributes when not set', () => {
				const query = new VisualQuery('contact');
				const xml = generator.generate(query);
				expect(xml).not.toContain('top=');
				expect(xml).not.toContain('distinct=');
			});
		});

		describe('columns', () => {
			it('should generate all-attributes', () => {
				const query = new VisualQuery('contact');
				const xml = generator.generate(query);
				expect(xml).toContain('<all-attributes />');
			});

			it('should generate specific attributes', () => {
				const query = new VisualQuery(
					'contact',
					{
						kind: 'specific',
						columns: [
							new QueryColumn('fullname'),
							new QueryColumn('emailaddress1'),
						],
					}
				);
				const xml = generator.generate(query);
				expect(xml).toContain('<attribute name="fullname" />');
				expect(xml).toContain('<attribute name="emailaddress1" />');
				expect(xml).not.toContain('<all-attributes');
			});

			it('should generate attribute with alias', () => {
				const query = new VisualQuery(
					'contact',
					{
						kind: 'specific',
						columns: [new QueryColumn('fullname', 'name')],
					}
				);
				const xml = generator.generate(query);
				expect(xml).toContain('alias="name"');
			});
		});

		describe('filters', () => {
			it('should generate AND filter', () => {
				const condition = new QueryCondition('statecode', 'eq', '0');
				const filter = new QueryFilterGroup('and', [condition]);
				const query = new VisualQuery('contact').withFilter(filter);
				const xml = generator.generate(query);
				expect(xml).toContain('<filter type="and">');
				expect(xml).toContain('attribute="statecode"');
				expect(xml).toContain('operator="eq"');
				expect(xml).toContain('value="0"');
				expect(xml).toContain('</filter>');
			});

			it('should generate OR filter', () => {
				const condition = new QueryCondition('firstname', 'eq', 'John');
				const filter = new QueryFilterGroup('or', [condition]);
				const query = new VisualQuery('contact').withFilter(filter);
				const xml = generator.generate(query);
				expect(xml).toContain('<filter type="or">');
			});

			it('should generate null condition without value', () => {
				const condition = new QueryCondition('emailaddress1', 'null', null);
				const filter = new QueryFilterGroup('and', [condition]);
				const query = new VisualQuery('contact').withFilter(filter);
				const xml = generator.generate(query);
				expect(xml).toContain('operator="null"');
				expect(xml).not.toContain('value=');
				expect(xml).toContain('/>'); // Self-closing
			});

			it('should generate IN condition with value elements', () => {
				const condition = new QueryCondition('statecode', 'in', ['0', '1', '2']);
				const filter = new QueryFilterGroup('and', [condition]);
				const query = new VisualQuery('contact').withFilter(filter);
				const xml = generator.generate(query);
				expect(xml).toContain('operator="in"');
				expect(xml).toContain('<value>0</value>');
				expect(xml).toContain('<value>1</value>');
				expect(xml).toContain('<value>2</value>');
				expect(xml).toContain('</condition>');
			});

			it('should generate nested filter groups', () => {
				const cond1 = new QueryCondition('statecode', 'eq', '0');
				const cond2 = new QueryCondition('firstname', 'eq', 'John');
				const cond3 = new QueryCondition('firstname', 'eq', 'Jane');
				const nested = new QueryFilterGroup('or', [cond2, cond3]);
				const filter = new QueryFilterGroup('and', [cond1], [nested]);
				const query = new VisualQuery('contact').withFilter(filter);
				const xml = generator.generate(query);
				// Should have two filter elements
				expect((xml.match(/<filter/g) ?? []).length).toBe(2);
				expect(xml).toContain('<filter type="and">');
				expect(xml).toContain('<filter type="or">');
			});

			it('should not generate filter when null', () => {
				const query = new VisualQuery('contact');
				const xml = generator.generate(query);
				expect(xml).not.toContain('<filter');
			});

			it('should not generate filter when empty', () => {
				const filter = new QueryFilterGroup('and', []);
				const query = new VisualQuery('contact').withFilter(filter);
				const xml = generator.generate(query);
				expect(xml).not.toContain('<filter');
			});
		});

		describe('orders', () => {
			it('should generate ascending order', () => {
				const sort = new QuerySort('createdon', false);
				const query = new VisualQuery('contact').withSorts([sort]);
				const xml = generator.generate(query);
				expect(xml).toContain('<order attribute="createdon" descending="false" />');
			});

			it('should generate descending order', () => {
				const sort = new QuerySort('createdon', true);
				const query = new VisualQuery('contact').withSorts([sort]);
				const xml = generator.generate(query);
				expect(xml).toContain('descending="true"');
			});

			it('should generate multiple orders', () => {
				const sort1 = new QuerySort('lastname', false);
				const sort2 = new QuerySort('firstname', false);
				const query = new VisualQuery('contact').withSorts([sort1, sort2]);
				const xml = generator.generate(query);
				expect(xml).toContain('attribute="lastname"');
				expect(xml).toContain('attribute="firstname"');
			});
		});

		describe('XML escaping', () => {
			it('should escape special characters in entity name', () => {
				// This is an unusual case but ensures proper escaping
				const query = new VisualQuery('test&entity');
				const xml = generator.generate(query);
				expect(xml).toContain('&amp;');
			});

			it('should escape special characters in condition value', () => {
				const condition = new QueryCondition('name', 'eq', 'O\'Brien & Co');
				const filter = new QueryFilterGroup('and', [condition]);
				const query = new VisualQuery('contact').withFilter(filter);
				const xml = generator.generate(query);
				expect(xml).toContain('&apos;');
				expect(xml).toContain('&amp;');
			});

			it('should escape quotes in values', () => {
				const condition = new QueryCondition('name', 'eq', 'Say "Hello"');
				const filter = new QueryFilterGroup('and', [condition]);
				const query = new VisualQuery('contact').withFilter(filter);
				const xml = generator.generate(query);
				expect(xml).toContain('&quot;');
			});

			it('should escape angle brackets in values', () => {
				const condition = new QueryCondition('name', 'eq', '<test>');
				const filter = new QueryFilterGroup('and', [condition]);
				const query = new VisualQuery('contact').withFilter(filter);
				const xml = generator.generate(query);
				expect(xml).toContain('&lt;');
				expect(xml).toContain('&gt;');
			});
		});

		describe('formatting', () => {
			it('should produce properly indented output', () => {
				const query = new VisualQuery('contact');
				const xml = generator.generate(query);
				const lines = xml.split('\n');
				expect(lines[0]).toBe('<fetch>');
				expect(lines[1]).toMatch(/^\s{2}<entity/); // 2-space indent
				expect(lines[2]).toMatch(/^\s{4}<all-attributes/); // 4-space indent
			});
		});
	});

	describe('round-trip', () => {
		const parser = new FetchXmlParser();

		it('should produce equivalent query after parse -> generate -> parse', () => {
			const originalXml = `
				<fetch top="100" distinct="true">
					<entity name="contact">
						<attribute name="fullname" />
						<attribute name="emailaddress1" />
						<filter type="and">
							<condition attribute="statecode" operator="eq" value="0" />
						</filter>
						<order attribute="createdon" descending="true" />
					</entity>
				</fetch>
			`;
			const query1 = parser.parse(originalXml);
			const generatedXml = generator.generate(query1);
			const query2 = parser.parse(generatedXml);

			expect(query2.entityName).toBe(query1.entityName);
			expect(query2.top).toBe(query1.top);
			expect(query2.distinct).toBe(query1.distinct);
			expect(query2.getColumnCount()).toBe(query1.getColumnCount());
			expect(query2.getConditionCount()).toBe(query1.getConditionCount());
			expect(query2.sorts.length).toBe(query1.sorts.length);
		});

		it('should handle query with IN condition', () => {
			const condition = new QueryCondition('statecode', 'in', ['0', '1']);
			const filter = new QueryFilterGroup('and', [condition]);
			const query1 = new VisualQuery('contact').withFilter(filter);

			const xml = generator.generate(query1);
			const query2 = parser.parse(xml);

			const cond0 = query2.filter?.conditions[0];
			expect(cond0).toBeDefined();
			expect(cond0!.value).toEqual(['0', '1']);
		});
	});
});
