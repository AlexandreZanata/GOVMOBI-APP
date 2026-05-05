# Admin Panel — Next Steps Implementation Guide

> **Audience:** Engineers using AI coding assistants (Kiro, Copilot, Claude, etc.)
> **Project:** GOVMOBI-ADMIN (Next.js 16 web admin panel) — **not the React Native mobile app**
> **For the mobile app guide, see:** [`govmobile-next-steps.md`](./govmobile-next-steps.md)
> **Cross-links:** [`ai-driver-dispatcher-prompt-guide.md`](./ai-driver-dispatcher-prompt-guide.md) · [`../architecture/system-design.md`](../architecture/system-design.md) · [`../api-contract.md`](../api-contract.md) · [`../design-system/design-system-ai-guidelines.md`](../design-system/design-system-ai-guidelines.md)

---

## Backend API Base URL

> All routes below use `http://172.19.2.116:3000` — configure via `NEXT_PUBLIC_API_URL` env var.
> See [`./routes/README.md`](./routes/README.md) for per-domain route guides with full request/response shapes.

---

## Overview

This guide covers the next implementation phases for GOVMOBI-ADMIN. The project already has:

- ✅ `RunsPageClient` organism with filtering, loading, error, and empty states
- ✅ `runsFacade` with `listRuns`, `getRunById`, `overrideRun`
- ✅ `useRuns` and `useOverrideRunMutation` hooks
- ✅ `PermissionsProvider` + `Can` RBAC gates
- ✅ Atomic design system (Button, Badge, Avatar, Input, StatusPill, StatusChip)
- ✅ i18n scaffolding (en/runs, en/common, en/auth, en/users)
- ✅ MSW handler for runs domain

The next phases are:

1. **Admin Shell** — Sidebar layout, navigation, and route structure
2. **Cargos Domain** — Full CRUD for the `/cargos` API (new real backend)
3. **Lotações Domain** — Full CRUD for the `/lotacoes` API (new real backend)
4. **Servidores Domain** — Full CRUD for the `/servidores` API (depends on Cargos + Lotações)
5. **Frota / Motoristas** — Driver management linked to Servidores (`/frota/motoristas`)
6. **Frota / Veículos** — Fleet vehicle management (`/frota/veiculos`) — soft-delete via `PATCH /desativar`
7. **Users Domain** — User management page
8. **Departments Domain** — Department management page
9. **Audit Trail** — Read-only audit log viewer

---

## Phase 1 — Admin Shell (Sidebar + Layout)

### What to build

A persistent admin shell wrapping all `(admin)` routes with:
- Collapsible sidebar with navigation links
- Top header bar (user avatar, role badge, logout)
- Active route highlighting
- Mobile-responsive drawer behavior
- Permission-aware nav items (hide links the user cannot access)

### File structure

```
src/
  app/
    (admin)/
      layout.tsx              ← NEW: shell layout wrapping all admin routes
  components/
    organisms/
      AdminShell.tsx          ← NEW: sidebar + header composition
      SidebarNav.tsx          ← NEW: nav link list with active state
    molecules/
      NavItem.tsx             ← NEW: single nav link with icon + label
      UserMenu.tsx            ← NEW: avatar dropdown (profile, logout)
  i18n/locales/en/
    nav.json                  ← NEW: navigation labels
```

### Template 1-A: Admin Shell Layout

```
You are implementing the admin shell layout for GOVMOBI-ADMIN.

MANDATORY RULES:
- File: src/app/(admin)/layout.tsx
- This is a Server Component (no "use client")
- Wraps all (admin) routes with a persistent sidebar + header
- Sidebar is collapsible; state is stored in a cookie (server-readable)
- Uses design tokens only — no hardcoded colors
- All nav labels via useTranslation("nav")
- Sidebar nav items are defined in a static config array typed as NavItem[]
- Each NavItem has: { href, labelKey, icon, permission? }
- Items with a permission field are wrapped in <Can perform={...}>
- Active route detected via usePathname() in a "use client" child component

STACK: Next.js 16 App Router, React 19, TypeScript strict, Tailwind v4

LAYOUT TO BUILD:
File: src/app/(admin)/layout.tsx
Children slot: {children} rendered in main content area
Sidebar width: 240px expanded, 64px collapsed
Header height: 56px
Nav items:
  - { href: "/runs",        labelKey: "nav.runs",        icon: "ClipboardList", permission: "run:view" }
  - { href: "/cargos",      labelKey: "nav.cargos",      icon: "Briefcase",     permission: "cargo:view" }
  - { href: "/lotacoes",    labelKey: "nav.lotacoes",    icon: "MapPin",        permission: "lotacao:view" }
  - { href: "/users",       labelKey: "nav.users",       icon: "Users",         permission: "user:view" }
  - { href: "/departments", labelKey: "nav.departments", icon: "Building2",     permission: "department:view" }
  - { href: "/audit",       labelKey: "nav.audit",       icon: "ScrollText",    permission: "audit:view" }

Components to create alongside:
- src/components/organisms/AdminShell.tsx (client component, receives navItems + children)
- src/components/organisms/SidebarNav.tsx (client component, handles collapse state)
- src/components/molecules/NavItem.tsx (single nav link)
- src/components/molecules/UserMenu.tsx (avatar + role badge + logout button)

i18n keys needed (nav.json):
  nav.runs, nav.cargos, nav.lotacoes, nav.users, nav.departments, nav.audit,
  nav.collapse, nav.expand, nav.logout, nav.profile

Accessibility:
  - nav element with aria-label="Main navigation"
  - aria-current="page" on active link
  - Collapse button: aria-expanded, aria-label
  - Skip-to-content link at top of layout
```

