# Sorrimobi — System Design

> **Goal:** Document the high-level architecture, layer responsibilities, and key data flows.

---

## Architecture Style

Sorrimobi is a mobile-first client application built with React Native. The frontend is designed to be backend-agnostic through the Facade pattern, allowing the backend to evolve independently (monolith → microservices) without impacting the UI layer.

```
┌─────────────────────────────────────────────┐
│                  UI Layer                   │
│   Screens → Organisms → Molecules → Atoms   │
├─────────────────────────────────────────────┤
│               Logic Layer                   │
│         Hooks → Redux Store Slices          │
├─────────────────────────────────────────────┤
│              Service Layer                  │
│     Facades → REST API + WebSocket          │
├─────────────────────────────────────────────┤
│              Backend (Future)               │
│     REST API + WebSocket Server             │
└─────────────────────────────────────────────┘
```

---

## Layer Responsibilities

| Layer     | Location                                       | Responsibility                                        |
|-----------|------------------------------------------------|-------------------------------------------------------|
| UI        | `src/components/`, `src/screens/`              | Render, layout, user interaction                      |
| Logic     | `src/hooks/`, `src/store/`                     | State management, side effects, business rules        |
| Service   | `src/services/facades/`                        | Abstract all external communication behind interfaces |
| Transport | `src/services/api/`, `src/services/websocket/` | HTTP and WebSocket clients                            |
| Models    | `src/models/`                                  | Shared TypeScript interfaces for all domain entities  |
| Theme     | `src/theme/`                                   | Design tokens, color, typography, spacing             |
| i18n      | `src/i18n/`                                    | All user-facing strings, multi-language support       |

---

## Communication Protocols

| Protocol  | Used For                                                  |
|-----------|-----------------------------------------------------------|
| REST      | CRUD operations, authentication, file uploads             |
| WebSocket | Real-time chat messages, call signaling, presence updates |

---

## Key Data Flows

### Chat Message Flow

```
User types message
    → MessageInput component
    → useChatRoom hook
    → ChatFacade.sendMessage()
    → WebSocket client (outbound)
    → Backend broadcasts to recipient
    → WebSocket client (inbound)
    → chatSlice.addMessage()
    → MessageList re-renders
```

### Incoming Call Flow

```
Backend sends call event
    → WebSocket client (inbound)
    → CallFacade receives signal
    → callsSlice.setIncomingCall()
    → RootNavigator detects incomingCall state
    → IncomingCallScreen rendered (full-screen modal)
    → User answers or declines
    → CallFacade.answerCall() or declineCall()
    → ActiveCallScreen or dismiss
```

### Service Request Dispatch Flow

```
Citizen submits request
    → ServiceFacade.createRequest()
    → REST POST /runs
    → Backend assigns available officer
    → Push notification to officer
    → Officer opens IncomingAssignmentScreen
    → Officer accepts → REST PATCH /runs/:id
    → Citizen notified via push + WebSocket
    → Chat conversation auto-created between citizen and officer
```

### Authentication Flow

```
App starts
    → useAuthSession hook
    → Check token expiry from Redux store
    → If valid: proceed to MainTabNavigator
    → If near expiry: AuthFacade.refreshToken() silently
    → If expired or refresh fails: redirect to AuthNavigator
    → User logs in → AuthFacade.login()
    → Token stored in SecureStore
    → authSlice updated → RootNavigator switches to Main
```

---

## State Management

Redux Toolkit manages all global state. Slices are organized by domain:

| Slice                | Owns                                                    |
|----------------------|---------------------------------------------------------|
| `authSlice`          | Current user, token, authentication status              |
| `chatSlice`          | Conversations, messages (normalized), typing indicators |
| `callsSlice`         | Call history, active call, incoming call signal         |
| `notificationsSlice` | Notification list, unread count, permission status      |
| `uiSlice`            | Theme, language, network status, global toasts          |

Redux Persist is applied to `authSlice` and `uiSlice` to survive app restarts.

---

## Real-time Strategy

- WebSocket connection is established after successful authentication
- Connection is managed by a singleton service in `src/services/websocket/`
- Reconnection with exponential backoff on disconnect
- All incoming events are dispatched to the Redux store via the relevant facade
- Presence (online/offline) is updated via WebSocket heartbeat

---

## Offline Strategy

- `authSlice` and `uiSlice` are persisted via Redux Persist (MMKV storage)
- Chat messages and call history are cached in the store after first load
- Network status is monitored by `useNetworkStatus` hook
- `NetworkBanner` organism surfaces connectivity loss to the user
- Write operations (send message, create request) are queued when offline (future)

---

## Scalability Considerations

- Facade interfaces are designed to be swappable — REST can be replaced with GraphQL without touching UI code
- RTK Query base API is set up for future server-state caching
- FlatList performance rules (windowSize, maxToRenderPerBatch, removeClippedSubviews) are enforced by design pattern docs
- Backend is expected to evolve toward microservices; facade boundaries map to service domains

---

## Related Docs

- `docs/product/overview.md`
- `docs/api-contract.md`
- `docs/security.md`
- `docs/design-pattern/design-pattern.md`
- `README.md` (step-by-step build guide)
