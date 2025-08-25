# Extension Restructure Plan - Professional Architecture

## Overview
This document outlines the plan to restructure the Dynamics DevTools extension to follow VS Code extension best practices, proper separation of concerns, and modern bundling techniques.

## Current Issues
- ❌ Webview resources stored in `src/webview/` (source directory)
- ❌ `.vscodeignore` excludes `src/` causing 404 errors for webview assets
- ❌ No bundling - dependencies included as raw `node_modules/`
- ❌ Extension package is 1.62MB (757 files) due to unbundled dependencies
- ❌ Runtime errors when extension tries to load CSS/JS from excluded paths

## Target Architecture

### Directory Structure
```
dynamics-devtools/
├── src/                          # TypeScript source code (excluded from package)
│   ├── extension.ts              # Main extension entry point
│   ├── panels/                   # Webview panel classes
│   │   ├── base/
│   │   │   └── BasePanel.ts
│   │   ├── SolutionExplorerPanel.ts
│   │   ├── QueryDataPanel.ts
│   │   └── ...
│   ├── services/                 # Business logic services
│   │   ├── AuthenticationService.ts
│   │   ├── ServiceFactory.ts
│   │   └── ...
│   ├── commands/                 # VS Code command handlers
│   ├── providers/                # Tree view providers
│   ├── types/                    # TypeScript type definitions
│   └── models/                   # Data models
├── resources/                    # Runtime resources (included in package)
│   ├── webview/                  # Webview assets
│   │   ├── css/
│   │   │   ├── panel-base.css    # Base panel styling
│   │   │   ├── table.css         # Table component styling
│   │   │   └── components.css    # Shared component styles
│   │   ├── js/
│   │   │   ├── panel-utils.js    # Common panel utilities
│   │   │   ├── table-utils.js    # Table management utilities
│   │   │   ├── environment-selector.js
│   │   │   └── validation-utils.js
│   │   └── templates/            # HTML templates (if needed)
│   └── icons/                    # Extension icons and images
├── dist/                         # Webpack output (excluded from source)
│   ├── extension.js              # Bundled extension code
│   └── resources/                # Copied webview resources
├── out/                          # TypeScript compilation output (dev only)
├── webpack.config.js             # Webpack configuration
├── .vscodeignore                 # Updated exclusions
└── package.json                  # Updated scripts and dependencies
```

### Build Process
1. **TypeScript Compilation**: `src/` → `out/` (development)
2. **Webpack Bundling**: `src/` → `dist/extension.js` (production)
3. **Resource Copying**: `resources/` → `dist/resources/` (production)
4. **Package Creation**: Include `dist/` and `resources/` only

## Implementation Steps

### Phase 1: Directory Restructure
- [ ] Create `resources/webview/` directory structure
- [ ] Move webview assets from `src/webview/components/` to `resources/webview/`
  - [ ] CSS files → `resources/webview/css/`
  - [ ] JS files → `resources/webview/js/`
  - [ ] Rename files to follow new conventions
- [ ] Remove empty directories created during cleanup

### Phase 2: Webpack Setup
- [ ] Install webpack dependencies
  ```bash
  npm install --save-dev webpack webpack-cli ts-loader copy-webpack-plugin
  ```
- [ ] Create `webpack.config.js` with:
  - [ ] TypeScript bundling configuration
  - [ ] Resource copying plugin
  - [ ] Production optimization
  - [ ] Development source maps
- [ ] Update `package.json` scripts:
  - [ ] `"build": "webpack --mode production"`
  - [ ] `"dev": "webpack --mode development --watch"`
  - [ ] `"vscode:prepublish": "npm run build"`

### Phase 3: Code Updates
- [ ] Update `BasePanel.getCommonWebviewResources()` to use `resources/webview/` paths
- [ ] Update all panel classes to reference new resource locations
- [ ] Update webview security policy for new resource roots
- [ ] Test all panels with new resource paths

### Phase 4: Build Configuration
- [ ] Update `.vscodeignore` to:
  - [ ] Exclude `src/`, `out/`, `node_modules/`
  - [ ] Include `dist/` and `resources/`
- [ ] Update VS Code tasks for new build process
- [ ] Configure development vs production builds

### Phase 5: Testing & Validation
- [ ] Test extension compilation
- [ ] Test webview resource loading
- [ ] Verify all panels work correctly
- [ ] Test packaged extension (.vsix)
- [ ] Validate file size reduction
- [ ] Performance testing

## Expected Benefits

### ✅ Professional Structure
- Clear separation between source code and runtime resources
- Follows VS Code extension best practices
- Industry-standard webpack bundling

### ✅ Performance Improvements
- Bundled dependencies (smaller package size)
- Optimized resource loading
- Minified production code

### ✅ Developer Experience
- Better organization and maintainability
- Proper development vs production builds
- Source maps for debugging

### ✅ Scalability
- Easy to add new panels and components
- Organized resource management
- Modular architecture

## Risk Mitigation
- [ ] Create backup branch before starting
- [ ] Implement in phases with testing at each step
- [ ] Keep old structure until new one is fully validated
- [ ] Document any issues and rollback procedures

## Success Criteria
- [ ] Extension builds without errors
- [ ] All panels load and function correctly
- [ ] Package size significantly reduced (target: <500KB)
- [ ] No 404 errors for webview resources
- [ ] Environment selectors and tools work properly

## Timeline
- **Phase 1-2**: Directory restructure and webpack setup (~4 hours)
- **Phase 3**: Code updates (~3 hours)
- **Phase 4**: Build configuration (~2 hours)
- **Phase 5**: Testing and validation (~2 hours)
- **Total Estimated Time**: ~11 hours

## Notes
- This restructure addresses the immediate packaging issues
- Sets foundation for future extension growth
- Aligns with modern VS Code extension development practices
- No breaking changes for end users (internal restructure only)
