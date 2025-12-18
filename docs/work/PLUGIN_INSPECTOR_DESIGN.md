# Plugin Inspector Tool - Design Document

## Overview

A .NET console application that analyzes plugin DLLs to discover `IPlugin` and `CodeActivity` implementations. Bundled with the VS Code extension to enable automatic plugin type discovery during assembly registration.

## Why This Is Needed

1. **Dataverse does NOT auto-discover plugin types** - Must explicitly register each `plugintype` record
2. **TypeScript cannot do .NET reflection** - No mature JS libraries for parsing .NET metadata
3. **Manual entry is unacceptable UX** - Some assemblies have 50+ plugin types
4. **Mono.Cecil enables metadata-only inspection** - No dependency loading required

## Project Structure

```
Power-Platform-Developer-Suite/
├── tools/                              # Native tools (new directory)
│   └── PluginInspector/
│       ├── PluginInspector.csproj     # .NET 6 console app
│       ├── Program.cs                  # Entry point
│       ├── Models/
│       │   └── InspectionResult.cs    # Output model
│       └── Services/
│           └── AssemblyInspector.cs   # Mono.Cecil inspection logic
│
├── resources/
│   └── tools/                          # Bundled tool outputs (new)
│       └── PluginInspector.dll        # Published DLL (copied during build)
│
├── src/features/pluginRegistration/
│   └── infrastructure/
│       └── services/
│           └── PluginInspectorService.ts  # TS service to invoke tool
```

## .NET Tool Specification

### Input
```bash
dotnet PluginInspector.dll <path-to-plugin.dll>
```

### Output (JSON to stdout)
```json
{
  "success": true,
  "assemblyName": "PPDSDemo.Plugins",
  "assemblyVersion": "1.0.0.0",
  "types": [
    {
      "typeName": "PPDSDemo.Plugins.PreAccountCreate",
      "displayName": "PreAccountCreate",
      "isWorkflowActivity": false
    },
    {
      "typeName": "PPDSDemo.Plugins.CustomCodeActivity",
      "displayName": "CustomCodeActivity",
      "isWorkflowActivity": true
    }
  ],
  "error": null
}
```

### Error Output
```json
{
  "success": false,
  "assemblyName": null,
  "assemblyVersion": null,
  "types": [],
  "error": "File not found: C:\\path\\to\\plugin.dll"
}
```

### Exit Codes
- `0` - Success (even if no types found)
- `1` - Error (invalid DLL, file not found, etc.)

## .NET Implementation

### PluginInspector.csproj
```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net8.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
    <PublishSingleFile>false</PublishSingleFile>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Mono.Cecil" Version="0.11.5" />
  </ItemGroup>
</Project>
```

### Core Logic (AssemblyInspector.cs)
```csharp
using Mono.Cecil;

public class AssemblyInspector
{
    private const string IPluginInterface = "Microsoft.Xrm.Sdk.IPlugin";
    private const string CodeActivityBase = "System.Activities.CodeActivity";

    public InspectionResult Inspect(string dllPath)
    {
        var assembly = AssemblyDefinition.ReadAssembly(dllPath);

        var types = assembly.MainModule.Types
            .Where(t => !t.IsAbstract && !t.IsInterface)
            .Where(t => ImplementsIPlugin(t) || InheritsFromCodeActivity(t))
            .Select(t => new PluginTypeInfo
            {
                TypeName = t.FullName,
                DisplayName = t.Name,
                IsWorkflowActivity = InheritsFromCodeActivity(t)
            })
            .ToList();

        return new InspectionResult
        {
            Success = true,
            AssemblyName = assembly.Name.Name,
            AssemblyVersion = assembly.Name.Version.ToString(),
            Types = types
        };
    }

    private bool ImplementsIPlugin(TypeDefinition type)
    {
        return type.Interfaces.Any(i =>
            i.InterfaceType.FullName == IPluginInterface);
    }

    private bool InheritsFromCodeActivity(TypeDefinition type)
    {
        var current = type.BaseType;
        while (current != null)
        {
            if (current.FullName == CodeActivityBase)
                return true;
            try
            {
                current = current.Resolve()?.BaseType;
            }
            catch
            {
                break; // Can't resolve - external assembly
            }
        }
        return false;
    }
}
```

## TypeScript Integration