---

## Phase 2 — Cargos Domain (New Real API)

### API Reference

Base URL: `http://172.19.2.116:3000` (configure via `NEXT_PUBLIC_API_URL` env var)

| Method   | Endpoint              | Description              | Success |
|----------|-----------------------|--------------------------|---------|
| `GET`    | `/cargos`             | List all cargos          | `200`   |
| `POST`   | `/cargos`             | Create new cargo         | `201`   |
| `GET`    | `/cargos/:id`         | Get cargo by ID          | `200`   |
| `PUT`    | `/cargos/:id`         | Update cargo             | `200`   |
| `DELETE` | `/cargos/:id`         | Soft-delete cargo        | `200`   |
| `PATCH`  | `/cargos/:id/reativar`| Reactivate cargo         | `200`   |

### Cargo shape (from real API)

```typescript
interface Cargo {
  id: string;           // UUID v7
  nome: string;
  pesoPrioridade: number;
  ativo: boolean;
  createdAt: string;    // ISO 8601
  updatedAt: string;
  deletedAt: string | null;
}
```

### Error codes

| HTTP | Meaning                                  |
|------|------------------------------------------|
| 201  | Cargo criado com sucesso                 |
| 200  | Operação realizada com sucesso           |
| 404  | Cargo não encontrado                     |
| 409  | Nome de cargo já existe / em uso         |

### File structure

```
src/
  models/
    Cargo.ts                          ← NEW
  types/
    cargos.ts                         ← NEW: input/output types
  facades/
    cargosFacade.ts                   ← NEW
  lib/queryKeys/
    cargosKeys.ts                     ← NEW
  hooks/
    useCargos.ts                      ← NEW: list query
    useCreateCargo.ts                 ← NEW: mutation
    useUpdateCargo.ts                 ← NEW: mutation
    useDeleteCargo.ts                 ← NEW: soft-delete mutation
    useReativarCargo.ts               ← NEW: reactivate mutation
  msw/
    cargosHandlers.ts                 ← NEW
  test/fixtures/
    cargos.ts                         ← NEW
  app/(admin)/
    cargos/
      page.tsx                        ← NEW: server component
  components/
    organisms/
      CargosPageClient.tsx            ← NEW
    molecules/
      CargoFormDialog.tsx             ← NEW: create/edit dialog
      CargoDeleteDialog.tsx           ← NEW: soft-delete confirm
  i18n/locales/en/
    cargos.json                       ← NEW
```

### Template 2-A: Cargo Model

```
You are defining the Cargo domain model for GOVMOBI-ADMIN.

MANDATORY RULES:
- File: src/models/Cargo.ts
- Export interface Cargo matching the real API response shape
- Export from src/models/index.ts

MODEL TO BUILD:
interface Cargo {
  id: string;
  nome: string;
  pesoPrioridade: number;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

Also add to src/types/cargos.ts:
  - CreateCargoInput: { nome: string; pesoPrioridade: number }
  - UpdateCargoInput: { nome: string; pesoPrioridade: number }
  - GetCargoByIdInput: { id: string }
```

### Template 2-B: Cargos Facade

```
You are implementing the cargosFacade for GOVMOBI-ADMIN.

MANDATORY RULES:
- File: src/facades/cargosFacade.ts
- Base URL from env: process.env.NEXT_PUBLIC_API_URL ?? "http://172.19.2.116:3000"
- Every method uses handleApiResponse<T>() for response parsing
- Zero any — all types from src/models/Cargo and src/types/cargos.ts
- JSDoc with @param, @returns, @throws on every method

METHODS TO BUILD:

1. listCargos(): Promise<Cargo[]>
   GET /cargos
   Returns: Cargo[] from response.data

2. getCargoById(input: GetCargoByIdInput): Promise<Cargo>
   GET /cargos/:id
   Returns: Cargo from response.data
   Errors: 404

3. createCargo(input: CreateCargoInput): Promise<Cargo>
   POST /cargos
   Body: { nome, pesoPrioridade }
   Returns: Cargo from response.data
   Errors: 409 (nome já existe)

4. updateCargo(id: string, input: UpdateCargoInput): Promise<Cargo>
   PUT /cargos/:id
   Body: { nome, pesoPrioridade }
   Returns: Cargo from response.data
   Errors: 404, 409

5. deleteCargo(id: string): Promise<void>
   DELETE /cargos/:id
   Errors: 404

6. reativarCargo(id: string): Promise<Cargo>
   PATCH /cargos/:id/reativar
   Returns: Cargo from response.data
   Errors: 404

NOTE: The real API wraps responses as { success: boolean, data: T, timestamp: string }.
handleApiResponse must unwrap .data before returning. Verify this is handled or extend it.
```

