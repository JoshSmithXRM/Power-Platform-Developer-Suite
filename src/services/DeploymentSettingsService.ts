import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { RelationshipResult } from './ConnectionReferencesService';
import { EnvironmentVariableData } from './EnvironmentVariablesService';

export interface DeploymentSettings {
    EnvironmentVariables?: EnvironmentVariable[];
    ConnectionReferences?: ConnectionReference[];
}

export interface EnvironmentVariable {
    SchemaName: string;
    Value: string;
}

export interface ConnectionReference {
    LogicalName: string;
    ConnectionId: string;
    ConnectorId: string;
}

export interface SyncResult {
    added: number;
    removed: number;
    updated: number;
    filePath: string;
}

export class DeploymentSettingsService {
    constructor() {}

    /**
     * Creates deployment settings skeleton from connection references data
     */
    createSkeletonFromRelationships(rel: RelationshipResult): DeploymentSettings {
        const connectionReferences: ConnectionReference[] = rel.connectionReferences.map(cr => ({
            LogicalName: cr.name || '',
            ConnectionId: cr.referencedConnectionId || '',
            ConnectorId: cr.connectorLogicalName || ''
        })).sort((a, b) => 
            (a.LogicalName || '').localeCompare(b.LogicalName || '', undefined, { sensitivity: 'base' })
        );

        return {
            ConnectionReferences: connectionReferences,
            EnvironmentVariables: []
        };
    }

    /**
     * Creates deployment settings from environment variables data
     */
    createSkeletonFromEnvironmentVariables(envVarData: EnvironmentVariableData): DeploymentSettings {
        const environmentVariables: EnvironmentVariable[] = envVarData.definitions.map(def => {
            // Find the corresponding value
            const value = envVarData.values.find(v => v.environmentvariabledefinitionid === def.environmentvariabledefinitionid);
            return {
                SchemaName: def.schemaname || '',
                Value: value?.value || def.defaultvalue || ''
            };
        }).sort((a, b) => 
            (a.SchemaName || '').localeCompare(b.SchemaName || '', undefined, { sensitivity: 'base' })
        );

        return {
            EnvironmentVariables: environmentVariables,
            ConnectionReferences: []
        };
    }

