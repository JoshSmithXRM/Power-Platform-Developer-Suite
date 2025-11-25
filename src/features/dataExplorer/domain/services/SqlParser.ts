import { SqlParseError } from '../errors/SqlParseError';
import {
	SqlColumnRef,
	SqlComparisonCondition,
	SqlComparisonOperator,
	SqlCondition,
	SqlInCondition,
	SqlJoin,
	SqlJoinType,
	SqlLikeCondition,
	SqlLiteral,
	SqlLogicalCondition,
	SqlNullCondition,
	SqlOrderByItem,
	SqlSelectStatement,
	SqlSortDirection,
	SqlTableRef,
} from '../valueObjects/SqlAst';
import { SqlToken, SqlTokenType } from '../valueObjects/SqlToken';

import { SqlLexer } from './SqlLexer';

/**
 * Domain Service: SQL Parser
 *
 * Recursive descent parser for a subset of SQL SELECT statements.
 * Produces a SqlSelectStatement AST from SQL text.
 *
 * Supported SQL:
 * - SELECT columns FROM table
 * - SELECT TOP n columns FROM table
 * - WHERE with comparison, LIKE, IS NULL, IN operators
 * - AND/OR logical operators with parentheses
 * - ORDER BY column ASC/DESC
 * - JOIN (INNER, LEFT, RIGHT)
 *
 * Not Supported (for now):
 * - Subqueries
 * - UNION/INTERSECT/EXCEPT
 * - GROUP BY, HAVING, aggregates
 * - DISTINCT
 */
export class SqlParser {
	private tokens: SqlToken[] = [];
	private position: number = 0;
	private sql: string = '';

	/**
	 * Parses SQL text into an AST.
	 * @throws SqlParseError if parsing fails
	 */
	public parse(sql: string): SqlSelectStatement {
		this.sql = sql;
		this.position = 0;

		const lexer = new SqlLexer(sql);
		this.tokens = lexer.tokenize();

		return this.parseSelectStatement();
	}

	/**
	 * Parses a complete SELECT statement.
	 */
	private parseSelectStatement(): SqlSelectStatement {
		this.expect('SELECT');

		// Optional TOP clause
		let top: number | null = null;
		if (this.match('TOP')) {
			const topToken = this.expect('NUMBER');
			top = parseInt(topToken.value, 10);
		}

		// SELECT columns
		const columns = this.parseColumnList();

		// FROM clause
		this.expect('FROM');
		const from = this.parseTableRef();

		// Optional JOIN clauses
		const joins: SqlJoin[] = [];
		while (this.matchJoinKeyword()) {
			joins.push(this.parseJoin());
		}

		// Optional WHERE clause
		let where: SqlCondition | null = null;
		if (this.match('WHERE')) {
			where = this.parseCondition();
		}

		// Optional ORDER BY clause
		const orderBy: SqlOrderByItem[] = [];
		if (this.match('ORDER')) {
			this.expect('BY');
			do {
				orderBy.push(this.parseOrderByItem());
			} while (this.match('COMMA'));
		}

		// Optional LIMIT clause (alternative to TOP)
		if (this.match('LIMIT')) {
			const limitToken = this.expect('NUMBER');
			if (top === null) {
				top = parseInt(limitToken.value, 10);
			}
		}

		// Ensure we've consumed all tokens
		if (!this.isAtEnd()) {
			throw this.error(`Unexpected token: ${this.peek().value}`);
		}

		return new SqlSelectStatement(
			columns,
			from,
			joins,
			where,
			orderBy,
			top
		);
	}

	/**
	 * Parses SELECT column list.
	 */
	private parseColumnList(): SqlColumnRef[] {
		const columns: SqlColumnRef[] = [];

		do {
			columns.push(this.parseColumnRef());
		} while (this.match('COMMA'));

		return columns;
	}

	/**
	 * Parses a single column reference.
	 */
	private parseColumnRef(): SqlColumnRef {
		// Check for *
		if (this.match('STAR')) {
			return new SqlColumnRef(null, '*', null, true);
		}

		// Parse identifier (might be table.column or just column)
		const first = this.expect('IDENTIFIER');

		// Check for table.column or table.*
		if (this.match('DOT')) {
			if (this.match('STAR')) {
				return new SqlColumnRef(first.value, '*', null, true);
			}
			const column = this.expect('IDENTIFIER');
			const alias = this.parseOptionalAlias();
			return new SqlColumnRef(first.value, column.value, alias, false);
		}

		// Just a column name
		const alias = this.parseOptionalAlias();
		return new SqlColumnRef(null, first.value, alias, false);
	}

	/**
	 * Parses optional AS alias or just alias.
	 */
	private parseOptionalAlias(): string | null {
		if (this.match('AS')) {
			return this.expect('IDENTIFIER').value;
		}
		// Check for alias without AS keyword
		if (this.check('IDENTIFIER') && !this.checkKeyword()) {
			return this.advance().value;
		}
		return null;
	}

	/**
	 * Parses a table reference.
	 */
	private parseTableRef(): SqlTableRef {
		const tableName = this.expect('IDENTIFIER');
		const alias = this.parseOptionalAlias();
		return new SqlTableRef(tableName.value, alias);
	}

	/**
	 * Checks if current token starts a JOIN clause.
	 */
	private matchJoinKeyword(): boolean {
		return (
			this.check('JOIN') ||
			this.check('INNER') ||
			this.check('LEFT') ||
			this.check('RIGHT')
		);
	}

