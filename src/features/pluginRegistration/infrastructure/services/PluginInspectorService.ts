import * as cp from 'child_process';
import * as path from 'path';

import type { ILogger } from '../../../../infrastructure/logging/ILogger';

/**
 * Information about a discovered plugin or workflow activity type.
 */
export interface PluginTypeInfo {
	/** Fully qualified type name (e.g., "PPDSDemo.Plugins.PreAccountCreate") */
	readonly typeName: string;
	/** Short display name (e.g., "PreAccountCreate") */
	readonly displayName: string;
	/** Type classification: "Plugin" or "WorkflowActivity" */
	readonly typeKind: 'Plugin' | 'WorkflowActivity';
}

/**
 * Result of inspecting a plugin assembly.
 */
export interface InspectionResult {
	readonly success: boolean;
	readonly assemblyName: string | null;
	readonly assemblyVersion: string | null;
	readonly types: PluginTypeInfo[];
	readonly error: string | null;
}

/**
 * Service for inspecting .NET plugin assemblies to discover IPlugin and CodeActivity implementations.
 *
 * Uses the bundled PluginInspector .NET tool which leverages Mono.Cecil for metadata-only inspection.
 * This enables cross-framework inspection (a .NET 8 tool can inspect .NET Framework 4.6.2 assemblies).
 */
export class PluginInspectorService {
	private readonly toolPath: string;

	constructor(
		extensionPath: string,
		private readonly logger: ILogger
	) {
		this.toolPath = path.join(extensionPath, 'resources', 'tools', 'PluginInspector.dll');
	}

	/**
	 * Inspect a plugin assembly to discover IPlugin and CodeActivity implementations.
	 *
	 * @param dllPath - Absolute path to the .NET assembly (.dll)
	 * @returns Inspection result with discovered types
	 * @throws Error if .NET runtime is not installed or tool fails
	 */
	public async inspect(dllPath: string): Promise<InspectionResult> {
		this.logger.debug('PluginInspectorService: Inspecting assembly', { dllPath });

		return new Promise((resolve, reject) => {
			const proc = cp.spawn('dotnet', [this.toolPath, dllPath], {
				stdio: ['ignore', 'pipe', 'pipe'],
			});

			let stdout = '';
			let stderr = '';

			proc.stdout.on('data', (data: Buffer) => {
				stdout += data.toString();
			});

			proc.stderr.on('data', (data: Buffer) => {
				stderr += data.toString();
			});

			proc.on('error', (err: NodeJS.ErrnoException) => {
				if (err.code === 'ENOENT') {
					this.logger.error('PluginInspectorService: .NET runtime not found');
					reject(
						new Error(
							'.NET runtime not found. Please install .NET 8.0 or later from https://dotnet.microsoft.com/download'
						)
					);
				} else {
					this.logger.error('PluginInspectorService: Failed to spawn process', err);
					reject(new Error(`Failed to start plugin inspector: ${err.message}`));
				}
			});

			proc.on('close', (code) => {
				this.logger.debug('PluginInspectorService: Process exited', { code, stdout, stderr });

				if (code === 0 || code === 1) {
					// Tool returns exit code 0 for success, 1 for handled errors (both return JSON)
					try {
						const result = JSON.parse(stdout) as InspectionResult;

						if (result.success) {
							this.logger.info('PluginInspectorService: Inspection successful', {
								assemblyName: result.assemblyName,
								typesFound: result.types.length,
							});
						} else {
							this.logger.warn('PluginInspectorService: Inspection failed', {
								error: result.error,
							});
						}

						resolve(result);
					} catch (parseError) {
						this.logger.error('PluginInspectorService: Failed to parse output', {
							stdout,
							parseError,
						});
						reject(new Error(`Failed to parse inspector output: ${stdout}`));
					}
				} else {
					this.logger.error('PluginInspectorService: Unexpected exit code', {
						code,
						stderr,
					});
					reject(new Error(stderr || `Plugin inspector exited with code ${code}`));
				}
			});

			// Set a timeout to prevent hanging
			const timeout = setTimeout(() => {
				proc.kill();
				reject(new Error('Plugin inspector timed out after 30 seconds'));
			}, 30000);

			proc.on('close', () => clearTimeout(timeout));
		});
	}

	/**
	 * Check if the plugin inspector tool is available.
	 *
	 * @returns true if the tool exists, false otherwise
	 */
	public async isAvailable(): Promise<boolean> {
		try {
			const fs = await import('fs');
			await fs.promises.access(this.toolPath, fs.constants.F_OK);
			return true;
		} catch {
			this.logger.warn('PluginInspectorService: Tool not found', { toolPath: this.toolPath });
			return false;
		}
	}
}