### Template 2-C: Cargos Query Hook

```
You are implementing the useCargos query hook for GOVMOBI-ADMIN.

MANDATORY RULES:
- File: src/hooks/useCargos.ts
- Uses TanStack Query useQuery
- Calls cargosFacade.listCargos() — NEVER calls fetch directly
- Uses cargosKeys.list() query key
- Returns { data, isLoading, isError, refetch }
- Full TypeScript — zero any

HOOK TO BUILD:
Name: useCargos
Facade method: cargosFacade.listCargos
Query key: cargosKeys.list()
Return type: Cargo[]
Stale time: 30000

Also create src/lib/queryKeys/cargosKeys.ts:
  cargosKeys.list()       → ["cargos", "list"]
  cargosKeys.detail(id)   → ["cargos", "detail", id]
```

### Template 2-D: Cargos Mutation Hooks

```
You are implementing mutation hooks for the cargos domain in GOVMOBI-ADMIN.

MANDATORY RULES:
- Each hook in its own file: src/hooks/use[Name].ts
- Uses TanStack Query useMutation
- Calls cargosFacade.[method]() — NEVER calls fetch directly
- On success: invalidates cargosKeys.list() + shows success toast
- On error: shows error toast per error code
- Full TypeScript — zero any

MUTATIONS TO BUILD:

1. useCreateCargo (src/hooks/useCreateCargo.ts)
   Facade: cargosFacade.createCargo(input)
   Input: CreateCargoInput
   On success: invalidate cargosKeys.list(), toast success "cargos:toast.created"
   On 409: toast error "cargos:toast.duplicateName"
   On 500: toast error "common:toast.serverError"

2. useUpdateCargo (src/hooks/useUpdateCargo.ts)
   Facade: cargosFacade.updateCargo(id, input)
   Input: { id: string } & UpdateCargoInput
   On success: invalidate cargosKeys.list() + cargosKeys.detail(id)
   On 404: toast error "cargos:toast.notFound"
   On 409: toast error "cargos:toast.duplicateName"

3. useDeleteCargo (src/hooks/useDeleteCargo.ts)
   Facade: cargosFacade.deleteCargo(id)
   Input: { id: string }
   On success: invalidate cargosKeys.list()
   On 404: toast error "cargos:toast.notFound"

4. useReativarCargo (src/hooks/useReativarCargo.ts)
   Facade: cargosFacade.reativarCargo(id)
   Input: { id: string }
   On success: invalidate cargosKeys.list()
   On 404: toast error "cargos:toast.notFound"
```

### Template 2-E: Cargos Page

```
You are implementing the Cargos management page for GOVMOBI-ADMIN.

MANDATORY RULES:
- Follow the architecture: UI → Hook → Facade → API
- Server Component for the page; "use client" only for CargosPageClient
- All strings via useTranslation("cargos")
- All colors via design tokens
- Handle: isLoading (skeleton), isError (ErrorState + retry), empty state
- Permission gates via <Can perform="...">
- data-testid on all interactive elements

PAGE TO BUILD:
Route: /cargos
File: src/app/(admin)/cargos/page.tsx
Purpose: List, create, edit, soft-delete, and reactivate cargos

CargosPageClient (src/components/organisms/CargosPageClient.tsx):
- Table layout with columns: Nome, Peso Prioridade, Status (ativo/inativo), Actions
- "Novo Cargo" button (requires permission "cargo:create") opens CargoFormDialog
- Each row has Edit button (requires "cargo:edit") and Delete/Reativar button
- Inactive cargos show a "Reativar" action instead of "Desativar"
- Filter toggle: show all / only active / only inactive

CargoFormDialog (src/components/molecules/CargoFormDialog.tsx):
- Used for both create and edit (mode prop: "create" | "edit")
- Fields: nome (text, required), pesoPrioridade (number, 0–100, required)
- Submit calls useCreateCargo or useUpdateCargo depending on mode
- Closes on success, stays open on error

CargoDeleteDialog (src/components/molecules/CargoDeleteDialog.tsx):
- Confirm soft-delete dialog
- No reason field required
- Confirm button variant="destructive"
- Calls useDeleteCargo on confirm

i18n keys needed (cargos.json):
  page.title, page.empty.title, page.empty.message,
  page.accessDenied, page.filters.all, page.filters.active, page.filters.inactive,
  table.nome, table.pesoPrioridade, table.status, table.actions,
  actions.create, actions.edit, actions.delete, actions.reativar,
  form.nome, form.pesoPrioridade, form.submit, form.cancel,
  status.active, status.inactive,
  toast.created, toast.updated, toast.deleted, toast.reativado,
  toast.duplicateName, toast.notFound
```

