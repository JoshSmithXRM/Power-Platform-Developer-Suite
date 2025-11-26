/**
 * E2E Test Helpers - Central Export
 *
 * Import helpers from this file for cleaner imports:
 * ```typescript
 * import { VSCodeLauncher, CommandPaletteHelper, WebviewHelper } from '../helpers';
 * ```
 */

export { VSCodeLauncher } from './VSCodeLauncher';
export type { VSCodeLaunchOptions, VSCodeInstance } from './VSCodeLauncher';

export { CommandPaletteHelper } from './CommandPaletteHelper';

export { WebviewHelper } from './WebviewHelper';

export { ScreenshotHelper } from './ScreenshotHelper';
export type { ScreenshotOptions } from './ScreenshotHelper';
