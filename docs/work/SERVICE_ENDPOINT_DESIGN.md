# Service Endpoint (Azure Service Bus) Registration Design

**Feature:** Extend Plugin Registration tool to support Azure Service Bus Service Endpoint registration

**Created:** 2025-12-18

**Status:** Design Complete, Ready for Implementation

---

## Business Value

**Problem:**
- Developers need to register Azure Service Bus endpoints to integrate Dataverse with external messaging systems
- Currently requires using XrmToolBox Plugin Registration Tool (PRT)
- WebHook endpoints already exist in codebase, but Service Bus endpoints are not supported

**Solution:**
- Add Service Bus Service Endpoint registration to Plugin Registration panel
- Reuse existing WebHook infrastructure (both use `serviceendpoint` table)
- Support all Service Bus contract types (Queue, Topic, OneWay, TwoWay, EventHub)

**Value:**
- Complete plugin registration workflow within VS Code
- Eliminate context switching to XrmToolBox for Service Bus registration
- Consistent UX with existing WebHook and plugin registration

---

## Complexity Assessment

**Complexity:** Moderate

**Rationale:**
- **Shared infrastructure:** WebHook pattern already exists (same `serviceendpoint` table)
- **New domain concepts:** 5 value objects for Service Bus-specific fields
- **Dynamic form:** Contract type determines which fields are shown (Queue/Topic vs EventHub)
- **No new table:** Leverages existing `serviceendpoint` entity with different contract values
- **Moderate validation:** Namespace/path validation, auth type-specific fields

---

## User Stories

**As a** Power Platform developer
**I want to** register Azure Service Bus endpoints from VS Code
**So that** I can send Dataverse events to external messaging systems

**As a** Power Platform developer
**I want to** configure Queue/Topic/EventHub endpoints with appropriate auth
**So that** events are securely delivered to my messaging infrastructure

---

## Implementation Slices

### MVP Slice (Single Slice)

All features in one deliverable:

1. **Domain layer** - ServiceEndpoint entity + 5 value objects
2. **Infrastructure layer** - ServiceEndpointRepository implementation
3. **Application layer** - Register/Update/Delete use cases + ViewModels
4. **Presentation layer** - Tree integration + FormModal for registration/editing

**Why single slice:**
- Moderate complexity (6-8 files)
- Builds on existing WebHook patterns (low uncertainty)
- Feature is cohesive (not easily decomposed)
- Single PR keeps review focused

---

## Architecture Design

### Domain Layer

#### Entity: ServiceEndpoint

**File:** `src/features/pluginRegistration/domain/entities/ServiceEndpoint.ts`

```typescript
import { ServiceEndpointContract } from '../valueObjects/ServiceEndpointContract';
import { ServiceEndpointConnectionMode } from '../valueObjects/ServiceEndpointConnectionMode';
import { ServiceBusAuthType } from '../valueObjects/ServiceBusAuthType';
import { MessageFormat } from '../valueObjects/MessageFormat';
import { UserClaimType } from '../valueObjects/UserClaimType';

/**
 * Service Endpoint entity representing Azure Service Bus integration.
 *
 * Stored in Dataverse as `serviceendpoint` with contract != 8 (not WebHook).
 * Service Bus endpoints send Dataverse events to Azure messaging infrastructure.
 *
 * Business Rules:
 * - Contract determines required fields (Queue/Topic needs namespace, EventHub needs full URL)
 * - Auth type determines which credential fields are required
 * - Managed endpoints cannot be deleted
 * - All endpoints can be updated regardless of managed state
 */
export class ServiceEndpoint {
	constructor(
		private readonly id: string,
		private readonly name: string,
		private readonly description: string | null,
		private readonly solutionNamespace: string,      // Service Bus namespace (e.g., "mybus")
		private readonly namespaceAddress: string,       // Full namespace URL (e.g., "sb://mybus.servicebus.windows.net")
		private readonly path: string | null,            // Queue/Topic/EventHub name
		private readonly contract: ServiceEndpointContract,
		private readonly connectionMode: ServiceEndpointConnectionMode,
		private readonly authType: ServiceBusAuthType,
		private readonly sasKeyName: string | null,
		private readonly messageFormat: MessageFormat,
		private readonly userClaim: UserClaimType,
		private readonly createdOn: Date,
		private readonly modifiedOn: Date,
		private readonly isManaged: boolean
	) {
		this.validateInvariants();
	}

	// ============================================================
	// Business Rules / Validation
	// ============================================================

	/**
	 * Validates business rules on construction.
	 * Throws if invariants violated.
	 */
	private validateInvariants(): void {
		// Contract-specific validation
		if (this.contract.requiresNamespace() && !this.solutionNamespace) {
			throw new Error('Solution namespace required for Queue/Topic/OneWay/TwoWay contracts');
		}

		// Auth type validation
		if (this.authType.requiresSasKey() && !this.sasKeyName) {
			throw new Error('SAS Key Name required for SharedAccessKey auth type');
		}
	}

	/**
	 * Service endpoints can always be updated regardless of managed state.
	 */
	public canUpdate(): boolean {
		return true;
	}

	/**
	 * Service endpoints can only be deleted if they are not managed.
	 */
	public canDelete(): boolean {
		return !this.isManaged;
	}

	/**
	 * Checks if this endpoint uses EventHub contract.
	 */
	public isEventHub(): boolean {
		return this.contract.equals(ServiceEndpointContract.EventHub);
	}

	/**
	 * Checks if this endpoint uses Queue/Topic/OneWay/TwoWay contract.
	 */
	public isServiceBus(): boolean {
		return (
			this.contract.equals(ServiceEndpointContract.Queue) ||
			this.contract.equals(ServiceEndpointContract.Topic) ||
			this.contract.equals(ServiceEndpointContract.OneWay) ||
			this.contract.equals(ServiceEndpointContract.TwoWay)
		);
	}

	// ============================================================
	// Getters (NO business logic in getters)
	// ============================================================

	public getId(): string {
		return this.id;
	}

	public getName(): string {
		return this.name;
	}

	public getDescription(): string | null {
		return this.description;
	}

	public getSolutionNamespace(): string {
		return this.solutionNamespace;
	}

	public getNamespaceAddress(): string {
		return this.namespaceAddress;
	}

	public getPath(): string | null {
		return this.path;
	}

	public getContract(): ServiceEndpointContract {
		return this.contract;
	}

	public getConnectionMode(): ServiceEndpointConnectionMode {
		return this.connectionMode;
	}

	public getAuthType(): ServiceBusAuthType {
		return this.authType;
	}

	public getSasKeyName(): string | null {
		return this.sasKeyName;
	}

	public getMessageFormat(): MessageFormat {
		return this.messageFormat;
	}

	public getUserClaim(): UserClaimType {
		return this.userClaim;
	}

	public getCreatedOn(): Date {
		return this.createdOn;
	}

	public getModifiedOn(): Date {
		return this.modifiedOn;
	}

	public isInManagedState(): boolean {
		return this.isManaged;
	}
}
```

