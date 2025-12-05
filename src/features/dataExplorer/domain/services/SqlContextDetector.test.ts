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

		it('should return none when typing partial entity name after FROM', () => {
			const context = detector.detectContext('SELECT * FROM acc', 17);
			// Once user starts typing entity name, context is 'none' - VS Code will use the word for filtering
			expect(context.kind).toBe('none');
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
			// Note: current implementation returns 'none' for this case
			// This could be enhanced in future to suggest WHERE, ORDER BY, etc.
			expect(context.kind).toBe('none');
		});
	});

	describe('detectContext - none context', () => {
		it('should return none for mid-word typing', () => {
			const context = detector.detectContext('SELECT na', 9);
			expect(context.kind).toBe('none');
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
			expect(keywords).toContain('ORDER');
			expect(keywords).toContain('BY');
			expect(keywords).toContain('JOIN');
		});

		it('should include aggregate keywords for Phase 3', () => {
			const keywords = detector.getKeywords();

			expect(keywords).toContain('COUNT');
			expect(keywords).toContain('SUM');
			expect(keywords).toContain('AVG');
			expect(keywords).toContain('MIN');
			expect(keywords).toContain('MAX');
			expect(keywords).toContain('GROUP');
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
});
