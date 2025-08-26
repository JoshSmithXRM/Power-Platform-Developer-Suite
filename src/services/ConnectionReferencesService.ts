import { AuthenticationService } from './AuthenticationService';

export interface FlowItem {
    id: string;
    name: string;
    solutionId?: string;
    solutionName?: string;
}

export interface ConnectionReferenceItem {
    id: string;
    name: string;
    connectorLogicalName?: string;
    referencedConnectionId?: string;
    referencedConnectionName?: string;
    flowIds?: string[];
}

export interface ConnectionItem {
    id: string;
    name: string;
    connector?: string;
    environmentId?: string;
}

export interface RelationshipResult {
    flows: FlowItem[];
    connectionReferences: ConnectionReferenceItem[];
    connections: ConnectionItem[];
        // Optional debug information about web API calls
        _debug?: Record<string, any>;
}

export class ConnectionReferencesService {
    constructor(private authService: AuthenticationService) { }

    async aggregateRelationships(environmentId: string): Promise<RelationshipResult> {
        // Minimal implementation: query flows and connectionreferences via Web API
        const environments = await this.authService.getEnvironments();
        const environment = environments.find(e => e.id === environmentId);
        if (!environment) throw new Error('Environment not found');

        const token = await this.authService.getAccessToken(environment.id);
        const baseUrl = `${environment.settings.dataverseUrl}/api/data/v9.2`;

        // Get flows (workflows with category 5 for Microsoft Flow)
            // Prepare debug container for HTTP call diagnostics
            const debug: Record<string, any> = {};

            // Get flows (workflows with category 5 for Microsoft Flow)
            const flowsUrl = `${baseUrl}/workflows?$select=workflowid,name,primaryentity,solutionid,clientdata&$filter=category eq 5`;
            const flowsResp = await fetch(flowsUrl, { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } });
            debug.flowsRespOk = !!flowsResp && flowsResp.ok;
            debug.flowsStatus = flowsResp && (flowsResp as any).status;
            let flowsJson: any = { value: [] };
            if (flowsResp && flowsResp.ok) {
                flowsJson = await flowsResp.json();
            } else {
                try { flowsJson = await flowsResp.json(); } catch { /* ignore */ }
            }
            debug.flowsCount = (flowsJson && flowsJson.value && flowsJson.value.length) ? flowsJson.value.length : 0;
            const flows = (flowsJson.value || []).map((f: any) => ({
                id: f.workflowid, 
                name: f.name, 
                solutionId: f._solutionid_value,
                clientData: f.clientdata || null
            } as any));

        // Get connectionreferences
            const crUrl = `${baseUrl}/connectionreferences?$select=connectionreferenceid,connectionreferencelogicalname,connectionreferencedisplayname,connectorid,connectionid`;
            const crResp = await fetch(crUrl, { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } });
            const connectionReferences = [] as ConnectionReferenceItem[];
            debug.crRespOk = !!crResp && crResp.ok;
            debug.crStatus = crResp && (crResp as any).status;
            let crJson: any = { value: [] };
            if (crResp && crResp.ok) {
                crJson = await crResp.json();
                (crJson.value || []).forEach((c: any) => {
                    connectionReferences.push({
                        id: c.connectionreferenceid,
                        name: c.connectionreferencelogicalname || c.connectionreferencedisplayname,
                        connectorLogicalName: c.connectorid,
                        referencedConnectionId: c.connectionid,
                        flowIds: []
                    });
                });
            } else {
                try { crJson = await crResp.json(); } catch { /* ignore */ }
            }
            debug.crCount = (crJson && crJson.value && crJson.value.length) ? crJson.value.length : 0;

        // Get connections (connection entities)
        const connUrl = `${baseUrl}/connections?$select=connectionid,name,connectorid`;
        const connections = [] as ConnectionItem[];
        const connResp = await fetch(connUrl, { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } });
        debug.connRespOk = !!connResp && connResp.ok;
        debug.connStatus = connResp && (connResp as any).status;
        let connJson: any = { value: [] };
        if (connResp && connResp.ok) {
            connJson = await connResp.json();
                (connJson.value || []).forEach((cc: any) => {
                    connections.push({ id: cc.connectionid, name: cc.name, connector: cc.connectorid, environmentId: environment.id });
                });
        } else {
            try { connJson = await connResp.json(); } catch { /* ignore */ }
    }
    debug.connCount = (connJson && connJson.value && connJson.value.length) ? connJson.value.length : 0;

        // Helper: extract connection reference names from flow clientdata
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
                // If parsing fails, ignore this flow
                console.debug('Failed to parse flow clientdata:', error);
            }

            return Array.from(names);
        };

        // Map flows -> connection references by parsing clientdata
        for (const flow of flows as any[]) {
            const clientData = flow.clientData;
            const crNames = extractConnectionReferenceNames(clientData);
            if (!crNames || crNames.length === 0) continue;

            for (const name of crNames) {
                const matched = connectionReferences.find(cr => cr.name && cr.name.toLowerCase() === name.toLowerCase());

                if (matched) {
                    matched.flowIds = matched.flowIds || [];
                    if (!matched.flowIds.includes(flow.id)) matched.flowIds.push(flow.id);
                } else {
                    // create a placeholder connection reference for unmatched name
                    connectionReferences.push({ 
                        id: `placeholder-${name}`, 
                        name, 
                        connectorLogicalName: undefined, 
                        referencedConnectionId: undefined, 
                        flowIds: [flow.id] 
                    });
                }
            }
        }

    // Resolve referencedConnectionName for each connection reference
        connectionReferences.forEach(cr => {
            if (cr.referencedConnectionId) {
                const conn = connections.find(c => c.id === cr.referencedConnectionId || c.id === (cr.referencedConnectionId as any)?._value);
                if (conn) {
                    (cr as any).referencedConnectionName = conn.name;
                }
            }
        });

    // Attach debug information to the result for diagnostics
    const result: RelationshipResult = { flows, connectionReferences, connections, _debug: debug };

    // Note: mapping flows -> connection references requires parsing flow definitions which may be stored in xaml/definition; for MVP we'll leave flowIds empty and surface raw lists
    return result;
    }
}
