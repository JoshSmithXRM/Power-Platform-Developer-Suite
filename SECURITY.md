# Security Policy

## Supported Versions

We release security updates for the following versions:

| Version | Supported |
| ------- | --------- |
| 0.2.x   | ✅        |
| 0.1.x   | ✅        |
| < 0.1.0 | ❌        |

**Recommendation:** Always use the latest version for best security and features.

---

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please follow these steps:

### 1. Do NOT Open a Public Issue

Security vulnerabilities should **not** be reported via public GitHub issues. Public disclosure could put users at risk before a fix is available.

### 2. Report Privately

**Use GitHub's private vulnerability reporting:**
1. Go to the [Security tab](https://github.com/joshsmithxrm/power-platform-developer-suite/security)
2. Click "Report a vulnerability"
3. Fill out the form with details

This sends a private report directly to the project maintainers.

### 3. Include in Your Report

- **Description**: Clear description of the vulnerability
- **Impact**: What an attacker could do (data access, code execution, etc.)
- **Steps to Reproduce**: Detailed steps or proof-of-concept code
- **Affected Versions**: Which versions are vulnerable
- **Suggested Fix**: If you have ideas (optional)

**Example:**
```
Title: SQL Injection in FetchXML Query Builder

Description:
The FetchXML query builder does not properly sanitize user input
in the entity name parameter, allowing SQL injection.

Impact:
An attacker could execute arbitrary SQL queries against the Dataverse
database, potentially accessing or modifying sensitive data.

Steps to Reproduce:
1. Open Plugin Trace Viewer
2. Enter `'; DROP TABLE account; --` in the entity filter
3. SQL injection is executed

Affected Versions:
0.1.0 - 0.2.0

Suggested Fix:
Use parameterized queries or whitelist allowed entity names.
```

### 4. Response Timeline

- **Acknowledgment**: Within 48 hours
- **Initial Assessment**: Within 5 business days
- **Fix Development**: Depends on severity (critical: 7-14 days, high: 14-30 days)
- **Security Release**: Coordinated disclosure after fix is ready

---

## Security Practices

### What We Do

1. **Dependency Scanning**: Automated checks for vulnerable dependencies (GitHub Dependabot)
2. **Code Reviews**: All PRs reviewed for security issues
3. **Static Analysis**: ESLint rules catch common security mistakes
4. **Least Privilege**: Extension requests minimal VS Code permissions
5. **Credential Storage**: Secrets stored securely using VS Code Secret Storage API

### Known Security Considerations

#### 1. Credential Storage

**How credentials are stored:**
- **Secrets** (client secrets, passwords): VS Code Secret Storage (encrypted at rest)
- **Non-sensitive data** (environment URLs, names): VS Code Memento (local storage)

**Best practices for users:**
- Use Service Principal authentication when possible
- Never commit `.vscode` settings with credentials to source control
- Rotate credentials regularly

#### 2. OAuth Redirect URIs

**Localhost HTTP acceptable:**
- OAuth 2.0 redirect URIs use `http://localhost` (not HTTPS)
- This is **industry standard** for local development tools
- Microsoft MSAL documentation uses HTTP for localhost
- HTTPS on localhost requires self-signed certificates (poor UX, minimal security benefit)

**Why it's safe:**
- Redirect URIs validated by authorization server
- Tokens not exposed over network (local only)
- Short-lived tokens with refresh rotation

#### 3. Extension Permissions

**Minimal permissions requested:**
- Webview creation (for panels)
- Memento storage (for settings)
- Secret storage (for credentials)

**Not requested:**
- File system access (beyond workspace)
- Network access (handled by extension, not arbitrary requests)
- Shell execution (no remote code execution)

### Security Gaps (Known Limitations)

The following security enhancements are planned but not yet implemented:

1. **Rate Limiting**: No rate limiting on Dataverse API calls (could cause throttling or DoS)
2. **CSP Headers**: Webviews don't use Content-Security-Policy headers
3. **SSRF Prevention**: Limited validation of user-provided Dataverse URLs
4. **Audit Logging**: No centralized security audit log

**See:** [Security Review Report](./.review/results/05_SECURITY_REPORT.md) for detailed analysis

---

## Security Advisories

When a security vulnerability is fixed, we will:

1. **Create a GitHub Security Advisory** with CVE (if applicable)
2. **Release a patch version** (e.g., 0.2.1 for critical fix)
3. **Update CHANGELOG.md** under `## [Version] - Security` section
4. **Notify users** via release notes and README

**Past advisories:** None yet (first release)

---

## Disclosure Policy

### Coordinated Disclosure

We follow **coordinated disclosure**:
1. Reporter notifies us privately
2. We develop and test a fix
3. We release a patched version
4. We publish a security advisory
5. Reporter can publish details (after patch release)

**Typical timeline:** 30-90 days from report to public disclosure

### Exceptions

We may request:
- **Delayed disclosure** for complex fixes requiring more time
- **Partial disclosure** if full details could enable attacks

We will not request:
- **Indefinite non-disclosure** (all issues will eventually be public)
- **Credit suppression** (reporters will be credited unless they request anonymity)

---

## Security Updates

### How to Stay Informed

1. **Watch this repository** (Releases only or All Activity)
2. **Check CHANGELOG.md** for security fixes (marked with 🔒 or "Security")
3. **Subscribe to GitHub Security Advisories** for this repo

### Applying Security Updates

```bash
# Check current version
code --list-extensions --show-versions | grep power-platform-developer-suite

# Update to latest version
code --install-extension JoshSmithXRM.power-platform-developer-suite --force

# Verify updated
code --list-extensions --show-versions | grep power-platform-developer-suite
```

**Auto-update enabled by default** in VS Code (recommended).

---

## Security Checklist for Contributors

If you're contributing code, please review:

- [ ] No hardcoded credentials or secrets
- [ ] User input validated and sanitized
- [ ] No SQL/NoSQL injection vulnerabilities
- [ ] No XSS vulnerabilities in webviews
- [ ] Secrets stored using VS Code Secret Storage API (not Memento)
- [ ] Error messages don't leak sensitive information
- [ ] No console.log of sensitive data in production code
- [ ] Dependencies up-to-date (run `npm audit`)

---

## Frequently Asked Questions

### Q: Is my Dataverse data safe?

**A:** Your credentials are stored securely using VS Code's encrypted Secret Storage. Data accessed from Dataverse is only shown in your local VS Code instance and is not transmitted to any third party.

### Q: Can this extension access my files?

**A:** The extension can only access files within your workspace and settings within VS Code. It does not have arbitrary file system access.

### Q: Does this extension send telemetry?

**A:** Currently, no telemetry is collected. If telemetry is added in the future, it will be opt-in and clearly documented.

### Q: What if I accidentally commit credentials?

**A:**
1. Immediately rotate the credentials in Azure/Microsoft 365
2. Remove from git history (use `git filter-branch` or BFG Repo-Cleaner)
3. Report the incident via security@yourdomain.com if credentials were exposed publicly

### Q: Is Service Principal auth secure?

**A:** Yes, when used properly:
- Use short-lived client secrets (rotate every 90 days)
- Or use certificate-based authentication (more secure)
- Store secrets in VS Code Secret Storage (encrypted)
- Never commit secrets to source control

---

## Contact

- **Security Issues**: [GitHub Private Vulnerability Reporting](https://github.com/joshsmithxrm/power-platform-developer-suite/security/advisories/new)
- **General Security Questions**: Open a [GitHub Discussion](https://github.com/joshsmithxrm/power-platform-developer-suite/discussions)
- **Non-Security Bugs**: Open a [GitHub Issue](https://github.com/joshsmithxrm/power-platform-developer-suite/issues)

---

**Thank you for helping keep Power Platform Developer Suite secure!**