#### Value Objects (5 total)

**1. ServiceEndpointContract**

```typescript
/**
 * Contract type for Service Endpoint.
 * Determines messaging pattern and protocol.
 *
 * Values:
 * - Queue (1): Azure Service Bus Queue (one consumer)
 * - Topic (2): Azure Service Bus Topic (pub/sub)
 * - OneWay (3): One-way messaging
 * - TwoWay (4): Request/response pattern
 * - Rest (5): REST endpoint
 * - EventHub (7): Azure Event Hub
 * - WebHook (8): WebHook (handled separately)
 */
export class ServiceEndpointContract {
	public static readonly Queue = new ServiceEndpointContract(1, 'Queue');
	public static readonly Topic = new ServiceEndpointContract(2, 'Topic');
	public static readonly OneWay = new ServiceEndpointContract(3, 'OneWay');
	public static readonly TwoWay = new ServiceEndpointContract(4, 'TwoWay');
	public static readonly Rest = new ServiceEndpointContract(5, 'Rest');
	public static readonly EventHub = new ServiceEndpointContract(7, 'EventHub');
	// WebHook (8) handled by separate WebHook entity

	private constructor(
		private readonly value: number,
		private readonly name: string
	) {}

	public static fromValue(value: number): ServiceEndpointContract {
		switch (value) {
			case 1: return ServiceEndpointContract.Queue;
			case 2: return ServiceEndpointContract.Topic;
			case 3: return ServiceEndpointContract.OneWay;
			case 4: return ServiceEndpointContract.TwoWay;
			case 5: return ServiceEndpointContract.Rest;
			case 7: return ServiceEndpointContract.EventHub;
			default: throw new Error(`Invalid ServiceEndpointContract value: ${value}`);
		}
	}

	/**
	 * Returns all valid contract types (excludes WebHook).
	 */
	public static all(): readonly ServiceEndpointContract[] {
		return [
			ServiceEndpointContract.Queue,
			ServiceEndpointContract.Topic,
			ServiceEndpointContract.OneWay,
			ServiceEndpointContract.TwoWay,
			ServiceEndpointContract.Rest,
			ServiceEndpointContract.EventHub,
		];
	}

	/**
	 * Returns true if this contract requires solution namespace.
	 * EventHub uses full namespace address instead.
	 */
	public requiresNamespace(): boolean {
		return this.value !== 7; // All except EventHub
	}

	public getValue(): number {
		return this.value;
	}

	public getName(): string {
		return this.name;
	}

	public equals(other: ServiceEndpointContract): boolean {
		return this.value === other.value;
	}
}
```

**2. ServiceEndpointConnectionMode**

```typescript
/**
 * Connection mode for Service Endpoint.
 *
 * Values:
 * - Normal (1): Standard connection
 * - Federated (2): Federated connection (cross-organization)
 */
export class ServiceEndpointConnectionMode {
	public static readonly Normal = new ServiceEndpointConnectionMode(1, 'Normal');
	public static readonly Federated = new ServiceEndpointConnectionMode(2, 'Federated');

	private constructor(
		private readonly value: number,
		private readonly name: string
	) {}

	public static fromValue(value: number): ServiceEndpointConnectionMode {
		switch (value) {
			case 1: return ServiceEndpointConnectionMode.Normal;
			case 2: return ServiceEndpointConnectionMode.Federated;
			default: throw new Error(`Invalid ServiceEndpointConnectionMode value: ${value}`);
		}
	}

	public getValue(): number {
		return this.value;
	}

	public getName(): string {
		return this.name;
	}

	public equals(other: ServiceEndpointConnectionMode): boolean {
		return this.value === other.value;
	}
}
```

**3. ServiceBusAuthType**