### Template 2-F: Cargos MSW Handlers

```
You are creating MSW handlers for the cargos domain in GOVMOBI-ADMIN.

MANDATORY RULES:
- File: src/msw/cargosHandlers.ts
- Uses msw v2 http and HttpResponse
- Base URL matches: process.env.NEXT_PUBLIC_API_URL ?? "http://172.19.2.116:3000"
- Simulates realistic latency: delay(200) to delay(500)
- Response shape matches real API: { success: true, data: T, timestamp: string }
- Uses fixture data from src/test/fixtures/cargos.ts
- Exported as cargosHandlers array

ENDPOINTS TO MOCK:
- GET    /cargos              → 200 { success, data: Cargo[], timestamp }
- POST   /cargos              → 201 { success, data: Cargo, timestamp }
                                409 if nome === "DUPLICATE_TEST"
- GET    /cargos/:id          → 200 { success, data: Cargo, timestamp }
                                404 if id === "not-found"
- PUT    /cargos/:id          → 200 { success, data: Cargo, timestamp }
                                404 / 409
- DELETE /cargos/:id          → 200 { success: true, timestamp }
                                404 if id === "not-found"
- PATCH  /cargos/:id/reativar → 200 { success, data: Cargo, timestamp }
                                404 if id === "not-found"

FIXTURE FILE: src/test/fixtures/cargos.ts
  Export: mockCargos (array of 3–5 Cargo objects, mix of ativo: true and false)
```

---

## Phase 3 — Lotações Domain (New Real API)

### API Reference

Base URL: `http://172.19.2.116:3000` (same as Cargos — `NEXT_PUBLIC_API_URL`)

| Method   | Endpoint                  | Description               | Success |
|----------|---------------------------|---------------------------|---------|
| `GET`    | `/lotacoes`               | List all lotações         | `200`   |
| `POST`   | `/lotacoes`               | Create new lotação        | `201`   |
| `GET`    | `/lotacoes/:id`           | Get lotação by ID         | `200`   |
| `PUT`    | `/lotacoes/:id`           | Update lotação            | `200`   |
| `DELETE` | `/lotacoes/:id`           | Soft-delete lotação       | `200`   |
| `PATCH`  | `/lotacoes/:id/reativar`  | Reactivate lotação        | `200`   |

### Lotação shape (from real API)

```typescript
interface Lotacao {
  id: string;           // UUID v7
  nome: string;
  ativo: boolean;
  createdAt: string;    // ISO 8601
  updatedAt: string;
  deletedAt: string | null;
}
```

> Note: unlike `Cargo`, `Lotacao` has no `pesoPrioridade` field.

### Error codes

| HTTP | Meaning                              |
|------|--------------------------------------|
| 201  | Lotação criada com sucesso           |
| 200  | Operação realizada com sucesso       |
| 404  | Lotação não encontrada               |
| 409  | Nome de lotação já existe / em uso   |

### File structure

```
src/
  models/
    Lotacao.ts                          ← NEW
  types/
    lotacoes.ts                         ← NEW: input/output types
  facades/
    lotacoesFacade.ts                   ← NEW
  lib/queryKeys/
    lotacoesKeys.ts                     ← NEW
  hooks/
    useLotacoes.ts                      ← NEW: list query
    useCreateLotacao.ts                 ← NEW: mutation
    useUpdateLotacao.ts                 ← NEW: mutation
    useDeleteLotacao.ts                 ← NEW: soft-delete mutation
    useReativarLotacao.ts               ← NEW: reactivate mutation
  msw/
    lotacoesHandlers.ts                 ← NEW
  test/fixtures/
    lotacoes.ts                         ← NEW
  app/(admin)/
    lotacoes/
      page.tsx                          ← NEW: server component
  components/
    organisms/
      LotacoesPageClient.tsx            ← NEW
    molecules/
      LotacaoFormDialog.tsx             ← NEW: create/edit dialog
      LotacaoDeleteDialog.tsx           ← NEW: soft-delete confirm
  i18n/locales/en/
    lotacoes.json                       ← NEW
```

### Template 3-A: Lotação Model

```
You are defining the Lotacao domain model for GOVMOBI-ADMIN.

MANDATORY RULES:
- File: src/models/Lotacao.ts
- Export interface Lotacao matching the real API response shape
- Export from src/models/index.ts

MODEL TO BUILD:
interface Lotacao {
  id: string;
  nome: string;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

Also add to src/types/lotacoes.ts:
  - CreateLotacaoInput: { nome: string }
  - UpdateLotacaoInput: { nome: string }
  - GetLotacaoByIdInput: { id: string }
```

### Template 3-B: Lotações Facade

