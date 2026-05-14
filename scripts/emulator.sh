#!/usr/bin/env bash
# Builds debugStandalone (embedded JS, no Metro) and installs on the Android emulator.
# Set API_URL / WS_URL in .env before building so the bundle points at your backend IP.
# Optional: USE_METRO=1 npm run emulator — also runs adb reverse for 8081 (only needed for plain assembleDebug).
set -e

EMULATOR_SERIAL="${ANDROID_EMULATOR_SERIAL:-emulator-5554}"
PACKAGE="gov.govmobile.app.standalone"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

echo "▶ Building debugStandalone APK (embedded bundle, no Metro)..."
cd android && ./gradlew assembleDebugStandalone --quiet && cd ..

APK_DIR="android/app/build/outputs/apk/debugStandalone"
APK="$(ls -t "$APK_DIR"/*.apk 2>/dev/null | head -1 || true)"
if [[ -z "$APK" ]]; then
  echo "No APK produced in $APK_DIR" >&2
  exit 1
fi

echo "▶ Installing on $EMULATOR_SERIAL..."
adb -s "$EMULATOR_SERIAL" install -r "$APK"

if [[ "${USE_METRO:-}" == "1" ]]; then
  echo "▶ Setting up Metro tunnel (USE_METRO=1)..."
  adb -s "$EMULATOR_SERIAL" reverse tcp:8081 tcp:8081
fi

echo "▶ Launching app..."
adb -s "$EMULATOR_SERIAL" shell am start -n "$PACKAGE/.MainActivity"

echo "✅ Done — Sorrimobi standalone on emulator (package $PACKAGE)"
