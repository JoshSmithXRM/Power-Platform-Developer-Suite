import { SqlParseError } from '../errors/SqlParseError';
import { SqlLexer } from './SqlLexer';

describe('SqlLexer', () => {
	describe('operators', () => {
		it('should tokenize != operator', () => {
			const lexer = new SqlLexer('a != b');
			const tokens = lexer.tokenize();

			const notEquals = tokens.find(t => t.type === 'NOT_EQUALS');
			expect(notEquals).toBeDefined();
			expect(notEquals!.value).toBe('!=');
		});

		it('should tokenize <> operator', () => {
			const lexer = new SqlLexer('a <> b');
			const tokens = lexer.tokenize();

			const notEquals = tokens.find(t => t.type === 'NOT_EQUALS');
			expect(notEquals).toBeDefined();
			expect(notEquals!.value).toBe('<>');
		});

		it('should tokenize <= operator', () => {
			const lexer = new SqlLexer('a <= b');
			const tokens = lexer.tokenize();

			const op = tokens.find(t => t.type === 'LESS_THAN_OR_EQUAL');
			expect(op).toBeDefined();
			expect(op!.value).toBe('<=');
		});

		it('should tokenize >= operator', () => {
			const lexer = new SqlLexer('a >= b');
			const tokens = lexer.tokenize();

			const op = tokens.find(t => t.type === 'GREATER_THAN_OR_EQUAL');
			expect(op).toBeDefined();
			expect(op!.value).toBe('>=');
		});

		it('should tokenize < operator', () => {
			const lexer = new SqlLexer('a < b');
			const tokens = lexer.tokenize();

			const op = tokens.find(t => t.type === 'LESS_THAN');
			expect(op).toBeDefined();
		});

		it('should tokenize > operator', () => {
			const lexer = new SqlLexer('a > b');
			const tokens = lexer.tokenize();

			const op = tokens.find(t => t.type === 'GREATER_THAN');
			expect(op).toBeDefined();
		});
	});

	describe('quoted identifiers', () => {
		it('should tokenize bracketed identifier [name]', () => {
			const lexer = new SqlLexer('SELECT [column name] FROM table');
			const tokens = lexer.tokenize();

			const identifier = tokens.find(t => t.type === 'IDENTIFIER' && t.value === 'column name');
			expect(identifier).toBeDefined();
		});

		it('should tokenize double-quoted identifier "name"', () => {
			const lexer = new SqlLexer('SELECT "column name" FROM table');
			const tokens = lexer.tokenize();

			const identifier = tokens.find(t => t.type === 'IDENTIFIER' && t.value === 'column name');
			expect(identifier).toBeDefined();
		});

		it('should throw on unterminated bracketed identifier', () => {
			expect(() => new SqlLexer('SELECT [column').tokenize()).toThrow(SqlParseError);
			expect(() => new SqlLexer('SELECT [column').tokenize()).toThrow('Unterminated bracketed identifier');
		});

		it('should throw on unterminated double-quoted identifier', () => {
			expect(() => new SqlLexer('SELECT "column').tokenize()).toThrow(SqlParseError);
			expect(() => new SqlLexer('SELECT "column').tokenize()).toThrow('Unterminated quoted identifier');
		});
	});

	describe('string literals', () => {
		it('should tokenize escaped quotes in strings', () => {
			const lexer = new SqlLexer("WHERE name = 'O''Brien'");
			const tokens = lexer.tokenize();

			const stringToken = tokens.find(t => t.type === 'STRING');
			expect(stringToken).toBeDefined();
			expect(stringToken!.value).toBe("O'Brien");
		});

		it('should throw on unterminated string literal', () => {
			expect(() => new SqlLexer("WHERE name = 'unterminated").tokenize()).toThrow(SqlParseError);
			expect(() => new SqlLexer("WHERE name = 'unterminated").tokenize()).toThrow('Unterminated string literal');
		});
	});

	describe('numbers', () => {
		it('should tokenize negative numbers', () => {
			const lexer = new SqlLexer('WHERE value = -42');
			const tokens = lexer.tokenize();

			const numberToken = tokens.find(t => t.type === 'NUMBER');
			expect(numberToken).toBeDefined();
			expect(numberToken!.value).toBe('-42');
		});

		it('should tokenize decimal numbers', () => {
			const lexer = new SqlLexer('WHERE value = 3.14');
			const tokens = lexer.tokenize();

			const numberToken = tokens.find(t => t.type === 'NUMBER');
			expect(numberToken).toBeDefined();
			expect(numberToken!.value).toBe('3.14');
		});

		it('should tokenize negative decimal numbers', () => {
			const lexer = new SqlLexer('WHERE value = -123.456');
			const tokens = lexer.tokenize();

			const numberToken = tokens.find(t => t.type === 'NUMBER');
			expect(numberToken).toBeDefined();
			expect(numberToken!.value).toBe('-123.456');
		});
	});

	describe('error handling', () => {
		it('should throw on unexpected character', () => {
			const lexer = new SqlLexer('SELECT @ FROM table');

			expect(() => lexer.tokenize()).toThrow(SqlParseError);
			expect(() => lexer.tokenize()).toThrow("Unexpected character: '@'");
		});

		it('should throw on unexpected character with position info', () => {
			const lexer = new SqlLexer('SELECT # FROM table');

			try {
				lexer.tokenize();
				fail('Expected SqlParseError to be thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(SqlParseError);
				const parseError = error as SqlParseError;
				expect(parseError.position).toBe(7); // Position of #
			}
		});
	});

	describe('comments', () => {
		it('should skip line comments', () => {
			const lexer = new SqlLexer('SELECT * -- this is a comment\nFROM account');
			const tokens = lexer.tokenize();

			expect(tokens.some(t => t.type === 'SELECT')).toBe(true);
			expect(tokens.some(t => t.type === 'FROM')).toBe(true);
			expect(tokens.some(t => t.value === 'comment')).toBe(false);
		});

		it('should skip block comments', () => {
			const lexer = new SqlLexer('SELECT /* block comment */ * FROM account');
			const tokens = lexer.tokenize();

			expect(tokens.some(t => t.type === 'SELECT')).toBe(true);
			expect(tokens.some(t => t.type === 'STAR')).toBe(true);
			expect(tokens.some(t => t.value === 'block')).toBe(false);
		});
	});

	describe('single character tokens', () => {
		it('should tokenize all single character tokens', () => {
			const lexer = new SqlLexer('(a, b.c *)');
			const tokens = lexer.tokenize();

			expect(tokens.some(t => t.type === 'LPAREN')).toBe(true);
			expect(tokens.some(t => t.type === 'COMMA')).toBe(true);
			expect(tokens.some(t => t.type === 'DOT')).toBe(true);
			expect(tokens.some(t => t.type === 'STAR')).toBe(true);
			expect(tokens.some(t => t.type === 'RPAREN')).toBe(true);
		});
	});

	describe('EOF token', () => {
		it('should end with EOF token', () => {
			const lexer = new SqlLexer('SELECT');
			const tokens = lexer.tokenize();

			const lastToken = tokens[tokens.length - 1];
			expect(lastToken!.type).toBe('EOF');
		});

		it('should return only EOF for empty string', () => {
			const lexer = new SqlLexer('');
			const tokens = lexer.tokenize();

			expect(tokens.length).toBe(1);
			expect(tokens[0]!.type).toBe('EOF');
		});

		it('should return only EOF for whitespace-only string', () => {
			const lexer = new SqlLexer('   \t\n  ');
			const tokens = lexer.tokenize();

			expect(tokens.length).toBe(1);
			expect(tokens[0]!.type).toBe('EOF');
		});
	});
});
