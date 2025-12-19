import { PluginStepViewModelMapper } from './PluginStepViewModelMapper';
import { PluginStep } from '../../domain/entities/PluginStep';
import { ExecutionStage } from '../../domain/valueObjects/ExecutionStage';
import { ExecutionMode } from '../../domain/valueObjects/ExecutionMode';
import { StepStatus } from '../../domain/valueObjects/StepStatus';
import type { TreeItemViewModel } from '../viewModels/TreeItemViewModel';

describe('PluginStepViewModelMapper', () => {
	const mapper = new PluginStepViewModelMapper();

	const createStep = (overrides: Partial<{
		id: string;
		name: string;
		pluginTypeId: string;
		messageId: string;
		messageName: string;
		primaryEntityId: string | null;
		primaryEntityLogicalName: string | null;
		stage: ExecutionStage;
		mode: ExecutionMode;
		rank: number;
		status: StepStatus;
		filteringAttributes: string | null;
		description: string | null;
		unsecureConfiguration: string | null;
		supportedDeployment: number;
		asyncAutoDelete: boolean;
		isManaged: boolean;
		isCustomizable: boolean;
		isHidden: boolean;
		createdOn: Date;
		modifiedOn: Date;
	}> = {}): PluginStep => {
		const defaults = {
			id: 'step-123',
			name: 'Test Step',
			pluginTypeId: 'type-456',
			messageId: 'msg-789',
			messageName: 'Create',
			primaryEntityId: 'entity-111',
			primaryEntityLogicalName: 'account',
			stage: ExecutionStage.PostOperation,
			mode: ExecutionMode.Synchronous,
			rank: 10,
			status: StepStatus.Enabled,
			filteringAttributes: null,
			description: null,
			unsecureConfiguration: null,
			supportedDeployment: 0,
			asyncAutoDelete: false,
			isManaged: false,
			isCustomizable: true,
			isHidden: false,
			createdOn: new Date('2024-01-01T10:00:00Z'),
			modifiedOn: new Date('2024-01-02T10:00:00Z'),
		};
		const props = { ...defaults, ...overrides };
		return new PluginStep(
			props.id,
			props.name,
			props.pluginTypeId,
			props.messageId,
			props.messageName,
			props.primaryEntityId,
			props.primaryEntityLogicalName,
			props.stage,
			props.mode,
			props.rank,
			props.status,
			props.filteringAttributes,
			props.description,
			props.unsecureConfiguration,
			props.supportedDeployment,
			props.asyncAutoDelete,
			props.isManaged,
			props.isCustomizable,
			props.isHidden,
			props.createdOn,
			props.modifiedOn
		);
	};

	describe('toTreeItem', () => {
		it('should map basic step properties', () => {
			const step = createStep({ id: 'step-abc', name: 'My Step' });
			const result = mapper.toTreeItem(step, 'parent-type-id', []);

			expect(result.id).toBe('step-abc');
			expect(result.name).toBe('My Step');
			expect(result.displayName).toBe('(Step) My Step');
			expect(result.type).toBe('step');
			expect(result.parentId).toBe('parent-type-id');
		});

		it('should set icon to lightning for enabled steps', () => {
			const step = createStep({ status: StepStatus.Enabled });
			const result = mapper.toTreeItem(step, 'parent', []);

			expect(result.icon).toBe('⚡');
		});

		it('should set icon to prohibited for disabled steps', () => {
			const step = createStep({ status: StepStatus.Disabled });
			const result = mapper.toTreeItem(step, 'parent', []);

			expect(result.icon).toBe('🚫');
		});

		it('should map isManaged correctly', () => {
			const managedStep = createStep({ isManaged: true });
			const unmanagedStep = createStep({ isManaged: false });

			expect(mapper.toTreeItem(managedStep, 'parent', []).isManaged).toBe(true);
			expect(mapper.toTreeItem(unmanagedStep, 'parent', []).isManaged).toBe(false);
		});

		it('should include children (images)', () => {
			const step = createStep();
			const imageItems: TreeItemViewModel[] = [
				{
					id: 'img-1',
					parentId: 'step-123',
					type: 'image',
					name: 'PreImage',
					displayName: 'PreImage',
					icon: '📷',
					isManaged: false,
					children: [],
					metadata: { type: 'image', imageType: 'PreImage', entityAlias: 'PreImage', attributes: [], createdOn: '', canDelete: true },
				},
				{
					id: 'img-2',
					parentId: 'step-123',
					type: 'image',
					name: 'PostImage',
					displayName: 'PostImage',
					icon: '📷',
					isManaged: false,
					children: [],
					metadata: { type: 'image', imageType: 'PostImage', entityAlias: 'PostImage', attributes: [], createdOn: '', canDelete: true },
				},
			];

			const result = mapper.toTreeItem(step, 'parent', imageItems);

			expect(result.children).toHaveLength(2);
			expect(result.children[0]!.id).toBe('img-1');
			expect(result.children[1]!.id).toBe('img-2');
		});

		describe('metadata', () => {
			it('should map message name', () => {
				const step = createStep({ messageName: 'Update' });
				const result = mapper.toTreeItem(step, 'parent', []);

				expect(result.metadata?.type).toBe('step');
				if (result.metadata?.type === 'step') {
					expect(result.metadata.messageName).toBe('Update');
				}
			});

			it('should map primary entity logical name', () => {
				const step = createStep({ primaryEntityLogicalName: 'contact' });
				const result = mapper.toTreeItem(step, 'parent', []);

				if (result.metadata?.type === 'step') {
					expect(result.metadata.primaryEntityLogicalName).toBe('contact');
				}
			});

			it('should handle null primary entity', () => {
				const step = createStep({ primaryEntityLogicalName: null });
				const result = mapper.toTreeItem(step, 'parent', []);

				if (result.metadata?.type === 'step') {
					expect(result.metadata.primaryEntityLogicalName).toBeNull();
				}
			});

			it('should map stage name', () => {
				const step = createStep({ stage: ExecutionStage.PreValidation });
				const result = mapper.toTreeItem(step, 'parent', []);

				if (result.metadata?.type === 'step') {
					expect(result.metadata.stage).toBe('PreValidation');
				}
			});

			it('should map mode name', () => {
				const step = createStep({ mode: ExecutionMode.Asynchronous });
				const result = mapper.toTreeItem(step, 'parent', []);

				if (result.metadata?.type === 'step') {
					expect(result.metadata.mode).toBe('Asynchronous');
				}
			});

			it('should map rank', () => {
				const step = createStep({ rank: 50 });
				const result = mapper.toTreeItem(step, 'parent', []);

				if (result.metadata?.type === 'step') {
					expect(result.metadata.rank).toBe(50);
				}
			});

			it('should map isEnabled from status', () => {
				const enabledStep = createStep({ status: StepStatus.Enabled });
				const disabledStep = createStep({ status: StepStatus.Disabled });

				const enabledResult = mapper.toTreeItem(enabledStep, 'parent', []);
				const disabledResult = mapper.toTreeItem(disabledStep, 'parent', []);

				if (enabledResult.metadata?.type === 'step') {
					expect(enabledResult.metadata.isEnabled).toBe(true);
				}
				if (disabledResult.metadata?.type === 'step') {
					expect(disabledResult.metadata.isEnabled).toBe(false);
				}
			});

			it('should map filtering attributes as array', () => {
				const step = createStep({ filteringAttributes: 'name,accountnumber,revenue' });
				const result = mapper.toTreeItem(step, 'parent', []);

				if (result.metadata?.type === 'step') {
					expect(result.metadata.filteringAttributes).toEqual(['name', 'accountnumber', 'revenue']);
				}
			});

			it('should map empty filtering attributes', () => {
				const step = createStep({ filteringAttributes: null });
				const result = mapper.toTreeItem(step, 'parent', []);

				if (result.metadata?.type === 'step') {
					expect(result.metadata.filteringAttributes).toEqual([]);
				}
			});

			it('should map execution order', () => {
				const step = createStep({ stage: ExecutionStage.PostOperation, rank: 10 });
				const result = mapper.toTreeItem(step, 'parent', []);

				if (result.metadata?.type === 'step') {
					expect(result.metadata.executionOrder).toBe('PostOperation (40) - Rank 10');
				}
			});

			it('should map createdOn as ISO string', () => {
				const step = createStep({ createdOn: new Date('2024-06-15T12:30:00Z') });
				const result = mapper.toTreeItem(step, 'parent', []);

				if (result.metadata?.type === 'step') {
					expect(result.metadata.createdOn).toBe('2024-06-15T12:30:00.000Z');
				}
			});

			it('should map canEnable, canDisable, canDelete', () => {
				const enabledUnmanagedStep = createStep({ status: StepStatus.Enabled, isManaged: false });
				const result = mapper.toTreeItem(enabledUnmanagedStep, 'parent', []);

				if (result.metadata?.type === 'step') {
					expect(result.metadata.canEnable).toBe(false); // already enabled
					expect(result.metadata.canDisable).toBe(true); // can disable
					expect(result.metadata.canDelete).toBe(true); // not managed
				}
			});

			it('should set canDelete false for managed steps', () => {
				const managedStep = createStep({ isManaged: true });
				const result = mapper.toTreeItem(managedStep, 'parent', []);

				if (result.metadata?.type === 'step') {
					expect(result.metadata.canDelete).toBe(false);
				}
			});

			it('should map isCustomizable', () => {
				const step = createStep({ isCustomizable: false });
				const result = mapper.toTreeItem(step, 'parent', []);

				if (result.metadata?.type === 'step') {
					expect(result.metadata.isCustomizable).toBe(false);
				}
			});

			it('should map isHidden', () => {
				const step = createStep({ isHidden: true });
				const result = mapper.toTreeItem(step, 'parent', []);

				if (result.metadata?.type === 'step') {
					expect(result.metadata.isHidden).toBe(true);
				}
			});
		});
	});
});
