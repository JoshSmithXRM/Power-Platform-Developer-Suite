import * as vscode from 'vscode';

import type { VsCodeEventPublisher } from '../../../environmentSetup/infrastructure/services/VsCodeEventPublisher';
import type { ILogger } from '../../../../infrastructure/logging/ILogger';

/**
 * Lazy-loads and initializes Persistence Inspector (development mode only).
 * Dynamic imports ensure production builds exclude this development-only feature entirely.
 */
export async function initializePersistenceInspector(
	context: vscode.ExtensionContext,
	eventPublisher: VsCodeEventPublisher,
	logger: ILogger
): Promise<void> {
	const { VsCodeStorageReader } = await import('../../infrastructure/repositories/VsCodeStorageReader.js');
	const { VsCodeStorageClearer } = await import('../../infrastructure/repositories/VsCodeStorageClearer.js');
	const { HardcodedProtectedKeyProvider } = await import('../../infrastructure/providers/HardcodedProtectedKeyProvider.js');
	const { StorageInspectionService } = await import('../../domain/services/StorageInspectionService.js');
	const { StorageClearingService } = await import('../../domain/services/StorageClearingService.js');
	const { InspectStorageUseCase } = await import('../../application/useCases/InspectStorageUseCase.js');
	const { RevealSecretUseCase } = await import('../../application/useCases/RevealSecretUseCase.js');
	const { ClearStorageEntryUseCase } = await import('../../application/useCases/ClearStorageEntryUseCase.js');
	const { ClearStoragePropertyUseCase } = await import('../../application/useCases/ClearStoragePropertyUseCase.js');
	const { ClearAllStorageUseCase } = await import('../../application/useCases/ClearAllStorageUseCase.js');
	const { GetClearAllConfirmationMessageUseCase } = await import('../../application/useCases/GetClearAllConfirmationMessageUseCase.js');
	const { PersistenceInspectorPanelComposed } = await import('../panels/PersistenceInspectorPanelComposed.js');

	const storageReader = new VsCodeStorageReader(context.globalState, context.secrets, context.workspaceState);
	const storageClearer = new VsCodeStorageClearer(context.globalState, context.secrets, context.workspaceState);
	const protectedKeyProvider = new HardcodedProtectedKeyProvider();

	const storageInspectionService = new StorageInspectionService(storageReader, protectedKeyProvider);
	const storageClearingService = new StorageClearingService(storageClearer, protectedKeyProvider);
	const inspectStorageUseCase = new InspectStorageUseCase(storageInspectionService, eventPublisher, logger);
	const revealSecretUseCase = new RevealSecretUseCase(storageInspectionService, eventPublisher, logger);
	const clearStorageEntryUseCase = new ClearStorageEntryUseCase(storageClearingService, storageInspectionService, eventPublisher, logger);
	const clearStoragePropertyUseCase = new ClearStoragePropertyUseCase(storageClearingService, storageInspectionService, eventPublisher, logger);
	const clearAllStorageUseCase = new ClearAllStorageUseCase(storageClearingService, storageInspectionService, eventPublisher, logger);
	const getClearAllConfirmationMessageUseCase = new GetClearAllConfirmationMessageUseCase(storageInspectionService, logger);

	const openPersistenceInspectorCommand = vscode.commands.registerCommand('power-platform-dev-suite.openPersistenceInspector', () => {
		PersistenceInspectorPanelComposed.createOrShow(
			context.extensionUri,
			inspectStorageUseCase,
			revealSecretUseCase,
			clearStorageEntryUseCase,
			clearStoragePropertyUseCase,
			clearAllStorageUseCase,
			getClearAllConfirmationMessageUseCase,
			logger
		);
	});

	context.subscriptions.push(openPersistenceInspectorCommand);
}