```typescript
/**
 * Authentication type for Service Bus endpoints.
 *
 * Values:
 * - None (1): No authentication
 * - SharedAccessKey (2): SAS key authentication (requires key name + key)
 * - SharedAccessToken (3): SAS token authentication (requires token)
 * - ConnectionString (4): Connection string authentication
 * - ManagedServiceIdentity (5): Azure Managed Identity (no credentials)
 */
export class ServiceBusAuthType {
	public static readonly None = new ServiceBusAuthType(1, 'None');
	public static readonly SharedAccessKey = new ServiceBusAuthType(2, 'SharedAccessKey');
	public static readonly SharedAccessToken = new ServiceBusAuthType(3, 'SharedAccessToken');
	public static readonly ConnectionString = new ServiceBusAuthType(4, 'ConnectionString');
	public static readonly ManagedServiceIdentity = new ServiceBusAuthType(5, 'ManagedServiceIdentity');

	private constructor(
		private readonly value: number,
		private readonly name: string
	) {}

	public static fromValue(value: number): ServiceBusAuthType {
		switch (value) {
			case 1: return ServiceBusAuthType.None;
			case 2: return ServiceBusAuthType.SharedAccessKey;
			case 3: return ServiceBusAuthType.SharedAccessToken;
			case 4: return ServiceBusAuthType.ConnectionString;
			case 5: return ServiceBusAuthType.ManagedServiceIdentity;
			default: throw new Error(`Invalid ServiceBusAuthType value: ${value}`);
		}
	}

	/**
	 * Returns all valid auth types.
	 */
	public static all(): readonly ServiceBusAuthType[] {
		return [
			ServiceBusAuthType.None,
			ServiceBusAuthType.SharedAccessKey,
			ServiceBusAuthType.SharedAccessToken,
			ServiceBusAuthType.ConnectionString,
			ServiceBusAuthType.ManagedServiceIdentity,
		];
	}

	/**
	 * Returns true if this auth type requires SAS key name + key.
	 */
	public requiresSasKey(): boolean {
		return this.value === 2;
	}

	/**
	 * Returns true if this auth type requires SAS token.
	 */
	public requiresSasToken(): boolean {
		return this.value === 3;
	}

	/**
	 * Returns true if this auth type requires any credentials.
	 */
	public requiresCredentials(): boolean {
		return this.value !== 1 && this.value !== 5; // Not None, not MSI
	}

	public getValue(): number {
		return this.value;
	}

	public getName(): string {
		return this.name;
	}

	public equals(other: ServiceBusAuthType): boolean {
		return this.value === other.value;
	}
}
```

**4. MessageFormat**

```typescript
/**
 * Message format for Service Bus events.
 *
 * Values:
 * - DotNet (1): .NET binary serialization
 * - Json (2): JSON format (recommended)
 * - Xml (3): XML format
 */
export class MessageFormat {
	public static readonly DotNet = new MessageFormat(1, '.NET Binary');
	public static readonly Json = new MessageFormat(2, 'JSON');
	public static readonly Xml = new MessageFormat(3, 'XML');

	private constructor(
		private readonly value: number,
		private readonly name: string
	) {}

	public static fromValue(value: number): MessageFormat {
		switch (value) {
			case 1: return MessageFormat.DotNet;
			case 2: return MessageFormat.Json;
			case 3: return MessageFormat.Xml;
			default: throw new Error(`Invalid MessageFormat value: ${value}`);
		}
	}

	public static all(): readonly MessageFormat[] {
		return [MessageFormat.DotNet, MessageFormat.Json, MessageFormat.Xml];
	}

	public getValue(): number {
		return this.value;
	}

	public getName(): string {
		return this.name;
	}

	public equals(other: MessageFormat): boolean {
		return this.value === other.value;
	}
}
```

**5. UserClaimType**

```typescript
/**
 * User claim type for Service Bus messages.
 * Determines what user context info is included in events.
 *
 * Values:
 * - None (1): No user info
 * - UserId (2): Just user GUID
 * - UserInfo (3): Full user context
 */
export class UserClaimType {
	public static readonly None = new UserClaimType(1, 'None');
	public static readonly UserId = new UserClaimType(2, 'UserId');
	public static readonly UserInfo = new UserClaimType(3, 'UserInfo');

	private constructor(
		private readonly value: number,
		private readonly name: string
	) {}

	public static fromValue(value: number): UserClaimType {
		switch (value) {
			case 1: return UserClaimType.None;
			case 2: return UserClaimType.UserId;
			case 3: return UserClaimType.UserInfo;
			default: throw new Error(`Invalid UserClaimType value: ${value}`);
		}
	}

	public static all(): readonly UserClaimType[] {
		return [UserClaimType.None, UserClaimType.UserId, UserClaimType.UserInfo];
	}

	public getValue(): number {
		return this.value;
	}

	public getName(): string {
		return this.name;
	}

	public equals(other: UserClaimType): boolean {
		return this.value === other.value;
	}
}
```

#### Repository Interface

**File:** `src/features/pluginRegistration/domain/interfaces/IServiceEndpointRepository.ts`

