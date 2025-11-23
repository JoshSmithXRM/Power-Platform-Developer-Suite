#!/usr/bin/env node

/**
 * Installs the most recently created .vsix extension in VS Code.
 * Finds the newest .vsix file in the project root.
 */

const { execSync } = require('child_process');
const { readdirSync, statSync, existsSync } = require('fs');
const { join } = require('path');

const ROOT_DIR = join(__dirname, '..');

/**
 * Finds the most recently created .vsix file.
 * @returns {string|null} Path to the newest .vsix file, or null if none found
 */
function findNewestVsix() {
	const files = readdirSync(ROOT_DIR)
		.filter(file => file.endsWith('.vsix'))
		.map(file => ({
			name: file,
			path: join(ROOT_DIR, file),
			time: statSync(join(ROOT_DIR, file)).mtime.getTime()
		}))
		.sort((a, b) => b.time - a.time); // Sort by modification time, newest first

	return files.length > 0 ? files[0] : null;
}

// Find newest .vsix
const vsixInfo = findNewestVsix();

if (!vsixInfo) {
	console.error('❌ Error: No .vsix file found. Run \'npm run vsce-package\' first.');
	process.exit(1);
}

// Install extension
console.log(`Installing ${vsixInfo.name}...`);
try {
	execSync(`code --install-extension "${vsixInfo.path}" --force`, { stdio: 'inherit' });
	console.log('✅ Extension installed successfully!');
} catch (error) {
	console.error('❌ Installation failed:', error.message);
	process.exit(1);
}
