import * as vscode from 'vscode';

import { PluginTraceFilterManagementBehavior } from './PluginTraceFilterManagementBehavior';
import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { IPanelStateRepository } from '../../../../shared/infrastructure/ui/IPanelStateRepository';
import { FilterCriteriaMapper } from '../mappers/FilterCriteriaMapper';
import type { FilterCriteriaViewModel } from '../../application/viewModels/FilterCriteriaViewModel';
import { NullLogger } from '../../../../infrastructure/logging/NullLogger';
import { assertDefined } from '../../../../shared/testing';

describe('PluginTraceFilterManagementBehavior', () => {
	let behavior: PluginTraceFilterManagementBehavior;
	let mockWebview: jest.Mocked<vscode.Webview>;
	let mockLogger: ILogger;
	let mockPanelStateRepository: jest.Mocked<IPanelStateRepository>;
	let mockOnRefreshNeeded: jest.Mock;
	let mockOnPersistState: jest.Mock;

	const TEST_VIEW_TYPE = 'testPanelType';
	const TEST_ENVIRONMENT_ID = 'test-env-id';

	beforeEach(() => {
		// Mock webview
		mockWebview = {
			postMessage: jest.fn().mockResolvedValue(true)
		} as unknown as jest.Mocked<vscode.Webview>;

		// Mock logger
		mockLogger = new NullLogger();

		// Mock panel state repository
		mockPanelStateRepository = {
			load: jest.fn().mockResolvedValue(null),
			save: jest.fn().mockResolvedValue(undefined)
		} as unknown as jest.Mocked<IPanelStateRepository>;

		// Mock callbacks
		mockOnRefreshNeeded = jest.fn().mockResolvedValue(undefined);
		mockOnPersistState = jest.fn().mockResolvedValue(undefined);

		// Create behavior instance
		behavior = new PluginTraceFilterManagementBehavior(
			mockWebview,
			mockLogger,
			mockPanelStateRepository,
			TEST_VIEW_TYPE,
			mockOnRefreshNeeded,
			mockOnPersistState
		);
	});

	describe('constructor', () => {
		it('should initialize with empty filter criteria', () => {
			const criteria = behavior.getFilterCriteria();

			expect(criteria).toEqual(FilterCriteriaMapper.empty());
		});

		it('should initialize with empty reconstructed quick filter IDs', () => {
			const ids = behavior.getReconstructedQuickFilterIds();

			expect(ids).toEqual([]);
		});
	});

	describe('applyFilters', () => {
		it('should apply basic filter without quick filters', async () => {
			const filterData: Partial<FilterCriteriaViewModel> & { quickFilterIds?: string[] } = {
				conditions: [
					{
						id: '1',
						field: 'Type Name',
						operator: 'Equals',
						value: 'TestPlugin',
						enabled: true,
						logicalOperator: 'and'
					}
				]
			};

			await behavior.applyFilters(filterData);

			expect(mockOnPersistState).toHaveBeenCalled();
			expect(mockWebview.postMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					command: 'updateODataPreview'
				})
			);
			expect(mockOnRefreshNeeded).toHaveBeenCalled();
		});

		it('should expand quick filter IDs to conditions', async () => {
			const filterData = {
				quickFilterIds: ['lastHour']
			};

			await behavior.applyFilters(filterData);

			const criteria = behavior.getFilterCriteria();
			assertDefined(criteria.conditions);
			expect(criteria.conditions.length).toBeGreaterThan(0);
			assertDefined(criteria.conditions[0]);
			expect(criteria.conditions[0].field).toBe('Created On');
			expect(criteria.conditions[0].operator).toBe('Greater Than or Equal');
		});

		it('should recalculate relative time filters on apply', async () => {
			const filterData = {
				quickFilterIds: ['last24Hours']
			};

			await behavior.applyFilters(filterData);

			const criteria = behavior.getFilterCriteria();
			assertDefined(criteria.conditions);
			assertDefined(criteria.conditions[0]);
			const condition = criteria.conditions[0];

			// Value should be a recent timestamp (within last 25 hours)
			const conditionDate = new Date(condition.value);
			const now = new Date();
			const hoursDiff = (now.getTime() - conditionDate.getTime()) / (1000 * 60 * 60);

			expect(hoursDiff).toBeGreaterThanOrEqual(23);
			expect(hoursDiff).toBeLessThanOrEqual(25);
		});

		it('should merge quick filter conditions with advanced conditions', async () => {
			const filterData: Partial<FilterCriteriaViewModel> & { quickFilterIds?: string[] } = {
				quickFilterIds: ['exceptions'],
				conditions: [
					{
						id: '1',
						field: 'Type Name',
						operator: 'Equals',
						value: 'TestPlugin',
						enabled: true,
						logicalOperator: 'and'
					}
				]
			};

			await behavior.applyFilters(filterData);

			const criteria = behavior.getFilterCriteria();
			// exceptions quick filter + 1 advanced condition
			assertDefined(criteria.conditions);
			expect(criteria.conditions.length).toBeGreaterThan(1);
		});

		it('should normalize datetime values to UTC ISO format', async () => {
			const localDateTime = '2024-01-15T10:30';
			const filterData: Partial<FilterCriteriaViewModel> & { quickFilterIds?: string[] } = {
				conditions: [
					{
						id: '1',
						field: 'Created On',
						operator: 'Greater Than',
						value: localDateTime,
						enabled: true,
						logicalOperator: 'and'
					}
				]
			};

			await behavior.applyFilters(filterData);

			const criteria = behavior.getFilterCriteria();
			assertDefined(criteria.conditions);
			assertDefined(criteria.conditions[0]);
			expect(criteria.conditions[0].value).toContain('Z');
		});

		it('should handle errors gracefully', async () => {
			mockOnRefreshNeeded.mockRejectedValueOnce(new Error('Refresh failed'));

			const showErrorSpy = jest.spyOn(vscode.window, 'showErrorMessage').mockResolvedValue(undefined);

			await behavior.applyFilters({});

			expect(showErrorSpy).toHaveBeenCalledWith('Failed to apply filters');
			showErrorSpy.mockRestore();
		});

		it('should send OData query preview to webview', async () => {
			const filterData: Partial<FilterCriteriaViewModel> & { quickFilterIds?: string[] } = {
				conditions: [
					{
						id: '1',
						field: 'Type Name',
						operator: 'Equals',
						value: 'TestPlugin',
						enabled: true,
						logicalOperator: 'and'
					}
				]
			};

			await behavior.applyFilters(filterData);

			expect(mockWebview.postMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					command: 'updateODataPreview',
					data: expect.objectContaining({
						query: expect.stringMatching(/.+/)
					})
				})
			);
		});
	});

	describe('clearFilters', () => {
		it('should reset filter criteria to empty state', async () => {
			// First apply some filters
			await behavior.applyFilters({
				conditions: [
					{
						id: '1',
						field: 'Type Name',
						operator: 'Equals',
						value: 'TestPlugin',
						enabled: true,
						logicalOperator: 'and'
					}
				]
			});

			// Then clear
			await behavior.clearFilters();

			const criteria = behavior.getFilterCriteria();
			expect(criteria).toEqual(FilterCriteriaMapper.empty());
		});

		it('should persist empty filter criteria', async () => {
			await behavior.clearFilters();

			expect(mockOnPersistState).toHaveBeenCalled();
		});

		it('should send clear command to webview', async () => {
			await behavior.clearFilters();

			expect(mockWebview.postMessage).toHaveBeenCalledWith({
				command: 'clearFilterPanel'
			});
		});

		it('should refresh traces after clearing', async () => {
			await behavior.clearFilters();

			expect(mockOnRefreshNeeded).toHaveBeenCalled();
		});

		it('should update OData preview to show no filters', async () => {
			await behavior.clearFilters();

			expect(mockWebview.postMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					command: 'updateODataPreview',
					data: { query: 'No filters applied' }
				})
			);
		});

		it('should handle errors gracefully', async () => {
			mockOnRefreshNeeded.mockRejectedValueOnce(new Error('Refresh failed'));

			const showErrorSpy = jest.spyOn(vscode.window, 'showErrorMessage').mockResolvedValue(undefined);

			await behavior.clearFilters();

			expect(showErrorSpy).toHaveBeenCalledWith('Failed to clear filters');
			showErrorSpy.mockRestore();
		});
	});

	describe('loadFilterCriteria', () => {
		it('should load filter criteria from storage', async () => {
			const storedCriteria: FilterCriteriaViewModel = {
				conditions: [
					{
						id: '1',
						field: 'Type Name',
						operator: 'Equals',
						value: 'TestPlugin',
						enabled: true,
						logicalOperator: 'and'
					}
				],
				top: 500
			};

			mockPanelStateRepository.load.mockResolvedValueOnce({
				filterCriteria: storedCriteria
			});

			await behavior.loadFilterCriteria(TEST_ENVIRONMENT_ID);

			const criteria = behavior.getFilterCriteria();
			expect(criteria.conditions).toEqual(storedCriteria.conditions);
		});

		it('should reconstruct quick filter IDs from stored conditions', async () => {
			const storedCriteria: FilterCriteriaViewModel = {
				conditions: [
					{
						id: '1',
						field: 'Exception Details',
						operator: 'Not Equals',
						value: '',
						enabled: true,
						logicalOperator: 'and'
					}
				],
				top: 500
			};

			mockPanelStateRepository.load.mockResolvedValueOnce({
				filterCriteria: storedCriteria
			});

			await behavior.loadFilterCriteria(TEST_ENVIRONMENT_ID);

			const reconstructedIds = behavior.getReconstructedQuickFilterIds();
			expect(reconstructedIds).toContain('exceptions');
		});

		it('should separate quick filters from advanced filters on load', async () => {
			const storedCriteria: FilterCriteriaViewModel = {
				conditions: [
					{
						id: '1',
						field: 'Exception Details',
						operator: 'Not Equals',
						value: '',
						enabled: true,
						logicalOperator: 'and'
					},
					{
						id: '2',
						field: 'Type Name',
						operator: 'Equals',
						value: 'CustomPlugin',
						enabled: true,
						logicalOperator: 'and'
					}
				],
				top: 500
			};

			mockPanelStateRepository.load.mockResolvedValueOnce({
				filterCriteria: storedCriteria
			});

			await behavior.loadFilterCriteria(TEST_ENVIRONMENT_ID);

			const criteria = behavior.getFilterCriteria();
			const reconstructedIds = behavior.getReconstructedQuickFilterIds();

			// exceptions should be reconstructed as quick filter
			expect(reconstructedIds).toContain('exceptions');
			// CustomPlugin condition should remain as advanced filter
			assertDefined(criteria.conditions);
			expect(criteria.conditions.length).toBe(1);
			assertDefined(criteria.conditions[0]);
			expect(criteria.conditions[0].value).toBe('CustomPlugin');
		});

		it('should handle missing storage gracefully', async () => {
			mockPanelStateRepository.load.mockResolvedValueOnce(null);

			await behavior.loadFilterCriteria(TEST_ENVIRONMENT_ID);

			const criteria = behavior.getFilterCriteria();
			expect(criteria).toEqual(FilterCriteriaMapper.empty());
		});

		it('should handle null repository gracefully', async () => {
			const behaviorWithoutRepo = new PluginTraceFilterManagementBehavior(
				mockWebview,
				mockLogger,
				null,
				TEST_VIEW_TYPE,
				mockOnRefreshNeeded,
				mockOnPersistState
			);

			await behaviorWithoutRepo.loadFilterCriteria(TEST_ENVIRONMENT_ID);

			const criteria = behaviorWithoutRepo.getFilterCriteria();
			expect(criteria).toEqual(FilterCriteriaMapper.empty());
		});

		it('should handle invalid stored data gracefully', async () => {
			mockPanelStateRepository.load.mockResolvedValueOnce({
				filterCriteria: { invalid: 'data' }
			});

			await behavior.loadFilterCriteria(TEST_ENVIRONMENT_ID);

			// Should not throw, should handle gracefully
			const criteria = behavior.getFilterCriteria();
			expect(criteria).toEqual(FilterCriteriaMapper.empty());
		});
	});

	describe('saveFilterCriteria', () => {
		it('should save filter criteria to storage', async () => {
			const filterData: Partial<FilterCriteriaViewModel> = {
				conditions: [
					{
						id: '1',
						field: 'Type Name',
						operator: 'Equals',
						value: 'TestPlugin',
						enabled: true,
						logicalOperator: 'and'
					}
				]
			};

			await behavior.applyFilters(filterData);
			await behavior.saveFilterCriteria(TEST_ENVIRONMENT_ID, 30);

			expect(mockPanelStateRepository.save).toHaveBeenCalledWith(
				{
					panelType: TEST_VIEW_TYPE,
					environmentId: TEST_ENVIRONMENT_ID
				},
				expect.objectContaining({
					filterCriteria: expect.objectContaining({}),
					autoRefreshInterval: 30
				})
			);
		});

		it('should expand quick filters before saving', async () => {
			await behavior.applyFilters({ quickFilterIds: ['exceptions'] });
			await behavior.saveFilterCriteria(TEST_ENVIRONMENT_ID, 0);

			expect(mockPanelStateRepository.save).toHaveBeenCalledWith(
				expect.objectContaining({}),
				expect.objectContaining({
					filterCriteria: expect.objectContaining({
						conditions: expect.arrayContaining([
							expect.objectContaining({
								field: 'Exception Details',
								operator: 'Not Equals',
								value: ''
							})
						])
					})
				})
			);
		});

		it('should preserve existing state properties', async () => {
			mockPanelStateRepository.load.mockResolvedValueOnce({
				detailPanelWidth: 500,
				someOtherProperty: 'preserved'
			});

			await behavior.saveFilterCriteria(TEST_ENVIRONMENT_ID, 10);

			expect(mockPanelStateRepository.save).toHaveBeenCalledWith(
				expect.objectContaining({}),
				expect.objectContaining({
					detailPanelWidth: 500,
					someOtherProperty: 'preserved',
					autoRefreshInterval: 10
				})
			);
		});

		it('should handle null repository gracefully', async () => {
			const behaviorWithoutRepo = new PluginTraceFilterManagementBehavior(
				mockWebview,
				mockLogger,
				null,
				TEST_VIEW_TYPE,
				mockOnRefreshNeeded,
				mockOnPersistState
			);

			await behaviorWithoutRepo.saveFilterCriteria(TEST_ENVIRONMENT_ID, 0);

			// Should not throw
			expect(true).toBe(true);
		});
	});

	describe('edge cases', () => {
		it('should handle empty quick filter IDs array', async () => {
			await behavior.applyFilters({ quickFilterIds: [] });

			const criteria = behavior.getFilterCriteria();
			expect(criteria.conditions).toEqual([]);
		});

		it('should handle unknown quick filter ID gracefully', async () => {
			await behavior.applyFilters({ quickFilterIds: ['unknownFilterId'] });

			// Should not throw, should skip unknown ID
			const criteria = behavior.getFilterCriteria();
			expect(criteria.conditions).toEqual([]);
		});

		it('should handle multiple quick filters at once', async () => {
			await behavior.applyFilters({
				quickFilterIds: ['exceptions', 'lastHour']
			});

			const criteria = behavior.getFilterCriteria();
			assertDefined(criteria.conditions);
			expect(criteria.conditions.length).toBeGreaterThanOrEqual(2);
		});

		it('should handle datetime conversion failure gracefully', async () => {
			const filterData: Partial<FilterCriteriaViewModel> & { quickFilterIds?: string[] } = {
				conditions: [
					{
						id: '1',
						field: 'Created On',
						operator: 'Greater Than',
						value: 'invalid-date-format',
						enabled: true,
						logicalOperator: 'and'
					}
				]
			};

			await behavior.applyFilters(filterData);

			// Should not throw, should keep original value
			const criteria = behavior.getFilterCriteria();
			assertDefined(criteria.conditions);
			assertDefined(criteria.conditions[0]);
			expect(criteria.conditions[0].value).toBe('invalid-date-format');
		});

		it('should handle already normalized datetime values', async () => {
			const utcIsoValue = '2024-01-15T10:30:00.000Z';
			const filterData: Partial<FilterCriteriaViewModel> & { quickFilterIds?: string[] } = {
				conditions: [
					{
						id: '1',
						field: 'Created On',
						operator: 'Greater Than',
						value: utcIsoValue,
						enabled: true,
						logicalOperator: 'and'
					}
				]
			};

			await behavior.applyFilters(filterData);

			const criteria = behavior.getFilterCriteria();
			assertDefined(criteria.conditions);
			assertDefined(criteria.conditions[0]);
			expect(criteria.conditions[0].value).toBe(utcIsoValue);
		});
	});
});
