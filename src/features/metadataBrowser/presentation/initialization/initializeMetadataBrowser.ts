import * as vscode from 'vscode';

import type { IEnvironmentRepository } from '../../../environmentSetup/domain/interfaces/IEnvironmentRepository';
import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { Environment } from '../../../environmentSetup/domain/entities/Environment';

/**
 * Lazy-loads and initializes Metadata Browser panel.
 */
export async function initializeMetadataBrowser(
	context: vscode.ExtensionContext,
	getEnvironments: () => Promise<Array<{ id: string; name: string; url: string }>>,
	dataverseApiServiceFactory: { getAccessToken: (envId: string) => Promise<string>; getDataverseUrl: (envId: string) => Promise<string> },
	environmentRepository: IEnvironmentRepository,
	logger: ILogger,
	initialEnvironmentId?: string
): Promise<void> {
	const { DataverseApiService } = await import('../../../../shared/infrastructure/services/DataverseApiService.js');
	const { DataverseEntityMetadataRepository } = await import('../../infrastructure/repositories/DataverseEntityMetadataRepository.js');
	const { OptionSetMetadataMapper } = await import('../../infrastructure/mappers/OptionSetMetadataMapper.js');
	const { EntityKeyMapper } = await import('../../infrastructure/mappers/EntityKeyMapper.js');
	const { SecurityPrivilegeMapper } = await import('../../infrastructure/mappers/SecurityPrivilegeMapper.js');
	const { RelationshipMetadataMapper } = await import('../../infrastructure/mappers/RelationshipMetadataMapper.js');
	const { AttributeMetadataMapper } = await import('../../infrastructure/mappers/AttributeMetadataMapper.js');
	const { EntityMetadataMapper } = await import('../../infrastructure/mappers/EntityMetadataMapper.js');
	const { LoadMetadataTreeUseCase } = await import('../../application/useCases/LoadMetadataTreeUseCase.js');
	const { LoadEntityMetadataUseCase } = await import('../../application/useCases/LoadEntityMetadataUseCase.js');
	const { LoadChoiceMetadataUseCase } = await import('../../application/useCases/LoadChoiceMetadataUseCase.js');
	const { OpenInMakerUseCase } = await import('../../application/useCases/OpenInMakerUseCase.js');
	const { EntityTreeItemMapper } = await import('../../application/mappers/EntityTreeItemMapper.js');
	const { ChoiceTreeItemMapper } = await import('../../application/mappers/ChoiceTreeItemMapper.js');
	const { AttributeRowMapper } = await import('../../application/mappers/AttributeRowMapper.js');
	const { KeyRowMapper } = await import('../../application/mappers/KeyRowMapper.js');
	const { RelationshipRowMapper } = await import('../../application/mappers/RelationshipRowMapper.js');
	const { PrivilegeRowMapper } = await import('../../application/mappers/PrivilegeRowMapper.js');
	const { ChoiceValueRowMapper } = await import('../../application/mappers/ChoiceValueRowMapper.js');
	const { MetadataBrowserPanel } = await import('../panels/MetadataBrowserPanel.js');
	const { VSCodeBrowserService } = await import('../../../../shared/infrastructure/services/VSCodeBrowserService.js');

	const { getAccessToken, getDataverseUrl } = dataverseApiServiceFactory;
	const dataverseApiService = new DataverseApiService(getAccessToken, getDataverseUrl, logger);

	// Create mapper chain (dependencies flow inward)
	const optionSetMapper = new OptionSetMetadataMapper();
	const entityKeyMapper = new EntityKeyMapper();
	const securityPrivilegeMapper = new SecurityPrivilegeMapper();
	const relationshipMapper = new RelationshipMetadataMapper();
	const attributeMapper = new AttributeMetadataMapper(optionSetMapper);
	const entityMapper = new EntityMetadataMapper(attributeMapper, relationshipMapper, entityKeyMapper, securityPrivilegeMapper);

	const entityMetadataRepository = new DataverseEntityMetadataRepository(dataverseApiService, entityMapper, optionSetMapper, logger);
	const browserService = new VSCodeBrowserService();

	// Create mappers
	const entityTreeItemMapper = new EntityTreeItemMapper();
	const choiceTreeItemMapper = new ChoiceTreeItemMapper();
	const attributeRowMapper = new AttributeRowMapper();
	const keyRowMapper = new KeyRowMapper();
	const relationshipRowMapper = new RelationshipRowMapper();
	const privilegeRowMapper = new PrivilegeRowMapper();
	const choiceValueRowMapper = new ChoiceValueRowMapper();

	// Create use cases
	const loadMetadataTreeUseCase = new LoadMetadataTreeUseCase(
		entityMetadataRepository,
		entityTreeItemMapper,
		choiceTreeItemMapper,
		logger
	);

	const loadEntityMetadataUseCase = new LoadEntityMetadataUseCase(
		entityMetadataRepository,
		entityTreeItemMapper,
		attributeRowMapper,
		keyRowMapper,
		relationshipRowMapper,
		privilegeRowMapper,
		logger
	);

	const loadChoiceMetadataUseCase = new LoadChoiceMetadataUseCase(
		entityMetadataRepository,
		choiceTreeItemMapper,
		choiceValueRowMapper,
		logger
	);

	// Import EnvironmentId for use in callbacks (not in presentation signatures)
	const { EnvironmentId } = await import('../../../environmentSetup/domain/valueObjects/EnvironmentId.js');

	const openInMakerUseCase = new OpenInMakerUseCase(
		async (envId: string) => {
			const environment = await environmentRepository.getById(new EnvironmentId(envId));
			return environment;
		},
		browserService,
		logger
	);

	// Helper function to get environment by ID
	const getEnvironmentById = async (envId: string): Promise<Environment | null> => {
		const environment = await environmentRepository.getById(new EnvironmentId(envId));
		return environment;
	};

	await MetadataBrowserPanel.createOrShow(
		context.extensionUri,
		context,
		getEnvironments,
		getEnvironmentById,
		{
			loadMetadataTreeUseCase,
			loadEntityMetadataUseCase,
			loadChoiceMetadataUseCase,
			openInMakerUseCase
		},
		entityMetadataRepository,
		logger,
		initialEnvironmentId
	);
}
