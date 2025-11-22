import { EnvironmentValidationService } from '../../features/environmentSetup/domain/services/EnvironmentValidationService';
import { AuthenticationCacheInvalidationService } from '../../features/environmentSetup/domain/services/AuthenticationCacheInvalidationService';
import { EnvironmentListViewModelMapper } from '../../features/environmentSetup/application/mappers/EnvironmentListViewModelMapper';
import { EnvironmentFormViewModelMapper } from '../../features/environmentSetup/application/mappers/EnvironmentFormViewModelMapper';
import { LoadEnvironmentsUseCase } from '../../features/environmentSetup/application/useCases/LoadEnvironmentsUseCase';
import { LoadEnvironmentByIdUseCase } from '../../features/environmentSetup/application/useCases/LoadEnvironmentByIdUseCase';
import { SaveEnvironmentUseCase } from '../../features/environmentSetup/application/useCases/SaveEnvironmentUseCase';
import { DeleteEnvironmentUseCase } from '../../features/environmentSetup/application/useCases/DeleteEnvironmentUseCase';
import { TestConnectionUseCase } from '../../features/environmentSetup/application/useCases/TestConnectionUseCase';
import { TestExistingEnvironmentConnectionUseCase } from '../../features/environmentSetup/application/useCases/TestExistingEnvironmentConnectionUseCase';
import { DiscoverEnvironmentIdUseCase } from '../../features/environmentSetup/application/useCases/DiscoverEnvironmentIdUseCase';
import { ValidateUniqueNameUseCase } from '../../features/environmentSetup/application/useCases/ValidateUniqueNameUseCase';
import { CheckConcurrentEditUseCase } from '../../features/environmentSetup/application/useCases/CheckConcurrentEditUseCase';
import { TestEnvironmentConnectionCommandHandler } from '../../features/environmentSetup/presentation/commands/TestEnvironmentConnectionCommandHandler';

import { CoreServicesContainer } from './CoreServicesContainer';

/**
 * Complete vertical slice for Environment Setup feature.
 * Creates all domain services, mappers, use cases, and command handlers for managing environments.
 *
 * This is the only feature initialized eagerly at activation.
 * Other features are lazy-loaded when first accessed.
 */
export class EnvironmentFeature {
	// Domain Services
	private readonly validationService: EnvironmentValidationService;
	private readonly cacheInvalidationService: AuthenticationCacheInvalidationService;

	// Mappers
	public readonly listViewModelMapper: EnvironmentListViewModelMapper;
	public readonly formViewModelMapper: EnvironmentFormViewModelMapper;

	// Use Cases
	public readonly loadEnvironmentsUseCase: LoadEnvironmentsUseCase;
	public readonly loadEnvironmentByIdUseCase: LoadEnvironmentByIdUseCase;
	public readonly saveEnvironmentUseCase: SaveEnvironmentUseCase;
	public readonly deleteEnvironmentUseCase: DeleteEnvironmentUseCase;
	public readonly testConnectionUseCase: TestConnectionUseCase;
	public readonly testExistingEnvironmentConnectionUseCase: TestExistingEnvironmentConnectionUseCase;
	public readonly discoverEnvironmentIdUseCase: DiscoverEnvironmentIdUseCase;
	public readonly validateUniqueNameUseCase: ValidateUniqueNameUseCase;
	public readonly checkConcurrentEditUseCase: CheckConcurrentEditUseCase;

	// Command Handlers
	public readonly testEnvironmentConnectionCommandHandler: TestEnvironmentConnectionCommandHandler;

	constructor(private readonly container: CoreServicesContainer) {
		// Create domain services (no dependencies)
		this.validationService = new EnvironmentValidationService();
		this.cacheInvalidationService = new AuthenticationCacheInvalidationService();

		// Create mappers (no dependencies)
		this.listViewModelMapper = new EnvironmentListViewModelMapper();
		this.formViewModelMapper = new EnvironmentFormViewModelMapper();

		// Create use cases (depend on repositories, services, mappers, logger)
		this.loadEnvironmentsUseCase = new LoadEnvironmentsUseCase(
			container.environmentRepository,
			this.listViewModelMapper,
			container.logger
		);

		this.loadEnvironmentByIdUseCase = new LoadEnvironmentByIdUseCase(
			container.environmentRepository,
			this.formViewModelMapper,
			container.logger
		);

		this.saveEnvironmentUseCase = new SaveEnvironmentUseCase(
			container.environmentRepository,
			this.validationService,
			container.eventPublisher,
			this.cacheInvalidationService,
			container.logger
		);

		this.deleteEnvironmentUseCase = new DeleteEnvironmentUseCase(
			container.environmentRepository,
			container.eventPublisher,
			container.logger
		);

		this.testConnectionUseCase = new TestConnectionUseCase(
			container.whoAmIService,
			container.environmentRepository,
			container.logger
		);

		this.testExistingEnvironmentConnectionUseCase = new TestExistingEnvironmentConnectionUseCase(
			container.environmentRepository,
			container.whoAmIService,
			container.logger
		);

		this.discoverEnvironmentIdUseCase = new DiscoverEnvironmentIdUseCase(
			container.powerPlatformApiService,
			container.environmentRepository,
			container.logger
		);

		this.validateUniqueNameUseCase = new ValidateUniqueNameUseCase(
			container.environmentRepository,
			container.logger
		);

		this.checkConcurrentEditUseCase = new CheckConcurrentEditUseCase(container.logger);

		// Create command handlers (depend on use cases)
		this.testEnvironmentConnectionCommandHandler = new TestEnvironmentConnectionCommandHandler(
			this.testExistingEnvironmentConnectionUseCase,
			container.logger
		);
	}
}
