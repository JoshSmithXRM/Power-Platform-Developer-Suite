import { PluginAssemblyViewModelMapper } from './PluginAssemblyViewModelMapper';
import { PluginAssembly } from '../../domain/entities/PluginAssembly';
import { IsolationMode } from '../../domain/valueObjects/IsolationMode';
import { SourceType } from '../../domain/valueObjects/SourceType';
import type { TreeItemViewModel } from '../viewModels/TreeItemViewModel';

describe('PluginAssemblyViewModelMapper', () => {
	const mapper = new PluginAssemblyViewModelMapper();

	const createAssembly = (overrides: Partial<{
		id: string;
		name: string;
		version: string;
		isolationMode: IsolationMode;
		isManaged: boolean;
		sourceType: SourceType;
		packageId: string | null;
		createdOn: Date;
		modifiedOn: Date;
	}> = {}): PluginAssembly => {
		const defaults = {
			id: 'assembly-123',
			name: 'TestAssembly.Plugins',
			version: '1.0.0.0',
			isolationMode: IsolationMode.Sandbox,
			isManaged: false,
			sourceType: SourceType.Database,
			packageId: null,
			createdOn: new Date('2024-01-01T10:00:00Z'),
			modifiedOn: new Date('2024-01-02T10:00:00Z'),
		};
		const props = { ...defaults, ...overrides };
		return new PluginAssembly(
			props.id,
			props.name,
			props.version,
			props.isolationMode,
			props.isManaged,
			props.sourceType,
			props.packageId,
			props.createdOn,
			props.modifiedOn
		);
	};

	describe('toTreeItem', () => {
		it('should map basic assembly properties', () => {
			const assembly = createAssembly({ id: 'asm-abc', name: 'MyCompany.Plugins' });
			const result = mapper.toTreeItem(assembly, [], 0);

			expect(result.id).toBe('asm-abc');
			expect(result.name).toBe('MyCompany.Plugins');
			expect(result.displayName).toBe('MyCompany.Plugins');
			expect(result.type).toBe('assembly');
			expect(result.icon).toBe('⚙️');
		});

		it('should set parentId to null for standalone assembly', () => {
			const assembly = createAssembly();
			const result = mapper.toTreeItem(assembly, [], 0, null);

			expect(result.parentId).toBeNull();
		});

		it('should set parentId to package ID when provided', () => {
			const assembly = createAssembly({ packageId: 'pkg-123' });
			const result = mapper.toTreeItem(assembly, [], 0, 'pkg-123');

			expect(result.parentId).toBe('pkg-123');
		});

		it('should map isManaged correctly', () => {
			const managedAssembly = createAssembly({ isManaged: true });
			const unmanagedAssembly = createAssembly({ isManaged: false });

			expect(mapper.toTreeItem(managedAssembly, [], 0).isManaged).toBe(true);
			expect(mapper.toTreeItem(unmanagedAssembly, [], 0).isManaged).toBe(false);
		});

		it('should include children (plugin types)', () => {
			const assembly = createAssembly();
			const pluginTypeItems: TreeItemViewModel[] = [
				{
					id: 'type-1',
					parentId: 'assembly-123',
					type: 'pluginType',
					name: 'Plugin1',
					displayName: 'Plugin1',
					icon: '🔌',
					isManaged: false,
					children: [],
					metadata: { type: 'pluginType', typeName: 'Plugin1', friendlyName: 'Plugin1', isWorkflowActivity: false, workflowActivityGroupName: null },
				},
				{
					id: 'type-2',
					parentId: 'assembly-123',
					type: 'pluginType',
					name: 'Plugin2',
					displayName: 'Plugin2',
					icon: '🔌',
					isManaged: false,
					children: [],
					metadata: { type: 'pluginType', typeName: 'Plugin2', friendlyName: 'Plugin2', isWorkflowActivity: false, workflowActivityGroupName: null },
				},
			];

			const result = mapper.toTreeItem(assembly, pluginTypeItems, 0);

			expect(result.children).toHaveLength(2);
			expect(result.children[0]!.id).toBe('type-1');
			expect(result.children[1]!.id).toBe('type-2');
		});

		describe('metadata', () => {
			it('should map version', () => {
				const assembly = createAssembly({ version: '2.5.1.0' });
				const result = mapper.toTreeItem(assembly, [], 0);

				expect(result.metadata?.type).toBe('assembly');
				if (result.metadata?.type === 'assembly') {
					expect(result.metadata.version).toBe('2.5.1.0');
				}
			});

			it('should map isolation mode name', () => {
				const assembly = createAssembly({ isolationMode: IsolationMode.Sandbox });
				const result = mapper.toTreeItem(assembly, [], 0);

				if (result.metadata?.type === 'assembly') {
					expect(result.metadata.isolationMode).toBe('Sandbox');
				}
			});

			it('should map source type name', () => {
				const assembly = createAssembly({ sourceType: SourceType.NuGet });
				const result = mapper.toTreeItem(assembly, [], 0);

				if (result.metadata?.type === 'assembly') {
					expect(result.metadata.sourceType).toBe('NuGet');
				}
			});

			it('should map createdOn as ISO string', () => {
				const assembly = createAssembly({ createdOn: new Date('2024-05-10T08:00:00Z') });
				const result = mapper.toTreeItem(assembly, [], 0);

				if (result.metadata?.type === 'assembly') {
					expect(result.metadata.createdOn).toBe('2024-05-10T08:00:00.000Z');
				}
			});

			it('should map modifiedOn as ISO string', () => {
				const assembly = createAssembly({ modifiedOn: new Date('2024-06-15T14:30:00Z') });
				const result = mapper.toTreeItem(assembly, [], 0);

				if (result.metadata?.type === 'assembly') {
					expect(result.metadata.modifiedOn).toBe('2024-06-15T14:30:00.000Z');
				}
			});

			it('should map packageId', () => {
				const assembly = createAssembly({ packageId: 'pkg-456' });
				const result = mapper.toTreeItem(assembly, [], 0);

				if (result.metadata?.type === 'assembly') {
					expect(result.metadata.packageId).toBe('pkg-456');
				}
			});

			it('should map null packageId for standalone', () => {
				const assembly = createAssembly({ packageId: null });
				const result = mapper.toTreeItem(assembly, [], 0);

				if (result.metadata?.type === 'assembly') {
					expect(result.metadata.packageId).toBeNull();
				}
			});

			it('should set canUpdate true for unmanaged standalone assembly', () => {
				const assembly = createAssembly({ isManaged: false, packageId: null });
				const result = mapper.toTreeItem(assembly, [], 0);

				if (result.metadata?.type === 'assembly') {
					expect(result.metadata.canUpdate).toBe(true);
				}
			});

			it('should set canUpdate false for managed assembly', () => {
				const assembly = createAssembly({ isManaged: true, packageId: null });
				const result = mapper.toTreeItem(assembly, [], 0);

				if (result.metadata?.type === 'assembly') {
					expect(result.metadata.canUpdate).toBe(false);
				}
			});

			it('should set canUpdate false for assembly in package', () => {
				const assembly = createAssembly({ isManaged: false, packageId: 'pkg-123' });
				const result = mapper.toTreeItem(assembly, [], 0);

				if (result.metadata?.type === 'assembly') {
					expect(result.metadata.canUpdate).toBe(false);
				}
			});

			it('should set canDelete true when unmanaged and no active steps', () => {
				const assembly = createAssembly({ isManaged: false });
				const result = mapper.toTreeItem(assembly, [], 0);

				if (result.metadata?.type === 'assembly') {
					expect(result.metadata.canDelete).toBe(true);
				}
			});

			it('should set canDelete false when has active steps', () => {
				const assembly = createAssembly({ isManaged: false });
				const result = mapper.toTreeItem(assembly, [], 5);

				if (result.metadata?.type === 'assembly') {
					expect(result.metadata.canDelete).toBe(false);
				}
			});

			it('should set canDelete false when managed', () => {
				const assembly = createAssembly({ isManaged: true });
				const result = mapper.toTreeItem(assembly, [], 0);

				if (result.metadata?.type === 'assembly') {
					expect(result.metadata.canDelete).toBe(false);
				}
			});
		});
	});
});
