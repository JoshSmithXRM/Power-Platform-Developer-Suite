import { ValidationError } from '../../../../shared/domain/errors/ValidationError';

import { Solution } from './Solution';

describe('Solution', () => {
  function createValidSolution(overrides?: Partial<{
    id: string;
    uniqueName: string;
    friendlyName: string;
    version: string;
    isManaged: boolean;
    publisherId: string;
    publisherName: string;
    installedOn: Date | null;
    description: string;
    modifiedOn: Date;
    isVisible: boolean;
    isApiManaged: boolean;
    solutionType: string | null;
  }>): Solution {
    const installedOn: Date | null = overrides && 'installedOn' in overrides
      ? overrides.installedOn!
      : null;

    return new Solution(
      overrides?.id ?? 'fd140aaf-4df4-11dd-bd17-0019b9312238',
      overrides?.uniqueName ?? 'TestSolution',
      overrides?.friendlyName ?? 'Test Solution',
      overrides?.version ?? '1.0.0.0',
      overrides?.isManaged ?? false,
      overrides?.publisherId ?? 'pub-123',
      overrides?.publisherName ?? 'Test Publisher',
      installedOn,
      overrides?.description ?? 'A test solution',
      overrides?.modifiedOn ?? new Date('2024-01-15T10:00:00Z'),
      overrides?.isVisible ?? true,
      overrides?.isApiManaged ?? false,
      overrides?.solutionType ?? null
    );
  }

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
      try {
        createValidSolution({ version: 'invalid' });
        fail('Should have thrown ValidationError');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        const validationError = error as ValidationError;
        expect(validationError.entityName).toBe('Solution');
        expect(validationError.field).toBe('version');
        expect(validationError.value).toBe('invalid');
        expect(validationError.constraint).toBe('Must have at least 2 numeric segments (e.g., 1.0 or 9.0.2404.3002)');
      }
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
});
