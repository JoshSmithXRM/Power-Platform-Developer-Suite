/**
 * Unit tests for ODataQueryBuilder
 */

import { ODataQueryBuilder } from './ODataQueryBuilder';

describe('ODataQueryBuilder', () => {
	describe('build', () => {
		it('should return empty string when no options provided', () => {
			const result = ODataQueryBuilder.build();
			expect(result).toBe('');
		});

		it('should return empty string when empty options object provided', () => {
			const result = ODataQueryBuilder.build({});
			expect(result).toBe('');
		});

		it('should build select query', () => {
			const result = ODataQueryBuilder.build({
				select: ['name', 'id', 'description']
			});
			expect(result).toBe('$select=name,id,description');
		});

		it('should skip select when empty array', () => {
			const result = ODataQueryBuilder.build({
				select: []
			});
			expect(result).toBe('');
		});

		it('should build filter query with encoding', () => {
			const result = ODataQueryBuilder.build({
				filter: "name eq 'Test Company'"
			});
			expect(result).toBe("$filter=name%20eq%20'Test%20Company'");
		});

		it('should encode special characters in filter', () => {
			const result = ODataQueryBuilder.build({
				filter: "description contains 'A & B'"
			});
			expect(result).toContain('$filter=');
			expect(result).toContain('%20');
			expect(result).toContain('%26');
		});

		it('should build expand query', () => {
			const result = ODataQueryBuilder.build({
				expand: 'contact($select=fullname,emailaddress)'
			});
			expect(result).toBe('$expand=contact($select=fullname,emailaddress)');
		});

		it('should build orderBy query', () => {
			const result = ODataQueryBuilder.build({
				orderBy: 'createdon desc'
			});
			expect(result).toBe('$orderby=createdon desc');
		});

		it('should build top query', () => {
			const result = ODataQueryBuilder.build({
				top: 50
			});
			expect(result).toBe('$top=50');
		});

		it('should handle top with zero', () => {
			const result = ODataQueryBuilder.build({
				top: 0
			});
			expect(result).toBe('$top=0');
		});

		it('should combine multiple query options with ampersand', () => {
			const result = ODataQueryBuilder.build({
				select: ['name', 'id'],
				filter: 'statecode eq 0',
				orderBy: 'name asc',
				top: 10
			});

			expect(result).toContain('$select=name,id');
			expect(result).toContain('$filter=');
			expect(result).toContain('$orderby=name asc');
			expect(result).toContain('$top=10');

			const parts = result.split('&');
			expect(parts.length).toBe(4);
		});

		it('should combine select, filter, and expand', () => {
			const result = ODataQueryBuilder.build({
				select: ['solutionid', 'friendlyname'],
				filter: 'isvisible eq true',
				expand: 'publisher($select=friendlyname)'
			});

			expect(result).toContain('$select=solutionid,friendlyname');
			expect(result).toContain('$filter=');
			expect(result).toContain('$expand=publisher');
		});

		it('should handle complex filter expressions', () => {
			const result = ODataQueryBuilder.build({
				filter: "(statecode eq 0) and (createdon ge 2024-01-01)"
			});

			expect(result).toContain('$filter=');
			expect(result).toContain('%20');
		});

		it('should preserve order of query parameters', () => {
			const result = ODataQueryBuilder.build({
				select: ['name'],
				filter: 'id eq 1',
				expand: 'contact',
				orderBy: 'name',
				top: 5
			});

			const selectIndex = result.indexOf('$select');
			const filterIndex = result.indexOf('$filter');
			const expandIndex = result.indexOf('$expand');
			const orderByIndex = result.indexOf('$orderby');
			const topIndex = result.indexOf('$top');

			expect(selectIndex).toBeLessThan(filterIndex);
			expect(filterIndex).toBeLessThan(expandIndex);
			expect(expandIndex).toBeLessThan(orderByIndex);
			expect(orderByIndex).toBeLessThan(topIndex);
		});

		it('should handle single select field', () => {
			const result = ODataQueryBuilder.build({
				select: ['name']
			});
			expect(result).toBe('$select=name');
		});

		it('should handle nested expand with multiple levels', () => {
			const result = ODataQueryBuilder.build({
				expand: 'contact($select=fullname;$expand=account($select=name))'
			});
			expect(result).toBe('$expand=contact($select=fullname;$expand=account($select=name))');
		});
	});

	describe('Real-world scenarios', () => {
		it('should build query for listing solutions', () => {
			const result = ODataQueryBuilder.build({
				select: [
					'solutionid',
					'friendlyname',
					'uniquename',
					'version',
					'ismanaged',
					'installedon',
					'modifiedon'
				],
				filter: 'isvisible eq true',
				orderBy: 'friendlyname asc'
			});

			expect(result).toContain('$select=');
			expect(result).toContain('solutionid');
			expect(result).toContain('friendlyname');
			expect(result).toContain('$filter=');
			expect(result).toContain('$orderby=friendlyname asc');
		});

		it('should build query for plugin traces with top', () => {
			const result = ODataQueryBuilder.build({
				select: [
					'plugintraceid',
					'typename',
					'messageblock',
					'createdon'
				],
				filter: 'createdon ge 2024-01-01T00:00:00Z',
				orderBy: 'createdon desc',
				top: 100
			});

			expect(result).toContain('$select=');
			expect(result).toContain('$filter=');
			expect(result).toContain('$orderby=createdon desc');
			expect(result).toContain('$top=100');
		});

		it('should build query with expand and select', () => {
			const result = ODataQueryBuilder.build({
				select: ['importjobid', 'name', 'createdon'],
				expand: 'solution($select=friendlyname)',
				orderBy: 'createdon desc'
			});

			expect(result).toContain('$select=importjobid,name,createdon');
			expect(result).toContain('$expand=solution($select=friendlyname)');
			expect(result).toContain('$orderby=createdon desc');
		});
	});
});
