import { VirtualColumnDetector } from './VirtualColumnDetector';
import { AttributeSuggestion } from '../valueObjects/AttributeSuggestion';

describe('VirtualColumnDetector', () => {
	let detector: VirtualColumnDetector;

	beforeEach(() => {
		detector = new VirtualColumnDetector();
	});

	describe('detect', () => {
		it('should detect no virtual columns when all columns are regular', () => {
			const sqlColumns = [
				{ name: 'accountid', alias: null, tablePrefix: null },
				{ name: 'name', alias: null, tablePrefix: null },
			];
			const attributes = [
				AttributeSuggestion.create('accountid', 'Account ID', 'UniqueIdentifier', false, null),
				AttributeSuggestion.create('name', 'Name', 'String', false, null),
			];

			const result = detector.detect(sqlColumns, attributes);

			expect(result.needsTransformation).toBe(false);
			expect(result.virtualColumns).toHaveLength(0);
			expect(result.parentsToAdd).toHaveLength(0);
			expect(result.originalColumns).toEqual(['accountid', 'name']);
		});

		it('should detect virtual column when parent is not in SQL', () => {
			const sqlColumns = [
				{ name: 'createdbyname', alias: null, tablePrefix: null },
			];
			const attributes = [
				AttributeSuggestion.create('createdby', 'Created By', 'Lookup', false, null),
				AttributeSuggestion.create('createdbyname', 'Created By Name', 'String', false, 'createdby'),
			];

			const result = detector.detect(sqlColumns, attributes);

			expect(result.needsTransformation).toBe(true);
			expect(result.virtualColumns).toHaveLength(1);
			expect(result.virtualColumns[0]).toEqual({
				virtualColumn: 'createdbyname',
				parentColumn: 'createdby',
				alias: null,
			});
			expect(result.parentsToAdd).toEqual(['createdby']);
			expect(result.originalColumns).toEqual(['createdbyname']);
		});

		it('should not add parent when already in SQL', () => {
			const sqlColumns = [
				{ name: 'createdby', alias: null, tablePrefix: null },
				{ name: 'createdbyname', alias: null, tablePrefix: null },
			];
			const attributes = [
				AttributeSuggestion.create('createdby', 'Created By', 'Lookup', false, null),
				AttributeSuggestion.create('createdbyname', 'Created By Name', 'String', false, 'createdby'),
			];

			const result = detector.detect(sqlColumns, attributes);

			expect(result.needsTransformation).toBe(true);
			expect(result.virtualColumns).toHaveLength(1);
			expect(result.parentsToAdd).toHaveLength(0); // Parent already in SQL
			expect(result.originalColumns).toEqual(['createdby', 'createdbyname']);
		});

		it('should preserve aliases on virtual columns', () => {
			const sqlColumns = [
				{ name: 'createdbyname', alias: 'creator', tablePrefix: null },
			];
			const attributes = [
				AttributeSuggestion.create('createdby', 'Created By', 'Lookup', false, null),
				AttributeSuggestion.create('createdbyname', 'Created By Name', 'String', false, 'createdby'),
			];

			const result = detector.detect(sqlColumns, attributes);

			expect(result.virtualColumns[0]?.alias).toBe('creator');
			expect(result.originalColumns).toEqual(['creator']);
		});

		it('should handle optionset virtual columns', () => {
			const sqlColumns = [
				{ name: 'statuscodename', alias: null, tablePrefix: null },
			];
			const attributes = [
				AttributeSuggestion.create('statuscode', 'Status Code', 'Picklist', false, null),
				AttributeSuggestion.create('statuscodename', 'Status Code Name', 'String', false, 'statuscode'),
			];

			const result = detector.detect(sqlColumns, attributes);

			expect(result.needsTransformation).toBe(true);
			expect(result.virtualColumns).toHaveLength(1);
			expect(result.virtualColumns[0]?.parentColumn).toBe('statuscode');
			expect(result.parentsToAdd).toEqual(['statuscode']);
		});

		it('should handle multiple virtual columns', () => {
			const sqlColumns = [
				{ name: 'createdbyname', alias: null, tablePrefix: null },
				{ name: 'modifiedbyname', alias: null, tablePrefix: null },
			];
			const attributes = [
				AttributeSuggestion.create('createdby', 'Created By', 'Lookup', false, null),
				AttributeSuggestion.create('createdbyname', 'Created By Name', 'String', false, 'createdby'),
				AttributeSuggestion.create('modifiedby', 'Modified By', 'Lookup', false, null),
				AttributeSuggestion.create('modifiedbyname', 'Modified By Name', 'String', false, 'modifiedby'),
			];

			const result = detector.detect(sqlColumns, attributes);

			expect(result.needsTransformation).toBe(true);
			expect(result.virtualColumns).toHaveLength(2);
			expect(result.parentsToAdd).toEqual(['createdby', 'modifiedby']);
		});

		it('should handle case-insensitive column matching', () => {
			const sqlColumns = [
				{ name: 'CREATEDBYNAME', alias: null, tablePrefix: null },
			];
			const attributes = [
				AttributeSuggestion.create('createdby', 'Created By', 'Lookup', false, null),
				AttributeSuggestion.create('createdbyname', 'Created By Name', 'String', false, 'createdby'),
			];

			const result = detector.detect(sqlColumns, attributes);

			expect(result.needsTransformation).toBe(true);
			expect(result.virtualColumns).toHaveLength(1);
		});

		it('should not add duplicate parents when same parent needed multiple times', () => {
			// Edge case: if somehow same parent is referenced by multiple virtual columns
			const sqlColumns = [
				{ name: 'createdbyname', alias: null, tablePrefix: null },
				{ name: 'createdbyname', alias: 'alias2', tablePrefix: null },
			];
			const attributes = [
				AttributeSuggestion.create('createdby', 'Created By', 'Lookup', false, null),
				AttributeSuggestion.create('createdbyname', 'Created By Name', 'String', false, 'createdby'),
			];

			const result = detector.detect(sqlColumns, attributes);

			expect(result.parentsToAdd).toHaveLength(1);
			expect(result.parentsToAdd[0]).toBe('createdby');
		});

		it('should handle empty column list', () => {
			const result = detector.detect([], []);

			expect(result.needsTransformation).toBe(false);
			expect(result.virtualColumns).toHaveLength(0);
			expect(result.parentsToAdd).toHaveLength(0);
			expect(result.originalColumns).toHaveLength(0);
		});

		it('should handle column not found in attributes', () => {
			const sqlColumns = [
				{ name: 'unknowncolumn', alias: null, tablePrefix: null },
			];
			const attributes = [
				AttributeSuggestion.create('accountid', 'Account ID', 'UniqueIdentifier', false, null),
			];

			const result = detector.detect(sqlColumns, attributes);

			expect(result.needsTransformation).toBe(false);
			expect(result.virtualColumns).toHaveLength(0);
		});
	});

	describe('filterResultColumns', () => {
		it('should filter columns to original request', () => {
			const resultColumns = ['accountid', 'name', 'createdby', 'createdbyname'];
			const originalColumns = ['name', 'createdbyname'];
			const virtualColumns = [
				{ virtualColumn: 'createdbyname', parentColumn: 'createdby', alias: null },
			];

			const filtered = detector.filterResultColumns(resultColumns, originalColumns, virtualColumns);

			expect(filtered).toEqual(['name', 'createdbyname']);
		});

		it('should preserve order from original columns', () => {
			const resultColumns = ['createdbyname', 'name', 'accountid'];
			const originalColumns = ['accountid', 'createdbyname'];
			const virtualColumns = [
				{ virtualColumn: 'createdbyname', parentColumn: 'createdby', alias: null },
			];

			const filtered = detector.filterResultColumns(resultColumns, originalColumns, virtualColumns);

			expect(filtered).toEqual(['accountid', 'createdbyname']);
		});

		it('should handle aliased virtual columns', () => {
			const resultColumns = ['accountid', 'creator'];
			const originalColumns = ['accountid', 'creator'];
			const virtualColumns = [
				{ virtualColumn: 'createdbyname', parentColumn: 'createdby', alias: 'creator' },
			];

			const filtered = detector.filterResultColumns(resultColumns, originalColumns, virtualColumns);

			expect(filtered).toEqual(['accountid', 'creator']);
		});

		it('should handle empty result', () => {
			const filtered = detector.filterResultColumns([], ['name'], []);

			expect(filtered).toEqual([]);
		});

		it('should handle case-insensitive matching', () => {
			const resultColumns = ['Name', 'AccountId'];
			const originalColumns = ['name', 'accountid'];
			const virtualColumns: { virtualColumn: string; parentColumn: string; alias: null }[] = [];

			const filtered = detector.filterResultColumns(resultColumns, originalColumns, virtualColumns);

			expect(filtered).toEqual(['Name', 'AccountId']);
		});

		it('should not include duplicate columns', () => {
			const resultColumns = ['name', 'name', 'accountid'];
			const originalColumns = ['name', 'accountid'];
			const virtualColumns: { virtualColumn: string; parentColumn: string; alias: null }[] = [];

			const filtered = detector.filterResultColumns(resultColumns, originalColumns, virtualColumns);

			expect(filtered).toEqual(['name', 'accountid']);
		});

		it('should match virtual column to aliased result through virtualResultNames map', () => {
			// User requested 'createdbyname' with alias 'creator'
			// Original columns stores the ALIAS as the column name
			// virtualResultNames maps 'createdbyname' -> 'creator'
			// Result has 'creator' (not 'createdbyname')
			// So 'createdbyname' in original should match 'creator' in result via the map
			const resultColumns = ['accountid', 'creator'];
			const originalColumns = ['accountid', 'createdbyname']; // Virtual column name before alias resolution
			const virtualColumns = [
				{ virtualColumn: 'createdbyname', parentColumn: 'createdby', alias: 'creator' },
			];

			const filtered = detector.filterResultColumns(resultColumns, originalColumns, virtualColumns);

			// 'createdbyname' should match 'creator' via virtualResultNames map
			expect(filtered).toEqual(['accountid', 'creator']);
		});
	});
});
