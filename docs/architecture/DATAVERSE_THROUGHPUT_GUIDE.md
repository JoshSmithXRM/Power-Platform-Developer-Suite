# Dataverse Maximum Throughput Guide

Reference documentation for achieving maximum throughput with Microsoft Dataverse APIs. Essential for data migration tooling and bulk operations.

## Quick Reference: Performance Benchmarks

| Metric | Standard Tables (Azure SQL) | Elastic Tables (Cosmos DB) |
|--------|----------------------------|---------------------------|
| **Writes/hour** | ~10 million (CreateMultiple) | 120 million |
| **Reads/second** | Varies by environment | 6,000 |
| **Max records/table** | Limited by storage | 3 billion+ |
| **Migration speed** | ~2,800/sec (CreateMultiple) | 25,000+/sec (UpsertMultiple) |

## Service Protection API Limits

Enforced **per user, per web server** in a **5-minute sliding window**:

| Limit | Value | Error Code |
|-------|-------|------------|
| **Requests** | 6,000 per 5 min | `0x80072322` (-2147015902) |
| **Execution time** | 1,200 seconds (20 min) per 5 min | `0x80072321` (-2147015903) |
| **Concurrent requests** | 52+ (varies by environment) | `0x80072326` (-2147015898) |

All return HTTP 429 with `Retry-After` header.

---

## API Comparison: Which to Use?

### Bulk Operations (Recommended for Maximum Throughput)

| API | Use Case | Performance |
|-----|----------|-------------|
| `CreateMultiple` | Batch inserts | **5x faster** than ExecuteMultiple |
| `UpdateMultiple` | Batch updates | **5x faster** than ExecuteMultiple |
| `UpsertMultiple` | Insert or update | Best for migrations |
| `DeleteMultiple` | Batch deletes | **Elastic tables only** |

**Limitations:**
- All-or-nothing: One failure = entire batch fails (no `ContinueOnError`)
- Not available for all system tables (Account, Contact, etc.)
- Custom tables always supported

### ExecuteMultiple (Fallback)

| Aspect | ExecuteMultiple | CreateMultiple |
|--------|-----------------|----------------|
| Error handling | `ContinueOnError` option | All-or-nothing |
| Mixed operations | Yes (Create + Update + Delete) | Single operation type |
| Throughput | ~2 million records/hour | ~10 million records/hour |
| Table support | All tables | Custom tables + some system tables |

**Use ExecuteMultiple when:**
- Need `ContinueOnError` behavior
- Mixing operation types in one batch
- Targeting unsupported system tables

---

## Optimal Configuration

### .NET Connection Settings

```csharp
// REQUIRED: Apply before creating ServiceClient

// 1. Increase min threads for faster connection ramping
//    Default: 4 worker, 4 IOCP
ThreadPool.SetMinThreads(100, 100);

// 2. Increase max connections (default is only 2!)
System.Net.ServicePointManager.DefaultConnectionLimit = 65000;

// 3. Disable Expect 100-Continue (reduces round-trips)
System.Net.ServicePointManager.Expect100Continue = false;

// 4. Disable Nagle algorithm (reduces latency)
System.Net.ServicePointManager.UseNagleAlgorithm = false;
```

### ServiceClient Settings

```csharp
using var service = new ServiceClient(connectionString);

// Disable server affinity - distributes requests across web servers
service.EnableAffinityCookie = false;

// Get server-recommended parallelism (from x-ms-dop-hint header)
int recommendedDOP = service.RecommendedDegreesOfParallelism;
```

### App.config Alternative

```xml
<appSettings>
  <add key="PreferConnectionAffinity" value="false" />
</appSettings>
```

---

## Parallelization Strategy

### Microsoft's Recommended Approach

```
DON'T calculate upfront how many requests to send.
DO let the server tell you via Retry-After.

1. Start with lower request rate
2. Gradually increase until hitting 429 errors
3. Use Retry-After value to govern pace
4. This keeps throughput at maximum automatically
```

### Parallel.ForEach Pattern (SDK for .NET)

```csharp
// Clone ServiceClient for each thread (thread safety)
Parallel.ForEach(
    items,
    new ParallelOptions
    {
        MaxDegreeOfParallelism = service.RecommendedDegreesOfParallelism
    },
    () => service.Clone(),  // Thread-local init
    (item, state, index, threadLocalService) =>
    {
        // Process item with threadLocalService
        threadLocalService.Create(item);
        return threadLocalService;
    },
    (threadLocalService) => threadLocalService?.Dispose()  // Cleanup
);
```

### Batch Size Guidance

| Approach | Batch Size | Notes |
|----------|------------|-------|
| **Individual requests + high parallelism** | 1 | Microsoft recommended for most scenarios |
| **ExecuteMultiple** | 10-100 | Start small, increase until limits hit |
| **CreateMultiple/UpdateMultiple** | Up to 1,000 | Maximum supported |

