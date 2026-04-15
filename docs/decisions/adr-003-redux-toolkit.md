# ADR-003 — Use Redux Toolkit for State Management

> **Status:** Accepted  
> **Date:** 2024-01  
> **Deciders:** Engineering team

---

## Context

GovMobile has multiple interconnected state domains: authentication, real-time chat, active calls, notifications, and UI preferences. State must be shared across screens, survive navigation transitions, and in some cases persist across app restarts.

A local state-only approach (useState/useReducer per screen) would not scale to cross-screen state like incoming calls or unread counts. A lightweight solution like Zustand was considered but lacks the ecosystem maturity needed for a government-grade application.

---

## Decision

Use **Redux Toolkit (RTK)** as the global state management solution, with **Redux Persist** for selective persistence.

**Slice organization:**

| Slice                | Persisted | Reason                                          |
|----------------------|-----------|-------------------------------------------------|
| `authSlice`          | Yes       | Token and user must survive app restart         |
| `uiSlice`            | Yes       | Theme and language preference must persist      |
| `chatSlice`          | No        | Refreshed from server on app open               |
| `callsSlice`         | No        | Call state is ephemeral                         |
| `notificationsSlice` | No        | Refreshed from server on app open               |

**RTK Query** is set up as a base API for future server-state caching.

---

## Consequences

**Positive:**
- Predictable, centralized state with clear ownership per slice
- Redux DevTools support for debugging
- RTK Query provides caching and background refetch for future use
- Redux Persist handles token and preference persistence with minimal config
- Typed hooks (`useAppSelector`, `useAppDispatch`) prevent type errors

**Negative:**
- More boilerplate than lightweight alternatives (Zustand, Jotai)
- Requires understanding of Redux concepts for new contributors
- Normalized state (chat messages) adds complexity

---

## Alternatives Considered

| Alternative   | Reason rejected                                                |
|---------------|----------------------------------------------------------------|
| Zustand       | Simpler API but less ecosystem support; no built-in DevTools   |
| React Context | Not suitable for high-frequency updates (chat, calls)          |
| Jotai/Recoil  | Atomic model is good but less familiar to most RN teams        |
| MobX          | Reactive model adds complexity; less predictable for debugging |

---

## Related Docs

- `docs/architecture/system-design.md`
- `README.md` (Step 7 — Redux Store Slices)
- `src/store/`
