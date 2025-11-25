/**
 * Re-export of AuthenticationMethodType from domain layer for use in presentation layer.
 *
 * This allows presentation layer to reference the type without directly depending on domain.
 * Clean Architecture principle: Presentation → Application → Domain
 */
export { AuthenticationMethodType } from '../../domain/valueObjects/AuthenticationMethod';
