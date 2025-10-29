# Templates

**Quick-start templates for creating new panels and components**

## Purpose

These templates follow all architectural patterns and best practices. Copy and customize them when creating new components to avoid forgetting critical steps.

## Available Templates

### 1. PanelTemplate.ts
**Use for:** Creating new panels

**What it includes:**
- ✅ Correct BasePanel extension
- ✅ Component initialization pattern
- ✅ Event bridge setup
- ✅ State management
- ✅ Environment selector with onChange (prevents empty panel on load)
- ✅ Standard action handling
- ✅ Proper message handling patterns
- ✅ Logging best practices

**Steps to use:**
1. Copy `PanelTemplate.ts` to `src/panels/YourPanelName.ts`
2. Find/Replace "Template" with your panel name
3. Update `initializeComponents()` with your components
4. Implement your message handlers
5. Copy `PanelTemplateBehavior.js` to webview
6. Register in `package.json` and `extension.ts`

### 2. PanelTemplateBehavior.js
**Use for:** Creating panel webview behaviors

**What it includes:**
- ✅ Extends BaseBehavior (prevents silent failures)
- ✅ All required methods (getComponentType, onComponentUpdate)
- ✅ Optional lifecycle hooks documented
- ✅ Registration call (required!)
- ✅ Example custom actions
- ✅ Proper message sending to Extension Host

**Steps to use:**
1. Copy to `resources/webview/js/panels/YourPanelBehavior.js`
2. Find/Replace "TemplatePanel" with your panel name
3. Implement `onComponentUpdate()` for your data
4. Add custom actions in `handleCustomAction()`
5. Update DOM manipulation methods

## Why Use Templates?

**Without templates:**
- ❌ Forget onChange in EnvironmentSelector → empty panel on load
- ❌ Forget to extend BaseBehavior → silent failures
- ❌ Forget to call `.register()` → behavior doesn't work
- ❌ Miss event bridge setup → updates don't work
- ❌ 2-3 hour debug sessions finding missing pieces

**With templates:**
- ✅ All patterns included by default
- ✅ Compiler catches missing implementations
- ✅ Works correctly on first try
- ✅ 30-minute panel creation vs 3-4 hours

## Pattern Enforcement

Templates enforce these architectural requirements:

1. **Type Safety** - All services return typed models
2. **SOLID Principles** - Proper abstractions and interfaces
3. **DRY** - Common patterns abstracted to base classes
4. **Execution Contexts** - Clear Extension Host vs Webview separation
5. **Event Bridges** - No direct `updateWebview()` calls
6. **Message Conventions** - kebab-case message names
7. **Component Lifecycle** - Proper initialization order

## Next Steps

After copying a template:

1. **Run type check:** `npm run compile`
2. **Check architectural rules:** ESLint will catch violations
3. **Test in VS Code:** Use F5 to launch extension
4. **Verify patterns:** Use self-review checklist in CLAUDE.md

## Need Help?

- **Patterns:** See `docs/patterns/DETAILED_PATTERNS.md`
- **Rules:** See `CLAUDE.md` (the Rules Card)
- **Examples:** Look at existing panels like `MetadataBrowserPanel`

---

**Remember: Copy these templates. Don't start from scratch. Every pattern here prevents a common bug.**
