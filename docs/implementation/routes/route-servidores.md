# Route: /servidores — Servidor Management

> **Domain:** Servidores (public servants)
> **Base URL:** `http://172.19.2.116:3000` (env: `NEXT_PUBLIC_API_URL`)
> **Depends on:** `/cargos` (cargoId), `/lotacoes` (lotacaoId)
> **Cross-links:** [`../admin-panel-next-steps.md`](../admin-panel-next-steps.md) · [`route-cargos.md`](./route-cargos.md) · [`route-lotacoes.md`](./route-lotacoes.md)

---

## What This Route Does

The `/servidores` page manages public servants (servidores). Each servidor is linked to a Cargo and a Lotação, and holds one or more system roles (`papeis`). Like Cargos and Lotações, servidores support soft-delete and reactivation.

> Implement Cargos and Lotações first — the create/edit form depends on both lists.

---

## API Endpoints

| Method   | Endpoint                   | Description               | Success | Error codes       |
|----------|----------------------------|---------------------------|---------|-------------------|
| `GET`    | `/servidores`              | List all servidores       | `200`   | —                 |
| `POST`   | `/servidores`              | Create servidor           | `201`   | `400` `404` `409` |
| `GET`    | `/servidores/:id`          | Get servidor by ID        | `200`   | `404`             |
| `PUT`    | `/servidores/:id`          | Update servidor (partial) | `200`   | `404`             |
| `DELETE` | `/servidores/:id`          | Soft-delete servidor      | `200`   | `404`             |
| `PATCH`  | `/servidores/:id/reativar` | Reactivate servidor       | `200`   | `404`             |

### Error codes detail

| HTTP  | Meaning                                     |
|-------|---------------------------------------------|
| `400` | Invalid domain data (CPF, Email, or Papéis) |
| `404` | Servidor, Cargo, or Lotação not found       |
| `409` | CPF or Email already registered             |

### Request body — POST /servidores

```json
{
  "nome": "Manoel Gomes",
  "cpf": "12345678909",
  "email": "manoel@gov.br",
  "telefone": "21988887777",
  "cargoId": "019d917f-41db-70fb-bf47-7b1c46d8c844",
  "lotacaoId": "019d9180-65e1-725c-9450-e02beaa2993f",
  "papeis": ["USUARIO"]
}
```

### Request body — PUT /servidores/:id (partial update)

```json
{
  "nome": "Manoel Gomes Alterado",
  "telefone": "21999991111",
  "cargoId": "uuid-id-cargo",
  "lotacaoId": "uuid-id-lotacao",
  "papeis": ["ADMIN"]
}
```

> All fields in PUT are optional — only send what needs to change.

### Response envelope (all endpoints)

```json
{
  "success": true,
  "data": {
    "id": "019d9181-9805-727c-8b8c-6e7fb0ebb3c2",
    "nome": "João Vitor Flávio Pinto",
    "cpf": "04673024133",
    "email": "jvflaviopinto@gmail.com",
    "telefone": "66974002072",
    "cargoId": "019d917f-41db-70fb-bf47-7b1c46d8c844",
    "lotacaoId": "019d9180-65e1-725c-9450-e02beaa2993f",
    "papeis": ["USUARIO", "MOTORISTA"],
    "ativo": true,
    "createdAt": "2026-04-15T14:18:02.629Z",
    "updatedAt": "2026-04-15T14:18:02.629Z",
    "deletedAt": null
  },
  "timestamp": "2026-04-15T18:47:32.006Z"
}
```

> Unwrap `.data` in the facade — same pattern as Cargos and Lotações.

### Available `papeis` values

```typescript
type Papel = "USUARIO" | "ADMIN" | "MOTORISTA";
// Extend this union as the backend evolves
```

---

## File Map

