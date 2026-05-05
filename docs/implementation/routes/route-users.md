# Route: /users — User Management

> **Domain:** Users
> **Base URL:** `http://172.19.2.116:3000` (env: `NEXT_PUBLIC_API_URL`)
> **Cross-links:** [`../admin-panel-next-steps.md`](../admin-panel-next-steps.md) · [`../../api-contract.md`](../../api-contract.md) · [`../../security.md`](../../security.md)

---

## What This Route Does

The `/users` page allows Admins to manage platform users — create accounts, assign roles and departments, and deactivate users. Role assignment is the primary access-control mechanism for the entire platform, so this page is Admin-only for write operations.

---

## API Endpoints

| Method  | Endpoint                | Description        | Success | Error codes       |
|---------|-------------------------|--------------------|---------|-------------------|
| `GET`   | `/users`                | List users         | `200`   | —                 |
| `POST`  | `/users`                | Create user        | `201`   | `403` `409` `422` |
| `PATCH` | `/users/:id`            | Update user fields | `200`   | `403` `404` `422` |
| `POST`  | `/users/:id/deactivate` | Deactivate user    | `200`   | `403` `404` `422` |

### Query parameters for GET /v1/users

| Param          | Type                                          | Default |
|----------------|-----------------------------------------------|---------|
| `role`         | `ADMIN\|SUPERVISOR\|DISPATCHER\|FIELD_AGENT`  | —       |
| `departmentId` | `string`                                      | —       |
| `status`       | `active\|inactive`                            | —       |
| `page`         | `number`                                      | `1`     |
| `pageSize`     | `number`                                      | `25`    |

### Response shape

`GET /v1/users` — `PaginatedResponse<User>`

```typescript
const listUsersResponse = {
  items: [
    {
      id: "user-uuid",
      name: "Jane Smith",
      email: "jane.smith@gov.internal",
      role: "DISPATCHER",
      departmentId: "dept-uuid",
      status: "active",
      createdAt: "2026-04-15T08:00:00Z",
      updatedAt: "2026-04-15T08:00:00Z",
    },
  ],
  total: 42,
  page: 1,
  pageSize: 25,
  hasMore: true,
};
```

> This API does NOT use the `{ success, data, timestamp }` envelope. Use `handleApiResponse<T>` directly.

---

## File Map

| File                                           | Type       | Purpose                           |
|------------------------------------------------|------------|-----------------------------------|
| `src/models/User.ts`                           | Model      | Already exists — extend if needed |
| `src/types/users.ts`                           | Types      | Input types for facade methods    |
| `src/facades/usersFacade.ts`                   | Facade     | All HTTP calls for this domain    |
| `src/lib/queryKeys/usersKeys.ts`               | Query keys | TanStack Query key factory        |
| `src/hooks/useUsers.ts`                        | Hook       | Paginated list query              |
| `src/hooks/useCreateUser.ts`                   | Hook       | Create mutation                   |
| `src/hooks/useUpdateUser.ts`                   | Hook       | Update mutation                   |
| `src/hooks/useDeactivateUser.ts`               | Hook       | Deactivate mutation               |
| `src/msw/usersHandlers.ts`                     | MSW        | Mock handlers                     |
| `src/test/fixtures/users.ts`                   | Fixture    | Mock data                         |
| `src/app/(admin)/users/page.tsx`               | Page       | Server Component entry            |
| `src/components/organisms/UsersPageClient.tsx` | Organism   | Interactive table + actions       |
| `src/components/molecules/UserFormDialog.tsx`  | Molecule   | Create / edit dialog              |
| `src/i18n/locales/en/users.json`               | i18n       | Extend existing file              |

---

## Implementation Steps

### Step 1 — Types

```typescript
// src/types/users.ts
export interface ListUsersInput {
  role?: "ADMIN" | "SUPERVISOR" | "DISPATCHER" | "FIELD_AGENT";
  departmentId?: string;
  status?: "active" | "inactive";
  page?: number;
  pageSize?: number;
}

export interface CreateUserInput {
  name: string;
  email: string;
  role: "ADMIN" | "SUPERVISOR" | "DISPATCHER" | "FIELD_AGENT";
  departmentId: string;
}

export interface UpdateUserInput {
  name?: string;
  role?: "ADMIN" | "SUPERVISOR" | "DISPATCHER" | "FIELD_AGENT";
  departmentId?: string;
}
```

---

### Step 2 — Query key factory

