import * as vscode from 'vscode';

// Environment Setup - Clean Architecture imports
import { EnvironmentRepository } from './features/environmentSetup/infrastructure/repositories/EnvironmentRepository';
import { EnvironmentDomainMapper } from './features/environmentSetup/infrastructure/mappers/EnvironmentDomainMapper';
import { EnvironmentValidationService } from './features/environmentSetup/domain/services/EnvironmentValidationService';
import { VsCodeEventPublisher } from './features/environmentSetup/infrastructure/services/VsCodeEventPublisher';
import { LoadEnvironmentsUseCase } from './features/environmentSetup/application/useCases/LoadEnvironmentsUseCase';
import { LoadEnvironmentByIdUseCase } from './features/environmentSetup/application/useCases/LoadEnvironmentByIdUseCase';
import { SaveEnvironmentUseCase } from './features/environmentSetup/application/useCases/SaveEnvironmentUseCase';
import { DeleteEnvironmentUseCase } from './features/environmentSetup/application/useCases/DeleteEnvironmentUseCase';
import { TestConnectionUseCase } from './features/environmentSetup/application/useCases/TestConnectionUseCase';
import { ValidateUniqueNameUseCase } from './features/environmentSetup/application/useCases/ValidateUniqueNameUseCase';
import { CheckConcurrentEditUseCase } from './features/environmentSetup/application/useCases/CheckConcurrentEditUseCase';
import { EnvironmentListViewModelMapper } from './features/environmentSetup/application/mappers/EnvironmentListViewModelMapper';
import { EnvironmentFormViewModelMapper } from './features/environmentSetup/application/mappers/EnvironmentFormViewModelMapper';
import { EnvironmentSetupPanel } from './features/environmentSetup/presentation/panels/EnvironmentSetupPanel';

/**
 * Extension activation entry point
 */
export function activate(context: vscode.ExtensionContext): void {
	// Extension activated

	// ========================================
	// Dependency Injection Setup (Clean Architecture)
	// ========================================

	// Infrastructure Layer
	const environmentDomainMapper = new EnvironmentDomainMapper();
	const environmentRepository = new EnvironmentRepository(
		context.globalState,
		context.secrets,
		environmentDomainMapper
	);
	const eventPublisher = new VsCodeEventPublisher();

	// Domain Layer
	const environmentValidationService = new EnvironmentValidationService(environmentRepository);

	// Application Layer - Mappers
	const listViewModelMapper = new EnvironmentListViewModelMapper();
	const formViewModelMapper = new EnvironmentFormViewModelMapper();

	// Application Layer - Use Cases
	const _loadEnvironmentsUseCase = new LoadEnvironmentsUseCase(environmentRepository, listViewModelMapper);
	const loadEnvironmentByIdUseCase = new LoadEnvironmentByIdUseCase(environmentRepository, formViewModelMapper);
	const saveEnvironmentUseCase = new SaveEnvironmentUseCase(environmentRepository, environmentValidationService, eventPublisher);
	const deleteEnvironmentUseCase = new DeleteEnvironmentUseCase(environmentRepository, eventPublisher);
	const testConnectionUseCase = new TestConnectionUseCase(null); // TODO: Implement WhoAmI service with auth
	const validateUniqueNameUseCase = new ValidateUniqueNameUseCase(environmentRepository);
	const checkConcurrentEditUseCase = new CheckConcurrentEditUseCase();

	// ========================================
	// Register Tree View Providers
	// ========================================

	// Register Tools tree view provider
	const toolsProvider = new ToolsTreeProvider();
	vscode.window.registerTreeDataProvider('power-platform-dev-suite-tools', toolsProvider);

	// Register Environments tree view provider
	const environmentsProvider = new EnvironmentsTreeProvider(context);
	vscode.window.registerTreeDataProvider('power-platform-dev-suite-environments', environmentsProvider);

	// ========================================
	// Register Commands
	// ========================================

	// Add Environment command - Opens EnvironmentSetupPanel
	const addEnvironmentCommand = vscode.commands.registerCommand('power-platform-dev-suite.addEnvironment', () => {
		EnvironmentSetupPanel.createOrShow(
			context.extensionUri,
			loadEnvironmentByIdUseCase,
			saveEnvironmentUseCase,
			deleteEnvironmentUseCase,
			testConnectionUseCase,
			validateUniqueNameUseCase,
			checkConcurrentEditUseCase
		);
	});

	// Edit Environment command
	const editEnvironmentCommand = vscode.commands.registerCommand('power-platform-dev-suite.editEnvironment', async (environmentItem?: { envId: string }) => {
		if (environmentItem) {
			EnvironmentSetupPanel.createOrShow(
				context.extensionUri,
				loadEnvironmentByIdUseCase,
				saveEnvironmentUseCase,
				deleteEnvironmentUseCase,
				testConnectionUseCase,
				validateUniqueNameUseCase,
				checkConcurrentEditUseCase,
				environmentItem.envId
			);
		}
	});

	// Refresh Environments command
	const refreshEnvironmentsCommand = vscode.commands.registerCommand('power-platform-dev-suite.refreshEnvironments', () => {
		environmentsProvider.refresh();
	});

	context.subscriptions.push(addEnvironmentCommand, editEnvironmentCommand, refreshEnvironmentsCommand, eventPublisher);
}