```typescript
import type { ServiceEndpoint } from '../entities/ServiceEndpoint';

/**
 * Input for registering a new Service Endpoint.
 */
export interface RegisterServiceEndpointInput {
	readonly name: string;
	readonly description?: string | undefined;
	readonly solutionNamespace: string;      // e.g., "mybus"
	readonly namespaceAddress: string;       // e.g., "sb://mybus.servicebus.windows.net"
	readonly path?: string | undefined;      // Queue/Topic/EventHub name
	readonly contract: number;               // ServiceEndpointContract value
	readonly connectionMode: number;         // ServiceEndpointConnectionMode value
	readonly authType: number;               // ServiceBusAuthType value
	readonly sasKeyName?: string | undefined;
	readonly sasKey?: string | undefined;    // Write-only, never read back
	readonly sasToken?: string | undefined;  // Write-only, never read back
	readonly messageFormat: number;          // MessageFormat value
	readonly userClaim: number;              // UserClaimType value
	readonly solutionUniqueName?: string | undefined;
}

/**
 * Input for updating an existing Service Endpoint.
 * All fields are optional - only provided fields will be updated.
 */
export interface UpdateServiceEndpointInput {
	readonly name?: string | undefined;
	readonly description?: string | undefined;
	readonly solutionNamespace?: string | undefined;
	readonly namespaceAddress?: string | undefined;
	readonly path?: string | undefined;
	readonly authType?: number | undefined;
	readonly sasKeyName?: string | undefined;
	readonly sasKey?: string | undefined;
	readonly sasToken?: string | undefined;
	readonly messageFormat?: number | undefined;
	readonly userClaim?: number | undefined;
}

/**
 * Repository interface for Service Endpoint operations.
 * Defined in domain layer, implemented in infrastructure layer.
 */
export interface IServiceEndpointRepository {
	/**
	 * Finds all Service Endpoints in the environment (excludes WebHooks).
	 * Filter: contract ne 8
	 */
	findAll(environmentId: string): Promise<readonly ServiceEndpoint[]>;

	/**
	 * Finds a Service Endpoint by ID.
	 * Returns null if not found or if it's a WebHook.
	 */
	findById(environmentId: string, serviceEndpointId: string): Promise<ServiceEndpoint | null>;

	/**
	 * Registers a new Service Endpoint.
	 * Returns the ID of the created Service Endpoint.
	 */
	register(environmentId: string, input: RegisterServiceEndpointInput): Promise<string>;

	/**
	 * Updates an existing Service Endpoint.
	 */
	update(
		environmentId: string,
		serviceEndpointId: string,
		input: UpdateServiceEndpointInput
	): Promise<void>;

	/**
	 * Deletes a Service Endpoint.
	 */
	delete(environmentId: string, serviceEndpointId: string): Promise<void>;
}
```

---

### Application Layer

#### Use Cases (3 total)

**1. RegisterServiceEndpointUseCase**

```typescript
import type { ILogger } from '../../../../infrastructure/logging/ILogger';
import type { IServiceEndpointRepository } from '../../domain/interfaces/IServiceEndpointRepository';

export interface RegisterServiceEndpointInput {
	readonly name: string;
	readonly description?: string | undefined;
	readonly solutionNamespace: string;
	readonly namespaceAddress: string;
	readonly path?: string | undefined;
	readonly contract: number;
	readonly connectionMode: number;
	readonly authType: number;
	readonly sasKeyName?: string | undefined;
	readonly sasKey?: string | undefined;
	readonly sasToken?: string | undefined;
	readonly messageFormat: number;
	readonly userClaim: number;
	readonly solutionUniqueName?: string | undefined;
}

/**
 * Registers a new Azure Service Bus Service Endpoint.
 *
 * Orchestrates: Validation → Repository create
 */
export class RegisterServiceEndpointUseCase {
	constructor(
		private readonly repository: IServiceEndpointRepository,
		private readonly logger: ILogger
	) {}

	public async execute(
		environmentId: string,
		input: RegisterServiceEndpointInput
	): Promise<string> {
		this.logger.info('Registering Service Endpoint', {
			environmentId,
			name: input.name,
			contract: input.contract,
		});

		// Validation
		if (!input.name || input.name.trim() === '') {
			throw new Error('Name is required');
		}
		if (!input.solutionNamespace || input.solutionNamespace.trim() === '') {
			throw new Error('Solution namespace is required');
		}

		// Register via repository
		const serviceEndpointId = await this.repository.register(environmentId, input);

		this.logger.info('Service Endpoint registered', { serviceEndpointId });
		return serviceEndpointId;
	}
}
```

**2. UpdateServiceEndpointUseCase**

```typescript
/**
 * Updates an existing Service Endpoint.
 *
 * Orchestrates: Validation → Repository update
 */
export class UpdateServiceEndpointUseCase {
	constructor(
		private readonly repository: IServiceEndpointRepository,
		private readonly logger: ILogger
	) {}

	public async execute(
		environmentId: string,
		serviceEndpointId: string,
		input: UpdateServiceEndpointInput
	): Promise<void> {
		this.logger.info('Updating Service Endpoint', { serviceEndpointId, environmentId });

		await this.repository.update(environmentId, serviceEndpointId, input);

		this.logger.info('Service Endpoint updated', { serviceEndpointId });
	}
}
```

**3. UnregisterServiceEndpointUseCase**

```typescript
/**
 * Deletes a Service Endpoint.
 *
 * Orchestrates: Repository delete
 */
export class UnregisterServiceEndpointUseCase {
	constructor(
		private readonly repository: IServiceEndpointRepository,
		private readonly logger: ILogger
	) {}

	public async execute(environmentId: string, serviceEndpointId: string): Promise<void> {
		this.logger.info('Unregistering Service Endpoint', { serviceEndpointId, environmentId });

		await this.repository.delete(environmentId, serviceEndpointId);

		this.logger.info('Service Endpoint unregistered', { serviceEndpointId });
	}
}
```

#### ViewModels

**ServiceEndpointViewModel**

```typescript
/**
 * Data structure for displaying Service Endpoints in the tree.
 *
 * Mapped from domain ServiceEndpoint entity via mapper.
 */
export interface ServiceEndpointViewModel {
	readonly id: string;
	readonly name: string;
	readonly description: string | null;
	readonly contract: string;              // "Queue" | "Topic" | "EventHub" | etc.
	readonly authType: string;              // "SharedAccessKey" | "ManagedServiceIdentity" | etc.
	readonly messageFormat: string;         // "JSON" | "XML" | ".NET Binary"
	readonly namespace: string;             // Solution namespace or full URL for EventHub
	readonly path: string | null;           // Queue/Topic/EventHub name
	readonly createdOn: string;             // ISO 8601 formatted
	readonly modifiedOn: string;            // ISO 8601 formatted
	readonly isManaged: boolean;
	readonly canUpdate: boolean;
	readonly canDelete: boolean;
}
```

