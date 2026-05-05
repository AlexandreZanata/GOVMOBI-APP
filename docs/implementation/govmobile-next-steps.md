# GovMobile App — Next Steps Implementation Guide

> **Audience:** Engineers using AI coding assistants (Kiro, Copilot, Claude, etc.)
> **Stack:** React Native + Expo ~54, TypeScript 5 strict, Redux Toolkit, React Navigation 6
> **Cross-links:** [`../architecture/system-design.md`](../architecture/system-design.md) · [`../api-contract.md`](../api-contract.md) · [`../design-system/design-system-ai-guidelines.md`](../design-system/design-system-ai-guidelines.md) · [`./routes/README.md`](./routes/README.md)

---

## Overview

This guide covers the next implementation phases for **GovMobile** — the React Native mobile client for the Government Operational Mobility System. The app already has:

- ✅ Auth flow (Login, ForgotPassword) with Redux Persist
- ✅ Bottom tab navigation (Home, Chat, Calls, Notifications, Profile)
- ✅ Chat module (ConversationList, ChatRoom, realtime simulation)
- ✅ Calls module (CallHistory, IncomingCall, ActiveCall)
- ✅ Atomic design system (Atoms → Molecules → Organisms)
- ✅ i18n scaffolding (pt-BR, en-US, es)
- ✅ Facade pattern with `Result<T, E>` and `MOCK_MODE` support
- ✅ GlobalToast, NetworkBanner, AppHeader, BottomTabBar organisms


The next phases are:

1. **Servidores Screen** — Browse and search public servants linked to Cargos/Lotações
2. **Frota Screen** — View fleet vehicles and driver assignments
3. **Notifications Module** — Full push notification handling and list screen
4. **Profile & Settings** — User profile editing and app preferences
5. **Offline Support** — Queue mutations when offline, sync on reconnect

---

## Backend API Reference

> **Base URL:** `http://172.19.2.116:3000` — configure via `ENV.API_BASE_URL` in `src/config/env.ts`
> All `/cargos`, `/lotacoes`, `/servidores`, `/frota/*` responses use `{ success, data, timestamp }` envelope — unwrap `.data` in every facade.
> `/users`, `/departments`, `/audit` do NOT use the envelope — use `handleApiResponse<T>` directly.

| Domain        | Endpoint                          | Notes                                      |
|---------------|-----------------------------------|--------------------------------------------|
| Cargos        | `GET /cargos`                     | List job positions                         |
| Lotações      | `GET /lotacoes`                   | List organizational units                  |
| Servidores    | `GET /servidores`                 | List public servants (needs cargo+lotacao) |
| Motoristas    | `GET /frota/motoristas`           | Drivers linked to servidores               |
| Veículos      | `GET /frota/veiculos`             | Fleet vehicles                             |
| Users         | `GET /users`                      | Platform user accounts                     |
| Departments   | `GET /departments`                | Organizational departments                 |
| Audit         | `GET /audit`                      | Read-only audit log (cursor pagination)    |


---

## File Placement Quick Reference

| Asset                  | Directory                                    |
|------------------------|----------------------------------------------|
| Domain Interfaces      | `src/models/<Entity>.ts`                     |
| Input/Form Types       | `src/types/<feature>.ts`                     |
| Redux Slice            | `src/store/slices/<feature>Slice.ts`         |
| Facade (Interface+Impl)| `src/services/facades/<Feature>Facade.ts`    |
| Screen Hook & Styles   | `src/screens/<Feature>/use<Feature>.ts`      |
| Screen Component       | `src/screens/<Feature>/<Feature>Screen.tsx`  |
| UI Components          | `src/components/{atoms,molecules,organisms}/`|
| Locales                | `src/i18n/locales/*.json`                    |

---

## Mandatory Technical Rules (apply to every prompt below)

