/**
 * Conditional build script for PluginInspector tool.
 * Only runs dotnet publish if source files have changed since last build.
 * Saves ~2-5 seconds per F5 when tool hasn't changed.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const projectDir = path.join(__dirname, '..', 'tools', 'PluginInspector');
const outputDir = path.join(__dirname, '..', 'resources', 'tools');
const outputFile = path.join(outputDir, 'PluginInspector.dll');

/**
 * Get the most recent modification time of all source files.
 * @param {string} dir - Directory to scan
 * @returns {number} - Most recent mtime in milliseconds
 */
function getNewestSourceTime(dir) {
    let newest = 0;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            // Skip bin and obj directories
            if (entry.name === 'bin' || entry.name === 'obj') {
                continue;
            }
            newest = Math.max(newest, getNewestSourceTime(fullPath));
        } else if (entry.name.endsWith('.cs') || entry.name.endsWith('.csproj')) {
            const stat = fs.statSync(fullPath);
            newest = Math.max(newest, stat.mtimeMs);
        }
    }

    return newest;
}

/**
 * Check if rebuild is needed and execute if so.
 */
function main() {
    // Always build if output doesn't exist
    if (!fs.existsSync(outputFile)) {
        console.log('[build:tools] Output not found, building...');
        runBuild();
        return;
    }

    const outputStat = fs.statSync(outputFile);
    const newestSource = getNewestSourceTime(projectDir);

    if (newestSource > outputStat.mtimeMs) {
        console.log('[build:tools] Source files changed, rebuilding...');
        runBuild();
    } else {
        console.log('[build:tools] Up to date, skipping build');
    }
}

/**
 * Run dotnet publish.
 */
function runBuild() {
    execSync(
        `dotnet publish "${projectDir}" -c Release -o "${outputDir}" --nologo -v q`,
        { stdio: 'inherit' }
    );
}

main();
