declare module 'node-persist' {
    interface LocalStorage {
        init(options?: {
            dir?: string;
            stringify?: (obj: any) => string;
            parse?: (str: string) => any;
            encoding?: string;
            logging?: boolean;
            ttl?: boolean | number;
            expiredInterval?: number;
            forgiveParseErrors?: boolean;
        }): Promise<void>;
        
        setItem(key: string, value: any): Promise<void>;
        getItem(key: string): Promise<any>;
        removeItem(key: string): Promise<void>;
        clear(): Promise<void>;
    }
    
    function create(options?: any): LocalStorage;
    export = { create };
}
