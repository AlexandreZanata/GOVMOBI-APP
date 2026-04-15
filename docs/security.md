# GovMobile — Security

> **Goal:** Define authentication, authorization, data protection, and network security standards for a government-grade mobile application.

---

## 1) Authentication

### Strategy

- JWT-based authentication with short-lived access tokens
- Refresh token rotation: each refresh issues a new refresh token and invalidates the previous one
- Tokens are stored in platform secure storage (Expo SecureStore on iOS/Android)
- No tokens are stored in AsyncStorage, Redux state persistence, or local files

### Token Lifecycle

| Token         | Lifetime  | Storage          |
|---------------|-----------|------------------|
| Access token  | 15 min    | Memory (Redux)   |
| Refresh token | 7 days    | SecureStore      |

### Silent Refresh

- `useAuthSession` hook monitors access token expiry
- Refresh is attempted silently before expiry (at 80% of lifetime)
- On refresh failure: user is redirected to login; all in-memory tokens are cleared

---

## 2) Authorization

### Roles

| Role      | Permissions                                                              |
|-----------|--------------------------------------------------------------------------|
| `CITIZEN` | Request services, view own requests, chat with assigned officer, calls   |
| `OFFICER` | View and accept assignments, chat with citizens, call history            |
| `MANAGER` | All officer permissions + send announcements, view department reports    |
| `ADMIN`   | All permissions + user management, department configuration              |

### Rules

- Role is embedded in the JWT payload and validated on every API request (backend)
- Frontend enforces role-based UI visibility (screens, actions, navigation routes)
- Role checks must never be the sole security gate — backend must always validate
- Privilege escalation attempts must be logged server-side

---

## 3) Data Protection

### Sensitive Data Handling

- No PII (names, phone numbers, addresses) is logged to console in production builds
- Sensitive fields in API responses are masked in error logs
- User profile data is only displayed in screens where operationally necessary
- File attachments in chat are served via signed URLs with short expiry (future)

### Local Storage

| Data              | Storage           | Encrypted |
|-------------------|-------------------|-----------|
| Auth tokens       | SecureStore       | Yes       |
| User preferences  | MMKV              | No        |
| Redux persist     | MMKV              | No (non-sensitive slices only) |
| Chat cache        | Memory (Redux)    | N/A       |

### Rules

- Never persist `authSlice.token` or `authSlice.user` in plain MMKV
- Never log token values, even in development
- Clear all stored data on logout (`AuthFacade.logout()` must wipe SecureStore)

---

## 4) Network Security

### Transport

- HTTPS only for all REST API communication
- WSS (WebSocket Secure) for all real-time connections
- Plain HTTP and WS connections must be rejected at the client level

### Certificate Pinning (Future)

- Certificate pinning will be implemented before production release
- Pinning applies to the primary API domain and WebSocket endpoint
- Pin rotation strategy must be documented before enabling

### API Communication Rules

- All requests include the Authorization header: `Bearer <access_token>`
- Tokens are never passed as URL query parameters
- API base URL is defined in environment config, never hardcoded in source

---

## 5) Input Validation

- All user inputs are validated client-side before submission (format, length, type)
- Client-side validation is a UX aid only — backend must validate independently
- File uploads are restricted by type and size before sending
- Message content is sanitized before rendering (no raw HTML injection)

---

## 6) Session Management

- Logout clears: Redux store, SecureStore tokens, WebSocket connection
- Inactivity timeout: session expires after 30 minutes of inactivity (future)
- Concurrent session policy: single active session per user (future, backend-enforced)
- On app background: sensitive screens (e.g., active call, chat) are blurred via AppState listener (future)

---

## 7) Compliance Considerations

- Government applications must comply with applicable data protection regulations
- No analytics SDKs that collect PII without explicit user consent
- Crash reporting tools must be configured to scrub PII from reports
- Audit logs for sensitive operations (login, logout, role changes) must be maintained server-side

---

## Security Checklist (Pre-Release)

- [ ] Tokens stored only in SecureStore, never in plain storage
- [ ] HTTPS/WSS enforced; no plain HTTP allowed
- [ ] Certificate pinning implemented and tested
- [ ] Logout clears all tokens and sensitive state
- [ ] Role-based access enforced on both client and server
- [ ] No PII in console logs in production builds
- [ ] Input validation on all user-facing forms
- [ ] Dependency audit run (`npm audit`) with no high/critical vulnerabilities

---

## Related Docs

- `docs/product/overview.md`
- `docs/architecture/system-design.md`
- `docs/engineering-standards.md`
