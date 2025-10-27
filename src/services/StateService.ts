import * as vscode from 'vscode';

export interface PanelState {
    selectedEnvironmentId?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    filters?: Record<string, any>; // Dynamic filter values - any is appropriate here
    sortColumn?: string;
    sortDirection?: 'asc' | 'desc';
    selectedItems?: string[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    viewConfig?: any; // Dynamic view configuration - any is appropriate here
    lastUpdated?: Date;
    autoRefreshIntervalSeconds?: number;
    splitRatio?: number;
    rightPanelVisible?: boolean;
    filterPanelCollapsed?: boolean;
}

export interface StateChangedEvent {
    panelType: string;
    state: PanelState;
}

export class StateService {
    private static instance: StateService;
    private context: vscode.ExtensionContext;
    private _onStateChanged = new vscode.EventEmitter<StateChangedEvent>();
    
    public readonly onStateChanged = this._onStateChanged.event;
    
    private constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }
    
    public static getInstance(context?: vscode.ExtensionContext): StateService {
        if (!StateService.instance && context) {
            StateService.instance = new StateService(context);
        }
        return StateService.instance;
    }
    
    async savePanelState(panelType: string, state: PanelState): Promise<void> {
        const stateKey = `panel-state-${panelType}`;
        state.lastUpdated = new Date();
        
        await this.context.globalState.update(stateKey, state);
        this._onStateChanged.fire({ panelType, state });
    }
    
    async getPanelState(panelType: string): Promise<PanelState | null> {
        const stateKey = `panel-state-${panelType}`;
        return this.context.globalState.get(stateKey, null);
    }
    
    async clearPanelState(panelType: string): Promise<void> {
        const stateKey = `panel-state-${panelType}`;
        await this.context.globalState.update(stateKey, undefined);
    }
    
    async clearAllPanelStates(): Promise<void> {
        const keys = this.context.globalState.keys();
        const stateKeys = keys.filter(key => key.startsWith('panel-state-'));
        
        for (const key of stateKeys) {
            await this.context.globalState.update(key, undefined);
        }
    }
}
