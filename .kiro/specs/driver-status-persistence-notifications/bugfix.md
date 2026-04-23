# Bugfix Requirements Document

## Introduction

Two related bugs affect the driver (motorista) experience in GovMobile:

**Bug 1 — Driver status not persisting on app reopen:** When a driver's operational status is `DISPONIVEL` and the app is closed or backgrounded, upon reopening the status resets to `null` (treated as `INDISPONIVEL`). The root cause is that `statusOperacional` is not included in the `auth` slice's Redux Persist whitelist, so it is lost on every cold start. The `INDISPONIVEL`/`OFFLINE` status must only be set by an explicit manual user action — never automatically by the app lifecycle.

**Bug 2 — Background push notifications not working correctly:** Drivers do not reliably receive OneSignal push notifications when the app is in the background or killed. The current `registerForegroundHandler` suppresses all foreground banners but does not ensure the OneSignal external user ID is set before the SDK is fully initialized, and the foreground handler calls `event.preventDefault()` unconditionally — which on some SDK versions also suppresses background delivery metadata. Additionally, the `servidorId` used as the OneSignal external user ID is not persisted, so after a cold start the `useNotifications` hook may attempt to call `setOneSignalExternalUserId` before `servidorId` is available in Redux.

---

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a driver has `statusOperacional` set to `DISPONIVEL` and closes the app THEN the system resets `statusOperacional` to `null` on the next cold start because the field is absent from the Redux Persist whitelist

1.2 WHEN the app reopens after being closed THEN the system treats a `null` `statusOperacional` as unavailable, causing the driver's UI to show the offline/unavailable state even though the driver did not manually change their status

1.3 WHEN the app is in the background or killed THEN the system does not reliably deliver OneSignal push notifications to the driver's device

1.4 WHEN the app cold-starts after being killed THEN the system may call `setOneSignalExternalUserId` before `servidorId` is rehydrated from the server, resulting in the OneSignal external user ID not being set and push notifications not being targeted to the correct device

### Expected Behavior (Correct)

2.1 WHEN a driver has `statusOperacional` set to `DISPONIVEL` and closes the app THEN the system SHALL persist `statusOperacional` across the app lifecycle so the same status is present on the next cold start

2.2 WHEN the app reopens after being closed THEN the system SHALL restore the driver's last known `statusOperacional` from persisted state and SHALL NOT automatically set it to `INDISPONIVEL` or `OFFLINE`

2.3 WHEN the app is in the background or killed THEN the system SHALL deliver OneSignal push notifications to the driver's device reliably, as the backend's OutboxWorker targets the `servidorId` external user ID

2.4 WHEN the app cold-starts and `servidorId` becomes available (after `getMe()` resolves) THEN the system SHALL call `setOneSignalExternalUserId` with the correct `servidorId` so the device is properly registered for targeted push notifications

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a driver manually toggles their status to `OFFLINE` via the UI THEN the system SHALL CONTINUE TO set `statusOperacional` to `OFFLINE` and persist that value

3.2 WHEN a driver manually toggles their status to `DISPONIVEL` via the UI THEN the system SHALL CONTINUE TO set `statusOperacional` to `DISPONIVEL` and persist that value

3.3 WHEN a driver logs out THEN the system SHALL CONTINUE TO clear `statusOperacional` (along with all other auth state) so the next session starts clean

3.4 WHEN the backend emits an `estado-operacional` WebSocket event THEN the system SHALL CONTINUE TO update `statusOperacional` in Redux to reflect the server-authoritative value

3.5 WHEN a ride reaches a terminal status THEN the system SHALL CONTINUE TO emit `ficar-disponivel` and set `statusOperacional` to `DISPONIVEL` as part of re-entering the dispatch queue

3.6 WHEN the app is in the foreground THEN the system SHALL CONTINUE TO suppress OneSignal banner notifications (the WebSocket channel handles foreground delivery to avoid duplicates)

3.7 WHEN a user taps a push notification THEN the system SHALL CONTINUE TO invoke the notification-opened handler for deep-link navigation
