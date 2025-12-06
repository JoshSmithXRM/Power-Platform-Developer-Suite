import * as vscode from 'vscode';

/**
 * JSON format for .ppdsnb notebook files.
 */
interface NotebookData {
	metadata: NotebookMetadata;
	cells: NotebookCellData[];
}

interface NotebookMetadata {
	environmentId?: string | undefined;
	environmentName?: string | undefined;
	environmentUrl?: string | undefined;
}

interface NotebookCellData {
	kind: 'sql' | 'markdown';
	source: string;
}

/**
 * Serializer for .ppdsnb (Power Platform Developer Suite Notebook) files.
 *
 * Handles reading and writing notebook data in a custom JSON format.
 * Stores environment selection in notebook metadata for persistence.
 */
export class DataverseSqlNotebookSerializer implements vscode.NotebookSerializer {
	/**
	 * Deserializes notebook content from file.
	 *
	 * @param content - Raw file content as Uint8Array
	 * @param _token - Cancellation token
	 * @returns NotebookData with cells and metadata
	 */
	public async deserializeNotebook(
		content: Uint8Array,
		_token: vscode.CancellationToken
	): Promise<vscode.NotebookData> {
		const text = new TextDecoder().decode(content);

		// Handle empty or new files
		if (!text.trim()) {
			return this.createEmptyNotebook();
		}

		try {
			const data = JSON.parse(text) as NotebookData;
			return this.parseNotebookData(data);
		} catch {
			// If parsing fails, treat as a new notebook
			return this.createEmptyNotebook();
		}
	}

	/**
	 * Serializes notebook data to file.
	 *
	 * @param data - NotebookData to serialize
	 * @param _token - Cancellation token
	 * @returns Uint8Array of JSON content
	 */
	public async serializeNotebook(
		data: vscode.NotebookData,
		_token: vscode.CancellationToken
	): Promise<Uint8Array> {
		const notebookData: NotebookData = {
			metadata: this.extractMetadata(data),
			cells: data.cells.map((cell) => this.serializeCell(cell)),
		};

		const json = JSON.stringify(notebookData, null, 2);
		return new TextEncoder().encode(json);
	}

	/**
	 * Creates an empty notebook with a single SQL cell.
	 */
	private createEmptyNotebook(): vscode.NotebookData {
		const cell = new vscode.NotebookCellData(
			vscode.NotebookCellKind.Code,
			'-- Write your SQL query here\nSELECT TOP 10 * FROM account',
			'sql'
		);

		const notebookData = new vscode.NotebookData([cell]);
		notebookData.metadata = {
			environmentId: undefined,
			environmentName: undefined,
		};

		return notebookData;
	}

	/**
	 * Parses saved notebook data into VS Code format.
	 */
	private parseNotebookData(data: NotebookData): vscode.NotebookData {
		const cells = data.cells.map((cellData) => {
			const kind =
				cellData.kind === 'markdown'
					? vscode.NotebookCellKind.Markup
					: vscode.NotebookCellKind.Code;

			const language = cellData.kind === 'markdown' ? 'markdown' : 'sql';

			return new vscode.NotebookCellData(kind, cellData.source, language);
		});

		// Ensure at least one cell exists
		if (cells.length === 0) {
			cells.push(
				new vscode.NotebookCellData(
					vscode.NotebookCellKind.Code,
					'-- Write your SQL query here\nSELECT TOP 10 * FROM account',
					'sql'
				)
			);
		}

		const notebookData = new vscode.NotebookData(cells);
		notebookData.metadata = {
			environmentId: data.metadata.environmentId,
			environmentName: data.metadata.environmentName,
			environmentUrl: data.metadata.environmentUrl,
		};

		return notebookData;
	}

	/**
	 * Extracts metadata from NotebookData.
	 */
	private extractMetadata(data: vscode.NotebookData): NotebookMetadata {
		const metadata = data.metadata as NotebookMetadata | undefined;
		return {
			environmentId: metadata?.environmentId,
			environmentName: metadata?.environmentName,
			environmentUrl: metadata?.environmentUrl,
		};
	}

	/**
	 * Serializes a single cell to storage format.
	 */
	private serializeCell(cell: vscode.NotebookCellData): NotebookCellData {
		return {
			kind: cell.kind === vscode.NotebookCellKind.Markup ? 'markdown' : 'sql',
			source: cell.value,
		};
	}
}
