# Route: /audit — Audit Trail

> **Domain:** Audit
> **Base URL:** `http://172.19.2.116:3000` (env: `NEXT_PUBLIC_API_URL`)
> **Cross-links:** [`../admin-panel-next-steps.md`](../admin-panel-next-steps.md) · [`../../api-contract.md`](../../api-contract.md) · [`../../security.md`](../../security.md)

---

## What This Route Does

The `/audit` page is a read-only view of the server-side audit log. Every state-changing action in the platform (run overrides, user deactivations, role changes, etc.) is recorded server-side and surfaced here. Only Supervisors and Admins can access this page.

There are no create, edit, or delete actions on this page.

---

## API Endpoints

| Method | Endpoint     | Description              | Success | Error codes |
|--------|--------------|--------------------------|---------|-------------|
| `GET`  | `/audit`     | Paginated audit log      | `200`   | `403`       |

### Query parameters

| Param        | Type      | Description                        |
|--------------|-----------|------------------------------------|
| `eventType`  | `string`  | Filter by event type               |
| `actorId`    | `string`  | Filter by actor user ID            |
| `entityType` | `string`  | Filter by entity type (run, user…) |
| `entityId`   | `string`  | Filter by specific entity ID       |
| `from`       | `ISO8601` | Start of date range                |
| `to`         | `ISO8601` | End of date range                  |
| `page`       | `number`  | Page number (default: 1)           |
| `pageSize`   | `number`  | Items per page (default: 50)       |

### Response shape

```typescript
const listAuditResponse = {
  items: [
    {
      id: "audit-uuid",
      eventType: "run.overridden",
      actorId: "user-uuid",
      actorRole: "SUPERVISOR",
      entityType: "run",
      entityId: "run-uuid",
      departmentId: "dept-uuid",
      payload: {
        prevStatus: "IN_PROGRESS",
        newStatus: "COMPLETED",
        reason: "Agent confirmed verbally",
      },
      priority: "high",
      timestamp: "2026-04-15T10:30:00Z",
    },
  ],
  total: 847,
  page: 1,
  pageSize: 50,
  hasMore: true,
};
```

> This API does NOT use the `{ success, data, timestamp }` envelope. Use `handleApiResponse<T>` directly.

---

## File Map

| File                                           | Type       | Purpose                    |
|------------------------------------------------|------------|----------------------------|
| `src/models/AuditEntry.ts`                     | Model      | `AuditEntry` interface     |
| `src/types/audit.ts`                           | Types      | Filter input type          |
| `src/facades/auditFacade.ts`                   | Facade     | HTTP calls                 |
| `src/lib/queryKeys/auditKeys.ts`               | Query keys | TanStack Query key factory |
| `src/hooks/useAuditTrail.ts`                   | Hook       | Infinite query (load more) |
| `src/msw/auditHandlers.ts`                     | MSW        | Mock handlers              |
| `src/test/fixtures/audit.ts`                   | Fixture    | Mock data                  |
| `src/app/(admin)/audit/page.tsx`               | Page       | Server Component entry     |
| `src/components/organisms/AuditPageClient.tsx` | Organism   | Timeline list + filters    |
| `src/i18n/locales/en/audit.json`               | i18n       | All labels                 |

---

## Implementation Steps

### Step 1 — Model and types

```typescript
// src/models/AuditEntry.ts
export interface AuditEntry {
  id: string;
  eventType: string;
  actorId: string;
  actorRole: "ADMIN" | "SUPERVISOR" | "DISPATCHER" | "FIELD_AGENT";
  entityType: string;
  entityId: string;
  departmentId: string;
  payload: Record<string, unknown>;
  priority: "low" | "medium" | "high";
  timestamp: string;
}
```

```typescript
// src/types/audit.ts
export interface AuditFilters {
  eventType?: string;
  actorId?: string;
  entityType?: string;
  entityId?: string;
  from?: string;
  to?: string;
  pageSize?: number;
}
```

Export `AuditEntry` from `src/models/index.ts`.

---

### Step 2 — Query key factory

```typescript
// src/lib/queryKeys/auditKeys.ts
export const auditKeys = {
  list: (filters?: AuditFilters) => ["audit", "list", filters ?? {}] as const,
};
```

---

### Step 3 — Facade

```typescript
// src/facades/auditFacade.ts
const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://172.19.2.116:3000";

export const auditFacade = {
  async listAudit(filters: AuditFilters & { page: number }): Promise<PaginatedResponse<AuditEntry>> {
    const params = new URLSearchParams();
    if (filters.eventType)  params.set("eventType", filters.eventType);
    if (filters.actorId)    params.set("actorId", filters.actorId);
    if (filters.entityType) params.set("entityType", filters.entityType);
    if (filters.entityId)   params.set("entityId", filters.entityId);
    if (filters.from)       params.set("from", filters.from);
    if (filters.to)         params.set("to", filters.to);
    params.set("page", String(filters.page));
    params.set("pageSize", String(filters.pageSize ?? 50));
    const response = await fetch(`${BASE}/audit?${params.toString()}`);
    return handleApiResponse<PaginatedResponse<AuditEntry>>(response);
  },
};
```

---

### Step 4 — Infinite query hook

The audit trail uses `useInfiniteQuery` so users can "load more" without replacing existing entries.

