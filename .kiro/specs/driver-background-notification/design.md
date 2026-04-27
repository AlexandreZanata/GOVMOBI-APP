# Design: Driver Background Push Notification Fix

## Overview

Drivers do not receive push notifications for new ride requests (`nova_corrida`) when the GovMobile app is minimized or killed. The foreground path (WebSocket → `nova-corrida-disponivel` → `NovaCorridaModal`) works correctly. The background/killed path relies on OneSignal delivering an FCM message to the device, which requires specific Android native declarations that are currently absent from `AndroidManifest.xml`.

The fix is entirely in the Android native layer. No JavaScript changes are needed.

---

## Architecture

### Dual-Channel Delivery Model

```
┌─────────────────────────────────────────────────────────────────┐
│                        Backend                                  │
│  DespachoGateway (WebSocket)    OutboxWorker (OneSignal FCM)    │
└────────────┬────────────────────────────┬───────────────────────┘
             │                            │
             ▼ (app in foreground)        ▼ (app in background/killed)
   ┌──────────────────┐         ┌──────────────────────────┐
   │  WebSocket event │         │  FCM push → OS → device  │
   │  nova-corrida-   │         │                          │
   │  disponivel      │         │  Requires:               │
   │                  │         │  1. POST_NOTIFICATIONS   │
   │  useRealtimeSession        │  2. FCMBroadcastReceiver │
   │  → NovaCorridaModal        │  3. GcmIntentJobService  │
   └──────────────────┘         └──────────┬───────────────┘
                                           │
                                           ▼
                                 ┌──────────────────┐
                                 │  OneSignal SDK   │
                                 │  (JS layer)      │
                                 │  useNotifications│
                                 │  → setPendingOffer│
                                 │  → MotoristaHome │
                                 └──────────────────┘
```

### Why the Background Path Is Broken

This is a **bare-workflow** React Native project. In a bare workflow, `AndroidManifest.xml` is a hand-maintained file under `android/app/src/main/`. Expo plugins declared in `app.config.js` (including `onesignal-expo-plugin`) are only applied when running `expo prebuild`, which regenerates the native directories from scratch.

Because `expo prebuild` was never run (or its output was not committed), the `onesignal-expo-plugin` configuration in `app.config.js` has no effect on the actual manifest. The manifest contains only the entries that were manually added, and the OneSignal FCM entries were never added manually.

The result: when the OS receives an FCM push for the app in background/killed state, there is no registered `BroadcastReceiver` to handle it, so the push is silently dropped before it ever reaches the OneSignal SDK.

---

## Components and Interfaces

### Components Involved

| Component | Location | Role | Change Required |
|---|---|---|---|
| `AndroidManifest.xml` | `android/app/src/main/` | Declares Android permissions, services, receivers | **Yes — add entries** |
| `strings.xml` | `android/app/src/main/res/values/` | String resources referenced by the manifest | **Yes — add channel ID** |
| `OneSignalService.ts` | `src/services/notifications/` | Wraps OneSignal v5 SDK | No |
| `useNotifications.ts` | `src/hooks/` | Manages SDK lifecycle and push handlers | No |
| `app.config.js` | project root | Expo plugin config (bare workflow — not applied) | No |

### Why the JS Layer Is Correct

`OneSignalService.ts` and `useNotifications.ts` are already correct:

- `initOneSignal()` initializes the SDK with the correct App ID.
- `setOneSignalExternalUserId(servidorId)` calls `OneSignal.login(servidorId)` to link the device for targeted delivery. The external user ID is `servidorId` (not `motoristaId`), which matches what the backend's `OutboxWorker` uses to target the push.
- `registerForegroundHandler` explicitly does **not** call `preventDefault()` for `nova_corrida` pushes, so foreground suppression is not a factor.
- `registerNotificationOpenedHandler` correctly dispatches `setPendingOffer` and navigates to `MotoristaHome` when a driver taps a `nova_corrida` push.

The JS layer cannot receive pushes that the Android OS never delivers. The failure is upstream of the SDK.

---

## Data Models

No new data models are introduced. The existing `GovMobNotificationData` interface in `OneSignalService.ts` already models the push payload:

```typescript
interface GovMobNotificationData {
  corridaId?: string;   // UUID of the ride
  status?: string;      // e.g. 'nova_corrida'
  motoristaNome?: string;
  passageiroNome?: string;
}
```

---

## Fix Specification

### 1. `POST_NOTIFICATIONS` Permission

Required on Android 13+ (API 33+). Without this, the OS silently drops all notification posts on modern devices.

Add inside the `<manifest>` element, alongside the existing `<uses-permission>` entries:

```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
```

### 2. OneSignal FCM Background Services

These services allow the Android OS to wake the app process and hand off the FCM payload to the OneSignal SDK when the app is in background or killed state.

Add inside the `<application>` element:

