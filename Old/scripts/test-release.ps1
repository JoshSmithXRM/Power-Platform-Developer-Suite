#!/usr/bin/env pwsh

# Release Testing Script for Power Platform Developer Suite Extension
# This script simulates the exact user experience of installing and using the extension

param(
    [switch]$Clean,           # Uninstall existing version first
    [switch]$NewWindow,       # Open in new VS Code window
    [switch]$Verbose          # Enable verbose output
)

Write-Host "🔧 Power Platform Developer Suite - Release Testing Script" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# Configuration
$ExtensionId = "joshsmithxrm.power-platform-developer-suite"
$PackageJson = Get-Content "package.json" | ConvertFrom-Json
$Version = $PackageJson.version
$VsixFile = "power-platform-developer-suite-$Version.vsix"

if ($Verbose) {
    Write-Host "Extension ID: $ExtensionId" -ForegroundColor Yellow
    Write-Host "Version: $Version" -ForegroundColor Yellow
    Write-Host "VSIX File: $VsixFile" -ForegroundColor Yellow
}

# Step 1: Clean installation if requested
if ($Clean) {
    Write-Host "🧹 Uninstalling existing extension..." -ForegroundColor Yellow
    & code --uninstall-extension $ExtensionId
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Existing extension uninstalled" -ForegroundColor Green
    } else {
        Write-Host "⚠️  No existing extension found or uninstall failed" -ForegroundColor Yellow
    }
}

# Step 2: Build the extension
Write-Host "🔨 Building extension..." -ForegroundColor Yellow
& npm.cmd run compile
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Build completed" -ForegroundColor Green

# Step 3: Package the extension
Write-Host "📦 Packaging extension..." -ForegroundColor Yellow
& vsce package
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Packaging failed!" -ForegroundColor Red
    exit 1
}

if (Test-Path $VsixFile) {
    $FileSize = (Get-Item $VsixFile).Length / 1MB
    Write-Host "✅ Package created: $VsixFile ($($FileSize.ToString('F2')) MB)" -ForegroundColor Green
} else {
    Write-Host "❌ Package file not found!" -ForegroundColor Red
    exit 1
}

# Step 4: Install the packaged extension
Write-Host "💿 Installing packaged extension..." -ForegroundColor Yellow
& code --install-extension $VsixFile --force
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Extension installed successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Installation failed!" -ForegroundColor Red
    exit 1
}

# Step 5: Launch VS Code for testing
if ($NewWindow) {
    Write-Host "🚀 Opening VS Code in new window for testing..." -ForegroundColor Yellow
    & code --new-window
} else {
    Write-Host "🚀 Opening current VS Code window for testing..." -ForegroundColor Yellow
    & code .
}

Write-Host ""
Write-Host "🎯 Testing Checklist:" -ForegroundColor Cyan
Write-Host "=====================" -ForegroundColor Cyan
Write-Host "□ Extension appears in sidebar (🔧 icon)" -ForegroundColor White
Write-Host "□ Tools section shows all panels" -ForegroundColor White
Write-Host "□ Environment section loads" -ForegroundColor White
Write-Host "□ Add Environment works" -ForegroundColor White
Write-Host "□ Environment selector works in panels" -ForegroundColor White
Write-Host "□ No console errors in Developer Tools" -ForegroundColor White
Write-Host "□ All panels open without 404 errors" -ForegroundColor White
Write-Host ""
Write-Host "💡 To check for errors:" -ForegroundColor Yellow
Write-Host "   Help → Toggle Developer Tools → Console tab" -ForegroundColor Gray
Write-Host ""
Write-Host "🔍 Extension installed as: $ExtensionId v$Version" -ForegroundColor Green