```
You are implementing the lotacoesFacade for GOVMOBI-ADMIN.

MANDATORY RULES:
- File: src/facades/lotacoesFacade.ts
- Base URL from env: process.env.NEXT_PUBLIC_API_URL ?? "http://172.19.2.116:3000"
- Every method uses handleApiResponse<T>() for response parsing
- Unwrap response.data from the API envelope in each method (Option B pattern)
- Zero any — all types from src/models/Lotacao and src/types/lotacoes.ts
- JSDoc with @param, @returns, @throws on every method

METHODS TO BUILD:

1. listLotacoes(): Promise<Lotacao[]>
   GET /lotacoes
   Returns: Lotacao[] from response.data

2. getLotacaoById(input: GetLotacaoByIdInput): Promise<Lotacao>
   GET /lotacoes/:id
   Returns: Lotacao from response.data
   Errors: 404

3. createLotacao(input: CreateLotacaoInput): Promise<Lotacao>
   POST /lotacoes
   Body: { nome }
   Returns: Lotacao from response.data
   Errors: 409 (nome já existe)

4. updateLotacao(id: string, input: UpdateLotacaoInput): Promise<Lotacao>
   PUT /lotacoes/:id
   Body: { nome }
   Returns: Lotacao from response.data
   Errors: 404, 409

5. deleteLotacao(id: string): Promise<void>
   DELETE /lotacoes/:id
   Errors: 404

6. reativarLotacao(id: string): Promise<Lotacao>
   PATCH /lotacoes/:id/reativar
   Returns: Lotacao from response.data
   Errors: 404
```

### Template 3-C: Lotações Query Hook

```
You are implementing the useLotacoes query hook for GOVMOBI-ADMIN.

MANDATORY RULES:
- File: src/hooks/useLotacoes.ts
- Uses TanStack Query useQuery
- Calls lotacoesFacade.listLotacoes() — NEVER calls fetch directly
- Uses lotacoesKeys.list() query key
- Returns { data, isLoading, isError, refetch }
- Full TypeScript — zero any

HOOK TO BUILD:
Name: useLotacoes
Facade method: lotacoesFacade.listLotacoes
Query key: lotacoesKeys.list()
Return type: Lotacao[]
Stale time: 30000

Also create src/lib/queryKeys/lotacoesKeys.ts:
  lotacoesKeys.list()       → ["lotacoes", "list"]
  lotacoesKeys.detail(id)   → ["lotacoes", "detail", id]
```

### Template 3-D: Lotações Mutation Hooks

```
You are implementing mutation hooks for the lotacoes domain in GOVMOBI-ADMIN.

MANDATORY RULES:
- Each hook in its own file: src/hooks/use[Name].ts
- Uses TanStack Query useMutation
- Calls lotacoesFacade.[method]() — NEVER calls fetch directly
- On success: invalidates lotacoesKeys.list() + shows success toast
- On error: shows error toast per error code
- Full TypeScript — zero any

MUTATIONS TO BUILD:

1. useCreateLotacao (src/hooks/useCreateLotacao.ts)
   Facade: lotacoesFacade.createLotacao(input)
   Input: CreateLotacaoInput
   On success: invalidate lotacoesKeys.list(), toast success "lotacoes:toast.created"
   On 409: toast error "lotacoes:toast.duplicateName"
   On 500: toast error "common:toast.serverError"

2. useUpdateLotacao (src/hooks/useUpdateLotacao.ts)
   Facade: lotacoesFacade.updateLotacao(id, input)
   Input: { id: string } & UpdateLotacaoInput
   On success: invalidate lotacoesKeys.list() + lotacoesKeys.detail(id)
   On 404: toast error "lotacoes:toast.notFound"
   On 409: toast error "lotacoes:toast.duplicateName"

3. useDeleteLotacao (src/hooks/useDeleteLotacao.ts)
   Facade: lotacoesFacade.deleteLotacao(id)
   Input: { id: string }
   On success: invalidate lotacoesKeys.list()
   On 404: toast error "lotacoes:toast.notFound"

4. useReativarLotacao (src/hooks/useReativarLotacao.ts)
   Facade: lotacoesFacade.reativarLotacao(id)
   Input: { id: string }
   On success: invalidate lotacoesKeys.list()
   On 404: toast error "lotacoes:toast.notFound"
```

### Template 3-E: Lotações Page

```
You are implementing the Lotações management page for GOVMOBI-ADMIN.

MANDATORY RULES:
- Follow the architecture: UI → Hook → Facade → API
- Server Component for the page; "use client" only for LotacoesPageClient
- All strings via useTranslation("lotacoes")
- All colors via design tokens
- Handle: isLoading (skeleton), isError (ErrorState + retry), empty state
- Permission gates via <Can perform="...">
- data-testid on all interactive elements

PAGE TO BUILD:
Route: /lotacoes
File: src/app/(admin)/lotacoes/page.tsx
Purpose: List, create, edit, soft-delete, and reactivate lotações

LotacoesPageClient (src/components/organisms/LotacoesPageClient.tsx):
- Table layout with columns: Nome, Status (ativo/inativo), Actions
- "Nova Lotação" button (requires permission "lotacao:create") opens LotacaoFormDialog
- Each row has Edit button (requires "lotacao:edit") and Delete/Reativar button
- Inactive lotações show a "Reativar" action instead of "Desativar"
- Filter toggle: show all / only active / only inactive

LotacaoFormDialog (src/components/molecules/LotacaoFormDialog.tsx):
- Used for both create and edit (mode prop: "create" | "edit")
- Fields: nome (text, required) — no pesoPrioridade field
- Submit calls useCreateLotacao or useUpdateLotacao depending on mode
- Closes on success, stays open on error

LotacaoDeleteDialog (src/components/molecules/LotacaoDeleteDialog.tsx):
- Confirm soft-delete dialog
- No reason field required
- Confirm button variant="destructive"
- Calls useDeleteLotacao on confirm

i18n keys needed (lotacoes.json):
  page.title, page.empty.title, page.empty.message,
  page.accessDenied, page.filters.all, page.filters.active, page.filters.inactive,
  table.nome, table.status, table.actions,
  actions.create, actions.edit, actions.delete, actions.reativar,
  form.nome, form.submit, form.cancel,
  status.active, status.inactive,
  toast.created, toast.updated, toast.deleted, toast.reativado,
  toast.duplicateName, toast.notFound
```

