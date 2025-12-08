import { SqlParseError } from '../errors/SqlParseError';
import { SqlAggregateColumn, SqlColumnRef } from '../valueObjects/SqlAst';
import { SqlParser } from './SqlParser';

/**
 * Helper to assert and cast column to SqlColumnRef.
 * Use this when testing regular (non-aggregate) columns.
 */
function asColumnRef(column: unknown): SqlColumnRef {
	expect(column).toBeInstanceOf(SqlColumnRef);
	return column as SqlColumnRef;
}

/**
 * Helper to assert and cast column to SqlAggregateColumn.
 * Use this when testing aggregate columns.
 */
function asAggregateColumn(column: unknown): SqlAggregateColumn {
	expect(column).toBeInstanceOf(SqlAggregateColumn);
	return column as SqlAggregateColumn;
}

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
			expect(asColumnRef(result.columns[0]).columnName).toBe('name');
			expect(asColumnRef(result.columns[1]).columnName).toBe('revenue');
			expect(asColumnRef(result.columns[2]).columnName).toBe('createdon');
		});

		it('should parse SELECT with column aliases', () => {
			const result = parser.parse('SELECT name AS accountname, revenue total FROM account');

			expect(asColumnRef(result.columns[0]).columnName).toBe('name');
			expect(asColumnRef(result.columns[0]).alias).toBe('accountname');
			expect(asColumnRef(result.columns[1]).columnName).toBe('revenue');
			expect(asColumnRef(result.columns[1]).alias).toBe('total');
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
			expect(asColumnRef(result.columns[0]).columnName).toBe('name');
			expect(asColumnRef(result.columns[1]).columnName).toBe('revenue');
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
			expect(asColumnRef(result.columns[0]).columnName).toBe('name');
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

			expect(asColumnRef(result.columns[0]).tableName).toBe('a');
			expect(asColumnRef(result.columns[0]).columnName).toBe('name');
			expect(asColumnRef(result.columns[1]).tableName).toBe('a');
			expect(asColumnRef(result.columns[1]).columnName).toBe('revenue');
		});

		it('should parse table.* wildcard', () => {
			const result = parser.parse('SELECT a.* FROM account a');

			expect(asColumnRef(result.columns[0]).tableName).toBe('a');
			expect(asColumnRef(result.columns[0]).isWildcard).toBe(true);
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

	describe('DISTINCT keyword', () => {
		it('should parse SELECT DISTINCT', () => {
			const result = parser.parse('SELECT DISTINCT name FROM account');

			expect(result.distinct).toBe(true);
			expect(result.columns.length).toBe(1);
			expect(asColumnRef(result.columns[0]).columnName).toBe('name');
		});

		it('should parse SELECT DISTINCT with multiple columns', () => {
			const result = parser.parse('SELECT DISTINCT name, statecode FROM account');

			expect(result.distinct).toBe(true);
			expect(result.columns.length).toBe(2);
		});

		it('should parse SELECT without DISTINCT', () => {
			const result = parser.parse('SELECT name FROM account');

			expect(result.distinct).toBe(false);
		});

		it('should parse SELECT DISTINCT TOP n', () => {
			const result = parser.parse('SELECT DISTINCT TOP 10 name FROM account');

			expect(result.distinct).toBe(true);
			expect(result.top).toBe(10);
		});
	});

	describe('aggregate functions', () => {
		it('should parse COUNT(*)', () => {
			const result = parser.parse('SELECT COUNT(*) FROM account');

			expect(result.columns.length).toBe(1);
			const agg = asAggregateColumn(result.columns[0]);
			expect(agg.func).toBe('COUNT');
			expect(agg.isCountAll()).toBe(true);
			expect(agg.isDistinct).toBe(false);
		});

		it('should parse COUNT(column)', () => {
			const result = parser.parse('SELECT COUNT(name) FROM account');

			const agg = asAggregateColumn(result.columns[0]);
			expect(agg.func).toBe('COUNT');
			expect(agg.isCountAll()).toBe(false);
			expect(agg.column).not.toBeNull();
			expect(agg.column!.columnName).toBe('name');
		});

		it('should parse COUNT(DISTINCT column)', () => {
			const result = parser.parse('SELECT COUNT(DISTINCT statecode) FROM account');

			const agg = asAggregateColumn(result.columns[0]);
			expect(agg.func).toBe('COUNT');
			expect(agg.isDistinct).toBe(true);
			expect(agg.column!.columnName).toBe('statecode');
		});

		it('should parse SUM(column)', () => {
			const result = parser.parse('SELECT SUM(revenue) FROM opportunity');

			const agg = asAggregateColumn(result.columns[0]);
			expect(agg.func).toBe('SUM');
			expect(agg.column!.columnName).toBe('revenue');
		});

		it('should parse AVG(column)', () => {
			const result = parser.parse('SELECT AVG(revenue) FROM opportunity');

			const agg = asAggregateColumn(result.columns[0]);
			expect(agg.func).toBe('AVG');
		});

		it('should parse MIN(column)', () => {
			const result = parser.parse('SELECT MIN(createdon) FROM account');

			const agg = asAggregateColumn(result.columns[0]);
			expect(agg.func).toBe('MIN');
		});

		it('should parse MAX(column)', () => {
			const result = parser.parse('SELECT MAX(createdon) FROM account');

			const agg = asAggregateColumn(result.columns[0]);
			expect(agg.func).toBe('MAX');
		});

		it('should parse aggregate with alias', () => {
			const result = parser.parse('SELECT COUNT(*) AS total FROM account');

			const agg = asAggregateColumn(result.columns[0]);
			expect(agg.alias).toBe('total');
		});

		it('should parse aggregate with alias without AS', () => {
			const result = parser.parse('SELECT COUNT(*) total FROM account');

			const agg = asAggregateColumn(result.columns[0]);
			expect(agg.alias).toBe('total');
		});

		it('should parse mixed regular and aggregate columns', () => {
			// Note: 'total' instead of 'count' to avoid keyword case normalization
			const result = parser.parse('SELECT statecode, COUNT(*) AS total FROM account');

			expect(result.columns.length).toBe(2);
			expect(asColumnRef(result.columns[0]).columnName).toBe('statecode');
			const agg = asAggregateColumn(result.columns[1]);
			expect(agg.func).toBe('COUNT');
			expect(agg.alias).toBe('total');
		});

		it('should detect hasAggregates correctly', () => {
			const withAgg = parser.parse('SELECT COUNT(*) FROM account');
			const withoutAgg = parser.parse('SELECT name FROM account');

			expect(withAgg.hasAggregates()).toBe(true);
			expect(withoutAgg.hasAggregates()).toBe(false);
		});
	});

	describe('GROUP BY clause', () => {
		it('should parse GROUP BY single column', () => {
			const result = parser.parse('SELECT statecode, COUNT(*) FROM account GROUP BY statecode');

			expect(result.groupBy.length).toBe(1);
			expect(result.groupBy[0]!.columnName).toBe('statecode');
		});

		it('should parse GROUP BY multiple columns', () => {
			const result = parser.parse(
				'SELECT statecode, statuscode, COUNT(*) FROM account GROUP BY statecode, statuscode'
			);

			expect(result.groupBy.length).toBe(2);
			expect(result.groupBy[0]!.columnName).toBe('statecode');
			expect(result.groupBy[1]!.columnName).toBe('statuscode');
		});

		it('should parse GROUP BY with ORDER BY', () => {
			const result = parser.parse(
				'SELECT statecode, COUNT(*) AS cnt FROM account GROUP BY statecode ORDER BY cnt DESC'
			);

			expect(result.groupBy.length).toBe(1);
			expect(result.orderBy.length).toBe(1);
		});

		it('should parse GROUP BY with WHERE', () => {
			const result = parser.parse(
				'SELECT statecode, COUNT(*) FROM account WHERE revenue > 1000 GROUP BY statecode'
			);

			expect(result.where).not.toBeNull();
			expect(result.groupBy.length).toBe(1);
		});

		it('should parse GROUP BY with qualified column', () => {
			const result = parser.parse('SELECT a.statecode, COUNT(*) FROM account a GROUP BY a.statecode');

			expect(result.groupBy.length).toBe(1);
			expect(result.groupBy[0]!.tableName).toBe('a');
			expect(result.groupBy[0]!.columnName).toBe('statecode');
		});
	});

	describe('edge cases for branch coverage', () => {
		it('should throw error when AS is followed by non-identifier', () => {
			// AS followed by a number token (not identifier)
			expect(() => parser.parse('SELECT name AS 123 FROM account')).toThrow(SqlParseError);
		});

		it('should not treat keyword as alias without AS', () => {
			// "FROM" is a keyword, should not be parsed as alias
			const result = parser.parse('SELECT name FROM account');

			expect(asColumnRef(result.columns[0]).columnName).toBe('name');
			expect(asColumnRef(result.columns[0]).alias).toBeNull();
		});

		it('should allow keyword as alias with AS', () => {
			// Keywords are allowed as aliases when using AS
			const result = parser.parse('SELECT COUNT(*) AS count FROM account');

			const agg = asAggregateColumn(result.columns[0]);
			expect(agg.alias).toBe('count');
		});

		it('should handle less than or equal operator', () => {
			const result = parser.parse('SELECT * FROM account WHERE revenue <= 50000');

			expect(result.where).not.toBeNull();
			expect(result.where!.kind).toBe('comparison');
		});

		it('should handle greater than or equal operator', () => {
			const result = parser.parse('SELECT * FROM account WHERE revenue >= 100000');

			expect(result.where).not.toBeNull();
			expect(result.where!.kind).toBe('comparison');
		});

		it('should handle not equals operator', () => {
			const result = parser.parse('SELECT * FROM account WHERE statecode <> 1');

			expect(result.where).not.toBeNull();
			expect(result.where!.kind).toBe('comparison');
		});

		it('should parse string literal in IN clause', () => {
			const result = parser.parse("SELECT * FROM account WHERE name IN ('Contoso', 'Fabrikam')");

			expect(result.where).not.toBeNull();
			expect(result.where!.kind).toBe('in');
		});

		it('should parse NULL literal in comparison', () => {
			// NULL as a literal value (edge case)
			const result = parser.parse('SELECT * FROM account WHERE name = NULL');

			expect(result.where).not.toBeNull();
			expect(result.where!.kind).toBe('comparison');
		});

		it('should attach trailing comments to columns', () => {
			const sql = `
				SELECT
					name, -- account name
					revenue -- total revenue
				FROM account
			`;
			const result = parser.parse(sql);

			expect(result.columns.length).toBe(2);
			expect(asColumnRef(result.columns[0]).trailingComment).toBe('account name');
			expect(asColumnRef(result.columns[1]).trailingComment).toBe('total revenue');
		});

		it('should attach trailing comments to GROUP BY columns', () => {
			const sql = `
				SELECT statecode, COUNT(*)
				FROM account
				GROUP BY statecode -- state filter
			`;
			const result = parser.parse(sql);

			expect(result.groupBy.length).toBe(1);
			expect(result.groupBy[0]!.trailingComment).toBe('state filter');
		});

		it('should attach trailing comments to ORDER BY items', () => {
			const sql = `
				SELECT name
				FROM account
				ORDER BY name ASC -- alphabetical
			`;
			const result = parser.parse(sql);

			expect(result.orderBy.length).toBe(1);
			expect(result.orderBy[0]!.trailingComment).toBe('alphabetical');
		});

		it('should attach trailing comments to conditions', () => {
			const sql = `
				SELECT *
				FROM account
				WHERE statecode = 0 -- active only
			`;
			const result = parser.parse(sql);

			expect(result.where).not.toBeNull();
			expect(result.where!.trailingComment).toBe('active only');
		});

		it('should handle multiple comments between tokens', () => {
			const sql = `
				SELECT * -- first comment
				-- second comment
				FROM account
			`;
			const result = parser.parse(sql);

			expect(asColumnRef(result.columns[0]).trailingComment).toContain('first comment');
		});

		it('should attach leading comments to statement', () => {
			const sql = `
				-- This is a test query
				-- Author: Test
				SELECT * FROM account
			`;
			const result = parser.parse(sql);

			expect(result.leadingComments).toBeDefined();
			expect(result.leadingComments!.length).toBeGreaterThan(0);
		});

		it('should attach comment after comma to previous column', () => {
			const sql = `
				SELECT
					name, -- comment after comma
					revenue
				FROM account
			`;
			const result = parser.parse(sql);

			expect(asColumnRef(result.columns[0]).trailingComment).toBe('comment after comma');
		});

		it('should attach comment after comma to previous GROUP BY column', () => {
			const sql = `
				SELECT statecode, statuscode, COUNT(*)
				FROM account
				GROUP BY statecode, -- first grouping
					statuscode
			`;
			const result = parser.parse(sql);

			expect(result.groupBy[0]!.trailingComment).toBe('first grouping');
		});

		it('should attach comment after comma to previous ORDER BY item', () => {
			const sql = `
				SELECT name
				FROM account
				ORDER BY statecode ASC, -- primary sort
					name DESC
			`;
			const result = parser.parse(sql);

			expect(result.orderBy[0]!.trailingComment).toBe('primary sort');
		});

		it('should attach comment to FROM table', () => {
			const sql = `
				SELECT *
				FROM account -- main table
			`;
			const result = parser.parse(sql);

			expect(result.from.trailingComment).toBe('main table');
		});

		it('should attach comment to JOIN', () => {
			const sql = `
				SELECT *
				FROM account a
				LEFT JOIN contact c ON a.contactid = c.contactid -- related contacts
			`;
			const result = parser.parse(sql);

			expect(result.joins.length).toBe(1);
			expect(result.joins[0]!.trailingComment).toBe('related contacts');
		});

		it('should handle comment position before first token', () => {
			const sql = `-- Leading comment
SELECT * FROM account`;
			const result = parser.parse(sql);

			expect(result.leadingComments).toContain('Leading comment');
		});

		it('should handle comment position after last token in WHERE', () => {
			const sql = `
				SELECT *
				FROM account
				WHERE (statecode = 0) -- parenthesized
			`;
			const result = parser.parse(sql);

			expect(result.where).not.toBeNull();
			expect(result.where!.trailingComment).toBe('parenthesized');
		});
	});
});