| File                                                | Type       | Purpose                             |
|-----------------------------------------------------|------------|-------------------------------------|
| `src/models/Servidor.ts`                            | Model      | `Servidor` interface + `Papel` type |
| `src/types/servidores.ts`                           | Types      | Input types for facade methods      |
| `src/facades/servidoresFacade.ts`                   | Facade     | All HTTP calls for this domain      |
| `src/lib/queryKeys/servidoresKeys.ts`               | Query keys | TanStack Query key factory          |
| `src/hooks/useServidores.ts`                        | Hook       | List query                          |
| `src/hooks/useCreateServidor.ts`                    | Hook       | Create mutation                     |
| `src/hooks/useUpdateServidor.ts`                    | Hook       | Update mutation                     |
| `src/hooks/useDeleteServidor.ts`                    | Hook       | Soft-delete mutation                |
| `src/hooks/useReativarServidor.ts`                  | Hook       | Reactivate mutation                 |
| `src/msw/servidoresHandlers.ts`                     | MSW        | Mock handlers for all endpoints     |
| `src/test/fixtures/servidores.ts`                   | Fixture    | Mock data                           |
| `src/app/(admin)/servidores/page.tsx`               | Page       | Server Component entry              |
| `src/components/organisms/ServidoresPageClient.tsx` | Organism   | Interactive table + actions         |
| `src/components/molecules/ServidorFormDialog.tsx`   | Molecule   | Create / edit dialog                |
| `src/components/molecules/ServidorDeleteDialog.tsx` | Molecule   | Soft-delete confirm dialog          |
| `src/i18n/locales/en/servidores.json`               | i18n       | All labels for this domain          |

---

## Implementation Steps

### Step 1 — Model and types

```typescript
// src/models/Servidor.ts
export type Papel = "USUARIO" | "ADMIN" | "MOTORISTA";

export interface Servidor {
  id: string;
  nome: string;
  cpf: string;
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
```

```typescript
// src/types/servidores.ts
import type { Papel } from "@/models";

export interface CreateServidorInput {
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
  cargoId: string;
  lotacaoId: string;
  papeis: Papel[];
}

export interface UpdateServidorInput {
  nome?: string;
  telefone?: string;
  cargoId?: string;
  lotacaoId?: string;
  papeis?: Papel[];
}

export interface GetServidorByIdInput { id: string; }
```

Export `Servidor` and `Papel` from `src/models/index.ts`.

---

### Step 2 — Query key factory

```typescript
// src/lib/queryKeys/servidoresKeys.ts
export const servidoresKeys = {
  list: ()             => ["servidores", "list"] as const,
  detail: (id: string) => ["servidores", "detail", id] as const,
};
```

---

### Step 3 — Facade

```typescript
// src/facades/servidoresFacade.ts
import { handleApiResponse } from "@/lib/handleApiResponse";
import type { Servidor } from "@/models";
import type { CreateServidorInput, UpdateServidorInput, GetServidorByIdInput } from "@/types/servidores";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://172.19.2.116:3000";

async function unwrap<T>(response: Response): Promise<T> {
  const envelope = await handleApiResponse<{ success: boolean; data: T }>(response);
  return envelope.data;
}

export const servidoresFacade = {
  /** @returns All servidores (active and inactive) */
  async listServidores(): Promise<Servidor[]> {
    return unwrap(await fetch(`${BASE}/servidores`));
  },

  /** @throws ApiError 404 */
  async getServidorById({ id }: GetServidorByIdInput): Promise<Servidor> {
    return unwrap(await fetch(`${BASE}/servidores/${id}`));
  },

  /**
   * @throws ApiError 400 — invalid CPF, email, or papeis
   * @throws ApiError 404 — cargoId or lotacaoId not found
   * @throws ApiError 409 — CPF or email already registered
   */
  async createServidor(input: CreateServidorInput): Promise<Servidor> {
    return unwrap(await fetch(`${BASE}/servidores`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }));
  },

  /** @throws ApiError 404 — servidor, cargo, or lotacao not found */
  async updateServidor(id: string, input: UpdateServidorInput): Promise<Servidor> {
    return unwrap(await fetch(`${BASE}/servidores/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }));
  },

  /** @throws ApiError 404 */
  async deleteServidor(id: string): Promise<void> {
    await fetch(`${BASE}/servidores/${id}`, { method: "DELETE" });
  },

  /** @throws ApiError 404 */
  async reativarServidor(id: string): Promise<Servidor> {
    return unwrap(await fetch(`${BASE}/servidores/${id}/reativar`, { method: "PATCH" }));
  },
};
```

---

### Step 4 — Query hook

```typescript
// src/hooks/useServidores.ts
import { useQuery } from "@tanstack/react-query";
import { servidoresFacade } from "@/facades/servidoresFacade";
import { servidoresKeys } from "@/lib/queryKeys/servidoresKeys";
import type { Servidor } from "@/models";

