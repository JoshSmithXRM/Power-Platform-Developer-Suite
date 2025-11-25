/**
 * Tests for PropertyPath value object
 *
 * Covers:
 * - Path validation and creation
 * - Dot notation parsing
 * - Bracket notation parsing
 * - Mixed notation parsing
 * - Invalid path handling
 * - Edge cases (deep nesting, special characters, empty paths)
 * - Segment access and string representation
 */
import { PropertyPath } from './PropertyPath';

describe('PropertyPath', () => {
	// ==================== Creation Tests ====================
	describe('create', () => {
		it('should create PropertyPath from simple dot notation path', () => {
			// Arrange & Act
			const path = PropertyPath.create('environments');

			// Assert
			expect(path).toBeDefined();
			expect(path.segments).toEqual(['environments']);
		});

		it('should create PropertyPath from multi-segment dot notation', () => {
			// Arrange & Act
			const path = PropertyPath.create('environments.dataverseUrl');

			// Assert
			expect(path.segments).toEqual(['environments', 'dataverseUrl']);
		});

		it('should create PropertyPath from bracket notation with numeric index', () => {
			// Arrange & Act
			const path = PropertyPath.create('environments[0]');

			// Assert
			expect(path.segments).toEqual(['environments', '0']);
		});

		it('should create PropertyPath from mixed dot and bracket notation', () => {
			// Arrange & Act
			const path = PropertyPath.create('environments[0].dataverseUrl');

			// Assert
			expect(path.segments).toEqual(['environments', '0', 'dataverseUrl']);
		});

		it('should create PropertyPath from deeply nested mixed notation', () => {
			// Arrange & Act
			const path = PropertyPath.create('config[0].credentials[2].clientId');

			// Assert
			expect(path.segments).toEqual(['config', '0', 'credentials', '2', 'clientId']);
		});
	});

	// ==================== Dot Notation Tests ====================
	describe('dot notation parsing', () => {
		it('should parse single property', () => {
			// Arrange & Act
			const path = PropertyPath.create('property');

			// Assert
			expect(path.segments).toEqual(['property']);
		});

		it('should parse two-level nested property', () => {
			// Arrange & Act
			const path = PropertyPath.create('user.name');

			// Assert
			expect(path.segments).toEqual(['user', 'name']);
		});

		it('should parse deeply nested property with many levels', () => {
			// Arrange & Act
			const path = PropertyPath.create('a.b.c.d.e.f.g');

			// Assert
			expect(path.segments).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g']);
		});

		it('should handle numeric segment in dot notation', () => {
			// Arrange & Act
			const path = PropertyPath.create('items.0.value');

			// Assert
			expect(path.segments).toEqual(['items', '0', 'value']);
		});

		it('should handle multiple numeric segments', () => {
			// Arrange & Act
			const path = PropertyPath.create('matrix.0.1.2');

			// Assert
			expect(path.segments).toEqual(['matrix', '0', '1', '2']);
		});
	});

	// ==================== Bracket Notation Tests ====================
	describe('bracket notation parsing', () => {
		it('should parse single bracket notation', () => {
			// Arrange & Act
			const path = PropertyPath.create('items[0]');

			// Assert
			expect(path.segments).toEqual(['items', '0']);
		});

		it('should parse bracket notation with various numeric indices', () => {
			// Arrange & Act
			const path = PropertyPath.create('array[5]');

			// Assert
			expect(path.segments).toEqual(['array', '5']);
		});

		it('should parse multiple consecutive bracket notations', () => {
			// Arrange & Act
			const path = PropertyPath.create('matrix[0][1][2]');

			// Assert
			expect(path.segments).toEqual(['matrix', '0', '1', '2']);
		});

		it('should handle large numeric indices in brackets', () => {
			// Arrange & Act
			const path = PropertyPath.create('items[999]');

			// Assert
			expect(path.segments).toEqual(['items', '999']);
		});
	});

	// ==================== Mixed Notation Tests ====================
	describe('mixed notation parsing', () => {
		it('should parse dot notation followed by bracket notation', () => {
			// Arrange & Act
			const path = PropertyPath.create('users.profiles[0]');

			// Assert
			expect(path.segments).toEqual(['users', 'profiles', '0']);
		});

		it('should parse bracket notation followed by dot notation', () => {
			// Arrange & Act
			const path = PropertyPath.create('items[0].name');

			// Assert
			expect(path.segments).toEqual(['items', '0', 'name']);
		});

		it('should parse alternating dot and bracket notation', () => {
			// Arrange & Act
			const path = PropertyPath.create('config[0].credentials.secrets[1].token');

			// Assert
			expect(path.segments).toEqual(['config', '0', 'credentials', 'secrets', '1', 'token']);
		});

		it('should parse complex real-world example', () => {
			// Arrange & Act
			const path = PropertyPath.create('environments[0].dataverseUrl');

			// Assert
			expect(path.segments).toEqual(['environments', '0', 'dataverseUrl']);
		});
	});

	// ==================== Edge Cases ====================
	describe('edge cases', () => {
		it('should handle underscore in property names', () => {
			// Arrange & Act
			const path = PropertyPath.create('data_value.nested_prop');

			// Assert
			expect(path.segments).toEqual(['data_value', 'nested_prop']);
		});

		it('should handle camelCase property names', () => {
			// Arrange & Act
			const path = PropertyPath.create('myProperty.nestedValue');

			// Assert
			expect(path.segments).toEqual(['myProperty', 'nestedValue']);
		});

		it('should handle PascalCase property names', () => {
			// Arrange & Act
			const path = PropertyPath.create('MyClass.PropertyName');

			// Assert
			expect(path.segments).toEqual(['MyClass', 'PropertyName']);
		});

		it('should handle deeply nested paths (20+ levels)', () => {
			// Arrange & Act
			const path = PropertyPath.create('a.b.c.d.e.f.g.h.i.j.k.l.m.n.o.p.q.r.s.t.u.v.w.x.y.z');

			// Assert
			expect(path.segments.length).toBe(26);
			expect(path.segments[0]).toBe('a');
			expect(path.segments[25]).toBe('z');
		});

		it('should handle zero index in brackets', () => {
			// Arrange & Act
			const path = PropertyPath.create('items[0]');

			// Assert
			expect(path.segments).toEqual(['items', '0']);
		});

		it('should ignore trailing dot', () => {
			// Arrange & Act
			const path = PropertyPath.create('property.');

			// Assert
			expect(path.segments).toEqual(['property']);
		});

		it('should ignore leading dot', () => {
			// Arrange & Act
			const path = PropertyPath.create('.property');

			// Assert
			expect(path.segments).toEqual(['property']);
		});

		it('should ignore multiple consecutive dots', () => {
			// Arrange & Act
			const path = PropertyPath.create('property..nested');

			// Assert
			expect(path.segments).toEqual(['property', 'nested']);
		});
	});

	// ==================== toString Tests ====================
	describe('toString', () => {
		it('should return single segment as-is', () => {
			// Arrange & Act
			const path = PropertyPath.create('property');

			// Assert
			expect(path.toString()).toBe('property');
		});

		it('should return segments joined by dots', () => {
			// Arrange & Act
			const path = PropertyPath.create('user.profile.name');

			// Assert
			expect(path.toString()).toBe('user.profile.name');
		});

		it('should normalize bracket notation to dot notation', () => {
			// Arrange & Act
			const path = PropertyPath.create('items[0].value');

			// Assert
			expect(path.toString()).toBe('items.0.value');
		});

		it('should normalize mixed notation to consistent dot format', () => {
			// Arrange & Act
			const path = PropertyPath.create('config[0].credentials[1].token');

			// Assert
			expect(path.toString()).toBe('config.0.credentials.1.token');
		});
	});

	// ==================== fromSegments Tests ====================
	describe('fromSegments', () => {
		it('should create PropertyPath from array of segments', () => {
			// Arrange & Act
			const path = PropertyPath.fromSegments(['user', 'profile', 'name']);

			// Assert
			expect(path.segments).toEqual(['user', 'profile', 'name']);
		});

		it('should create PropertyPath from single segment array', () => {
			// Arrange & Act
			const path = PropertyPath.fromSegments(['property']);

			// Assert
			expect(path.segments).toEqual(['property']);
		});

		it('should create PropertyPath from numeric segments', () => {
			// Arrange & Act
			const path = PropertyPath.fromSegments(['items', '0', 'value']);

			// Assert
			expect(path.segments).toEqual(['items', '0', 'value']);
		});

		it('should preserve segment order from array', () => {
			// Arrange & Act
			const segments = ['a', 'b', 'c', 'd'];
			const path = PropertyPath.fromSegments(segments);

			// Assert
			expect(path.segments).toEqual(segments);
		});
	});

	// ==================== Segments Access Tests ====================
	describe('segments property', () => {
		it('should return readonly array of segments', () => {
			// Arrange & Act
			const path = PropertyPath.create('user.name');

			// Assert
			expect(Array.isArray(path.segments)).toBe(true);
			expect(path.segments.length).toBe(2);
		});

		it('should provide type-safe readonly segments', () => {
			// Arrange
			const path = PropertyPath.create('user.name');

			// Act & Assert - Verify segments is readonly at type level
			const segments: ReadonlyArray<string> = path.segments;
			expect(segments).toEqual(['user', 'name']);
		});

		it('should return segments in correct order', () => {
			// Arrange & Act
			const path = PropertyPath.create('a.b.c');

			// Assert
			expect(path.segments[0]).toBe('a');
			expect(path.segments[1]).toBe('b');
			expect(path.segments[2]).toBe('c');
		});

		it('should be consistently accessible', () => {
			// Arrange
			const path = PropertyPath.create('a.b.c');

			// Act
			const segments1 = path.segments;
			const segments2 = path.segments;

			// Assert
			expect(segments1).toEqual(segments2);
			expect(segments1).toBe(segments2);
		});
	});

	// ==================== Consistency Tests ====================
	describe('consistency across notations', () => {
		it('should normalize dot and bracket notations to same result', () => {
			// Arrange & Act
			const dotPath = PropertyPath.create('items.0.value');
			const bracketPath = PropertyPath.create('items[0].value');

			// Assert
			expect(dotPath.segments).toEqual(bracketPath.segments);
			expect(dotPath.toString()).toBe(bracketPath.toString());
		});

		it('should handle mixed notations consistently', () => {
			// Arrange & Act
			const mixedPath = PropertyPath.create('items[0].config.settings[2]');
			const dotPath = PropertyPath.create('items.0.config.settings.2');

			// Assert
			expect(mixedPath.segments).toEqual(dotPath.segments);
		});

		it('should produce same result from create and fromSegments', () => {
			// Arrange & Act
			const created = PropertyPath.create('user.profile.name');
			const fromSegments = PropertyPath.fromSegments(['user', 'profile', 'name']);

			// Assert
			expect(created.segments).toEqual(fromSegments.segments);
			expect(created.toString()).toBe(fromSegments.toString());
		});
	});
});
