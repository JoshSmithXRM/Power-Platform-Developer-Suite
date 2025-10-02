import { AuthenticationService } from './AuthenticationService';
import { ServiceFactory } from './ServiceFactory';

export interface FlowItem {
    id: string;
    name: string;
    solutionId?: string;
    solutionName?: string;
    modifiedon?: string;
    modifiedby?: string;
    ismanaged?: boolean;
}

export interface ConnectionReferenceItem {
    id: string;
    name: string;
    connectorLogicalName?: string;
    referencedConnectionId?: string;
    referencedConnectionName?: string;
    flowIds?: string[];
    modifiedon?: string;
    modifiedby?: string;
    ismanaged?: boolean;
}

export interface ConnectionItem {
    id: string;
    name: string;
    connector?: string;
    environmentId?: string;
}

export interface FlowConnectionRelationship {
    // Unique identifier for the relationship row
    id: string;
    
    // Flow information (null if orphaned connection reference)
    flowId?: string;
    flowName?: string;
    flowModifiedOn?: string;
    flowModifiedBy?: string;
    flowIsManaged?: boolean;
    
    // Connection Reference information (null if flow has no CRs)
    connectionReferenceId?: string;
    connectionReferenceLogicalName?: string;
    connectionReferenceDisplayName?: string;
    connectorType?: string;
    connectionId?: string;
    connectionName?: string;
    crModifiedOn?: string;
    crModifiedBy?: string;
    crIsManaged?: boolean;
    
    // Relationship metadata
    relationshipType: 'flow-to-cr' | 'orphaned-flow' | 'orphaned-cr';
    solutionId?: string;
}

export interface RelationshipResult {
    flows: FlowItem[];
    connectionReferences: ConnectionReferenceItem[];
    connections: ConnectionItem[];  // Kept for backward compatibility but not used
    relationships: FlowConnectionRelationship[];
    // Optional debug information about web API calls
    _debug?: Record<string, any>;
}

export class ConnectionReferencesService {
    private _logger?: ReturnType<ReturnType<typeof ServiceFactory.getLoggerService>['createComponentLogger']>;
    
    private get logger(): ReturnType<ReturnType<typeof ServiceFactory.getLoggerService>['createComponentLogger']> {
        if (!this._logger) {
            this._logger = ServiceFactory.getLoggerService().createComponentLogger('ConnectionReferencesService');
        }
        return this._logger;
    }
    
    constructor(private authService: AuthenticationService) { }

