import { ValidationError } from '../../../../shared/domain/errors/ValidationError';
import { createTestSolution } from '../../../../shared/testing';

import { Solution } from './Solution';

describe('Solution', () => {
  // Use shared test factory
  const createValidSolution = createTestSolution;

  describe('constructor', () => {
    it('should create solution with valid version format X.X.X.X', () => {
      const solution = createValidSolution({ version: '1.2.3.4' });

      expect(solution.version).toBe('1.2.3.4');
    });

    it('should accept version with large numbers', () => {
      const solution = createValidSolution({ version: '999.888.777.666' });

      expect(solution.version).toBe('999.888.777.666');
    });

    it('should accept version with zeros', () => {
      const solution = createValidSolution({ version: '0.0.0.0' });

      expect(solution.version).toBe('0.0.0.0');
    });

    it('should accept version with 2 parts (X.X)', () => {
      const solution = createValidSolution({ version: '1.0' });

      expect(solution.version).toBe('1.0');
    });

    it('should accept version with 3 parts (X.X.X)', () => {
      const solution = createValidSolution({ version: '1.0.0' });

      expect(solution.version).toBe('1.0.0');
    });

    it('should accept version with 5+ parts', () => {
      const solution = createValidSolution({ version: '1.0.0.0.0' });

      expect(solution.version).toBe('1.0.0.0.0');
    });

    it('should accept version with multi-digit segments', () => {
      const solution = createValidSolution({ version: '9.0.2404.3002' });

      expect(solution.version).toBe('9.0.2404.3002');
    });

    it('should trim whitespace from version', () => {
      const solution = createValidSolution({ version: '  1.0.0.0  ' });

      expect(solution.version).toBe('1.0.0.0');
    });

    it('should throw ValidationError for version with 1 part', () => {
      expect(() => {
        createValidSolution({ version: '1' });
      }).toThrow(ValidationError);
    });

    it('should throw ValidationError for version with letters', () => {
      expect(() => {
        createValidSolution({ version: '1.0.0.a' });
      }).toThrow(ValidationError);
    });

    it('should throw ValidationError for empty version', () => {
      expect(() => {
        createValidSolution({ version: '' });
      }).toThrow(ValidationError);
    });

    it('should throw ValidationError with correct error details', () => {
      expect(() => {
        createValidSolution({ version: 'invalid' });
      }).toThrow(expect.objectContaining({
        entityName: 'Solution',
        field: 'version',
        value: 'invalid',
        constraint: 'Must have at least 2 numeric segments (e.g., 1.0 or 9.0.2404.3002)'
      }));
    });
  });

  describe('isDefaultSolution', () => {
    it('should return true for Default solution', () => {
      const solution = createValidSolution({ uniqueName: 'Default' });

      expect(solution.isDefaultSolution()).toBe(true);
    });

    it('should return false for non-Default solution', () => {
      const solution = createValidSolution({ uniqueName: 'CustomSolution' });

      expect(solution.isDefaultSolution()).toBe(false);
    });

    it('should be case-sensitive', () => {
      const solution = createValidSolution({ uniqueName: 'default' });

      expect(solution.isDefaultSolution()).toBe(false);
    });
  });

  describe('getSortPriority', () => {
    it('should return 0 for Default solution', () => {
      const solution = createValidSolution({ uniqueName: 'Default' });

      expect(solution.getSortPriority()).toBe(0);
    });

    it('should return 1 for non-Default solution', () => {
      const solution = createValidSolution({ uniqueName: 'CustomSolution' });

      expect(solution.getSortPriority()).toBe(1);
    });
  });

  describe('properties', () => {
    it('should store all properties correctly', () => {
      const installedOn = new Date('2024-01-15');
      const modifiedOn = new Date('2024-02-20');
      const solution = new Solution(
        'solution-id-123',
        'UniqueName',
        'Friendly Name',
        '2.5.1.0',
        true,
        'publisher-id',
        'Publisher Name',
        installedOn,
        'Description text',
        modifiedOn,
        true,
        false,
        'Managed'
      );

      expect(solution.id).toBe('solution-id-123');
      expect(solution.uniqueName).toBe('UniqueName');
      expect(solution.friendlyName).toBe('Friendly Name');
      expect(solution.version).toBe('2.5.1.0');
      expect(solution.isManaged).toBe(true);
      expect(solution.publisherId).toBe('publisher-id');
      expect(solution.publisherName).toBe('Publisher Name');
      expect(solution.installedOn).toBe(installedOn);
      expect(solution.description).toBe('Description text');
      expect(solution.modifiedOn).toBe(modifiedOn);
      expect(solution.isVisible).toBe(true);
      expect(solution.isApiManaged).toBe(false);
      expect(solution.solutionType).toBe('Managed');
    });

    it('should accept null for installedOn', () => {
      const solution = createValidSolution({ installedOn: null });

      expect(solution.installedOn).toBeNull();
    });
  });

  describe('edge cases', () => {
    describe('unicode and special characters', () => {
      it('should handle unicode characters in friendly name', () => {
        const solution = createValidSolution({ friendlyName: '解决方案 🚀 Решение' });
        expect(solution.friendlyName).toBe('解决方案 🚀 Решение');
      });

      it('should handle special characters in unique name', () => {
        const solution = createValidSolution({ uniqueName: 'Solution_Name_123' });
        expect(solution.uniqueName).toBe('Solution_Name_123');
      });

      it('should handle unicode in description', () => {
        const description = 'This solution contains: 测试 • тест • δοκιμή • テスト';
        const solution = createValidSolution({ description });
        expect(solution.description).toBe(description);
      });

      it('should handle emoji in publisher name', () => {
        const solution = createValidSolution({ publisherName: '🏢 Acme Corporation' });
        expect(solution.publisherName).toBe('🏢 Acme Corporation');
      });
    });

    describe('very long strings', () => {
      it('should handle very long friendly name (1000+ chars)', () => {
        const longName = 'Solution '.repeat(200);
        const solution = createValidSolution({ friendlyName: longName });
        expect(solution.friendlyName).toBe(longName);
        expect(solution.friendlyName.length).toBeGreaterThan(1000);
      });

      it('should handle very long description (5000+ chars)', () => {
        const longDescription = 'This is a solution description. '.repeat(200);
        const solution = createValidSolution({ description: longDescription });
        expect(solution.description).toBe(longDescription);
        expect(solution.description.length).toBeGreaterThan(5000);
      });

      it('should handle very long unique name', () => {
        const longUniqueName = 'prefix_' + 'x'.repeat(1000);
        const solution = createValidSolution({ uniqueName: longUniqueName });
        expect(solution.uniqueName).toBe(longUniqueName);
      });
    });

    describe('version boundary values', () => {
      it('should handle maximum version numbers', () => {
        const solution = createValidSolution({ version: '999999.999999.999999.999999' });
        expect(solution.version).toBe('999999.999999.999999.999999');
      });

      it('should handle version with many segments', () => {
        const solution = createValidSolution({ version: '1.2.3.4.5.6.7.8.9.10' });
        expect(solution.version).toBe('1.2.3.4.5.6.7.8.9.10');
      });

      it('should handle minimum valid version (two segments)', () => {
        const solution = createValidSolution({ version: '0.0' });
        expect(solution.version).toBe('0.0');
      });

      it('should trim excessive whitespace from version', () => {
        const solution = createValidSolution({ version: '   1.0.0.0   ' });
        expect(solution.version).toBe('1.0.0.0');
      });

      it('should handle version with leading zeros', () => {
        const solution = createValidSolution({ version: '01.02.03.04' });
        expect(solution.version).toBe('01.02.03.04');
      });
    });

    describe('null and undefined handling', () => {
      it('should handle null installedOn date', () => {
        const solution = createValidSolution({ installedOn: null });
        expect(solution.installedOn).toBeNull();
      });

      it('should handle null solutionType', () => {
        const modifiedOn = new Date();
        const solution = new Solution(
          'id-123',
          'UniqueName',
          'Friendly Name',
          '1.0',
          false,
          'pub-id',
          'Publisher',
          null,
          'Description',
          modifiedOn,
          true,
          false,
          null
        );
        expect(solution.solutionType).toBeNull();
      });
    });

    describe('immutability', () => {
      it('should maintain version immutability after trimming', () => {
        const solution = createValidSolution({ version: '  1.0.0.0  ' });
        const version1 = solution.version;
        const version2 = solution.version;
        expect(version1).toBe(version2);
        expect(version1).toBe('1.0.0.0');
      });

      it('should maintain immutability of id', () => {
        const solution = createValidSolution({ id: 'immutable-123' });
        const id1 = solution.id;
        const id2 = solution.id;
        expect(id1).toBe(id2);
        expect(id1).toBe('immutable-123');
      });

      it('should maintain immutability of dates', () => {
        const installedOn = new Date('2024-01-01');
        const modifiedOn = new Date('2024-02-01');
        const solution = createValidSolution({ installedOn, modifiedOn });
        expect(solution.installedOn).toBe(installedOn);
        expect(solution.modifiedOn).toBe(modifiedOn);
      });
    });

    describe('default solution edge cases', () => {
      it('should be case-sensitive for Default solution check', () => {
        const defaultLower = createValidSolution({ uniqueName: 'default' });
        const defaultUpper = createValidSolution({ uniqueName: 'DEFAULT' });
        const defaultMixed = createValidSolution({ uniqueName: 'DeFaUlT' });

        expect(defaultLower.isDefaultSolution()).toBe(false);
        expect(defaultUpper.isDefaultSolution()).toBe(false);
        expect(defaultMixed.isDefaultSolution()).toBe(false);
      });

      it('should handle Default with extra whitespace in unique name', () => {
        const solution = createValidSolution({ uniqueName: ' Default ' });
        expect(solution.isDefaultSolution()).toBe(false);
        expect(solution.uniqueName).toBe(' Default ');
      });

      it('should correctly identify Default solution among many', () => {
        const solutions = [
          createValidSolution({ uniqueName: 'CustomSolution1' }),
          createValidSolution({ uniqueName: 'Default' }),
          createValidSolution({ uniqueName: 'CustomSolution2' })
        ];

        expect(solutions[0]!.isDefaultSolution()).toBe(false);
        expect(solutions[1]!.isDefaultSolution()).toBe(true);
        expect(solutions[2]!.isDefaultSolution()).toBe(false);
      });
    });

    describe('sort priority edge cases', () => {
      it('should consistently return same priority', () => {
        const defaultSolution = createValidSolution({ uniqueName: 'Default' });
        const priority1 = defaultSolution.getSortPriority();
        const priority2 = defaultSolution.getSortPriority();
        expect(priority1).toBe(priority2);
        expect(priority1).toBe(0);
      });

      it('should have different priorities for Default vs custom', () => {
        const defaultSolution = createValidSolution({ uniqueName: 'Default' });
        const customSolution = createValidSolution({ uniqueName: 'Custom' });

        expect(defaultSolution.getSortPriority()).toBe(0);
        expect(customSolution.getSortPriority()).toBe(1);
        expect(defaultSolution.getSortPriority()).toBeLessThan(customSolution.getSortPriority());
      });
    });

    describe('boolean flags edge cases', () => {
      it('should handle all boolean combinations', () => {
        const solution1 = createValidSolution({ isManaged: true, isVisible: true, isApiManaged: true });
        const solution2 = createValidSolution({ isManaged: false, isVisible: false, isApiManaged: false });

        expect(solution1.isManaged).toBe(true);
        expect(solution1.isVisible).toBe(true);
        expect(solution1.isApiManaged).toBe(true);

        expect(solution2.isManaged).toBe(false);
        expect(solution2.isVisible).toBe(false);
        expect(solution2.isApiManaged).toBe(false);
      });
    });
  });
});
