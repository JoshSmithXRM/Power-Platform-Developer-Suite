/**
 * Unit tests for FlowLinkView
 * Tests cover flow link rendering and view model enhancement with branch coverage
 */

import type { FlowConnectionRelationshipViewModel } from '../../application/viewModels/FlowConnectionRelationshipViewModel';
import { renderFlowLink, enhanceViewModelsWithFlowLinks } from './FlowLinkView';

describe('FlowLinkView', () => {
	describe('renderFlowLink', () => {
		it('should render clickable flow link with escaped ID and name', () => {
			const result = renderFlowLink('flow-123-guid', 'My Flow');

			expect(result).toContain('class="flow-link"');
			expect(result).toContain('data-command="openFlow"');
			expect(result).toContain('data-flow-id="flow-123-guid"');
			expect(result).toContain('>My Flow</a>');
		});

		it('should escape special characters in flow ID', () => {
			const result = renderFlowLink('<script>alert("xss")</script>', 'Flow');

			expect(result).not.toContain('<script>');
			expect(result).toContain('&lt;script&gt;');
		});

		it('should escape special characters in flow name', () => {
			const result = renderFlowLink('flow-123', '<b>Bold Flow</b>');

			expect(result).not.toContain('<b>');
			expect(result).toContain('&lt;b&gt;Bold Flow&lt;/b&gt;');
		});

		it('should escape quotes in flow ID', () => {
			const result = renderFlowLink('flow"123"guid', 'Flow');

			expect(result).toContain('data-flow-id="flow&quot;123&quot;guid"');
		});

		it('should escape quotes in flow name', () => {
			const result = renderFlowLink('flow-123', 'Flow "Name"');

			expect(result).toContain('>Flow &quot;Name&quot;</a>');
		});

		it('should handle ampersands in flow ID', () => {
			const result = renderFlowLink('flow&123', 'Flow');

			expect(result).toContain('data-flow-id="flow&amp;123"');
		});

		it('should handle ampersands in flow name', () => {
			const result = renderFlowLink('flow-123', 'Flow & Process');

			expect(result).toContain('>Flow &amp; Process</a>');
		});

		it('should produce valid anchor element structure', () => {
			const result = renderFlowLink('flow-123', 'My Flow');

			expect(result).toMatch(/<a href="#" class="flow-link".*<\/a>/);
		});
	});

	describe('enhanceViewModelsWithFlowLinks', () => {
		const createViewModel = (overrides?: Partial<FlowConnectionRelationshipViewModel>): FlowConnectionRelationshipViewModel => ({
			flowId: 'flow-123',
			flowName: 'My Flow',
			connectionReferenceId: 'ref-123',
			connectionReferenceLogicalName: 'connectionreference',
			connectionReferenceDisplayName: 'Ref Display',
			relationshipType: 'Contains',
			flowIsManaged: '0',
			connectionReferenceIsManaged: '0',
			flowModifiedOn: '2024-01-01',
			connectionReferenceModifiedOn: '2024-01-01',
			...overrides
		});

		it('should enhance view models with HTML flow links when flowId is present', () => {
			const viewModels = [createViewModel()];

			const result = enhanceViewModelsWithFlowLinks(viewModels);

			expect(result).toHaveLength(1);
			const enhanced = result[0];
			expect(enhanced).toBeDefined();
			expect(enhanced?.flowNameHtml).toContain('class="flow-link"');
			expect(enhanced?.flowNameHtml).toContain('data-command="openFlow"');
			expect(enhanced?.flowNameHtml).toContain('data-flow-id="flow-123"');
			expect(enhanced?.flowNameHtml).toContain('>My Flow</a>');
		});

		it('should use escaped flow name when flowId is falsy (empty string)', () => {
			const viewModels = [createViewModel({ flowId: '' })];

			const result = enhanceViewModelsWithFlowLinks(viewModels);

			expect(result).toHaveLength(1);
			const enhanced = result[0];
			expect(enhanced).toBeDefined();
			expect(enhanced?.flowNameHtml).not.toContain('class="flow-link"');
			expect(enhanced?.flowNameHtml).not.toContain('data-command');
			expect(enhanced?.flowNameHtml).toBe('My Flow');
		});

		it('should use "Unknown" when flowName is null and flowId is present', () => {
			const viewModels = [createViewModel({ flowName: null as unknown as string })];

			const result = enhanceViewModelsWithFlowLinks(viewModels);

			expect(result[0]?.flowNameHtml).toContain('>Unknown</a>');
		});

		it('should use "Unknown" when flowName is undefined and flowId is present', () => {
			const viewModels = [createViewModel({ flowName: undefined as unknown as string })];

			const result = enhanceViewModelsWithFlowLinks(viewModels);

			expect(result[0]?.flowNameHtml).toContain('>Unknown</a>');
		});

		it('should use "Unknown" when flowName is null and flowId is falsy', () => {
			const viewModels = [createViewModel({ flowId: '', flowName: null as unknown as string })];

			const result = enhanceViewModelsWithFlowLinks(viewModels);

			expect(result[0]?.flowNameHtml).toBe('Unknown');
		});

		it('should use "Unknown" when flowName is undefined and flowId is falsy', () => {
			const viewModels = [createViewModel({ flowId: '', flowName: undefined as unknown as string })];

			const result = enhanceViewModelsWithFlowLinks(viewModels);

			expect(result[0]?.flowNameHtml).toBe('Unknown');
		});

		it('should preserve other properties from view model', () => {
			const viewModels = [createViewModel()];

			const result = enhanceViewModelsWithFlowLinks(viewModels);

			expect(result[0]?.flowId).toBe('flow-123');
			expect(result[0]?.flowName).toBe('My Flow');
			expect(result[0]?.connectionReferenceId).toBe('ref-123');
			expect(result[0]?.connectionReferenceDisplayName).toBe('Ref Display');
		});

		it('should handle multiple view models', () => {
			const viewModels = [
				createViewModel({ flowId: 'flow-1', flowName: 'Flow 1' }),
				createViewModel({ flowId: 'flow-2', flowName: 'Flow 2' }),
				createViewModel({ flowId: '', flowName: 'Flow 3' })
			];

			const result = enhanceViewModelsWithFlowLinks(viewModels);

			expect(result).toHaveLength(3);
			expect(result[0]?.flowNameHtml).toContain('data-flow-id="flow-1"');
			expect(result[0]?.flowNameHtml).toContain('>Flow 1</a>');
			expect(result[1]?.flowNameHtml).toContain('data-flow-id="flow-2"');
			expect(result[1]?.flowNameHtml).toContain('>Flow 2</a>');
			expect(result[2]?.flowNameHtml).toBe('Flow 3');
		});

		it('should handle empty array', () => {
			const viewModels: FlowConnectionRelationshipViewModel[] = [];

			const result = enhanceViewModelsWithFlowLinks(viewModels);

			expect(result).toEqual([]);
		});

		it('should escape special characters in flow name when flowId is present', () => {
			const viewModels = [createViewModel({ flowName: '<script>alert("xss")</script>' })];

			const result = enhanceViewModelsWithFlowLinks(viewModels);

			expect(result[0]?.flowNameHtml).not.toContain('<script>');
			expect(result[0]?.flowNameHtml).toContain('&lt;script&gt;');
		});

		it('should escape special characters in flow name when flowId is falsy', () => {
			const viewModels = [createViewModel({ flowId: '', flowName: '<b>test</b>' })];

			const result = enhanceViewModelsWithFlowLinks(viewModels);

			expect(result[0]?.flowNameHtml).not.toContain('<b>');
			expect(result[0]?.flowNameHtml).toBe('&lt;b&gt;test&lt;/b&gt;');
		});

		it('should not mutate original view models', () => {
			const originalVm = createViewModel();
			const viewModels = [originalVm];

			enhanceViewModelsWithFlowLinks(viewModels);

			expect((originalVm as Record<string, unknown>)['flowNameHtml']).toBeUndefined();
		});

		it('should create new array instead of mutating input', () => {
			const viewModels = [createViewModel()];
			const originalLength = viewModels.length;

			const result = enhanceViewModelsWithFlowLinks(viewModels);

			expect(viewModels).not.toBe(result);
			expect(viewModels.length).toBe(originalLength);
		});

		// Branch coverage test: Covers flowId truthiness branch (line 30)
		it('should render link when flowId is truthy string', () => {
			const viewModels = [createViewModel({ flowId: 'non-empty-id' })];

			const result = enhanceViewModelsWithFlowLinks(viewModels);

			expect(result[0]?.flowNameHtml).toContain('class="flow-link"');
			expect(result[0]?.flowNameHtml).toContain('data-command="openFlow"');
		});

		// Branch coverage test: Covers flowId falsiness branch (line 32)
		it('should use escaped name when flowId is empty string', () => {
			const viewModels = [createViewModel({ flowId: '' })];

			const result = enhanceViewModelsWithFlowLinks(viewModels);

			expect(result[0]?.flowNameHtml).not.toContain('class="flow-link"');
			expect(result[0]?.flowNameHtml).not.toContain('data-command');
		});
	});

	describe('Branch coverage integration', () => {
		const createViewModel = (flowId: string, flowName: string | null = 'Test Flow'): FlowConnectionRelationshipViewModel => ({
			flowId,
			flowName: flowName as string,
			connectionReferenceId: 'ref-123',
			connectionReferenceLogicalName: 'connectionreference',
			connectionReferenceDisplayName: 'Ref Display',
			relationshipType: 'Contains',
			flowIsManaged: '0',
			connectionReferenceIsManaged: '0',
			flowModifiedOn: '2024-01-01',
			connectionReferenceModifiedOn: '2024-01-01'
		});

		it('Branch 1: flowId truthy → renderFlowLink path', () => {
			const result = enhanceViewModelsWithFlowLinks([createViewModel('valid-id', 'Flow Name')]);
			expect(result[0]?.flowNameHtml).toContain('<a href="#"');
		});

		it('Branch 2: flowId falsy → escapeHtml path', () => {
			const result = enhanceViewModelsWithFlowLinks([createViewModel('', 'Flow Name')]);
			expect(result[0]?.flowNameHtml).not.toContain('<a href="#"');
		});

		it('Branch 3: flowName null → "Unknown" when flowId is truthy', () => {
			const result = enhanceViewModelsWithFlowLinks([createViewModel('valid-id', null)]);
			expect(result[0]?.flowNameHtml).toContain('>Unknown</a>');
		});

		it('Branch 4: flowName null → "Unknown" when flowId is falsy', () => {
			const result = enhanceViewModelsWithFlowLinks([createViewModel('', null)]);
			expect(result[0]?.flowNameHtml).toBe('Unknown');
		});
	});
});
