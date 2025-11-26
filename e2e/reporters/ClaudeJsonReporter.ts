/**
 * Claude JSON Reporter for Playwright E2E Tests
 *
 * Custom Playwright reporter that outputs structured JSON results
 * designed for Claude to parse and analyze. Outputs to both:
 * - Console (for immediate Claude consumption)
 * - File (for persistent storage and later analysis)
 *
 * Output format is optimized for Claude to understand test results,
 * identify failures, and suggest fixes.
 */
import type {
  Reporter,
  TestCase,
  TestResult,
  FullResult,
  Suite,
} from '@playwright/test/reporter';
import * as fs from 'fs';
import * as path from 'path';

/** Individual test case result for Claude consumption */
export interface ClaudeTestCase {
  /** Test name/description */
  name: string;
  /** Full test title including describe blocks */
  fullTitle: string;
  /** Test status */
  status: 'passed' | 'failed' | 'skipped' | 'timedOut';
  /** Test duration in seconds */
  durationSeconds: number;
  /** Screenshot path if captured */
  screenshot?: string;
  /** Error message if test failed */
  error?: string;
  /** Error stack trace if test failed */
  stackTrace?: string;
  /** File and line number */
  location?: string;
}

/** Complete test run results for Claude consumption */
export interface ClaudeTestResults {
  /** Overall pass/fail status */
  passed: boolean;
  /** Summary statistics */
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    timedOut: number;
  };
  /** Total test duration in seconds */
  durationSeconds: number;
  /** Individual test results */
  tests: ClaudeTestCase[];
  /** All screenshot paths for visual analysis */
  screenshots: string[];
  /** All error messages for quick scanning */
  errors: string[];
  /** Timestamp of test run */
  timestamp: string;
  /** Suggested next actions based on results */
  suggestions: string[];
}

/** Configuration options for the reporter */
interface ClaudeReporterOptions {
  /** Output file path (default: e2e/results/claude-results.json) */
  outputFile?: string;
  /** Whether to output to console (default: true) */
  outputToConsole?: boolean;
}

/**
 * Custom Playwright reporter that outputs JSON formatted for Claude.
 *
 * Usage in playwright.config.ts:
 * ```typescript
 * reporter: [
 *   ['./e2e/reporters/ClaudeJsonReporter.ts', { outputFile: 'results.json' }]
 * ]
 * ```
 */
class ClaudeJsonReporter implements Reporter {
  private tests: ClaudeTestCase[] = [];
  private screenshots: string[] = [];
  private errors: string[] = [];
  private startTime = 0;
  private outputFile: string;
  private outputToConsole: boolean;

  constructor(options: ClaudeReporterOptions = {}) {
    this.outputFile = options.outputFile ?? 'e2e/results/claude-results.json';
    this.outputToConsole = options.outputToConsole ?? true;
  }

  onBegin(_config: unknown, _suite: Suite): void {
    this.startTime = Date.now();
    this.tests = [];
    this.screenshots = [];
    this.errors = [];
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    // Map Playwright status to our status type
    const status = this.mapStatus(result.status);

    // Build test case result
    const testCase: ClaudeTestCase = {
      name: test.title,
      fullTitle: test.titlePath().join(' > '),
      status,
      durationSeconds: result.duration / 1000,
      location: `${test.location.file}:${test.location.line}`,
    };

    // Extract screenshot attachments
    for (const attachment of result.attachments) {
      if (attachment.name === 'screenshot' && attachment.path) {
        testCase.screenshot = attachment.path;
        this.screenshots.push(attachment.path);
      }
    }

    // Extract error information
    if (result.error) {
      testCase.error = result.error.message;
      testCase.stackTrace = result.error.stack;
      this.errors.push(`${test.title}: ${result.error.message}`);
    }

    this.tests.push(testCase);
  }

