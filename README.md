# Power Platform Developer Suite

![version](https://img.shields.io/badge/version-0.1.4-blue)
![license](https://img.shields.io/badge/license-MIT-green)
[![changelog](https://img.shields.io/badge/changelog-CHANGELOG-blue)](./CHANGELOG.md)
[![version](https://img.shields.io/badge/version-0.1.4-blue)](./CHANGELOG.md)
[![license](https://img.shields.io/badge/license-MIT-green)](./LICENSE)
[![changelog](https://img.shields.io/badge/changelog-CHANGELOG-blue)](./CHANGELOG.md)
[![release](https://img.shields.io/github/v/release/JoshSmithXRM/Power-Platform-Developer-Suite)](https://github.com/JoshSmithXRM/Power-Platform-Developer-Suite/releases)

Comprehensive VS Code extension for Power Platform development and administration - your complete toolkit for Dynamics 365, Dataverse, and Power Platform solutions.

Keep this README short — it shows quick install and development steps. Full technical details live in `CHANGELOG.md` and `docs/`.

Key features
- Environment management (multiple auth methods)
- Solution Explorer (browse, export, open in Maker/Classic)
- Import Job Viewer (monitor import status and logs)

Quick install
- Install from the built VSIX (recommended for testing):

```bash
code --install-extension power-platform-developer-suite-0.1.4.vsix
```

From source (dev)

```bash
git clone https://github.com/JoshSmithXRM/Power-Platform-Developer-Suite.git
cd Power-Platform-Developer-Suite
npm install
npm run compile
```

Run in VS Code for development
- Start watch mode: `npm run watch` (or use the provided VS Code task)
- Launch Extension Development Host: press F5

Where to look next
- Full, authoritative change history: `CHANGELOG.md`
- Architecture and developer patterns: `docs/ARCHITECTURE_GUIDE.md`
- Copilot/dev guidance: `.github/copilot-instructions.md`

Troubleshooting (quick)
- If the extension doesn't appear, reload the window or restart VS Code.
- For auth issues, confirm the environment URL and app registration permissions.
- Use VS Code Developer Tools (Help → Toggle Developer Tools) to inspect errors.

Contributing
- Follow `docs/ARCHITECTURE_GUIDE.md` patterns. Open PRs against `main` and add CHANGELOG entries under `[Unreleased]` for notable changes.

License: MIT
