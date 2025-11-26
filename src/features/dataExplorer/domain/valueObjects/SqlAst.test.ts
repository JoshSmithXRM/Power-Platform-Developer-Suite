import {
	SqlColumnRef,
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
	});
});