#### Mapper

**ServiceEndpointViewModelMapper**

```typescript
import type { ServiceEndpoint } from '../../domain/entities/ServiceEndpoint';
import type { ServiceEndpointViewModel } from '../viewModels/ServiceEndpointViewModel';

/**
 * Maps ServiceEndpoint domain entities to ViewModels.
 */
export class ServiceEndpointViewModelMapper {
	/**
	 * Maps domain ServiceEndpoint to ViewModel for UI display.
	 */
	public static toViewModel(endpoint: ServiceEndpoint): ServiceEndpointViewModel {
		return {
			id: endpoint.getId(),
			name: endpoint.getName(),
			description: endpoint.getDescription(),
			contract: endpoint.getContract().getName(),
			authType: endpoint.getAuthType().getName(),
			messageFormat: endpoint.getMessageFormat().getName(),
			namespace: endpoint.isEventHub()
				? endpoint.getNamespaceAddress()
				: endpoint.getSolutionNamespace(),
			path: endpoint.getPath(),
			createdOn: endpoint.getCreatedOn().toISOString(),
			modifiedOn: endpoint.getModifiedOn().toISOString(),
			isManaged: endpoint.isInManagedState(),
			canUpdate: endpoint.canUpdate(),
			canDelete: endpoint.canDelete(),
		};
	}
}
```

---

### Infrastructure Layer

#### Repository Implementation

**File:** `src/features/pluginRegistration/infrastructure/repositories/DataverseServiceEndpointRepository.ts`

```typescript
import type { IServiceEndpointRepository, RegisterServiceEndpointInput, UpdateServiceEndpointInput } from '../../domain/interfaces/IServiceEndpointRepository';
import type { ServiceEndpoint } from '../../domain/entities/ServiceEndpoint';
import type { IDataverseApiService } from '../../../../shared/infrastructure/api/IDataverseApiService';
import { ServiceEndpointContract } from '../../domain/valueObjects/ServiceEndpointContract';
import { ServiceEndpointConnectionMode } from '../../domain/valueObjects/ServiceEndpointConnectionMode';
import { ServiceBusAuthType } from '../../domain/valueObjects/ServiceBusAuthType';
import { MessageFormat } from '../../domain/valueObjects/MessageFormat';
import { UserClaimType } from '../../domain/valueObjects/UserClaimType';

interface ServiceEndpointDto {
	serviceendpointid: string;
	name: string;
	description: string | null;
	solutionnamespace: string;
	namespaceaddress: string;
	path: string | null;
	contract: number;
	connectionmode: number;
	authtype: number;
	saskeyname: string | null;
	messageformat: number;
	userclaim: number;
	createdon: string;
	modifiedon: string;
	ismanaged: boolean;
}

/**
 * Dataverse implementation of IServiceEndpointRepository.
 * Fetches/creates Service Endpoints from serviceendpoint entity.
 */
export class DataverseServiceEndpointRepository implements IServiceEndpointRepository {
	constructor(private readonly apiService: IDataverseApiService) {}

	public async findAll(environmentId: string): Promise<readonly ServiceEndpoint[]> {
		// Filter: contract ne 8 (exclude WebHooks)
		const dtos = await this.apiService.fetchRecords<ServiceEndpointDto>(
			environmentId,
			'serviceendpoints',
			{
				$filter: 'contract ne 8',
				$select: 'serviceendpointid,name,description,solutionnamespace,namespaceaddress,path,contract,connectionmode,authtype,saskeyname,messageformat,userclaim,createdon,modifiedon,ismanaged',
				$orderby: 'name asc',
			}
		);

		return dtos.map((dto) => this.mapToDomain(dto));
	}

	public async findById(
		environmentId: string,
		serviceEndpointId: string
	): Promise<ServiceEndpoint | null> {
		const dto = await this.apiService.fetchRecord<ServiceEndpointDto>(
			environmentId,
			'serviceendpoints',
			serviceEndpointId,
			{
				$select: 'serviceendpointid,name,description,solutionnamespace,namespaceaddress,path,contract,connectionmode,authtype,saskeyname,messageformat,userclaim,createdon,modifiedon,ismanaged',
			}
		);

		if (!dto) return null;

		// Exclude WebHooks
		if (dto.contract === 8) return null;

		return this.mapToDomain(dto);
	}

	public async register(
		environmentId: string,
		input: RegisterServiceEndpointInput
	): Promise<string> {
		const payload: Record<string, unknown> = {
			name: input.name,
			solutionnamespace: input.solutionNamespace,
			namespaceaddress: input.namespaceAddress,
			contract: input.contract,
			connectionmode: input.connectionMode,
			authtype: input.authType,
			messageformat: input.messageFormat,
			userclaim: input.userClaim,
		};

		if (input.description) {
			payload['description'] = input.description;
		}
		if (input.path) {
			payload['path'] = input.path;
		}
		if (input.sasKeyName) {
			payload['saskeyname'] = input.sasKeyName;
		}
		if (input.sasKey) {
			payload['saskey'] = input.sasKey;
		}
		if (input.sasToken) {
			payload['sastoken'] = input.sasToken;
		}

		const headers: Record<string, string> = {};
		if (input.solutionUniqueName) {
			headers['MSCRM.SolutionUniqueName'] = input.solutionUniqueName;
		}

		const created = await this.apiService.createRecord(
			environmentId,
			'serviceendpoints',
			payload,
			headers
		);

		return created.serviceendpointid as string;
	}

	public async update(
		environmentId: string,
		serviceEndpointId: string,
		input: UpdateServiceEndpointInput
	): Promise<void> {
		const payload: Record<string, unknown> = {};

		if (input.name !== undefined) payload['name'] = input.name;
		if (input.description !== undefined) payload['description'] = input.description;
		if (input.solutionNamespace !== undefined)
			payload['solutionnamespace'] = input.solutionNamespace;
		if (input.namespaceAddress !== undefined)
			payload['namespaceaddress'] = input.namespaceAddress;
		if (input.path !== undefined) payload['path'] = input.path;
		if (input.authType !== undefined) payload['authtype'] = input.authType;
		if (input.sasKeyName !== undefined) payload['saskeyname'] = input.sasKeyName;
		if (input.sasKey !== undefined) payload['saskey'] = input.sasKey;
		if (input.sasToken !== undefined) payload['sastoken'] = input.sasToken;
		if (input.messageFormat !== undefined) payload['messageformat'] = input.messageFormat;
		if (input.userClaim !== undefined) payload['userclaim'] = input.userClaim;

		await this.apiService.updateRecord(
			environmentId,
			'serviceendpoints',
			serviceEndpointId,
			payload
		);
	}

	public async delete(environmentId: string, serviceEndpointId: string): Promise<void> {
		await this.apiService.deleteRecord(environmentId, 'serviceendpoints', serviceEndpointId);
	}

	private mapToDomain(dto: ServiceEndpointDto): ServiceEndpoint {
		return new ServiceEndpoint(
			dto.serviceendpointid,
			dto.name,
			dto.description,
			dto.solutionnamespace,
			dto.namespaceaddress,
			dto.path,
			ServiceEndpointContract.fromValue(dto.contract),
			ServiceEndpointConnectionMode.fromValue(dto.connectionmode),
			ServiceBusAuthType.fromValue(dto.authtype),
			dto.saskeyname,
			MessageFormat.fromValue(dto.messageformat),
			UserClaimType.fromValue(dto.userclaim),
			new Date(dto.createdon),
			new Date(dto.modifiedon),
			dto.ismanaged
		);
	}
}
```

