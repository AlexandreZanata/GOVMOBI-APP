# Route: /frota/motoristas — Driver Management

> **Domain:** Frota / Motoristas
> **Base URL:** `http://172.19.2.116:3000` (env: `NEXT_PUBLIC_API_URL`)
> **Depends on:** `/servidores` (`servidorId`)
> **Cross-links:** [`../admin-panel-next-steps.md`](../admin-panel-next-steps.md) · [`./route-servidores.md`](./route-servidores.md) · [`./route-frota-veiculos.md`](./route-frota-veiculos.md)

---

## What This Route Does

The `/frota/motoristas` page manages drivers linked to existing servidores. Each motorista stores CNH (license) data and supports operational status updates, soft-delete (`PATCH /desativar`), and reactivation (`PATCH /reativar`).

> Implement `/servidores` first. Creating a motorista requires a valid `servidorId`.

---

## API Endpoints

| Method  | Endpoint                          | Description               | Success | Error codes              |
|---------|-----------------------------------|---------------------------|---------|--------------------------|
| `GET`   | `/frota/motoristas`               | List all motoristas       | `200`   | —                        |
| `POST`  | `/frota/motoristas`               | Create motorista          | `201`   | `400` `404` `409` `500*` |
| `GET`   | `/frota/motoristas/:id`           | Get motorista by ID       | `200`   | `404`                    |
| `PUT`   | `/frota/motoristas/:id`           | Update motorista CNH data | `200`   | `400` `404` `409`        |
| `PATCH` | `/frota/motoristas/:id/status`    | Update operational status | `200`   | `400` `404`              |
| `PATCH` | `/frota/motoristas/:id/desativar` | Soft-delete motorista     | `200`   | `404`                    |
| `PATCH` | `/frota/motoristas/:id/reativar`  | Reactivate motorista      | `200`   | `404`                    |

`500*` was observed when posting placeholder data with invalid UUID (`"uuid-do-servidor"`). Treat this as a backend validation gap and still validate UUID client-side.

### Error codes detail

| HTTP  | Meaning                                                      |
|-------|--------------------------------------------------------------|
| `400` | Invalid domain data (CNH format/category/status payload)     |
| `404` | Motorista or Servidor not found                              |
| `409` | CNH already registered / in use                              |
| `500` | Internal error for malformed UUID input (currently observed) |

### Request body — POST /frota/motoristas

```json
{
  "servidorId": "019d9181-9805-727c-8b8c-6e7fb0ebb3c2",
  "cnhNumero": "1234567890",
  "cnhCategoria": "AB"
}
```

### Request body — PUT /frota/motoristas/:id

```json
{
  "cnhNumero": "0987654321",
  "cnhCategoria": "B"
}
```

### Request body — PATCH /frota/motoristas/:id/status

```json
{
  "statusOperacional": "DISPONIVEL"
}
```

> Confirm enum values for `statusOperacional` in Swagger before coding UI options (examples: `DISPONIVEL`, `EM_ROTA`, `AFASTADO`).

### Response envelope (all endpoints)

```json
{
  "success": true,
  "data": {
    "id": "019d9401-5bc0-7ec4-8b9d-52502b9f8bd3",
    "servidorId": "019d9181-9805-727c-8b8c-6e7fb0ebb3c2",
    "cnhNumero": "1234567890",
    "cnhCategoria": "AB",
    "statusOperacional": "DISPONIVEL",
    "ativo": true,
    "createdAt": "2026-04-15T19:47:22.824Z",
    "updatedAt": "2026-04-15T19:47:22.824Z",
    "deletedAt": null
  },
  "timestamp": "2026-04-15T19:47:22.824Z"
}
```

> API uses `{ success, data, timestamp }`. Unwrap `.data` in the facade.

---

## File Map

