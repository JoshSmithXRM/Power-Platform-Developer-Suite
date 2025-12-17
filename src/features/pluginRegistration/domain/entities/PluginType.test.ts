import { PluginType } from './PluginType';

describe('PluginType', () => {
	const createPluginType = (overrides: Partial<{
		id: string;
		name: string;
		friendlyName: string;
		assemblyId: string;
		workflowActivityGroupName: string | null;
	}> = {}): PluginType => {
		const defaults = {
			id: 'type-123',
			name: 'MyCompany.Plugins.AccountHandler',
			friendlyName: 'AccountHandler',
			assemblyId: 'assembly-456',
			workflowActivityGroupName: null,
		};
		const props = { ...defaults, ...overrides };
		return new PluginType(
			props.id,
			props.name,
			props.friendlyName,
			props.assemblyId,
			props.workflowActivityGroupName
		);
	};

	describe('isWorkflowActivity', () => {
		it('should return false when workflowActivityGroupName is null', () => {
			const pluginType = createPluginType({ workflowActivityGroupName: null });
			expect(pluginType.isWorkflowActivity()).toBe(false);
		});

		it('should return true when workflowActivityGroupName is set', () => {
			const pluginType = createPluginType({ workflowActivityGroupName: 'MyWorkflowActivities' });
			expect(pluginType.isWorkflowActivity()).toBe(true);
		});

		it('should return true when workflowActivityGroupName is empty string', () => {
			// Empty string is still truthy for this check - it means WF activity was registered
			const pluginType = createPluginType({ workflowActivityGroupName: '' });
			// Note: This tests the actual implementation which checks !== null
			expect(pluginType.isWorkflowActivity()).toBe(true);
		});
	});

	describe('getters', () => {
		it('should return correct id', () => {
			const pluginType = createPluginType({ id: 'test-id' });
			expect(pluginType.getId()).toBe('test-id');
		});

		it('should return correct name (fully qualified type name)', () => {
			const pluginType = createPluginType({ name: 'Contoso.Plugins.ContactMerge' });
			expect(pluginType.getName()).toBe('Contoso.Plugins.ContactMerge');
		});

		it('should return correct friendlyName', () => {
			const pluginType = createPluginType({ friendlyName: 'ContactMerge' });
			expect(pluginType.getFriendlyName()).toBe('ContactMerge');
		});

		it('should return correct assemblyId', () => {
			const pluginType = createPluginType({ assemblyId: 'asm-789' });
			expect(pluginType.getAssemblyId()).toBe('asm-789');
		});

		it('should return correct workflowActivityGroupName', () => {
			const pluginType = createPluginType({ workflowActivityGroupName: 'CRM Activities' });
			expect(pluginType.getWorkflowActivityGroupName()).toBe('CRM Activities');
		});

		it('should return null for workflowActivityGroupName when not set', () => {
			const pluginType = createPluginType({ workflowActivityGroupName: null });
			expect(pluginType.getWorkflowActivityGroupName()).toBeNull();
		});
	});
});
