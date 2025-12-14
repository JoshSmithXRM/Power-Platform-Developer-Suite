# Getting Started with Power Platform Developer Suite

Complete setup guide for first-time users - from installation to your first connection.

---

## Prerequisites

Before installing the Power Platform Developer Suite, ensure you have:

### Required

- **VS Code** (latest version recommended)
  - Download: https://code.visualstudio.com/
- **Power Platform environment** access
  - Dynamics 365 or Dataverse environment
  - Admin or developer role
- **Azure Active Directory** permissions
  - Ability to register applications (for Service Principal auth)
  - Or user account with environment access

### Optional (for development)

- **Node.js 20.x** (if building from source)
- **Git** (for source control)

---

## Installation

### From VS Code Marketplace (Recommended)

1. **Open VS Code**
2. **Open Extensions** (Ctrl+Shift+X / Cmd+Shift+X)
3. **Search**: "Power Platform Developer Suite"
4. **Click Install**
5. **Reload VS Code** (if prompted)

### From VSIX File (Advanced)

```bash
code --install-extension power-platform-developer-suite-VERSION.vsix
```

---

## First-Time Setup

### Step 1: Open the Extension

1. **Open Activity Bar** (left side of VS Code)
2. **Click Power Platform icon** (⚡ or PP logo)
3. **You'll see the Tools panel** with available features

### Step 2: Choose Authentication Method

The extension supports 4 authentication methods. Choose based on your use case:

| Method | Best For | Requirements |
|--------|----------|--------------|
| **Service Principal** | CI/CD, automation, production | Azure app registration + client secret |
| **Interactive Browser** | Personal use, development | User account with browser |
| **Username/Password** | Scripts, automation (less secure) | User account credentials |
| **Device Code** | Headless environments, SSH | User account |

**Recommended for most users:** **Interactive Browser** (easiest) or **Service Principal** (most secure for automation)

---

## Setting Up Service Principal (Recommended for Production)

### Step 1: Register Application in Azure

1. **Go to Azure Portal**: https://portal.azure.com
2. **Navigate to**: Azure Active Directory → App registrations
3. **Click**: "New registration"
4. **Enter details**:
   - Name: `Power Platform Developer Suite - {YourName}`
   - Supported account types: "Single tenant"
   - Redirect URI: Leave blank (not needed for Service Principal)
5. **Click**: "Register"

### Step 2: Note Application (Client) ID and Tenant ID

1. **On Overview page**, copy:
   - **Application (client) ID**: `12345678-1234-1234-1234-123456789012`
   - **Directory (tenant) ID**: `87654321-4321-4321-4321-210987654321`
2. **Save these values** - you'll need them in Step 4

### Step 3: Create Client Secret

1. **Go to**: Certificates & secrets (left menu)
2. **Click**: "New client secret"
3. **Enter**:
   - Description: `Power Platform Developer Suite`
   - Expires: 90 days (recommended for security)
