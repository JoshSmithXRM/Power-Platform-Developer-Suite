<Query Kind="Program">
  <NuGetReference>Microsoft.PowerPlatform.Dataverse.Client</NuGetReference>
  <Namespace>Microsoft.PowerPlatform.Dataverse.Client</Namespace>
  <Namespace>Microsoft.Xrm.Sdk</Namespace>
  <Namespace>Microsoft.Xrm.Sdk.Query</Namespace>
  <Namespace>System.Collections.Concurrent</Namespace>
  <Namespace>System.Net</Namespace>
  <Namespace>System.Text.Json</Namespace>
  <Namespace>System.Threading</Namespace>
  <Namespace>System.Threading.Tasks</Namespace>
</Query>

/*
 * Test which SDK Message Processing Steps can be disabled - PARALLEL VERSION
 *
 * Based on Microsoft best practices for parallel Dataverse requests:
 * https://learn.microsoft.com/en-us/power-apps/developer/data-platform/send-parallel-requests
 *
 * Key optimizations:
 * 1. Parallel.ForEach with RecommendedDegreesOfParallelism
 * 2. Clone ServiceClient for each thread
 * 3. Disable affinity cookie to distribute across servers
 * 4. Connection pool optimizations
 * 5. No artificial delays - let service protection limits handle throttling
 */

