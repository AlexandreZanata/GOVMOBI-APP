#!/usr/bin/env bash
# Builds the debug APK and installs it on the Android emulator.
# Usage: npm run emulator
set -e

EMULATOR_SERIAL="emulator-5554"
APK="android/app/build/outputs/apk/debug/app-debug.apk"
PACKAGE="gov.govmobile.app"

echo "▶ Building debug APK..."
cd android && ./gradlew assembleDebug --quiet && cd ..

echo "▶ Installing on $EMULATOR_SERIAL..."
adb -s "$EMULATOR_SERIAL" install -r "$APK"

echo "▶ Setting up Metro tunnel..."
adb -s "$EMULATOR_SERIAL" reverse tcp:8081 tcp:8081

echo "▶ Launching app..."
adb -s "$EMULATOR_SERIAL" shell am start -n "$PACKAGE/.MainActivity"

echo "✅ Done — app running on emulator"
