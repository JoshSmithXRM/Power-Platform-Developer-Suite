import { FilterField } from './FilterField';

describe('FilterField', () => {
	// ===== CORE FIELDS TESTS =====
	describe('Core Fields', () => {
		test('should have Id field with correct properties', () => {
			// Arrange
			const field = FilterField.Id;

			// Act & Assert
			expect(field.displayName).toBe('Trace ID');
			expect(field.odataName).toBe('plugintracelogid');
			expect(field.fieldType).toBe('guid');
		});

		test('should have CreatedOn field with correct properties', () => {
			// Arrange
			const field = FilterField.CreatedOn;

			// Act & Assert
			expect(field.displayName).toBe('Created On');
			expect(field.odataName).toBe('createdon');
			expect(field.fieldType).toBe('date');
		});

		test('should have PluginName field with correct properties', () => {
			// Arrange
			const field = FilterField.PluginName;

			// Act & Assert
			expect(field.displayName).toBe('Plugin Name');
			expect(field.odataName).toBe('typename');
			expect(field.fieldType).toBe('text');
		});

		test('should have EntityName field with correct properties', () => {
			// Arrange
			const field = FilterField.EntityName;

			// Act & Assert
			expect(field.displayName).toBe('Entity Name');
			expect(field.odataName).toBe('primaryentity');
			expect(field.fieldType).toBe('text');
		});

		test('should have MessageName field with correct properties', () => {
			// Arrange
			const field = FilterField.MessageName;

			// Act & Assert
			expect(field.displayName).toBe('Message Name');
			expect(field.odataName).toBe('messagename');
			expect(field.fieldType).toBe('text');
		});

		test('should have OperationType field with correct properties', () => {
			// Arrange
			const field = FilterField.OperationType;

			// Act & Assert
			expect(field.displayName).toBe('Operation Type');
			expect(field.odataName).toBe('operationtype');
			expect(field.fieldType).toBe('enum');
		});

		test('should have Mode field with correct properties', () => {
			// Arrange
			const field = FilterField.Mode;

			// Act & Assert
			expect(field.displayName).toBe('Mode');
			expect(field.odataName).toBe('mode');
			expect(field.fieldType).toBe('enum');
		});

		test('should have Stage field with correct properties', () => {
			// Arrange
			const field = FilterField.Stage;

			// Act & Assert
			expect(field.displayName).toBe('Stage');
			expect(field.odataName).toBe('stage');
			expect(field.fieldType).toBe('number');
		});

		test('should have Depth field with correct properties', () => {
			// Arrange
			const field = FilterField.Depth;

			// Act & Assert
			expect(field.displayName).toBe('Depth');
			expect(field.odataName).toBe('depth');
			expect(field.fieldType).toBe('number');
		});
	});

	// ===== PERFORMANCE FIELDS TESTS =====
	describe('Performance Fields', () => {
		test('should have Duration field with correct properties', () => {
			// Arrange
			const field = FilterField.Duration;

			// Act & Assert
			expect(field.displayName).toBe('Duration (ms)');
			expect(field.odataName).toBe('performanceexecutionduration');
			expect(field.fieldType).toBe('number');
		});

		test('should have ConstructorDuration field with correct properties', () => {
			// Arrange
			const field = FilterField.ConstructorDuration;

			// Act & Assert
			expect(field.displayName).toBe('Constructor Duration (ms)');
			expect(field.odataName).toBe('performanceconstructorduration');
			expect(field.fieldType).toBe('number');
		});

		test('should have ExecutionStartTime field with correct properties', () => {
			// Arrange
			const field = FilterField.ExecutionStartTime;

			// Act & Assert
			expect(field.displayName).toBe('Execution Start Time');
			expect(field.odataName).toBe('performanceexecutionstarttime');
			expect(field.fieldType).toBe('date');
		});

		test('should have ConstructorStartTime field with correct properties', () => {
			// Arrange
			const field = FilterField.ConstructorStartTime;

			// Act & Assert
			expect(field.displayName).toBe('Constructor Start Time');
			expect(field.odataName).toBe('performanceconstructorstarttime');
			expect(field.fieldType).toBe('date');
		});
	});

	// ===== EXECUTION DETAILS TESTS =====
	describe('Execution Details Fields', () => {
		test('should have ExceptionDetails field with correct properties', () => {
			// Arrange
			const field = FilterField.ExceptionDetails;

			// Act & Assert
			expect(field.displayName).toBe('Exception Details');
			expect(field.odataName).toBe('exceptiondetails');
			expect(field.fieldType).toBe('text');
		});

		test('should have MessageBlock field with correct properties', () => {
			// Arrange
			const field = FilterField.MessageBlock;

			// Act & Assert
			expect(field.displayName).toBe('Message Block');
			expect(field.odataName).toBe('messageblock');
			expect(field.fieldType).toBe('text');
		});

		test('should have Configuration field with correct properties', () => {
			// Arrange
			const field = FilterField.Configuration;

			// Act & Assert
			expect(field.displayName).toBe('Configuration');
			expect(field.odataName).toBe('configuration');
			expect(field.fieldType).toBe('text');
		});

		test('should have SecureConfiguration field with correct properties', () => {
			// Arrange
			const field = FilterField.SecureConfiguration;

			// Act & Assert
			expect(field.displayName).toBe('Secure Configuration');
			expect(field.odataName).toBe('secureconfiguration');
			expect(field.fieldType).toBe('text');
		});

		test('should have Profile field with correct properties', () => {
			// Arrange
			const field = FilterField.Profile;

			// Act & Assert
			expect(field.displayName).toBe('Profile');
			expect(field.odataName).toBe('profile');
			expect(field.fieldType).toBe('text');
		});
	});

	// ===== CORRELATION & TRACKING TESTS =====
	describe('Correlation & Tracking Fields', () => {
		test('should have CorrelationId field with correct properties', () => {
			// Arrange
			const field = FilterField.CorrelationId;

			// Act & Assert
			expect(field.displayName).toBe('Correlation ID');
			expect(field.odataName).toBe('correlationid');
			expect(field.fieldType).toBe('guid');
		});

		test('should have RequestId field with correct properties', () => {
			// Arrange
			const field = FilterField.RequestId;

			// Act & Assert
			expect(field.displayName).toBe('Request ID');
			expect(field.odataName).toBe('requestid');
			expect(field.fieldType).toBe('guid');
		});

		test('should have PluginStepId field with correct properties', () => {
			// Arrange
			const field = FilterField.PluginStepId;

			// Act & Assert
			expect(field.displayName).toBe('Plugin Step ID');
			expect(field.odataName).toBe('pluginstepid');
			expect(field.fieldType).toBe('guid');
		});

		test('should have PersistenceKey field with correct properties', () => {
			// Arrange
			const field = FilterField.PersistenceKey;

			// Act & Assert
			expect(field.displayName).toBe('Persistence Key');
			expect(field.odataName).toBe('persistencekey');
			expect(field.fieldType).toBe('text');
		});

		test('should have OrganizationId field with correct properties', () => {
			// Arrange
			const field = FilterField.OrganizationId;

			// Act & Assert
			expect(field.displayName).toBe('Organization ID');
			expect(field.odataName).toBe('organizationid');
			expect(field.fieldType).toBe('guid');
		});
	});

	// ===== AUDIT FIELDS TESTS =====
	describe('Audit Fields', () => {
		test('should have IsSystemCreated field with correct properties', () => {
			// Arrange
			const field = FilterField.IsSystemCreated;

			// Act & Assert
			expect(field.displayName).toBe('System Created');
			expect(field.odataName).toBe('issystemcreated');
			expect(field.fieldType).toBe('boolean');
		});

		test('should have CreatedBy field with correct properties', () => {
			// Arrange
			const field = FilterField.CreatedBy;

			// Act & Assert
			expect(field.displayName).toBe('Created By');
			expect(field.odataName).toBe('_createdby_value');
			expect(field.fieldType).toBe('guid');
		});

		test('should have CreatedOnBehalfBy field with correct properties', () => {
			// Arrange
			const field = FilterField.CreatedOnBehalfBy;

			// Act & Assert
			expect(field.displayName).toBe('Created On Behalf By');
			expect(field.odataName).toBe('_createdonbehalfby_value');
			expect(field.fieldType).toBe('guid');
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
		test('should find field by valid odata name', () => {
			// Arrange & Act
			const field = FilterField.fromODataName('plugintracelogid');

			// Assert
			expect(field).toBe(FilterField.Id);
		});

		test('should find field by performance duration odata name', () => {
			// Arrange & Act
			const field = FilterField.fromODataName('performanceexecutionduration');

			// Assert
			expect(field).toBe(FilterField.Duration);
		});

		test('should find field by guid correlation id odata name', () => {
			// Arrange & Act
			const field = FilterField.fromODataName('correlationid');

			// Assert
			expect(field).toBe(FilterField.CorrelationId);
		});

		test('should find field by audit guid odata name', () => {
			// Arrange & Act
			const field = FilterField.fromODataName('_createdby_value');

			// Assert
			expect(field).toBe(FilterField.CreatedBy);
		});

		test('should return undefined for non-existent odata name', () => {
			// Arrange & Act
			const field = FilterField.fromODataName('nonexistent');

			// Assert
			expect(field).toBeUndefined();
		});

		test('should return undefined for empty odata name', () => {
			// Arrange & Act
			const field = FilterField.fromODataName('');

			// Assert
			expect(field).toBeUndefined();
		});

		test('should be case-sensitive for odata name lookup', () => {
			// Arrange & Act
			const field = FilterField.fromODataName('PluginTraceLogId');

			// Assert
			expect(field).toBeUndefined();
		});
	});

	describe('fromDisplayName', () => {
		test('should find field by valid display name', () => {
			// Arrange & Act
			const field = FilterField.fromDisplayName('Trace ID');

			// Assert
			expect(field).toBe(FilterField.Id);
		});

		test('should find field by performance display name', () => {
			// Arrange & Act
			const field = FilterField.fromDisplayName('Duration (ms)');

			// Assert
			expect(field).toBe(FilterField.Duration);
		});

		test('should find field by guid display name', () => {
			// Arrange & Act
			const field = FilterField.fromDisplayName('Correlation ID');

			// Assert
			expect(field).toBe(FilterField.CorrelationId);
		});

		test('should find field by audit guid display name', () => {
			// Arrange & Act
			const field = FilterField.fromDisplayName('Created By');

			// Assert
			expect(field).toBe(FilterField.CreatedBy);
		});

		test('should return undefined for non-existent display name', () => {
			// Arrange & Act
			const field = FilterField.fromDisplayName('Nonexistent Field');

			// Assert
			expect(field).toBeUndefined();
		});

		test('should return undefined for empty display name', () => {
			// Arrange & Act
			const field = FilterField.fromDisplayName('');

			// Assert
			expect(field).toBeUndefined();
		});

		test('should be case-sensitive for display name lookup', () => {
			// Arrange & Act
			const field = FilterField.fromDisplayName('trace id');

			// Assert
			expect(field).toBeUndefined();
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
		test('should handle lookup with whitespace in odata name', () => {
			// Arrange & Act
			const field = FilterField.fromODataName(' plugintracelogid');

			// Assert
			expect(field).toBeUndefined();
		});

		test('should handle lookup with whitespace in display name', () => {
			// Arrange & Act
			const field = FilterField.fromDisplayName(' Trace ID');

			// Assert
			expect(field).toBeUndefined();
		});

		test('should maintain consistent field references across calls', () => {
			// Arrange & Act
			const field1 = FilterField.fromODataName('plugintracelogid');
			const field2 = FilterField.fromODataName('plugintracelogid');

			// Assert
			expect(field1).toBe(field2);
		});

		test('should maintain consistent display name references across calls', () => {
			// Arrange & Act
			const field1 = FilterField.fromDisplayName('Trace ID');
			const field2 = FilterField.fromDisplayName('Trace ID');

			// Assert
			expect(field1).toBe(field2);
		});

		test('All collection should not have duplicate fields', () => {
			// Arrange & Act
			const allFields = FilterField.All;
			const uniqueODataNames = new Set(allFields.map(f => f.odataName));

			// Assert
			expect(uniqueODataNames.size).toBe(allFields.length);
		});

		test('All collection should not have duplicate display names', () => {
			// Arrange & Act
			const allFields = FilterField.All;
			const uniqueDisplayNames = new Set(allFields.map(f => f.displayName));

			// Assert
			expect(uniqueDisplayNames.size).toBe(allFields.length);
		});
	});
});
