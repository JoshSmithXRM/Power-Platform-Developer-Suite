import { FilterCriteriaMapper } from './FilterCriteriaMapper';
import { FilterField } from '../../domain/valueObjects/FilterField';
import { FilterOperator } from '../../domain/valueObjects/FilterOperator';
import { TraceFilter } from '../../domain/entities/TraceFilter';
import { FilterCondition } from '../../domain/entities/FilterCondition';
import type { FilterCriteriaViewModel } from '../../application/viewModels/FilterCriteriaViewModel';

describe('FilterCriteriaMapper', () => {
	let mapper: FilterCriteriaMapper;

	beforeEach(() => {
		mapper = new FilterCriteriaMapper();
	});

	describe('toDomain', () => {
		it('should map valid ViewModel to TraceFilter', () => {
			const viewModel: FilterCriteriaViewModel = {
				conditions: [
					{
						id: 'condition-0',
						enabled: true,
						field: 'Plugin Name',
						operator: 'Contains',
						value: 'MyPlugin',
						logicalOperator: 'and'
					}
				],
				top: 100
			};

			const result = mapper.toDomain(viewModel);

			expect(result).toBeInstanceOf(TraceFilter);
			expect(result.top).toBe(100);
			expect(result.conditions).toHaveLength(1);
			expect(result.conditions[0]?.field).toBe(FilterField.PluginName);
			expect(result.conditions[0]?.operator).toBe(FilterOperator.Contains);
			expect(result.conditions[0]?.value).toBe('MyPlugin');
			expect(result.conditions[0]?.enabled).toBe(true);
			expect(result.conditions[0]?.logicalOperator).toBe('and');
		});

		it('should map multiple conditions', () => {
			const viewModel: FilterCriteriaViewModel = {
				conditions: [
					{
						id: 'condition-0',
						enabled: true,
						field: 'Plugin Name',
						operator: 'Contains',
						value: 'MyPlugin',
						logicalOperator: 'and'
					},
					{
						id: 'condition-1',
						enabled: true,
						field: 'Entity Name',
						operator: 'Equals',
						value: 'account',
						logicalOperator: 'or'
					}
				],
				top: 50
			};

			const result = mapper.toDomain(viewModel);

			expect(result.conditions).toHaveLength(2);
			expect(result.conditions[0]?.logicalOperator).toBe('and');
			expect(result.conditions[1]?.logicalOperator).toBe('or');
		});

		it('should map ExceptionDetails field correctly', () => {
			const viewModel: FilterCriteriaViewModel = {
				conditions: [
					{
						id: 'condition-0',
						enabled: true,
						field: 'Exception Details',
						operator: 'Contains',
						value: 'NullReference',
						logicalOperator: 'and'
					}
				],
				top: 100
			};

			const result = mapper.toDomain(viewModel);

			expect(result.conditions).toHaveLength(1);
			expect(result.conditions[0]?.field).toBe(FilterField.ExceptionDetails);
			expect(result.conditions[0]?.value).toBe('NullReference');
		});

		describe('invalid condition filtering', () => {
			it('should filter out conditions with invalid field names', () => {
				const viewModel: FilterCriteriaViewModel = {
					conditions: [
						{
							id: 'condition-0',
							enabled: true,
							field: 'Invalid Field Name',
							operator: 'Contains',
							value: 'test',
							logicalOperator: 'and'
						},
						{
							id: 'condition-1',
							enabled: true,
							field: 'Plugin Name',
							operator: 'Contains',
							value: 'MyPlugin',
							logicalOperator: 'and'
						}
					],
					top: 100
				};

				const result = mapper.toDomain(viewModel);

				expect(result.conditions).toHaveLength(1);
				expect(result.conditions[0]?.field).toBe(FilterField.PluginName);
			});

			it('should filter out conditions with invalid operator names', () => {
				const viewModel: FilterCriteriaViewModel = {
					conditions: [
						{
							id: 'condition-0',
							enabled: true,
							field: 'Plugin Name',
							operator: 'Invalid Operator',
							value: 'test',
							logicalOperator: 'and'
						},
						{
							id: 'condition-1',
							enabled: true,
							field: 'Entity Name',
							operator: 'Equals',
							value: 'account',
							logicalOperator: 'and'
						}
					],
					top: 100
				};

				const result = mapper.toDomain(viewModel);

				expect(result.conditions).toHaveLength(1);
				expect(result.conditions[0]?.field).toBe(FilterField.EntityName);
			});

			it('should filter out conditions with empty values', () => {
				const viewModel: FilterCriteriaViewModel = {
					conditions: [
						{
							id: 'condition-0',
							enabled: true,
							field: 'Plugin Name',
							operator: 'Contains',
							value: '',
							logicalOperator: 'and'
						},
						{
							id: 'condition-1',
							enabled: true,
							field: 'Entity Name',
							operator: 'Equals',
							value: 'account',
							logicalOperator: 'and'
						}
					],
					top: 100
				};

				const result = mapper.toDomain(viewModel);

				expect(result.conditions).toHaveLength(1);
				expect(result.conditions[0]?.field).toBe(FilterField.EntityName);
			});

			it('should filter out conditions with whitespace-only values', () => {
				const viewModel: FilterCriteriaViewModel = {
					conditions: [
						{
							id: 'condition-0',
							enabled: true,
							field: 'Plugin Name',
							operator: 'Contains',
							value: '   ',
							logicalOperator: 'and'
						},
						{
							id: 'condition-1',
							enabled: true,
							field: 'Entity Name',
							operator: 'Equals',
							value: 'account',
							logicalOperator: 'and'
						}
					],
					top: 100
				};

				const result = mapper.toDomain(viewModel);

				expect(result.conditions).toHaveLength(1);
				expect(result.conditions[0]?.field).toBe(FilterField.EntityName);
			});

			it('should filter out conditions with incompatible operator for field type', () => {
				// Duration (number field) with Contains operator (text operator)
				// This should throw validation error in FilterCondition.create and be filtered out
				const viewModel: FilterCriteriaViewModel = {
					conditions: [
						{
							id: 'condition-0',
							enabled: true,
							field: 'Duration (ms)',
							operator: 'Contains',
							value: '1000',
							logicalOperator: 'and'
						},
						{
							id: 'condition-1',
							enabled: true,
							field: 'Plugin Name',
							operator: 'Contains',
							value: 'MyPlugin',
							logicalOperator: 'and'
						}
					],
					top: 100
				};

				const result = mapper.toDomain(viewModel);

				expect(result.conditions).toHaveLength(1);
				expect(result.conditions[0]?.field).toBe(FilterField.PluginName);
			});

			it('should return TraceFilter with no conditions if all are invalid', () => {
				const viewModel: FilterCriteriaViewModel = {
					conditions: [
						{
							id: 'condition-0',
							enabled: true,
							field: 'Invalid Field',
							operator: 'Contains',
							value: 'test',
							logicalOperator: 'and'
						},
						{
							id: 'condition-1',
							enabled: true,
							field: 'Plugin Name',
							operator: 'Invalid Operator',
							value: 'test',
							logicalOperator: 'and'
						}
					],
					top: 100
				};

				const result = mapper.toDomain(viewModel);

				expect(result.conditions).toHaveLength(0);
				expect(result.top).toBe(100);
			});
		});

		describe('disabled conditions', () => {
			it('should preserve disabled state when mapping to domain', () => {
				const viewModel: FilterCriteriaViewModel = {
					conditions: [
						{
							id: 'condition-0',
							enabled: false,
							field: 'Plugin Name',
							operator: 'Contains',
							value: 'MyPlugin',
							logicalOperator: 'and'
						}
					],
					top: 100
				};

				const result = mapper.toDomain(viewModel);

				expect(result.conditions).toHaveLength(1);
				expect(result.conditions[0]?.enabled).toBe(false);
			});
		});
	});

	describe('toViewModel', () => {
		it('should map TraceFilter to ViewModel', () => {
			const filter = TraceFilter.create({
				top: 100,
				conditions: [
					FilterCondition.create({
						field: FilterField.PluginName,
						operator: FilterOperator.Contains,
						value: 'MyPlugin',
						enabled: true,
						logicalOperator: 'and'
					})
				]
			});

			const result = mapper.toViewModel(filter);

			expect(result.top).toBe(100);
			expect(result.conditions).toHaveLength(1);
			expect(result.conditions[0]?.id).toBe('condition-0');
			expect(result.conditions[0]?.field).toBe('Plugin Name');
			expect(result.conditions[0]?.operator).toBe('Contains');
			expect(result.conditions[0]?.value).toBe('MyPlugin');
			expect(result.conditions[0]?.enabled).toBe(true);
			expect(result.conditions[0]?.logicalOperator).toBe('and');
		});

		it('should generate unique IDs for multiple conditions', () => {
			const filter = TraceFilter.create({
				top: 50,
				conditions: [
					FilterCondition.create({
						field: FilterField.PluginName,
						operator: FilterOperator.Contains,
						value: 'Plugin1',
						enabled: true,
						logicalOperator: 'and'
					}),
					FilterCondition.create({
						field: FilterField.EntityName,
						operator: FilterOperator.Equals,
						value: 'account',
						enabled: true,
						logicalOperator: 'or'
					}),
					FilterCondition.create({
						field: FilterField.MessageName,
						operator: FilterOperator.StartsWith,
						value: 'Create',
						enabled: true,
						logicalOperator: 'and'
					})
				]
			});

			const result = mapper.toViewModel(filter);

			expect(result.conditions).toHaveLength(3);
			expect(result.conditions[0]?.id).toBe('condition-0');
			expect(result.conditions[1]?.id).toBe('condition-1');
			expect(result.conditions[2]?.id).toBe('condition-2');
		});

		it('should map ExceptionDetails field to display name', () => {
			const filter = TraceFilter.create({
				top: 100,
				conditions: [
					FilterCondition.create({
						field: FilterField.ExceptionDetails,
						operator: FilterOperator.Contains,
						value: 'NullReference',
						enabled: true,
						logicalOperator: 'and'
					})
				]
			});

			const result = mapper.toViewModel(filter);

			expect(result.conditions[0]?.field).toBe('Exception Details');
		});

		it('should preserve logical operators', () => {
			const filter = TraceFilter.create({
				top: 100,
				conditions: [
					FilterCondition.create({
						field: FilterField.PluginName,
						operator: FilterOperator.Contains,
						value: 'Plugin1',
						enabled: true,
						logicalOperator: 'and'
					}),
					FilterCondition.create({
						field: FilterField.EntityName,
						operator: FilterOperator.Equals,
						value: 'account',
						enabled: true,
						logicalOperator: 'or'
					})
				]
			});

			const result = mapper.toViewModel(filter);

			expect(result.conditions[0]?.logicalOperator).toBe('and');
			expect(result.conditions[1]?.logicalOperator).toBe('or');
		});

		it('should preserve disabled state', () => {
			const filter = TraceFilter.create({
				top: 100,
				conditions: [
					FilterCondition.create({
						field: FilterField.PluginName,
						operator: FilterOperator.Contains,
						value: 'MyPlugin',
						enabled: false,
						logicalOperator: 'and'
					})
				]
			});

			const result = mapper.toViewModel(filter);

			expect(result.conditions[0]?.enabled).toBe(false);
		});

		it('should handle TraceFilter with no conditions', () => {
			const filter = TraceFilter.create({
				top: 100,
				conditions: []
			});

			const result = mapper.toViewModel(filter);

			expect(result.conditions).toHaveLength(0);
			expect(result.top).toBe(100);
		});
	});

	describe('empty', () => {
		it('should create empty FilterCriteriaViewModel', () => {
			const result = FilterCriteriaMapper.empty();

			expect(result.conditions).toEqual([]);
			expect(result.top).toBe(100);
		});

		it('should return new instance each time', () => {
			const result1 = FilterCriteriaMapper.empty();
			const result2 = FilterCriteriaMapper.empty();

			expect(result1).not.toBe(result2);
			expect(result1.conditions).not.toBe(result2.conditions);
		});
	});

	describe('createEmptyCondition', () => {
		it('should create empty condition with provided ID', () => {
			const result = FilterCriteriaMapper.createEmptyCondition('test-id');

			expect(result.id).toBe('test-id');
			expect(result.enabled).toBe(true);
			expect(result.field).toBe('Plugin Name');
			expect(result.operator).toBe('Contains');
			expect(result.value).toBe('');
			expect(result.logicalOperator).toBe('and');
		});

		it('should create empty condition with different IDs', () => {
			const result1 = FilterCriteriaMapper.createEmptyCondition('id-1');
			const result2 = FilterCriteriaMapper.createEmptyCondition('id-2');

			expect(result1.id).toBe('id-1');
			expect(result2.id).toBe('id-2');
		});

		it('should use Plugin Name and Contains as defaults', () => {
			const result = FilterCriteriaMapper.createEmptyCondition('test');

			expect(result.field).toBe(FilterField.PluginName.displayName);
			expect(result.operator).toBe(FilterOperator.Contains.displayName);
		});
	});

	describe('round-trip conversion', () => {
		it('should maintain data integrity through ViewModel -> Domain -> ViewModel conversion', () => {
			const originalViewModel: FilterCriteriaViewModel = {
				conditions: [
					{
						id: 'condition-0',
						enabled: true,
						field: 'Plugin Name',
						operator: 'Contains',
						value: 'MyPlugin',
						logicalOperator: 'and'
					},
					{
						id: 'condition-1',
						enabled: false,
						field: 'Entity Name',
						operator: 'Equals',
						value: 'account',
						logicalOperator: 'or'
					}
				],
				top: 75
			};

			const domain = mapper.toDomain(originalViewModel);
			const resultViewModel = mapper.toViewModel(domain);

			expect(resultViewModel.top).toBe(originalViewModel.top);
			expect(resultViewModel.conditions).toHaveLength(originalViewModel.conditions.length);

			// IDs will be regenerated, but other properties should match
			expect(resultViewModel.conditions[0]?.field).toBe(originalViewModel.conditions[0]?.field);
			expect(resultViewModel.conditions[0]?.operator).toBe(originalViewModel.conditions[0]?.operator);
			expect(resultViewModel.conditions[0]?.value).toBe(originalViewModel.conditions[0]?.value);
			expect(resultViewModel.conditions[0]?.enabled).toBe(originalViewModel.conditions[0]?.enabled);
			expect(resultViewModel.conditions[0]?.logicalOperator).toBe(originalViewModel.conditions[0]?.logicalOperator);

			expect(resultViewModel.conditions[1]?.field).toBe(originalViewModel.conditions[1]?.field);
			expect(resultViewModel.conditions[1]?.operator).toBe(originalViewModel.conditions[1]?.operator);
			expect(resultViewModel.conditions[1]?.value).toBe(originalViewModel.conditions[1]?.value);
			expect(resultViewModel.conditions[1]?.enabled).toBe(originalViewModel.conditions[1]?.enabled);
			expect(resultViewModel.conditions[1]?.logicalOperator).toBe(originalViewModel.conditions[1]?.logicalOperator);
		});
	});
});