### Template 3-F: Lotações MSW Handlers

```
You are creating MSW handlers for the lotacoes domain in GOVMOBI-ADMIN.

MANDATORY RULES:
- File: src/msw/lotacoesHandlers.ts
- Uses msw v2 http and HttpResponse
- Base URL matches: process.env.NEXT_PUBLIC_API_URL ?? "http://172.19.2.116:3000"
- Simulates realistic latency: delay(200) to delay(500)
- Response shape matches real API: { success: true, data: T, timestamp: string }
- Uses fixture data from src/test/fixtures/lotacoes.ts
- Exported as lotacoesHandlers array

ENDPOINTS TO MOCK:
- GET    /lotacoes              → 200 { success, data: Lotacao[], timestamp }
- POST   /lotacoes              → 201 { success, data: Lotacao, timestamp }
                                  409 if nome === "DUPLICATE_TEST"
- GET    /lotacoes/:id          → 200 { success, data: Lotacao, timestamp }
                                  404 if id === "not-found"
- PUT    /lotacoes/:id          → 200 { success, data: Lotacao, timestamp }
                                  404 / 409
- DELETE /lotacoes/:id          → 200 { success: true, timestamp }
                                  404 if id === "not-found"
- PATCH  /lotacoes/:id/reativar → 200 { success, data: Lotacao, timestamp }
                                  404 if id === "not-found"

FIXTURE FILE: src/test/fixtures/lotacoes.ts
  Export: mockLotacoes (array of 3–5 Lotacao objects, mix of ativo: true and false)
  Example entries: "Controladoria Geral do Município", "Secretaria de Fazenda",
                   "Secretaria de Planejamento"
```

---

## Phase 4 — Users Domain

### Template 4-A: Users Page

```
You are implementing the Users management page for GOVMOBI-ADMIN.

MANDATORY RULES:
- Follow the architecture: UI → Hook → Facade → API
- All strings via useTranslation("users")
- All colors via design tokens
- Handle: isLoading, isError, empty state
- Permission gates via <Can perform="...">

PAGE TO BUILD:
Route: /users
File: src/app/(admin)/users/page.tsx
Purpose: List, create, edit role/department, and deactivate users

Data: GET /v1/users (see api-contract.md §6)
Filters: role, departmentId, status (active | inactive)

UsersPageClient (src/components/organisms/UsersPageClient.tsx):
- Table with columns: Avatar, Name, Email, Role (RoleBadge), Department, Status, Actions
- "Novo Usuário" button (requires "user:create") opens UserFormDialog
- Edit button (requires "user:edit") opens UserFormDialog in edit mode
- Deactivate button (requires "user:deactivate") opens ConfirmDialog
  - Reason field: NOT required
  - Warning: if user has IN_PROGRESS runs, show count in dialog body

New hooks to create:
  - src/hooks/useUsers.ts (useQuery → usersFacade.listUsers)
  - src/hooks/useCreateUser.ts (useMutation)
  - src/hooks/useUpdateUser.ts (useMutation)
  - src/hooks/useDeactivateUser.ts (useMutation)

New facade:
  - src/facades/usersFacade.ts

New query keys:
  - src/lib/queryKeys/usersKeys.ts
    usersKeys.list(filters?)  → ["users", "list", filters]
    usersKeys.detail(id)      → ["users", "detail", id]

New MSW handlers:
  - src/msw/usersHandlers.ts

New fixtures:
  - src/test/fixtures/users.ts
```

---

## Phase 5 — Departments Domain

### Template 5-A: Departments Page

