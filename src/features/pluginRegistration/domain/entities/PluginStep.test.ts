import { PluginStep } from './PluginStep';
import { ExecutionStage } from '../valueObjects/ExecutionStage';
import { ExecutionMode } from '../valueObjects/ExecutionMode';
import { StepStatus } from '../valueObjects/StepStatus';

describe('PluginStep', () => {
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
			description: 'Test description',
			unsecureConfiguration: null,
			supportedDeployment: 0,
			asyncAutoDelete: false,
			isManaged: false,
			isCustomizable: true,
			isHidden: false,
			createdOn: new Date('2024-01-01'),
			modifiedOn: new Date('2024-01-02'),
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

	describe('isEnabled', () => {
		it('should return true when status is Enabled', () => {
			const step = createStep({ status: StepStatus.Enabled });
			expect(step.isEnabled()).toBe(true);
		});

		it('should return false when status is Disabled', () => {
			const step = createStep({ status: StepStatus.Disabled });
			expect(step.isEnabled()).toBe(false);
		});
	});

	describe('canEnable', () => {
		it('should return true when step is disabled', () => {
			const step = createStep({ status: StepStatus.Disabled });
			expect(step.canEnable()).toBe(true);
		});

		it('should return false when step is already enabled', () => {
			const step = createStep({ status: StepStatus.Enabled });
			expect(step.canEnable()).toBe(false);
		});
	});

	describe('canDisable', () => {
		it('should return true when step is enabled', () => {
			const step = createStep({ status: StepStatus.Enabled });
			expect(step.canDisable()).toBe(true);
		});

		it('should return false when step is already disabled', () => {
			const step = createStep({ status: StepStatus.Disabled });
			expect(step.canDisable()).toBe(false);
		});
	});

	describe('canDelete', () => {
		it('should return true when step is not managed', () => {
			const step = createStep({ isManaged: false });
			expect(step.canDelete()).toBe(true);
		});

		it('should return false when step is managed', () => {
			const step = createStep({ isManaged: true });
			expect(step.canDelete()).toBe(false);
		});
	});

	describe('getExecutionOrder', () => {
		it('should format execution order correctly for PostOperation', () => {
			const step = createStep({
				stage: ExecutionStage.PostOperation,
				rank: 10,
			});
			expect(step.getExecutionOrder()).toBe('PostOperation (40) - Rank 10');
		});

		it('should format execution order correctly for PreValidation', () => {
			const step = createStep({
				stage: ExecutionStage.PreValidation,
				rank: 1,
			});
			expect(step.getExecutionOrder()).toBe('PreValidation (10) - Rank 1');
		});

		it('should format execution order correctly for PreOperation', () => {
			const step = createStep({
				stage: ExecutionStage.PreOperation,
				rank: 100,
			});
			expect(step.getExecutionOrder()).toBe('PreOperation (20) - Rank 100');
		});
	});

	describe('getFilteringAttributesArray', () => {
		it('should return empty array when filteringAttributes is null', () => {
			const step = createStep({ filteringAttributes: null });
			expect(step.getFilteringAttributesArray()).toEqual([]);
		});

		it('should return empty array when filteringAttributes is empty string', () => {
			const step = createStep({ filteringAttributes: '' });
			expect(step.getFilteringAttributesArray()).toEqual([]);
		});

		it('should split comma-separated attributes', () => {
			const step = createStep({ filteringAttributes: 'name,accountnumber,revenue' });
			expect(step.getFilteringAttributesArray()).toEqual(['name', 'accountnumber', 'revenue']);
		});

		it('should trim whitespace from attributes', () => {
			const step = createStep({ filteringAttributes: ' name , accountnumber , revenue ' });
			expect(step.getFilteringAttributesArray()).toEqual(['name', 'accountnumber', 'revenue']);
		});

		it('should handle single attribute', () => {
			const step = createStep({ filteringAttributes: 'name' });
			expect(step.getFilteringAttributesArray()).toEqual(['name']);
		});
	});

	describe('getters', () => {
		it('should return correct id', () => {
			const step = createStep({ id: 'test-id' });
			expect(step.getId()).toBe('test-id');
		});

		it('should return correct name', () => {
			const step = createStep({ name: 'Test Step Name' });
			expect(step.getName()).toBe('Test Step Name');
		});

		it('should return correct pluginTypeId', () => {
			const step = createStep({ pluginTypeId: 'type-id' });
			expect(step.getPluginTypeId()).toBe('type-id');
		});

		it('should return correct messageId', () => {
			const step = createStep({ messageId: 'msg-id' });
			expect(step.getMessageId()).toBe('msg-id');
		});

		it('should return correct messageName', () => {
			const step = createStep({ messageName: 'Update' });
			expect(step.getMessageName()).toBe('Update');
		});

		it('should return correct primaryEntityId', () => {
			const step = createStep({ primaryEntityId: 'entity-id' });
			expect(step.getPrimaryEntityId()).toBe('entity-id');
		});

		it('should return null for primaryEntityId when not set', () => {
			const step = createStep({ primaryEntityId: null });
			expect(step.getPrimaryEntityId()).toBeNull();
		});

		it('should return correct primaryEntityLogicalName', () => {
			const step = createStep({ primaryEntityLogicalName: 'contact' });
			expect(step.getPrimaryEntityLogicalName()).toBe('contact');
		});

		it('should return correct stage', () => {
			const step = createStep({ stage: ExecutionStage.PreValidation });
			expect(step.getStage()).toBe(ExecutionStage.PreValidation);
		});

		it('should return correct mode', () => {
			const step = createStep({ mode: ExecutionMode.Asynchronous });
			expect(step.getMode()).toBe(ExecutionMode.Asynchronous);
		});

		it('should return correct rank', () => {
			const step = createStep({ rank: 50 });
			expect(step.getRank()).toBe(50);
		});

		it('should return correct status', () => {
			const step = createStep({ status: StepStatus.Disabled });
			expect(step.getStatus()).toBe(StepStatus.Disabled);
		});

		it('should return correct description', () => {
			const step = createStep({ description: 'My description' });
			expect(step.getDescription()).toBe('My description');
		});

		it('should return correct unsecureConfiguration', () => {
			const step = createStep({ unsecureConfiguration: '<config/>' });
			expect(step.getUnsecureConfiguration()).toBe('<config/>');
		});

		it('should return correct supportedDeployment', () => {
			const step = createStep({ supportedDeployment: 2 });
			expect(step.getSupportedDeployment()).toBe(2);
		});

		it('should return correct asyncAutoDelete', () => {
			const step = createStep({ asyncAutoDelete: true });
			expect(step.getAsyncAutoDelete()).toBe(true);
		});

		it('should return correct isInManagedState', () => {
			const step = createStep({ isManaged: true });
			expect(step.isInManagedState()).toBe(true);
		});

		it('should return correct isInCustomizableState', () => {
			const step = createStep({ isCustomizable: false });
			expect(step.isInCustomizableState()).toBe(false);
		});

		it('should return correct isInHiddenState', () => {
			const step = createStep({ isHidden: true });
			expect(step.isInHiddenState()).toBe(true);
		});

		it('should return correct createdOn', () => {
			const date = new Date('2024-06-15');
			const step = createStep({ createdOn: date });
			expect(step.getCreatedOn()).toBe(date);
		});

		it('should return correct modifiedOn', () => {
			const date = new Date('2024-06-20');
			const step = createStep({ modifiedOn: date });
			expect(step.getModifiedOn()).toBe(date);
		});
	});
});