**Key insight:** "Most scenarios are fastest sending single requests with a high degree of parallelism" rather than large batches.

---

## Throughput Calculation

### Theoretical Maximum (Standard Tables)

```
Given:
- 6,000 requests per 5-minute window
- 52 concurrent requests
- Multiple web servers (production environments)

Calculation:
- Requests/second: 6,000 / 300 = 20 req/sec per user
- With parallelism: 20 × 52 = 1,040 operations/sec theoretical max
- Per hour: 1,040 × 3,600 = 3.7 million operations/hour

Reality:
- Each request has network latency + processing time
- Microsoft reports ~10 million/hour with CreateMultiple (batched)
- ~2 million/hour with ExecuteMultiple
```

### Elastic Tables (Cosmos DB)

```
Documented performance:
- 120 million writes/hour = 33,333 writes/second
- 6,000 reads/second
- 25,000+ records/second with UpsertMultiple

Why faster:
- Horizontal autoscaling
- No transaction overhead
- Optimized for high-throughput workloads
```

---

## Performance Optimization Techniques

### 1. Bypass Custom Plugin Execution

For bulk migrations, bypass synchronous plugins:

```csharp
// Requires: System Administrator OR BypassCustomPluginExecution privilege
var request = new CreateMultipleRequest
{
    Targets = entities
};
request.Parameters["BypassCustomPluginExecution"] = true;
service.Execute(request);
```

**Caution:** Any data created during bypass won't have business logic applied.

### 2. Disable Plugins During Migration

1. Identify slow plugins (profile with Plugin Registration Tool)
2. Manually disable plugin steps
3. Run migration
4. Re-enable plugins
5. Run data consistency checks if needed

### 3. Use Alternate Keys

Avoid GUID lookups by defining alternate keys:

```csharp
// Instead of querying for GUID, use alternate key
var entityRef = new EntityReference("contact")
{
    KeyAttributes = new KeyAttributeCollection
    {
        { "emailaddress1", "john@example.com" }
    }
};
```

### 4. Minimize Payload Size

- Only include fields being set (don't send nulls)
- Use attribute logical names, not display names
- Batch homogeneous operations (same entity type)

---

## Error Handling

### Retry-After Pattern

```csharp
public async Task<T> ExecuteWithRetry<T>(Func<Task<T>> operation, int maxRetries = 5)
{
    for (int attempt = 0; attempt < maxRetries; attempt++)
    {
        try
        {
            return await operation();
        }
        catch (FaultException<OrganizationServiceFault> ex)
        {
            if (ex.Detail.ErrorCode == -2147015902 ||  // Request limit
                ex.Detail.ErrorCode == -2147015903 ||  // Execution time
                ex.Detail.ErrorCode == -2147015898)    // Concurrent limit
            {
                if (ex.Detail.ErrorDetails.TryGetValue("Retry-After", out var retryAfter))
                {
                    var delay = (TimeSpan)retryAfter;
                    await Task.Delay(delay);
                    continue;
                }
            }
            throw;
        }
    }
    throw new Exception("Max retries exceeded");
}
```

### ServiceClient Built-in Retry

`ServiceClient` automatically handles transient failures and retries. Use it instead of raw `IOrganizationService` for bulk operations.

---

## Data Migration Decision Matrix

| Data Volume | Complexity | Recommended Approach |
|-------------|------------|---------------------|
| < 50,000 records | Low | Import Wizard, Dataflows |
| 50K - 500K records | Medium | ExecuteMultiple with parallelism |
| 500K - 5M records | Medium-High | CreateMultiple/UpsertMultiple |
| > 5M records | High | Elastic tables + UpsertMultiple |
| Real-time sync | Any | Azure Service Bus + Functions |

---

## Monitoring Headers (Debug Only)

Response headers for troubleshooting (don't use for flow control):

| Header | Description |
|--------|-------------|
| `x-ms-ratelimit-burst-remaining-xrm-requests` | Remaining requests for this connection |
| `x-ms-ratelimit-time-remaining-xrm-requests` | Remaining execution time |

---

## References

- [Optimize Performance for Bulk Operations](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/optimize-performance-create-update)
- [Service Protection API Limits](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/api-limits)
- [Send Parallel Requests](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/send-parallel-requests)
- [ExecuteMultiple Requests](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/org-service/execute-multiple-requests)
- [Hyperscale Announcement (Oct 2024)](https://devblogs.microsoft.com/powerplatform/build-your-next-application-on-dataverse-now-with-hyperscale-support-for-any-enterprise-data/)
- [ExecuteMultiple vs CreateMultiple Benchmark](https://temmyraharjo.wordpress.com/2024/09/29/dataverse-executemultiplerequest-vs-createmultiplerequest-benchmark/)
- [Data Migration Approaches](https://learn.microsoft.com/en-us/power-platform/architecture/key-concepts/data-migration/data-migration-approaches)
