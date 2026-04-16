# Route: /cargos — Cargo Management

> **Domain:** Cargos
> **Base URL:** `http://172.19.2.116:3000` (env: `NEXT_PUBLIC_API_URL`)
> **Cross-links:** [`../admin-panel-next-steps.md`](../admin-panel-next-steps.md) · [`../../api-contract.md`](../../api-contract.md)

---

## What This Route Does

The `/cargos` page allows admins to manage job positions (cargos) used across the system. Each cargo has a name and a priority weight. Cargos support soft-delete — they are deactivated rather than permanently removed, and can be reactivated.

---

## API Endpoints

| Method   | Endpoint                  | Description          | Success | Error codes |
|----------|---------------------------|----------------------|---------|-------------|
| `GET`    | `/cargos`                 | List all cargos      | `200`   | —           |
| `POST`   | `/cargos`                 | Create cargo         | `201`   | `409`       |
| `GET`    | `/cargos/:id`             | Get cargo by ID      | `200`   | `404`       |
| `PUT`    | `/cargos/:id`             | Update cargo         | `200`   | `404` `409` |
| `DELETE` | `/cargos/:id`             | Soft-delete cargo    | `200`   | `404`       |
| `PATCH`  | `/cargos/:id/reativar`    | Reactivate cargo     | `200`   | `404`       |

### Request / Response shapes

**POST /cargos — request body**
```json
{ "nome": "Auditor Fiscal", "pesoPrioridade": 80 }
```

**Response envelope (all endpoints)**
```json
{
  "success": true,
  "data": {
    "id": "019d926f-2602-77d2-8e02-c780b7a2d0fa",
    "nome": "Auditor Fiscal",
    "pesoPrioridade": 80,
    "ativo": true,
    "createdAt": "2026-04-15T18:37:31.010Z",
    "updatedAt": "2026-04-15T18:37:31.010Z",
    "deletedAt": null
  },
  "timestamp": "2026-04-15T18:37:31.024Z"
}
```

> All responses wrap the payload in `{ success, data, timestamp }`. Unwrap `.data` in the facade.

---

## File Map

| File                                             | Type       | Purpose                         |
|--------------------------------------------------|------------|---------------------------------|
| `src/models/Cargo.ts`                            | Model      | `Cargo` interface               |
| `src/types/cargos.ts`                            | Types      | Input types for facade methods  |
| `src/facades/cargosFacade.ts`                    | Facade     | All HTTP calls for this domain  |
| `src/lib/queryKeys/cargosKeys.ts`                | Query keys | TanStack Query key factory      |
| `src/hooks/useCargos.ts`                         | Hook       | List query                      |
| `src/hooks/useCreateCargo.ts`                    | Hook       | Create mutation                 |
| `src/hooks/useUpdateCargo.ts`                    | Hook       | Update mutation                 |
| `src/hooks/useDeleteCargo.ts`                    | Hook       | Soft-delete mutation            |
| `src/hooks/useReativarCargo.ts`                  | Hook       | Reactivate mutation             |
| `src/msw/cargosHandlers.ts`                      | MSW        | Mock handlers for all endpoints |
| `src/test/fixtures/cargos.ts`                    | Fixture    | Mock data                       |
| `src/app/(admin)/cargos/page.tsx`                | Page       | Server Component entry          |
| `src/components/organisms/CargosPageClient.tsx`  | Organism   | Interactive table + actions     |
| `src/components/molecules/CargoFormDialog.tsx`   | Molecule   | Create / edit dialog            |
| `src/components/molecules/CargoDeleteDialog.tsx` | Molecule   | Soft-delete confirm dialog      |
| `src/i18n/locales/en/cargos.json`                | i18n       | All labels for this domain      |

---

## Implementation Steps

### Step 1 — Model and types

```typescript
// src/models/Cargo.ts
export interface Cargo {
  id: string;
  nome: string;
  pesoPrioridade: number;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
```

```typescript
// src/types/cargos.ts
export interface CreateCargoInput { nome: string; pesoPrioridade: number; }
export interface UpdateCargoInput { nome: string; pesoPrioridade: number; }
export interface GetCargoByIdInput { id: string; }
```

Export `Cargo` from `src/models/index.ts`.

---

### Step 2 — Query key factory

```typescript
// src/lib/queryKeys/cargosKeys.ts
export const cargosKeys = {
  list: ()        => ["cargos", "list"] as const,
  detail: (id: string) => ["cargos", "detail", id] as const,
};
```

---

### Step 3 — Facade