```xml
<!-- OneSignal: renders notification background image when app is in background -->
<service
  android:name="com.onesignal.notifications.BackgroundImageLayout"
  android:exported="false" />

<!-- OneSignal: job service that processes FCM messages in background/killed state -->
<service
  android:name="com.onesignal.GcmIntentJobService"
  android:permission="android.permission.BIND_JOB_SERVICE"
  android:exported="false" />
```

### 3. OneSignal FCM Broadcast Receiver

This receiver intercepts FCM messages from Google Play Services and routes them to the OneSignal SDK. Without it, FCM pushes are never delivered to the app when it is not in the foreground.

Add inside the `<application>` element:

```xml
<!-- OneSignal: receives FCM pushes from Google Play Services -->
<receiver
  android:name="com.onesignal.FCMBroadcastReceiver"
  android:permission="com.google.android.c2dm.permission.SEND"
  android:exported="true">
  <intent-filter android:priority="999">
    <action android:name="com.google.android.c2dm.intent.RECEIVE"/>
  </intent-filter>
</receiver>
```

The `android:priority="999"` ensures OneSignal's receiver takes precedence over any other FCM receivers that may be registered by other libraries.

### 4. Firebase Notification Channel Meta-data

Specifies the default notification channel for FCM messages. Required for Android 8.0+ (API 26+) to ensure notifications are assigned to a visible channel rather than silently dropped.

Add inside the `<application>` element:

```xml
<meta-data
  android:name="com.google.firebase.messaging.default_notification_channel_id"
  android:value="@string/default_notification_channel_id"/>
```

### 5. Notification Channel String Resource

The `@string/default_notification_channel_id` reference above requires a corresponding entry in `strings.xml`.

Add to `android/app/src/main/res/values/strings.xml`:

```xml
<string name="default_notification_channel_id" translatable="false">default</string>
```

### Complete Final State of `AndroidManifest.xml`

After applying the fix, the manifest should look like this:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
          xmlns:tools="http://schemas.android.com/tools">

  <!-- Existing permissions -->
  <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>
  <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>
  <uses-permission android:name="android.permission.INTERNET"/>
  <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS"/>
  <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"/>
  <uses-permission android:name="android.permission.RECORD_AUDIO"/>
  <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW"/>
  <uses-permission android:name="android.permission.VIBRATE"/>
  <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"/>

  <!-- NEW: Required for Android 13+ (API 33+) to post notifications -->
  <uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>

  <queries>
    <intent>
      <action android:name="android.intent.action.VIEW"/>
      <category android:name="android.intent.category.BROWSABLE"/>
      <data android:scheme="https"/>
    </intent>
  </queries>

  <application
    android:name=".MainApplication"
    android:label="@string/app_name"
    android:icon="@mipmap/ic_launcher"
    android:roundIcon="@mipmap/ic_launcher_round"
    android:allowBackup="true"
    android:theme="@style/AppTheme"
    android:supportsRtl="true"
    android:enableOnBackInvokedCallback="false"
    android:fullBackupContent="@xml/secure_store_backup_rules"
    android:dataExtractionRules="@xml/secure_store_data_extraction_rules">

    <!-- Existing meta-data -->
    <meta-data android:name="expo.modules.updates.ENABLED" android:value="false"/>
    <meta-data android:name="expo.modules.updates.EXPO_UPDATES_CHECK_ON_LAUNCH" android:value="ALWAYS"/>
    <meta-data android:name="expo.modules.updates.EXPO_UPDATES_LAUNCH_WAIT_MS" android:value="0"/>

    <!-- NEW: Default FCM notification channel (required Android 8.0+) -->
    <meta-data
      android:name="com.google.firebase.messaging.default_notification_channel_id"
      android:value="@string/default_notification_channel_id"/>

    <!-- NEW: OneSignal background image service -->
    <service
      android:name="com.onesignal.notifications.BackgroundImageLayout"
      android:exported="false" />

    <!-- NEW: OneSignal FCM job service (wakes app in background/killed state) -->
    <service
      android:name="com.onesignal.GcmIntentJobService"
      android:permission="android.permission.BIND_JOB_SERVICE"
      android:exported="false" />

    <!-- NEW: OneSignal FCM broadcast receiver -->
    <receiver
      android:name="com.onesignal.FCMBroadcastReceiver"
      android:permission="com.google.android.c2dm.permission.SEND"
      android:exported="true">
      <intent-filter android:priority="999">
        <action android:name="com.google.android.c2dm.intent.RECEIVE"/>
      </intent-filter>
    </receiver>

    <!-- Existing activity -->
    <activity
      android:name=".MainActivity"
      android:configChanges="keyboard|keyboardHidden|orientation|screenSize|screenLayout|uiMode"
      android:launchMode="singleTask"
      android:windowSoftInputMode="adjustResize"
      android:theme="@style/Theme.App.SplashScreen"
      android:exported="true"
      android:screenOrientation="portrait">
      <intent-filter>
        <action android:name="android.intent.action.MAIN"/>
        <category android:name="android.intent.category.LAUNCHER"/>
      </intent-filter>
      <intent-filter>
        <action android:name="android.intent.action.VIEW"/>
        <category android:name="android.intent.category.DEFAULT"/>
        <category android:name="android.intent.category.BROWSABLE"/>
        <data android:scheme="govmobile"/>
      </intent-filter>
    </activity>

  </application>
