import { SqlParseError } from '../errors/SqlParseError';
import {
	SqlAggregateColumn,
	SqlAggregateFunction,
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
	SqlSelectColumn,
	SqlSelectStatement,
	SqlSortDirection,
	SqlTableRef,
} from '../valueObjects/SqlAst';
import { SqlComment, SqlToken, SqlTokenType } from '../valueObjects/SqlToken';

import { SqlLexer } from './SqlLexer';

/**
 * Domain Service: SQL Parser
 *
 * Recursive descent parser for a subset of SQL SELECT statements.
 * Produces a SqlSelectStatement AST from SQL text.
 *
 * Supported SQL:
 * - SELECT columns FROM table
 * - SELECT DISTINCT columns FROM table
 * - SELECT TOP n columns FROM table
 * - Aggregate functions: COUNT(*), COUNT(column), SUM, AVG, MIN, MAX
 * - COUNT(DISTINCT column)
 * - GROUP BY column1, column2
 * - WHERE with comparison, LIKE, IS NULL, IN operators
 * - AND/OR logical operators with parentheses
 * - ORDER BY column ASC/DESC
 * - JOIN (INNER, LEFT, RIGHT)
 *
 * Not Supported (for now):
 * - Subqueries
 * - UNION/INTERSECT/EXCEPT
 * - HAVING clause
 */
export class SqlParser {
	private tokens: SqlToken[] = [];
	private comments: SqlComment[] = [];
	private position: number = 0;
	private sql: string = '';
	/** Index of the next comment to consider for association */
	private commentIndex: number = 0;

	/**
	 * Parses SQL text into an AST.
	 * @throws SqlParseError if parsing fails
	 */
	public parse(sql: string): SqlSelectStatement {
		this.sql = sql;
		this.position = 0;
		this.commentIndex = 0;

		const lexer = new SqlLexer(sql);
		const { tokens, comments } = lexer.tokenize();
		this.tokens = tokens;
		this.comments = comments;

		return this.parseSelectStatement();
	}

	/**
	 * Gets the trailing comment for the element that just finished parsing.
	 * A comment is "trailing" if it appears after the last consumed token
	 * but before the next token.
	 */
	private getTrailingComment(): string | undefined {
		if (this.commentIndex >= this.comments.length) {
			return undefined;
		}

		const lastTokenEnd = this.previous().position + this.previous().value.length;
		const nextTokenStart = this.peek().position;

		// Collect comments that fall between the last token and the next token
		const trailingComments: string[] = [];

		while (this.commentIndex < this.comments.length) {
			const comment = this.comments[this.commentIndex];
			if (comment === undefined) break;

			if (comment.position > lastTokenEnd && comment.position < nextTokenStart) {
				trailingComments.push(comment.text);
				this.commentIndex++;
			} else if (comment.position >= nextTokenStart) {
				// Comment is beyond the next token, stop looking
				break;
			} else {
				// Comment is before the last token (shouldn't happen but handle it)
				this.commentIndex++;
			}
		}

		// Return combined comments or undefined
		return trailingComments.length > 0 ? trailingComments.join(' | ') : undefined;
	}

	/**
	 * Gets all leading comments (comments before the first token).
	 */
	private getLeadingComments(): string[] {
		const leading: string[] = [];
		const firstTokenPos = this.tokens[0]?.position ?? 0;

		while (this.commentIndex < this.comments.length) {
			const comment = this.comments[this.commentIndex];
			if (comment === undefined) break;

			if (comment.position < firstTokenPos) {
				leading.push(comment.text);
				this.commentIndex++;
			} else {
				break;
			}
		}

		return leading;
	}

	/**
	 * Attaches a trailing comment to an AST node if one exists.
	 * Only assigns if there's actually a comment to attach.
	 */
	private attachTrailingComment(node: { trailingComment?: string }): void {
		const comment = this.getTrailingComment();
		if (comment !== undefined) {
			node.trailingComment = comment;
		}
	}

