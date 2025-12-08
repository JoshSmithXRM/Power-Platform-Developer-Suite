import { AttributeSuggestion } from '../../domain/valueObjects/AttributeSuggestion';
import { ColumnOptionViewModelMapper } from './ColumnOptionViewModelMapper';

describe('ColumnOptionViewModelMapper', () => {
	let mapper: ColumnOptionViewModelMapper;

	beforeEach(() => {
		mapper = new ColumnOptionViewModelMapper();
	});

	describe('toViewModels', () => {
		it('should map attribute suggestions to view models', () => {
			const attributes = [
				AttributeSuggestion.create('name', 'Account Name', 'String', false),
				AttributeSuggestion.create('accountid', 'Account ID', 'UniqueIdentifier', false),
			];

			const result = mapper.toViewModels(attributes, []);

			expect(result).toHaveLength(2);
			expect(result[0]!.logicalName).toBe('accountid');
			expect(result[0]!.displayName).toBe('Account ID');
			expect(result[0]!.attributeType).toBe('UniqueIdentifier');
			expect(result[0]!.isSelected).toBe(false);
		});

		it('should sort attributes alphabetically by logical name', () => {
			const attributes = [
				AttributeSuggestion.create('zzz', 'Z Field', 'String', false),
				AttributeSuggestion.create('aaa', 'A Field', 'String', false),
				AttributeSuggestion.create('mmm', 'M Field', 'String', false),
			];

			const result = mapper.toViewModels(attributes, []);

			expect(result[0]!.logicalName).toBe('aaa');
			expect(result[1]!.logicalName).toBe('mmm');
			expect(result[2]!.logicalName).toBe('zzz');
		});

		it('should mark selected columns as isSelected true', () => {
			const attributes = [
				AttributeSuggestion.create('name', 'Account Name', 'String', false),
				AttributeSuggestion.create('accountid', 'Account ID', 'UniqueIdentifier', false),
				AttributeSuggestion.create('revenue', 'Revenue', 'Money', false),
			];
			const selectedColumnNames = ['name', 'revenue'];

			const result = mapper.toViewModels(attributes, selectedColumnNames);

			expect(result).toHaveLength(3);

			// Sorted alphabetically
			const accountIdResult = result.find(r => r.logicalName === 'accountid')!;
			const nameResult = result.find(r => r.logicalName === 'name')!;
			const revenueResult = result.find(r => r.logicalName === 'revenue')!;

			expect(accountIdResult.isSelected).toBe(false);
			expect(nameResult.isSelected).toBe(true);
			expect(revenueResult.isSelected).toBe(true);
		});

		it('should handle empty attributes array', () => {
			const result = mapper.toViewModels([], ['name']);

			expect(result).toHaveLength(0);
		});

		it('should handle empty selected columns (SELECT *)', () => {
			const attributes = [
				AttributeSuggestion.create('name', 'Account Name', 'String', false),
				AttributeSuggestion.create('accountid', 'Account ID', 'UniqueIdentifier', false),
			];

			const result = mapper.toViewModels(attributes, []);

			expect(result).toHaveLength(2);
			result.forEach(r => expect(r.isSelected).toBe(false));
		});

		it('should handle all columns selected', () => {
			const attributes = [
				AttributeSuggestion.create('name', 'Account Name', 'String', false),
				AttributeSuggestion.create('accountid', 'Account ID', 'UniqueIdentifier', false),
			];
			const selectedColumnNames = ['name', 'accountid'];

			const result = mapper.toViewModels(attributes, selectedColumnNames);

			expect(result).toHaveLength(2);
			result.forEach(r => expect(r.isSelected).toBe(true));
		});

		it('should ignore selected columns not in attributes', () => {
			const attributes = [
				AttributeSuggestion.create('name', 'Account Name', 'String', false),
			];
			const selectedColumnNames = ['name', 'nonexistent'];

			const result = mapper.toViewModels(attributes, selectedColumnNames);

			expect(result).toHaveLength(1);
			expect(result[0]!.logicalName).toBe('name');
			expect(result[0]!.isSelected).toBe(true);
		});

		it('should preserve all attribute properties', () => {
			const attributes = [
				AttributeSuggestion.create('new_customfield', 'Custom Field', 'Picklist', true),
			];

			const result = mapper.toViewModels(attributes, []);

			expect(result).toHaveLength(1);
			expect(result[0]!.logicalName).toBe('new_customfield');
			expect(result[0]!.displayName).toBe('Custom Field');
			expect(result[0]!.attributeType).toBe('Picklist');
			expect(result[0]!.isSelected).toBe(false);
		});

		it('should handle various attribute types', () => {
			const attributes = [
				AttributeSuggestion.create('amount', 'Amount', 'Money', false),
				AttributeSuggestion.create('description', 'Description', 'Memo', false),
				AttributeSuggestion.create('isactive', 'Is Active', 'Boolean', false),
				AttributeSuggestion.create('createdon', 'Created On', 'DateTime', false),
				AttributeSuggestion.create('contactid', 'Contact', 'Lookup', false),
			];

			const result = mapper.toViewModels(attributes, ['amount', 'isactive']);

			expect(result).toHaveLength(5);

			const amountResult = result.find(r => r.logicalName === 'amount')!;
			expect(amountResult.attributeType).toBe('Money');
			expect(amountResult.isSelected).toBe(true);

			const descResult = result.find(r => r.logicalName === 'description')!;
			expect(descResult.attributeType).toBe('Memo');
			expect(descResult.isSelected).toBe(false);

			const isActiveResult = result.find(r => r.logicalName === 'isactive')!;
			expect(isActiveResult.attributeType).toBe('Boolean');
			expect(isActiveResult.isSelected).toBe(true);
		});

		it('should not mutate the original attributes array', () => {
			const attributes = [
				AttributeSuggestion.create('zzz', 'Z Field', 'String', false),
				AttributeSuggestion.create('aaa', 'A Field', 'String', false),
			];
			const originalFirst = attributes[0]!.logicalName;

			mapper.toViewModels(attributes, []);

			// Original array should be unchanged
			expect(attributes[0]!.logicalName).toBe(originalFirst);
		});
	});
});
