# CLAUDE.md - Extension Quick Reference

**Power Platform Developer Suite** - A VS Code extension that provides UI for the PPDS SDK CLI.

---

## 🎯 What This Extension Is

This extension is a **UI shell** that:
- Calls SDK CLI commands via process invocation (`ppds plugins list --json`)
- Renders results in VS Code panels, tree views, and webviews
- Handles VS Code integration (commands, settings, notifications)
- Has **minimal business logic** - logic lives in the SDK CLI

**Heavy architectural decisions happen in the SDK (`C:\VS\ppds\sdk\`), not here.**

---

## 💻 Tech Stack

- **TypeScript 5.x** (strict mode)
- **VS Code Extension API** (panels, commands, webviews, tree views)
- **Jest 30.x** (testing)
- **Node 18+** (runtime)
- **PPDS CLI** (`ppds` commands for all Power Platform operations)

---

## 🚫 Code Rules

### Never
1. **`any` without explicit type** - Use proper interfaces or `unknown` with narrowing
2. **`eslint-disable` without permission** - Fix root cause first
3. **Non-null assertions (`!`)** - Use explicit null checks: `if (x === null) return;`
4. **Duplicate code 3+ times** - Create abstraction on 2nd copy
5. **HTML in TypeScript files** - Extract to separate view files

### Always
1. **TypeScript strict mode** - Type safety catches bugs at compile time
2. **Explicit return types** - All public methods have return types
3. **VS Code panel singleton** - `private static currentPanel` + `createOrShow()` factory
4. **Explore before implementing** - Search for existing patterns before creating new

---

## 🖥️ VS Code Panel Patterns

### Singleton Pattern (Required)
```typescript
export class MyPanel {
  private static currentPanel: MyPanel | undefined;

  public static createOrShow(context: vscode.ExtensionContext): void {
    if (MyPanel.currentPanel) {
      MyPanel.currentPanel.panel.reveal();
      return;
    }
    // Create new panel...
  }
}
```

### Webview Message Handling
```typescript
// Panel receives messages from webview
this.panel.webview.onDidReceiveMessage(async (message) => {
  switch (message.command) {
    case 'refresh':
      await this.refresh();
      break;
  }
});

// Panel sends data to webview
this.panel.webview.postMessage({ type: 'data', payload: result });
```

---

## 🔌 CLI Integration

### Calling the CLI
```typescript
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

async function callCli(args: string[]): Promise<CliResult> {
  const { stdout, stderr } = await execFileAsync('ppds', args);
  return JSON.parse(stdout);
}

// Example: List plugins
const plugins = await callCli(['plugins', 'list', '--json']);
```

### CLI Output Parsing
- CLI commands output JSON with `--json` flag
- Parse into TypeScript interfaces for type safety
- Handle errors from stderr and non-zero exit codes

### Common CLI Commands
```bash
ppds plugins list --json          # List registered plugins
ppds plugins register <path>      # Register plugin assembly
ppds env list --json              # List environments
ppds solution export <name>       # Export solution
```

---

## 🧪 Testing

### Philosophy
- **F5 is primary** - Manual testing in Extension Development Host
- **Unit tests for complex logic** - Parsing, transformations, edge cases
- **E2E tests sparingly** - For critical user workflows

### Commands
```bash
npm test                # Run all tests
npm run compile         # Full build with lint + tests
npm run compile:fast    # Quick build, no lint/tests
```

### When to Write Tests
- ✅ Complex parsing logic
- ✅ Data transformations
- ✅ Error handling edge cases
- ❌ Simple pass-through to CLI
- ❌ Basic UI rendering

---

## 🔄 Workflow

### Building Features
1. **Implement** - Write the code
2. **F5 test** - Launch Extension Development Host, test manually
3. **Fix issues** - Iterate until it works
4. **Add tests** - If logic is complex enough to warrant them
5. **PR** - Run `/prepare-pr`

### Bug Fixes
1. Reproduce via F5
2. Fix the bug
3. Verify fix via F5
4. Add test if bug was in complex logic
5. Commit

---

## 🛠️ Commands

### Development
```bash
npm run compile         # Full compilation with lint + tests
npm run compile:fast    # Quick build only
npm test                # Run tests
npm run watch           # Continuous compilation
F5                      # Launch Extension Development Host
```

### Claude Code
- `/clear` - Reset context when switching tasks
- `/new-panel [name]` - Scaffold new VS Code panel
- `/prepare-pr` - Full PR validation (compile, tests, CHANGELOG)
- `/prepare-release X.Y.Z` - Release prep with version bump
- `/handoff` - Generate session summary

---

## 🌐 Cross-Repo Work

For work spanning multiple repos, start your session in `C:\VS\ppds\` (parent workspace).

| Task | Start In |
|------|----------|
| Extension-only feature | `extension/` |
| CLI feature | `sdk/` |
| Cross-repo feature | `ppds/` |
| Extension calls new CLI command | Both - start in `sdk/`, then `extension/` |

See `C:\VS\ppds\CLAUDE.md` for cross-repo coordination.

---

## 🔀 Git & Commits

### Branching
- **main**: Protected, always deployable
- **feature/xxx, fix/xxx**: Development branches

### Merge Strategy
**Squash merge** for all PRs - commit freely on feature branches.

### PR Titles
```
feat: add plugin registration panel
fix: prevent null reference in environment activation
```

### Before ANY PR
- Update `CHANGELOG.md`
- Run `/prepare-pr`

### Never Commit
- Failing tests
- Compilation errors
- Incomplete implementations (unless WIP branch)

---

## 📦 Version Management

1. `package.json` version is ALWAYS production version
2. Node.js 20.x for packaging (22+ has vsce issues)
3. Use `/prepare-release X.Y.Z` for releases

---

## 🔄 Session Habits

| When | Action |
|------|--------|
| Before PR | `/prepare-pr` |
| For releases | `/prepare-release X.Y.Z` |
| End session | `/handoff` |
| Context full | `/clear` |

---

## 📚 References

- `.claude/templates/PANEL_DEVELOPMENT_GUIDE.md` - Panel patterns
- `e2e/README.md` - E2E testing (when needed)
- `docs/RELEASE_GUIDE.md` - Full release process
- GitHub Issues - Feature tracking and bugs

---

**No AI attribution in commits or PRs.** Keep messages clean and conventional.
