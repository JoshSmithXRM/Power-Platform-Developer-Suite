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
			const result = mapper.toTreeItems([], []);
			expect(result).toEqual([]);
		});

		it('should map standalone assembly without package', () => {
			const assembly = createAssembly('asm-1', 'MyAssembly');
			const standaloneNode: AssemblyTreeNode = {
				assembly,
				pluginTypes: [],
			};

			const result = mapper.toTreeItems([], [standaloneNode]);

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

			const result = mapper.toTreeItems([packageNode], []);

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

			const result = mapper.toTreeItems([packageNode], [standaloneNode]);

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

			const result = mapper.toTreeItems([packageNode], []);

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

			const result = mapper.toTreeItems([], [standaloneNode]);

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

			const result = mapper.toTreeItems([], [standaloneNode]);

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

			const result = mapper.toTreeItems(packages, []);

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

			const result = mapper.toTreeItems([], standalones);

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

			const result = mapper.toTreeItems([], [standaloneNode]);

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

			const result = mapper.toTreeItems([], [standaloneNode]);

			const stepNode = result[0]!.children[0]!.children[0]!;
			expect(stepNode.children).toHaveLength(2);
			expect(stepNode.children[0]!.id).toBe('img-1');
			expect(stepNode.children[1]!.id).toBe('img-2');
		});
	});
});
