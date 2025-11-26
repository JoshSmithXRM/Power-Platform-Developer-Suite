import { SqlToken } from './SqlToken';

describe('SqlToken', () => {
	describe('constructor', () => {
		it('should create token with type, value, and position', () => {
			const token = new SqlToken('SELECT', 'SELECT', 0);

			expect(token.type).toBe('SELECT');
			expect(token.value).toBe('SELECT');
			expect(token.position).toBe(0);
		});
	});

	describe('is', () => {
		it('should return true when type matches', () => {
			const token = new SqlToken('SELECT', 'SELECT', 0);

			expect(token.is('SELECT')).toBe(true);
		});

		it('should return false when type does not match', () => {
			const token = new SqlToken('SELECT', 'SELECT', 0);

			expect(token.is('FROM')).toBe(false);
		});
	});

	describe('isOneOf', () => {
		it('should return true when type is in list', () => {
			const token = new SqlToken('SELECT', 'SELECT', 0);

			expect(token.isOneOf('SELECT', 'FROM', 'WHERE')).toBe(true);
		});

		it('should return false when type is not in list', () => {
			const token = new SqlToken('SELECT', 'SELECT', 0);

			expect(token.isOneOf('FROM', 'WHERE', 'AND')).toBe(false);
		});

		it('should handle single type', () => {
			const token = new SqlToken('SELECT', 'SELECT', 0);

			expect(token.isOneOf('SELECT')).toBe(true);
		});
	});

	describe('isKeyword', () => {
		it('should return true for keyword tokens', () => {
			const selectToken = new SqlToken('SELECT', 'SELECT', 0);
			const fromToken = new SqlToken('FROM', 'FROM', 0);
			const whereToken = new SqlToken('WHERE', 'WHERE', 0);
			const andToken = new SqlToken('AND', 'AND', 0);
			const orToken = new SqlToken('OR', 'OR', 0);
			const joinToken = new SqlToken('JOIN', 'JOIN', 0);
			const innerToken = new SqlToken('INNER', 'INNER', 0);
			const leftToken = new SqlToken('LEFT', 'LEFT', 0);
			const rightToken = new SqlToken('RIGHT', 'RIGHT', 0);

			expect(selectToken.isKeyword()).toBe(true);
			expect(fromToken.isKeyword()).toBe(true);
			expect(whereToken.isKeyword()).toBe(true);
			expect(andToken.isKeyword()).toBe(true);
			expect(orToken.isKeyword()).toBe(true);
			expect(joinToken.isKeyword()).toBe(true);
			expect(innerToken.isKeyword()).toBe(true);
			expect(leftToken.isKeyword()).toBe(true);
			expect(rightToken.isKeyword()).toBe(true);
		});

		it('should return false for non-keyword tokens', () => {
			const identifier = new SqlToken('IDENTIFIER', 'account', 0);
			const string = new SqlToken('STRING', 'value', 0);
			const number = new SqlToken('NUMBER', '123', 0);
			const comma = new SqlToken('COMMA', ',', 0);
			const star = new SqlToken('STAR', '*', 0);

			expect(identifier.isKeyword()).toBe(false);
			expect(string.isKeyword()).toBe(false);
			expect(number.isKeyword()).toBe(false);
			expect(comma.isKeyword()).toBe(false);
			expect(star.isKeyword()).toBe(false);
		});
	});

	describe('isComparisonOperator', () => {
		it('should return true for comparison operators', () => {
			const equals = new SqlToken('EQUALS', '=', 0);
			const notEquals = new SqlToken('NOT_EQUALS', '<>', 0);
			const lessThan = new SqlToken('LESS_THAN', '<', 0);
			const greaterThan = new SqlToken('GREATER_THAN', '>', 0);
			const lessOrEqual = new SqlToken('LESS_THAN_OR_EQUAL', '<=', 0);
			const greaterOrEqual = new SqlToken('GREATER_THAN_OR_EQUAL', '>=', 0);

			expect(equals.isComparisonOperator()).toBe(true);
			expect(notEquals.isComparisonOperator()).toBe(true);
			expect(lessThan.isComparisonOperator()).toBe(true);
			expect(greaterThan.isComparisonOperator()).toBe(true);
			expect(lessOrEqual.isComparisonOperator()).toBe(true);
			expect(greaterOrEqual.isComparisonOperator()).toBe(true);
		});

		it('should return false for non-comparison tokens', () => {
			const select = new SqlToken('SELECT', 'SELECT', 0);
			const comma = new SqlToken('COMMA', ',', 0);
			const identifier = new SqlToken('IDENTIFIER', 'col', 0);

			expect(select.isComparisonOperator()).toBe(false);
			expect(comma.isComparisonOperator()).toBe(false);
			expect(identifier.isComparisonOperator()).toBe(false);
		});
	});
});
