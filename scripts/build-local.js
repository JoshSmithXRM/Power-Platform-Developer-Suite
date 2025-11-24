#!/usr/bin/env node

/**
 * Builds and installs a local development version of the extension.
 *
 * This script:
 * 1. Reads the current version from package.json (e.g., "0.1.1")
 * 2. Increments the dev counter from .dev-version file
 * 3. Temporarily modifies package.json to append -dev.X (e.g., "0.1.1-dev.5")
 * 4. Builds and packages the extension with the dev version
 * 5. Restores package.json to original state
 * 6. Installs the dev-versioned .vsix locally
 *
 * This ensures:
 * - package.json always shows the "real" production version
 * - Local installs are clearly marked as dev builds
 * - No risk of accidentally publishing a dev version (package.json never has dev suffix committed)
 */

const { execSync } = require('child_process');
const { readFileSync, writeFileSync, copyFileSync, unlinkSync } = require('fs');
const { join } = require('path');

const ROOT_DIR = join(__dirname, '..');
const PACKAGE_JSON_PATH = join(ROOT_DIR, 'package.json');
const PACKAGE_JSON_BACKUP_PATH = join(ROOT_DIR, 'package.json.backup');
const DEV_VERSION_PATH = join(ROOT_DIR, '.dev-version');

/**
 * Reads and increments the dev version counter.
 * @returns {number} The new dev version number
 */
function getAndIncrementDevVersion() {
	let devVersion = 1;

	// Use try-catch instead of existsSync to avoid TOCTOU race condition
	try {
		const content = readFileSync(DEV_VERSION_PATH, 'utf8').trim();
		devVersion = parseInt(content, 10) || 1;
	} catch (error) {
		if (error.code !== 'ENOENT') {
			throw error; // Re-throw unexpected errors
		}
		// File doesn't exist, use default devVersion = 1
	}

	const newDevVersion = devVersion + 1;
	writeFileSync(DEV_VERSION_PATH, newDevVersion.toString(), 'utf8');

	return newDevVersion;
}

/**
 * Reads the current version from package.json.
 * @returns {string} The current version (e.g., "0.1.1")
 */
function getCurrentVersion() {
	const packageJson = JSON.parse(readFileSync(PACKAGE_JSON_PATH, 'utf8'));
	return packageJson.version;
}

/**
 * Creates a backup of package.json.
 */
function backupPackageJson() {
	copyFileSync(PACKAGE_JSON_PATH, PACKAGE_JSON_BACKUP_PATH);
}

/**
 * Restores package.json from backup and deletes the backup file.
 */
function restorePackageJson() {
	// Use try-catch instead of existsSync to avoid TOCTOU race condition
	try {
		copyFileSync(PACKAGE_JSON_BACKUP_PATH, PACKAGE_JSON_PATH);
		unlinkSync(PACKAGE_JSON_BACKUP_PATH);
	} catch (error) {
		if (error.code !== 'ENOENT') {
			throw error; // Re-throw unexpected errors
		}
		// Backup file doesn't exist, nothing to restore
	}
}

/**
 * Temporarily modifies package.json to use the dev version.
 * @param {string} devVersion - The dev version string (e.g., "0.1.1-dev.5")
 */
function setDevVersion(devVersion) {
	const packageJson = JSON.parse(readFileSync(PACKAGE_JSON_PATH, 'utf8'));
	packageJson.version = devVersion;
	writeFileSync(PACKAGE_JSON_PATH, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');
}

/**
 * Runs a command and prints output in real-time.
 * @param {string} command - The command to run
 * @param {string} description - Description of what the command does
 */
function runCommand(command, description) {
	console.log(`\n${description}...`);
	try {
		execSync(command, { stdio: 'inherit', cwd: ROOT_DIR });
	} catch (error) {
		throw new Error(`Failed to ${description.toLowerCase()}: ${error.message}`);
	}
}

// Main execution
async function main() {
	let restored = false;

	try {
		// Step 1: Get current version
		const currentVersion = getCurrentVersion();
		console.log(`📦 Current version: ${currentVersion}`);

		// Step 2: Get and increment dev counter
		const devCounter = getAndIncrementDevVersion();
		const devVersion = `${currentVersion}-dev.${devCounter}`;
		console.log(`🔧 Building dev version: ${devVersion}`);

		// Step 3: Backup package.json
		console.log('💾 Backing up package.json...');
		backupPackageJson();

		// Step 4: Temporarily set dev version
		console.log(`✏️  Temporarily setting version to ${devVersion}...`);
		setDevVersion(devVersion);

		// Step 5: Build and package
		runCommand('npm run package', '🏗️  Building production bundle');
		runCommand('npm run vsce-package', '📦 Creating .vsix package');

		// Step 6: Restore package.json IMMEDIATELY (before install)
		console.log('♻️  Restoring package.json...');
		restorePackageJson();
		restored = true;
		console.log(`✅ package.json restored to version ${currentVersion}`);

		// Step 7: Install the dev-versioned extension
		runCommand('npm run install-local', '🚀 Installing extension locally');

		console.log(`\n✅ Success! Extension ${devVersion} installed locally.`);
		console.log(`📝 Note: package.json remains at version ${currentVersion}`);
		console.log(`🔄 Next dev build will be ${currentVersion}-dev.${devCounter + 1}`);

	} catch (error) {
		console.error(`\n❌ Error: ${error.message}`);

		// Always restore package.json on error
		// restorePackageJson() handles missing backup file internally
		if (!restored) {
			console.log('♻️  Restoring package.json after error...');
			restorePackageJson();
			console.log('✅ package.json restored');
		}

		process.exit(1);
	}
}

main();
