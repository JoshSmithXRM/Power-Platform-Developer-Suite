using System.Text.Json.Serialization;

namespace PluginInspector.Models;

/// <summary>
/// Result of inspecting a plugin assembly.
/// Serialized to JSON for consumption by the VS Code extension.
/// </summary>
public class InspectionResult
{
    [JsonPropertyName("success")]
    public bool Success { get; set; }

    [JsonPropertyName("assemblyName")]
    public string? AssemblyName { get; set; }

    [JsonPropertyName("assemblyVersion")]
    public string? AssemblyVersion { get; set; }

    [JsonPropertyName("types")]
    public List<PluginTypeInfo> Types { get; set; } = new();

    [JsonPropertyName("error")]
    public string? Error { get; set; }

    public static InspectionResult CreateSuccess(
        string assemblyName,
        string assemblyVersion,
        List<PluginTypeInfo> types)
    {
        return new InspectionResult
        {
            Success = true,
            AssemblyName = assemblyName,
            AssemblyVersion = assemblyVersion,
            Types = types,
            Error = null
        };
    }

    public static InspectionResult CreateError(string error)
    {
        return new InspectionResult
        {
            Success = false,
            AssemblyName = null,
            AssemblyVersion = null,
            Types = new List<PluginTypeInfo>(),
            Error = error
        };
    }
}

/// <summary>
/// Information about a discovered plugin or workflow activity type.
/// </summary>
public class PluginTypeInfo
{
    /// <summary>
    /// Fully qualified type name (e.g., "PPDSDemo.Plugins.PreAccountCreate").
    /// This is what gets registered as the plugintype.typename in Dataverse.
    /// </summary>
    [JsonPropertyName("typeName")]
    public string TypeName { get; set; } = string.Empty;

    /// <summary>
    /// Short display name (e.g., "PreAccountCreate").
    /// Used for UI display.
    /// </summary>
    [JsonPropertyName("displayName")]
    public string DisplayName { get; set; } = string.Empty;

    /// <summary>
    /// Type classification: "Plugin" or "WorkflowActivity".
    /// </summary>
    [JsonPropertyName("typeKind")]
    public string TypeKind { get; set; } = "Plugin";
}
