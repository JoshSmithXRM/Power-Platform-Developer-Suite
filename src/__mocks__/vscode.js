// Mock for vscode module
module.exports = {
	window: {
		showInformationMessage: jest.fn().mockResolvedValue(undefined),
		showWarningMessage: jest.fn().mockResolvedValue(undefined),
		showErrorMessage: jest.fn().mockResolvedValue(undefined),
		createWebviewPanel: jest.fn(),
		createOutputChannel: jest.fn(() => ({
			appendLine: jest.fn(),
			append: jest.fn(),
			clear: jest.fn(),
			show: jest.fn(),
			hide: jest.fn(),
			dispose: jest.fn()
		})),
		showQuickPick: jest.fn(),
		showInputBox: jest.fn(),
		createTreeView: jest.fn(),
		registerTreeDataProvider: jest.fn(),
		createTerminal: jest.fn()
	},
	workspace: {
		getConfiguration: jest.fn(() => ({
			get: jest.fn(),
			update: jest.fn(),
			has: jest.fn(),
			inspect: jest.fn()
		})),
		workspaceFolders: [],
		onDidChangeConfiguration: jest.fn(),
		onDidChangeWorkspaceFolders: jest.fn(),
		onDidSaveTextDocument: jest.fn(),
		asRelativePath: jest.fn((path) => path),
		createFileSystemWatcher: jest.fn(() => ({
			onDidCreate: jest.fn(),
			onDidChange: jest.fn(),
			onDidDelete: jest.fn(),
			dispose: jest.fn()
		}))
	},
	Uri: {
		file: jest.fn((path) => ({ fsPath: path, path, scheme: 'file' })),
		parse: jest.fn((path) => ({ fsPath: path, path, scheme: 'file' }))
	},
	commands: {
		registerCommand: jest.fn(),
		executeCommand: jest.fn()
	},
	ViewColumn: {
		One: 1,
		Two: 2,
		Three: 3
	},
	StatusBarAlignment: {
		Left: 1,
		Right: 2
	},
	ExtensionContext: jest.fn(),
	EventEmitter: jest.fn(() => ({
		event: jest.fn(),
		fire: jest.fn(),
		dispose: jest.fn()
	})),
	CancellationTokenSource: jest.fn(() => ({
		token: { isCancellationRequested: false },
		cancel: jest.fn(),
		dispose: jest.fn()
	})),
	Disposable: class {
		static from(..._args) {
			return { dispose: jest.fn() };
		}
	},
	ConfigurationTarget: {
		Global: 1,
		Workspace: 2,
		WorkspaceFolder: 3
	}
};
