import { PluginPackage } from './PluginPackage';

describe('PluginPackage', () => {
	const createPackage = (overrides: Partial<{
		id: string;
		name: string;
		uniqueName: string;
		version: string;
		isManaged: boolean;
		createdOn: Date;
		modifiedOn: Date;
	}> = {}): PluginPackage => {
		const defaults = {
			id: 'package-123',
			name: 'et_TestPackage',
			uniqueName: 'et_TestPackage',
			version: '1.0.0',
			isManaged: false,
			createdOn: new Date('2024-01-01'),
			modifiedOn: new Date('2024-01-02'),
		};
		const props = { ...defaults, ...overrides };
		return new PluginPackage(
			props.id,
			props.name,
			props.uniqueName,
			props.version,
			props.isManaged,
			props.createdOn,
			props.modifiedOn
		);
	};

	describe('canUpdate', () => {
		it('should return true for unmanaged package', () => {
			const pkg = createPackage({ isManaged: false });
			expect(pkg.canUpdate()).toBe(true);
		});

		it('should return true for managed package (hotfix support)', () => {
			// Unlike assemblies, managed packages CAN be updated for hotfixes
			const pkg = createPackage({ isManaged: true });
			expect(pkg.canUpdate()).toBe(true);
		});
	});

	describe('canDelete', () => {
		it('should return true when unmanaged and no assemblies', () => {
			const pkg = createPackage({ isManaged: false });
			expect(pkg.canDelete(0)).toBe(true);
		});

		it('should return false when managed', () => {
			const pkg = createPackage({ isManaged: true });
			expect(pkg.canDelete(0)).toBe(false);
		});

		it('should return false when has assemblies', () => {
			const pkg = createPackage({ isManaged: false });
			expect(pkg.canDelete(2)).toBe(false);
		});

		it('should return false when managed and has assemblies', () => {
			const pkg = createPackage({ isManaged: true });
			expect(pkg.canDelete(3)).toBe(false);
		});
	});

	describe('getDisplayVersion', () => {
		it('should return the version string', () => {
			const pkg = createPackage({ version: '2.5.1' });
			expect(pkg.getDisplayVersion()).toBe('2.5.1');
		});
	});

	describe('getters', () => {
		it('should return correct id', () => {
			const pkg = createPackage({ id: 'test-id' });
			expect(pkg.getId()).toBe('test-id');
		});

		it('should return correct name', () => {
			const pkg = createPackage({ name: 'et_MyPackage' });
			expect(pkg.getName()).toBe('et_MyPackage');
		});

		it('should return correct uniqueName', () => {
			const pkg = createPackage({ uniqueName: 'et_MyUniquePackage' });
			expect(pkg.getUniqueName()).toBe('et_MyUniquePackage');
		});

		it('should return correct version', () => {
			const pkg = createPackage({ version: '3.0.0' });
			expect(pkg.getVersion()).toBe('3.0.0');
		});

		it('should return correct isInManagedState', () => {
			const pkg = createPackage({ isManaged: true });
			expect(pkg.isInManagedState()).toBe(true);
		});

		it('should return correct createdOn', () => {
			const date = new Date('2024-03-15');
			const pkg = createPackage({ createdOn: date });
			expect(pkg.getCreatedOn()).toBe(date);
		});

		it('should return correct modifiedOn', () => {
			const date = new Date('2024-03-20');
			const pkg = createPackage({ modifiedOn: date });
			expect(pkg.getModifiedOn()).toBe(date);
		});
	});
});