- **Zero `any`** — all types from `src/models/` and `src/types/`
- **Theme only** — `useTheme()` from `src/theme/index.ts`; no hardcoded hex/RGB/pixels
- **i18n 100%** — every user-facing string via `useTranslation()`; no hardcoded text
- **Facade pattern** — facades return `Result<T, E>`; screens never call `fetch()` directly
- **MOCK_MODE** — `ENV.MOCK_MODE` from `src/config/env.ts` controls mock vs real API
- **FlatList** — use `windowSize`, `removeClippedSubviews`, `keyExtractor` on all lists
- **JSDoc/TSDoc** — every exported hook, facade, and component needs `@param`/`@returns`
- **Role gates** — use `useAppSelector(state => state.auth.user?.role)` for UI visibility


---

## Phase 1 — Servidores Screen

### What to build

A searchable list of public servants (servidores) with their Cargo and Lotação. Field agents and dispatchers use this to look up colleagues. Admins can see full details.

### API Reference

| Method | Endpoint              | Description          | Envelope |
|--------|-----------------------|----------------------|----------|
| `GET`  | `/servidores`         | List all servidores  | ✅ yes   |
| `GET`  | `/servidores/:id`     | Get servidor by ID   | ✅ yes   |

Response shape (unwrapped `.data`):
```typescript
interface Servidor {
  id: string;
  nome: string;
  cpf: string;        // digits only, format on render
  email: string;
  telefone: string;
  cargoId: string;
  lotacaoId: string;
  papeis: ("USUARIO" | "ADMIN" | "MOTORISTA")[];
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
```

### File structure

```
src/
  models/
    Servidor.ts                              ← NEW
  types/
    servidores.ts                            ← NEW
  services/facades/
    ServidoresFacade.ts                      ← NEW
  store/slices/
    servidoresSlice.ts                       ← NEW (search/filter state only)
  screens/
    Servidores/
      ServidoresListScreen.tsx               ← NEW
      ServidorDetailScreen.tsx               ← NEW
      useServidoresList.ts                   ← NEW
      useServidorDetail.ts                   ← NEW
      ServidoresScreens.styles.ts            ← NEW
      __tests__/
        ServidoresListScreen.test.tsx        ← NEW
  i18n/locales/
    pt-BR.json                               ← extend: servidores namespace
    en-US.json                               ← extend: servidores namespace
    es.json                                  ← extend: servidores namespace
```


### Template 1-A: Servidor Model

```
You are implementing the Servidor domain model for GovMobile (React Native + Expo).

MANDATORY RULES:
- File: src/models/Servidor.ts
- Export interface Servidor and type Papel matching the real API response
- Export from src/models/index.ts
- Zero any — strict TypeScript
- JSDoc on every exported symbol

MODEL TO BUILD:
export type Papel = "USUARIO" | "ADMIN" | "MOTORISTA";

export interface Servidor {
  id: string;
  nome: string;
  cpf: string;           // stored as digits only, formatted on render
  email: string;
  telefone: string;
  cargoId: string;
  lotacaoId: string;
  papeis: Papel[];
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

Also add to src/types/servidores.ts:
  - ServidoresFilter: { search?: string; ativo?: boolean }
  - GetServidorByIdInput: { id: string }

API base URL: http://172.19.2.116:3000 (via ENV.API_BASE_URL)
Response envelope: { success: boolean; data: T; timestamp: string } — unwrap .data in facade
```

### Template 1-B: Servidores Facade

```
You are implementing the ServidoresFacade for GovMobile (React Native + Expo).

MANDATORY RULES:
- File: src/services/facades/ServidoresFacade.ts
- Implements interface IServidoresFacade
- Returns Result<T, FacadeError> for every method
- MOCK_MODE controlled by ENV.MOCK_MODE from src/config/env.ts
- In mock mode: return fixture data from src/services/mock/data/
- In real mode: fetch from ENV.API_BASE_URL + "/servidores"
- Unwrap response.data from { success, data, timestamp } envelope
- Zero any — all types from src/models/Servidor and src/types/servidores.ts
- JSDoc with @param, @returns on every method

METHODS TO BUILD:

1. listServidores(): Promise<Result<Servidor[], FacadeError>>
   GET /servidores
   Returns: Servidor[] unwrapped from response.data

2. getServidorById(input: GetServidorByIdInput): Promise<Result<Servidor, FacadeError>>
   GET /servidores/:id
   Returns: Servidor unwrapped from response.data
   Errors: 404 → FacadeError code "NOT_FOUND"

MOCK DATA: create 3-5 Servidor fixtures mixing ativo: true/false and different papeis
```

