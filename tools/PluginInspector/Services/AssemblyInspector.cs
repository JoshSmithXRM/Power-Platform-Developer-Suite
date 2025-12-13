using Mono.Cecil;
using PluginInspector.Models;

namespace PluginInspector.Services;

/// <summary>
/// Inspects .NET assemblies to discover IPlugin and CodeActivity implementations.
/// Uses Mono.Cecil for metadata-only inspection (no assembly loading required).
/// </summary>
public class AssemblyInspector
{
    // Dataverse plugin interface
    private const string IPluginInterface = "Microsoft.Xrm.Sdk.IPlugin";

    // Workflow activity base classes (checking multiple for compatibility)
    private static readonly string[] WorkflowActivityBaseClasses = new[]
    {
        "System.Activities.CodeActivity",
        "System.Activities.Activity",
        "Microsoft.Xrm.Sdk.Workflow.CodeActivity"
    };

    /// <summary>
    /// Inspect an assembly and return all plugin types and workflow activities.
    /// </summary>
    /// <param name="dllPath">Path to the .NET assembly (.dll)</param>
    /// <returns>Inspection result with discovered types</returns>
    public InspectionResult Inspect(string dllPath)
    {
        if (!File.Exists(dllPath))
        {
            return InspectionResult.CreateError($"File not found: {dllPath}");
        }

        try
        {
            // Read assembly metadata (doesn't load dependencies)
            var readerParams = new ReaderParameters
            {
                ReadSymbols = false,
                ReadWrite = false
            };

            using var assembly = AssemblyDefinition.ReadAssembly(dllPath, readerParams);

            var types = new List<PluginTypeInfo>();

            foreach (var type in assembly.MainModule.Types)
            {
                // Skip abstract classes, interfaces, and compiler-generated types
                if (type.IsAbstract || type.IsInterface || type.Name.StartsWith("<"))
                    continue;

                // Check for IPlugin implementation
                if (ImplementsIPlugin(type))
                {
                    types.Add(new PluginTypeInfo
                    {
                        TypeName = type.FullName,
                        DisplayName = type.Name,
                        TypeKind = "Plugin"
                    });
                    continue;
                }

                // Check for CodeActivity inheritance
                if (InheritsFromWorkflowActivity(type))
                {
                    types.Add(new PluginTypeInfo
                    {
                        TypeName = type.FullName,
                        DisplayName = type.Name,
                        TypeKind = "WorkflowActivity"
                    });
                }
            }

            // Also check nested types (some developers nest plugin classes)
            foreach (var type in assembly.MainModule.Types)
            {
                foreach (var nestedType in type.NestedTypes)
                {
                    if (nestedType.IsAbstract || nestedType.IsInterface || nestedType.Name.StartsWith("<"))
                        continue;

                    if (ImplementsIPlugin(nestedType))
                    {
                        types.Add(new PluginTypeInfo
                        {
                            TypeName = nestedType.FullName,
                            DisplayName = nestedType.Name,
                            TypeKind = "Plugin"
                        });
                    }
                    else if (InheritsFromWorkflowActivity(nestedType))
                    {
                        types.Add(new PluginTypeInfo
                        {
                            TypeName = nestedType.FullName,
                            DisplayName = nestedType.Name,
                            TypeKind = "WorkflowActivity"
                        });
                    }
                }
            }

            // Sort by type kind (Plugins first), then by name
            types = types
                .OrderBy(t => t.TypeKind == "Plugin" ? 0 : 1)
                .ThenBy(t => t.TypeName)
                .ToList();

            return InspectionResult.CreateSuccess(
                assembly.Name.Name,
                assembly.Name.Version?.ToString() ?? "0.0.0.0",
                types
            );
        }
        catch (BadImageFormatException)
        {
            return InspectionResult.CreateError(
                "Invalid assembly format. The file is not a valid .NET assembly.");
        }
        catch (Exception ex)
        {
            return InspectionResult.CreateError($"Failed to inspect assembly: {ex.Message}");
        }
    }

    /// <summary>
    /// Check if a type directly implements IPlugin interface.
    /// </summary>
    private bool ImplementsIPlugin(TypeDefinition type)
    {
        // Check direct interface implementations
        foreach (var iface in type.Interfaces)
        {
            if (iface.InterfaceType.FullName == IPluginInterface)
                return true;
        }

        // Check base type's interfaces (for types that extend a base plugin class)
        var baseType = type.BaseType;
        while (baseType != null)
        {
            try
            {
                var resolvedBase = baseType.Resolve();
                if (resolvedBase == null)
                    break;

                foreach (var iface in resolvedBase.Interfaces)
                {
                    if (iface.InterfaceType.FullName == IPluginInterface)
                        return true;
                }

                baseType = resolvedBase.BaseType;
            }
            catch
            {
                // Can't resolve base type (external assembly) - stop traversing
                break;
            }
        }

        return false;
    }

    /// <summary>
    /// Check if a type inherits from a workflow activity base class.
    /// </summary>
    private bool InheritsFromWorkflowActivity(TypeDefinition type)
    {
        var baseType = type.BaseType;

        while (baseType != null)
        {
            // Check if this base type is a workflow activity class
            if (WorkflowActivityBaseClasses.Contains(baseType.FullName))
                return true;

            try
            {
                var resolvedBase = baseType.Resolve();
                if (resolvedBase == null)
                    break;

                baseType = resolvedBase.BaseType;
            }
            catch
            {
                // Can't resolve base type (external assembly) - stop traversing
                break;
            }
        }

        return false;
    }
}
