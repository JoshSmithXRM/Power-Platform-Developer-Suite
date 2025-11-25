import { DomainError } from './DomainError';

/**
 * Thrown when entity construction fails due to invalid data.
 */
export class ValidationError extends DomainError {
  constructor(
    public readonly entityName: string,
    public readonly field: string,
    public readonly value: unknown,
    public readonly constraint: string
  ) {
    super(`Validation failed for ${entityName}.${field}: ${constraint} (received: ${value})`);
  }
}
