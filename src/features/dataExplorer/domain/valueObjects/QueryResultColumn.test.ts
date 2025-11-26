import { QueryResultColumn } from './QueryResultColumn';

describe('QueryResultColumn', () => {
	describe('constructor', () => {
		it('should create column with all properties', () => {
			const column = new QueryResultColumn('accountname', 'Account Name', 'string');

			expect(column.logicalName).toBe('accountname');
			expect(column.displayName).toBe('Account Name');
			expect(column.dataType).toBe('string');
		});

		it('should store empty displayName', () => {
			const column = new QueryResultColumn('name', '', 'string');

			expect(column.logicalName).toBe('name');
			expect(column.displayName).toBe('');
		});
	});

	describe('dataType variations', () => {
		it.each([
			['string', 'string'],
			['number', 'number'],
			['boolean', 'boolean'],
			['datetime', 'datetime'],
			['guid', 'guid'],
			['lookup', 'lookup'],
			['optionset', 'optionset'],
			['money', 'money'],
			['unknown', 'unknown'],
		] as const)('should accept %s data type', (dataType, expected) => {
			const column = new QueryResultColumn('col', 'Col', dataType);

			expect(column.dataType).toBe(expected);
		});
	});
});
