<Query Kind="Program">
  <NuGetReference>Microsoft.PowerPlatform.Dataverse.Client</NuGetReference>
  <Namespace>Microsoft.PowerPlatform.Dataverse.Client</Namespace>
  <Namespace>Microsoft.Xrm.Sdk</Namespace>
  <Namespace>Microsoft.Xrm.Sdk.Query</Namespace>
  <Namespace>System.Text.Json</Namespace>
</Query>

/*
 * Test which SDK Message Processing Steps can be disabled
 *
 * This script iterates through all enabled steps, attempts to disable each one,
 * and records the result. Steps that are successfully disabled are immediately
 * re-enabled to avoid breaking the system.
 *
 * Output: JSON file with all steps and whether they can be disabled
 */

void Main()
{
	// === CONFIGURATION ===
	var connectionString = "AuthType=OAuth;Url=https://org7a4a0326.crm.dynamics.com;AppId=51f81489-12ee-4a9e-aaae-a2591f45987d;RedirectUri=http://localhost;LoginPrompt=Auto";
	var outputPath = @"C:\VS\Power-Platform-Developer-Suite-plugin-registration\scripts\disable-test-results.json";
	var maxStepsToTest = -1; // Process ALL steps
	var delayBetweenStepsMs = 100; // Throttle to avoid rate limiting

	// === CONNECT ===
	Console.WriteLine("Connecting to Dataverse...");
	using var service = new ServiceClient(connectionString);

	if (!service.IsReady)
	{
		Console.WriteLine($"Failed to connect: {service.LastError}");
		return;
	}
	Console.WriteLine("Connected successfully!");

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

	// === TEST EACH STEP ===
	var testResults = new List<StepTestResult>();
	var successCount = 0;
	var failCount = 0;
	var startTime = DateTime.Now;

	foreach (var step in steps)
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
			service.Update(disableRequest);

			// Success! Re-enable immediately
			var enableRequest = new Entity("sdkmessageprocessingstep", stepId);
			enableRequest["statecode"] = new OptionSetValue(0); // Enabled
			enableRequest["statuscode"] = new OptionSetValue(1); // Enabled
			service.Update(enableRequest);

			result.CanDisable = true;
			result.Error = null;
			successCount++;
		}
		catch (Exception ex)
		{
			result.CanDisable = false;
			result.Error = ex.Message;
			failCount++;
		}

		testResults.Add(result);

		// Progress with ETA
		if (testResults.Count % 100 == 0)
		{
			var elapsed = DateTime.Now - startTime;
			var avgPerStep = elapsed.TotalMilliseconds / testResults.Count;
			var remaining = TimeSpan.FromMilliseconds(avgPerStep * (steps.Count - testResults.Count));
			Console.WriteLine($"Tested {testResults.Count}/{steps.Count} steps... (Success: {successCount}, Fail: {failCount}) - ETA: {remaining:hh\\:mm\\:ss}");
		}

		// Throttle
		if (delayBetweenStepsMs > 0)
		{
			Thread.Sleep(delayBetweenStepsMs);
		}
	}

	// === WRITE RESULTS ===
	Console.WriteLine($"\nDone! Success: {successCount}, Fail: {failCount}");

	var json = JsonSerializer.Serialize(testResults, new JsonSerializerOptions { WriteIndented = true });
	File.WriteAllText(outputPath, json);
	Console.WriteLine($"Results written to: {outputPath}");

	// === SUMMARY ===
	Console.WriteLine("\n=== SUMMARY ===");
	Console.WriteLine($"Total tested: {testResults.Count}");
	Console.WriteLine($"Can disable: {successCount}");
	Console.WriteLine($"Cannot disable: {failCount}");

	// Show some patterns
	var cannotDisable = testResults.Where(r => !r.CanDisable).ToList();
	Console.WriteLine($"\n=== STEPS THAT CANNOT BE DISABLED ({cannotDisable.Count}) ===");

	Console.WriteLine("\nBy Assembly:");
	cannotDisable.GroupBy(r => r.Assembly_Name ?? "Unknown")
		.OrderByDescending(g => g.Count())
		.Take(20)
		.ToList()
		.ForEach(g => Console.WriteLine($"  {g.Key}: {g.Count()}"));

	Console.WriteLine("\nBy Step_IsCustomizable:");
	cannotDisable.GroupBy(r => r.Step_IsCustomizable)
		.ToList()
		.ForEach(g => Console.WriteLine($"  {g.Key}: {g.Count()}"));

	Console.WriteLine("\nBy Assembly_IsHidden:");
	cannotDisable.GroupBy(r => r.Assembly_IsHidden)
		.ToList()
		.ForEach(g => Console.WriteLine($"  {g.Key}: {g.Count()}"));

	Console.WriteLine("\nBy Step_CustomizationLevel:");
	cannotDisable.GroupBy(r => r.Step_CustomizationLevel)
		.ToList()
		.ForEach(g => Console.WriteLine($"  {g.Key}: {g.Count()}"));
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