---

### Presentation Layer

#### Tree Integration

**Update:** `src/features/pluginRegistration/application/viewModels/TreeItemViewModel.ts`

```typescript
export interface TreeItemViewModel {
	readonly id: string;
	readonly parentId: string | null;
	readonly type: 'package' | 'assembly' | 'pluginType' | 'step' | 'image' | 'serviceEndpoint';
	readonly name: string;
	readonly displayName: string;
	readonly icon: string;
	readonly metadata: PackageMetadata | AssemblyMetadata | PluginTypeMetadata | StepMetadata | ImageMetadata | ServiceEndpointMetadata;
	readonly isManaged: boolean;
	readonly children: TreeItemViewModel[];
}

/**
 * Service Endpoint-specific metadata.
 */
export interface ServiceEndpointMetadata {
	readonly type: 'serviceEndpoint';
	readonly contract: string;        // "Queue" | "Topic" | "EventHub" | etc.
	readonly authType: string;        // "SharedAccessKey" | "ManagedServiceIdentity" | etc.
	readonly namespace: string;       // Solution namespace or full URL
	readonly path: string | null;     // Queue/Topic/EventHub name
	readonly createdOn: string;
	readonly canUpdate: boolean;
	readonly canDelete: boolean;
}
```

#### Modal Form Component

**Reuse existing FormModal component** from `resources/webview/js/components/FormModal.js`

**Dynamic form based on contract type:**

