using System.Text.Json;
using PluginInspector.Models;
using PluginInspector.Services;

namespace PluginInspector;

/// <summary>
/// Plugin Inspector Tool
///
/// Analyzes .NET plugin assemblies to discover IPlugin and CodeActivity implementations.
/// Used by the Power Platform Developer Suite VS Code extension.
///
/// Usage: dotnet PluginInspector.dll <path-to-assembly.dll>
///
/// Output: JSON to stdout with discovered types
/// Exit codes:
///   0 = Success (even if no types found)
///   1 = Error (invalid args, file not found, invalid assembly)
/// </summary>
public class Program
{
    public static int Main(string[] args)
    {
        // JSON serializer options for consistent output
        var jsonOptions = new JsonSerializerOptions
        {
            WriteIndented = false,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };

        // Validate arguments
        if (args.Length == 0)
        {
            var error = InspectionResult.CreateError(
                "Usage: dotnet PluginInspector.dll <path-to-assembly.dll>");
            Console.WriteLine(JsonSerializer.Serialize(error, jsonOptions));
            return 1;
        }

        var dllPath = args[0];

        // Handle quoted paths (VS Code sometimes passes them)
        dllPath = dllPath.Trim('"', '\'');

        // Inspect the assembly
        var inspector = new AssemblyInspector();
        var result = inspector.Inspect(dllPath);

        // Output JSON result
        Console.WriteLine(JsonSerializer.Serialize(result, jsonOptions));

        // Return appropriate exit code
        return result.Success ? 0 : 1;
    }
}
