# Route: /auth — Authentication

> **Domain:** Autenticação
> **Base URL:** `http://172.19.2.116:3000` (env: `API_BASE_URL`)
> **Auth required:** Only `POST /auth/refresh`, `POST /auth/logout`, and `POST /auth/activate/:id` require a Bearer token.
> **Cross-links:** [`../govmobile-next-steps.md`](../govmobile-next-steps.md) · [`route-servidores.md`](./route-servidores.md)

---

## What This Route Does

The `/auth` group handles the full identity lifecycle for GovMobile:

- **Login** — exchanges CPF + senha for an `accessToken` / `refreshToken` pair.
- **Refresh** — rotates the access token using a valid refresh token (no re-login needed).
- **Logout** — invalidates both tokens server-side.
- **Register** — self-registration flow; account stays `PENDING` until an ADMIN activates it.
- **Activate** — ADMIN-only endpoint that transitions a `PENDING` servidor to `ACTIVE`.

> **Important:** The login body uses `cpf` + `senha`, **not** `username` + `password`. The existing `docs/api-contract.md` uses the old field names — this document reflects the live API.

---

## API Endpoints

| Method | Endpoint               | Auth required | Description                              | Success | Error codes |
|--------|------------------------|---------------|------------------------------------------|---------|-------------|
| `POST` | `/auth/login`          | No            | Exchange CPF + senha for token pair      | `200`   | `401`       |
| `POST` | `/auth/refresh`        | Bearer token  | Rotate access token                      | `200`   | `401`       |
| `POST` | `/auth/logout`         | Bearer token  | Invalidate current tokens                | `204`   | `401`       |
| `GET`  | `/auth/me`             | Bearer token  | Return authenticated user profile        | `200`   | `401`       |
| `POST` | `/auth/register`       | No            | Self-register (requires ADMIN activation)| `201`   | `400` `409` |
| `POST` | `/auth/activate/:id`   | Bearer (ADMIN)| Activate a pending servidor              | `200`   | `403` `404` |

---

## POST /auth/login

### Request body

```json
{
  "cpf": "00301748136",
  "senha": "GovMob@2026"
}
```

| Field  | Type   | Required | Description                  |
|--------|--------|----------|------------------------------|
| `cpf`  | string | Yes      | CPF digits only (11 chars)   |
| `senha`| string | Yes      | Account password             |

### Response `200`

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

> Tokens are raw JWTs — **no envelope wrapper** on this endpoint.
> Decode the `accessToken` payload to read `sub`, `cpf`, `email`, `nome`, `papeis`, `iat`, `exp`.

**Decoded `accessToken` payload example:**

```json
{
  "sub": "019d9674-6b4f-7102-a1f2-7cff0c5bb679",
  "cpf": "00301748136",
  "email": "admin@govmob.gov.br",
  "nome": "Administrador do Sistema",
  "papeis": ["ADMIN", "USUARIO"],
  "iat": 1776346729,
  "exp": 1776347629
}
```

> `accessToken` expires in ~15 minutes (`exp - iat = 900s`).
> `refreshToken` expires in ~7 days.

### Response `401`

```json
{
  "statusCode": 401,
  "timestamp": "2026-04-16T13:37:30.697Z",
  "path": "/auth/login",
  "code": "Unauthorized",
  "message": "Credenciais inválidas"
}
```

> Note: the error shape is **not** the standard `{ success, data }` envelope — it uses `statusCode` + `code` + `message` directly.

### Rate limiting

The server enforces a short-window rate limit on this endpoint:

| Header                       | Meaning                                  |
|------------------------------|------------------------------------------|
| `x-ratelimit-limit-short`    | Max requests in the short window (3)     |
| `x-ratelimit-remaining-short`| Remaining requests before throttle       |
| `x-ratelimit-reset-short`    | Milliseconds until the window resets     |

---

## GET /auth/me

Returns the authenticated user's profile. No request body.

### Request

```
GET /auth/me
Authorization: Bearer <accessToken>
```

### Response `200`

```json
{
  "id": "019d9674-6b4f-7102-a1f2-7cff0c5bb679",
  "email": "admin@govmob.gov.br",
  "nome": "Administrador do Sistema",
  "papeis": ["ADMIN", "USUARIO"]
}
```

> No envelope wrapper — the object is returned directly.
> `papeis` maps to `UserRole` in the app: `ADMIN` → `UserRole.ADMIN`, `USUARIO`/`MOTORISTA` → `UserRole.OFFICER`.

### Response `401`

Token missing, expired, or invalid.

### Rate limiting

| Header                       | Value |
|------------------------------|-------|
| `x-ratelimit-limit-short`    | 10    |

### When to call

| Trigger                  | Action                                                    |
|--------------------------|-----------------------------------------------------------|
| After `POST /auth/login` | Call `getMe()` to get the full profile (replaces JWT decode) |
| Cold start               | `useAuthSession` calls `getMe()` when `user` is null in Redux |
| After token refresh      | Not required — profile doesn't change on refresh          |