### Template 1-C: Servidores List Screen

```
You are implementing the ServidoresListScreen for GovMobile (React Native + Expo).

MANDATORY RULES:
- File: src/screens/Servidores/ServidoresListScreen.tsx
- Co-locate hook: src/screens/Servidores/useServidoresList.ts
- Co-locate styles: src/screens/Servidores/ServidoresScreens.styles.ts
- All strings via useTranslation("servidores")
- All styles via useTheme() — zero hardcoded values
- FlatList with windowSize={10}, removeClippedSubviews, keyExtractor
- Handle: loading (Skeleton atoms), error (retry button), empty state
- Role gate: ADMIN and SUPERVISOR see CPF column; FIELD_AGENT sees name+cargo only
- Navigation: tap row → ServidorDetailScreen with { servidorId }

SCREEN TO BUILD:
- AppHeader with title t("servidores.list.title")
- SearchBar molecule for filtering by nome
- FlatList of UserListItem molecules (reuse from src/components/molecules/)
  Each item: Avatar (initials), nome, cargo name, lotacao name, status badge
- Filter toggle: All / Active / Inactive (ativo field)
- Pull-to-refresh

useServidoresList hook:
  - Calls servidoresFacade.listServidores()
  - Local filter state: search string + ativo filter
  - Returns: { servidores, isLoading, isError, refresh, search, setSearch, filter, setFilter }

Navigation param: add ServidoresList and ServidorDetail to src/navigation/types.ts
  ServidoresList: undefined
  ServidorDetail: { servidorId: string }

i18n keys needed (servidores namespace):
  list.title, list.empty.title, list.empty.message,
  list.filters.all, list.filters.active, list.filters.inactive,
  list.searchPlaceholder,
  detail.title, detail.cargo, detail.lotacao, detail.papeis, detail.status,
  detail.cpf, detail.email, detail.telefone,
  status.active, status.inactive,
  papeis.USUARIO, papeis.ADMIN, papeis.MOTORISTA
```


### Template 1-D: POC Test — Servidores List

```
You are writing a POC test for ServidoresListScreen in GovMobile.

MANDATORY RULES:
- File: src/screens/Servidores/__tests__/ServidoresListScreen.test.tsx
- Uses Jest + React Native Testing Library
- Mocks ServidoresFacade via jest.mock
- Covers: loading state, error state, success (list renders), search filter, pull-to-refresh
- Zero any — typed mocks
- Uses i18n keys (not hardcoded strings) for assertions

TESTS TO WRITE:
1. renders loading skeletons while fetching
2. renders error state with retry button on facade failure
3. renders servidor list on success (check nome and cargo visible)
4. filters list when search text is entered
5. calls refresh on pull-to-refresh gesture
```

---

## Phase 2 — Frota Screen (Vehicles + Drivers)

### What to build

A tabbed screen showing fleet vehicles and their assigned drivers. Field agents use this to check vehicle availability. Dispatchers assign vehicles to runs.

### API Reference

| Method | Endpoint                  | Description         | Envelope |
|--------|---------------------------|---------------------|----------|
| `GET`  | `/frota/veiculos`         | List all vehicles   | ✅ yes   |
| `GET`  | `/frota/veiculos/:id`     | Get vehicle by ID   | ✅ yes   |
| `GET`  | `/frota/motoristas`       | List all drivers    | ✅ yes   |
| `GET`  | `/frota/motoristas/:id`   | Get driver by ID    | ✅ yes   |

Veiculo shape (unwrapped `.data`):
```typescript
interface Veiculo {
  id: string;
  placa: string;    // Mercosul format: ABC1D23
  modelo: string;
  ano: number;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
```