```
You are implementing the Departments management page for GOVMOBI-ADMIN.

MANDATORY RULES:
- Follow the architecture: UI → Hook → Facade → API
- All strings via useTranslation("departments")
- All colors via design tokens

PAGE TO BUILD:
Route: /departments
File: src/app/(admin)/departments/page.tsx
Purpose: List and create departments; view user count and active run count

Data: GET /v1/departments (see api-contract.md §8)

DepartmentsPageClient (src/components/organisms/DepartmentsPageClient.tsx):
- Card grid layout (not table) — each card shows: name, description, userCount, activeRunCount
- "Novo Departamento" button (requires "department:create") opens DepartmentFormDialog
- No delete in v1 (departments are not removable)

New hooks:
  - src/hooks/useDepartments.ts
  - src/hooks/useCreateDepartment.ts

New facade:
  - src/facades/departmentsFacade.ts

New query keys:
  - src/lib/queryKeys/departmentsKeys.ts

New MSW handlers:
  - src/msw/departmentsHandlers.ts

New fixtures:
  - src/test/fixtures/departments.ts
```

---

## Phase 6 — Audit Trail

### Template 6-A: Audit Page

```
You are implementing the Audit Trail page for GOVMOBI-ADMIN.

MANDATORY RULES:
- Read-only page — no mutations
- All strings via useTranslation("audit")
- Cursor-based pagination (see api-contract.md §4)
- Permission gate: requires "audit:view" (Supervisor + Admin only)

PAGE TO BUILD:
Route: /audit
File: src/app/(admin)/audit/page.tsx
Purpose: View server-side audit log for all state-changing actions

AuditPageClient (src/components/organisms/AuditPageClient.tsx):
- Timeline-style list (not table) — each entry shows:
    actor name + role badge, event type, entity type + ID, timestamp, payload summary
- Filters: eventType, actorId, entityType, from/to date range
- Pagination: "Load more" button (append, not replace)
- No create/edit/delete actions

New hooks:
  - src/hooks/useAuditTrail.ts (useInfiniteQuery for cursor pagination)

New facade:
  - src/facades/auditFacade.ts

New query keys:
  - src/lib/queryKeys/auditKeys.ts

New MSW handlers:
  - src/msw/auditHandlers.ts

New fixtures:
  - src/test/fixtures/audit.ts
```

---

## handleApiResponse — Real API Compatibility Note

Both `/cargos` and `/lotacoes` wrap all responses as:

```json
{ "success": true, "data": { ... }, "timestamp": "..." }
```

The existing `handleApiResponse<T>` in `src/lib/handleApiResponse.ts` may return the full envelope as `T`. Before implementing the facade, verify whether it unwraps `.data` automatically. If not, either:

**Option A** — Extend `handleApiResponse` to accept an `unwrap` option:
```typescript
return handleApiResponse<Cargo>(response, { unwrap: "data" });
```

**Option B** — Unwrap in the facade method directly:
```typescript
const envelope = await handleApiResponse<{ success: boolean; data: Cargo }>(response);
return envelope.data;
```

Option B is preferred to avoid changing shared infrastructure.

---

## Permissions to Add

Add these permission strings to `src/models/Permission.ts` as the new domains are built:

```typescript
// Cargos
CARGO_VIEW     = "cargo:view",
CARGO_CREATE   = "cargo:create",
CARGO_EDIT     = "cargo:edit",
CARGO_DELETE   = "cargo:delete",
CARGO_REATIVAR = "cargo:reativar",

// Lotações
LOTACAO_VIEW     = "lotacao:view",
LOTACAO_CREATE   = "lotacao:create",
LOTACAO_EDIT     = "lotacao:edit",
LOTACAO_DELETE   = "lotacao:delete",
LOTACAO_REATIVAR = "lotacao:reativar",

// Users
USER_VIEW       = "user:view",
USER_CREATE     = "user:create",
USER_EDIT       = "user:edit",
USER_DEACTIVATE = "user:deactivate",

// Departments
DEPARTMENT_VIEW   = "department:view",
DEPARTMENT_CREATE = "department:create",

// Audit
AUDIT_VIEW = "audit:view",
```

---

## i18n Files to Create

| File                                        | Keys namespace  |
|---------------------------------------------|-----------------|
| `src/i18n/locales/en/nav.json`              | `nav`           |
| `src/i18n/locales/en/cargos.json`           | `cargos`        |
| `src/i18n/locales/en/lotacoes.json`         | `lotacoes`      |
| `src/i18n/locales/en/audit.json`            | `audit`         |
| `src/i18n/locales/en/departments.json`      | `departments`   |

The `users.json` file already exists — extend it with form and toast keys.

---

## MSW Handler Registration

When adding new handler files, register them in the MSW setup. Locate the server setup file (likely `src/test/setup.ts` or a dedicated `src/msw/server.ts`) and add:

```typescript
import { cargosHandlers } from "./cargosHandlers";
import { lotacoesHandlers } from "./lotacoesHandlers";
import { usersHandlers } from "./usersHandlers";
import { departmentsHandlers } from "./departmentsHandlers";
import { auditHandlers } from "./auditHandlers";

export const server = setupServer(
  ...runsHandlers,
  ...cargosHandlers,
  ...lotacoesHandlers,
  ...usersHandlers,
  ...departmentsHandlers,
  ...auditHandlers,
);
```

---

## Common Mistakes to Avoid

