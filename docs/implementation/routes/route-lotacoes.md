# Route: /lotacoes — Lotação Management

> **Domain:** Lotações
> **Base URL:** `http://172.19.2.116:3000` (env: `NEXT_PUBLIC_API_URL`)
> **Cross-links:** [`../admin-panel-next-steps.md`](../admin-panel-next-steps.md) · [`../../api-contract.md`](../../api-contract.md)

---

## What This Route Does

The `/lotacoes` page manages organizational units (lotações) — e.g. "Secretaria de Fazenda", "Controladoria Geral do Município". Lotações are referenced by users and runs to indicate their organizational placement. Like Cargos, they support soft-delete and reactivation.

> Key difference from Cargos: `Lotacao` has no `pesoPrioridade` field.

---

## API Endpoints

| Method   | Endpoint                    | Description           | Success | Error codes |
|----------|-----------------------------|-----------------------|---------|-------------|
| `GET`    | `/lotacoes`                 | List all lotações     | `200`   | —           |
| `POST`   | `/lotacoes`                 | Create lotação        | `201`   | `409`       |
| `GET`    | `/lotacoes/:id`             | Get lotação by ID     | `200`   | `404`       |
| `PUT`    | `/lotacoes/:id`             | Update lotação        | `200`   | `404` `409` |
| `DELETE` | `/lotacoes/:id`             | Soft-delete lotação   | `200`   | `404`       |
| `PATCH`  | `/lotacoes/:id/reativar`    | Reactivate lotação    | `200`   | `404`       |

### Request / Response shapes

**POST /lotacoes — request body**
```json
{ "nome": "Secretaria de Fazenda" }
```

**Response envelope (all endpoints)**
```json
{
  "success": true,
  "data": {
    "id": "019d9272-c137-7538-8e62-3273de50724c",
    "nome": "Secretaria de Fazenda",
    "ativo": true,
    "createdAt": "2026-04-15T18:41:27.352Z",
    "updatedAt": "2026-04-15T18:41:27.352Z",
    "deletedAt": null
  },
  "timestamp": "2026-04-15T18:41:27.366Z"
}
```

> All responses wrap the payload in `{ success, data, timestamp }`. Unwrap `.data` in the facade.

---

## File Map

| File                                               | Type       | Purpose                         |
|----------------------------------------------------|------------|---------------------------------|
| `src/models/Lotacao.ts`                            | Model      | `Lotacao` interface             |
| `src/types/lotacoes.ts`                            | Types      | Input types for facade methods  |
| `src/facades/lotacoesFacade.ts`                    | Facade     | All HTTP calls for this domain  |
| `src/lib/queryKeys/lotacoesKeys.ts`                | Query keys | TanStack Query key factory      |
| `src/hooks/useLotacoes.ts`                         | Hook       | List query                      |
| `src/hooks/useCreateLotacao.ts`                    | Hook       | Create mutation                 |
| `src/hooks/useUpdateLotacao.ts`                    | Hook       | Update mutation                 |
| `src/hooks/useDeleteLotacao.ts`                    | Hook       | Soft-delete mutation            |
| `src/hooks/useReativarLotacao.ts`                  | Hook       | Reactivate mutation             |
| `src/msw/lotacoesHandlers.ts`                      | MSW        | Mock handlers for all endpoints |
| `src/test/fixtures/lotacoes.ts`                    | Fixture    | Mock data                       |
| `src/app/(admin)/lotacoes/page.tsx`                | Page       | Server Component entry          |
| `src/components/organisms/LotacoesPageClient.tsx`  | Organism   | Interactive table + actions     |
| `src/components/molecules/LotacaoFormDialog.tsx`   | Molecule   | Create / edit dialog            |
| `src/components/molecules/LotacaoDeleteDialog.tsx` | Molecule   | Soft-delete confirm dialog      |
| `src/i18n/locales/en/lotacoes.json`                | i18n       | All labels for this domain      |

---

## Implementation Steps

### Step 1 — Model and types

```typescript
// src/models/Lotacao.ts
export interface Lotacao {
  id: string;
  nome: string;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
```

```typescript
// src/types/lotacoes.ts
export interface CreateLotacaoInput { nome: string; }
export interface UpdateLotacaoInput { nome: string; }
export interface GetLotacaoByIdInput { id: string; }
```

Export `Lotacao` from `src/models/index.ts`.

---

### Step 2 — Query key factory

```typescript
// src/lib/queryKeys/lotacoesKeys.ts
export const lotacoesKeys = {
  list: ()             => ["lotacoes", "list"] as const,
  detail: (id: string) => ["lotacoes", "detail", id] as const,
};
```

---

### Step 3 — Facade

