import { SqlContextDetector } from './SqlContextDetector';

describe('SqlContextDetector', () => {
	let detector: SqlContextDetector;

	beforeEach(() => {
		detector = new SqlContextDetector();
	});

	describe('detectContext - entity context', () => {
		it('should detect entity context after FROM', () => {
			const context = detector.detectContext('SELECT * FROM ', 14);
			expect(context.kind).toBe('entity');
		});

		it('should detect entity context when typing partial entity name after FROM', () => {
			const context = detector.detectContext('SELECT * FROM acc', 17);
			// Entity context so VS Code can filter entity suggestions by typed prefix
			expect(context.kind).toBe('entity');
		});

		it('should detect entity context after JOIN', () => {
			const context = detector.detectContext('SELECT * FROM account JOIN ', 27);
			expect(context.kind).toBe('entity');
		});

		it('should detect entity context after INNER JOIN', () => {
			const context = detector.detectContext('SELECT * FROM account INNER JOIN ', 33);
			expect(context.kind).toBe('entity');
		});

		it('should detect entity context after LEFT JOIN', () => {
			const context = detector.detectContext('SELECT * FROM account LEFT JOIN ', 32);
			expect(context.kind).toBe('entity');
		});
	});

	describe('detectContext - attribute context', () => {
		it('should detect attribute context after SELECT when FROM clause exists', () => {
			const context = detector.detectContext('SELECT  FROM account', 7);
			expect(context).toEqual({ kind: 'attribute', entityName: 'account' });
		});

		it('should detect attribute context after comma in SELECT list', () => {
			const context = detector.detectContext('SELECT name,  FROM account', 13);
			expect(context).toEqual({ kind: 'attribute', entityName: 'account' });
		});

		it('should detect attribute context after WHERE', () => {
			const context = detector.detectContext('SELECT * FROM account WHERE ', 28);
			expect(context).toEqual({ kind: 'attribute', entityName: 'account' });
		});

		it('should detect attribute context after AND', () => {
			const context = detector.detectContext("SELECT * FROM account WHERE name = 'test' AND ", 46);
			expect(context).toEqual({ kind: 'attribute', entityName: 'account' });
		});

		it('should detect attribute context after OR', () => {
			const context = detector.detectContext("SELECT * FROM account WHERE name = 'test' OR ", 45);
			expect(context).toEqual({ kind: 'attribute', entityName: 'account' });
		});

		it('should detect attribute context after ORDER BY', () => {
			const context = detector.detectContext('SELECT * FROM account ORDER BY ', 31);
			expect(context).toEqual({ kind: 'attribute', entityName: 'account' });
		});

		it('should detect attribute context after comma in ORDER BY', () => {
			const context = detector.detectContext('SELECT * FROM account ORDER BY name, ', 37);
			expect(context).toEqual({ kind: 'attribute', entityName: 'account' });
		});

		it('should not detect attribute context without FROM clause', () => {
			const context = detector.detectContext('SELECT ', 7);
			expect(context.kind).not.toBe('attribute');
		});

		it('should return lowercase entity name', () => {
			const context = detector.detectContext('SELECT  FROM Account', 7);
			expect(context).toEqual({ kind: 'attribute', entityName: 'account' });
		});
	});

	describe('detectContext - keyword context', () => {
		it('should detect keyword context at start of document', () => {
			const context = detector.detectContext('', 0);
			expect(context.kind).toBe('keyword');
		});

		it('should detect keyword context after semicolon', () => {
			const context = detector.detectContext('SELECT * FROM account;', 22);
			expect(context.kind).toBe('keyword');
		});

		it('should detect keyword context after entity name and space', () => {
			// After 'FROM account ' with trailing space - cursor at position 22
			const context = detector.detectContext('SELECT * FROM account ', 22);
			// Now suggests WHERE, ORDER BY, JOIN, etc.
			expect(context.kind).toBe('keyword');
			if (context.kind === 'keyword') {
				expect(context.suggestedKeywords).toContain('WHERE');
				expect(context.suggestedKeywords).toContain('ORDER BY');
				expect(context.suggestedKeywords).toContain('JOIN');
			}
		});
	});

	describe('detectContext - partial attribute typing (region detection)', () => {
		it('should detect attribute context when typing partial name in SELECT with FROM after cursor', () => {
			// User typed full query, then went back to edit column list
			// SQL: "SELECT na FROM account" with cursor at position 9 (after "na")
			const context = detector.detectContext('SELECT na FROM account', 9);
			expect(context).toEqual({ kind: 'attribute', entityName: 'account' });
		});

		it('should detect attribute context when replacing * with partial attribute name', () => {
			// User replaced * with partial typing: "SELECT n FROM account"
			const context = detector.detectContext('SELECT n FROM account', 8);
			expect(context).toEqual({ kind: 'attribute', entityName: 'account' });
		});

		it('should detect attribute context when typing after comma with partial name', () => {
			// User adding second column: "SELECT name, acc FROM account"
			const context = detector.detectContext('SELECT name, acc FROM account', 16);
			expect(context).toEqual({ kind: 'attribute', entityName: 'account' });
		});

		it('should detect attribute context when typing partial name in WHERE', () => {
			const context = detector.detectContext('SELECT * FROM account WHERE na', 30);
			expect(context).toEqual({ kind: 'attribute', entityName: 'account' });
		});

		it('should detect attribute context when typing partial name after AND', () => {
			const context = detector.detectContext("SELECT * FROM account WHERE name = 'test' AND stat", 50);
			expect(context).toEqual({ kind: 'attribute', entityName: 'account' });
		});

		it('should detect attribute context when typing partial name in ORDER BY', () => {
			const context = detector.detectContext('SELECT * FROM account ORDER BY na', 33);
			expect(context).toEqual({ kind: 'attribute', entityName: 'account' });
		});

		it('should detect attribute context when typing after comma in ORDER BY', () => {
			const context = detector.detectContext('SELECT * FROM account ORDER BY name, cr', 39);
			expect(context).toEqual({ kind: 'attribute', entityName: 'account' });
		});
	});

	describe('detectContext - none context', () => {
		it('should return keyword context when typing in SELECT without FROM', () => {
			// No FROM clause - returns keyword context (DISTINCT, TOP, FROM, etc.)
			// VS Code will filter by prefix - since "na" doesn't match any, user sees nothing
			const context = detector.detectContext('SELECT na', 9);
			expect(context.kind).toBe('keyword');
			if (context.kind === 'keyword') {
				expect(context.suggestedKeywords).toContain('FROM');
				expect(context.suggestedKeywords).toContain('DISTINCT');
			}
		});

		it('should return none when in string literal', () => {
			const context = detector.detectContext("SELECT * FROM account WHERE name = 'acc", 39);
			expect(context.kind).toBe('none');
		});
	});

	describe('getKeywords', () => {
		it('should return SQL keywords', () => {
			const keywords = detector.getKeywords();

			expect(keywords).toContain('SELECT');
			expect(keywords).toContain('FROM');
			expect(keywords).toContain('WHERE');
			expect(keywords).toContain('AND');
			expect(keywords).toContain('OR');
			expect(keywords).toContain('ORDER BY');
			expect(keywords).toContain('JOIN');
		});

		it('should include aggregate keywords for Phase 3', () => {
			const keywords = detector.getKeywords();

			expect(keywords).toContain('COUNT');
			expect(keywords).toContain('SUM');
			expect(keywords).toContain('AVG');
			expect(keywords).toContain('MIN');
			expect(keywords).toContain('MAX');
			expect(keywords).toContain('GROUP BY');
			expect(keywords).toContain('HAVING');
		});

		it('should include data modification keywords for Phase 4', () => {
			const keywords = detector.getKeywords();

			expect(keywords).toContain('INSERT');
			expect(keywords).toContain('INTO');
			expect(keywords).toContain('VALUES');
			expect(keywords).toContain('UPDATE');
			expect(keywords).toContain('SET');
			expect(keywords).toContain('DELETE');
		});
	});

	describe('detectContext - context-aware keyword suggestions', () => {
		it('should suggest statement keywords at start of document', () => {
			const context = detector.detectContext('', 0);
			expect(context.kind).toBe('keyword');
			if (context.kind === 'keyword') {
				expect(context.suggestedKeywords).toContain('SELECT');
				expect(context.suggestedKeywords).toContain('INSERT');
				expect(context.suggestedKeywords).toContain('UPDATE');
				expect(context.suggestedKeywords).toContain('DELETE');
				expect(context.suggestedKeywords).not.toContain('WHERE');
			}
		});

		it('should suggest statement keywords when typing partial SELECT', () => {
			const context = detector.detectContext('SEL', 3);
			expect(context.kind).toBe('keyword');
			if (context.kind === 'keyword') {
				expect(context.suggestedKeywords).toContain('SELECT');
			}
		});

		it('should suggest SELECT column keywords before FROM', () => {
			const context = detector.detectContext('SELECT ', 7);
			expect(context.kind).toBe('keyword');
			if (context.kind === 'keyword') {
				expect(context.suggestedKeywords).toContain('DISTINCT');
				expect(context.suggestedKeywords).toContain('TOP');
				expect(context.suggestedKeywords).toContain('FROM');
			}
		});

		it('should suggest clause keywords after FROM entity', () => {
			const context = detector.detectContext('SELECT * FROM account ', 22);
			expect(context.kind).toBe('keyword');
			if (context.kind === 'keyword') {
				expect(context.suggestedKeywords).toContain('WHERE');
				expect(context.suggestedKeywords).toContain('ORDER BY');
				expect(context.suggestedKeywords).toContain('JOIN');
				expect(context.suggestedKeywords).not.toContain('SELECT');
			}
		});

		it('should suggest AND/OR/ORDER BY after complete WHERE condition', () => {
			const context = detector.detectContext("SELECT * FROM account WHERE name = 'test' ", 42);
			expect(context.kind).toBe('keyword');
			if (context.kind === 'keyword') {
				expect(context.suggestedKeywords).toContain('AND');
				expect(context.suggestedKeywords).toContain('OR');
				expect(context.suggestedKeywords).toContain('ORDER BY');
			}
		});

		it('should suggest ASC/DESC after ORDER BY attribute', () => {
			const context = detector.detectContext('SELECT * FROM account ORDER BY name ', 36);
			expect(context.kind).toBe('keyword');
			if (context.kind === 'keyword') {
				expect(context.suggestedKeywords).toContain('ASC');
				expect(context.suggestedKeywords).toContain('DESC');
			}
		});
	});
});