export function useServidores() {
  const query = useQuery<Servidor[], Error>({
    queryKey: servidoresKeys.list(),
    queryFn: () => servidoresFacade.listServidores(),
    staleTime: 30_000,
  });
  return { data: query.data, isLoading: query.isLoading, isError: query.isError, refetch: query.refetch };
}
```

---

### Step 5 — Mutation hooks

**useCreateServidor**

```typescript
// src/hooks/useCreateServidor.ts
export function useCreateServidor() {
  const queryClient = useQueryClient();
  const { t } = useTranslation("servidores");

  return useMutation({
    mutationFn: (input: CreateServidorInput) => servidoresFacade.createServidor(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: servidoresKeys.list() });
      toast.success(t("toast.created"));
    },
    onError: (error: ApiError) => {
      if (error.status === 409) toast.error(t("toast.duplicate"));
      else if (error.status === 400) toast.error(t("toast.invalidData"));
      else if (error.status === 404) toast.error(t("toast.dependencyNotFound"));
      else toast.error(t("common:toast.serverError"));
    },
  });
}
```

**useUpdateServidor**

```typescript
// src/hooks/useUpdateServidor.ts
export function useUpdateServidor() {
  const queryClient = useQueryClient();
  const { t } = useTranslation("servidores");

  return useMutation({
    mutationFn: ({ id, ...input }: { id: string } & UpdateServidorInput) =>
      servidoresFacade.updateServidor(id, input),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: servidoresKeys.list() });
      void queryClient.invalidateQueries({ queryKey: servidoresKeys.detail(id) });
      toast.success(t("toast.updated"));
    },
    onError: (error: ApiError) => {
      if (error.status === 404) toast.error(t("toast.dependencyNotFound"));
      else toast.error(t("common:toast.serverError"));
    },
  });
}
```

**useDeleteServidor** and **useReativarServidor** follow the same pattern as Cargos — invalidate `servidoresKeys.list()` on success, toast 404 on error.

---

### Step 6 — MSW handlers

```typescript
// src/msw/servidoresHandlers.ts
import { http, HttpResponse, delay } from "msw";
import { mockServidores } from "@/test/fixtures/servidores";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://172.19.2.116:3000";

export const servidoresHandlers = [
  http.get(`${BASE}/servidores`, async () => {
    await delay(300);
    return HttpResponse.json({ success: true, data: mockServidores, timestamp: new Date().toISOString() });
  }),

  http.post(`${BASE}/servidores`, async ({ request }) => {
    await delay(300);
    const body = await request.json() as CreateServidorInput;
    if (body.cpf === "00000000000" || body.email === "duplicate@gov.br") {
      return HttpResponse.json({ code: "CONFLICT" }, { status: 409 });
    }
    if (body.cargoId === "not-found" || body.lotacaoId === "not-found") {
      return HttpResponse.json({ code: "NOT_FOUND" }, { status: 404 });
    }
    const created = {
      id: crypto.randomUUID(),
      ...body,
      ativo: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    };
    return HttpResponse.json({ success: true, data: created, timestamp: new Date().toISOString() }, { status: 201 });
  }),

  http.get(`${BASE}/servidores/:id`, async ({ params }) => {
    await delay(200);
    const item = mockServidores.find(s => s.id === params.id);
    if (!item) return HttpResponse.json({ code: "NOT_FOUND" }, { status: 404 });
    return HttpResponse.json({ success: true, data: item, timestamp: new Date().toISOString() });
  }),

  http.put(`${BASE}/servidores/:id`, async ({ params, request }) => {
    await delay(300);
    const body = await request.json() as UpdateServidorInput;
    const item = mockServidores.find(s => s.id === params.id);
    if (!item) return HttpResponse.json({ code: "NOT_FOUND" }, { status: 404 });
    return HttpResponse.json({ success: true, data: { ...item, ...body, updatedAt: new Date().toISOString() }, timestamp: new Date().toISOString() });
  }),

  http.delete(`${BASE}/servidores/:id`, async ({ params }) => {
    await delay(300);
    if (params.id === "not-found") return HttpResponse.json({ code: "NOT_FOUND" }, { status: 404 });
    return HttpResponse.json({ success: true, timestamp: new Date().toISOString() });
  }),

  http.patch(`${BASE}/servidores/:id/reativar`, async ({ params }) => {
    await delay(300);
    const item = mockServidores.find(s => s.id === params.id);
    if (!item) return HttpResponse.json({ code: "NOT_FOUND" }, { status: 404 });
    return HttpResponse.json({ success: true, data: { ...item, ativo: true, deletedAt: null }, timestamp: new Date().toISOString() });
  }),
];
```

---

### Step 7 — Fixtures

```typescript
// src/test/fixtures/servidores.ts
import type { Servidor } from "@/models";

