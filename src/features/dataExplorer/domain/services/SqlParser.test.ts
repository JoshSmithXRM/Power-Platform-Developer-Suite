import { SqlParseError } from '../errors/SqlParseError';
import { SqlParser } from './SqlParser';

describe('SqlParser', () => {
	let parser: SqlParser;

	beforeEach(() => {
		parser = new SqlParser();
	});

	describe('basic SELECT statements', () => {
		it('should parse SELECT * FROM entity', () => {
			const result = parser.parse('SELECT * FROM account');

			expect(result.getEntityName()).toBe('account');
			expect(result.isSelectAll()).toBe(true);
			expect(result.columns.length).toBe(1);
			expect(result.where).toBeNull();
			expect(result.orderBy.length).toBe(0);
		});

		it('should parse SELECT with specific columns', () => {
			const result = parser.parse('SELECT name, revenue, createdon FROM account');

			expect(result.getEntityName()).toBe('account');
			expect(result.isSelectAll()).toBe(false);
			expect(result.columns.length).toBe(3);
			expect(result.columns[0]!.columnName).toBe('name');
			expect(result.columns[1]!.columnName).toBe('revenue');
			expect(result.columns[2]!.columnName).toBe('createdon');
		});

		it('should parse SELECT with column aliases', () => {
			const result = parser.parse('SELECT name AS accountname, revenue total FROM account');

			expect(result.columns[0]!.columnName).toBe('name');
			expect(result.columns[0]!.alias).toBe('accountname');
			expect(result.columns[1]!.columnName).toBe('revenue');
			expect(result.columns[1]!.alias).toBe('total');
		});

		it('should parse SELECT with table alias', () => {
			const result = parser.parse('SELECT * FROM account a');

			expect(result.from.tableName).toBe('account');
			expect(result.from.alias).toBe('a');
		});

		it('should be case-insensitive for keywords', () => {
			const result = parser.parse('select * from account');

			expect(result.getEntityName()).toBe('account');
			expect(result.isSelectAll()).toBe(true);
		});

		it('should tolerate trailing comma in column list', () => {
			const result = parser.parse('SELECT name, revenue, FROM account');

			expect(result.columns.length).toBe(2);
			expect(result.columns[0]!.columnName).toBe('name');
			expect(result.columns[1]!.columnName).toBe('revenue');
			expect(result.getEntityName()).toBe('account');
		});

		it('should tolerate trailing comma with WHERE clause', () => {
			const result = parser.parse("SELECT name, email, FROM contact WHERE statecode = 0");

			expect(result.columns.length).toBe(2);
			expect(result.where).not.toBeNull();
		});
	});

	describe('TOP/LIMIT clauses', () => {
		it('should parse SELECT TOP n', () => {
			const result = parser.parse('SELECT TOP 10 name FROM account');

			expect(result.top).toBe(10);
			expect(result.columns[0]!.columnName).toBe('name');
		});

		it('should parse SELECT with LIMIT', () => {
			const result = parser.parse('SELECT name FROM account LIMIT 50');

			expect(result.top).toBe(50);
		});
	});

	describe('WHERE clauses', () => {
		it('should parse simple equality condition', () => {
			const result = parser.parse("SELECT * FROM account WHERE statecode = 0");

			expect(result.where).not.toBeNull();
			expect(result.where!.kind).toBe('comparison');
		});

		it('should parse string comparison', () => {
			const result = parser.parse("SELECT * FROM account WHERE name = 'Contoso'");

			expect(result.where!.kind).toBe('comparison');
		});

		it('should parse greater than condition', () => {
			const result = parser.parse('SELECT * FROM account WHERE revenue > 1000000');

			expect(result.where!.kind).toBe('comparison');
		});

		it('should parse IS NULL condition', () => {
			const result = parser.parse('SELECT * FROM contact WHERE parentcustomerid IS NULL');

			expect(result.where!.kind).toBe('null');
		});

		it('should parse IS NOT NULL condition', () => {
			const result = parser.parse('SELECT * FROM contact WHERE parentcustomerid IS NOT NULL');

			expect(result.where!.kind).toBe('null');
		});

		it('should parse LIKE condition', () => {
			const result = parser.parse("SELECT * FROM account WHERE name LIKE 'Contoso%'");

			expect(result.where!.kind).toBe('like');
		});

		it('should parse NOT LIKE condition', () => {
			const result = parser.parse("SELECT * FROM account WHERE name NOT LIKE '%test%'");

			expect(result.where!.kind).toBe('like');
		});

		it('should parse IN condition', () => {
			const result = parser.parse('SELECT * FROM contact WHERE statecode IN (0, 1)');

			expect(result.where!.kind).toBe('in');
		});

		it('should parse NOT IN condition', () => {
			const result = parser.parse('SELECT * FROM contact WHERE statecode NOT IN (0, 1, 2)');

			expect(result.where!.kind).toBe('in');
		});

		it('should parse AND condition', () => {
			const result = parser.parse('SELECT * FROM account WHERE statecode = 0 AND revenue > 1000');

			expect(result.where!.kind).toBe('logical');
		});

		it('should parse OR condition', () => {
			const result = parser.parse('SELECT * FROM account WHERE statecode = 0 OR statecode = 1');

			expect(result.where!.kind).toBe('logical');
		});

		it('should parse parenthesized conditions', () => {
			const result = parser.parse(
				'SELECT * FROM account WHERE (statecode = 0 AND revenue > 1000) OR industrycode = 1'
			);

			expect(result.where!.kind).toBe('logical');
		});
	});

	describe('ORDER BY clauses', () => {
		it('should parse ORDER BY ASC', () => {
			const result = parser.parse('SELECT * FROM account ORDER BY name ASC');

			expect(result.orderBy.length).toBe(1);
			expect(result.orderBy[0]!.column.columnName).toBe('name');
			expect(result.orderBy[0]!.direction).toBe('ASC');
		});

		it('should parse ORDER BY DESC', () => {
			const result = parser.parse('SELECT * FROM account ORDER BY revenue DESC');

			expect(result.orderBy.length).toBe(1);
			expect(result.orderBy[0]!.direction).toBe('DESC');
		});

		it('should default to ASC when direction not specified', () => {
			const result = parser.parse('SELECT * FROM account ORDER BY name');

			expect(result.orderBy[0]!.direction).toBe('ASC');
		});

		it('should parse multiple ORDER BY columns', () => {
			const result = parser.parse('SELECT * FROM account ORDER BY statecode ASC, name DESC');

			expect(result.orderBy.length).toBe(2);
			expect(result.orderBy[0]!.column.columnName).toBe('statecode');
			expect(result.orderBy[0]!.direction).toBe('ASC');
			expect(result.orderBy[1]!.column.columnName).toBe('name');
			expect(result.orderBy[1]!.direction).toBe('DESC');
		});
	});

	describe('JOIN clauses', () => {
		it('should parse INNER JOIN', () => {
			const result = parser.parse(
				'SELECT a.name, c.fullname FROM account a JOIN contact c ON a.primarycontactid = c.contactid'
			);

			expect(result.joins.length).toBe(1);
			expect(result.joins[0]!.type).toBe('INNER');
			expect(result.joins[0]!.table.tableName).toBe('contact');
			expect(result.joins[0]!.table.alias).toBe('c');
		});

		it('should parse LEFT JOIN', () => {
			const result = parser.parse(
				'SELECT a.name, c.fullname FROM account a LEFT JOIN contact c ON a.primarycontactid = c.contactid'
			);

			expect(result.joins[0]!.type).toBe('LEFT');
		});

		it('should parse LEFT OUTER JOIN', () => {
			const result = parser.parse(
				'SELECT a.name FROM account a LEFT OUTER JOIN contact c ON a.primarycontactid = c.contactid'
			);

			expect(result.joins[0]!.type).toBe('LEFT');
		});
	});

	describe('qualified column references', () => {
		it('should parse table.column syntax', () => {
			const result = parser.parse('SELECT a.name, a.revenue FROM account a');

			expect(result.columns[0]!.tableName).toBe('a');
			expect(result.columns[0]!.columnName).toBe('name');
			expect(result.columns[1]!.tableName).toBe('a');
			expect(result.columns[1]!.columnName).toBe('revenue');
		});

		it('should parse table.* wildcard', () => {
			const result = parser.parse('SELECT a.* FROM account a');

			expect(result.columns[0]!.tableName).toBe('a');
			expect(result.columns[0]!.isWildcard).toBe(true);
		});
	});

	describe('comments', () => {
		it('should ignore line comments', () => {
			const sql = `
				SELECT * -- this is a comment
				FROM account
			`;
			const result = parser.parse(sql);

			expect(result.getEntityName()).toBe('account');
		});

		it('should ignore block comments', () => {
			const sql = `
				SELECT /* columns */ *
				FROM /* table */ account
			`;
			const result = parser.parse(sql);

			expect(result.getEntityName()).toBe('account');
		});
	});

	describe('error handling', () => {
		it('should throw SqlParseError for invalid SQL', () => {
			expect(() => parser.parse('SELECT')).toThrow(SqlParseError);
		});

		it('should throw error for missing FROM', () => {
			expect(() => parser.parse('SELECT * account')).toThrow(SqlParseError);
		});

		it('should throw error for unexpected tokens', () => {
			// Note: 'SELECT * FROM account INVALID' is valid SQL (INVALID is a table alias)
			// Use double star which is genuinely invalid syntax
			expect(() => parser.parse('SELECT * * FROM account')).toThrow(SqlParseError);
		});

		it('should provide error position', () => {
			try {
				parser.parse('SELECT * FROM');
			} catch (error) {
				expect(error).toBeInstanceOf(SqlParseError);
				const parseError = error as SqlParseError;
				expect(parseError.position).toBeGreaterThan(0);
			}
		});
	});

	describe('complex queries', () => {
		it('should parse a complete query with all clauses', () => {
			const sql = `
				SELECT TOP 100 a.name, a.revenue, c.fullname
				FROM account a
				LEFT JOIN contact c ON a.primarycontactid = c.contactid
				WHERE a.statecode = 0 AND a.revenue > 1000000
				ORDER BY a.revenue DESC, a.name ASC
			`;

			const result = parser.parse(sql);

			expect(result.top).toBe(100);
			expect(result.columns.length).toBe(3);
			expect(result.from.tableName).toBe('account');
			expect(result.from.alias).toBe('a');
			expect(result.joins.length).toBe(1);
			expect(result.where).not.toBeNull();
			expect(result.orderBy.length).toBe(2);
		});
	});

	describe('RIGHT JOIN', () => {
		it('should parse RIGHT JOIN', () => {
			const result = parser.parse(
				'SELECT a.name, c.fullname FROM account a RIGHT JOIN contact c ON a.primarycontactid = c.contactid'
			);

			expect(result.joins[0]!.type).toBe('RIGHT');
		});

		it('should parse RIGHT OUTER JOIN', () => {
			const result = parser.parse(
				'SELECT a.name FROM account a RIGHT OUTER JOIN contact c ON a.contactid = c.contactid'
			);

			expect(result.joins[0]!.type).toBe('RIGHT');
		});
	});

	describe('NULL literal in WHERE clause', () => {
		it('should parse IS NULL condition', () => {
			const result = parser.parse('SELECT * FROM account WHERE deleteddate IS NULL');

			expect(result.where).not.toBeNull();
			expect(result.where!.kind).toBe('null');
		});

		it('should parse IS NOT NULL condition', () => {
			const result = parser.parse('SELECT * FROM account WHERE email IS NOT NULL');

			expect(result.where).not.toBeNull();
		});
	});

	describe('additional error cases', () => {
		it('should throw error for extra tokens after valid SQL', () => {
			// Valid SQL followed by garbage - should fail
			expect(() => parser.parse('SELECT * FROM account WHERE x = 1 GARBAGE')).toThrow(SqlParseError);
		});

		it('should throw error for missing comparison operator', () => {
			expect(() => parser.parse('SELECT * FROM account WHERE name "test"')).toThrow(SqlParseError);
		});

		it('should throw error for missing literal value', () => {
			expect(() => parser.parse('SELECT * FROM account WHERE name =')).toThrow(SqlParseError);
		});
	});
});