void Main()
{
	// === CONFIGURATION ===
	var connectionString = "AuthType=OAuth;Url=https://org7a4a0326.crm.dynamics.com;AppId=51f81489-12ee-4a9e-aaae-a2591f45987d;RedirectUri=http://localhost;LoginPrompt=Auto";
	var outputPath = @"C:\VS\Power-Platform-Developer-Suite-plugin-registration\scripts\disableable-steps.json";
	var maxStepsToTest = -1; // -1 = ALL steps, or set a number for testing

	// === CONNECTION OPTIMIZATIONS (Microsoft recommended) ===
	// Increase min threads for faster connection ramping
	ThreadPool.SetMinThreads(100, 100);

	// Increase max connections from default of 2
	ServicePointManager.DefaultConnectionLimit = 65000;

	// Turn off Expect 100 Continue for reduced overhead
	ServicePointManager.Expect100Continue = false;

	// Disable Nagle Algorithm for reduced transmission overhead
	ServicePointManager.UseNagleAlgorithm = false;

	// === CONNECT ===
	Console.WriteLine("Connecting to Dataverse...");
	using var service = new ServiceClient(connectionString);

	if (!service.IsReady)
	{
		Console.WriteLine($"Failed to connect: {service.LastError}");
		return;
	}

	// Disable server affinity to distribute requests across servers
	service.EnableAffinityCookie = false;

	var recommendedParallelism = service.RecommendedDegreesOfParallelism;
	Console.WriteLine($"Server recommended parallelism: {recommendedParallelism}");

	// Override with higher parallelism - server recommendation is conservative
	var actualParallelism = 15;
	Console.WriteLine($"Using override parallelism: {actualParallelism}");

	// === QUERY ALL ENABLED STEPS ===
	Console.WriteLine("Querying enabled steps...");

	var query = new QueryExpression("sdkmessageprocessingstep")
	{
		ColumnSet = new ColumnSet(
			"sdkmessageprocessingstepid",
			"name",
			"statecode",
			"ismanaged",
			"iscustomizable",
			"customizationlevel",
			"ishidden",
			"stage",
			"mode",
			"rank"
		),
		Criteria = new FilterExpression
		{
			Conditions =
			{
				new ConditionExpression("statecode", ConditionOperator.Equal, 0) // Enabled
			}
		},
		LinkEntities =
		{
			new LinkEntity
			{
				LinkFromEntityName = "sdkmessageprocessingstep",
				LinkToEntityName = "plugintype",
				LinkFromAttributeName = "plugintypeid",
				LinkToAttributeName = "plugintypeid",
				JoinOperator = JoinOperator.LeftOuter,
				EntityAlias = "pt",
				Columns = new ColumnSet(
					"name",
					"ismanaged",
					"customizationlevel"
				),
				LinkEntities =
				{
					new LinkEntity
					{
						LinkFromEntityName = "plugintype",
						LinkToEntityName = "pluginassembly",
						LinkFromAttributeName = "pluginassemblyid",
						LinkToAttributeName = "pluginassemblyid",
						JoinOperator = JoinOperator.LeftOuter,
						EntityAlias = "asm",
						Columns = new ColumnSet(
							"name",
							"ismanaged",
							"customizationlevel",
							"iscustomizable",
							"ishidden"
						)
					}
				}
			},
			new LinkEntity
			{
				LinkFromEntityName = "sdkmessageprocessingstep",
				LinkToEntityName = "sdkmessage",
				LinkFromAttributeName = "sdkmessageid",
				LinkToAttributeName = "sdkmessageid",
				JoinOperator = JoinOperator.LeftOuter,
				EntityAlias = "msg",
				Columns = new ColumnSet("name")
			}
		}
	};

	// Retrieve ALL steps with pagination
	var steps = new List<Entity>();
	query.PageInfo = new PagingInfo { Count = 5000, PageNumber = 1 };

	while (true)
	{
		var results = service.RetrieveMultiple(query);
		steps.AddRange(results.Entities);
		Console.WriteLine($"Retrieved page {query.PageInfo.PageNumber}: {results.Entities.Count} steps (total: {steps.Count})");

		if (!results.MoreRecords)
			break;

		query.PageInfo.PageNumber++;
		query.PageInfo.PagingCookie = results.PagingCookie;
	}

	Console.WriteLine($"Found {steps.Count} total enabled steps");

	if (maxStepsToTest > 0 && steps.Count > maxStepsToTest)
	{
		Console.WriteLine($"Limiting to first {maxStepsToTest} steps");
		steps = steps.Take(maxStepsToTest).ToList();
	}

	// === TEST STEPS IN PARALLEL ===
	Console.WriteLine($"\nStarting parallel testing with {actualParallelism} concurrent threads...");

	var successResults = new ConcurrentBag<StepTestResult>(); // Only store successes
	var successCount = 0;
	var failCount = 0;
	var processedCount = 0;
	var startTime = DateTime.Now;
	var totalSteps = steps.Count;

	// Progress reporting timer
	var progressTimer = new Timer(_ =>
	{
		var processed = processedCount;
		if (processed == 0) return;

		var elapsed = DateTime.Now - startTime;
		var avgPerStep = elapsed.TotalMilliseconds / processed;
		var remaining = TimeSpan.FromMilliseconds(avgPerStep * (totalSteps - processed));
		var rate = processed / elapsed.TotalSeconds;

		Console.WriteLine($"Progress: {processed:N0}/{totalSteps:N0} ({100.0 * processed / totalSteps:F1}%) | " +
			$"Success: {successCount:N0} | Fail: {failCount:N0} | " +
			$"Rate: {rate:F1}/sec | ETA: {remaining:hh\\:mm\\:ss}");
	}, null, TimeSpan.FromSeconds(5), TimeSpan.FromSeconds(10));

	Parallel.ForEach(
		steps,
		new ParallelOptions { MaxDegreeOfParallelism = actualParallelism },
		// Thread-local init: clone the service client for each thread
		() => service.Clone(),
		// Body: test each step
		(step, loopState, index, threadLocalService) =>
		{
			var result = TestStep(step, threadLocalService);

			if (result.CanDisable)
			{
				successResults.Add(result); // Only store successes
				Interlocked.Increment(ref successCount);
			}
			else
			{
				Interlocked.Increment(ref failCount);
			}

			Interlocked.Increment(ref processedCount);

			return threadLocalService;
		},
		// Thread-local cleanup: dispose the cloned client
		(threadLocalService) => threadLocalService?.Dispose()
	);

	progressTimer.Dispose();

	var totalTime = DateTime.Now - startTime;
	Console.WriteLine($"\n=== COMPLETED in {totalTime:hh\\:mm\\:ss} ===");
	Console.WriteLine($"Average rate: {totalSteps / totalTime.TotalSeconds:F1} steps/sec");

	// === WRITE RESULTS (SUCCESSES ONLY) ===
	Console.WriteLine($"\nWriting SUCCESS results only... Success: {successCount}, Fail: {failCount}");

	// Convert to list and sort by step name for consistent output
	var sortedSuccesses = successResults.OrderBy(r => r.StepName).ToList();

	var json = JsonSerializer.Serialize(sortedSuccesses, new JsonSerializerOptions { WriteIndented = true });
	File.WriteAllText(outputPath, json);
	Console.WriteLine($"Results written to: {outputPath}");
	Console.WriteLine($"File contains {sortedSuccesses.Count} steps that CAN be disabled");

	// === SUMMARY ===
	PrintSuccessSummary(sortedSuccesses);
}