```typescript
// src/hooks/useAuditTrail.ts
export function useAuditTrail(filters: AuditFilters = {}) {
  return useInfiniteQuery<PaginatedResponse<AuditEntry>, Error>({
    queryKey: auditKeys.list(filters),
    queryFn: ({ pageParam = 1 }) =>
      auditFacade.listAudit({ ...filters, page: pageParam as number }),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
    staleTime: 30_000,
  });
}
```

Usage in the component:
```typescript
const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError } = useAuditTrail(filters);
const entries = data?.pages.flatMap(p => p.items) ?? [];
```

---

### Step 5 — MSW handlers

```typescript
// src/msw/auditHandlers.ts
import { http, HttpResponse, delay } from "msw";
import { mockAuditEntries } from "@/test/fixtures/audit";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://172.19.2.116:3000";

export const auditHandlers = [
  http.get(`${BASE}/audit`, async ({ request }) => {
    await delay(400);
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page") ?? 1);
    const pageSize = Number(url.searchParams.get("pageSize") ?? 50);
    const start = (page - 1) * pageSize;
    const items = mockAuditEntries.slice(start, start + pageSize);
    return HttpResponse.json({
      items,
      total: mockAuditEntries.length,
      page,
      pageSize,
      hasMore: start + pageSize < mockAuditEntries.length,
    });
  }),
];
```

---

### Step 6 — Fixtures

```typescript
// src/test/fixtures/audit.ts
import type { AuditEntry } from "@/models";

export const mockAuditEntries: AuditEntry[] = [
  {
    id: "audit-1",
    eventType: "run.overridden",
    actorId: "user-1",
    actorRole: "SUPERVISOR",
    entityType: "run",
    entityId: "run-1",
    departmentId: "dept-1",
    payload: { prevStatus: "IN_PROGRESS", newStatus: "COMPLETED", reason: "Agent confirmed verbally" },
    priority: "high",
    timestamp: "2026-04-15T10:30:00Z",
  },
  {
    id: "audit-2",
    eventType: "user.deactivated",
    actorId: "user-1",
    actorRole: "ADMIN",
    entityType: "user",
    entityId: "user-3",
    departmentId: "dept-2",
    payload: { reason: "Left organization" },
    priority: "medium",
    timestamp: "2026-04-15T09:00:00Z",
  },
];
```

---

### Step 7 — Page and client component

```
// src/app/(admin)/audit/page.tsx  — Server Component
Permission gate: only SUPERVISOR and ADMIN roles
Renders:
  <Can perform={Permission.AUDIT_VIEW} fallback={<AccessDenied />}>
    <Suspense fallback={<AuditPageSkeleton />}>
      <AuditPageClient />
    </Suspense>
  </Can>
```

```
// src/components/organisms/AuditPageClient.tsx  — "use client"
Layout: vertical timeline list
Each entry shows:
  - Timestamp (formatted, relative time on hover)
  - Actor name + role badge
  - Event type (human-readable label from i18n)
  - Entity type + entity ID (truncated UUID)
  - Payload summary (key-value pairs, collapsed by default, expandable)
  - Priority indicator dot (high = danger, medium = warning, low = neutral)

Filters (above the list):
  - eventType: text input or select
  - from / to: date inputs
  - entityType: select

Pagination:
  - "Load more" button at the bottom
  - Disabled when !hasNextPage
  - Shows spinner when isFetchingNextPage

Loading: skeleton timeline entries
Error: <ErrorState onRetry={refetch} />
Empty: empty state section
```

---

### Step 8 — i18n

`src/i18n/locales/en/audit.json`

```json
{
  "page": {
    "title": "Audit Trail",
    "empty": { "title": "No audit entries", "message": "No events match the current filters." },
    "accessDenied": "You do not have permission to view the audit trail."
  },
  "filters": {
    "eventType": "Event type",
    "from": "From",
    "to": "To",
    "entityType": "Entity type",
    "clear": "Clear filters"
  },
  "entry": {
    "actor": "{{name}} ({{role}})",
    "entity": "{{type}} {{id}}",
    "showPayload": "Show details",
    "hidePayload": "Hide details"
  },
  "eventType": {
    "run.overridden":   "Run overridden",
    "run.cancelled":    "Run cancelled",
    "run.assigned":     "Run assigned",
    "user.deactivated": "User deactivated",
    "user.roleChanged": "Role changed"
  },
  "priority": { "high": "High", "medium": "Medium", "low": "Low" },
  "pagination": { "loadMore": "Load more", "loading": "Loading…", "end": "All entries loaded" }
}
```

Register `"audit"` in `src/i18n/config.ts`.

---

### Step 9 — Register MSW handlers and add permissions

```typescript
// src/test/setup.ts — add to setupServer(...)
import { auditHandlers } from "@/msw/auditHandlers";
```

```typescript
// src/models/Permission.ts — add
export enum Permission {
  // ...existing code...
  AUDIT_VIEW = "audit:view",
}
```

---

## Review Checklist

- [ ] `useAuditTrail` uses `useInfiniteQuery` — not `useQuery`
- [ ] `getNextPageParam` returns `undefined` when `hasMore` is false
- [ ] Entries are flattened from `data.pages` before rendering
- [ ] "Load more" button is disabled when `!hasNextPage`
- [ ] Payload section is collapsed by default and expandable
- [ ] Filters change the query key, triggering a fresh fetch from page 1
- [ ] Page is permission-gated — non-Supervisors/Admins see access denied
- [ ] MSW handlers registered in test server setup
- [ ] `audit` namespace registered in `src/i18n/config.ts`
- [ ] All three states handled: loading, error, empty
