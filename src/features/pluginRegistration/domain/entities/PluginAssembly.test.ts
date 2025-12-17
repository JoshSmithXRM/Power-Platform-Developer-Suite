import { PluginAssembly } from './PluginAssembly';
import { IsolationMode } from '../valueObjects/IsolationMode';
import { SourceType } from '../valueObjects/SourceType';

describe('PluginAssembly', () => {
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
			createdOn: new Date('2024-01-01'),
			modifiedOn: new Date('2024-01-02'),
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

	describe('canUpdate', () => {
		it('should return true when unmanaged and standalone (no package)', () => {
			const assembly = createAssembly({ isManaged: false, packageId: null });
			expect(assembly.canUpdate()).toBe(true);
		});

		it('should return false when managed', () => {
			const assembly = createAssembly({ isManaged: true, packageId: null });
			expect(assembly.canUpdate()).toBe(false);
		});

		it('should return false when in a package (even if unmanaged)', () => {
			const assembly = createAssembly({ isManaged: false, packageId: 'pkg-123' });
			expect(assembly.canUpdate()).toBe(false);
		});

		it('should return false when both managed and in a package', () => {
			const assembly = createAssembly({ isManaged: true, packageId: 'pkg-123' });
			expect(assembly.canUpdate()).toBe(false);
		});
	});

	describe('canDelete', () => {
		it('should return true when unmanaged and no active steps', () => {
			const assembly = createAssembly({ isManaged: false });
			expect(assembly.canDelete(0)).toBe(true);
		});

		it('should return false when managed', () => {
			const assembly = createAssembly({ isManaged: true });
			expect(assembly.canDelete(0)).toBe(false);
		});

		it('should return false when has active steps', () => {
			const assembly = createAssembly({ isManaged: false });
			expect(assembly.canDelete(5)).toBe(false);
		});

		it('should return false when managed and has active steps', () => {
			const assembly = createAssembly({ isManaged: true });
			expect(assembly.canDelete(3)).toBe(false);
		});
	});

	describe('isInPackage', () => {
		it('should return false when packageId is null', () => {
			const assembly = createAssembly({ packageId: null });
			expect(assembly.isInPackage()).toBe(false);
		});

		it('should return true when packageId is set', () => {
			const assembly = createAssembly({ packageId: 'pkg-123' });
			expect(assembly.isInPackage()).toBe(true);
		});
	});

	describe('getDisplayVersion', () => {
		it('should return the version string', () => {
			const assembly = createAssembly({ version: '2.1.0.5' });
			expect(assembly.getDisplayVersion()).toBe('2.1.0.5');
		});
	});

	describe('getters', () => {
		it('should return correct id', () => {
			const assembly = createAssembly({ id: 'test-id' });
			expect(assembly.getId()).toBe('test-id');
		});

		it('should return correct name', () => {
			const assembly = createAssembly({ name: 'MyCompany.Plugins' });
			expect(assembly.getName()).toBe('MyCompany.Plugins');
		});

		it('should return correct version', () => {
			const assembly = createAssembly({ version: '3.0.0.0' });
			expect(assembly.getVersion()).toBe('3.0.0.0');
		});

		it('should return correct isolationMode', () => {
			const assembly = createAssembly({ isolationMode: IsolationMode.None });
			expect(assembly.getIsolationMode()).toBe(IsolationMode.None);
		});

		it('should return correct isInManagedState', () => {
			const assembly = createAssembly({ isManaged: true });
			expect(assembly.isInManagedState()).toBe(true);
		});

		it('should return correct sourceType', () => {
			const assembly = createAssembly({ sourceType: SourceType.NuGet });
			expect(assembly.getSourceType()).toBe(SourceType.NuGet);
		});

		it('should return correct packageId', () => {
			const assembly = createAssembly({ packageId: 'pkg-456' });
			expect(assembly.getPackageId()).toBe('pkg-456');
		});

		it('should return null for packageId when not set', () => {
			const assembly = createAssembly({ packageId: null });
			expect(assembly.getPackageId()).toBeNull();
		});

		it('should return correct createdOn', () => {
			const date = new Date('2024-05-10');
			const assembly = createAssembly({ createdOn: date });
			expect(assembly.getCreatedOn()).toBe(date);
		});

		it('should return correct modifiedOn', () => {
			const date = new Date('2024-05-15');
			const assembly = createAssembly({ modifiedOn: date });
			expect(assembly.getModifiedOn()).toBe(date);
		});
	});
});