```javascript
// Register Service Endpoint modal handler
function handleShowRegisterServiceEndpointModal(data) {
	const { solutions } = data;

	window.showFormModal({
		title: 'Register Service Endpoint',
		width: '600px',
		fields: [
			{
				id: 'sectionGeneral',
				type: 'section',
				label: 'General Configuration'
			},
			{
				id: 'name',
				label: 'Name',
				type: 'text',
				value: '',
				required: true,
				placeholder: 'Service Bus Endpoint'
			},
			{
				id: 'description',
				label: 'Description',
				type: 'textarea',
				value: '',
				placeholder: 'Optional description'
			},
			{
				id: 'contract',
				label: 'Contract Type',
				type: 'select',
				value: '1',
				required: true,
				options: [
					{ value: '1', label: 'Queue' },
					{ value: '2', label: 'Topic' },
					{ value: '3', label: 'OneWay' },
					{ value: '4', label: 'TwoWay' },
					{ value: '7', label: 'EventHub' }
				]
			},
			{
				id: 'sectionServiceBus',
				type: 'section',
				label: 'Service Bus Configuration',
				hidden: false
			},
			{
				id: 'solutionNamespace',
				label: 'Solution Namespace',
				type: 'text',
				value: '',
				required: true,
				placeholder: 'mybus',
				hidden: false
			},
			{
				id: 'path',
				label: 'Path (Queue/Topic/EventHub Name)',
				type: 'text',
				value: '',
				placeholder: 'myqueue'
			},
			{
				id: 'sectionEventHub',
				type: 'section',
				label: 'Event Hub Configuration',
				hidden: true
			},
			{
				id: 'namespaceAddress',
				label: 'Namespace Address',
				type: 'text',
				value: '',
				placeholder: 'sb://mybus.servicebus.windows.net',
				hidden: true
			},
			{
				id: 'sectionAuth',
				type: 'section',
				label: 'Authentication'
			},
			{
				id: 'authType',
				label: 'Auth Type',
				type: 'select',
				value: '2',
				options: [
					{ value: '1', label: 'None' },
					{ value: '2', label: 'SharedAccessKey' },
					{ value: '3', label: 'SharedAccessToken' },
					{ value: '4', label: 'ConnectionString' },
					{ value: '5', label: 'ManagedServiceIdentity' }
				]
			},
			{
				id: 'sasKeyName',
				label: 'SAS Key Name',
				type: 'text',
				value: '',
				placeholder: 'RootManageSharedAccessKey',
				hidden: false
			},
			{
				id: 'sasKey',
				label: 'SAS Key',
				type: 'password',
				value: '',
				placeholder: 'Your SAS key',
				hidden: false
			},
			{
				id: 'sasToken',
				label: 'SAS Token',
				type: 'password',
				value: '',
				hidden: true
			},
			{
				id: 'sectionOptions',
				type: 'section',
				label: 'Options'
			},
			{
				id: 'messageFormat',
				label: 'Message Format',
				type: 'select',
				value: '2',
				options: [
					{ value: '1', label: '.NET Binary' },
					{ value: '2', label: 'JSON' },
					{ value: '3', label: 'XML' }
				]
			},
			{
				id: 'userClaim',
				label: 'User Claim',
				type: 'select',
				value: '1',
				options: [
					{ value: '1', label: 'None' },
					{ value: '2', label: 'UserId' },
					{ value: '3', label: 'UserInfo' }
				]
			},
			{
				id: 'solution',
				label: 'Add to Solution (Optional)',
				type: 'select',
				value: '',
				options: [
					{ value: '', label: '(None)' },
					...solutions.map(s => ({ value: s.uniqueName, label: s.friendlyName }))
				]
			}
		],
		submitLabel: 'Register',
		onFieldChange: (fieldId, value, updateField) => {
			// Dynamic form behavior based on contract type
			if (fieldId === 'contract') {
				const isEventHub = value === '7';

				// Toggle visibility of Service Bus vs EventHub sections
				updateField('sectionServiceBus', undefined, undefined, !isEventHub);
				updateField('solutionNamespace', undefined, undefined, !isEventHub);
				updateField('sectionEventHub', undefined, undefined, isEventHub);
				updateField('namespaceAddress', undefined, undefined, isEventHub);
			}

			// Dynamic form behavior based on auth type
			if (fieldId === 'authType') {
				const requiresSasKey = value === '2';
				const requiresSasToken = value === '3';

				updateField('sasKeyName', undefined, undefined, requiresSasKey);
				updateField('sasKey', undefined, undefined, requiresSasKey);
				updateField('sasToken', undefined, undefined, requiresSasToken);
			}
		},
		onSubmit: (values) => {
			vscode.postMessage({
				command: 'confirmRegisterServiceEndpoint',
				data: {
					name: values.name,
					description: values.description || undefined,
					contract: parseInt(values.contract, 10),
					solutionNamespace: values.solutionNamespace,
					namespaceAddress: values.contract === '7' ? values.namespaceAddress : `sb://${values.solutionNamespace}.servicebus.windows.net`,
					path: values.path || undefined,
					connectionMode: 1, // Normal
					authType: parseInt(values.authType, 10),
					sasKeyName: values.sasKeyName || undefined,
					sasKey: values.sasKey || undefined,
					sasToken: values.sasToken || undefined,
					messageFormat: parseInt(values.messageFormat, 10),
					userClaim: parseInt(values.userClaim, 10),
					solutionUniqueName: values.solution || undefined
				}
			});
		}
	});
}
```

---

## Type Contracts

All types defined in architecture section above.

**Summary:**
- 1 domain entity (ServiceEndpoint)
- 5 value objects (Contract, ConnectionMode, AuthType, MessageFormat, UserClaim)
- 1 repository interface + 1 implementation
- 3 use cases (Register, Update, Unregister)
- 2 ViewModels (ServiceEndpointViewModel, ServiceEndpointMetadata)
- 1 mapper (ServiceEndpointViewModelMapper)

---

## Testing Strategy

### Domain Layer (Target: 80%+)

**ServiceEndpoint entity tests:**
- ✅ Constructor validation (namespace required for non-EventHub)
- ✅ Constructor validation (SAS key name required for SharedAccessKey)
- ✅ canUpdate() returns true (always updatable)
- ✅ canDelete() returns false for managed
- ✅ canDelete() returns true for unmanaged
- ✅ isEventHub() returns true for EventHub contract
- ✅ isServiceBus() returns true for Queue/Topic/OneWay/TwoWay

**Value object tests (5 value objects × 3 tests each):**
- ✅ fromValue() with valid values
- ✅ fromValue() with invalid values (throws)
- ✅ Business rule methods (requiresNamespace(), requiresSasKey(), etc.)

### Application Layer (Target: 70%+)

**Use case tests:**
- ✅ RegisterServiceEndpointUseCase - happy path
- ✅ RegisterServiceEndpointUseCase - validation errors
- ✅ UpdateServiceEndpointUseCase - happy path
- ✅ UnregisterServiceEndpointUseCase - happy path

**Mapper tests:**
- ✅ ServiceEndpointViewModelMapper.toViewModel() - all fields mapped correctly

### Integration Testing

**Manual F5 testing required:**
- Register Queue endpoint with SharedAccessKey auth
- Register EventHub endpoint with ManagedServiceIdentity auth
- Update Service Endpoint (change auth type, change path)
- Delete Service Endpoint (confirm modal, tree updates)
- Tree displays Service Endpoints with correct icons
- Detail panel shows Service Endpoint metadata

---

## Open Questions

None. Design is complete and ready for implementation.

---

## Implementation Checklist

### Domain Layer
- [ ] ServiceEndpoint entity (`ServiceEndpoint.ts`)
- [ ] 5 value objects (`ServiceEndpointContract.ts`, `ServiceEndpointConnectionMode.ts`, `ServiceBusAuthType.ts`, `MessageFormat.ts`, `UserClaimType.ts`)
- [ ] Repository interface (`IServiceEndpointRepository.ts`)
- [ ] Unit tests for entity + value objects

### Application Layer
- [ ] RegisterServiceEndpointUseCase
- [ ] UpdateServiceEndpointUseCase
- [ ] UnregisterServiceEndpointUseCase
- [ ] ServiceEndpointViewModel interface
- [ ] ServiceEndpointViewModelMapper
- [ ] Unit tests for use cases + mapper

### Infrastructure Layer
- [ ] DataverseServiceEndpointRepository implementation
- [ ] DTO interface + mapping logic

### Presentation Layer
- [ ] Update TreeItemViewModel to include `serviceEndpoint` type
- [ ] Add ServiceEndpointMetadata interface
- [ ] Register dropdown menu item for Service Endpoints
- [ ] Modal form for Register Service Endpoint
- [ ] Modal form for Edit Service Endpoint
- [ ] Tree section rendering (icon: $(cloud) or $(azure))
- [ ] Context menu commands (update, delete)
- [ ] Command handlers in panel
- [ ] Wire up use cases in initializePluginRegistration

### Testing
- [ ] Domain entity tests
- [ ] Value object tests (all 5)
- [ ] Use case tests (all 3)
- [ ] Mapper tests
- [ ] F5 manual testing

---

## Files to Create

**Domain Layer:**
1. `src/features/pluginRegistration/domain/entities/ServiceEndpoint.ts`
2. `src/features/pluginRegistration/domain/valueObjects/ServiceEndpointContract.ts`
3. `src/features/pluginRegistration/domain/valueObjects/ServiceEndpointConnectionMode.ts`
4. `src/features/pluginRegistration/domain/valueObjects/ServiceBusAuthType.ts`
5. `src/features/pluginRegistration/domain/valueObjects/MessageFormat.ts`
6. `src/features/pluginRegistration/domain/valueObjects/UserClaimType.ts`
7. `src/features/pluginRegistration/domain/interfaces/IServiceEndpointRepository.ts`

**Application Layer:**
8. `src/features/pluginRegistration/application/useCases/RegisterServiceEndpointUseCase.ts`
9. `src/features/pluginRegistration/application/useCases/UpdateServiceEndpointUseCase.ts`
10. `src/features/pluginRegistration/application/useCases/UnregisterServiceEndpointUseCase.ts`
11. `src/features/pluginRegistration/application/viewModels/ServiceEndpointViewModel.ts`
12. `src/features/pluginRegistration/application/mappers/ServiceEndpointViewModelMapper.ts`

**Infrastructure Layer:**
13. `src/features/pluginRegistration/infrastructure/repositories/DataverseServiceEndpointRepository.ts`

**Tests:**
14. `src/features/pluginRegistration/domain/entities/ServiceEndpoint.test.ts`
15. `src/features/pluginRegistration/domain/valueObjects/ServiceEndpointContract.test.ts`
16. `src/features/pluginRegistration/domain/valueObjects/ServiceEndpointConnectionMode.test.ts`
17. `src/features/pluginRegistration/domain/valueObjects/ServiceBusAuthType.test.ts`
18. `src/features/pluginRegistration/domain/valueObjects/MessageFormat.test.ts`
19. `src/features/pluginRegistration/domain/valueObjects/UserClaimType.test.ts`
20. `src/features/pluginRegistration/application/mappers/ServiceEndpointViewModelMapper.test.ts`

**Total:** 20 new files (13 production + 7 test files)

---

## Estimated Effort

**Total:** 6-8 hours (single session or split across 2 sessions)

**Breakdown:**
- Domain layer: 2-3 hours (entity + 5 value objects + tests)
- Infrastructure layer: 1-2 hours (repository + DTO mapping)
- Application layer: 1-2 hours (3 use cases + mapper + tests)
- Presentation layer: 2-3 hours (tree integration + modal forms + commands)
- F5 testing + polish: 1 hour

---

## Decision Log

### Decision 1: Reuse vs. New Repository

**Decision:** Create separate `IServiceEndpointRepository` instead of extending `IWebHookRepository`.

**Rationale:**
- Different domain entities (ServiceEndpoint vs WebHook)
- Different field requirements (namespace, path, messageformat vs url)
- Different validation rules (contract-specific logic)
- Separation of concerns (WebHook = contract 8, ServiceEndpoint = contract != 8)

**Tradeoff:** Small code duplication in repository implementation (both use `serviceendpoint` table), but cleaner domain separation.

### Decision 2: Value Object vs Primitive for Contract

**Decision:** Use value objects for all option sets (Contract, AuthType, MessageFormat, etc.)

**Rationale:**
- Encapsulates validation (invalid values throw on construction)
- Business rules in value objects (`requiresNamespace()`, `requiresSasKey()`)
- Type safety (can't accidentally pass wrong enum value)
- Matches existing codebase patterns (ExecutionStage, ExecutionMode, etc.)

**Tradeoff:** More files to create/maintain, but much safer and more expressive.

### Decision 3: Dynamic Form vs Separate Modals

**Decision:** Single modal with dynamic field visibility based on contract type.

**Rationale:**
- Better UX (users can change contract type without re-opening modal)
- Reuses existing FormModal component (`onFieldChange` callback)
- Matches PRT behavior (single dialog, dynamic fields)

**Tradeoff:** More complex JavaScript logic, but avoids modal duplication.

---

## References

- **CLEAN_ARCHITECTURE_GUIDE.md** - Layer patterns
- **VALUE_OBJECT_PATTERNS.md** - Value object implementation
- **PANEL_ARCHITECTURE.md** - FormModal component usage
- **Existing WebHook entity** - Similar pattern for serviceendpoint table
- **Plugin Registration TODO** - Context for overall feature scope
