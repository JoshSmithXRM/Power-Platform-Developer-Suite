# Test Notebooks

Manual test notebooks for verifying Dataverse query behavior.

## Structure

```
test-notebooks/
├── *.ppdsnb          # Shared test suites (checked in)
├── README.md         # This file
└── local/            # Personal scratch notebooks (gitignored)
```

## Shared Test Notebooks

| Notebook | Purpose |
|----------|---------|
| `virtual-field-edge-cases.ppdsnb` | Tests for `*name`, `*yominame` virtual fields in SELECT/WHERE/ORDER BY |

## Local Notebooks

Put personal scratch notebooks in `local/` - they won't be committed.

```bash
test-notebooks/local/my-scratch.ppdsnb  # Ignored
```

## Running Tests

1. Press F5 to launch Extension Development Host
2. Open a test notebook from this folder
3. Select an environment
4. Run cells and verify results
