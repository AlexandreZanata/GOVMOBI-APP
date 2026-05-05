# Scripts

This folder centralizes quality gates so every change can be validated before push.

## Available scripts

- `guard-all.sh`: Runs type-check and tests in CI mode (fail-fast).
- `guard-strict.sh`: Runs type-check, lint, and tests in CI mode.
- `guard-changed.sh`: Runs Jest related tests for files changed since `origin/main` (or `HEAD~1`).
- `run-tests-ci.sh`: Runs Jest in CI mode with coverage thresholds.
- `install-pre-push-hook.sh`: Installs a Git pre-push hook that executes `guard-all.sh`.

## Recommended usage

Run all quality checks manually:

```bash
npm run guard:all
```

Run only related tests for changed files:

```bash
npm run guard:changed
```

Run strict checks (includes lint):

```bash
npm run guard:strict
```

Install pre-push hook once per clone:

```bash
npm run guard:install-hook
```

Run tests only in CI mode:

```bash
npm run guard:tests
```

