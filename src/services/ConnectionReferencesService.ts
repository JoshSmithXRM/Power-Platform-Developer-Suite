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
}

export class ConnectionReferencesService {
    constructor(private authService: AuthenticationService) {}

    async aggregateRelationships(environmentId: string): Promise<RelationshipResult> {
        // Minimal implementation: query flows and connectionreferences via Web API
        const environments = await this.authService.getEnvironments();
        const environment = environments.find(e => e.id === environmentId);
        if (!environment) throw new Error('Environment not found');

        const token = await this.authService.getAccessToken(environment.id);
        const baseUrl = `${environment.settings.dataverseUrl}/api/data/v9.2`;

        // Get flows (workflows with category 5 for Microsoft Flow)
        const flowsUrl = `${baseUrl}/workflows?$select=workflowid,name,primaryentity,solutionid&$filter=category eq 5`;
        const flowsResp = await fetch(flowsUrl, { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } });
        if (!flowsResp.ok) throw new Error(`Failed to load flows: ${flowsResp.status}`);
        const flowsJson = await flowsResp.json();
        const flows = (flowsJson.value || []).map((f: any) => ({ id: f.workflowid, name: f.name, solutionId: f._solutionid_value, // include raw definition when available
            definition: f.definition || f.xaml || null } as any)).map((f: any) => ({ id: f.id || f.workflowid || f.workflowid, name: f.name, solutionId: f.solutionId, definition: f.definition } as any));

        // Get connectionreferences
        const crUrl = `${baseUrl}/connectionreferences?$select=connectionreferenceid,name,connectorid,referencedconnectionid`;
        const crResp = await fetch(crUrl, { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } });
        const connectionReferences = [] as ConnectionReferenceItem[];
        if (crResp.ok) {
            const crJson = await crResp.json();
            (crJson.value || []).forEach((c: any) => {
                connectionReferences.push({
                    id: c.connectionreferenceid,
                    name: c.name,
                    connectorLogicalName: c.connectorid,
                    referencedConnectionId: c.referencedconnectionid,
                    flowIds: []
                });
            });
        }

        // Get connections (connection entities)
        const connUrl = `${baseUrl}/connections?$select=connectionid,name,connectorid`;
        const connections = [] as ConnectionItem[];
        const connResp = await fetch(connUrl, { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } });
        if (connResp.ok) {
            const connJson = await connResp.json();
            (connJson.value || []).forEach((cc: any) => {
                connections.push({ id: cc.connectionid, name: cc.name, connector: cc.connectorid, environmentId: environment.id });
            });
        }

        // Helper: extract connection reference names from a flow definition object/string
        const extractConnectionReferenceNames = (def: any): string[] => {
            const names = new Set<string>();

            const tryParse = (input: any) => {
                if (!input) return null;
                if (typeof input === 'string') {
                    try {
                        return JSON.parse(input);
                    } catch {
                        return input;
                    }
                }
                return input;
            };

            const parsed = tryParse(def);

            const traverse = (node: any, parentKey?: string) => {
                if (!node) return;
                if (typeof node === 'string') {
                    // nothing
                    return;
                }
                if (Array.isArray(node)) {
                    node.forEach(item => traverse(item, parentKey));
                    return;
                }
                if (typeof node === 'object') {
                    // If this object is a connectionReferences collection (common in flow JSON)
                    if (node.connectionReferences && typeof node.connectionReferences === 'object') {
                        Object.keys(node.connectionReferences).forEach(k => names.add(k));
                    }

                    // If the node itself looks like a connection reference entry (has connectorId or referencedConnectionId)
                    const loweredKeys = Object.keys(node).map(k => k.toLowerCase());
                    if (loweredKeys.includes('connectorid') || loweredKeys.includes('referencedconnectionid') || loweredKeys.includes('connectionreferenceid')) {
                        if (parentKey) names.add(parentKey);
                        if (node.name) names.add(node.name);
                    }

                    for (const k of Object.keys(node)) {
                        const v = (node as any)[k];
                        // If key name suggests it's a connection reference mapping
                        if (k && k.toLowerCase().includes('connectionreference') && typeof v === 'string') {
                            names.add(v);
                        }
                        traverse(v, k);
                    }
                }
            };

            traverse(parsed, undefined as any);

            return Array.from(names);
        };

        // Map flows -> connection references by parsing definitions
        for (const flow of flows as any[]) {
            const def = flow.definition || flow.xaml || null;
            const crNames = extractConnectionReferenceNames(def);
            if (!crNames || crNames.length === 0) continue;

            for (const name of crNames) {
                const matched = connectionReferences.find(cr => cr.name && cr.name.toLowerCase() === name.toLowerCase())
                    || connectionReferences.find(cr => cr.connectorLogicalName && cr.connectorLogicalName.toLowerCase().includes(name.toLowerCase()));

                if (matched) {
                    matched.flowIds = matched.flowIds || [];
                    if (!matched.flowIds.includes(flow.id)) matched.flowIds.push(flow.id);
                } else {
                    // create a placeholder connection reference for unmatched name
                    connectionReferences.push({ id: `placeholder-${name}`, name, connectorLogicalName: undefined, referencedConnectionId: undefined, flowIds: [flow.id] });
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

        // Note: mapping flows -> connection references requires parsing flow definitions which may be stored in xaml/definition; for MVP we'll leave flowIds empty and surface raw lists
        return { flows, connectionReferences, connections };
    }
}
