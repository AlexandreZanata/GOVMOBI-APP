# Implementation Plan

- [ ] 1. Add `POST_NOTIFICATIONS` permission to `AndroidManifest.xml`
  - File: `android/app/src/main/AndroidManifest.xml`
  - Add `<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>` alongside the existing `<uses-permission>` entries
  - Required on Android 13+ (API 33+) — without it the OS silently drops all notification posts on modern devices
  - _Requirements: 1.4, 2.4_

- [ ] 2. Add OneSignal FCM services to `AndroidManifest.xml`
  - File: `android/app/src/main/AndroidManifest.xml`
  - Add inside the `<application>` element:
    - `com.onesignal.notifications.BackgroundImageLayout` service (`android:exported="false"`)
    - `com.onesignal.GcmIntentJobService` service (`android:permission="android.permission.BIND_JOB_SERVICE"`, `android:exported="false"`)
  - These services allow the Android OS to wake the app process and hand off the FCM payload to the OneSignal SDK when the app is in background or killed state
  - _Requirements: 1.3, 2.3, 2.5_

- [ ] 3. Add OneSignal FCM broadcast receiver to `AndroidManifest.xml`
  - File: `android/app/src/main/AndroidManifest.xml`
  - Add inside the `<application>` element:
    - `com.onesignal.FCMBroadcastReceiver` receiver with `android:exported="true"`, `android:permission="com.google.android.c2dm.permission.SEND"`, and an `<intent-filter android:priority="999">` for `com.google.android.c2dm.intent.RECEIVE`
  - This receiver intercepts FCM messages from Google Play Services and routes them to the OneSignal SDK — without it, FCM pushes are never delivered when the app is not in the foreground
  - _Requirements: 1.3, 2.3, 2.5_

- [ ] 4. Add Firebase notification channel meta-data to `AndroidManifest.xml`
  - File: `android/app/src/main/AndroidManifest.xml`
  - Add inside the `<application>` element:
    - `<meta-data android:name="com.google.firebase.messaging.default_notification_channel_id" android:value="@string/default_notification_channel_id"/>`
  - Required for Android 8.0+ (API 26+) to assign notifications to a visible channel rather than silently dropping them
  - _Requirements: 2.3, 2.5_

- [ ] 5. Add notification channel string resource to `strings.xml`
  - File: `android/app/src/main/res/values/strings.xml`
  - Add `<string name="default_notification_channel_id" translatable="false">default</string>`
  - Satisfies the `@string/default_notification_channel_id` reference added in task 4
  - _Requirements: 2.3, 2.5_

- [ ] 6. Write structural manifest validation tests
  - File: `src/services/notifications/__tests__/androidManifest.test.ts`
  - Parse `android/app/src/main/AndroidManifest.xml` with `xml2js` and assert:
    - `POST_NOTIFICATIONS` permission is present (Property 1 from design)
    - `com.onesignal.FCMBroadcastReceiver` receiver is present with `android:exported="true"` (Property 2 from design)
    - `com.onesignal.GcmIntentJobService` service is present (Property 3 from design)
    - Existing permissions (`INTERNET`, `ACCESS_FINE_LOCATION`) are still present (Property 5 from design — preservation)
  - These tests are deterministic manifest parser tests, not PBT, because the manifest is static XML config
  - _Requirements: 1.3, 1.4, 2.3, 2.4, 2.5_

- [ ] 7. Verify clean build succeeds with no manifest merger errors
  - Run `cd android && ./gradlew assembleDebug`
  - Confirm build succeeds with no `Manifest merger failed` or `resource not found` errors
  - Inspect the merged manifest to confirm all OneSignal entries are present:
    `cat android/app/build/intermediates/merged_manifests/debug/AndroidManifest.xml | grep -E "POST_NOTIFICATIONS|FCMBroadcastReceiver|GcmIntentJobService"`
  - _Requirements: 2.3, 2.4, 2.5_
