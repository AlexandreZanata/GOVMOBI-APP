# Route: /frota/veiculos — Fleet Vehicle Management

> **Domain:** Frota / Veículos
> **Base URL:** `http://172.19.2.116:3000` (env: `NEXT_PUBLIC_API_URL`)
> **Cross-links:** [`../admin-panel-next-steps.md`](../admin-panel-next-steps.md) · [`./README.md`](./README.md)

---

## What This Route Does

The `/frota/veiculos` page manages the vehicle fleet. Each vehicle has a license plate (`placa`), model, and year. Vehicles support soft-delete via a dedicated `PATCH /desativar` endpoint and reactivation via `PATCH /reativar` — note this differs from other domains that use `DELETE` for soft-delete.

---

## API Endpoints

| Method  | Endpoint                           | Description           | Success | Error codes |
|---------|------------------------------------|-----------------------|---------|-------------|
| `GET`   | `/frota/veiculos`                  | List all vehicles     | `200`   | —           |
| `POST`  | `/frota/veiculos`                  | Create vehicle        | `201`   | `409`       |
| `GET`   | `/frota/veiculos/:id`              | Get vehicle by ID     | `200`   | `404`       |
| `PUT`   | `/frota/veiculos/:id`              | Update vehicle        | `200`   | `404` `409` |
| `PATCH` | `/frota/veiculos/:id/desativar`    | Soft-delete vehicle   | `200`   | `404`       |
| `PATCH` | `/frota/veiculos/:id/reativar`     | Reactivate vehicle    | `200`   | `404`       |

> Soft-delete uses `PATCH /desativar` — not `DELETE`. This is intentional and differs from Cargos/Lotações/Servidores.

### Error codes

| HTTP  | Meaning                                  |
|-------|------------------------------------------|
| `201` | Veículo cadastrado com sucesso           |
| `200` | Operação realizada com sucesso           |
| `404` | Veículo não encontrado                   |
| `409` | Placa já cadastrada                      |

### Request body — POST /frota/veiculos

```json
{ "placa": "ABC1D23", "modelo": "Toyota Corolla", "ano": 2024 }
```

### Request body — PUT /frota/veiculos/:id

```json
{ "placa": "ABC1D23", "modelo": "Toyota Corolla", "ano": 2024 }
```

### Response envelope (all endpoints)

```json
{
  "success": true,
  "data": {
    "id": "019d927f-06a8-74ec-aa60-8fba16a5d24d",
    "placa": "ABC1D23",
    "modelo": "Toyota Corolla",
    "ano": 2024,
    "ativo": true,
    "createdAt": "2026-04-15T18:54:51.560Z",
    "updatedAt": "2026-04-15T18:54:51.560Z",
    "deletedAt": null
  },
  "timestamp": "2026-04-15T18:54:51.622Z"
}
```

> Unwrap `.data` in the facade — same pattern as Cargos, Lotações, and Servidores.

---

## File Map

| File                                                  | Type       | Purpose                         |
|-------------------------------------------------------|------------|---------------------------------|
| `src/models/Veiculo.ts`                               | Model      | `Veiculo` interface             |
| `src/types/veiculos.ts`                               | Types      | Input types for facade methods  |
| `src/facades/veiculosFacade.ts`                       | Facade     | All HTTP calls for this domain  |
| `src/lib/queryKeys/veiculosKeys.ts`                   | Query keys | TanStack Query key factory      |
| `src/hooks/useVeiculos.ts`                            | Hook       | List query                      |
| `src/hooks/useCreateVeiculo.ts`                       | Hook       | Create mutation                 |
| `src/hooks/useUpdateVeiculo.ts`                       | Hook       | Update mutation                 |
| `src/hooks/useDesativarVeiculo.ts`                    | Hook       | Soft-delete mutation            |
| `src/hooks/useReativarVeiculo.ts`                     | Hook       | Reactivate mutation             |
| `src/msw/veiculosHandlers.ts`                         | MSW        | Mock handlers for all endpoints |
| `src/test/fixtures/veiculos.ts`                       | Fixture    | Mock data                       |
| `src/app/(admin)/frota/veiculos/page.tsx`             | Page       | Server Component entry          |
| `src/components/organisms/VeiculosPageClient.tsx`     | Organism   | Interactive table + actions     |
| `src/components/molecules/VeiculoFormDialog.tsx`      | Molecule   | Create / edit dialog            |
| `src/components/molecules/VeiculoDesativarDialog.tsx` | Molecule   | Soft-delete confirm dialog      |
| `src/i18n/locales/en/veiculos.json`                   | i18n       | All labels for this domain      |

