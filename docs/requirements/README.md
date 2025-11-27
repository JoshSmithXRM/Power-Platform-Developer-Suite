# Requirements Documentation

Feature requirements documents that define WHAT to build.

## Purpose

Requirements docs capture:
- User stories and acceptance criteria
- Functional requirements
- Non-functional requirements (performance, security, etc.)
- Constraints and assumptions

## Relationship to Design Docs

```
Requirements (WHAT) → Design (HOW) → Implementation
     docs/requirements/    docs/design/         src/
```

- Requirements define the problem and success criteria
- Design docs reference requirements and define the solution
- Requirements may exist before a design is created

## Lifecycle

1. **Create** - When a feature is being scoped
2. **Update** - As requirements are refined during design/implementation
3. **Keep** - Requirements are retained (unlike design docs) as feature documentation
4. **Archive** - If feature is deprecated, delete (git history preserves)

## Naming Convention

`FEATURE_NAME_REQUIREMENTS.md` (SCREAMING_SNAKE_CASE)

## Current Requirements

| File | Feature | Status |
|------|---------|--------|
| [METADATA_BROWSER_REQUIREMENTS.md](METADATA_BROWSER_REQUIREMENTS.md) | Metadata Browser | In Development |
