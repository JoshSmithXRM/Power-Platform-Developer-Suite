import { SourceType } from './SourceType';

describe('SourceType', () => {
	describe('static instances', () => {
		it('should have Database with value 0', () => {
			expect(SourceType.Database.getValue()).toBe(0);
			expect(SourceType.Database.getName()).toBe('Database');
		});

		it('should have Disk with value 1', () => {
			expect(SourceType.Disk.getValue()).toBe(1);
			expect(SourceType.Disk.getName()).toBe('Disk');
		});

		it('should have Normal with value 2', () => {
			expect(SourceType.Normal.getValue()).toBe(2);
			expect(SourceType.Normal.getName()).toBe('Normal');
		});

		it('should have AzureWebApp with value 3', () => {
			expect(SourceType.AzureWebApp.getValue()).toBe(3);
			expect(SourceType.AzureWebApp.getName()).toBe('AzureWebApp');
		});

		it('should have NuGet with value 4', () => {
			expect(SourceType.NuGet.getValue()).toBe(4);
			expect(SourceType.NuGet.getName()).toBe('NuGet');
		});
	});

	describe('fromValue', () => {
		it('should return Database for value 0', () => {
			expect(SourceType.fromValue(0)).toBe(SourceType.Database);
		});

		it('should return Disk for value 1', () => {
			expect(SourceType.fromValue(1)).toBe(SourceType.Disk);
		});

		it('should return Normal for value 2', () => {
			expect(SourceType.fromValue(2)).toBe(SourceType.Normal);
		});

		it('should return AzureWebApp for value 3', () => {
			expect(SourceType.fromValue(3)).toBe(SourceType.AzureWebApp);
		});

		it('should return NuGet for value 4', () => {
			expect(SourceType.fromValue(4)).toBe(SourceType.NuGet);
		});

		it('should return Unknown for unrecognized value', () => {
			const unknown = SourceType.fromValue(99);
			expect(unknown.getValue()).toBe(99);
			expect(unknown.getName()).toBe('Unknown (99)');
		});

		it('should return Unknown for negative value', () => {
			const unknown = SourceType.fromValue(-5);
			expect(unknown.getValue()).toBe(-5);
			expect(unknown.getName()).toBe('Unknown (-5)');
		});
	});

	describe('equals', () => {
		it('should return true for same instance', () => {
			expect(SourceType.Database.equals(SourceType.Database)).toBe(true);
		});

		it('should return true for instances with same value', () => {
			const type1 = SourceType.fromValue(0);
			const type2 = SourceType.fromValue(0);
			expect(type1.equals(type2)).toBe(true);
		});

		it('should return false for different types', () => {
			expect(SourceType.Database.equals(SourceType.NuGet)).toBe(false);
		});
	});
});
