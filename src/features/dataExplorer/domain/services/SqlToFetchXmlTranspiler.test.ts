import { SqlParser } from './SqlParser';
import { SqlToFetchXmlTranspiler } from './SqlToFetchXmlTranspiler';

describe('SqlToFetchXmlTranspiler', () => {
	let parser: SqlParser;
	let transpiler: SqlToFetchXmlTranspiler;

	beforeEach(() => {
		parser = new SqlParser();
		transpiler = new SqlToFetchXmlTranspiler();
	});

	const transpile = (sql: string): string => {
		const ast = parser.parse(sql);
		return transpiler.transpile(ast);
	};

	describe('basic SELECT statements', () => {
		it('should transpile SELECT * FROM entity', () => {
			const fetchXml = transpile('SELECT * FROM account');

			expect(fetchXml).toContain('<fetch>');
			expect(fetchXml).toContain('<entity name="account">');
			expect(fetchXml).toContain('<all-attributes />');
			expect(fetchXml).toContain('</entity>');
			expect(fetchXml).toContain('</fetch>');
		});

		it('should transpile SELECT with specific columns', () => {
			const fetchXml = transpile('SELECT name, revenue FROM account');

			expect(fetchXml).toContain('<attribute name="name" />');
			expect(fetchXml).toContain('<attribute name="revenue" />');
			expect(fetchXml).not.toContain('<all-attributes />');
		});

		it('should transpile SELECT with column alias', () => {
			const fetchXml = transpile('SELECT name AS accountname FROM account');

			expect(fetchXml).toContain('<attribute name="name" alias="accountname" />');
		});
	});

	describe('TOP clause', () => {
		it('should transpile SELECT TOP n', () => {
			const fetchXml = transpile('SELECT TOP 50 * FROM account');

			expect(fetchXml).toContain('<fetch top="50">');
		});

		it('should transpile LIMIT as top', () => {
			const fetchXml = transpile('SELECT * FROM account LIMIT 100');

			expect(fetchXml).toContain('<fetch top="100">');
		});
	});

	describe('WHERE clause - comparison operators', () => {
		it('should transpile equals condition', () => {
			const fetchXml = transpile('SELECT * FROM account WHERE statecode = 0');

			expect(fetchXml).toContain('<filter>');
			expect(fetchXml).toContain('operator="eq"');
			expect(fetchXml).toContain('value="0"');
		});

		it('should transpile not equals condition', () => {
			const fetchXml = transpile('SELECT * FROM account WHERE statecode <> 1');

			expect(fetchXml).toContain('operator="ne"');
		});

		it('should transpile greater than condition', () => {
			const fetchXml = transpile('SELECT * FROM account WHERE revenue > 1000000');

			expect(fetchXml).toContain('operator="gt"');
			expect(fetchXml).toContain('value="1000000"');
		});

		it('should transpile less than condition', () => {
			const fetchXml = transpile('SELECT * FROM account WHERE revenue < 500000');

			expect(fetchXml).toContain('operator="lt"');
		});

		it('should transpile greater than or equal', () => {
			const fetchXml = transpile('SELECT * FROM account WHERE revenue >= 1000000');

			expect(fetchXml).toContain('operator="ge"');
		});

		it('should transpile less than or equal', () => {
			const fetchXml = transpile('SELECT * FROM account WHERE revenue <= 1000000');

			expect(fetchXml).toContain('operator="le"');
		});

		it('should escape XML special characters in string values', () => {
			const fetchXml = transpile("SELECT * FROM account WHERE name = '<test>&\"'");

			expect(fetchXml).toContain('&lt;test&gt;&amp;&quot;');
		});
	});

	describe('WHERE clause - LIKE patterns', () => {
		it('should transpile LIKE with leading wildcard to ends-with', () => {
			const fetchXml = transpile("SELECT * FROM account WHERE name LIKE '%Inc'");

			expect(fetchXml).toContain('operator="ends-with"');
			expect(fetchXml).toContain('value="Inc"');
		});

		it('should transpile LIKE with trailing wildcard to begins-with', () => {
			const fetchXml = transpile("SELECT * FROM account WHERE name LIKE 'Contoso%'");

			expect(fetchXml).toContain('operator="begins-with"');
			expect(fetchXml).toContain('value="Contoso"');
		});

		it('should transpile LIKE with both wildcards to like', () => {
			const fetchXml = transpile("SELECT * FROM account WHERE name LIKE '%test%'");

			expect(fetchXml).toContain('operator="like"');
			expect(fetchXml).toContain('value="%test%"');
		});

		it('should transpile NOT LIKE', () => {
			const fetchXml = transpile("SELECT * FROM account WHERE name NOT LIKE 'Test%'");

			expect(fetchXml).toContain('operator="not-begin-with"');
		});
	});

	describe('WHERE clause - NULL conditions', () => {
		it('should transpile IS NULL', () => {
			const fetchXml = transpile('SELECT * FROM contact WHERE parentcustomerid IS NULL');

			expect(fetchXml).toContain('operator="null"');
		});

		it('should transpile IS NOT NULL', () => {
			const fetchXml = transpile('SELECT * FROM contact WHERE parentcustomerid IS NOT NULL');

			expect(fetchXml).toContain('operator="not-null"');
		});
	});

	describe('WHERE clause - IN conditions', () => {
		it('should transpile IN with numeric values', () => {
			const fetchXml = transpile('SELECT * FROM contact WHERE statecode IN (0, 1)');

			expect(fetchXml).toContain('operator="in"');
			expect(fetchXml).toContain('<value>0</value>');
			expect(fetchXml).toContain('<value>1</value>');
		});

		it('should transpile IN with string values', () => {
			const fetchXml = transpile("SELECT * FROM account WHERE industrycode IN ('1', '2', '3')");

			expect(fetchXml).toContain('operator="in"');
			expect(fetchXml).toContain('<value>1</value>');
		});

		it('should transpile NOT IN', () => {
			const fetchXml = transpile('SELECT * FROM contact WHERE statecode NOT IN (0, 1)');

			expect(fetchXml).toContain('operator="not-in"');
		});
	});

	describe('WHERE clause - logical operators', () => {
		it('should transpile AND conditions', () => {
			const fetchXml = transpile(
				'SELECT * FROM account WHERE statecode = 0 AND revenue > 1000000'
			);

			expect(fetchXml).toContain('<filter type="and">');
		});

		it('should transpile OR conditions', () => {
			const fetchXml = transpile('SELECT * FROM account WHERE statecode = 0 OR statecode = 1');

			expect(fetchXml).toContain('<filter type="or">');
		});

		it('should handle nested conditions', () => {
			const fetchXml = transpile(
				'SELECT * FROM account WHERE (statecode = 0 AND revenue > 1000) OR industrycode = 1'
			);

			expect(fetchXml).toContain('<filter type="or">');
			expect(fetchXml).toContain('<filter type="and">');
		});
	});

	describe('ORDER BY clause', () => {
		it('should transpile ORDER BY ASC', () => {
			const fetchXml = transpile('SELECT * FROM account ORDER BY name ASC');

			expect(fetchXml).toContain('<order attribute="name" descending="false" />');
		});

		it('should transpile ORDER BY DESC', () => {
			const fetchXml = transpile('SELECT * FROM account ORDER BY revenue DESC');

			expect(fetchXml).toContain('<order attribute="revenue" descending="true" />');
		});

		it('should transpile multiple ORDER BY columns', () => {
			const fetchXml = transpile('SELECT * FROM account ORDER BY statecode ASC, name DESC');

			expect(fetchXml).toContain('<order attribute="statecode" descending="false" />');
			expect(fetchXml).toContain('<order attribute="name" descending="true" />');
		});
	});

	describe('JOIN clauses', () => {
		it('should transpile INNER JOIN as link-entity with inner type', () => {
			const fetchXml = transpile(
				'SELECT a.name FROM account a JOIN contact c ON a.primarycontactid = c.contactid'
			);

			expect(fetchXml).toContain('<link-entity name="contact"');
			expect(fetchXml).toContain('link-type="inner"');
		});

		it('should transpile LEFT JOIN as link-entity with outer type', () => {
			const fetchXml = transpile(
				'SELECT a.name FROM account a LEFT JOIN contact c ON a.primarycontactid = c.contactid'
			);

			expect(fetchXml).toContain('<link-entity name="contact"');
			expect(fetchXml).toContain('link-type="outer"');
		});

		it('should include alias in link-entity', () => {
			const fetchXml = transpile(
				'SELECT a.name FROM account a JOIN contact c ON a.primarycontactid = c.contactid'
			);

			expect(fetchXml).toContain('alias="c"');
		});
	});

	describe('complete query transpilation', () => {
		it('should produce valid FetchXML structure', () => {
			const fetchXml = transpile(`
				SELECT TOP 100 name, revenue
				FROM account
				WHERE statecode = 0 AND revenue > 1000000
				ORDER BY revenue DESC
			`);

			// Check overall structure
			expect(fetchXml).toMatch(/^<fetch/);
			expect(fetchXml).toMatch(/<\/fetch>$/);

			// Check all expected elements are present
			expect(fetchXml).toContain('top="100"');
			expect(fetchXml).toContain('<entity name="account">');
			expect(fetchXml).toContain('<attribute name="name"');
			expect(fetchXml).toContain('<attribute name="revenue"');
			expect(fetchXml).toContain('<filter');
			expect(fetchXml).toContain('<order');
		});
	});

	describe('case-insensitive attribute names', () => {
		it('should normalize uppercase column names to lowercase', () => {
			const fetchXml = transpile('SELECT Name, Revenue FROM account');

			expect(fetchXml).toContain('<attribute name="name" />');
			expect(fetchXml).toContain('<attribute name="revenue" />');
			expect(fetchXml).not.toContain('Name');
			expect(fetchXml).not.toContain('Revenue');
		});

		it('should normalize mixed-case column names to lowercase', () => {
			const fetchXml = transpile('SELECT AccountName, TotalRevenue FROM account');

			expect(fetchXml).toContain('<attribute name="accountname" />');
			expect(fetchXml).toContain('<attribute name="totalrevenue" />');
		});

		it('should normalize WHERE clause attribute names to lowercase', () => {
			const fetchXml = transpile('SELECT * FROM account WHERE StateCode = 0');

			expect(fetchXml).toContain('attribute="statecode"');
			expect(fetchXml).not.toContain('StateCode');
		});

		it('should normalize LIKE condition attribute names to lowercase', () => {
			const fetchXml = transpile("SELECT * FROM account WHERE Name LIKE '%test%'");

			expect(fetchXml).toContain('attribute="name"');
		});

		it('should normalize IS NULL attribute names to lowercase', () => {
			const fetchXml = transpile('SELECT * FROM account WHERE ParentAccountId IS NULL');

			expect(fetchXml).toContain('attribute="parentaccountid"');
		});

		it('should normalize IN clause attribute names to lowercase', () => {
			const fetchXml = transpile("SELECT * FROM account WHERE StateCode IN (0, 1)");

			expect(fetchXml).toContain('attribute="statecode"');
		});

		it('should normalize ORDER BY attribute names to lowercase', () => {
			const fetchXml = transpile('SELECT * FROM account ORDER BY CreatedOn DESC');

			expect(fetchXml).toContain('attribute="createdon"');
		});

		it('should normalize JOIN column names to lowercase', () => {
			const fetchXml = transpile(
				'SELECT a.name FROM account a JOIN contact c ON a.PrimaryContactId = c.ContactId'
			);

			expect(fetchXml).toContain('from="contactid"');
			expect(fetchXml).toContain('to="primarycontactid"');
		});

		it('should normalize nested condition attribute names to lowercase', () => {
			const fetchXml = transpile(
				'SELECT * FROM account WHERE StateCode = 0 AND Revenue > 1000'
			);

			expect(fetchXml).toContain('attribute="statecode"');
			expect(fetchXml).toContain('attribute="revenue"');
		});

		it('should preserve column aliases as-is (case-sensitive)', () => {
			const fetchXml = transpile('SELECT Name AS AccountName FROM account');

			expect(fetchXml).toContain('name="name"');
			expect(fetchXml).toContain('alias="AccountName"');
		});
	});
});
