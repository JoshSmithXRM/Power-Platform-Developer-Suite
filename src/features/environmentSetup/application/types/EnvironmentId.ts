/**
 * Re-export of EnvironmentId from domain layer for use in presentation layer.
 *
 * This allows presentation layer to reference the value object without directly depending on domain.
 * Clean Architecture principle: Presentation → Application → Domain
 */
export { EnvironmentId } from '../../domain/valueObjects/EnvironmentId';
