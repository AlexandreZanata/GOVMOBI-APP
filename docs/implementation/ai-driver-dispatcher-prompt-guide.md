# GovMobile — AI-Assisted Build Guide (Driver + Dispatcher)

> Standalone prompts to finish implementation using the new operational model.
> Each step includes one prompt and one POC file to validate before moving on.

---

## Scope

This guide implements the Government Operational Mobility logic already defined in the root `README.md`:

- role-based operations (Agent/Driver, Dispatcher, Supervisor, Admin)
- run lifecycle state machine
- run dispatch, acceptance, execution, completion, review
- run-linked chat/call coordination

---

## Business Model Canon (Always Keep in Prompt Context)

Use this exact business framing in every step prompt:

- **Purpose:** Internal fleet coordination and task dispatch for public servants.
- **Actors:** Field Agent, Dispatcher, Supervisor, Admin.
- **Core entity:** Run.
- **Lifecycle:** `PENDING -> ASSIGNED -> IN_PROGRESS -> COMPLETED` (or `CANCELLED`).
- **Operational flow:** create -> assign -> accept/reject -> execute -> complete with proof -> supervisor review.
- **Identity:** operational coordination platform, not consumer transportation app.

If a generated solution conflicts with this canon, treat it as a bug and revise.

---

## Master Prompt Block (prepend to every step)

```text
You are implementing GovMobile, a React Native + TypeScript Expo app.

BUSINESS MODEL (MANDATORY):
- Purpose: Internal fleet coordination and task dispatch platform for public servants.
- Actors: Field Agent, Dispatcher, Supervisor, Admin.
- Core entity: Run.
- Lifecycle: PENDING -> ASSIGNED -> IN_PROGRESS -> COMPLETED/CANCELLED.
- Every feature must preserve role-based permissions and auditable run transitions.
- Product identity: operational coordination platform, not consumer transportation app.

STRICT ENGINEERING RULES:
1. Use existing project structure and naming conventions.
2. No hardcoded colors/sizes in components; use useTheme().
3. No raw user-facing strings in JSX; use useTranslation().
4. Use strict TypeScript (no any).
5. Reuse existing models/facades/store/navigation patterns.
6. Add JSDoc on exported interfaces/functions.
7. Add tests for each step POC file.
8. Keep reducers pure and business logic out of presentational components.
9. Validate role permissions before run state transitions.
10. Preserve backwards compatibility unless migration is explicit.

OUTPUT CONTRACT:
- Return modified files and reasons for each change.
- Include edge cases and failure-handling behavior.
- Include acceptance checklist mapped to the step POC.
```

---

## Step Prompt Template (Copy Before Any Step)

```text
[Paste Master Prompt Block]

STEP GOAL:
<goal>

TARGET FILES:
- <file 1>
- <file 2>

BUSINESS ACCEPTANCE:
- Which actor(s) use this flow?
- Which Run lifecycle transitions are affected?
- Which permission checks are required?

TECHNICAL ACCEPTANCE:
- Type-safe interfaces/contracts
- i18n/theming compliance
- test coverage in POC file
- no runtime regression in existing flows
```

---

## STEP 1 — Run Domain Model

**Goal:** Create a typed Run entity and lifecycle model.

**Prompt:**
```text
Implement the GovMobile run domain model.

Create/update files:
- src/models/Run.ts
- src/models/index.ts

Requirements:
- Run lifecycle enum: PENDING, ASSIGNED, IN_PROGRESS, COMPLETED, CANCELLED
- Run type enum: TRANSPORT, INSPECTION, EMERGENCY_DISPATCH, MAINTENANCE, ADMIN_DELIVERY
- Run priority enum: LOW, MEDIUM, HIGH, CRITICAL
- Interfaces: Run, RunAssignment, RunProof, RunTimelineEvent
- Include createdAt/updatedAt as ISO strings
- Add JSDoc for all exported types
- Keep compatibility with current model export style

POC: add tests validating state values and required fields.
```

