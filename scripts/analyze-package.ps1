#!/usr/bin/env pwsh

# Package Analysis Script - Analyze VSIX contents and size
param(
    [string]$VsixFile = "",
    [switch]$Detailed
)

# Get the latest VSIX file if not specified
if (-not $VsixFile) {
    $PackageJson = Get-Content "package.json" | ConvertFrom-Json
    $Version = $PackageJson.version
    $VsixFile = "dynamics-devtools-$Version.vsix"
}

if (-not (Test-Path $VsixFile)) {
    Write-Host "❌ VSIX file not found: $VsixFile" -ForegroundColor Red
    Write-Host "💡 Run 'npm run package' first" -ForegroundColor Yellow
    exit 1
}

Write-Host "📊 Package Analysis: $VsixFile" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

# Get file size
$FileSize = (Get-Item $VsixFile).Length
$FileSizeMB = $FileSize / 1MB
Write-Host "📁 Total Size: $($FileSizeMB.ToString('F2')) MB ($FileSize bytes)" -ForegroundColor Green

# Extract and analyze contents (VSIX is a ZIP file)
$TempDir = Join-Path $env:TEMP "vsix-analysis"
if (Test-Path $TempDir) { Remove-Item $TempDir -Recurse -Force }
New-Item $TempDir -ItemType Directory | Out-Null

# Extract VSIX
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::ExtractToDirectory($VsixFile, $TempDir)

Write-Host "📂 Contents Analysis:" -ForegroundColor Yellow

# Analyze directory sizes
$ExtensionDir = Join-Path $TempDir "extension"
if (Test-Path $ExtensionDir) {
    $Directories = Get-ChildItem $ExtensionDir -Directory
    foreach ($Dir in $Directories) {
        $DirSize = (Get-ChildItem $Dir.FullName -Recurse -File | Measure-Object -Property Length -Sum).Sum
        $DirSizeMB = $DirSize / 1MB
        Write-Host "  📁 $($Dir.Name): $($DirSizeMB.ToString('F2')) MB" -ForegroundColor White
    }
    
    # Count files
    $FileCount = (Get-ChildItem $ExtensionDir -Recurse -File).Count
    Write-Host "📄 Total Files: $FileCount" -ForegroundColor Green
    
    if ($Detailed) {
        Write-Host "`n🔍 Detailed File Analysis:" -ForegroundColor Yellow
        
        # Large files
        Write-Host "  📋 Files > 100KB:" -ForegroundColor White
        Get-ChildItem $ExtensionDir -Recurse -File | 
            Where-Object { $_.Length -gt 100KB } | 
            Sort-Object Length -Descending | 
            ForEach-Object { 
                $SizeKB = $_.Length / 1KB
                Write-Host "    $($_.Name): $($SizeKB.ToString('F1')) KB" -ForegroundColor Gray
            }
        
        # File type breakdown
        Write-Host "  📋 File Types:" -ForegroundColor White
        Get-ChildItem $ExtensionDir -Recurse -File | 
            Group-Object Extension | 
            Sort-Object Count -Descending | 
            ForEach-Object { 
                $TotalSize = ($_.Group | Measure-Object -Property Length -Sum).Sum / 1KB
                Write-Host "    $($_.Name): $($_.Count) files ($($TotalSize.ToString('F1')) KB)" -ForegroundColor Gray
            }
    }
}

# Check for missing webview resources
Write-Host "`n🔍 Webview Resource Check:" -ForegroundColor Yellow
$WebviewPaths = @(
    "extension/resources/webview/css/panel-base.css",
    "extension/resources/webview/css/table.css", 
    "extension/resources/webview/js/panel-utils.js",
    "extension/resources/webview/js/table-utils.js",
    "extension/resources/webview/js/environment-selector-utils.js"
)

foreach ($Path in $WebviewPaths) {
    $FullPath = Join-Path $TempDir $Path
    if (Test-Path $FullPath) {
        Write-Host "  ✅ $Path" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $Path (MISSING)" -ForegroundColor Red
    }
}

# Cleanup
Remove-Item $TempDir -Recurse -Force

Write-Host "`n💡 Package Analysis Complete" -ForegroundColor Cyan
Write-Host "To test this package: npm run install-local" -ForegroundColor Yellow
