/**
 * Re-exports domain types for use in presentation layer.
 * This allows presentation layer to use domain types without direct import.
 */
export { VisualQuery } from '../../domain/valueObjects/VisualQuery';
export { QueryColumn } from '../../domain/valueObjects/QueryColumn';
export { QueryCondition } from '../../domain/valueObjects/QueryCondition';
export { QueryFilterGroup } from '../../domain/valueObjects/QueryFilterGroup';
export { QuerySort } from '../../domain/valueObjects/QuerySort';

export { FetchXmlGenerator } from '../../domain/services/FetchXmlGenerator';
export { FetchXmlParser } from '../../domain/services/FetchXmlParser';
export { FetchXmlToSqlTranspiler } from '../../domain/services/FetchXmlToSqlTranspiler';
export { SqlParser } from '../../domain/services/SqlParser';
export { SqlToFetchXmlTranspiler } from '../../domain/services/SqlToFetchXmlTranspiler';

// FetchXML operator types
export type { FetchXmlConditionOperator } from '../../domain/valueObjects/FetchXmlOperator';
export { FETCHXML_OPERATOR_METADATA } from '../../domain/valueObjects/FetchXmlOperator';

// Attribute types
export type { AttributeTypeHint } from '../../domain/valueObjects/AttributeSuggestion';