	/**
	 * Parses a complete SELECT statement.
	 */
	private parseSelectStatement(): SqlSelectStatement {
		// Get any leading comments before SELECT
		const leadingComments = this.getLeadingComments();

		this.expect('SELECT');

		// Optional DISTINCT keyword
		const distinct = this.match('DISTINCT');

		// Optional TOP clause
		let top: number | null = null;
		if (this.match('TOP')) {
			const topToken = this.expect('NUMBER');
			top = parseInt(topToken.value, 10);
		}

		// SELECT columns (may include aggregates)
		const columns = this.parseSelectColumnList();

		// FROM clause
		this.expect('FROM');
		const from = this.parseTableRef();
		this.attachTrailingComment(from);

		// Optional JOIN clauses
		const joins: SqlJoin[] = [];
		while (this.matchJoinKeyword()) {
			const join = this.parseJoin();
			this.attachTrailingComment(join);
			joins.push(join);
		}

		// Optional WHERE clause
		let where: SqlCondition | null = null;
		if (this.match('WHERE')) {
			where = this.parseCondition();
			// Trailing comment is attached in parseCondition
		}

		// Optional GROUP BY clause
		const groupBy: SqlColumnRef[] = [];
		if (this.match('GROUP')) {
			this.expect('BY');
			groupBy.push(this.parseColumnRef());

			while (this.match('COMMA')) {
				// Comment after comma belongs to previous column
				const prevGroupBy = groupBy[groupBy.length - 1];
				if (prevGroupBy) {
					this.attachTrailingComment(prevGroupBy);
				}
				groupBy.push(this.parseColumnRef());
			}

			// Trailing comment for last column
			const lastGroupBy = groupBy[groupBy.length - 1];
			if (lastGroupBy && !lastGroupBy.trailingComment) {
				this.attachTrailingComment(lastGroupBy);
			}
		}

		// Optional ORDER BY clause
		const orderBy: SqlOrderByItem[] = [];
		if (this.match('ORDER')) {
			this.expect('BY');
			orderBy.push(this.parseOrderByItem());

			while (this.match('COMMA')) {
				// Comment after comma belongs to previous item
				const prevOrderBy = orderBy[orderBy.length - 1];
				if (prevOrderBy) {
					this.attachTrailingComment(prevOrderBy);
				}
				orderBy.push(this.parseOrderByItem());
			}

			// Trailing comment for last item
			const lastOrderBy = orderBy[orderBy.length - 1];
			if (lastOrderBy && !lastOrderBy.trailingComment) {
				this.attachTrailingComment(lastOrderBy);
			}
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

		const statement = new SqlSelectStatement(
			columns,
			from,
			joins,
			where,
			orderBy,
			top,
			distinct,
			groupBy
		);
		statement.leadingComments = leadingComments;

		return statement;
	}

	/**
	 * Parses SELECT column list (may include aggregates).
	 * Tolerates trailing commas for better UX.
	 *
	 * Note: Comments after commas (e.g., "name, -- comment") are attached
	 * to the preceding column by checking for comments AFTER matching the comma.
	 */
	private parseSelectColumnList(): SqlSelectColumn[] {
		const columns: SqlSelectColumn[] = [];

		// Parse first column
		columns.push(this.parseSelectColumn());

		while (this.match('COMMA')) {
			// After matching comma, check for comment that belongs to previous column
			// (in "name, -- comment" the comment is AFTER the comma)
			const prevColumn = columns[columns.length - 1];
			if (prevColumn) {
				this.attachTrailingComment(prevColumn);
			}

			// Check for trailing comma before FROM/WHERE/etc.
			if (this.isAtClauseKeyword()) break;

			// Parse next column
			columns.push(this.parseSelectColumn());
		}

		// For the last column, attach any trailing comment between it and the next token.
		// Skip if we already attached one (trailing comma case where column already has comment).
		const lastColumn = columns[columns.length - 1];
		if (lastColumn && !lastColumn.trailingComment) {
			this.attachTrailingComment(lastColumn);
		}

		return columns;
	}

	/**
	 * Parses a single SELECT column (regular column or aggregate function).
	 */
	private parseSelectColumn(): SqlSelectColumn {
		// Check for aggregate functions
		if (this.isAggregateFunction()) {
			return this.parseAggregateColumn();
		}

		// Regular column reference
		return this.parseColumnRef();
	}

	/**
	 * Checks if current token is an aggregate function.
	 */
	private isAggregateFunction(): boolean {
		return (
			this.check('COUNT') ||
			this.check('SUM') ||
			this.check('AVG') ||
			this.check('MIN') ||
			this.check('MAX')
		);
	}

	/**
	 * Parses an aggregate function: COUNT(*), COUNT(column), SUM(column), etc.
	 */
	private parseAggregateColumn(): SqlAggregateColumn {
		const funcToken = this.advance();
		const func = funcToken.type as SqlAggregateFunction;

		this.expect('LPAREN');

		let column: SqlColumnRef | null = null;
		let isDistinct = false;

		if (func === 'COUNT' && this.match('STAR')) {
			// COUNT(*)
			column = null;
		} else {
			// Check for DISTINCT inside aggregate: COUNT(DISTINCT column)
			isDistinct = this.match('DISTINCT');

			// Parse column reference
			column = this.parseColumnRef();
		}

		this.expect('RPAREN');

		// Parse optional alias
		const alias = this.parseOptionalAlias();

		return new SqlAggregateColumn(func, column, isDistinct, alias);
	}

	/**
	 * Checks if current token is a SQL clause keyword.
	 * Used to detect trailing commas in column lists.
	 */
	private isAtClauseKeyword(): boolean {
		return (
			this.check('FROM') ||
			this.check('WHERE') ||
			this.check('GROUP') ||
			this.check('ORDER') ||
			this.check('LIMIT') ||
			this.check('JOIN') ||
			this.check('LEFT') ||
			this.check('RIGHT') ||
			this.check('INNER')
		);
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
	 * Aliases can be identifiers or even keywords (e.g., "COUNT(*) AS count").
	 */
	private parseOptionalAlias(): string | null {
		if (this.match('AS')) {
			// After AS, accept identifier or keyword as alias
			const token = this.peek();
			if (token.is('IDENTIFIER') || token.isKeyword()) {
				return this.advance().value;
			}
			throw this.error(`Expected alias after AS, found ${token.type}`);
		}
		// Check for alias without AS keyword - must be an identifier (not keyword)
		// to avoid ambiguity like "SELECT name count FROM" being parsed as "name AS count"
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
			this.attachTrailingComment(condition);
			return condition;
		}

		// Column-based condition
		const column = this.parseColumnRef();

		// IS [NOT] NULL
		if (this.match('IS')) {
			const isNegated = this.match('NOT');
			this.expect('NULL');
			const cond = new SqlNullCondition(column, isNegated);
			this.attachTrailingComment(cond);
			return cond;
		}

		// [NOT] LIKE
		const likeNegated = this.match('NOT');
		if (this.match('LIKE')) {
			const pattern = this.expect('STRING');
			const cond = new SqlLikeCondition(column, pattern.value, likeNegated);
			this.attachTrailingComment(cond);
			return cond;
		}
		if (likeNegated) {
			// NOT was consumed but no LIKE followed
			// Check for NOT IN
			if (this.match('IN')) {
				const cond = this.parseInList(column, true);
				this.attachTrailingComment(cond);
				return cond;
			}
			throw this.error('Expected LIKE or IN after NOT');
		}

		// [NOT] IN
		if (this.match('IN')) {
			const cond = this.parseInList(column, false);
			this.attachTrailingComment(cond);
			return cond;
		}

		// Comparison operator
		const operator = this.parseComparisonOperator();
		const value = this.parseLiteral();
		const cond = new SqlComparisonCondition(column, operator, value);
		this.attachTrailingComment(cond);
		return cond;
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