</manifest>
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

This feature is a native Android manifest fix. The "code under test" is the XML configuration itself, not a pure function. PBT in the traditional sense (generating random inputs and running 100+ iterations) does not apply here. Instead, the correctness properties below are expressed as structural invariants over the manifest file that can be verified by a single deterministic parse — equivalent to schema validation or snapshot testing.

### Bug Condition

```pascal
FUNCTION isBugCondition(manifest: AndroidManifest): boolean
  RETURN NOT manifest.hasPermission('android.permission.POST_NOTIFICATIONS')
      OR NOT manifest.hasReceiver('com.onesignal.FCMBroadcastReceiver')
      OR NOT manifest.hasService('com.onesignal.GcmIntentJobService')
END FUNCTION
```

### Property 1: Manifest contains POST_NOTIFICATIONS permission

*For any* build of the app, the `AndroidManifest.xml` SHALL declare `android.permission.POST_NOTIFICATIONS` as a `<uses-permission>` entry.

**Validates: Requirements 1.4, 2.4**

### Property 2: Manifest contains OneSignal FCM receiver

*For any* build of the app, the `AndroidManifest.xml` SHALL declare a `<receiver>` with `android:name="com.onesignal.FCMBroadcastReceiver"`, `android:exported="true"`, and an `<intent-filter>` for `com.google.android.c2dm.intent.RECEIVE`.

**Validates: Requirements 1.3, 2.3, 2.5**

### Property 3: Manifest contains OneSignal job service

*For any* build of the app, the `AndroidManifest.xml` SHALL declare a `<service>` with `android:name="com.onesignal.GcmIntentJobService"` and `android:permission="android.permission.BIND_JOB_SERVICE"`.

**Validates: Requirements 1.3, 2.3, 2.5**

### Property 4: Fix eliminates bug condition

*For any* manifest `X` where `isBugCondition(X)` is true, applying the fix SHALL produce a manifest `X'` where:
- `X'.hasPermission('android.permission.POST_NOTIFICATIONS') = true`
- `X'.hasReceiver('com.onesignal.FCMBroadcastReceiver') = true`
- `X'.hasService('com.onesignal.GcmIntentJobService') = true`

**Validates: Requirements 2.3, 2.4, 2.5**

### Property 5: Fix preserves existing manifest entries

*For any* manifest `X`, applying the fix SHALL NOT remove any permission, service, receiver, activity, or meta-data entry that was present in `X` before the fix.

**Validates: Requirements 3.1 – 3.7**

---

## Error Handling

### Build-time Errors

| Scenario | Cause | Resolution |
|---|---|---|
| `error: resource string/default_notification_channel_id not found` | `strings.xml` entry missing | Add the string resource as specified in Fix §5 |
| `Duplicate class com.onesignal.FCMBroadcastReceiver` | Another library (e.g., Firebase Messaging) already declares this receiver | Use `tools:replace="android:exported"` on the duplicate, or remove the conflicting entry |
| `Manifest merger failed` | Conflicting `android:exported` values | Check `build.gradle` dependencies for other FCM libraries and resolve with `tools:node="replace"` |

### Runtime Errors

| Scenario | Cause | Resolution |
|---|---|---|
| Push delivered but no banner shown | `POST_NOTIFICATIONS` permission not granted by user at runtime | `OneSignal.Notifications.requestPermission(true)` is already called in `useNotifications` — ensure it is called before the driver goes online |
| Push delivered but app not woken | `GcmIntentJobService` not registered | Verify the service entry is present and the app was rebuilt (not just hot-reloaded) |
| Push not delivered at all | OneSignal external user ID not linked | Verify `OneSignal.login(servidorId)` was called after login; check OneSignal dashboard delivery logs |

---

## Verification Approach

### Step 1: Build Verification

After applying the manifest changes, perform a clean build:

```bash
cd android && ./gradlew assembleDebug
```

A successful build with no manifest merger errors confirms the XML is valid.

### Step 2: Static Manifest Inspection

After the build, inspect the merged manifest to confirm all entries are present:

```bash
# View the merged manifest (includes all library contributions)
cat android/app/build/intermediates/merged_manifests/debug/AndroidManifest.xml | grep -E "POST_NOTIFICATIONS|FCMBroadcastReceiver|GcmIntentJobService"
```

