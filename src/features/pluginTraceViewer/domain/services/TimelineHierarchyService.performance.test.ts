import { TimelineHierarchyService } from './TimelineHierarchyService';
import { PluginTrace } from '../entities/PluginTrace';
import { ExecutionMode } from '../valueObjects/ExecutionMode';
import { OperationType } from '../valueObjects/OperationType';
import { Duration } from '../valueObjects/Duration';
import { CorrelationId } from '../valueObjects/CorrelationId';

/**
 * Performance tests for TimelineHierarchyService with large datasets.
 * Tests ensure the service can handle 1000+ items efficiently.
 *
 * @performance
 */
describe('TimelineHierarchyService Performance Tests', () => {
	let service: TimelineHierarchyService;

	beforeEach(() => {
		service = new TimelineHierarchyService();
	});

	/**
	 * Creates a test plugin trace with configurable parameters.
	 */
	const createTrace = (index: number, options?: {
		depth?: number;
		correlationId?: string;
		duration?: number;
		timestamp?: Date;
	}): PluginTrace => {
		const baseTime = options?.timestamp ?? new Date('2024-01-01T10:00:00Z');
		const traceTime = new Date(baseTime.getTime() + (index * 100)); // 100ms apart

		return PluginTrace.create({
			id: `trace-${index}`,
			createdOn: traceTime,
			pluginName: `Plugin${index % 10}`,
			entityName: 'account',
			messageName: 'Create',
			operationType: OperationType.Plugin,
			mode: ExecutionMode.Synchronous,
			duration: Duration.fromMilliseconds(options?.duration ?? 50 + (index % 100)),
			constructorDuration: Duration.fromMilliseconds(10),
			depth: options?.depth ?? (index % 3), // Vary depth for hierarchy
			correlationId: options?.correlationId
				? CorrelationId.create(options.correlationId)
				: CorrelationId.create(`corr-${Math.floor(index / 10)}`),
		});
	};

	/**
	 * Generates a large dataset of plugin traces.
	 */
	const generateTraces = (count: number, options?: {
		maxDepth?: number;
		correlationGroups?: number;
	}): PluginTrace[] => {
		const traces: PluginTrace[] = [];
		const maxDepth = options?.maxDepth ?? 3;
		const correlationGroups = options?.correlationGroups ?? Math.floor(count / 10);

		for (let i = 0; i < count; i++) {
			traces.push(createTrace(i, {
				depth: i % maxDepth,
				correlationId: `corr-${i % correlationGroups}`,
			}));
		}

		return traces;
	};

	/**
	 * Measures execution time in milliseconds.
	 */
	const measureTime = (fn: () => void): number => {
		const start = performance.now();
		fn();
		const end = performance.now();
		return end - start;
	};

	describe('@performance - Large dataset handling (1000 items)', () => {
		it('should build hierarchy for 1000 traces in under 1000ms', () => {
			// Arrange
			const traces = generateTraces(1000);
			const maxExecutionTime = 1000; // 1 second

			// Act
			const executionTime = measureTime(() => {
				service.buildHierarchy(traces);
			});

			// Assert
			expect(executionTime).toBeLessThan(maxExecutionTime);
			console.log(`Built hierarchy for 1000 traces in ${executionTime.toFixed(2)}ms`);
		});

		it('should build hierarchy for 1000 deeply nested traces efficiently', () => {
			// Arrange
			const traces = generateTraces(1000, { maxDepth: 10 });
			const maxExecutionTime = 1500; // Allow more time for deep nesting

			// Act
			const executionTime = measureTime(() => {
				const result = service.buildHierarchy(traces);
				// Verify result is valid
				expect(result.length).toBeGreaterThan(0);
			});

			// Assert
			expect(executionTime).toBeLessThan(maxExecutionTime);
			console.log(`Built deeply nested hierarchy for 1000 traces in ${executionTime.toFixed(2)}ms`);
		});

		it('should count total nodes in 1000-item hierarchy efficiently', () => {
			// Arrange
			const traces = generateTraces(1000);
			const hierarchy = service.buildHierarchy(traces);
			const maxExecutionTime = 100; // Should be very fast

			// Act
			const executionTime = measureTime(() => {
				const count = service.countTotalNodes(hierarchy);
				expect(count).toBe(1000);
			});

			// Assert
			expect(executionTime).toBeLessThan(maxExecutionTime);
			console.log(`Counted 1000 nodes in ${executionTime.toFixed(2)}ms`);
		});
	});

	describe('@performance - Large dataset handling (5000 items)', () => {
		it('should build hierarchy for 5000 traces in under 5000ms', () => {
			// Arrange
			const traces = generateTraces(5000);
			const maxExecutionTime = 5000; // 5 seconds

			// Act
			const executionTime = measureTime(() => {
				service.buildHierarchy(traces);
			});

			// Assert
			expect(executionTime).toBeLessThan(maxExecutionTime);
			console.log(`Built hierarchy for 5000 traces in ${executionTime.toFixed(2)}ms`);
		});

		it('should calculate total duration for 5000 traces efficiently', () => {
			// Arrange
			const traces = generateTraces(5000);
			const maxExecutionTime = 200; // Should be very fast

			// Act
			const executionTime = measureTime(() => {
				const duration = service.getTotalDuration(traces);
				expect(duration).toBeGreaterThan(0);
			});

			// Assert
			expect(executionTime).toBeLessThan(maxExecutionTime);
			console.log(`Calculated total duration for 5000 traces in ${executionTime.toFixed(2)}ms`);
		});
	});

	describe('@performance - Large dataset handling (10000 items)', () => {
		it('should build hierarchy for 10000 traces in under 15000ms', () => {
			// Arrange
			const traces = generateTraces(10000);
			const maxExecutionTime = 15000; // 15 seconds

			// Act
			const executionTime = measureTime(() => {
				const result = service.buildHierarchy(traces);
				// Verify structure is built
				expect(result.length).toBeGreaterThan(0);
			});

			// Assert
			expect(executionTime).toBeLessThan(maxExecutionTime);
			console.log(`Built hierarchy for 10000 traces in ${executionTime.toFixed(2)}ms`);
		});

		it('should handle 10000 traces with many correlation groups efficiently', () => {
			// Arrange
			const traces = generateTraces(10000, { correlationGroups: 1000 });
			const maxExecutionTime = 20000; // 20 seconds for complex grouping

			// Act
			const executionTime = measureTime(() => {
				const result = service.buildHierarchy(traces);
				const nodeCount = service.countTotalNodes(result);
				expect(nodeCount).toBe(10000);
			});

			// Assert
			expect(executionTime).toBeLessThan(maxExecutionTime);
			console.log(`Built hierarchy for 10000 traces with 1000 correlation groups in ${executionTime.toFixed(2)}ms`);
		});
	});

	describe('@performance - Memory efficiency', () => {
		it('should not cause memory issues with 10000 traces', () => {
			// Arrange
			const traces = generateTraces(10000);

			// Act & Assert - Should complete without running out of memory
			expect(() => {
				const result = service.buildHierarchy(traces);
				// Verify we can access nested children
				const hasChildren = result.some(node => node.children.length > 0);
				expect(hasChildren).toBe(true);
			}).not.toThrow();

			console.log('Successfully processed 10000 traces without memory issues');
		});

		it('should handle repeated operations on same dataset efficiently', () => {
			// Arrange
			const traces = generateTraces(5000);
			const iterations = 5;
			const maxAverageTime = 6000; // Average should be reasonable

			// Act
			const times: number[] = [];
			for (let i = 0; i < iterations; i++) {
				const time = measureTime(() => {
					service.buildHierarchy(traces);
				});
				times.push(time);
			}

			const averageTime = times.reduce((a, b) => a + b, 0) / iterations;

			// Assert
			expect(averageTime).toBeLessThan(maxAverageTime);
			console.log(`Average time for ${iterations} iterations with 5000 traces: ${averageTime.toFixed(2)}ms`);
			console.log(`Times: ${times.map(t => t.toFixed(2)).join(', ')}ms`);
		});
	});

	describe('@performance - Rendering performance', () => {
		it('should calculate positioning for 1000-item hierarchy in under 500ms', () => {
			// Arrange
			const traces = generateTraces(1000);
			const maxExecutionTime = 500;

			// Act
			const executionTime = measureTime(() => {
				const result = service.buildHierarchy(traces);
				// Verify positioning was calculated (nodes have position data)
				expect(result.length).toBeGreaterThan(0);
				if (result[0]) {
					expect(result[0].offsetPercent).toBeGreaterThanOrEqual(0);
					expect(result[0].widthPercent).toBeGreaterThan(0);
				}
			});

			// Assert
			expect(executionTime).toBeLessThan(maxExecutionTime);
			console.log(`Calculated positioning for 1000-item hierarchy in ${executionTime.toFixed(2)}ms`);
		});

		it('should handle equal-time traces efficiently (worst case positioning)', () => {
			// Arrange - All traces at same time (worst case for positioning)
			const baseTime = new Date('2024-01-01T10:00:00Z');
			const traces = Array.from({ length: 1000 }, (_, i) =>
				PluginTrace.create({
					id: `trace-${i}`,
					createdOn: baseTime, // All same time
					pluginName: `Plugin${i}`,
					entityName: 'account',
					messageName: 'Create',
					operationType: OperationType.Plugin,
					mode: ExecutionMode.Synchronous,
					duration: Duration.fromMilliseconds(0), // Zero duration
					constructorDuration: Duration.fromMilliseconds(0),
					depth: i % 3,
				})
			);
			const maxExecutionTime = 1000;

			// Act
			const executionTime = measureTime(() => {
				const result = service.buildHierarchy(traces);
				// Should assign equal positioning
				expect(result.length).toBeGreaterThan(0);
			});

			// Assert
			expect(executionTime).toBeLessThan(maxExecutionTime);
			console.log(`Handled equal-time traces (worst case) in ${executionTime.toFixed(2)}ms`);
		});
	});

	describe('@performance - Edge cases', () => {
		it('should handle empty dataset instantly', () => {
			// Arrange
			const traces: PluginTrace[] = [];
			const maxExecutionTime = 10; // Should be near instant

			// Act
			const executionTime = measureTime(() => {
				const result = service.buildHierarchy(traces);
				expect(result).toEqual([]);
			});

			// Assert
			expect(executionTime).toBeLessThan(maxExecutionTime);
			console.log(`Handled empty dataset in ${executionTime.toFixed(2)}ms`);
		});

		it('should handle single-item dataset efficiently', () => {
			// Arrange
			const traces = [createTrace(0)];
			const maxExecutionTime = 10;

			// Act
			const executionTime = measureTime(() => {
				const result = service.buildHierarchy(traces);
				expect(result).toHaveLength(1);
			});

			// Assert
			expect(executionTime).toBeLessThan(maxExecutionTime);
			console.log(`Handled single-item dataset in ${executionTime.toFixed(2)}ms`);
		});

		it('should handle all-root-level traces efficiently', () => {
			// Arrange - All depth 0 (no nesting)
			const traces = Array.from({ length: 1000 }, (_, i) =>
				createTrace(i, { depth: 0 })
			);
			const maxExecutionTime = 500;

			// Act
			const executionTime = measureTime(() => {
				const result = service.buildHierarchy(traces);
				expect(result).toHaveLength(1000); // All roots
			});

			// Assert
			expect(executionTime).toBeLessThan(maxExecutionTime);
			console.log(`Handled 1000 all-root-level traces in ${executionTime.toFixed(2)}ms`);
		});
	});
});