| Mistake                                        | Correct Approach                                              |
|------------------------------------------------|---------------------------------------------------------------|
| Calling `fetch()` directly in a component      | Move to facade, call via hook                                 |
| Hardcoding base URL in facade                  | Use `process.env.NEXT_PUBLIC_API_URL`                         |
| Returning raw API envelope `{ success, data }` | Unwrap `.data` in the facade before returning                 |
| Using `router.push` for nav active state       | Use `usePathname()` from `next/navigation`                    |
| Sidebar state in component state only          | Persist collapse state in cookie for SSR consistency          |
| `if (user.role === "ADMIN")` in JSX            | Use `<Can perform="cargo:create">` permission gate            |
| Missing `ativo: false` filter in list          | Always handle soft-deleted records in list queries            |
| Skipping empty state for inactive-only filter  | All three states (loading, error, empty) are mandatory        |
| Mutation without query invalidation            | Always invalidate relevant keys on mutation success           |
| New domain without MSW handler                 | Every facade method needs a corresponding MSW handler         |

---

## Implementation Order (Recommended)

```
Phase 1: Admin Shell
  └─ (admin)/layout.tsx
  └─ AdminShell + SidebarNav + NavItem + UserMenu
  └─ nav.json

Phase 2: Cargos (first real API integration — establishes envelope unwrap pattern)
  └─ Cargo model + types
  └─ cargosFacade
  └─ cargosKeys
  └─ useCargos + mutation hooks
  └─ cargosHandlers (MSW)
  └─ CargosPageClient + CargoFormDialog + CargoDeleteDialog
  └─ cargos.json

Phase 3: Lotações (same pattern as Cargos, no pesoPrioridade field)
  └─ Lotacao model + types
  └─ lotacoesFacade
  └─ lotacoesKeys
  └─ useLotacoes + mutation hooks
  └─ lotacoesHandlers (MSW)
  └─ LotacoesPageClient + LotacaoFormDialog + LotacaoDeleteDialog
  └─ lotacoes.json

Phase 4: Servidores (depends on Cargos + Lotações — form uses both selects)
  └─ Servidor model + Papel type + types
  └─ servidoresFacade
  └─ servidoresKeys
  └─ useServidores + mutation hooks
  └─ servidoresHandlers (MSW)
  └─ ServidoresPageClient + ServidorFormDialog + ServidorDeleteDialog
  └─ servidores.json
  └─ Add nav item: { href: "/servidores", icon: "UserCheck", permission: "servidor:view" }

Phase 5: Frota / Motoristas (depends on Servidores — form uses servidorId select)
  └─ Motorista model + CnhCategoria + MotoristaStatusOperacional types
  └─ motoristasFacade (soft-delete: PATCH /desativar)
  └─ motoristasKeys
  └─ useMotoristas + mutation hooks (including useUpdateMotoristaStatus)
  └─ motoristasHandlers (MSW) — include 500 scenario for malformed UUID
  └─ MotoristasPageClient + MotoristaFormDialog + MotoristaStatusDialog + MotoristaDesativarDialog
  └─ motoristas.json
  └─ Add nav item: { href: "/frota/motoristas", icon: "IdCard", permission: "motorista:view" }

Phase 6: Frota / Veículos (independent — no foreign key dependencies)
  └─ Veiculo model + types
  └─ veiculosFacade (soft-delete: PATCH /desativar — NOT DELETE)
  └─ veiculosKeys
  └─ useVeiculos + mutation hooks
  └─ veiculosHandlers (MSW)
  └─ VeiculosPageClient + VeiculoFormDialog + VeiculoDesativarDialog
  └─ veiculos.json
  └─ Add nav item: { href: "/frota/veiculos", icon: "Car", permission: "veiculo:view" }

Phase 7: Users
  └─ usersFacade (extend existing User model — no envelope unwrap)
  └─ usersKeys + hooks
  └─ usersHandlers (MSW)
  └─ UsersPageClient + UserFormDialog

Phase 8: Departments
  └─ departmentsFacade (no envelope unwrap)
  └─ departmentsKeys + hooks
  └─ departmentsHandlers (MSW)
  └─ DepartmentsPageClient + DepartmentFormDialog

Phase 9: Audit Trail
  └─ auditFacade (no envelope unwrap)
  └─ auditKeys + useAuditTrail (infinite query)
  └─ auditHandlers (MSW)
  └─ AuditPageClient
```

---

## Review Checklist

- [ ] Admin shell layout wraps all `(admin)` routes without breaking existing `/runs` page
- [ ] Sidebar nav items respect `<Can>` permission gates
- [ ] `cargosFacade` and `lotacoesFacade` both unwrap `response.data` from the API envelope
- [ ] All mutation hooks invalidate the correct query keys on success
- [ ] MSW handlers match the real API response shape `{ success, data, timestamp }`
- [ ] All new pages handle loading, error, and empty states
- [ ] All new permissions are added to `src/models/Permission.ts`
- [ ] All new i18n namespaces are registered in `src/i18n/config.ts`
- [ ] New MSW handlers are registered in the test server setup
- [ ] No hardcoded colors, roles, or strings anywhere in new code