/**
 * Extension deactivation
 */
export function deactivate(): void {
	// Extension deactivated
}

/**
 * Tools tree view provider
 */
class ToolsTreeProvider implements vscode.TreeDataProvider<ToolItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<ToolItem | undefined | null | void> = new vscode.EventEmitter<ToolItem | undefined | null | void>();
	readonly onDidChangeTreeData: vscode.Event<ToolItem | undefined | null | void> = this._onDidChangeTreeData.event;

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: ToolItem): vscode.TreeItem {
		return element;
	}

	getChildren(): ToolItem[] {
		return [
			new ToolItem('Solution Explorer', 'Browse and manage solutions', 'solutionExplorer'),
			new ToolItem('Metadata Browser', 'Explore entity metadata', 'metadataBrowser'),
			new ToolItem('Import Job Viewer', 'Monitor solution imports', 'importJobViewer'),
			new ToolItem('Data Explorer', 'Query and explore data', 'dataExplorer'),
			new ToolItem('Connection References', 'Manage connection references', 'connectionReferences'),
			new ToolItem('Environment Variables', 'Manage environment variables', 'environmentVariables'),
			new ToolItem('Plugin Trace Viewer', 'View plugin execution traces', 'pluginTraceViewer'),
			new ToolItem('Plugin Registration', 'Register and manage plugins', 'pluginRegistration')
		];
	}
}

/**
 * Environments tree view provider
 */
class EnvironmentsTreeProvider implements vscode.TreeDataProvider<EnvironmentItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<EnvironmentItem | undefined | null | void> = new vscode.EventEmitter<EnvironmentItem | undefined | null | void>();
	readonly onDidChangeTreeData: vscode.Event<EnvironmentItem | undefined | null | void> = this._onDidChangeTreeData.event;

	constructor(private context: vscode.ExtensionContext) { }

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: EnvironmentItem): vscode.TreeItem {
		return element;
	}

	getChildren(): EnvironmentItem[] {
		// Load environments from globalState (same storage key as old implementation)
		const environments = this.context.globalState.get<Array<{
			id: string;
			name: string;
			settings: { dataverseUrl: string };
		}>>('power-platform-dev-suite-environments', []);

		if (environments.length === 0) {
			return [
				new EnvironmentItem('No environments configured', 'Click + to add an environment', 'placeholder')
			];
		}

		return environments.map(env =>
			new EnvironmentItem(env.name, env.settings.dataverseUrl, 'environment', env.id)
		);
	}
}

/**
 * Tool item in tree view
 */
class ToolItem extends vscode.TreeItem {
	constructor(
		public readonly label: string,
		public readonly tooltip: string,
		public readonly contextValue: string
	) {
		super(label, vscode.TreeItemCollapsibleState.None);
		this.tooltip = tooltip;
		this.contextValue = contextValue;
		this.iconPath = new vscode.ThemeIcon('tools');
	}
}

/**
 * Environment item in tree view
 */
class EnvironmentItem extends vscode.TreeItem {
	constructor(
		public readonly label: string,
		public readonly description: string,
		public readonly contextValue: string,
		public readonly envId?: string
	) {
		super(label, vscode.TreeItemCollapsibleState.None);
		this.description = description;
		this.tooltip = `${label} - ${description}`;
		this.contextValue = contextValue;
		this.iconPath = new vscode.ThemeIcon('cloud');
	}
}
