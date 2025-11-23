#!/usr/bin/env node

/**
 * Forcefully removes all local Power Platform Developer Suite extensions.
 * Handles problematic files like 'nul' that cause issues with normal delete operations.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const extensionsDir = path.join(process.env.USERPROFILE, '.vscode', 'extensions');
const extensionPrefix = 'joshsmithxrm.power-platform-developer-suite-';

console.log('🔍 Looking for extensions in:', extensionsDir);

try {
	const folders = fs.readdirSync(extensionsDir)
		.filter(name => name.startsWith(extensionPrefix))
		.map(name => path.join(extensionsDir, name));

	if (folders.length === 0) {
		console.log('✅ No extension folders found - already clean!');
		process.exit(0);
	}

	console.log(`\n📁 Found ${folders.length} extension folder(s):`);
	folders.forEach(folder => console.log(`   - ${path.basename(folder)}`));

	console.log('\n🗑️  Deleting extensions...');

	folders.forEach(folder => {
		try {
			// Use Windows rd command which can handle nul files
			if (process.platform === 'win32') {
				execSync(`rd /s /q "${folder}"`, { stdio: 'ignore' });
			} else {
				execSync(`rm -rf "${folder}"`, { stdio: 'ignore' });
			}
			console.log(`   ✅ Deleted: ${path.basename(folder)}`);
		} catch (error) {
			console.log(`   ❌ Failed to delete: ${path.basename(folder)}`);
			console.log(`      Try deleting manually via File Explorer`);
		}
	});

	// Verify cleanup
	const remaining = fs.readdirSync(extensionsDir)
		.filter(name => name.startsWith(extensionPrefix));

	if (remaining.length === 0) {
		console.log('\n✅ All extension folders successfully removed!');
	} else {
		console.log(`\n⚠️  ${remaining.length} folder(s) could not be deleted:`);
		remaining.forEach(name => console.log(`   - ${name}`));
		console.log('\nManual cleanup required:');
		console.log(`   1. Open File Explorer`);
		console.log(`   2. Navigate to: ${extensionsDir}`);
		console.log(`   3. Delete the remaining folders with Shift+Delete`);
	}

} catch (error) {
	console.error('❌ Error:', error.message);
	process.exit(1);
}
