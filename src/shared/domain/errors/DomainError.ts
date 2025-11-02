/**
 * Base domain exception - all domain exceptions extend this.
 */
export abstract class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}
