# Route: /departments — Department Management

> **Domain:** Departments
> **Base URL:** `http://172.19.2.116:3000` (env: `NEXT_PUBLIC_API_URL`)
> **Cross-links:** [`../admin-panel-next-steps.md`](../admin-panel-next-steps.md) · [`../../api-contract.md`](../../api-contract.md)

---

## What This Route Does

The `/departments` page lets Admins view and create departments. Departments are the organizational containers that group users and runs. In v1, departments are flat (no nesting) and cannot be deleted — only created and viewed.

---

## API Endpoints

| Method | Endpoint       | Description       | Success | Error codes       |
|--------|----------------|-------------------|---------|-------------------|
| `GET`  | `/departments` | List departments  | `200`   | —                 |
| `POST` | `/departments` | Create department | `201`   | `403` `409` `422` |

### Response shape

```typescript
const listDepartmentsResponse = {
  items: [
    {
      id: "dept-uuid",
      name: "Zone 3 Operations",
      description: "Handles all Zone 3 field operations",
      userCount: 12,
      activeRunCount: 4,
      createdAt: "2026-04-01T00:00:00Z",
    },
  ],
  total: 5,
  page: 1,
  pageSize: 25,
  hasMore: false,
};
```

> This API does NOT use the `{ success, data, timestamp }` envelope. Use `handleApiResponse<T>` directly.

---

## File Map

| File                                                 | Type       | Purpose                    |
|------------------------------------------------------|------------|----------------------------|
| `src/models/Department.ts`                           | Model      | `Department` interface     |
| `src/types/departments.ts`                           | Types      | Input types                |
| `src/facades/departmentsFacade.ts`                   | Facade     | HTTP calls                 |
| `src/lib/queryKeys/departmentsKeys.ts`               | Query keys | TanStack Query key factory |
| `src/hooks/useDepartments.ts`                        | Hook       | List query                 |
| `src/hooks/useCreateDepartment.ts`                   | Hook       | Create mutation            |
| `src/msw/departmentsHandlers.ts`                     | MSW        | Mock handlers              |
| `src/test/fixtures/departments.ts`                   | Fixture    | Mock data                  |
| `src/app/(admin)/departments/page.tsx`               | Page       | Server Component entry     |
| `src/components/organisms/DepartmentsPageClient.tsx` | Organism   | Card grid + actions        |
| `src/components/molecules/DepartmentFormDialog.tsx`  | Molecule   | Create dialog              |
| `src/i18n/locales/en/departments.json`               | i18n       | All labels                 |

---

## Implementation Steps

### Step 1 — Model and types

```typescript
// src/models/Department.ts
export interface Department {
  id: string;
  name: string;
  description: string | null;
  userCount: number;
  activeRunCount: number;
  createdAt: string;
}
```

```typescript
// src/types/departments.ts
export interface CreateDepartmentInput {
  name: string;
  description?: string;
}
```

Export `Department` from `src/models/index.ts`.

---

### Step 2 — Query key factory

```typescript
// src/lib/queryKeys/departmentsKeys.ts
export const departmentsKeys = {
  list: ()             => ["departments", "list"] as const,
  detail: (id: string) => ["departments", "detail", id] as const,
};
```

---

### Step 3 — Facade

```typescript
// src/facades/departmentsFacade.ts
const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://172.19.2.116:3000";

export const departmentsFacade = {
  async listDepartments(): Promise<PaginatedResponse<Department>> {
    const response = await fetch(`${BASE}/departments`);
    return handleApiResponse<PaginatedResponse<Department>>(response);
  },

  async createDepartment(input: CreateDepartmentInput): Promise<Department> {
    const response = await fetch(`${BASE}/departments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return handleApiResponse<Department>(response);
  },
};
```

---

### Step 4 — Query hook

```typescript
// src/hooks/useDepartments.ts
export function useDepartments() {
  const query = useQuery<PaginatedResponse<Department>, Error>({
    queryKey: departmentsKeys.list(),
    queryFn: () => departmentsFacade.listDepartments(),
    staleTime: 60_000, // departments change infrequently
  });
  return { data: query.data, isLoading: query.isLoading, isError: query.isError, refetch: query.refetch };
}
```

---

### Step 5 — Create mutation hook

```typescript
// src/hooks/useCreateDepartment.ts
export function useCreateDepartment() {
  const queryClient = useQueryClient();
  const { t } = useTranslation("departments");

  return useMutation({
    mutationFn: (input: CreateDepartmentInput) => departmentsFacade.createDepartment(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: departmentsKeys.list() });
      toast.success(t("toast.created"));
    },
    onError: (error: ApiError) => {
      if (error.status === 409) toast.error(t("toast.duplicateName"));
      else toast.error(t("common:toast.serverError"));
    },
  });
}
```

---

### Step 6 — MSW handlers

```typescript
// src/msw/departmentsHandlers.ts
import { http, HttpResponse, delay } from "msw";
import { mockDepartments } from "@/test/fixtures/departments";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://172.19.2.116:3000";