---

### Request

Send the `refreshToken` in the `Authorization: Bearer` header.

```
Authorization: Bearer <refreshToken>
```

No request body required.

### Response `200`

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

> Both tokens are rotated on every refresh call.

---

## POST /auth/logout

### Request

```
Authorization: Bearer <accessToken>
```

No request body.

### Response `204`

No content. Both tokens are invalidated server-side.

---

## POST /auth/register

Self-registration. The created account has status `PENDING` and cannot log in until an ADMIN calls `/auth/activate/:id`.

### Request body

```json
{
  "nome": "Fulano de Tal",
  "cpf": "12345678901",
  "email": "fulano@servidor.gov.br",
  "telefone": "11999999999",
  "cargoId": "019d917f-41db-70fb-bf47-7b1c46d8c844",
  "lotacaoId": "019d9180-65e1-725c-9450-e02beaa2993f",
  "senha": "MinhaSenhaSegura"
}
```

| Field       | Type   | Required | Description                        |
|-------------|--------|----------|------------------------------------|
| `nome`      | string | Yes      | Full name                          |
| `cpf`       | string | Yes      | CPF digits only (11 chars)         |
| `email`     | string | Yes      | Institutional email                |
| `telefone`  | string | Yes      | Phone number                       |
| `cargoId`   | string | Yes      | UUID of an existing active Cargo   |
| `lotacaoId` | string | Yes      | UUID of an existing active Lotação |
| `senha`     | string | Yes      | Password (min 8 chars recommended) |

### Response `201`

Returns the created servidor object with `status: "PENDING"`.

---

## POST /auth/activate/:id

ADMIN-only. Transitions a `PENDING` servidor to `ACTIVE`, allowing them to log in.

### Path parameter

| Name | Type   | Description                          |
|------|--------|--------------------------------------|
| `id` | string | UUID of the pending servidor account |

### Request

```
Authorization: Bearer <adminAccessToken>
```

No request body.

### Response `200`

Returns the activated servidor object.

### Response `403`

Returned when the caller does not have the `ADMIN` papel.

---

## Token Storage Strategy (Mobile)

| Token          | Storage                  | Notes                                      |
|----------------|--------------------------|--------------------------------------------|
| `accessToken`  | Redux state (in-memory)  | Never persisted to disk — lost on app kill |
| `refreshToken` | `expo-secure-store`      | Encrypted on-device, survives app restarts |

> The `authSlice` holds `accessToken` in memory. On cold start, the app reads the `refreshToken` from secure storage and calls `/auth/refresh` to obtain a new `accessToken` before navigating to the main tab.

---

## Facade Integration

The `AuthFacade` in `src/services/facades/AuthFacade.ts` wraps these endpoints. Key differences from other facades:

- Login and refresh responses are **not** wrapped in `{ success, data }` — read `accessToken` and `refreshToken` directly from the response body.
- Error responses use `{ statusCode, code, message }` — map `code: "Unauthorized"` → `401`.
- The facade must decode the `accessToken` JWT (without verification — that's the server's job) to extract `sub`, `nome`, `email`, and `papeis` for the Redux `auth` slice.

```typescript
// Minimal JWT decode (no verification needed on client)
function decodeJwtPayload(token: string): JwtPayload {
  const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(atob(base64)) as JwtPayload;
}
```

---

## File Map

| File                                              | Type    | Purpose                                      |
|---------------------------------------------------|---------|----------------------------------------------|
| `src/services/facades/AuthFacade.ts`              | Facade  | login, refresh, logout, register, activate   |
| `src/services/facades/mock/AuthFacadeMock.ts`     | Mock    | MOCK_MODE implementation                     |
| `src/store/slices/authSlice.ts`                   | Redux   | accessToken, user, isAuthenticated           |
| `src/screens/Auth/LoginScreen.tsx`                | Screen  | Login form (CPF + senha)                     |
| `src/screens/Auth/LoginScreen.styles.ts`          | Styles  | Login screen styles                          |
| `src/navigation/AuthNavigator.tsx`                | Nav     | Unauthenticated stack                        |
| `src/navigation/RootNavigator.tsx`                | Nav     | Auth gate — switches between Auth/Main stacks|

---

## Review Checklist

- [ ] Login body uses `cpf` + `senha` (not `username` + `password`)
- [ ] `accessToken` stored in Redux memory only — never persisted
- [ ] `refreshToken` stored in `expo-secure-store`
- [ ] JWT payload decoded client-side to populate `authSlice.user`
- [ ] `papeis` array from JWT used for role-based UI gates
- [ ] Refresh called on cold start before navigating to main tab
- [ ] Rate-limit headers surfaced to the user after 3 failed attempts
- [ ] `POST /auth/activate/:id` gated behind `ADMIN` papel check in UI
- [ ] Error shape `{ statusCode, code, message }` handled in facade (not the standard envelope)
