You are a senior React Native architect. I have a production app called GovMob and I need you to implement a professional, scalable push notification system using OneSignal — fully integrated with my existing auth flow, navigation, and state management. Do NOT generate files. Give me the complete implementation inline.

---

## Project context

- App: GovMob (ride-hailing for public servants)
- Framework: React Native (Expo or bare — specify which matters)
- State management: (fill in — e.g. Zustand / Redux Toolkit / Context API)
- Navigation: (fill in — e.g. React Navigation v6)
- Auth: JWT stored in SecureStore, refreshed via POST /auth/refresh
- OneSignal App ID: d6247b88-6e87-4695-ac0f-396993ede8ba
- External user ID: servidorId (UUID returned from login response as loginResponse.servidor.id)

---

## Notification payload contract

All notifications carry this additionalData shape:

interface NotificationPayload {
corridaId: string;   // UUID of the ride
status: 'RIDE_ACCEPTED' | 'DRIVER_ARRIVING' | 'RIDE_CANCELLED';
}

---

## What I need you to implement

### 1. Typed definitions
- Full TypeScript types and enums for all notification shapes
- NotificationStatus enum matching the three backend status values
- NotificationEvent interface (title, body, data, receivedAt)
- DeviceState interface (userId, pushToken, isSubscribed, hasNotificationPermission)

### 2. NotificationService (singleton)
- Module-level singleton — no React dependency, callable from anywhere
- initialize(): sets App ID, log level (__DEV__ only), requests permission
- identify(servidorId): calls OneSignal.setExternalUserId — resolves on success, rejects on failure (non-blocking from auth perspective)
- clearIdentity(): calls OneSignal.removeExternalUserId — always resolves
- getDeviceState(): returns a typed DeviceState promise
- onNotificationReceived(handler): subscribes to foreground notifications — returns an unsubscribe function
- onNotificationOpened(handler): subscribes to tap events — returns an unsubscribe function
- All handlers wrapped in try/catch — one bad subscriber must never break others
- Always call event.complete(notification) in the foreground handler
- Validate additionalData fields before broadcasting — skip unknown payloads

### 3. NotificationProvider + useNotifications() hook
- React Context wrapping the entire app root — zero prop drilling
- Calls notificationService.initialize() once in a useEffect
- Exposes: lastNotification, lastOpenedNotification, deviceState, identify, clearIdentity, refreshDeviceState
- Accepts an optional onNotificationOpened prop at the root level for driving navigation from outside the tree (cold-start / killed app scenario)
- Uses a stable ref for the onNotificationOpened callback so the effect never needs to re-run
- useNotifications() throws a descriptive error if called outside the provider

### 4. Auth integration
- Show exactly where to call identify(servidorId) in the login flow — after the auth response succeeds, non-blocking (push failure must never block login)
- Show exactly where to call clearIdentity() in the logout flow — before clearing local tokens
- Both integrations as minimal code snippets that slot into existing auth hooks

### 5. Navigation integration (notification opened)
- Handle all three NotificationStatus values with a switch/case routing to the correct screen
- RIDE_ACCEPTED and DRIVER_ARRIVING → navigate to 'RideDetails' with { corridaId }
- RIDE_CANCELLED → navigate to 'RideDetails' with { corridaId, showCancelledBanner: true }
- Guard against missing corridaId before navigating
- Show how to use a navigationRef so navigation works even when the app was fully closed

### 6. Consuming in a screen
- Show a minimal example of useNotifications() inside a screen component
- React to foreground DRIVER_ARRIVING notification with a local side-effect (e.g. refetch or show toast)
- No prop drilling — just the hook

---

## Code quality requirements

- Strict TypeScript — no `any`
- All subscriptions cleaned up in useEffect return / destroy()
- No memory leaks
- __DEV__ guards on all console.log calls
- Singleton must be safe to import anywhere (services, hooks, outside React)
- Works on both iOS and Android including background and killed-app states

---

## Deliverables

1. All types and enums
2. Full NotificationService class
3. NotificationProvider component + useNotifications hook
4. Auth integration snippets (login + logout)
5. App.tsx root wiring with navigationRef
6. Example screen consuming useNotifications()
7. Any package.json dependencies needed with versions