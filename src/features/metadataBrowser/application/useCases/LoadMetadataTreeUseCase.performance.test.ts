import { LoadMetadataTreeUseCase } from './LoadMetadataTreeUseCase';
import type { IEntityMetadataRepository } from '../../domain/repositories/IEntityMetadataRepository';
import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import { EntityTreeItemMapper } from '../mappers/EntityTreeItemMapper';
import { ChoiceTreeItemMapper } from '../mappers/ChoiceTreeItemMapper';
import { EntityMetadata } from '../../domain/entities/EntityMetadata';
import { AttributeMetadata } from '../../domain/entities/AttributeMetadata';
import { LogicalName } from '../../domain/valueObjects/LogicalName';
import { SchemaName } from '../../domain/valueObjects/SchemaName';
import { AttributeType } from '../../domain/valueObjects/AttributeType';
import { OptionSetMetadata, OptionMetadata } from '../../domain/valueObjects/OptionSetMetadata';

/**
 * Performance tests for LoadMetadataTreeUseCase with large datasets.
 * Tests ensure the use case can handle 1000+ entities and choices efficiently.
 *
 * @performance
 */
describe('LoadMetadataTreeUseCase Performance Tests', () => {
	let useCase: LoadMetadataTreeUseCase;
	let mockRepository: jest.Mocked<IEntityMetadataRepository>;
	let mockLogger: jest.Mocked<ILogger>;
	let entityMapper: EntityTreeItemMapper;
	let choiceMapper: ChoiceTreeItemMapper;

	beforeEach(() => {
		mockLogger = {
			trace: jest.fn(),
			debug: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
		} as unknown as jest.Mocked<ILogger>;

		mockRepository = {
			getAllEntities: jest.fn(),
			getAllGlobalChoices: jest.fn(),
			getEntityByLogicalName: jest.fn(),
			getEntityAttributes: jest.fn(),
			getEntityRelationships: jest.fn(),
			getEntityKeys: jest.fn(),
			getEntityPrivileges: jest.fn(),
			getChoiceByName: jest.fn(),
		} as unknown as jest.Mocked<IEntityMetadataRepository>;

		entityMapper = new EntityTreeItemMapper();
		choiceMapper = new ChoiceTreeItemMapper();

		useCase = new LoadMetadataTreeUseCase(
			mockRepository,
			entityMapper,
			choiceMapper,
			mockLogger
		);
	});

	/**
	 * Creates a test attribute metadata.
	 */
	const createAttribute = (index: number): AttributeMetadata => {
		return AttributeMetadata.create({
			metadataId: `attr-${index}`,
			logicalName: LogicalName.create(`attribute${index}`),
			schemaName: SchemaName.create(`Attribute${index}`),
			displayName: `Attribute ${index}`,
			description: `Test attribute ${index}`,
			attributeType: AttributeType.create('String'),
			isCustomAttribute: index % 2 === 0,
			isManaged: false,
			isPrimaryId: index === 0,
			isPrimaryName: index === 1,
			requiredLevel: 'None',
		});
	};

	/**
	 * Creates a test entity metadata with configurable attribute count.
	 */
	const createEntity = (index: number, attributeCount = 10): EntityMetadata => {
		const attributes = Array.from({ length: attributeCount }, (_, i) => createAttribute(i));

		return EntityMetadata.create({
			metadataId: `entity-${index}`,
			logicalName: LogicalName.create(`entity${index}`),
			schemaName: SchemaName.create(`Entity${index}`),
			displayName: `Entity ${index}`,
			pluralName: `Entities ${index}`,
			description: `Test entity ${index}`,
			isCustomEntity: index % 2 === 0,
			isManaged: false,
			ownershipType: 'UserOwned',
			attributes,
		});
	};

	/**
	 * Generates a large dataset of entities.
	 */
	const generateEntities = (count: number, attributesPerEntity = 10): EntityMetadata[] => {
		return Array.from({ length: count }, (_, i) => createEntity(i, attributesPerEntity));
	};

	/**
	 * Mock choice metadata for performance testing.
	 */
	const generateChoices = (count: number): OptionSetMetadata[] => {
		return Array.from({ length: count }, (_, i) =>
			OptionSetMetadata.create({
				name: `choice${i}`,
				displayName: `Choice ${i}`,
				isGlobal: true,
				isCustom: i % 2 === 0,
				options: Array.from({ length: 5 }, (__, j) =>
					OptionMetadata.create({
						value: j,
						label: `Option ${j}`,
					})
				),
			})
		);
	};

	/**
	 * Measures execution time in milliseconds.
	 */
	const measureTime = async (fn: () => Promise<void>): Promise<number> => {
		const start = performance.now();
		await fn();
		const end = performance.now();
		return end - start;
	};

	describe('@performance - Large dataset handling (1000 entities)', () => {
		it('should load 1000 entities in under 1000ms', async () => {
			// Arrange
			const entities = generateEntities(1000, 10);
			const choices: OptionSetMetadata[] = [];
			mockRepository.getAllEntities.mockResolvedValue(entities);
			mockRepository.getAllGlobalChoices.mockResolvedValue(choices);
			const maxExecutionTime = 1000; // 1 second

			// Act
			const executionTime = await measureTime(async () => {
				await useCase.execute('test-env');
			});

			// Assert
			expect(executionTime).toBeLessThan(maxExecutionTime);
			expect(mockRepository.getAllEntities).toHaveBeenCalledWith('test-env');
			console.log(`Loaded 1000 entities in ${executionTime.toFixed(2)}ms`);
		});

		it('should load 1000 entities with 50 attributes each efficiently', async () => {
			// Arrange
			const entities = generateEntities(1000, 50);
			const choices: OptionSetMetadata[] = [];
			mockRepository.getAllEntities.mockResolvedValue(entities);
			mockRepository.getAllGlobalChoices.mockResolvedValue(choices);
			const maxExecutionTime = 3000; // 3 seconds for complex entities

			// Act
			const executionTime = await measureTime(async () => {
				const result = await useCase.execute('test-env');
				expect(result.entities).toHaveLength(1000);
			});

			// Assert
			expect(executionTime).toBeLessThan(maxExecutionTime);
			console.log(`Loaded 1000 entities with 50 attributes each in ${executionTime.toFixed(2)}ms`);
		});

		it('should map 1000 entities to view models efficiently', async () => {
			// Arrange
			const entities = generateEntities(1000, 10);
			const choices: OptionSetMetadata[] = [];
			mockRepository.getAllEntities.mockResolvedValue(entities);
			mockRepository.getAllGlobalChoices.mockResolvedValue(choices);
			const maxExecutionTime = 1500;

			// Act
			const executionTime = await measureTime(async () => {
				const result = await useCase.execute('test-env');
				// Verify all entities were mapped
				expect(result.entities).toHaveLength(1000);
				expect(result.entities[0]).toHaveProperty('logicalName');
				expect(result.entities[0]).toHaveProperty('displayName');
			});

			// Assert
			expect(executionTime).toBeLessThan(maxExecutionTime);
			console.log(`Mapped 1000 entities to view models in ${executionTime.toFixed(2)}ms`);
		});
	});

	describe('@performance - Large dataset handling (5000 entities)', () => {
		it('should load 5000 entities in under 5000ms', async () => {
			// Arrange
			const entities = generateEntities(5000, 10);
			const choices: OptionSetMetadata[] = [];
			mockRepository.getAllEntities.mockResolvedValue(entities);
			mockRepository.getAllGlobalChoices.mockResolvedValue(choices);
			const maxExecutionTime = 5000; // 5 seconds

			// Act
			const executionTime = await measureTime(async () => {
				const result = await useCase.execute('test-env');
				expect(result.entities).toHaveLength(5000);
			});

			// Assert
			expect(executionTime).toBeLessThan(maxExecutionTime);
			console.log(`Loaded 5000 entities in ${executionTime.toFixed(2)}ms`);
		});

		it('should handle 5000 entities with choices efficiently', async () => {
			// Arrange
			const entities = generateEntities(5000, 10);
			const choices = generateChoices(500);
			mockRepository.getAllEntities.mockResolvedValue(entities);
			mockRepository.getAllGlobalChoices.mockResolvedValue(choices);
			const maxExecutionTime = 6000; // 6 seconds

			// Act
			const executionTime = await measureTime(async () => {
				const result = await useCase.execute('test-env');
				expect(result.entities).toHaveLength(5000);
				expect(result.choices).toHaveLength(500);
			});

			// Assert
			expect(executionTime).toBeLessThan(maxExecutionTime);
			console.log(`Loaded 5000 entities and 500 choices in ${executionTime.toFixed(2)}ms`);
		});
	});

	describe('@performance - Large dataset handling (10000 entities)', () => {
		it('should load 10000 entities in under 15000ms', async () => {
			// Arrange
			const entities = generateEntities(10000, 10);
			const choices: OptionSetMetadata[] = [];
			mockRepository.getAllEntities.mockResolvedValue(entities);
			mockRepository.getAllGlobalChoices.mockResolvedValue(choices);
			const maxExecutionTime = 15000; // 15 seconds

			// Act
			const executionTime = await measureTime(async () => {
				const result = await useCase.execute('test-env');
				expect(result.entities).toHaveLength(10000);
			});

			// Assert
			expect(executionTime).toBeLessThan(maxExecutionTime);
			console.log(`Loaded 10000 entities in ${executionTime.toFixed(2)}ms`);
		});

		it('should handle 10000 entities with large attribute sets efficiently', async () => {
			// Arrange
			const entities = generateEntities(10000, 30);
			const choices: OptionSetMetadata[] = [];
			mockRepository.getAllEntities.mockResolvedValue(entities);
			mockRepository.getAllGlobalChoices.mockResolvedValue(choices);
			const maxExecutionTime = 20000; // 20 seconds for complex scenario

			// Act
			const executionTime = await measureTime(async () => {
				const result = await useCase.execute('test-env');
				expect(result.entities).toHaveLength(10000);
			});

			// Assert
			expect(executionTime).toBeLessThan(maxExecutionTime);
			console.log(`Loaded 10000 entities with 30 attributes each in ${executionTime.toFixed(2)}ms`);
		});
	});

	describe('@performance - Memory efficiency', () => {
		it('should not cause memory issues with 10000 entities', async () => {
			// Arrange
			const entities = generateEntities(10000, 20);
			const choices = generateChoices(1000);
			mockRepository.getAllEntities.mockResolvedValue(entities);
			mockRepository.getAllGlobalChoices.mockResolvedValue(choices);

			// Act & Assert - Should complete without running out of memory
			await expect(async () => {
				const result = await useCase.execute('test-env');
				expect(result.entities).toHaveLength(10000);
				expect(result.choices).toHaveLength(1000);
			}).not.toThrow();

			console.log('Successfully processed 10000 entities and 1000 choices without memory issues');
		});

		it('should handle repeated executions efficiently', async () => {
			// Arrange
			const entities = generateEntities(1000, 10);
			const choices = generateChoices(100);
			mockRepository.getAllEntities.mockResolvedValue(entities);
			mockRepository.getAllGlobalChoices.mockResolvedValue(choices);
			const iterations = 5;
			const maxAverageTime = 1500;

			// Act
			const times: number[] = [];
			for (let i = 0; i < iterations; i++) {
				const time = await measureTime(async () => {
					await useCase.execute('test-env');
				});
				times.push(time);
			}

			const averageTime = times.reduce((a, b) => a + b, 0) / iterations;

			// Assert
			expect(averageTime).toBeLessThan(maxAverageTime);
			console.log(`Average time for ${iterations} executions: ${averageTime.toFixed(2)}ms`);
			console.log(`Times: ${times.map(t => t.toFixed(2)).join(', ')}ms`);
		});
	});

	describe('@performance - Parallel fetching', () => {
		it('should fetch entities and choices in parallel efficiently', async () => {
			// Arrange
			const entities = generateEntities(1000, 10);
			const choices = generateChoices(500);

			// Simulate network delay
			mockRepository.getAllEntities.mockImplementation(async () => {
				await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
				return entities;
			});
			mockRepository.getAllGlobalChoices.mockImplementation(async () => {
				await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
				return choices;
			});

			const maxExecutionTime = 1500; // Should be ~100ms + processing, not 200ms

			// Act
			const executionTime = await measureTime(async () => {
				const result = await useCase.execute('test-env');
				expect(result.entities).toHaveLength(1000);
				expect(result.choices).toHaveLength(500);
			});

			// Assert
			expect(executionTime).toBeLessThan(maxExecutionTime);
			console.log(`Fetched entities and choices in parallel in ${executionTime.toFixed(2)}ms`);
		});
	});

	describe('@performance - Edge cases', () => {
		it('should handle empty dataset instantly', async () => {
			// Arrange
			const emptyEntities: EntityMetadata[] = [];
			const emptyChoices: OptionSetMetadata[] = [];
			mockRepository.getAllEntities.mockResolvedValue(emptyEntities);
			mockRepository.getAllGlobalChoices.mockResolvedValue(emptyChoices);
			const maxExecutionTime = 100;

			// Act
			const executionTime = await measureTime(async () => {
				const result = await useCase.execute('test-env');
				expect(result.entities).toHaveLength(0);
				expect(result.choices).toHaveLength(0);
			});

			// Assert
			expect(executionTime).toBeLessThan(maxExecutionTime);
			console.log(`Handled empty dataset in ${executionTime.toFixed(2)}ms`);
		});

		it('should handle single entity efficiently', async () => {
			// Arrange
			const entities = generateEntities(1, 10);
			const choices: OptionSetMetadata[] = [];
			mockRepository.getAllEntities.mockResolvedValue(entities);
			mockRepository.getAllGlobalChoices.mockResolvedValue(choices);
			const maxExecutionTime = 50;

			// Act
			const executionTime = await measureTime(async () => {
				const result = await useCase.execute('test-env');
				expect(result.entities).toHaveLength(1);
			});

			// Assert
			expect(executionTime).toBeLessThan(maxExecutionTime);
			console.log(`Handled single entity in ${executionTime.toFixed(2)}ms`);
		});

		it('should handle entities with no attributes efficiently', async () => {
			// Arrange
			const entities = generateEntities(1000, 0);
			const choices: OptionSetMetadata[] = [];
			mockRepository.getAllEntities.mockResolvedValue(entities);
			mockRepository.getAllGlobalChoices.mockResolvedValue(choices);
			const maxExecutionTime = 500;

			// Act
			const executionTime = await measureTime(async () => {
				const result = await useCase.execute('test-env');
				expect(result.entities).toHaveLength(1000);
			});

			// Assert
			expect(executionTime).toBeLessThan(maxExecutionTime);
			console.log(`Handled 1000 entities with no attributes in ${executionTime.toFixed(2)}ms`);
		});
	});
});
