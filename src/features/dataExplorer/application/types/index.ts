/**
 * Re-exports domain types for use in presentation layer.
 * This allows presentation layer to use domain types without direct import.
 */
export { VisualQuery } from '../../domain/valueObjects/VisualQuery';
export type { QueryColumn } from '../../domain/valueObjects/QueryColumn';
export type { QueryCondition } from '../../domain/valueObjects/QueryCondition';
export type { QueryFilterGroup } from '../../domain/valueObjects/QueryFilterGroup';
export type { QuerySort } from '../../domain/valueObjects/QuerySort';

export { FetchXmlGenerator } from '../../domain/services/FetchXmlGenerator';
export { FetchXmlToSqlTranspiler } from '../../domain/services/FetchXmlToSqlTranspiler';