export const departmentsHandlers = [
  http.get(`${BASE}/departments`, async () => {
    await delay(300);
    return HttpResponse.json({
      items: mockDepartments,
      total: mockDepartments.length,
      page: 1,
      pageSize: 25,
      hasMore: false,
    });
  }),
  http.post(`${BASE}/departments`, async ({ request }) => {
    await delay(300);
    const body = await request.json() as CreateDepartmentInput;
    if (body.name === "DUPLICATE_TEST") {
      return HttpResponse.json({ code: "CONFLICT" }, { status: 409 });
    }
    const created: Department = {
      id: crypto.randomUUID(),
      name: body.name,
      description: body.description ?? null,
      userCount: 0,
      activeRunCount: 0,
      createdAt: new Date().toISOString(),
    };
    return HttpResponse.json(created, { status: 201 });
  }),
];
```

---

### Step 7 — Fixtures

```typescript
// src/test/fixtures/departments.ts
import type { Department } from "@/models";

export const mockDepartments: Department[] = [
  { id: "dept-1", name: "Zone 3 Operations",  description: "Handles Zone 3 field ops", userCount: 12, activeRunCount: 4, createdAt: "2026-04-01T00:00:00Z" },
  { id: "dept-2", name: "Zone 1 Inspections", description: null,                        userCount: 8,  activeRunCount: 2, createdAt: "2026-04-01T00:00:00Z" },
  { id: "dept-3", name: "Central Dispatch",   description: "Main dispatch hub",          userCount: 5,  activeRunCount: 0, createdAt: "2026-04-01T00:00:00Z" },
];
```

---

### Step 8 — Page and client component

```
// src/app/(admin)/departments/page.tsx  — Server Component
Renders:
  <PermissionsProvider role={currentUserRole}>
    <Suspense fallback={<DepartmentsPageSkeleton />}>
      <DepartmentsPageClient />
    </Suspense>
  </PermissionsProvider>
```

```
// src/components/organisms/DepartmentsPageClient.tsx  — "use client"
Layout: card grid (not table) — 2 columns on md, 3 on lg
Each card shows:
  - Department name (heading)
  - Description (if present, else em-dash)
  - userCount badge: "12 users"
  - activeRunCount badge: "4 active runs"
  - createdAt formatted date

- "Novo Departamento" button → <Can perform={Permission.DEPARTMENT_CREATE}> → opens DepartmentFormDialog
- No delete or edit in v1
- Loading: skeleton cards
- Error: <ErrorState onRetry={refetch} />
- Empty: empty state section
```

---

### Step 9 — DepartmentFormDialog

```
// src/components/molecules/DepartmentFormDialog.tsx
Props: open: boolean, onClose: () => void
Fields:
  - name: text input, required, maxLength 100
  - description: textarea, optional, maxLength 300
On submit: calls useCreateDepartment, closes on success
409 error: show inline "A department with this name already exists"
```

---

### Step 10 — i18n

`src/i18n/locales/en/departments.json`

```json
{
  "page": {
    "title": "Departments",
    "empty": { "title": "No departments yet", "message": "Create the first department to organize users and runs." },
    "accessDenied": "You do not have permission to view departments."
  },
  "card": { "users": "{{count}} user(s)", "activeRuns": "{{count}} active run(s)", "noDescription": "—" },
  "actions": { "create": "New Department" },
  "form": { "name": "Name", "description": "Description (optional)", "submit": "Create", "cancel": "Cancel" },
  "toast": {
    "created": "Department created successfully.",
    "duplicateName": "A department with this name already exists."
  }
}
```

Register `"departments"` in `src/i18n/config.ts`.

---

### Step 11 — Register MSW handlers and add permissions

```typescript
// src/test/setup.ts — add to setupServer(...)
import { departmentsHandlers } from "@/msw/departmentsHandlers";
```

```typescript
// src/models/Permission.ts — add
export enum Permission {
  // ...existing code...
  DEPARTMENT_VIEW = "department:view",
  DEPARTMENT_CREATE = "department:create",
}
```

---

## Review Checklist

- [ ] `departmentsFacade` uses `handleApiResponse` directly (no envelope unwrap)
- [ ] `useDepartments` stale time is 60s (departments change infrequently)
- [ ] Card grid is responsive: 1 col mobile, 2 col md, 3 col lg
- [ ] `userCount` and `activeRunCount` use i18n pluralization
- [ ] No delete or edit actions in v1
- [ ] MSW handlers registered in test server setup
- [ ] `departments` namespace registered in `src/i18n/config.ts`
- [ ] Permissions added to `src/models/Permission.ts`
- [ ] All three states handled: loading, error, empty