  async onEnd(result: FullResult): Promise<void> {
    const durationSeconds = (Date.now() - this.startTime) / 1000;

    // Calculate summary statistics
    const summary = {
      total: this.tests.length,
      passed: this.tests.filter(t => t.status === 'passed').length,
      failed: this.tests.filter(t => t.status === 'failed').length,
      skipped: this.tests.filter(t => t.status === 'skipped').length,
      timedOut: this.tests.filter(t => t.status === 'timedOut').length,
    };

    // Generate suggestions based on results
    const suggestions = this.generateSuggestions(summary, this.errors);

    // Build final results
    const claudeResults: ClaudeTestResults = {
      passed: result.status === 'passed',
      summary,
      durationSeconds,
      tests: this.tests,
      screenshots: this.screenshots,
      errors: this.errors,
      timestamp: new Date().toISOString(),
      suggestions,
    };

    // Write to file
    await this.writeResultsToFile(claudeResults);

    // Output to console for Claude
    if (this.outputToConsole) {
      this.outputToConsoleForClaude(claudeResults);
    }
  }

  /**
   * Maps Playwright test status to our status type.
   */
  private mapStatus(status: TestResult['status']): ClaudeTestCase['status'] {
    switch (status) {
      case 'passed':
        return 'passed';
      case 'failed':
        return 'failed';
      case 'skipped':
        return 'skipped';
      case 'timedOut':
        return 'timedOut';
      default:
        return 'failed';
    }
  }

  /**
   * Generates actionable suggestions based on test results.
   */
  private generateSuggestions(
    summary: ClaudeTestResults['summary'],
    errors: string[]
  ): string[] {
    const suggestions: string[] = [];

    if (summary.failed > 0) {
      suggestions.push(`${summary.failed} test(s) failed - review error messages and screenshots`);

      // Check for common error patterns
      const hasTimeout = errors.some(e => e.toLowerCase().includes('timeout'));
      if (hasTimeout) {
        suggestions.push('Timeout errors detected - consider increasing wait times or checking selectors');
      }

      const hasNotFound = errors.some(e =>
        e.toLowerCase().includes('not found') ||
        e.toLowerCase().includes('no element')
      );
      if (hasNotFound) {
        suggestions.push('Element not found errors - verify selectors match current UI');
      }
    }

    if (summary.skipped > 0) {
      suggestions.push(`${summary.skipped} test(s) skipped - check test.skip conditions`);
    }

    if (summary.passed === summary.total) {
      suggestions.push('All tests passed - ready for commit');
    }

    return suggestions;
  }

  /**
   * Writes results to JSON file.
   */
  private async writeResultsToFile(results: ClaudeTestResults): Promise<void> {
    const outputDir = path.dirname(this.outputFile);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    await fs.promises.writeFile(
      this.outputFile,
      JSON.stringify(results, null, 2),
      'utf-8'
    );
  }

  /**
   * Outputs results to console in a format easy for Claude to parse.
   */
  private outputToConsoleForClaude(results: ClaudeTestResults): void {
    console.log('\n' + '='.repeat(60));
    console.log('CLAUDE E2E TEST RESULTS');
    console.log('='.repeat(60));

    // Summary line for quick scanning
    const statusEmoji = results.passed ? '✅' : '❌';
    console.log(`\n${statusEmoji} Status: ${results.passed ? 'PASSED' : 'FAILED'}`);
    console.log(`📊 Summary: ${results.summary.passed}/${results.summary.total} passed`);
    console.log(`⏱️  Duration: ${results.durationSeconds.toFixed(1)}s`);

    // Failed tests (most important for Claude)
    if (results.summary.failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      for (const test of results.tests.filter(t => t.status === 'failed')) {
        console.log(`  - ${test.name}`);
        if (test.error) {
          console.log(`    Error: ${test.error}`);
        }
        if (test.screenshot) {
          console.log(`    Screenshot: ${test.screenshot}`);
        }
      }
    }

    // Screenshots for visual review
    if (results.screenshots.length > 0) {
      console.log('\n📸 SCREENSHOTS:');
      for (const screenshot of results.screenshots) {
        console.log(`  - ${screenshot}`);
      }
    }

    // Suggestions
    if (results.suggestions.length > 0) {
      console.log('\n💡 SUGGESTIONS:');
      for (const suggestion of results.suggestions) {
        console.log(`  - ${suggestion}`);
      }
    }

    // JSON output for programmatic parsing
    console.log('\n📋 JSON RESULTS:');
    console.log(JSON.stringify(results, null, 2));

    console.log('\n' + '='.repeat(60));
    console.log(`Results saved to: ${this.outputFile}`);
    console.log('='.repeat(60) + '\n');
  }
}

export default ClaudeJsonReporter;