Motorista shape (unwrapped `.data`):
```typescript
type CnhCategoria = "A" | "AB" | "B" | "C" | "D" | "E";
type MotoristaStatusOperacional = "DISPONIVEL" | "EM_ROTA" | "AFASTADO";

interface Motorista {
  id: string;
  servidorId: string;
  cnhNumero: string;
  cnhCategoria: CnhCategoria;
  statusOperacional: MotoristaStatusOperacional;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
```


### File structure

```
src/
  models/
    Veiculo.ts                               ← NEW
    Motorista.ts                             ← NEW
  types/
    frota.ts                                 ← NEW
  services/facades/
    FrotaFacade.ts                           ← NEW (covers both veiculos + motoristas)
  screens/
    Frota/
      FrotaScreen.tsx                        ← NEW (tabbed: Veículos | Motoristas)
      VeiculosTab.tsx                        ← NEW
      MotoristasTab.tsx                      ← NEW
      useFrota.ts                            ← NEW
      FrotaScreen.styles.ts                  ← NEW
      __tests__/
        FrotaScreen.test.tsx                 ← NEW
  i18n/locales/
    pt-BR.json                               ← extend: frota namespace
    en-US.json                               ← extend: frota namespace
    es.json                                  ← extend: frota namespace
```

### Template 2-A: Frota Models

```
You are defining the Veiculo and Motorista domain models for GovMobile (React Native + Expo).

MANDATORY RULES:
- File: src/models/Veiculo.ts — export interface Veiculo
- File: src/models/Motorista.ts — export interface Motorista + types CnhCategoria, MotoristaStatusOperacional
- Export all from src/models/index.ts
- Zero any — strict TypeScript
- JSDoc on every exported symbol

MODELS TO BUILD:
Veiculo: { id, placa, modelo, ano, ativo, createdAt, updatedAt, deletedAt }
Motorista: { id, servidorId, cnhNumero, cnhCategoria, statusOperacional, ativo, createdAt, updatedAt, deletedAt }

Also add to src/types/frota.ts:
  - VeiculosFilter: { search?: string; ativo?: boolean }
  - MotoristasFilter: { statusOperacional?: MotoristaStatusOperacional; ativo?: boolean }

API base URL: http://172.19.2.116:3000 (via ENV.API_BASE_URL)
Response envelope: { success: boolean; data: T; timestamp: string } — unwrap .data in facade
```

### Template 2-B: Frota Facade

```
You are implementing the FrotaFacade for GovMobile (React Native + Expo).

MANDATORY RULES:
- File: src/services/facades/FrotaFacade.ts
- Implements interface IFrotaFacade
- Returns Result<T, FacadeError> for every method
- MOCK_MODE controlled by ENV.MOCK_MODE from src/config/env.ts
- Unwrap response.data from { success, data, timestamp } envelope
- Zero any — all types from src/models/ and src/types/frota.ts
- JSDoc with @param, @returns on every method

METHODS TO BUILD:

1. listVeiculos(): Promise<Result<Veiculo[], FacadeError>>
   GET /frota/veiculos

2. getVeiculoById(id: string): Promise<Result<Veiculo, FacadeError>>
   GET /frota/veiculos/:id
   Errors: 404 → FacadeError code "NOT_FOUND"

3. listMotoristas(): Promise<Result<Motorista[], FacadeError>>
   GET /frota/motoristas

4. getMotoristaById(id: string): Promise<Result<Motorista, FacadeError>>
   GET /frota/motoristas/:id
   Errors: 404 → FacadeError code "NOT_FOUND"

MOCK DATA: 3-5 Veiculo fixtures and 3-5 Motorista fixtures mixing ativo/statusOperacional values
```

### Template 2-C: Frota Screen

