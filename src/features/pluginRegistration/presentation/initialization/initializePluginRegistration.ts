import * as vscode from 'vscode';

import type { ILogger } from '../../../../infrastructure/logging/ILogger';

/**
 * Lazy-loads and initializes Plugin Registration panel.
 * Dynamic imports reduce initial extension activation time by deferring feature-specific code until needed.
 */
export async function initializePluginRegistration(
	context: vscode.ExtensionContext,
	getEnvironments: () => Promise<Array<{ id: string; name: string; url: string }>>,
	getEnvironmentById: (
		envId: string
	) => Promise<{
		id: string;
		name: string;
		powerPlatformEnvironmentId: string | undefined;
	} | null>,
	dataverseApiServiceFactory: {
		getAccessToken: (envId: string) => Promise<string>;
		getDataverseUrl: (envId: string) => Promise<string>;
	},
	logger: ILogger,
	initialEnvironmentId?: string
): Promise<void> {
	const { DataverseApiService } = await import(
		'../../../../shared/infrastructure/services/DataverseApiService.js'
	);
	const { MakerUrlBuilder } = await import(
		'../../../../shared/infrastructure/services/MakerUrlBuilder.js'
	);
	const { DataverseApiSolutionRepository } = await import(
		'../../../solutionExplorer/infrastructure/repositories/DataverseApiSolutionRepository.js'
	);

	// Plugin Registration specific imports
	const { DataversePluginPackageRepository } = await import(
		'../../infrastructure/repositories/DataversePluginPackageRepository.js'
	);
	const { DataversePluginAssemblyRepository } = await import(
		'../../infrastructure/repositories/DataversePluginAssemblyRepository.js'
	);
	const { DataversePluginTypeRepository } = await import(
		'../../infrastructure/repositories/DataversePluginTypeRepository.js'
	);
	const { DataversePluginStepRepository } = await import(
		'../../infrastructure/repositories/DataversePluginStepRepository.js'
	);
	const { DataverseStepImageRepository } = await import(
		'../../infrastructure/repositories/DataverseStepImageRepository.js'
	);
	const { DataverseWebHookRepository } = await import(
		'../../infrastructure/repositories/DataverseWebHookRepository.js'
	);
	const { DataverseServiceEndpointRepository } = await import(
		'../../infrastructure/repositories/DataverseServiceEndpointRepository.js'
	);
	const { DataverseDataProviderRepository } = await import(
		'../../infrastructure/repositories/DataverseDataProviderRepository.js'
	);
	const { PluginInspectorService } = await import(
		'../../infrastructure/services/PluginInspectorService.js'
	);
	const { LoadPluginRegistrationTreeUseCase } = await import(
		'../../application/useCases/LoadPluginRegistrationTreeUseCase.js'
	);
	const { EnablePluginStepUseCase } = await import(
		'../../application/useCases/EnablePluginStepUseCase.js'
	);
	const { DisablePluginStepUseCase } = await import(
		'../../application/useCases/DisablePluginStepUseCase.js'
	);
	const { UpdatePluginAssemblyUseCase } = await import(
		'../../application/useCases/UpdatePluginAssemblyUseCase.js'
	);
	const { UpdatePluginPackageUseCase } = await import(
		'../../application/useCases/UpdatePluginPackageUseCase.js'
	);
	const { RegisterPluginPackageUseCase } = await import(
		'../../application/useCases/RegisterPluginPackageUseCase.js'
	);
	const { RegisterPluginAssemblyUseCase } = await import(
		'../../application/useCases/RegisterPluginAssemblyUseCase.js'
	);
	const { UnregisterPluginAssemblyUseCase } = await import(
		'../../application/useCases/UnregisterPluginAssemblyUseCase.js'
	);
	const { UnregisterPluginPackageUseCase } = await import(
		'../../application/useCases/UnregisterPluginPackageUseCase.js'
	);
	const { UnregisterPluginStepUseCase } = await import(
		'../../application/useCases/UnregisterPluginStepUseCase.js'
	);
	const { UnregisterStepImageUseCase } = await import(
		'../../application/useCases/UnregisterStepImageUseCase.js'
	);
	const { RegisterPluginStepUseCase } = await import(
		'../../application/useCases/RegisterPluginStepUseCase.js'
	);
	const { UpdatePluginStepUseCase } = await import(
		'../../application/useCases/UpdatePluginStepUseCase.js'
	);
	const { RegisterStepImageUseCase } = await import(
		'../../application/useCases/RegisterStepImageUseCase.js'
	);
	const { UpdateStepImageUseCase } = await import(
		'../../application/useCases/UpdateStepImageUseCase.js'
	);
	const { LoadSolutionMembershipsUseCase } = await import(
		'../../application/useCases/LoadSolutionMembershipsUseCase.js'
	);
	const { DataverseApiSolutionComponentRepository } = await import(
		'../../../../shared/infrastructure/repositories/DataverseApiSolutionComponentRepository.js'
	);
	const { DataverseAttributePickerRepository } = await import(
		'../../infrastructure/repositories/DataverseAttributePickerRepository.js'
	);
	const { LoadAttributesForPickerUseCase } = await import(
		'../../application/useCases/LoadAttributesForPickerUseCase.js'
	);
	const { RegisterWebHookUseCase } = await import(
		'../../application/useCases/RegisterWebHookUseCase.js'
	);
	const { UpdateWebHookUseCase } = await import(
		'../../application/useCases/UpdateWebHookUseCase.js'
	);
	const { UnregisterWebHookUseCase } = await import(
		'../../application/useCases/UnregisterWebHookUseCase.js'
	);
	const { RegisterServiceEndpointUseCase } = await import(
		'../../application/useCases/RegisterServiceEndpointUseCase.js'
	);
	const { UpdateServiceEndpointUseCase } = await import(
		'../../application/useCases/UpdateServiceEndpointUseCase.js'
	);
	const { UnregisterServiceEndpointUseCase } = await import(
		'../../application/useCases/UnregisterServiceEndpointUseCase.js'
	);
	const { DataverseSdkMessageRepository } = await import(
		'../../infrastructure/repositories/DataverseSdkMessageRepository.js'
	);
	const { DataverseSdkMessageFilterRepository } = await import(
		'../../infrastructure/repositories/DataverseSdkMessageFilterRepository.js'
	);
	const { PluginRegistrationPanelComposed } = await import(
		'../panels/PluginRegistrationPanelComposed.js'
	);

	const { getAccessToken, getDataverseUrl } = dataverseApiServiceFactory;
	const dataverseApiService = new DataverseApiService(getAccessToken, getDataverseUrl, logger);

	const urlBuilder = new MakerUrlBuilder();
	const solutionRepository = new DataverseApiSolutionRepository(dataverseApiService, logger);

	// Create services
	const pluginInspectorService = new PluginInspectorService(context.extensionPath, logger);

	// Create repositories
	const packageRepository = new DataversePluginPackageRepository(dataverseApiService, logger);
	const assemblyRepository = new DataversePluginAssemblyRepository(dataverseApiService, logger);
	const pluginTypeRepository = new DataversePluginTypeRepository(dataverseApiService, logger);
	const stepRepository = new DataversePluginStepRepository(dataverseApiService, logger);
	const imageRepository = new DataverseStepImageRepository(dataverseApiService, logger);
	const webHookRepository = new DataverseWebHookRepository(dataverseApiService, logger);
	const serviceEndpointRepository = new DataverseServiceEndpointRepository(dataverseApiService, logger);
	const dataProviderRepository = new DataverseDataProviderRepository(dataverseApiService, logger);
	const sdkMessageRepository = new DataverseSdkMessageRepository(dataverseApiService, logger);
	const sdkMessageFilterRepository = new DataverseSdkMessageFilterRepository(
		dataverseApiService,
		logger
	);
	const solutionComponentRepository = new DataverseApiSolutionComponentRepository(
		dataverseApiService,
		logger
	);
	const attributePickerRepository = new DataverseAttributePickerRepository(
		dataverseApiService,
		logger
	);

	// Create use cases
	const loadTreeUseCase = new LoadPluginRegistrationTreeUseCase(
		packageRepository,
		assemblyRepository,
		pluginTypeRepository,
		stepRepository,
		imageRepository,
		webHookRepository,
		serviceEndpointRepository,
		dataProviderRepository,
		logger
	);

	const enableStepUseCase = new EnablePluginStepUseCase(stepRepository, logger);
	const disableStepUseCase = new DisablePluginStepUseCase(stepRepository, logger);
	const updateAssemblyUseCase = new UpdatePluginAssemblyUseCase(assemblyRepository, logger);
	const updatePackageUseCase = new UpdatePluginPackageUseCase(packageRepository, logger);
	const registerPackageUseCase = new RegisterPluginPackageUseCase(packageRepository, logger);
	const registerAssemblyUseCase = new RegisterPluginAssemblyUseCase(
		assemblyRepository,
		pluginTypeRepository,
		logger
	);
	const unregisterAssemblyUseCase = new UnregisterPluginAssemblyUseCase(assemblyRepository, logger);
	const unregisterPackageUseCase = new UnregisterPluginPackageUseCase(packageRepository, logger);
	const unregisterStepUseCase = new UnregisterPluginStepUseCase(stepRepository, logger);
	const unregisterImageUseCase = new UnregisterStepImageUseCase(imageRepository, logger);
	const registerStepUseCase = new RegisterPluginStepUseCase(stepRepository, logger);
	const updateStepUseCase = new UpdatePluginStepUseCase(stepRepository, logger);
	const registerImageUseCase = new RegisterStepImageUseCase(imageRepository, logger);
	const updateImageUseCase = new UpdateStepImageUseCase(imageRepository, logger);
	const loadMembershipsUseCase = new LoadSolutionMembershipsUseCase(
		solutionComponentRepository,
		logger
	);
	const loadAttributesForPickerUseCase = new LoadAttributesForPickerUseCase(
		attributePickerRepository,
		logger
	);
	const registerWebHookUseCase = new RegisterWebHookUseCase(webHookRepository, logger);
	const updateWebHookUseCase = new UpdateWebHookUseCase(webHookRepository, logger);
	const unregisterWebHookUseCase = new UnregisterWebHookUseCase(webHookRepository, logger);
	const registerServiceEndpointUseCase = new RegisterServiceEndpointUseCase(
		serviceEndpointRepository,
		logger
	);
	const updateServiceEndpointUseCase = new UpdateServiceEndpointUseCase(
		serviceEndpointRepository,
		logger
	);
	const unregisterServiceEndpointUseCase = new UnregisterServiceEndpointUseCase(
		serviceEndpointRepository,
		logger
	);

	// Bundle use cases and repositories for cleaner panel constructor
	const useCases = {
		loadTree: loadTreeUseCase,
		enableStep: enableStepUseCase,
		disableStep: disableStepUseCase,
		updateAssembly: updateAssemblyUseCase,
		updatePackage: updatePackageUseCase,
		registerPackage: registerPackageUseCase,
		registerAssembly: registerAssemblyUseCase,
		unregisterAssembly: unregisterAssemblyUseCase,
		unregisterPackage: unregisterPackageUseCase,
		unregisterStep: unregisterStepUseCase,
		unregisterImage: unregisterImageUseCase,
		registerStep: registerStepUseCase,
		updateStep: updateStepUseCase,
		registerImage: registerImageUseCase,
		updateImage: updateImageUseCase,
		loadMemberships: loadMembershipsUseCase,
		loadAttributesForPicker: loadAttributesForPickerUseCase,
		registerWebHook: registerWebHookUseCase,
		updateWebHook: updateWebHookUseCase,
		unregisterWebHook: unregisterWebHookUseCase,
		registerServiceEndpoint: registerServiceEndpointUseCase,
		updateServiceEndpoint: updateServiceEndpointUseCase,
		unregisterServiceEndpoint: unregisterServiceEndpointUseCase,
	};

	const repositories = {
		step: stepRepository,
		assembly: assemblyRepository,
		package: packageRepository,
		pluginType: pluginTypeRepository,
		image: imageRepository,
		webHook: webHookRepository,
		serviceEndpoint: serviceEndpointRepository,
		solution: solutionRepository,
		sdkMessage: sdkMessageRepository,
		sdkMessageFilter: sdkMessageFilterRepository,
	};

	const services = {
		pluginInspector: pluginInspectorService,
	};

	await PluginRegistrationPanelComposed.createOrShow(
		context.extensionUri,
		context,
		getEnvironments,
		getEnvironmentById,
		useCases,
		repositories,
		services,
		urlBuilder,
		logger,
		initialEnvironmentId
	);
}
