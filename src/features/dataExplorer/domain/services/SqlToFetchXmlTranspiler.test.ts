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

		it('should transpile SELECT with column alias using AS', () => {
			const fetchXml = transpile('SELECT name AS accountname FROM account');

			expect(fetchXml).toContain('<attribute name="name" alias="accountname" />');
		});

		it('should transpile SELECT with column alias without AS', () => {
			const fetchXml = transpile('SELECT name accountname FROM account');

			expect(fetchXml).toContain('<attribute name="name" alias="accountname" />');
		});

		it('should transpile qualified column with alias', () => {
			const fetchXml = transpile('SELECT a.name AS accountname FROM account a');

			expect(fetchXml).toContain('<attribute name="name" alias="accountname" />');
		});

		it('should handle mix of aliased and non-aliased columns', () => {
			const fetchXml = transpile('SELECT name AS accountname, revenue, statecode AS status FROM account');

			expect(fetchXml).toContain('<attribute name="name" alias="accountname" />');
			expect(fetchXml).toContain('<attribute name="revenue" />');
			expect(fetchXml).toContain('<attribute name="statecode" alias="status" />');
		});

		it('should handle unqualified columns with table alias on FROM', () => {
			// Unqualified columns should still be included when table has alias
			const fetchXml = transpile('SELECT firstname, lastname FROM contact c');

			expect(fetchXml).toContain('<attribute name="firstname" />');
			expect(fetchXml).toContain('<attribute name="lastname" />');
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

	describe('case-insensitive entity names', () => {
		it('should normalize uppercase entity name to lowercase', () => {
			const fetchXml = transpile('SELECT * FROM Account');

			expect(fetchXml).toContain('<entity name="account">');
			expect(fetchXml).not.toContain('name="Account"');
		});

		it('should normalize mixed-case entity name to lowercase', () => {
			const fetchXml = transpile('SELECT * FROM SystemUser');

			expect(fetchXml).toContain('<entity name="systemuser">');
		});

		it('should normalize JOIN entity names to lowercase', () => {
			const fetchXml = transpile(
				'SELECT a.name FROM Account a JOIN Contact c ON a.primarycontactid = c.contactid'
			);

			expect(fetchXml).toContain('<entity name="account">');
			expect(fetchXml).toContain('<link-entity name="contact"');
			expect(fetchXml).not.toContain('name="Account"');
			expect(fetchXml).not.toContain('name="Contact"');
		});

		it('should normalize LEFT JOIN entity names to lowercase', () => {
			const fetchXml = transpile(
				'SELECT a.name FROM Account a LEFT JOIN Contact c ON a.primarycontactid = c.contactid'
			);

			expect(fetchXml).toContain('<link-entity name="contact"');
		});
	});

	describe('JOIN column order detection', () => {
		it('should correctly set from/to when link-entity column is on left side of ON', () => {
			// su.systemuserid is from link-entity, c.modifiedby is from parent
			const fetchXml = transpile(
				'SELECT c.firstname FROM contact c INNER JOIN systemuser su ON su.systemuserid = c.modifiedby'
			);

			// from should be systemuserid (from link-entity systemuser)
			// to should be modifiedby (from parent entity contact)
			expect(fetchXml).toContain('from="systemuserid"');
			expect(fetchXml).toContain('to="modifiedby"');
		});

		it('should correctly set from/to when link-entity column is on right side of ON', () => {
			// a.primarycontactid is from parent, c.contactid is from link-entity
			const fetchXml = transpile(
				'SELECT a.name FROM account a JOIN contact c ON a.primarycontactid = c.contactid'
			);

			// from should be contactid (from link-entity contact)
			// to should be primarycontactid (from parent entity account)
			expect(fetchXml).toContain('from="contactid"');
			expect(fetchXml).toContain('to="primarycontactid"');
		});

		it('should handle complex query with JOIN and WHERE', () => {
			const fetchXml = transpile(`
				SELECT TOP 100
				c.firstname, c.lastname, c.createdon, c.modifiedon
				FROM contact c
				INNER JOIN systemuser su ON su.systemuserid = c.modifiedby
				WHERE emailaddress1 = 'test@example.com'
			`);

			// Verify JOIN column order
			expect(fetchXml).toContain('from="systemuserid"');
			expect(fetchXml).toContain('to="modifiedby"');
			expect(fetchXml).toContain('link-type="inner"');
			expect(fetchXml).toContain('<link-entity name="systemuser"');
		});
	});

	describe('qualified columns from main entity', () => {
		it('should include qualified columns that match main entity alias', () => {
			const fetchXml = transpile(
				'SELECT c.firstname, c.lastname FROM contact c'
			);

			expect(fetchXml).toContain('<attribute name="firstname" />');
			expect(fetchXml).toContain('<attribute name="lastname" />');
		});

		it('should include qualified columns in JOIN query', () => {
			const fetchXml = transpile(`
				SELECT c.firstname, c.lastname
				FROM contact c
				JOIN systemuser su ON su.systemuserid = c.modifiedby
			`);

			expect(fetchXml).toContain('<attribute name="firstname" />');
			expect(fetchXml).toContain('<attribute name="lastname" />');
		});

		it('should handle table.* wildcard for main entity', () => {
			const fetchXml = transpile('SELECT c.* FROM contact c');

			expect(fetchXml).toContain('<all-attributes />');
		});
	});

	describe('link-entity columns', () => {
		it('should include link-entity columns inside link-entity element', () => {
			const fetchXml = transpile(`
				SELECT c.firstname, su.domainname
				FROM contact c
				JOIN systemuser su ON su.systemuserid = c.modifiedby
			`);

			// Main entity column should be at entity level
			expect(fetchXml).toMatch(/<entity name="contact">\s*<attribute name="firstname"/);

			// Link-entity column should be inside link-entity
			expect(fetchXml).toMatch(/<link-entity[^>]*>\s*<attribute name="domainname"/);
		});

		it('should handle multiple link-entity columns', () => {
			const fetchXml = transpile(`
				SELECT c.firstname, su.domainname, su.fullname
				FROM contact c
				JOIN systemuser su ON su.systemuserid = c.modifiedby
			`);

			expect(fetchXml).toContain('<attribute name="domainname" />');
			expect(fetchXml).toContain('<attribute name="fullname" />');
		});

		it('should handle link-entity column with alias', () => {
			const fetchXml = transpile(`
				SELECT c.firstname, su.domainname AS username
				FROM contact c
				JOIN systemuser su ON su.systemuserid = c.modifiedby
			`);

			expect(fetchXml).toContain('<attribute name="domainname" alias="username" />');
		});

		it('should handle link-entity wildcard', () => {
			const fetchXml = transpile(`
				SELECT c.firstname, su.*
				FROM contact c
				JOIN systemuser su ON su.systemuserid = c.modifiedby
			`);

			// Link-entity should have all-attributes
			expect(fetchXml).toMatch(/<link-entity[^>]*>\s*<all-attributes/);
		});

		it('should handle mixed main entity and link-entity columns', () => {
			const fetchXml = transpile(`
				SELECT TOP 100
				c.firstname, lastname, createdon, modifiedon, modifiedby, createdby, su.domainname
				FROM contact c
				INNER JOIN systemuser su ON c.modifiedby = su.systemuserid
				WHERE emailaddress1 = 'test@example.com'
			`);

			// Main entity columns
			expect(fetchXml).toContain('<attribute name="firstname" />');
			expect(fetchXml).toContain('<attribute name="lastname" />');
			expect(fetchXml).toContain('<attribute name="createdon" />');
			expect(fetchXml).toContain('<attribute name="modifiedon" />');
			expect(fetchXml).toContain('<attribute name="modifiedby" />');
			expect(fetchXml).toContain('<attribute name="createdby" />');

			// Link-entity column inside link-entity
			expect(fetchXml).toMatch(/<link-entity[^>]*systemuser[^>]*>\s*<attribute name="domainname"/);
		});
	});

	describe('table alias behavior', () => {
		it('should not add alias attribute to main entity (FetchXML does not support it)', () => {
			const fetchXml = transpile('SELECT * FROM contact c');

			// Main entity should NOT have alias attribute
			expect(fetchXml).toContain('<entity name="contact">');
			expect(fetchXml).not.toMatch(/<entity[^>]*alias=/);
		});

		it('should add alias attribute to link-entity when provided', () => {
			const fetchXml = transpile(
				'SELECT c.firstname FROM contact c JOIN systemuser su ON c.modifiedby = su.systemuserid'
			);

			expect(fetchXml).toMatch(/<link-entity[^>]*alias="su"/);
		});

		it('should handle link-entity without alias', () => {
			const fetchXml = transpile(
				'SELECT c.firstname FROM contact c JOIN systemuser ON c.modifiedby = systemuser.systemuserid'
			);

			// Link-entity should not have alias attribute when not provided
			expect(fetchXml).toContain('<link-entity name="systemuser"');
			expect(fetchXml).not.toMatch(/<link-entity[^>]*alias="systemuser"/);
		});
	});

	describe('real-world query scenarios', () => {
		it('should handle contact with systemuser join query', () => {
			const fetchXml = transpile(`
				SELECT TOP 100
				c.FirstName,
				LastName,
				CreatedOn,
				ModifiedOn,
				ModifiedBy,
				CreatedBy,
				su.DomainName
				FROM contact c
				INNER JOIN systemuser su ON c.modifiedby = su.systemuserid
				WHERE emailaddress1 = 'test@example.com'
			`);

			// Verify structure
			expect(fetchXml).toContain('<fetch top="100">');
			expect(fetchXml).toContain('<entity name="contact">');

			// Main entity columns (all lowercase in FetchXML)
			expect(fetchXml).toContain('<attribute name="firstname" />');
			expect(fetchXml).toContain('<attribute name="lastname" />');
			expect(fetchXml).toContain('<attribute name="createdon" />');
			expect(fetchXml).toContain('<attribute name="modifiedon" />');
			expect(fetchXml).toContain('<attribute name="modifiedby" />');
			expect(fetchXml).toContain('<attribute name="createdby" />');

			// Link-entity with correct from/to
			expect(fetchXml).toContain('<link-entity name="systemuser"');
			expect(fetchXml).toContain('from="systemuserid"');
			expect(fetchXml).toContain('to="modifiedby"');
			expect(fetchXml).toContain('link-type="inner"');
			expect(fetchXml).toContain('alias="su"');

			// Link-entity column inside link-entity
			expect(fetchXml).toMatch(/<link-entity[^>]*>\s*<attribute name="domainname"/);

			// Filter
			expect(fetchXml).toContain('attribute="emailaddress1"');
			expect(fetchXml).toContain('operator="eq"');
		});

		it('should handle account with primary contact join', () => {
			const fetchXml = transpile(`
				SELECT a.name, a.revenue, c.fullname, c.emailaddress1
				FROM account a
				LEFT JOIN contact c ON a.primarycontactid = c.contactid
				WHERE a.statecode = 0
				ORDER BY a.revenue DESC
			`);

			// Main entity columns
			expect(fetchXml).toContain('<attribute name="name" />');
			expect(fetchXml).toContain('<attribute name="revenue" />');

			// Link-entity
			expect(fetchXml).toContain('<link-entity name="contact"');
			expect(fetchXml).toContain('from="contactid"');
			expect(fetchXml).toContain('to="primarycontactid"');
			expect(fetchXml).toContain('link-type="outer"');

			// Link-entity columns
			expect(fetchXml).toMatch(/<link-entity[^>]*contact[^>]*>[\s\S]*<attribute name="fullname"/);
			expect(fetchXml).toMatch(/<link-entity[^>]*contact[^>]*>[\s\S]*<attribute name="emailaddress1"/);

			// Order
			expect(fetchXml).toContain('<order attribute="revenue" descending="true"');
		});

		it('should handle query with column aliases for reporting', () => {
			const fetchXml = transpile(`
				SELECT
				name AS AccountName,
				revenue AS TotalRevenue,
				statecode AS Status
				FROM account
				WHERE revenue > 1000000
			`);

			expect(fetchXml).toContain('<attribute name="name" alias="AccountName" />');
			expect(fetchXml).toContain('<attribute name="revenue" alias="TotalRevenue" />');
			expect(fetchXml).toContain('<attribute name="statecode" alias="Status" />');
		});

		it('should handle query with multiple conditions', () => {
			const fetchXml = transpile(`
				SELECT name, revenue
				FROM account
				WHERE statecode = 0 AND revenue > 1000000 AND industrycode IN (1, 2, 3)
				ORDER BY name ASC
			`);

			expect(fetchXml).toContain('<filter type="and">');
			expect(fetchXml).toContain('attribute="statecode"');
			expect(fetchXml).toContain('attribute="revenue"');
			expect(fetchXml).toContain('attribute="industrycode"');
		});
	});

	describe('LEFT JOIN with multiple aliased columns', () => {
		it('should include all main entity columns when using table alias', () => {
			const sql = `SELECT
				o.et_opportunitynumber AS OpportunityNumber,
				o.et_issalesforceoutboundenabled AS SFOutboundEnabled,
				o.et_autoresetfieldcode AS OptyAutoResetCode,
				o.ModifiedOn AS OptyModifiedOn,
				op.et_opportunityproductnumber AS ProductNumber,
				op.et_productid AS ProductLookupId,
				op.et_autoresetfieldcode AS ProductAutoResetCode,
				op.CreatedOn AS ProductCreatedOn,
				op.ModifiedOn AS ProductModifiedOn
			FROM et_salesopportunity o
			LEFT JOIN et_salesopportunityproducts op ON op.et_salesopportunityid = o.et_salesopportunityid
			WHERE o.et_opportunitynumber = 'OPTY00001286'`;

			const fetchXml = transpile(sql);

			// Main entity columns
			expect(fetchXml).toContain('<attribute name="et_opportunitynumber" alias="OpportunityNumber" />');
			expect(fetchXml).toContain('<attribute name="et_issalesforceoutboundenabled" alias="SFOutboundEnabled" />');
			expect(fetchXml).toContain('<attribute name="et_autoresetfieldcode" alias="OptyAutoResetCode" />');
			expect(fetchXml).toContain('<attribute name="modifiedon" alias="OptyModifiedOn" />');

			// Link entity columns
			expect(fetchXml).toContain('<attribute name="et_opportunityproductnumber" alias="ProductNumber" />');
			expect(fetchXml).toContain('<attribute name="et_productid" alias="ProductLookupId" />');
			expect(fetchXml).toContain('<attribute name="et_autoresetfieldcode" alias="ProductAutoResetCode" />');
			expect(fetchXml).toContain('<attribute name="createdon" alias="ProductCreatedOn" />');
			expect(fetchXml).toContain('<attribute name="modifiedon" alias="ProductModifiedOn" />');
		});
	});

	describe('LIKE patterns without wildcards', () => {
		it('should transpile LIKE without wildcards to like operator', () => {
			const fetchXml = transpile("SELECT * FROM account WHERE name LIKE 'Contoso'");

			expect(fetchXml).toContain('operator="like"');
			expect(fetchXml).toContain('value="Contoso"');
		});

		it('should transpile NOT LIKE without wildcards to not-like operator', () => {
			const fetchXml = transpile("SELECT * FROM account WHERE name NOT LIKE 'Test'");

			expect(fetchXml).toContain('operator="not-like"');
			expect(fetchXml).toContain('value="Test"');
		});
	});

	describe('nested conditions - LIKE in logical operators', () => {
		it('should transpile LIKE condition within AND clause', () => {
			const fetchXml = transpile(
				"SELECT * FROM account WHERE statecode = 0 AND name LIKE 'Contoso%'"
			);

			expect(fetchXml).toContain('<filter type="and">');
			expect(fetchXml).toContain('operator="eq"');
			expect(fetchXml).toContain('operator="begins-with"');
		});

		it('should transpile NOT LIKE condition within OR clause', () => {
			const fetchXml = transpile(
				"SELECT * FROM account WHERE statecode = 0 OR name NOT LIKE '%test%'"
			);

			expect(fetchXml).toContain('<filter type="or">');
			expect(fetchXml).toContain('operator="not-like"');
		});

		it('should transpile LIKE with ends-with pattern in nested condition', () => {
			const fetchXml = transpile(
				"SELECT * FROM account WHERE statecode = 0 AND name LIKE '%Inc'"
			);

			expect(fetchXml).toContain('operator="ends-with"');
		});

		it('should transpile NOT LIKE with begins-with pattern in nested condition', () => {
			const fetchXml = transpile(
				"SELECT * FROM account WHERE statecode = 0 AND name NOT LIKE 'Test%'"
			);

			expect(fetchXml).toContain('operator="not-begin-with"');
		});

		it('should transpile NOT LIKE with ends-with pattern in nested condition', () => {
			const fetchXml = transpile(
				"SELECT * FROM account WHERE statecode = 0 AND name NOT LIKE '%Inc'"
			);

			expect(fetchXml).toContain('operator="not-end-with"');
		});

		it('should transpile LIKE without wildcards in nested condition', () => {
			const fetchXml = transpile(
				"SELECT * FROM account WHERE statecode = 0 AND name LIKE 'ExactMatch'"
			);

			expect(fetchXml).toContain('operator="like"');
			expect(fetchXml).toContain('value="ExactMatch"');
		});

		it('should transpile NOT LIKE without wildcards in nested condition', () => {
			const fetchXml = transpile(
				"SELECT * FROM account WHERE statecode = 0 AND name NOT LIKE 'ExactMatch'"
			);

			expect(fetchXml).toContain('operator="not-like"');
		});
	});

	describe('nested conditions - IS NULL in logical operators', () => {
		it('should transpile IS NULL condition within AND clause', () => {
			const fetchXml = transpile(
				'SELECT * FROM account WHERE statecode = 0 AND deleteddate IS NULL'
			);

			expect(fetchXml).toContain('<filter type="and">');
			expect(fetchXml).toContain('operator="null"');
		});

		it('should transpile IS NOT NULL condition within OR clause', () => {
			const fetchXml = transpile(
				'SELECT * FROM account WHERE statecode = 0 OR email IS NOT NULL'
			);

			expect(fetchXml).toContain('<filter type="or">');
			expect(fetchXml).toContain('operator="not-null"');
		});
	});

	describe('nested conditions - IN in logical operators', () => {
		it('should transpile IN condition within AND clause', () => {
			const fetchXml = transpile(
				'SELECT * FROM account WHERE name IS NOT NULL AND statecode IN (0, 1, 2)'
			);

			expect(fetchXml).toContain('<filter type="and">');
			expect(fetchXml).toContain('operator="in"');
		});

		it('should transpile NOT IN condition within OR clause', () => {
			const fetchXml = transpile(
				'SELECT * FROM account WHERE statecode = 0 OR industry NOT IN (1, 2)'
			);

			expect(fetchXml).toContain('operator="not-in"');
		});
	});

	describe('deeply nested logical conditions', () => {
		it('should transpile nested logical conditions', () => {
			const fetchXml = transpile(
				'SELECT * FROM account WHERE (statecode = 0 OR statecode = 1) AND (revenue > 1000 OR industrycode = 1)'
			);

			// Should have nested filters
			expect(fetchXml).toContain('<filter type="and">');
			expect(fetchXml).toContain('<filter type="or">');
		});
	});

	describe('qualified columns in WHERE clause', () => {
		it('should handle qualified column in comparison condition', () => {
			const fetchXml = transpile(
				'SELECT a.name FROM account a WHERE a.statecode = 0'
			);

			expect(fetchXml).toContain('attribute="statecode"');
			expect(fetchXml).toContain('operator="eq"');
		});
	});

	describe('JOIN with ambiguous column references', () => {
		it('should fall back to default column order when neither column matches link-entity', () => {
			// This tests the edge case where neither column can be matched to the join table
			// Using unqualified columns creates this scenario
			const fetchXml = transpile(
				'SELECT name FROM account a JOIN contact ON primarycontactid = contactid'
			);

			// Should still produce valid FetchXML with default column ordering
			expect(fetchXml).toContain('<link-entity name="contact"');
			expect(fetchXml).toContain('from=');
			expect(fetchXml).toContain('to=');
		});
	});

	describe('RIGHT JOIN', () => {
		it('should transpile RIGHT JOIN as inner link-type', () => {
			// Note: Dataverse doesn't support RIGHT JOIN, but the transpiler maps it
			const fetchXml = transpile(
				'SELECT a.name FROM account a RIGHT JOIN contact c ON a.primarycontactid = c.contactid'
			);

			// RIGHT JOIN maps to inner (same as INNER JOIN) in FetchXML
			expect(fetchXml).toContain('<link-entity name="contact"');
			expect(fetchXml).toContain('link-type="inner"');
		});
	});
});