export const mockServidores: Servidor[] = [
  {
    id: "srv-1",
    nome: "João Vitor Flávio Pinto",
    cpf: "04673024133",
    email: "jvflaviopinto@gmail.com",
    telefone: "66974002072",
    cargoId: "cargo-1",
    lotacaoId: "lot-1",
    papeis: ["USUARIO", "MOTORISTA"],
    ativo: true,
    createdAt: "2026-04-15T14:18:02.629Z",
    updatedAt: "2026-04-15T14:18:02.629Z",
    deletedAt: null,
  },
  {
    id: "srv-2",
    nome: "Ana Paula Souza",
    cpf: "98765432100",
    email: "ana.souza@gov.br",
    telefone: "21977776666",
    cargoId: "cargo-2",
    lotacaoId: "lot-2",
    papeis: ["USUARIO"],
    ativo: false,
    createdAt: "2026-04-10T10:00:00.000Z",
    updatedAt: "2026-04-14T08:00:00.000Z",
    deletedAt: "2026-04-14T08:00:00.000Z",
  },
];
```

---

### Step 8 — Page and client component

```
// src/app/(admin)/servidores/page.tsx  — Server Component
Renders:
  <PermissionsProvider role={currentUserRole}>
    <Suspense fallback={<ServidoresPageSkeleton />}>
      <ServidoresPageClient />
    </Suspense>
  </PermissionsProvider>
```

```
// src/components/organisms/ServidoresPageClient.tsx  — "use client"
Table columns: Nome | CPF (masked) | Email | Cargo | Lotação | Papéis (badges) | Status | Actions

CPF masking: display as "046.730.241-33" — format on render, never store formatted.

- "Novo Servidor" button → <Can perform={Permission.SERVIDOR_CREATE}> → opens ServidorFormDialog mode="create"
- Edit row button        → <Can perform={Permission.SERVIDOR_EDIT}>   → opens ServidorFormDialog mode="edit"
- Delete row button      → <Can perform={Permission.SERVIDOR_DELETE}> → opens ServidorDeleteDialog
- Reativar button        → <Can perform={Permission.SERVIDOR_REATIVAR}> → calls useReativarServidor directly
- Filter toggle: All / Active / Inactive (client-side filter on ativo field)
- Loading: skeleton rows
- Error: <ErrorState onRetry={refetch} />
- Empty: empty state section
```

---

### Step 9 — ServidorFormDialog

```
// src/components/molecules/ServidorFormDialog.tsx
Props: mode: "create" | "edit", servidor?: Servidor, open: boolean, onClose: () => void

Fields (create):
  - nome: text, required
  - cpf: text, required, 11 digits, validated format — read-only in edit mode
  - email: email, required — read-only in edit mode
  - telefone: text, required
  - cargoId: select — populated from useCargos() filtered to ativo: true
  - lotacaoId: select — populated from useLotacoes() filtered to ativo: true
  - papeis: multi-checkbox or multi-select — options: USUARIO, ADMIN, MOTORISTA

Fields (edit): nome, telefone, cargoId, lotacaoId, papeis
  cpf and email are read-only in edit mode (shown as disabled inputs)

On submit (create): calls useCreateServidor
On submit (edit):   calls useUpdateServidor
Error handling:
  - 409: show inline "CPF ou email já cadastrado"
  - 400: show inline "Dados inválidos — verifique CPF, email e papéis"
  - 404: show inline "Cargo ou Lotação não encontrados"