	/**
	 * Parses a JOIN clause.
	 */
	private parseJoin(): SqlJoin {
		let joinType: SqlJoinType = 'INNER';

		if (this.match('INNER')) {
			joinType = 'INNER';
		} else if (this.match('LEFT')) {
			this.match('OUTER'); // optional
			joinType = 'LEFT';
		} else if (this.match('RIGHT')) {
			this.match('OUTER'); // optional
			joinType = 'RIGHT';
		}

		this.expect('JOIN');
		const table = this.parseTableRef();
		this.expect('ON');

		const leftColumn = this.parseColumnRef();
		this.expect('EQUALS');
		const rightColumn = this.parseColumnRef();

		return new SqlJoin(joinType, table, leftColumn, rightColumn);
	}

	/**
	 * Parses a WHERE condition (handles AND/OR precedence).
	 */
	private parseCondition(): SqlCondition {
		return this.parseOrCondition();
	}

	/**
	 * Parses OR conditions (lowest precedence).
	 */
	private parseOrCondition(): SqlCondition {
		let left = this.parseAndCondition();

		while (this.match('OR')) {
			const right = this.parseAndCondition();
			left = new SqlLogicalCondition('OR', [left, right]);
		}

		return left;
	}

	/**
	 * Parses AND conditions (higher precedence than OR).
	 */
	private parseAndCondition(): SqlCondition {
		let left = this.parsePrimaryCondition();

		while (this.match('AND')) {
			const right = this.parsePrimaryCondition();
			left = new SqlLogicalCondition('AND', [left, right]);
		}

		return left;
	}

	/**
	 * Parses primary conditions (comparison, LIKE, IS NULL, IN, or parenthesized).
	 */
	private parsePrimaryCondition(): SqlCondition {
		// Parenthesized condition
		if (this.match('LPAREN')) {
			const condition = this.parseCondition();
			this.expect('RPAREN');
			return condition;
		}

		// Column-based condition
		const column = this.parseColumnRef();

		// IS [NOT] NULL
		if (this.match('IS')) {
			const isNegated = this.match('NOT');
			this.expect('NULL');
			return new SqlNullCondition(column, isNegated);
		}

		// [NOT] LIKE
		const likeNegated = this.match('NOT');
		if (this.match('LIKE')) {
			const pattern = this.expect('STRING');
			return new SqlLikeCondition(column, pattern.value, likeNegated);
		}
		if (likeNegated) {
			// NOT was consumed but no LIKE followed
			// Check for NOT IN
			if (this.match('IN')) {
				return this.parseInList(column, true);
			}
			throw this.error('Expected LIKE or IN after NOT');
		}

		// [NOT] IN
		if (this.match('IN')) {
			return this.parseInList(column, false);
		}

		// Comparison operator
		const operator = this.parseComparisonOperator();
		const value = this.parseLiteral();
		return new SqlComparisonCondition(column, operator, value);
	}

	/**
	 * Parses IN (value1, value2, ...) list.
	 */
	private parseInList(column: SqlColumnRef, isNegated: boolean): SqlInCondition {
		this.expect('LPAREN');
		const values: SqlLiteral[] = [];

		do {
			values.push(this.parseLiteral());
		} while (this.match('COMMA'));

		this.expect('RPAREN');
		return new SqlInCondition(column, values, isNegated);
	}

	/**
	 * Parses a comparison operator.
	 */
	private parseComparisonOperator(): SqlComparisonOperator {
		if (this.match('EQUALS')) return '=';
		if (this.match('NOT_EQUALS')) return '<>';
		if (this.match('LESS_THAN')) return '<';
		if (this.match('GREATER_THAN')) return '>';
		if (this.match('LESS_THAN_OR_EQUAL')) return '<=';
		if (this.match('GREATER_THAN_OR_EQUAL')) return '>=';

		throw this.error('Expected comparison operator');
	}

	/**
	 * Parses a literal value.
	 */
	private parseLiteral(): SqlLiteral {
		if (this.match('STRING')) {
			return new SqlLiteral(this.previous().value, 'string');
		}
		if (this.match('NUMBER')) {
			return new SqlLiteral(parseFloat(this.previous().value), 'number');
		}
		if (this.match('NULL')) {
			return new SqlLiteral(null, 'null');
		}

		throw this.error('Expected literal value');
	}

	/**
	 * Parses an ORDER BY item.
	 */
	private parseOrderByItem(): SqlOrderByItem {
		const column = this.parseColumnRef();
		let direction: SqlSortDirection = 'ASC';

		if (this.match('DESC')) {
			direction = 'DESC';
		} else {
			this.match('ASC'); // optional
		}

		return new SqlOrderByItem(column, direction);
	}

	// ========== Token Helpers ==========

	private peek(): SqlToken {
		return this.tokens[this.position] ?? new SqlToken('EOF', '', this.sql.length);
	}

	private previous(): SqlToken {
		const token = this.tokens[this.position - 1];
		if (token === undefined) {
			throw new Error('No previous token available');
		}
		return token;
	}

	private isAtEnd(): boolean {
		return this.peek().is('EOF');
	}

	private check(type: SqlTokenType): boolean {
		return this.peek().is(type);
	}

	private checkKeyword(): boolean {
		return this.peek().isKeyword();
	}

	private advance(): SqlToken {
		if (!this.isAtEnd()) {
			this.position++;
		}
		return this.previous();
	}

	private match(type: SqlTokenType): boolean {
		if (this.check(type)) {
			this.advance();
			return true;
		}
		return false;
	}

	private expect(type: SqlTokenType): SqlToken {
		if (this.check(type)) {
			return this.advance();
		}
		throw this.error(`Expected ${type}, found ${this.peek().type}`);
	}

	private error(message: string): SqlParseError {
		const token = this.peek();
		return SqlParseError.atPosition(message, token.position, this.sql);
	}
}
