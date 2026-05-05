#!/bin/bash
# Run this once after cloning the project to configure Android SDK path.

PROPS_FILE="android/local.properties"

if [ -f "$PROPS_FILE" ]; then
  echo "✓ $PROPS_FILE already exists, skipping."
  exit 0
fi

SDK_PATH="${ANDROID_HOME:-${ANDROID_SDK_ROOT}}"

if [ -z "$SDK_PATH" ]; then
  echo "✗ ANDROID_HOME is not set. Please set it and re-run this script."
  echo "  Example: export ANDROID_HOME=~/Android/sdk"
  exit 1
fi

echo "sdk.dir=$SDK_PATH" > "$PROPS_FILE"
echo "✓ Created $PROPS_FILE with sdk.dir=$SDK_PATH"
