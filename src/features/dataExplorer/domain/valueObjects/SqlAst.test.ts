import {
	SqlColumnRef,
	SqlAggregateColumn,
	SqlTableRef,
	SqlLiteral,
	SqlComparisonCondition,
	SqlLikeCondition,
	SqlNullCondition,
	SqlInCondition,
	SqlLogicalCondition,
	SqlOrderByItem,
	SqlJoin,
	SqlSelectStatement,
} from './SqlAst';

describe('SqlAst Value Objects', () => {
	describe('SqlColumnRef', () => {
		it('should create column reference with table name', () => {
			const col = new SqlColumnRef('account', 'name', null, false);

			expect(col.tableName).toBe('account');
			expect(col.columnName).toBe('name');
			expect(col.alias).toBeNull();
			expect(col.isWildcard).toBe(false);
		});

		it('should create column reference with alias', () => {
			const col = new SqlColumnRef(null, 'name', 'accountName', false);

			expect(col.alias).toBe('accountName');
		});

		it('should create wildcard column reference', () => {
			const col = new SqlColumnRef(null, '*', null, true);

			expect(col.isWildcard).toBe(true);
		});

		describe('getFullName', () => {
			it('should return table.column when table is specified', () => {
				const col = new SqlColumnRef('account', 'name', null, false);

				expect(col.getFullName()).toBe('account.name');
			});

			it('should return column only when no table', () => {
				const col = new SqlColumnRef(null, 'name', null, false);

				expect(col.getFullName()).toBe('name');
			});
		});
	});

	describe('SqlAggregateColumn', () => {
		it('should create COUNT(*) aggregate', () => {
			const agg = new SqlAggregateColumn('COUNT', null, false, null);

			expect(agg.func).toBe('COUNT');
			expect(agg.column).toBeNull();
			expect(agg.isDistinct).toBe(false);
			expect(agg.alias).toBeNull();
		});

		it('should create COUNT(column) aggregate', () => {
			const col = new SqlColumnRef(null, 'accountid', null, false);
			const agg = new SqlAggregateColumn('COUNT', col, false, null);

			expect(agg.func).toBe('COUNT');
			expect(agg.column).toBe(col);
		});

		it('should create COUNT(DISTINCT column) aggregate', () => {
			const col = new SqlColumnRef(null, 'name', null, false);
			const agg = new SqlAggregateColumn('COUNT', col, true, 'uniqueNames');

			expect(agg.isDistinct).toBe(true);
			expect(agg.alias).toBe('uniqueNames');
		});

		it('should create SUM aggregate', () => {
			const col = new SqlColumnRef(null, 'revenue', null, false);
			const agg = new SqlAggregateColumn('SUM', col, false, 'totalRevenue');

			expect(agg.func).toBe('SUM');
			expect(agg.column).toBe(col);
		});

		it('should create AVG aggregate', () => {
			const col = new SqlColumnRef(null, 'salary', null, false);
			const agg = new SqlAggregateColumn('AVG', col, false, null);

			expect(agg.func).toBe('AVG');
		});

		it('should create MIN aggregate', () => {
			const col = new SqlColumnRef(null, 'createdon', null, false);
			const agg = new SqlAggregateColumn('MIN', col, false, null);

			expect(agg.func).toBe('MIN');
		});

		it('should create MAX aggregate', () => {
			const col = new SqlColumnRef(null, 'modifiedon', null, false);
			const agg = new SqlAggregateColumn('MAX', col, false, null);

			expect(agg.func).toBe('MAX');
		});

		describe('isCountAll', () => {
			it('should return true for COUNT(*)', () => {
				const agg = new SqlAggregateColumn('COUNT', null, false, null);

				expect(agg.isCountAll()).toBe(true);
			});

			it('should return false for COUNT(column)', () => {
				const col = new SqlColumnRef(null, 'name', null, false);
				const agg = new SqlAggregateColumn('COUNT', col, false, null);

				expect(agg.isCountAll()).toBe(false);
			});

			it('should return false for other aggregates', () => {
				const col = new SqlColumnRef(null, 'revenue', null, false);
				const agg = new SqlAggregateColumn('SUM', col, false, null);

				expect(agg.isCountAll()).toBe(false);
			});
		});

		describe('getColumnName', () => {
			it('should return null for COUNT(*)', () => {
				const agg = new SqlAggregateColumn('COUNT', null, false, null);

				expect(agg.getColumnName()).toBeNull();
			});

			it('should return column name for COUNT(column)', () => {
				const col = new SqlColumnRef(null, 'accountid', null, false);
				const agg = new SqlAggregateColumn('COUNT', col, false, null);

				expect(agg.getColumnName()).toBe('accountid');
			});

			it('should return column name for SUM', () => {
				const col = new SqlColumnRef(null, 'revenue', null, false);
				const agg = new SqlAggregateColumn('SUM', col, false, null);

				expect(agg.getColumnName()).toBe('revenue');
			});
		});
	});

	describe('SqlTableRef', () => {
		it('should create table reference', () => {
			const table = new SqlTableRef('account', null);

			expect(table.tableName).toBe('account');
			expect(table.alias).toBeNull();
		});

		it('should create table reference with alias', () => {
			const table = new SqlTableRef('account', 'a');

			expect(table.alias).toBe('a');
		});

		describe('getEffectiveName', () => {
			it('should return alias when present', () => {
				const table = new SqlTableRef('account', 'a');

				expect(table.getEffectiveName()).toBe('a');
			});

			it('should return table name when no alias', () => {
				const table = new SqlTableRef('account', null);

				expect(table.getEffectiveName()).toBe('account');
			});
		});
	});

	describe('SqlLiteral', () => {
		it('should create string literal', () => {
			const literal = new SqlLiteral('test', 'string');

			expect(literal.value).toBe('test');
			expect(literal.type).toBe('string');
		});

		it('should create number literal', () => {
			const literal = new SqlLiteral(42, 'number');

			expect(literal.value).toBe(42);
			expect(literal.type).toBe('number');
		});

		it('should create null literal', () => {
			const literal = new SqlLiteral(null, 'null');

			expect(literal.value).toBeNull();
			expect(literal.type).toBe('null');
		});
	});

	describe('SqlComparisonCondition', () => {
		it('should create comparison condition', () => {
			const col = new SqlColumnRef(null, 'statecode', null, false);
			const val = new SqlLiteral(0, 'number');
			const condition = new SqlComparisonCondition(col, '=', val);

			expect(condition.kind).toBe('comparison');
			expect(condition.column).toBe(col);
			expect(condition.operator).toBe('=');
			expect(condition.value).toBe(val);
		});
	});

	describe('SqlLikeCondition', () => {
		it('should create LIKE condition', () => {
			const col = new SqlColumnRef(null, 'name', null, false);
			const condition = new SqlLikeCondition(col, '%test%', false);

			expect(condition.kind).toBe('like');
			expect(condition.pattern).toBe('%test%');
			expect(condition.isNegated).toBe(false);
		});

		it('should create NOT LIKE condition', () => {
			const col = new SqlColumnRef(null, 'name', null, false);
			const condition = new SqlLikeCondition(col, '%test%', true);

			expect(condition.isNegated).toBe(true);
		});
	});

	describe('SqlNullCondition', () => {
		it('should create IS NULL condition', () => {
			const col = new SqlColumnRef(null, 'deletedAt', null, false);
			const condition = new SqlNullCondition(col, false);

			expect(condition.kind).toBe('null');
			expect(condition.isNegated).toBe(false);
		});

		it('should create IS NOT NULL condition', () => {
			const col = new SqlColumnRef(null, 'deletedAt', null, false);
			const condition = new SqlNullCondition(col, true);

			expect(condition.isNegated).toBe(true);
		});
	});

	describe('SqlInCondition', () => {
		it('should create IN condition', () => {
			const col = new SqlColumnRef(null, 'status', null, false);
			const values = [new SqlLiteral(1, 'number'), new SqlLiteral(2, 'number')];
			const condition = new SqlInCondition(col, values, false);

			expect(condition.kind).toBe('in');
			expect(condition.values).toHaveLength(2);
			expect(condition.isNegated).toBe(false);
		});

		it('should create NOT IN condition', () => {
			const col = new SqlColumnRef(null, 'status', null, false);
			const values = [new SqlLiteral(1, 'number')];
			const condition = new SqlInCondition(col, values, true);

			expect(condition.isNegated).toBe(true);
		});
	});

	describe('SqlLogicalCondition', () => {
		it('should create AND condition', () => {
			const col1 = new SqlColumnRef(null, 'a', null, false);
			const col2 = new SqlColumnRef(null, 'b', null, false);
			const cond1 = new SqlComparisonCondition(col1, '=', new SqlLiteral(1, 'number'));
			const cond2 = new SqlComparisonCondition(col2, '=', new SqlLiteral(2, 'number'));
			const condition = new SqlLogicalCondition('AND', [cond1, cond2]);

			expect(condition.kind).toBe('logical');
			expect(condition.operator).toBe('AND');
			expect(condition.conditions).toHaveLength(2);
		});

		it('should create OR condition', () => {
			const col = new SqlColumnRef(null, 'status', null, false);
			const cond1 = new SqlComparisonCondition(col, '=', new SqlLiteral(1, 'number'));
			const cond2 = new SqlComparisonCondition(col, '=', new SqlLiteral(2, 'number'));
			const condition = new SqlLogicalCondition('OR', [cond1, cond2]);

			expect(condition.operator).toBe('OR');
		});
	});

	describe('SqlOrderByItem', () => {
		it('should create order by item with ASC', () => {
			const col = new SqlColumnRef(null, 'name', null, false);
			const orderBy = new SqlOrderByItem(col, 'ASC');

			expect(orderBy.column).toBe(col);
			expect(orderBy.direction).toBe('ASC');
		});

		it('should create order by item with DESC', () => {
			const col = new SqlColumnRef(null, 'createdon', null, false);
			const orderBy = new SqlOrderByItem(col, 'DESC');

			expect(orderBy.direction).toBe('DESC');
		});
	});

	describe('SqlJoin', () => {
		it('should create INNER JOIN', () => {
			const table = new SqlTableRef('contact', 'c');
			const leftCol = new SqlColumnRef('a', 'primarycontactid', null, false);
			const rightCol = new SqlColumnRef('c', 'contactid', null, false);
			const join = new SqlJoin('INNER', table, leftCol, rightCol);

			expect(join.type).toBe('INNER');
			expect(join.table).toBe(table);
			expect(join.leftColumn).toBe(leftCol);
			expect(join.rightColumn).toBe(rightCol);
		});

		it('should create LEFT JOIN', () => {
			const table = new SqlTableRef('contact', null);
			const leftCol = new SqlColumnRef(null, 'contactid', null, false);
			const rightCol = new SqlColumnRef(null, 'contactid', null, false);
			const join = new SqlJoin('LEFT', table, leftCol, rightCol);

			expect(join.type).toBe('LEFT');
		});
	});

	describe('SqlSelectStatement', () => {
		const createSimpleStatement = (): SqlSelectStatement => {
			const columns = [new SqlColumnRef(null, '*', null, true)];
			const from = new SqlTableRef('account', null);
			return new SqlSelectStatement(columns, from, [], null, [], null);
		};

		it('should create statement with all properties', () => {
			const statement = createSimpleStatement();

			expect(statement.columns).toHaveLength(1);
			expect(statement.from.tableName).toBe('account');
			expect(statement.joins).toHaveLength(0);
			expect(statement.where).toBeNull();
			expect(statement.orderBy).toHaveLength(0);
			expect(statement.top).toBeNull();
		});

		describe('getEntityName', () => {
			it('should return table name from FROM clause', () => {
				const statement = createSimpleStatement();

				expect(statement.getEntityName()).toBe('account');
			});
		});

		describe('isSelectAll', () => {
			it('should return true for SELECT *', () => {
				const statement = createSimpleStatement();

				expect(statement.isSelectAll()).toBe(true);
			});

			it('should return false for specific columns', () => {
				const columns = [new SqlColumnRef(null, 'name', null, false)];
				const from = new SqlTableRef('account', null);
				const statement = new SqlSelectStatement(columns, from, [], null, [], null);

				expect(statement.isSelectAll()).toBe(false);
			});

			it('should return false for table.* wildcard', () => {
				const columns = [new SqlColumnRef('account', '*', null, true)];
				const from = new SqlTableRef('account', null);
				const statement = new SqlSelectStatement(columns, from, [], null, [], null);

				expect(statement.isSelectAll()).toBe(false);
			});

			it('should return false for multiple columns including wildcard', () => {
				const columns = [
					new SqlColumnRef(null, '*', null, true),
					new SqlColumnRef(null, 'name', null, false),
				];
				const from = new SqlTableRef('account', null);
				const statement = new SqlSelectStatement(columns, from, [], null, [], null);

				expect(statement.isSelectAll()).toBe(false);
			});
		});

		describe('getTableNames', () => {
			it('should return main table name', () => {
				const statement = createSimpleStatement();

				expect(statement.getTableNames()).toEqual(['account']);
			});

			it('should include join table names', () => {
				const columns = [new SqlColumnRef(null, '*', null, true)];
				const from = new SqlTableRef('account', 'a');
				const joinTable = new SqlTableRef('contact', 'c');
				const join = new SqlJoin(
					'INNER',
					joinTable,
					new SqlColumnRef('a', 'contactid', null, false),
					new SqlColumnRef('c', 'contactid', null, false)
				);
				const statement = new SqlSelectStatement(columns, from, [join], null, [], null);

				const names = statement.getTableNames();
				expect(names).toContain('a');
				expect(names).toContain('c');
			});
		});

		describe('hasRowLimit', () => {
			it('should return false when no TOP/LIMIT', () => {
				const statement = createSimpleStatement();

				expect(statement.hasRowLimit()).toBe(false);
			});

			it('should return true when TOP is set', () => {
				const columns = [new SqlColumnRef(null, '*', null, true)];
				const from = new SqlTableRef('account', null);
				const statement = new SqlSelectStatement(columns, from, [], null, [], 100);

				expect(statement.hasRowLimit()).toBe(true);
			});
		});

		describe('hasAggregates', () => {
			it('should return false for query without aggregates', () => {
				const columns = [new SqlColumnRef(null, 'name', null, false)];
				const from = new SqlTableRef('account', null);
				const statement = new SqlSelectStatement(columns, from, [], null, [], null);

				expect(statement.hasAggregates()).toBe(false);
			});

			it('should return true for query with aggregate', () => {
				const agg = new SqlAggregateColumn('COUNT', null, false, null);
				const from = new SqlTableRef('account', null);
				const statement = new SqlSelectStatement([agg], from, [], null, [], null);

				expect(statement.hasAggregates()).toBe(true);
			});

			it('should return true for mixed regular and aggregate columns', () => {
				const col = new SqlColumnRef(null, 'name', null, false);
				const agg = new SqlAggregateColumn('COUNT', null, false, 'total');
				const from = new SqlTableRef('account', null);
				const statement = new SqlSelectStatement([col, agg], from, [], null, [], null);

				expect(statement.hasAggregates()).toBe(true);
			});
		});

		describe('getRegularColumns', () => {
			it('should return only regular columns', () => {
				const col1 = new SqlColumnRef(null, 'name', null, false);
				const col2 = new SqlColumnRef(null, 'email', null, false);
				const agg = new SqlAggregateColumn('COUNT', null, false, null);
				const from = new SqlTableRef('account', null);
				const statement = new SqlSelectStatement([col1, agg, col2], from, [], null, [], null);

				const regular = statement.getRegularColumns();

				expect(regular).toHaveLength(2);
				expect(regular[0]).toBe(col1);
				expect(regular[1]).toBe(col2);
			});

			it('should return empty array when only aggregates', () => {
				const agg = new SqlAggregateColumn('COUNT', null, false, null);
				const from = new SqlTableRef('account', null);
				const statement = new SqlSelectStatement([agg], from, [], null, [], null);

				const regular = statement.getRegularColumns();

				expect(regular).toHaveLength(0);
			});
		});

		describe('getAggregateColumns', () => {
			it('should return only aggregate columns', () => {
				const col = new SqlColumnRef(null, 'name', null, false);
				const agg1 = new SqlAggregateColumn('COUNT', null, false, null);
				const agg2 = new SqlAggregateColumn('SUM', new SqlColumnRef(null, 'revenue', null, false), false, null);
				const from = new SqlTableRef('account', null);
				const statement = new SqlSelectStatement([col, agg1, agg2], from, [], null, [], null);

				const aggregates = statement.getAggregateColumns();

				expect(aggregates).toHaveLength(2);
				expect(aggregates[0]).toBe(agg1);
				expect(aggregates[1]).toBe(agg2);
			});

			it('should return empty array when no aggregates', () => {
				const col = new SqlColumnRef(null, 'name', null, false);
				const from = new SqlTableRef('account', null);
				const statement = new SqlSelectStatement([col], from, [], null, [], null);

				const aggregates = statement.getAggregateColumns();

				expect(aggregates).toHaveLength(0);
			});
		});

		describe('withAdditionalColumns', () => {
			it('should return same statement when additionalColumns is empty', () => {
				const col = new SqlColumnRef(null, 'name', null, false);
				const from = new SqlTableRef('account', null);
				const statement = new SqlSelectStatement([col], from, [], null, [], null);

				const result = statement.withAdditionalColumns([]);

				expect(result).toBe(statement);
			});

			it('should add additional columns to the end', () => {
				const col = new SqlColumnRef(null, 'name', null, false);
				const from = new SqlTableRef('account', null);
				const statement = new SqlSelectStatement([col], from, [], null, [], null);

				const result = statement.withAdditionalColumns(['createdby', 'modifiedby']);

				expect(result.columns).toHaveLength(3);
				expect(result.columns[0]).toBe(col);
				expect((result.columns[1] as SqlColumnRef).columnName).toBe('createdby');
				expect((result.columns[2] as SqlColumnRef).columnName).toBe('modifiedby');
			});

			it('should preserve leading comments', () => {
				const col = new SqlColumnRef(null, 'name', null, false);
				const from = new SqlTableRef('account', null);
				const statement = new SqlSelectStatement([col], from, [], null, [], null);
				statement.leadingComments = ['-- test comment'];

				const result = statement.withAdditionalColumns(['id']);

				expect(result.leadingComments).toEqual(['-- test comment']);
			});

			it('should preserve other properties', () => {
				const col = new SqlColumnRef(null, 'name', null, false);
				const from = new SqlTableRef('account', 'a');
				const join = new SqlJoin('INNER', new SqlTableRef('contact', 'c'), new SqlColumnRef('a', 'contactid', null, false), new SqlColumnRef('c', 'contactid', null, false));
				const orderBy = new SqlOrderByItem(col, 'ASC');
				const statement = new SqlSelectStatement([col], from, [join], null, [orderBy], 100, true, [col]);

				const result = statement.withAdditionalColumns(['id']);

				expect(result.from).toBe(from);
				expect(result.joins).toHaveLength(1);
				expect(result.orderBy).toHaveLength(1);
				expect(result.top).toBe(100);
				expect(result.distinct).toBe(true);
				expect(result.groupBy).toHaveLength(1);
			});
		});

		describe('withVirtualColumnsReplaced', () => {
			it('should return same statement when virtualToParent is empty', () => {
				const col = new SqlColumnRef(null, 'name', null, false);
				const from = new SqlTableRef('account', null);
				const statement = new SqlSelectStatement([col], from, [], null, [], null);

				const result = statement.withVirtualColumnsReplaced(new Map());

				expect(result).toBe(statement);
			});

			it('should replace virtual columns with parent columns', () => {
				const virtualCol = new SqlColumnRef(null, 'createdbyname', null, false);
				const regularCol = new SqlColumnRef(null, 'name', null, false);
				const from = new SqlTableRef('account', null);
				const statement = new SqlSelectStatement([virtualCol, regularCol], from, [], null, [], null);

				const virtualToParent = new Map([['createdbyname', 'createdby']]);
				const result = statement.withVirtualColumnsReplaced(virtualToParent);

				expect(result.columns).toHaveLength(2);
				expect((result.columns[0] as SqlColumnRef).columnName).toBe('createdby');
				expect((result.columns[1] as SqlColumnRef).columnName).toBe('name');
			});

			it('should not duplicate parent columns', () => {
				const virtual1 = new SqlColumnRef(null, 'createdbyname', null, false);
				const virtual2 = new SqlColumnRef(null, 'createdbytype', null, false);
				const from = new SqlTableRef('account', null);
				const statement = new SqlSelectStatement([virtual1, virtual2], from, [], null, [], null);

				const virtualToParent = new Map([
					['createdbyname', 'createdby'],
					['createdbytype', 'createdby'],
				]);
				const result = statement.withVirtualColumnsReplaced(virtualToParent);

				expect(result.columns).toHaveLength(1);
				expect((result.columns[0] as SqlColumnRef).columnName).toBe('createdby');
			});

			it('should handle case-insensitive matching', () => {
				const virtualCol = new SqlColumnRef(null, 'CreatedByName', null, false);
				const from = new SqlTableRef('account', null);
				const statement = new SqlSelectStatement([virtualCol], from, [], null, [], null);

				const virtualToParent = new Map([['createdbyname', 'createdby']]);
				const result = statement.withVirtualColumnsReplaced(virtualToParent);

				expect(result.columns).toHaveLength(1);
				expect((result.columns[0] as SqlColumnRef).columnName).toBe('createdby');
			});

			it('should preserve aggregate columns', () => {
				const agg = new SqlAggregateColumn('COUNT', null, false, 'total');
				const virtualCol = new SqlColumnRef(null, 'createdbyname', null, false);
				const from = new SqlTableRef('account', null);
				const statement = new SqlSelectStatement([agg, virtualCol], from, [], null, [], null);

				const virtualToParent = new Map([['createdbyname', 'createdby']]);
				const result = statement.withVirtualColumnsReplaced(virtualToParent);

				expect(result.columns).toHaveLength(2);
				expect(result.columns[0]).toBe(agg);
			});

			it('should preserve wildcard columns', () => {
				const wildcard = new SqlColumnRef(null, '*', null, true);
				const from = new SqlTableRef('account', null);
				const statement = new SqlSelectStatement([wildcard], from, [], null, [], null);

				const virtualToParent = new Map([['createdbyname', 'createdby']]);
				const result = statement.withVirtualColumnsReplaced(virtualToParent);

				expect(result.columns).toHaveLength(1);
				expect(result.columns[0]).toBe(wildcard);
			});

			it('should preserve leading comments', () => {
				const col = new SqlColumnRef(null, 'createdbyname', null, false);
				const from = new SqlTableRef('account', null);
				const statement = new SqlSelectStatement([col], from, [], null, [], null);
				statement.leadingComments = ['-- virtual column test'];

				const virtualToParent = new Map([['createdbyname', 'createdby']]);
				const result = statement.withVirtualColumnsReplaced(virtualToParent);

				expect(result.leadingComments).toEqual(['-- virtual column test']);
			});
		});
	});
});
