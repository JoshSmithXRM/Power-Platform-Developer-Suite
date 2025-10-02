export interface AuthenticationResult {
    accessToken: string;
    expiresOn: Date;
    account?: {
        username: string;
        tenantId: string;
    };
}

export interface TokenCacheEntry {
    environmentId: string;
    authResult: AuthenticationResult;
    createdAt: Date;
}

export interface AuthenticationError {
    code: string;
    message: string;
    correlationId?: string;
}