| File                                                    | Type       | Purpose                                       |
|---------------------------------------------------------|------------|-----------------------------------------------|
| `src/models/Motorista.ts`                               | Model      | `Motorista` interface + status/category types |
| `src/types/motoristas.ts`                               | Types      | Input types for facade methods                |
| `src/facades/motoristasFacade.ts`                       | Facade     | All HTTP calls for this domain                |
| `src/lib/queryKeys/motoristasKeys.ts`                   | Query keys | TanStack Query key factory                    |
| `src/hooks/useMotoristas.ts`                            | Hook       | List query                                    |
| `src/hooks/useCreateMotorista.ts`                       | Hook       | Create mutation                               |
| `src/hooks/useUpdateMotorista.ts`                       | Hook       | Update mutation                               |
| `src/hooks/useUpdateMotoristaStatus.ts`                 | Hook       | Operational status mutation                   |
| `src/hooks/useDesativarMotorista.ts`                    | Hook       | Soft-delete mutation                          |
| `src/hooks/useReativarMotorista.ts`                     | Hook       | Reactivate mutation                           |
| `src/msw/motoristasHandlers.ts`                         | MSW        | Mock handlers for all endpoints               |
| `src/test/fixtures/motoristas.ts`                       | Fixture    | Mock data                                     |
| `src/app/(admin)/frota/motoristas/page.tsx`             | Page       | Server Component entry                        |
| `src/components/organisms/MotoristasPageClient.tsx`     | Organism   | Interactive table + actions                   |
| `src/components/molecules/MotoristaFormDialog.tsx`      | Molecule   | Create / edit dialog                          |
| `src/components/molecules/MotoristaDesativarDialog.tsx` | Molecule   | Soft-delete confirm dialog                    |
| `src/components/molecules/MotoristaStatusDialog.tsx`    | Molecule   | Status update dialog                          |
| `src/i18n/locales/en/motoristas.json`                   | i18n       | All labels for this domain                    |

---

## Implementation Steps

### Step 1 — Model and types

```typescript
// src/models/Motorista.ts
export type CnhCategoria = "A" | "AB" | "B" | "C" | "D" | "E";

export type MotoristaStatusOperacional =
  | "DISPONIVEL"
  | "EM_ROTA"
  | "AFASTADO";

export interface Motorista {
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

```typescript
// src/types/motoristas.ts
import type { CnhCategoria, MotoristaStatusOperacional } from "@/models";

export interface CreateMotoristaInput {
  servidorId: string;
  cnhNumero: string;
  cnhCategoria: CnhCategoria;
}

export interface UpdateMotoristaInput {
  cnhNumero?: string;
  cnhCategoria?: CnhCategoria;
}

export interface UpdateMotoristaStatusInput {
  statusOperacional: MotoristaStatusOperacional;
}

export interface GetMotoristaByIdInput {
  id: string;
}
```

Export `Motorista`, `CnhCategoria`, and `MotoristaStatusOperacional` from `src/models/index.ts`.

---

### Step 2 — Query key factory

```typescript
// src/lib/queryKeys/motoristasKeys.ts
export const motoristasKeys = {
  list: () => ["motoristas", "list"] as const,
  detail: (id: string) => ["motoristas", "detail", id] as const,
};
```

---

### Step 3 — Facade

```typescript
// src/facades/motoristasFacade.ts
import { handleApiResponse } from "@/lib/handleApiResponse";
import type { Motorista } from "@/models";
import type {
  CreateMotoristaInput,
  GetMotoristaByIdInput,
  UpdateMotoristaInput,
  UpdateMotoristaStatusInput,
} from "@/types/motoristas";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://172.19.2.116:3000";

async function unwrap<T>(response: Response): Promise<T> {
  const envelope = await handleApiResponse<{ success: boolean; data: T }>(response);
  return envelope.data;
}