StepTestResult TestStep(Entity step, ServiceClient threadLocalService)
{
	var stepId = step.Id;
	var stepName = step.GetAttributeValue<string>("name") ?? "Unknown";

	var result = new StepTestResult
	{
		StepId = stepId.ToString(),
		StepName = stepName,

		// Step-level fields
		Step_IsManaged = step.GetAttributeValue<bool>("ismanaged"),
		Step_CustomizationLevel = step.GetAttributeValue<int>("customizationlevel"),
		Step_IsCustomizable = GetManagedPropertyValue(step, "iscustomizable"),
		Step_IsHidden = GetManagedPropertyValue(step, "ishidden"),
		Step_Stage = step.GetAttributeValue<OptionSetValue>("stage")?.Value ?? 0,
		Step_Mode = step.GetAttributeValue<OptionSetValue>("mode")?.Value ?? 0,

		// Plugin Type fields
		PluginType_Name = GetAliasedValue<string>(step, "pt.name"),
		PluginType_IsManaged = GetAliasedValue<bool>(step, "pt.ismanaged"),
		PluginType_CustomizationLevel = GetAliasedValue<int>(step, "pt.customizationlevel"),

		// Assembly fields
		Assembly_Name = GetAliasedValue<string>(step, "asm.name"),
		Assembly_IsManaged = GetAliasedValue<bool>(step, "asm.ismanaged"),
		Assembly_CustomizationLevel = GetAliasedValue<int>(step, "asm.customizationlevel"),
		Assembly_IsCustomizable = GetAliasedManagedPropertyValue(step, "asm.iscustomizable"),
		Assembly_IsHidden = GetAliasedManagedPropertyValue(step, "asm.ishidden"),

		// Message
		Message_Name = GetAliasedValue<string>(step, "msg.name")
	};

	// Try to disable
	try
	{
		var disableRequest = new Entity("sdkmessageprocessingstep", stepId);
		disableRequest["statecode"] = new OptionSetValue(1); // Disabled
		disableRequest["statuscode"] = new OptionSetValue(2); // Disabled
		threadLocalService.Update(disableRequest);

		// Success! Re-enable immediately
		var enableRequest = new Entity("sdkmessageprocessingstep", stepId);
		enableRequest["statecode"] = new OptionSetValue(0); // Enabled
		enableRequest["statuscode"] = new OptionSetValue(1); // Enabled
		threadLocalService.Update(enableRequest);

		result.CanDisable = true;
		result.Error = null;
	}
	catch (Exception ex)
	{
		result.CanDisable = false;
		result.Error = ex.Message;
	}

	return result;
}

