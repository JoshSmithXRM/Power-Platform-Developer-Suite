import { AuthenticationService } from './AuthenticationService';

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
    constructor(private authService: AuthenticationService) { }

    async aggregateRelationships(environmentId: string, solutionId?: string): Promise<RelationshipResult> {
        const environments = await this.authService.getEnvironments();
        const environment = environments.find(e => e.id === environmentId);
        if (!environment) throw new Error('Environment not found');

        const token = await this.authService.getAccessToken(environment.id);
        const baseUrl = `${environment.settings.dataverseUrl}/api/data/v9.2`;
        const debug: Record<string, any> = {};

        // Step 1: Load ALL flows from the environment (cached approach)
        const allFlowsUrl = `${baseUrl}/workflows?$select=workflowid,name,clientdata,modifiedon,ismanaged&$expand=modifiedby($select=fullname)&$filter=category eq 5`;
        
        debug.allFlowsUrl = allFlowsUrl;
        console.log('ConnectionReferencesService: Loading ALL flows from environment');

        const allFlowsResp = await fetch(allFlowsUrl, { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } });
        debug.allFlowsRespOk = !!allFlowsResp && allFlowsResp.ok;
        debug.allFlowsStatus = allFlowsResp?.status;
        
        let allFlowsJson: any = { value: [] };
        if (allFlowsResp && allFlowsResp.ok) {
            allFlowsJson = await allFlowsResp.json();
            console.log('ConnectionReferencesService: Loaded', allFlowsJson.value?.length || 0, 'total flows from environment');
        } else {
            console.error('ConnectionReferencesService: Failed to load all flows - Status:', allFlowsResp?.status, allFlowsResp?.statusText);
            try { 
                const errorJson = await allFlowsResp.json(); 
                console.error('ConnectionReferencesService: All flows error details:', errorJson);
                debug.allFlowsError = errorJson;
            } catch { 
                console.error('ConnectionReferencesService: Could not parse all flows error response');
            }
        }

        const allFlows = (allFlowsJson.value || []).map((f: any) => ({
            id: f.workflowid, 
            name: f.name, 
            clientData: f.clientdata || null,
            modifiedon: f.modifiedon || '',
            modifiedby: f.modifiedby?.fullname || '',
            ismanaged: f.ismanaged || false
        }));

        debug.allFlowsCount = allFlows.length;

        // Step 2: Load ALL connection references from the environment (cached approach)
        const allCRUrl = `${baseUrl}/connectionreferences?$select=connectionreferenceid,connectionreferencelogicalname,connectionreferencedisplayname,connectorid,connectionid,modifiedon,ismanaged&$expand=modifiedby($select=fullname)`;
        
        debug.allCRUrl = allCRUrl;
        console.log('ConnectionReferencesService: Loading ALL connection references from environment');

        const allCRResp = await fetch(allCRUrl, { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } });
        debug.allCRRespOk = !!allCRResp && allCRResp.ok;
        debug.allCRStatus = allCRResp?.status;
        
        let allCRJson: any = { value: [] };
        if (allCRResp && allCRResp.ok) {
            allCRJson = await allCRResp.json();
            console.log('ConnectionReferencesService: Loaded', allCRJson.value?.length || 0, 'total connection references from environment');
        } else {
            console.error('ConnectionReferencesService: Failed to load all CRs - Status:', allCRResp?.status, allCRResp?.statusText);
            try { 
                const errorJson = await allCRResp.json(); 
                console.error('ConnectionReferencesService: All CRs error details:', errorJson);
                debug.allCRError = errorJson;
            } catch { 
                console.error('ConnectionReferencesService: Could not parse all CRs error response');
            }
        }

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
            
            // Get flow IDs from solution components
            const flowIds = await solutionComponentService.getCloudFlowIdsInSolution(environmentId, solutionId);
            solutionFlowIds = new Set(flowIds);
            debug.solutionFlowIds = flowIds;
            debug.solutionFlowIdsCount = flowIds.length;
            console.log('ConnectionReferencesService: Found', flowIds.length, 'flow IDs in solution');
            
            // Get connection reference IDs from solution components
            const crIds = await solutionComponentService.getConnectionReferenceIdsInSolution(environmentId, solutionId);
            solutionCRIds = new Set(crIds);
            debug.solutionCRIds = crIds;
            debug.solutionCRIdsCount = crIds.length;
            console.log('ConnectionReferencesService: Found', crIds.length, 'connection reference IDs in solution');
        }

        // Step 4: Filter cached data based on solution membership (or use all if no solution filtering)
        let flows: any[] = [];
        let connectionReferences: ConnectionReferenceItem[] = [];

        if (solutionId && solutionId !== 'test-bypass') {
            // Filter flows by solution membership
            flows = allFlows.filter((flow: any) => solutionFlowIds.has(flow.id));
            console.log('ConnectionReferencesService: Filtered to', flows.length, 'flows in solution');

            // Filter connection references by solution membership
            connectionReferences = allConnectionReferences.filter((cr: ConnectionReferenceItem) => solutionCRIds.has(cr.id));
            console.log('ConnectionReferencesService: Filtered to', connectionReferences.length, 'connection references in solution');
            console.log('ConnectionReferencesService: Sample connection references:', connectionReferences.slice(0, 3).map(cr => ({
                id: cr.id,
                name: cr.name,
                referencedConnectionId: cr.referencedConnectionId,
                connectorLogicalName: cr.connectorLogicalName
            })));
        } else {
            // No solution filtering - use all data
            flows = allFlows;
            connectionReferences = allConnectionReferences;
            console.log('ConnectionReferencesService: Using all flows and connection references (no solution filter)');
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
                console.debug('Failed to parse flow clientdata:', error);
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
        const relationships = this.buildFlowConnectionRelationships(flows, connectionReferences);

        const result: RelationshipResult = { 
            flows, 
            connectionReferences, 
            connections: [], 
            relationships, 
            _debug: debug 
        };

        console.log('ConnectionReferencesService: Final result:', {
            flowsCount: flows.length,
            connectionReferencesCount: connectionReferences.length,
            relationshipsCount: relationships.length,
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
