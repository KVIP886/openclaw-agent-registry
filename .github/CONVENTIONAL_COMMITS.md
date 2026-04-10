# Conventional Commits 2026 - Agent Registry

## Format

```
<type>(<scope>): <description>

<body>

<footer>
```

## Examples

```bash
feat(api-keys): implement secure provider fallback mechanism

- Add provider fallback chain (Veo3→Seedance→Wan→Runway→MiniMax)
- Implement comprehensive input validation
- Add detailed logging and monitoring
- Create security documentation (API_KEYS_SETUP.md)

BREAKING CHANGE: API key format changed to environment variables

Closes #123
```

## Types

| Type | Description | Example |
|------|-------------|---------|
| `feat` | New feature | `feat(api-keys): add secure fallback` |
| `fix` | Bug fix | `fix(ollama): correct typo` |
| `docs` | Documentation only | `docs: add security guide` |
| `style` | Formatting, missing semi, etc. | `style: remove trailing whitespace` |
| `refactor` | Code change without new features | `refactor: improve error handling` |
| `perf` | Performance improvement | `perf(ollama): optimize parallel processing` |
| `test` | Adding missing tests | `test: add provider fallback tests` |
| `chore` | Changes to build process or tools | `chore: update dependencies` |

## Scopes

- `api-keys`: API key management and configuration
- `ollama`: Ollama GPU configuration and optimization
- `video-generation`: AI video generation features
- `self-healing`: Self-healing system tools
- `docs`: Documentation updates
- `scripts`: Script modifications
- `config`: Configuration files

## Breaking Changes

Use `BREAKING CHANGE:` in the footer or `!` after the type/scope to indicate a breaking change:

```bash
feat(api-keys)!: remove deprecated API key format

BREAKING CHANGE: API keys must now use environment variables only
```

## Issue References

Use `Closes #123`, `Fixes #123`, or `Resolves #123` to automatically close issues:

```bash
fix(provider-fallback): resolve API timeout issues

Closes #456
```

## Guidelines

1. **Subject line**: Max 72 characters, imperative mood ("add" not "added")
2. **Separate subject from body with blank line**
3. **Wrap at 72 characters** in body
4. **Use body for detailed explanations**
5. **Reference issues** in footer
6. **No period at end** of subject line

## Best Practices

- ✅ Clear, concise descriptions
- ✅ One logical change per commit
- ✅ Use scopes to categorize changes
- ✅ Reference issues with `Closes #`, `Fixes #`, `Resolves #`
- ✅ Document breaking changes explicitly
- ✅ Use `BREAKING CHANGE:` footer for breaking changes