    async aggregateRelationships(environmentId: string, solutionId?: string): Promise<RelationshipResult> {
        const startTime = Date.now();
        this.logger.info('Starting connection references aggregation', { environmentId, solutionId });

        const environments = await this.authService.getEnvironments();
        const environment = environments.find(e => e.id === environmentId);
        if (!environment) {
            this.logger.error('Environment not found', new Error('Environment not found'), { environmentId });
            throw new Error('Environment not found');
        }

        this.logger.debug('Environment found', {
            environmentId,
            environmentName: environment.name,
            dataverseUrl: environment.settings.dataverseUrl
        });

        const token = await this.authService.getAccessToken(environment.id);
        const baseUrl = `${environment.settings.dataverseUrl}/api/data/v9.2`;
        const debug: Record<string, any> = {};
        const timings: Record<string, number> = {};

        // Step 1 & 2: Load flows and connection references in parallel for better performance
        const allFlowsUrl = `${baseUrl}/workflows?$select=workflowid,name,clientdata,modifiedon,ismanaged&$expand=modifiedby($select=fullname)&$filter=category eq 5`;
        const allCRUrl = `${baseUrl}/connectionreferences?$select=connectionreferenceid,connectionreferencelogicalname,connectionreferencedisplayname,connectorid,connectionid,modifiedon,ismanaged&$expand=modifiedby($select=fullname)`;

        debug.allFlowsUrl = allFlowsUrl;
        debug.allCRUrl = allCRUrl;

        this.logger.info('Loading flows and connection references in parallel', {
            environmentId,
            solutionId: solutionId || 'all',
            filteringApplied: !!solutionId && solutionId !== 'test-bypass'
        });

        // Execute API calls in parallel using Promise.all
        const apiStartTime = Date.now();
        const [allFlowsResp, allCRResp] = await Promise.all([
            fetch(allFlowsUrl, { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } }),
            fetch(allCRUrl, { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } })
        ]);
        timings.parallelApiCalls = Date.now() - apiStartTime;

        debug.allFlowsRespOk = !!allFlowsResp && allFlowsResp.ok;
        debug.allFlowsStatus = allFlowsResp?.status;
        debug.allCRRespOk = !!allCRResp && allCRResp.ok;
        debug.allCRStatus = allCRResp?.status;

        // Process flows response
        let allFlowsJson: any = { value: [] };
        if (allFlowsResp && allFlowsResp.ok) {
            allFlowsJson = await allFlowsResp.json();
            this.logger.info('Flows loaded from environment', {
                environmentId,
                flowCount: allFlowsJson.value?.length || 0
            });
        } else {
            this.logger.error('Failed to load flows from environment', new Error('API request failed'), {
                environmentId,
                status: allFlowsResp?.status,
                statusText: allFlowsResp?.statusText
            });
            try {
                const errorJson = await allFlowsResp.json();
                this.logger.debug('API error details', { errorJson });
                debug.allFlowsError = errorJson;
            } catch {
                this.logger.warn('Could not parse API error response');
            }
        }

        // Process connection references response
        let allCRJson: any = { value: [] };
        if (allCRResp && allCRResp.ok) {
            allCRJson = await allCRResp.json();
            this.logger.info('Connection references loaded from environment', {
                environmentId,
                connectionReferencesCount: allCRJson.value?.length || 0
            });
        } else {
            this.logger.error('Failed to load connection references from environment', new Error('API request failed'), {
                environmentId,
                status: allCRResp?.status,
                statusText: allCRResp?.statusText
            });
            try {
                const errorJson = await allCRResp.json();
                this.logger.debug('Connection references API error details', { errorJson });
                debug.allCRError = errorJson;
            } catch {
                this.logger.warn('Could not parse connection references API error response');
            }
        }

        // Transform flows data
        const allFlows = (allFlowsJson.value || []).map((f: any) => ({
            id: f.workflowid,
            name: f.name,
            clientData: f.clientdata || null,
            modifiedon: f.modifiedon || '',
            modifiedby: f.modifiedby?.fullname || '',
            ismanaged: f.ismanaged || false
        }));

        debug.allFlowsCount = allFlows.length;

        // Transform connection references data
        const allConnectionReferences = [] as ConnectionReferenceItem[];
        (allCRJson.value || []).forEach((c: any) => {
            allConnectionReferences.push({
                id: c.connectionreferenceid,
                name: c.connectionreferencelogicalname || c.connectionreferencedisplayname,
                connectorLogicalName: c.connectorid,
                referencedConnectionId: c.connectionid,
                flowIds: [],
                modifiedon: c.modifiedon || '',
                modifiedby: c.modifiedby?.fullname || '',
                ismanaged: c.ismanaged || false
            });
        });

        debug.allCRCount = allConnectionReferences.length;

        // Step 3: If solution filtering is requested, get solution component IDs to filter our cached data
        let solutionFlowIds: Set<string> = new Set();
        let solutionCRIds: Set<string> = new Set();

        if (solutionId && solutionId !== 'test-bypass') {
            const { ServiceFactory } = await import('./ServiceFactory');
            const solutionComponentService = ServiceFactory.getSolutionComponentService();

            // Parallelize solution component queries to reduce wait time
            const solutionComponentStartTime = Date.now();
            const [flowIds, crIds] = await Promise.all([
                solutionComponentService.getCloudFlowIdsInSolution(environmentId, solutionId),
                solutionComponentService.getConnectionReferenceIdsInSolution(environmentId, solutionId)
            ]);
            timings.solutionComponentQueries = Date.now() - solutionComponentStartTime;

            solutionFlowIds = new Set(flowIds);
            solutionCRIds = new Set(crIds);

            debug.solutionFlowIds = flowIds;
            debug.solutionFlowIdsCount = flowIds.length;
            debug.solutionCRIds = crIds;
            debug.solutionCRIdsCount = crIds.length;

            this.logger.info('Solution component IDs retrieved in parallel', {
                environmentId,
                solutionId,
                flowIdsCount: flowIds.length,
                connectionReferenceIdsCount: crIds.length,
                durationMs: timings.solutionComponentQueries
            });
        }

        // Step 4: Filter cached data based on solution membership (or use all if no solution filtering)
        let flows: any[] = [];
        let connectionReferences: ConnectionReferenceItem[] = [];

        if (solutionId && solutionId !== 'test-bypass') {
            this.logger.info('Filtering data by solution membership', {
                environmentId,
                solutionId, 
                totalFlowsCount: allFlows.length,
                totalConnectionReferencesCount: allConnectionReferences.length,
                solutionFlowIdsCount: solutionFlowIds.size,
                solutionCRIdsCount: solutionCRIds.size
            });
            
            // Filter flows by solution membership
            flows = allFlows.filter((flow: any) => solutionFlowIds.has(flow.id));
            this.logger.info('Filtered flows by solution membership', { 
                environmentId, 
                solutionId, 
                filteredFlowsCount: flows.length, 
                totalFlowsCount: allFlows.length 
            });

            // Filter connection references by solution membership
            connectionReferences = allConnectionReferences.filter((cr: ConnectionReferenceItem) => solutionCRIds.has(cr.id));
            this.logger.info('Filtered connection references by solution membership', { 
                environmentId, 
                solutionId, 
                filteredConnectionReferencesCount: connectionReferences.length, 
                totalConnectionReferencesCount: allConnectionReferences.length
            });
        } else {
            this.logger.info('No solution filtering applied - using all data', {
                environmentId,
                solutionId: solutionId || 'none',
                totalFlowsCount: allFlows.length,
                totalConnectionReferencesCount: allConnectionReferences.length
            });
            
            // No solution filtering - use all data
            flows = allFlows;
            connectionReferences = allConnectionReferences;
            this.logger.debug('Using all flows and connection references (no solution filter)', { 
                environmentId, 
                flowsCount: flows.length, 
                connectionReferencesCount: connectionReferences.length 
            });
        }

        debug.filteredFlowsCount = flows.length;
        debug.filteredCRCount = connectionReferences.length;

        // Step 6: Parse flow clientdata to map flows to connection references
        const extractConnectionReferenceNames = (clientData: any): string[] => {
            const names = new Set<string>();

            if (!clientData) return Array.from(names);

            try {
                const parsed = typeof clientData === 'string' ? JSON.parse(clientData) : clientData;
                
                // Look for connectionReferences in properties
                const connRefs = parsed?.properties?.connectionReferences;
                if (connRefs && typeof connRefs === 'object') {
                    Object.keys(connRefs).forEach(key => {
                        const connRef = connRefs[key];
                        const logicalName = connRef?.connection?.connectionReferenceLogicalName;
                        if (logicalName) {
                            names.add(logicalName);
                        }
                    });
                }
            } catch (error) {
                this.logger.trace('Failed to parse flow clientdata', { error });
            }

            return Array.from(names);
        };

        // Map flows to connection references by parsing clientdata
        for (const flow of flows as any[]) {
            const clientData = flow.clientData;
            const crNames = extractConnectionReferenceNames(clientData);
            
            for (const name of crNames) {
                const matched = connectionReferences.find(cr => 
                    cr.name && cr.name.toLowerCase() === name.toLowerCase()
                );

                if (matched) {
                    matched.flowIds = matched.flowIds || [];
                    if (!matched.flowIds.includes(flow.id)) {
                        matched.flowIds.push(flow.id);
                    }
                }
            }
        }

        // Build relationship data structure
        const relationshipBuildStartTime = Date.now();
        const relationships = this.buildFlowConnectionRelationships(flows, connectionReferences);
        timings.relationshipBuilding = Date.now() - relationshipBuildStartTime;
        timings.totalDuration = Date.now() - startTime;

        const result: RelationshipResult = {
            flows,
            connectionReferences,
            connections: [],
            relationships,
            _debug: debug
        };

        this.logger.info('Connection references aggregation completed', {
            environmentId,
            solutionId,
            flowsCount: flows.length,
            connectionReferencesCount: connectionReferences.length,
            relationshipsCount: relationships.length,
            timings: {
                parallelApiCalls: `${timings.parallelApiCalls}ms`,
                solutionComponentQueries: `${timings.solutionComponentQueries || 0}ms`,
                relationshipBuilding: `${timings.relationshipBuilding}ms`,
                totalDuration: `${timings.totalDuration}ms`
            }
        });

        // Only log debug data at trace level for troubleshooting
        this.logger.trace('Connection references aggregation debug details', {
            debug: debug
        });

        return result;
    }

    /**
     * Build relationship data structure from flows and connection references
     */
    private buildFlowConnectionRelationships(
        flows: any[], 
        connectionReferences: ConnectionReferenceItem[]
    ): FlowConnectionRelationship[] {
        const relationships: FlowConnectionRelationship[] = [];

        // Track which flows and CRs we've processed
        const processedFlows = new Set<string>();
        const processedCRs = new Set<string>();

        // 1. Process flows with connection references (normal relationships)
        for (const flow of flows) {
            const linkedCRs = connectionReferences.filter(cr => 
                cr.flowIds && cr.flowIds.includes(flow.id)
            );

            if (linkedCRs.length > 0) {
                // Flow has connection references - create relationships
                for (const cr of linkedCRs) {
                    relationships.push({
                        id: `${flow.id}-${cr.id}`,
                        flowId: flow.id,
                        flowName: flow.name,
                        flowModifiedOn: flow.modifiedon,
                        flowModifiedBy: flow.modifiedby,
                        flowIsManaged: flow.ismanaged,
                        connectionReferenceId: cr.id,
                        connectionReferenceLogicalName: cr.name,
                        connectionReferenceDisplayName: cr.name, // Could be different if we had display name
                        connectorType: cr.connectorLogicalName,
                        connectionId: cr.referencedConnectionId,
                        connectionName: cr.referencedConnectionId,
                        crModifiedOn: cr.modifiedon,
                        crModifiedBy: cr.modifiedby,
                        crIsManaged: cr.ismanaged,
                        relationshipType: 'flow-to-cr',
                        solutionId: flow.solutionId
                    });
                    processedCRs.add(cr.id);
                }
                processedFlows.add(flow.id);
            }
        }

        // 2. Process orphaned flows (flows with no connection references)
        for (const flow of flows) {
            if (!processedFlows.has(flow.id)) {
                relationships.push({
                    id: `orphaned-flow-${flow.id}`,
                    flowId: flow.id,
                    flowName: flow.name,
                    flowModifiedOn: flow.modifiedon,
                    flowModifiedBy: flow.modifiedby,
                    flowIsManaged: flow.ismanaged,
                    relationshipType: 'orphaned-flow',
                    solutionId: flow.solutionId
                });
            }
        }

        // 3. Process orphaned connection references (CRs with no flows)
        for (const cr of connectionReferences) {
            if (!processedCRs.has(cr.id)) {
                relationships.push({
                    id: `orphaned-cr-${cr.id}`,
                    connectionReferenceId: cr.id,
                    connectionReferenceLogicalName: cr.name,
                    connectionReferenceDisplayName: cr.name,
                    connectorType: cr.connectorLogicalName,
                    connectionId: cr.referencedConnectionId,
                    connectionName: cr.referencedConnectionId,
                    crModifiedOn: cr.modifiedon,
                    crModifiedBy: cr.modifiedby,
                    crIsManaged: cr.ismanaged,
                    relationshipType: 'orphaned-cr'
                });
            }
        }

        return relationships;
    }
}
