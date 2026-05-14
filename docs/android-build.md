# Android Build Guide — Sorrimobi

This guide covers everything you need to build, install, and update the Sorrimobi Android app on an emulator or physical device.

---

## Prerequisites

| Tool        | Version | Notes                              |
|-------------|---------|------------------------------------|
| Node.js     | >= 18   | `node --version`                   |
| Java (JDK)  | 17      | `java -version`                    |
| Android SDK | API 34+ | via Android Studio or `sdkmanager` |
| Android NDK | 27.x    | required by `@rnmapbox/maps`       |
| Gradle      | 8.x     | bundled via `gradlew` wrapper      |
| ADB         | any     | part of Android SDK platform-tools |

Make sure `ANDROID_HOME` and `JAVA_HOME` are set in your shell profile:

```bash
export ANDROID_HOME=$HOME/Android/Sdk
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/tools
```

---

## First-Time Setup

```bash
# 1. Install JS dependencies
npm install

# 2. Copy and fill environment variables
cp .env.example .env
# Edit .env with your API_URL, WS_URL, MAPBOX tokens, etc.
```

---

## Building the APK

### Debug build (for emulator / testing)

```bash
cd android && ./gradlew assembleDebug
```

Output: `android/app/build/outputs/apk/debug/app-debug.apk`

### Release build

```bash
cd android && ./gradlew assembleRelease
```

