#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

BASE_REF="${BASE_REF:-origin/main}"

if ! git rev-parse --verify "$BASE_REF" >/dev/null 2>&1; then
  BASE_REF="HEAD~1"
fi

if ! git rev-parse --verify "$BASE_REF" >/dev/null 2>&1; then
  echo "[guard] Could not resolve a base ref. Running full CI test suite instead."
  npm run test:ci
  exit 0
fi

mapfile -t CHANGED_FILES < <(git diff --name-only --diff-filter=ACMR "$BASE_REF"...HEAD | cat)

if [[ ${#CHANGED_FILES[@]} -eq 0 ]]; then
  echo "[guard] No changed files detected. Running full CI test suite instead."
  npm run test:ci
  exit 0
fi

echo "[guard] Running related tests for ${#CHANGED_FILES[@]} changed files (base: $BASE_REF)..."
npx jest --watchAll=false --findRelatedTests --passWithNoTests "${CHANGED_FILES[@]}"