```typescript
// src/facades/lotacoesFacade.ts
const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://172.19.2.116:3000";

async function unwrap<T>(response: Response): Promise<T> {
  const envelope = await handleApiResponse<{ success: boolean; data: T }>(response);
  return envelope.data;
}

export const lotacoesFacade = {
  async listLotacoes(): Promise<Lotacao[]> {
    return unwrap(await fetch(`${BASE}/lotacoes`));
  },
  async getLotacaoById({ id }: GetLotacaoByIdInput): Promise<Lotacao> {
    return unwrap(await fetch(`${BASE}/lotacoes/${id}`));
  },
  async createLotacao(input: CreateLotacaoInput): Promise<Lotacao> {
    return unwrap(await fetch(`${BASE}/lotacoes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }));
  },
  async updateLotacao(id: string, input: UpdateLotacaoInput): Promise<Lotacao> {
    return unwrap(await fetch(`${BASE}/lotacoes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }));
  },
  async deleteLotacao(id: string): Promise<void> {
    await fetch(`${BASE}/lotacoes/${id}`, { method: "DELETE" });
  },
  async reativarLotacao(id: string): Promise<Lotacao> {
    return unwrap(await fetch(`${BASE}/lotacoes/${id}/reativar`, { method: "PATCH" }));
  },
};
```

---

### Step 4 — Query hook

```typescript
// src/hooks/useLotacoes.ts
export function useLotacoes() {
  const query = useQuery<Lotacao[], Error>({
    queryKey: lotacoesKeys.list(),
    queryFn: () => lotacoesFacade.listLotacoes(),
    staleTime: 30_000,
  });
  return { data: query.data, isLoading: query.isLoading, isError: query.isError, refetch: query.refetch };
}
```

---

### Step 5 — Mutation hooks

```typescript
// src/hooks/useCreateLotacao.ts
export function useCreateLotacao() {
  const queryClient = useQueryClient();
  const { t } = useTranslation("lotacoes");

  return useMutation({
    mutationFn: (input: CreateLotacaoInput) => lotacoesFacade.createLotacao(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: lotacoesKeys.list() });
      toast.success(t("toast.created"));
    },
    onError: (error: ApiError) => {
      const key = error.status === 409 ? "toast.duplicateName" : "common:toast.serverError";
      toast.error(t(key));
    },
  });
}
```

Repeat the same structure for `useUpdateLotacao`, `useDeleteLotacao`, `useReativarLotacao`.

`useUpdateLotacao` must also invalidate `lotacoesKeys.detail(id)` on success.

---

### Step 6 — MSW handlers

```typescript
// src/msw/lotacoesHandlers.ts
import { http, HttpResponse, delay } from "msw";
import { mockLotacoes } from "@/test/fixtures/lotacoes";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://172.19.2.116:3000";

export const lotacoesHandlers = [
  http.get(`${BASE}/lotacoes`, async () => {
    await delay(300);
    return HttpResponse.json({ success: true, data: mockLotacoes, timestamp: new Date().toISOString() });
  }),
  http.post(`${BASE}/lotacoes`, async ({ request }) => {
    await delay(300);
    const body = await request.json() as { nome: string };
    if (body.nome === "DUPLICATE_TEST") {
      return HttpResponse.json({ code: "CONFLICT" }, { status: 409 });
    }
    const created = { id: crypto.randomUUID(), ...body, ativo: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), deletedAt: null };
    return HttpResponse.json({ success: true, data: created, timestamp: new Date().toISOString() }, { status: 201 });
  }),
  http.put(`${BASE}/lotacoes/:id`, async ({ params, request }) => {
    await delay(300);
    const body = await request.json() as { nome: string };
    const item = mockLotacoes.find(l => l.id === params.id);
    if (!item) return HttpResponse.json({ code: "NOT_FOUND" }, { status: 404 });
    return HttpResponse.json({ success: true, data: { ...item, ...body, updatedAt: new Date().toISOString() }, timestamp: new Date().toISOString() });
  }),
  http.delete(`${BASE}/lotacoes/:id`, async ({ params }) => {
    await delay(300);
    if (params.id === "not-found") return HttpResponse.json({ code: "NOT_FOUND" }, { status: 404 });
    return HttpResponse.json({ success: true, timestamp: new Date().toISOString() });
  }),
  http.patch(`${BASE}/lotacoes/:id/reativar`, async ({ params }) => {
    await delay(300);
    const item = mockLotacoes.find(l => l.id === params.id);
    if (!item) return HttpResponse.json({ code: "NOT_FOUND" }, { status: 404 });
    return HttpResponse.json({ success: true, data: { ...item, ativo: true }, timestamp: new Date().toISOString() });
  }),
];
```

---

### Step 7 — Fixtures

```typescript
// src/test/fixtures/lotacoes.ts
import type { Lotacao } from "@/models";

export const mockLotacoes: Lotacao[] = [
  { id: "lot-1", nome: "Controladoria Geral do Município", ativo: true,  createdAt: "2026-04-15T14:00:00Z", updatedAt: "2026-04-15T14:00:00Z", deletedAt: null },
  { id: "lot-2", nome: "Secretaria de Fazenda",            ativo: true,  createdAt: "2026-04-15T14:00:00Z", updatedAt: "2026-04-15T14:00:00Z", deletedAt: null },
  { id: "lot-3", nome: "Secretaria de Planejamento",       ativo: false, createdAt: "2026-04-15T14:00:00Z", updatedAt: "2026-04-15T14:00:00Z", deletedAt: "2026-04-15T16:00:00Z" },
];
```

---

### Step 8 — Page and client component

```
// src/app/(admin)/lotacoes/page.tsx  — Server Component
Renders:
  <PermissionsProvider role={currentUserRole}>
    <Suspense fallback={<LotacoesPageSkeleton />}>
      <LotacoesPageClient />
    </Suspense>
  </PermissionsProvider>
```

```
// src/components/organisms/LotacoesPageClient.tsx  — "use client"
Table columns: Nome | Status | Actions
- "Nova Lotação" button → <Can perform={Permission.LOTACAO_CREATE}> → opens LotacaoFormDialog mode="create"
- Edit row button       → <Can perform={Permission.LOTACAO_EDIT}>   → opens LotacaoFormDialog mode="edit"
- Delete row button     → <Can perform={Permission.LOTACAO_DELETE}> → opens LotacaoDeleteDialog
- Reativar button       → <Can perform={Permission.LOTACAO_REATIVAR}> → calls useReativarLotacao directly
- Filter toggle: All / Active / Inactive (client-side filter on ativo field)
- Loading: skeleton rows
- Error: <ErrorState onRetry={refetch} />
- Empty: empty state section with i18n message
```

---

### Step 9 — Dialogs

```
// src/components/molecules/LotacaoFormDialog.tsx
Props: mode: "create" | "edit", lotacao?: Lotacao, open: boolean, onClose: () => void
Fields:
  - nome: text input, required, maxLength 100
On submit (create): calls useCreateLotacao, closes on success
On submit (edit):   calls useUpdateLotacao, closes on success
Stays open and shows inline error on 409
```

```
// src/components/molecules/LotacaoDeleteDialog.tsx
Props: lotacaoId: string, lotacaoNome: string, open: boolean, onClose: () => void
Body: "Deseja desativar a lotação [nome]? Esta ação pode ser revertida."
Confirm button: variant="destructive", calls useDeleteLotacao
Cancel button: variant="ghost"
```

---

### Step 10 — i18n

`src/i18n/locales/en/lotacoes.json`

```json
{
  "page": {
    "title": "Lotações",
    "empty": { "title": "No lotações found", "message": "Create the first lotação to get started." },
    "accessDenied": "You do not have permission to view lotações.",
    "filters": { "all": "All", "active": "Active", "inactive": "Inactive" }
  },
  "table": { "nome": "Name", "status": "Status", "actions": "Actions" },
  "actions": { "create": "New Lotação", "edit": "Edit", "delete": "Deactivate", "reativar": "Reactivate" },
  "form": { "nome": "Name", "submit": "Save", "cancel": "Cancel" },
  "status": { "active": "Active", "inactive": "Inactive" },
  "toast": {
    "created": "Lotação created successfully.",
    "updated": "Lotação updated successfully.",
    "deleted": "Lotação deactivated.",
    "reativado": "Lotação reactivated.",
    "duplicateName": "A lotação with this name already exists.",
    "notFound": "Lotação not found."
  }
}
```

Register `"lotacoes"` in `src/i18n/config.ts`.

---

### Step 11 — Register MSW handlers

```typescript
import { lotacoesHandlers } from "@/msw/lotacoesHandlers";
// add to setupServer(...) call in src/test/setup.ts
```

---

### Step 12 — Add permissions

In `src/models/Permission.ts`, add:

```typescript
export enum Permission {
  // ...existing code...
  LOTACAO_VIEW = "lotacao:view",
  LOTACAO_CREATE = "lotacao:create",
  LOTACAO_EDIT = "lotacao:edit",
  LOTACAO_DELETE = "lotacao:delete",
  LOTACAO_REATIVAR = "lotacao:reativar",
}
```

---

## Review Checklist

- [ ] `lotacoesFacade` unwraps `response.data` from the API envelope
- [ ] All mutations invalidate `lotacoesKeys.list()` on success
- [ ] `useUpdateLotacao` also invalidates `lotacoesKeys.detail(id)`
- [ ] MSW handlers registered in test server setup
- [ ] `lotacoes` namespace registered in `src/i18n/config.ts`
- [ ] Permissions added to `src/models/Permission.ts`
- [ ] Inactive lotações show "Reativar" instead of "Desativar"
- [ ] `LotacaoFormDialog` stays open on 409 and shows inline error
- [ ] All three states handled: loading, error, empty