---

## Implementation Steps

### Step 1 — Model and types

```typescript
// src/models/Veiculo.ts
export interface Veiculo {
  id: string;
  placa: string;
  modelo: string;
  ano: number;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
```

```typescript
// src/types/veiculos.ts
export interface CreateVeiculoInput {
  placa: string;
  modelo: string;
  ano: number;
}

export interface UpdateVeiculoInput {
  placa?: string;
  modelo?: string;
  ano?: number;
}

export interface GetVeiculoByIdInput { id: string; }
```

Export `Veiculo` from `src/models/index.ts`.

---

### Step 2 — Query key factory

```typescript
// src/lib/queryKeys/veiculosKeys.ts
export const veiculosKeys = {
  list: ()             => ["veiculos", "list"] as const,
  detail: (id: string) => ["veiculos", "detail", id] as const,
};
```

---

### Step 3 — Facade

```typescript
// src/facades/veiculosFacade.ts
import { handleApiResponse } from "@/lib/handleApiResponse";
import type { Veiculo } from "@/models";
import type { CreateVeiculoInput, UpdateVeiculoInput, GetVeiculoByIdInput } from "@/types/veiculos";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://172.19.2.116:3000";

async function unwrap<T>(response: Response): Promise<T> {
  const envelope = await handleApiResponse<{ success: boolean; data: T }>(response);
  return envelope.data;
}

export const veiculosFacade = {
  /** @returns All vehicles (active and inactive) */
  async listVeiculos(): Promise<Veiculo[]> {
    return unwrap(await fetch(`${BASE}/frota/veiculos`));
  },

  /** @throws ApiError 404 */
  async getVeiculoById({ id }: GetVeiculoByIdInput): Promise<Veiculo> {
    return unwrap(await fetch(`${BASE}/frota/veiculos/${id}`));
  },

  /**
   * @throws ApiError 409 — placa already registered
   */
  async createVeiculo(input: CreateVeiculoInput): Promise<Veiculo> {
    return unwrap(await fetch(`${BASE}/frota/veiculos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }));
  },

  /** @throws ApiError 404 | 409 */
  async updateVeiculo(id: string, input: UpdateVeiculoInput): Promise<Veiculo> {
    return unwrap(await fetch(`${BASE}/frota/veiculos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }));
  },

  /**
   * Soft-delete — uses PATCH /desativar, not DELETE.
   * @throws ApiError 404
   */
  async desativarVeiculo(id: string): Promise<Veiculo> {
    return unwrap(await fetch(`${BASE}/frota/veiculos/${id}/desativar`, { method: "PATCH" }));
  },

  /** @throws ApiError 404 */
  async reativarVeiculo(id: string): Promise<Veiculo> {
    return unwrap(await fetch(`${BASE}/frota/veiculos/${id}/reativar`, { method: "PATCH" }));
  },
};
```

---

### Step 4 — Query hook

```typescript
// src/hooks/useVeiculos.ts
import { useQuery } from "@tanstack/react-query";
import { veiculosFacade } from "@/facades/veiculosFacade";
import { veiculosKeys } from "@/lib/queryKeys/veiculosKeys";
import type { Veiculo } from "@/models";

export function useVeiculos() {
  const query = useQuery<Veiculo[], Error>({
    queryKey: veiculosKeys.list(),
    queryFn: () => veiculosFacade.listVeiculos(),
    staleTime: 30_000,
  });
  return { data: query.data, isLoading: query.isLoading, isError: query.isError, refetch: query.refetch };
}
```

---

### Step 5 — Mutation hooks

**useCreateVeiculo**

```typescript
// src/hooks/useCreateVeiculo.ts
export function useCreateVeiculo() {
  const queryClient = useQueryClient();
  const { t } = useTranslation("veiculos");

  return useMutation({
    mutationFn: (input: CreateVeiculoInput) => veiculosFacade.createVeiculo(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: veiculosKeys.list() });
      toast.success(t("toast.created"));
    },
    onError: (error: ApiError) => {
      if (error.status === 409) toast.error(t("toast.duplicatePlaca"));
      else toast.error(t("common:toast.serverError"));
    },
  });
}
```

**useUpdateVeiculo**

```typescript
// src/hooks/useUpdateVeiculo.ts
export function useUpdateVeiculo() {
  const queryClient = useQueryClient();
  const { t } = useTranslation("veiculos");

  return useMutation({
    mutationFn: ({ id, ...input }: { id: string } & UpdateVeiculoInput) =>
      veiculosFacade.updateVeiculo(id, input),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: veiculosKeys.list() });
      void queryClient.invalidateQueries({ queryKey: veiculosKeys.detail(id) });
      toast.success(t("toast.updated"));
    },
    onError: (error: ApiError) => {
      if (error.status === 409) toast.error(t("toast.duplicatePlaca"));
      else if (error.status === 404) toast.error(t("toast.notFound"));
      else toast.error(t("common:toast.serverError"));
    },
  });
}
```

**useDesativarVeiculo**

```typescript
// src/hooks/useDesativarVeiculo.ts
export function useDesativarVeiculo() {
  const queryClient = useQueryClient();
  const { t } = useTranslation("veiculos");

  return useMutation({
    mutationFn: (id: string) => veiculosFacade.desativarVeiculo(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: veiculosKeys.list() });
      toast.success(t("toast.desativado"));
    },
    onError: (error: ApiError) => {
      if (error.status === 404) toast.error(t("toast.notFound"));
      else toast.error(t("common:toast.serverError"));
    },
  });
}
```

**useReativarVeiculo** — same shape as `useDesativarVeiculo`, calls `veiculosFacade.reativarVeiculo(id)`, toasts `"toast.reativado"`.

---

### Step 6 — MSW handlers

```typescript
// src/msw/veiculosHandlers.ts
import { http, HttpResponse, delay } from "msw";
import { mockVeiculos } from "@/test/fixtures/veiculos";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://172.19.2.116:3000";

export const veiculosHandlers = [
  http.get(`${BASE}/frota/veiculos`, async () => {
    await delay(300);
    return HttpResponse.json({ success: true, data: mockVeiculos, timestamp: new Date().toISOString() });
  }),

  http.post(`${BASE}/frota/veiculos`, async ({ request }) => {
    await delay(300);
    const body = await request.json() as CreateVeiculoInput;
    if (body.placa === "DUPLICATE") {
      return HttpResponse.json({ code: "CONFLICT" }, { status: 409 });
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

  http.get(`${BASE}/frota/veiculos/:id`, async ({ params }) => {
    await delay(200);
    const item = mockVeiculos.find(v => v.id === params.id);
    if (!item) return HttpResponse.json({ code: "NOT_FOUND" }, { status: 404 });
    return HttpResponse.json({ success: true, data: item, timestamp: new Date().toISOString() });
  }),

  http.put(`${BASE}/frota/veiculos/:id`, async ({ params, request }) => {
    await delay(300);
    const body = await request.json() as UpdateVeiculoInput;
    const item = mockVeiculos.find(v => v.id === params.id);
    if (!item) return HttpResponse.json({ code: "NOT_FOUND" }, { status: 404 });
    return HttpResponse.json({
      success: true,
      data: { ...item, ...body, updatedAt: new Date().toISOString() },
      timestamp: new Date().toISOString(),
    });
  }),

  http.patch(`${BASE}/frota/veiculos/:id/desativar`, async ({ params }) => {
    await delay(300);
    const item = mockVeiculos.find(v => v.id === params.id);
    if (!item) return HttpResponse.json({ code: "NOT_FOUND" }, { status: 404 });
    return HttpResponse.json({
      success: true,
      data: { ...item, ativo: false, deletedAt: new Date().toISOString() },
      timestamp: new Date().toISOString(),
    });
  }),

  http.patch(`${BASE}/frota/veiculos/:id/reativar`, async ({ params }) => {
    await delay(300);
    const item = mockVeiculos.find(v => v.id === params.id);
    if (!item) return HttpResponse.json({ code: "NOT_FOUND" }, { status: 404 });
    return HttpResponse.json({
      success: true,
      data: { ...item, ativo: true, deletedAt: null },
      timestamp: new Date().toISOString(),
    });
  }),
];
```

---

### Step 7 — Fixtures

```typescript
// src/test/fixtures/veiculos.ts
import type { Veiculo } from "@/models";

export const mockVeiculos: Veiculo[] = [
  {
    id: "vei-1",
    placa: "ABC1D23",
    modelo: "Toyota Corolla",
    ano: 2024,
    ativo: true,
    createdAt: "2026-04-15T18:54:51.560Z",
    updatedAt: "2026-04-15T18:54:51.560Z",
    deletedAt: null,
  },
  {
    id: "vei-2",
    placa: "XYZ9W87",
    modelo: "Volkswagen Gol",
    ano: 2022,
    ativo: true,
    createdAt: "2026-04-10T10:00:00.000Z",
    updatedAt: "2026-04-10T10:00:00.000Z",
    deletedAt: null,
  },
  {
    id: "vei-3",
    placa: "DEF4G56",
    modelo: "Fiat Strada",
    ano: 2021,
    ativo: false,
    createdAt: "2026-03-01T08:00:00.000Z",
    updatedAt: "2026-04-01T08:00:00.000Z",
    deletedAt: "2026-04-01T08:00:00.000Z",
  },
];
```

---

### Step 8 — Page and client component

```
// src/app/(admin)/frota/veiculos/page.tsx  — Server Component
Note: the Next.js route is (admin)/frota/veiculos — two path segments under (admin).
Renders:
  <PermissionsProvider role={currentUserRole}>
    <Suspense fallback={<VeiculosPageSkeleton />}>
      <VeiculosPageClient />
    </Suspense>
  </PermissionsProvider>
```

```
// src/components/organisms/VeiculosPageClient.tsx  — "use client"
Table columns: Placa | Modelo | Ano | Status | Actions

- "Novo Veículo" button  → <Can perform={Permission.VEICULO_CREATE}>   → opens VeiculoFormDialog mode="create"
- Edit row button        → <Can perform={Permission.VEICULO_EDIT}>     → opens VeiculoFormDialog mode="edit"
- Desativar row button   → <Can perform={Permission.VEICULO_DESATIVAR}> → opens VeiculoDesativarDialog
- Reativar row button    → <Can perform={Permission.VEICULO_REATIVAR}> → calls useReativarVeiculo directly
- Inactive vehicles show "Reativar" instead of "Desativar"
- Filter toggle: All / Active / Inactive (client-side filter on ativo field)
- Loading: skeleton rows
- Error: <ErrorState onRetry={refetch} />
- Empty: empty state section
```

---

### Step 9 — Dialogs

```
// src/components/molecules/VeiculoFormDialog.tsx
Props: mode: "create" | "edit", veiculo?: Veiculo, open: boolean, onClose: () => void
Fields:
  - placa: text, required, maxLength 8, uppercase on input (Mercosul format: ABC1D23)
  - modelo: text, required, maxLength 100
  - ano: number, required, min 1900, max currentYear + 1
On submit (create): calls useCreateVeiculo
On submit (edit):   calls useUpdateVeiculo
409 error: show inline "Placa já cadastrada"
Closes on success, stays open on error
```

```
// src/components/molecules/VeiculoDesativarDialog.tsx
Props: veiculoId: string, veiculoPlaca: string, open: boolean, onClose: () => void
Body: "Deseja desativar o veículo [placa]? Esta ação pode ser revertida."
Confirm button: variant="destructive", calls useDesativarVeiculo
Cancel button: variant="ghost"
```

---

### Step 10 — i18n

`src/i18n/locales/en/veiculos.json`

```json
{
  "page": {
    "title": "Fleet Vehicles",
    "empty": { "title": "No vehicles found", "message": "Register the first vehicle to get started." },
    "accessDenied": "You do not have permission to view vehicles.",
    "filters": { "all": "All", "active": "Active", "inactive": "Inactive" }
  },
  "table": { "placa": "Plate", "modelo": "Model", "ano": "Year", "status": "Status", "actions": "Actions" },
  "actions": { "create": "New Vehicle", "edit": "Edit", "desativar": "Deactivate", "reativar": "Reactivate" },
  "form": {
    "placa": "License plate", "modelo": "Model", "ano": "Year",
    "submit": "Save", "cancel": "Cancel",
    "placaHint": "Mercosul format: ABC1D23"
  },
  "status": { "active": "Active", "inactive": "Inactive" },
  "toast": {
    "created": "Vehicle registered successfully.",
    "updated": "Vehicle updated successfully.",
    "desativado": "Vehicle deactivated.",
    "reativado": "Vehicle reactivated.",
    "duplicatePlaca": "A vehicle with this plate is already registered.",
    "notFound": "Vehicle not found."
  }
}
```

Register `"veiculos"` in `src/i18n/config.ts`.

---

### Step 11 — Register MSW handlers and add permissions

```typescript
// src/test/setup.ts — add to setupServer(...)
import { veiculosHandlers } from "@/msw/veiculosHandlers";
```

```typescript
// src/models/Permission.ts — add
export enum Permission {
  // ...existing code...
  VEICULO_VIEW = "veiculo:view",
  VEICULO_CREATE = "veiculo:create",
  VEICULO_EDIT = "veiculo:edit",
  VEICULO_DESATIVAR = "veiculo:desativar",
  VEICULO_REATIVAR = "veiculo:reativar",
}
```

---

### Step 12 — Add to sidebar nav

In the nav config (see `route-admin-shell.md` Step 2), add a "Frota" group or a direct link:

```typescript
const veiculosNavItem = {
  href: "/frota/veiculos",
  labelKey: "nav.veiculos",
  icon: "Car",
  permission: Permission.VEICULO_VIEW,
};
```

Add `"nav.veiculos": "Vehicles"` to `src/i18n/locales/en/nav.json`.

> If more `/frota/*` sub-routes are added later (e.g. `/frota/manutencao`), group them under a collapsible "Frota" section in the sidebar.

---

## Review Checklist

- [ ] `veiculosFacade` unwraps `response.data` from the API envelope
- [ ] Soft-delete uses `PATCH /desativar` — not `DELETE`
- [ ] Both desativar and reativar return the updated `Veiculo` object (not void)
- [ ] `placa` input is forced to uppercase on change
- [ ] `ano` field validates min 1900 and max `new Date().getFullYear() + 1`
- [ ] 409 error shows inline "Placa já cadastrada" in the form
- [ ] Inactive vehicles show "Reativar" instead of "Desativar"
- [ ] All mutations invalidate `veiculosKeys.list()` on success
- [ ] `useUpdateVeiculo` also invalidates `veiculosKeys.detail(id)`
- [ ] MSW handlers registered in test server setup
- [ ] `veiculos` namespace registered in `src/i18n/config.ts`
- [ ] Permissions added to `src/models/Permission.ts`
- [ ] Nav item added to sidebar config with `nav.veiculos` i18n key
- [ ] All three states handled: loading, error, empty
