/**
 * Tests for type re-exports.
 * This file re-exports domain types for application layer use.
 * Tests verify that all expected exports are available.
 */

import {
	TraceLevel,
	ExecutionMode,
	OperationType,
	Duration,
	TraceStatus,
	CorrelationId,
	PipelineStage,
	FilterField,
	FilterOperator,
	DateTimeFilter,
	ValidationError,
	PluginTrace,
	TraceFilter,
	FilterCondition
} from './types';

import type { ExportFormat } from './types';

describe('types module', () => {
	describe('re-exports', () => {
		it('should export TraceLevel', () => {
			expect(TraceLevel).toBeDefined();
		});

		it('should export ExecutionMode', () => {
			expect(ExecutionMode).toBeDefined();
		});

		it('should export OperationType', () => {
			expect(OperationType).toBeDefined();
		});

		it('should export Duration', () => {
			expect(Duration).toBeDefined();
		});

		it('should export TraceStatus', () => {
			expect(TraceStatus).toBeDefined();
		});

		it('should export CorrelationId', () => {
			expect(CorrelationId).toBeDefined();
		});

		it('should export PipelineStage', () => {
			expect(PipelineStage).toBeDefined();
		});

		it('should export FilterField', () => {
			expect(FilterField).toBeDefined();
		});

		it('should export FilterOperator', () => {
			expect(FilterOperator).toBeDefined();
		});

		it('should export DateTimeFilter', () => {
			expect(DateTimeFilter).toBeDefined();
		});

		it('should export ValidationError', () => {
			expect(ValidationError).toBeDefined();
		});

		it('should export PluginTrace', () => {
			expect(PluginTrace).toBeDefined();
		});

		it('should export TraceFilter', () => {
			expect(TraceFilter).toBeDefined();
		});

		it('should export FilterCondition', () => {
			expect(FilterCondition).toBeDefined();
		});

		it('should export ExportFormat type', () => {
			// Type-only export - verify it compiles
			const format: ExportFormat = 'json';
			expect(format).toBe('json');
		});
	});
});