void PrintSuccessSummary(List<StepTestResult> successes)
{
	Console.WriteLine("\n=== STEPS THAT CAN BE DISABLED ===");
	Console.WriteLine($"Total: {successes.Count}");

	if (successes.Count == 0)
	{
		Console.WriteLine("No steps found that can be disabled!");
		return;
	}

	Console.WriteLine("\n--- By Assembly ---");
	successes.GroupBy(r => r.Assembly_Name ?? "Unknown")
		.OrderByDescending(g => g.Count())
		.ToList()
		.ForEach(g => Console.WriteLine($"  {g.Key}: {g.Count()}"));

	Console.WriteLine("\n--- By Step_IsManaged ---");
	successes.GroupBy(r => r.Step_IsManaged)
		.ToList()
		.ForEach(g => Console.WriteLine($"  {g.Key}: {g.Count()}"));

	Console.WriteLine("\n--- By Step_IsCustomizable ---");
	successes.GroupBy(r => r.Step_IsCustomizable)
		.ToList()
		.ForEach(g => Console.WriteLine($"  {g.Key}: {g.Count()}"));

	Console.WriteLine("\n--- By Step_CustomizationLevel ---");
	successes.GroupBy(r => r.Step_CustomizationLevel)
		.ToList()
		.ForEach(g => Console.WriteLine($"  {g.Key}: {g.Count()}"));

	Console.WriteLine("\n--- By Assembly_IsManaged ---");
	successes.GroupBy(r => r.Assembly_IsManaged)
		.ToList()
		.ForEach(g => Console.WriteLine($"  {g.Key}: {g.Count()}"));

	Console.WriteLine("\n--- By Assembly_IsCustomizable ---");
	successes.GroupBy(r => r.Assembly_IsCustomizable)
		.ToList()
		.ForEach(g => Console.WriteLine($"  {g.Key}: {g.Count()}"));

	Console.WriteLine("\n--- By Assembly_IsHidden ---");
	successes.GroupBy(r => r.Assembly_IsHidden)
		.ToList()
		.ForEach(g => Console.WriteLine($"  {g.Key}: {g.Count()}"));

	Console.WriteLine("\n--- By Assembly_CustomizationLevel ---");
	successes.GroupBy(r => r.Assembly_CustomizationLevel)
		.ToList()
		.ForEach(g => Console.WriteLine($"  {g.Key}: {g.Count()}"));

	Console.WriteLine("\n--- Sample Step Names ---");
	successes.Take(20).ToList()
		.ForEach(s => Console.WriteLine($"  {s.StepName}"));
}

bool? GetManagedPropertyValue(Entity entity, string attributeName)
{
	var value = entity.GetAttributeValue<BooleanManagedProperty>(attributeName);
	return value?.Value;
}

bool? GetAliasedManagedPropertyValue(Entity entity, string aliasedName)
{
	if (entity.Contains(aliasedName))
	{
		var aliased = entity[aliasedName] as AliasedValue;
		if (aliased?.Value is BooleanManagedProperty bmp)
		{
			return bmp.Value;
		}
	}
	return null;
}

T GetAliasedValue<T>(Entity entity, string aliasedName)
{
	if (entity.Contains(aliasedName))
	{
		var aliased = entity[aliasedName] as AliasedValue;
		if (aliased?.Value is T value)
		{
			return value;
		}
	}
	return default;
}

class StepTestResult
{
	public string StepId { get; set; }
	public string StepName { get; set; }
	public bool CanDisable { get; set; }
	public string Error { get; set; }

	// Step-level
	public bool Step_IsManaged { get; set; }
	public int Step_CustomizationLevel { get; set; }
	public bool? Step_IsCustomizable { get; set; }
	public bool? Step_IsHidden { get; set; }
	public int Step_Stage { get; set; }
	public int Step_Mode { get; set; }

	// Plugin Type
	public string PluginType_Name { get; set; }
	public bool PluginType_IsManaged { get; set; }
	public int PluginType_CustomizationLevel { get; set; }

	// Assembly
	public string Assembly_Name { get; set; }
	public bool Assembly_IsManaged { get; set; }
	public int Assembly_CustomizationLevel { get; set; }
	public bool? Assembly_IsCustomizable { get; set; }
	public bool? Assembly_IsHidden { get; set; }

	// Message
	public string Message_Name { get; set; }
}
