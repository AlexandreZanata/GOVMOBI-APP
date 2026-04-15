# GovMobile — UX Flows

> **Goal:** Document the primary user flows as screen sequences to guide screen and navigation implementation.

---

## Flow 01 — Authentication

```
App Launch
    → Splash Screen (token check)
    ├── Token valid       → MainTabNavigator (Home)
    └── Token invalid     → LoginScreen
                              → [credentials submitted]
                              ├── Success → MainTabNavigator (Home)
                              └── Failure → LoginScreen (error state)
```

**Key UX rules:**
- Splash screen must not flash; token check should complete in < 300ms from cache
- Login errors must be specific (wrong credentials vs. network error)
- "Forgot password" navigates to ForgotPasswordScreen without losing login form state

---

## Flow 02 — Request a Service (Citizen)

```
Home Screen
    → Quick Actions grid
    → [select service category]
    → ServiceRequestScreen
        → [fill form: description, location, urgency]
        → [submit]
        ├── Success → RequestConfirmationScreen
        │               → [auto-navigate to Home after 3s]
        └── Error   → ServiceRequestScreen (error toast)
```

**Key UX rules:**
- Form must show inline validation before submission
- Submission shows a loading state on the button (not a full-screen loader)
- Confirmation screen shows estimated response time

---

## Flow 03 — Chat

```
MainTabNavigator (Chat tab)
    → ConversationListScreen
        → [search bar filters list]
        → [tap conversation]
        → ChatRoomScreen
            → [messages load, scroll to bottom]
            → [type message]
            → [send]
            → [message appears as "sending" → "sent" → "delivered" → "read"]
        → [tap back]
        → ConversationListScreen (updated last message preview)
```

**Key UX rules:**
- Conversation list shows unread count badge per conversation
- ChatRoomScreen scrolls to bottom on open and on new message received
- Typing indicator appears when the other party is typing (WebSocket event)
- Keyboard avoiding behavior must work correctly on both iOS and Android

---

## Flow 04 — Incoming Call

```
[Any screen — app in foreground]
    → IncomingCallScreen (full-screen modal, overlays current screen)
        ├── [Answer]  → ActiveCallScreen
        │                 → [call in progress: mute, speaker, hold]
        │                 → [End call]
        │                 → [previous screen restored]
        └── [Decline] → [modal dismissed]
                        → [call logged as missed in CallHistoryScreen]
```

**Key UX rules:**
- Incoming call screen must render within 500ms of receiving the WebSocket signal
- Haptic feedback fires on incoming call render
- Answer and decline buttons must have large touch targets (min 64x64)
- Active call screen must prevent accidental end-call via confirmation or button placement

---

## Flow 05 — Notifications

```
[Push notification received — app in background]
    → [tap notification]
    → App opens to relevant screen:
        ├── Chat notification    → ChatRoomScreen (correct conversation)
        ├── Call notification    → CallHistoryScreen
        └── Assignment notification → ServiceRequestScreen (correct request)

[App in foreground]
    → GlobalToast appears (3s auto-dismiss)
    → Notification badge updates on tab bar
    → [tap notification bell in header]
    → NotificationsScreen
        → [tap notification item]
        → [navigate to relevant screen]
        → [notification marked as read]
```

---

## Flow 06 — Settings and Language Switch

```
MainTabNavigator (Profile tab)
    → ProfileScreen
        → [tap Settings]
        → SettingsScreen
            → [tap Language]
            → LanguagePickerScreen
                → [select language]
                → [app re-renders in selected language immediately]
                → [preference persisted in uiSlice]
```

**Key UX rules:**
- Language switch must not require app restart
- All screens must re-render with new language immediately via i18n context
- Selected language is persisted and restored on next app launch

---

## Navigation Structure

```
RootNavigator
├── AuthNavigator (Stack)
│   ├── LoginScreen
│   └── ForgotPasswordScreen
└── MainTabNavigator (Bottom Tabs)
    ├── HomeStack (Stack)
    │   └── HomeScreen
    ├── ChatStack (Stack)
    │   ├── ConversationListScreen
    │   ├── ChatRoomScreen
    │   └── NewConversationScreen
    ├── CallsStack (Stack)
    │   ├── CallHistoryScreen
    │   ├── ActiveCallScreen
    │   └── IncomingCallScreen (Modal)
    ├── NotificationsScreen
    └── ProfileStack (Stack)
        ├── ProfileScreen
        └── SettingsScreen
```

---

## Transition Rules

| Transition type     | Animation          |
|---------------------|--------------------|
| Stack push/pop      | Slide (horizontal) |
| Modal open/close    | Slide (vertical)   |
| Tab switch          | Fade               |
| Full-screen overlay | Fade               |

See `docs/design-pattern/design-pattern-motion-navigation.md` for animation specs.

---

## Related Docs

- `docs/product/use-cases.md`
- `docs/design-pattern/design-pattern-motion-navigation.md`
- `docs/design-pattern/design-pattern-interactions.md`
- `README.md` (Step 8 — Navigation Setup)
