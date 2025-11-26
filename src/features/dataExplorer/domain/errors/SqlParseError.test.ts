import { SqlParseError } from './SqlParseError';

describe('SqlParseError', () => {
	describe('constructor', () => {
		it('should create error with all properties', () => {
			const error = new SqlParseError('test message', 10, 2, 5, 'SELECT * FROM');

			expect(error.message).toContain('test message');
			expect(error.position).toBe(10);
			expect(error.line).toBe(2);
			expect(error.column).toBe(5);
			expect(error.sql).toBe('SELECT * FROM');
		});

		it('should expose line and column properties', () => {
			const error = new SqlParseError('unexpected token', 15, 3, 8, 'sql');

			expect(error.line).toBe(3);
			expect(error.column).toBe(8);
			expect(error.message).toBe('unexpected token');
		});

	});

	describe('atPosition', () => {
		it('should calculate line and column for single line', () => {
			const sql = 'SELECT * FROM account';
			const error = SqlParseError.atPosition('error', 7, sql);

			expect(error.line).toBe(1);
			expect(error.column).toBe(8); // Position 7 + 1 for 1-based column
		});

		it('should calculate line and column for multi-line SQL', () => {
			const sql = 'SELECT *\nFROM account\nWHERE x = 1';
			const error = SqlParseError.atPosition('error', 22, sql); // Position in 'WHERE'

			expect(error.line).toBe(3);
			expect(error.column).toBeGreaterThan(0);
		});

		it('should handle position at start of string', () => {
			const sql = 'SELECT';
			const error = SqlParseError.atPosition('error', 0, sql);

			expect(error.line).toBe(1);
			expect(error.column).toBe(1);
		});

		it('should handle empty last line correctly', () => {
			const sql = 'SELECT\n';
			const error = SqlParseError.atPosition('error', 7, sql);

			expect(error.line).toBe(2);
			expect(error.column).toBe(1);
		});
	});

	describe('getErrorContext', () => {
		it('should return context around error position', () => {
			const sql = 'SELECT * FROM account WHERE invalid';
			const error = new SqlParseError('error', 22, 1, 23, sql);

			const context = error.getErrorContext(10);

			expect(context).toContain('[HERE]');
			expect(context).toContain('account');
		});

		it('should add ellipsis when truncating start', () => {
			const sql = 'SELECT * FROM account WHERE invalid';
			const error = new SqlParseError('error', 30, 1, 31, sql);

			const context = error.getErrorContext(5);

			expect(context).toContain('...');
		});

		it('should add ellipsis when truncating end', () => {
			const sql = 'SELECT * FROM account WHERE invalid syntax error here';
			const error = new SqlParseError('error', 10, 1, 11, sql);

			const context = error.getErrorContext(5);

			expect(context).toContain('...');
		});

		it('should not add ellipsis when showing full context', () => {
			const sql = 'SELECT';
			const error = new SqlParseError('error', 3, 1, 4, sql);

			const context = error.getErrorContext(50);

			expect(context).toBe('SEL[HERE]ECT');
		});

		it('should use default context size', () => {
			const sql = 'SELECT * FROM account WHERE invalid';
			const error = new SqlParseError('error', 20, 1, 21, sql);

			const context = error.getErrorContext();

			expect(context).toContain('[HERE]');
		});

		it('should handle position at start', () => {
			const sql = 'SELECT * FROM account';
			const error = new SqlParseError('error', 0, 1, 1, sql);

			const context = error.getErrorContext(10);

			expect(context).toContain('[HERE]');
			expect(context.startsWith('[HERE]')).toBe(true);
		});

		it('should handle position at end', () => {
			const sql = 'SELECT * FROM account';
			const error = new SqlParseError('error', sql.length, 1, sql.length + 1, sql);

			const context = error.getErrorContext(10);

			expect(context).toContain('[HERE]');
			expect(context.endsWith('[HERE]')).toBe(true);
		});
	});
});