Closes on success, stays open on error
```

---

### Step 10 — ServidorDeleteDialog

```
// src/components/molecules/ServidorDeleteDialog.tsx
Props: servidorId: string, servidorNome: string, open: boolean, onClose: () => void
Body: "Deseja desativar o servidor [nome]? Esta ação pode ser revertida."
Confirm button: variant="destructive", calls useDeleteServidor
Cancel button: variant="ghost"
```

---

### Step 11 — i18n

`src/i18n/locales/en/servidores.json`

```json
{
  "page": {
    "title": "Servidores",
    "empty": { "title": "No servidores found", "message": "Create the first servidor to get started." },
    "accessDenied": "You do not have permission to view servidores.",
    "filters": { "all": "All", "active": "Active", "inactive": "Inactive" }
  },
  "table": {
    "nome": "Name", "cpf": "CPF", "email": "Email",
    "cargo": "Cargo", "lotacao": "Lotação", "papeis": "Roles",
    "status": "Status", "actions": "Actions"
  },
  "actions": { "create": "New Servidor", "edit": "Edit", "delete": "Deactivate", "reativar": "Reactivate" },
  "form": {
    "nome": "Full name", "cpf": "CPF", "email": "Email", "telefone": "Phone",
    "cargoId": "Cargo", "lotacaoId": "Lotação", "papeis": "Roles",
    "submit": "Save", "cancel": "Cancel",
    "cpfReadOnly": "CPF cannot be changed after creation",
    "emailReadOnly": "Email cannot be changed after creation"
  },
  "papeis": { "USUARIO": "Usuário", "ADMIN": "Admin", "MOTORISTA": "Motorista" },
  "status": { "active": "Active", "inactive": "Inactive" },
  "toast": {
    "created": "Servidor created successfully.",
    "updated": "Servidor updated successfully.",
    "deleted": "Servidor deactivated.",
    "reativado": "Servidor reactivated.",
    "duplicate": "CPF or email already registered.",
    "invalidData": "Invalid data — check CPF, email, and roles.",
    "dependencyNotFound": "Cargo or Lotação not found."
  }
}
```

Register `"servidores"` in `src/i18n/config.ts`.

---

### Step 12 — Register MSW handlers and add permissions

```typescript
// src/test/setup.ts — add to setupServer(...)
import { servidoresHandlers } from "@/msw/servidoresHandlers";
```

```typescript
// src/models/Permission.ts — add
export enum Permission {
  // ...existing code...
  SERVIDOR_VIEW = "servidor:view",
  SERVIDOR_CREATE = "servidor:create",
  SERVIDOR_EDIT = "servidor:edit",
  SERVIDOR_DELETE = "servidor:delete",
  SERVIDOR_REATIVAR = "servidor:reativar",
}
```

---

### Step 13 — Add to sidebar nav

In the nav config (see `route-admin-shell.md` Step 2), add:

```typescript
const servidoresNavItem = {
  href: "/servidores",
  labelKey: "nav.servidores",
  icon: "UserCheck",
  permission: Permission.SERVIDOR_VIEW,
};
```

Add `"nav.servidores": "Servidores"` to `src/i18n/locales/en/nav.json`.

---

## Review Checklist

- [ ] `servidoresFacade` unwraps `response.data` from the API envelope
- [ ] CPF is stored unformatted (digits only) and formatted only on render
- [ ] CPF and email are read-only in edit mode
- [ ] `cargoId` select only shows `ativo: true` cargos
- [ ] `lotacaoId` select only shows `ativo: true` lotações
- [ ] `papeis` multi-select allows at least one value — empty array is invalid
- [ ] All mutations invalidate `servidoresKeys.list()` on success
- [ ] `useUpdateServidor` also invalidates `servidoresKeys.detail(id)`
- [ ] 400, 404, and 409 errors each show a distinct inline message in the form
- [ ] Inactive servidores show "Reativar" instead of "Desativar"
- [ ] MSW handlers registered in test server setup
- [ ] `servidores` namespace registered in `src/i18n/config.ts`
- [ ] Permissions added to `src/models/Permission.ts`
- [ ] Nav item added to sidebar config with `nav.servidores` i18n key
- [ ] All three states handled: loading, error, empty