```typescript
// src/facades/cargosFacade.ts
const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://172.19.2.116:3000";

// Unwrap helper — all real API responses use { success, data, timestamp }
async function unwrap<T>(response: Response): Promise<T> {
  const envelope = await handleApiResponse<{ success: boolean; data: T }>(response);
  return envelope.data;
}

export const cargosFacade = {
  async listCargos(): Promise<Cargo[]> {
    return unwrap(await fetch(`${BASE}/cargos`));
  },
  async getCargoById({ id }: GetCargoByIdInput): Promise<Cargo> {
    return unwrap(await fetch(`${BASE}/cargos/${id}`));
  },
  async createCargo(input: CreateCargoInput): Promise<Cargo> {
    return unwrap(await fetch(`${BASE}/cargos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }));
  },
  async updateCargo(id: string, input: UpdateCargoInput): Promise<Cargo> {
    return unwrap(await fetch(`${BASE}/cargos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }));
  },
  async deleteCargo(id: string): Promise<void> {
    await fetch(`${BASE}/cargos/${id}`, { method: "DELETE" });
  },
  async reativarCargo(id: string): Promise<Cargo> {
    return unwrap(await fetch(`${BASE}/cargos/${id}/reativar`, { method: "PATCH" }));
  },
};
```

---

### Step 4 — Query hook

```typescript
// src/hooks/useCargos.ts
export function useCargos() {
  const query = useQuery<Cargo[], Error>({
    queryKey: cargosKeys.list(),
    queryFn: () => cargosFacade.listCargos(),
    staleTime: 30_000,
  });
  return { data: query.data, isLoading: query.isLoading, isError: query.isError, refetch: query.refetch };
}
```

---

### Step 5 — Mutation hooks

Each mutation follows the same pattern. Example for create:

```typescript
// src/hooks/useCreateCargo.ts
export function useCreateCargo() {
  const queryClient = useQueryClient();
  const { t } = useTranslation("cargos");

  return useMutation({
    mutationFn: (input: CreateCargoInput) => cargosFacade.createCargo(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: cargosKeys.list() });
      toast.success(t("toast.created"));
    },
    onError: (error: ApiError) => {
      const key = error.status === 409 ? "toast.duplicateName" : "common:toast.serverError";
      toast.error(t(key));
    },
  });
}
```

Repeat the same structure for `useUpdateCargo`, `useDeleteCargo`, `useReativarCargo`.

---

### Step 6 — MSW handlers

```typescript
// src/msw/cargosHandlers.ts
import { http, HttpResponse, delay } from "msw";
import { mockCargos } from "@/test/fixtures/cargos";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://172.19.2.116:3000";

export const cargosHandlers = [
  http.get(`${BASE}/cargos`, async () => {
    await delay(300);
    return HttpResponse.json({ success: true, data: mockCargos, timestamp: new Date().toISOString() });
  }),
  http.post(`${BASE}/cargos`, async ({ request }) => {
    await delay(300);
    const body = await request.json() as { nome: string; pesoPrioridade: number };
    if (body.nome === "DUPLICATE_TEST") {
      return HttpResponse.json({ code: "CONFLICT" }, { status: 409 });
    }
    const created = { id: crypto.randomUUID(), ...body, ativo: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), deletedAt: null };
    return HttpResponse.json({ success: true, data: created, timestamp: new Date().toISOString() }, { status: 201 });
  }),
  http.put(`${BASE}/cargos/:id`, async ({ params, request }) => {
    await delay(300);
    const body = await request.json() as { nome: string; pesoPrioridade: number };
    const cargo = mockCargos.find(c => c.id === params.id);
    if (!cargo) return HttpResponse.json({ code: "NOT_FOUND" }, { status: 404 });
    return HttpResponse.json({ success: true, data: { ...cargo, ...body, updatedAt: new Date().toISOString() }, timestamp: new Date().toISOString() });
  }),
  http.delete(`${BASE}/cargos/:id`, async ({ params }) => {
    await delay(300);
    if (params.id === "not-found") return HttpResponse.json({ code: "NOT_FOUND" }, { status: 404 });
    return HttpResponse.json({ success: true, timestamp: new Date().toISOString() });
  }),
  http.patch(`${BASE}/cargos/:id/reativar`, async ({ params }) => {
    await delay(300);
    const cargo = mockCargos.find(c => c.id === params.id);
    if (!cargo) return HttpResponse.json({ code: "NOT_FOUND" }, { status: 404 });
    return HttpResponse.json({ success: true, data: { ...cargo, ativo: true }, timestamp: new Date().toISOString() });
  }),
];
```

---

### Step 7 — Fixtures

```typescript
// src/test/fixtures/cargos.ts
import type { Cargo } from "@/models";

export const mockCargos: Cargo[] = [
  { id: "cargo-1", nome: "Auditor Fiscal", pesoPrioridade: 80, ativo: true, createdAt: "2026-04-15T14:00:00Z", updatedAt: "2026-04-15T14:00:00Z", deletedAt: null },
  { id: "cargo-2", nome: "Técnico Administrativo", pesoPrioridade: 60, ativo: true, createdAt: "2026-04-15T14:00:00Z", updatedAt: "2026-04-15T14:00:00Z", deletedAt: null },
  { id: "cargo-3", nome: "Analista de TI", pesoPrioridade: 70, ativo: false, createdAt: "2026-04-15T14:00:00Z", updatedAt: "2026-04-15T14:00:00Z", deletedAt: "2026-04-15T16:00:00Z" },
];
```

---

### Step 8 — Page and client component

```
// src/app/(admin)/cargos/page.tsx  — Server Component
Renders:
  <PermissionsProvider role={currentUserRole}>
    <Suspense fallback={<CargosPageSkeleton />}>
      <CargosPageClient />
    </Suspense>
  </PermissionsProvider>
```

```
// src/components/organisms/CargosPageClient.tsx  — "use client"
Table columns: Nome | Peso Prioridade | Status | Actions
- "Novo Cargo" button → <Can perform={Permission.CARGO_CREATE}> → opens CargoFormDialog mode="create"
- Edit row button    → <Can perform={Permission.CARGO_EDIT}>   → opens CargoFormDialog mode="edit"
- Delete row button  → <Can perform={Permission.CARGO_DELETE}> → opens CargoDeleteDialog
- Reativar button    → <Can perform={Permission.CARGO_REATIVAR}> → calls useReativarCargo directly
- Filter toggle: All / Active / Inactive (client-side filter on ativo field)
- Loading: skeleton rows
- Error: <ErrorState onRetry={refetch} />
- Empty: empty state section with i18n message
```

---

### Step 9 — Dialogs

```
// src/components/molecules/CargoFormDialog.tsx
Props: mode: "create" | "edit", cargo?: Cargo, open: boolean, onClose: () => void
Fields:
  - nome: text input, required, maxLength 100
  - pesoPrioridade: number input, required, min 0, max 100
On submit (create): calls useCreateCargo, closes on success
On submit (edit):   calls useUpdateCargo, closes on success
Stays open and shows inline error on 409
```

```
// src/components/molecules/CargoDeleteDialog.tsx
Props: cargoId: string, cargoNome: string, open: boolean, onClose: () => void
Body: "Deseja desativar o cargo [nome]? Esta ação pode ser revertida."
Confirm button: variant="destructive", calls useDeleteCargo
Cancel button: variant="ghost"
```

---

### Step 10 — i18n

`src/i18n/locales/en/cargos.json`

```json
{
  "page": {
    "title": "Cargos",
    "empty": { "title": "No cargos found", "message": "Create the first cargo to get started." },
    "accessDenied": "You do not have permission to view cargos.",
    "filters": { "all": "All", "active": "Active", "inactive": "Inactive" }
  },
  "table": { "nome": "Name", "pesoPrioridade": "Priority Weight", "status": "Status", "actions": "Actions" },
  "actions": { "create": "New Cargo", "edit": "Edit", "delete": "Deactivate", "reativar": "Reactivate" },
  "form": { "nome": "Name", "pesoPrioridade": "Priority Weight", "submit": "Save", "cancel": "Cancel" },
  "status": { "active": "Active", "inactive": "Inactive" },
  "toast": {
    "created": "Cargo created successfully.",
    "updated": "Cargo updated successfully.",
    "deleted": "Cargo deactivated.",
    "reativado": "Cargo reactivated.",
    "duplicateName": "A cargo with this name already exists.",
    "notFound": "Cargo not found."
  }
}
```

Register `"cargos"` in `src/i18n/config.ts`.

---

### Step 11 — Register MSW handlers

In `src/test/setup.ts` (or `src/msw/server.ts`), add:

```typescript
import { cargosHandlers } from "@/msw/cargosHandlers";
// add to setupServer(...) call
```

---

### Step 12 — Add permissions

In `src/models/Permission.ts`, add:

```typescript
export enum Permission {
  // ...existing code...
  CARGO_VIEW = "cargo:view",
  CARGO_CREATE = "cargo:create",
  CARGO_EDIT = "cargo:edit",
  CARGO_DELETE = "cargo:delete",
  CARGO_REATIVAR = "cargo:reativar",
}
```

---

## Review Checklist

- [ ] `cargosFacade` unwraps `response.data` from the API envelope
- [ ] All mutations invalidate `cargosKeys.list()` on success
- [ ] `useUpdateCargo` also invalidates `cargosKeys.detail(id)`
- [ ] MSW handlers registered in test server setup
- [ ] `cargos` namespace registered in `src/i18n/config.ts`
- [ ] Permissions added to `src/models/Permission.ts`
- [ ] Inactive cargos show "Reativar" instead of "Desativar"
- [ ] `CargoFormDialog` stays open on 409 and shows inline error
- [ ] All three states handled: loading, error, empty
