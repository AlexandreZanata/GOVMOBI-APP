# GovMobile — Government Operational Mobility System

> **Internal fleet coordination and task dispatch platform for public servants.**
> This is not a consumer app; it is a controlled operational tool.

---

## Business Model

### Government Operational Mobility System — Business Model

**Purpose:** An internal fleet coordination and task dispatch platform for public servants. Not a consumer app - a controlled operational tool.

### Actors

- **Field Agent** - Executes assigned runs via mobile app
- **Dispatcher** - Creates and assigns runs, monitors operations in real-time
- **Supervisor** - Reviews performance, overrides actions
- **Admin** - Configures services, departments, and permissions

### Core Entity: The Run

A run is a government task that requires field movement.

Common run types:

- transport
- inspection
- emergency dispatch
- maintenance
- administrative delivery

Run lifecycle:

```text
PENDING -> ASSIGNED -> IN_PROGRESS -> COMPLETED
                               \-> CANCELLED
```

### Operational Flow

1. Dispatcher creates a run (type, location, priority)
2. System suggests an agent or dispatcher assigns manually (based on location, availability, role)
3. Agent receives notification and accepts or rejects
4. Agent navigates, executes, and updates status
5. Agent completes run with notes and proof (photo/document)
6. Supervisor reviews outcome

### Supporting Features

- Dispatcher <-> Agent real-time chat (text, attachments)
- Voice calls between dispatcher and agents
- Live map tracking of all active runs
- Post-run proof uploads and supervisor review

### Permission Model

| Role       | Capabilities                           |
|------------|----------------------------------------|
| Agent      | View assigned runs, update status      |
| Dispatcher | Create/assign runs, monitor all agents |
| Supervisor | View reports, override actions         |
| Admin      | Full system access                     |

### System Identity

> A task dispatch engine for field operations - not a transportation app, but an operational coordination platform.

---

## Architecture Overview

```text
govmobile/
├── src/
│   ├── components/
│   │   ├── atoms/
│   │   ├── molecules/
│   │   ├── organisms/
│   │   └── templates/
│   ├── screens/
│   │   ├── Auth/
│   │   ├── Home/
│   │   ├── Chat/
│   │   └── Calls/
│   ├── models/
│   ├── services/
│   │   ├── api/
│   │   ├── facades/
│   │   └── websocket/
│   ├── store/
│   │   └── slices/
│   ├── navigation/
│   ├── i18n/
│   ├── theme/
│   ├── hooks/
│   └── utils/
└── docs/
```

---

## Implementation Roadmap (Steps + POCs)

These steps are aligned with the current project structure and already existing module boundaries.

### Prompt Contract (Use in Every Step)

Use this block before every step prompt so implementation always stays connected to the business model and engineering standards:

```text
You are implementing GovMobile, a Government Operational Mobility System.

Business context (mandatory):
- This is an internal fleet coordination and task dispatch platform for public servants.
- Core entity is Run with lifecycle: PENDING -> ASSIGNED -> IN_PROGRESS -> COMPLETED/CANCELLED.
- Main actors: Field Agent, Dispatcher, Supervisor, Admin.
- Every feature must support operational clarity, role permissions, and auditable run transitions.

Engineering requirements (mandatory):
1. Reuse existing project architecture and folder structure.
2. TypeScript strict mode, no any.
3. Use JSDoc on exported APIs.
4. No hardcoded user-facing strings in JSX; use i18n.
5. No hardcoded UI tokens; use useTheme().
6. Keep UI and business logic separated (hooks/facades/store).
7. Add or update POC tests for the step.
8. Preserve backwards compatibility unless migration is explicit.
9. Keep reducers pure and facade contracts typed.
10. Validate role permissions before state transitions.
```

### Prompt Execution Rule

For each step below:

1. Start prompt with the Prompt Contract above.
2. Include step goal and target files.
3. Include acceptance criteria.
4. Implement only one step at a time.
5. Run type-check and the step POC test before moving to next step.

---

### Step 1 — Domain Model Hardening (Run-Centric)

**Goal:** Introduce explicit operations domain entities around the `Run` lifecycle.

Create/update:

- `src/models/Run.ts`
- `src/models/User.ts` (role mapping)
- `src/models/index.ts`

POC:

- `src/models/__tests__/run-models.test.ts`

Validation focus:

- lifecycle transitions are typed
- role constraints represented in types

---

### Step 2 — Permission and Policy Layer

**Goal:** Enforce role-based capabilities in one place.

Create:

