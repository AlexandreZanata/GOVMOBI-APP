#!/usr/bin/env bash
# Install the newest debugStandalone APK and launch MainActivity.
# debugStandalone uses applicationIdSuffix ".standalone" → gov.govmobile.app.standalone
# Set ANDROID_SERIAL when more than one device is connected.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIR="$ROOT/android/app/build/outputs/apk/debugStandalone"
if [[ ! -d "$DIR" ]]; then
  echo "Missing $DIR — run: npm run dev:android" >&2
  exit 1
fi
APK="$(ls -t "$DIR"/*.apk 2>/dev/null | head -1 || true)"
if [[ -z "$APK" ]]; then
  echo "No APK found in $DIR — run: npm run dev:android" >&2
  exit 1
fi

ADB=(adb)
if [[ -n "${ANDROID_SERIAL:-}" ]]; then
  ADB=(adb -s "$ANDROID_SERIAL")
fi

echo "▶ Installing $(basename "$APK")"
"${ADB[@]}" install -r "$APK"
echo "▶ Launching gov.govmobile.app.standalone/.MainActivity"
"${ADB[@]}" shell am start -n gov.govmobile.app.standalone/.MainActivity