```
You are implementing the FrotaScreen for GovMobile (React Native + Expo).

MANDATORY RULES:
- File: src/screens/Frota/FrotaScreen.tsx
- Co-locate hook: src/screens/Frota/useFrota.ts
- Co-locate styles: src/screens/Frota/FrotaScreen.styles.ts
- All strings via useTranslation("frota")
- All styles via useTheme() — zero hardcoded values
- Two tabs: Veículos and Motoristas (use top tab pattern with Pressable, not React Navigation tabs)
- FlatList with windowSize={10}, removeClippedSubviews on each tab

SCREEN TO BUILD:
- AppHeader with title t("frota.title")
- Tab switcher: Veículos | Motoristas
- VeiculosTab: FlatList of cards showing placa, modelo, ano, status badge
  - Filter: All / Active / Inactive
  - Status badge color: active=success, inactive=error (theme tokens)
- MotoristasTab: FlatList of cards showing servidorId (resolve to nome if available),
  cnhCategoria badge, statusOperacional badge
  - Filter by statusOperacional: All / DISPONIVEL / EM_ROTA / AFASTADO
- Pull-to-refresh on both tabs

useFrota hook:
  - Calls frotaFacade.listVeiculos() and frotaFacade.listMotoristas()
  - Returns: { veiculos, motoristas, isLoading, isError, refresh, activeTab, setActiveTab }

i18n keys needed (frota namespace):
  title, tabs.veiculos, tabs.motoristas,
  veiculos.empty.title, veiculos.empty.message,
  veiculos.filters.all, veiculos.filters.active, veiculos.filters.inactive,
  veiculos.placa, veiculos.modelo, veiculos.ano,
  motoristas.empty.title, motoristas.empty.message,
  motoristas.status.DISPONIVEL, motoristas.status.EM_ROTA, motoristas.status.AFASTADO,
  motoristas.cnhCategoria, motoristas.filters.all,
  status.active, status.inactive
```


---

## Phase 3 — Notifications Module

### What to build

Full notification handling: push token registration, notification list screen, mark-as-read, and deep-link routing from notification tap.

### File structure

```
src/
  screens/
    Notifications/
      NotificationsScreen.tsx              ← NEW
      useNotifications.ts                  ← extend existing hook
      NotificationsScreen.styles.ts        ← NEW
      __tests__/
        NotificationsScreen.test.tsx       ← NEW
  hooks/
    useNotifications.ts                    ← already exists — extend
  store/slices/
    notificationsSlice.ts                  ← already exists — extend
```

### Template 3-A: Notifications Screen

```
You are implementing the NotificationsScreen for GovMobile (React Native + Expo).

MANDATORY RULES:
- File: src/screens/Notifications/NotificationsScreen.tsx
- Co-locate styles: src/screens/Notifications/NotificationsScreen.styles.ts
- All strings via useTranslation("notifications")
- All styles via useTheme() — zero hardcoded values
- FlatList with windowSize={10}, removeClippedSubviews
- Handle: loading (Skeleton), error (retry), empty state

SCREEN TO BUILD:
- AppHeader with title t("notifications.title") + "Mark all read" right action
  (only shown when unreadCount > 0, requires role DISPATCHER or above)
- FlatList of NotificationItem molecules (reuse from src/components/molecules/)
  Each item: icon by type, title, body, timestamp (relative), unread dot
- Swipe-to-dismiss (react-native-gesture-handler) calls markAsRead
- Pull-to-refresh
- Tap item: navigate to relevant screen based on notification.type
  (e.g. type="INCOMING_CALL" → CallsTab, type="NEW_MESSAGE" → ChatRoom)

useNotifications hook (extend existing):
  - Add: markAsRead(id: string), markAllAsRead()
  - Dispatch to notificationsSlice

i18n keys needed (notifications namespace):
  title, empty.title, empty.message,
  markAllRead, types.INCOMING_CALL, types.NEW_MESSAGE, types.SYSTEM_ALERT,
  timeAgo.justNow, timeAgo.minutesAgo, timeAgo.hoursAgo, timeAgo.daysAgo
```

---

## Phase 4 — Profile & Settings

### What to build

User profile view with editable display name and avatar. Settings screen for language selection, notification preferences, and app info.

### File structure

```
src/
  screens/
    Profile/
      ProfileScreen.tsx                    ← NEW
      SettingsScreen.tsx                   ← NEW
      useProfile.ts                        ← NEW
      ProfileScreens.styles.ts             ← NEW
      __tests__/
        ProfileScreen.test.tsx             ← NEW
  store/slices/
    authSlice.ts                           ← extend: updateProfile action
```

