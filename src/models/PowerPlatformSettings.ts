import { AuthenticationMethod } from './AuthenticationMethod';

export interface PowerPlatformSettings {
    tenantId: string;
    dataverseUrl: string;
    authenticationMethod: AuthenticationMethod;
    clientId?: string;
    clientSecret?: string;
    username?: string;
    password?: string;
    publicClientId: string;
}

export interface EnvironmentConnection {
    id: string;
    name: string;
    settings: PowerPlatformSettings;
    isActive: boolean;
    lastUsed?: Date;
}
