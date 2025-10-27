# Power Platform Developer Suite - Documentation

**Version**: 0.0.2
**Last Updated**: 2025-10-27

Welcome to the Power Platform Developer Suite documentation. This extension helps developers, admins, and power users work with Dynamics 365, Dataverse, and Power Platform solutions directly from VS Code.

---

## 📚 Documentation Index

### 🚀 Getting Started

**New to the project?** Start here:

1. **[CLAUDE.md](../CLAUDE.md)** - Quick reference for AI assistants (also useful for developers)
   - Critical patterns and conventions
   - Component architecture overview
   - Common pitfalls to avoid

2. **[DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md)** - Practical development workflow
   - Build and run instructions
   - Development commands
   - Debugging techniques
   - Testing workflow

---

### 🏗️ Core Architecture

Understanding the system design:

3. **[ARCHITECTURE_GUIDE.md](ARCHITECTURE_GUIDE.md)** - High-level architecture
   - SOLID principles implementation
   - Component-based architecture
   - Separation of concerns
   - Factory patterns

4. **[EXECUTION_CONTEXTS.md](EXECUTION_CONTEXTS.md)** ⭐ **CRITICAL**
   - Extension Host vs Webview separation
   - What code runs where
   - Common mistakes to avoid
   - Message passing patterns

5. **[COMPONENT_PATTERNS.md](COMPONENT_PATTERNS.md)** - Component design
   - Component lifecycle
   - Event bridge pattern
   - Configuration interfaces
   - Reusable components

---

### 🎨 Implementation Guides

Building panels and features:

6. **[PANEL_LAYOUT_GUIDE.md](PANEL_LAYOUT_GUIDE.md)** ⭐ **MANDATORY**
   - Standard panel structure
   - Required HTML layout
   - Flexbox CSS patterns
   - Custom layouts (advanced)

7. **[STYLING_PATTERNS.md](STYLING_PATTERNS.md)** - CSS and theming
   - Semantic CSS tokens
   - Theme compatibility
   - Component styling
   - Layout patterns

8. **[MESSAGE_CONVENTIONS.md](MESSAGE_CONVENTIONS.md)** ⭐ **NEW**
   - Kebab-case naming standard
   - Message structure
   - Component events
   - Type safety

9. **[ERROR_HANDLING_PATTERNS.md](ERROR_HANDLING_PATTERNS.md)** ⭐ **NEW**
   - Error handling standards
   - User notification strategy
   - Success message patterns
   - Type-safe error handling

---

### 🔧 Standards & Quality

Code quality and linting:

10. **[LINT_RECOMMENDATIONS.md](LINT_RECOMMENDATIONS.md)** - ESLint rules
    - Code quality violations found
    - Recommended ESLint rules
    - Compliance scores
    - Remediation strategies

---

### 📋 Feature Planning

Future features and design documents:

11. **[features/DATA_EXPLORER_DESIGN.md](features/DATA_EXPLORER_DESIGN.md)** - Data Explorer spec
    - Entity data browsing
    - CRUD operations
    - FetchXML queries
    - Advanced filtering

12. **[features/CONSOLIDATED_LINTING_PLAN.md](features/CONSOLIDATED_LINTING_PLAN.md)** - Linting strategy
    - Linting implementation plan
    - Rule priorities
    - Migration strategy

13. **[features/IMPLEMENTATION_PLAN.md](features/IMPLEMENTATION_PLAN.md)** - Project roadmap
    - Feature implementation order
    - Technical dependencies
    - Timeline estimates

---

## 🎯 Quick Navigation by Task

### "I want to create a new panel"

Read in this order:
1. [EXECUTION_CONTEXTS.md](EXECUTION_CONTEXTS.md) - Understand Extension Host vs Webview
2. [PANEL_LAYOUT_GUIDE.md](PANEL_LAYOUT_GUIDE.md) - Learn mandatory structure
3. [COMPONENT_PATTERNS.md](COMPONENT_PATTERNS.md) - Use existing components
4. [MESSAGE_CONVENTIONS.md](MESSAGE_CONVENTIONS.md) - Implement messaging
5. [ERROR_HANDLING_PATTERNS.md](ERROR_HANDLING_PATTERNS.md) - Handle errors correctly

### "I want to create a new component"

Read in this order:
1. [COMPONENT_PATTERNS.md](COMPONENT_PATTERNS.md) - Component design patterns
2. [EXECUTION_CONTEXTS.md](EXECUTION_CONTEXTS.md) - Context separation
3. [STYLING_PATTERNS.md](STYLING_PATTERNS.md) - Use semantic tokens
4. [MESSAGE_CONVENTIONS.md](MESSAGE_CONVENTIONS.md) - Event communication

### "I want to understand the error handling"

Read in this order:
1. [ERROR_HANDLING_PATTERNS.md](ERROR_HANDLING_PATTERNS.md) - Complete error guide
2. [MESSAGE_CONVENTIONS.md](MESSAGE_CONVENTIONS.md) - Error message format
3. [DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md) - Logging practices

### "I want to fix linting errors"

Read in this order:
1. [LINT_RECOMMENDATIONS.md](LINT_RECOMMENDATIONS.md) - Current violations
2. [ARCHITECTURE_GUIDE.md](ARCHITECTURE_GUIDE.md) - Why rules exist
3. [EXECUTION_CONTEXTS.md](EXECUTION_CONTEXTS.md) - Context violations
4. [STYLING_PATTERNS.md](STYLING_PATTERNS.md) - CSS semantic tokens