### Template 4-A: Profile Screen

```
You are implementing the ProfileScreen for GovMobile (React Native + Expo).

MANDATORY RULES:
- File: src/screens/Profile/ProfileScreen.tsx
- Co-locate hook: src/screens/Profile/useProfile.ts
- Co-locate styles: src/screens/Profile/ProfileScreens.styles.ts
- All strings via useTranslation("profile")
- All styles via useTheme() — zero hardcoded values
- Read user from useAppSelector(state => state.auth.user)

SCREEN TO BUILD:
- Large Avatar atom (size="xl") with initials fallback
- Display: name, email (read-only), role badge, department
- Edit mode toggle: tap pencil icon → name becomes editable TextInput
- Save calls authFacade.updateProfile({ name }) → dispatches updateProfile to authSlice
- Role badge color: ADMIN=error, SUPERVISOR=warning, DISPATCHER=info, FIELD_AGENT=success (theme tokens)
- "Settings" row → navigate to SettingsScreen
- "Sign out" row → dispatches logout action

i18n keys needed (profile namespace):
  title, edit, save, cancel, signOut, settings,
  fields.name, fields.email, fields.role, fields.department,
  roles.ADMIN, roles.SUPERVISOR, roles.DISPATCHER, roles.FIELD_AGENT,
  toast.updated, toast.updateFailed
```

### Template 4-B: Settings Screen

```
You are implementing the SettingsScreen for GovMobile (React Native + Expo).

MANDATORY RULES:
- File: src/screens/Profile/SettingsScreen.tsx
- All strings via useTranslation("settings")
- All styles via useTheme() — zero hardcoded values
- Language selection dispatches to uiSlice (already has language field)

SCREEN TO BUILD:
- AppHeader with back button, title t("settings.title")
- Section: Language — radio list: Português (pt-BR), English (en-US), Español (es)
  Selecting calls i18n.changeLanguage() and dispatches setLanguage to uiSlice
- Section: Notifications — toggle for push notifications enabled
  Reads/writes to notificationsSlice.pushEnabled
- Section: About — app version from expo-constants, build number
- All sections use Divider atom between items

i18n keys needed (settings namespace):
  title, sections.language, sections.notifications, sections.about,
  language.ptBR, language.enUS, language.es,
  notifications.pushEnabled, notifications.pushEnabledDesc,
  about.version, about.build
```


---

## Phase 5 — Offline Support

### What to build

Queue write mutations (sendMessage, markAsRead) when offline. Replay the queue when connectivity is restored. Show NetworkBanner (already exists) and disable send buttons when offline.

### File structure

```
src/
  store/slices/
    offlineQueueSlice.ts                   ← NEW
  hooks/
    useOfflineQueue.ts                     ← NEW
  services/
    offlineQueue.ts                        ← NEW: queue processor
```

### Template 5-A: Offline Queue

```
You are implementing the offline mutation queue for GovMobile (React Native + Expo).

MANDATORY RULES:
- File: src/store/slices/offlineQueueSlice.ts
- Redux Toolkit slice — NOT persisted (queue is ephemeral)
- File: src/hooks/useOfflineQueue.ts
- File: src/services/offlineQueue.ts — queue processor

WHAT TO BUILD:

offlineQueueSlice:
  State: { queue: QueuedMutation[] }
  QueuedMutation: { id: string; type: "SEND_MESSAGE" | "MARK_READ"; payload: unknown; createdAt: string }
  Actions: enqueue(mutation), dequeue(id), clearQueue()

useOfflineQueue hook:
  - Watches useAppSelector(state => state.ui.isConnected)
  - When isConnected transitions false → true: calls processQueue()
  - processQueue(): iterates queue, calls appropriate facade method per type, dequeues on success

Integration points:
  - In useChatRoom: if !isConnected, enqueue instead of calling facade directly
  - NetworkBanner already exists — no changes needed there
  - Show disabled state on send button when !isConnected

i18n keys needed (ui namespace — already exists, extend):
  offline.queuedMessages, offline.syncing, offline.syncComplete
```

