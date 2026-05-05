#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

echo "[guard] 1/3 Type-checking..."
npm run type-check

echo "[guard] 2/3 Linting..."
npm run lint

echo "[guard] 3/3 Running tests..."
bash "$SCRIPT_DIR/run-tests-ci.sh"

echo "[guard] Strict quality gates passed."