4. **Click**: "Add"
5. **Copy the secret VALUE immediately** (it won't be shown again!)
   - Format: `abc123~DEF456.GHI789_xyz`

⚠️ **IMPORTANT:** Save this secret securely. You cannot retrieve it again after leaving this page.

### Step 4: Grant API Permissions

1. **Go to**: API permissions (left menu)
2. **Click**: "Add a permission"
3. **Select**: "Dynamics CRM" (or "Common Data Service")
4. **Check**: `user_impersonation`
5. **Click**: "Add permissions"
6. **(Admin only)** Click**: "Grant admin consent for {Your Organization}"
   - If you're not an admin, ask your Azure AD admin to grant consent

### Step 5: Assign Role in Power Platform

1. **Go to**: Power Platform Admin Center (https://admin.powerplatform.microsoft.com/)
2. **Select your environment**
3. **Go to**: Settings → Users + permissions → Application users
4. **Click**: "+ New app user"
5. **Select**: The app you registered (by Application ID)
6. **Select Business Unit**: Root business unit
7. **Assign Security Roles**: System Administrator or System Customizer (minimum)
8. **Click**: "Create"

### Step 6: Add Environment in VS Code

1. **Open Power Platform Developer Suite**
2. **Click**: "Environment Setup" in Tools panel
3. **Click**: "Add New Environment"
4. **Enter**:
   - **Environment Name**: `Dev Environment` (friendly name)
   - **Dataverse URL**: `https://yourorg.crm.dynamics.com`
   - **Authentication Method**: `Service Principal`
   - **Tenant ID**: `87654321-4321-4321-4321-210987654321` (from Step 2)
   - **Client ID**: `12345678-1234-1234-1234-123456789012` (from Step 2)
   - **Client Secret**: `abc123~DEF456.GHI789_xyz` (from Step 3)
5. **Click**: "Test Connection"
   - ✅ Success: "Connection successful!"
   - ❌ Failure: See [Troubleshooting](#troubleshooting) below
6. **Click**: "Save"

---

## Setting Up Interactive Browser (Easiest)

### Step 1: Add Environment

1. **Open Power Platform Developer Suite**
2. **Click**: "Environment Setup" in Tools panel
3. **Click**: "Add New Environment"
4. **Enter**:
   - **Environment Name**: `Dev Environment`
   - **Dataverse URL**: `https://yourorg.crm.dynamics.com`
   - **Authentication Method**: `Interactive Browser`
5. **Click**: "Test Connection"
6. **Sign in**: Browser window opens, sign in with your Microsoft account
7. **Consent**: Grant permissions if prompted
8. ✅ **Success**: Return to VS Code, see "Connection successful!"
9. **Click**: "Save"

**Benefits:**
- ✅ Easiest setup (no Azure app registration)
- ✅ Uses your existing user permissions
- ✅ Browser-based sign-in (MFA supported)

**Limitations:**
- ❌ Requires manual sign-in (not suitable for automation)
- ❌ Token expires after 1 hour (re-auth required)

---

## Verifying Your Setup

### 1. Check Environment List

1. **Open**: Environment Setup panel
2. **Verify**: Your environment appears in the list
3. **Status**: Should show "Connected" or similar

### 2. Try a Feature

**Test 1: Solution Explorer**
1. **Click**: "Solution Explorer" in Tools panel
2. **Select**: Your environment from dropdown (top of panel)
3. **Verify**: Solutions load in the table
4. ✅ **Success**: You see a list of solutions

**Test 2: Metadata Browser**
1. **Click**: "Metadata Browser" in Tools panel
2. **Select**: Your environment
3. **Verify**: Tables load in the left panel
4. **Click**: Any table (e.g., "account")
5. ✅ **Success**: Attributes, keys, and relationships load

---

## Troubleshooting

### Connection Fails: "Invalid client secret"

**Cause:** Client secret incorrect or expired

**Fix:**
1. Go to Azure Portal → App registrations → Your app
2. Go to Certificates & secrets
3. Create a new client secret
4. Update secret in VS Code Environment Setup
5. Test connection again

### Connection Fails: "AADSTS700016: Application not found"

**Cause:** Application (Client) ID incorrect or app not registered

**Fix:**
1. Verify Application ID in Azure Portal (copy again)
2. Ensure app registration is in correct tenant
3. Update Client ID in VS Code
4. Test connection again

### Connection Fails: "User does not have access"

**Cause:** Service Principal not added as Application User in Power Platform

**Fix:**
1. Go to Power Platform Admin Center
2. Add app as Application User (see Step 5 above)
3. Assign security role (System Administrator or System Customizer)
4. Wait 5-10 minutes for permissions to propagate
5. Test connection again

### Connection Fails: "AADSTS50076: MFA required"

**Cause:** Interactive Browser auth with MFA enabled

**Fix:**
- ✅ This is normal - complete MFA in browser window
- If browser doesn't open, check popup blocker
- Use Device Code flow as alternative (supports MFA)

### Solutions/Metadata Not Loading

**Cause:** Permissions issue or API throttling

**Fix:**
1. Verify user/app has System Customizer role minimum
2. Check Dataverse URL is correct (should end in `.dynamics.com` or `.crm.dynamics.com`)
3. Try refreshing the panel
4. Check VS Code Output panel (Help → Toggle Developer Tools → Console) for errors

### "Environment URL not found" Error

**Cause:** Incorrect Dataverse URL format

**Fix:**
- ✅ Correct: `https://yourorg.crm.dynamics.com`
- ✅ Correct: `https://yourorg.crm4.dynamics.com` (regional)
- ❌ Wrong: `https://make.powerapps.com/environments/abc123` (this is Maker Portal, not Dataverse)
- ❌ Wrong: `yourorg.crm.dynamics.com` (missing `https://`)

**How to find correct URL:**
1. Go to https://make.powerapps.com
2. Select your environment (top right)
3. Go to Settings (gear icon) → Session details
4. Copy "Instance url" value

---

## Next Steps

### Explore Features

1. **Solution Explorer**
   - Browse, filter, export solutions
   - Open directly in Maker or Classic

2. **Metadata Browser**
   - Explore tables, columns, relationships
   - Export metadata to JSON

3. **Plugin Trace Viewer**
   - Analyze plugin execution logs
   - Filter by date, plugin, entity
   - Export to CSV

4. **Connection References Manager**
   - Browse Power Automate flows
   - View connection dependencies
   - Sync deployment settings

5. **Environment Variables**
   - Manage environment-specific config
   - Export for ALM workflows

6. **Import Job Viewer**
   - Monitor solution imports
   - View detailed logs

### Learn the Architecture

- [Clean Architecture Guide](./architecture/CLEAN_ARCHITECTURE_GUIDE.md)
- [Testing Guide](./testing/TESTING_GUIDE.md)
- [CLAUDE.md](../CLAUDE.md) - Development standards

### Contribute

- [Contributing Guide](../CONTRIBUTING.md)
- [Development Workflows](../.claude/WORKFLOW.md)

---

## Security Best Practices

1. **Rotate secrets regularly** (90 days for Service Principal)
2. **Never commit credentials** to source control
3. **Use Service Principal** for production/CI-CD
4. **Use Interactive Browser** for personal development
5. **Store secrets securely** (VS Code Secret Storage - automatic)

**Read more:** [Security Policy](../SECURITY.md)

---

## Getting Help

- **Documentation**: [Full documentation index](./README.md)
- **Issues**: [GitHub Issues](https://github.com/joshsmithxrm/power-platform-developer-suite/issues)
- **Discussions**: [GitHub Discussions](https://github.com/joshsmithxrm/power-platform-developer-suite/discussions)

---

**You're all set! Start exploring the Power Platform from VS Code.**