---

## Implementation Order (Recommended)

```
Phase 1: Servidores Screen
  └─ Servidor model + types
  └─ ServidoresFacade (mock + real)
  └─ ServidoresListScreen + useServidoresList
  └─ ServidorDetailScreen + useServidorDetail
  └─ servidores i18n namespace
  └─ POC test

Phase 2: Frota Screen
  └─ Veiculo + Motorista models + types
  └─ FrotaFacade (mock + real)
  └─ FrotaScreen (tabbed) + useFrota
  └─ frota i18n namespace
  └─ POC test

Phase 3: Notifications Module
  └─ Extend notificationsSlice (markAsRead, markAllAsRead)
  └─ Extend useNotifications hook
  └─ NotificationsScreen + styles
  └─ notifications i18n namespace
  └─ POC test

Phase 4: Profile & Settings
  └─ Extend authSlice (updateProfile)
  └─ ProfileScreen + useProfile
  └─ SettingsScreen
  └─ profile + settings i18n namespaces
  └─ POC test

Phase 5: Offline Support
  └─ offlineQueueSlice
  └─ useOfflineQueue hook
  └─ offlineQueue processor
  └─ Integrate into useChatRoom
```

---

## Common Mistakes to Avoid

| Mistake                                          | Correct Approach                                              |
|--------------------------------------------------|---------------------------------------------------------------|
| Calling `fetch()` directly in a screen           | Move to facade, call via hook                                 |
| Hardcoding base URL in facade                    | Use `ENV.API_BASE_URL` from `src/config/env.ts`               |
| Returning raw API envelope `{ success, data }`   | Unwrap `.data` in the facade before returning                 |
| Hardcoded color strings in StyleSheet            | Use `theme.colors.*` tokens only                              |
| Hardcoded spacing values (e.g. `padding: 16`)    | Use `theme.spacing.*` tokens (e.g. `theme.spacing.md`)        |
| Hardcoded user-facing strings                    | All strings via `useTranslation()` with namespace             |
| `if (user.role === "ADMIN")` in JSX              | Use `useAppSelector(state => state.auth.user?.role)` gate     |
| Missing empty state for inactive-only filter     | All three states (loading, error, empty) are mandatory        |
| FlatList without `keyExtractor`                  | Always provide `keyExtractor={item => item.id}`               |
| Inline styles in JSX                             | Move to `StyleSheet.create` in co-located styles file         |
| `any` type in facade or hook                     | Define proper types in `src/types/<feature>.ts`               |

---

## Review Checklist (Definition of Done)

- [ ] `tsc --noEmit` passes with zero errors
- [ ] `npm run lint` passes with zero errors/warnings
- [ ] 100% i18n coverage — no hardcoded strings
- [ ] 100% theme token usage — no hardcoded colors/spacing
- [ ] Facade handles `MOCK_MODE` gracefully
- [ ] Role-based visibility logic implemented
- [ ] JSDoc/TSDoc present on all exported symbols
- [ ] FlatList uses `windowSize`, `removeClippedSubviews`, `keyExtractor`
- [ ] POC test covers loading, error, success, and primary interaction
- [ ] No inline styles in JSX (use co-located StyleSheet)

---

## Example Commit Format

```text
feat(servidores): implement servidores list and detail screens

- src/models/Servidor.ts — Servidor interface + Papel type
- src/types/servidores.ts — ServidoresFilter, GetServidorByIdInput
- src/services/facades/ServidoresFacade.ts — listServidores, getServidorById
- src/screens/Servidores/ServidoresListScreen.tsx — list with search + filter
- src/screens/Servidores/ServidorDetailScreen.tsx — detail view
- src/screens/Servidores/useServidoresList.ts — list hook with local filter
- src/i18n/locales/pt-BR.json — servidores namespace
- src/i18n/locales/en-US.json — servidores namespace
- src/screens/Servidores/__tests__/ServidoresListScreen.test.tsx — 5 tests, TSC clean
```