    /**
     * Prompts user to select or create a deployment settings file
     */
    async selectDeploymentSettingsFile(solutionUniqueName?: string): Promise<string | undefined> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage('No workspace folder is open');
            return undefined;
        }

        const options: vscode.OpenDialogOptions = {
            canSelectMany: false,
            openLabel: 'Select Deployment Settings File',
            defaultUri: workspaceFolders[0].uri,
            filters: {
                'JSON Files': ['json']
            }
        };

        // Show dialog with options to create new or select existing
        const action = await vscode.window.showQuickPick([
            { label: 'Create New File', description: `${solutionUniqueName || 'Solution'}.deploymentsettings.json` },
            { label: 'Select Existing File', description: 'Browse for existing deployment settings file' }
        ], {
            placeHolder: 'Choose deployment settings file option'
        });

        if (!action) {
            return undefined;
        }

        if (action.label === 'Create New File') {
            const fileName = solutionUniqueName ? `${solutionUniqueName}.deploymentsettings.json` : 'Solution.deploymentsettings.json';
            const folderUri = await vscode.window.showOpenDialog({
                canSelectMany: false,
                canSelectFiles: false,
                canSelectFolders: true,
                openLabel: 'Select Folder',
                defaultUri: workspaceFolders[0].uri
            });

            if (!folderUri || folderUri.length === 0) {
                return undefined;
            }

            return path.join(folderUri[0].fsPath, fileName);
        } else {
            const fileUri = await vscode.window.showOpenDialog(options);
            if (!fileUri || fileUri.length === 0) {
                return undefined;
            }
            return fileUri[0].fsPath;
        }
    }

    /**
     * Reads existing deployment settings file
     */
    async readDeploymentSettings(filePath: string): Promise<DeploymentSettings> {
        try {
            if (!fs.existsSync(filePath)) {
                return { EnvironmentVariables: [], ConnectionReferences: [] };
            }

            const content = fs.readFileSync(filePath, 'utf-8');
            const settings = JSON.parse(content) as DeploymentSettings;
            
            // Ensure arrays exist
            if (!settings.EnvironmentVariables) {
                settings.EnvironmentVariables = [];
            }
            if (!settings.ConnectionReferences) {
                settings.ConnectionReferences = [];
            }

            return settings;
        } catch (error) {
            throw new Error(`Failed to read deployment settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Writes deployment settings to file
     */
    async writeDeploymentSettings(filePath: string, settings: DeploymentSettings): Promise<void> {
        try {
            const content = JSON.stringify(settings, null, 4);
            fs.writeFileSync(filePath, content, 'utf-8');
        } catch (error) {
            throw new Error(`Failed to write deployment settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Syncs connection references with deployment settings file
     */
    async syncConnectionReferences(
        filePath: string, 
        relationshipData: RelationshipResult,
        isNewFile: boolean = false
    ): Promise<SyncResult> {
        const existingSettings = await this.readDeploymentSettings(filePath);
        const solutionConnectionRefs = relationshipData.connectionReferences || [];
        
        let added = 0, removed = 0, updated = 0;
        
        if (isNewFile) {
            // For new files, create complete entries with all three properties
            existingSettings.ConnectionReferences = solutionConnectionRefs.map(cr => ({
                LogicalName: cr.name || '',
                ConnectionId: cr.referencedConnectionId || '',
                ConnectorId: cr.connectorLogicalName || ''
            }));
            added = solutionConnectionRefs.length;
        } else {
            // For existing files, sync entries
            const existingRefs = existingSettings.ConnectionReferences || [];
            const solutionRefNames = new Set(solutionConnectionRefs.map(cr => cr.name));
            const existingRefNames = new Set(existingRefs.map(cr => cr.LogicalName));

            // Remove connection references not in solution
            const filteredExisting = existingRefs.filter(existing => {
                if (solutionRefNames.has(existing.LogicalName)) {
                    return true;
                } else {
                    removed++;
                    return false;
                }
            });

            // Add new connection references from solution
            const newRefs = solutionConnectionRefs.filter(solutionRef => {
                if (!existingRefNames.has(solutionRef.name)) {
                    added++;
                    return true;
                }
                return false;
            }).map(cr => ({
                LogicalName: cr.name || '',
                ConnectionId: cr.referencedConnectionId || '',
                ConnectorId: cr.connectorLogicalName || ''
            }));

            existingSettings.ConnectionReferences = [...filteredExisting, ...newRefs];
        }

        // Sort connection references by LogicalName for consistent file output
        if (existingSettings.ConnectionReferences) {
            existingSettings.ConnectionReferences.sort((a, b) => 
                (a.LogicalName || '').localeCompare(b.LogicalName || '', undefined, { sensitivity: 'base' })
            );
        }

        await this.writeDeploymentSettings(filePath, existingSettings);
        
        return { added, removed, updated, filePath };
    }

    /**
     * Syncs environment variables with deployment settings file
     */
    async syncEnvironmentVariables(
        filePath: string, 
        envVarData: EnvironmentVariableData,
        isNewFile: boolean = false
    ): Promise<SyncResult> {
        const existingSettings = await this.readDeploymentSettings(filePath);
        const solutionEnvVars = envVarData.definitions || [];
        
        let added = 0, removed = 0, updated = 0;
        
        if (isNewFile) {
            // For new files, create complete entries
            existingSettings.EnvironmentVariables = solutionEnvVars.map(def => {
                const value = envVarData.values.find(v => v.environmentvariabledefinitionid === def.environmentvariabledefinitionid);
                return {
                    SchemaName: def.schemaname || '',
                    Value: value?.value || def.defaultvalue || ''
                };
            });
            added = solutionEnvVars.length;
        } else {
            // For existing files, sync entries
            const existingVars = existingSettings.EnvironmentVariables || [];
            const solutionVarNames = new Set(solutionEnvVars.map(def => def.schemaname));
            const existingVarNames = new Set(existingVars.map(ev => ev.SchemaName));

            // Remove environment variables not in solution
            const filteredExisting = existingVars.filter(existing => {
                if (solutionVarNames.has(existing.SchemaName)) {
                    return true;
                } else {
                    removed++;
                    return false;
                }
            });

            // Add new environment variables from solution
            const newVars = solutionEnvVars.filter(solutionVar => {
                if (!existingVarNames.has(solutionVar.schemaname)) {
                    added++;
                    return true;
                }
                return false;
            }).map(def => {
                const value = envVarData.values.find(v => v.environmentvariabledefinitionid === def.environmentvariabledefinitionid);
                return {
                    SchemaName: def.schemaname || '',
                    Value: value?.value || def.defaultvalue || ''
                };
            });

            existingSettings.EnvironmentVariables = [...filteredExisting, ...newVars];
        }

        // Sort environment variables by SchemaName for consistent file output
        if (existingSettings.EnvironmentVariables) {
            existingSettings.EnvironmentVariables.sort((a, b) => 
                (a.SchemaName || '').localeCompare(b.SchemaName || '', undefined, { sensitivity: 'base' })
            );
        }

        await this.writeDeploymentSettings(filePath, existingSettings);
        
        return { added, removed, updated, filePath };
    }
}