> For release you need a signed keystore. See [Android signing docs](https://reactnative.dev/docs/signed-apk-android).

---

## Installing on Emulator

```bash
# Install the APK
adb -s emulator-5554 install -r android/app/build/outputs/apk/debug/aaaaaaaaa.apk

# Forward Metro port so the emulator can reach your machine
adb -s emulator-5554 reverse tcp:8081 tcp:8081

# Launch the app
adb -s emulator-5554 shell am start -n gov.govmobile.app/.MainActivity
```

Then start the Metro bundler in a separate terminal:

```bash
npx expo start --clear
```

> The `--clear` flag wipes the Metro cache. Use it whenever you change `.env`, `babel.config.js`, or after pulling large changes.

---

## Updating the App After Code Changes

### JS-only changes (screens, logic, styles)

Metro hot-reloads automatically. If it doesn't, press `r` in the Metro terminal or shake the device and tap **Reload**.

No rebuild needed.

### Native changes (new packages with native code, `app.config.js`, `android/` files)

You need a full rebuild:

```bash
# Rebuild the APK
cd android && ./gradlew assembleDebug

# Reinstall
adb -s emulator-5554 install -r android/app/build/outputs/apk/debug/aaaaaaaaa.apk
```

### Quick reference

| Change type                  | Action needed                            |
|------------------------------|------------------------------------------|
| JS / TypeScript / styles     | Metro auto-reload (press `r`)            |
| New npm package (JS only)    | `npm install` → Metro reload             |
| New npm package (native)     | `npm install` → full rebuild + reinstall |
| `app.config.js` / `app.json` | Full rebuild + reinstall                 |
| `android/` files             | Full rebuild + reinstall                 |
| `.env` variables             | Metro restart with `--clear`             |

---

## Useful ADB Commands

```bash
# List connected devices / emulators
adb devices

# View live app logs
adb -s emulator-5554 logcat | grep -E "ReactNativeJS|ReactHost|gov.govmobile"

# Clear app data (reset storage / auth state)
adb -s emulator-5554 shell pm clear gov.govmobile.app

# Uninstall the app
adb -s emulator-5554 uninstall gov.govmobile.app

# Open dev menu (shake gesture alternative)
adb -s emulator-5554 shell input keyevent 82
```

---

## Multi-Device Development

When you have more than one physical device connected via USB, `expo run:android` only installs to the **first device it detects**. The second device keeps the old APK — if that APK is missing a newly added native module, the app will hang at bundle load.

### Build once, install on all devices

```bash
# 1. Build the debug APK
cd android && ./gradlew assembleDebug

# 2. List connected devices to get their serial numbers
adb devices

# 3. Install on each device by serial
adb -s <SERIAL_1> install -r android/app/build/outputs/apk/debug/aaaaaaaaa.apk
adb -s <SERIAL_2> install -r android/app/build/outputs/apk/debug/aaaaaaaaa.apk

# 4. Launch the app on both
adb -s <SERIAL_1> shell am start -n gov.govmobile.app/.MainActivity
adb -s <SERIAL_2> shell am start -n gov.govmobile.app/.MainActivity
```

### One-liner — install on all connected devices at once

```bash
adb devices \
  | grep -v "List of devices" \
  | awk 'NF && $2=="device" {print $1}' \
  | xargs -I{} adb -s {} install -r \
      android/app/build/outputs/apk/debug/aaaaaaaaa.apk
```

### When does this matter?

Any time you add a package that ships native code (`.so` / `.aar` / Kotlin/Java modules), the APK must be rebuilt and reinstalled on **every** device. JS-only changes still hot-reload via Metro on all devices simultaneously.

| Scenario | Action |
|---|---|
| Added native package (e.g. `react-native-keyboard-controller`) | Rebuild APK → install on all devices |
| JS/TS change only | Metro auto-reload on all devices |
| `.env` change | Metro restart `--clear` on all devices |

---

## Troubleshooting

### One device loads, another hangs at bundle screen after adding a native package

`expo run:android` with multiple devices connected only installs to one. The other device has the old APK without the new native module — it connects to Metro, downloads the bundle, but crashes silently because the native module is missing.

Fix: rebuild and install on all devices manually (see **Multi-Device Development** above).

---

### `SoLoaderDSONotFoundError: couldn't find DSO to load: libexpo-modules-core.so`

The native `.so` libraries are compressed inside the APK and can't be loaded at runtime.

Fix: set `expo.useLegacyPackaging=true` in `android/gradle.properties`, then rebuild.

```properties
# android/gradle.properties
expo.useLegacyPackaging=true
```

---

### `metroRequire` / `loadModuleImplementation` red screen

The app is running but Metro bundler is not reachable.

1. Make sure Metro is running: `npx expo start --clear`
2. Make sure the port is forwarded: `adb -s emulator-5554 reverse tcp:8081 tcp:8081`
3. Reload the app: `adb -s emulator-5554 shell input keyevent 82` → Reload

---

### `INSTALL_FAILED_UPDATE_INCOMPATIBLE`

The installed app has a different signature than the new APK.

```bash
adb -s emulator-5554 uninstall gov.govmobile.app
adb -s emulator-5554 install android/app/build/outputs/apk/debug/aaaaaaaaa.apk
```

---

### Gradle build fails with `Could not resolve` / dependency errors

```bash
cd android && ./gradlew assembleDebug --refresh-dependencies
```

---

### Gradle build fails with `Execution failed for task ':app:buildCMakeDebug'`

NDK version mismatch. Check that NDK 27.x is installed:

```bash
sdkmanager "ndk;27.2.12479018"
```

Then verify `android/build.gradle` has `ndkVersion` pointing to the installed version.

---

### Metro cache issues after pulling changes

```bash
npx expo start --clear
# or
npx react-native start --reset-cache
```

---

### `Unable to load script` on device

The device can't reach Metro. For a physical device on the same Wi-Fi:

```bash
# Find your machine's local IP
ip addr show | grep "inet " | grep -v 127.0.0.1

# In the app dev menu → "Change Bundle Location" → set to <your-ip>:8081
```

Or use `adb reverse` if connected via USB:

```bash
adb reverse tcp:8081 tcp:8081
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in:

| Variable              | Description                                     |
|-----------------------|-------------------------------------------------|
| `API_URL`             | REST API base URL                               |
| `WS_URL`              | WebSocket base URL (use `http://`, not `ws://`) |
| `APP_ENV`             | `development` / `staging` / `production`        |
| `MOCK_MODE`           | `true` to skip real API calls                   |
| `MAPBOX_ACCESS_TOKEN` | Public Mapbox token                             |
| `MAPBOX_SECRET_TOKEN` | Secret Mapbox token (for SDK downloads)         |

> Changes to `.env` require restarting Metro with `--clear`. They do **not** require a native rebuild unless you change `app.config.js` logic that reads them.