---

## 📖 Documentation Standards

All documentation in this project follows these standards:

### Structure

- **Purpose** - What problem does this solve?
- **Examples** - Show, don't just tell
- **Anti-patterns** - Show what NOT to do
- **References** - Link to related docs

### Code Examples

- ✅ Use real code from the project
- ✅ Include both correct and incorrect examples
- ✅ Explain why patterns are recommended
- ✅ Provide context and metadata

### Maintenance

- **Last Updated** - All docs have update date
- **Status** - Active, Deprecated, Draft, Planned
- **Cross-References** - Link related documents
- **Examples** - Update when code changes

---

## 🤖 For AI Assistants

If you're an AI assistant helping with this codebase:

**Primary Reference**: [../CLAUDE.md](../CLAUDE.md) - Start here for quick orientation

**Critical Rules**:
1. NEVER mix Extension Host and Webview contexts ([EXECUTION_CONTEXTS.md](EXECUTION_CONTEXTS.md))
2. ALWAYS use standard panel structure ([PANEL_LAYOUT_GUIDE.md](PANEL_LAYOUT_GUIDE.md))
3. ALWAYS use kebab-case for messages ([MESSAGE_CONVENTIONS.md](MESSAGE_CONVENTIONS.md))
4. ALWAYS follow error handling patterns ([ERROR_HANDLING_PATTERNS.md](ERROR_HANDLING_PATTERNS.md))

**When Asked About**:
- Panel creation → [PANEL_LAYOUT_GUIDE.md](PANEL_LAYOUT_GUIDE.md)
- Component usage → [COMPONENT_PATTERNS.md](COMPONENT_PATTERNS.md)
- Messaging → [MESSAGE_CONVENTIONS.md](MESSAGE_CONVENTIONS.md)
- Errors → [ERROR_HANDLING_PATTERNS.md](ERROR_HANDLING_PATTERNS.md)
- Styling → [STYLING_PATTERNS.md](STYLING_PATTERNS.md)
- Architecture → [ARCHITECTURE_GUIDE.md](ARCHITECTURE_GUIDE.md)

---

## 📊 Documentation Coverage

| Topic | Coverage | Quality | Last Updated |
|-------|----------|---------|--------------|
| Architecture | ✅ Complete | ⭐⭐⭐⭐⭐ | Recent |
| Execution Contexts | ✅ Complete | ⭐⭐⭐⭐⭐ | Recent |
| Panel Layouts | ✅ Complete | ⭐⭐⭐⭐⭐ | Recent |
| Components | ✅ Complete | ⭐⭐⭐⭐ | Recent |
| Styling | ✅ Complete | ⭐⭐⭐⭐ | Recent |
| Development | ✅ Complete | ⭐⭐⭐⭐ | Recent |
| Messages | ✅ Complete | ⭐⭐⭐⭐⭐ | 2025-10-27 |
| Error Handling | ✅ Complete | ⭐⭐⭐⭐⭐ | 2025-10-27 |
| Testing | ⚠️ Partial | ⭐⭐ | TBD |
| Linting | ✅ Complete | ⭐⭐⭐⭐ | 2025-10-26 |
| Data Explorer | 🔵 Planned | N/A | Future |

---

## 🔗 External Resources

### Power Platform
- [Power Platform Documentation](https://docs.microsoft.com/power-platform/)
- [Dataverse Web API Reference](https://docs.microsoft.com/power-apps/developer/data-platform/webapi/overview)
- [Power Apps Component Framework](https://docs.microsoft.com/power-apps/developer/component-framework/overview)

### VS Code Extension Development
- [VS Code Extension API](https://code.visualstudio.com/api)
- [Webview API](https://code.visualstudio.com/api/extension-guides/webview)
- [Extension Guides](https://code.visualstudio.com/api/extension-guides/overview)

### TypeScript
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [TypeScript ESLint](https://typescript-eslint.io/)

---

## 🆘 Getting Help

**Found an issue with documentation?**
- Open an issue on GitHub
- Include: Which doc, what's wrong, suggested fix

**Need clarification?**
- Check related docs (see cross-references at bottom of each page)
- Review code examples in the doc
- Look at actual implementation in codebase

**Want to contribute?**
- Follow documentation standards above
- Update "Last Updated" date
- Add cross-references to related docs
- Include code examples

---

## 📝 Changelog

### 2025-10-27
- ✅ Created documentation index (this file)
- ✅ Added [MESSAGE_CONVENTIONS.md](MESSAGE_CONVENTIONS.md)
- ✅ Added [ERROR_HANDLING_PATTERNS.md](ERROR_HANDLING_PATTERNS.md)
- 🗑️ Removed outdated CURRENT_STATUS.md

### 2025-10-26
- ✅ Created [LINT_RECOMMENDATIONS.md](LINT_RECOMMENDATIONS.md)

### Earlier
- ✅ Core documentation created (Architecture, Components, Styling, etc.)

---

**Need to add new documentation?** Follow this template:

```markdown
# Title

**Last Updated**: YYYY-MM-DD
**Status**: ✅ Active / 🔵 Planned / ⚠️ Draft / 🗑️ Deprecated

## Overview
[What this doc covers]

## [Your Content]

## References
- [Related Doc 1](link)
- [Related Doc 2](link)
```

---

**Happy building! 🚀**