```typescript
// src/lib/queryKeys/usersKeys.ts
export const usersKeys = {
  list: (filters?: ListUsersInput) => ["users", "list", filters ?? {}] as const,
  detail: (id: string)             => ["users", "detail", id] as const,
};
```

---

### Step 3 — Facade

```typescript
// src/facades/usersFacade.ts
const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://172.19.2.116:3000";

export const usersFacade = {
  async listUsers(input: ListUsersInput = {}): Promise<PaginatedResponse<User>> {
    const params = new URLSearchParams();
    if (input.role)         params.set("role", input.role);
    if (input.departmentId) params.set("departmentId", input.departmentId);
    if (input.status)       params.set("status", input.status);
    if (input.page)         params.set("page", String(input.page));
    if (input.pageSize)     params.set("pageSize", String(input.pageSize));
    const response = await fetch(`${BASE}/users?${params.toString()}`);
    return handleApiResponse<PaginatedResponse<User>>(response);
  },

  async createUser(input: CreateUserInput): Promise<User> {
    const response = await fetch(`${BASE}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return handleApiResponse<User>(response);
  },

  async updateUser(id: string, input: UpdateUserInput): Promise<User> {
    const response = await fetch(`${BASE}/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return handleApiResponse<User>(response);
  },

  async deactivateUser(id: string): Promise<{ deactivatedUserId: string; affectedRunIds: string[] }> {
    const response = await fetch(`${BASE}/users/${id}/deactivate`, { method: "POST" });
    return handleApiResponse(response);
  },
};
```

---

### Step 4 — Query hook

```typescript
// src/hooks/useUsers.ts
export function useUsers(filters: ListUsersInput = {}) {
  const query = useQuery<PaginatedResponse<User>, Error>({
    queryKey: usersKeys.list(filters),
    queryFn: () => usersFacade.listUsers(filters),
    staleTime: 30_000,
  });
  return { data: query.data, isLoading: query.isLoading, isError: query.isError, refetch: query.refetch };
}
```

---

### Step 5 — Mutation hooks

```typescript
// src/hooks/useCreateUser.ts
export function useCreateUser() {
  const queryClient = useQueryClient();
  const { t } = useTranslation("users");

  return useMutation({
    mutationFn: (input: CreateUserInput) => usersFacade.createUser(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: usersKeys.list() });
      toast.success(t("toast.created"));
    },
    onError: (error: ApiError) => {
      if (error.status === 409) toast.error(t("toast.duplicateEmail"));
      else if (error.status === 422) toast.error(t("toast.validationError"));
      else toast.error(t("common:toast.serverError"));
    },
  });
}
```

`useDeactivateUser` should also show a warning if `affectedRunIds.length > 0` in the success callback.

---

### Step 6 — MSW handlers

```typescript
// src/msw/usersHandlers.ts
import { http, HttpResponse, delay } from "msw";
import { mockUsers } from "@/test/fixtures/users";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://172.19.2.116:3000";

export const usersHandlers = [
  http.get(`${BASE}/users`, async () => {
    await delay(300);
    return HttpResponse.json({ items: mockUsers, total: mockUsers.length, page: 1, pageSize: 25, hasMore: false });
  }),
  http.post(`${BASE}/users`, async ({ request }) => {
    await delay(300);
    const body = await request.json() as CreateUserInput;
    if (body.email === "duplicate@gov.internal") {
      return HttpResponse.json({ code: "CONFLICT" }, { status: 409 });
    }
    const created = { id: crypto.randomUUID(), ...body, status: "active", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    return HttpResponse.json(created, { status: 201 });
  }),
  http.patch(`${BASE}/users/:id`, async ({ params, request }) => {
    await delay(300);
    const body = await request.json() as UpdateUserInput;
    const user = mockUsers.find(u => u.id === params.id);
    if (!user) return HttpResponse.json({ code: "NOT_FOUND" }, { status: 404 });
    return HttpResponse.json({ ...user, ...body, updatedAt: new Date().toISOString() });
  }),
  http.post(`${BASE}/users/:id/deactivate`, async ({ params }) => {
    await delay(300);
    if (params.id === "not-found") return HttpResponse.json({ code: "NOT_FOUND" }, { status: 404 });
    return HttpResponse.json({ deactivatedUserId: params.id, affectedRunIds: [] });
  }),
];
```

---

### Step 7 — Fixtures

```typescript
// src/test/fixtures/users.ts
import type { User } from "@/models";

export const mockUsers: User[] = [
  { id: "user-1", name: "Ana Lima",    email: "ana.lima@gov.internal",    role: "ADMIN",      status: "ACTIVE",   departmentId: "dept-1", avatarUrl: null, createdAt: "2026-04-01T00:00:00Z", lastActiveAt: "2026-04-15T10:00:00Z" },
  { id: "user-2", name: "Carlos Melo", email: "carlos.melo@gov.internal", role: "DISPATCHER", status: "ACTIVE",   departmentId: "dept-1", avatarUrl: null, createdAt: "2026-04-01T00:00:00Z", lastActiveAt: "2026-04-15T09:00:00Z" },
  { id: "user-3", name: "Beatriz Nunes", email: "b.nunes@gov.internal",   role: "SUPERVISOR", status: "INACTIVE", departmentId: "dept-2", avatarUrl: null, createdAt: "2026-04-01T00:00:00Z", lastActiveAt: "2026-04-10T08:00:00Z" },
];
```

---

### Step 8 — Page and client component

```
// src/app/(admin)/users/page.tsx  — Server Component
Renders:
  <PermissionsProvider role={currentUserRole}>
    <Suspense fallback={<UsersPageSkeleton />}>
      <UsersPageClient />
    </Suspense>
  </PermissionsProvider>
```

```
// src/components/organisms/UsersPageClient.tsx  — "use client"
Table columns: Avatar | Name | Email | Role (Badge) | Department | Status | Actions
Filters: role select, status select (active/inactive)
- "Novo Usuário" button → <Can perform={Permission.USER_CREATE}> → opens UserFormDialog mode="create"
- Edit row button       → <Can perform={Permission.USER_EDIT}>   → opens UserFormDialog mode="edit"
- Deactivate button     → <Can perform={Permission.USER_DEACTIVATE}> → opens ConfirmDialog
  - If user has IN_PROGRESS runs, show count warning in dialog body
- Loading: skeleton rows
- Error: <ErrorState onRetry={refetch} />
- Empty: empty state section
```

---

### Step 9 — UserFormDialog

```
// src/components/molecules/UserFormDialog.tsx
Props: mode: "create" | "edit", user?: User, open: boolean, onClose: () => void
Fields (create): name, email, role (select), departmentId (select from useDepartments)
Fields (edit):   name, role (select), departmentId (select) — email is read-only
On submit (create): calls useCreateUser
On submit (edit):   calls useUpdateUser
Validation: email format, required fields
409 error: show inline "Email already in use"
422 error: show inline field-level error from error.field
```

---

### Step 10 — Extend users.json

Add to `src/i18n/locales/en/users.json`:

```json
{
  "page": {
    "title": "Users",
    "empty": { "title": "No users found", "message": "Adjust filters or create a new user." },
    "accessDenied": "You do not have permission to view users.",
    "filters": { "all": "All roles", "active": "Active", "inactive": "Inactive" }
  },
  "table": { "name": "Name", "email": "Email", "role": "Role", "department": "Department", "status": "Status", "actions": "Actions" },
  "actions": { "create": "New User", "edit": "Edit", "deactivate": "Deactivate" },
  "form": { "name": "Full name", "email": "Email", "role": "Role", "department": "Department", "submit": "Save", "cancel": "Cancel" },
  "toast": {
    "created": "User created successfully.",
    "updated": "User updated successfully.",
    "deactivated": "User deactivated.",
    "duplicateEmail": "A user with this email already exists.",
    "validationError": "Please check the form fields.",
    "hasActiveRuns": "User has {{count}} active run(s). They will be unassigned."
  }
}
```

---

### Step 11 — Register MSW handlers and add permissions

```typescript
// src/test/setup.ts — add to setupServer(...)
import { usersHandlers } from "@/msw/usersHandlers";
```

```typescript
// src/models/Permission.ts — add
export enum Permission {
  // ...existing code...
  USER_VIEW = "user:view",
  USER_CREATE = "user:create",
  USER_EDIT = "user:edit",
  USER_DEACTIVATE = "user:deactivate",
}
```

---

## Review Checklist

- [ ] `usersFacade` uses `handleApiResponse` directly (no envelope unwrap needed)
- [ ] `useUsers` accepts filter params and passes them to the query key
- [ ] `useDeactivateUser` warns when `affectedRunIds.length > 0`
- [ ] `UserFormDialog` shows field-level errors from 422 responses
- [ ] Role select only shows roles the current user is allowed to assign
- [ ] MSW handlers registered in test server setup
- [ ] `users` namespace extended in `src/i18n/config.ts`
- [ ] Permissions added to `src/models/Permission.ts`
- [ ] All three states handled: loading, error, empty