Expected output: all three strings appear in the merged manifest.

### Step 3: Runtime Verification — Background State

1. Install the debug build on a physical Android device (emulators may not receive FCM).
2. Open the app, log in as a driver, confirm `OneSignal.login(servidorId)` fires (check Metro logs for `OneSignal external user ID linked`).
3. Press the Home button to background the app.
4. From the OneSignal dashboard → **Messages → New Push**, send a test push targeting the driver's `servidorId` as the external user ID.
5. Expected: notification banner appears on the device within seconds.

### Step 4: Runtime Verification — Killed State

1. Force-stop the app (`adb shell am force-stop gov.govmobile.app`).
2. Send the same test push from the OneSignal dashboard.
3. Expected: notification banner appears; tapping it opens the app and navigates to `MotoristaHome`.

### Step 5: `adb logcat` Diagnostics

```bash
adb logcat -s OneSignal:V FCM:V
```

Look for:
- `OneSignal: FCMBroadcastReceiver received` — confirms the receiver fired.
- `OneSignal: GcmIntentJobService started` — confirms the job service woke the app.
- `OneSignal: Notification displayed` — confirms the banner was posted.

If `FCMBroadcastReceiver received` does not appear, the manifest entry is still missing or the build was not clean.

### Step 6: End-to-End Regression Test

1. Log in as a passenger and request a ride.
2. With the driver app backgrounded/killed, confirm the driver receives the push.
3. With the driver app in the foreground, confirm the WebSocket path still delivers the offer modal (no regression on requirement 3.1).

---

## Regression Prevention

The following behaviors must not change as a result of this fix:

| Requirement | Behavior | How Preserved |
|---|---|---|
| 3.1 | Foreground WebSocket delivery continues | No changes to `useRealtimeSession` or WebSocket handling |
| 3.2 | Tapping a push navigates to `MotoristaHome` | No changes to `handleNotificationOpened` in `useNotifications` |
| 3.3 | Passenger push notifications unaffected | Manifest changes are additive; no existing entries removed |
| 3.4 | Logout removes external user ID | No changes to `removeOneSignalExternalUserId` |
| 3.5 | Login links external user ID | No changes to `setOneSignalExternalUserId` |
| 3.6 | Foreground `nova_corrida` banner shown | No changes to `registerForegroundHandler` |
| 3.7 | Non-ride pushes displayed | No changes to foreground handler logic |

The fix is **purely additive** to `AndroidManifest.xml` and `strings.xml`. No existing entries are modified or removed. No JavaScript files are touched.

---

## Testing Strategy

Because this fix is a native Android manifest change, the appropriate testing strategy is:

### Structural Tests (Manifest Validation)

Write a test that parses `AndroidManifest.xml` and asserts the required entries are present. This can be implemented as a simple Node.js/Jest test using an XML parser:

```typescript
// __tests__/androidManifest.test.ts
import { parseStringPromise } from 'xml2js';
import { readFileSync } from 'fs';

describe('AndroidManifest.xml — OneSignal FCM entries', () => {
  let manifest: any;

  beforeAll(async () => {
    const xml = readFileSync('android/app/src/main/AndroidManifest.xml', 'utf8');
    manifest = await parseStringPromise(xml);
  });

  it('declares POST_NOTIFICATIONS permission', () => {
    const permissions = manifest.manifest['uses-permission'].map(
      (p: any) => p.$['android:name']
    );
    expect(permissions).toContain('android.permission.POST_NOTIFICATIONS');
  });

  it('declares FCMBroadcastReceiver', () => {
    const receivers = manifest.manifest.application[0].receiver ?? [];
    const names = receivers.map((r: any) => r.$['android:name']);
    expect(names).toContain('com.onesignal.FCMBroadcastReceiver');
  });

  it('declares GcmIntentJobService', () => {
    const services = manifest.manifest.application[0].service ?? [];
    const names = services.map((s: any) => s.$['android:name']);
    expect(names).toContain('com.onesignal.GcmIntentJobService');
  });

  it('does not remove existing permissions', () => {
    const permissions = manifest.manifest['uses-permission'].map(
      (p: any) => p.$['android:name']
    );
    expect(permissions).toContain('android.permission.INTERNET');
    expect(permissions).toContain('android.permission.ACCESS_FINE_LOCATION');
  });
});
```

These tests are deterministic (single execution), fast, and directly validate the correctness properties defined above.

### Integration / Manual Tests

- Background delivery test (Step 3 in Verification Approach above)
- Killed-state delivery test (Step 4 in Verification Approach above)
- End-to-end regression test (Step 6 in Verification Approach above)

Property-based testing (generating random inputs across 100+ iterations) is not applicable here because the manifest is a static configuration file, not a function with a variable input space. The structural tests above provide equivalent coverage for the correctness properties.
