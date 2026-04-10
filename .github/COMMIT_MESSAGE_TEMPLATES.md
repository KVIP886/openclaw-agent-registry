# Commit Message Templates - Agent Registry

## Feature Template

```markdown
feat(<scope>): <short description>

<short description>
- Point 1
- Point 2
- Point 3

Closes #<issue-number>
```

## Bug Fix Template

```markdown
fix(<scope>): <short description>

Fixes #<issue-number>
```

## Documentation Template

```markdown
docs: <description>
```

## Refactoring Template

```markdown
refactor(<scope>): <short description>

- Change 1
- Change 2

Closes #<issue-number>
```

## Performance Template

```markdown
perf(<scope>): <short description>

- Optimization 1
- Optimization 2

Closes #<issue-number>
```

## Test Template

```markdown
test(<scope>): <short description>

- Test case 1
- Test case 2

Closes #<issue-number>
```

## Chore Template

```markdown
chore(<scope>): <short description>
```

## Breaking Change Example

```markdown
feat(api-keys)!: remove deprecated API key format

BREAKING CHANGE: API keys must now use environment variables only
- Remove support for hardcoded API keys
- Update configuration to use env vars
- Update documentation

Closes #123
```

## How to Use

1. **Select appropriate type**: feat, fix, docs, style, refactor, perf, test, chore
2. **Add scope in parentheses**: e.g., `feat(api-keys)` or `fix(ollama)`
3. **Write imperative description**: "add feature" not "added feature"
4. **Keep under 72 chars**: Wrap longer descriptions
5. **Add body for details**: Explain why and what
6. **Reference issues**: Use `Closes #123` or `Fixes #123`
7. **Mark breaking changes**: Use `!` or `BREAKING CHANGE:` footer
