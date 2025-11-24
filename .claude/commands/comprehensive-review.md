# Comprehensive Code Review - 8 Parallel Specialized Agents

I need a comprehensive production-readiness review using 8 specialized agents running in parallel.

## Prerequisites

Before starting, verify:
- All code compiles successfully
- All tests pass
- Manual testing complete with F5

## Agent Specializations

Launch these 8 agents in parallel:

1. Architecture Agent - SOLID principles, Clean Architecture compliance, layer boundaries, dependency direction
2. Domain Purity Agent - Domain isolation, business logic placement, rich vs anemic models
3. Type Safety Agent - TypeScript strict mode, any usage, explicit return types, null safety
4. Code Quality Agent - Duplication via Three Strikes Rule, dead code, complexity, comments, file size
5. Security Agent - OWASP Top 10, input validation, secrets management, XSS prevention
6. Pattern Compliance Agent - VS Code patterns, panel initialization, logging architecture, HTML separation
7. Test Coverage Agent - Missing tests for domain at 100 percent target, use cases at 90 percent target, mappers
8. Test Quality Agent - Test structure, assertions, mocking patterns, maintainability

## Output Structure

Create a .review directory with:
- CODE_REVIEW_GUIDE.md as master review guide
- README.md for review structure documentation
- SUMMARY.md for aggregated findings across all agents
- PROGRESS_TRACKER.md for fix tracking
- results directory containing 01_ARCHITECTURE_REPORT.md through 08_TEST_QUALITY_REPORT.md

## Deliverables

After all agents complete:

1. Aggregate findings into SUMMARY.md with overall quality score
2. Identify cross-agent patterns (systemic issues mentioned by 3+ agents)
3. Prioritize by severity: Critical > High > Medium > Low
4. Provide actionable fix recommendations for each issue
5. Create PROGRESS_TRACKER.md for tracking remediation

## Severity Definitions

- Critical: Production blockers, security vulnerabilities, data loss risks
- High: Architectural violations, missing test coverage for critical paths, large refactoring needs
- Medium: Inconsistent patterns, type assertions, minor security hardening
- Low: Code style, documentation gaps, minor improvements

## Expected Results

- Total issues: 60-90 findings
- Execution time: approximately 15 minutes
- Quality score: 0-10 scale with strengths and weaknesses breakdown

Run all 8 agents in parallel now. Analyze the full codebase including all src TypeScript files.
