import { FilterField } from './FilterField';

describe('FilterField', () => {
	// ===== CORE FIELDS TESTS =====
	describe('Core Fields', () => {
		test.each([
			[FilterField.Id, 'Trace ID', 'plugintracelogid', 'guid'],
			[FilterField.CreatedOn, 'Created On', 'createdon', 'date'],
			[FilterField.PluginName, 'Plugin Name', 'typename', 'text'],
			[FilterField.EntityName, 'Entity Name', 'primaryentity', 'text'],
			[FilterField.MessageName, 'Message Name', 'messagename', 'text'],
			[FilterField.OperationType, 'Operation Type', 'operationtype', 'enum'],
			[FilterField.Mode, 'Mode', 'mode', 'enum'],
			[FilterField.Stage, 'Stage', 'stage', 'number'],
			[FilterField.Depth, 'Depth', 'depth', 'number']
		])('should have field with correct properties', (field, displayName, odataName, fieldType) => {
			expect(field.displayName).toBe(displayName);
			expect(field.odataName).toBe(odataName);
			expect(field.fieldType).toBe(fieldType);
		});
	});

	// ===== PERFORMANCE FIELDS TESTS =====
	describe('Performance Fields', () => {
		test.each([
			[FilterField.Duration, 'Duration (ms)', 'performanceexecutionduration', 'number'],
			[FilterField.ConstructorDuration, 'Constructor Duration (ms)', 'performanceconstructorduration', 'number'],
			[FilterField.ExecutionStartTime, 'Execution Start Time', 'performanceexecutionstarttime', 'date'],
			[FilterField.ConstructorStartTime, 'Constructor Start Time', 'performanceconstructorstarttime', 'date']
		])('should have field with correct properties', (field, displayName, odataName, fieldType) => {
			expect(field.displayName).toBe(displayName);
			expect(field.odataName).toBe(odataName);
			expect(field.fieldType).toBe(fieldType);
		});
	});

	// ===== EXECUTION DETAILS TESTS =====
	describe('Execution Details Fields', () => {
		test.each([
			[FilterField.ExceptionDetails, 'Exception Details', 'exceptiondetails', 'text'],
			[FilterField.MessageBlock, 'Message Block', 'messageblock', 'text'],
			[FilterField.Configuration, 'Configuration', 'configuration', 'text'],
			[FilterField.SecureConfiguration, 'Secure Configuration', 'secureconfiguration', 'text'],
			[FilterField.Profile, 'Profile', 'profile', 'text']
		])('should have field with correct properties', (field, displayName, odataName, fieldType) => {
			expect(field.displayName).toBe(displayName);
			expect(field.odataName).toBe(odataName);
			expect(field.fieldType).toBe(fieldType);
		});
	});

	// ===== CORRELATION & TRACKING TESTS =====
	describe('Correlation & Tracking Fields', () => {
		test.each([
			[FilterField.CorrelationId, 'Correlation ID', 'correlationid', 'guid'],
			[FilterField.RequestId, 'Request ID', 'requestid', 'guid'],
			[FilterField.PluginStepId, 'Plugin Step ID', 'pluginstepid', 'guid'],
			[FilterField.PersistenceKey, 'Persistence Key', 'persistencekey', 'text'],
			[FilterField.OrganizationId, 'Organization ID', 'organizationid', 'guid']
		])('should have field with correct properties', (field, displayName, odataName, fieldType) => {
			expect(field.displayName).toBe(displayName);
			expect(field.odataName).toBe(odataName);
			expect(field.fieldType).toBe(fieldType);
		});
	});

	// ===== AUDIT FIELDS TESTS =====
	describe('Audit Fields', () => {
		test.each([
			[FilterField.IsSystemCreated, 'System Created', 'issystemcreated', 'boolean'],
			[FilterField.CreatedBy, 'Created By', '_createdby_value', 'guid'],
			[FilterField.CreatedOnBehalfBy, 'Created On Behalf By', '_createdonbehalfby_value', 'guid']
		])('should have field with correct properties', (field, displayName, odataName, fieldType) => {
			expect(field.displayName).toBe(displayName);
			expect(field.odataName).toBe(odataName);
			expect(field.fieldType).toBe(fieldType);
		});
	});

	// ===== FIELD TYPE TESTS =====
	describe('Field Type Validation', () => {
		test('should have all text fields with correct type', () => {
			// Arrange & Act
			const textFields = [
				FilterField.PluginName,
				FilterField.EntityName,
				FilterField.MessageName,
				FilterField.ExceptionDetails,
				FilterField.MessageBlock,
				FilterField.Configuration,
				FilterField.SecureConfiguration,
				FilterField.Profile,
				FilterField.PersistenceKey
			];

			// Assert
			textFields.forEach(field => {
				expect(field.fieldType).toBe('text');
			});
		});

		test('should have all date fields with correct type', () => {
			// Arrange & Act
			const dateFields = [
				FilterField.CreatedOn,
				FilterField.ExecutionStartTime,
				FilterField.ConstructorStartTime
			];

			// Assert
			dateFields.forEach(field => {
				expect(field.fieldType).toBe('date');
			});
		});

		test('should have all number fields with correct type', () => {
			// Arrange & Act
			const numberFields = [
				FilterField.Stage,
				FilterField.Depth,
				FilterField.Duration,
				FilterField.ConstructorDuration
			];

			// Assert
			numberFields.forEach(field => {
				expect(field.fieldType).toBe('number');
			});
		});

		test('should have all guid fields with correct type', () => {
			// Arrange & Act
			const guidFields = [
				FilterField.Id,
				FilterField.CorrelationId,
				FilterField.RequestId,
				FilterField.PluginStepId,
				FilterField.OrganizationId,
				FilterField.CreatedBy,
				FilterField.CreatedOnBehalfBy
			];

			// Assert
			guidFields.forEach(field => {
				expect(field.fieldType).toBe('guid');
			});
		});

		test('should have all enum fields with correct type', () => {
			// Arrange & Act
			const enumFields = [
				FilterField.OperationType,
				FilterField.Mode
			];

			// Assert
			enumFields.forEach(field => {
				expect(field.fieldType).toBe('enum');
			});
		});

		test('should have boolean field with correct type', () => {
			// Arrange & Act
			const booleanField = FilterField.IsSystemCreated;

			// Assert
			expect(booleanField.fieldType).toBe('boolean');
		});
	});

	// ===== ALL FIELDS COLLECTION TESTS =====
	describe('All Fields Collection', () => {
		test('should contain exactly 26 fields', () => {
			// Arrange & Act
			const allFields = FilterField.All;

			// Assert
			expect(allFields).toHaveLength(26);
		});

		test('should contain all core fields', () => {
			// Arrange & Act
			const coreFields = [
				FilterField.Id,
				FilterField.CreatedOn,
				FilterField.PluginName,
				FilterField.EntityName,
				FilterField.MessageName,
				FilterField.OperationType,
				FilterField.Mode,
				FilterField.Stage,
				FilterField.Depth
			];

			// Assert
			coreFields.forEach(field => {
				expect(FilterField.All).toContain(field);
			});
		});

		test('should contain all performance fields', () => {
			// Arrange & Act
			const performanceFields = [
				FilterField.Duration,
				FilterField.ConstructorDuration,
				FilterField.ExecutionStartTime,
				FilterField.ConstructorStartTime
			];

			// Assert
			performanceFields.forEach(field => {
				expect(FilterField.All).toContain(field);
			});
		});

		test('should contain all execution detail fields', () => {
			// Arrange & Act
			const executionFields = [
				FilterField.ExceptionDetails,
				FilterField.MessageBlock,
				FilterField.Configuration,
				FilterField.SecureConfiguration,
				FilterField.Profile
			];

			// Assert
			executionFields.forEach(field => {
				expect(FilterField.All).toContain(field);
			});
		});

		test('should contain all correlation and tracking fields', () => {
			// Arrange & Act
			const correlationFields = [
				FilterField.CorrelationId,
				FilterField.RequestId,
				FilterField.PluginStepId,
				FilterField.PersistenceKey,
				FilterField.OrganizationId
			];

			// Assert
			correlationFields.forEach(field => {
				expect(FilterField.All).toContain(field);
			});
		});

		test('should contain all audit fields', () => {
			// Arrange & Act
			const auditFields = [
				FilterField.IsSystemCreated,
				FilterField.CreatedBy,
				FilterField.CreatedOnBehalfBy
			];

			// Assert
			auditFields.forEach(field => {
				expect(FilterField.All).toContain(field);
			});
		});
	});

	// ===== LOOKUP METHODS TESTS =====
	describe('fromODataName', () => {
		test.each([
			['plugintracelogid', FilterField.Id],
			['performanceexecutionduration', FilterField.Duration],
			['correlationid', FilterField.CorrelationId],
			['_createdby_value', FilterField.CreatedBy]
		])('should find field by odata name "%s"', (odataName, expectedField) => {
			const field = FilterField.fromODataName(odataName);
			expect(field).toBe(expectedField);
		});

		test.each([
			['nonexistent', undefined],
			['', undefined],
			['PluginTraceLogId', undefined]
		])('should return undefined for invalid odata name "%s"', (odataName, expected) => {
			const field = FilterField.fromODataName(odataName);
			expect(field).toBe(expected);
		});
	});

	describe('fromDisplayName', () => {
		test.each([
			['Trace ID', FilterField.Id],
			['Duration (ms)', FilterField.Duration],
			['Correlation ID', FilterField.CorrelationId],
			['Created By', FilterField.CreatedBy]
		])('should find field by display name "%s"', (displayName, expectedField) => {
			const field = FilterField.fromDisplayName(displayName);
			expect(field).toBe(expectedField);
		});

		test.each([
			['Nonexistent Field', undefined],
			['', undefined],
			['trace id', undefined]
		])('should return undefined for invalid display name "%s"', (displayName, expected) => {
			const field = FilterField.fromDisplayName(displayName);
			expect(field).toBe(expected);
		});
	});

	// ===== EQUALITY TESTS =====
	describe('equals', () => {
		test('should return true when comparing same field instance', () => {
			// Arrange
			const field1 = FilterField.Id;
			const field2 = FilterField.Id;

			// Act
			const result = field1.equals(field2);

			// Assert
			expect(result).toBe(true);
		});

		test('should return true when comparing fields with same odata name', () => {
			// Arrange
			const field1 = FilterField.Duration;
			const field2 = FilterField.fromODataName('performanceexecutionduration');

			// Act
			const result = field1.equals(field2!);

			// Assert
			expect(result).toBe(true);
		});

		test('should return false when comparing different fields', () => {
			// Arrange
			const field1 = FilterField.Id;
			const field2 = FilterField.CreatedOn;

			// Act
			const result = field1.equals(field2);

			// Assert
			expect(result).toBe(false);
		});

		test('should return false when comparing with null', () => {
			// Arrange
			const field = FilterField.Id;

			// Act
			const result = field.equals(null);

			// Assert
			expect(result).toBe(false);
		});

		test('should return true for all guid fields compared with themselves', () => {
			// Arrange & Act
			const guidFields = [
				FilterField.Id,
				FilterField.CorrelationId,
				FilterField.RequestId,
				FilterField.PluginStepId,
				FilterField.OrganizationId,
				FilterField.CreatedBy,
				FilterField.CreatedOnBehalfBy
			];

			// Assert
			guidFields.forEach(field => {
				expect(field.equals(field)).toBe(true);
			});
		});

		test('should distinguish between different guid fields', () => {
			// Arrange
			const field1 = FilterField.CorrelationId;
			const field2 = FilterField.RequestId;

			// Act
			const result = field1.equals(field2);

			// Assert
			expect(result).toBe(false);
		});
	});

	// ===== VALUE OBJECT SEMANTICS TESTS =====
	describe('Value Object Semantics', () => {
		test('should be a value object with no mutable state', () => {
			// Arrange
			const field = FilterField.Id;

			// Act & Assert - Can access all properties
			expect(field.displayName).toBeDefined();
			expect(field.odataName).toBeDefined();
			expect(field.fieldType).toBeDefined();
		});

		test('should be same instance for same static field', () => {
			// Arrange & Act
			const field1 = FilterField.Id;
			const field2 = FilterField.Id;

			// Assert
			expect(field1).toBe(field2);
		});

		test('should have consistent string representation across calls', () => {
			// Arrange & Act
			const field1 = FilterField.Id;
			const field2 = FilterField.Id;

			// Assert
			expect(`${field1.displayName}:${field1.odataName}`).toBe(`${field2.displayName}:${field2.odataName}`);
		});
	});

	// ===== EDGE CASES TESTS =====
	describe('Edge Cases', () => {
		test.each([
			['odata', ' plugintracelogid', FilterField.fromODataName],
			['display', ' Trace ID', FilterField.fromDisplayName]
		])('should handle lookup with whitespace in %s name', (type, name, lookupFn) => {
			const field = lookupFn(name);
			expect(field).toBeUndefined();
		});

		test.each([
			['odata', 'plugintracelogid', FilterField.fromODataName],
			['display', 'Trace ID', FilterField.fromDisplayName]
		])('should maintain consistent field references across %s name calls', (type, name, lookupFn) => {
			const field1 = lookupFn(name);
			const field2 = lookupFn(name);
			expect(field1).toBe(field2);
		});

		test.each([
			['fields', (f: typeof FilterField.Id) => f.odataName],
			['display names', (f: typeof FilterField.Id) => f.displayName]
		])('All collection should not have duplicate %s', (description, mapper) => {
			const allFields = FilterField.All;
			const uniqueValues = new Set(allFields.map(mapper));
			expect(uniqueValues.size).toBe(allFields.length);
		});
	});
});