### PluginInspectorService.ts
```typescript
import * as cp from 'child_process';
import * as path from 'path';
import type { ILogger } from '../../../../infrastructure/logging/ILogger';

export interface PluginTypeInfo {
  typeName: string;
  displayName: string;
  isWorkflowActivity: boolean;
}

export interface InspectionResult {
  success: boolean;
  assemblyName: string | null;
  assemblyVersion: string | null;
  types: PluginTypeInfo[];
  error: string | null;
}

export class PluginInspectorService {
  private readonly toolPath: string;

  constructor(
    extensionPath: string,
    private readonly logger: ILogger
  ) {
    this.toolPath = path.join(
      extensionPath,
      'resources',
      'tools',
      'PluginInspector.dll'
    );
  }

  public async inspect(dllPath: string): Promise<InspectionResult> {
    this.logger.debug('Inspecting plugin assembly', { dllPath });

    return new Promise((resolve, reject) => {
      const proc = cp.spawn('dotnet', [this.toolPath, dllPath]);

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => { stdout += data; });
      proc.stderr.on('data', (data) => { stderr += data; });

      proc.on('error', (err) => {
        if (err.message.includes('ENOENT')) {
          reject(new Error(
            '.NET runtime not found. Please install .NET 6.0 or later.'
          ));
        } else {
          reject(err);
        }
      });

      proc.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(stdout) as InspectionResult;
            this.logger.debug('Inspection complete', {
              typesFound: result.types.length
            });
            resolve(result);
          } catch (e) {
            reject(new Error(`Failed to parse inspector output: ${stdout}`));
          }
        } else {
          reject(new Error(stderr || `Inspector exited with code ${code}`));
        }
      });
    });
  }
}
```

## Build Integration

### New npm Scripts (package.json)
```json
{
  "scripts": {
    "build:tools": "dotnet publish tools/PluginInspector -c Release -o resources/tools",
    "build:tools:restore": "dotnet restore tools/PluginInspector",
    "compile": "npm run build:tools && npm run lint:all && npm test && npm run build:extension && npm run build:webview",
    "compile:fast": "npm run build:tools && npm run build:extension && npm run build:webview",
    "package": "npm run build:tools && npm run lint:all && webpack ..."
  }
}
```

### .vscodeignore Updates
```gitignore
# Include bundled tools (DO NOT ignore)
# resources/tools/**  <- Remove if present

# Exclude tool source code
tools/**
```

### .gitignore Updates
```gitignore
# .NET build artifacts
tools/**/bin/
tools/**/obj/

# Don't ignore the published tool in resources
!resources/tools/
```

## Packaging Considerations

### Framework-Dependent Deployment (Recommended)
- **Output size:** ~1MB (DLL + deps)
- **Requires:** .NET 6.0+ runtime on user's machine
- **Rationale:** All plugin developers have .NET SDK installed

### Self-Contained Deployment (Alternative)
- **Output size:** ~30MB per platform
- **Requires:** Nothing (runtime bundled)
- **When to use:** If we find users without .NET runtime

## Registration Flow Changes

### Updated Assembly Registration Flow
```
1. User clicks "Register" → "New Assembly..."
2. File picker opens for .dll
3. Extension invokes PluginInspector on selected DLL
4. Modal shows:
   - Assembly name (read-only)
   - Solution selector (optional)
   - Discovered plugin types (checkboxes, all selected by default)
5. User clicks Register
6. Extension:
   a. POST to pluginassemblies → get assemblyId
   b. For each selected type: POST to plugintypes with assemblyId
7. Refresh tree
```

### Modal Wireframe
```
┌─────────────────────────────────────────────────────────┐
│ Register Plugin Assembly                            [X] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ File: PPDSDemo.Plugins.dll                              │
│                                                         │
│ Assembly Name: PPDSDemo.Plugins                         │
│                                                         │
│ Solution: [None (do not add to solution)     ▼]         │
│                                                         │
│ ─────────────────────────────────────────────────────── │
│ Plugin Types (3 found)                    [Select All]  │
│                                                         │
│ ☑ PPDSDemo.Plugins.PreAccountCreate                     │
│ ☑ PPDSDemo.Plugins.PostAccountUpdate                    │
│ ☑ PPDSDemo.Plugins.ValidateContactEmail                 │
│                                                         │
│ ─────────────────────────────────────────────────────── │
│                                                         │
│                              [Cancel]  [Register]       │
└─────────────────────────────────────────────────────────┘
```

## Error Handling

| Scenario | Handling |
|----------|----------|
| .NET not installed | Show error: "Please install .NET 6.0+" with link |
| Tool DLL not found | Log error, show "Extension installation corrupted" |
| Invalid/corrupt DLL | Show error from tool output |
| No types found | Show warning, allow registration anyway |
| Tool timeout (>30s) | Kill process, show timeout error |

## Testing Strategy

### .NET Tool Tests
- Unit tests with sample DLLs
- Test cases: valid plugin, workflow activity, mixed, empty, invalid

### TypeScript Integration Tests
- Mock child_process.spawn
- Test success, error, timeout scenarios

### E2E Tests
- Full flow with real DLL
- Verify types appear in tree after registration

## Implementation Order

1. **Create .NET project** (2h)
   - Project structure
   - Mono.Cecil integration
   - JSON output

2. **Build integration** (1h)
   - npm scripts
   - .vscodeignore/.gitignore updates

3. **TypeScript service** (2h)
   - PluginInspectorService
   - Error handling

4. **UI updates** (3h)
   - Update modal to show types
   - Checkbox selection
   - Register types after assembly

5. **Testing** (2h)
   - Unit tests for service
   - Manual E2E testing

**Total: ~10 hours**

## Open Questions

1. Should we support .NET Framework 4.x assemblies? (Mono.Cecil handles both)
2. Should workflow activities be registered differently?
3. Do we need to handle plugin base classes (abstract classes users extend)?
