#!/usr/bin/env bash
# Build Android debugStandalone APK — JS bundle embedded (no Metro at runtime).
# Loads .env from project root so API_URL / WS_URL / APP_ENV match app.config.js at bundle time.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

cd android
exec ./gradlew assembleDebugStandalone
