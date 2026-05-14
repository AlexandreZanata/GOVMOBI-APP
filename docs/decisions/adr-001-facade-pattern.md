# ADR-001 — Use Facade Pattern for Service Layer

> **Status:** Accepted  
> **Date:** 2024-01  
> **Deciders:** Engineering team

---

## Context

Sorrimobi requires communication with a backend that does not yet exist in its final form. The frontend must be built in parallel with (or ahead of) the backend. Additionally, the backend architecture may evolve from a simple REST API toward microservices or a different protocol (GraphQL, gRPC) over time.

Without an abstraction layer, every screen and hook would directly call HTTP clients, making the codebase tightly coupled to the current backend implementation. Any backend change would require widespread UI-layer changes.

---

## Decision

Introduce a **Facade layer** (`src/services/facades/`) that sits between the UI/logic layer and the transport layer.

Each domain has a typed interface and a concrete implementation:

```
IAuthFacade → AuthFacadeImpl
IChatFacade → ChatFacadeImpl
ICallFacade → CallFacadeImpl
INotificationFacade → NotificationFacadeImpl
```

All facades:
- Accept an optional `MockMode` flag for development and testing
- Return a `Result<T, E>` type: `{ data: T; error: null } | { data: null; error: E }`
- Are injected via a `FacadeProvider` (dependency injection)

---

## Consequences

**Positive:**
- UI and logic layers are completely decoupled from transport details
- Backend can be replaced or restructured without touching screens or hooks
- Mock mode enables full UI development and testing without a running backend
- Facades are independently testable with no network dependency

**Negative:**
- Adds an extra abstraction layer that developers must understand
- Every new backend endpoint requires a facade method update
- Slightly more boilerplate per feature compared to direct API calls

---

## Alternatives Considered

| Alternative                 | Reason rejected                                                  |
|-----------------------------|------------------------------------------------------------------|
| Direct Axios calls in hooks | Tight coupling; hard to test; backend changes break UI code      |
| RTK Query only              | Good for caching but doesn't abstract WebSocket or complex flows |
| Repository pattern          | More suited to data persistence layers; overkill for mobile API  |

---

## Related Docs

- `docs/architecture/system-design.md`
- `README.md` (Step 6 — Service Facades)
- `src/services/facades/`
