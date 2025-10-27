declare module 'node-persist' {
    interface LocalStorage {
        init(options?: {
            dir?: string;
            stringify?: (obj: unknown) => string;
            parse?: (str: string) => unknown;
            encoding?: string;
            logging?: boolean;
            ttl?: boolean | number;
            expiredInterval?: number;
            forgiveParseErrors?: boolean;
        }): Promise<void>;

        setItem(key: string, value: unknown): Promise<void>;
        getItem(key: string): Promise<unknown>;
        removeItem(key: string): Promise<void>;
        clear(): Promise<void>;
    }

    function create(options?: Record<string, unknown>): LocalStorage;
    export = { create };
}