**POC File:** `src/models/__tests__/run-models.test.ts`

---

## STEP 2 — Roles + Permission Policy

**Goal:** Define permission matrix in code.

**Prompt:**
```text
Implement role permissions for run operations.

Create/update files:
- src/models/Permission.ts
- src/utils/permissions.ts
- src/models/User.ts (if role mapping update is needed)

Requirements:
- Define capabilities for Agent, Dispatcher, Supervisor, Admin
- Utility API:
  - hasPermission(role, permission)
  - canTransitionRun(role, fromStatus, toStatus)
- Keep implementation pure (no side effects)
- Export typed constants for permission keys

POC: add tests that validate matrix and transition rules.
```

**POC File:** `src/models/__tests__/permissions.test.ts`

---

## STEP 3 — Run Facade

**Goal:** Encapsulate run business actions behind facade contract.

**Prompt:**
```text
Create a RunFacade using existing facades style.

Create/update files:
- src/services/facades/RunFacade.ts
- src/services/facades/index.ts

Required methods:
- createRun(input)
- assignRun(runId, agentId)
- acceptRun(runId)
- rejectRun(runId, reason)
- startRun(runId)
- completeRun(runId, payload)
- cancelRun(runId, reason)
- uploadRunProof(runId, file)
- listRuns(filters)
- getRunById(runId)

Rules:
- Return Result<T, E> pattern used in current facades
- Include mock mode for POC
- Add method-level JSDoc

POC: test happy path + rejection path + invalid transition.
```

**POC File:** `src/services/facades/__tests__/RunFacade.test.ts`

---

## STEP 4 — Run Slice (Redux)

**Goal:** Manage run lifecycle and queues in store.

**Prompt:**
```text
Implement Redux run slice.

Create/update files:
- src/store/slices/runSlice.ts
- src/store/index.ts (register reducer)

State requirements:
- runsById
- runIdsByStatus
- selectedRunId
- isLoading
- error

Actions:
- setRuns
- upsertRun
- setSelectedRun
- transitionRun
- setRunLoading
- setRunError
- resetRuns

Selectors:
- selectRunById
- selectRunsByStatus
- selectActiveRuns

POC: test reducers for lifecycle transitions and list indexes.
```

**POC File:** `src/store/__tests__/runSlice.test.ts`

---

## STEP 5 — Dispatcher Queue Screen

**Goal:** Build dispatcher operational queue view.

**Prompt:**
```text
Implement Dispatcher queue screen for run creation and assignment oversight.

Create/update files:
- src/screens/Home/DispatcherQueueScreen.tsx
- src/screens/Home/useDispatcherQueue.ts
- src/screens/Home/DispatcherQueue.styles.ts

UI sections:
- filters (status, priority, type)
- run list grouped by status
- quick actions (assign, reassign, cancel)
- KPI header (pending, assigned, in progress)

Rules:
- strings from i18n
- styles from useTheme
- no business logic in component

POC: test empty, loading, grouped render, and assign action callback.
```

**POC File:** `src/screens/Home/__tests__/DispatcherQueueScreen.test.tsx`

---

## STEP 6 — Driver (Agent) Run Screen

**Goal:** Build mobile flow for agent execution.

**Prompt:**
```text
Implement Agent (driver) run workflow screen.

Create/update files:
- src/screens/Home/DriverRunScreen.tsx
- src/screens/Home/useDriverRun.ts
- src/screens/Home/DriverRun.styles.ts

Flow:
- assigned run details
- accept/reject actions
- start run
- complete run with note and proof upload

Rules:
- lifecycle action buttons shown by current status
- disable invalid actions
- use facade + store hooks

POC: test accept/start/complete action availability by status.
```

**POC File:** `src/screens/Home/__tests__/DriverRunScreen.test.tsx`

---

## STEP 7 — Supervisor Review Screen

**Goal:** Validate proof and close operations.

