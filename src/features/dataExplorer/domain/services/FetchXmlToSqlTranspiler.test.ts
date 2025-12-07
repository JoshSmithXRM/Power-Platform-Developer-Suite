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

		describe('aggregate functions', () => {
			it('should transpile COUNT(*)', () => {
				const fetchXml = `
					<fetch aggregate="true">
						<entity name="account">
							<attribute name="accountid" aggregate="count" alias="cnt" />
						</entity>
					</fetch>
				`;

				const result = transpiler.transpile(fetchXml);

				expect(result.success).toBe(true);
				expect(result.sql).toContain('COUNT(*)');
				expect(result.sql).toContain('AS cnt');
			});

			it('should transpile SUM', () => {
				const fetchXml = `
					<fetch aggregate="true">
						<entity name="account">
							<attribute name="revenue" aggregate="sum" alias="total" />
						</entity>
					</fetch>
				`;

				const result = transpiler.transpile(fetchXml);

				expect(result.success).toBe(true);
				expect(result.sql).toContain('SUM(revenue)');
				expect(result.sql).toContain('AS total');
			});

			it('should transpile AVG', () => {
				const fetchXml = `
					<fetch aggregate="true">
						<entity name="account">
							<attribute name="revenue" aggregate="avg" alias="average" />
						</entity>
					</fetch>
				`;

				const result = transpiler.transpile(fetchXml);

				expect(result.success).toBe(true);
				expect(result.sql).toContain('AVG(revenue)');
				expect(result.sql).toContain('AS average');
			});

			it('should transpile MIN and MAX', () => {
				const fetchXml = `
					<fetch aggregate="true">
						<entity name="account">
							<attribute name="revenue" aggregate="min" alias="minrev" />
							<attribute name="revenue" aggregate="max" alias="maxrev" />
						</entity>
					</fetch>
				`;

				const result = transpiler.transpile(fetchXml);

				expect(result.success).toBe(true);
				expect(result.sql).toContain('MIN(revenue)');
				expect(result.sql).toContain('MAX(revenue)');
			});

			it('should transpile COUNT(column) with countcolumn', () => {
				const fetchXml = `
					<fetch aggregate="true">
						<entity name="contact">
							<attribute name="emailaddress1" aggregate="countcolumn" alias="emailcount" />
						</entity>
					</fetch>
				`;

				const result = transpiler.transpile(fetchXml);

				expect(result.success).toBe(true);
				expect(result.sql).toContain('COUNT(emailaddress1)');
				expect(result.sql).toContain('AS emailcount');
			});

			it('should transpile COUNT(*) and SUM together', () => {
				const fetchXml = `
					<fetch aggregate="true">
						<entity name="account">
							<attribute name="accountid" aggregate="count" alias="cnt" />
							<attribute name="revenue" aggregate="sum" alias="total" />
						</entity>
					</fetch>
				`;

				const result = transpiler.transpile(fetchXml);

				expect(result.success).toBe(true);
				expect(result.sql).toContain('COUNT(*)');
				expect(result.sql).toContain('SUM(revenue)');
				expect(result.sql).toContain('AS cnt');
				expect(result.sql).toContain('AS total');
			});

			it('should transpile COUNT(DISTINCT column)', () => {
				const fetchXml = `
					<fetch aggregate="true">
						<entity name="contact">
							<attribute name="parentcustomerid" aggregate="countcolumn" distinct="true" alias="uniqueaccounts" />
						</entity>
					</fetch>
				`;

				const result = transpiler.transpile(fetchXml);

				expect(result.success).toBe(true);
				expect(result.sql).toContain('COUNT(DISTINCT parentcustomerid)');
			});
		});

		describe('GROUP BY clause', () => {
			it('should transpile GROUP BY with aggregates', () => {
				const fetchXml = `
					<fetch aggregate="true">
						<entity name="contact">
							<attribute name="statecode" groupby="true" alias="state" />
							<attribute name="contactid" aggregate="count" alias="count" />
						</entity>
					</fetch>
				`;

				const result = transpiler.transpile(fetchXml);

				expect(result.success).toBe(true);
				expect(result.sql).toContain('statecode AS state');
				expect(result.sql).toContain('COUNT(*)');
				expect(result.sql).toContain('GROUP BY statecode');
			});

			it('should transpile multiple GROUP BY columns', () => {
				const fetchXml = `
					<fetch aggregate="true">
						<entity name="account">
							<attribute name="statecode" groupby="true" />
							<attribute name="industrycode" groupby="true" />
							<attribute name="accountid" aggregate="count" alias="cnt" />
						</entity>
					</fetch>
				`;

				const result = transpiler.transpile(fetchXml);

				expect(result.success).toBe(true);
				expect(result.sql).toContain('GROUP BY statecode, industrycode');
			});
		});

		describe('DISTINCT clause', () => {
			it('should transpile DISTINCT', () => {
				const fetchXml = `
					<fetch distinct="true">
						<entity name="contact">
							<attribute name="fullname" />
						</entity>
					</fetch>
				`;

				const result = transpiler.transpile(fetchXml);

				expect(result.success).toBe(true);
				expect(result.sql).toContain('SELECT DISTINCT');
			});
		});

		describe('warnings for unsupported features', () => {
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

			it('should warn about count attribute', () => {
				const fetchXml = `
					<fetch count="100">
						<entity name="contact">
							<attribute name="fullname" />
						</entity>
					</fetch>
				`;

				const result = transpiler.transpile(fetchXml);

				expect(result.warnings.some((w) => w.feature === 'count')).toBe(true);
			});
		});

		describe('additional operators', () => {
			it('should transpile ne (not equal) operator', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<attribute name="fullname" />
							<filter>
								<condition attribute="statecode" operator="ne" value="1" />
							</filter>
						</entity>
					</fetch>
				`;

				const result = transpiler.transpile(fetchXml);

				expect(result.success).toBe(true);
				expect(result.sql).toContain('statecode <> 1');
			});

			it('should transpile lt (less than) operator', () => {
				const fetchXml = `
					<fetch>
						<entity name="account">
							<attribute name="name" />
							<filter>
								<condition attribute="revenue" operator="lt" value="50000" />
							</filter>
						</entity>
					</fetch>
				`;

				const result = transpiler.transpile(fetchXml);

				expect(result.success).toBe(true);
				expect(result.sql).toContain('revenue < 50000');
			});

			it('should transpile le (less than or equal) operator', () => {
				const fetchXml = `
					<fetch>
						<entity name="account">
							<attribute name="name" />
							<filter>
								<condition attribute="numberofemployees" operator="le" value="100" />
							</filter>
						</entity>
					</fetch>
				`;

				const result = transpiler.transpile(fetchXml);

				expect(result.success).toBe(true);
				expect(result.sql).toContain('numberofemployees <= 100');
			});

			it('should transpile not-like operator', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<attribute name="fullname" />
							<filter>
								<condition attribute="emailaddress1" operator="not-like" value="%spam%" />
							</filter>
						</entity>
					</fetch>
				`;

				const result = transpiler.transpile(fetchXml);

				expect(result.success).toBe(true);
				expect(result.sql).toContain("NOT LIKE '%spam%'");
			});

			it('should transpile not-begin-with operator', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<attribute name="fullname" />
							<filter>
								<condition attribute="firstname" operator="not-begin-with" value="Test" />
							</filter>
						</entity>
					</fetch>
				`;

				const result = transpiler.transpile(fetchXml);

				expect(result.success).toBe(true);
				expect(result.sql).toContain("NOT LIKE 'Test%'");
			});

			it('should transpile not-end-with operator', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<attribute name="fullname" />
							<filter>
								<condition attribute="lastname" operator="not-end-with" value="Test" />
							</filter>
						</entity>
					</fetch>
				`;

				const result = transpiler.transpile(fetchXml);

				expect(result.success).toBe(true);
				expect(result.sql).toContain("NOT LIKE '%Test'");
			});

			it('should transpile not-in operator with values', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<attribute name="fullname" />
							<filter>
								<condition attribute="statecode" operator="not-in">
									<value>1</value>
									<value>2</value>
								</condition>
							</filter>
						</entity>
					</fetch>
				`;

				const result = transpiler.transpile(fetchXml);

				expect(result.success).toBe(true);
				expect(result.sql).toContain('NOT IN (1, 2)');
			});

			it('should transpile not-in operator with single value', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<attribute name="fullname" />
							<filter>
								<condition attribute="statecode" operator="not-in" value="1" />
							</filter>
						</entity>
					</fetch>
				`;

				const result = transpiler.transpile(fetchXml);

				expect(result.success).toBe(true);
				expect(result.sql).toContain('NOT IN (1)');
			});

			it('should handle unknown operators with basic format', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<attribute name="fullname" />
							<filter>
								<condition attribute="field" operator="custom-op" value="test" />
							</filter>
						</entity>
					</fetch>
				`;

				const result = transpiler.transpile(fetchXml);

				expect(result.success).toBe(true);
				expect(result.sql).toContain("field CUSTOM-OP 'test'");
			});
		});

		describe('link entity variations', () => {
			it('should handle link-entity with all-attributes', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<attribute name="fullname" />
							<link-entity name="account" from="accountid" to="parentcustomerid" alias="acc">
								<all-attributes />
							</link-entity>
						</entity>
					</fetch>
				`;

				const result = transpiler.transpile(fetchXml);

				expect(result.success).toBe(true);
				expect(result.sql).toContain('acc.*');
			});

			it('should handle link-entity without alias', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<attribute name="fullname" />
							<link-entity name="account" from="accountid" to="parentcustomerid">
								<attribute name="name" />
							</link-entity>
						</entity>
					</fetch>
				`;

				const result = transpiler.transpile(fetchXml);

				expect(result.success).toBe(true);
				expect(result.sql).toContain('account.name');
				expect(result.sql).toContain('account.accountid = contact.parentcustomerid');
			});

			it('should handle main entity all-attributes with link-entity', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<all-attributes />
							<link-entity name="account" from="accountid" to="parentcustomerid" alias="acc">
								<attribute name="name" />
							</link-entity>
						</entity>
					</fetch>
				`;

				const result = transpiler.transpile(fetchXml);

				expect(result.success).toBe(true);
				expect(result.sql).toContain('*, acc.name');
			});
		});

		describe('nested filters', () => {
			it('should parse nested filters (simplified implementation)', () => {
				// Note: Current implementation has a simplified nested filter handling
				// Nested conditions are parsed but may appear in main filter
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<attribute name="fullname" />
							<filter type="and">
								<condition attribute="statecode" operator="eq" value="0" />
								<filter type="or">
									<condition attribute="firstname" operator="eq" value="John" />
									<condition attribute="firstname" operator="eq" value="Jane" />
								</filter>
							</filter>
						</entity>
					</fetch>
				`;

				const result = transpiler.transpile(fetchXml);

				expect(result.success).toBe(true);
				expect(result.sql).toContain('WHERE');
				expect(result.sql).toContain('statecode = 0');
				// Verify nested filter conditions are included (even if flattened)
				expect(result.sql).toContain('firstname');
			});
		});

		describe('edge cases', () => {
			it('should handle in operator with no values element', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<attribute name="fullname" />
							<filter>
								<condition attribute="statecode" operator="in" value="0" />
							</filter>
						</entity>
					</fetch>
				`;

				const result = transpiler.transpile(fetchXml);

				expect(result.success).toBe(true);
				expect(result.sql).toContain('IN (0)');
			});

			it('should handle condition with no value', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<attribute name="fullname" />
							<filter>
								<condition attribute="field" operator="eq" />
							</filter>
						</entity>
					</fetch>
				`;

				const result = transpiler.transpile(fetchXml);

				expect(result.success).toBe(true);
				expect(result.sql).toContain("field = ''");
			});

			it('should handle entity with all-attributes that cannot be parsed normally', () => {
				// Entity tag on same line with closing - triggers fallback regex
				const fetchXml = `<fetch><entity name="contact"/></fetch>`;

				const result = transpiler.transpile(fetchXml);

				// Should succeed even with self-closing entity
				expect(result.success).toBe(true);
				expect(result.sql).toContain('FROM contact');
			});

			it('should handle fetch with deeply nested filters', () => {
				// Multiple levels of nesting
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<attribute name="fullname" />
							<filter type="and">
								<filter type="or">
									<condition attribute="firstname" operator="eq" value="John" />
								</filter>
							</filter>
						</entity>
					</fetch>
				`;

				const result = transpiler.transpile(fetchXml);

				expect(result.success).toBe(true);
				expect(result.sql).toContain('WHERE');
			});

			it('should handle filter with empty nested filter', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<attribute name="fullname" />
							<filter type="and">
								<condition attribute="statecode" operator="eq" value="0" />
								<filter type="or"></filter>
							</filter>
						</entity>
					</fetch>
				`;

				const result = transpiler.transpile(fetchXml);

				expect(result.success).toBe(true);
				expect(result.sql).toContain('statecode = 0');
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

			it('should handle non-Error exceptions gracefully', () => {
				// Test the catch block with a non-Error exception
				const transpilerWithError = new FetchXmlToSqlTranspiler();
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const proto = Object.getPrototypeOf(transpilerWithError) as any;
				const originalParseLinkEntities = proto.parseLinkEntities;

				// Override to throw a non-Error
				proto.parseLinkEntities = () => {
					throw 'String error'; // Non-Error exception
				};

				const result = transpilerWithError.transpile('<fetch><entity name="account"><all-attributes/></entity></fetch>');

				expect(result.success).toBe(false);
				expect(result.error).toBe('Transpilation failed');

				// Restore original method
				proto.parseLinkEntities = originalParseLinkEntities;
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

		describe('branch coverage edge cases', () => {
			it('should handle begins-with without value', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<attribute name="fullname" />
							<filter>
								<condition attribute="firstname" operator="begins-with" />
							</filter>
						</entity>
					</fetch>
				`;

				const result = transpiler.transpile(fetchXml);

				expect(result.success).toBe(true);
				expect(result.sql).toContain("LIKE '%'");
			});

			it('should handle ends-with without value', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<attribute name="fullname" />
							<filter>
								<condition attribute="lastname" operator="ends-with" />
							</filter>
						</entity>
					</fetch>
				`;

				const result = transpiler.transpile(fetchXml);

				expect(result.success).toBe(true);
				expect(result.sql).toContain("LIKE '%'");
			});

			it('should handle not-begin-with without value', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<attribute name="fullname" />
							<filter>
								<condition attribute="firstname" operator="not-begin-with" />
							</filter>
						</entity>
					</fetch>
				`;

				const result = transpiler.transpile(fetchXml);

				expect(result.success).toBe(true);
				expect(result.sql).toContain("NOT LIKE '%'");
			});

			it('should handle not-end-with without value', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<attribute name="fullname" />
							<filter>
								<condition attribute="lastname" operator="not-end-with" />
							</filter>
						</entity>
					</fetch>
				`;

				const result = transpiler.transpile(fetchXml);

				expect(result.success).toBe(true);
				expect(result.sql).toContain("NOT LIKE '%'");
			});

			it('should skip link-entity missing required from attribute', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<attribute name="fullname" />
							<link-entity name="account" to="parentcustomerid">
								<attribute name="name" />
							</link-entity>
						</entity>
					</fetch>
				`;

				const result = transpiler.transpile(fetchXml);

				expect(result.success).toBe(true);
				// Link entity should be skipped, no JOIN in output
				expect(result.sql).not.toContain('JOIN');
			});

			it('should skip link-entity missing required to attribute', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<attribute name="fullname" />
							<link-entity name="account" from="accountid">
								<attribute name="name" />
							</link-entity>
						</entity>
					</fetch>
				`;

				const result = transpiler.transpile(fetchXml);

				expect(result.success).toBe(true);
				expect(result.sql).not.toContain('JOIN');
			});

			it('should skip link-entity missing name attribute', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<attribute name="fullname" />
							<link-entity from="accountid" to="parentcustomerid">
								<attribute name="name" />
							</link-entity>
						</entity>
					</fetch>
				`;

				const result = transpiler.transpile(fetchXml);

				expect(result.success).toBe(true);
				expect(result.sql).not.toContain('JOIN');
			});

			it('should skip condition missing attribute', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<attribute name="fullname" />
							<filter>
								<condition operator="eq" value="test" />
							</filter>
						</entity>
					</fetch>
				`;

				const result = transpiler.transpile(fetchXml);

				expect(result.success).toBe(true);
				// Condition should be skipped
				expect(result.sql).not.toContain('WHERE');
			});

			it('should skip condition missing operator', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<attribute name="fullname" />
							<filter>
								<condition attribute="firstname" value="test" />
							</filter>
						</entity>
					</fetch>
				`;

				const result = transpiler.transpile(fetchXml);

				expect(result.success).toBe(true);
				expect(result.sql).not.toContain('WHERE');
			});

			it('should handle filter with only invalid conditions', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<attribute name="fullname" />
							<filter>
								<condition operator="eq" value="test" />
								<condition attribute="name" />
							</filter>
						</entity>
					</fetch>
				`;

				const result = transpiler.transpile(fetchXml);

				expect(result.success).toBe(true);
				// No valid conditions, no WHERE clause
				expect(result.sql).not.toContain('WHERE');
			});

			it('should handle attribute without name in link-entity', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<attribute name="fullname" />
							<link-entity name="account" from="accountid" to="parentcustomerid" alias="acc">
								<attribute alias="somealias" />
							</link-entity>
						</entity>
					</fetch>
				`;

				const result = transpiler.transpile(fetchXml);

				expect(result.success).toBe(true);
				// Attribute without name should be skipped
				expect(result.sql).toContain('JOIN');
				expect(result.sql).not.toContain('somealias');
			});

			it('should handle attribute without name in main entity', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<attribute alias="myalias" />
						</entity>
					</fetch>
				`;

				const result = transpiler.transpile(fetchXml);

				expect(result.success).toBe(true);
				// Empty column list should result in SELECT *
				expect(result.sql).toContain('SELECT *');
			});
		});
	});
});
