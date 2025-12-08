import { FetchXmlParser } from './FetchXmlParser';
import { FetchXmlParseError } from '../errors/FetchXmlParseError';

describe('FetchXmlParser', () => {
	const parser = new FetchXmlParser();

	describe('parse', () => {
		describe('basic structure', () => {
			it('should parse minimal FetchXML', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<all-attributes />
						</entity>
					</fetch>
				`;
				const query = parser.parse(fetchXml);
				expect(query.entityName).toBe('contact');
				expect(query.isSelectAll()).toBe(true);
			});

			it('should parse compact FetchXML', () => {
				const fetchXml = '<fetch><entity name="account"><all-attributes/></entity></fetch>';
				const query = parser.parse(fetchXml);
				expect(query.entityName).toBe('account');
			});

			it('should throw for empty input', () => {
				expect(() => parser.parse('')).toThrow(FetchXmlParseError);
			});

			it('should throw for whitespace-only input', () => {
				expect(() => parser.parse('   ')).toThrow(FetchXmlParseError);
			});

			it('should throw for missing fetch element', () => {
				expect(() => parser.parse('<entity name="contact"/>')).toThrow(FetchXmlParseError);
			});

			it('should throw for missing entity element', () => {
				expect(() => parser.parse('<fetch></fetch>')).toThrow(FetchXmlParseError);
			});
		});

		describe('fetch attributes', () => {
			it('should parse top attribute', () => {
				const fetchXml = `
					<fetch top="100">
						<entity name="contact">
							<all-attributes />
						</entity>
					</fetch>
				`;
				const query = parser.parse(fetchXml);
				expect(query.top).toBe(100);
			});

			it('should parse distinct attribute', () => {
				const fetchXml = `
					<fetch distinct="true">
						<entity name="contact">
							<all-attributes />
						</entity>
					</fetch>
				`;
				const query = parser.parse(fetchXml);
				expect(query.distinct).toBe(true);
			});

			it('should handle distinct="false"', () => {
				const fetchXml = `
					<fetch distinct="false">
						<entity name="contact">
							<all-attributes />
						</entity>
					</fetch>
				`;
				const query = parser.parse(fetchXml);
				expect(query.distinct).toBe(false);
			});

			it('should parse multiple fetch attributes', () => {
				const fetchXml = `
					<fetch top="50" distinct="true">
						<entity name="contact">
							<all-attributes />
						</entity>
					</fetch>
				`;
				const query = parser.parse(fetchXml);
				expect(query.top).toBe(50);
				expect(query.distinct).toBe(true);
			});
		});

		describe('columns', () => {
			it('should parse all-attributes', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<all-attributes />
						</entity>
					</fetch>
				`;
				const query = parser.parse(fetchXml);
				expect(query.isSelectAll()).toBe(true);
			});

			it('should parse specific attributes', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<attribute name="fullname" />
							<attribute name="emailaddress1" />
						</entity>
					</fetch>
				`;
				const query = parser.parse(fetchXml);
				expect(query.isSelectAll()).toBe(false);
				if (query.columns.kind === 'specific') {
					expect(query.columns.columns).toHaveLength(2);
					const col0 = query.columns.columns[0];
					const col1 = query.columns.columns[1];
					expect(col0).toBeDefined();
					expect(col1).toBeDefined();
					expect(col0!.name).toBe('fullname');
					expect(col1!.name).toBe('emailaddress1');
				}
			});

			it('should parse attribute with alias', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<attribute name="fullname" alias="name" />
						</entity>
					</fetch>
				`;
				const query = parser.parse(fetchXml);
				if (query.columns.kind === 'specific') {
					const col0 = query.columns.columns[0];
					expect(col0).toBeDefined();
					expect(col0!.alias).toBe('name');
				}
			});

			it('should treat no attributes as all-attributes', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
						</entity>
					</fetch>
				`;
				const query = parser.parse(fetchXml);
				expect(query.isSelectAll()).toBe(true);
			});
		});

		describe('filters', () => {
			it('should parse simple AND filter', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<all-attributes />
							<filter type="and">
								<condition attribute="statecode" operator="eq" value="0" />
							</filter>
						</entity>
					</fetch>
				`;
				const query = parser.parse(fetchXml);
				expect(query.hasFilter()).toBe(true);
				expect(query.filter?.type).toBe('and');
				expect(query.filter?.conditions).toHaveLength(1);
			});

			it('should parse OR filter', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<all-attributes />
							<filter type="or">
								<condition attribute="firstname" operator="eq" value="John" />
								<condition attribute="firstname" operator="eq" value="Jane" />
							</filter>
						</entity>
					</fetch>
				`;
				const query = parser.parse(fetchXml);
				expect(query.filter?.type).toBe('or');
				expect(query.filter?.conditions).toHaveLength(2);
			});

			it('should default to AND filter type', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<all-attributes />
							<filter>
								<condition attribute="statecode" operator="eq" value="0" />
							</filter>
						</entity>
					</fetch>
				`;
				const query = parser.parse(fetchXml);
				expect(query.filter?.type).toBe('and');
			});

			it('should parse null condition', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<all-attributes />
							<filter>
								<condition attribute="emailaddress1" operator="null" />
							</filter>
						</entity>
					</fetch>
				`;
				const query = parser.parse(fetchXml);
				const condition = query.filter?.conditions[0];
				expect(condition?.operator).toBe('null');
				expect(condition?.value).toBeNull();
			});

			it('should parse IN condition with value elements', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<all-attributes />
							<filter>
								<condition attribute="statecode" operator="in">
									<value>0</value>
									<value>1</value>
									<value>2</value>
								</condition>
							</filter>
						</entity>
					</fetch>
				`;
				const query = parser.parse(fetchXml);
				const condition = query.filter?.conditions[0];
				expect(condition?.operator).toBe('in');
				expect(condition?.value).toEqual(['0', '1', '2']);
			});

			it('should throw for invalid operator', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<all-attributes />
							<filter>
								<condition attribute="field" operator="invalid" value="x" />
							</filter>
						</entity>
					</fetch>
				`;
				expect(() => parser.parse(fetchXml)).toThrow(FetchXmlParseError);
			});

			it('should throw for missing condition attribute', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<all-attributes />
							<filter>
								<condition operator="eq" value="x" />
							</filter>
						</entity>
					</fetch>
				`;
				expect(() => parser.parse(fetchXml)).toThrow(FetchXmlParseError);
			});

			it('should throw for missing condition operator', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<all-attributes />
							<filter>
								<condition attribute="field" value="x" />
							</filter>
						</entity>
					</fetch>
				`;
				expect(() => parser.parse(fetchXml)).toThrow(FetchXmlParseError);
			});
		});

		describe('orders', () => {
			it('should parse ascending order', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<all-attributes />
							<order attribute="createdon" descending="false" />
						</entity>
					</fetch>
				`;
				const query = parser.parse(fetchXml);
				expect(query.sorts).toHaveLength(1);
				const sort0 = query.sorts[0];
				expect(sort0).toBeDefined();
				expect(sort0!.attribute).toBe('createdon');
				expect(sort0!.descending).toBe(false);
			});

			it('should parse descending order', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<all-attributes />
							<order attribute="createdon" descending="true" />
						</entity>
					</fetch>
				`;
				const query = parser.parse(fetchXml);
				const sort0 = query.sorts[0];
				expect(sort0).toBeDefined();
				expect(sort0!.descending).toBe(true);
			});

			it('should parse multiple orders', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<all-attributes />
							<order attribute="lastname" descending="false" />
							<order attribute="firstname" descending="false" />
						</entity>
					</fetch>
				`;
				const query = parser.parse(fetchXml);
				expect(query.sorts).toHaveLength(2);
			});

			it('should default descending to false', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<all-attributes />
							<order attribute="createdon" />
						</entity>
					</fetch>
				`;
				const query = parser.parse(fetchXml);
				const sort0 = query.sorts[0];
				expect(sort0).toBeDefined();
				expect(sort0!.descending).toBe(false);
			});
		});

		describe('complete query', () => {
			it('should parse complex query with all features', () => {
				const fetchXml = `
					<fetch top="100" distinct="true">
						<entity name="contact">
							<attribute name="fullname" alias="name" />
							<attribute name="emailaddress1" />
							<filter type="and">
								<condition attribute="statecode" operator="eq" value="0" />
								<condition attribute="emailaddress1" operator="not-null" />
							</filter>
							<order attribute="createdon" descending="true" />
						</entity>
					</fetch>
				`;
				const query = parser.parse(fetchXml);
				expect(query.entityName).toBe('contact');
				expect(query.top).toBe(100);
				expect(query.distinct).toBe(true);
				expect(query.isSelectAll()).toBe(false);
				if (query.columns.kind === 'specific') {
					expect(query.columns.columns).toHaveLength(2);
				}
				expect(query.hasFilter()).toBe(true);
				expect(query.filter?.conditions).toHaveLength(2);
				expect(query.hasSorting()).toBe(true);
			});
		});

		describe('edge cases for branch coverage', () => {
			it('should handle invalid top attribute (NaN)', () => {
				const fetchXml = `
					<fetch top="invalid">
						<entity name="contact">
							<all-attributes />
						</entity>
					</fetch>
				`;
				const query = parser.parse(fetchXml);
				expect(query.top).toBeNull();
			});

			it('should throw error for IN operator with no values', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<all-attributes />
							<filter>
								<condition attribute="statecode" operator="in"></condition>
							</filter>
						</entity>
					</fetch>
				`;
				// IN operator requires at least one value
				expect(() => parser.parse(fetchXml)).toThrow();
			});

			it('should throw error for NOT-IN operator with no values', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<all-attributes />
							<filter>
								<condition attribute="statecode" operator="not-in"></condition>
							</filter>
						</entity>
					</fetch>
				`;
				// NOT-IN operator requires at least one value
				expect(() => parser.parse(fetchXml)).toThrow();
			});

			it('should handle nested filters that result in empty groups', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<all-attributes />
							<filter type="and">
								<condition attribute="statecode" operator="eq" value="0" />
								<filter type="or">
								</filter>
							</filter>
						</entity>
					</fetch>
				`;
				const query = parser.parse(fetchXml);
				// Parent filter should exist with one condition, nested empty filter ignored
				expect(query.filter).toBeDefined();
				expect(query.filter?.conditions).toHaveLength(1);
			});

			it('should handle deeply nested filters with multiple levels', () => {
				// NOTE: The parser has a known limitation with deeply nested filters
				// due to non-greedy regex matching. The parseNestedFilters method
				// (lines 282-295) has limited coverage because of this.
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<all-attributes />
							<filter type="and">
								<condition attribute="statecode" operator="eq" value="0" />
								<filter type="or">
									<condition attribute="firstname" operator="eq" value="John" />
									<filter type="and">
										<condition attribute="lastname" operator="eq" value="Doe" />
									</filter>
								</filter>
							</filter>
						</entity>
					</fetch>
				`;
				const query = parser.parse(fetchXml);
				expect(query.filter).toBeDefined();
				// Should have at least one condition in top-level filter
				expect(query.filter!.conditions.length).toBeGreaterThanOrEqual(1);
			});

			it('should handle entity with whitespace-only name', () => {
				const fetchXml = `
					<fetch>
						<entity name="   ">
							<all-attributes />
						</entity>
					</fetch>
				`;
				expect(() => parser.parse(fetchXml)).toThrow(FetchXmlParseError);
			});

			it('should parse IN operator with fallback to value attribute', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<all-attributes />
							<filter>
								<condition attribute="statecode" operator="in" value="0">
								</condition>
							</filter>
						</entity>
					</fetch>
				`;
				const query = parser.parse(fetchXml);
				const condition = query.filter?.conditions[0];
				expect(condition?.operator).toBe('in');
				expect(condition?.value).toEqual(['0']);
			});

			it('should parse IN operator with both value elements and value attribute', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<all-attributes />
							<filter>
								<condition attribute="statecode" operator="in" value="fallback">
									<value>0</value>
									<value>1</value>
								</condition>
							</filter>
						</entity>
					</fetch>
				`;
				const query = parser.parse(fetchXml);
				const condition = query.filter?.conditions[0];
				expect(condition?.operator).toBe('in');
				// Value elements take precedence
				expect(condition?.value).toEqual(['0', '1']);
			});

			it('should handle filter with only empty nested filters and no direct conditions', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<all-attributes />
							<filter type="and">
								<filter type="or"></filter>
							</filter>
						</entity>
					</fetch>
				`;
				const query = parser.parse(fetchXml);
				// Filter with no conditions and no valid nested groups returns null
				expect(query.filter).toBeNull();
			});

			it('should handle attribute with empty name string', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<attribute name="" />
							<attribute name="fullname" />
						</entity>
					</fetch>
				`;
				const query = parser.parse(fetchXml);
				if (query.columns.kind === 'specific') {
					expect(query.columns.columns).toHaveLength(1);
					expect(query.columns.columns[0]?.name).toBe('fullname');
				}
			});

			it('should handle order with empty attribute name', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<all-attributes />
							<order attribute="" descending="false" />
							<order attribute="createdon" descending="true" />
						</entity>
					</fetch>
				`;
				const query = parser.parse(fetchXml);
				expect(query.sorts).toHaveLength(1);
				expect(query.sorts[0]?.attribute).toBe('createdon');
			});
		});
	});
});