- `src/models/Permission.ts`
- `src/utils/permissions.ts`

POC:

- `src/models/__tests__/permissions.test.ts`

Validation focus:

- role -> capability matrix consistency with business model

---

### Step 3 — Run Facade (Business Actions)

**Goal:** Centralize run operations behind a facade.

Create:

- `src/services/facades/RunFacade.ts`
- `src/services/facades/__tests__/RunFacade.test.ts`

Core methods:

- createRun
- assignRun
- acceptRun
- rejectRun
- startRun
- completeRun
- cancelRun
- uploadRunProof

POC:

- `src/services/facades/__tests__/RunFacade.test.ts`

---

### Step 4 — Store Slice for Operations

**Goal:** Manage run state transitions in Redux.

Create:

- `src/store/slices/runSlice.ts`

Integrate:

- `src/store/index.ts`

POC:

- `src/store/__tests__/runSlice.test.ts`

Validation focus:

- reducer transition correctness (`PENDING -> ASSIGNED -> IN_PROGRESS -> COMPLETED/CANCELLED`)

---

### Step 5 — Dispatcher Home (Operational Queue)

**Goal:** Show open runs, assignment state, and priorities.

Create/update:

- `src/screens/Home/HomeScreen.tsx`
- `src/screens/Home/useHomeScreen.ts`
- `src/screens/Home/HomeScreen.styles.ts`

POC:

- `src/screens/Home/__tests__/HomeOperationalQueue.test.tsx`

Validation focus:

- priority grouping
- run cards render by status

---

### Step 6 — Agent Workflow Screens

**Goal:** Support agent accept/start/complete flow from mobile.

Create/update:

- `src/screens/Calls/` and `src/screens/Home/` run-action entry points
- shared action components in `src/components/molecules/`

POC:

- `src/screens/Calls/__tests__/AgentRunLifecycle.test.tsx`

Validation focus:

- accept/reject actions
- status updates reflected in UI/store

---

### Step 7 — Real-Time Coordination (Chat + Calls)

**Goal:** Keep dispatcher and agent communication tied to run context.

Create/update:

- `src/screens/Chat/`
- `src/screens/Calls/`
- `src/services/websocket/`

POC:

- `src/screens/Chat/__tests__/RunThreadChat.test.tsx`
- `src/screens/Calls/__tests__/DispatchCallActions.test.tsx`

Validation focus:

- run-linked conversation metadata
- live status sync in UI

---

### Step 8 — Supervisor Review and Proof Verification

**Goal:** Enable outcome validation with notes and attachments.

Create:

- `src/screens/Home/SupervisorReviewScreen.tsx`
- related hooks/styles in `src/screens/Home/`

POC:

- `src/screens/Home/__tests__/SupervisorReviewScreen.test.tsx`

Validation focus:

- proof preview
- approve/reopen/override decision flow

---

### Step 9 — Navigation and Role Routing

**Goal:** Route users to role-specific operational flows.

Create/update:

- `src/navigation/types.ts`
- `src/navigation/RootNavigator.tsx`
- role-aware guards in `src/navigation/`

POC:

- `src/navigation/__tests__/role-routing.test.tsx`

Validation focus:

- Agent/Dispatcher/Supervisor/Admin root paths

---

### Step 10 — Final Assembly and Observability

**Goal:** Integrate telemetry, errors, and production readiness checks.

Create/update:

- `src/App.tsx`
- `src/hooks/useNetworkStatus.ts`
- `src/hooks/useAuthSession.ts`
- global feedback (`toast`, `network banner`)

POC:

- `src/App.test.tsx`

Validation focus:

- app tree mounts with providers
- no crash in initial runtime path

---

## Definition of Done Per Step

A step is complete only when:

1. Source files are in the correct folder/layer
2. TypeScript passes (`npm run type-check`)
3. POC tests pass (step-specific test files)
4. No hardcoded UI strings (i18n)
5. No hardcoded design tokens in components (theme)
6. Public APIs have updated JSDoc
7. Role and run lifecycle behavior matches business rules

---

## Documentation Map

- Engineering standards: `docs/engineering-standards.md`
- Commit rules: `docs/commit-rules.md`
- Git workflow: `docs/git-workflow.md`
- Design system: `docs/design-system/design-system.md`
- Design patterns: `docs/design-pattern/design-pattern.md`
- AI implementation prompts: `docs/implementation/ai-driver-dispatcher-prompt-guide.md`

---

## Quick Start

```bash
npm install
npm start
```

Optional targets:

```bash
npm run android
npm run ios
npm run web
```