export const motoristasFacade = {
  async listMotoristas(): Promise<Motorista[]> {
    return unwrap(await fetch(`${BASE}/frota/motoristas`));
  },

  async getMotoristaById({ id }: GetMotoristaByIdInput): Promise<Motorista> {
    return unwrap(await fetch(`${BASE}/frota/motoristas/${id}`));
  },

  async createMotorista(input: CreateMotoristaInput): Promise<Motorista> {
    return unwrap(
      await fetch(`${BASE}/frota/motoristas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    );
  },

  async updateMotorista(id: string, input: UpdateMotoristaInput): Promise<Motorista> {
    return unwrap(
      await fetch(`${BASE}/frota/motoristas/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    );
  },

  async updateMotoristaStatus(id: string, input: UpdateMotoristaStatusInput): Promise<Motorista> {
    return unwrap(
      await fetch(`${BASE}/frota/motoristas/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    );
  },

  async desativarMotorista(id: string): Promise<Motorista> {
    return unwrap(await fetch(`${BASE}/frota/motoristas/${id}/desativar`, { method: "PATCH" }));
  },

  async reativarMotorista(id: string): Promise<Motorista> {
    return unwrap(await fetch(`${BASE}/frota/motoristas/${id}/reativar`, { method: "PATCH" }));
  },
};
```

---

### Step 4 — Query hook

```typescript
// src/hooks/useMotoristas.ts
import { useQuery } from "@tanstack/react-query";
import { motoristasFacade } from "@/facades/motoristasFacade";
import { motoristasKeys } from "@/lib/queryKeys/motoristasKeys";
import type { Motorista } from "@/models";

export function useMotoristas() {
  const query = useQuery<Motorista[], Error>({
    queryKey: motoristasKeys.list(),
    queryFn: () => motoristasFacade.listMotoristas(),
    staleTime: 30_000,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
```

---

### Step 5 — Mutation hooks

Implement these hooks with the same pattern used in other route docs:

- `useCreateMotorista`
- `useUpdateMotorista`
- `useUpdateMotoristaStatus`
- `useDesativarMotorista`
- `useReativarMotorista`

Rules:
- On success: invalidate `motoristasKeys.list()` and show success toast.
- `useUpdateMotorista` should also invalidate `motoristasKeys.detail(id)`.
- 409: show duplicate CNH toast.
- 404: show not found/dependency not found toast.
- 400: show invalid CNH/status payload toast.
- Fallback: `common:toast.serverError`.

---

### Step 6 — MSW handlers

Create `src/msw/motoristasHandlers.ts` with handlers for all 7 endpoints:

- Return envelope `{ success, data, timestamp }`.
- Simulate latency with `delay(200..500)`.
- Include error scenarios for `404`, `409`, and an explicit `500` case to mirror current backend behavior with malformed UUID.

---

### Step 7 — Fixtures

Create `src/test/fixtures/motoristas.ts` with 3-5 records mixing:

- `ativo: true` and `ativo: false`
- Multiple `statusOperacional` values
- Different `cnhCategoria` values

---

### Step 8 — Page and client component

```
// src/app/(admin)/frota/motoristas/page.tsx  — Server Component
Renders:
  <PermissionsProvider role={currentUserRole}>
    <Suspense fallback={<MotoristasPageSkeleton />}>
      <MotoristasPageClient />
    </Suspense>
  </PermissionsProvider>
```

```
// src/components/organisms/MotoristasPageClient.tsx  — "use client"
Table columns: Servidor | CNH Numero | Categoria | Status Operacional | Status Ativo | Actions

- "Novo Motorista" button   -> <Can perform={Permission.MOTORISTA_CREATE}> -> opens MotoristaFormDialog mode="create"
- Edit row button           -> <Can perform={Permission.MOTORISTA_EDIT}>   -> opens MotoristaFormDialog mode="edit"
- Status row button         -> <Can perform={Permission.MOTORISTA_STATUS}> -> opens MotoristaStatusDialog
- Desativar row button      -> <Can perform={Permission.MOTORISTA_DESATIVAR}> -> opens MotoristaDesativarDialog
- Reativar row button       -> <Can perform={Permission.MOTORISTA_REATIVAR}> -> calls useReativarMotorista
- Filter toggles: All / Active / Inactive + statusOperacional filter
- Loading, ErrorState with retry, Empty state
```

---

### Step 9 — Dialogs

```
// src/components/molecules/MotoristaFormDialog.tsx
Props: mode: "create" | "edit", motorista?: Motorista, open: boolean, onClose: () => void
Fields:
  - servidorId (required, select from ativos)
  - cnhNumero (required, digits only, maxLength per backend)
  - cnhCategoria (required, select)
Create -> useCreateMotorista
Edit   -> useUpdateMotorista
```

```
// src/components/molecules/MotoristaStatusDialog.tsx
Props: motoristaId: string, currentStatus: MotoristaStatusOperacional, open: boolean, onClose: () => void
Field: statusOperacional (select)
Submit: useUpdateMotoristaStatus
```

```
// src/components/molecules/MotoristaDesativarDialog.tsx
Props: motoristaId: string, servidorNome: string, open: boolean, onClose: () => void
Body: "Deseja desativar o motorista [nome]? Esta acao pode ser revertida."
Confirm: variant="destructive", calls useDesativarMotorista
```

---

### Step 10 — i18n

Create `src/i18n/locales/en/motoristas.json` with:

- `page.*` (title, empty, filters, accessDenied)
- `table.*` (servidor, cnhNumero, cnhCategoria, statusOperacional, status, actions)
- `actions.*` (create, edit, updateStatus, desativar, reativar)
- `form.*` and `statusDialog.*`
- `status.*` and `statusOperacional.*`
- `toast.*` (created, updated, statusUpdated, desativado, reativado, duplicateCnh, notFound, invalidData)

Register `"motoristas"` in `src/i18n/config.ts`.

---

### Step 11 — Register MSW handlers and permissions

```typescript
// src/test/setup.ts
import { motoristasHandlers } from "@/msw/motoristasHandlers";
```

```typescript
// src/models/Permission.ts
export enum Permission {
  // ...existing code...
  MOTORISTA_VIEW = "motorista:view",
  MOTORISTA_CREATE = "motorista:create",
  MOTORISTA_EDIT = "motorista:edit",
  MOTORISTA_STATUS = "motorista:status",
  MOTORISTA_DESATIVAR = "motorista:desativar",
  MOTORISTA_REATIVAR = "motorista:reativar",
}
```

---

### Step 12 — Add to sidebar nav

In nav config (see `route-admin-shell.md` Step 2), add:

```typescript
const motoristaNavItem = {
  href: "/frota/motoristas",
  labelKey: "nav.motoristas",
  icon: "IdCard",
  permission: Permission.MOTORISTA_VIEW,
};
```

Add `"nav.motoristas": "Drivers"` to `src/i18n/locales/en/nav.json`.

---

## Review Checklist

- [ ] `motoristasFacade` unwraps `response.data` from the API envelope
- [ ] POST validates UUID format client-side before calling API
- [ ] UI shows clear inline message for invalid UUID/CNH payload
- [ ] `PATCH /status` payload and enum values are confirmed against Swagger
- [ ] Soft-delete uses `PATCH /desativar` (not `DELETE`)
- [ ] All mutations invalidate `motoristasKeys.list()` on success
- [ ] `useUpdateMotorista` also invalidates `motoristasKeys.detail(id)`
- [ ] `useReativarMotorista` returns updated entity and refreshes list
- [ ] MSW handlers include `404`, `409`, and `500` scenarios
- [ ] `motoristas` namespace registered in `src/i18n/config.ts`
- [ ] Permissions added to `src/models/Permission.ts`
- [ ] Nav item added with `nav.motoristas` key
- [ ] Loading, error, and empty states implemented

