# Bugfix Requirements Document

## Introduction

Drivers (motoristas) do not receive push notifications for new ride requests (`nova_corrida`) when the Sorrimobi app is minimized or in the background/killed state. The passenger successfully submits a ride request and receives confirmation, but the driver's device never shows the push notification. As a result, the driver misses the offer entirely and the ride goes unmatched.

The foreground path works correctly — when the app is open, the WebSocket delivers `nova-corrida-disponivel` and the offer modal appears. The failure is isolated to the background/killed delivery path, which relies on OneSignal pushing an FCM message to the driver's device.

Four contributing factors have been identified:

1. **`AndroidManifest.xml` is missing `POST_NOTIFICATIONS` permission** (required on Android 13+) and the OneSignal FCM background service/receiver declarations that allow the OS to wake the app and deliver the push.
2. **`app.config.js` has the `onesignal-expo-plugin` configured**, so the Expo build pipeline should auto-inject the native entries — but the current bare-workflow manifest does not reflect this, indicating the plugin output was not applied or was overwritten.
3. **`servidorId` linking timing**: `useNotifications` calls `OneSignal.login(servidorId)` only after `isAuthenticated && servidorId` are both truthy. For drivers, `motoristaId` may resolve later than `servidorId`, but the external user ID link itself uses `servidorId` (which is correct), so this path is sound.
4. **Foreground handler**: `registerForegroundHandler` correctly does NOT call `preventDefault()` for `nova_corrida` pushes, so foreground suppression is not the cause.

The primary fix is ensuring the Android native layer is correctly configured to receive FCM background pushes via OneSignal.

---

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the driver has the app minimized (background state) AND a passenger submits a ride request THEN the system does not deliver a push notification to the driver's device

1.2 WHEN the driver has the app killed (terminated state) AND a passenger submits a ride request THEN the system does not deliver a push notification to the driver's device

1.3 WHEN the Android OS attempts to deliver an FCM push to the app in background/killed state THEN the system fails to wake the app because the OneSignal FCM background service declarations are absent from `AndroidManifest.xml`

1.4 WHEN the app runs on Android 13+ AND OneSignal attempts to post a notification THEN the system silently drops the notification because `android.permission.POST_NOTIFICATIONS` is not declared in `AndroidManifest.xml`

1.5 WHEN the Expo bare-workflow `AndroidManifest.xml` is used as-is THEN the system does not include the OneSignal background service and receiver entries required for FCM delivery, because the `onesignal-expo-plugin` output was not applied to the manifest

### Expected Behavior (Correct)

2.1 WHEN the driver has the app minimized (background state) AND a passenger submits a ride request THEN the system SHALL deliver a push notification banner to the driver's device within the normal FCM delivery window

2.2 WHEN the driver has the app killed (terminated state) AND a passenger submits a ride request THEN the system SHALL deliver a push notification banner to the driver's device within the normal FCM delivery window

2.3 WHEN the Android OS receives an FCM push for the app in background/killed state THEN the system SHALL wake the app via the OneSignal FCM background service and deliver the notification

2.4 WHEN the app runs on Android 13+ AND OneSignal posts a notification THEN the system SHALL display the notification banner because `android.permission.POST_NOTIFICATIONS` is declared in `AndroidManifest.xml`

2.5 WHEN the Android build is produced THEN the system SHALL include all OneSignal-required `<service>` and `<receiver>` entries in `AndroidManifest.xml` so that FCM background delivery is operational

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the driver has the app in the foreground AND a new ride request arrives THEN the system SHALL CONTINUE TO deliver the offer via the WebSocket `nova-corrida-disponivel` event and display the NovaCorridaModal without relying on push

3.2 WHEN the driver taps a `nova_corrida` push notification from the background/killed state THEN the system SHALL CONTINUE TO hydrate Redux with `setPendingOffer` and navigate to `MotoristaHome` so the offer modal renders

3.3 WHEN a passenger receives a push notification (e.g., `aceita`, `em_rota`) THEN the system SHALL CONTINUE TO deliver and display those notifications correctly, unaffected by the driver-side manifest changes

3.4 WHEN the driver logs out THEN the system SHALL CONTINUE TO call `OneSignal.logout()` to remove the external user ID and stop push delivery to that device

3.5 WHEN the driver logs in and `servidorId` becomes available THEN the system SHALL CONTINUE TO call `OneSignal.login(servidorId)` to link the device for targeted push delivery

3.6 WHEN a `nova_corrida` push arrives while the app is in the foreground THEN the system SHALL CONTINUE TO display the OS banner (no `preventDefault()` called) so the driver sees the offer even if the WebSocket missed it

3.7 WHEN any non-ride push (system announcements, etc.) is received THEN the system SHALL CONTINUE TO display the banner without suppression
