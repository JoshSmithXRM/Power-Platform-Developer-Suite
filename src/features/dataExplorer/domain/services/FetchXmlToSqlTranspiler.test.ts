import { FetchXmlToSqlTranspiler } from './FetchXmlToSqlTranspiler';

describe('FetchXmlToSqlTranspiler', () => {
	let transpiler: FetchXmlToSqlTranspiler;

	beforeEach(() => {
		transpiler = new FetchXmlToSqlTranspiler();
	});

	describe('transpile', () => {
		describe('empty input', () => {
			it('should fail for empty string', () => {
				const result = transpiler.transpile('');

				expect(result.success).toBe(false);
				expect(result.error).toBe('FetchXML cannot be empty');
			});

			it('should fail for whitespace-only string', () => {
				const result = transpiler.transpile('   \n\t  ');

				expect(result.success).toBe(false);
				expect(result.error).toBe('FetchXML cannot be empty');
			});
		});

		describe('basic queries', () => {
			it('should transpile minimal FetchXML', () => {
				const fetchXml = `<fetch><entity name="contact"><all-attributes /></entity></fetch>`;

				const result = transpiler.transpile(fetchXml);

				expect(result.success).toBe(true);
				expect(result.sql).toContain('SELECT');
				expect(result.sql).toContain('*');
				expect(result.sql).toContain('FROM contact');
			});

			it('should transpile FetchXML with specific attributes', () => {
				const fetchXml = `
					<fetch>
						<entity name="account">
							<attribute name="name" />
							<attribute name="revenue" />
						</entity>
					</fetch>
				`;

				const result = transpiler.transpile(fetchXml);

				expect(result.success).toBe(true);
				expect(result.sql).toContain('SELECT');
				expect(result.sql).toContain('name');
				expect(result.sql).toContain('revenue');
				expect(result.sql).toContain('FROM account');
			});

			it('should transpile FetchXML with attribute aliases', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<attribute name="fullname" alias="name" />
						</entity>
					</fetch>
				`;

				const result = transpiler.transpile(fetchXml);

				expect(result.success).toBe(true);
				expect(result.sql).toContain('fullname AS name');
			});
		});

		describe('TOP clause', () => {
			it('should transpile fetch with top attribute', () => {
				const fetchXml = `
					<fetch top="100">
						<entity name="contact">
							<all-attributes />
						</entity>
					</fetch>
				`;

				const result = transpiler.transpile(fetchXml);

				expect(result.success).toBe(true);
				expect(result.sql).toContain('SELECT TOP 100');
			});

			it('should handle fetch without top attribute', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<all-attributes />
						</entity>
					</fetch>
				`;

				const result = transpiler.transpile(fetchXml);

				expect(result.success).toBe(true);
				expect(result.sql).not.toContain('TOP');
			});
		});

		describe('WHERE clause', () => {
			it('should transpile simple equality condition', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<attribute name="fullname" />
							<filter>
								<condition attribute="statecode" operator="eq" value="0" />
							</filter>
						</entity>
					</fetch>
				`;

				const result = transpiler.transpile(fetchXml);

				expect(result.success).toBe(true);
				expect(result.sql).toContain('WHERE statecode = 0');
			});

			it('should transpile inequality conditions', () => {
				const fetchXml = `
					<fetch>
						<entity name="account">
							<attribute name="name" />
							<filter>
								<condition attribute="revenue" operator="gt" value="1000000" />
							</filter>
						</entity>
					</fetch>
				`;

				const result = transpiler.transpile(fetchXml);

				expect(result.success).toBe(true);
				expect(result.sql).toContain('WHERE revenue > 1000000');
			});

			it('should transpile LIKE conditions', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<attribute name="fullname" />
							<filter>
								<condition attribute="fullname" operator="like" value="%Smith%" />
							</filter>
						</entity>
					</fetch>
				`;

				const result = transpiler.transpile(fetchXml);

				expect(result.success).toBe(true);
				expect(result.sql).toContain("LIKE '%Smith%'");
			});

			it('should transpile begins-with conditions', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<attribute name="fullname" />
							<filter>
								<condition attribute="firstname" operator="begins-with" value="John" />
							</filter>
						</entity>
					</fetch>
				`;

				const result = transpiler.transpile(fetchXml);

				expect(result.success).toBe(true);
				expect(result.sql).toContain("LIKE 'John%'");
			});

			it('should transpile ends-with conditions', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<attribute name="fullname" />
							<filter>
								<condition attribute="lastname" operator="ends-with" value="son" />
							</filter>
						</entity>
					</fetch>
				`;

				const result = transpiler.transpile(fetchXml);

				expect(result.success).toBe(true);
				expect(result.sql).toContain("LIKE '%son'");
			});

			it('should transpile IS NULL conditions', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<attribute name="fullname" />
							<filter>
								<condition attribute="emailaddress1" operator="null" />
							</filter>
						</entity>
					</fetch>
				`;

				const result = transpiler.transpile(fetchXml);

				expect(result.success).toBe(true);
				expect(result.sql).toContain('IS NULL');
			});

			it('should transpile IS NOT NULL conditions', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<attribute name="fullname" />
							<filter>
								<condition attribute="emailaddress1" operator="not-null" />
							</filter>
						</entity>
					</fetch>
				`;

				const result = transpiler.transpile(fetchXml);

				expect(result.success).toBe(true);
				expect(result.sql).toContain('IS NOT NULL');
			});

			it('should transpile IN conditions with values', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<attribute name="fullname" />
							<filter>
								<condition attribute="statecode" operator="in">
									<value>0</value>
									<value>1</value>
								</condition>
							</filter>
						</entity>
					</fetch>
				`;

				const result = transpiler.transpile(fetchXml);

				expect(result.success).toBe(true);
				expect(result.sql).toContain('IN (0, 1)');
			});

			it('should transpile AND filters', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<attribute name="fullname" />
							<filter type="and">
								<condition attribute="statecode" operator="eq" value="0" />
								<condition attribute="firstname" operator="eq" value="John" />
							</filter>
						</entity>
					</fetch>
				`;

				const result = transpiler.transpile(fetchXml);

				expect(result.success).toBe(true);
				expect(result.sql).toContain('AND');
				expect(result.sql).toContain('statecode = 0');
				expect(result.sql).toContain("firstname = 'John'");
			});

			it('should transpile OR filters', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<attribute name="fullname" />
							<filter type="or">
								<condition attribute="firstname" operator="eq" value="John" />
								<condition attribute="firstname" operator="eq" value="Jane" />
							</filter>
						</entity>
					</fetch>
				`;

				const result = transpiler.transpile(fetchXml);

				expect(result.success).toBe(true);
				expect(result.sql).toContain('OR');
			});
		});

		describe('JOIN clause', () => {
			it('should transpile inner join link-entity', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<attribute name="fullname" />
							<link-entity name="account" from="accountid" to="parentcustomerid" alias="acc">
								<attribute name="name" />
							</link-entity>
						</entity>
					</fetch>
				`;

				const result = transpiler.transpile(fetchXml);

				expect(result.success).toBe(true);
				expect(result.sql).toContain('JOIN account acc');
				expect(result.sql).toContain('acc.accountid = contact.parentcustomerid');
			});

			it('should transpile outer join link-entity', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<attribute name="fullname" />
							<link-entity name="account" from="accountid" to="parentcustomerid" alias="acc" link-type="outer">
								<attribute name="name" />
							</link-entity>
						</entity>
					</fetch>
				`;

				const result = transpiler.transpile(fetchXml);

				expect(result.success).toBe(true);
				expect(result.sql).toContain('LEFT JOIN account acc');
			});

			it('should include link-entity attributes in SELECT', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<attribute name="fullname" />
							<link-entity name="account" from="accountid" to="parentcustomerid" alias="acc">
								<attribute name="name" alias="accountname" />
							</link-entity>
						</entity>
					</fetch>
				`;

				const result = transpiler.transpile(fetchXml);

				expect(result.success).toBe(true);
				expect(result.sql).toContain('acc.name AS accountname');
			});
		});

		describe('ORDER BY clause', () => {
			it('should transpile ascending order', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<attribute name="fullname" />
							<order attribute="createdon" descending="false" />
						</entity>
					</fetch>
				`;

				const result = transpiler.transpile(fetchXml);

				expect(result.success).toBe(true);
				expect(result.sql).toContain('ORDER BY createdon ASC');
			});

			it('should transpile descending order', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<attribute name="fullname" />
							<order attribute="createdon" descending="true" />
						</entity>
					</fetch>
				`;

				const result = transpiler.transpile(fetchXml);

				expect(result.success).toBe(true);
				expect(result.sql).toContain('ORDER BY createdon DESC');
			});

			it('should transpile multiple order clauses', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<attribute name="fullname" />
							<order attribute="lastname" descending="false" />
							<order attribute="firstname" descending="false" />
						</entity>
					</fetch>
				`;

				const result = transpiler.transpile(fetchXml);

				expect(result.success).toBe(true);
				expect(result.sql).toContain('ORDER BY lastname ASC, firstname ASC');
			});
		});

		describe('warnings for unsupported features', () => {
			it('should warn about aggregate queries', () => {
				const fetchXml = `
					<fetch aggregate="true">
						<entity name="contact">
							<attribute name="contactid" aggregate="count" alias="count" />
						</entity>
					</fetch>
				`;

				const result = transpiler.transpile(fetchXml);

				expect(result.warnings.some((w) => w.feature === 'aggregate')).toBe(true);
			});

			it('should warn about distinct', () => {
				const fetchXml = `
					<fetch distinct="true">
						<entity name="contact">
							<attribute name="fullname" />
						</entity>
					</fetch>
				`;

				const result = transpiler.transpile(fetchXml);

				expect(result.warnings.some((w) => w.feature === 'distinct')).toBe(true);
			});

			it('should warn about paging', () => {
				const fetchXml = `
					<fetch page="2" paging-cookie="cookie">
						<entity name="contact">
							<attribute name="fullname" />
						</entity>
					</fetch>
				`;

				const result = transpiler.transpile(fetchXml);

				expect(result.warnings.some((w) => w.feature === 'paging')).toBe(true);
			});

			it('should warn about aggregate functions', () => {
				const fetchXml = `
					<fetch>
						<entity name="account">
							<attribute name="revenue" aggregate="sum" alias="totalrevenue" />
						</entity>
					</fetch>
				`;

				const result = transpiler.transpile(fetchXml);

				expect(result.warnings.some((w) => w.feature === 'aggregate-functions')).toBe(true);
			});

			it('should warn about groupby', () => {
				const fetchXml = `
					<fetch aggregate="true">
						<entity name="contact">
							<attribute name="statecode" groupby="true" alias="state" />
							<attribute name="contactid" aggregate="count" alias="count" />
						</entity>
					</fetch>
				`;

				const result = transpiler.transpile(fetchXml);

				expect(result.warnings.some((w) => w.feature === 'groupby')).toBe(true);
			});
		});

		describe('complex queries', () => {
			it('should transpile complex production-like FetchXML', () => {
				const fetchXml = `
					<fetch top="50">
						<entity name="opportunity">
							<attribute name="name" />
							<attribute name="estimatedvalue" />
							<attribute name="customerid" />
							<link-entity name="account" from="accountid" to="customerid" alias="customer" link-type="outer">
								<attribute name="name" alias="customername" />
							</link-entity>
							<filter type="and">
								<condition attribute="statecode" operator="eq" value="0" />
								<condition attribute="estimatedvalue" operator="ge" value="10000" />
							</filter>
							<order attribute="estimatedvalue" descending="true" />
						</entity>
					</fetch>
				`;

				const result = transpiler.transpile(fetchXml);

				expect(result.success).toBe(true);
				expect(result.sql).toContain('SELECT TOP 50');
				expect(result.sql).toContain('FROM opportunity');
				expect(result.sql).toContain('LEFT JOIN account customer');
				expect(result.sql).toContain('WHERE');
				expect(result.sql).toContain('statecode = 0');
				expect(result.sql).toContain('estimatedvalue >= 10000');
				expect(result.sql).toContain('ORDER BY estimatedvalue DESC');
			});
		});

		describe('error handling', () => {
			it('should fail when entity name is missing', () => {
				const fetchXml = `<fetch><entity><attribute name="test" /></entity></fetch>`;

				const result = transpiler.transpile(fetchXml);

				expect(result.success).toBe(false);
				expect(result.error).toContain('Could not find entity name');
			});
		});

		describe('value formatting', () => {
			it('should format numeric values without quotes', () => {
				const fetchXml = `
					<fetch>
						<entity name="account">
							<attribute name="name" />
							<filter>
								<condition attribute="revenue" operator="eq" value="1000000" />
							</filter>
						</entity>
					</fetch>
				`;

				const result = transpiler.transpile(fetchXml);

				expect(result.success).toBe(true);
				expect(result.sql).toContain('revenue = 1000000');
				expect(result.sql).not.toContain("revenue = '1000000'");
			});

			it('should format string values with quotes', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<attribute name="fullname" />
							<filter>
								<condition attribute="firstname" operator="eq" value="John" />
							</filter>
						</entity>
					</fetch>
				`;

				const result = transpiler.transpile(fetchXml);

				expect(result.success).toBe(true);
				expect(result.sql).toContain("firstname = 'John'");
			});

			it('should escape single quotes in string values', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<attribute name="fullname" />
							<filter>
								<condition attribute="lastname" operator="eq" value="O'Brien" />
							</filter>
						</entity>
					</fetch>
				`;

				const result = transpiler.transpile(fetchXml);

				expect(result.success).toBe(true);
				expect(result.sql).toContain("O''Brien");
			});
		});
	});
});
