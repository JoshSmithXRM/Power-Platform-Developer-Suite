import { PluginRegistrationTreeMapper, PackageTreeNode, AssemblyTreeNode } from './PluginRegistrationTreeMapper';
import { PluginPackage } from '../../domain/entities/PluginPackage';
import { PluginAssembly } from '../../domain/entities/PluginAssembly';
import { PluginType } from '../../domain/entities/PluginType';
import { PluginStep } from '../../domain/entities/PluginStep';
import { StepImage } from '../../domain/entities/StepImage';
import { IsolationMode } from '../../domain/valueObjects/IsolationMode';
import { SourceType } from '../../domain/valueObjects/SourceType';
import { ExecutionStage } from '../../domain/valueObjects/ExecutionStage';
import { ExecutionMode } from '../../domain/valueObjects/ExecutionMode';
import { StepStatus } from '../../domain/valueObjects/StepStatus';
import { ImageType } from '../../domain/valueObjects/ImageType';
import { TreeViewMode } from '../enums/TreeViewMode';

describe('PluginRegistrationTreeMapper', () => {
	const mapper = new PluginRegistrationTreeMapper();

	// Factory helpers
	const createPackage = (id: string, name: string): PluginPackage => {
		return new PluginPackage(
			id,
			name,
			name,
			'1.0.0',
			false,
			new Date(),
			new Date()
		);
	};

	const createAssembly = (id: string, name: string, packageId: string | null = null): PluginAssembly => {
		return new PluginAssembly(
			id,
			name,
			'1.0.0.0',
			IsolationMode.Sandbox,
			false,
			SourceType.Database,
			packageId,
			new Date(),
			new Date()
		);
	};

	const createPluginType = (id: string, name: string, assemblyId: string): PluginType => {
		return new PluginType(id, name, name, assemblyId, null);
	};

	const createStep = (id: string, name: string, pluginTypeId: string, enabled = true): PluginStep => {
		return new PluginStep(
			id,
			name,
			pluginTypeId,
			'msg-1',
			'Create',
			'entity-1',
			'account',
			ExecutionStage.PostOperation,
			ExecutionMode.Synchronous,
			10,
			enabled ? StepStatus.Enabled : StepStatus.Disabled,
			null,
			null,
			null,
			0,
			false,
			false,
			true,
			false,
			new Date(),
			new Date()
		);
	};

	/**
	 * Creates a step with customizable message and entity for Message View tests.
	 */
	const createStepWithMessageAndEntity = (
		id: string,
		name: string,
		pluginTypeId: string,
		messageName: string,
		entityLogicalName: string | null
	): PluginStep => {
		return new PluginStep(
			id,
			name,
			pluginTypeId,
			'msg-id',
			messageName,
			entityLogicalName ? 'entity-id' : null,
			entityLogicalName,
			ExecutionStage.PostOperation,
			ExecutionMode.Synchronous,
			10,
			StepStatus.Enabled,
			null,
			null,
			null,
			0,
			false,
			false,
			true,
			false,
			new Date(),
			new Date()
		);
	};

	const createImage = (id: string, name: string, stepId: string): StepImage => {
		return new StepImage(
			id,
			name,
			stepId,
			ImageType.PreImage,
			'PreImage',
			'name,accountnumber',
			'Target',
			new Date()
		);
	};

	describe('toTreeItems', () => {
		it('should return empty array when no packages or assemblies', () => {
			const result = mapper.toTreeItems(TreeViewMode.Assembly, [], []);
			expect(result).toEqual([]);
		});

		it('should map standalone assembly without package', () => {
			const assembly = createAssembly('asm-1', 'MyAssembly');
			const standaloneNode: AssemblyTreeNode = {
				assembly,
				pluginTypes: [],
			};

			const result = mapper.toTreeItems(TreeViewMode.Assembly, [], [standaloneNode]);

			expect(result).toHaveLength(1);
			expect(result[0]!.id).toBe('asm-1');
			expect(result[0]!.type).toBe('assembly');
			expect(result[0]!.parentId).toBeNull();
		});

		it('should map package with assemblies', () => {
			const pkg = createPackage('pkg-1', 'et_MyPackage');
			const assembly = createAssembly('asm-1', 'MyAssembly', 'pkg-1');
			const packageNode: PackageTreeNode = {
				package: pkg,
				assemblies: [{
					assembly,
					pluginTypes: [],
				}],
			};

			const result = mapper.toTreeItems(TreeViewMode.Assembly, [packageNode], []);

			expect(result).toHaveLength(1);
			expect(result[0]!.id).toBe('pkg-1');
			expect(result[0]!.type).toBe('package');
			expect(result[0]!.children).toHaveLength(1);
			expect(result[0]!.children[0]!.id).toBe('asm-1');
			expect(result[0]!.children[0]!.parentId).toBe('pkg-1');
		});

		it('should place packages before standalone assemblies', () => {
			const pkg = createPackage('pkg-1', 'et_MyPackage');
			const packageNode: PackageTreeNode = {
				package: pkg,
				assemblies: [],
			};
			const standaloneAssembly = createAssembly('asm-standalone', 'StandaloneAssembly');
			const standaloneNode: AssemblyTreeNode = {
				assembly: standaloneAssembly,
				pluginTypes: [],
			};

			const result = mapper.toTreeItems(TreeViewMode.Assembly, [packageNode], [standaloneNode]);

			expect(result).toHaveLength(2);
			expect(result[0]!.type).toBe('package');
			expect(result[1]!.type).toBe('assembly');
		});

		it('should map complete hierarchy: package → assembly → type → step → image', () => {
			const pkg = createPackage('pkg-1', 'et_MyPackage');
			const assembly = createAssembly('asm-1', 'MyAssembly', 'pkg-1');
			const pluginType = createPluginType('type-1', 'MyPlugin', 'asm-1');
			const step = createStep('step-1', 'MyStep', 'type-1');
			const image = createImage('img-1', 'PreImage', 'step-1');

			const packageNode: PackageTreeNode = {
				package: pkg,
				assemblies: [{
					assembly,
					pluginTypes: [{
						pluginType,
						steps: [{
							step,
							images: [image],
						}],
					}],
				}],
			};

			const result = mapper.toTreeItems(TreeViewMode.Assembly, [packageNode], []);

			// Check package
			expect(result).toHaveLength(1);
			expect(result[0]!.id).toBe('pkg-1');

			// Check assembly
			const assemblyNode = result[0]!.children[0]!;
			expect(assemblyNode.id).toBe('asm-1');
			expect(assemblyNode.parentId).toBe('pkg-1');

			// Check plugin type
			const typeNode = assemblyNode.children[0]!;
			expect(typeNode.id).toBe('type-1');
			expect(typeNode.parentId).toBe('asm-1');

			// Check step
			const stepNode = typeNode.children[0]!;
			expect(stepNode.id).toBe('step-1');
			expect(stepNode.parentId).toBe('type-1');

			// Check image
			const imageNode = stepNode.children[0]!;
			expect(imageNode.id).toBe('img-1');
			expect(imageNode.parentId).toBe('step-1');
		});

		it('should count active steps correctly for canDelete', () => {
			const assembly = createAssembly('asm-1', 'MyAssembly');
			const pluginType = createPluginType('type-1', 'MyPlugin', 'asm-1');
			const enabledStep = createStep('step-1', 'EnabledStep', 'type-1', true);
			const disabledStep = createStep('step-2', 'DisabledStep', 'type-1', false);

			const standaloneNode: AssemblyTreeNode = {
				assembly,
				pluginTypes: [{
					pluginType,
					steps: [
						{ step: enabledStep, images: [] },
						{ step: disabledStep, images: [] },
					],
				}],
			};

			const result = mapper.toTreeItems(TreeViewMode.Assembly, [], [standaloneNode]);

			// Assembly has 1 active step, so canDelete should be false
			const assemblyMeta = result[0]!.metadata;
			if (assemblyMeta?.type === 'assembly') {
				expect(assemblyMeta.canDelete).toBe(false);
			}
		});

		it('should allow delete when no active steps', () => {
			const assembly = createAssembly('asm-1', 'MyAssembly');
			const pluginType = createPluginType('type-1', 'MyPlugin', 'asm-1');
			const disabledStep = createStep('step-1', 'DisabledStep', 'type-1', false);

			const standaloneNode: AssemblyTreeNode = {
				assembly,
				pluginTypes: [{
					pluginType,
					steps: [{ step: disabledStep, images: [] }],
				}],
			};

			const result = mapper.toTreeItems(TreeViewMode.Assembly, [], [standaloneNode]);

			// Assembly has 0 active steps (only disabled), so canDelete should be true
			const assemblyMeta = result[0]!.metadata;
			if (assemblyMeta?.type === 'assembly') {
				expect(assemblyMeta.canDelete).toBe(true);
			}
		});

		it('should handle multiple packages', () => {
			const pkg1 = createPackage('pkg-1', 'et_Package1');
			const pkg2 = createPackage('pkg-2', 'et_Package2');

			const packages: PackageTreeNode[] = [
				{ package: pkg1, assemblies: [] },
				{ package: pkg2, assemblies: [] },
			];

			const result = mapper.toTreeItems(TreeViewMode.Assembly, packages, []);

			expect(result).toHaveLength(2);
			expect(result[0]!.id).toBe('pkg-1');
			expect(result[1]!.id).toBe('pkg-2');
		});

		it('should handle multiple standalone assemblies', () => {
			const asm1 = createAssembly('asm-1', 'Assembly1');
			const asm2 = createAssembly('asm-2', 'Assembly2');

			const standalones: AssemblyTreeNode[] = [
				{ assembly: asm1, pluginTypes: [] },
				{ assembly: asm2, pluginTypes: [] },
			];

			const result = mapper.toTreeItems(TreeViewMode.Assembly, [], standalones);

			expect(result).toHaveLength(2);
			expect(result[0]!.id).toBe('asm-1');
			expect(result[1]!.id).toBe('asm-2');
		});

		it('should handle assembly with multiple plugin types', () => {
			const assembly = createAssembly('asm-1', 'MyAssembly');
			const type1 = createPluginType('type-1', 'Plugin1', 'asm-1');
			const type2 = createPluginType('type-2', 'Plugin2', 'asm-1');

			const standaloneNode: AssemblyTreeNode = {
				assembly,
				pluginTypes: [
					{ pluginType: type1, steps: [] },
					{ pluginType: type2, steps: [] },
				],
			};

			const result = mapper.toTreeItems(TreeViewMode.Assembly, [], [standaloneNode]);

			expect(result[0]!.children).toHaveLength(2);
			expect(result[0]!.children[0]!.id).toBe('type-1');
			expect(result[0]!.children[1]!.id).toBe('type-2');
		});

		it('should handle step with multiple images', () => {
			const assembly = createAssembly('asm-1', 'MyAssembly');
			const pluginType = createPluginType('type-1', 'MyPlugin', 'asm-1');
			const step = createStep('step-1', 'MyStep', 'type-1');
			const image1 = createImage('img-1', 'PreImage', 'step-1');
			const image2 = createImage('img-2', 'PostImage', 'step-1');

			const standaloneNode: AssemblyTreeNode = {
				assembly,
				pluginTypes: [{
					pluginType,
					steps: [{
						step,
						images: [image1, image2],
					}],
				}],
			};

			const result = mapper.toTreeItems(TreeViewMode.Assembly, [], [standaloneNode]);

			const stepNode = result[0]!.children[0]!.children[0]!;
			expect(stepNode.children).toHaveLength(2);
			expect(stepNode.children[0]!.id).toBe('img-1');
			expect(stepNode.children[1]!.id).toBe('img-2');
		});
	});

	describe('toTreeItems - Message View', () => {
		it('should return empty array when no steps exist', () => {
			const assembly = createAssembly('asm-1', 'MyAssembly');
			const standaloneNode: AssemblyTreeNode = {
				assembly,
				pluginTypes: [],
			};

			const result = mapper.toTreeItems(TreeViewMode.Message, [], [standaloneNode]);

			expect(result).toEqual([]);
		});

		it('should group steps by message name', () => {
			const assembly = createAssembly('asm-1', 'MyAssembly');
			const pluginType = createPluginType('type-1', 'MyPlugin', 'asm-1');
			const createStep1 = createStepWithMessageAndEntity('step-1', 'CreateAccount', 'type-1', 'Create', 'account');
			const updateStep1 = createStepWithMessageAndEntity('step-2', 'UpdateAccount', 'type-1', 'Update', 'account');

			const standaloneNode: AssemblyTreeNode = {
				assembly,
				pluginTypes: [{
					pluginType,
					steps: [
						{ step: createStep1, images: [] },
						{ step: updateStep1, images: [] },
					],
				}],
			};

			const result = mapper.toTreeItems(TreeViewMode.Message, [], [standaloneNode]);

			// Should have 2 message nodes (Create and Update)
			const messageNodes = result.filter(n => n.type === 'sdkMessage');
			expect(messageNodes).toHaveLength(2);

			// Messages should be sorted alphabetically
			expect(messageNodes[0]!.name).toBe('Create');
			expect(messageNodes[1]!.name).toBe('Update');
		});

		it('should create entity nodes under messages', () => {
			const assembly = createAssembly('asm-1', 'MyAssembly');
			const pluginType = createPluginType('type-1', 'MyPlugin', 'asm-1');
			const step1 = createStepWithMessageAndEntity('step-1', 'CreateAccount', 'type-1', 'Create', 'account');
			const step2 = createStepWithMessageAndEntity('step-2', 'CreateContact', 'type-1', 'Create', 'contact');

			const standaloneNode: AssemblyTreeNode = {
				assembly,
				pluginTypes: [{
					pluginType,
					steps: [
						{ step: step1, images: [] },
						{ step: step2, images: [] },
					],
				}],
			};

			const result = mapper.toTreeItems(TreeViewMode.Message, [], [standaloneNode]);

			// Should have 1 message node (Create)
			const messageNodes = result.filter(n => n.type === 'sdkMessage');
			expect(messageNodes).toHaveLength(1);
			expect(messageNodes[0]!.name).toBe('Create');

			// Create message should have 2 entity children (account, contact)
			const createMessage = messageNodes[0]!;
			expect(createMessage.children).toHaveLength(2);
			expect(createMessage.children[0]!.type).toBe('entityGroup');
			expect(createMessage.children[1]!.type).toBe('entityGroup');

			// Entities should be sorted alphabetically
			expect(createMessage.children[0]!.name).toBe('account');
			expect(createMessage.children[1]!.name).toBe('contact');
		});

		it('should place steps without entity directly under message', () => {
			const assembly = createAssembly('asm-1', 'MyAssembly');
			const pluginType = createPluginType('type-1', 'MyPlugin', 'asm-1');
			const globalStep = createStepWithMessageAndEntity('step-1', 'GlobalStep', 'type-1', 'CustomGlobal', null);

			const standaloneNode: AssemblyTreeNode = {
				assembly,
				pluginTypes: [{
					pluginType,
					steps: [
						{ step: globalStep, images: [] },
					],
				}],
			};

			const result = mapper.toTreeItems(TreeViewMode.Message, [], [standaloneNode]);

			const messageNodes = result.filter(n => n.type === 'sdkMessage');
			expect(messageNodes).toHaveLength(1);

			const customGlobalMessage = messageNodes[0]!;
			expect(customGlobalMessage.name).toBe('CustomGlobal');

			// Step should be directly under message (no entity node)
			expect(customGlobalMessage.children).toHaveLength(1);
			expect(customGlobalMessage.children[0]!.type).toBe('step');
			expect(customGlobalMessage.children[0]!.id).toBe('step-1');
		});

		it('should show step count in message node displayName', () => {
			const assembly = createAssembly('asm-1', 'MyAssembly');
			const pluginType = createPluginType('type-1', 'MyPlugin', 'asm-1');
			const step1 = createStepWithMessageAndEntity('step-1', 'Step1', 'type-1', 'Create', 'account');
			const step2 = createStepWithMessageAndEntity('step-2', 'Step2', 'type-1', 'Create', 'contact');
			const step3 = createStepWithMessageAndEntity('step-3', 'Step3', 'type-1', 'Create', 'account');

			const standaloneNode: AssemblyTreeNode = {
				assembly,
				pluginTypes: [{
					pluginType,
					steps: [
						{ step: step1, images: [] },
						{ step: step2, images: [] },
						{ step: step3, images: [] },
					],
				}],
			};

			const result = mapper.toTreeItems(TreeViewMode.Message, [], [standaloneNode]);

			const createMessage = result.find(n => n.type === 'sdkMessage' && n.name === 'Create');
			expect(createMessage).toBeDefined();
			expect(createMessage!.displayName).toBe('Create (3)');

			// Check metadata
			if (createMessage!.metadata.type === 'sdkMessage') {
				expect(createMessage!.metadata.stepCount).toBe(3);
				expect(createMessage!.metadata.hasEntityGroups).toBe(true);
			}
		});

		it('should show step count in entity node displayName', () => {
			const assembly = createAssembly('asm-1', 'MyAssembly');
			const pluginType = createPluginType('type-1', 'MyPlugin', 'asm-1');
			const step1 = createStepWithMessageAndEntity('step-1', 'Step1', 'type-1', 'Create', 'account');
			const step2 = createStepWithMessageAndEntity('step-2', 'Step2', 'type-1', 'Create', 'account');

			const standaloneNode: AssemblyTreeNode = {
				assembly,
				pluginTypes: [{
					pluginType,
					steps: [
						{ step: step1, images: [] },
						{ step: step2, images: [] },
					],
				}],
			};

			const result = mapper.toTreeItems(TreeViewMode.Message, [], [standaloneNode]);

			const createMessage = result.find(n => n.type === 'sdkMessage' && n.name === 'Create')!;
			const accountEntity = createMessage.children.find(n => n.type === 'entityGroup' && n.name === 'account');

			expect(accountEntity).toBeDefined();
			expect(accountEntity!.displayName).toBe('account (2)');

			// Check metadata
			if (accountEntity!.metadata.type === 'entityGroup') {
				expect(accountEntity!.metadata.stepCount).toBe(2);
				expect(accountEntity!.metadata.entityLogicalName).toBe('account');
			}
		});

		it('should include images under steps in message view', () => {
			const assembly = createAssembly('asm-1', 'MyAssembly');
			const pluginType = createPluginType('type-1', 'MyPlugin', 'asm-1');
			const step = createStepWithMessageAndEntity('step-1', 'Step1', 'type-1', 'Create', 'account');
			const image = createImage('img-1', 'PreImage', 'step-1');

			const standaloneNode: AssemblyTreeNode = {
				assembly,
				pluginTypes: [{
					pluginType,
					steps: [{ step, images: [image] }],
				}],
			};

			const result = mapper.toTreeItems(TreeViewMode.Message, [], [standaloneNode]);

			const createMessage = result.find(n => n.type === 'sdkMessage')!;
			const accountEntity = createMessage.children.find(n => n.type === 'entityGroup')!;
			const stepNode = accountEntity.children.find(n => n.type === 'step')!;

			expect(stepNode.children).toHaveLength(1);
			expect(stepNode.children[0]!.type).toBe('image');
			expect(stepNode.children[0]!.id).toBe('img-1');
		});

		it('should extract steps from both packages and standalone assemblies', () => {
			const pkg = createPackage('pkg-1', 'et_MyPackage');
			const pkgAssembly = createAssembly('asm-pkg', 'PkgAssembly', 'pkg-1');
			const pkgPluginType = createPluginType('type-pkg', 'PkgPlugin', 'asm-pkg');
			const pkgStep = createStepWithMessageAndEntity('step-pkg', 'PkgStep', 'type-pkg', 'Create', 'account');

			const standaloneAssembly = createAssembly('asm-standalone', 'StandaloneAssembly');
			const standalonePluginType = createPluginType('type-standalone', 'StandalonePlugin', 'asm-standalone');
			const standaloneStep = createStepWithMessageAndEntity('step-standalone', 'StandaloneStep', 'type-standalone', 'Update', 'contact');

			const packageNode: PackageTreeNode = {
				package: pkg,
				assemblies: [{
					assembly: pkgAssembly,
					pluginTypes: [{
						pluginType: pkgPluginType,
						steps: [{ step: pkgStep, images: [] }],
					}],
				}],
			};

			const standaloneNode: AssemblyTreeNode = {
				assembly: standaloneAssembly,
				pluginTypes: [{
					pluginType: standalonePluginType,
					steps: [{ step: standaloneStep, images: [] }],
				}],
			};

			const result = mapper.toTreeItems(TreeViewMode.Message, [packageNode], [standaloneNode]);

			// Should have 2 message nodes (Create from package, Update from standalone)
			const messageNodes = result.filter(n => n.type === 'sdkMessage');
			expect(messageNodes).toHaveLength(2);
			expect(messageNodes.map(n => n.name).sort()).toEqual(['Create', 'Update']);
		});

		it('should sort messages alphabetically', () => {
			const assembly = createAssembly('asm-1', 'MyAssembly');
			const pluginType = createPluginType('type-1', 'MyPlugin', 'asm-1');
			const deleteStep = createStepWithMessageAndEntity('step-1', 'DeleteStep', 'type-1', 'Delete', 'account');
			const createStep1 = createStepWithMessageAndEntity('step-2', 'CreateStep', 'type-1', 'Create', 'account');
			const updateStep = createStepWithMessageAndEntity('step-3', 'UpdateStep', 'type-1', 'Update', 'account');

			const standaloneNode: AssemblyTreeNode = {
				assembly,
				pluginTypes: [{
					pluginType,
					steps: [
						{ step: deleteStep, images: [] },
						{ step: createStep1, images: [] },
						{ step: updateStep, images: [] },
					],
				}],
			};

			const result = mapper.toTreeItems(TreeViewMode.Message, [], [standaloneNode]);

			const messageNodes = result.filter(n => n.type === 'sdkMessage');
			expect(messageNodes.map(n => n.name)).toEqual(['Create', 'Delete', 'Update']);
		});

		it('should sort entities alphabetically within message, with null last', () => {
			const assembly = createAssembly('asm-1', 'MyAssembly');
			const pluginType = createPluginType('type-1', 'MyPlugin', 'asm-1');
			const contactStep = createStepWithMessageAndEntity('step-1', 'ContactStep', 'type-1', 'Create', 'contact');
			const accountStep = createStepWithMessageAndEntity('step-2', 'AccountStep', 'type-1', 'Create', 'account');
			const globalStep = createStepWithMessageAndEntity('step-3', 'GlobalStep', 'type-1', 'Create', null);

			const standaloneNode: AssemblyTreeNode = {
				assembly,
				pluginTypes: [{
					pluginType,
					steps: [
						{ step: contactStep, images: [] },
						{ step: accountStep, images: [] },
						{ step: globalStep, images: [] },
					],
				}],
			};

			const result = mapper.toTreeItems(TreeViewMode.Message, [], [standaloneNode]);

			const createMessage = result.find(n => n.type === 'sdkMessage')!;
			const children = createMessage.children;

			// First two should be entity groups (account, contact), last should be step (global)
			expect(children).toHaveLength(3);
			expect(children[0]!.type).toBe('entityGroup');
			expect(children[0]!.name).toBe('account');
			expect(children[1]!.type).toBe('entityGroup');
			expect(children[1]!.name).toBe('contact');
			expect(children[2]!.type).toBe('step'); // Global step directly under message
		});
	});
});