**Prompt:**
```text
Implement Supervisor review screen.

Create/update files:
- src/screens/Home/SupervisorReviewScreen.tsx
- src/screens/Home/useSupervisorReview.ts
- src/screens/Home/SupervisorReview.styles.ts

Features:
- completed run list
- proof preview (photo/document metadata)
- review decision (approve/reopen/override)
- review notes

POC: test decision actions and proof rendering states.
```

**POC File:** `src/screens/Home/__tests__/SupervisorReviewScreen.test.tsx`

---

## STEP 8 — Run-Linked Chat and Calls

**Goal:** Attach communication to run context.

**Prompt:**
```text
Extend chat and calls to include run context.

Create/update files:
- src/screens/Chat/ChatRoomScreen.tsx
- src/screens/Calls/CallHistoryScreen.tsx
- src/services/websocket/ (run updates)

Requirements:
- message thread optionally linked to runId
- call card shows related run status when present
- incoming run status updates via websocket reflected in UI

POC: test that runId context appears in chat header and call cards.
```

**POC File:** `src/screens/Chat/__tests__/RunContextChat.test.tsx`

---

## STEP 9 — Navigation by Role

**Goal:** Route each role to dedicated root flow.

**Prompt:**
```text
Implement role-based navigation routing.

Create/update files:
- src/navigation/types.ts
- src/navigation/RootNavigator.tsx
- src/navigation/MainTabNavigator.tsx

Requirements:
- Agent default route -> Driver run flow
- Dispatcher default route -> Dispatcher queue
- Supervisor default route -> Review dashboard
- Admin -> configuration/overview route
- enforce typed navigation params

POC: test route resolution by role.
```

**POC File:** `src/navigation/__tests__/role-routing.test.tsx`

---

## STEP 10 — Notifications and Toast Strategy

**Goal:** Surface operational events consistently.

**Prompt:**
```text
Implement run-event notifications and toast integration.

Create/update files:
- src/store/slices/uiSlice.ts
- src/components/organisms/GlobalToast.tsx
- src/hooks/useNotifications.ts

Run events:
- run assigned
- run accepted/rejected
- run started/completed/cancelled
- supervisor review decision

Rules:
- map event severity -> toast type
- auto-dismiss with accessible manual dismiss
- keep queue behavior deterministic

POC: test toast queue ordering and dismiss behavior.
```

**POC File:** `src/components/organisms/__tests__/GlobalToast.test.tsx`

---

## STEP 11 — Observability and Error Handling

**Goal:** Make operational failures visible and recoverable.

**Prompt:**
```text
Add error handling for run operations.

Create/update files:
- src/utils/logger.ts
- src/hooks/useAuthSession.ts
- src/hooks/useNetworkStatus.ts

Requirements:
- standardized app error shape
- facade failures produce actionable toast
- offline network status affects run actions safely
- optimistic transitions rollback on failure

POC: test failure-to-toast flow and rollback behavior.
```

**POC File:** `src/store/__tests__/run-error-handling.test.ts`

---

## STEP 12 — Final Integration Gate

**Goal:** Assemble all run logic end-to-end.

**Prompt:**
```text
Integrate all provider layers and run flow modules.

Create/update files:
- src/App.tsx
- src/App.test.tsx

Requirements:
- app mounts with theme, i18n, redux, navigation
- role-based root renders correctly
- global toasts and network banner mounted
- no runtime crash in initial render path

POC: add integration test with mocked role and run state.
```

**POC File:** `src/App.test.tsx`

---

## Definition of Done Per Step

A step is done only if:

1. `npm run type-check` passes
2. Step POC test passes
3. i18n/theme rules are followed
4. No `any` types introduced
5. Exports have JSDoc and typed contracts
6. Lifecycle and permission behavior match business model

---

## Suggested Execution Order

```text
Step 1 -> Step 2 -> Step 3 -> Step 4
   -> Step 5 -> Step 6 -> Step 7
   -> Step 8 -> Step 9 -> Step 10
   -> Step 11 -> Step 12
```
