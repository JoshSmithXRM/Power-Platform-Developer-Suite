import {
	createMockEnvironmentRepository,
	createMockSolutionRepository,
	createMockPluginTraceRepository,
	createMockSolutionComponentRepository,
	createMockDomainEventPublisher
} from './repositorySetup';
import { TraceFilter } from '../../../features/pluginTraceViewer/domain/entities/TraceFilter';

describe('Repository Setup Factories', () => {
	describe('createMockEnvironmentRepository', () => {
		it('should create a mocked environment repository with all required methods', () => {
			const mockRepository = createMockEnvironmentRepository();

			expect(mockRepository).toBeDefined();
			expect(mockRepository.getAll).toBeDefined();
			expect(typeof mockRepository.getAll).toBe('function');
			expect(mockRepository.getById).toBeDefined();
			expect(typeof mockRepository.getById).toBe('function');
			expect(mockRepository.getByName).toBeDefined();
			expect(typeof mockRepository.getByName).toBe('function');
			expect(mockRepository.getActive).toBeDefined();
			expect(typeof mockRepository.getActive).toBe('function');
			expect(mockRepository.save).toBeDefined();
			expect(typeof mockRepository.save).toBe('function');
			expect(mockRepository.delete).toBeDefined();
			expect(typeof mockRepository.delete).toBe('function');
			expect(mockRepository.isNameUnique).toBeDefined();
			expect(typeof mockRepository.isNameUnique).toBe('function');
			expect(mockRepository.getClientSecret).toBeDefined();
			expect(typeof mockRepository.getClientSecret).toBe('function');
			expect(mockRepository.getPassword).toBeDefined();
			expect(typeof mockRepository.getPassword).toBe('function');
			expect(mockRepository.deleteSecrets).toBeDefined();
			expect(typeof mockRepository.deleteSecrets).toBe('function');
		});

		it('should create jest mock functions that can be configured', async () => {
			const mockRepository = createMockEnvironmentRepository();

			mockRepository.getAll.mockResolvedValue([]);
			await mockRepository.getAll();
			expect(mockRepository.getAll).toHaveBeenCalled();
		});

		it('should create independent mock instances', () => {
			const mock1 = createMockEnvironmentRepository();
			const mock2 = createMockEnvironmentRepository();

			expect(mock1).not.toBe(mock2);
			expect(mock1.getAll).not.toBe(mock2.getAll);
		});
	});

	describe('createMockSolutionRepository', () => {
		it('should create a mocked solution repository with all required methods', () => {
			const mockRepository = createMockSolutionRepository();

			expect(mockRepository).toBeDefined();
			expect(mockRepository.findAll).toBeDefined();
			expect(typeof mockRepository.findAll).toBe('function');
			expect(mockRepository.findAllForDropdown).toBeDefined();
			expect(typeof mockRepository.findAllForDropdown).toBe('function');
		});

		it('should create jest mock functions that can be configured', async () => {
			const mockRepository = createMockSolutionRepository();

			mockRepository.findAll.mockResolvedValue([]);
			await mockRepository.findAll('test-env-id');
			expect(mockRepository.findAll).toHaveBeenCalled();
		});

		it('should create independent mock instances', () => {
			const mock1 = createMockSolutionRepository();
			const mock2 = createMockSolutionRepository();

			expect(mock1).not.toBe(mock2);
			expect(mock1.findAll).not.toBe(mock2.findAll);
		});
	});

	describe('createMockPluginTraceRepository', () => {
		it('should create a mocked plugin trace repository with all required methods', () => {
			const mockRepository = createMockPluginTraceRepository();

			expect(mockRepository).toBeDefined();
			expect(mockRepository.getTraces).toBeDefined();
			expect(typeof mockRepository.getTraces).toBe('function');
			expect(mockRepository.getTraceById).toBeDefined();
			expect(typeof mockRepository.getTraceById).toBe('function');
			expect(mockRepository.deleteTrace).toBeDefined();
			expect(typeof mockRepository.deleteTrace).toBe('function');
			expect(mockRepository.deleteTraces).toBeDefined();
			expect(typeof mockRepository.deleteTraces).toBe('function');
			expect(mockRepository.deleteAllTraces).toBeDefined();
			expect(typeof mockRepository.deleteAllTraces).toBe('function');
			expect(mockRepository.deleteOldTraces).toBeDefined();
			expect(typeof mockRepository.deleteOldTraces).toBe('function');
			expect(mockRepository.getTraceLevel).toBeDefined();
			expect(typeof mockRepository.getTraceLevel).toBe('function');
			expect(mockRepository.setTraceLevel).toBeDefined();
			expect(typeof mockRepository.setTraceLevel).toBe('function');
		});

		it('should create jest mock functions that can be configured', async () => {
			const mockRepository = createMockPluginTraceRepository();
			const filter = TraceFilter.default();

			mockRepository.getTraces.mockResolvedValue([]);
			await mockRepository.getTraces('test-env-id', filter);
			expect(mockRepository.getTraces).toHaveBeenCalled();
		});

		it('should create independent mock instances', () => {
			const mock1 = createMockPluginTraceRepository();
			const mock2 = createMockPluginTraceRepository();

			expect(mock1).not.toBe(mock2);
			expect(mock1.getTraces).not.toBe(mock2.getTraces);
		});
	});

	describe('createMockSolutionComponentRepository', () => {
		it('should create a mocked solution component repository with all required methods', () => {
			const mockRepository = createMockSolutionComponentRepository();

			expect(mockRepository).toBeDefined();
			expect(mockRepository.findComponentIdsBySolution).toBeDefined();
			expect(typeof mockRepository.findComponentIdsBySolution).toBe('function');
			expect(mockRepository.getObjectTypeCode).toBeDefined();
			expect(typeof mockRepository.getObjectTypeCode).toBe('function');
		});

		it('should create jest mock functions that can be configured', async () => {
			const mockRepository = createMockSolutionComponentRepository();

			mockRepository.findComponentIdsBySolution.mockResolvedValue([]);
			await mockRepository.findComponentIdsBySolution('test-env-id', 'test-solution-id', 'environmentvariabledefinition');
			expect(mockRepository.findComponentIdsBySolution).toHaveBeenCalled();
		});

		it('should create independent mock instances', () => {
			const mock1 = createMockSolutionComponentRepository();
			const mock2 = createMockSolutionComponentRepository();

			expect(mock1).not.toBe(mock2);
			expect(mock1.findComponentIdsBySolution).not.toBe(mock2.findComponentIdsBySolution);
		});
	});

	describe('createMockDomainEventPublisher', () => {
		it('should create a mocked domain event publisher with all required methods', () => {
			const mockPublisher = createMockDomainEventPublisher();

			expect(mockPublisher).toBeDefined();
			expect(mockPublisher.publish).toBeDefined();
			expect(typeof mockPublisher.publish).toBe('function');
			expect(mockPublisher.subscribe).toBeDefined();
			expect(typeof mockPublisher.subscribe).toBe('function');
		});

		it('should create jest mock functions that can be configured', () => {
			const mockPublisher = createMockDomainEventPublisher();

			mockPublisher.publish.mockImplementation(() => {});
			mockPublisher.publish({} as never);
			expect(mockPublisher.publish).toHaveBeenCalled();
		});

		it('should create independent mock instances', () => {
			const mock1 = createMockDomainEventPublisher();
			const mock2 = createMockDomainEventPublisher();

			expect(mock1).not.toBe(mock2);
			expect(mock1.publish).not.toBe(mock2.publish);
		});
	});

	describe('All factory functions', () => {
		it('should create distinct object instances for each call', () => {
			const env1 = createMockEnvironmentRepository();
			const env2 = createMockEnvironmentRepository();
			const sol1 = createMockSolutionRepository();
			const sol2 = createMockSolutionRepository();

			expect(env1).not.toBe(env2);
			expect(sol1).not.toBe(sol2);
			expect(env1).not.toBe(sol1);
		});
	});
});
