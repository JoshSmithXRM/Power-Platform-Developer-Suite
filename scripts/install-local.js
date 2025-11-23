#!/usr/bin/env node

/**
 * Installs the local .vsix extension in VS Code.
 * Reads the version from package.json to construct the filename.
 */

const { execSync } = require('child_process');
const { readFileSync, existsSync } = require('fs');
const { join } = require('path');

// Read package.json to get version
const packageJson = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));
const version = packageJson.version;
const extensionName = packageJson.name;

// Construct .vsix filename
const vsixFile = `${extensionName}-${version}.vsix`;
const vsixPath = join(__dirname, '..', vsixFile);

// Check if .vsix exists
if (!existsSync(vsixPath)) {
	console.error(`Error: ${vsixFile} not found. Run 'npm run vsce-package' first.`);
	process.exit(1);
}

// Install extension
console.log(`Installing ${vsixFile}...`);
try {
	execSync(`code --install-extension "${vsixPath}" --force`, { stdio: 'inherit' });
	console.log('✅ Extension installed successfully!');
} catch (error) {
	console.error('❌ Installation failed:', error.message);
	process.exit(1);
}
